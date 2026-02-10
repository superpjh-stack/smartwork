const express = require('express');
const router = express.Router();

// 제품 목록 조회
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  try {
    const products = db.prepare(`
      SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ORDER BY p.created_at DESC
    `).all();

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 제품 상세 조회
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const product = db.prepare(`
      SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity, i.location
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 제품 등록
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { product_code, name, unit, price } = req.body;

  if (!product_code || !name) {
    return res.status(400).json({ error: '제품코드와 제품명은 필수입니다.' });
  }

  try {
    const stmt = db.prepare('INSERT INTO products (product_code, name, unit, price) VALUES (?, ?, ?, ?)');
    const result = stmt.run(product_code, name, unit || '개', price || 0);

    // 재고 레코드도 자동 생성
    db.prepare('INSERT INTO inventory (product_id, quantity) VALUES (?, 0)').run(result.lastInsertRowid);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: '제품이 등록되었습니다.'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '이미 존재하는 제품코드입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 제품 수정
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { product_code, name, unit, price } = req.body;

  try {
    const stmt = db.prepare('UPDATE products SET product_code = ?, name = ?, unit = ?, price = ? WHERE id = ?');
    const result = stmt.run(product_code, name, unit, price, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
    }

    res.json({ message: '제품이 수정되었습니다.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '이미 존재하는 제품코드입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 제품 삭제
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
    }

    res.json({ message: '제품이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
