'use client';

import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Download,
  Copy,
  Check,
  Printer,
  Trash2,
  Plus,
  Minus,
  Building2,
  FileText,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface SimulationItem {
  id: string | number;
  nomor_faktur: string;
  tanggal?: string;
  nama_pelanggan?: string;
  kode_barang?: string;
  nama_barang: string;
  satuan?: string;
  harga_satuan: number; // DPP
  qty_beli: number;
  qty_retur: number;
  alasan?: string;
}

interface ReturnSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: SimulationItem[];
  onUpdateItemQty: (id: string | number, qty: number) => void;
  onUpdateItemReason: (id: string | number, reason: string) => void;
  onRemoveItem: (id: string | number) => void;
  onClearAll: () => void;
  onSelectInvoice?: (inv: string) => void;
  onSelectProduct?: (prod: string) => void;
  onSelectCustomer?: (cust: string) => void;
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

export default function ReturnSimulationModal({
  isOpen,
  onClose,
  items,
  onUpdateItemQty,
  onUpdateItemReason,
  onRemoveItem,
  onClearAll,
  onSelectInvoice,
  onSelectProduct,
  onSelectCustomer,
}: ReturnSimulationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Real-time calculations
  const totalItemsCount = items.length;
  const totalPhysicalQty = items.reduce((sum, it) => sum + (Number(it.qty_retur) || 0), 0);
  const totalDpp = items.reduce((sum, it) => {
    const unitDpp = Number(it.harga_satuan) || 0;
    const qty = Number(it.qty_retur) || 0;
    return sum + unitDpp * qty;
  }, 0);
  const totalPpn = Math.round(totalDpp * 0.11);
  const totalGrandRetur = Math.round(totalDpp * 1.11);

  // Group by Customer if available
  const customerNames = Array.from(
    new Set(items.map((it) => it.nama_pelanggan).filter(Boolean))
  ) as string[];

  const invoiceNumbers = Array.from(
    new Set(items.map((it) => it.nomor_faktur).filter(Boolean))
  ) as string[];

  // Export to Excel
  const handleExportExcel = () => {
    if (items.length === 0) return;

    const exportRows = items.map((it, idx) => {
      const unitDpp = Number(it.harga_satuan) || 0;
      const unitIncPpn = Math.round(unitDpp * 1.11);
      const qtyRetur = Number(it.qty_retur) || 0;
      const subtotalDpp = Math.round(unitDpp * qtyRetur);
      const ppn11 = Math.round(subtotalDpp * 0.11);
      const grandTotal = Math.round(subtotalDpp * 1.11);

      return {
        No: idx + 1,
        'Ref No. Faktur': it.nomor_faktur || '-',
        'Tanggal Faktur': it.tanggal || '-',
        'Apotek / Pelanggan': cleanHtml(it.nama_pelanggan || '-'),
        'Kode Barang': it.kode_barang || '-',
        'Nama Obat / Barang': cleanHtml(it.nama_barang),
        'Qty Beli': it.qty_beli,
        'Qty Retur': qtyRetur,
        Satuan: it.satuan || 'BOX',
        'Harga Satuan DPP (Rp)': unitDpp,
        'Harga Satuan Inc PPN 11% (Rp)': unitIncPpn,
        'Subtotal Retur DPP (Rp)': subtotalDpp,
        'PPN 11% Retur (Rp)': ppn11,
        'Grand Total Retur (Rp)': grandTotal,
        'Alasan Retur': it.alasan || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Simulasi_Retur');
    XLSX.writeFile(
      wb,
      `Simulasi_Retur_${invoiceNumbers[0] || 'Draft'}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Copy to WhatsApp text format
  const handleCopySlip = () => {
    if (items.length === 0) return;

    const customerStr = customerNames.length > 0 ? customerNames.map(cleanHtml).join(', ') : '-';
    const invoiceStr = invoiceNumbers.length > 0 ? invoiceNumbers.join(', ') : '-';

    let text = `*📋 SIMULASI & PENGAJUAN RETUR BARANG*\n`;
    text += `Tanggal: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}\n`;
    text += `Apotek / Pelanggan: ${customerStr}\n`;
    text += `Ref Faktur: ${invoiceStr}\n`;
    text += `-------------------------------------------\n`;

    items.forEach((it, idx) => {
      const unitDpp = Number(it.harga_satuan) || 0;
      const unitIncPpn = Math.round(unitDpp * 1.11);
      const qtyRetur = Number(it.qty_retur) || 0;
      const grandTotal = Math.round(unitDpp * qtyRetur * 1.11);

      text += `${idx + 1}. *${cleanHtml(it.nama_barang)}*\n`;
      text += `   Ref INV: ${it.nomor_faktur || '-'} | Beli: ${it.qty_beli} ${it.satuan || ''}\n`;
      text += `   *Qty Retur: ${qtyRetur} ${it.satuan || ''}* @ Rp ${unitIncPpn.toLocaleString('id-ID')} (Inc. PPN 11%)\n`;
      text += `   Subtotal: Rp ${grandTotal.toLocaleString('id-ID')}`;
      if (it.alasan) text += ` | Ket: ${it.alasan}`;
      text += `\n`;
    });

    text += `-------------------------------------------\n`;
    text += `*TOTAL ITEM:* ${totalItemsCount} item (${totalPhysicalQty} Qty Fisik)\n`;
    text += `*TOTAL RETUR (DPP):* Rp ${Math.round(totalDpp).toLocaleString('id-ID')}\n`;
    text += `*PPN 11%:*\ Rp ${totalPpn.toLocaleString('id-ID')}\n`;
    text += `*GRAND TOTAL ESTIMASI RETUR (+PPN 11%):* Rp ${totalGrandRetur.toLocaleString('id-ID')}\n`;
    text += `\n_Dihitung otomatis via Sistem Faktur Database_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const quickReasons = ['ED Dekat', 'Kemasan Rusak', 'Salah Order / Kirim', 'Overstock', 'Fisik Cacat'];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:max-w-none print:max-h-none print:shadow-none print:border-none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 print:bg-transparent">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Simulasi &amp; Estimasi Nilai Retur</span>
                  <span className="px-2 py-0.5 text-xs font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded">
                    {totalItemsCount} Item
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kalkulasi otomatis pengembalian dana berdasarkan Ref INV asli dan PPN 11%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {items.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center gap-1"
                title="Kosongkan semua daftar simulasi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Total Item / Qty Fisik
              </span>
              <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
                {totalItemsCount}{' '}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  Item ({totalPhysicalQty} Pcs/Box)
                </span>
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                Total Nilai (DPP)
              </span>
              <span className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-200 mt-0.5 block truncate">
                Rp {Math.round(totalDpp).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                PPN 11% Retur
              </span>
              <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 block truncate">
                Rp {totalPpn.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="bg-rose-50/80 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-200 dark:border-rose-800/60 shadow-sm">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block uppercase tracking-wider">
                Grand Total (+PPN 11%)
              </span>
              <span className="text-lg sm:text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-0.5 block truncate">
                Rp {totalGrandRetur.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Quick Context Summary (Customer & Invoices) */}
          {(customerNames.length > 0 || invoiceNumbers.length > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs">
              <div className="flex flex-wrap items-center gap-3">
                {customerNames.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400">Apotek:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {customerNames.map(cleanHtml).join(', ')}
                    </span>
                  </div>
                )}
                {invoiceNumbers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400">Ref INV:</span>
                    <div className="flex flex-wrap gap-1">
                      {invoiceNumbers.map((inv) => (
                        <button
                          key={inv}
                          type="button"
                          onClick={() => onSelectInvoice && onSelectInvoice(inv)}
                          className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
                          title="Buka rincian faktur ini"
                        >
                          <span>{inv}</span>
                          <ExternalLink className="w-2.5 h-2.5 inline" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 print:hidden ml-auto">
                <button
                  type="button"
                  onClick={handleCopySlip}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  title="Salin rincian retur format teks untuk dikirim via WhatsApp"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  title="Unduh simulasi retur ke Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  title="Cetak struk / form pengajuan retur"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          )}

          {/* Table of Simulated Items */}
          {items.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Belum Ada Barang yang Dipilih untuk Simulasi Retur
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Silakan buka detail faktur lalu klik <strong>"⚡ Simulasikan Retur Faktur Ini"</strong>, atau klik tombol <strong>"+ Retur"</strong> pada riwayat transaksi obat / apotek.
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full min-w-[1250px] text-xs text-left border-collapse border border-slate-200 dark:border-slate-800">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 select-none">
                    <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Ref No. Faktur</th>
                      <th className="py-2.5 px-3 min-w-[220px]">Nama Obat / Barang</th>
                      <th className="py-2.5 px-3 text-right min-w-[75px]">Qty Beli</th>
                      <th className="py-2.5 px-3 text-center min-w-[140px] bg-rose-500/10 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold">
                        Qty Retur
                      </th>
                      <th className="py-2.5 px-3 min-w-[65px]">Satuan</th>
                      <th className="py-2.5 px-3 text-right min-w-[120px]">Harga Satuan (DPP)</th>
                      <th className="py-2.5 px-3 text-right bg-emerald-500/15 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold min-w-[145px]">
                        Harga Satuan (+PPN 11%)
                      </th>
                      <th className="py-2.5 px-3 text-right min-w-[120px]">Subtotal (DPP)</th>
                      <th className="py-2.5 px-3 text-right bg-rose-500/15 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-bold min-w-[145px]">
                        Grand Total (+PPN 11%)
                      </th>
                      <th className="py-2.5 px-3 min-w-[180px]">Alasan / Catatan</th>
                      <th className="py-2.5 px-2 w-10 text-center print:hidden">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {items.map((it, idx) => {
                      const unitDpp = Number(it.harga_satuan) || 0;
                      const unitIncPpn = Math.round(unitDpp * 1.11);
                      const qtyRetur = Number(it.qty_retur) || 0;
                      const subtotalDpp = Math.round(unitDpp * qtyRetur);
                      const grandTotalRetur = Math.round(subtotalDpp * 1.11);

                      return (
                        <tr
                          key={it.id || idx}
                          className="divide-x divide-slate-200 dark:divide-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors"
                        >
                          {/* No */}
                          <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>

                          {/* Ref Faktur */}
                          <td className="py-2 px-3 font-mono font-bold whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => onSelectInvoice && onSelectInvoice(it.nomor_faktur)}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                              title="Buka rincian faktur ini"
                            >
                              <span>{it.nomor_faktur || '-'}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-indigo-400" />
                            </button>
                            {it.tanggal && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {it.tanggal}
                              </span>
                            )}
                          </td>

                          {/* Nama Barang */}
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => onSelectProduct && onSelectProduct(it.nama_barang)}
                              className="text-left font-semibold text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline break-words"
                            >
                              {cleanHtml(it.nama_barang)}
                            </button>
                            {it.kode_barang && (
                              <span className="text-[10px] font-mono text-slate-400 block">
                                {it.kode_barang}
                              </span>
                            )}
                          </td>

                          {/* Qty Beli Asli */}
                          <td className="py-2 px-3 text-right font-medium text-slate-600 dark:text-slate-400 font-mono">
                            {it.qty_beli}
                          </td>

                          {/* Interactive Qty Retur */}
                          <td className="py-1.5 px-2 bg-rose-50/50 dark:bg-rose-950/20">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onUpdateItemQty(it.id, Math.max(1, qtyRetur - 1))}
                                disabled={qtyRetur <= 1}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              <input
                                type="number"
                                min={1}
                                max={Math.max(1, it.qty_beli)}
                                value={qtyRetur}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) {
                                    const clamped = Math.max(1, Math.min(it.qty_beli || 9999, val));
                                    onUpdateItemQty(it.id, clamped);
                                  }
                                }}
                                className="w-14 text-center py-0.5 text-xs font-bold font-mono bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700/80 rounded text-rose-700 dark:text-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-xs"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateItemQty(it.id, Math.min(it.qty_beli || 9999, qtyRetur + 1))
                                }
                                disabled={qtyRetur >= it.qty_beli}
                                className="w-6 h-6 flex items-center justify-center rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Satuan */}
                          <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                            {it.satuan || 'BOX'}
                          </td>

                          {/* Harga Satuan (DPP) */}
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            Rp {unitDpp.toLocaleString('id-ID')}
                          </td>

                          {/* Harga Satuan (+PPN 11%) */}
                          <td className="py-2 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/40 font-mono font-bold text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                            Rp {unitIncPpn.toLocaleString('id-ID')}
                          </td>

                          {/* Subtotal Retur (DPP) */}
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            Rp {subtotalDpp.toLocaleString('id-ID')}
                          </td>

                          {/* Grand Total Retur (+PPN 11%) */}
                          <td className="py-2 px-3 text-right bg-rose-500/10 dark:bg-rose-950/30 font-mono font-bold text-rose-700 dark:text-rose-300 whitespace-nowrap">
                            Rp {grandTotalRetur.toLocaleString('id-ID')}
                          </td>

                          {/* Alasan / Catatan */}
                          <td className="py-1.5 px-2">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={it.alasan || ''}
                                onChange={(e) => onUpdateItemReason(it.id, e.target.value)}
                                placeholder="Ketik alasan (opsional)..."
                                className="w-full px-2 py-0.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                              />
                              <div className="flex flex-wrap gap-1">
                                {quickReasons.slice(0, 3).map((r) => (
                                  <button
                                    key={r}
                                    type="button"
                                    onClick={() => onUpdateItemReason(it.id, r)}
                                    className="text-[9px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded transition-colors"
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Aksi Hapus */}
                          <td className="py-2 px-2 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => onRemoveItem(it.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title="Hapus item ini dari simulasi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Footer Totals */}
                  <tfoot className="bg-slate-100 dark:bg-slate-950 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                      <td colSpan={4} className="py-2.5 px-3 text-right">
                        Total Qty Retur:
                      </td>
                      <td className="py-2.5 px-3 text-center text-rose-600 dark:text-rose-400 font-extrabold font-mono text-sm">
                        {totalPhysicalQty}
                      </td>
                      <td colSpan={3} className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                        Total Retur (DPP):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        Rp {Math.round(totalDpp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-extrabold font-mono text-sm bg-rose-500/10 dark:bg-rose-950/40">
                        Rp {totalGrandRetur.toLocaleString('id-ID')}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-xs text-slate-500 font-normal">
                        Termasuk PPN 11%: Rp {totalPpn.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary & Buttons */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              Estimasi Pengembalian Dana Bersih:{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                Rp {totalGrandRetur.toLocaleString('id-ID')}
              </strong>{' '}
              (Sudah Inc. PPN 11%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Tutup
            </button>
            {items.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download Excel</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
