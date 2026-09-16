
'use client';

import React, { useEffect, useState } from 'react';
import { X, ShoppingCart, FileText, Building2, Loader2, ArrowRight } from 'lucide-react';

interface SOModalProps {
  soNumber: string | null;
  onClose: () => void;
  onSelectInvoice: (inv: string) => void;
  onSelectCustomer: (cust: string) => void;
  onSelectProduct: (prod: string) => void;
}

export default function SOModal({
  soNumber,
  onClose,
  onSelectInvoice,
  onSelectCustomer,
  onSelectProduct,
}: SOModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!soNumber) return;
    setLoading(true);
    fetch(`/api/so/${encodeURIComponent(soNumber)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [soNumber]);

  if (!soNumber) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-amber-200">{soNumber}</h2>
                {data?.category && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-slate-800 text-amber-300 border border-slate-700 rounded">
                    {data.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Detail Sales Order / Pesanan Penjualan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <span className="text-sm">Memuat detail Sales Order...</span>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs text-slate-500 block">Pelanggan / Apotek</span>
                <button
                  onClick={() => onSelectCustomer(data.nama_pelanggan)}
                  className="font-semibold text-slate-200 text-sm hover:text-amber-400 flex items-center gap-1.5 mt-1 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {data.nama_pelanggan}
                </button>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Total Faktur Dihasilkan</span>
                <span className="font-bold text-slate-200 text-sm mt-1 block">
                  {data.invoices?.length || 0} Faktur ({data.total_items} Baris Item)
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Total Nilai SO</span>
                <span className="font-bold text-emerald-400 text-sm mt-1 block">
                  Rp {(data.total_nominal || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Generated Invoices */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Faktur yang Terbit dari SO ini ({data.invoices?.length || 0})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.invoices?.map((inv: any) => (
                  <div
                    key={inv.nomor_faktur}
                    className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-sm">{inv.nomor_faktur}</span>
                        {inv.is_retur ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-950 text-rose-400 rounded">RETUR</span>
                        ) : (
                          <span className="text-xs text-slate-400">{inv.tanggal}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {inv.total_items} items &bull; <span className="text-emerald-400 font-medium">Rp {(inv.total_nominal || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectInvoice(inv.nomor_faktur)}
                      className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold pt-2 border-t border-slate-850"
                    >
                      Buka Rincian Faktur <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
