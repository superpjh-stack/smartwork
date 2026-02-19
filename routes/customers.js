const express = require('express');
const router = express.Router();

// 거래처 목록 조회
router.get('/', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(customers.map(c => ({
      id: c.id,
      customer_code: c.customerCode,
      name: c.name,
      contact: c.contact,
      address: c.address,
      created_at: c.createdAt,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 거래처 상세 조회
router.get('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!customer) {
      return res.status(404).json({ error: '거래처를 찾을 수 없습니다.' });
    }

    // 거래처의 주문 이력
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { orderDate: 'desc' },
      take: 10,
    });

    res.json({
      id: customer.id,
      customer_code: customer.customerCode,
      name: customer.name,
      contact: customer.contact,
      address: customer.address,
      created_at: customer.createdAt,
      orders: orders.map(o => ({
        id: o.id,
        order_number: o.orderNumber,
        customer_id: o.customerId,
        order_date: o.orderDate,
        due_date: o.dueDate,
        status: o.status,
        total_amount: o.totalAmount,
        created_at: o.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 거래처 등록
router.post('/', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { customer_code, name, contact, address } = req.body;

  if (!customer_code || !name) {
    return res.status(400).json({ error: '거래처코드와 거래처명은 필수입니다.' });
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        customerCode: customer_code,
        name,
        contact: contact || '',
        address: address || '',
      },
    });

    res.status(201).json({
      id: customer.id,
      message: '거래처가 등록되었습니다.',
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '이미 존재하는 거래처코드입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 거래처 수정
router.put('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const { customer_code, name, contact, address } = req.body;

  try {
    await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: { customerCode: customer_code, name, contact, address },
    });

    res.json({ message: '거래처가 수정되었습니다.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '거래처를 찾을 수 없습니다.' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '이미 존재하는 거래처코드입니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 거래처 삭제
router.delete('/:id', async (req, res) => {
  const prisma = req.app.locals.prisma;
  const id = parseInt(req.params.id);

  try {
    // 연결된 주문이 있는지 확인
    const orderCount = await prisma.order.count({ where: { customerId: id } });
    if (orderCount > 0) {
      return res.status(400).json({ error: '해당 거래처에 연결된 주문이 있어 삭제할 수 없습니다.' });
    }

    await prisma.customer.delete({ where: { id } });
    res.json({ message: '거래처가 삭제되었습니다.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '거래처를 찾을 수 없습니다.' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
