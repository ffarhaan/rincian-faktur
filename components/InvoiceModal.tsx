'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  ShoppingCart,
  Building2,
  Calendar,
  Loader2,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Receipt,
} from 'lucide-react';
import ReturCalculatorModal, { ReturItem } from './ReturCalculatorModal';

interface InvoiceModalProps {
  invoiceNumber: string | null;
  onClose: () => void;
  onSelectSO: (so: string) => void;
  onSelectCustomer: (cust: string) => void;
  onSelectProduct: (prod: string) => void;
  onSelectInvoice?: (inv: string) => void;
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
}: InvoiceModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Retur Modal state
  const [isReturOpen, setIsReturOpen] = useState(false);
  const [returItems, setReturItems] = useState<ReturItem[]>([]);

  useEffect(() => {
    if (!invoiceNumber) return;
    setLoading(true);
    setIsReturOpen(false);
    fetch(`/api/faktur/${encodeURIComponent(invoiceNumber)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [invoiceNumber]);

  if (!invoiceNumber) return null;

  // Trigger retur calculation for all items in invoice
  const handleOpenFullRetur = () => {
    if (!data?.items) return;
    const items: ReturItem[] = data.items.map((it: any) => ({
      id: it.id,
      kode_barang: it.kode_barang,
      nama_barang: it.nama_barang,
      satuan: it.satuan,
      harga_satuan: Number(it.harga_satuan) || 0,
      qty_beli: Math.abs(Number(it.kuantitas) || 0),
      qty_retur: 1,
      nomor_faktur: invoiceNumber,
      tanggal: data.tanggal,
    }));
    setReturItems(items);
    setIsReturOpen(true);
  };

  // Trigger retur calculation for single item
  const handleOpenSingleItemRetur = (it: any) => {
    const item: ReturItem = {
      id: it.id,
      kode_barang: it.kode_barang,
      nama_barang: it.nama_barang,
      satuan: it.satuan,
      harga_satuan: Number(it.harga_satuan) || 0,
      qty_beli: Math.abs(Number(it.kuantitas) || 0),
      qty_retur: 1,
      nomor_faktur: invoiceNumber,
      tanggal: data?.tanggal,
    };
    setReturItems([item]);
    setIsReturOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">{invoiceNumber}</h2>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Rincian Faktur Penjualan &amp; Referensi Harga Satuan</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Button: Buat / Hitung Retur */}
              <button
                onClick={handleOpenFullRetur}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors flex items-center gap-1.5 shadow-sm"
                title="Hitung nilai retur untuk barang di faktur ini"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Hitung Retur Faktur Ini</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
                    <Building2 className="w-4 h-4 text-sky-500" />
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
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {data.tanggal}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Daftar Obat / Item ({data.items?.length || 0})
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Klik tombol <strong>Retur</strong> pada baris untuk menghitung pengembalian satuan obat.
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3">Nama Obat / Barang</th>
                        <th className="py-2.5 px-3 text-right">Qty Beli</th>
                        <th className="py-2.5 px-3">Satuan</th>
                        <th className="py-2.5 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                          Harga Satuan (Ref INV)
                        </th>
                        <th className="py-2.5 px-3 text-right">Subtotal (DPP)</th>
                        <th className="py-2.5 px-3 text-right font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          PPN 11%
                        </th>
                        <th className="py-2.5 px-3 text-right bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold">
                          Grand Total (+PPN 11%)
                        </th>
                        <th className="py-2.5 px-3 text-center">Aksi Retur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {data.items?.map((it: any, idx: number) => {
                        const itemSubtotal = Number(it.total_harga) || 0;
                        const itemPpn = Math.round(itemSubtotal * 0.11);
                        const itemGrandTotal = Math.round(itemSubtotal * 1.11);
                        return (
                          <tr key={it.id || idx} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition-colors">
                            <td className="py-2 px-3 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400">{it.kode_barang || '-'}</td>
                            <td className="py-2 px-3">
                              <button
                                onClick={() => onSelectProduct(it.nama_barang)}
                                className="text-left font-semibold text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
                              >
                                {cleanHtml(it.nama_barang)}
                              </button>
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${it.kuantitas < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {it.kuantitas}
                            </td>
                            <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{it.satuan}</td>
                            <td className="py-2 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/40 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              Rp {(Number(it.harga_satuan) || 0).toLocaleString('id-ID')}
                            </td>
                            <td className={`py-2 px-3 text-right font-semibold whitespace-nowrap ${it.total_harga < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              Rp {itemSubtotal.toLocaleString('id-ID')}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono text-xs whitespace-nowrap ${it.total_harga < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              Rp {itemPpn.toLocaleString('id-ID')}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap bg-indigo-500/5 dark:bg-indigo-950/20 ${it.total_harga < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              Rp {itemGrandTotal.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleItemRetur(it)}
                                className="px-2 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 mx-auto"
                                title="Hitung retur untuk item ini"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Retur</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-950 font-semibold border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right">Total Fisik:</td>
                        <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-300 font-bold">{data.total_qty}</td>
                        <td></td>
                        <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400 text-xs">Subtotal (DPP):</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                          Rp {(data.total_nominal || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                          Rp {Math.round((data.total_nominal || 0) * 0.11).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold text-sm whitespace-nowrap">
                          Rp {Math.round((data.total_nominal || 0) * 1.11).toLocaleString('id-ID')}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="border-t border-slate-200 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                        <td colSpan={7} className="py-2 px-3 text-right">Grand Total Faktur Termasuk PPN 11%:</td>
                        <td colSpan={2} className="py-2 px-3 text-right font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                          Rp {Math.round((data.total_nominal || 0) * 1.11).toLocaleString('id-ID')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Related Invoices: Link Langsung ke INV Lainnya dari Apotek Ini */}
              {data.other_invoices && data.other_invoices.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Link Langsung ke Faktur (INV) Lain dari Apotek Ini ({data.other_invoices.length})
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
                          {Number(other.is_retur) === 1 && (
                            <span className="px-1 py-0.2 text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded">
                              RETUR
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                          <span>{other.tanggal}</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            Rp {Math.round(other.total_amount || 0).toLocaleString('id-ID')}
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

      {/* Retur Calculator Modal Popup */}
      <ReturCalculatorModal
        isOpen={isReturOpen}
        onClose={() => setIsReturOpen(false)}
        customerName={data?.nama_pelanggan}
        invoiceNumber={invoiceNumber}
        invoiceDate={data?.tanggal}
        items={returItems}
        onSelectInvoice={onSelectInvoice}
        onSelectProduct={onSelectProduct}
      />
    </>
  );
}

