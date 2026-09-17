'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Building2,
  FileText,
  Pill,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Receipt,
  RotateCcw,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

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

export default function CustomerModal({
  customerName,
  onClose,
  onSelectInvoice,
  onSelectProduct,
  onSelectSO,
}: CustomerModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'top_products' | 'invoices'>('top_products');

  // Search states
  const [productSearch, setProductSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Accordion for product -> invoices drill down
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [productInvoices, setProductInvoices] = useState<Record<string, any[]>>({});
  const [loadingProductInvoices, setLoadingProductInvoices] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!customerName) return;
    setLoading(true);
    setProductSearch('');
    setInvoiceSearch('');
    setExpandedProduct(null);
    setProductInvoices({});
    setLoadingProductInvoices({});

    fetch(`/api/pelanggan?name=${encodeURIComponent(customerName)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [customerName]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!data?.top_products) return [];
    if (!productSearch.trim()) return data.top_products;
    const q = productSearch.toLowerCase().trim();
    return data.top_products.filter(
      (p: any) =>
        p.nama_barang?.toLowerCase().includes(q) ||
        p.kode_barang?.toLowerCase().includes(q)
    );
  }, [data, productSearch]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    if (!data?.invoices) return [];
    if (!invoiceSearch.trim()) return data.invoices;
    const q = invoiceSearch.toLowerCase().trim();
    return data.invoices.filter(
      (inv: any) =>
        inv.nomor_faktur?.toLowerCase().includes(q) ||
        inv.no_so?.toLowerCase().includes(q) ||
        inv.tanggal?.toLowerCase().includes(q)
    );
  }, [data, invoiceSearch]);

  // Toggle Accordion on Product to fetch its specific Invoices (Ref INV)
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Faktur</span>
                <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-300 mt-1 block">
                  {(data.summary?.total_invoices || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Faktur</span>
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Frekuensi Order (SO)</span>
                <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-300 mt-1 block">
                  {(data.summary?.total_orders || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Kali</span>
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Belanja Bersih</span>
                <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block truncate">
                  Rp {Math.round(data.summary?.net_spent || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Retur</span>
                <span className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 block truncate">
                  Rp {Math.abs(Math.round(data.summary?.total_retur || 0)).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('top_products')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'top_products'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Pill className="w-4 h-4" />
                Daftar Obat yang Dibeli ({data.top_products?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'invoices'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Riwayat Faktur ({data.invoices?.length || 0})
              </button>
            </div>

            {/* Tab 1: Products List with Instant Search & Ref INV Drill-Down */}
            {activeTab === 'top_products' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Klik obat atau tombol <strong>Frekuensi Beli</strong> untuk melihat daftar <strong>Nomor Faktur (Ref INV)</strong>.
                  </div>

                  {/* Instant Search Bar for Products */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Cari nama obat yang dibeli..."
                      className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-sm transition-colors"
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
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                              Obat tidak ditemukan dengan kata kunci &quot;{productSearch}&quot;
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((prod: any) => {
                            const isExpanded = expandedProduct === prod.nama_barang;
                            const invoices = productInvoices[prod.nama_barang] || [];
                            const isLoadingThis = loadingProductInvoices[prod.nama_barang];

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
                                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                          <div className="flex items-center gap-2">
                                            <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                              Daftar Faktur (Ref INV) Pembelian &quot;{cleanHtml(prod.nama_barang)}&quot;
                                            </span>
                                          </div>
                                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Total: <strong className="text-sky-600 dark:text-sky-300 font-bold">{invoices.length} Faktur / Ref INV</strong>
                                          </span>
                                        </div>

                                        {isLoadingThis ? (
                                          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                                            <Loader2 className="w-4 h-4 animate-spin text-sky-500 dark:text-sky-400" />
                                            <span>Mengambil daftar nomor faktur...</span>
                                          </div>
                                        ) : invoices.length === 0 ? (
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
                                                  <th className="py-2 px-3 text-right">Harga Satuan</th>
                                                  <th className="py-2 px-3 text-right">Total Nominal</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {invoices.map((inv: any, idx: number) => {
                                                  const isRetur = Number(inv.is_retur) === 1;
                                                  return (
                                                    <tr key={inv.id || idx} className="hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-colors">
                                                      <td className="py-2 px-3">
                                                        <button
                                                          type="button"
                                                          onClick={() => onSelectInvoice(inv.nomor_faktur)}
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
                                                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
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
                </div>
              </div>
            )}

            {/* Tab 2: Invoices List with Instant Search */}
            {activeTab === 'invoices' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Menampilkan seluruh riwayat faktur yang diterbitkan untuk apotek ini.
                  </div>

                  {/* Instant Search Bar for Invoices */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      placeholder="Cari No Faktur atau No SO..."
                      className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-sm transition-colors"
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
                          <th className="py-2.5 px-3 text-right">Total Nilai</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                              Faktur tidak ditemukan dengan kata kunci &quot;{invoiceSearch}&quot;
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((inv: any) => (
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
                              <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                Rp {(inv.total_amount || 0).toLocaleString('id-ID')}
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
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
