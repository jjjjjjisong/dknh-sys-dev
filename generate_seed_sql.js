// Generate SQL INSERT statements from SEED data
// Run: node generate_seed_sql.js

import fs from 'fs';
import path from 'path';

// Read the HTML file
const htmlPath = path.join(process.cwd(), 'legacy-index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract SEED_CLIENTS
const clientsMatch = html.match(/const SEED_CLIENTS\s*=\s*(\[[\s\S]*?\]);/);
const productsMatch = html.match(/const SEED_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);

if (!clientsMatch || !productsMatch) {
  console.error('Could not find SEED data in HTML file');
  process.exit(1);
}

const clients = eval(clientsMatch[1]);
const products = eval(productsMatch[1]);

function escStr(val) {
  if (val === null || val === undefined || val === '') return "''";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function escNum(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return val;
}

function escBool(val) {
  return val ? 'TRUE' : 'FALSE';
}

let sql = '';

// Admin account
sql += `-- ═══════════════════════════════════════
--  계정 시드 데이터
-- ═══════════════════════════════════════
INSERT INTO accounts (id, password, name, rank, tel, email, role) VALUES
  ('admin', 'dkh2025!', '관리자', '', '', '', 'admin'),
  ('user1', 'dkh1234', '사용자1', '', '', '', 'user'),
  ('user2', 'dkh1234', '사용자2', '', '', '', 'user'),
  ('user3', 'dkh1234', '사용자3', '', '', '', 'user');

`;

// Clients
sql += `-- ═══════════════════════════════════════
--  납품처 시드 데이터 (${clients.length}건)
-- ═══════════════════════════════════════
INSERT INTO clients (name, manager, tel, addr, time, lunch, note, active) VALUES\n`;
const clientRows = clients.map(c => 
  `  (${escStr(c.name)}, ${escStr(c.manager)}, ${escStr(c.tel)}, ${escStr(c.addr)}, ${escStr(c.time)}, ${escStr(c.lunch)}, ${escStr(c.note)}, ${escBool(c.active)})`
);
sql += clientRows.join(',\n') + ';\n\n';

// Products
sql += `-- ═══════════════════════════════════════
--  품목 시드 데이터 (${products.length}건)
-- ═══════════════════════════════════════
INSERT INTO products (no, gubun, client, name1, name2, supplier, cost_price, sell_price, ea_per_b, box_per_p, ea_per_p, pallets_per_truck) VALUES\n`;
const productRows = products.map(p =>
  `  (${escNum(p.no)}, ${escStr(p.gubun)}, ${escStr(p.client)}, ${escStr(p.name1)}, ${escStr(p.name2)}, ${escStr(p.supplier)}, ${escNum(p.cost_price)}, ${escNum(p.sell_price)}, ${escNum(p.ea_per_b)}, ${escNum(p.box_per_p)}, ${escNum(p.ea_per_p)}, ${escNum(p.pallets_per_truck)})`
);
sql += productRows.join(',\n') + ';\n';

const outPath = path.join(process.cwd(), 'seed_data.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('Generated seed_data.sql with', clients.length, 'clients and', products.length, 'products');
console.log('Output:', outPath);
