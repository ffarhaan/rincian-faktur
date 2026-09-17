const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const localDb = new DatabaseSync(path.join(__dirname, '..', 'data', 'faktur.db'), { readOnly: true });

console.log('1. Extracting unique products...');
const products = localDb.prepare(`
  SELECT
    kode_barang,
    nama_barang,
    satuan,
    count(*) as order_count,
    COALESCE(SUM(kuantitas), 0) as total_qty,
    COALESCE(AVG(harga_satuan), 0) as avg_price,
    COALESCE(SUM(total_harga), 0) as total_nominal
  FROM transactions
  GROUP BY nama_barang
  ORDER BY total_qty DESC
`).all();

const outDir = path.join(__dirname, '..', 'lib', 'search-index');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'products.json'), JSON.stringify(products));
console.log(`Saved ${products.length} products to lib/search-index/products.json (${(fs.statSync(path.join(outDir, 'products.json')).size / 1024).toFixed(1)} KB)`);

console.log('2. Extracting unique customers...');
const customers = localDb.prepare(`
  SELECT
    nama_pelanggan,
    category,
    count(DISTINCT nomor_faktur) as total_invoices,
    count(*) as total_items,
    COALESCE(SUM(total_harga), 0) as lifetime_spent
  FROM transactions
  GROUP BY nama_pelanggan
  ORDER BY lifetime_spent DESC
`).all();

fs.writeFileSync(path.join(outDir, 'customers.json'), JSON.stringify(customers));
console.log(`Saved ${customers.length} customers to lib/search-index/customers.json (${(fs.statSync(path.join(outDir, 'customers.json')).size / 1024).toFixed(1)} KB)`);
