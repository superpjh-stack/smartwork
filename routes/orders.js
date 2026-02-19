const express = require('express');
const router = express.Router();

// 주문번호 생성 함수
async function generateOrderNumber(prisma) {
  const prefixSetting = await prisma.setting.findUnique({ where: { key: 'order_prefix' } });
  const prefix = prefixSetting?.value || 'ORD';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.order.count({
    where: { orderNumber: { startsWith: `${prefix}${today}` } },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${today}${seq}`;
}

// 주문 목록 조회
router.get('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { status, customer_id } = req.query;

  try {
    const where = {};
    if (status) where.status = status;
    if (customer_id) where.customerId = parseInt(customer_id);

    const orders = await prisma.order.findMany({
      where,
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders.map(o => ({
      id: o.id,
      order_number: o.orderNumber,
      customer_id: o.customerId,
      order_date: o.orderDate,
      due_date: o.dueDate,
      status: o.status,
      total_amount: o.totalAmount,
      created_at: o.createdAt,
      customer_name: o.customer?.name ?? null,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 주문 상세 조회
router.get('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        customer: { select: { name: true, contact: true, address: true } },
        items: {
          include: { product: { select: { productCode: true, name: true, unit: true } } },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    res.json({
      id: order.id,
      order_number: order.orderNumber,
      customer_id: order.customerId,
      order_date: order.orderDate,
      due_date: order.dueDate,
      status: order.status,
      total_amount: order.totalAmount,
      created_at: order.createdAt,
      customer_name: order.customer?.name ?? null,
      contact: order.customer?.contact ?? null,
      address: order.customer?.address ?? null,
      items: order.items.map(i => ({
        id: i.id,
        order_id: i.orderId,
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        product_code: i.product.productCode,
        product_name: i.product.name,
        unit: i.product.unit,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 주문 등록
router.post('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { customer_id, due_date, items } = req.body;

  if (!customer_id || !items || items.length === 0) {
    return res.status(400).json({ error: '거래처와 주문 품목은 필수입니다.' });
  }

  try {
    const orderNumber = await generateOrderNumber(prisma);
    let totalAmount = 0;
    items.forEach(item => {
      totalAmount += item.quantity * item.unit_price;
    });

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer_id,
        dueDate: due_date ? new Date(due_date) : null,
        totalAmount,
        items: {
          create: items.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
          })),
        },
      },
    });

    res.status(201).json({
      id: order.id,
      order_number: orderNumber,
      message: '주문이 등록되었습니다.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 주문 수정
router.put('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { customer_id, due_date, items } = req.body;
  const orderId = parseInt(req.params.id);

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    if (order.status !== '대기') {
      return res.status(400).json({ error: '대기 상태의 주문만 수정할 수 있습니다.' });
    }

    let totalAmount = 0;
    if (items) {
      items.forEach(item => {
        totalAmount += item.quantity * item.unit_price;
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          customerId: customer_id,
          dueDate: due_date ? new Date(due_date) : null,
          totalAmount,
        },
      });

      if (items) {
        await tx.orderItem.deleteMany({ where: { orderId } });
        await tx.orderItem.createMany({
          data: items.map(item => ({
            orderId,
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
          })),
        });
      }
    });

    res.json({ message: '주문이 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 주문 상태 변경
router.patch('/:id/status', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { status } = req.body;
  const validStatuses = ['대기', '진행중', '완료', '취소'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  }

  try {
    await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
    });

    res.json({ message: '상태가 변경되었습니다.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 주문 삭제
router.delete('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const orderId = parseInt(req.params.id);

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }

    if (order.status !== '대기' && order.status !== '취소') {
      return res.status(400).json({ error: '대기 또는 취소 상태의 주문만 삭제할 수 있습니다.' });
    }

    await prisma.order.delete({ where: { id: orderId } });
    res.json({ message: '주문이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
