// 메인 앱 로직
let currentPage = 'dashboard';
let currentUser = null;

// 페이지 타이틀 매핑
const pageTitles = {
  dashboard: '대시보드',
  products: '제품 관리',
  inventory: '재고 관리',
  customers: '거래처 관리',
  orders: '주문 관리',
  productions: '생산 관리',
  shipments: '출하 관리',
  reports: '리포트',
  settings: '설정',
  users: '회원 관리',
  'kpi-productivity': 'KPI 관리 - 생산성',
  'kpi-quality': 'KPI 관리 - 품질',
};

// 페이지 렌더 함수 매핑
const pageRenderers = {
  dashboard: renderDashboard,
  products: renderProducts,
  inventory: renderInventory,
  customers: renderCustomers,
  orders: renderOrders,
  productions: renderProductions,
  shipments: renderShipments,
  reports: renderReports,
  settings: renderSettings,
  users: renderUsers,
  'kpi-productivity': renderKpiProductivity,
  'kpi-quality': renderKpiQuality,
};

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
  refreshIcons();
}

// === Lucide 아이콘 초기화 ===
function refreshIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// 로그인 화면 표시
function showLoginScreen() {
  currentUser = null;
  document.getElementById('login-container').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-username').focus();
  refreshIcons();
}

// 앱 화면 표시
function showAppScreen(user) {
  currentUser = user;
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'flex';

  // 헤더 사용자 정보 표시
  const userInfoEl = document.getElementById('user-info');
  if (userInfoEl) {
    userInfoEl.innerHTML = `
      <span class="user-name">${user.name} (${user.role === 'super_admin' ? '전체관리자' : '회사관리자'})</span>
      <button class="btn btn-sm btn-secondary" onclick="handleLogout()">로그아웃</button>
    `;
  }

  // 회원 관리 메뉴 표시/숨김
  const usersNavItem = document.getElementById('nav-users');
  if (usersNavItem) {
    usersNavItem.style.display = user.role === 'super_admin' ? 'flex' : 'none';
  }

  navigateTo('dashboard');
}

// 로그인 처리
async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  if (!username || !password) {
    errorEl.textContent = '아이디와 비밀번호를 입력해주세요.';
    return;
  }

  try {
    errorEl.textContent = '';
    const result = await API.auth.login(username, password);
    localStorage.setItem('token', result.token);
    showAppScreen(result.user);
  } catch (error) {
    errorEl.textContent = error.message;
  }
}

// 로그아웃 처리
async function handleLogout() {
  try {
    await API.auth.logout();
  } catch (e) {
    // 로그아웃 실패해도 로컬 토큰은 삭제
  }
  localStorage.removeItem('token');
  showLoginScreen();
}

// 인증 상태 확인
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    showLoginScreen();
    return;
  }

  try {
    const user = await API.auth.me();
    showAppScreen(user);
  } catch (error) {
    localStorage.removeItem('token');
    showLoginScreen();
  }
}

// 페이지 전환
async function navigateTo(page) {
  currentPage = page;

  // 네비게이션 활성화
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });

  // nav-group 자동 펼침/접기
  document.querySelectorAll('.nav-group').forEach((group) => {
    const hasActive = group.querySelector(`.nav-item[data-page="${page}"]`);
    if (hasActive) {
      group.classList.add('open');
    } else {
      group.classList.remove('open');
    }
  });

  // 타이틀 변경
  document.getElementById('page-title').textContent = pageTitles[page];

  // 헤더 액션 초기화
  document.getElementById('header-actions').innerHTML = '';

  // 페이지 렌더
  if (pageRenderers[page]) {
    await pageRenderers[page]();
  }

  // 페이지 렌더 후 Lucide 아이콘 초기화
  refreshIcons();
}

// 모달 열기
function openModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  document.getElementById('modal-overlay').classList.add('active');
  refreshIcons();
}

// 모달 닫기
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// 토스트 알림
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
    <span>${message}</span>
  `;
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons({ nodes: [toast] });
  setTimeout(() => toast.remove(), 3000);
}

// 숫자 포맷
function formatNumber(num) {
  return new Intl.NumberFormat('ko-KR').format(num || 0);
}

// 날짜 포맷
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR');
}

// 날짜시간 포맷
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR');
}

// 상태 배지 생성
function getStatusBadge(status) {
  const statusColors = {
    '대기': 'secondary',
    '진행중': 'primary',
    '완료': 'success',
    '취소': 'danger',
    '중단': 'warning',
  };
  return `<span class="badge badge-${statusColors[status] || 'secondary'}">${status}</span>`;
}

// 사이드바 토글
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('active');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
  // 테마 초기화
  initTheme();

  // 테마 토글 버튼
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // 햄버거 메뉴 토글
  document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

  // nav-group 토글 클릭
  document.querySelectorAll('.nav-group-toggle').forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle.closest('.nav-group').classList.toggle('open');
    });
  });

  // 네비게이션 클릭
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      if (!item.dataset.page) return; // nav-group-toggle 등 data-page 없는 항목 무시
      closeSidebar();
      navigateTo(item.dataset.page);
    });
  });

  // 모달 외부 클릭 시 닫기
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
      closeModal();
    }
  });

  // 로그인 폼 이벤트
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
  });

  // Lucide 아이콘 초기화
  refreshIcons();

  // 인증 상태 확인 후 적절한 화면 표시
  checkAuth();
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});
