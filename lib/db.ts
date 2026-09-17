import { createClient, Client } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';
import productsIndex from '@/lib/search-index/products.json';
import customersIndex from '@/lib/search-index/customers.json';

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

// Pre-calculated in-memory cache for instantaneous zero-latency cold-start load
const INITIAL_KPI_CACHE = {
  summary: {
    total_rows: 2554326,
    total_invoices: 228088,
    total_so: 150353,
    total_customers: 1904,
    total_products: 5646,
    omset_penjualan: 1324008296013.7969,
    total_retur: -13605673091.79245,
    total_qty_sales: 16418159,
    total_qty_retur: 149174
  },
  yearBreakdown: [
    { tahun: 2024, invoices: 86765, total_items: 696341, net_omset: 252428739037.98135 },
    { tahun: 2025, invoices: 77968, total_items: 976953, net_omset: 533385121610.602 },
    { tahun: 2026, invoices: 63355, total_items: 881032, net_omset: 524588762273.421 }
  ]
};

let cachedKPI: { summary: Record<string, number>; yearBreakdown: unknown[] } | null = INITIAL_KPI_CACHE;
let cachedTotalTransactions: number = 2554326;

let tursoClient: Client | null = null;

export function getClient(): Client {
  if (tursoClient) return tursoClient;

  const url = process.env.TURSO_DATABASE_URL || 'libsql://rincian-fatur-ffarhaan.aws-ap-northeast-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODk1NzY0ODksImlkIjoiMDFhMGFiMTEtYzQwMS03ZjJmLWIwNmItM2ExZWJlZTMzYzRmIiwia2lkIjoiVjgyV25MS1AzdTVVSzRSOFF1bTZXam91dGk3cG5lOW1aQmJva0hrU3N5VSIsInJpZCI6ImVmY2RiOTlkLTBjMGMtNGNjOS04Yzg2LTk4ZWVmZmZkYThhMiJ9.zc7sO82nMQZnAAJ0E46H_sldQVH5LrV_1t8TIPSbOTITd7qGp6F2V5iEiK48tNEcFySX3g3R0XF1vZUR0XeGBw';

  tursoClient = createClient({
    url,
    authToken
  });
  return tursoClient;
}

// 1. KPI Summary
export async function getKPISummary() {
  if (cachedKPI) {
    return cachedKPI;
  }
  return INITIAL_KPI_CACHE;
}

// 2. Paginated Transactions Query
export async function queryTransactions(params: {
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
  const client = getClient();
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

  const offset = (page - 1) * limit;
  const dataQuery = `
    SELECT * FROM transactions
    ${whereClause}
    ORDER BY ${col} ${order}, id DESC
    LIMIT ? OFFSET ?
  `;

  let totalCount = cachedTotalTransactions;
  if (conditions.length > 0) {
    const countQuery = `SELECT count(*) as total FROM transactions ${whereClause}`;
    const [countRes, dataRes] = await Promise.all([
      client.execute({ sql: countQuery, args: queryParams }),
      client.execute({ sql: dataQuery, args: [...queryParams, limit, offset] })
    ]);
    totalCount = Number(countRes.rows[0]?.total || 0);
    return {
      rows: dataRes.rows as unknown as TransactionRow[],
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    };
  } else {
    const dataRes = await client.execute({ sql: dataQuery, args: [...queryParams, limit, offset] });
    return {
      rows: dataRes.rows as unknown as TransactionRow[],
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    };
  }
}

// 3. Omnibar Global Search (Ultra-fast hybrid in-memory + targeted indexing)
export async function globalOmniSearch(query: string, limit = 8) {
  if (!query || query.trim().length < 2) return { invoices: [], orders: [], products: [], customers: [] };

  const q = query.toLowerCase().trim();
  const rawQ = query.trim();

  // Instant in-memory search for Products (5,646 items) & Customers (1,904 items) - <2ms response
  const matchedProducts = (productsIndex as any[]).filter(
    (p) => p.nama_barang?.toLowerCase().includes(q) || (p.kode_barang && p.kode_barang.includes(q))
  ).slice(0, limit);

  const matchedCustomers = (customersIndex as any[]).filter(
    (c) => c.nama_pelanggan?.toLowerCase().includes(q)
  ).slice(0, limit);

  let matchedInvoices: any[] = [];
  let matchedOrders: any[] = [];

  // Check if query looks like an Invoice number or SO number
  const isInvoiceQuery = q.startsWith('inv') || q.startsWith('rinv') || q.includes('/') || /^\d+$/.test(q);
  const isSOQuery = q.startsWith('so') || q.includes('/') || /^\d+$/.test(q);

  if (isInvoiceQuery || isSOQuery) {
    const client = getClient();
    const searchPattern = `%${rawQ}%`;
    const promises: Promise<any>[] = [];

    if (isInvoiceQuery) {
      promises.push(
        client.execute({
          sql: `SELECT DISTINCT nomor_faktur, nama_pelanggan, tanggal, count(*) as item_count, SUM(total_harga) as total_nominal, is_retur
                FROM transactions
                WHERE nomor_faktur LIKE ?
                GROUP BY nomor_faktur
                ORDER BY tanggal DESC
                LIMIT ?`,
          args: [searchPattern, limit]
        }).then(r => r.rows).catch(() => [])
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    if (isSOQuery) {
      promises.push(
        client.execute({
          sql: `SELECT DISTINCT no_so, nama_pelanggan, tanggal, count(DISTINCT nomor_faktur) as faktur_count, count(*) as item_count, SUM(total_harga) as total_nominal
                FROM transactions
                WHERE no_so LIKE ? AND no_so != ''
                GROUP BY no_so
                ORDER BY tanggal DESC
                LIMIT ?`,
          args: [searchPattern, limit]
        }).then(r => r.rows).catch(() => [])
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    const [invoices, orders] = await Promise.all(promises);
    matchedInvoices = invoices || [];
    matchedOrders = orders || [];
  }

  return {
    invoices: matchedInvoices,
    orders: matchedOrders,
    products: matchedProducts,
    customers: matchedCustomers
  };
}

// 4. Detailed Invoice View
export async function getInvoiceDetail(nomorFaktur: string) {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT * FROM transactions WHERE nomor_faktur = ? ORDER BY id ASC`,
    args: [nomorFaktur]
  });

  const items = res.rows as unknown as TransactionRow[];
  if (!items || items.length === 0) return null;

  const first = items[0];
  const totalNominal = items.reduce((acc, it) => acc + Number(it.total_harga || 0), 0);
  const totalQty = items.reduce((acc, it) => acc + Number(it.kuantitas || 0), 0);
  const isRetur = items.some(it => Number(it.is_retur) === 1);
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
export async function getSODetail(noSo: string) {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT * FROM transactions WHERE no_so = ? ORDER BY tanggal DESC, nomor_faktur ASC, id ASC`,
    args: [noSo]
  });

  const items = res.rows as unknown as TransactionRow[];
  if (!items || items.length === 0) return null;

  const first = items[0];
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
        is_retur: Number(it.is_retur) === 1,
        total_nominal: 0,
        total_items: 0,
        items: []
      };
    }
    invoicesMap[it.nomor_faktur].total_nominal += Number(it.total_harga || 0);
    invoicesMap[it.nomor_faktur].total_items += 1;
    invoicesMap[it.nomor_faktur].items.push(it);
  });

  const totalNominal = items.reduce((acc, it) => acc + Number(it.total_harga || 0), 0);
  const totalQty = items.reduce((acc, it) => acc + Number(it.kuantitas || 0), 0);

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
export async function getProductDetail(namaBarang: string) {
  const client = getClient();
  const [summaryRes, customerRes, recentRes] = await Promise.all([
    client.execute({
      sql: `SELECT
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
            WHERE nama_barang = ?`,
      args: [namaBarang]
    }),
    client.execute({
      sql: `SELECT
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
            LIMIT 500`,
      args: [namaBarang]
    }),
    client.execute({
      sql: `SELECT * FROM transactions
            WHERE nama_barang = ?
            ORDER BY tanggal DESC, id DESC
            LIMIT 50`,
      args: [namaBarang]
    })
  ]);

  const summary = summaryRes.rows[0] as Record<string, unknown>;
  if (!summary || !summary.nama_barang) return null;

  return {
    summary,
    customers: customerRes.rows,
    recent_transactions: recentRes.rows as unknown as TransactionRow[]
  };
}

// 7. Detailed Customer Profile View
export async function getCustomerDetail(namaPelanggan: string) {
  const client = getClient();
  const [summaryRes, topProductsRes, invoiceListRes] = await Promise.all([
    client.execute({
      sql: `SELECT
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
            WHERE nama_pelanggan = ?`,
      args: [namaPelanggan]
    }),
    client.execute({
      sql: `SELECT
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
            LIMIT 500`,
      args: [namaPelanggan]
    }),
    client.execute({
      sql: `SELECT
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
            LIMIT 200`,
      args: [namaPelanggan]
    })
  ]);

  const summary = summaryRes.rows[0] as Record<string, unknown>;
  if (!summary || !summary.nama_pelanggan) return null;

  return {
    summary,
    top_products: topProductsRes.rows,
    invoices: invoiceListRes.rows
  };
}

// 8. Detailed Medicine Invoices for a specific Customer
export async function getProductCustomerInvoices(namaBarang: string, namaPelanggan: string) {
  const client = getClient();
  const res = await client.execute({
    sql: `SELECT
            id,
            nomor_faktur,
            no_so,
            tanggal,
            kuantitas,
            satuan,
            harga_satuan,
            total_harga,
            is_retur,
            keterangan
          FROM transactions
          WHERE nama_barang = ? AND nama_pelanggan = ?
          ORDER BY tanggal DESC, id DESC
          LIMIT 200`,
    args: [namaBarang, namaPelanggan]
  });

  return res.rows;
}

// 9. Paginated Customer Invoices
export async function getCustomerInvoices(params: {
  namaPelanggan: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const client = getClient();
  const { namaPelanggan, search = '', page = 1, limit = 50 } = params;
  const offset = (page - 1) * limit;

  const conditions = ['nama_pelanggan = ?'];
  const queryParams: (string | number)[] = [namaPelanggan];

  if (search.trim()) {
    const s = `%${search.trim()}%`;
    conditions.push('(nomor_faktur LIKE ? OR no_so LIKE ? OR tanggal LIKE ?)');
    queryParams.push(s, s, s);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countQuery = `
    SELECT count(DISTINCT nomor_faktur) as total
    FROM transactions
    ${whereClause}
  `;

  const dataQuery = `
    SELECT
      nomor_faktur,
      no_so,
      tanggal,
      is_retur,
      count(*) as item_count,
      SUM(total_harga) as total_amount
    FROM transactions
    ${whereClause}
    GROUP BY nomor_faktur
    ORDER BY tanggal DESC
    LIMIT ? OFFSET ?
  `;

  const [countRes, dataRes] = await Promise.all([
    client.execute({ sql: countQuery, args: queryParams }),
    client.execute({ sql: dataQuery, args: [...queryParams, limit, offset] })
  ]);

  const total = Number(countRes.rows[0]?.total || 0);

  return {
    invoices: dataRes.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

