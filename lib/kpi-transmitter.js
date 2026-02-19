// KPI 외부 API 전송 핵심 모듈
const RETRY_DELAYS = [60000, 300000, 900000]; // 1분, 5분, 15분

// 외부 전송 설정 로드
async function getExternalSettings(prisma) {
  const settings = await prisma.setting.findMany({
    where: { key: { startsWith: 'kpi_external_' } },
  });
  const result = {};
  settings.forEach(s => {
    result[s.key] = s.value;
  });
  return result;
}

// KPI 데이터 수집 (kpi_daily 스냅샷 우선, 없으면 productions 실시간 계산)
async function collectKpiData(prisma, reportDate) {
  const dateObj = new Date(reportDate + 'T00:00:00.000Z');

  // kpi_daily 스냅샷 조회
  const snapshots = await prisma.kpiDaily.findMany({
    where: { date: dateObj },
    include: { product: true },
  });

  if (snapshots.length > 0) {
    return snapshots;
  }

  // 스냅샷 없으면 productions에서 실시간 계산
  const productData = await prisma.$queryRawUnsafe(`
    SELECT
      p.product_id,
      pr.product_code,
      pr.name as product_name,
      COUNT(*)::int as production_count,
      SUM(p.actual_qty)::int as actual_qty,
      SUM(p.planned_qty)::int as planned_qty,
      SUM(p.defect_qty)::int as defect_qty,
      SUM(p.waste_qty)::int as waste_qty
    FROM productions p
    JOIN products pr ON p.product_id = pr.id
    WHERE p.status = '완료' AND p.completed_at::date = $1::date
    GROUP BY p.product_id, pr.product_code, pr.name
  `, reportDate);

  return productData.map(row => ({
    pi: row.planned_qty > 0 ? Math.round(row.actual_qty / row.planned_qty * 1000) / 10 : 0,
    qi: row.actual_qty > 0 ? Math.round((row.actual_qty - row.defect_qty) / row.actual_qty * 1000) / 10 : 0,
    yieldRate: row.actual_qty > 0 ? Math.round((row.actual_qty - row.defect_qty - row.waste_qty) / row.actual_qty * 1000) / 10 : 0,
    defectRate: row.actual_qty > 0 ? Math.round(row.defect_qty / row.actual_qty * 1000) / 10 : 0,
    wasteRate: row.actual_qty > 0 ? Math.round(row.waste_qty / row.actual_qty * 1000) / 10 : 0,
    actualQty: row.actual_qty,
    plannedQty: row.planned_qty,
    defectQty: row.defect_qty,
    wasteQty: row.waste_qty,
    productionCount: row.production_count,
    product: { productCode: row.product_code, name: row.product_name },
  }));
}

// 전송 포맷 변환
function formatKpiPayload(dataRows, companyCode, reportDate) {
  const indicators = dataRows.map(s => ({
    productCode: s.product?.productCode || 'UNKNOWN',
    productName: s.product?.name || '미지정',
    pi: Number(s.pi),
    qi: Number(s.qi),
    yieldRate: Number(s.yieldRate),
    defectRate: Number(s.defectRate),
    wasteRate: Number(s.wasteRate),
    actualQty: s.actualQty,
    plannedQty: s.plannedQty,
    defectQty: s.defectQty || 0,
    wasteQty: s.wasteQty || 0,
    productionCount: s.productionCount,
  }));

  const sum = (arr, key) => arr.reduce((acc, item) => acc + (item[key] || 0), 0);
  const avg = (arr, key) => arr.length > 0 ? Math.round(sum(arr, key) / arr.length * 10) / 10 : 0;

  return {
    companyCode: companyCode || '',
    reportDate,
    reportType: 'daily',
    indicators,
    summary: {
      avgPi: avg(indicators, 'pi'),
      avgQi: avg(indicators, 'qi'),
      avgYieldRate: avg(indicators, 'yieldRate'),
      totalActualQty: sum(indicators, 'actualQty'),
      totalPlannedQty: sum(indicators, 'plannedQty'),
      totalDefectQty: sum(indicators, 'defectQty'),
      totalWasteQty: sum(indicators, 'wasteQty'),
      productCount: indicators.length,
    },
    transmittedAt: new Date().toISOString(),
  };
}

// 외부 API 호출
async function callExternalApi(settings, payload) {
  const timeout = parseInt(settings.kpi_external_timeout) || 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(settings.kpi_external_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.kpi_external_api_key}`,
        'X-Company-Code': settings.kpi_external_company_code || '',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const data = await response.json().catch(() => null);

    return {
      success: response.ok,
      statusCode: response.status,
      message: response.ok ? 'OK' : (data?.error || response.statusText),
      data,
    };
  } catch (error) {
    clearTimeout(timer);
    return {
      success: false,
      statusCode: 0,
      message: error.name === 'AbortError' ? '타임아웃' : error.message,
      data: null,
    };
  }
}

// 재시도 스케줄링
function scheduleRetry(prisma, transmissionId, attemptCount, maxRetry) {
  if (attemptCount >= maxRetry) {
    prisma.kpiTransmission.update({
      where: { id: transmissionId },
      data: { status: 'failed' },
    }).catch(err => console.error('[KPI Retry] 최종 실패 기록 오류:', err));
    return;
  }

  prisma.kpiTransmission.update({
    where: { id: transmissionId },
    data: { status: 'retrying' },
  }).catch(err => console.error('[KPI Retry] 상태 변경 오류:', err));

  const delay = RETRY_DELAYS[attemptCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

  setTimeout(async () => {
    try {
      const transmission = await prisma.kpiTransmission.findUnique({
        where: { id: transmissionId },
      });
      if (!transmission || transmission.status === 'success') return;

      const settings = await getExternalSettings(prisma);
      const result = await callExternalApi(settings, transmission.requestData);

      await prisma.kpiTransmission.update({
        where: { id: transmissionId },
        data: {
          status: result.success ? 'success' : 'retrying',
          statusCode: result.statusCode,
          responseMsg: result.message,
          responseData: result.data || undefined,
          attemptCount: attemptCount + 1,
        },
      });

      if (!result.success) {
        scheduleRetry(prisma, transmissionId, attemptCount + 1, maxRetry);
      }
    } catch (error) {
      console.error(`[KPI Retry] 재시도 #${attemptCount + 1} 오류:`, error);
      scheduleRetry(prisma, transmissionId, attemptCount + 1, maxRetry);
    }
  }, delay);
}

// 메인 전송 함수
async function transmitKpi(prisma, reportDate, triggerType) {
  const settings = await getExternalSettings(prisma);

  if (settings.kpi_external_enabled !== 'true') {
    throw new Error('외부 전송 기능이 비활성화 상태입니다.');
  }

  if (!settings.kpi_external_api_url) {
    throw new Error('외부 API URL이 설정되지 않았습니다.');
  }

  // KPI 데이터 수집
  const kpiData = await collectKpiData(prisma, reportDate);
  if (kpiData.length === 0) {
    throw new Error(`${reportDate}에 해당하는 KPI 데이터가 없습니다.`);
  }

  // 포맷 변환
  const payload = formatKpiPayload(kpiData, settings.kpi_external_company_code, reportDate);

  // 전송 이력 레코드 생성
  const transmission = await prisma.kpiTransmission.create({
    data: {
      reportDate: new Date(reportDate + 'T00:00:00.000Z'),
      status: 'pending',
      requestData: payload,
      triggerType,
      attemptCount: 1,
    },
  });

  // 외부 API 호출
  const result = await callExternalApi(settings, payload);

  // 결과 업데이트
  await prisma.kpiTransmission.update({
    where: { id: transmission.id },
    data: {
      status: result.success ? 'success' : 'retrying',
      statusCode: result.statusCode,
      responseMsg: result.message,
      responseData: result.data || undefined,
    },
  });

  // 실패 시 재시도 스케줄링
  if (!result.success) {
    const maxRetry = parseInt(settings.kpi_external_max_retry) || 3;
    scheduleRetry(prisma, transmission.id, 1, maxRetry);
  }

  return {
    transmissionId: transmission.id,
    reportDate,
    productCount: payload.indicators.length,
    status: result.success ? 'success' : 'retrying',
    statusCode: result.statusCode,
    message: result.success
      ? 'KPI 데이터가 성공적으로 전송되었습니다.'
      : '전송에 실패했습니다. 자동 재시도가 예약되었습니다.',
  };
}

module.exports = {
  getExternalSettings,
  collectKpiData,
  formatKpiPayload,
  callExternalApi,
  transmitKpi,
  scheduleRetry,
};
