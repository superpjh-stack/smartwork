const express = require('express');
const router = express.Router();

// 생산번호 생성 함수
function generateProductionNumber(db) {
  const prefix = db.prepare("SELECT value FROM settings WHERE key = 'production_prefix'").get()?.value || 'PRD';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare("SELECT COUNT(*) as count FROM productions WHERE production_number LIKE ?").get(`${prefix}${today}%`);
  const seq = String(count.count + 1).padStart(3, '0');
  return `${prefix}${today}${seq}`;
}

// 생산 목록 조회
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, product_id } = req.query;

  try {
    let sql = `
      SELECT p.*, pr.name as product_name, pr.product_code, o.order_number
      FROM productions p
      LEFT JOIN products pr ON p.product_id = pr.id
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (product_id) {
      sql += ' AND p.product_id = ?';
      params.push(product_id);
    }

    sql += ' ORDER BY p.created_at DESC';

    const productions = db.prepare(sql).all(...params);
    res.json(productions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 상세 조회
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const production = db.prepare(`
      SELECT p.*, pr.name as product_name, pr.product_code, pr.unit, o.order_number
      FROM productions p
      LEFT JOIN products pr ON p.product_id = pr.id
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    res.json(production);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 등록
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { product_id, order_id, planned_qty, worker } = req.body;

  if (!product_id || !planned_qty || planned_qty <= 0) {
    return res.status(400).json({ error: '제품과 계획 수량은 필수입니다.' });
  }

  try {
    const productionNumber = generateProductionNumber(db);

    const stmt = db.prepare(`
      INSERT INTO productions (production_number, product_id, order_id, planned_qty, worker)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(productionNumber, product_id, order_id || null, planned_qty, worker || '');

    res.status(201).json({
      id: result.lastInsertRowid,
      production_number: productionNumber,
      message: '생산이 등록되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 시작
router.patch('/:id/start', (req, res) => {
  const db = req.app.locals.db;
  const { worker } = req.body;

  try {
    const production = db.prepare('SELECT * FROM productions WHERE id = ?').get(req.params.id);

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '대기') {
      return res.status(400).json({ error: '대기 상태의 생산만 시작할 수 있습니다.' });
    }

    db.prepare("UPDATE productions SET status = '진행중', started_at = CURRENT_TIMESTAMP, worker = COALESCE(?, worker) WHERE id = ?")
      .run(worker || null, req.params.id);

    // 연결된 주문 상태도 변경
    if (production.order_id) {
      db.prepare("UPDATE orders SET status = '진행중' WHERE id = ? AND status = '대기'")
        .run(production.order_id);
    }

    res.json({ message: '생산이 시작되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 완료
router.patch('/:id/complete', (req, res) => {
  const db = req.app.locals.db;
  const { actual_qty, defect_qty, waste_qty } = req.body;

  if (actual_qty === undefined || actual_qty < 0) {
    return res.status(400).json({ error: '실제 생산 수량을 입력해주세요.' });
  }

  try {
    const production = db.prepare('SELECT * FROM productions WHERE id = ?').get(req.params.id);

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '진행중') {
      return res.status(400).json({ error: '진행중인 생산만 완료할 수 있습니다.' });
    }

    // 생산 완료 처리
    db.prepare(`
      UPDATE productions
      SET status = '완료', actual_qty = ?, defect_qty = ?, waste_qty = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(actual_qty, defect_qty || 0, waste_qty || 0, req.params.id);

    // 재고 증가 (양품만)
    const goodQty = actual_qty - (defect_qty || 0) - (waste_qty || 0);
    if (goodQty > 0) {
      db.prepare('UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?')
        .run(goodQty, production.product_id);

      // 재고 이력
      db.prepare('INSERT INTO inventory_history (product_id, change_type, quantity, reason) VALUES (?, ?, ?, ?)')
        .run(production.product_id, '입고', goodQty, `생산 완료 (${production.production_number})`);
    }

    res.json({ message: '생산이 완료되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 중단
router.patch('/:id/stop', (req, res) => {
  const db = req.app.locals.db;
  const { reason } = req.body;

  try {
    const production = db.prepare('SELECT * FROM productions WHERE id = ?').get(req.params.id);

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '진행중' && production.status !== '대기') {
      return res.status(400).json({ error: '대기 또는 진행중인 생산만 중단할 수 있습니다.' });
    }

    db.prepare("UPDATE productions SET status = '중단' WHERE id = ?").run(req.params.id);

    res.json({ message: '생산이 중단되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 수정
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { product_id, order_id, planned_qty, worker } = req.body;

  try {
    const production = db.prepare('SELECT * FROM productions WHERE id = ?').get(req.params.id);

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '대기') {
      return res.status(400).json({ error: '대기 상태의 생산만 수정할 수 있습니다.' });
    }

    db.prepare('UPDATE productions SET product_id = ?, order_id = ?, planned_qty = ?, worker = ? WHERE id = ?')
      .run(product_id, order_id || null, planned_qty, worker || '', req.params.id);

    res.json({ message: '생산이 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 삭제
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;

  try {
    const production = db.prepare('SELECT * FROM productions WHERE id = ?').get(req.params.id);

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '대기' && production.status !== '중단') {
      return res.status(400).json({ error: '대기 또는 중단 상태의 생산만 삭제할 수 있습니다.' });
    }

    db.prepare('DELETE FROM productions WHERE id = ?').run(req.params.id);
    res.json({ message: '생산이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
