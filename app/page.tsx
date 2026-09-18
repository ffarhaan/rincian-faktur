'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, Sun, Moon, RotateCcw } from 'lucide-react';
import OmniSearch from '@/components/OmniSearch';
import KPICards from '@/components/KPICards';
import TransactionTable from '@/components/TransactionTable';
import InvoiceModal from '@/components/InvoiceModal';
import SOModal from '@/components/SOModal';
import MedicineModal from '@/components/MedicineModal';
import CustomerModal from '@/components/CustomerModal';
import ReturnSimulationModal, { SimulationItem } from '@/components/ReturnSimulationModal';

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  const [kpiData, setKpiData] = useState<{ summary: any; yearBreakdown: any[] }>({
    summary: null,
    yearBreakdown: [],
  });
  const [tableData, setTableData] = useState<{ rows: any[]; total: number; totalPages: number }>({
    rows: [],
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [selectedYear, setSelectedYear] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Active Modals for Interconnected Linking
  const [activeInvoice, setActiveInvoice] = useState<string | null>(null);
  const [activeSO, setActiveSO] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<string | null>(null);

  // Return Simulation State
  const [simulationItems, setSimulationItems] = useState<SimulationItem[]>([]);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [quickReturInvoice, setQuickReturInvoice] = useState('');
  const [loadingQuickRetur, setLoadingQuickRetur] = useState(false);

  const handleSimulateReturn = (newItems: SimulationItem[]) => {
    setSimulationItems((prev) => {
      const map = new Map<string | number, SimulationItem>();
      prev.forEach((it) => map.set(it.id, it));
      newItems.forEach((it) => {
        if (map.has(it.id)) {
          const existing = map.get(it.id)!;
          map.set(it.id, {
            ...existing,
            qty_retur: Math.min(existing.qty_beli || 9999, existing.qty_retur + (it.qty_retur || 1)),
          });
        } else {
          map.set(it.id, it);
        }
      });
      return Array.from(map.values());
    });
    setIsSimulationOpen(true);
  };

  const handleSimulateInvoiceByNumber = async (invNumber: string) => {
    if (!invNumber || !invNumber.trim()) return;
    setLoadingQuickRetur(true);
    try {
      const res = await fetch(`/api/faktur/${encodeURIComponent(invNumber.trim())}`);
      const data = await res.json();
      if (data && data.items && data.items.length > 0) {
        const simItems: SimulationItem[] = data.items.map((it: any) => ({
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
        handleSimulateReturn(simItems);
        setQuickReturInvoice('');
      } else {
        // Fallback open with basic item
        handleSimulateReturn([
          {
            id: `inv-${invNumber}`,
            nomor_faktur: invNumber.trim(),
            nama_barang: `Barang Faktur ${invNumber.trim()}`,
            harga_satuan: 0,
            qty_beli: 1,
            qty_retur: 1,
            alasan: '',
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching invoice for return simulation:', err);
    } finally {
      setLoadingQuickRetur(false);
    }
  };

  const handleUpdateItemQty = (id: string | number, qty: number) => {
    setSimulationItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, qty_retur: qty } : it))
    );
  };

  const handleUpdateItemReason = (id: string | number, reason: string) => {
    setSimulationItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, alasan: reason } : it))
    );
  };

  const handleRemoveSimulationItem = (id: string | number) => {
    setSimulationItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearAllSimulation = () => {
    setSimulationItems([]);
  };

  // Theme initialization from localStorage
  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Fetch KPIs
  const fetchKPIs = useCallback(async () => {
    try {
      const res = await fetch('/api/kpi');
      const data = await res.json();
      setKpiData(data);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  }, []);

  // Fetch Table Transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.set('tahun', selectedYear);
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterType !== 'all') params.set('isRetur', filterType);
      if (tableSearch.trim()) params.set('search', tableSearch.trim());
      params.set('page', String(page));
      params.set('limit', '50');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      setTableData({
        rows: data.rows || [],
        total: data.total || 0,
        totalPages: data.totalPages || 0,
      });
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, filterCategory, filterType, tableSearch, page, sortBy, sortOrder]);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSortChange = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-indigo-500/30 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Faktur Database
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded">
                  2024 - 2026
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Relational Sales & Retur Explorer</p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Simulasi Retur Quick Button in Top Bar */}
            <button
              type="button"
              onClick={() => setIsSimulationOpen(true)}
              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold"
              title="Buka Simulasi & Estimasi Retur"
            >
              <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Simulasi Retur</span>
              {simulationItems.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-rose-600 text-white rounded-full">
                  {simulationItems.length}
                </span>
              )}
            </button>

            {/* Theme Toggle Button */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-semibold"
                title={theme === 'dark' ? 'Ganti ke Tema Terang (Light Mode)' : 'Ganti ke Tema Gelap (Dark Mode)'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Gelap</span>
                  </>
                )}
              </button>
            )}

            {/* Quick Refresh */}
            <button
              onClick={() => { fetchKPIs(); fetchTransactions(); }}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent dark:border-transparent"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 flex flex-col">
        {/* Omnibar Universal Search & Quick Retur Bar */}
        <section className="py-2 space-y-2.5">
          <OmniSearch
            onSelectInvoice={(inv) => setActiveInvoice(inv)}
            onSelectSO={(so) => setActiveSO(so)}
            onSelectProduct={(prod) => setActiveProduct(prod)}
            onSelectCustomer={(cust) => setActiveCustomer(cust)}
            onSimulateInvoiceReturn={handleSimulateInvoiceByNumber}
          />

          {/* Quick Retur by Invoice Action Bar di Bawah Pencarian */}
          <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 p-2.5 sm:p-3 rounded-2xl shadow-xs max-w-2xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-600 text-white rounded-lg flex-shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span>⚡ Quick Retur per Nomor Faktur:</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                  Ketik No. INV untuk langsung memunculkan semua barang &amp; harga (+PPN 11%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-sm sm:justify-end">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={quickReturInvoice}
                  onChange={(e) => setQuickReturInvoice(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && quickReturInvoice.trim()) {
                      handleSimulateInvoiceByNumber(quickReturInvoice.trim());
                    }
                  }}
                  placeholder="Ketik No. Faktur (INV/...)..."
                  className="w-full pl-3 pr-7 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800/80 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 shadow-xs"
                />
                {quickReturInvoice && (
                  <button
                    onClick={() => setQuickReturInvoice('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (quickReturInvoice.trim()) {
                    handleSimulateInvoiceByNumber(quickReturInvoice.trim());
                  } else if (tableData.rows.length > 0) {
                    handleSimulateInvoiceByNumber(tableData.rows[0].nomor_faktur);
                  } else {
                    setIsSimulationOpen(true);
                  }
                }}
                disabled={loadingQuickRetur}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs flex-shrink-0 disabled:opacity-50"
                title="Langsung tampilkan seluruh barang dari faktur ini untuk simulasi retur"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loadingQuickRetur ? 'animate-spin' : ''}`} />
                <span>{loadingQuickRetur ? 'Memuat...' : 'Simulasi'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* KPI Dashboard Cards */}
        <section>
          <KPICards
            summary={kpiData.summary}
            yearBreakdown={kpiData.yearBreakdown}
            selectedYear={selectedYear}
            onSelectYear={(yr) => { setSelectedYear(yr); setPage(1); }}
          />
        </section>

        {/* Transactions Explorer Table */}
        <section className="flex-1 flex flex-col">
          <TransactionTable
            rows={tableData.rows}
            total={tableData.total}
            page={page}
            totalPages={tableData.totalPages}
            limit={50}
            loading={loading}
            filterYear={selectedYear}
            filterCategory={filterCategory}
            filterType={filterType}
            search={tableSearch}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onPageChange={(p) => setPage(p)}
            onFilterYearChange={(y) => { setSelectedYear(y); setPage(1); }}
            onFilterCategoryChange={(c) => { setFilterCategory(c); setPage(1); }}
            onFilterTypeChange={(t) => { setFilterType(t); setPage(1); }}
            onSearchChange={(s) => { setTableSearch(s); setPage(1); }}
            onSortChange={handleSortChange}
            onSelectInvoice={(inv) => setActiveInvoice(inv)}
            onSelectSO={(so) => setActiveSO(so)}
            onSelectProduct={(prod) => setActiveProduct(prod)}
            onSelectCustomer={(cust) => setActiveCustomer(cust)}
          />
        </section>
      </div>

      {/* Modals with Interconnected Linking */}
      {activeInvoice && (
        <InvoiceModal
          invoiceNumber={activeInvoice}
          onClose={() => setActiveInvoice(null)}
          onSelectSO={(so) => { setActiveInvoice(null); setActiveSO(so); }}
          onSelectCustomer={(cust) => { setActiveInvoice(null); setActiveCustomer(cust); }}
          onSelectProduct={(prod) => { setActiveInvoice(null); setActiveProduct(prod); }}
          onSelectInvoice={(inv) => setActiveInvoice(inv)}
          onSimulateReturn={handleSimulateReturn}
        />
      )}

      {activeSO && (
        <SOModal
          soNumber={activeSO}
          onClose={() => setActiveSO(null)}
          onSelectInvoice={(inv) => { setActiveSO(null); setActiveInvoice(inv); }}
          onSelectCustomer={(cust) => { setActiveSO(null); setActiveCustomer(cust); }}
          onSelectProduct={(prod) => { setActiveSO(null); setActiveProduct(prod); }}
        />
      )}

      {activeProduct && (
        <MedicineModal
          productName={activeProduct}
          onClose={() => setActiveProduct(null)}
          onSelectCustomer={(cust) => { setActiveProduct(null); setActiveCustomer(cust); }}
          onSelectInvoice={(inv) => { setActiveProduct(null); setActiveInvoice(inv); }}
          onSelectSO={(so) => { setActiveProduct(null); setActiveSO(so); }}
        />
      )}

      {activeCustomer && (
        <CustomerModal
          customerName={activeCustomer}
          onClose={() => setActiveCustomer(null)}
          onSelectInvoice={(inv) => { setActiveCustomer(null); setActiveInvoice(inv); }}
          onSelectProduct={(prod) => { setActiveCustomer(null); setActiveProduct(prod); }}
          onSelectSO={(so) => { setActiveCustomer(null); setActiveSO(so); }}
          onSimulateReturn={handleSimulateReturn}
        />
      )}

      {/* Return Simulation Modal */}
      <ReturnSimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        items={simulationItems}
        onUpdateItemQty={handleUpdateItemQty}
        onUpdateItemReason={handleUpdateItemReason}
        onRemoveItem={handleRemoveSimulationItem}
        onClearAll={handleClearAllSimulation}
        onAddSimulationItems={handleSimulateReturn}
        onLoadInvoice={handleSimulateInvoiceByNumber}
        onSelectInvoice={(inv) => {
          setIsSimulationOpen(false);
          setActiveInvoice(inv);
        }}
        onSelectProduct={(prod) => {
          setIsSimulationOpen(false);
          setActiveProduct(prod);
        }}
        onSelectCustomer={(cust) => {
          setIsSimulationOpen(false);
          setActiveCustomer(cust);
        }}
      />
    </main>
  );
}
