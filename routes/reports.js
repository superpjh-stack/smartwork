const express = require('express');
const router = express.Router();

// 일별 생산 현황
router.get('/production/daily', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { start_date, end_date } = req.query;

  try {
    let dateFilter = '';
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      dateFilter += ` AND completed_at::date >= $${paramIdx}::date`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      dateFilter += ` AND completed_at::date <= $${paramIdx}::date`;
      params.push(end_date);
      paramIdx++;
    }

    const report = await prisma.$queryRawUnsafe(`
      SELECT
        completed_at::date as date,
        COUNT(*)::int as production_count,
        SUM(actual_qty)::int as total_actual,
        SUM(defect_qty)::int as total_defect,
        SUM(waste_qty)::int as total_waste
      FROM productions
      WHERE status = '완료' ${dateFilter}
      GROUP BY completed_at::date
      ORDER BY date DESC
      LIMIT 30
    `, ...params);

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 제품별 생산 현황
router.get('/production/by-product', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { start_date, end_date } = req.query;

  try {
    let dateFilter = '';
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      dateFilter += ` AND pr.completed_at::date >= $${paramIdx}::date`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      dateFilter += ` AND pr.completed_at::date <= $${paramIdx}::date`;
      params.push(end_date);
      paramIdx++;
    }

    const report = await prisma.$queryRawUnsafe(`
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.product_code,
        COUNT(pr.id)::int as production_count,
        COALESCE(SUM(pr.actual_qty), 0)::int as total_actual,
        COALESCE(SUM(pr.defect_qty), 0)::int as total_defect,
        COALESCE(SUM(pr.waste_qty), 0)::int as total_waste,
        ROUND(SUM(pr.defect_qty)::numeric * 100.0 / NULLIF(SUM(pr.actual_qty), 0)::numeric, 2) as defect_rate
      FROM products p
      LEFT JOIN productions pr ON p.id = pr.product_id AND pr.status = '완료' ${dateFilter}
      GROUP BY p.id, p.name, p.product_code
      ORDER BY total_actual DESC
    `, ...params);

    report.forEach(r => { r.defect_rate = r.defect_rate ? Number(r.defect_rate) : null; });

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 일별 출하 현황
router.get('/shipment/daily', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { start_date, end_date } = req.query;

  try {
    let dateFilter = '';
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      dateFilter += ` AND s.shipment_date >= $${paramIdx}::date`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      dateFilter += ` AND s.shipment_date <= $${paramIdx}::date`;
      params.push(end_date);
      paramIdx++;
    }

    const report = await prisma.$queryRawUnsafe(`
      SELECT
        s.shipment_date as date,
        COUNT(DISTINCT s.id)::int as shipment_count,
        SUM(si.quantity)::int as total_quantity
      FROM shipments s
      JOIN shipment_items si ON s.id = si.shipment_id
      WHERE s.status = '완료' ${dateFilter}
      GROUP BY s.shipment_date
      ORDER BY date DESC
      LIMIT 30
    `, ...params);

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 거래처별 매출 현황
router.get('/sales/by-customer', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { start_date, end_date } = req.query;

  try {
    let dateFilter = '';
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      dateFilter += ` AND o.order_date >= $${paramIdx}::date`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      dateFilter += ` AND o.order_date <= $${paramIdx}::date`;
      params.push(end_date);
      paramIdx++;
    }

    const report = await prisma.$queryRawUnsafe(`
      SELECT
        c.id as customer_id,
        c.name as customer_name,
        c.customer_code,
        COUNT(o.id)::int as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status = '완료' ${dateFilter}
      GROUP BY c.id, c.name, c.customer_code
      ORDER BY total_sales DESC
    `, ...params);

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 월별 매출 현황
router.get('/sales/monthly', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { year } = req.query;
  const targetYear = year || String(new Date().getFullYear());

  try {
    const report = await prisma.$queryRawUnsafe(`
      SELECT
        TO_CHAR(order_date, 'YYYY-MM') as month,
        COUNT(*)::int as order_count,
        SUM(total_amount) as total_sales
      FROM orders
      WHERE status = '완료' AND TO_CHAR(order_date, 'YYYY') = $1
      GROUP BY TO_CHAR(order_date, 'YYYY-MM')
      ORDER BY month
    `, String(targetYear));

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 재고 현황 리포트
router.get('/inventory/status', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const products = await prisma.product.findMany({
      include: { inventory: true },
      orderBy: { id: 'asc' },
    });

    const report = products.map(p => ({
      product_id: p.id,
      product_code: p.productCode,
      product_name: p.name,
      unit: p.unit,
      price: p.price,
      current_stock: p.inventory?.quantity ?? 0,
      stock_value: (p.inventory?.quantity ?? 0) * p.price,
      location: p.inventory?.location ?? null,
    }));

    report.sort((a, b) => a.current_stock - b.current_stock);

    const summary = {
      total_products: report.length,
      total_stock_value: report.reduce((sum, r) => sum + (r.stock_value || 0), 0),
      low_stock_count: report.filter(r => r.current_stock <= 10).length,
      out_of_stock_count: report.filter(r => r.current_stock === 0).length,
    };

    res.json({ items: report, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 재고 변동 이력 리포트
router.get('/inventory/history', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { start_date, end_date, product_id, change_type } = req.query;

  try {
    let dateFilter = '';
    let productFilter = '';
    let typeFilter = '';
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      dateFilter += ` AND h.created_at::date >= $${paramIdx}::date`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      dateFilter += ` AND h.created_at::date <= $${paramIdx}::date`;
      params.push(end_date);
      paramIdx++;
    }
    if (product_id) {
      productFilter = ` AND h.product_id = $${paramIdx}`;
      params.push(parseInt(product_id));
      paramIdx++;
    }
    if (change_type) {
      typeFilter = ` AND h.change_type = $${paramIdx}`;
      params.push(change_type);
      paramIdx++;
    }

    const history = await prisma.$queryRawUnsafe(`
      SELECT
        h.*,
        p.product_code,
        p.name as product_name
      FROM inventory_history h
      JOIN products p ON h.product_id = p.id
      WHERE 1=1 ${dateFilter}${productFilter}${typeFilter}
      ORDER BY h.created_at DESC
      LIMIT 500
    `, ...params);

    res.json(history.map(h => ({
      id: h.id,
      product_id: h.product_id,
      change_type: h.change_type,
      quantity: h.quantity,
      reason: h.reason,
      created_at: h.created_at,
      product_code: h.product_code,
      product_name: h.product_name,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
