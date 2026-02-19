// KPI 자동 전송 스케줄러 모듈
const cron = require('node-cron');
const { getExternalSettings, transmitKpi } = require('./kpi-transmitter');

let scheduledTask = null;

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

async function initScheduler(prisma) {
  try {
    await loadAndApplySchedule(prisma);
    console.log('[KPI Scheduler] 초기화 완료');
  } catch (error) {
    console.error('[KPI Scheduler] 초기화 오류:', error);
  }
}

async function loadAndApplySchedule(prisma) {
  const settings = await getExternalSettings(prisma);

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (settings.kpi_external_auto_enabled !== 'true') {
    console.log('[KPI Scheduler] 자동 전송 비활성화 상태');
    return;
  }

  const cronExpr = settings.kpi_external_schedule || '0 6 * * *';

  if (!cron.validate(cronExpr)) {
    console.error(`[KPI Scheduler] 잘못된 cron 표현식: ${cronExpr}`);
    return;
  }

  scheduledTask = cron.schedule(cronExpr, async () => {
    try {
      const yesterday = getYesterdayDate();
      console.log(`[KPI Scheduler] 자동 전송 시작: ${yesterday}`);
      const result = await transmitKpi(prisma, yesterday, 'auto');
      console.log(`[KPI Scheduler] 자동 전송 결과: ${result.status} (${result.productCount}건)`);
    } catch (error) {
      console.error('[KPI Scheduler] 자동 전송 오류:', error.message);
    }
  });

  console.log(`[KPI Scheduler] 스케줄 등록: ${cronExpr}`);
}

async function reloadScheduler(prisma) {
  await loadAndApplySchedule(prisma);
}

function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[KPI Scheduler] 스케줄러 중지');
  }
}

module.exports = {
  initScheduler,
  reloadScheduler,
  stopScheduler,
};
