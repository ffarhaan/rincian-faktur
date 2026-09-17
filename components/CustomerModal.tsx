'use client';

import React, { useEffect, useState, useMemo, useDeferredValue, useCallback } from 'react';
import {
  X,
  Building2,
  FileText,
  Pill,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Sparkles,
  Tag,
} from 'lucide-react';
import ReturCalculatorModal, { ReturItem } from './ReturCalculatorModal';

interface CustomerModalProps {
  customerName: string | null;
  onClose: () => void;
  onSelectInvoice: (inv: string) => void;
  onSelectProduct: (prod: string) => void;
  onSelectSO?: (so: string) => void;
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

const ITEMS_PER_PAGE = 50;

export default function CustomerModal({
  customerName,
  onClose,
  onSelectInvoice,
  onSelectProduct,
  onSelectSO,
}: CustomerModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'items_history' | 'top_products' | 'invoices'>('items_history');

  // Tab 1: Item History State (Ref INV, Kode, Nama, Qty, Harga Satuan)
  const [itemSearch, setItemSearch] = useState('');
  const [itemFilterType, setItemFilterType] = useState<'all' | 'sales' | 'retur'>('all');
  const [itemPage, setItemPage] = useState(1);
  const [itemData, setItemData] = useState<{ items: any[]; total: number; totalPages: number }>({
    items: [],
    total: 0,
    totalPages: 0,
  });
  const [loadingItems, setLoadingItems] = useState(false);
  const [isReturOpen, setIsReturOpen] = useState(false);
  const [returItems, setReturItems] = useState<ReturItem[]>([]);
  const [selectedReturInvoice, setSelectedReturInvoice] = useState<string>('');
  const [selectedReturDate, setSelectedReturDate] = useState<string>('');

  // Tab 2 & 3 States
  const [productSearch, setProductSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [accordionSearch, setAccordionSearch] = useState<Record<string, string>>({});
  const [productPage, setProductPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);

  // Accordion for product -> invoices drill down
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [productInvoices, setProductInvoices] = useState<Record<string, any[]>>({});
  const [loadingProductInvoices, setLoadingProductInvoices] = useState<Record<string, boolean>>({});

  // Deferred inputs for smooth typing
  const deferredItemSearch = useDeferredValue(itemSearch);
  const deferredProductSearch = useDeferredValue(productSearch);
  const deferredInvoiceSearch = useDeferredValue(invoiceSearch);

  // Fetch Summary and initial details
  useEffect(() => {
    if (!customerName) return;
    setLoading(true);
    setItemSearch('');
    setItemFilterType('all');
    setItemPage(1);
    setProductSearch('');
    setInvoiceSearch('');
    setProductPage(1);
    setInvoicePage(1);
    setExpandedProduct(null);
    setProductInvoices({});
    setLoadingProductInvoices({});
    setAccordionSearch({});

    fetch(`/api/pelanggan?name=${encodeURIComponent(customerName)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [customerName]);

  // Fetch Items History with Ref INV and Unit Price
  const fetchItemsHistory = useCallback(async () => {
    if (!customerName) return;
    setLoadingItems(true);
    try {
      const params = new URLSearchParams();
      params.set('customer', customerName);
      if (deferredItemSearch.trim()) params.set('search', deferredItemSearch.trim());
      if (itemFilterType !== 'all') params.set('isRetur', itemFilterType);
      params.set('page', String(itemPage));
      params.set('limit', String(ITEMS_PER_PAGE));

      const res = await fetch(`/api/pelanggan/items?${params.toString()}`);
      const json = await res.json();
      setItemData({
        items: json.items || [],
        total: json.total || 0,
        totalPages: json.totalPages || 0,
      });
    } catch (err) {
      console.error('Error fetching items history:', err);
    } finally {
      setLoadingItems(false);
    }
  }, [customerName, deferredItemSearch, itemFilterType, itemPage]);

  useEffect(() => {
    if (activeTab === 'items_history') {
      fetchItemsHistory();
    }
  }, [activeTab, fetchItemsHistory]);

  // Reset page when filter changes
  useEffect(() => {
    setItemPage(1);
  }, [deferredItemSearch, itemFilterType]);

  useEffect(() => {
    setProductPage(1);
  }, [deferredProductSearch]);

  useEffect(() => {
    setInvoicePage(1);
  }, [deferredInvoiceSearch]);

  // Filtered Products (Tab 2)
  const filteredProducts = useMemo(() => {
    if (!data?.top_products) return [];
    if (!deferredProductSearch.trim()) return data.top_products;
    const q = deferredProductSearch.toLowerCase().trim();
    return data.top_products.filter(
      (p: any) =>
        p.nama_barang?.toLowerCase().includes(q) ||
        p.kode_barang?.toLowerCase().includes(q)
    );
  }, [data, deferredProductSearch]);

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, productPage]);

  const totalProductPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;

  // Filtered Invoices (Tab 3)
  const filteredInvoices = useMemo(() => {
    if (!data?.invoices) return [];
    if (!deferredInvoiceSearch.trim()) return data.invoices;
    const q = deferredInvoiceSearch.toLowerCase().trim();
    return data.invoices.filter(
      (inv: any) =>
        inv.nomor_faktur?.toLowerCase().includes(q) ||
        inv.no_so?.toLowerCase().includes(q) ||
        inv.tanggal?.toLowerCase().includes(q)
    );
  }, [data, deferredInvoiceSearch]);

  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, invoicePage]);

  const totalInvoicePages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE) || 1;

  // Toggle Accordion on Product (Tab 2)
  const handleToggleProduct = async (productName: string) => {
    if (expandedProduct === productName) {
      setExpandedProduct(null);
      return;
    }

    setExpandedProduct(productName);

    if (!productInvoices[productName] && customerName) {
      setLoadingProductInvoices((prev) => ({ ...prev, [productName]: true }));
      try {
        const res = await fetch(
          `/api/obat/invoices?product=${encodeURIComponent(productName)}&customer=${encodeURIComponent(customerName)}`
        );
        const json = await res.json();
        setProductInvoices((prev) => ({ ...prev, [productName]: json.invoices || [] }));
      } catch (err) {
        console.error('Error fetching invoices for product:', err);
      } finally {
        setLoadingProductInvoices((prev) => ({ ...prev, [productName]: false }));
      }
    }
  };

  if (!customerName) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 mr-4">
            <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl border border-sky-500/20 flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                  {cleanHtml(customerName)}
                </h2>
                {data?.summary?.category && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded">
                    {data.summary.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Transaksi: {data?.summary?.first_transaction} s/d {data?.summary?.last_transaction}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500 dark:text-sky-400" />
            <span className="text-sm font-medium">Memuat profil & riwayat transaksi apotek...</span>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Faktur</span>
                <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-300 mt-0.5 block">
                  {(data.summary?.total_invoices || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Faktur</span>
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Frekuensi Order (SO)</span>
                <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-300 mt-0.5 block">
                  {(data.summary?.total_orders || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Kali</span>
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Belanja (DPP)</span>
                <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                  Rp {Math.round(data.summary?.net_spent || 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5 font-medium">
                  Grand: Rp {Math.round((data.summary?.net_spent || 0) * 1.11).toLocaleString('id-ID')} (+PPN 11%)
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Retur (DPP)</span>
                <span className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 block truncate">
                  Rp {Math.abs(Math.round(data.summary?.total_retur || 0)).toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5 font-medium">
                  Grand: Rp {Math.round(Math.abs(data.summary?.total_retur || 0) * 1.11).toLocaleString('id-ID')} (+PPN 11%)
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              <button
                onClick={() => setActiveTab('items_history')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
                  activeTab === 'items_history'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Cari Ref INV &amp; Harga Satuan (Untuk Retur)</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded font-semibold">
                  Utama
                </span>
              </button>
              <button
                onClick={() => setActiveTab('top_products')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'top_products'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Pill className="w-4 h-4" />
                Rekap per Obat ({data.top_products?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'invoices'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Riwayat Faktur ({data.summary?.total_invoices || data.invoices?.length || 0})
              </button>
            </div>

            {/* Tab 1 (PRIMARY): Item History with Direct Ref INV, Kode, Nama, Qty, Satuan, Harga Satuan */}
            {activeTab === 'items_history' && (
              <div className="space-y-3">
                {/* Search and Filters Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {/* Search input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Cari Nama Obat, Kode Barang, atau Nomor Faktur..."
                      className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-sm transition-all"
                    />
                    {itemSearch && (
                      <button
                        onClick={() => setItemSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter type & results count */}
                  <div className="flex items-center gap-2">
                    <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                      <button
                        onClick={() => setItemFilterType('all')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          itemFilterType === 'all'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Semua
                      </button>
                      <button
                        onClick={() => setItemFilterType('sales')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          itemFilterType === 'sales'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Beli (Sales)
                      </button>
                      <button
                        onClick={() => setItemFilterType('retur')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          itemFilterType === 'retur'
                            ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Retur
                      </button>
                    </div>

                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap pl-1">
                      Total: <strong className="text-slate-800 dark:text-slate-200 font-bold">{itemData.total.toLocaleString('id-ID')}</strong> baris
                    </span>
                  </div>
                </div>

                {/* Direct Ref INV & Price Items Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
                  <div className="max-h-[420px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 select-none">
                        <tr>
                          <th className="py-2.5 px-3">No. Faktur (Ref INV)</th>
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">Kode Barang</th>
                          <th className="py-2.5 px-3">Nama Obat / Barang</th>
                          <th className="py-2.5 px-3 text-right">Qty Beli</th>
                          <th className="py-2.5 px-3">Satuan</th>
                          <th className="py-2.5 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                            Harga Satuan (Hit Retur)
                          </th>
                          <th className="py-2.5 px-3 text-right">Total Nilai (DPP)</th>
                          <th className="py-2.5 px-3 text-right bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold">
                            Grand Total (+PPN 11%)
                          </th>
                          <th className="py-2.5 px-3 text-center">Tipe</th>
                          <th className="py-2.5 px-3">No. SO</th>
                          <th className="py-2.5 px-3 text-center">Aksi Retur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {loadingItems ? (
                          <tr>
                            <td colSpan={12} className="py-16 text-center text-slate-400">
                              <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
                              <span>Mencari rincian faktur &amp; harga satuan...</span>
                            </td>
                          </tr>
                        ) : itemData.items.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="py-12 text-center text-slate-400 dark:text-slate-500">
                              {itemSearch
                                ? `Tidak ada transaksi yang cocok dengan kata kunci "${itemSearch}"`
                                : 'Tidak ada riwayat pembelian untuk apotek ini.'}
                            </td>
                          </tr>
                        ) : (
                          itemData.items.map((it: any) => {
                            const isRetur = Number(it.is_retur) === 1;
                            const itemDpp = Number(it.total_harga) || 0;
                            const itemGrand = Math.round(itemDpp * 1.11);
                            return (
                              <tr
                                key={it.id}
                                className={`transition-colors ${
                                  isRetur
                                    ? 'bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-950/40'
                                    : 'hover:bg-indigo-50/40 dark:hover:bg-slate-850/60'
                                }`}
                              >
                                {/* Ref INV (Nomor Faktur) */}
                                <td className="py-2 px-3 font-mono font-bold whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => onSelectInvoice(it.nomor_faktur)}
                                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:underline bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/60"
                                    title="Klik untuk membuka detail faktur ini"
                                  >
                                    <span>{it.nomor_faktur}</span>
                                    <ExternalLink className="w-3 h-3 text-indigo-500" />
                                  </button>
                                </td>

                                {/* Tanggal */}
                                <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {it.tanggal}
                                </td>

                                {/* Kode Barang */}
                                <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400">
                                  {it.kode_barang || '-'}
                                </td>

                                {/* Nama Barang */}
                                <td className="py-2 px-3">
                                  <button
                                    type="button"
                                    onClick={() => onSelectProduct(it.nama_barang)}
                                    className="font-medium text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline text-left"
                                    title="Lihat riwayat obat ini"
                                  >
                                    {cleanHtml(it.nama_barang)}
                                  </button>
                                </td>

                                {/* Qty Beli */}
                                <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                                  {it.kuantitas?.toLocaleString('id-ID')}
                                </td>

                                {/* Satuan */}
                                <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                                  {it.satuan}
                                </td>

                                {/* Harga Satuan (HIGHLIGHTED FOR RETUR HIT) */}
                                <td className="py-2 px-3 text-right bg-emerald-500/10 dark:bg-emerald-950/40 font-mono font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                                  Rp {(Number(it.harga_satuan) || 0).toLocaleString('id-ID')}
                                </td>

                                {/* Total Nilai (DPP) */}
                                <td
                                  className={`py-2 px-3 text-right font-semibold whitespace-nowrap ${
                                    isRetur ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  Rp {itemDpp.toLocaleString('id-ID')}
                                </td>

                                {/* Grand Total (+PPN 11%) */}
                                <td
                                  className={`py-2 px-3 text-right font-mono font-bold whitespace-nowrap bg-indigo-500/5 dark:bg-indigo-950/20 ${
                                    isRetur ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  Rp {itemGrand.toLocaleString('id-ID')}
                                </td>

                                {/* Status Tipe */}
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  {isRetur ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded">
                                      <RotateCcw className="w-2.5 h-2.5" /> Retur
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Sales
                                    </span>
                                  )}
                                </td>

                                {/* No. SO */}
                                <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                  {it.no_so ? (
                                    onSelectSO ? (
                                      <button
                                        type="button"
                                        onClick={() => onSelectSO(it.no_so)}
                                        className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                                      >
                                        {it.no_so}
                                      </button>
                                    ) : (
                                      it.no_so
                                    )
                                  ) : (
                                    '-'
                                  )}
                                </td>

                                {/* Aksi Retur */}
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedReturInvoice(it.nomor_faktur || '');
                                      setSelectedReturDate(it.tanggal || '');
                                      setReturItems([
                                        {
                                          kode_barang: it.kode_barang || '',
                                          nama_barang: it.nama_barang || '',
                                          satuan: it.satuan || 'PCS',
                                          harga_satuan: Number(it.harga_satuan) || 0,
                                          qty_beli: Number(it.kuantitas) || 1,
                                          qty_retur: 1,
                                          nomor_faktur: it.nomor_faktur || '',
                                          tanggal: it.tanggal || '',
                                        },
                                      ]);
                                      setIsReturOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-xs"
                                    title="Hitung & Buat Slip Retur untuk item ini"
                                  >
                                    <RotateCcw className="w-3 h-3 text-rose-500" />
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

                  {/* Pagination for Item History */}
                  {itemData.totalPages > 1 && (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Menampilkan {((itemPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(itemPage * ITEMS_PER_PAGE, itemData.total)} dari {itemData.total.toLocaleString('id-ID')} baris
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                          disabled={itemPage === 1}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 font-medium"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                        </button>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {itemPage} / {itemData.totalPages}
                        </span>
                        <button
                          onClick={() => setItemPage((p) => Math.min(itemData.totalPages, p + 1))}
                          disabled={itemPage === itemData.totalPages}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 font-medium"
                        >
                          Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Aggregated Products List */}
            {activeTab === 'top_products' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Menampilkan rekapitulasi total pembelian per nama obat. Klik obat atau tombol <strong>Frekuensi Beli</strong> untuk melihat daftar Ref INV.
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Cari nama obat..."
                      className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-sm transition-colors"
                    />
                    {productSearch && (
                      <button
                        onClick={() => setProductSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
                  <div className="max-h-[380px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-8"></th>
                          <th className="py-2.5 px-3">Nama Obat</th>
                          <th className="py-2.5 px-3 text-right">Frekuensi Beli (Ref INV)</th>
                          <th className="py-2.5 px-3 text-right">Total Qty</th>
                          <th className="py-2.5 px-3 text-right">Total Nilai</th>
                          <th className="py-2.5 px-3 text-right">Beli Terakhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {paginatedProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                              Obat tidak ditemukan dengan kata kunci &quot;{productSearch}&quot;
                            </td>
                          </tr>
                        ) : (
                          paginatedProducts.map((prod: any) => {
                            const isExpanded = expandedProduct === prod.nama_barang;
                            const invoices = productInvoices[prod.nama_barang] || [];
                            const isLoadingThis = loadingProductInvoices[prod.nama_barang];
                            const currentAccordionQuery = (accordionSearch[prod.nama_barang] || '').toLowerCase().trim();

                            const filteredProductInvoices = currentAccordionQuery
                              ? invoices.filter(
                                  (inv: any) =>
                                    inv.nomor_faktur?.toLowerCase().includes(currentAccordionQuery) ||
                                    inv.no_so?.toLowerCase().includes(currentAccordionQuery) ||
                                    inv.tanggal?.toLowerCase().includes(currentAccordionQuery)
                                )
                              : invoices;

                            return (
                              <React.Fragment key={prod.nama_barang}>
                                <tr
                                  className={`transition-colors cursor-pointer ${
                                    isExpanded
                                      ? 'bg-sky-50/70 dark:bg-slate-800/50'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/70'
                                  }`}
                                  onClick={() => handleToggleProduct(prod.nama_barang)}
                                >
                                  <td className="py-2 px-2 text-center text-slate-400 dark:text-slate-500">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-sky-600 dark:text-sky-400 inline" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 inline" />
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectProduct(prod.nama_barang);
                                        }}
                                        className="font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left flex items-center gap-1.5"
                                        title="Buka Detail Obat"
                                      >
                                        {cleanHtml(prod.nama_barang)}
                                        <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500 inline" />
                                      </button>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      Kode: {prod.kode_barang || '-'}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleProduct(prod.nama_barang);
                                      }}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                        isExpanded
                                          ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/20'
                                          : 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 hover:bg-sky-100 dark:hover:bg-sky-900'
                                      }`}
                                      title="Klik untuk melihat nomor faktur (Ref INV)"
                                    >
                                      <FileText className="w-3 h-3" />
                                      {prod.order_frequency}x Beli
                                    </button>
                                  </td>
                                  <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {prod.total_qty.toLocaleString('id-ID')} {prod.satuan}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 font-medium">
                                    Rp {(prod.total_spent || 0).toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                    {prod.last_purchased}
                                  </td>
                                </tr>

                                {/* Accordion: Ref INV (List of Invoices for this product & customer) */}
                                {isExpanded && (
                                  <tr className="bg-slate-50 dark:bg-slate-950/90 border-y border-sky-200 dark:border-sky-950">
                                    <td colSpan={6} className="p-3 sm:p-4">
                                      <div className="bg-white dark:bg-slate-900/90 border border-sky-200 dark:border-sky-500/30 rounded-xl p-3 sm:p-4 shadow-sm dark:shadow-lg space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                          <div className="flex items-center gap-2">
                                            <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                              Daftar Faktur (Ref INV) Pembelian &quot;{cleanHtml(prod.nama_barang)}&quot;
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              value={accordionSearch[prod.nama_barang] || ''}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setAccordionSearch((prev) => ({ ...prev, [prod.nama_barang]: val }));
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              placeholder="Filter Ref INV..."
                                              className="px-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                                            />
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                              Total: <strong className="text-sky-600 dark:text-sky-300 font-bold">{invoices.length} Ref INV</strong>
                                            </span>
                                          </div>
                                        </div>

                                        {isLoadingThis ? (
                                          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                                            <Loader2 className="w-4 h-4 animate-spin text-sky-500 dark:text-sky-400" />
                                            <span>Mengambil daftar nomor faktur...</span>
                                          </div>
                                        ) : filteredProductInvoices.length === 0 ? (
                                          <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                                            Tidak ada faktur ditemukan untuk obat ini.
                                          </div>
                                        ) : (
                                          <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800/80 rounded-lg">
                                            <table className="w-full text-[11px] text-left">
                                              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 font-medium sticky top-0 border-b border-slate-200 dark:border-slate-800">
                                                <tr>
                                                  <th className="py-2 px-3">Nomor Faktur (Klik Link Ref INV)</th>
                                                  <th className="py-2 px-3">No SO</th>
                                                  <th className="py-2 px-3">Tanggal</th>
                                                  <th className="py-2 px-3 text-center">Tipe</th>
                                                  <th className="py-2 px-3 text-right">Kuantitas</th>
                                                  <th className="py-2 px-3 text-right bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300">Harga Satuan</th>
                                                  <th className="py-2 px-3 text-right">Total Nominal</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {filteredProductInvoices.map((inv: any, idx: number) => {
                                                  const isRetur = Number(inv.is_retur) === 1;
                                                  return (
                                                    <tr key={inv.id || idx} className="hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-colors">
                                                      <td className="py-2 px-3">
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelectInvoice(inv.nomor_faktur);
                                                          }}
                                                          className="inline-flex items-center gap-1.5 font-bold font-mono text-sky-700 dark:text-sky-300 hover:text-sky-800 dark:hover:text-sky-200 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/60 px-2 py-0.5 rounded transition-all"
                                                          title="Buka rincian faktur ini"
                                                        >
                                                          <span>{inv.nomor_faktur}</span>
                                                          <ExternalLink className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                                                        </button>
                                                      </td>
                                                      <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400">
                                                        {inv.no_so ? (
                                                          onSelectSO ? (
                                                            <button
                                                              type="button"
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectSO(inv.no_so);
                                                              }}
                                                              className="hover:text-sky-600 dark:hover:text-sky-300 hover:underline"
                                                            >
                                                              {inv.no_so}
                                                            </button>
                                                          ) : (
                                                            inv.no_so
                                                          )
                                                        ) : (
                                                          '-'
                                                        )}
                                                      </td>
                                                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-mono">
                                                        {inv.tanggal}
                                                      </td>
                                                      <td className="py-2 px-3 text-center">
                                                        {isRetur ? (
                                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded">
                                                            <RotateCcw className="w-2.5 h-2.5" /> Retur
                                                          </span>
                                                        ) : (
                                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded">
                                                            <CheckCircle2 className="w-2.5 h-2.5" /> Sales
                                                          </span>
                                                        )}
                                                      </td>
                                                      <td className="py-2 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                                                        {inv.kuantitas} {inv.satuan}
                                                      </td>
                                                      <td className="py-2 px-3 text-right bg-emerald-500/10 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                                        Rp {(Number(inv.harga_satuan) || 0).toLocaleString('id-ID')}
                                                      </td>
                                                      <td
                                                        className={`py-2 px-3 text-right font-bold ${
                                                          isRetur ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                                        }`}
                                                      >
                                                        Rp {(Number(inv.total_harga) || 0).toLocaleString('id-ID')}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for Products */}
                  {totalProductPages > 1 && (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Menampilkan {((productPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(productPage * ITEMS_PER_PAGE, filteredProducts.length)} dari {filteredProducts.length} obat
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                          disabled={productPage === 1}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 font-medium"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                        </button>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {productPage} / {totalProductPages}
                        </span>
                        <button
                          onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                          disabled={productPage === totalProductPages}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 font-medium"
                        >
                          Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Invoices Summary List */}
            {activeTab === 'invoices' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Menampilkan riwayat nomor faktur yang diterbitkan untuk apotek ini.
                  </div>

                  {/* Instant Search Bar for Invoices */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      placeholder="Cari No Faktur atau No SO..."
                      className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-sm transition-colors"
                    />
                    {invoiceSearch && (
                      <button
                        onClick={() => setInvoiceSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
                  <div className="max-h-[380px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">Nomor Faktur (Ref INV)</th>
                          <th className="py-2.5 px-3">No. SO</th>
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3 text-right">Items</th>
                          <th className="py-2.5 px-3 text-right">Total (DPP)</th>
                          <th className="py-2.5 px-3 text-right bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold">
                            Grand Total (+PPN 11%)
                          </th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {paginatedInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                              Faktur tidak ditemukan dengan kata kunci &quot;{invoiceSearch}&quot;
                            </td>
                          </tr>
                        ) : (
                          paginatedInvoices.map((inv: any) => (
                            <tr key={inv.nomor_faktur} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                              <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                <button
                                  type="button"
                                  onClick={() => onSelectInvoice(inv.nomor_faktur)}
                                  className="inline-flex items-center gap-1.5 text-sky-700 dark:text-sky-300 hover:underline"
                                >
                                  {inv.nomor_faktur}
                                  <ExternalLink className="w-3 h-3 text-sky-500 inline" />
                                </button>
                                {inv.is_retur === 1 && (
                                  <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 rounded">RETUR</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                {inv.no_so ? (
                                  onSelectSO ? (
                                    <button
                                      type="button"
                                      onClick={() => onSelectSO(inv.no_so)}
                                      className="hover:text-sky-600 dark:hover:text-sky-300 hover:underline"
                                    >
                                      {inv.no_so}
                                    </button>
                                  ) : (
                                    inv.no_so
                                  )
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{inv.tanggal}</td>
                              <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">{inv.item_count} item</td>
                              <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                                Rp {(inv.total_amount || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-mono font-bold whitespace-nowrap bg-indigo-500/5 dark:bg-indigo-950/20">
                                Rp {Math.round((inv.total_amount || 0) * 1.11).toLocaleString('id-ID')}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  onClick={() => onSelectInvoice(inv.nomor_faktur)}
                                  className="px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors font-semibold border border-indigo-200 dark:border-indigo-800"
                                >
                                  Lihat Faktur
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for Invoices */}
                  {totalInvoicePages > 1 && (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Menampilkan {((invoicePage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(invoicePage * ITEMS_PER_PAGE, filteredInvoices.length)} dari {filteredInvoices.length} faktur
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                          disabled={invoicePage === 1}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 font-medium"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                        </button>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {invoicePage} / {totalInvoicePages}
                        </span>
                        <button
                          onClick={() => setInvoicePage((p) => Math.min(totalInvoicePages, p + 1))}
                          disabled={invoicePage === totalInvoicePages}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 font-medium"
                        >
                          Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Retur Calculator & Slip Generator Modal */}
      <ReturCalculatorModal
        isOpen={isReturOpen}
        onClose={() => setIsReturOpen(false)}
        customerName={customerName || ''}
        invoiceNumber={selectedReturInvoice}
        invoiceDate={selectedReturDate}
        items={returItems}
        onSelectInvoice={(inv) => {
          setIsReturOpen(false);
          onSelectInvoice(inv);
        }}
        onSelectProduct={(prod) => {
          setIsReturOpen(false);
          onSelectProduct(prod);
        }}
      />
    </div>
  );
}

