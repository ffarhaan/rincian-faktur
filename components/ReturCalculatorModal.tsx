'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Building2,
  FileText,
  Calendar,
  Copy,
  Check,
  Printer,
  Plus,
  Trash2,
  ExternalLink,
  Receipt,
  AlertCircle
} from 'lucide-react';

export interface ReturItem {
  id?: number | string;
  kode_barang?: string;
  nama_barang: string;
  satuan: string;
  harga_satuan: number;
  qty_beli: number;
  qty_retur: number;
  nomor_faktur?: string;
  tanggal?: string;
  alasan?: string;
}

interface ReturCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  items: ReturItem[];
  onSelectInvoice?: (inv: string) => void;
  onSelectProduct?: (prod: string) => void;
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

export default function ReturCalculatorModal({
  isOpen,
  onClose,
  customerName = '',
  invoiceNumber = '',
  invoiceDate = '',
  items: initialItems,
  onSelectInvoice,
  onSelectProduct,
}: ReturCalculatorModalProps) {
  const [returList, setReturList] = useState<ReturItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [alasanUmum, setAlasanUmum] = useState('ED Dekat / Rusak / Salah Kirim');

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setReturList(
        initialItems.map((it) => ({
          ...it,
          qty_retur: it.qty_retur || 1,
          alasan: it.alasan || '',
        }))
      );
    } else {
      setReturList([]);
    }
  }, [initialItems]);

  if (!isOpen) return null;

  const handleQtyChange = (index: number, newQty: number) => {
    setReturList((prev) => {
      const updated = [...prev];
      const maxQty = updated[index].qty_beli > 0 ? updated[index].qty_beli : 99999;
      const validQty = Math.max(1, Math.min(newQty, maxQty));
      updated[index] = { ...updated[index], qty_retur: validQty };
      return updated;
    });
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    setReturList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], harga_satuan: Math.max(0, newPrice) };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setReturList((prev) => prev.filter((_, i) => i !== index));
  };

  const totalQtyRetur = returList.reduce((acc, it) => acc + Number(it.qty_retur || 0), 0);
  const totalNominalRetur = returList.reduce(
    (acc, it) => acc + Number(it.qty_retur || 0) * Number(it.harga_satuan || 0),
    0
  );

  const generateCopyText = () => {
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let text = `*FORMULIR PENGAJUAN RETUR OBAT*\n`;
    text += `Tanggal Pengajuan: ${today}\n`;
    text += `Pelanggan / Apotek: ${cleanHtml(customerName)}\n`;
    if (invoiceNumber) text += `Ref. No Faktur: ${invoiceNumber}\n`;
    if (invoiceDate) text += `Tgl Faktur Asli: ${invoiceDate}\n`;
    text += `Alasan Retur: ${alasanUmum}\n`;
    text += `-------------------------------------------\n`;
    text += `*RINCIAN ITEM RETUR:*\n`;

    returList.forEach((it, idx) => {
      const subtotal = Number(it.qty_retur || 0) * Number(it.harga_satuan || 0);
      text += `${idx + 1}. [${it.kode_barang || '-'}] ${cleanHtml(it.nama_barang)}\n`;
      text += `   - Qty Retur: ${it.qty_retur} ${it.satuan} (dari beli: ${it.qty_beli} ${it.satuan})\n`;
      text += `   - Harga Satuan Ref INV: Rp ${Number(it.harga_satuan).toLocaleString('id-ID')}\n`;
      text += `   - Subtotal Retur: Rp ${Math.round(subtotal).toLocaleString('id-ID')}\n`;
      if (it.nomor_faktur && it.nomor_faktur !== invoiceNumber) {
        text += `   - Ref Faktur: ${it.nomor_faktur}\n`;
      }
    });

    text += `-------------------------------------------\n`;
    text += `*TOTAL NILAI RETUR: Rp ${Math.round(totalNominalRetur).toLocaleString('id-ID')}*\n`;
    text += `Total Fisik: ${totalQtyRetur} unit (${returList.length} jenis obat)\n`;
    text += `-------------------------------------------`;

    return text;
  };

  const handleCopy = () => {
    const text = generateCopyText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-200 dark:border-rose-950/60 flex items-center justify-between bg-rose-50/70 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Kalkulator &amp; Pengajuan Retur
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded">
                  Hitung Sesuai Ref INV
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hitung nilai pengembalian obat berdasarkan harga satuan asli faktur
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Reference Info Box */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Pelanggan / Apotek
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 flex items-center gap-1.5 truncate">
                <Building2 className="w-4 h-4 text-sky-500 flex-shrink-0" />
                {cleanHtml(customerName) || '-'}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Ref. Nomor Faktur
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {invoiceNumber || 'Multi-Faktur'}
                </span>
                {invoiceNumber && onSelectInvoice && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectInvoice(invoiceNumber);
                    }}
                    className="p-1 hover:text-indigo-600 text-slate-400"
                    title="Buka Faktur Ini"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Tanggal Faktur
              </span>
              <span className="text-sm font-semibold font-mono text-slate-700 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {invoiceDate || '-'}
              </span>
            </div>
          </div>

          {/* Alasan Retur Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Alasan Retur / Keterangan:</span>
            </label>
            <input
              type="text"
              value={alasanUmum}
              onChange={(e) => setAlasanUmum(e.target.value)}
              placeholder="Contoh: ED Dekat / Barang Rusak / Salah Kirim..."
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 sm:w-80"
            />
          </div>

          {/* Retur Items List Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Nama Obat &amp; Ref INV</th>
                  <th className="py-2.5 px-3 text-center">Qty Beli</th>
                  <th className="py-2.5 px-3 text-center w-36">Qty Retur</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                    Harga Satuan Ref INV
                  </th>
                  <th className="py-2.5 px-3 text-right">Subtotal Retur</th>
                  <th className="py-2.5 px-3 text-center w-10">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {returList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 dark:text-slate-500">
                      Belum ada item yang dipilih untuk retur.
                    </td>
                  </tr>
                ) : (
                  returList.map((it, idx) => {
                    const subtotal = Number(it.qty_retur || 0) * Number(it.harga_satuan || 0);
                    return (
                      <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-medium">{idx + 1}</td>

                        {/* Nama Obat & Ref INV */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {cleanHtml(it.nama_barang)}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono">Kode: {it.kode_barang || '-'}</span>
                            {it.nomor_faktur && (
                              <>
                                <span>&bull;</span>
                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                                  INV: {it.nomor_faktur}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Qty Beli Asli */}
                        <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                          {it.qty_beli} {it.satuan}
                        </td>

                        {/* Qty Retur Input */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(idx, it.qty_retur - 1)}
                              disabled={it.qty_retur <= 1}
                              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={it.qty_beli > 0 ? it.qty_beli : 99999}
                              value={it.qty_retur}
                              onChange={(e) => handleQtyChange(idx, parseInt(e.target.value, 10) || 1)}
                              className="w-16 py-1 text-center font-bold text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleQtyChange(idx, it.qty_retur + 1)}
                              disabled={it.qty_beli > 0 && it.qty_retur >= it.qty_beli}
                              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              +
                            </button>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium ml-1">
                              {it.satuan}
                            </span>
                          </div>
                        </td>

                        {/* Harga Satuan Ref INV */}
                        <td className="py-2.5 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/40 font-mono font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          Rp {(Number(it.harga_satuan) || 0).toLocaleString('id-ID')}
                        </td>

                        {/* Subtotal Retur */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          Rp {Math.round(subtotal).toLocaleString('id-ID')}
                        </td>

                        {/* Hapus Item */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Hapus dari daftar retur"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-950 font-semibold border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-right">
                    Total Retur:
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                    {totalQtyRetur} Unit ({returList.length} Item)
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-right font-mono text-base font-extrabold text-rose-600 dark:text-rose-400">
                    Rp {Math.round(totalNominalRetur).toLocaleString('id-ID')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Alert Info on Unit Price Calculation */}
          <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Kesesuaian Harga Satuan:</strong> Harga satuan dihitung otomatis persis sesuai faktur pembelian asli (Ref INV). Nilai retur bersih adalah <code>Qty Retur × Harga Satuan Faktur</code>.
            </div>
          </div>

          {/* Retur Summary Card */}
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500 text-white rounded-lg">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 block">
                  Estimasi Nilai Pengembalian Dana / Potong Faktur
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-rose-700 dark:text-rose-400">
                  Rp {Math.round(totalNominalRetur).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopy}
                disabled={returList.length === 0}
                className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Rincian Retur</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
