const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@libsql/client');
const path = require('node:path');

const TURSO_URL = 'libsql://rincian-fatur-ffarhaan.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODk1NzY0ODksImlkIjoiMDFhMGFiMTEtYzQwMS03ZjJmLWIwNmItM2ExZWJlZTMzYzRmIiwia2lkIjoiVjgyV25MS1AzdTVVSzRSOFF1bTZXam91dGk3cG5lOW1aQmJva0hrU3N5VSIsInJpZCI6ImVmY2RiOTlkLTBjMGMtNGNjOS04Yzg2LTk4ZWVmZmZkYThhMiJ9.zc7sO82nMQZnAAJ0E46H_sldQVH5LrV_1t8TIPSbOTITd7qGp6F2V5iEiK48tNEcFySX3g3R0XF1vZUR0XeGBw';

const localDb = new DatabaseSync(path.join(__dirname, '..', 'data', 'faktur.db'), { readOnly: true });

function getClient() {
  return createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
    concurrency: 10
  });
}

let client = getClient();

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : val.toString();
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function executeWithRetry(sql, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.execute(sql);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const waitMs = Math.min(2000 * (i + 1), 10000);
      console.log(`⚠️ Network blip: ${err.message || err}. Reconnecting in ${waitMs}ms... (attempt ${i + 1}/${maxRetries})`);
      client = getClient(); // Refresh client connection
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

async function run() {
  console.log('1. Checking Turso table...');
  await executeWithRetry(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY,
      nama_pelanggan TEXT,
      no_so TEXT,
      keterangan TEXT,
      nomor_faktur TEXT,
      tanggal TEXT,
      tahun INTEGER,
      bulan INTEGER,
      kode_barang TEXT,
      nama_barang TEXT,
      kuantitas REAL,
      satuan TEXT,
      harga_satuan REAL,
      total_harga REAL,
      category TEXT,
      is_retur INTEGER
    );
  `);

  const maxIdRes = await executeWithRetry('SELECT max(id) as max_id FROM transactions');
  const maxId = Number(maxIdRes.rows[0]?.max_id || 0);

  const totalLocal = Number(localDb.prepare('SELECT count(*) as total FROM transactions').get().total);
  console.log(`Local DB Total: ${totalLocal.toLocaleString('id-ID')} | Turso max(id): ${maxId.toLocaleString('id-ID')}`);

  if (maxId >= totalLocal) {
    console.log('✅ All rows already uploaded to Turso!');
  } else {
    console.log(`Resuming ingestion from id > ${maxId}...`);
    const selectStmt = localDb.prepare(`
      SELECT id, nama_pelanggan, no_so, keterangan, nomor_faktur, tanggal, tahun, bulan, kode_barang, nama_barang, kuantitas, satuan, harga_satuan, total_harga, category, is_retur
      FROM transactions
      WHERE id > ?
      ORDER BY id ASC
      LIMIT 10000
    `);

    let lastId = maxId;
    let uploaded = maxId;
    const startTime = Date.now();
    const ROWS_PER_QUERY = 250;

    while (uploaded < totalLocal) {
      const chunk = selectStmt.all(lastId);
      if (chunk.length === 0) break;

      const queryPromises = [];
      for (let i = 0; i < chunk.length; i += ROWS_PER_QUERY) {
        const sub = chunk.slice(i, i + ROWS_PER_QUERY);
        const valuesStr = sub.map(r => `(${r.id}, ${escapeSql(r.nama_pelanggan)}, ${escapeSql(r.no_so)}, ${escapeSql(r.keterangan)}, ${escapeSql(r.nomor_faktur)}, ${escapeSql(r.tanggal)}, ${r.tahun}, ${r.bulan}, ${escapeSql(r.kode_barang)}, ${escapeSql(r.nama_barang)}, ${r.kuantitas}, ${escapeSql(r.satuan)}, ${r.harga_satuan}, ${r.total_harga}, ${escapeSql(r.category)}, ${r.is_retur})`).join(',\n');
        const sql = `INSERT OR IGNORE INTO transactions (id, nama_pelanggan, no_so, keterangan, nomor_faktur, tanggal, tahun, bulan, kode_barang, nama_barang, kuantitas, satuan, harga_satuan, total_harga, category, is_retur) VALUES ${valuesStr}`;
        queryPromises.push(executeWithRetry(sql));
      }

      await Promise.all(queryPromises);

      uploaded += chunk.length;
      lastId = chunk[chunk.length - 1].id;

      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round((uploaded - maxId) / (elapsedSec || 1));
      const percent = ((uploaded / totalLocal) * 100).toFixed(2);
      console.log(`Progress: ${uploaded.toLocaleString('id-ID')} / ${totalLocal.toLocaleString('id-ID')} (${percent}%) - ${elapsedSec}s - ~${rate.toLocaleString('id-ID')} rows/s`);
    }
  }

  console.log('2. Creating / verifying indexes in Turso...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_nomor_faktur ON transactions(nomor_faktur);',
    'CREATE INDEX IF NOT EXISTS idx_no_so ON transactions(no_so);',
    'CREATE INDEX IF NOT EXISTS idx_nama_pelanggan ON transactions(nama_pelanggan);',
    'CREATE INDEX IF NOT EXISTS idx_kode_barang ON transactions(kode_barang);',
    'CREATE INDEX IF NOT EXISTS idx_nama_barang ON transactions(nama_barang);',
    'CREATE INDEX IF NOT EXISTS idx_tahun_bulan ON transactions(tahun, bulan);',
    'CREATE INDEX IF NOT EXISTS idx_category ON transactions(category);',
    'CREATE INDEX IF NOT EXISTS idx_is_retur ON transactions(is_retur);',
    'CREATE INDEX IF NOT EXISTS idx_tanggal ON transactions(tanggal DESC);'
  ];

  for (const idx of indexes) {
    await executeWithRetry(idx);
    console.log(`Index ready: ${idx.split(' ')[5]}`);
  }

  console.log('🎉 100% COMPLETE! Database is ready on Turso Cloud.');
}

run().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
