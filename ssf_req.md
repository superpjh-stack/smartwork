# 스마트공방 관리 시스템 - 기능명세서

> **버전**: 1.0.0
> **최종 수정일**: 2026-02-09
> **배포 URL**: https://smartwork-1010037633663.asia-northeast3.run.app

---

## 1. 시스템 개요

### 1.1 시스템 목적
스마트공방의 제품, 재고, 거래처, 주문, 생산, 출하를 통합 관리하는 웹 기반 MES(Manufacturing Execution System)

### 1.2 기술 스택
| 구분 | 기술 |
|------|------|
| 백엔드 | Node.js + Express 4.18.2 |
| 데이터베이스 | SQLite3 (better-sqlite3 9.2.2) |
| 프론트엔드 | Vanilla JavaScript (SPA) |
| 인증 | 세션 토큰 + SHA-256 해싱 |
| 배포 | Google Cloud Run (Docker) |

### 1.3 사용자 역할
| 역할 | 코드 | 권한 범위 |
|------|------|-----------|
| 전체관리자 | `super_admin` | 모든 기능 + 회원 관리 |
| 회사관리자 | `company_admin` | 일반 업무 기능 (회원 관리 제외) |

---

## 2. 인증 및 회원 관리

### 2.1 로그인 (POST /api/auth/login)

| 항목 | 내용 |
|------|------|
| 화면 | 중앙 정렬 로그인 카드 (아이디, 비밀번호 입력 폼) |
| 요청 | `{ username, password }` |
| 응답 | `{ token, user: { id, username, name, role, company_id, company } }` |
| 인증 방식 | SHA-256(password + salt) 비교 |
| 세션 유효시간 | 24시간 |
| 비활성 계정 | 로그인 거부 ("비활성화된 계정입니다.") |
| 기존 세션 | 로그인 시 기존 세션 삭제 후 새 세션 생성 |
| 토큰 저장 | 클라이언트 localStorage |

**기본 계정:**
| 아이디 | 비밀번호 | 역할 | 소속 |
|--------|----------|------|------|
| admin | admin1234 | 전체관리자 | 스마트공방 |
| user1 | user1234 | 회사관리자 | 스마트공방 |

### 2.2 로그아웃 (POST /api/auth/logout)

| 항목 | 내용 |
|------|------|
| 동작 | 서버 세션 삭제 + 클라이언트 토큰 삭제 |
| UI | 헤더 우측 "로그아웃" 버튼 클릭 |
| 후처리 | 로그인 화면으로 전환 |

### 2.3 인증 상태 확인 (GET /api/auth/me)

| 항목 | 내용 |
|------|------|
| 동작 | 토큰으로 현재 로그인 사용자 정보 조회 |
| 앱 시작 시 | localStorage 토큰 → /api/auth/me 호출 → 유효하면 앱 표시, 만료면 로그인 화면 |
| 응답 | `{ id, username, name, role, company_id, company }` |

### 2.4 인증 미들웨어

| 항목 | 내용 |
|------|------|
| 적용 범위 | `/api/auth/*` 제외 모든 `/api/*` 요청 |
| 헤더 | `Authorization: Bearer <token>` |
| 401 처리 | 프론트엔드에서 자동으로 토큰 삭제 후 로그인 화면 전환 |

### 2.5 회원 관리

> 사이드바 메뉴: `super_admin`일 때만 표시

#### 2.5.1 사용자 목록 (GET /api/users)

| 항목 | 내용 |
|------|------|
| super_admin | 전체 사용자 목록 조회 |
| company_admin | 자기 회사 소속 사용자만 조회 |
| 테이블 컬럼 | 아이디, 이름, 역할(배지), 회사, 상태(활성/비활성 배지), 등록일, 관리 |
| 관리 버튼 | 상세, 수정, 삭제 (super_admin만) |
| 자기 삭제 | 불가 (삭제 버튼 미표시) |

#### 2.5.2 사용자 상세 (GET /api/users/:id)

| 항목 | 내용 |
|------|------|
| 모달 표시 | 아이디, 이름, 역할, 소속 회사, 상태, 등록일 |
| 접근 제한 | company_admin은 자기 회사 소속만 조회 가능 |
| 버튼 | 닫기, 수정 (super_admin 또는 본인) |

#### 2.5.3 사용자 등록 (POST /api/users)

| 항목 | 내용 |
|------|------|
| 권한 | super_admin만 가능 |
| 필수 항목 | 아이디, 비밀번호(4자 이상), 이름 |
| 선택 항목 | 역할(기본: company_admin), 소속 회사, 상태(기본: 활성) |
| 유효성 검사 | 아이디 중복 체크, 비밀번호 최소 4자 |

#### 2.5.4 사용자 수정 (PUT /api/users/:id)

| 항목 | 내용 |
|------|------|
| super_admin | 모든 필드 수정 가능 (아이디, 이름, 비밀번호, 역할, 회사, 상태) |
| company_admin | 자기 자신만 수정 가능 (아이디, 이름, 비밀번호) |
| 비밀번호 | 비워두면 기존 비밀번호 유지 |

#### 2.5.5 사용자 삭제 (DELETE /api/users/:id)

| 항목 | 내용 |
|------|------|
| 권한 | super_admin만 가능 |
| 제한 | 자기 자신 삭제 불가 |
| 확인 | 삭제 전 confirm 대화상자 |

#### 2.5.6 회사 목록 (GET /api/users/companies/list)

| 항목 | 내용 |
|------|------|
| 용도 | 사용자 등록/수정 시 회사 드롭다운 |
| 응답 | `[{ id, company_code, name }]` |

---

## 3. 대시보드

### 3.1 대시보드 화면 (GET /api/dashboard/*)

| 항목 | 내용 |
|------|------|
| 메뉴 | 📊 대시보드 |
| 역할 | 모든 사용자 접근 가능 |

#### 3.1.1 요약 통계 카드 (GET /api/dashboard/summary)

| 카드 | 데이터 | 색상 조건 |
|------|--------|-----------|
| 등록 제품 | 전체 제품 수 | 기본(파란색) |
| 거래처 | 전체 거래처 수 | 기본 |
| 대기 주문 | 상태='대기' 주문 수 | > 0이면 경고(주황) |
| 진행중 생산 | 상태='대기' 또는 '진행중' 생산 수 | > 0이면 성공(초록) |
| 오늘 출하 | 출하일=오늘인 건 수 | 기본 |
| 재고 부족 | 재고 ≤ 10인 제품 수 | > 0이면 위험(빨강) |

#### 3.1.2 최근 주문 (GET /api/dashboard/recent-orders)

| 항목 | 내용 |
|------|------|
| 표시 건수 | 최근 5건 |
| 테이블 컬럼 | 주문번호, 거래처, 상태(배지), 금액 |
| 전체보기 | 주문 관리 페이지로 이동 |

#### 3.1.3 최근 생산 (GET /api/dashboard/recent-productions)

| 항목 | 내용 |
|------|------|
| 표시 건수 | 최근 5건 |
| 테이블 컬럼 | 생산번호, 제품명, 상태(배지), 실적/계획 |
| 전체보기 | 생산 관리 페이지로 이동 |

#### 3.1.4 재고 현황 (GET /api/dashboard/inventory-status)

| 항목 | 내용 |
|------|------|
| 표시 건수 | 재고 적은 순 10건 |
| 테이블 컬럼 | 제품코드, 제품명, 수량(≤10이면 빨강), 위치 |
| 전체보기 | 재고 관리 페이지로 이동 |

---

## 4. 제품 관리

### 4.1 제품 목록 (GET /api/products)

| 항목 | 내용 |
|------|------|
| 메뉴 | 📦 제품 관리 |
| 헤더 버튼 | "+ 제품 등록" |
| 테이블 컬럼 | 제품코드, 제품명, 단위, 단가, 재고(≤10 빨강), 등록일, 관리 |
| 관리 버튼 | 수정, 삭제 |
| 빈 상태 | "등록된 제품이 없습니다." |

### 4.2 제품 등록 (POST /api/products)

| 항목 | 내용 |
|------|------|
| 모달 제목 | "제품 등록" |
| 필수 항목 | 제품코드, 제품명 |
| 선택 항목 | 단위(기본: 개), 단가(기본: 0) |
| 유효성 검사 | 제품코드 중복 체크 |
| 부가 동작 | 재고 레코드 자동 생성 (수량 0) |

### 4.3 제품 수정 (PUT /api/products/:id)

| 항목 | 내용 |
|------|------|
| 모달 제목 | "제품 수정" |
| 수정 가능 필드 | 제품코드, 제품명, 단위, 단가 |
| 유효성 검사 | 제품코드 중복 체크 (자기 제외) |

### 4.4 제품 삭제 (DELETE /api/products/:id)

| 항목 | 내용 |
|------|------|
| 확인 | "정말 삭제하시겠습니까?" |
| 연쇄 삭제 | 재고, 재고이력 함께 삭제 (CASCADE) |

---

## 5. 재고 관리

### 5.1 재고 현황 탭 (GET /api/inventory)

| 항목 | 내용 |
|------|------|
| 메뉴 | 📋 재고 관리 |
| 탭 | 재고 현황 / 입출고 이력 |
| 헤더 버튼 | "+ 입고" (초록), "- 출고/사용" (주황) |
| 테이블 컬럼 | 제품코드, 제품명, 단위, 수량(≤10 빨강), 위치, 최종 수정일 |
| 관리 버튼 | 조정, 이력 |

### 5.2 입출고 이력 탭 (GET /api/inventory/history/all)

| 항목 | 내용 |
|------|------|
| 표시 건수 | 최근 100건 |
| 테이블 컬럼 | 일시, 제품코드, 제품명, 유형(배지), 수량(+파랑/-빨강), 사유 |
| 유형 배지 | 입고(초록), 출고(빨강), 사용(주황), 조정(회색) |

### 5.3 입고 (POST /api/inventory/receive)

| 항목 | 내용 |
|------|------|
| 모달 제목 | "재고 입고" |
| 필수 항목 | 제품(드롭다운), 수량(최소 1) |
| 선택 항목 | 사유 |
| 동작 | 재고 증가 + 재고이력 기록 (유형: '입고') |

### 5.4 출고/사용 (POST /api/inventory/use)

| 항목 | 내용 |
|------|------|
| 모달 제목 | "출고/사용" |
| 필수 항목 | 제품(드롭다운, 현재고 표시), 유형('사용' 또는 '출고'), 수량(최소 1) |
| 선택 항목 | 사유 |
| 유효성 검사 | 현재고 ≥ 요청 수량 (부족 시 오류) |
| 동작 | 재고 감소 + 재고이력 기록 (음수 수량) |

### 5.5 재고 조정 (POST /api/inventory/adjust)

| 항목 | 내용 |
|------|------|
| 모달 제목 | "재고 조정" |
| 표시 정보 | 현재 수량 (읽기 전용) |
| 필수 항목 | 조정 수량(최소 0) |
| 선택 항목 | 사유 |
| 동작 | 재고를 지정 수량으로 설정 + 차이값을 이력 기록 (유형: '조정') |

### 5.6 제품별 재고이력 (GET /api/inventory/:product_id/history)

| 항목 | 내용 |
|------|------|
| 표시 건수 | 최근 50건 |
| 모달 내 테이블 | 일시, 유형(배지), 수량, 사유 |

### 5.7 위치 수정 (PUT /api/inventory/:product_id/location)

| 항목 | 내용 |
|------|------|
| 동작 | 재고 위치 정보 업데이트 |

---

## 6. 거래처 관리

### 6.1 거래처 목록 (GET /api/customers)

| 항목 | 내용 |
|------|------|
| 메뉴 | 🏢 거래처 관리 |
| 헤더 버튼 | "+ 거래처 등록" |
| 테이블 컬럼 | 거래처코드, 거래처명, 연락처, 주소, 등록일, 관리 |
| 관리 버튼 | 상세, 수정, 삭제 |

### 6.2 거래처 상세 (GET /api/customers/:id)

| 항목 | 내용 |
|------|------|
| 모달 표시 | 거래처코드, 거래처명, 연락처, 등록일, 주소 |
| 최근 주문 | 해당 거래처의 최근 10건 주문 테이블 (주문번호, 주문일, 상태, 금액) |

### 6.3 거래처 등록 (POST /api/customers)

| 항목 | 내용 |
|------|------|
| 필수 항목 | 거래처코드, 거래처명 |
| 선택 항목 | 연락처(예: 02-1234-5678), 주소 |
| 유효성 검사 | 거래처코드 중복 체크 |

### 6.4 거래처 수정 (PUT /api/customers/:id)

| 항목 | 내용 |
|------|------|
| 수정 가능 | 거래처코드, 거래처명, 연락처, 주소 |

### 6.5 거래처 삭제 (DELETE /api/customers/:id)

| 항목 | 내용 |
|------|------|
| 제한 | 주문이 존재하는 거래처는 삭제 불가 |
| 확인 | 삭제 전 confirm 대화상자 |

---

## 7. 주문 관리

### 7.1 주문 목록 (GET /api/orders)

| 항목 | 내용 |
|------|------|
| 메뉴 | 📝 주문 관리 |
| 필터 | 상태별 필터 (전체, 대기, 진행중, 완료, 취소) |
| 헤더 버튼 | "+ 주문 등록" |
| 테이블 컬럼 | 주문번호, 거래처, 주문일, 납기일, 상태(배지), 금액, 관리 |
| 관리 버튼 (상태별) | |

| 상태 | 버튼 |
|------|------|
| 대기 | 상세, 진행, 수정, 삭제 |
| 진행중 | 상세, 완료 |
| 완료 | 상세 |
| 취소 | 상세 |

### 7.2 주문 상세 (GET /api/orders/:id)

| 항목 | 내용 |
|------|------|
| 상단 정보 | 주문번호, 상태, 거래처명, 연락처, 주문일, 납기일, 배송 주소 |
| 품목 테이블 | 제품코드, 제품명, 단위, 수량, 단가, 금액 |
| 합계 | 하단 합계 행 (굵은 글씨) |

### 7.3 주문 등록 (POST /api/orders)

| 항목 | 내용 |
|------|------|
| 필수 항목 | 거래처(드롭다운), 품목(1개 이상) |
| 선택 항목 | 납기일 |
| 품목 추가 | 제품 선택 시 단가 자동 입력 → 수량, 단가 입력 → "추가" 버튼 |
| 중복 제품 | 동일 제품 추가 시 수량 합산 |
| 품목 삭제 | 개별 품목 삭제 가능 |
| 합계 | 품목 목록 하단에 자동 합계 표시 |
| 주문번호 | 자동 생성 (접두사 + 날짜 + 순번, 예: ORD20260209001) |

### 7.4 주문 수정 (PUT /api/orders/:id)

| 항목 | 내용 |
|------|------|
| 제한 | '대기' 상태에서만 수정 가능 |
| 동작 | 기존 품목 삭제 후 새 품목으로 교체 |

### 7.5 주문 상태 변경 (PATCH /api/orders/:id/status)

| 항목 | 내용 |
|------|------|
| 유효 상태 | 대기, 진행중, 완료, 취소 |
| 확인 | 상태 변경 전 confirm 대화상자 |

### 7.6 주문 삭제 (DELETE /api/orders/:id)

| 항목 | 내용 |
|------|------|
| 제한 | '대기' 또는 '취소' 상태에서만 삭제 가능 |

---

## 8. 생산 관리

### 8.1 생산 목록 (GET /api/productions)

| 항목 | 내용 |
|------|------|
| 메뉴 | 🏭 생산 관리 |
| 필터 | 상태별 필터 (전체, 대기, 진행중, 완료, 중단) |
| 헤더 버튼 | "+ 생산 등록" |
| 테이블 컬럼 | 생산번호, 제품명, 주문번호, 계획/실적, 불량/폐기, 작업자, 상태(배지), 관리 |
| 관리 버튼 (상태별) | |

| 상태 | 버튼 |
|------|------|
| 대기 | 상세, 시작, 수정, 삭제 |
| 진행중 | 상세, 완료, 중단 |
| 완료 | 상세 |
| 중단 | 상세, 삭제 |

### 8.2 생산 상세 (GET /api/productions/:id)

| 항목 | 내용 |
|------|------|
| 표시 항목 (12개) | 생산번호, 상태, 제품명, 제품코드, 단위, 주문번호, 작업자, 계획수량, 실적수량, 불량수량, 폐기수량, 시작일시, 완료일시 |

### 8.3 생산 등록 (POST /api/productions)

| 항목 | 내용 |
|------|------|
| 필수 항목 | 제품(드롭다운), 계획수량(최소 1) |
| 선택 항목 | 연결 주문('진행중' 주문만 표시), 작업자 |
| 생산번호 | 자동 생성 (접두사 + 날짜 + 순번, 예: PRD20260209001) |

### 8.4 생산 시작 (PATCH /api/productions/:id/start)

| 항목 | 내용 |
|------|------|
| 제한 | '대기' 상태에서만 가능 |
| 입력 | 작업자 이름 (선택, prompt 대화상자) |
| 동작 | 상태='진행중', 시작일시=현재, 작업자 설정 |
| 부가 동작 | 연결 주문이 '대기'이면 → '진행중'으로 변경 |

### 8.5 생산 완료 (PATCH /api/productions/:id/complete)

| 항목 | 내용 |
|------|------|
| 제한 | '진행중' 상태에서만 가능 |
| 모달 입력 | 실적수량(필수, 기본값=계획수량), 불량수량(기본 0), 폐기수량(기본 0) |
| 안내 | "재고에는 (실적수량 - 불량 - 폐기) 만큼 입고됩니다." |
| 동작 | 상태='완료', 완료일시=현재, 품질 데이터 저장 |
| 재고 연동 | 양품수량(실적-불량-폐기) > 0이면 재고 증가 + 이력('입고') 기록 |

### 8.6 생산 중단 (PATCH /api/productions/:id/stop)

| 항목 | 내용 |
|------|------|
| 제한 | '대기' 또는 '진행중'에서 가능 |
| 입력 | 중단 사유 (선택, prompt 대화상자) |
| 동작 | 상태='중단' |

### 8.7 생산 수정 (PUT /api/productions/:id)

| 항목 | 내용 |
|------|------|
| 제한 | '대기' 상태에서만 수정 가능 |

### 8.8 생산 삭제 (DELETE /api/productions/:id)

| 항목 | 내용 |
|------|------|
| 제한 | '대기' 또는 '중단' 상태에서만 삭제 가능 |

---

## 9. 출하 관리

### 9.1 출하 목록 (GET /api/shipments)

| 항목 | 내용 |
|------|------|
| 메뉴 | 🚚 출하 관리 |
| 필터 | 상태별 필터 (전체, 대기, 완료, 취소) |
| 헤더 버튼 | "+ 출하 등록" |
| 테이블 컬럼 | 출하번호, 주문번호, 거래처, 출하일, 상태(배지), 등록일, 관리 |
| 관리 버튼 (상태별) | |

| 상태 | 버튼 |
|------|------|
| 대기 | 상세, 출하완료, 취소, 삭제 |
| 완료 | 상세 |
| 취소 | 상세 |

### 9.2 출하 상세 (GET /api/shipments/:id)

| 항목 | 내용 |
|------|------|
| 상단 정보 | 출하번호, 상태, 주문번호, 납기일, 거래처, 출하일, 연락처, 등록일, 배송주소 |
| 품목 테이블 | 제품코드, 제품명, 단위, 수량 |

### 9.3 출하 등록 (POST /api/shipments)

| 항목 | 내용 |
|------|------|
| 필수 항목 | 주문('진행중' 주문만 표시), 출하일(기본: 오늘) |
| 주문 선택 시 | 주문 품목 자동 로드, 각 품목의 재고량 표시 |
| 출하 수량 | 품목별 개별 입력 (최대 = 현재고) |
| 재고 부족 표시 | 재고 < 주문수량이면 빨간색 |
| 유효성 검사 | 재고 사전 확인 (부족 시 등록 불가) |
| 출하번호 | 자동 생성 (접두사 + 날짜 + 순번, 예: SHP20260209001) |
| 재고 차감 시점 | 등록 시점이 아닌 **출하 완료 시** 차감 |

### 9.4 출하 완료 (PATCH /api/shipments/:id/complete)

| 항목 | 내용 |
|------|------|
| 확인 | "출하 완료 시 재고가 차감됩니다." 경고 |
| 동작 | 재고 재확인 → 품목별 재고 차감 → 이력('출고') 기록 → 상태='완료' |
| 주문 연동 | 주문의 모든 품목이 출하 완료되면 주문 상태도 '완료'로 변경 |
| 실패 조건 | 재고 부족 시 오류 반환 |

### 9.5 출하 취소 (PATCH /api/shipments/:id/cancel)

| 항목 | 내용 |
|------|------|
| 제한 | '완료' 상태는 취소 불가 |
| 동작 | 상태='취소' (재고 변동 없음) |

### 9.6 출하 삭제 (DELETE /api/shipments/:id)

| 항목 | 내용 |
|------|------|
| 제한 | '완료' 상태는 삭제 불가 |

---

## 10. 리포트

### 10.1 리포트 화면

| 항목 | 내용 |
|------|------|
| 메뉴 | 📈 리포트 |
| 탭 | 생산 현황 / 출하 현황 / 매출 현황 / 재고 현황 |

### 10.2 생산 현황

#### 일별 생산 현황 (GET /api/reports/production/daily)

| 항목 | 내용 |
|------|------|
| 파라미터 | start_date, end_date (선택) |
| 대상 | 완료된 생산만 |
| 테이블 컬럼 | 날짜, 생산건수, 실적수량, 불량수량(주황), 폐기수량(빨강) |
| 최대 건수 | 30일 |

#### 제품별 생산 현황 (GET /api/reports/production/by-product)

| 항목 | 내용 |
|------|------|
| 파라미터 | start_date, end_date (선택) |
| 대상 | 완료된 생산만 |
| 테이블 컬럼 | 제품코드/제품명, 생산건수, 실적수량, 불량률 |
| 불량률 | (불량수량 / 실적수량) × 100, > 5%이면 빨강 |

### 10.3 출하 현황 (GET /api/reports/shipment/daily)

| 항목 | 내용 |
|------|------|
| 파라미터 | start_date, end_date (선택) |
| 대상 | 완료된 출하만 |
| 테이블 컬럼 | 날짜, 출하건수, 총수량 |
| 최대 건수 | 30일 |

### 10.4 매출 현황

#### 거래처별 매출 (GET /api/reports/sales/by-customer)

| 항목 | 내용 |
|------|------|
| 파라미터 | start_date, end_date (선택) |
| 대상 | 완료된 주문만 |
| 테이블 컬럼 | 거래처코드/거래처명, 주문건수, 매출액, 비율(%) |
| 합계 | 하단 합계 행 (100%) |

#### 월별 매출 (GET /api/reports/sales/monthly)

| 항목 | 내용 |
|------|------|
| 파라미터 | year (기본: 현재 연도) |
| 대상 | 완료된 주문만 |
| 테이블 컬럼 | 월, 주문건수, 매출액 |
| 표시 | 12개월 전체 |

### 10.5 재고 현황 (GET /api/reports/inventory/status)

| 항목 | 내용 |
|------|------|
| 요약 카드 (4개) | 전체 제품 수, 총 재고 금액(초록), 재고부족(주황), 재고없음(빨강) |
| 재고부족 기준 | 수량 ≤ 10 |
| 재고없음 기준 | 수량 = 0 |
| 테이블 컬럼 | 제품코드, 제품명, 단위, 단가, 현재고(≤10 빨강), 재고금액, 위치 |
| 정렬 | 재고 수량 오름차순 |

---

## 11. 설정

### 11.1 설정 화면

| 항목 | 내용 |
|------|------|
| 메뉴 | ⚙️ 설정 |

### 11.2 기본 설정 (GET/POST /api/settings)

| 설정 항목 | 키 | 기본값 | 설명 |
|-----------|-----|--------|------|
| 회사명 | company_name | 스마트공방 | 시스템 표시 회사명 |
| 주문 접두사 | order_prefix | ORD | 주문번호 생성 시 접두사 |
| 생산 접두사 | production_prefix | PRD | 생산번호 생성 시 접두사 |
| 출하 접두사 | shipment_prefix | SHP | 출하번호 생성 시 접두사 |

### 11.3 샘플 데이터 생성

| 항목 | 내용 |
|------|------|
| 동작 | 제품 5개, 거래처 3개, 재고(각 100개) 자동 생성 |
| 용도 | 테스트 목적 |
| 중복 처리 | 이미 존재하는 데이터는 건너뜀 |

### 11.4 시스템 정보

| 항목 | 값 |
|------|-----|
| 시스템명 | 스마트공방 시스템 |
| 버전 | 1.0.0 |
| 데이터베이스 | SQLite3 |
| 서버 | Node.js + Express |

---

## 12. 데이터베이스 스키마

### 12.1 테이블 목록 (14개)

| 테이블 | 설명 | 주요 관계 |
|--------|------|-----------|
| products | 제품 마스터 | - |
| inventory | 제품별 재고 | → products (1:1) |
| inventory_history | 재고 변동 이력 | → products |
| customers | 거래처 마스터 | - |
| orders | 주문 | → customers |
| order_items | 주문 품목 | → orders, products |
| productions | 생산 | → orders, products |
| shipments | 출하 | → orders |
| shipment_items | 출하 품목 | → shipments, products |
| settings | 시스템 설정 | - |
| companies | 회사 마스터 | - |
| users | 사용자 | → companies |
| sessions | 로그인 세션 | → users |

### 12.2 상세 스키마

#### products
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| product_code | TEXT | UNIQUE, NOT NULL | 제품코드 |
| name | TEXT | NOT NULL | 제품명 |
| unit | TEXT | DEFAULT '개' | 단위 |
| price | REAL | DEFAULT 0 | 단가 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 등록일시 |

#### inventory
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| product_id | INTEGER | UNIQUE, NOT NULL, FK→products(CASCADE) | 제품 ID |
| quantity | INTEGER | DEFAULT 0 | 현재고 수량 |
| location | TEXT | | 위치 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 수정일시 |

#### inventory_history
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| product_id | INTEGER | NOT NULL, FK→products(CASCADE) | 제품 ID |
| change_type | TEXT | NOT NULL | 유형: 입고/출고/사용/조정 |
| quantity | INTEGER | NOT NULL | 변동 수량 (+/-) |
| reason | TEXT | | 사유 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 일시 |

#### customers
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| customer_code | TEXT | UNIQUE, NOT NULL | 거래처코드 |
| name | TEXT | NOT NULL | 거래처명 |
| contact | TEXT | | 연락처 |
| address | TEXT | | 주소 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 등록일시 |

#### orders
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| order_number | TEXT | UNIQUE, NOT NULL | 주문번호 (자동생성) |
| customer_id | INTEGER | NOT NULL, FK→customers | 거래처 ID |
| order_date | DATE | DEFAULT CURRENT_DATE | 주문일 |
| due_date | DATE | | 납기일 |
| status | TEXT | DEFAULT '대기' | 대기/진행중/완료/취소 |
| total_amount | REAL | DEFAULT 0 | 합계 금액 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 등록일시 |

#### order_items
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| order_id | INTEGER | NOT NULL, FK→orders(CASCADE) | 주문 ID |
| product_id | INTEGER | NOT NULL, FK→products | 제품 ID |
| quantity | INTEGER | NOT NULL | 수량 |
| unit_price | REAL | NOT NULL | 단가 |

#### productions
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| production_number | TEXT | UNIQUE, NOT NULL | 생산번호 (자동생성) |
| order_id | INTEGER | FK→orders | 연결 주문 ID |
| product_id | INTEGER | NOT NULL, FK→products | 제품 ID |
| planned_qty | INTEGER | NOT NULL | 계획 수량 |
| actual_qty | INTEGER | DEFAULT 0 | 실적 수량 |
| defect_qty | INTEGER | DEFAULT 0 | 불량 수량 |
| waste_qty | INTEGER | DEFAULT 0 | 폐기 수량 |
| worker | TEXT | | 작업자 |
| status | TEXT | DEFAULT '대기' | 대기/진행중/완료/중단 |
| started_at | DATETIME | | 시작일시 |
| completed_at | DATETIME | | 완료일시 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 등록일시 |

#### shipments
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| shipment_number | TEXT | UNIQUE, NOT NULL | 출하번호 (자동생성) |
| order_id | INTEGER | NOT NULL, FK→orders | 주문 ID |
| shipment_date | DATE | DEFAULT CURRENT_DATE | 출하일 |
| status | TEXT | DEFAULT '대기' | 대기/완료/취소 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 등록일시 |

#### shipment_items
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| shipment_id | INTEGER | NOT NULL, FK→shipments(CASCADE) | 출하 ID |
| product_id | INTEGER | NOT NULL, FK→products | 제품 ID |
| quantity | INTEGER | NOT NULL | 수량 |

#### settings
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| key | TEXT | PK | 설정 키 |
| value | TEXT | | 설정 값 |

#### companies
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| company_code | TEXT | UNIQUE, NOT NULL | 회사코드 |
| name | TEXT | NOT NULL | 회사명 |
| contact | TEXT | | 연락처 |
| address | TEXT | | 주소 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 등록일시 |

#### users
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| username | TEXT | UNIQUE, NOT NULL | 로그인 아이디 |
| password_hash | TEXT | NOT NULL | 비밀번호 해시 (salt:hash) |
| name | TEXT | NOT NULL | 사용자 이름 |
| role | TEXT | DEFAULT 'company_admin' | super_admin / company_admin |
| company_id | INTEGER | FK→companies | 소속 회사 |
| is_active | INTEGER | DEFAULT 1 | 활성 여부 (0/1) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 등록일시 |

#### sessions
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PK, AUTOINCREMENT | |
| user_id | INTEGER | NOT NULL, FK→users(CASCADE) | 사용자 ID |
| token | TEXT | UNIQUE, NOT NULL | 세션 토큰 |
| expires_at | DATETIME | NOT NULL | 만료 시간 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일시 |

---

## 13. 업무 프로세스 흐름

### 13.1 주문 → 생산 → 출하 프로세스

```
[주문 등록] → 상태: 대기
     │
     ├─ [생산 등록 (주문 연결)]
     │       │
     │       ├─ [생산 시작] → 주문 상태: 진행중 (자동)
     │       │
     │       └─ [생산 완료] → 양품 재고 입고 (자동)
     │
     └─ [출하 등록 (주문 연결)]
             │
             └─ [출하 완료] → 재고 차감 (자동)
                              → 전품목 출하 시 주문 상태: 완료 (자동)
```

### 13.2 재고 변동 경로

| 경로 | 유형 | 재고 변동 |
|------|------|-----------|
| 수동 입고 | 입고 | + 증가 |
| 수동 출고/사용 | 출고/사용 | - 감소 |
| 수동 조정 | 조정 | ± 설정값 |
| 생산 완료 | 입고 | + (실적 - 불량 - 폐기) |
| 출하 완료 | 출고 | - 출하수량 |

---

## 14. API 엔드포인트 전체 목록

### 인증 (인증 불필요)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/auth/login | 로그인 |
| POST | /api/auth/logout | 로그아웃 |
| GET | /api/auth/me | 현재 사용자 정보 |

### 대시보드
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/dashboard/summary | 요약 통계 |
| GET | /api/dashboard/recent-orders | 최근 주문 5건 |
| GET | /api/dashboard/recent-productions | 최근 생산 5건 |
| GET | /api/dashboard/inventory-status | 재고 부족 10건 |

### 제품
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/products | 제품 목록 |
| GET | /api/products/:id | 제품 상세 |
| POST | /api/products | 제품 등록 |
| PUT | /api/products/:id | 제품 수정 |
| DELETE | /api/products/:id | 제품 삭제 |

### 재고
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/inventory | 재고 목록 |
| GET | /api/inventory/:product_id | 재고 상세 |
| POST | /api/inventory/receive | 입고 |
| POST | /api/inventory/use | 출고/사용 |
| POST | /api/inventory/adjust | 재고 조정 |
| PUT | /api/inventory/:product_id/location | 위치 수정 |
| GET | /api/inventory/:product_id/history | 제품별 이력 |
| GET | /api/inventory/history/all | 전체 이력 |

### 거래처
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/customers | 거래처 목록 |
| GET | /api/customers/:id | 거래처 상세 |
| POST | /api/customers | 거래처 등록 |
| PUT | /api/customers/:id | 거래처 수정 |
| DELETE | /api/customers/:id | 거래처 삭제 |

### 주문
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/orders | 주문 목록 (필터: status, customer_id) |
| GET | /api/orders/:id | 주문 상세 |
| POST | /api/orders | 주문 등록 |
| PUT | /api/orders/:id | 주문 수정 |
| PATCH | /api/orders/:id/status | 상태 변경 |
| DELETE | /api/orders/:id | 주문 삭제 |

### 생산
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/productions | 생산 목록 (필터: status, product_id) |
| GET | /api/productions/:id | 생산 상세 |
| POST | /api/productions | 생산 등록 |
| PUT | /api/productions/:id | 생산 수정 |
| PATCH | /api/productions/:id/start | 생산 시작 |
| PATCH | /api/productions/:id/complete | 생산 완료 |
| PATCH | /api/productions/:id/stop | 생산 중단 |
| DELETE | /api/productions/:id | 생산 삭제 |

### 출하
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/shipments | 출하 목록 (필터: status, order_id) |
| GET | /api/shipments/:id | 출하 상세 |
| POST | /api/shipments | 출하 등록 |
| PATCH | /api/shipments/:id/complete | 출하 완료 |
| PATCH | /api/shipments/:id/cancel | 출하 취소 |
| DELETE | /api/shipments/:id | 출하 삭제 |

### 리포트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/reports/production/daily | 일별 생산 현황 |
| GET | /api/reports/production/by-product | 제품별 생산 현황 |
| GET | /api/reports/shipment/daily | 일별 출하 현황 |
| GET | /api/reports/sales/by-customer | 거래처별 매출 |
| GET | /api/reports/sales/monthly | 월별 매출 |
| GET | /api/reports/inventory/status | 재고 현황 |
| GET | /api/reports/inventory/history | 재고 이력 |

### 설정
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/settings | 전체 설정 |
| GET | /api/settings/:key | 설정 조회 |
| PUT | /api/settings/:key | 설정 수정 |
| POST | /api/settings/bulk | 설정 일괄 수정 |
| DELETE | /api/settings/:key | 설정 삭제 |

### 사용자
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/users/companies/list | 회사 목록 |
| GET | /api/users | 사용자 목록 |
| GET | /api/users/:id | 사용자 상세 |
| POST | /api/users | 사용자 등록 (super_admin) |
| PUT | /api/users/:id | 사용자 수정 |
| DELETE | /api/users/:id | 사용자 삭제 (super_admin) |

---

## 15. UI/UX 공통 사항

### 15.1 레이아웃
- **사이드바**: 좌측 고정 240px, 다크 테마, 10개 메뉴 (회원관리는 조건부 표시)
- **헤더**: 페이지 제목 + 액션 버튼 + 사용자 정보/로그아웃
- **컨텐츠**: 동적 렌더링 영역
- **모바일**: 768px 이하에서 사이드바 숨김, 햄버거 메뉴 활성화

### 15.2 공통 컴포넌트
| 컴포넌트 | 설명 |
|----------|------|
| 모달 | 등록/수정/상세 표시, ESC 또는 외부 클릭으로 닫기 |
| 토스트 | 우측 상단 알림 (info/success/warning/error), 3초 후 자동 소멸 |
| 배지 | 상태 표시 (대기=회색, 진행중=파랑, 완료=초록, 취소=빨강, 중단=주황) |
| 로딩 | "로딩 중..." 텍스트 |
| 빈 상태 | 아이콘 + "등록된 데이터가 없습니다." |

### 15.3 색상 체계
| 용도 | 색상 | 코드 |
|------|------|------|
| 기본 | 파란색 | #3498db |
| 성공 | 초록색 | #2ecc71 |
| 위험 | 빨간색 | #e74c3c |
| 경고 | 주황색 | #f39c12 |
| 텍스트 | 다크 | #2c3e50 |
| 보조텍스트 | 회색 | #7f8c8d |
| 배경 | 밝은회색 | #ecf0f1 |

### 15.4 숫자/날짜 포맷
| 유형 | 포맷 | 예시 |
|------|------|------|
| 숫자 | 한국식 천단위 구분 | 1,500,000 |
| 날짜 | ko-KR toLocaleDateString | 2026. 2. 9. |
| 일시 | ko-KR toLocaleString | 2026. 2. 9. 오후 3:00:00 |

---

**총 API 엔드포인트: 49개** | **총 DB 테이블: 14개** | **총 페이지: 10개**
