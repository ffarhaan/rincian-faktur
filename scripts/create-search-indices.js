const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@libsql/client');
const path = require('node:path');

const localDb = new DatabaseSync(path.join(__dirname, '..', 'data', 'faktur.db'), { readOnly: true });
const client = createClient({
  url: 'libsql://rincian-fatur-ffarhaan.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODk1NzY0ODksImlkIjoiMDFhMGFiMTEtYzQwMS03ZjJmLWIwNmItM2ExZWJlZTMzYzRmIiwia2lkIjoiVjgyV25MS1AzdTVVSzRSOFF1bTZXam91dGk3cG5lOW1aQmJva0hrU3N5VSIsInJpZCI6ImVmY2RiOTlkLTBjMGMtNGNjOS04Yzg2LTk4ZWVmZmZkYThhMiJ9.zc7sO82nMQZnAAJ0E46H_sldQVH5LrV_1t8TIPSbOTITd7qGp6F2V5iEiK48tNEcFySX3g3R0XF1vZUR0XeGBw'
});

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : val.toString();
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function main() {
  console.log('1. Extracting master products from local database...');
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
  `).all();
  console.log(`Found ${products.length} unique products.`);

  console.log('2. Extracting master customers from local database...');
  const customers = localDb.prepare(`
    SELECT
      nama_pelanggan,
      category,
      count(DISTINCT nomor_faktur) as total_invoices,
      count(*) as total_items,
      COALESCE(SUM(total_harga), 0) as lifetime_spent
    FROM transactions
    GROUP BY nama_pelanggan
  `).all();
  console.log(`Found ${customers.length} unique customers.`);

  console.log('3. Recreating master_products table in Turso...');
  await client.execute('DROP TABLE IF EXISTS master_products');
  await client.execute(`
    CREATE TABLE master_products (
      kode_barang TEXT,
      nama_barang TEXT PRIMARY KEY,
      satuan TEXT,
      order_count INTEGER,
      total_qty REAL,
      avg_price REAL,
      total_nominal REAL
    );
  `);

  // Fast batch insert products
  const CHUNK_SIZE = 250;
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    const chunk = products.slice(i, i + CHUNK_SIZE);
    const values = chunk.map(p => `(${escapeSql(p.kode_barang)}, ${escapeSql(p.nama_barang)}, ${escapeSql(p.satuan)}, ${p.order_count}, ${p.total_qty}, ${p.avg_price}, ${p.total_nominal})`).join(',\n');
    await client.execute(`INSERT OR REPLACE INTO master_products VALUES ${values}`);
  }
  await client.execute('CREATE INDEX IF NOT EXISTS idx_mp_kode ON master_products(kode_barang);');
  console.log('✅ master_products uploaded and indexed!');

  console.log('4. Recreating master_customers table in Turso...');
  await client.execute('DROP TABLE IF EXISTS master_customers');
  await client.execute(`
    CREATE TABLE master_customers (
      nama_pelanggan TEXT PRIMARY KEY,
      category TEXT,
      total_invoices INTEGER,
      total_items INTEGER,
      lifetime_spent REAL
    );
  `);

  // Fast batch insert customers
  for (let i = 0; i < customers.length; i += CHUNK_SIZE) {
    const chunk = customers.slice(i, i + CHUNK_SIZE);
    const values = chunk.map(c => `(${escapeSql(c.nama_pelanggan)}, ${escapeSql(c.category)}, ${c.total_invoices}, ${c.total_items}, ${c.lifetime_spent})`).join(',\n');
    await client.execute(`INSERT OR REPLACE INTO master_customers VALUES ${values}`);
  }
  await client.execute('CREATE INDEX IF NOT EXISTS idx_mc_cat ON master_customers(category);');
  console.log('✅ master_customers uploaded and indexed!');

  console.log('5. Testing search latency...');
  const t0 = Date.now();
  const res = await client.execute({
    sql: 'SELECT * FROM master_products WHERE nama_barang LIKE ? ORDER BY total_qty DESC LIMIT 8',
    args: ['%imboost%']
  });
  console.log(`⚡ Search speed: ${Date.now() - t0}ms! Found: ${res.rows.length} items`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
