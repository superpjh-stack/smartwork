const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, 'smartwork.db');
const db = new Database(dbPath);

// 외래키 활성화
db.pragma('foreign_keys = ON');

// 테이블 생성
db.exec(`
  -- 제품 테이블
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    unit TEXT DEFAULT '개',
    price REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 재고 테이블
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER UNIQUE NOT NULL,
    quantity INTEGER DEFAULT 0,
    location TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  -- 재고이력 테이블
  CREATE TABLE IF NOT EXISTS inventory_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    change_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  -- 거래처 테이블
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 주문 테이블
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT '대기',
    total_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  -- 주문상세 테이블
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- 생산 테이블
  CREATE TABLE IF NOT EXISTS productions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    production_number TEXT UNIQUE NOT NULL,
    order_id INTEGER,
    product_id INTEGER NOT NULL,
    planned_qty INTEGER NOT NULL,
    actual_qty INTEGER DEFAULT 0,
    defect_qty INTEGER DEFAULT 0,
    waste_qty INTEGER DEFAULT 0,
    worker TEXT,
    status TEXT DEFAULT '대기',
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- 출하 테이블
  CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_number TEXT UNIQUE NOT NULL,
    order_id INTEGER NOT NULL,
    shipment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT '대기',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  -- 출하상세 테이블
  CREATE TABLE IF NOT EXISTS shipment_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- 설정 테이블
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- KPI 일별 스냅샷 테이블
  CREATE TABLE IF NOT EXISTS kpi_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    company_id INTEGER,
    product_id INTEGER,
    pi REAL DEFAULT 0,
    qi REAL DEFAULT 0,
    yield_rate REAL DEFAULT 0,
    defect_rate REAL DEFAULT 0,
    waste_rate REAL DEFAULT 0,
    actual_qty INTEGER DEFAULT 0,
    planned_qty INTEGER DEFAULT 0,
    defect_qty INTEGER DEFAULT 0,
    waste_qty INTEGER DEFAULT 0,
    production_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(date, company_id, product_id)
  );

  -- 회사 테이블
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 사용자 테이블
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'company_admin',
    company_id INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  -- 세션 테이블
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- 기본 설정 삽입
  INSERT OR IGNORE INTO settings (key, value) VALUES
    ('company_name', '스마트공방'),
    ('order_prefix', 'ORD'),
    ('production_prefix', 'PRD'),
    ('shipment_prefix', 'SHP'),
    ('kpi_pi_target', '95'),
    ('kpi_pi_warning', '85'),
    ('kpi_pi_danger', '70'),
    ('kpi_qi_target', '98'),
    ('kpi_qi_warning', '95'),
    ('kpi_qi_danger', '90'),
    ('kpi_yield_target', '95'),
    ('kpi_yield_warning', '90'),
    ('kpi_yield_danger', '80'),
    ('kpi_defect_target', '2'),
    ('kpi_defect_warning', '5'),
    ('kpi_defect_danger', '10'),
    ('kpi_waste_target', '3'),
    ('kpi_waste_warning', '5'),
    ('kpi_waste_danger', '10');
`);

// 비밀번호 해싱 함수
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
  return salt + ':' + hash;
}

// 기본 회사 및 사용자 삽입
const companyCount = db.prepare('SELECT COUNT(*) as count FROM companies').get();
if (companyCount.count === 0) {
  console.log('기본 회사/사용자 데이터 삽입 중...');

  // 기본 회사
  db.prepare('INSERT INTO companies (company_code, name, contact, address) VALUES (?, ?, ?, ?)')
    .run('COM001', '스마트공방', '02-000-0000', '서울시 강남구');

  // 전체관리자: admin / admin1234
  db.prepare('INSERT INTO users (username, password_hash, name, role, company_id, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run('admin', hashPassword('admin1234'), '전체관리자', 'super_admin', 1, 1);

  // 회사관리자: user1 / user1234
  db.prepare('INSERT INTO users (username, password_hash, name, role, company_id, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    .run('user1', hashPassword('user1234'), '회사관리자', 'company_admin', 1, 1);

  console.log('기본 회사/사용자 데이터 삽입 완료');
}

// 샘플 데이터 삽입 (데이터가 없을 때만)
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();

if (productCount.count === 0) {
  console.log('샘플 데이터 삽입 중...');

  // 샘플 제품
  const insertProduct = db.prepare('INSERT INTO products (product_code, name, unit, price) VALUES (?, ?, ?, ?)');
  const products = [
    ['P001', '스마트 센서 A형', 'EA', 50000],
    ['P002', '스마트 센서 B형', 'EA', 75000],
    ['P003', '컨트롤러 유닛', 'SET', 150000],
    ['P004', '전원 모듈 12V', 'EA', 30000],
    ['P005', '전원 모듈 24V', 'EA', 35000],
    ['P006', '통신 모듈 RS485', 'EA', 45000],
    ['P007', '통신 모듈 이더넷', 'EA', 65000],
    ['P008', 'LED 디스플레이', 'EA', 25000],
    ['P009', '알루미늄 케이스 소형', 'EA', 15000],
    ['P010', '알루미늄 케이스 대형', 'EA', 28000],
  ];
  products.forEach(p => insertProduct.run(...p));

  // 재고 초기화
  const insertInventory = db.prepare('INSERT INTO inventory (product_id, quantity, location) VALUES (?, ?, ?)');
  insertInventory.run(1, 150, 'A-1-1');
  insertInventory.run(2, 80, 'A-1-2');
  insertInventory.run(3, 45, 'A-2-1');
  insertInventory.run(4, 200, 'B-1-1');
  insertInventory.run(5, 180, 'B-1-2');
  insertInventory.run(6, 120, 'B-2-1');
  insertInventory.run(7, 90, 'B-2-2');
  insertInventory.run(8, 250, 'C-1-1');
  insertInventory.run(9, 300, 'C-2-1');
  insertInventory.run(10, 8, 'C-2-2');  // 재고 부족

  // 재고 이력
  const insertHistory = db.prepare('INSERT INTO inventory_history (product_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)');
  for (let i = 1; i <= 10; i++) {
    insertHistory.run(i, '입고', 100, '초기 재고 입고');
  }
  insertHistory.run(1, '입고', 50, '추가 발주 입고');
  insertHistory.run(10, '사용', -92, '생산 사용');

  // 샘플 거래처
  const insertCustomer = db.prepare('INSERT INTO customers (customer_code, name, contact, address) VALUES (?, ?, ?, ?)');
  const customers = [
    ['C001', '(주)테크솔루션', '02-1234-5678', '서울시 강남구 테헤란로 123'],
    ['C002', '스마트팩토리(주)', '031-987-6543', '경기도 성남시 분당구 판교로 456'],
    ['C003', '자동화시스템', '032-555-1234', '인천시 연수구 송도동 789'],
    ['C004', '(주)디지털웍스', '02-333-4444', '서울시 금천구 가산디지털로 100'],
    ['C005', '코리아센서', '031-777-8888', '경기도 안양시 동안구 시민대로 200'],
  ];
  customers.forEach(c => insertCustomer.run(...c));

  // 샘플 주문
  const insertOrder = db.prepare('INSERT INTO orders (order_number, customer_id, order_date, due_date, status, total_amount) VALUES (?, ?, ?, ?, ?, ?)');
  const insertOrderItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)');

  // 주문 1 - 완료
  insertOrder.run('ORD20260201001', 1, '2026-02-01', '2026-02-05', '완료', 1500000);
  insertOrderItem.run(1, 1, 10, 50000);
  insertOrderItem.run(1, 3, 5, 150000);
  insertOrderItem.run(1, 8, 10, 25000);

  // 주문 2 - 진행중
  insertOrder.run('ORD20260205001', 2, '2026-02-05', '2026-02-12', '진행중', 2250000);
  insertOrderItem.run(2, 2, 20, 75000);
  insertOrderItem.run(2, 6, 10, 45000);
  insertOrderItem.run(2, 7, 5, 65000);

  // 주문 3 - 대기
  insertOrder.run('ORD20260208001', 3, '2026-02-08', '2026-02-15', '대기', 875000);
  insertOrderItem.run(3, 4, 15, 30000);
  insertOrderItem.run(3, 5, 10, 35000);
  insertOrderItem.run(3, 9, 5, 15000);

  // 주문 4 - 대기
  insertOrder.run('ORD20260209001', 4, '2026-02-09', '2026-02-20', '대기', 1950000);
  insertOrderItem.run(4, 1, 15, 50000);
  insertOrderItem.run(4, 2, 10, 75000);
  insertOrderItem.run(4, 3, 3, 150000);

  // 주문 5 - 완료
  insertOrder.run('ORD20260130001', 5, '2026-01-30', '2026-02-03', '완료', 640000);
  insertOrderItem.run(5, 8, 20, 25000);
  insertOrderItem.run(5, 9, 8, 15000);
  insertOrderItem.run(5, 10, 1, 28000);

  // 샘플 생산
  const insertProduction = db.prepare('INSERT INTO productions (production_number, order_id, product_id, planned_qty, actual_qty, defect_qty, waste_qty, worker, status, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  // 생산 완료
  insertProduction.run('PRD20260201001', 1, 1, 10, 10, 0, 0, '김철수', '완료', '2026-02-01 09:00:00', '2026-02-01 17:00:00');
  insertProduction.run('PRD20260202001', 1, 3, 5, 5, 0, 0, '이영희', '완료', '2026-02-02 09:00:00', '2026-02-02 16:00:00');
  insertProduction.run('PRD20260130001', 5, 8, 20, 22, 2, 0, '박민수', '완료', '2026-01-30 09:00:00', '2026-01-30 18:00:00');

  // 생산 진행중
  insertProduction.run('PRD20260208001', 2, 2, 20, 0, 0, 0, '김철수', '진행중', '2026-02-08 09:00:00', null);
  insertProduction.run('PRD20260208002', 2, 6, 10, 0, 0, 0, '이영희', '진행중', '2026-02-08 10:00:00', null);

  // 생산 대기
  insertProduction.run('PRD20260209001', 3, 4, 15, 0, 0, 0, '', '대기', null, null);
  insertProduction.run('PRD20260209002', 4, 1, 15, 0, 0, 0, '', '대기', null, null);

  // 샘플 출하
  const insertShipment = db.prepare('INSERT INTO shipments (shipment_number, order_id, shipment_date, status) VALUES (?, ?, ?, ?)');
  const insertShipmentItem = db.prepare('INSERT INTO shipment_items (shipment_id, product_id, quantity) VALUES (?, ?, ?)');

  // 출하 완료
  insertShipment.run('SHP20260203001', 1, '2026-02-03', '완료');
  insertShipmentItem.run(1, 1, 10);
  insertShipmentItem.run(1, 3, 5);
  insertShipmentItem.run(1, 8, 10);

  insertShipment.run('SHP20260203002', 5, '2026-02-03', '완료');
  insertShipmentItem.run(2, 8, 20);
  insertShipmentItem.run(2, 9, 8);
  insertShipmentItem.run(2, 10, 1);

  // 출하 대기
  insertShipment.run('SHP20260209001', 2, '2026-02-12', '대기');
  insertShipmentItem.run(3, 2, 20);
  insertShipmentItem.run(3, 6, 10);
  insertShipmentItem.run(3, 7, 5);

  console.log('샘플 데이터 삽입 완료');
}

console.log('데이터베이스 초기화 완료');

module.exports = db;
