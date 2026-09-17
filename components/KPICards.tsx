'use client';

import React from 'react';
import { TrendingUp, FileText, ShoppingBag, RotateCcw, Users } from 'lucide-react';

interface KPICardsProps {
  summary: any;
  yearBreakdown: any[];
  selectedYear: string;
  onSelectYear: (year: string) => void;
}

export default function KPICards({
  summary,
  yearBreakdown,
  selectedYear,
  onSelectYear,
}: KPICardsProps) {
  if (!summary) return null;

  return (
    <div className="space-y-4">
      {/* Year Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onSelectYear('all')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
            selectedYear === 'all'
              ? 'bg-indigo-600 text-white shadow-indigo-500/20'
              : 'bg-white dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Semua Tahun (2024-2026)
        </button>
        {['2024', '2025', '2026'].map((yr) => (
          <button
            key={yr}
            onClick={() => onSelectYear(yr)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              selectedYear === yr
                ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                : 'bg-white dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Tahun {yr}
          </button>
        ))}
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Invoices */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/90 p-4 rounded-2xl shadow-sm dark:shadow-lg dark:shadow-black/20">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-medium">
            <span>Total Faktur</span>
            <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            {(summary.total_invoices || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {(summary.total_so || 0).toLocaleString('id-ID')} Sales Order
          </div>
        </div>

        {/* Omset Penjualan */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/90 p-4 rounded-2xl shadow-sm dark:shadow-lg dark:shadow-black/20">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-medium">
            <span>Omset Penjualan (DPP)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
            Rp {Math.round(summary.omset_penjualan || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Grand: <strong className="text-slate-700 dark:text-slate-200 font-bold">Rp {Math.round((summary.omset_penjualan || 0) * 1.11).toLocaleString('id-ID')}</strong> (+PPN 11%)
          </div>
        </div>

        {/* Total Retur */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/90 p-4 rounded-2xl shadow-sm dark:shadow-lg dark:shadow-black/20">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-medium">
            <span>Total Retur (DPP)</span>
            <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 truncate">
            Rp {Math.abs(Math.round(summary.total_retur || 0)).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Grand: <strong className="text-slate-700 dark:text-slate-200 font-bold">Rp {Math.round(Math.abs(summary.total_retur || 0) * 1.11).toLocaleString('id-ID')}</strong> (+PPN 11%)
          </div>
        </div>

        {/* Total Produk Obat */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/90 p-4 rounded-2xl shadow-sm dark:shadow-lg dark:shadow-black/20">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-medium">
            <span>Master Produk</span>
            <ShoppingBag className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            {(summary.total_products || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Jenis item obat</div>
        </div>

        {/* Total Apotek / Pelanggan */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/90 p-4 rounded-2xl shadow-sm dark:shadow-lg dark:shadow-black/20 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1.5 font-medium">
            <span>Pelanggan / Apotek</span>
            <Users className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            {(summary.total_customers || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Apotek terdaftar</div>
        </div>
      </div>
    </div>
  );
}
