import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

let dbInstance: DatabaseSync | null = null;

export function getDB(): DatabaseSync {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), "data", "faktur.db");
    if (!fs.existsSync(dbPath)) {
      const gzPath = path.join(process.cwd(), "data", "faktur.db.gz");
      if (fs.existsSync(gzPath)) {
        const zlib = require("node:zlib");
        const buf = zlib.gunzipSync(fs.readFileSync(gzPath));
        fs.writeFileSync(dbPath, buf);
      } else {
        throw new Error("Database belum dibuat. Jalankan `npm run ingest` terlebih dahulu.");
      }
    }
    dbInstance = new DatabaseSync(dbPath, { readOnly: true });
    try {
      dbInstance.exec("PRAGMA temp_store = MEMORY;");
      dbInstance.exec("PRAGMA cache_size = -64000;");
    } catch {
      // Ignore pragma errors if any
    }
  }
  return dbInstance;
}

export type TransactionRow = {
  id: number;
  nama_pelanggan: string;
  no_so: string;
  keterangan: string;
  nomor_faktur: string;
  tanggal: string;
  tahun: number;
  bulan: number;
  kode_barang: string;
  nama_barang: string;
  kuantitas: number;
  satuan: string;
  harga_satuan: number;
  total_harga: number;
  category: string;
  is_retur: number;
};

// 1. KPI Summary
export function getKPISummary() {
  const db = getDB();
  const summary = db.prepare(`
    SELECT
      count(*) as total_rows,
      count(DISTINCT nomor_faktur) as total_invoices,
      count(DISTINCT no_so) as total_so,
      count(DISTINCT nama_pelanggan) as total_customers,
      count(DISTINCT nama_barang) as total_products,
      COALESCE(SUM(CASE WHEN is_retur = 0 THEN total_harga ELSE 0 END), 0) as omset_penjualan,
      COALESCE(SUM(CASE WHEN is_retur = 1 THEN total_harga ELSE 0 END), 0) as total_retur,
      COALESCE(SUM(CASE WHEN is_retur = 0 THEN kuantitas ELSE 0 END), 0) as total_qty_sales,
      COALESCE(SUM(CASE WHEN is_retur = 1 THEN ABS(kuantitas) ELSE 0 END), 0) as total_qty_retur
    FROM transactions
  `).get() as Record<string, number>;

  const yearBreakdown = db.prepare(`
    SELECT
      tahun,
      count(DISTINCT nomor_faktur) as invoices,
      count(*) as total_items,
      COALESCE(SUM(total_harga), 0) as net_omset
    FROM transactions
    GROUP BY tahun
    ORDER BY tahun ASC
  `).all();

  return { summary, yearBreakdown };
}

// 2. Paginated Transactions Query
export function queryTransactions(params: {
  search?: string;
  tahun?: number;
  bulan?: number;
  category?: string;
  isRetur?: string; // 'all' | 'sales' | 'retur'
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const db = getDB();
  const {
    search = '',
    tahun,
    bulan,
    category,
    isRetur = 'all',
    page = 1,
    limit = 50,
    sortBy = 'tanggal',
    sortOrder = 'desc'
  } = params;

  const conditions: string[] = [];
  const queryParams: (string | number)[] = [];

  if (tahun) {
    conditions.push('tahun = ?');
    queryParams.push(tahun);
  }

  if (bulan) {
    conditions.push('bulan = ?');
    queryParams.push(bulan);
  }

  if (category && category !== 'all') {
    conditions.push('category = ?');
    queryParams.push(category);
  }

  if (isRetur === 'sales') {
    conditions.push('is_retur = 0');
  } else if (isRetur === 'retur') {
    conditions.push('is_retur = 1');
  }

  if (search.trim()) {
    const s = `%${search.trim()}%`;
    conditions.push(`(
      nomor_faktur LIKE ? OR
      no_so LIKE ? OR
      nama_pelanggan LIKE ? OR
      kode_barang LIKE ? OR
      nama_barang LIKE ? OR
      keterangan LIKE ?
    )`);
    queryParams.push(s, s, s, s, s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Allowed sort columns
  const allowedCols: Record<string, string> = {
    tanggal: 'tanggal',
    nomor_faktur: 'nomor_faktur',
    no_so: 'no_so',
    nama_pelanggan: 'nama_pelanggan',
    nama_barang: 'nama_barang',
    kuantitas: 'kuantitas',
    total_harga: 'total_harga'
  };

  const col = allowedCols[sortBy] || 'tanggal';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const countQuery = `SELECT count(*) as total FROM transactions ${whereClause}`;
  const totalCount = (db.prepare(countQuery).get(...queryParams) as { total: number }).total;

  const offset = (page - 1) * limit;
  const dataQuery = `
    SELECT * FROM transactions
    ${whereClause}
    ORDER BY ${col} ${order}, id DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(dataQuery).all(...queryParams, limit, offset) as TransactionRow[];

  return {
    rows,
    total: totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit)
  };
}

// 3. Omnibar Global Search
export function globalOmniSearch(query: string, limit = 8) {
  if (!query || query.trim().length < 2) return { invoices: [], orders: [], products: [], customers: [] };

  const db = getDB();
  const q = `%${query.trim()}%`;

  const invoices = db.prepare(`
    SELECT DISTINCT nomor_faktur, nama_pelanggan, tanggal, count(*) as item_count, SUM(total_harga) as total_nominal, is_retur
    FROM transactions
    WHERE nomor_faktur LIKE ?
    GROUP BY nomor_faktur
    ORDER BY tanggal DESC
    LIMIT ?
  `).all(q, limit);

  const orders = db.prepare(`
    SELECT DISTINCT no_so, nama_pelanggan, tanggal, count(DISTINCT nomor_faktur) as faktur_count, count(*) as item_count, SUM(total_harga) as total_nominal
    FROM transactions
    WHERE no_so LIKE ? AND no_so != ''
    GROUP BY no_so
    ORDER BY tanggal DESC
    LIMIT ?
  `).all(q, limit);

  const products = db.prepare(`
    SELECT DISTINCT kode_barang, nama_barang, satuan, count(*) as order_count, SUM(kuantitas) as total_qty, AVG(harga_satuan) as avg_price
    FROM transactions
    WHERE nama_barang LIKE ? OR kode_barang LIKE ?
    GROUP BY nama_barang
    ORDER BY total_qty DESC
    LIMIT ?
  `).all(q, q, limit);

  const customers = db.prepare(`
    SELECT DISTINCT nama_pelanggan, category, count(DISTINCT nomor_faktur) as total_invoices, count(*) as total_items, SUM(total_harga) as lifetime_spent
    FROM transactions
    WHERE nama_pelanggan LIKE ?
    GROUP BY nama_pelanggan
    ORDER BY lifetime_spent DESC
    LIMIT ?
  `).all(q, limit);

  return { invoices, orders, products, customers };
}

// 4. Detailed Invoice View
export function getInvoiceDetail(nomorFaktur: string) {
  const db = getDB();
  const items = db.prepare(`
    SELECT * FROM transactions
    WHERE nomor_faktur = ?
    ORDER BY id ASC
  `).all(nomorFaktur) as TransactionRow[];

  if (!items || items.length === 0) return null;

  const first = items[0];
  const totalNominal = items.reduce((acc, it) => acc + it.total_harga, 0);
  const totalQty = items.reduce((acc, it) => acc + it.kuantitas, 0);
  const isRetur = items.some(it => it.is_retur === 1);

  // Distinct SOs linked to this invoice
  const linkedSOs = Array.from(new Set(items.map(it => it.no_so).filter(Boolean)));

  return {
    nomor_faktur: first.nomor_faktur,
    tanggal: first.tanggal,
    tahun: first.tahun,
    nama_pelanggan: first.nama_pelanggan,
    keterangan: first.keterangan,
    category: first.category,
    no_so: first.no_so,
    linked_sos: linkedSOs,
    total_nominal: totalNominal,
    total_qty: totalQty,
    is_retur: isRetur,
    items
  };
}

// 5. Detailed Sales Order View
export function getSODetail(noSo: string) {
  const db = getDB();
  const items = db.prepare(`
    SELECT * FROM transactions
    WHERE no_so = ?
    ORDER BY tanggal DESC, nomor_faktur ASC, id ASC
  `).all(noSo) as TransactionRow[];

  if (!items || items.length === 0) return null;

  const first = items[0];

  // Group items by generated invoices
  const invoicesMap: Record<string, {
    nomor_faktur: string;
    tanggal: string;
    is_retur: boolean;
    total_nominal: number;
    total_items: number;
    items: TransactionRow[];
  }> = {};

  items.forEach(it => {
    if (!invoicesMap[it.nomor_faktur]) {
      invoicesMap[it.nomor_faktur] = {
        nomor_faktur: it.nomor_faktur,
        tanggal: it.tanggal,
        is_retur: it.is_retur === 1,
        total_nominal: 0,
        total_items: 0,
        items: []
      };
    }
    invoicesMap[it.nomor_faktur].total_nominal += it.total_harga;
    invoicesMap[it.nomor_faktur].total_items += 1;
    invoicesMap[it.nomor_faktur].items.push(it);
  });

  const totalNominal = items.reduce((acc, it) => acc + it.total_harga, 0);
  const totalQty = items.reduce((acc, it) => acc + it.kuantitas, 0);

  return {
    no_so: first.no_so,
    nama_pelanggan: first.nama_pelanggan,
    category: first.category,
    keterangan: first.keterangan,
    invoices: Object.values(invoicesMap),
    total_nominal: totalNominal,
    total_qty: totalQty,
    total_items: items.length,
    items
  };
}

// 6. Detailed Medicine / Product View
export function getProductDetail(namaBarang: string) {
  const db = getDB();
  const summary = db.prepare(`
    SELECT
      nama_barang,
      kode_barang,
      satuan,
      count(*) as total_records,
      count(DISTINCT nomor_faktur) as total_invoices,
      count(DISTINCT nama_pelanggan) as total_customers,
      COALESCE(SUM(CASE WHEN is_retur = 0 THEN kuantitas ELSE 0 END), 0) as total_sales_qty,
      COALESCE(SUM(CASE WHEN is_retur = 1 THEN ABS(kuantitas) ELSE 0 END), 0) as total_retur_qty,
      COALESCE(SUM(total_harga), 0) as total_revenue,
      AVG(harga_satuan) as avg_price,
      MIN(harga_satuan) as min_price,
      MAX(harga_satuan) as max_price
    FROM transactions
    WHERE nama_barang = ?
  `).get(namaBarang) as Record<string, unknown>;

  if (!summary || !summary.nama_barang) return null;

  // Pharmacies that bought this medicine
  const customerBreakdown = db.prepare(`
    SELECT
      nama_pelanggan,
      category,
      count(DISTINCT nomor_faktur) as total_orders,
      COALESCE(SUM(kuantitas), 0) as total_qty,
      COALESCE(SUM(total_harga), 0) as total_spent,
      MAX(tanggal) as last_order_date
    FROM transactions
    WHERE nama_barang = ?
    GROUP BY nama_pelanggan
    ORDER BY total_qty DESC
  `).all(namaBarang);

  // Recent transaction history
  const recentTransactions = db.prepare(`
    SELECT * FROM transactions
    WHERE nama_barang = ?
    ORDER BY tanggal DESC, id DESC
    LIMIT 100
  `).all(namaBarang) as TransactionRow[];

  return {
    summary,
    customers: customerBreakdown,
    recent_transactions: recentTransactions
  };
}

// 7. Detailed Customer Profile View
export function getCustomerDetail(namaPelanggan: string) {
  const db = getDB();
  const summary = db.prepare(`
    SELECT
      nama_pelanggan,
      category,
      count(DISTINCT nomor_faktur) as total_invoices,
      count(DISTINCT no_so) as total_orders,
      count(*) as total_item_rows,
      COALESCE(SUM(CASE WHEN is_retur = 0 THEN total_harga ELSE 0 END), 0) as total_sales,
      COALESCE(SUM(CASE WHEN is_retur = 1 THEN total_harga ELSE 0 END), 0) as total_retur,
      COALESCE(SUM(total_harga), 0) as net_spent,
      MIN(tanggal) as first_transaction,
      MAX(tanggal) as last_transaction
    FROM transactions
    WHERE nama_pelanggan = ?
  `).get(namaPelanggan) as Record<string, unknown>;

  if (!summary || !summary.nama_pelanggan) return null;

  // Top purchased medicines
  const topProducts = db.prepare(`
    SELECT
      kode_barang,
      nama_barang,
      satuan,
      count(*) as order_frequency,
      COALESCE(SUM(kuantitas), 0) as total_qty,
      COALESCE(SUM(total_harga), 0) as total_spent,
      AVG(harga_satuan) as avg_price,
      MAX(tanggal) as last_purchased
    FROM transactions
    WHERE nama_pelanggan = ? AND is_retur = 0
    GROUP BY nama_barang
    ORDER BY total_qty DESC
    LIMIT 30
  `).all(namaPelanggan);

  // Invoices list
  const invoiceList = db.prepare(`
    SELECT
      nomor_faktur,
      no_so,
      tanggal,
      is_retur,
      count(*) as item_count,
      SUM(total_harga) as total_amount
    FROM transactions
    WHERE nama_pelanggan = ?
    GROUP BY nomor_faktur
    ORDER BY tanggal DESC
  `).all(namaPelanggan);

  return {
    summary,
    top_products: topProducts,
    invoices: invoiceList
  };
}
