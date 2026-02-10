const express = require('express');
const router = express.Router();

// 일별 생산 현황
router.get('/production/daily', (req, res) => {
  const db = req.app.locals.db;
  const { start_date, end_date } = req.query;

  try {
    let sql = `
      SELECT
        DATE(completed_at) as date,
        COUNT(*) as production_count,
        SUM(actual_qty) as total_actual,
        SUM(defect_qty) as total_defect,
        SUM(waste_qty) as total_waste
      FROM productions
      WHERE status = '완료'
    `;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(completed_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(completed_at) <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY DATE(completed_at) ORDER BY date DESC LIMIT 30';

    const report = db.prepare(sql).all(...params);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 제품별 생산 현황
router.get('/production/by-product', (req, res) => {
  const db = req.app.locals.db;
  const { start_date, end_date } = req.query;

  try {
    let sql = `
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.product_code,
        COUNT(pr.id) as production_count,
        SUM(pr.actual_qty) as total_actual,
        SUM(pr.defect_qty) as total_defect,
        SUM(pr.waste_qty) as total_waste,
        ROUND(SUM(pr.defect_qty) * 100.0 / NULLIF(SUM(pr.actual_qty), 0), 2) as defect_rate
      FROM products p
      LEFT JOIN productions pr ON p.id = pr.product_id AND pr.status = '완료'
    `;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(pr.completed_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(pr.completed_at) <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY p.id ORDER BY total_actual DESC';

    const report = db.prepare(sql).all(...params);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 일별 출하 현황
router.get('/shipment/daily', (req, res) => {
  const db = req.app.locals.db;
  const { start_date, end_date } = req.query;

  try {
    let sql = `
      SELECT
        s.shipment_date as date,
        COUNT(DISTINCT s.id) as shipment_count,
        SUM(si.quantity) as total_quantity
      FROM shipments s
      JOIN shipment_items si ON s.id = si.shipment_id
      WHERE s.status = '완료'
    `;
    const params = [];

    if (start_date) {
      sql += ' AND s.shipment_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND s.shipment_date <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY s.shipment_date ORDER BY date DESC LIMIT 30';

    const report = db.prepare(sql).all(...params);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 거래처별 매출 현황
router.get('/sales/by-customer', (req, res) => {
  const db = req.app.locals.db;
  const { start_date, end_date } = req.query;

  try {
    let sql = `
      SELECT
        c.id as customer_id,
        c.name as customer_name,
        c.customer_code,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_sales
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status = '완료'
    `;
    const params = [];

    if (start_date) {
      sql += ' AND o.order_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND o.order_date <= ?';
      params.push(end_date);
    }

    sql += ' GROUP BY c.id ORDER BY total_sales DESC';

    const report = db.prepare(sql).all(...params);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 월별 매출 현황
router.get('/sales/monthly', (req, res) => {
  const db = req.app.locals.db;
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  try {
    const report = db.prepare(`
      SELECT
        strftime('%Y-%m', order_date) as month,
        COUNT(*) as order_count,
        SUM(total_amount) as total_sales
      FROM orders
      WHERE status = '완료' AND strftime('%Y', order_date) = ?
      GROUP BY strftime('%Y-%m', order_date)
      ORDER BY month
    `).all(String(targetYear));

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 재고 현황 리포트
router.get('/inventory/status', (req, res) => {
  const db = req.app.locals.db;

  try {
    const report = db.prepare(`
      SELECT
        p.id as product_id,
        p.product_code,
        p.name as product_name,
        p.unit,
        p.price,
        COALESCE(i.quantity, 0) as current_stock,
        COALESCE(i.quantity, 0) * p.price as stock_value,
        i.location
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ORDER BY current_stock ASC
    `).all();

    const summary = {
      total_products: report.length,
      total_stock_value: report.reduce((sum, r) => sum + (r.stock_value || 0), 0),
      low_stock_count: report.filter(r => r.current_stock <= 10).length,
      out_of_stock_count: report.filter(r => r.current_stock === 0).length
    };

    res.json({ items: report, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 재고 변동 이력 리포트
router.get('/inventory/history', (req, res) => {
  const db = req.app.locals.db;
  const { start_date, end_date, product_id, change_type } = req.query;

  try {
    let sql = `
      SELECT
        h.*,
        p.product_code,
        p.name as product_name
      FROM inventory_history h
      JOIN products p ON h.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      sql += ' AND DATE(h.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND DATE(h.created_at) <= ?';
      params.push(end_date);
    }
    if (product_id) {
      sql += ' AND h.product_id = ?';
      params.push(product_id);
    }
    if (change_type) {
      sql += ' AND h.change_type = ?';
      params.push(change_type);
    }

    sql += ' ORDER BY h.created_at DESC LIMIT 500';

    const history = db.prepare(sql).all(...params);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
