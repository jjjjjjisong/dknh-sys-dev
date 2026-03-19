// Generate SQL INSERT statements from SEED data
// Run: node generate_seed_sql.js > seed_data.sql

const fs = require('fs');

// Read the HTML file
const html = fs.readFileSync('C:\\Users\\sjji\\Desktop\\개인의것\\2. DKnH\\2. DKnH\\DKH_업무관리시스템_v3.8.html', 'utf8');

// Extract SEED_CLIENTS
const clientsMatch = html.match(/const SEED_CLIENTS\s*=\s*(\[[\s\S]*?\]);/);
const productsMatch = html.match(/const SEED_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);

if (!clientsMatch || !productsMatch) {
  console.error('Could not find SEED data in HTML file');
  process.exit(1);
}

const clients = eval(clientsMatch[1]);
const products = eval(productsMatch[1]);

function esc(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

let sql = '';

// Admin account
sql += `-- ═══════════════════════════════════════
--  계정 시드 데이터
-- ═══════════════════════════════════════
INSERT INTO accounts (login_id, pw_hash, name, rank, tel, email, role) VALUES
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
  `  (${esc(c.name)}, ${esc(c.manager)}, ${esc(c.tel)}, ${esc(c.addr)}, ${esc(c.time)}, ${esc(c.lunch)}, ${esc(c.note)}, ${c.active ? 'TRUE' : 'FALSE'})`
);
sql += clientRows.join(',\n') + ';\n\n';

// Products
sql += `-- ═══════════════════════════════════════
--  품목 시드 데이터 (${products.length}건)
-- ═══════════════════════════════════════
INSERT INTO products (no, gubun, client, name1, name2, supplier, cost_price, sell_price, ea_per_b, box_per_p, ea_per_p, pallets_per_truck) VALUES\n`;
const productRows = products.map(p =>
  `  (${esc(p.no)}, ${esc(p.gubun)}, ${esc(p.client)}, ${esc(p.name1)}, ${esc(p.name2)}, ${esc(p.supplier)}, ${esc(p.cost_price)}, ${esc(p.sell_price)}, ${esc(p.ea_per_b)}, ${esc(p.box_per_p)}, ${esc(p.ea_per_p)}, ${esc(p.pallets_per_truck)})`
);
sql += productRows.join(',\n') + ';\n';

const outPath = __dirname + '\\seed_data.sql';
fs.writeFileSync(outPath, sql, 'utf8');
console.log('Generated seed_data.sql with', clients.length, 'clients and', products.length, 'products');
console.log('Output:', outPath);
