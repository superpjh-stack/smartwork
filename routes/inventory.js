const express = require('express');
const router = express.Router();

// 전체 재고 이력 조회 (/:product_id/history보다 먼저 정의)
router.get('/history/all', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const history = await prisma.inventoryHistory.findMany({
      include: { product: { select: { name: true, productCode: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(history.map(h => ({
      id: h.id,
      product_id: h.productId,
      change_type: h.changeType,
      quantity: h.quantity,
      reason: h.reason,
      created_at: h.createdAt,
      product_name: h.product.name,
      product_code: h.product.productCode,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 재고 목록 조회
router.get('/', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: { select: { productCode: true, name: true, unit: true } } },
      orderBy: { product: { name: 'asc' } },
    });

    res.json(inventory.map(i => ({
      id: i.id,
      product_id: i.productId,
      quantity: i.quantity,
      location: i.location,
      updated_at: i.updatedAt,
      product_code: i.product.productCode,
      product_name: i.product.name,
      unit: i.product.unit,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 재고 상세 조회
router.get('/:product_id', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const inventory = await prisma.inventory.findUnique({
      where: { productId: parseInt(req.params.product_id) },
      include: { product: { select: { productCode: true, name: true, unit: true } } },
    });

    if (!inventory) {
      return res.status(404).json({ error: '재고 정보를 찾을 수 없습니다.' });
    }

    res.json({
      id: inventory.id,
      product_id: inventory.productId,
      quantity: inventory.quantity,
      location: inventory.location,
      updated_at: inventory.updatedAt,
      product_code: inventory.product.productCode,
      product_name: inventory.product.name,
      unit: inventory.product.unit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 재고 입고
router.post('/receive', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { product_id, quantity, reason } = req.body;

  if (!product_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: '제품과 수량을 확인해주세요.' });
  }

  try {
    await prisma.$transaction([
      prisma.inventory.update({
        where: { productId: product_id },
        data: { quantity: { increment: quantity }, updatedAt: new Date() },
      }),
      prisma.inventoryHistory.create({
        data: { productId: product_id, changeType: '입고', quantity, reason: reason || '' },
      }),
    ]);

    res.json({ message: '입고 처리되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 재고 출고/사용
router.post('/use', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { product_id, quantity, reason, change_type } = req.body;

  if (!product_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: '제품과 수량을 확인해주세요.' });
  }

  try {
    // 현재 재고 확인
    const current = await prisma.inventory.findUnique({ where: { productId: product_id } });
    if (!current || current.quantity < quantity) {
      return res.status(400).json({ error: '재고가 부족합니다.' });
    }

    await prisma.$transaction([
      prisma.inventory.update({
        where: { productId: product_id },
        data: { quantity: { decrement: quantity }, updatedAt: new Date() },
      }),
      prisma.inventoryHistory.create({
        data: { productId: product_id, changeType: change_type || '사용', quantity: -quantity, reason: reason || '' },
      }),
    ]);

    res.json({ message: '출고 처리되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 재고 조정
router.post('/adjust', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { product_id, quantity, reason } = req.body;

  if (!product_id || quantity === undefined) {
    return res.status(400).json({ error: '제품과 조정 수량을 확인해주세요.' });
  }

  try {
    const current = await prisma.inventory.findUnique({ where: { productId: product_id } });
    const diff = quantity - (current ? current.quantity : 0);

    await prisma.$transaction([
      prisma.inventory.update({
        where: { productId: product_id },
        data: { quantity, updatedAt: new Date() },
      }),
      prisma.inventoryHistory.create({
        data: { productId: product_id, changeType: '조정', quantity: diff, reason: reason || '재고 조정' },
      }),
    ]);

    res.json({ message: '재고가 조정되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 위치 수정
router.put('/:product_id/location', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { location } = req.body;

  try {
    await prisma.inventory.update({
      where: { productId: parseInt(req.params.product_id) },
      data: { location, updatedAt: new Date() },
    });

    res.json({ message: '위치가 수정되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 재고 이력 조회
router.get('/:product_id/history', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const productId = parseInt(req.params.product_id);

  try {
    const history = await prisma.inventoryHistory.findMany({
      where: { productId },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(history.map(h => ({
      id: h.id,
      product_id: h.productId,
      change_type: h.changeType,
      quantity: h.quantity,
      reason: h.reason,
      created_at: h.createdAt,
      product_name: h.product.name,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
