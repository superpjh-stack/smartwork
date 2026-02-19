const express = require('express');
const router = express.Router();

// 대시보드 요약 정보
router.get('/summary', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [productCount, customerCount, pendingOrders, activeProductions, todayShipments, lowStock] = await Promise.all([
      prisma.product.count(),
      prisma.customer.count(),
      prisma.order.count({ where: { status: { in: ['대기', '진행중'] } } }),
      prisma.production.count({ where: { status: '진행중' } }),
      prisma.shipment.count({
        where: {
          shipmentDate: { gte: today, lt: tomorrow },
          status: '대기',
        },
      }),
      prisma.inventory.count({ where: { quantity: { lte: 10 } } }),
    ]);

    res.json({
      products: productCount,
      customers: customerCount,
      pendingOrders,
      activeProductions,
      todayShipments,
      lowStock,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 최근 주문
router.get('/recent-orders', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const orders = await prisma.order.findMany({
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
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

// 최근 생산
router.get('/recent-productions', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const productions = await prisma.production.findMany({
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
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
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 재고 현황
router.get('/inventory-status', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: { select: { name: true, productCode: true } } },
      orderBy: { quantity: 'asc' },
      take: 10,
    });

    res.json(inventory.map(i => ({
      id: i.id,
      product_id: i.productId,
      quantity: i.quantity,
      location: i.location,
      updated_at: i.updatedAt,
      product_name: i.product.name,
      product_code: i.product.productCode,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
