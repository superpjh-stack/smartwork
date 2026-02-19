# UI 현대화 (UI Modernization) Design Document

> **Summary**: 스마트공방 시스템의 CSS/HTML/JS를 현대적 디자인 시스템으로 전면 리디자인하는 구현 설계서
>
> **Project**: 스마트공방 관리 시스템
> **Version**: 1.1.0
> **Author**: AI Architect
> **Date**: 2026-02-19
> **Status**: Draft
> **Planning Doc**: [ui-modernization.plan.md](../01-plan/features/ui-modernization.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **시각적 현대화**: 2025-2026 SaaS 대시보드 수준의 시각 품질 달성
2. **디자인 시스템 구축**: CSS Custom Properties 기반 일관된 디자인 토큰
3. **다크모드 지원**: 시스템 설정 연동 + 수동 토글
4. **접근성 강화**: WCAG AA 충족, 키보드 네비게이션 완성
5. **최소 변경 원칙**: 기존 Vanilla JS SPA 구조 유지, CSS 중심 리디자인

### 1.2 Design Principles

- **Progressive Enhancement**: 기본 기능은 CSS 없이도 동작, CSS가 시각적 품질 담당
- **Token-First**: 모든 색상/크기/간격은 CSS 변수로 정의, 하드코딩 금지
- **Mobile-First**: 기본 스타일은 모바일, media query로 확장
- **Semantic Color**: 색상은 용도별 시맨틱 네이밍 (--color-success, --color-danger)

---

## 2. Architecture

### 2.1 파일 변경 아키텍처

```
변경 전:                          변경 후:
┌──────────────────────┐         ┌──────────────────────┐
│ index.html           │         │ index.html           │ ← CDN 추가, 사이드바 구조 변경,
│   └ style.css (982L) │         │   └ style.css (1800L)│    테마 토글 버튼 추가
│   └ app.js           │         │   └ app.js           │ ← 테마/아이콘 헬퍼 추가 (~40줄)
│   └ components/*.js  │         │   └ components/*.js  │ ← HTML 클래스/구조 업데이트
└──────────────────────┘         └──────────────────────┘
```

### 2.2 CSS 구조 설계

```
style.css 섹션 구조:
┌─────────────────────────────────────────┐
│ 0. Reset & Base                         │ ← *, :root, body
│ 1. Design Tokens (Light)                │ ← :root { --color-*, --space-*, --radius-* }
│ 2. Design Tokens (Dark)                 │ ← [data-theme="dark"] { ... }
│ 3. Typography                           │ ← 웹폰트, 텍스트 유틸리티
│ 4. Layout                               │ ← .app-container, .sidebar, .main-content
│ 5. Sidebar                              │ ← .sidebar, .nav-item, .nav-group
│ 6. Header                               │ ← .content-header, .user-info
│ 7. Components - Buttons                 │ ← .btn, .btn-primary, etc.
│ 8. Components - Forms                   │ ← .form-group, .form-control
│ 9. Components - Cards                   │ ← .card, .stat-card, .kpi-card
│ 10. Components - Tables                 │ ← table, th, td
│ 11. Components - Badges                 │ ← .badge, .badge-*
│ 12. Components - Modals                 │ ← .modal-overlay, .modal
│ 13. Components - Toast                  │ ← .toast-container, .toast
│ 14. Components - Tabs                   │ ← .tabs, .tab
│ 15. Components - Filters                │ ← .filter-bar, .search-box
│ 16. States - Loading & Empty            │ ← .loading, .empty-state, .skeleton
│ 17. Dashboard Specific                  │ ← .dashboard-grid, .stat-card enhancements
│ 18. KPI Specific                        │ ← .kpi-*, progress bars
│ 19. Login Page                          │ ← .login-container, .login-card
│ 20. Utilities                           │ ← .text-danger, .text-success, etc.
│ 21. Animations                          │ ← @keyframes
│ 22. Responsive - Tablet (768px)         │
│ 23. Responsive - Desktop (1024px)       │
│ 24. Responsive - Wide (1440px)          │
└─────────────────────────────────────────┘
```

### 2.3 외부 의존성

| Resource | Method | URL | Purpose |
|----------|--------|-----|---------|
| Pretendard | CDN `<link>` | `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css` | 한글 최적화 가변 폰트 |
| Lucide Icons | CDN `<script>` | `https://unpkg.com/lucide@latest` | SVG 아이콘 시스템 |

---

## 3. Design Token 상세 정의

### 3.1 Color Tokens (Light Theme)

```css
:root {
  /* === Primary === */
  --color-primary-50: #EFF6FF;
  --color-primary-100: #DBEAFE;
  --color-primary-200: #BFDBFE;
  --color-primary-500: #3B82F6;
  --color-primary: #2563EB;
  --color-primary-700: #1D4ED8;

  /* === Semantic === */
  --color-success: #059669;
  --color-success-light: #D1FAE5;
  --color-success-dark: #065F46;
  --color-warning: #D97706;
  --color-warning-light: #FEF3C7;
  --color-warning-dark: #92400E;
  --color-danger: #DC2626;
  --color-danger-light: #FEE2E2;
  --color-danger-dark: #991B1B;
  --color-info: #0891B2;
  --color-info-light: #CFFAFE;
  --color-info-dark: #155E75;

  /* === Neutral === */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* === Surface === */
  --color-bg: #F9FAFB;
  --color-surface: #FFFFFF;
  --color-surface-hover: #F3F4F6;
  --color-border: #E5E7EB;
  --color-border-strong: #D1D5DB;

  /* === Text === */
  --color-text: #111827;
  --color-text-secondary: #6B7280;
  --color-text-tertiary: #9CA3AF;
  --color-text-inverse: #FFFFFF;

  /* === Sidebar === */
  --sidebar-bg: #0F172A;
  --sidebar-hover: #1E293B;
  --sidebar-active: rgba(59, 130, 246, 0.15);
  --sidebar-text: rgba(255, 255, 255, 0.7);
  --sidebar-text-active: #FFFFFF;
  --sidebar-section: rgba(255, 255, 255, 0.4);
  --sidebar-indicator: #3B82F6;
}
```

### 3.2 Color Tokens (Dark Theme)

```css
[data-theme="dark"] {
  --color-primary-50: rgba(59, 130, 246, 0.1);
  --color-primary-100: rgba(59, 130, 246, 0.2);
  --color-primary: #3B82F6;
  --color-primary-700: #60A5FA;

  --color-success: #34D399;
  --color-success-light: rgba(52, 211, 153, 0.15);
  --color-warning: #FBBF24;
  --color-warning-light: rgba(251, 191, 36, 0.15);
  --color-danger: #F87171;
  --color-danger-light: rgba(248, 113, 113, 0.15);
  --color-info: #22D3EE;
  --color-info-light: rgba(34, 211, 238, 0.15);

  --color-bg: #0F172A;
  --color-surface: #1E293B;
  --color-surface-hover: #334155;
  --color-border: #334155;
  --color-border-strong: #475569;

  --color-text: #F1F5F9;
  --color-text-secondary: #94A3B8;
  --color-text-tertiary: #64748B;

  --sidebar-bg: #020617;
  --sidebar-hover: #0F172A;
}
```

### 3.3 Spacing Tokens

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-1-5: 0.375rem;/* 6px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
}
```

### 3.4 Typography Tokens

```css
:root {
  --font-sans: 'Pretendard Variable', 'Pretendard', -apple-system,
               BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto,
               'Helvetica Neue', sans-serif;

  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */

  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### 3.5 Effect Tokens

```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04);

  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;

  --sidebar-width: 260px;
}
```

---

## 4. Component 상세 설계

### 4.1 Sidebar (사이드바)

**현재 → 변경:**

| 속성 | 현재 | 변경 |
|------|------|------|
| 너비 | 240px | 260px |
| 배경 | `#2c3e50` | `#0F172A` (더 깊은 네이비) |
| 아이콘 | Emoji | Lucide SVG (20px) |
| 구분 | 없음 | 섹션 라벨 (기본, 운영, 분석, 시스템) |
| 활성 표시 | 좌측 3px border | 좌측 3px bar + 배경 highlight |
| 호버 | 단순 배경 변경 | 부드러운 배경 슬라이드 + 아이콘 밝기 |

**HTML 구조 변경 (index.html):**

```html
<!-- 사이드바: 변경 전 -->
<a href="#" class="nav-item" data-page="dashboard">
  <span class="nav-icon">📊</span>
  <span>대시보드</span>
</a>

<!-- 사이드바: 변경 후 -->
<div class="nav-section-label">기본</div>
<a href="#" class="nav-item" data-page="dashboard">
  <i data-lucide="layout-dashboard" class="nav-icon"></i>
  <span class="nav-label">대시보드</span>
</a>
```

**Lucide 아이콘 매핑:**

| 메뉴 | 현재 Emoji | Lucide Icon Name |
|------|-----------|-----------------|
| 대시보드 | 📊 | `layout-dashboard` |
| 제품 관리 | 📦 | `package` |
| 재고 관리 | 📋 | `warehouse` |
| 거래처 관리 | 🏢 | `building-2` |
| 주문 관리 | 📝 | `clipboard-list` |
| 생산 관리 | 🏭 | `factory` |
| 출하 관리 | 🚚 | `truck` |
| KPI 관리 | 📊 | `bar-chart-3` |
| - 생산성 | (없음) | `trending-up` |
| - 품질 | (없음) | `shield-check` |
| 리포트 | 📈 | `file-bar-chart` |
| 설정 | ⚙️ | `settings` |
| 회원 관리 | 👤 | `users` |

**사이드바 섹션 구분:**

```
┌────────────────────────┐
│ 로고 + 시스템명         │
├────────────────────────┤
│ ── 기본 ──             │
│  대시보드               │
│  제품 관리              │
│  재고 관리              │
│  거래처 관리            │
│  주문 관리              │
├────────────────────────┤
│ ── 운영 ──             │
│  생산 관리              │
│  출하 관리              │
├────────────────────────┤
│ ── 분석 ──             │
│  KPI 관리 ▾            │
│    ├ 생산성             │
│    └ 품질               │
│  리포트                 │
├────────────────────────┤
│ ── 시스템 ──           │
│  설정                   │
│  회원 관리 (조건부)     │
└────────────────────────┘
```

**CSS 핵심 스타일:**

```css
.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-header {
  padding: var(--space-6) var(--space-5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-header h1 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  letter-spacing: -0.02em;
}

.sidebar-header .sidebar-subtitle {
  font-size: var(--text-xs);
  color: var(--sidebar-section);
  margin-top: var(--space-1);
}

.nav-section-label {
  padding: var(--space-4) var(--space-5) var(--space-2);
  font-size: 0.6875rem;   /* 11px */
  font-weight: var(--font-semibold);
  color: var(--sidebar-section);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2-5) var(--space-5);   /* 10px 20px */
  margin: var(--space-0-5) var(--space-2);    /* 2px 8px */
  border-radius: var(--radius-md);
  color: var(--sidebar-text);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text-active);
}

.nav-item.active {
  background: var(--sidebar-active);
  color: var(--sidebar-text-active);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--sidebar-indicator);
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-item.active .nav-icon,
.nav-item:hover .nav-icon {
  opacity: 1;
}
```

---

### 4.2 Header (헤더)

**변경 사항:**
- 그림자 더 미세하게 조정
- 테마 토글 버튼 추가 (일/월 아이콘)
- 사용자 아바타 원형 배지 추가

**HTML 변경:**

```html
<!-- 헤더 우측: 변경 후 -->
<div style="display:flex;align-items:center;gap:12px;">
  <div class="header-actions" id="header-actions"></div>
  <button class="theme-toggle" id="theme-toggle" aria-label="테마 전환">
    <i data-lucide="sun" class="theme-icon-light"></i>
    <i data-lucide="moon" class="theme-icon-dark"></i>
  </button>
  <div class="user-info" id="user-info"></div>
</div>
```

**CSS:**

```css
.content-header {
  background: var(--color-surface);
  padding: var(--space-4) var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.content-header h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

/* 테마별 아이콘 전환 */
.theme-icon-dark { display: none; }
[data-theme="dark"] .theme-icon-light { display: none; }
[data-theme="dark"] .theme-icon-dark { display: block; }

/* 사용자 아바타 */
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}
```

---

### 4.3 Buttons (버튼)

**설계 원칙:** Solid(기본) / Outline / Ghost 3단계

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);     /* 8px 16px */
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: var(--leading-tight);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.btn:active {
  transform: scale(0.97);
}

/* Primary */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
}
.btn-primary:hover {
  background: var(--color-primary-700);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
}

/* Success */
.btn-success {
  background: var(--color-success);
  color: var(--color-text-inverse);
}
.btn-success:hover {
  background: #047857;
}

/* Danger */
.btn-danger {
  background: var(--color-danger);
  color: var(--color-text-inverse);
}
.btn-danger:hover {
  background: #B91C1C;
}

/* Secondary (Outline) */
.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}
.btn-secondary:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

/* Warning */
.btn-warning {
  background: var(--color-warning);
  color: var(--color-text-inverse);
}

/* Small */
.btn-sm {
  padding: var(--space-1) var(--space-3);   /* 4px 12px */
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
}
```

---

### 4.4 Form Inputs (폼)

```css
.form-group {
  margin-bottom: var(--space-4);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-1-5);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.form-control {
  width: 100%;
  padding: var(--space-2-5) var(--space-3);   /* 10px 12px */
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-surface);
  transition: all var(--transition-fast);
  line-height: var(--leading-normal);
}

.form-control:hover {
  border-color: var(--color-border-strong);
}

.form-control:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.form-control::placeholder {
  color: var(--color-text-tertiary);
}

/* 에러 상태 */
.form-control.is-invalid {
  border-color: var(--color-danger);
}
.form-control.is-invalid:focus {
  box-shadow: 0 0 0 3px var(--color-danger-light);
}

/* Select 드롭다운 */
select.form-control {
  appearance: none;
  background-image: url("data:image/svg+xml,...chevron-down...");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  background-size: 16px;
  padding-right: var(--space-10);
}
```

---

### 4.5 Cards (카드)

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.card-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.card-body {
  padding: var(--space-5);
}
```

---

### 4.6 Stat Cards (대시보드 요약 카드)

**신규 HTML 구조 (dashboard.js):**

```html
<div class="stat-card">
  <div class="stat-header">
    <div class="stat-icon stat-icon--primary">
      <i data-lucide="package"></i>
    </div>
    <span class="stat-label">등록 제품</span>
  </div>
  <div class="stat-value">150</div>
  <div class="stat-trend stat-trend--up">
    <i data-lucide="trending-up"></i>
    <span>+12 전일대비</span>
  </div>
</div>
```

**CSS:**

```css
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: all var(--transition-base);
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 20px;
  height: 20px;
}

.stat-icon--primary {
  background: var(--color-primary-100);
  color: var(--color-primary);
}

.stat-icon--success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.stat-icon--warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.stat-icon--danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text);
  line-height: var(--leading-tight);
  margin-bottom: var(--space-1);
}

.stat-card.warning .stat-value { color: var(--color-warning); }
.stat-card.danger .stat-value { color: var(--color-danger); }
.stat-card.success .stat-value { color: var(--color-success); }

.stat-trend {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.stat-trend svg {
  width: 14px;
  height: 14px;
}

.stat-trend--up {
  color: var(--color-success);
}

.stat-trend--down {
  color: var(--color-danger);
}
```

---

### 4.7 Tables (테이블)

```css
.table-container {
  overflow-x: auto;
  border-radius: var(--radius-md);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-border);
}

td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

/* Zebra striping */
tbody tr:nth-child(even) {
  background: var(--color-gray-50);
}

/* Hover */
tbody tr {
  transition: background var(--transition-fast);
}

tbody tr:hover {
  background: var(--color-primary-50);
}

/* 다크모드 테이블 */
[data-theme="dark"] th {
  background: var(--color-surface-hover);
}
[data-theme="dark"] tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}
[data-theme="dark"] tbody tr:hover {
  background: var(--color-primary-50);
}
```

---

### 4.8 Badges (배지)

**변경: Solid → Soft (파스텔 배경 + 진한 텍스트 + 앞에 dot)**

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--space-1) var(--space-2-5);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  line-height: 1;
}

/* Dot indicator */
.badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.badge-secondary {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}
.badge-secondary::before { background: var(--color-gray-400); }

.badge-primary {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}
.badge-primary::before { background: var(--color-primary); }

.badge-success {
  background: var(--color-success-light);
  color: var(--color-success-dark);
}
.badge-success::before { background: var(--color-success); }

.badge-danger {
  background: var(--color-danger-light);
  color: var(--color-danger-dark);
}
.badge-danger::before { background: var(--color-danger); }

.badge-warning {
  background: var(--color-warning-light);
  color: var(--color-warning-dark);
}
.badge-warning::before { background: var(--color-warning); }
```

---

### 4.9 Modal (모달)

```css
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  justify-content: center;
  align-items: center;
}

.modal-overlay.active {
  display: flex;
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  animation: modalEnter var(--transition-slow) ease;
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.modal-body {
  padding: var(--space-6);
}

.modal-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
```

---

### 4.10 Toast (토스트 알림)

```css
.toast-container {
  position: fixed;
  top: var(--space-5);
  right: var(--space-5);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  min-width: 320px;
  max-width: 420px;
  animation: toastSlideIn var(--transition-slow) ease;
  overflow: hidden;
  position: relative;
}

/* 왼쪽 색상 바 */
.toast::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.toast.success::before { background: var(--color-success); }
.toast.error::before { background: var(--color-danger); }
.toast.warning::before { background: var(--color-warning); }
.toast.info::before { background: var(--color-info); }

/* 타이머 프로그레스바 */
.toast::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--color-primary);
  animation: toastTimer 3s linear forwards;
}

@keyframes toastTimer {
  from { width: 100%; }
  to { width: 0%; }
}

@keyframes toastSlideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

**JS 변경 (app.js showToast):**

```javascript
function showToast(message, type = 'info') {
  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info'
  };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || 'info'}" style="width:20px;height:20px;flex-shrink:0;"></i>
    <span style="font-size:var(--text-sm);color:var(--color-text);">${message}</span>
  `;
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons({ nodes: [toast] });
  setTimeout(() => toast.remove(), 3000);
}
```

---

### 4.11 Loading & Empty States

**스켈레톤 로딩:**

```css
.skeleton {
  background: linear-gradient(90deg,
    var(--color-gray-200) 25%,
    var(--color-gray-100) 50%,
    var(--color-gray-200) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-text {
  height: 16px;
  margin-bottom: var(--space-2);
}

.skeleton-card {
  height: 120px;
}
```

**Empty State:**

```css
.empty-state {
  text-align: center;
  padding: var(--space-12) var(--space-6);
  color: var(--color-text-secondary);
}

.empty-state .empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-4);
  color: var(--color-gray-300);
}

.empty-state p {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
```

---

### 4.12 Login Page (로그인 화면)

```css
.login-container {
  display: flex;
  min-height: 100vh;
}

.login-brand {
  flex: 1;
  background: linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #2563EB 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
}

.login-brand-content {
  max-width: 480px;
  color: white;
  text-align: center;
}

.login-brand-content h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-4);
}

.login-brand-content p {
  font-size: var(--text-lg);
  opacity: 0.8;
}

.login-form-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  background: var(--color-bg);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-10);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

.login-card h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text);
  margin-bottom: var(--space-2);
}

.login-card .login-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
}

.btn-login {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-login:hover {
  background: var(--color-primary-700);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

/* 모바일: 브랜드 영역 숨김 */
@media (max-width: 768px) {
  .login-brand { display: none; }
  .login-form-side { padding: var(--space-5); }
}
```

---

### 4.13 KPI Cards (KPI 전용)

```css
.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* 상단 상태 바 (4px → 그라데이션) */
.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.kpi-card.good::before { background: var(--color-success); }
.kpi-card.warning::before { background: var(--color-warning); }
.kpi-card.danger::before { background: var(--color-danger); }

.kpi-card .kpi-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin: var(--space-2) 0;
}

.kpi-card.good .kpi-value { color: var(--color-success); }
.kpi-card.warning .kpi-value { color: var(--color-warning); }
.kpi-card.danger .kpi-value { color: var(--color-danger); }

/* 프로그레스 바 개선 */
.kpi-bar {
  width: 100%;
  height: 6px;
  background: var(--color-gray-200);
  border-radius: var(--radius-full);
  margin-top: var(--space-3);
  overflow: hidden;
}

.kpi-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 5. JS 변경 명세

### 5.1 app.js 추가 로직

```javascript
// === 테마 관리 ===
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// === Lucide 아이콘 초기화 ===
function refreshIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// DOMContentLoaded에 추가:
// initTheme();
// document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

// navigateTo 함수 내에 추가:
// 페이지 렌더 후 refreshIcons() 호출
```

### 5.2 컴포넌트별 HTML 변경 요약

| 컴포넌트 | 변경 항목 |
|----------|-----------|
| dashboard.js | stat-card 구조 변경 (stat-header, stat-icon, stat-trend 추가) |
| products.js | empty-state 아이콘 Emoji→SVG, 로딩→스켈레톤 |
| inventory.js | 탭 CSS 클래스 유지, 배지 스타일 자동 적용 |
| customers.js | empty-state 아이콘 변경 |
| orders.js | filter-bar select 스타일 자동, 배지 자동 |
| productions.js | 배지/필터 자동, 상세 모달 detail-grid 유지 |
| shipments.js | 동일 |
| reports.js | 탭 유지, 카드/테이블 자동 적용 |
| settings.js | 폼 스타일 자동 적용 |
| users.js | 배지/테이블 자동 적용 |
| kpi-productivity.js | kpi-card/kpi-bar 자동, 필터바 스타일 개선 |
| kpi-quality.js | 동일 |

---

## 6. index.html 변경 명세

### 6.1 `<head>` 추가

```html
<!-- Pretendard 웹폰트 -->
<link rel="stylesheet" as="style" crossorigin
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />

<!-- Lucide Icons -->
<script src="https://unpkg.com/lucide@latest" defer></script>
```

### 6.2 사이드바 HTML 변경

```html
<aside class="sidebar">
  <div class="sidebar-header">
    <h1>스마트공방</h1>
    <p class="sidebar-subtitle">Smart Factory MES</p>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section-label">기본</div>
    <a href="#" class="nav-item active" data-page="dashboard">
      <i data-lucide="layout-dashboard" class="nav-icon"></i>
      <span class="nav-label">대시보드</span>
    </a>
    <a href="#" class="nav-item" data-page="products">
      <i data-lucide="package" class="nav-icon"></i>
      <span class="nav-label">제품 관리</span>
    </a>
    <a href="#" class="nav-item" data-page="inventory">
      <i data-lucide="warehouse" class="nav-icon"></i>
      <span class="nav-label">재고 관리</span>
    </a>
    <a href="#" class="nav-item" data-page="customers">
      <i data-lucide="building-2" class="nav-icon"></i>
      <span class="nav-label">거래처 관리</span>
    </a>
    <a href="#" class="nav-item" data-page="orders">
      <i data-lucide="clipboard-list" class="nav-icon"></i>
      <span class="nav-label">주문 관리</span>
    </a>

    <div class="nav-section-label">운영</div>
    <a href="#" class="nav-item" data-page="productions">
      <i data-lucide="factory" class="nav-icon"></i>
      <span class="nav-label">생산 관리</span>
    </a>
    <a href="#" class="nav-item" data-page="shipments">
      <i data-lucide="truck" class="nav-icon"></i>
      <span class="nav-label">출하 관리</span>
    </a>

    <div class="nav-section-label">분석</div>
    <div class="nav-group" id="nav-group-kpi">
      <a href="#" class="nav-item nav-group-toggle" data-group="kpi">
        <i data-lucide="bar-chart-3" class="nav-icon"></i>
        <span class="nav-label">KPI 관리</span>
        <span class="nav-group-arrow">
          <i data-lucide="chevron-down" style="width:14px;height:14px;"></i>
        </span>
      </a>
      <div class="nav-group-items">
        <a href="#" class="nav-item nav-sub-item" data-page="kpi-productivity">
          <span class="nav-label">생산성</span>
        </a>
        <a href="#" class="nav-item nav-sub-item" data-page="kpi-quality">
          <span class="nav-label">품질</span>
        </a>
      </div>
    </div>
    <a href="#" class="nav-item" data-page="reports">
      <i data-lucide="file-bar-chart" class="nav-icon"></i>
      <span class="nav-label">리포트</span>
    </a>

    <div class="nav-section-label">시스템</div>
    <a href="#" class="nav-item" data-page="settings">
      <i data-lucide="settings" class="nav-icon"></i>
      <span class="nav-label">설정</span>
    </a>
    <a href="#" class="nav-item" data-page="users" id="nav-users" style="display:none;">
      <i data-lucide="users" class="nav-icon"></i>
      <span class="nav-label">회원 관리</span>
    </a>
  </nav>
</aside>
```

### 6.3 헤더에 테마 토글 추가

```html
<div style="display:flex;align-items:center;gap:12px;">
  <div class="header-actions" id="header-actions"></div>
  <button class="theme-toggle" id="theme-toggle" aria-label="테마 전환">
    <i data-lucide="sun" class="theme-icon-light" style="width:18px;height:18px;"></i>
    <i data-lucide="moon" class="theme-icon-dark" style="width:18px;height:18px;"></i>
  </button>
  <div class="user-info" id="user-info"></div>
</div>
```

### 6.4 로그인 화면 구조 변경

```html
<div class="login-container" id="login-container" style="display:none;">
  <div class="login-brand">
    <div class="login-brand-content">
      <i data-lucide="factory" style="width:64px;height:64px;margin-bottom:24px;opacity:0.9;"></i>
      <h2>스마트공방</h2>
      <p>제조 실행 시스템으로 생산성과 품질을 혁신하세요</p>
    </div>
  </div>
  <div class="login-form-side">
    <div class="login-card">
      <h1>로그인</h1>
      <p class="login-subtitle">스마트공방 관리 시스템에 로그인하세요</p>
      <form id="login-form">
        <div class="login-error" id="login-error"></div>
        <div class="form-group">
          <label for="login-username">아이디</label>
          <input type="text" id="login-username" class="form-control"
                 placeholder="아이디를 입력하세요" autocomplete="username">
        </div>
        <div class="form-group">
          <label for="login-password">비밀번호</label>
          <input type="password" id="login-password" class="form-control"
                 placeholder="비밀번호를 입력하세요" autocomplete="current-password">
        </div>
        <button type="submit" class="btn-login">로그인</button>
      </form>
      <p class="login-version">v1.1.0</p>
    </div>
  </div>
</div>
```

---

## 7. Responsive Breakpoints

```css
/* 기본: 모바일 (< 768px) */
/* 이미 모바일 기준 스타일 */

/* 태블릿 (768px+) */
@media (min-width: 768px) {
  /* 사이드바 상시 표시 */
  /* 2열 그리드 활성화 */
}

/* 데스크톱 (1024px+) */
@media (min-width: 1024px) {
  /* 콘텐츠 최대 폭 */
  /* 테이블 모든 컬럼 표시 */
}

/* 와이드 (1440px+) */
@media (min-width: 1440px) {
  /* 대시보드 3열 그리드 */
  /* 더 넓은 패딩 */
}
```

---

## 8. Animation & Transition Spec

| Target | Trigger | Animation | Duration |
|--------|---------|-----------|----------|
| 버튼 | hover | background-color 변경 | 150ms |
| 버튼 | active | scale(0.97) | 100ms |
| 카드 | hover | translateY(-1px) + shadow-md | 200ms |
| 모달 | open | scale(0.95→1) + opacity(0→1) | 300ms |
| 토스트 | enter | translateX(100%→0) | 300ms |
| 사이드바 (모바일) | toggle | translateX(-100%→0) | 300ms |
| 배지 | (없음) | 정적 | - |
| 테이블 행 | hover | background 전환 | 150ms |
| 스켈레톤 | 대기 중 | shimmer (background-position) | 1500ms infinite |
| KPI 프로그레스 바 | 로드 | width 0→value | 800ms cubic-bezier |
| 네비게이션 | 호버 | background + color 전환 | 150ms |

---

## 9. Implementation Order (구현 순서)

### Phase 1: Foundation (예상: 1파일)

1. [ ] `style.css` — `:root` 디자인 토큰 전체 정의 (라이트 + 다크)
2. [ ] `index.html` — `<head>`에 Pretendard + Lucide CDN 추가
3. [ ] `style.css` — body 기본 스타일 (font-family, color, background)

### Phase 2: Layout + Navigation (예상: 2파일)

4. [ ] `index.html` — 사이드바 HTML 재구성 (섹션 라벨 + Lucide 아이콘)
5. [ ] `style.css` — 사이드바 CSS 전면 리디자인
6. [ ] `index.html` — 헤더에 테마 토글 버튼 추가
7. [ ] `style.css` — 헤더 CSS 리디자인 (sticky + border-bottom)
8. [ ] `app.js` — initTheme/toggleTheme/refreshIcons 함수 추가

### Phase 3: Core Components (예상: 1파일)

9. [ ] `style.css` — 버튼 시스템 (.btn, .btn-primary 등)
10. [ ] `style.css` — 폼 시스템 (.form-control, select 등)
11. [ ] `style.css` — 배지 시스템 (soft 스타일 + dot)
12. [ ] `style.css` — 카드 시스템 (.card, .card-header 등)
13. [ ] `style.css` — 테이블 시스템 (th, td, zebra, hover)
14. [ ] `style.css` — 모달 시스템 (backdrop-blur, 애니메이션)
15. [ ] `style.css` — 토스트 시스템 (아이콘, 타이머바)
16. [ ] `app.js` — showToast 함수 HTML 업데이트

### Phase 4: Login + Dashboard (예상: 3파일)

17. [ ] `index.html` — 로그인 2분할 레이아웃 변경
18. [ ] `style.css` — 로그인 CSS
19. [ ] `dashboard.js` — stat-card HTML 구조 변경 (아이콘 + 트렌드)
20. [ ] `style.css` — 대시보드 stat-card CSS

### Phase 5: Page Components (예상: 11파일)

21. [ ] `products.js` — empty-state 아이콘 변경 + refreshIcons 호출
22. [ ] `inventory.js` — 동일
23. [ ] `customers.js` — 동일
24. [ ] `orders.js` — 동일
25. [ ] `productions.js` — 동일
26. [ ] `shipments.js` — 동일
27. [ ] `reports.js` — 동일
28. [ ] `settings.js` — 동일
29. [ ] `users.js` — 동일
30. [ ] `kpi-productivity.js` — kpi-card + 필터바 + refreshIcons
31. [ ] `kpi-quality.js` — 동일

### Phase 6: Polish (예상: 1파일)

32. [ ] `style.css` — 스켈레톤 로딩 애니메이션
33. [ ] `style.css` — 반응형 (768/1024/1440 브레이크포인트)
34. [ ] `style.css` — 유틸리티 클래스 (.text-danger 등)
35. [ ] 전체 QA — 라이트/다크 모드, 모바일/데스크톱, 전 페이지 기능 확인

---

## 10. Quality Checklist

### 10.1 디자인 품질

- [ ] 모든 색상 CSS 변수 사용 (하드코딩 없음)
- [ ] 다크모드 전체 페이지 정상 표시
- [ ] 배지/버튼/카드 일관된 border-radius
- [ ] 아이콘 크기 일관성 (nav: 20px, stat: 20px, toast: 20px)

### 10.2 기능 회귀 테스트

- [ ] 로그인/로그아웃 정상
- [ ] 모든 CRUD(등록/수정/삭제) 정상
- [ ] 모달 열기/닫기 (ESC, 외부 클릭)
- [ ] 토스트 알림 표시/자동 소멸
- [ ] 필터/탭 전환
- [ ] KPI 설정 모달
- [ ] 모바일 사이드바 토글

### 10.3 접근성

- [ ] 테마 토글 `aria-label` 확인
- [ ] 모달 포커스 트랩
- [ ] 버튼/링크 `:focus-visible` 스타일
- [ ] 색상 대비 WCAG AA

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-19 | Initial draft — 전체 컴포넌트 CSS/HTML 설계 | AI Architect |
