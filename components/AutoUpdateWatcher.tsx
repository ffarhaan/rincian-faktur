'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

const CHECK_INTERVAL_MS = 15000; // Check every 15 seconds

export default function AutoUpdateWatcher() {
  const [initialVersion, setInitialVersion] = useState<string | null>(null);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const initialVersionRef = useRef<string | null>(null);

  const checkVersion = useCallback(async () => {
    if (isUpdating || isDismissed) return;
    try {
      // Bust browser & edge cache with timestamp query
      const res = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const serverVersion = data.version;

      if (!serverVersion) return;

      if (!initialVersionRef.current) {
        initialVersionRef.current = serverVersion;
        setInitialVersion(serverVersion);
      } else if (initialVersionRef.current !== serverVersion) {
        // A new deployment was finished on Vercel!
        setHasNewVersion(true);
      }
    } catch (err) {
      // Network hiccup or temporary offline, silently ignore
    }
  }, [isUpdating, isDismissed]);

  // Initial check and periodic polling
  useEffect(() => {
    checkVersion();

    const interval = setInterval(() => {
      checkVersion();
    }, CHECK_INTERVAL_MS);

    const onFocus = () => checkVersion();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkVersion]);

  // Auto-reload countdown
  useEffect(() => {
    if (!hasNewVersion || isDismissed) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Execute reload
      triggerReload();
    }
  }, [hasNewVersion, countdown, isDismissed]);

  const triggerReload = () => {
    setIsUpdating(true);
    // Hard reload without using cache
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  if (!hasNewVersion || isDismissed) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 dark:bg-slate-900/95 border-2 border-indigo-500/80 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3.5">
        <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 flex-shrink-0 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Update Baru Tersedia
            </h4>
            <span className="px-1.5 py-0.2 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
              Vercel Deployed
            </span>
          </div>

          <p className="text-xs text-slate-200 mt-1 leading-relaxed">
            Deploy versi terbaru telah selesai di Vercel. Aplikasi memperbarui otomatis dalam{' '}
            <strong className="text-white font-mono text-sm bg-indigo-900/60 px-1.5 py-0.5 rounded border border-indigo-400/40">
              {countdown}s
            </strong>
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={triggerReload}
              disabled={isUpdating}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Memuat...' : 'Perbarui Sekarang'}</span>
            </button>

            <button
              onClick={() => setIsDismissed(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Tunda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
