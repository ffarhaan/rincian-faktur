
'use client';

import React, { useEffect, useState } from 'react';
import { X, Pill, Building2, Loader2, ArrowRight } from 'lucide-react';

interface MedicineModalProps {
  productName: string | null;
  onClose: () => void;
  onSelectCustomer: (cust: string) => void;
  onSelectInvoice: (inv: string) => void;
}

export default function MedicineModal({
  productName,
  onClose,
  onSelectCustomer,
  onSelectInvoice,
}: MedicineModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productName) return;
    setLoading(true);
    fetch(`/api/obat?name=${encodeURIComponent(productName)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [productName]);

  if (!productName) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 line-clamp-1">{productName}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kode: <span className="text-slate-300 font-mono">{data?.summary?.kode_barang || '-'}</span> &bull; Satuan: {data?.summary?.satuan}
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
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span className="text-sm">Menganalisis data obat...</span>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Total Qty Terjual</span>
                <span className="text-lg font-bold text-emerald-400 mt-1 block">
                  {(data.summary?.total_sales_qty || 0).toLocaleString('id-ID')} {data.summary?.satuan}
                </span>
              </div>
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Total Qty Retur</span>
                <span className="text-lg font-bold text-rose-400 mt-1 block">
                  {(data.summary?.total_retur_qty || 0).toLocaleString('id-ID')} {data.summary?.satuan}
                </span>
              </div>
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Jumlah Apotek Pembeli</span>
                <span className="text-lg font-bold text-slate-200 mt-1 block">
                  {data.summary?.total_customers || 0} Apotek
                </span>
              </div>
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 block">Harga Satuan Rata-rata</span>
                <span className="text-lg font-bold text-indigo-300 mt-1 block">
                  Rp {Math.round(data.summary?.avg_price || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Pharmacies that bought this */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                Daftar Apotek yang Pernah Membeli Obat Ini ({data.customers?.length || 0})
              </h3>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40 max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Nama Apotek</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3 text-right">Frekuensi Order</th>
                      <th className="py-2.5 px-3 text-right">Total Qty</th>
                      <th className="py-2.5 px-3 text-right">Total Belanja</th>
                      <th className="py-2.5 px-3 text-right">Order Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {data.customers?.map((cust: any) => (
                      <tr key={cust.nama_pelanggan} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-2 px-3">
                          <button
                            onClick={() => onSelectCustomer(cust.nama_pelanggan)}
                            className="font-medium text-slate-200 hover:text-sky-400 transition-colors text-left"
                          >
                            {cust.nama_pelanggan}
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 rounded">
                            {cust.category || '3P'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300 font-medium">{cust.total_orders}x</td>
                        <td className="py-2 px-3 text-right text-emerald-400 font-semibold">{cust.total_qty}</td>
                        <td className="py-2 px-3 text-right text-slate-200">
                          Rp {(cust.total_spent || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">{cust.last_order_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
