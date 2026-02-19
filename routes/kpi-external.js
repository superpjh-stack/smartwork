const express = require('express');
const router = express.Router();
const { getExternalSettings, collectKpiData, formatKpiPayload, transmitKpi } = require('../lib/kpi-transmitter');

// API Key 마스킹
function maskApiKey(key) {
  if (!key || key.length < 8) return key ? '****' : '';
  return '****...' + key.slice(-4);
}

// 외부 전송 설정 조회 (API Key 마스킹)
router.get('/settings', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const settings = await getExternalSettings(prisma);

    // API Key 마스킹 처리
    if (settings.kpi_external_api_key) {
      settings.kpi_external_api_key = maskApiKey(settings.kpi_external_api_key);
    }

    res.json(settings);
  } catch (error) {
    console.error('외부 전송 설정 조회 오류:', error);
    res.status(500).json({ error: '설정 조회 중 오류가 발생했습니다.' });
  }
});

// 외부 전송 설정 저장
router.put('/settings', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const data = req.body;

    // HTTPS 검증
    if (data.kpi_external_api_url && !data.kpi_external_api_url.startsWith('https://')) {
      if (data.kpi_external_api_url && !data.kpi_external_api_url.startsWith('http://localhost')) {
        return res.status(400).json({ error: 'API URL은 https://로 시작해야 합니다.' });
      }
    }

    const entries = Object.entries(data).filter(([key]) => key.startsWith('kpi_external_'));

    // API Key가 마스킹된 값이면 업데이트하지 않음
    const filteredEntries = entries.filter(([key, value]) => {
      if (key === 'kpi_external_api_key' && (value === '' || (typeof value === 'string' && value.startsWith('****')))) {
        return false;
      }
      return true;
    });

    await prisma.$transaction(
      filteredEntries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    // 스케줄러 재로드
    try {
      const { reloadScheduler } = require('../lib/kpi-scheduler');
      await reloadScheduler(prisma);
    } catch (e) {
      console.error('스케줄러 재로드 오류:', e);
    }

    res.json({ message: '외부 전송 설정이 저장되었습니다.' });
  } catch (error) {
    console.error('외부 전송 설정 저장 오류:', error);
    res.status(500).json({ error: '설정 저장 중 오류가 발생했습니다.' });
  }
});

// 전송 데이터 미리보기
router.get('/preview', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date } = req.query;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const reportDate = date || yesterday.toISOString().split('T')[0];

    const settings = await getExternalSettings(prisma);
    const kpiData = await collectKpiData(prisma, reportDate);

    if (kpiData.length === 0) {
      return res.json({ message: `${reportDate}에 해당하는 KPI 데이터가 없습니다.`, indicators: [] });
    }

    const payload = formatKpiPayload(kpiData, settings.kpi_external_company_code, reportDate);
    res.json(payload);
  } catch (error) {
    console.error('전송 미리보기 오류:', error);
    res.status(500).json({ error: '미리보기 데이터 생성 중 오류가 발생했습니다.' });
  }
});

// 수동 전송
router.post('/send', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date } = req.body;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const reportDate = date || yesterday.toISOString().split('T')[0];

    // 중복 전송 체크
    const existing = await prisma.kpiTransmission.findFirst({
      where: {
        reportDate: new Date(reportDate + 'T00:00:00.000Z'),
        status: 'success',
      },
    });

    if (existing) {
      return res.status(409).json({
        error: `${reportDate}에 대한 전송이 이미 성공적으로 완료되었습니다. (ID: ${existing.id})`,
        existingId: existing.id,
      });
    }

    const result = await transmitKpi(prisma, reportDate, 'manual');
    res.json(result);
  } catch (error) {
    console.error('수동 전송 오류:', error);
    res.status(500).json({ error: error.message || '전송 중 오류가 발생했습니다.' });
  }
});

// 실패 건 재전송
router.post('/retry/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const id = parseInt(req.params.id);

    const transmission = await prisma.kpiTransmission.findUnique({ where: { id } });
    if (!transmission) {
      return res.status(404).json({ error: '전송 이력을 찾을 수 없습니다.' });
    }
    if (transmission.status === 'success') {
      return res.status(400).json({ error: '이미 성공한 전송은 재전송할 수 없습니다.' });
    }
    if (transmission.status === 'retrying') {
      return res.status(400).json({ error: '이미 재시도 중인 전송입니다.' });
    }

    const reportDate = transmission.reportDate.toISOString().split('T')[0];
    const result = await transmitKpi(prisma, reportDate, 'manual');
    res.json(result);
  } catch (error) {
    console.error('재전송 오류:', error);
    res.status(500).json({ error: error.message || '재전송 중 오류가 발생했습니다.' });
  }
});

// 전송 이력 조회
router.get('/history', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { status, start_date, end_date, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const where = {};
    if (status) {
      where.status = status;
    }
    if (start_date || end_date) {
      where.reportDate = {};
      if (start_date) where.reportDate.gte = new Date(start_date + 'T00:00:00.000Z');
      if (end_date) where.reportDate.lte = new Date(end_date + 'T00:00:00.000Z');
    }

    const [data, total] = await Promise.all([
      prisma.kpiTransmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.kpiTransmission.count({ where }),
    ]);

    res.json({
      data: data.map(t => ({
        id: t.id,
        reportDate: t.reportDate.toISOString().split('T')[0],
        transmittedAt: t.transmittedAt.toISOString(),
        status: t.status,
        statusCode: t.statusCode,
        responseMsg: t.responseMsg,
        attemptCount: t.attemptCount,
        triggerType: t.triggerType,
        productCount: t.requestData?.indicators?.length || 0,
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('전송 이력 조회 오류:', error);
    res.status(500).json({ error: '이력 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
