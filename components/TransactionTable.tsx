'use client';

import React, { useState } from 'react';
import {
  FileText,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ReturCalculatorModal, { ReturItem } from './ReturCalculatorModal';

interface TransactionTableProps {
  rows: any[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  loading: boolean;
  filterYear: string;
  filterCategory: string;
  filterType: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onPageChange: (p: number) => void;
  onFilterYearChange: (y: string) => void;
  onFilterCategoryChange: (c: string) => void;
  onFilterTypeChange: (t: string) => void;
  onSearchChange: (s: string) => void;
  onSortChange: (col: string) => void;
  onSelectInvoice: (inv: string) => void;
  onSelectSO: (so: string) => void;
  onSelectProduct: (prod: string) => void;
  onSelectCustomer: (cust: string) => void;
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

export default function TransactionTable({
  rows,
  total,
  page,
  totalPages,
  limit,
  loading,
  filterYear,
  filterCategory,
  filterType,
  search,
  sortBy,
  sortOrder,
  onPageChange,
  onFilterYearChange,
  onFilterCategoryChange,
  onFilterTypeChange,
  onSearchChange,
  onSortChange,
  onSelectInvoice,
  onSelectSO,
  onSelectProduct,
  onSelectCustomer,
}: TransactionTableProps) {
  // Retur modal state
  const [isReturOpen, setIsReturOpen] = useState(false);
  const [returCustomer, setReturCustomer] = useState('');
  const [returInvoice, setReturInvoice] = useState('');
  const [returDate, setReturDate] = useState('');
  const [returItems, setReturItems] = useState<ReturItem[]>([]);

  const handleOpenRetur = (r: any) => {
    setReturCustomer(r.nama_pelanggan || '');
    setReturInvoice(r.nomor_faktur || '');
    setReturDate(r.tanggal || '');
    setReturItems([
      {
        id: r.id,
        kode_barang: r.kode_barang,
        nama_barang: r.nama_barang,
        satuan: r.satuan,
        harga_satuan: Number(r.harga_satuan) || 0,
        qty_beli: Math.abs(Number(r.kuantitas) || 0),
        qty_retur: 1,
        nomor_faktur: r.nomor_faktur,
        tanggal: r.tanggal,
      },
    ]);
    setIsReturOpen(true);
  };

  const handleExport = () => {
    if (rows.length === 0) return;
    const exportData = rows.map((r) => ({
      'No. Faktur': r.nomor_faktur,
      'No. SO': r.no_so,
      'Tanggal': r.tanggal,
      'Nama Pelanggan': cleanHtml(r.nama_pelanggan),
      'Kode Barang': r.kode_barang,
      'Nama Barang': cleanHtml(r.nama_barang),
      'Qty': r.kuantitas,
      'Satuan': r.satuan,
      'Harga Satuan': r.harga_satuan,
      'Total (DPP)': r.total_harga,
      'PPN 11%': Math.round((r.total_harga || 0) * 0.11),
      'Grand Total (Inc. PPN 11%)': Math.round((r.total_harga || 0) * 1.11),
      'Kategori': r.category,
      'Keterangan': cleanHtml(r.keterangan),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
    XLSX.writeFile(wb, `Export_Faktur_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden flex flex-col transition-colors">
        {/* Controls / Filter Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xs text-xs font-medium">
              <span className="text-slate-400 dark:text-slate-500 px-2">Kategori:</span>
              {['all', '1P', '2P', '3P'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => onFilterCategoryChange(cat)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'Semua' : cat}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xs text-xs font-medium">
              <span className="text-slate-400 dark:text-slate-500 px-2">Jenis:</span>
              {[
                { id: 'all', label: 'Semua' },
                { id: 'sales', label: 'Sales' },
                { id: 'retur', label: 'Retur' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => onFilterTypeChange(t.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    filterType === t.id
                      ? t.id === 'retur'
                        ? 'bg-rose-600 text-white shadow-xs font-bold'
                        : 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Export Button */}
            <button
              onClick={handleExport}
              disabled={rows.length === 0}
              className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-40"
              title="Download Hasil ke Format Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Total Records Counter */}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Total: <strong className="text-slate-800 dark:text-slate-200">{total.toLocaleString('id-ID')}</strong> transaksi
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 min-h-[350px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 select-none">
              <tr>
                <th
                  onClick={() => onSortChange('nomor_faktur')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>No. Faktur (Ref INV)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('no_so')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>No. SO</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('tanggal')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('nama_pelanggan')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Pelanggan / Apotek</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('nama_barang')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>Obat / Barang</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('kuantitas')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-3">Satuan</th>
                <th className="py-3 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold">
                  Harga Satuan
                </th>
                <th
                  onClick={() => onSortChange('total_harga')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total (DPP)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  PPN 11%
                </th>
                <th className="py-3 px-3 text-right bg-indigo-500/10 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold whitespace-nowrap">
                  Grand Total (+PPN 11%)
                </th>
                <th className="py-3 px-3 text-center">Kat</th>
                <th className="py-3 px-3 text-center">Aksi Retur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2" />
                    <p className="text-xs">Memuat data dari database...</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400 text-xs">
                    Tidak ada data transaksi yang ditemukan.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isRetur = r.is_retur === 1;
                  const subtotal = Number(r.total_harga) || 0;
                  const ppn = Math.round(subtotal * 0.11);
                  const grandTotal = Math.round(subtotal * 1.11);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors ${
                        isRetur ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* No. Faktur */}
                      <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                        <button
                          onClick={() => onSelectInvoice(r.nomor_faktur)}
                          className="hover:underline text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-500/70" />
                          <span>{r.nomor_faktur}</span>
                        </button>
                      </td>

                      {/* No. SO */}
                      <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {r.no_so ? (
                          <button
                            onClick={() => onSelectSO(r.no_so)}
                            className="hover:underline hover:text-amber-600 dark:hover:text-amber-300 flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3 text-amber-500/70" />
                            <span>{r.no_so}</span>
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Tanggal */}
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">{r.tanggal}</td>

                      {/* Pelanggan */}
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => onSelectCustomer(r.nama_pelanggan)}
                          className="font-semibold text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-left line-clamp-1"
                        >
                          {cleanHtml(r.nama_pelanggan)}
                        </button>
                      </td>

                      {/* Obat */}
                      <td className="py-2.5 px-3 max-w-xs">
                        <button
                          onClick={() => onSelectProduct(r.nama_barang)}
                          className="font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left line-clamp-1"
                          title={cleanHtml(r.nama_barang)}
                        >
                          {cleanHtml(r.nama_barang)}
                        </button>
                      </td>

                      {/* Qty */}
                      <td className={`py-2.5 px-3 text-right font-semibold ${isRetur ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {r.kuantitas}
                      </td>

                      {/* Satuan */}
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{r.satuan}</td>

                      {/* Harga Satuan */}
                      <td className="py-2.5 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/30 font-mono font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                        Rp {(r.harga_satuan || 0).toLocaleString('id-ID')}
                      </td>

                      {/* Total Harga (DPP) */}
                      <td className={`py-2.5 px-3 text-right font-semibold whitespace-nowrap ${isRetur ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        Rp {subtotal.toLocaleString('id-ID')}
                      </td>

                      {/* PPN 11% */}
                      <td className={`py-2.5 px-3 text-right font-mono text-xs whitespace-nowrap ${isRetur ? 'text-rose-500 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        Rp {ppn.toLocaleString('id-ID')}
                      </td>

                      {/* Grand Total (Inc. PPN 11%) */}
                      <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap bg-indigo-500/5 dark:bg-indigo-950/20 ${isRetur ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        Rp {grandTotal.toLocaleString('id-ID')}
                      </td>

                      {/* Kategori */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            r.category === '1P'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80'
                              : r.category === '2P'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {r.category || '3P'}
                        </span>
                      </td>

                      {/* Action: Retur */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenRetur(r)}
                          className="px-2 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 mx-auto"
                          title="Hitung retur untuk transaksi ini"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retur</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Halaman <span className="font-bold text-slate-800 dark:text-slate-200">{page}</span> dari{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages || 1}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Retur Calculator Modal Popup */}
      <ReturCalculatorModal
        isOpen={isReturOpen}
        onClose={() => setIsReturOpen(false)}
        customerName={returCustomer}
        invoiceNumber={returInvoice}
        invoiceDate={returDate}
        items={returItems}
        onSelectInvoice={onSelectInvoice}
        onSelectProduct={onSelectProduct}
      />
    </>
  );
}
