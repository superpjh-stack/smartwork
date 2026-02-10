const express = require('express');
const router = express.Router();

// 재고 목록 조회
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  try {
    const inventory = db.prepare(`
      SELECT i.*, p.product_code, p.name as product_name, p.unit
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      ORDER BY p.name
    `).all();

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 재고 상세 조회
router.get('/:product_id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const inventory = db.prepare(`
      SELECT i.*, p.product_code, p.name as product_name, p.unit
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.product_id = ?
    `).get(req.params.product_id);

    if (!inventory) {
      return res.status(404).json({ error: '재고 정보를 찾을 수 없습니다.' });
    }

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 재고 입고
router.post('/receive', (req, res) => {
  const db = req.app.locals.db;
  const { product_id, quantity, reason } = req.body;

  if (!product_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: '제품과 수량을 확인해주세요.' });
  }

  try {
    // 재고 증가
    db.prepare('UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?')
      .run(quantity, product_id);

    // 이력 기록
    db.prepare('INSERT INTO inventory_history (product_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)')
      .run(product_id, '입고', quantity, reason || '');

    res.json({ message: '입고 처리되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 재고 출고/사용
router.post('/use', (req, res) => {
  const db = req.app.locals.db;
  const { product_id, quantity, reason, change_type } = req.body;

  if (!product_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: '제품과 수량을 확인해주세요.' });
  }

  try {
    // 현재 재고 확인
    const current = db.prepare('SELECT quantity FROM inventory WHERE product_id = ?').get(product_id);
    if (!current || current.quantity < quantity) {
      return res.status(400).json({ error: '재고가 부족합니다.' });
    }

    // 재고 감소
    db.prepare('UPDATE inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?')
      .run(quantity, product_id);

    // 이력 기록
    db.prepare('INSERT INTO inventory_history (product_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)')
      .run(product_id, change_type || '사용', -quantity, reason || '');

    res.json({ message: '출고 처리되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 재고 조정
router.post('/adjust', (req, res) => {
  const db = req.app.locals.db;
  const { product_id, quantity, reason } = req.body;

  if (!product_id || quantity === undefined) {
    return res.status(400).json({ error: '제품과 조정 수량을 확인해주세요.' });
  }

  try {
    const current = db.prepare('SELECT quantity FROM inventory WHERE product_id = ?').get(product_id);
    const diff = quantity - (current ? current.quantity : 0);

    // 재고 조정
    db.prepare('UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?')
      .run(quantity, product_id);

    // 이력 기록
    db.prepare('INSERT INTO inventory_history (product_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)')
      .run(product_id, '조정', diff, reason || '재고 조정');

    res.json({ message: '재고가 조정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 위치 수정
router.put('/:product_id/location', (req, res) => {
  const db = req.app.locals.db;
  const { location } = req.body;

  try {
    db.prepare('UPDATE inventory SET location = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?')
      .run(location, req.params.product_id);

    res.json({ message: '위치가 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 재고 이력 조회
router.get('/:product_id/history', (req, res) => {
  const db = req.app.locals.db;

  try {
    const history = db.prepare(`
      SELECT h.*, p.name as product_name
      FROM inventory_history h
      JOIN products p ON h.product_id = p.id
      WHERE h.product_id = ?
      ORDER BY h.created_at DESC
      LIMIT 50
    `).all(req.params.product_id);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 전체 재고 이력 조회
router.get('/history/all', (req, res) => {
  const db = req.app.locals.db;

  try {
    const history = db.prepare(`
      SELECT h.*, p.name as product_name, p.product_code
      FROM inventory_history h
      JOIN products p ON h.product_id = p.id
      ORDER BY h.created_at DESC
      LIMIT 100
    `).all();

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
