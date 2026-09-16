const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const XLSX = require('xlsx');

const excelPath = 'c:/Users/medikabinainvestama_/Downloads/Sales & Retur MBI 2024 - Aug 26 Lite.xlsx';
const dbPath = 'c:/Users/medikabinainvestama_/Downloads/faktur-database/data/faktur.db';

console.log('--- Starting Data Ingestion ---');
console.log('Source Excel:', excelPath);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA temp_store = MEMORY;');
db.exec('PRAGMA cache_size = -64000;');

db.exec(`
  DROP TABLE IF EXISTS transactions;
  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

const insertStmt = db.prepare(`
  INSERT INTO transactions (
    nama_pelanggan, no_so, keterangan, nomor_faktur, tanggal,
    tahun, bulan, kode_barang, nama_barang, kuantitas,
    satuan, harga_satuan, total_harga, category, is_retur
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function formatSerialDate(v, fallbackYear) {
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      const pad = n => String(n).padStart(2, '0');
      return {
        dateStr: `${year}-${pad(month)}-${pad(day)}`,
        year,
        month
      };
    }
  }
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [y, m] = s.split('-').map(Number);
      return { dateStr: s.slice(0, 10), year: y, month: m };
    }
  }
  return { dateStr: `${fallbackYear}-01-01`, year: fallbackYear, month: 1 };
}

console.log('Loading Excel workbook (approx ~1-2 min)...');
const t0 = Date.now();
const wb = XLSX.readFile(excelPath);
console.log(`Workbook loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s! Sheets:`, wb.SheetNames);

let grandTotal = 0;

for (const sheetName of wb.SheetNames) {
  console.log(`\nExtracting rows from sheet "${sheetName}"...`);
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  console.log(`  Read ${rows.length.toLocaleString()} rows in sheet "${sheetName}".`);

  if (rows.length <= 1) continue;

  const headerRow = rows[0] || [];
  const header = headerRow.map(c => String(c || '').trim().toLowerCase());
  const colMap = {};
  header.forEach((h, i) => {
    if (h.includes('pelanggan')) colMap.pelanggan = i;
    if (h.includes('pesanan') || h.includes('po') || h.includes('so')) colMap.so = i;
    if (h.includes('keterangan')) colMap.keterangan = i;
    if (h.includes('nomor')) colMap.faktur = i;
    if (h.includes('tanggal')) colMap.tanggal = i;
    if (h.includes('kode')) colMap.kode = i;
    if (h.includes('nama barang') || h.includes('barang')) colMap.barang = i;
    if (h.includes('kuantitas') || h.includes('qty')) colMap.qty = i;
    if (h.includes('satuan') && !h.includes('harga')) colMap.satuan = i;
    if (h.includes('harga satuan') || h.includes('harga')) colMap.harga = i;
    if (h.includes('category') || h.includes('kategori')) colMap.cat = i;
  });

  const defaultYear = sheetName.includes('2024') ? 2024 : (sheetName.includes('2025') ? 2025 : 2026);

  db.exec('BEGIN TRANSACTION;');
  let sheetInserted = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const pelanggan = String(r[colMap.pelanggan ?? 0] || '').trim();
    const noSo = String(r[colMap.so ?? 1] || '').trim();
    const keterangan = String(r[colMap.keterangan ?? 2] || '').trim();
    const noFaktur = String(r[colMap.faktur ?? 3] || '').trim();
    const rawDate = r[colMap.tanggal ?? 4];
    const kodeBarang = String(r[colMap.kode ?? 5] || '').trim();
    const namaBarang = String(r[colMap.barang ?? 6] || '').trim();
    const qty = Number(r[colMap.qty ?? 7] ?? 0) || 0;
    const satuan = String(r[colMap.satuan ?? 8] || '').trim();
    const hargaSatuan = Number(r[colMap.harga ?? 9] ?? 0) || 0;
    const category = String(r[colMap.cat ?? 10] || '').trim();

    if (!noFaktur && !noSo && !namaBarang) continue;

    const { dateStr, year, month } = formatSerialDate(rawDate, defaultYear);
    const totalHarga = qty * hargaSatuan;
    const isRetur = (qty < 0 || noFaktur.toUpperCase().startsWith('RINV') || noFaktur.toUpperCase().includes('RETUR')) ? 1 : 0;

    insertStmt.run(
      pelanggan,
      noSo,
      keterangan,
      noFaktur,
      dateStr,
      year,
      month,
      kodeBarang,
      namaBarang,
      qty,
      satuan,
      hargaSatuan,
      totalHarga,
      category,
      isRetur
    );

    sheetInserted++;
    grandTotal++;

    if (sheetInserted % 50000 === 0) {
      db.exec('COMMIT;');
      db.exec('BEGIN TRANSACTION;');
      console.log(`  Inserted ${sheetInserted.toLocaleString()} rows in "${sheetName}"...`);
    }
  }

  db.exec('COMMIT;');
  console.log(`  Done sheet "${sheetName}": ${sheetInserted.toLocaleString()} rows inserted.`);
}

console.log(`\nBuilding high-speed indexes across ${grandTotal.toLocaleString()} total rows...`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_nomor_faktur ON transactions(nomor_faktur);
  CREATE INDEX IF NOT EXISTS idx_no_so ON transactions(no_so);
  CREATE INDEX IF NOT EXISTS idx_nama_pelanggan ON transactions(nama_pelanggan);
  CREATE INDEX IF NOT EXISTS idx_kode_barang ON transactions(kode_barang);
  CREATE INDEX IF NOT EXISTS idx_nama_barang ON transactions(nama_barang);
  CREATE INDEX IF NOT EXISTS idx_tahun_bulan ON transactions(tahun, bulan);
  CREATE INDEX IF NOT EXISTS idx_category ON transactions(category);
  CREATE INDEX IF NOT EXISTS idx_is_retur ON transactions(is_retur);
  CREATE INDEX IF NOT EXISTS idx_tanggal ON transactions(tanggal);
`);

console.log('--- Ingestion Complete! ---');
const stats = db.prepare('SELECT count(*) as total, count(DISTINCT nomor_faktur) as invs, count(DISTINCT no_so) as sos, count(DISTINCT nama_pelanggan) as custs, count(DISTINCT nama_barang) as prods, SUM(total_harga) as net_omset FROM transactions').get();
console.log('Database Stats:', stats);
