const express = require('express');
const router = express.Router();

// 생산성 KPI 조회 (실시간 계산)
router.get('/productivity', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { start_date, end_date, product_id } = req.query;

    let dateFilter = '';
    let productFilter = '';
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      dateFilter += ` AND p.completed_at::date >= $${paramIdx}::date`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      dateFilter += ` AND p.completed_at::date <= $${paramIdx}::date`;
      params.push(end_date);
      paramIdx++;
    }
    if (product_id) {
      productFilter = ` AND p.product_id = $${paramIdx}`;
      params.push(parseInt(product_id));
      paramIdx++;
    }

    // 전체 요약
    const summaryResult = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(p.actual_qty), 0)::int as total_actual,
        COALESCE(SUM(p.planned_qty), 0)::int as total_planned,
        COUNT(*)::int as production_count,
        CASE WHEN COALESCE(SUM(p.planned_qty), 0) > 0
          THEN ROUND(SUM(p.actual_qty)::numeric / SUM(p.planned_qty)::numeric * 100, 1)
          ELSE 0 END as pi
      FROM productions p
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilter}${productFilter}
    `, ...params);

    const summary = summaryResult[0];
    summary.pi = Number(summary.pi);

    // 일별 집계
    const daily = await prisma.$queryRawUnsafe(`
      SELECT
        p.completed_at::date as date,
        COUNT(*)::int as production_count,
        SUM(p.actual_qty)::int as actual_qty,
        SUM(p.planned_qty)::int as planned_qty,
        CASE WHEN SUM(p.planned_qty) > 0
          THEN ROUND(SUM(p.actual_qty)::numeric / SUM(p.planned_qty)::numeric * 100, 1)
          ELSE 0 END as pi
      FROM productions p
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilter}${productFilter}
      GROUP BY p.completed_at::date
      ORDER BY date DESC
    `, ...params);

    daily.forEach(r => { r.pi = Number(r.pi); });

    // 제품별 집계
    const paramsBP = [];
    let paramIdxBP = 1;
    let dateFilterBP = '';
    let productFilterBP = '';
    if (start_date) {
      dateFilterBP += ` AND p.completed_at::date >= $${paramIdxBP}::date`;
      paramsBP.push(start_date);
      paramIdxBP++;
    }
    if (end_date) {
      dateFilterBP += ` AND p.completed_at::date <= $${paramIdxBP}::date`;
      paramsBP.push(end_date);
      paramIdxBP++;
    }
    if (product_id) {
      productFilterBP = ` AND p.product_id = $${paramIdxBP}`;
      paramsBP.push(parseInt(product_id));
      paramIdxBP++;
    }

    const byProduct = await prisma.$queryRawUnsafe(`
      SELECT
        p.product_id,
        pr.name as product_name,
        pr.product_code,
        COUNT(*)::int as production_count,
        SUM(p.actual_qty)::int as actual_qty,
        SUM(p.planned_qty)::int as planned_qty,
        CASE WHEN SUM(p.planned_qty) > 0
          THEN ROUND(SUM(p.actual_qty)::numeric / SUM(p.planned_qty)::numeric * 100, 1)
          ELSE 0 END as pi
      FROM productions p
      JOIN products pr ON p.product_id = pr.id
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilterBP}${productFilterBP}
      GROUP BY p.product_id, pr.name, pr.product_code
      ORDER BY pi DESC
    `, ...paramsBP);

    byProduct.forEach(r => { r.pi = Number(r.pi); });

    res.json({ summary, daily, byProduct });
  } catch (error) {
    console.error('KPI 생산성 조회 오류:', error);
    res.status(500).json({ error: '생산성 KPI 조회 중 오류가 발생했습니다.' });
  }
});

// 품질 KPI 조회 (실시간 계산)
router.get('/quality', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { start_date, end_date, product_id } = req.query;

    let dateFilter = '';
    let productFilter = '';
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      dateFilter += ` AND p.completed_at::date >= $${paramIdx}::date`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      dateFilter += ` AND p.completed_at::date <= $${paramIdx}::date`;
      params.push(end_date);
      paramIdx++;
    }
    if (product_id) {
      productFilter = ` AND p.product_id = $${paramIdx}`;
      params.push(parseInt(product_id));
      paramIdx++;
    }

    // 전체 요약
    const summaryResult = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(p.actual_qty), 0)::int as total_actual,
        COALESCE(SUM(p.defect_qty), 0)::int as total_defect,
        COALESCE(SUM(p.waste_qty), 0)::int as total_waste,
        COUNT(*)::int as production_count,
        CASE WHEN COALESCE(SUM(p.actual_qty), 0) > 0
          THEN ROUND((SUM(p.actual_qty) - SUM(p.defect_qty))::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as qi,
        CASE WHEN COALESCE(SUM(p.actual_qty), 0) > 0
          THEN ROUND((SUM(p.actual_qty) - SUM(p.defect_qty) - SUM(p.waste_qty))::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as yield_rate,
        CASE WHEN COALESCE(SUM(p.actual_qty), 0) > 0
          THEN ROUND(SUM(p.defect_qty)::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as defect_rate,
        CASE WHEN COALESCE(SUM(p.actual_qty), 0) > 0
          THEN ROUND(SUM(p.waste_qty)::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as waste_rate
      FROM productions p
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilter}${productFilter}
    `, ...params);

    const summary = summaryResult[0];
    summary.qi = Number(summary.qi);
    summary.yield_rate = Number(summary.yield_rate);
    summary.defect_rate = Number(summary.defect_rate);
    summary.waste_rate = Number(summary.waste_rate);

    // 일별 집계
    const daily = await prisma.$queryRawUnsafe(`
      SELECT
        p.completed_at::date as date,
        COUNT(*)::int as production_count,
        SUM(p.actual_qty)::int as actual_qty,
        SUM(p.defect_qty)::int as defect_qty,
        SUM(p.waste_qty)::int as waste_qty,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND((SUM(p.actual_qty) - SUM(p.defect_qty))::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as qi,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND((SUM(p.actual_qty) - SUM(p.defect_qty) - SUM(p.waste_qty))::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as yield_rate,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(SUM(p.defect_qty)::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as defect_rate,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(SUM(p.waste_qty)::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as waste_rate
      FROM productions p
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilter}${productFilter}
      GROUP BY p.completed_at::date
      ORDER BY date DESC
    `, ...params);

    daily.forEach(r => {
      r.qi = Number(r.qi);
      r.yield_rate = Number(r.yield_rate);
      r.defect_rate = Number(r.defect_rate);
      r.waste_rate = Number(r.waste_rate);
    });

    // 제품별 집계
    const paramsBP = [];
    let paramIdxBP = 1;
    let dateFilterBP = '';
    let productFilterBP = '';
    if (start_date) {
      dateFilterBP += ` AND p.completed_at::date >= $${paramIdxBP}::date`;
      paramsBP.push(start_date);
      paramIdxBP++;
    }
    if (end_date) {
      dateFilterBP += ` AND p.completed_at::date <= $${paramIdxBP}::date`;
      paramsBP.push(end_date);
      paramIdxBP++;
    }
    if (product_id) {
      productFilterBP = ` AND p.product_id = $${paramIdxBP}`;
      paramsBP.push(parseInt(product_id));
      paramIdxBP++;
    }

    const byProduct = await prisma.$queryRawUnsafe(`
      SELECT
        p.product_id,
        pr.name as product_name,
        pr.product_code,
        COUNT(*)::int as production_count,
        SUM(p.actual_qty)::int as actual_qty,
        SUM(p.defect_qty)::int as defect_qty,
        SUM(p.waste_qty)::int as waste_qty,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND((SUM(p.actual_qty) - SUM(p.defect_qty))::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as qi,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND((SUM(p.actual_qty) - SUM(p.defect_qty) - SUM(p.waste_qty))::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as yield_rate,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(SUM(p.defect_qty)::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as defect_rate,
        CASE WHEN SUM(p.actual_qty) > 0
          THEN ROUND(SUM(p.waste_qty)::numeric / SUM(p.actual_qty)::numeric * 100, 1)
          ELSE 0 END as waste_rate
      FROM productions p
      JOIN products pr ON p.product_id = pr.id
      WHERE p.status = '완료' AND p.completed_at IS NOT NULL
        ${dateFilterBP}${productFilterBP}
      GROUP BY p.product_id, pr.name, pr.product_code
      ORDER BY qi DESC
    `, ...paramsBP);

    byProduct.forEach(r => {
      r.qi = Number(r.qi);
      r.yield_rate = Number(r.yield_rate);
      r.defect_rate = Number(r.defect_rate);
      r.waste_rate = Number(r.waste_rate);
    });

    res.json({ summary, daily, byProduct });
  } catch (error) {
    console.error('KPI 품질 조회 오류:', error);
    res.status(500).json({ error: '품질 KPI 조회 중 오류가 발생했습니다.' });
  }
});

// KPI 임계치 설정 조회
router.get('/settings', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const settings = await prisma.setting.findMany({
      where: { key: { startsWith: 'kpi_' } },
    });
    const result = {};
    settings.forEach(s => { result[s.key] = parseFloat(s.value); });
    res.json(result);
  } catch (error) {
    console.error('KPI 설정 조회 오류:', error);
    res.status(500).json({ error: 'KPI 설정 조회 중 오류가 발생했습니다.' });
  }
});

// KPI 임계치 설정 저장
router.put('/settings', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const data = req.body;

    const entries = Object.entries(data).filter(([key]) => key.startsWith('kpi_'));
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    res.json({ message: 'KPI 설정이 저장되었습니다.' });
  } catch (error) {
    console.error('KPI 설정 저장 오류:', error);
    res.status(500).json({ error: 'KPI 설정 저장 중 오류가 발생했습니다.' });
  }
});

// KPI 일별 스냅샷 생성
router.post('/snapshot', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const productData = await prisma.$queryRawUnsafe(`
      SELECT
        p.product_id,
        COUNT(*)::int as production_count,
        SUM(p.actual_qty)::int as actual_qty,
        SUM(p.planned_qty)::int as planned_qty,
        SUM(p.defect_qty)::int as defect_qty,
        SUM(p.waste_qty)::int as waste_qty
      FROM productions p
      WHERE p.status = '완료' AND p.completed_at::date = $1::date
      GROUP BY p.product_id
    `, targetDate);

    if (productData.length === 0) {
      return res.json({ message: '해당 날짜에 완료된 생산 데이터가 없습니다.', count: 0 });
    }

    const targetDateObj = new Date(targetDate + 'T00:00:00.000Z');

    await prisma.$transaction(async (tx) => {
      for (const row of productData) {
        const pi = row.planned_qty > 0 ? Math.round(row.actual_qty / row.planned_qty * 1000) / 10 : 0;
        const qi = row.actual_qty > 0 ? Math.round((row.actual_qty - row.defect_qty) / row.actual_qty * 1000) / 10 : 0;
        const yieldRate = row.actual_qty > 0 ? Math.round((row.actual_qty - row.defect_qty - row.waste_qty) / row.actual_qty * 1000) / 10 : 0;
        const defectRate = row.actual_qty > 0 ? Math.round(row.defect_qty / row.actual_qty * 1000) / 10 : 0;
        const wasteRate = row.actual_qty > 0 ? Math.round(row.waste_qty / row.actual_qty * 1000) / 10 : 0;

        // company_id NULL + product_id의 composite unique → delete + insert
        await tx.kpiDaily.deleteMany({
          where: { date: targetDateObj, companyId: null, productId: row.product_id },
        });

        await tx.kpiDaily.create({
          data: {
            date: targetDateObj,
            companyId: null,
            productId: row.product_id,
            pi, qi, yieldRate, defectRate, wasteRate,
            actualQty: row.actual_qty,
            plannedQty: row.planned_qty,
            defectQty: row.defect_qty,
            wasteQty: row.waste_qty,
            productionCount: row.production_count,
          },
        });
      }
    });

    res.json({ message: `${targetDate} 스냅샷이 생성되었습니다.`, count: productData.length });
  } catch (error) {
    console.error('KPI 스냅샷 생성 오류:', error);
    res.status(500).json({ error: 'KPI 스냅샷 생성 중 오류가 발생했습니다.' });
  }
});

// KPI 스냅샷 이력 조회
router.get('/snapshots', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { start_date, end_date, product_id } = req.query;

    let dateFilter = '';
    let productFilter = '';
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      dateFilter += ` AND k.date >= $${paramIdx}::date`;
      params.push(start_date);
      paramIdx++;
    }
    if (end_date) {
      dateFilter += ` AND k.date <= $${paramIdx}::date`;
      params.push(end_date);
      paramIdx++;
    }
    if (product_id) {
      productFilter = ` AND k.product_id = $${paramIdx}`;
      params.push(parseInt(product_id));
      paramIdx++;
    }

    const snapshots = await prisma.$queryRawUnsafe(`
      SELECT k.*, pr.name as product_name, pr.product_code
      FROM kpi_daily k
      LEFT JOIN products pr ON k.product_id = pr.id
      WHERE 1=1 ${dateFilter}${productFilter}
      ORDER BY k.date DESC, pr.name
    `, ...params);

    res.json(snapshots.map(s => ({
      id: s.id,
      date: s.date,
      company_id: s.company_id,
      product_id: s.product_id,
      pi: Number(s.pi),
      qi: Number(s.qi),
      yield_rate: Number(s.yield_rate),
      defect_rate: Number(s.defect_rate),
      waste_rate: Number(s.waste_rate),
      actual_qty: s.actual_qty,
      planned_qty: s.planned_qty,
      defect_qty: s.defect_qty,
      waste_qty: s.waste_qty,
      production_count: s.production_count,
      created_at: s.created_at,
      product_name: s.product_name,
      product_code: s.product_code,
    })));
  } catch (error) {
    console.error('KPI 스냅샷 조회 오류:', error);
    res.status(500).json({ error: 'KPI 스냅샷 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
