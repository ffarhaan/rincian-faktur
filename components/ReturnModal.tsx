'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  Loader2,
  ArrowRight,
  Filter,
  Save,
  Calendar,
  History,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface ReturnItem {
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
  no_batch?: string;
}

export type SimulationItem = ReturnItem; // Alias for backwards compatibility

export interface SavedReturnDocument {
  id: string;
  nomor_retur: string;
  tanggal_retur: string;
  catatan?: string;
  nama_pelanggan?: string;
  nomor_faktur_list: string[];
  items: ReturnItem[];
  total_dpp: number;
  total_ppn: number;
  grand_total: number;
  created_at: string;
}

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReturnItem[];
  onUpdateItemQty: (id: string | number, qty: number) => void;
  onUpdateItemReason: (id: string | number, reason: string) => void;
  onRemoveItem: (id: string | number) => void;
  onClearAll: () => void;
  onAddReturnItems?: (items: ReturnItem[]) => void;
  onAddSimulationItems?: (items: ReturnItem[]) => void; // alias
  onLoadInvoice?: (invNumber: string) => Promise<void> | void;
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

function generateReturnDocNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `RET-${y}${m}${d}-${randomSuffix}`;
}

export default function ReturnModal({
  isOpen,
  onClose,
  items,
  onUpdateItemQty,
  onUpdateItemReason,
  onRemoveItem,
  onClearAll,
  onAddReturnItems,
  onAddSimulationItems,
  onLoadInvoice,
  onSelectInvoice,
  onSelectProduct,
  onSelectCustomer,
}: ReturnModalProps) {
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  
  // Document metadata state
  const [nomorRetur, setNomorRetur] = useState(generateReturnDocNumber());
  const [tanggalRetur, setTanggalRetur] = useState(new Date().toISOString().slice(0, 10));
  const [catatanRetur, setCatatanRetur] = useState('');

  // Invoice Search State
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [invoiceSearchResults, setInvoiceSearchResults] = useState<any[]>([]);
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);
  const [isLoadingInvoiceData, setIsLoadingInvoiceData] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [tableFilterQuery, setTableFilterQuery] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Saved Returns History State
  const [savedReturnsList, setSavedReturnsList] = useState<SavedReturnDocument[]>([]);

  // Load saved returns from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('faktur_saved_returns');
      if (stored) {
        setSavedReturnsList(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading saved returns:', e);
    }
  }, [isOpen]);

  // Debounced search for invoices inside modal
  useEffect(() => {
    if (!invoiceSearchQuery.trim() || invoiceSearchQuery.trim().length < 2) {
      setInvoiceSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingInvoice(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(invoiceSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setInvoiceSearchResults(data.invoices || []);
          setIsDropdownOpen(true);
        }
      } catch (err) {
        console.error('Error searching invoices in modal:', err);
      } finally {
        setIsSearchingInvoice(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [invoiceSearchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const addItemHandler = onAddReturnItems || onAddSimulationItems;

  // Fetch invoice items and add to return list
  const handleSelectInvoiceToLoad = async (invNumber: string) => {
    if (!invNumber || !invNumber.trim()) return;
    setIsLoadingInvoiceData(true);
    setIsDropdownOpen(false);
    try {
      if (onLoadInvoice) {
        await onLoadInvoice(invNumber.trim());
      } else {
        const res = await fetch(`/api/faktur/${encodeURIComponent(invNumber.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const fetchedItems = data.items || [];
          if (fetchedItems.length > 0 && addItemHandler) {
            const returnItems: ReturnItem[] = fetchedItems.map((it: any, idx: number) => ({
              id: `${data.nomor_faktur}-${it.kode_barang || idx}-${Date.now()}-${idx}`,
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
            addItemHandler(returnItems);
          }
        }
      }
      setNotificationMsg(`✓ Berhasil memuat ${invNumber.trim()} ke dalam daftar retur.`);
      setTimeout(() => setNotificationMsg(null), 4000);
      setInvoiceSearchQuery('');
    } catch (err) {
      console.error('Error loading invoice into return:', err);
      setNotificationMsg(`❌ Gagal memuat faktur ${invNumber.trim()}`);
      setTimeout(() => setNotificationMsg(null), 4000);
    } finally {
      setIsLoadingInvoiceData(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceSearchQuery.trim()) return;
    if (invoiceSearchResults.length > 0) {
      handleSelectInvoiceToLoad(invoiceSearchResults[0].nomor_faktur);
    } else {
      handleSelectInvoiceToLoad(invoiceSearchQuery.trim());
    }
  };

  // Save Return Document permanently to local storage
  const handleSaveDocument = () => {
    if (items.length === 0) return;

    const doc: SavedReturnDocument = {
      id: `doc-${Date.now()}`,
      nomor_retur: nomorRetur || generateReturnDocNumber(),
      tanggal_retur: tanggalRetur || new Date().toISOString().slice(0, 10),
      catatan: catatanRetur,
      nama_pelanggan: customerNames.map(cleanHtml).join(', ') || '-',
      nomor_faktur_list: invoiceNumbers,
      items: [...items],
      total_dpp: totalDpp,
      total_ppn: totalPpn,
      grand_total: totalGrandRetur,
      created_at: new Date().toISOString(),
    };

    const updatedList = [doc, ...savedReturnsList.filter((d) => d.nomor_retur !== doc.nomor_retur)];
    setSavedReturnsList(updatedList);
    try {
      localStorage.setItem('faktur_saved_returns', JSON.stringify(updatedList));
    } catch (e) {
      console.error('Error saving return doc:', e);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // Load a previously saved return document
  const handleLoadSavedDoc = (doc: SavedReturnDocument) => {
    if (onClearAll) onClearAll();
    if (addItemHandler) {
      addItemHandler(doc.items);
    }
    setNomorRetur(doc.nomor_retur);
    setTanggalRetur(doc.tanggal_retur);
    setCatatanRetur(doc.catatan || '');
    setActiveTab('form');
  };

  // Delete a saved return document
  const handleDeleteSavedDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedReturnsList.filter((d) => d.id !== id);
    setSavedReturnsList(updated);
    try {
      localStorage.setItem('faktur_saved_returns', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

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
        'No. Dokumen Retur': nomorRetur,
        'Tanggal Retur': tanggalRetur,
        'Ref No. Faktur': it.nomor_faktur || '-',
        'Tanggal Faktur Asli': it.tanggal || '-',
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
        'Grand Total Retur (+PPN 11%) (Rp)': grandTotal,
        'Alasan / Kondisi Retur': it.alasan || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retur_Barang');
    XLSX.writeFile(
      wb,
      `Surat_Retur_${nomorRetur}_${tanggalRetur}.xlsx`
    );
  };

  // Copy to WhatsApp text format
  const handleCopySlip = () => {
    if (items.length === 0) return;

    const customerStr = customerNames.length > 0 ? customerNames.map(cleanHtml).join(', ') : '-';
    const invoiceStr = invoiceNumbers.length > 0 ? invoiceNumbers.join(', ') : '-';

    let text = `*📄 SURAT / BUKTI PENGAJUAN RETUR BARANG*\n`;
    text += `*No. Dokumen Retur:* ${nomorRetur}\n`;
    text += `*Tanggal Retur:* ${tanggalRetur}\n`;
    text += `*Apotek / Pelanggan:* ${customerStr}\n`;
    text += `*Ref Faktur:* ${invoiceStr}\n`;
    if (catatanRetur) text += `*Catatan:* ${catatanRetur}\n`;
    text += `-------------------------------------------\n`;

    items.forEach((it, idx) => {
      const unitDpp = Number(it.harga_satuan) || 0;
      const unitIncPpn = Math.round(unitDpp * 1.11);
      const qtyRetur = Number(it.qty_retur) || 0;
      const grandTotal = Math.round(unitDpp * qtyRetur * 1.11);

      text += `${idx + 1}. *${cleanHtml(it.nama_barang)}*\n`;
      text += `   Ref Faktur: ${it.nomor_faktur || '-'} | Beli: ${it.qty_beli} ${it.satuan || ''}\n`;
      text += `   *Qty Retur: ${qtyRetur} ${it.satuan || ''}* @ Rp ${unitIncPpn.toLocaleString('id-ID')} (Inc. PPN 11%)\n`;
      text += `   Subtotal: Rp ${grandTotal.toLocaleString('id-ID')}`;
      if (it.alasan) text += ` | Alasan: ${it.alasan}`;
      text += `\n`;
    });

    text += `-------------------------------------------\n`;
    text += `*TOTAL JENIS BARANG:* ${totalItemsCount} item (${totalPhysicalQty} Unit Fisik)\n`;
    text += `*TOTAL NILAI RETUR (DPP):* Rp ${Math.round(totalDpp).toLocaleString('id-ID')}\n`;
    text += `*PPN 11% RETUR:* Rp ${totalPpn.toLocaleString('id-ID')}\n`;
    text += `*GRAND TOTAL PENGEMBALIAN (+PPN 11%):* Rp ${totalGrandRetur.toLocaleString('id-ID')}\n`;
    text += `\n_Diterbitkan secara resmi via Sistem Database Faktur_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const quickReasons = ['ED Dekat', 'Kemasan Rusak', 'Salah Order / Kirim', 'Overstock', 'Fisik Cacat', 'Batch Expired'];

  // Filter items in the table
  const filteredItems = items.filter((it) => {
    if (!tableFilterQuery.trim()) return true;
    const q = tableFilterQuery.toLowerCase();
    return (
      (it.nama_barang && it.nama_barang.toLowerCase().includes(q)) ||
      (it.kode_barang && it.kode_barang.toLowerCase().includes(q)) ||
      (it.nomor_faktur && it.nomor_faktur.toLowerCase().includes(q)) ||
      (it.alasan && it.alasan.toLowerCase().includes(q)) ||
      (it.nama_pelanggan && it.nama_pelanggan.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:max-w-none print:max-h-none print:shadow-none print:border-none">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 print:bg-transparent">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Formulir &amp; Dokumen Retur Barang</span>
                  <span className="px-2 py-0.5 text-xs font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded">
                    {totalItemsCount} Item
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Penerbitan dan rekap dokumen pengembalian barang resmi (Termasuk PPN 11%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {/* Tab switch: Formulir vs Arsip Retur */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-medium mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'form'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Form Retur</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Arsip Retur ({savedReturnsList.length})</span>
              </button>
            </div>

            {items.length > 0 && activeTab === 'form' && (
              <button
                onClick={onClearAll}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center gap-1"
                title="Kosongkan semua daftar barang retur"
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

        {/* Tab 2: Arsip Dokumen Retur Sebelumnya */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Riwayat &amp; Arsip Dokumen Retur yang Telah Dibuat
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daftar dokumen retur yang telah Anda simpan dan dapat dicetak atau dimuat kembali kapan saja.
                </p>
              </div>
            </div>

            {savedReturnsList.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 p-6 space-y-2">
                <History className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Dokumen Retur Tersimpan</h4>
                <p className="text-xs text-slate-500">
                  Buat dokumen retur di tab <strong>Form Retur</strong> lalu klik tombol <strong>&quot;Simpan Dokumen Retur&quot;</strong>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedReturnsList.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleLoadSavedDoc(doc)}
                    className="p-4 bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 rounded-2xl shadow-xs hover:shadow-md cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                            {doc.nomor_retur}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                            {doc.tanggal_retur}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                          {doc.nama_pelanggan || 'Pelanggan / Apotek'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Ref Faktur: {doc.nomor_faktur_list.join(', ') || '-'} &bull; {doc.items.length} Barang
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedDoc(doc.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Hapus arsip ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Grand Total (+PPN 11%):</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                        Rp {doc.grand_total.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Form Retur */}
        {activeTab === 'form' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Feedback Notifications */}
            {savedSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Dokumen Retur <strong>{nomorRetur}</strong> berhasil disimpan ke dalam arsip!</span>
              </div>
            )}

            {notificationMsg && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 rounded-xl text-xs font-medium flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span>{notificationMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationMsg(null)}
                  className="text-indigo-600 hover:text-indigo-800 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Document Header Metadata Fields (Editable) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  No. Dokumen Retur
                </label>
                <input
                  type="text"
                  value={nomorRetur}
                  onChange={(e) => setNomorRetur(e.target.value)}
                  className="w-full px-2.5 py-1.5 font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-rose-600 dark:text-rose-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Tanggal Retur
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={tanggalRetur}
                    onChange={(e) => setTanggalRetur(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Catatan / Keterangan Dokumen
                </label>
                <input
                  type="text"
                  value={catatanRetur}
                  onChange={(e) => setCatatanRetur(e.target.value)}
                  placeholder="Cth: Pengembalian barang rusak / driver..."
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* 🔍 LIVE INVOICE SEARCH BAR INSIDE MODAL */}
            <div ref={searchContainerRef} className="relative z-20 print:hidden">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (invoiceSearchResults.length > 0) setIsDropdownOpen(true);
                    }}
                    placeholder="🔍 Cari No. Faktur (cth: INV-2024...) atau Apotek untuk langsung masukkan seluruh barang ke form retur..."
                    className="w-full pl-10 pr-24 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
                  />
                  {invoiceSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceSearchQuery('');
                        setInvoiceSearchResults([]);
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoadingInvoiceData || !invoiceSearchQuery.trim()}
                  className="ml-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  {isLoadingInvoiceData || isSearchingInvoice ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>+ Masukkan Faktur</span>
                </button>
              </form>

              {/* Dropdown Results for Search */}
              {isDropdownOpen && invoiceSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-30 max-h-60 overflow-y-auto">
                  <div className="p-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Pilih faktur untuk memuat seluruh barangnya:</span>
                    <span className="text-[10px] text-rose-500">Klik faktur di bawah</span>
                  </div>
                  {invoiceSearchResults.map((inv: any) => (
                    <button
                      key={inv.nomor_faktur}
                      type="button"
                      onClick={() => handleSelectInvoiceToLoad(inv.nomor_faktur)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 border-b border-slate-100 dark:border-slate-800/60 last:border-0 flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 group-hover:underline">
                            {inv.nomor_faktur}
                          </span>
                          {inv.is_retur === 1 && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">
                              RETUR
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                          {cleanHtml(inv.nama_pelanggan)} &bull; <span className="text-slate-400">{inv.tanggal}</span> &bull; {inv.item_count} items
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Rp {(inv.total_nominal || 0).toLocaleString('id-ID')}
                        </span>
                        <span className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 group-hover:bg-rose-700">
                          <span>Pilih</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Total Item / Qty Fisik Retur
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
                  Total Nilai Retur (DPP)
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
                  Grand Total Retur (+PPN 11%)
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-0.5 block truncate">
                  Rp {totalGrandRetur.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Context Summary (Customer & Invoices) */}
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
                      <span className="text-slate-500 dark:text-slate-400">Ref Faktur Asli:</span>
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

                {/* Action Toolbar & Table Filter */}
                <div className="flex flex-wrap items-center gap-2 print:hidden ml-auto">
                  {items.length > 0 && (
                    <div className="relative min-w-[180px] sm:min-w-[220px]">
                      <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={tableFilterQuery}
                        onChange={(e) => setTableFilterQuery(e.target.value)}
                        placeholder="Filter obat di daftar..."
                        className="w-full pl-8 pr-7 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                      {tableFilterQuery && (
                        <button
                          type="button"
                          onClick={() => setTableFilterQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveDocument}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    title="Simpan dokumen retur ini ke dalam arsip"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Dokumen</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySlip}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    title="Salin rincian retur format teks untuk dikirim via WhatsApp"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin!' : 'Salin WA'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    title="Unduh dokumen retur ke Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    title="Cetak surat jalan / bukti retur resmi"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Surat Jalan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Official Print Header for Physical Print Slip */}
            <div className="hidden print:block mb-6 p-4 border border-slate-800 rounded">
              <div className="text-center border-b pb-3 mb-3">
                <h1 className="text-lg font-black uppercase tracking-wider">SURAT PENGEMBALIAN BARANG (RETUR)</h1>
                <p className="text-xs text-slate-600">Dokumen Bukti Fisik Penyerahan &amp; Penerimaan Barang Retur</p>
              </div>
              <div className="grid grid-cols-2 text-xs gap-2">
                <div>
                  <p><strong>No. Dokumen:</strong> {nomorRetur}</p>
                  <p><strong>Tanggal Retur:</strong> {tanggalRetur}</p>
                  <p><strong>Ref Faktur Asli:</strong> {invoiceNumbers.join(', ')}</p>
                </div>
                <div className="text-right">
                  <p><strong>Apotek / Pelanggan:</strong> {customerNames.map(cleanHtml).join(', ')}</p>
                  {catatanRetur && <p><strong>Catatan:</strong> {catatanRetur}</p>}
                </div>
              </div>
            </div>

            {/* Table of Return Items */}
            {items.length === 0 ? (
              <div className="py-14 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Belum Ada Barang yang Dimasukkan ke Form Retur
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Ketik nomor faktur pada kolom pencarian <strong>di atas</strong> (misal: <code>INV-2024...</code>), atau buka rincian faktur lalu klik <strong>&quot;⚡ Buat Retur Faktur Ini&quot;</strong>.
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
                        <th className="py-2.5 px-3 text-right min-w-[120px]">Subtotal Retur (DPP)</th>
                        <th className="py-2.5 px-3 text-right bg-rose-500/15 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-bold min-w-[145px]">
                          Grand Total (+PPN 11%)
                        </th>
                        <th className="py-2.5 px-3 min-w-[180px]">Alasan / Kondisi Retur</th>
                        <th className="py-2.5 px-2 w-10 text-center print:hidden">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-8 text-center text-slate-400">
                            Tidak ada barang yang cocok dengan filter &quot;{tableFilterQuery}&quot;.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((it, idx) => {
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
                                  <ExternalLink className="w-2.5 h-2.5 text-indigo-400 print:hidden" />
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
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors print:hidden"
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
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors print:hidden"
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
                                    placeholder="Alasan retur..."
                                    className="w-full px-2 py-0.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                  />
                                  <div className="flex flex-wrap gap-1 print:hidden">
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
                                  title="Hapus barang ini dari daftar retur"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Footer Totals */}
                    <tfoot className="bg-slate-100 dark:bg-slate-950 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td colSpan={4} className="py-2.5 px-3 text-right">
                          Total Qty Fisik Retur:
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
                          PPN 11%: Rp {totalPpn.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Official Print Signatures for Print Mode */}
            <div className="hidden print:grid grid-cols-3 gap-6 mt-8 pt-4 text-xs text-center">
              <div>
                <p className="font-semibold mb-14">Yang Menyerahkan (Pelanggan/Apotek),</p>
                <p className="border-t border-slate-400 pt-1">( .................................................. )</p>
              </div>
              <div>
                <p className="font-semibold mb-14">Yang Membawa (Ekspedisi/Driver),</p>
                <p className="border-t border-slate-400 pt-1">( .................................................. )</p>
              </div>
              <div>
                <p className="font-semibold mb-14">Yang Menerima (Gudang/Admin),</p>
                <p className="border-t border-slate-400 pt-1">( .................................................. )</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Summary & Action Buttons */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              Total Nilai Pengembalian Barang:{' '}
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
              <>
                <button
                  type="button"
                  onClick={handleSaveDocument}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Dokumen</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
