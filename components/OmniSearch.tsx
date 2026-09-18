'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, ShoppingCart, Pill, Building2, ArrowRight, Loader2, X, RotateCcw } from 'lucide-react';

interface OmniSearchProps {
  onSelectInvoice: (inv: string) => void;
  onSelectSO: (so: string) => void;
  onSelectProduct: (productName: string) => void;
  onSelectCustomer: (custName: string) => void;
  onSimulateInvoiceReturn?: (inv: string) => void;
}

function cleanHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export default function OmniSearch({
  onSelectInvoice,
  onSelectSO,
  onSelectProduct,
  onSelectCustomer,
  onSimulateInvoiceReturn,
}: OmniSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    invoices: any[];
    orders: any[];
    products: any[];
    customers: any[];
  }>({ invoices: [], orders: [], products: [], customers: [] });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ invoices: [], orders: [], products: [], customers: [] });
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasAnyResults =
    results.invoices.length > 0 ||
    results.orders.length > 0 ||
    results.products.length > 0 ||
    results.customers.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-indigo-500 dark:text-indigo-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim().length >= 2) setIsOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (results.invoices.length > 0) {
                onSelectInvoice(results.invoices[0].nomor_faktur);
                setIsOpen(false);
              } else if (results.customers.length > 0) {
                onSelectCustomer(results.customers[0].nama_pelanggan);
                setIsOpen(false);
              } else if (results.products.length > 0) {
                onSelectProduct(results.products[0].nama_barang);
                setIsOpen(false);
              }
            }
          }}
          placeholder="Cari No Faktur, No SO, Nama Obat, atau Nama Apotek (2024-2026)..."
          className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm font-medium rounded-2xl border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none shadow-md dark:shadow-xl dark:shadow-black/40 transition-all"
        />
        {loading ? (
          <Loader2 className="absolute right-4 w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-spin" />
        ) : query ? (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/80 overflow-hidden z-50 max-h-[75vh] overflow-y-auto backdrop-blur-md">
          {/* Quick 1-Click Fast Match Action when Invoice is detected */}
          {results.invoices.length > 0 && (
            <div className="p-2.5 bg-indigo-50/90 dark:bg-indigo-950/80 border-b border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-100">
                  Faktur Ditemukan: <span className="font-mono text-indigo-600 dark:text-indigo-400 underline">{results.invoices[0].nomor_faktur}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {onSimulateInvoiceReturn && (
                  <button
                    type="button"
                    onClick={() => {
                      onSimulateInvoiceReturn(results.invoices[0].nomor_faktur);
                      setIsOpen(false);
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                    title="Langsung simulasikan retur untuk faktur ini"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>⚡ Simulasi Retur</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectInvoice(results.invoices[0].nomor_faktur);
                    setIsOpen(false);
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span>Buka Faktur</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {!hasAnyResults && !loading && (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Tidak ada data yang cocok dengan &quot;<span className="text-slate-800 dark:text-slate-200 font-semibold">{query}</span>&quot;
            </div>
          )}

          {/* 1. Invoices */}
          {results.invoices.length > 0 && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Faktur / Invoice ({results.invoices.length})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">Klik nama untuk buka / tombol retur untuk simulasi</span>
              </div>
              {results.invoices.map((inv) => (
                <div
                  key={inv.nomor_faktur}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between group transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectInvoice(inv.nomor_faktur);
                      setIsOpen(false);
                    }}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:underline">
                        {inv.nomor_faktur}
                      </span>
                      {inv.is_retur === 1 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded">RETUR</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cleanHtml(inv.nama_pelanggan)} &bull; <span className="text-slate-400 dark:text-slate-500">{inv.tanggal}</span> &bull; {inv.item_count} items
                    </div>
                  </button>

                  <div className="text-right flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Rp {(inv.total_nominal || 0).toLocaleString('id-ID')}
                    </span>
                    {onSimulateInvoiceReturn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSimulateInvoiceReturn(inv.nomor_faktur);
                          setIsOpen(false);
                        }}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-lg text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1"
                        title="Simulasikan retur untuk faktur ini"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retur</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectInvoice(inv.nomor_faktur);
                        setIsOpen(false);
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600"
                    >
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Sales Orders */}
          {results.orders.length > 0 && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" />
                Sales Order ({results.orders.length})
              </div>
              {results.orders.map((so) => (
                <button
                  key={so.no_so}
                  onClick={() => {
                    onSelectSO(so.no_so);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center justify-between group transition-colors"
                >
                  <div>
                    <span className="font-semibold text-amber-700 dark:text-amber-200 text-sm">{so.no_so}</span>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cleanHtml(so.nama_pelanggan)} &bull; <span className="text-slate-400 dark:text-slate-500">{so.tanggal}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {so.faktur_count} Faktur ({so.item_count} item)
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 3. Products / Medicines */}
          {results.products.length > 0 && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" />
                Obat / Barang ({results.products.length})
              </div>
              {results.products.map((prod) => (
                <button
                  key={prod.nama_barang}
                  onClick={() => {
                    onSelectProduct(prod.nama_barang);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-between group transition-colors"
                >
                  <div className="pr-4">
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-xs sm:text-sm line-clamp-1">{cleanHtml(prod.nama_barang)}</span>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Kode: <span className="text-slate-700 dark:text-slate-300">{prod.kode_barang || '-'}</span> &bull; Terjual: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{prod.total_qty} {prod.satuan}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      ~Rp {Math.round(prod.avg_price || 0).toLocaleString('id-ID')}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 4. Customers / Pharmacies */}
          {results.customers.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Pelanggan / Apotek ({results.customers.length})
              </div>
              {results.customers.map((cust) => (
                <button
                  key={cust.nama_pelanggan}
                  onClick={() => {
                    onSelectCustomer(cust.nama_pelanggan);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40 flex items-center justify-between group transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{cleanHtml(cust.nama_pelanggan)}</span>
                      {cust.category && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 rounded border border-slate-200 dark:border-slate-700">
                          {cust.category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cust.total_invoices} Faktur &bull; {cust.total_items} baris pembelian
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Rp {(cust.lifetime_spent || 0).toLocaleString('id-ID')}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
