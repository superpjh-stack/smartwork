const express = require('express');
const router = express.Router();

// 거래처 목록 조회
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  try {
    const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 거래처 상세 조회
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);

    if (!customer) {
      return res.status(404).json({ error: '거래처를 찾을 수 없습니다.' });
    }

    // 거래처의 주문 이력
    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE customer_id = ?
      ORDER BY order_date DESC
      LIMIT 10
    `).all(req.params.id);

    res.json({ ...customer, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 거래처 등록
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { customer_code, name, contact, address } = req.body;

  if (!customer_code || !name) {
    return res.status(400).json({ error: '거래처코드와 거래처명은 필수입니다.' });
  }

  try {
    const stmt = db.prepare('INSERT INTO customers (customer_code, name, contact, address) VALUES (?, ?, ?, ?)');
    const result = stmt.run(customer_code, name, contact || '', address || '');

    res.status(201).json({
      id: result.lastInsertRowid,
      message: '거래처가 등록되었습니다.'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '이미 존재하는 거래처코드입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 거래처 수정
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { customer_code, name, contact, address } = req.body;

  try {
    const stmt = db.prepare('UPDATE customers SET customer_code = ?, name = ?, contact = ?, address = ? WHERE id = ?');
    const result = stmt.run(customer_code, name, contact, address, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '거래처를 찾을 수 없습니다.' });
    }

    res.json({ message: '거래처가 수정되었습니다.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '이미 존재하는 거래처코드입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 거래처 삭제
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    // 연결된 주문이 있는지 확인
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE customer_id = ?').get(req.params.id);
    if (orderCount.count > 0) {
      return res.status(400).json({ error: '해당 거래처에 연결된 주문이 있어 삭제할 수 없습니다.' });
    }

    const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '거래처를 찾을 수 없습니다.' });
    }

    res.json({ message: '거래처가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
