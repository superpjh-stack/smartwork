# UI 현대화 (UI Modernization) Planning Document

> **Summary**: 스마트공방 시스템의 UI/UX를 2025-2026 트렌드에 맞는 현대적 디자인으로 전면 개선
>
> **Project**: 스마트공방 관리 시스템
> **Version**: 1.1.0
> **Author**: AI Architect
> **Date**: 2026-02-19
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 스마트공방 시스템은 2010년대 중반 스타일의 플랫 디자인으로 구현되어 있어, 시각적 완성도와 사용자 경험이 현대적 기준에 미치지 못한다. 본 계획은 기존 기능을 유지하면서 **디자인 품질, 사용성, 접근성**을 현대적 수준으로 끌어올리는 것을 목적으로 한다.

### 1.2 Background

**현재 UI의 문제점 분석:**

| 영역 | 현재 상태 | 문제점 |
|------|-----------|--------|
| **아이콘** | Emoji (📊📦📋 등) 사용 | 크기/스타일 불균일, 전문성 부족, 렌더링 OS 종속 |
| **색상 체계** | 단순 플랫 컬러 6종 | 깊이감 없음, 시각적 계층 약함, 모노톤 회색 배경 |
| **타이포그래피** | Segoe UI 단일 폰트 | 가독성은 양호하나 시각적 개성 부재, 한글 렌더링 최적화 미흡 |
| **레이아웃** | 다크 사이드바 + 흰색 헤더 | 2010년대 관리자 페이지 전형, 컨텐츠 밀도 미최적화 |
| **컴포넌트** | 기본 카드/테이블/배지 | 그림자/라운딩 미미, 상태 표현력 약함 |
| **인터랙션** | 최소 transition(0.3s) | 피드백 부족, 마이크로 애니메이션 없음 |
| **데이터 시각화** | 테이블 only | 차트/그래프 없음, 대시보드 임팩트 약함 |
| **반응형** | 768px 단일 브레이크포인트 | 태블릿 대응 미흡, 모바일 UX 기초 수준 |
| **다크모드** | 미지원 | 현대 웹앱의 기본 기능 부재 |
| **접근성** | 기본 수준 | ARIA 속성 미비, 키보드 네비게이션 불완전 |

### 1.3 Related Documents

- Requirements: `ssf_req_v1.1.md` (기능명세서 v1.1.0)
- Current CSS: `public/css/style.css` (982줄)
- Current HTML: `public/index.html`
- Current JS Components: `public/js/components/*.js` (12개 파일)

---

## 2. Scope

### 2.1 In Scope

- [x] **디자인 시스템 수립**: 색상, 타이포그래피, 간격, 컴포넌트 토큰 정의
- [x] **아이콘 시스템 교체**: Emoji → SVG 아이콘 (Lucide Icons)
- [x] **색상 체계 리뉴얼**: 현대적 팔레트 + 다크모드 지원
- [x] **타이포그래피 개선**: Pretendard 웹폰트 적용 (한글 최적화)
- [x] **레이아웃 개편**: 좌측 사이드바 리디자인, 헤더 개선
- [x] **카드/테이블/배지/버튼 전면 리디자인**
- [x] **대시보드 데이터 시각화**: CSS 기반 차트 + 시각적 임팩트 강화
- [x] **마이크로 인터랙션**: 트랜지션, 호버 효과, 로딩 애니메이션
- [x] **반응형 개선**: 3단계 브레이크포인트 (모바일/태블릿/데스크톱)
- [x] **접근성 향상**: ARIA, 포커스 관리, 키보드 네비게이션

### 2.2 Out of Scope

- React/Vue/Next.js 등 프레임워크 전환 (Vanilla JS SPA 유지)
- 백엔드 API 변경
- 새로운 기능 추가 (기존 기능 UI만 개선)
- 전면적인 JavaScript 리팩토링 (필요 최소한만)
- 다국어 지원 (i18n)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Lucide Icons SVG 아이콘 시스템으로 전환 (CDN 또는 인라인 SVG) | High | Pending |
| FR-02 | CSS Custom Properties 기반 디자인 토큰 체계 구축 | High | Pending |
| FR-03 | 라이트/다크 테마 전환 지원 (시스템 설정 연동 + 수동 토글) | Medium | Pending |
| FR-04 | 대시보드 요약 카드에 트렌드 인디케이터(전일 대비 증감) 시각화 추가 | Medium | Pending |
| FR-05 | CSS 기반 미니 차트 (프로그레스바/도넛 차트) 적용 | Medium | Pending |
| FR-06 | 모달 트랜지션 개선 (스케일 + 페이드 인) | Low | Pending |
| FR-07 | 토스트 알림 리디자인 (아이콘 + 프로그레스바 타이머) | Low | Pending |
| FR-08 | 테이블 행 호버 시 하이라이트 + 선택 상태 시각 피드백 | Medium | Pending |
| FR-09 | 로그인 화면 현대적 리디자인 (일러스트 + 그래디언트 개선) | Medium | Pending |
| FR-10 | 사이드바 네비게이션 리디자인 (아이콘 강조, 호버 효과, 현재 위치 인디케이터 강화) | High | Pending |
| FR-11 | 빈 상태(Empty State) 컴포넌트 SVG 일러스트 적용 | Low | Pending |
| FR-12 | 스켈레톤 로딩 UI 적용 (텍스트 → 스켈레톤 애니메이션) | Medium | Pending |
| FR-13 | 버튼 컴포넌트 리디자인 (호버/액티브/포커스 상태 개선) | High | Pending |
| FR-14 | 폼 입력 컴포넌트 리디자인 (포커스 링, 유효성 상태 시각화) | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | CSS 파일 크기 ≤ 50KB (gzip 전) | Build output 확인 |
| Performance | First Contentful Paint < 1.5s | Lighthouse |
| Accessibility | 색상 대비 WCAG AA 이상 | axe-core 검증 |
| Accessibility | 키보드 탭 순서 논리적 | 수동 검증 |
| 호환성 | Chrome/Edge/Safari/Firefox 최신 2버전 | 크로스 브라우저 테스트 |
| 반응형 | 360px ~ 1920px 범위 정상 표시 | 디바이스 테스트 |

---

## 4. 디자인 제안: 현대적 UI 방향

### 4.1 디자인 컨셉: "Clean Industrial"

제조/공방 MES 시스템의 특성을 반영하면서 현대적 SaaS 수준의 세련된 디자인.

**핵심 키워드**: 깔끔함, 신뢰감, 데이터 중심, 산업적 견고함

### 4.2 색상 시스템 (신규)

```
Light Theme:
┌─────────────────────────────────────────────────────┐
│  Primary    : #2563EB (Blue 600)     - 주 액션      │
│  Primary-50 : #EFF6FF               - 배경 하이라이트│
│  Primary-100: #DBEAFE               - 선택 영역     │
│  Primary-700: #1D4ED8               - 호버/액티브    │
│                                                      │
│  Success    : #059669 (Emerald 600)  - 완료/성공     │
│  Warning    : #D97706 (Amber 600)    - 경고/주의     │
│  Danger     : #DC2626 (Red 600)      - 오류/위험     │
│  Info       : #0891B2 (Cyan 600)     - 정보          │
│                                                      │
│  Gray-50    : #F9FAFB               - 페이지 배경    │
│  Gray-100   : #F3F4F6               - 카드 배경      │
│  Gray-200   : #E5E7EB               - 보더           │
│  Gray-500   : #6B7280               - 보조 텍스트    │
│  Gray-700   : #374151               - 본문 텍스트    │
│  Gray-900   : #111827               - 제목 텍스트    │
│  White      : #FFFFFF               - 카드/모달      │
│                                                      │
│  Sidebar    : #0F172A (Slate 900)    - 사이드바      │
│  Sidebar-hover: #1E293B (Slate 800) - 사이드바 호버  │
└─────────────────────────────────────────────────────┘

Dark Theme:
┌─────────────────────────────────────────────────────┐
│  Primary    : #3B82F6 (Blue 500)     - 밝게 조정     │
│  Background : #0F172A               - 기본 배경      │
│  Surface    : #1E293B               - 카드 배경      │
│  Border     : #334155               - 보더           │
│  Text       : #F1F5F9               - 본문 텍스트    │
│  Text-muted : #94A3B8               - 보조 텍스트    │
│  Sidebar    : #020617               - 사이드바       │
└─────────────────────────────────────────────────────┘
```

### 4.3 타이포그래피 (신규)

```
Font Stack: 'Pretendard Variable', 'Pretendard', -apple-system,
            BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

Scale:
  --text-xs   : 0.75rem / 1rem     (12px) — 보조 정보, 배지
  --text-sm   : 0.875rem / 1.25rem (14px) — 테이블, 캡션
  --text-base : 1rem / 1.5rem      (16px) — 본문
  --text-lg   : 1.125rem / 1.75rem (18px) — 카드 제목
  --text-xl   : 1.25rem / 1.75rem  (20px) — 섹션 제목
  --text-2xl  : 1.5rem / 2rem      (24px) — 페이지 제목
  --text-3xl  : 1.875rem / 2.25rem (30px) — 대시보드 숫자

Weight:
  --font-normal : 400 — 본문
  --font-medium : 500 — 라벨, 테이블 헤더
  --font-semibold: 600 — 소제목, 강조
  --font-bold   : 700 — 페이지 제목, KPI 숫자
```

### 4.4 간격 시스템 (8px Grid)

```
--space-1  : 4px     (0.25rem)
--space-2  : 8px     (0.5rem)
--space-3  : 12px    (0.75rem)
--space-4  : 16px    (1rem)
--space-5  : 20px    (1.25rem)
--space-6  : 24px    (1.5rem)
--space-8  : 32px    (2rem)
--space-10 : 40px    (2.5rem)
--space-12 : 48px    (3rem)
```

### 4.5 컴포넌트 디자인 비교

#### 사이드바: 현재 vs 신규

```
현재:                              신규:
┌──────────────┐                  ┌──────────────────┐
│ 스마트공방    │                  │  🏭              │
│              │                  │ 스마트공방        │
│ 📊 대시보드  │                  │ Smart Factory MES │
│ 📦 제품 관리 │                  ├──────────────────┤
│ 📋 재고 관리 │                  │                  │
│ 🏢 거래처    │                  │ ◻ 대시보드       │ ← 좌측 인디케이터 바
│ 📝 주문 관리 │                  │ ◻ 제품 관리      │   + SVG 아이콘
│ 🏭 생산 관리 │                  │ ◻ 재고 관리      │   + 호버 시 배경 슬라이드
│ 🚚 출하 관리 │                  │ ◻ 거래처 관리    │
│ 📊 KPI 관리  │                  │ ◻ 주문 관리      │
│ 📈 리포트    │                  ├──── 운영 ────────┤ ← 섹션 구분 라벨
│ ⚙️ 설정     │                  │ ◻ 생산 관리      │
│              │                  │ ◻ 출하 관리      │
└──────────────┘                  ├──── 분석 ────────┤
                                  │ ◻ KPI 관리  ▾    │
                                  │   ├ 생산성       │
                                  │   └ 품질         │
                                  │ ◻ 리포트         │
                                  ├──────────────────┤
                                  │ ◻ 설정           │
                                  │ ◻ 회원 관리      │
                                  └──────────────────┘
```

#### 대시보드 카드: 현재 vs 신규

```
현재:                              신규:
┌─────────────┐                   ┌──────────────────┐
│    150       │                   │ ┌─┐              │
│ 등록 제품    │                   │ │▤│ 등록 제품     │ ← 아이콘 + 라벨 상단
│             │                   │ └─┘              │
└─────────────┘                   │  150              │ ← 큰 숫자
                                  │  ▲ 12 (전일대비)  │ ← 트렌드 인디케이터
                                  │ ████████░░░ 75%   │ ← 미니 프로그레스 (선택)
                                  └──────────────────┘
```

#### 테이블: 현재 vs 신규

```
현재:                                    신규:
┌─────┬────┬────┬──────┐               ┌──────┬─────┬────────┬──────────┐
│ 코드│이름│상태│ 관리 │               │  코드 │ 이름│  상태  │   관리   │
├─────┼────┼────┼──────┤               ╞══════╪═════╪════════╪══════════╡
│P001 │제품│대기│수정삭│               │ P001  │제품A│ ● 대기 │ ⋯ 더보기 │ ← dot 배지
│P002 │제품│완료│수정삭│               │ P002  │제품B│ ● 완료 │ ⋯ 더보기 │ ← 액션 드롭다운
└─────┴────┴────┴──────┘               └──────┴─────┴────────┴──────────┘
                                         행 호버 시: 좌측 강조 바 + 배경 색상 전환
                                         zebra striping (짝수 행 미세 배경)
```

#### 배지: 현재 vs 신규

```
현재:       신규:
[대기]      ● 대기     ← dot + 텍스트 (soft background)
[진행중]    ● 진행중   ← 각 상태별 파스텔 배경 + 진한 텍스트
[완료]      ● 완료     ← 녹색 계열 소프트
[취소]      ● 취소     ← 빨강 계열 소프트
[중단]      ● 중단     ← 주황 계열 소프트
```

#### 모달: 현재 vs 신규

```
현재:                              신규:
┌──────────────────┐              ┌────────────────────────┐
│ 제목        × │              │                        │
│─────────────────│              │  제목                 × │
│ 내용            │              │  부제목 (선택)          │
│                 │              │────────────────────────│
│─────────────────│              │                        │
│       [저장]    │              │  내용                  │
└──────────────────┘              │                        │
  (즉시 나타남)                   │────────────────────────│
                                  │  [취소]       [저장] │
                                  └────────────────────────┘
                                    (스케일+페이드 애니메이션)
                                    (backdrop-filter: blur)
```

### 4.6 로그인 화면 리디자인

```
현재:                              신규:
┌──────────────────────┐          ┌──────────────────────────────────┐
│                      │          │          │                       │
│  ┌────────────────┐  │          │  산업/    │   ┌───────────────┐  │
│  │ 스마트공방      │  │          │  공장     │   │ 🏭            │  │
│  │ 로그인하세요   │  │          │  일러스트  │   │ 스마트공방     │  │
│  │ ┌────────────┐│  │          │  또는      │   │               │  │
│  │ │ 아이디     ││  │          │  브랜드    │   │ ┌───────────┐ │  │
│  │ ├────────────┤│  │          │  그래픽    │   │ │ 아이디    │ │  │
│  │ │ 비밀번호   ││  │          │           │   │ ├───────────┤ │  │
│  │ ├────────────┤│  │          │           │   │ │ 비밀번호  │ │  │
│  │ │ [로그인]   ││  │          │           │   │ ├───────────┤ │  │
│  │ └────────────┘│  │          │           │   │ │ [로그인]  │ │  │
│  └────────────────┘  │          │           │   │ └───────────┘ │  │
│   (단색 그래디언트)   │          │           │   │  v1.1.0       │  │
└──────────────────────┘          └───────────┴───┴───────────────┘  │
                                   (2분할 레이아웃, Glassmorphism 카드)
```

---

## 5. Success Criteria

### 5.1 Definition of Done

- [ ] 모든 12개 페이지에 새 디자인 시스템 적용
- [ ] 다크모드 토글 정상 작동
- [ ] 모바일/태블릿/데스크톱 3단계 반응형 정상
- [ ] 모든 기존 기능 동작 유지 (회귀 없음)
- [ ] Emoji 아이콘 완전 제거, SVG 아이콘 교체 완료

### 5.2 Quality Criteria

- [ ] WCAG AA 색상 대비 충족
- [ ] CSS 파일 gzip 50KB 이내
- [ ] Chrome Lighthouse Performance 90+ (데스크톱)
- [ ] 크로스 브라우저 검증 (Chrome, Edge, Safari, Firefox)

---

## 6. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CSS 변경으로 기존 기능 깨짐 | High | Medium | 페이지별 점진적 적용 + 스크린샷 비교 |
| 웹폰트 로딩으로 FCP 지연 | Medium | Medium | font-display: swap + preload |
| 다크모드 색상 대비 부족 | Medium | Low | 라이트/다크 각각 WCAG AA 검증 |
| SVG 아이콘 CDN 의존 | Low | Low | fallback 또는 인라인 SVG 사용 |
| 모바일 레이아웃 깨짐 | Medium | Medium | 실기기 + 에뮬레이터 동시 검증 |
| JS 컴포넌트 innerHTML과 CSS 클래스 불일치 | High | Medium | 변경된 클래스명 전수 검사 |

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Starter** | Simple structure | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | ☒ |
| **Enterprise** | Strict layer separation, microservices | ☐ |

### 7.2 Key Technical Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 아이콘 시스템 | Lucide CDN / Heroicons / 인라인 SVG | Lucide CDN | 경량, MES 도메인에 적합한 아이콘 풍부, unpkg CDN |
| 웹폰트 | Pretendard / Noto Sans KR / Spoqa | Pretendard | 한글 최적화, 가변 폰트, CDN 지원, Apple SF 유사 |
| CSS 구조 | 단일 파일 / 모듈 분리 / CSS-in-JS | 단일 파일 (섹션 분리) | 현재 구조 유지, 전환 비용 최소화 |
| 다크모드 구현 | CSS prefers-color-scheme / 클래스 토글 | 클래스 토글 + prefers-color-scheme | 사용자 선택 우선 + 시스템 기본값 |
| 차트 | Chart.js / CSS 기반 / D3.js | CSS 기반 미니 차트 | 외부 의존성 최소화, 경량 |
| 그림자 시스템 | box-shadow / filter: drop-shadow | box-shadow (3단계) | 범용성, 성능 |

### 7.3 파일 구조 (변경 최소화)

```
public/
├── css/
│   └── style.css          ← 전면 리디자인 (CSS Custom Properties 기반)
├── index.html             ← 아이콘 CDN 추가 + 웹폰트 link + 테마 토글 버튼
├── js/
│   ├── api.js             ← 변경 없음
│   ├── app.js             ← 테마 토글 로직 추가 (최소 변경)
│   └── components/
│       ├── dashboard.js   ← 카드 HTML 구조 개선 (아이콘 + 트렌드)
│       ├── products.js    ← 테이블 클래스 업데이트
│       └── ...            ← 기타 컴포넌트 HTML 클래스 업데이트
```

---

## 8. Implementation Strategy

### 8.1 구현 순서 (의존성 기반)

```
Phase 1: Foundation (기반 작업)
├── 1-1. CSS 디자인 토큰 정의 (:root 변수)
├── 1-2. Pretendard 웹폰트 적용
├── 1-3. Lucide Icons CDN 연동
└── 1-4. 다크모드 CSS 변수 셋 구축

Phase 2: Core Components (핵심 컴포넌트)
├── 2-1. 버튼 시스템 리디자인
├── 2-2. 폼 입력 컴포넌트 리디자인
├── 2-3. 배지/태그 시스템 리디자인
├── 2-4. 카드 컴포넌트 리디자인
├── 2-5. 테이블 컴포넌트 리디자인
└── 2-6. 모달/토스트 리디자인

Phase 3: Layout (레이아웃)
├── 3-1. 사이드바 리디자인 (아이콘 + 섹션 구분)
├── 3-2. 헤더 리디자인 (사용자 정보 + 테마 토글)
├── 3-3. 로그인 화면 리디자인
└── 3-4. 반응형 브레이크포인트 재설계 (360/768/1024/1440)

Phase 4: Pages (페이지별 적용)
├── 4-1. 대시보드 (카드 + 미니차트 + 트렌드)
├── 4-2. 제품/재고/거래처 관리
├── 4-3. 주문/생산/출하 관리
├── 4-4. KPI 관리 (프로그레스바 개선)
├── 4-5. 리포트
└── 4-6. 설정/회원 관리

Phase 5: Polish (마감)
├── 5-1. 마이크로 인터랙션 (트랜지션/애니메이션)
├── 5-2. 스켈레톤 로딩 UI
├── 5-3. 빈 상태 SVG 일러스트
├── 5-4. 접근성 검증 및 보완
└── 5-5. 크로스 브라우저/반응형 최종 QA
```

### 8.2 예상 변경 파일

| 파일 | 변경 유형 | 변경 규모 |
|------|-----------|-----------|
| `public/css/style.css` | 전면 리디자인 | 대규모 (1500줄+) |
| `public/index.html` | 구조 변경 (CDN 추가, 사이드바, 테마 토글) | 중규모 |
| `public/js/app.js` | 테마 로직 + 아이콘 헬퍼 추가 | 소규모 |
| `public/js/components/dashboard.js` | 카드 HTML 구조 변경 | 중규모 |
| `public/js/components/*.js` (11개) | 클래스명/HTML 구조 업데이트 | 소~중규모 |

---

## 9. Next Steps

1. [ ] Plan 문서 리뷰 및 승인
2. [ ] Design 문서 작성 (`ui-modernization.design.md`)
3. [ ] Phase 1 (Foundation) 구현 시작
4. [ ] 페이지별 점진적 적용

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-19 | Initial draft — 현재 UI 분석 + 현대화 방향 제시 | AI Architect |
