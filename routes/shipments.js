const express = require('express');
const router = express.Router();

// 출하번호 생성 함수
function generateShipmentNumber(db) {
  const prefix = db.prepare("SELECT value FROM settings WHERE key = 'shipment_prefix'").get()?.value || 'SHP';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare("SELECT COUNT(*) as count FROM shipments WHERE shipment_number LIKE ?").get(`${prefix}${today}%`);
  const seq = String(count.count + 1).padStart(3, '0');
  return `${prefix}${today}${seq}`;
}

// 출하 목록 조회
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, order_id } = req.query;

  try {
    let sql = `
      SELECT s.*, o.order_number, c.name as customer_name
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }
    if (order_id) {
      sql += ' AND s.order_id = ?';
      params.push(order_id);
    }

    sql += ' ORDER BY s.created_at DESC';

    const shipments = db.prepare(sql).all(...params);
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 상세 조회
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const shipment = db.prepare(`
      SELECT s.*, o.order_number, o.due_date, c.name as customer_name, c.contact, c.address
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!shipment) {
      return res.status(404).json({ error: '출하 정보를 찾을 수 없습니다.' });
    }

    // 출하 상세 품목
    const items = db.prepare(`
      SELECT si.*, p.product_code, p.name as product_name, p.unit
      FROM shipment_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.shipment_id = ?
    `).all(req.params.id);

    res.json({ ...shipment, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 등록
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { order_id, shipment_date, items } = req.body;

  if (!order_id || !items || items.length === 0) {
    return res.status(400).json({ error: '주문과 출하 품목은 필수입니다.' });
  }

  try {
    // 재고 확인
    for (const item of items) {
      const inventory = db.prepare('SELECT quantity FROM inventory WHERE product_id = ?').get(item.product_id);
      if (!inventory || inventory.quantity < item.quantity) {
        const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id);
        return res.status(400).json({ error: `${product?.name || '제품'} 재고가 부족합니다.` });
      }
    }

    const shipmentNumber = generateShipmentNumber(db);

    // 출하 생성
    const shipmentStmt = db.prepare(`
      INSERT INTO shipments (shipment_number, order_id, shipment_date)
      VALUES (?, ?, ?)
    `);
    const shipmentResult = shipmentStmt.run(shipmentNumber, order_id, shipment_date || new Date().toISOString().slice(0, 10));
    const shipmentId = shipmentResult.lastInsertRowid;

    // 출하 상세 품목 등록
    const itemStmt = db.prepare('INSERT INTO shipment_items (shipment_id, product_id, quantity) VALUES (?, ?, ?)');
    items.forEach(item => {
      itemStmt.run(shipmentId, item.product_id, item.quantity);
    });

    res.status(201).json({
      id: shipmentId,
      shipment_number: shipmentNumber,
      message: '출하가 등록되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 완료
router.patch('/:id/complete', (req, res) => {
  const db = req.app.locals.db;

  try {
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(req.params.id);

    if (!shipment) {
      return res.status(404).json({ error: '출하 정보를 찾을 수 없습니다.' });
    }

    if (shipment.status === '완료') {
      return res.status(400).json({ error: '이미 완료된 출하입니다.' });
    }

    // 출하 품목 조회
    const items = db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(req.params.id);

    // 재고 차감 및 이력 기록
    for (const item of items) {
      const inventory = db.prepare('SELECT quantity FROM inventory WHERE product_id = ?').get(item.product_id);
      if (!inventory || inventory.quantity < item.quantity) {
        const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id);
        return res.status(400).json({ error: `${product?.name || '제품'} 재고가 부족합니다.` });
      }

      db.prepare('UPDATE inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?')
        .run(item.quantity, item.product_id);

      db.prepare('INSERT INTO inventory_history (product_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)')
        .run(item.product_id, '출고', -item.quantity, `출하 완료 (${shipment.shipment_number})`);
    }

    // 출하 상태 변경
    db.prepare("UPDATE shipments SET status = '완료' WHERE id = ?").run(req.params.id);

    // 주문의 모든 품목이 출하되었는지 확인하고 주문 상태 변경
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(shipment.order_id);
    if (order) {
      const orderItems = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(order.id);
      const shippedItems = db.prepare(`
        SELECT si.product_id, SUM(si.quantity) as shipped_qty
        FROM shipment_items si
        JOIN shipments s ON si.shipment_id = s.id
        WHERE s.order_id = ? AND s.status = '완료'
        GROUP BY si.product_id
      `).all(order.id);

      const shippedMap = {};
      shippedItems.forEach(s => shippedMap[s.product_id] = s.shipped_qty);

      const allShipped = orderItems.every(oi => (shippedMap[oi.product_id] || 0) >= oi.quantity);
      if (allShipped) {
        db.prepare("UPDATE orders SET status = '완료' WHERE id = ?").run(order.id);
      }
    }

    res.json({ message: '출하가 완료되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 취소
router.patch('/:id/cancel', (req, res) => {
  const db = req.app.locals.db;

  try {
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(req.params.id);

    if (!shipment) {
      return res.status(404).json({ error: '출하 정보를 찾을 수 없습니다.' });
    }

    if (shipment.status === '완료') {
      return res.status(400).json({ error: '완료된 출하는 취소할 수 없습니다.' });
    }

    db.prepare("UPDATE shipments SET status = '취소' WHERE id = ?").run(req.params.id);

    res.json({ message: '출하가 취소되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 삭제
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(req.params.id);

    if (!shipment) {
      return res.status(404).json({ error: '출하 정보를 찾을 수 없습니다.' });
    }

    if (shipment.status === '완료') {
      return res.status(400).json({ error: '완료된 출하는 삭제할 수 없습니다.' });
    }

    db.prepare('DELETE FROM shipments WHERE id = ?').run(req.params.id);
    res.json({ message: '출하가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
