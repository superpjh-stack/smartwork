// 설정 컴포넌트
async function renderSettings() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');
  headerActions.innerHTML = '';

  contentBody.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const [settings, extSettings] = await Promise.all([
      API.settings.getAll(),
      API.kpi.external.getSettings(),
    ]);

    contentBody.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>기본 설정</h3>
        </div>
        <div class="card-body">
          <form id="settings-form">
            <div class="form-row">
              <div class="form-group">
                <label for="setting-company">회사명</label>
                <input type="text" id="setting-company" class="form-control" value="${escapeHtml(settings.company_name || '스마트공방')}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="setting-order-prefix">주문번호 접두어</label>
                <input type="text" id="setting-order-prefix" class="form-control" value="${escapeHtml(settings.order_prefix || 'ORD')}" placeholder="예: ORD">
              </div>
              <div class="form-group">
                <label for="setting-production-prefix">생산번호 접두어</label>
                <input type="text" id="setting-production-prefix" class="form-control" value="${escapeHtml(settings.production_prefix || 'PRD')}" placeholder="예: PRD">
              </div>
              <div class="form-group">
                <label for="setting-shipment-prefix">출하번호 접두어</label>
                <input type="text" id="setting-shipment-prefix" class="form-control" value="${escapeHtml(settings.shipment_prefix || 'SHP')}" placeholder="예: SHP">
              </div>
            </div>
            <div style="margin-top: 20px;">
              <button type="button" class="btn btn-primary" onclick="saveSettings()">설정 저장</button>
            </div>
          </form>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <h3>데이터 관리</h3>
        </div>
        <div class="card-body">
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-success" onclick="loadSampleData()">샘플 데이터 생성</button>
          </div>
          <p style="color: var(--color-text-secondary); margin-top: 10px; font-size: 0.9rem;">
            * 샘플 데이터 생성은 테스트 목적으로 사용하세요.
          </p>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <h3>KPI 외부 전송 설정</h3>
        </div>
        <div class="card-body">
          <form id="external-settings-form">
            <div class="form-row">
              <div class="form-group">
                <label for="ext-enabled">외부 전송 활성화</label>
                <select id="ext-enabled" class="form-control">
                  <option value="true" ${extSettings.kpi_external_enabled === 'true' ? 'selected' : ''}>활성화</option>
                  <option value="false" ${extSettings.kpi_external_enabled !== 'true' ? 'selected' : ''}>비활성화</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ext-auto-enabled">자동 전송</label>
                <select id="ext-auto-enabled" class="form-control">
                  <option value="true" ${extSettings.kpi_external_auto_enabled === 'true' ? 'selected' : ''}>활성화</option>
                  <option value="false" ${extSettings.kpi_external_auto_enabled !== 'true' ? 'selected' : ''}>비활성화</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ext-schedule">스케줄 (Cron)</label>
                <input type="text" id="ext-schedule" class="form-control" value="${escapeHtml(extSettings.kpi_external_schedule || '0 6 * * *')}" placeholder="0 6 * * *">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label for="ext-api-url">API URL</label>
                <input type="text" id="ext-api-url" class="form-control" value="${escapeHtml(extSettings.kpi_external_api_url || '')}" placeholder="https://api.example.com/v1/kpi">
              </div>
              <div class="form-group">
                <label for="ext-company-code">사업장 코드</label>
                <input type="text" id="ext-company-code" class="form-control" value="${escapeHtml(extSettings.kpi_external_company_code || '')}" placeholder="SF-001">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="ext-api-key">API Key</label>
                <input type="text" id="ext-api-key" class="form-control" value="${escapeHtml(extSettings.kpi_external_api_key || '')}" placeholder="새 키를 입력하거나 비워두세요">
              </div>
              <div class="form-group">
                <label for="ext-max-retry">최대 재시도</label>
                <input type="number" id="ext-max-retry" class="form-control" value="${extSettings.kpi_external_max_retry || '3'}" min="0" max="10">
              </div>
              <div class="form-group">
                <label for="ext-timeout">타임아웃 (ms)</label>
                <input type="number" id="ext-timeout" class="form-control" value="${extSettings.kpi_external_timeout || '30000'}" min="5000" max="120000" step="1000">
              </div>
            </div>
            <div style="margin-top: 20px;">
              <button type="button" class="btn btn-primary" onclick="saveExternalSettings()">외부 전송 설정 저장</button>
            </div>
          </form>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3>KPI 외부 전송 이력</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <select id="ext-history-status" class="form-control" style="width: auto; min-width: 100px;" onchange="loadExternalHistory()">
              <option value="">전체</option>
              <option value="success">성공</option>
              <option value="failed">실패</option>
              <option value="retrying">재시도중</option>
              <option value="pending">대기</option>
            </select>
            <button class="btn btn-primary" onclick="openSendModal()">수동 전송</button>
          </div>
        </div>
        <div class="card-body">
          <div id="ext-history-container">
            <div class="loading">로딩 중...</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <h3>시스템 정보</h3>
        </div>
        <div class="card-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>시스템명</label>
              <div class="value">스마트공방 시스템</div>
            </div>
            <div class="detail-item">
              <label>버전</label>
              <div class="value">2.0.0</div>
            </div>
            <div class="detail-item">
              <label>데이터베이스</label>
              <div class="value">PostgreSQL (Prisma ORM)</div>
            </div>
            <div class="detail-item">
              <label>서버</label>
              <div class="value">Node.js + Express</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 전송 이력 로드
    loadExternalHistory();

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (error) {
    contentBody.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    showToast(error.message, 'error');
  }
}

async function saveSettings() {
  const settings = {
    company_name: document.getElementById('setting-company').value.trim(),
    order_prefix: document.getElementById('setting-order-prefix').value.trim(),
    production_prefix: document.getElementById('setting-production-prefix').value.trim(),
    shipment_prefix: document.getElementById('setting-shipment-prefix').value.trim(),
  };

  try {
    await API.settings.setBulk(settings);
    showToast('설정이 저장되었습니다.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 외부 전송 설정 저장
async function saveExternalSettings() {
  const data = {
    kpi_external_enabled: document.getElementById('ext-enabled').value,
    kpi_external_auto_enabled: document.getElementById('ext-auto-enabled').value,
    kpi_external_schedule: document.getElementById('ext-schedule').value.trim(),
    kpi_external_api_url: document.getElementById('ext-api-url').value.trim(),
    kpi_external_api_key: document.getElementById('ext-api-key').value.trim(),
    kpi_external_company_code: document.getElementById('ext-company-code').value.trim(),
    kpi_external_max_retry: document.getElementById('ext-max-retry').value,
    kpi_external_timeout: document.getElementById('ext-timeout').value,
  };

  try {
    await API.kpi.external.saveSettings(data);
    showToast('외부 전송 설정이 저장되었습니다.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 전송 이력 로드
let extHistoryPage = 1;

async function loadExternalHistory(page) {
  if (page) extHistoryPage = page;

  const container = document.getElementById('ext-history-container');
  if (!container) return;

  const status = document.getElementById('ext-history-status')?.value || '';

  try {
    const params = { page: extHistoryPage, limit: 10 };
    if (status) params.status = status;

    const result = await API.kpi.external.getHistory(params);

    if (result.data.length === 0) {
      container.innerHTML = '<div class="empty-state">전송 이력이 없습니다.</div>';
      return;
    }

    const statusBadge = (s) => {
      const map = {
        success: '<span class="badge badge-success">성공</span>',
        failed: '<span class="badge badge-danger">실패</span>',
        retrying: '<span class="badge badge-warning">재시도중</span>',
        pending: '<span class="badge badge-secondary">대기</span>',
      };
      return map[s] || escapeHtml(s);
    };

    const rows = result.data.map(t => `
      <tr>
        <td>${t.id}</td>
        <td>${escapeHtml(t.reportDate)}</td>
        <td>${new Date(t.transmittedAt).toLocaleString('ko-KR')}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${t.statusCode || '-'}</td>
        <td>${t.productCount}건</td>
        <td>${t.triggerType === 'auto' ? '자동' : '수동'}</td>
        <td>${t.attemptCount}회</td>
        <td>
          ${t.status === 'failed' ? `<button class="btn btn-sm btn-warning" onclick="retryTransmission(${t.id})">재전송</button>` : ''}
        </td>
      </tr>
    `).join('');

    const { pagination } = result;
    const pages = [];
    for (let i = 1; i <= pagination.totalPages; i++) {
      pages.push(`<button class="btn btn-sm ${i === pagination.page ? 'btn-primary' : 'btn-secondary'}" onclick="loadExternalHistory(${i})" ${i === pagination.page ? 'disabled' : ''}>${i}</button>`);
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>보고일</th>
            <th>전송일시</th>
            <th>상태</th>
            <th>응답코드</th>
            <th>건수</th>
            <th>유형</th>
            <th>시도</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${pagination.totalPages > 1 ? `
        <div style="display: flex; justify-content: center; gap: 4px; margin-top: 12px;">
          ${pages.join('')}
        </div>
      ` : ''}
    `;
  } catch (error) {
    container.innerHTML = '<div class="empty-state">이력을 불러오는 중 오류가 발생했습니다.</div>';
  }
}

// 실패 건 재전송
async function retryTransmission(id) {
  if (!confirm('해당 건을 재전송하시겠습니까?')) return;

  try {
    const result = await API.kpi.external.retry(id);
    showToast(result.message, result.status === 'success' ? 'success' : 'warning');
    loadExternalHistory();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 수동 전송 모달
function openSendModal() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().split('T')[0];

  openModal('KPI 외부 전송', `
    <div class="form-group">
      <label for="send-date">보고 날짜</label>
      <input type="date" id="send-date" class="form-control" value="${defaultDate}">
    </div>
    <div id="send-preview" style="margin-top: 16px; display: none;">
      <h4 style="margin-bottom: 8px;">전송 데이터 미리보기</h4>
      <div id="send-preview-content" style="max-height: 300px; overflow-y: auto; background: var(--color-gray-50); padding: 12px; border-radius: 8px; font-size: 0.85rem;"></div>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 20px;">
      <button class="btn btn-secondary" onclick="previewSendData()">미리보기</button>
      <button class="btn btn-primary" onclick="executeSend()">전송</button>
    </div>
  `);
}

// 전송 데이터 미리보기
async function previewSendData() {
  const date = document.getElementById('send-date').value;
  if (!date) {
    showToast('날짜를 선택해주세요.', 'error');
    return;
  }

  const previewDiv = document.getElementById('send-preview');
  const contentDiv = document.getElementById('send-preview-content');

  try {
    contentDiv.textContent = '로딩 중...';
    previewDiv.style.display = 'block';

    const data = await API.kpi.external.preview(date);

    if (data.indicators && data.indicators.length > 0) {
      const rows = data.indicators.map(ind =>
        `${ind.productCode} ${ind.productName}: PI=${ind.pi}%, QI=${ind.qi}%`
      ).join('\n');
      contentDiv.textContent =
        `보고일: ${data.reportDate}\n` +
        `사업장: ${data.companyCode || '(미설정)'}\n` +
        `제품 수: ${data.summary.productCount}건\n` +
        `평균 PI: ${data.summary.avgPi}%\n` +
        `평균 QI: ${data.summary.avgQi}%\n\n` +
        `--- 제품별 ---\n${rows}`;
    } else {
      contentDiv.textContent = data.message || '해당 날짜에 KPI 데이터가 없습니다.';
    }
  } catch (error) {
    contentDiv.textContent = '미리보기 오류: ' + error.message;
  }
}

// 수동 전송 실행
async function executeSend() {
  const date = document.getElementById('send-date').value;
  if (!date) {
    showToast('날짜를 선택해주세요.', 'error');
    return;
  }

  if (!confirm(`${date} KPI 데이터를 외부 API로 전송하시겠습니까?`)) return;

  try {
    const result = await API.kpi.external.send({ date });
    showToast(result.message, result.status === 'success' ? 'success' : 'warning');
    closeModal();
    loadExternalHistory();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 샘플 데이터 생성
async function loadSampleData() {
  if (!confirm('샘플 데이터를 생성하시겠습니까? 기존 데이터에 추가됩니다.')) return;

  try {
    // 샘플 제품 등록
    const sampleProducts = [
      { product_code: 'P001', name: '스마트 센서 A', unit: 'EA', price: 50000 },
      { product_code: 'P002', name: '스마트 센서 B', unit: 'EA', price: 75000 },
      { product_code: 'P003', name: '컨트롤러 유닛', unit: 'SET', price: 150000 },
      { product_code: 'P004', name: '전원 모듈', unit: 'EA', price: 30000 },
      { product_code: 'P005', name: '통신 모듈', unit: 'EA', price: 45000 },
    ];

    for (const product of sampleProducts) {
      try {
        await API.products.create(product);
      } catch (e) {
        console.log('Product already exists:', product.product_code);
      }
    }

    // 샘플 거래처 등록
    const sampleCustomers = [
      { customer_code: 'C001', name: '테크솔루션', contact: '02-1234-5678', address: '서울시 강남구 테헤란로 123' },
      { customer_code: 'C002', name: '스마트팩토리', contact: '031-987-6543', address: '경기도 성남시 분당구 판교로 456' },
      { customer_code: 'C003', name: '자동화시스템', contact: '032-555-1234', address: '인천시 연수구 송도동 789' },
    ];

    for (const customer of sampleCustomers) {
      try {
        await API.customers.create(customer);
      } catch (e) {
        console.log('Customer already exists:', customer.customer_code);
      }
    }

    // 재고 입고
    const products = await API.products.getAll();
    for (const product of products.slice(0, 5)) {
      try {
        await API.inventory.receive({
          product_id: product.id,
          quantity: 100,
          reason: '샘플 데이터 초기 재고',
        });
      } catch (e) {
        console.log('Inventory receive error:', e.message);
      }
    }

    showToast('샘플 데이터가 생성되었습니다.', 'success');
    renderSettings();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
