const express = require('express');
const router = express.Router();

// 생산번호 생성 함수
async function generateProductionNumber(prisma) {
  const prefixSetting = await prisma.setting.findUnique({ where: { key: 'production_prefix' } });
  const prefix = prefixSetting?.value || 'PRD';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.production.count({
    where: { productionNumber: { startsWith: `${prefix}${today}` } },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${today}${seq}`;
}

// 생산 목록 조회
router.get('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { status, product_id } = req.query;

  try {
    const where = {};
    if (status) where.status = status;
    if (product_id) where.productId = parseInt(product_id);

    const productions = await prisma.production.findMany({
      where,
      include: {
        product: { select: { name: true, productCode: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(productions.map(p => ({
      id: p.id,
      production_number: p.productionNumber,
      order_id: p.orderId,
      product_id: p.productId,
      planned_qty: p.plannedQty,
      actual_qty: p.actualQty,
      defect_qty: p.defectQty,
      waste_qty: p.wasteQty,
      worker: p.worker,
      status: p.status,
      started_at: p.startedAt,
      completed_at: p.completedAt,
      created_at: p.createdAt,
      product_name: p.product.name,
      product_code: p.product.productCode,
      order_number: p.order?.orderNumber ?? null,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 상세 조회
router.get('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const production = await prisma.production.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        product: { select: { name: true, productCode: true, unit: true } },
        order: { select: { orderNumber: true } },
      },
    });

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    res.json({
      id: production.id,
      production_number: production.productionNumber,
      order_id: production.orderId,
      product_id: production.productId,
      planned_qty: production.plannedQty,
      actual_qty: production.actualQty,
      defect_qty: production.defectQty,
      waste_qty: production.wasteQty,
      worker: production.worker,
      status: production.status,
      started_at: production.startedAt,
      completed_at: production.completedAt,
      created_at: production.createdAt,
      product_name: production.product.name,
      product_code: production.product.productCode,
      unit: production.product.unit,
      order_number: production.order?.orderNumber ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 등록
router.post('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { product_id, order_id, planned_qty, worker } = req.body;

  if (!product_id || !planned_qty || planned_qty <= 0) {
    return res.status(400).json({ error: '제품과 계획 수량은 필수입니다.' });
  }

  try {
    const productionNumber = await generateProductionNumber(prisma);

    const production = await prisma.production.create({
      data: {
        productionNumber,
        productId: product_id,
        orderId: order_id || null,
        plannedQty: planned_qty,
        worker: worker || '',
      },
    });

    res.status(201).json({
      id: production.id,
      production_number: productionNumber,
      message: '생산이 등록되었습니다.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 시작
router.patch('/:id/start', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { worker } = req.body;
  const productionId = parseInt(req.params.id);

  try {
    const production = await prisma.production.findUnique({ where: { id: productionId } });

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '대기') {
      return res.status(400).json({ error: '대기 상태의 생산만 시작할 수 있습니다.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.production.update({
        where: { id: productionId },
        data: {
          status: '진행중',
          startedAt: new Date(),
          worker: worker || production.worker,
        },
      });

      // 연결된 주문 상태도 변경
      if (production.orderId) {
        await tx.order.updateMany({
          where: { id: production.orderId, status: '대기' },
          data: { status: '진행중' },
        });
      }
    });

    res.json({ message: '생산이 시작되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 완료
router.patch('/:id/complete', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { actual_qty, defect_qty, waste_qty } = req.body;
  const productionId = parseInt(req.params.id);

  if (actual_qty === undefined || actual_qty < 0) {
    return res.status(400).json({ error: '실제 생산 수량을 입력해주세요.' });
  }

  try {
    const production = await prisma.production.findUnique({ where: { id: productionId } });

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '진행중') {
      return res.status(400).json({ error: '진행중인 생산만 완료할 수 있습니다.' });
    }

    const goodQty = actual_qty - (defect_qty || 0) - (waste_qty || 0);

    await prisma.$transaction(async (tx) => {
      // 생산 완료 처리
      await tx.production.update({
        where: { id: productionId },
        data: {
          status: '완료',
          actualQty: actual_qty,
          defectQty: defect_qty || 0,
          wasteQty: waste_qty || 0,
          completedAt: new Date(),
        },
      });

      // 재고 증가 (양품만)
      if (goodQty > 0) {
        await tx.inventory.update({
          where: { productId: production.productId },
          data: { quantity: { increment: goodQty }, updatedAt: new Date() },
        });

        await tx.inventoryHistory.create({
          data: {
            productId: production.productId,
            changeType: '입고',
            quantity: goodQty,
            reason: `생산 완료 (${production.productionNumber})`,
          },
        });
      }
    });

    res.json({ message: '생산이 완료되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 중단
router.patch('/:id/stop', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const productionId = parseInt(req.params.id);

  try {
    const production = await prisma.production.findUnique({ where: { id: productionId } });

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '진행중' && production.status !== '대기') {
      return res.status(400).json({ error: '대기 또는 진행중인 생산만 중단할 수 있습니다.' });
    }

    await prisma.production.update({
      where: { id: productionId },
      data: { status: '중단' },
    });

    res.json({ message: '생산이 중단되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 수정
router.put('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { product_id, order_id, planned_qty, worker } = req.body;
  const productionId = parseInt(req.params.id);

  try {
    const production = await prisma.production.findUnique({ where: { id: productionId } });

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '대기') {
      return res.status(400).json({ error: '대기 상태의 생산만 수정할 수 있습니다.' });
    }

    await prisma.production.update({
      where: { id: productionId },
      data: {
        productId: product_id,
        orderId: order_id || null,
        plannedQty: planned_qty,
        worker: worker || '',
      },
    });

    res.json({ message: '생산이 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 생산 삭제
router.delete('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const productionId = parseInt(req.params.id);

  try {
    const production = await prisma.production.findUnique({ where: { id: productionId } });

    if (!production) {
      return res.status(404).json({ error: '생산 정보를 찾을 수 없습니다.' });
    }

    if (production.status !== '대기' && production.status !== '중단') {
      return res.status(400).json({ error: '대기 또는 중단 상태의 생산만 삭제할 수 있습니다.' });
    }

    await prisma.production.delete({ where: { id: productionId } });
    res.json({ message: '생산이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
