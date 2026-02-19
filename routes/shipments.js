const express = require('express');
const router = express.Router();

// 출하번호 생성 함수
async function generateShipmentNumber(prisma) {
  const prefixSetting = await prisma.setting.findUnique({ where: { key: 'shipment_prefix' } });
  const prefix = prefixSetting?.value || 'SHP';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.shipment.count({
    where: { shipmentNumber: { startsWith: `${prefix}${today}` } },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${today}${seq}`;
}

// 출하 목록 조회
router.get('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { status, order_id } = req.query;

  try {
    const where = {};
    if (status) where.status = status;
    if (order_id) where.orderId = parseInt(order_id);

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        order: {
          select: { orderNumber: true, customer: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(shipments.map(s => ({
      id: s.id,
      shipment_number: s.shipmentNumber,
      order_id: s.orderId,
      shipment_date: s.shipmentDate,
      status: s.status,
      created_at: s.createdAt,
      order_number: s.order?.orderNumber ?? null,
      customer_name: s.order?.customer?.name ?? null,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 상세 조회
router.get('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        order: {
          select: {
            orderNumber: true,
            dueDate: true,
            customer: { select: { name: true, contact: true, address: true } },
          },
        },
        items: {
          include: { product: { select: { productCode: true, name: true, unit: true } } },
        },
      },
    });

    if (!shipment) {
      return res.status(404).json({ error: '출하 정보를 찾을 수 없습니다.' });
    }

    res.json({
      id: shipment.id,
      shipment_number: shipment.shipmentNumber,
      order_id: shipment.orderId,
      shipment_date: shipment.shipmentDate,
      status: shipment.status,
      created_at: shipment.createdAt,
      order_number: shipment.order?.orderNumber ?? null,
      due_date: shipment.order?.dueDate ?? null,
      customer_name: shipment.order?.customer?.name ?? null,
      contact: shipment.order?.customer?.contact ?? null,
      address: shipment.order?.customer?.address ?? null,
      items: shipment.items.map(i => ({
        id: i.id,
        shipment_id: i.shipmentId,
        product_id: i.productId,
        quantity: i.quantity,
        product_code: i.product.productCode,
        product_name: i.product.name,
        unit: i.product.unit,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 등록
router.post('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { order_id, shipment_date, items } = req.body;

  if (!order_id || !items || items.length === 0) {
    return res.status(400).json({ error: '주문과 출하 품목은 필수입니다.' });
  }

  try {
    // 재고 확인
    for (const item of items) {
      const inventory = await prisma.inventory.findUnique({ where: { productId: item.product_id } });
      if (!inventory || inventory.quantity < item.quantity) {
        const product = await prisma.product.findUnique({ where: { id: item.product_id } });
        return res.status(400).json({ error: `${product?.name || '제품'} 재고가 부족합니다.` });
      }
    }

    const shipmentNumber = await generateShipmentNumber(prisma);

    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber,
        orderId: order_id,
        shipmentDate: shipment_date ? new Date(shipment_date) : new Date(),
        items: {
          create: items.map(item => ({
            productId: item.product_id,
            quantity: item.quantity,
          })),
        },
      },
    });

    res.status(201).json({
      id: shipment.id,
      shipment_number: shipmentNumber,
      message: '출하가 등록되었습니다.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 완료
router.patch('/:id/complete', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const shipmentId = parseInt(req.params.id);

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { items: true },
    });

    if (!shipment) {
      return res.status(404).json({ error: '출하 정보를 찾을 수 없습니다.' });
    }

    if (shipment.status === '완료') {
      return res.status(400).json({ error: '이미 완료된 출하입니다.' });
    }

    // 재고 확인
    for (const item of shipment.items) {
      const inventory = await prisma.inventory.findUnique({ where: { productId: item.productId } });
      if (!inventory || inventory.quantity < item.quantity) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        return res.status(400).json({ error: `${product?.name || '제품'} 재고가 부족합니다.` });
      }
    }

    await prisma.$transaction(async (tx) => {
      // 재고 차감 및 이력 기록
      for (const item of shipment.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { decrement: item.quantity }, updatedAt: new Date() },
        });

        await tx.inventoryHistory.create({
          data: {
            productId: item.productId,
            changeType: '출고',
            quantity: -item.quantity,
            reason: `출하 완료 (${shipment.shipmentNumber})`,
          },
        });
      }

      // 출하 상태 변경
      await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: '완료' },
      });

      // 주문의 모든 품목이 출하되었는지 확인
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: shipment.orderId },
      });

      const shippedItems = await tx.$queryRawUnsafe(`
        SELECT si.product_id, SUM(si.quantity)::int as shipped_qty
        FROM shipment_items si
        JOIN shipments s ON si.shipment_id = s.id
        WHERE s.order_id = $1 AND s.status = '완료'
        GROUP BY si.product_id
      `, shipment.orderId);

      const shippedMap = {};
      shippedItems.forEach(s => shippedMap[s.product_id] = s.shipped_qty);

      const allShipped = orderItems.every(oi => (shippedMap[oi.productId] || 0) >= oi.quantity);
      if (allShipped) {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: '완료' },
        });
      }
    });

    res.json({ message: '출하가 완료되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 취소
router.patch('/:id/cancel', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const shipment = await prisma.shipment.findUnique({ where: { id: parseInt(req.params.id) } });

    if (!shipment) {
      return res.status(404).json({ error: '출하 정보를 찾을 수 없습니다.' });
    }

    if (shipment.status === '완료') {
      return res.status(400).json({ error: '완료된 출하는 취소할 수 없습니다.' });
    }

    await prisma.shipment.update({
      where: { id: parseInt(req.params.id) },
      data: { status: '취소' },
    });

    res.json({ message: '출하가 취소되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 출하 삭제
router.delete('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const shipmentId = parseInt(req.params.id);

  try {
    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });

    if (!shipment) {
      return res.status(404).json({ error: '출하 정보를 찾을 수 없습니다.' });
    }

    if (shipment.status === '완료') {
      return res.status(400).json({ error: '완료된 출하는 삭제할 수 없습니다.' });
    }

    await prisma.shipment.delete({ where: { id: shipmentId } });
    res.json({ message: '출하가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
