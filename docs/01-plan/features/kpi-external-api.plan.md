# KPI 외부 API 전송 기능 계획서

> KPI 관리 메뉴의 생산지수(PI)와 품질지수(QI)를 정부/공공기관 외부 API로 정기적으로 전송하는 기능

## 1. 배경 및 목적

### 1.1 배경
- 스마트공방 시스템에서 생산성 KPI(PI)와 품질 KPI(QI)를 실시간 계산하고 일별 스냅샷으로 관리 중
- 정부/공공기관(예: 스마트제조혁신추진단, KAMP 등)에 KPI 데이터를 정기적으로 보고해야 하는 요구사항 발생
- 현재 시스템에는 외부 전송 기능 및 스케줄러가 없음 (스냅샷은 수동 생성만 가능)

### 1.2 목적
- KPI 데이터(PI, QI)를 외부 정부/공공 API로 자동+수동 전송
- 전송 이력 관리 및 실패 시 자동 재시도 메커니즘 구현
- 설정 화면에서 외부 API 연동 설정 및 이력 조회 기능 제공

## 2. 기능 요구사항 (FR)

### FR-01: 외부 API 설정 관리
- 외부 API endpoint URL, API Key, 인증 방식 등을 설정 화면에서 관리
- 설정 항목: `api_url`, `api_key`, `company_code` (사업장 코드), `enabled` (활성화 여부)
- 기존 `settings` 테이블에 `kpi_external_` prefix로 저장

### FR-02: KPI 데이터 수집 및 포맷 변환
- 전송 시점에 `kpi_daily` 테이블에서 해당 기간의 PI/QI 데이터를 수집
- 정부/공공기관 API 규격에 맞는 JSON 포맷으로 변환
- 전송 데이터 구조:
  ```json
  {
    "companyCode": "사업장코드",
    "reportDate": "2026-02-19",
    "indicators": [
      {
        "productCode": "PRD-001",
        "productName": "제품A",
        "pi": 95.5,
        "qi": 98.2,
        "yieldRate": 96.0,
        "defectRate": 1.8,
        "wasteRate": 2.2,
        "actualQty": 1000,
        "plannedQty": 1047
      }
    ],
    "summary": {
      "avgPi": 95.5,
      "avgQi": 98.2,
      "totalProduction": 1000,
      "totalDefect": 18,
      "totalWaste": 22
    }
  }
  ```

### FR-03: 수동 전송
- KPI 설정 화면 또는 KPI 페이지에서 "외부 전송" 버튼을 통한 수동 전송
- 기간 선택 후 전송 가능 (기본: 전일 데이터)
- 전송 전 미리보기로 전송될 데이터 확인 가능

### FR-04: 자동 전송 (스케줄러)
- `node-cron`을 사용한 서버 시작 시 스케줄러 등록
- 기본 스케줄: 매일 오전 6시 전일 KPI 데이터 자동 전송
- 스케줄 cron 표현식을 설정에서 변경 가능 (`kpi_external_schedule`)
- 자동 전송 활성화/비활성화 설정 (`kpi_external_auto_enabled`)

### FR-05: 전송 이력 관리
- 새 Prisma 모델 `KpiTransmission`으로 전송 이력 저장
- 저장 항목: 전송일시, 대상 기간, 전송 상태(성공/실패/재시도중), 응답 코드, 응답 메시지, 전송 데이터(JSON), 시도 횟수
- 이력 조회 API 및 UI 제공

### FR-06: 실패 시 자동 재시도
- 전송 실패 시 최대 3회까지 자동 재시도 (지수 백오프: 1분, 5분, 15분)
- 재시도 횟수 및 간격을 설정에서 변경 가능
- 최종 실패 시 상태를 `failed`로 기록
- 설정 화면에서 실패 건 수동 재전송 가능

### FR-07: 전송 이력 조회 UI
- KPI 설정 페이지 내 "외부 전송 이력" 탭/섹션 추가
- 전송 일시, 기간, 상태, 응답 코드 테이블 형태로 표시
- 상태별 필터 (전체/성공/실패/재시도중)
- 실패 건 재전송 버튼

## 3. 비기능 요구사항 (NFR)

### NFR-01: 보안
- 외부 API Key는 `settings` 테이블에 저장하되, 프론트엔드 조회 시 마스킹 처리 (`****...last4`)
- 전송 시 HTTPS 필수

### NFR-02: 안정성
- 외부 API 전송 실패가 메인 시스템 기능에 영향을 주지 않아야 함
- 스케줄러 오류 시 서버 크래시 방지 (try-catch)
- 전송 타임아웃: 30초

### NFR-03: 데이터 무결성
- 동일 기간에 대한 중복 전송 방지 (기존 성공 건이 있으면 경고)
- 전송 데이터의 원본 보존 (전송 시점의 KPI 값 기록)

## 4. 기술 스택 및 아키텍처

### 4.1 추가 의존성
| 패키지 | 용도 | 버전 |
|--------|------|------|
| `node-cron` | 자동 전송 스케줄러 | ^3.0 |

### 4.2 신규 파일 구조
```
routes/kpi-external.js          # 외부 전송 API 라우트
lib/kpi-transmitter.js           # 외부 API 전송 로직 (수집, 변환, 전송, 재시도)
lib/kpi-scheduler.js             # node-cron 스케줄러 관리
prisma/schema.prisma             # KpiTransmission 모델 추가
public/js/components/settings.js # 외부 전송 설정 및 이력 UI 추가
public/js/api.js                 # 외부 전송 관련 API 엔드포인트 추가
server.js                        # 스케줄러 초기화 추가
```

### 4.3 새 Prisma 모델
```prisma
model KpiTransmission {
  id            Int      @id @default(autoincrement())
  reportDate    DateTime @map("report_date") @db.Date
  transmittedAt DateTime @default(now()) @map("transmitted_at")
  status        String   @default("pending") // pending, success, failed, retrying
  statusCode    Int?     @map("status_code")
  responseMsg   String?  @map("response_msg")
  requestData   Json     @map("request_data")
  responseData  Json?    @map("response_data")
  attemptCount  Int      @default(1) @map("attempt_count")
  triggerType   String   @default("manual") @map("trigger_type") // manual, auto
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("kpi_transmissions")
}
```

### 4.4 신규 API 엔드포인트
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/kpi/external/send` | 수동 전송 (date 파라미터) |
| POST | `/api/kpi/external/retry/:id` | 실패 건 재전송 |
| GET | `/api/kpi/external/history` | 전송 이력 조회 |
| GET | `/api/kpi/external/preview` | 전송 데이터 미리보기 |
| GET | `/api/kpi/external/settings` | 외부 전송 설정 조회 |
| PUT | `/api/kpi/external/settings` | 외부 전송 설정 저장 |

## 5. 구현 순서

| 순서 | 작업 | 파일 | 우선순위 |
|:----:|------|------|:--------:|
| 1 | `node-cron` 의존성 설치 | package.json | P0 |
| 2 | KpiTransmission Prisma 모델 추가 + 마이그레이션 | prisma/schema.prisma | P0 |
| 3 | KPI 데이터 수집/변환/전송 모듈 구현 | lib/kpi-transmitter.js | P0 |
| 4 | 외부 전송 API 라우트 구현 | routes/kpi-external.js | P0 |
| 5 | 서버에 라우트 등록 | server.js | P0 |
| 6 | 자동 전송 스케줄러 구현 | lib/kpi-scheduler.js | P1 |
| 7 | 서버에 스케줄러 초기화 추가 | server.js | P1 |
| 8 | 프론트엔드 API 엔드포인트 추가 | public/js/api.js | P1 |
| 9 | 설정 화면에 외부 전송 설정/이력 UI 추가 | public/js/components/settings.js | P1 |
| 10 | 재시도 로직 구현 (지수 백오프) | lib/kpi-transmitter.js | P2 |

## 6. 위험 요소 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| 정부 API 규격 미확정 | 전송 데이터 포맷 변경 가능 | 변환 로직을 별도 함수로 분리, 포맷 변경 용이하도록 설계 |
| 외부 API 장애 | 전송 실패 누적 | 자동 재시도 + 수동 재전송 기능으로 대응 |
| 대량 데이터 전송 | 타임아웃 | 일별 단위로 전송, 제품별 배치 가능 |
| API Key 유출 | 보안 사고 | 서버사이드에서만 키 사용, 프론트엔드 마스킹 |

## 7. 성공 기준

- [ ] 수동 전송 버튼으로 KPI 데이터 전송 가능
- [ ] 매일 오전 자동 전송 동작 확인
- [ ] 전송 실패 시 자동 재시도 (최대 3회)
- [ ] 전송 이력 화면에서 상태별 조회 가능
- [ ] 외부 API 설정을 설정 화면에서 변경 가능
- [ ] 전송 실패가 기존 시스템 기능에 영향 없음
