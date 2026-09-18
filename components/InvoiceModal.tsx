'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  ShoppingCart,
  Building2,
  Calendar,
  Loader2,
  ExternalLink,
  Receipt,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

interface InvoiceModalProps {
  invoiceNumber: string | null;
  onClose: () => void;
  onSelectSO: (so: string) => void;
  onSelectCustomer: (cust: string) => void;
  onSelectProduct: (prod: string) => void;
  onSelectInvoice?: (inv: string) => void;
  onSimulateReturn?: (items: any[]) => void;
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
  onSelectInvoice,
  onSimulateReturn,
}: InvoiceModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSimulateInvoice = () => {
    if (!data?.items || !onSimulateReturn) return;
    const simItems = data.items.map((it: any) => ({
      id: it.id || `${data.nomor_faktur}-${it.kode_barang || it.nama_barang}`,
      nomor_faktur: data.nomor_faktur,
      tanggal: data.tanggal,
      nama_pelanggan: data.nama_pelanggan,
      kode_barang: it.kode_barang,
      nama_barang: it.nama_barang,
      satuan: it.satuan,
      harga_satuan: Number(it.harga_satuan) || 0,
      qty_beli: Math.abs(Number(it.kuantitas) || 0),
      qty_retur: 1,
      alasan: '',
    }));
    onSimulateReturn(simItems);
  };

  const handleSimulateSingleItem = (it: any) => {
    if (!onSimulateReturn) return;
    const simItem = {
      id: it.id || `${data?.nomor_faktur}-${it.kode_barang || it.nama_barang}`,
      nomor_faktur: data?.nomor_faktur || '',
      tanggal: data?.tanggal || '',
      nama_pelanggan: data?.nama_pelanggan || '',
      kode_barang: it.kode_barang,
      nama_barang: it.nama_barang,
      satuan: it.satuan,
      harga_satuan: Number(it.harga_satuan) || 0,
      qty_beli: Math.abs(Number(it.kuantitas) || 0),
      qty_retur: 1,
      alasan: '',
    };
    onSimulateReturn([simItem]);
  };

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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight">{invoiceNumber}</h2>
                  {data?.is_retur ? (
                    <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded">
                      RETUR
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded">
                      SALES
                    </span>
                  )}
                  {data?.category && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded">
                      {data.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Rincian Faktur Penjualan &amp; Harga Satuan (Termasuk PPN 11%)</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 dark:text-indigo-400" />
              <span className="text-sm font-medium">Memuat rincian faktur...</span>
            </div>
          ) : data ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Meta Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                    Pelanggan / Apotek
                  </span>
                  <button
                    onClick={() => onSelectCustomer(data.nama_pelanggan)}
                    className="font-bold text-slate-800 dark:text-slate-100 text-sm hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 mt-1 transition-colors text-left"
                  >
                    <Building2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
                    <span>{cleanHtml(data.nama_pelanggan)}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 inline" />
                  </button>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                    Nomor Sales Order (SO)
                  </span>
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
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                    Tanggal Transaksi
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5 mt-1 font-mono">
                    <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {data.tanggal}
                  </span>
                </div>
              </div>

              {/* Items Table Section */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>Daftar Barang &amp; Harga (+PPN 11%)</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full font-mono">
                        {data.items?.length || 0} item
                      </span>
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                      (Sudah dihitung dengan PPN 11%)
                    </span>
                  </div>

                  {onSimulateReturn && (
                    <button
                      type="button"
                      onClick={handleSimulateInvoice}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm group"
                      title="Masukkan semua barang dari faktur ini ke dalam simulasi retur"
                    >
                      <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-45 transition-transform" />
                      <span>⚡ Simulasikan Retur Faktur Ini</span>
                    </button>
                  )}
                </div>

                {/* Items Table with Grid Lines */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
                  <div className="overflow-x-auto max-h-[420px]">
                    <table className="w-full min-w-[1050px] text-xs text-left border-collapse border border-slate-200 dark:border-slate-800">
                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 select-none">
                        <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                          <th className="py-2.5 px-3 w-10 text-center">No</th>
                          <th className="py-2.5 px-3 min-w-[120px]">Kode Barang</th>
                          <th className="py-2.5 px-3 min-w-[240px]">Nama Obat / Barang</th>
                          <th className="py-2.5 px-3 text-right min-w-[75px]">Qty Beli</th>
                          <th className="py-2.5 px-3 min-w-[70px]">Satuan</th>
                          <th className="py-2.5 px-3 text-right min-w-[125px]">Harga Satuan (DPP)</th>
                          <th className="py-2.5 px-3 text-right bg-emerald-500/15 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold min-w-[150px]">
                            Harga Satuan (+PPN 11%)
                          </th>
                          <th className="py-2.5 px-3 text-right min-w-[125px]">Subtotal (DPP)</th>
                          <th className="py-2.5 px-3 text-right bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 font-bold whitespace-nowrap min-w-[150px]">
                            Grand Total (+PPN 11%)
                          </th>
                          {onSimulateReturn && (
                            <th className="py-2.5 px-2 w-20 text-center">Simulasi</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {data.items?.map((it: any, idx: number) => {
                          const unitDpp = Number(it.harga_satuan) || 0;
                          const unitIncPpn = Math.round(unitDpp * 1.11);
                          const subtotalDpp = Number(it.total_harga) || 0;
                          const grandTotalIncPpn = Math.round(subtotalDpp * 1.11);

                          return (
                            <tr
                              key={it.id || idx}
                              className={`divide-x divide-slate-200 dark:divide-slate-800 hover:bg-indigo-50/40 dark:hover:bg-slate-850/60 transition-colors ${
                                it.kuantitas < 0 ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">{it.kode_barang || '-'}</td>
                              <td className="py-2.5 px-3">
                                <button
                                  onClick={() => onSelectProduct(it.nama_barang)}
                                  className="text-left font-semibold text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors break-words"
                                >
                                  {cleanHtml(it.nama_barang)}
                                </button>
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold ${it.kuantitas < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                {it.kuantitas}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{it.satuan}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                                Rp {unitDpp.toLocaleString('id-ID')}
                              </td>
                              <td className="py-2.5 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/40 font-mono font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                                Rp {unitIncPpn.toLocaleString('id-ID')}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-semibold whitespace-nowrap ${it.total_harga < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                Rp {subtotalDpp.toLocaleString('id-ID')}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap bg-indigo-500/10 dark:bg-indigo-950/30 ${it.total_harga < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-900 dark:text-emerald-300'}`}>
                                Rp {grandTotalIncPpn.toLocaleString('id-ID')}
                              </td>
                              {onSimulateReturn && (
                                <td className="py-2 px-2 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleSimulateSingleItem(it)}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-lg text-[11px] font-bold transition-all shadow-2xs"
                                    title="Simulasikan retur untuk obat ini"
                                  >
                                    + Retur
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 dark:bg-slate-950 font-semibold border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                        <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                          <td colSpan={3} className="py-2.5 px-3 text-right">Total Fisik:</td>
                          <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-300 font-bold">{data.total_qty}</td>
                          <td colSpan={3} className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">Total Faktur (DPP):</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                            Rp {(data.total_nominal || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold text-sm whitespace-nowrap bg-emerald-500/10 dark:bg-emerald-950/40">
                            Rp {Math.round((data.total_nominal || 0) * 1.11).toLocaleString('id-ID')}
                          </td>
                          {onSimulateReturn && <td className="py-2.5 px-2"></td>}
                        </tr>
                        <tr className="border-t border-slate-200 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                          <td colSpan={7} className="py-2 px-3 text-right">Grand Total Faktur (Sudah Termasuk PPN 11%):</td>
                          <td colSpan={onSimulateReturn ? 3 : 2} className="py-2 px-3 text-right font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                            Rp {Math.round((data.total_nominal || 0) * 1.11).toLocaleString('id-ID')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Related Invoices: Link Langsung ke INV Lainnya dari Apotek Ini */}
              {data.other_invoices && data.other_invoices.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Faktur Lain dari Apotek Ini ({data.other_invoices.length})
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Klik salah satu faktur di bawah untuk langsung berpindah
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {data.other_invoices.map((other: any) => (
                      <button
                        key={other.nomor_faktur}
                        type="button"
                        onClick={() => {
                          if (onSelectInvoice) {
                            onSelectInvoice(other.nomor_faktur);
                          }
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all text-left group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 group-hover:underline">
                            {other.nomor_faktur}
                          </span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                          <span>{other.tanggal}</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Rp {Math.round((other.total_nominal || 0) * 1.11).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
    </div>
  );
}

