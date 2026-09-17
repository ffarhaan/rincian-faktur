'use client';

import React, { useEffect, useState, useMemo, useDeferredValue } from 'react';
import {
  X,
  Pill,
  Building2,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
  Receipt,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface MedicineModalProps {
  productName: string | null;
  onClose: () => void;
  onSelectCustomer: (cust: string) => void;
  onSelectInvoice: (inv: string) => void;
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

export default function MedicineModal({
  productName,
  onClose,
  onSelectCustomer,
  onSelectInvoice,
  onSelectSO,
}: MedicineModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchApotek, setSearchApotek] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [accordionSearch, setAccordionSearch] = useState<Record<string, string>>({});

  const deferredSearchApotek = useDeferredValue(searchApotek);

  // Accordion state: customer name -> boolean
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  // Invoices cache: customer name -> invoice items array
  const [customerInvoices, setCustomerInvoices] = useState<Record<string, any[]>>({});
  const [loadingInvoices, setLoadingInvoices] = useState<Record<string, boolean>>({});

  const decodedProductName = useMemo(() => cleanHtml(productName || ''), [productName]);

  useEffect(() => {
    if (!productName) return;
    setLoading(true);
    setSearchApotek('');
    setCustomerPage(1);
    setExpandedCustomer(null);
    setCustomerInvoices({});
    setLoadingInvoices({});
    setAccordionSearch({});

    fetch(`/api/obat?name=${encodeURIComponent(productName)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [productName]);

  // Reset pagination when search changes
  useEffect(() => {
    setCustomerPage(1);
  }, [deferredSearchApotek]);

  // Filtered pharmacies
  const filteredCustomers = useMemo(() => {
    if (!data?.customers) return [];
    if (!deferredSearchApotek.trim()) return data.customers;
    const q = deferredSearchApotek.toLowerCase().trim();
    return data.customers.filter((c: any) =>
      c.nama_pelanggan?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q)
    );
  }, [data, deferredSearchApotek]);

  // Paginated pharmacies
  const paginatedCustomers = useMemo(() => {
    const start = (customerPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, customerPage]);

  const totalCustomerPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;

  // Toggle accordion and fetch invoices if not cached
  const handleToggleCustomer = async (custName: string) => {
    if (expandedCustomer === custName) {
      setExpandedCustomer(null);
      return;
    }

    setExpandedCustomer(custName);

    if (!customerInvoices[custName] && productName) {
      setLoadingInvoices((prev) => ({ ...prev, [custName]: true }));
      try {
        const res = await fetch(
          `/api/obat/invoices?product=${encodeURIComponent(productName)}&customer=${encodeURIComponent(custName)}`
        );
        const json = await res.json();
        setCustomerInvoices((prev) => ({ ...prev, [custName]: json.invoices || [] }));
      } catch (err) {
        console.error('Error fetching invoices for customer:', err);
      } finally {
        setLoadingInvoices((prev) => ({ ...prev, [custName]: false }));
      }
    }
  };

  if (!productName) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 mr-4">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 flex-shrink-0">
              <Pill className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate" title={decodedProductName}>
                {decodedProductName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>
                  Kode: <span className="text-slate-700 dark:text-slate-300 font-mono font-semibold">{data?.summary?.kode_barang || '-'}</span>
                </span>
                <span>&bull;</span>
                <span>
                  Satuan: <span className="text-slate-700 dark:text-slate-300 font-semibold">{data?.summary?.satuan || '-'}</span>
                </span>
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
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 dark:text-emerald-400" />
            <span className="text-sm font-medium">Memuat detail & riwayat apotek...</span>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Qty Terjual</span>
                <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {(data.summary?.total_sales_qty || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-emerald-700/80 dark:text-emerald-300/80">{data.summary?.satuan}</span>
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Total Qty Retur</span>
                <span className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
                  {(data.summary?.total_retur_qty || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-rose-700/80 dark:text-rose-300/80">{data.summary?.satuan}</span>
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Jumlah Apotek Pembeli</span>
                <span className="text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-300 mt-1 block">
                  {(data.summary?.total_customers || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-sky-700/80 dark:text-sky-200/80">Apotek</span>
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Harga Satuan Rata-rata</span>
                <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-300 mt-1 block">
                  Rp {Math.round(data.summary?.avg_price || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Pharmacies List with Search & Invoice Frequency Drill-Down */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Daftar Apotek Pembeli ({data.customers?.length || 0})
                  </h3>
                  {searchApotek.trim() && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full font-medium">
                      Ditemukan {filteredCustomers.length}
                    </span>
                  )}
                </div>

                {/* Instant Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchApotek}
                    onChange={(e) => setSearchApotek(e.target.value)}
                    placeholder="Cari nama apotek..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm transition-colors"
                  />
                  {searchApotek && (
                    <button
                      onClick={() => setSearchApotek('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Pharmacies Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/50 shadow-sm">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-8"></th>
                        <th className="py-2.5 px-3">Nama Apotek</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3 text-right">Frekuensi Order</th>
                        <th className="py-2.5 px-3 text-right">Total Qty</th>
                        <th className="py-2.5 px-3 text-right">Total Belanja</th>
                        <th className="py-2.5 px-3 text-right">Order Terakhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {paginatedCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                            Apotek tidak ditemukan dengan kata kunci &quot;{searchApotek}&quot;
                          </td>
                        </tr>
                      ) : (
                        paginatedCustomers.map((cust: any) => {
                          const isExpanded = expandedCustomer === cust.nama_pelanggan;
                          const invoices = customerInvoices[cust.nama_pelanggan] || [];
                          const isLoadingThis = loadingInvoices[cust.nama_pelanggan];
                          const currentAccordionQuery = (accordionSearch[cust.nama_pelanggan] || '').toLowerCase().trim();

                          const filteredCustInvoices = currentAccordionQuery
                            ? invoices.filter(
                                (inv: any) =>
                                  inv.nomor_faktur?.toLowerCase().includes(currentAccordionQuery) ||
                                  inv.no_so?.toLowerCase().includes(currentAccordionQuery) ||
                                  inv.tanggal?.toLowerCase().includes(currentAccordionQuery)
                              )
                            : invoices;

                          return (
                            <React.Fragment key={cust.nama_pelanggan}>
                              <tr
                                className={`transition-colors cursor-pointer ${
                                  isExpanded
                                    ? 'bg-indigo-50/70 dark:bg-slate-800/50'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/70'
                                }`}
                                onClick={() => handleToggleCustomer(cust.nama_pelanggan)}
                              >
                                <td className="py-2 px-2 text-center text-slate-400 dark:text-slate-500">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 inline" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 inline" />
                                  )}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectCustomer(cust.nama_pelanggan);
                                      }}
                                      className="font-semibold text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors text-left flex items-center gap-1.5"
                                      title="Buka Profil Lengkap Apotek"
                                    >
                                      {cleanHtml(cust.nama_pelanggan)}
                                      <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500 inline" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded">
                                    {cust.category || '3P'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleCustomer(cust.nama_pelanggan);
                                    }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                      isExpanded
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                                        : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900'
                                    }`}
                                    title="Klik untuk melihat rincian nomor faktur"
                                  >
                                    <FileText className="w-3 h-3" />
                                    {cust.total_orders}x Order
                                  </button>
                                </td>
                                <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {cust.total_qty.toLocaleString('id-ID')} {data.summary?.satuan}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 font-medium">
                                  Rp {(cust.total_spent || 0).toLocaleString('id-ID')}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                  {cust.last_order_date}
                                </td>
                              </tr>

                              {/* Accordion: Detailed Invoices List for this Customer */}
                              {isExpanded && (
                                <tr className="bg-slate-50 dark:bg-slate-950/90 border-y border-indigo-200 dark:border-indigo-950">
                                  <td colSpan={7} className="p-3 sm:p-4">
                                    <div className="bg-white dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-3 sm:p-4 shadow-sm dark:shadow-lg space-y-3">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                        <div className="flex items-center gap-2">
                                          <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                            Rincian Faktur Pembelian obat &quot;{decodedProductName}&quot; oleh{' '}
                                            <span className="text-sky-600 dark:text-sky-300 font-bold">{cleanHtml(cust.nama_pelanggan)}</span>
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={accordionSearch[cust.nama_pelanggan] || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setAccordionSearch((prev) => ({ ...prev, [cust.nama_pelanggan]: val }));
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="Filter No Faktur..."
                                            className="px-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                          />
                                          <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                            Total: <strong className="text-indigo-600 dark:text-indigo-300 font-bold">{invoices.length} Faktur</strong>
                                          </span>
                                        </div>
                                      </div>

                                      {isLoadingThis ? (
                                        <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                                          <Loader2 className="w-4 h-4 animate-spin text-indigo-500 dark:text-indigo-400" />
                                          <span>Mengambil daftar nomor faktur...</span>
                                        </div>
                                      ) : filteredCustInvoices.length === 0 ? (
                                        <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                                          Tidak ada faktur ditemukan untuk apotek ini.
                                        </div>
                                      ) : (
                                        <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800/80 rounded-lg">
                                          <table className="w-full text-[11px] text-left">
                                            <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 font-medium sticky top-0 border-b border-slate-200 dark:border-slate-800">
                                              <tr>
                                                <th className="py-2 px-3">Nomor Faktur (Klik Link)</th>
                                                <th className="py-2 px-3">No SO</th>
                                                <th className="py-2 px-3">Tanggal</th>
                                                <th className="py-2 px-3 text-center">Tipe</th>
                                                <th className="py-2 px-3 text-right">Kuantitas</th>
                                                <th className="py-2 px-3 text-right">Harga Satuan</th>
                                                <th className="py-2 px-3 text-right">Total Nominal</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                              {filteredCustInvoices.map((inv: any, idx: number) => {
                                                const isRetur = Number(inv.is_retur) === 1;
                                                return (
                                                  <tr key={inv.id || idx} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors">
                                                    <td className="py-2 px-3">
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          onSelectInvoice(inv.nomor_faktur);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 font-bold font-mono text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded transition-all"
                                                        title="Klik untuk membuka rincian faktur ini"
                                                      >
                                                        <span>{inv.nomor_faktur}</span>
                                                        <ExternalLink className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
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

                {/* Pagination for Pharmacies */}
                {totalCustomerPages > 1 && (
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Menampilkan {((customerPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(customerPage * ITEMS_PER_PAGE, filteredCustomers.length)} dari {filteredCustomers.length} apotek
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                        disabled={customerPage === 1}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 font-medium"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                      </button>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {customerPage} / {totalCustomerPages}
                      </span>
                      <button
                        onClick={() => setCustomerPage((p) => Math.min(totalCustomerPages, p + 1))}
                        disabled={customerPage === totalCustomerPages}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 font-medium"
                      >
                        Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
