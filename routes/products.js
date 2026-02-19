const express = require('express');
const router = express.Router();

// 제품 목록 조회
router.get('/', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const products = await prisma.product.findMany({
      include: { inventory: { select: { quantity: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const result = products.map(p => ({
      id: p.id,
      product_code: p.productCode,
      name: p.name,
      unit: p.unit,
      price: p.price,
      created_at: p.createdAt,
      stock_quantity: p.inventory?.quantity ?? 0,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 제품 상세 조회
router.get('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { inventory: true },
    });

    if (!product) {
      return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
    }

    res.json({
      id: product.id,
      product_code: product.productCode,
      name: product.name,
      unit: product.unit,
      price: product.price,
      created_at: product.createdAt,
      stock_quantity: product.inventory?.quantity ?? 0,
      location: product.inventory?.location ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 제품 등록
router.post('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { product_code, name, unit, price } = req.body;

  if (!product_code || !name) {
    return res.status(400).json({ error: '제품코드와 제품명은 필수입니다.' });
  }

  try {
    const product = await prisma.product.create({
      data: {
        productCode: product_code,
        name,
        unit: unit || '개',
        price: price || 0,
        inventory: { create: { quantity: 0 } },
      },
    });

    res.status(201).json({
      id: product.id,
      message: '제품이 등록되었습니다.',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '이미 존재하는 제품코드입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 제품 수정
router.put('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { product_code, name, unit, price } = req.body;

  try {
    await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { productCode: product_code, name, unit, price },
    });

    res.json({ message: '제품이 수정되었습니다.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '이미 존재하는 제품코드입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 제품 삭제
router.delete('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: '제품이 삭제되었습니다.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '제품을 찾을 수 없습니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
