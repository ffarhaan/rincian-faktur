'use client';

import React from 'react';
import {
  FileText,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

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
      'Total Harga': r.total_harga,
      'Kategori': r.category,
      'Keterangan': cleanHtml(r.keterangan),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
    XLSX.writeFile(wb, `Export_Faktur_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden flex flex-col transition-colors">
      {/* Controls / Filter Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
            <span className="text-slate-400 dark:text-slate-500 font-medium">Kat:</span>
            <select
              value={filterCategory}
              onChange={(e) => onFilterCategoryChange(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Semua (1P, 2P, 3P)</option>
              <option value="1P">1P</option>
              <option value="2P">2P</option>
              <option value="3P">3P</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
            <span className="text-slate-400 dark:text-slate-500 font-medium">Jenis:</span>
            <select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Semua (Sales & Retur)</option>
              <option value="sales">Hanya Penjualan</option>
              <option value="retur">Hanya Retur (RINV)</option>
            </select>
          </div>

          {/* Quick inline search */}
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter tabel ini..."
            className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-40 sm:w-56 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-2">
            Total: <span className="font-bold text-slate-800 dark:text-slate-100">{total.toLocaleString('id-ID')}</span> baris
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
                  <span>No. Faktur</span>
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
              <th className="py-3 px-3 text-right">Harga</th>
              <th
                onClick={() => onSortChange('total_harga')}
                className="py-3 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Kat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-slate-400">
                  <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mb-2" />
                  <p className="text-xs">Memuat data dari database...</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-slate-400 text-xs">
                  Tidak ada data transaksi yang ditemukan.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isRetur = r.is_retur === 1;
                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors ${
                      isRetur ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    {/* No. Faktur */}
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onSelectInvoice(r.nomor_faktur)}
                        className="font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors group text-left font-mono"
                      >
                        <FileText className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                        <span>{r.nomor_faktur}</span>
                        {isRetur && (
                          <span className="px-1 py-0.2 text-[9px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 rounded">
                            RETUR
                          </span>
                        )}
                      </button>
                    </td>

                    {/* No. SO */}
                    <td className="py-2.5 px-3">
                      {r.no_so ? (
                        <button
                          onClick={() => onSelectSO(r.no_so)}
                          className="font-mono text-[11px] text-amber-700 dark:text-amber-300/90 hover:text-amber-600 dark:hover:text-amber-300 flex items-center gap-1 transition-colors group"
                        >
                          <ShoppingCart className="w-3 h-3 text-slate-400 group-hover:text-amber-500" />
                          <span>{r.no_so}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 font-mono text-[11px]">-</span>
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
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      Rp {(r.harga_satuan || 0).toLocaleString('id-ID')}
                    </td>

                    {/* Total Harga */}
                    <td className={`py-2.5 px-3 text-right font-semibold ${isRetur ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      Rp {(r.total_harga || 0).toLocaleString('id-ID')}
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
            className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
