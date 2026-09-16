
'use client';

import React, { useEffect, useState } from 'react';
import { X, Building2, FileText, Pill, Loader2, ArrowRight } from 'lucide-react';

interface CustomerModalProps {
  customerName: string | null;
  onClose: () => void;
  onSelectInvoice: (inv: string) => void;
  onSelectProduct: (prod: string) => void;
}

export default function CustomerModal({
  customerName,
  onClose,
  onSelectInvoice,
  onSelectProduct,
}: CustomerModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'top_products' | 'invoices'>('top_products');

  useEffect(() => {
    if (!customerName) return;
    setLoading(true);
    fetch(`/api/pelanggan?name=${encodeURIComponent(customerName)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [customerName]);

  if (!customerName) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">{customerName}</h2>
                {data?.summary?.category && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-sky-950 text-sky-300 border border-sky-800 rounded">
                    {data.summary.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Transaksi: {data?.summary?.first_transaction} s/d {data?.summary?.last_transaction}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span className="text-sm">Memuat profil apotek...</span>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Total Faktur</span>
                <span className="text-lg font-bold text-indigo-300 mt-1 block">
                  {data.summary?.total_invoices || 0} Faktur
                </span>
              </div>
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Frekuensi Order (SO)</span>
                <span className="text-lg font-bold text-amber-300 mt-1 block">
                  {data.summary?.total_orders || 0} Kali
                </span>
              </div>
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Total Belanja Bersih</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block truncate">
                  Rp {Math.round(data.summary?.net_spent || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Total Retur</span>
                <span className="text-lg font-bold text-rose-400 mt-1 block truncate">
                  Rp {Math.abs(Math.round(data.summary?.total_retur || 0)).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab('top_products')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'top_products'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                Obat yang Paling Sering Dibeli ({data.top_products?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'invoices'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Riwayat Faktur ({data.invoices?.length || 0})
              </button>
            </div>

            {/* Tab 1: Top Products */}
            {activeTab === 'top_products' && (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40 max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Nama Obat</th>
                      <th className="py-2.5 px-3 text-right">Frekuensi Beli</th>
                      <th className="py-2.5 px-3 text-right">Total Qty</th>
                      <th className="py-2.5 px-3 text-right">Total Nilai</th>
                      <th className="py-2.5 px-3 text-right">Beli Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {data.top_products?.map((prod: any) => (
                      <tr key={prod.nama_barang} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2 px-3">
                          <button
                            onClick={() => onSelectProduct(prod.nama_barang)}
                            className="font-medium text-slate-200 hover:text-emerald-400 transition-colors text-left"
                          >
                            {prod.nama_barang}
                          </button>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300">{prod.order_frequency}x</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-semibold">{prod.total_qty} {prod.satuan}</td>
                        <td className="py-2 px-3 text-right text-slate-200">
                          Rp {(prod.total_spent || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">{prod.last_purchased}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: Invoices */}
            {activeTab === 'invoices' && (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40 max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Nomor Faktur</th>
                      <th className="py-2.5 px-3">No. SO</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3 text-right">Items</th>
                      <th className="py-2.5 px-3 text-right">Total Nilai</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {data.invoices?.map((inv: any) => (
                      <tr key={inv.nomor_faktur} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-200">
                          {inv.nomor_faktur}
                          {inv.is_retur === 1 && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-rose-950 text-rose-400 rounded">RETUR</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{inv.no_so || '-'}</td>
                        <td className="py-2 px-3 text-slate-400">{inv.tanggal}</td>
                        <td className="py-2 px-3 text-right text-slate-300">{inv.item_count} item</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                          Rp {(inv.total_amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => onSelectInvoice(inv.nomor_faktur)}
                            className="px-2 py-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/50 rounded transition-colors font-medium"
                          >
                            Lihat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
