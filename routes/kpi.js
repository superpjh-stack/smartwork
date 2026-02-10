const express = require('express');
const router = express.Router();

// 생산성 KPI 조회 (실시간 계산)
router.get('/productivity', (req, res) => {
  try {
    const db = req.app.locals.db;
    const { start_date, end_date, product_id } = req.query;

    let dateFilter = '';
    let productFilter = '';
    const params = [];

    if (start_date) {
      dateFilter += ' AND DATE(p.completed_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND DATE(p.completed_at) <= ?';
      params.push(end_date);
    }
    if (product_id) {
      productFilter = ' AND p.product_id = ?';
      params.push(product_id);
    }

    // 전체 요약
    const summary = db.prepare(`
      SELECT
        COALESCE(SUM(p.actual_qty), 0) as total_actual,
        COALESCE(SUM(p.planned_qty), 0) as total_planned,
        COUNT(*) as production_count,
        CASE WHEN COALESCE(SUM(p.planned_qty), 0) > 0
          THEN ROUND(CAST(SUM(p.actual_qty) AS REAL) / SUM(p.planned_qty) * 100, 1)
          ELSE 0 END as pi
      FROM productions p
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilter}${productFilter}
    `).get(...params);

    // 일별 집계
    const daily = db.prepare(`
      SELECT
        DATE(p.completed_at) as date,
        COUNT(*) as production_count,
        SUM(p.actual_qty) as actual_qty,
        SUM(p.planned_qty) as planned_qty,
        CASE WHEN SUM(p.planned_qty) > 0
          THEN ROUND(CAST(SUM(p.actual_qty) AS REAL) / SUM(p.planned_qty) * 100, 1)
          ELSE 0 END as pi
      FROM productions p
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilter}${productFilter}
      GROUP BY DATE(p.completed_at)
      ORDER BY date DESC
    `).all(...params);

    // 제품별 집계
    const paramsByProduct = [];
    let dateFilterBP = '';
    let productFilterBP = '';
    if (start_date) {
      dateFilterBP += ' AND DATE(p.completed_at) >= ?';
      paramsByProduct.push(start_date);
    }
    if (end_date) {
      dateFilterBP += ' AND DATE(p.completed_at) <= ?';
      paramsByProduct.push(end_date);
    }
    if (product_id) {
      productFilterBP = ' AND p.product_id = ?';
      paramsByProduct.push(product_id);
    }

    const byProduct = db.prepare(`
      SELECT
        p.product_id,
        pr.name as product_name,
        pr.product_code,
        COUNT(*) as production_count,
        SUM(p.actual_qty) as actual_qty,
        SUM(p.planned_qty) as planned_qty,
        CASE WHEN SUM(p.planned_qty) > 0
          THEN ROUND(CAST(SUM(p.actual_qty) AS REAL) / SUM(p.planned_qty) * 100, 1)
          ELSE 0 END as pi
      FROM productions p
      JOIN products pr ON p.product_id = pr.id
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilterBP}${productFilterBP}
      GROUP BY p.product_id
      ORDER BY pi DESC
    `).all(...paramsByProduct);

    res.json({ summary, daily, byProduct });
  } catch (error) {
    console.error('KPI 생산성 조회 오류:', error);
    res.status(500).json({ error: '생산성 KPI 조회 중 오류가 발생했습니다.' });
  }
});

// 품질 KPI 조회 (실시간 계산)
router.get('/quality', (req, res) => {
  try {
    const db = req.app.locals.db;
    const { start_date, end_date, product_id } = req.query;

    let dateFilter = '';
    let productFilter = '';
    const params = [];

    if (start_date) {
      dateFilter += ' AND DATE(p.completed_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND DATE(p.completed_at) <= ?';
      params.push(end_date);
    }
    if (product_id) {
      productFilter = ' AND p.product_id = ?';
      params.push(product_id);
    }

    // 전체 요약
    const summary = db.prepare(`
      SELECT
        COALESCE(SUM(p.actual_qty), 0) as total_actual,
        COALESCE(SUM(p.defect_qty), 0) as total_defect,
        COALESCE(SUM(p.waste_qty), 0) as total_waste,
        COUNT(*) as production_count,
        CASE WHEN COALESCE(SUM(p.actual_qty), 0) > 0
          THEN ROUND(CAST(SUM(p.actual_qty) - SUM(p.defect_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as qi,
        CASE WHEN COALESCE(SUM(p.actual_qty), 0) > 0
          THEN ROUND(CAST(SUM(p.actual_qty) - SUM(p.defect_qty) - SUM(p.waste_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as yield_rate,
        CASE WHEN COALESCE(SUM(p.actual_qty), 0) > 0
          THEN ROUND(CAST(SUM(p.defect_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as defect_rate,
        CASE WHEN COALESCE(SUM(p.actual_qty), 0) > 0
          THEN ROUND(CAST(SUM(p.waste_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as waste_rate
      FROM productions p
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilter}${productFilter}
    `).get(...params);

    // 일별 집계
    const daily = db.prepare(`
      SELECT
        DATE(p.completed_at) as date,
        COUNT(*) as production_count,
        SUM(p.actual_qty) as actual_qty,
        SUM(p.defect_qty) as defect_qty,
        SUM(p.waste_qty) as waste_qty,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(CAST(SUM(p.actual_qty) - SUM(p.defect_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as qi,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(CAST(SUM(p.actual_qty) - SUM(p.defect_qty) - SUM(p.waste_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as yield_rate,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(CAST(SUM(p.defect_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as defect_rate,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(CAST(SUM(p.waste_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as waste_rate
      FROM productions p
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilter}${productFilter}
      GROUP BY DATE(p.completed_at)
      ORDER BY date DESC
    `).all(...params);

    // 제품별 집계
    const paramsByProduct = [];
    let dateFilterBP = '';
    let productFilterBP = '';
    if (start_date) {
      dateFilterBP += ' AND DATE(p.completed_at) >= ?';
      paramsByProduct.push(start_date);
    }
    if (end_date) {
      dateFilterBP += ' AND DATE(p.completed_at) <= ?';
      paramsByProduct.push(end_date);
    }
    if (product_id) {
      productFilterBP = ' AND p.product_id = ?';
      paramsByProduct.push(product_id);
    }

    const byProduct = db.prepare(`
      SELECT
        p.product_id,
        pr.name as product_name,
        pr.product_code,
        COUNT(*) as production_count,
        SUM(p.actual_qty) as actual_qty,
        SUM(p.defect_qty) as defect_qty,
        SUM(p.waste_qty) as waste_qty,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(CAST(SUM(p.actual_qty) - SUM(p.defect_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as qi,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(CAST(SUM(p.actual_qty) - SUM(p.defect_qty) - SUM(p.waste_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as yield_rate,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(CAST(SUM(p.defect_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as defect_rate,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(CAST(SUM(p.waste_qty) AS REAL) / SUM(p.actual_qty) * 100, 1)
          ELSE 0 END as waste_rate
      FROM productions p
      JOIN products pr ON p.product_id = pr.id
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilterBP}${productFilterBP}
      GROUP BY p.product_id
      ORDER BY qi DESC
    `).all(...paramsByProduct);

    res.json({ summary, daily, byProduct });
  } catch (error) {
    console.error('KPI 품질 조회 오류:', error);
    res.status(500).json({ error: '품질 KPI 조회 중 오류가 발생했습니다.' });
  }
});

// KPI 임계치 설정 조회
router.get('/settings', (req, res) => {
  try {
    const db = req.app.locals.db;
    const settings = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'kpi_%'").all();
    const result = {};
    settings.forEach(s => { result[s.key] = parseFloat(s.value); });
    res.json(result);
  } catch (error) {
    console.error('KPI 설정 조회 오류:', error);
    res.status(500).json({ error: 'KPI 설정 조회 중 오류가 발생했습니다.' });
  }
});

// KPI 임계치 설정 저장
router.put('/settings', (req, res) => {
  try {
    const db = req.app.locals.db;
    const data = req.body;

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const updateMany = db.transaction((entries) => {
      for (const [key, value] of entries) {
        if (key.startsWith('kpi_')) {
          stmt.run(key, String(value));
        }
      }
    });

    updateMany(Object.entries(data));
    res.json({ message: 'KPI 설정이 저장되었습니다.' });
  } catch (error) {
    console.error('KPI 설정 저장 오류:', error);
    res.status(500).json({ error: 'KPI 설정 저장 중 오류가 발생했습니다.' });
  }
});

// KPI 일별 스냅샷 생성
router.post('/snapshot', (req, res) => {
  try {
    const db = req.app.locals.db;
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const productData = db.prepare(`
      SELECT
        p.product_id,
        COUNT(*) as production_count,
        SUM(p.actual_qty) as actual_qty,
        SUM(p.planned_qty) as planned_qty,
        SUM(p.defect_qty) as defect_qty,
        SUM(p.waste_qty) as waste_qty
      FROM productions p
      WHERE p.status = '완료' AND DATE(p.completed_at) = ?
      GROUP BY p.product_id
    `).all(targetDate);

    if (productData.length === 0) {
      return res.json({ message: '해당 날짜에 완료된 생산 데이터가 없습니다.', count: 0 });
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO kpi_daily (date, company_id, product_id, pi, qi, yield_rate, defect_rate, waste_rate, actual_qty, planned_qty, defect_qty, waste_qty, production_count)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAll = db.transaction((rows) => {
      for (const row of rows) {
        const pi = row.planned_qty > 0 ? Math.round(row.actual_qty / row.planned_qty * 1000) / 10 : 0;
        const qi = row.actual_qty > 0 ? Math.round((row.actual_qty - row.defect_qty) / row.actual_qty * 1000) / 10 : 0;
        const yieldRate = row.actual_qty > 0 ? Math.round((row.actual_qty - row.defect_qty - row.waste_qty) / row.actual_qty * 1000) / 10 : 0;
        const defectRate = row.actual_qty > 0 ? Math.round(row.defect_qty / row.actual_qty * 1000) / 10 : 0;
        const wasteRate = row.actual_qty > 0 ? Math.round(row.waste_qty / row.actual_qty * 1000) / 10 : 0;

        stmt.run(targetDate, row.product_id, pi, qi, yieldRate, defectRate, wasteRate, row.actual_qty, row.planned_qty, row.defect_qty, row.waste_qty, row.production_count);
      }
    });

    insertAll(productData);
    res.json({ message: `${targetDate} 스냅샷이 생성되었습니다.`, count: productData.length });
  } catch (error) {
    console.error('KPI 스냅샷 생성 오류:', error);
    res.status(500).json({ error: 'KPI 스냅샷 생성 중 오류가 발생했습니다.' });
  }
});

// KPI 스냅샷 이력 조회
router.get('/snapshots', (req, res) => {
  try {
    const db = req.app.locals.db;
    const { start_date, end_date, product_id } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      where += ' AND k.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      where += ' AND k.date <= ?';
      params.push(end_date);
    }
    if (product_id) {
      where += ' AND k.product_id = ?';
      params.push(product_id);
    }

    const snapshots = db.prepare(`
      SELECT k.*, pr.name as product_name, pr.product_code
      FROM kpi_daily k
      LEFT JOIN products pr ON k.product_id = pr.id
      ${where}
      ORDER BY k.date DESC, pr.name
    `).all(...params);

    res.json(snapshots);
  } catch (error) {
    console.error('KPI 스냅샷 조회 오류:', error);
    res.status(500).json({ error: 'KPI 스냅샷 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
