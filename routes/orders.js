const express = require('express');
const router = express.Router();

// 주문번호 생성 함수
function generateOrderNumber(db) {
  const prefix = db.prepare("SELECT value FROM settings WHERE key = 'order_prefix'").get()?.value || 'ORD';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_number LIKE ?").get(`${prefix}${today}%`);
  const seq = String(count.count + 1).padStart(3, '0');
  return `${prefix}${today}${seq}`;
}

// 주문 목록 조회
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, customer_id } = req.query;

  try {
    let sql = `
      SELECT o.*, c.name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (customer_id) {
      sql += ' AND o.customer_id = ?';
      params.push(customer_id);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = db.prepare(sql).all(...params);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 주문 상세 조회
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.contact, c.address
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    // 주문 상세 품목
    const items = db.prepare(`
      SELECT oi.*, p.product_code, p.name as product_name, p.unit
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(req.params.id);

    res.json({ ...order, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 주문 등록
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id, due_date, items } = req.body;

  if (!customer_id || !items || items.length === 0) {
    return res.status(400).json({ error: '거래처와 주문 품목은 필수입니다.' });
  }

  try {
    const orderNumber = generateOrderNumber(db);
    let totalAmount = 0;

    // 총액 계산
    items.forEach(item => {
      totalAmount += item.quantity * item.unit_price;
    });

    // 주문 생성
    const orderStmt = db.prepare(`
      INSERT INTO orders (order_number, customer_id, due_date, total_amount)
      VALUES (?, ?, ?, ?)
    `);
    const orderResult = orderStmt.run(orderNumber, customer_id, due_date || null, totalAmount);
    const orderId = orderResult.lastInsertRowid;

    // 주문 상세 품목 등록
    const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)');
    items.forEach(item => {
      itemStmt.run(orderId, item.product_id, item.quantity, item.unit_price);
    });

    res.status(201).json({
      id: orderId,
      order_number: orderNumber,
      message: '주문이 등록되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 주문 수정
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { customer_id, due_date, items } = req.body;

  try {
    // 기존 주문 확인
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    if (order.status !== '대기') {
      return res.status(400).json({ error: '대기 상태의 주문만 수정할 수 있습니다.' });
    }

    let totalAmount = 0;
    if (items) {
      items.forEach(item => {
        totalAmount += item.quantity * item.unit_price;
      });
    }

    // 주문 수정
    db.prepare('UPDATE orders SET customer_id = ?, due_date = ?, total_amount = ? WHERE id = ?')
      .run(customer_id, due_date, totalAmount, req.params.id);

    // 기존 품목 삭제 후 재등록
    if (items) {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);
      const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)');
      items.forEach(item => {
        itemStmt.run(req.params.id, item.product_id, item.quantity, item.unit_price);
      });
    }

    res.json({ message: '주문이 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 주문 상태 변경
router.patch('/:id/status', (req, res) => {
  const db = req.app.locals.db;
  const { status } = req.body;
  const validStatuses = ['대기', '진행중', '완료', '취소'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  }

  try {
    const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    res.json({ message: '상태가 변경되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 주문 삭제
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    if (order.status !== '대기' && order.status !== '취소') {
      return res.status(400).json({ error: '대기 또는 취소 상태의 주문만 삭제할 수 있습니다.' });
    }

    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    res.json({ message: '주문이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
