const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
  return salt + ':' + hash;
}

async function main() {
  console.log('기본 설정 삽입 중...');

  // 기본 설정
  const defaultSettings = [
    ['company_name', '스마트공방'],
    ['order_prefix', 'ORD'],
    ['production_prefix', 'PRD'],
    ['shipment_prefix', 'SHP'],
    ['kpi_pi_target', '95'],
    ['kpi_pi_warning', '85'],
    ['kpi_pi_danger', '70'],
    ['kpi_qi_target', '98'],
    ['kpi_qi_warning', '95'],
    ['kpi_qi_danger', '90'],
    ['kpi_yield_target', '95'],
    ['kpi_yield_warning', '90'],
    ['kpi_yield_danger', '80'],
    ['kpi_defect_target', '2'],
    ['kpi_defect_warning', '5'],
    ['kpi_defect_danger', '10'],
    ['kpi_waste_target', '3'],
    ['kpi_waste_warning', '5'],
    ['kpi_waste_danger', '10'],
    ['kpi_external_enabled', 'false'],
    ['kpi_external_api_url', ''],
    ['kpi_external_api_key', ''],
    ['kpi_external_company_code', ''],
    ['kpi_external_auto_enabled', 'false'],
    ['kpi_external_schedule', '0 6 * * *'],
    ['kpi_external_max_retry', '3'],
    ['kpi_external_timeout', '30000'],
  ];

  for (const [key, value] of defaultSettings) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  // 기본 회사 및 사용자
  const companyCount = await prisma.company.count();
  if (companyCount === 0) {
    console.log('기본 회사/사용자 데이터 삽입 중...');

    const company = await prisma.company.create({
      data: {
        companyCode: 'COM001',
        name: '스마트공방',
        contact: '02-000-0000',
        address: '서울시 강남구',
      },
    });

    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: hashPassword('admin1234'),
        name: '전체관리자',
        role: 'super_admin',
        companyId: company.id,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        username: 'user1',
        passwordHash: hashPassword('user1234'),
        name: '회사관리자',
        role: 'company_admin',
        companyId: company.id,
        isActive: true,
      },
    });

    console.log('기본 회사/사용자 데이터 삽입 완료');
  }

  // 샘플 데이터
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    console.log('샘플 데이터 삽입 중...');

    // 샘플 제품
    const productsData = [
      ['P001', '스마트 센서 A형', 'EA', 50000],
      ['P002', '스마트 센서 B형', 'EA', 75000],
      ['P003', '컨트롤러 유닛', 'SET', 150000],
      ['P004', '전원 모듈 12V', 'EA', 30000],
      ['P005', '전원 모듈 24V', 'EA', 35000],
      ['P006', '통신 모듈 RS485', 'EA', 45000],
      ['P007', '통신 모듈 이더넷', 'EA', 65000],
      ['P008', 'LED 디스플레이', 'EA', 25000],
      ['P009', '알루미늄 케이스 소형', 'EA', 15000],
      ['P010', '알루미늄 케이스 대형', 'EA', 28000],
    ];

    const products = [];
    for (const [code, name, unit, price] of productsData) {
      const p = await prisma.product.create({
        data: { productCode: code, name, unit, price },
      });
      products.push(p);
    }

    // 재고 초기화
    const inventoryData = [
      [products[0].id, 150, 'A-1-1'],
      [products[1].id, 80, 'A-1-2'],
      [products[2].id, 45, 'A-2-1'],
      [products[3].id, 200, 'B-1-1'],
      [products[4].id, 180, 'B-1-2'],
      [products[5].id, 120, 'B-2-1'],
      [products[6].id, 90, 'B-2-2'],
      [products[7].id, 250, 'C-1-1'],
      [products[8].id, 300, 'C-2-1'],
      [products[9].id, 8, 'C-2-2'],
    ];

    for (const [productId, quantity, location] of inventoryData) {
      await prisma.inventory.create({ data: { productId, quantity, location } });
    }

    // 재고 이력
    for (const p of products) {
      await prisma.inventoryHistory.create({
        data: { productId: p.id, changeType: '입고', quantity: 100, reason: '초기 재고 입고' },
      });
    }
    await prisma.inventoryHistory.create({
      data: { productId: products[0].id, changeType: '입고', quantity: 50, reason: '추가 발주 입고' },
    });
    await prisma.inventoryHistory.create({
      data: { productId: products[9].id, changeType: '사용', quantity: -92, reason: '생산 사용' },
    });

    // 샘플 거래처
    const customersData = [
      ['C001', '(주)테크솔루션', '02-1234-5678', '서울시 강남구 테헤란로 123'],
      ['C002', '스마트팩토리(주)', '031-987-6543', '경기도 성남시 분당구 판교로 456'],
      ['C003', '자동화시스템', '032-555-1234', '인천시 연수구 송도동 789'],
      ['C004', '(주)디지털웍스', '02-333-4444', '서울시 금천구 가산디지털로 100'],
      ['C005', '코리아센서', '031-777-8888', '경기도 안양시 동안구 시민대로 200'],
    ];

    const customers = [];
    for (const [code, name, contact, address] of customersData) {
      const c = await prisma.customer.create({
        data: { customerCode: code, name, contact, address },
      });
      customers.push(c);
    }

    // 샘플 주문
    // 주문 1 - 완료
    const order1 = await prisma.order.create({
      data: {
        orderNumber: 'ORD20260201001',
        customerId: customers[0].id,
        orderDate: new Date('2026-02-01'),
        dueDate: new Date('2026-02-05'),
        status: '완료',
        totalAmount: 1500000,
        items: {
          create: [
            { productId: products[0].id, quantity: 10, unitPrice: 50000 },
            { productId: products[2].id, quantity: 5, unitPrice: 150000 },
            { productId: products[7].id, quantity: 10, unitPrice: 25000 },
          ],
        },
      },
    });

    // 주문 2 - 진행중
    const order2 = await prisma.order.create({
      data: {
        orderNumber: 'ORD20260205001',
        customerId: customers[1].id,
        orderDate: new Date('2026-02-05'),
        dueDate: new Date('2026-02-12'),
        status: '진행중',
        totalAmount: 2250000,
        items: {
          create: [
            { productId: products[1].id, quantity: 20, unitPrice: 75000 },
            { productId: products[5].id, quantity: 10, unitPrice: 45000 },
            { productId: products[6].id, quantity: 5, unitPrice: 65000 },
          ],
        },
      },
    });

    // 주문 3 - 대기
    const order3 = await prisma.order.create({
      data: {
        orderNumber: 'ORD20260208001',
        customerId: customers[2].id,
        orderDate: new Date('2026-02-08'),
        dueDate: new Date('2026-02-15'),
        status: '대기',
        totalAmount: 875000,
        items: {
          create: [
            { productId: products[3].id, quantity: 15, unitPrice: 30000 },
            { productId: products[4].id, quantity: 10, unitPrice: 35000 },
            { productId: products[8].id, quantity: 5, unitPrice: 15000 },
          ],
        },
      },
    });

    // 주문 4 - 대기
    const order4 = await prisma.order.create({
      data: {
        orderNumber: 'ORD20260209001',
        customerId: customers[3].id,
        orderDate: new Date('2026-02-09'),
        dueDate: new Date('2026-02-20'),
        status: '대기',
        totalAmount: 1950000,
        items: {
          create: [
            { productId: products[0].id, quantity: 15, unitPrice: 50000 },
            { productId: products[1].id, quantity: 10, unitPrice: 75000 },
            { productId: products[2].id, quantity: 3, unitPrice: 150000 },
          ],
        },
      },
    });

    // 주문 5 - 완료
    const order5 = await prisma.order.create({
      data: {
        orderNumber: 'ORD20260130001',
        customerId: customers[4].id,
        orderDate: new Date('2026-01-30'),
        dueDate: new Date('2026-02-03'),
        status: '완료',
        totalAmount: 640000,
        items: {
          create: [
            { productId: products[7].id, quantity: 20, unitPrice: 25000 },
            { productId: products[8].id, quantity: 8, unitPrice: 15000 },
            { productId: products[9].id, quantity: 1, unitPrice: 28000 },
          ],
        },
      },
    });

    // 샘플 생산
    // 생산 완료
    await prisma.production.create({
      data: {
        productionNumber: 'PRD20260201001',
        orderId: order1.id,
        productId: products[0].id,
        plannedQty: 10, actualQty: 10, defectQty: 0, wasteQty: 0,
        worker: '김철수', status: '완료',
        startedAt: new Date('2026-02-01T09:00:00'), completedAt: new Date('2026-02-01T17:00:00'),
      },
    });
    await prisma.production.create({
      data: {
        productionNumber: 'PRD20260202001',
        orderId: order1.id,
        productId: products[2].id,
        plannedQty: 5, actualQty: 5, defectQty: 0, wasteQty: 0,
        worker: '이영희', status: '완료',
        startedAt: new Date('2026-02-02T09:00:00'), completedAt: new Date('2026-02-02T16:00:00'),
      },
    });
    await prisma.production.create({
      data: {
        productionNumber: 'PRD20260130001',
        orderId: order5.id,
        productId: products[7].id,
        plannedQty: 20, actualQty: 22, defectQty: 2, wasteQty: 0,
        worker: '박민수', status: '완료',
        startedAt: new Date('2026-01-30T09:00:00'), completedAt: new Date('2026-01-30T18:00:00'),
      },
    });

    // 생산 진행중
    await prisma.production.create({
      data: {
        productionNumber: 'PRD20260208001',
        orderId: order2.id,
        productId: products[1].id,
        plannedQty: 20, actualQty: 0, defectQty: 0, wasteQty: 0,
        worker: '김철수', status: '진행중',
        startedAt: new Date('2026-02-08T09:00:00'),
      },
    });
    await prisma.production.create({
      data: {
        productionNumber: 'PRD20260208002',
        orderId: order2.id,
        productId: products[5].id,
        plannedQty: 10, actualQty: 0, defectQty: 0, wasteQty: 0,
        worker: '이영희', status: '진행중',
        startedAt: new Date('2026-02-08T10:00:00'),
      },
    });

    // 생산 대기
    await prisma.production.create({
      data: {
        productionNumber: 'PRD20260209001',
        orderId: order3.id,
        productId: products[3].id,
        plannedQty: 15, worker: '', status: '대기',
      },
    });
    await prisma.production.create({
      data: {
        productionNumber: 'PRD20260209002',
        orderId: order4.id,
        productId: products[0].id,
        plannedQty: 15, worker: '', status: '대기',
      },
    });

    // 샘플 출하
    // 출하 완료
    const shipment1 = await prisma.shipment.create({
      data: {
        shipmentNumber: 'SHP20260203001',
        orderId: order1.id,
        shipmentDate: new Date('2026-02-03'),
        status: '완료',
        items: {
          create: [
            { productId: products[0].id, quantity: 10 },
            { productId: products[2].id, quantity: 5 },
            { productId: products[7].id, quantity: 10 },
          ],
        },
      },
    });

    const shipment2 = await prisma.shipment.create({
      data: {
        shipmentNumber: 'SHP20260203002',
        orderId: order5.id,
        shipmentDate: new Date('2026-02-03'),
        status: '완료',
        items: {
          create: [
            { productId: products[7].id, quantity: 20 },
            { productId: products[8].id, quantity: 8 },
            { productId: products[9].id, quantity: 1 },
          ],
        },
      },
    });

    // 출하 대기
    await prisma.shipment.create({
      data: {
        shipmentNumber: 'SHP20260209001',
        orderId: order2.id,
        shipmentDate: new Date('2026-02-12'),
        status: '대기',
        items: {
          create: [
            { productId: products[1].id, quantity: 20 },
            { productId: products[5].id, quantity: 10 },
            { productId: products[6].id, quantity: 5 },
          ],
        },
      },
    });

    console.log('샘플 데이터 삽입 완료');
  }

  console.log('데이터베이스 시드 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
