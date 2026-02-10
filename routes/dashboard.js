const express = require('express');
const router = express.Router();

// 대시보드 요약 정보
router.get('/summary', (req, res) => {
  const db = req.app.locals.db;

  try {
    // 제품 수
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();

    // 거래처 수
    const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get();

    // 진행중인 주문
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('대기', '진행중')").get();

    // 진행중인 생산
    const activeProductions = db.prepare("SELECT COUNT(*) as count FROM productions WHERE status = '진행중'").get();

    // 오늘 출하 예정
    const todayShipments = db.prepare("SELECT COUNT(*) as count FROM shipments WHERE shipment_date = DATE('now') AND status = '대기'").get();

    // 재고 부족 제품 (10개 이하)
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM inventory WHERE quantity <= 10').get();

    res.json({
      products: productCount.count,
      customers: customerCount.count,
      pendingOrders: pendingOrders.count,
      activeProductions: activeProductions.count,
      todayShipments: todayShipments.count,
      lowStock: lowStock.count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 최근 주문
router.get('/recent-orders', (req, res) => {
  const db = req.app.locals.db;

  try {
    const orders = db.prepare(`
      SELECT o.*, c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all();

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 최근 생산
router.get('/recent-productions', (req, res) => {
  const db = req.app.locals.db;

  try {
    const productions = db.prepare(`
      SELECT p.*, pr.name as product_name
      FROM productions p
      LEFT JOIN products pr ON p.product_id = pr.id
      ORDER BY p.created_at DESC
      LIMIT 5
    `).all();

    res.json(productions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 재고 현황
router.get('/inventory-status', (req, res) => {
  const db = req.app.locals.db;

  try {
    const inventory = db.prepare(`
      SELECT i.*, p.name as product_name, p.product_code
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      ORDER BY i.quantity ASC
      LIMIT 10
    `).all();

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
