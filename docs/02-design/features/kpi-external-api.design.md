# KPI 외부 API 전송 기능 설계서

> Plan 문서: `docs/01-plan/features/kpi-external-api.plan.md`
> 기능 요약: KPI 생산지수(PI)/품질지수(QI)를 정부/공공기관 외부 API로 수동+자동 전송, 이력 관리, 재시도 메커니즘

---

## 1. 기능 요구사항 상세 설계 (FR)

### FR-01: 외부 API 설정 관리

**설정 키 목록** (`settings` 테이블, `kpi_external_` prefix):

| Key | Type | Default | 설명 |
|-----|------|---------|------|
| `kpi_external_enabled` | boolean | `false` | 외부 전송 기능 활성화 |
| `kpi_external_api_url` | string | `""` | 외부 API endpoint URL |
| `kpi_external_api_key` | string | `""` | API 인증 키 |
| `kpi_external_company_code` | string | `""` | 사업장 코드 |
| `kpi_external_auto_enabled` | boolean | `false` | 자동 전송 활성화 |
| `kpi_external_schedule` | string | `"0 6 * * *"` | Cron 표현식 (기본: 매일 06:00) |
| `kpi_external_max_retry` | number | `3` | 최대 재시도 횟수 |
| `kpi_external_timeout` | number | `30000` | 전송 타임아웃 (ms) |

**설정 조회 API 응답** (FR-01 + NFR-01 마스킹):
```json
{
  "kpi_external_enabled": true,
  "kpi_external_api_url": "https://api.kamp.or.kr/v1/kpi",
  "kpi_external_api_key": "****...a1b2",
  "kpi_external_company_code": "SF-001",
  "kpi_external_auto_enabled": true,
  "kpi_external_schedule": "0 6 * * *",
  "kpi_external_max_retry": 3,
  "kpi_external_timeout": 30000
}
```

---

### FR-02: KPI 데이터 수집 및 포맷 변환

**데이터 수집 소스**: `kpi_daily` 테이블 (스냅샷 데이터)
- 스냅샷이 없는 경우 `productions` 테이블에서 실시간 계산 (기존 `/api/kpi/productivity`, `/api/kpi/quality` 로직 재사용)

**수집 함수** (`lib/kpi-transmitter.js`):
```javascript
async function collectKpiData(prisma, reportDate) {
  // 1. kpi_daily에서 해당 날짜 스냅샷 조회
  const snapshots = await prisma.kpiDaily.findMany({
    where: { date: new Date(reportDate + 'T00:00:00.000Z') },
    include: { product: true }
  });

  // 2. 스냅샷 없으면 productions에서 실시간 계산
  if (snapshots.length === 0) {
    return await calculateKpiFromProductions(prisma, reportDate);
  }

  // 3. 전송 포맷으로 변환
  return formatKpiPayload(snapshots, companyCode, reportDate);
}
```

**전송 페이로드 구조** (정부 API 규격):
```json
{
  "companyCode": "SF-001",
  "reportDate": "2026-02-19",
  "reportType": "daily",
  "indicators": [
    {
      "productCode": "P001",
      "productName": "스마트 센서 A",
      "pi": 95.5,
      "qi": 98.2,
      "yieldRate": 96.0,
      "defectRate": 1.8,
      "wasteRate": 2.2,
      "actualQty": 500,
      "plannedQty": 524,
      "defectQty": 9,
      "wasteQty": 11,
      "productionCount": 5
    }
  ],
  "summary": {
    "avgPi": 95.5,
    "avgQi": 98.2,
    "avgYieldRate": 96.0,
    "totalActualQty": 1000,
    "totalPlannedQty": 1047,
    "totalDefectQty": 18,
    "totalWasteQty": 22,
    "productCount": 3
  },
  "transmittedAt": "2026-02-19T06:00:00.000Z"
}
```

**포맷 변환 함수** (`lib/kpi-transmitter.js`):
```javascript
function formatKpiPayload(snapshots, companyCode, reportDate) {
  const indicators = snapshots.map(s => ({
    productCode: s.product?.productCode || 'UNKNOWN',
    productName: s.product?.name || '미지정',
    pi: s.pi,
    qi: s.qi,
    yieldRate: s.yieldRate,
    defectRate: s.defectRate,
    wasteRate: s.wasteRate,
    actualQty: s.actualQty,
    plannedQty: s.plannedQty,
    defectQty: s.defectQty,
    wasteQty: s.wasteQty,
    productionCount: s.productionCount
  }));

  const summary = {
    avgPi: avg(indicators, 'pi'),
    avgQi: avg(indicators, 'qi'),
    avgYieldRate: avg(indicators, 'yieldRate'),
    totalActualQty: sum(indicators, 'actualQty'),
    totalPlannedQty: sum(indicators, 'plannedQty'),
    totalDefectQty: sum(indicators, 'defectQty'),
    totalWasteQty: sum(indicators, 'wasteQty'),
    productCount: indicators.length
  };

  return {
    companyCode,
    reportDate,
    reportType: 'daily',
    indicators,
    summary,
    transmittedAt: new Date().toISOString()
  };
}
```

---

### FR-03: 수동 전송

**API**: `POST /api/kpi/external/send`

**요청**:
```json
{
  "date": "2026-02-19"
}
```
`date` 미지정 시 전일(어제) 날짜 사용.

**처리 흐름**:
```
1. 설정 확인 (kpi_external_enabled === true)
2. 중복 전송 체크 (해당 날짜에 status='success' 건 존재 시 경고)
3. KPI 데이터 수집 (collectKpiData)
4. 전송 이력 레코드 생성 (status='pending')
5. 외부 API 호출 (sendToExternalApi)
6. 결과에 따라 이력 업데이트 (success/failed)
7. 실패 시 재시도 스케줄링 (scheduleRetry)
```

**응답 (성공)**:
```json
{
  "message": "KPI 데이터가 성공적으로 전송되었습니다.",
  "transmissionId": 42,
  "reportDate": "2026-02-19",
  "productCount": 3,
  "status": "success"
}
```

**응답 (실패)**:
```json
{
  "message": "전송에 실패했습니다. 자동 재시도가 예약되었습니다.",
  "transmissionId": 42,
  "status": "retrying",
  "nextRetryAt": "2026-02-19T06:01:00.000Z"
}
```

**미리보기 API**: `GET /api/kpi/external/preview?date=2026-02-19`

**응답**: 전송 페이로드 구조와 동일 (실제 전송 없이 데이터만 반환)

---

### FR-04: 자동 전송 (스케줄러)

**스케줄러 모듈** (`lib/kpi-scheduler.js`):

```javascript
const cron = require('node-cron');

let scheduledTask = null;

function initScheduler(prisma) {
  loadAndApplySchedule(prisma);
}

async function loadAndApplySchedule(prisma) {
  // settings에서 cron 표현식 및 활성화 여부 로드
  const settings = await getExternalSettings(prisma);

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!settings.kpi_external_auto_enabled) return;

  const cronExpr = settings.kpi_external_schedule || '0 6 * * *';

  scheduledTask = cron.schedule(cronExpr, async () => {
    try {
      const yesterday = getYesterdayDate();
      await transmitKpi(prisma, yesterday, 'auto');
    } catch (error) {
      console.error('[KPI Scheduler] 자동 전송 오류:', error);
    }
  });
}

function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
```

**서버 통합** (`server.js`):
```javascript
const { initScheduler, stopScheduler } = require('./lib/kpi-scheduler');

// 서버 시작 후 스케줄러 초기화
const server = app.listen(PORT, () => {
  console.log(`서버 실행 중...`);
  initScheduler(prisma);
});

// Graceful shutdown에 스케줄러 종료 추가
async function shutdown() {
  stopScheduler();
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}
```

**스케줄 재로드**: 설정 변경 시 (`PUT /api/kpi/external/settings`) 스케줄러를 재초기화하여 변경된 cron 표현식 즉시 반영.

---

### FR-05: 전송 이력 관리

**Prisma 모델** (`prisma/schema.prisma`):
```prisma
model KpiTransmission {
  id            Int      @id @default(autoincrement())
  reportDate    DateTime @map("report_date") @db.Date
  transmittedAt DateTime @default(now()) @map("transmitted_at")
  status        String   @default("pending")
  statusCode    Int?     @map("status_code")
  responseMsg   String?  @map("response_msg")
  requestData   Json     @map("request_data")
  responseData  Json?    @map("response_data")
  attemptCount  Int      @default(1) @map("attempt_count")
  triggerType   String   @default("manual") @map("trigger_type")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("kpi_transmissions")
}
```

**status 값**: `pending` | `success` | `failed` | `retrying`
**triggerType 값**: `manual` | `auto`

**이력 조회 API**: `GET /api/kpi/external/history`

**Query Parameters**:
| Param | Type | Default | 설명 |
|-------|------|---------|------|
| `status` | string | 전체 | `success`, `failed`, `retrying`, `pending` |
| `start_date` | string | - | 시작일 (report_date 기준) |
| `end_date` | string | - | 종료일 |
| `page` | number | 1 | 페이지 번호 |
| `limit` | number | 20 | 페이지 크기 |

**응답**:
```json
{
  "data": [
    {
      "id": 42,
      "reportDate": "2026-02-19",
      "transmittedAt": "2026-02-19T06:00:05.123Z",
      "status": "success",
      "statusCode": 200,
      "responseMsg": "OK",
      "attemptCount": 1,
      "triggerType": "auto",
      "productCount": 3,
      "createdAt": "2026-02-19T06:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### FR-06: 실패 시 자동 재시도

**재시도 로직** (`lib/kpi-transmitter.js`):

```javascript
const RETRY_DELAYS = [60000, 300000, 900000]; // 1분, 5분, 15분 (지수 백오프)

async function scheduleRetry(prisma, transmissionId, attemptCount, maxRetry) {
  if (attemptCount >= maxRetry) {
    // 최대 재시도 초과 → failed로 최종 기록
    await prisma.kpiTransmission.update({
      where: { id: transmissionId },
      data: { status: 'failed' }
    });
    return;
  }

  // retrying 상태로 변경
  await prisma.kpiTransmission.update({
    where: { id: transmissionId },
    data: { status: 'retrying' }
  });

  const delay = RETRY_DELAYS[attemptCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

  setTimeout(async () => {
    try {
      const transmission = await prisma.kpiTransmission.findUnique({
        where: { id: transmissionId }
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
          responseData: result.data || null,
          attemptCount: attemptCount + 1
        }
      });

      if (!result.success) {
        await scheduleRetry(prisma, transmissionId, attemptCount + 1, maxRetry);
      }
    } catch (error) {
      console.error(`[KPI Retry] 재시도 #${attemptCount + 1} 실패:`, error);
      await scheduleRetry(prisma, transmissionId, attemptCount + 1, maxRetry);
    }
  }, delay);
}
```

**재시도 타임라인 예시**:
```
시도 1 (즉시)     → 실패 → status: retrying
시도 2 (+1분)     → 실패 → status: retrying
시도 3 (+5분)     → 실패 → status: retrying
시도 4 (+15분)    → 실패 → status: failed (maxRetry=3 초과)
```

**수동 재전송 API**: `POST /api/kpi/external/retry/:id`
- 해당 transmission의 requestData를 다시 전송
- attemptCount를 리셋하지 않고 누적
- status가 `failed`인 건만 재전송 가능

---

### FR-07: 전송 이력 조회 UI

**위치**: `public/js/components/settings.js` → `renderSettings()` 함수 확장

**UI 구조** (기존 설정 페이지에 카드 추가):

```
┌─────────────────────────────────────────────┐
│ [기존 기본 설정 카드]                          │
├─────────────────────────────────────────────┤
│ [기존 데이터 관리 카드]                        │
├─────────────────────────────────────────────┤
│ KPI 외부 전송 설정                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 활성화: [토글 ON/OFF]                     │ │
│ │ API URL: [____________]                  │ │
│ │ API Key: [****...a1b2] [변경]            │ │
│ │ 사업장 코드: [________]                   │ │
│ │ 자동 전송: [토글 ON/OFF]                  │ │
│ │ 스케줄: [0 6 * * *] (매일 06:00)          │ │
│ │ [설정 저장]                               │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ KPI 외부 전송 이력                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 필터: [전체▼] 기간: [____]~[____] [조회]  │ │
│ │ [수동 전송]                               │ │
│ │ ┌───┬────────┬────────┬────┬───┬─────┐ │ │
│ │ │ # │ 보고일  │ 전송일시 │상태│건수│ 액션│ │ │
│ │ ├───┼────────┼────────┼────┼───┼─────┤ │ │
│ │ │42 │02-19   │06:00   │ ✅ │ 3 │     │ │ │
│ │ │41 │02-18   │06:00   │ ❌ │ 3 │재전송│ │ │
│ │ └───┴────────┴────────┴────┴───┴─────┘ │ │
│ │ [< 1 2 3 >]                            │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ [기존 시스템 정보 카드]                        │
└─────────────────────────────────────────────┘
```

**상태 배지 디자인**:
| 상태 | 표시 | CSS 클래스 |
|------|------|-----------|
| success | 성공 | `badge-success` (기존) |
| failed | 실패 | `badge-danger` (기존) |
| retrying | 재시도중 | `badge-warning` (기존) |
| pending | 대기 | `badge-secondary` (기존) |

**수동 전송 모달**:
```
┌────────────────────────────────┐
│     KPI 외부 전송               │
│ ──────────────────────────────── │
│ 보고 날짜: [2026-02-18  📅]    │
│                                │
│ [미리보기]  [전송]  [취소]      │
└────────────────────────────────┘
```

미리보기 클릭 시 전송 데이터 JSON을 모달 하단에 표시.

---

## 2. API 인터페이스 상세 설계

### 2.1 라우트 파일: `routes/kpi-external.js`

| # | Method | Path | Handler | 설명 |
|---|--------|------|---------|------|
| 1 | GET | `/settings` | `getExternalSettings` | 외부 전송 설정 조회 (API Key 마스킹) |
| 2 | PUT | `/settings` | `saveExternalSettings` | 외부 전송 설정 저장 + 스케줄러 재로드 |
| 3 | GET | `/preview` | `previewTransmission` | 전송 데이터 미리보기 |
| 4 | POST | `/send` | `sendTransmission` | 수동 전송 실행 |
| 5 | POST | `/retry/:id` | `retryTransmission` | 실패 건 재전송 |
| 6 | GET | `/history` | `getTransmissionHistory` | 전송 이력 조회 (페이지네이션) |

**라우트 등록** (`server.js`):
```javascript
app.use('/api/kpi/external', authMiddleware, require('./routes/kpi-external'));
```

### 2.2 프론트엔드 API 추가 (`public/js/api.js`)

```javascript
// KPI 기존 객체에 external 추가
kpi: {
  // ... 기존 메서드 유지 ...
  external: {
    getSettings: () => API.get('/kpi/external/settings'),
    saveSettings: (data) => API.put('/kpi/external/settings', data),
    preview: (date) => API.get(`/kpi/external/preview?date=${date}`),
    send: (data) => API.post('/kpi/external/send', data),
    retry: (id) => API.post(`/kpi/external/retry/${id}`),
    getHistory: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/kpi/external/history${query ? '?' + query : ''}`);
    },
  },
},
```

---

## 3. 모듈 상세 설계

### 3.1 `lib/kpi-transmitter.js` — 전송 핵심 모듈

**Exports**:
| 함수 | 설명 |
|------|------|
| `transmitKpi(prisma, reportDate, triggerType)` | 메인 전송 함수 (수집→변환→전송→이력 기록) |
| `collectKpiData(prisma, reportDate)` | KPI 데이터 수집 |
| `formatKpiPayload(snapshots, companyCode, reportDate)` | 전송 포맷 변환 |
| `callExternalApi(settings, payload)` | 외부 API HTTP 호출 |
| `scheduleRetry(prisma, transmissionId, attemptCount, maxRetry)` | 재시도 스케줄링 |
| `getExternalSettings(prisma)` | 외부 전송 설정 로드 |

**`transmitKpi` 흐름도**:
```
transmitKpi(prisma, date, triggerType)
  │
  ├─ getExternalSettings(prisma)
  │    └─ 설정 미활성화 → throw Error
  │
  ├─ collectKpiData(prisma, date)
  │    ├─ kpi_daily 스냅샷 조회
  │    └─ 없으면 productions 실시간 계산
  │
  ├─ formatKpiPayload(data, companyCode, date)
  │
  ├─ prisma.kpiTransmission.create({ status: 'pending', requestData })
  │
  ├─ callExternalApi(settings, payload)
  │    ├─ fetch(url, { method: 'POST', headers, body, signal(timeout) })
  │    └─ return { success, statusCode, message, data }
  │
  ├─ 성공 → update({ status: 'success', statusCode, responseMsg })
  │
  └─ 실패 → update({ status: 'retrying' })
       └─ scheduleRetry(prisma, id, 1, maxRetry)
```

**`callExternalApi` 상세**:
```javascript
async function callExternalApi(settings, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(),
    settings.kpi_external_timeout || 30000);

  try {
    const response = await fetch(settings.kpi_external_api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.kpi_external_api_key}`,
        'X-Company-Code': settings.kpi_external_company_code
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await response.json().catch(() => null);

    return {
      success: response.ok,
      statusCode: response.status,
      message: response.ok ? 'OK' : (data?.error || response.statusText),
      data
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      success: false,
      statusCode: 0,
      message: error.name === 'AbortError' ? '타임아웃' : error.message,
      data: null
    };
  }
}
```

### 3.2 `lib/kpi-scheduler.js` — 스케줄러 모듈

**Exports**:
| 함수 | 설명 |
|------|------|
| `initScheduler(prisma)` | 서버 시작 시 스케줄러 초기화 |
| `reloadScheduler(prisma)` | 설정 변경 시 스케줄 재로드 |
| `stopScheduler()` | Graceful shutdown 시 중지 |

---

## 4. 데이터베이스 변경사항

### 4.1 KpiTransmission 모델 추가

위 FR-05 섹션의 Prisma 모델 참조.

### 4.2 마이그레이션 명령

```bash
npx prisma migrate dev --name add-kpi-transmission
```

### 4.3 시드 데이터 (`prisma/seed.js` 추가)

```javascript
// KPI 외부 전송 기본 설정
const kpiExternalDefaults = {
  kpi_external_enabled: 'false',
  kpi_external_api_url: '',
  kpi_external_api_key: '',
  kpi_external_company_code: '',
  kpi_external_auto_enabled: 'false',
  kpi_external_schedule: '0 6 * * *',
  kpi_external_max_retry: '3',
  kpi_external_timeout: '30000',
};
```

---

## 5. 보안 설계 (NFR-01)

### 5.1 API Key 마스킹

**GET `/api/kpi/external/settings` 응답 처리**:
```javascript
function maskApiKey(key) {
  if (!key || key.length < 8) return '****';
  return '****...' + key.slice(-4);
}
```

**PUT 시 빈값/마스킹값 처리**:
- `kpi_external_api_key`가 `****`로 시작하거나 빈 문자열이면 기존 값 유지
- 새 값이 입력된 경우에만 업데이트

### 5.2 HTTPS 검증

설정 저장 시 `kpi_external_api_url`이 `https://`로 시작하는지 서버 측 검증.

---

## 6. 구현 순서 (Implementation Order)

| # | 작업 | 파일 | FR | 의존성 |
|:-:|------|------|----|--------|
| 1 | `node-cron` 설치 | package.json | FR-04 | - |
| 2 | KpiTransmission Prisma 모델 + 마이그레이션 | prisma/schema.prisma | FR-05 | - |
| 3 | 시드 데이터에 외부 전송 기본 설정 추가 | prisma/seed.js | FR-01 | #2 |
| 4 | KPI 전송 핵심 모듈 구현 | lib/kpi-transmitter.js | FR-02, FR-06 | #2 |
| 5 | 외부 전송 API 라우트 구현 | routes/kpi-external.js | FR-01, FR-03, FR-05 | #4 |
| 6 | 서버에 라우트 등록 | server.js | - | #5 |
| 7 | 스케줄러 모듈 구현 | lib/kpi-scheduler.js | FR-04 | #1, #4 |
| 8 | 서버에 스케줄러 초기화 추가 | server.js | FR-04 | #7 |
| 9 | 프론트엔드 API 엔드포인트 추가 | public/js/api.js | - | #5 |
| 10 | 설정 화면 외부 전송 설정 UI | public/js/components/settings.js | FR-01, FR-07 | #9 |
| 11 | 설정 화면 전송 이력 UI | public/js/components/settings.js | FR-07 | #9 |
| 12 | 수동 전송 모달 UI | public/js/components/settings.js | FR-03 | #9 |

---

## 7. 파일 변경 매트릭스

| 파일 | 변경 유형 | FR |
|------|-----------|-----|
| `package.json` | 수정 (의존성 추가) | FR-04 |
| `prisma/schema.prisma` | 수정 (모델 추가) | FR-05 |
| `prisma/seed.js` | 수정 (시드 추가) | FR-01 |
| `lib/kpi-transmitter.js` | **신규** | FR-02, FR-03, FR-06 |
| `lib/kpi-scheduler.js` | **신규** | FR-04 |
| `routes/kpi-external.js` | **신규** | FR-01~FR-07 |
| `server.js` | 수정 (라우트+스케줄러) | FR-04 |
| `public/js/api.js` | 수정 (엔드포인트 추가) | FR-03, FR-07 |
| `public/js/components/settings.js` | 수정 (UI 추가) | FR-01, FR-03, FR-07 |

**총 9 파일** (신규 3개 + 수정 6개)
