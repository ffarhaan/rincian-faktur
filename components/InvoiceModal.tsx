'use client';

import React, { useEffect, useState } from 'react';
import { X, FileText, ShoppingCart, Building2, Calendar, Loader2 } from 'lucide-react';

interface InvoiceModalProps {
  invoiceNumber: string | null;
  onClose: () => void;
  onSelectSO: (so: string) => void;
  onSelectCustomer: (cust: string) => void;
  onSelectProduct: (prod: string) => void;
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

export default function InvoiceModal({
  invoiceNumber,
  onClose,
  onSelectSO,
  onSelectCustomer,
  onSelectProduct,
}: InvoiceModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invoiceNumber) return;
    setLoading(true);
    fetch(`/api/faktur/${encodeURIComponent(invoiceNumber)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [invoiceNumber]);

  if (!invoiceNumber) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">{invoiceNumber}</h2>
                {data?.is_retur && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded">
                    RETUR
                  </span>
                )}
                {data?.category && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded">
                    {data.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Rincian Faktur Penjualan / Retur</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 dark:text-indigo-400" />
            <span className="text-sm font-medium">Memuat rincian faktur...</span>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Meta Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Pelanggan / Apotek</span>
                <button
                  onClick={() => onSelectCustomer(data.nama_pelanggan)}
                  className="font-semibold text-slate-800 dark:text-slate-200 text-sm hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 mt-1 transition-colors text-left"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {cleanHtml(data.nama_pelanggan)}
                </button>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Nomor Sales Order (SO)</span>
                {data.linked_sos && data.linked_sos.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {data.linked_sos.map((so: string) => (
                      <button
                        key={so}
                        onClick={() => onSelectSO(so)}
                        className="px-2 py-0.5 text-xs font-semibold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors flex items-center gap-1 font-mono"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        {so}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 mt-1 block">-</span>
                )}
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Tanggal Transaksi</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 mt-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {data.tanggal}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-300 mb-3">
                Daftar Obat / Item ({data.items?.length || 0})
              </h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Kode</th>
                      <th className="py-2.5 px-3">Nama Obat / Barang</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3">Satuan</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Total Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {data.items?.map((it: any, idx: number) => (
                      <tr key={it.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition-colors">
                        <td className="py-2 px-3 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400">{it.kode_barang || '-'}</td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => onSelectProduct(it.nama_barang)}
                            className="text-left font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            {cleanHtml(it.nama_barang)}
                          </button>
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold ${it.kuantitas < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {it.kuantitas}
                        </td>
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{it.satuan}</td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
                          Rp {(it.harga_satuan || 0).toLocaleString('id-ID')}
                        </td>
                        <td className={`py-2 px-3 text-right font-semibold ${it.total_harga < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          Rp {(it.total_harga || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-950 font-semibold border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-right">Total Keseluruhan:</td>
                      <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-300">{data.total_qty}</td>
                      <td></td>
                      <td></td>
                      <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                        Rp {(data.total_nominal || 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
