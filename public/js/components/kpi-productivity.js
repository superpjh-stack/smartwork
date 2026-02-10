// KPI 생산성 페이지

let kpiSettings = {};

// KPI 상태 판단 유틸리티 (공유)
function getKpiStatus(value, type) {
  const target = kpiSettings[`kpi_${type}_target`] || 0;
  const warning = kpiSettings[`kpi_${type}_warning`] || 0;
  const danger = kpiSettings[`kpi_${type}_danger`] || 0;

  // inverted: 불량률/폐기률은 낮을수록 good
  const inverted = (type === 'defect' || type === 'waste');

  if (inverted) {
    if (value <= target) return 'good';
    if (value <= warning) return 'warning';
    return 'danger';
  } else {
    if (value >= target) return 'good';
    if (value >= warning) return 'warning';
    return 'danger';
  }
}

// KPI 설정 모달 (공유)
async function openKpiSettingsModal() {
  try {
    kpiSettings = await API.kpi.getSettings();

    const fields = [
      { group: '생산지수 (PI)', prefix: 'pi', unit: '%', desc: '높을수록 좋음' },
      { group: '품질지수 (QI)', prefix: 'qi', unit: '%', desc: '높을수록 좋음' },
      { group: '수율 (Yield)', prefix: 'yield', unit: '%', desc: '높을수록 좋음' },
      { group: '불량률', prefix: 'defect', unit: '%', desc: '낮을수록 좋음' },
      { group: '폐기률', prefix: 'waste', unit: '%', desc: '낮을수록 좋음' },
    ];

    let html = '<div style="max-height:60vh;overflow-y:auto;">';
    fields.forEach(f => {
      html += `
        <div style="margin-bottom:16px;padding:12px;background:#f8f9fa;border-radius:6px;">
          <h4 style="margin-bottom:8px;">${f.group} <small style="color:#7f8c8d;">(${f.desc})</small></h4>
          <div class="form-row">
            <div class="form-group">
              <label>목표 (${f.unit})</label>
              <input type="number" step="0.1" class="form-control" id="kpi_${f.prefix}_target" value="${kpiSettings[`kpi_${f.prefix}_target`] || 0}">
            </div>
            <div class="form-group">
              <label>경고 (${f.unit})</label>
              <input type="number" step="0.1" class="form-control" id="kpi_${f.prefix}_warning" value="${kpiSettings[`kpi_${f.prefix}_warning`] || 0}">
            </div>
            <div class="form-group">
              <label>위험 (${f.unit})</label>
              <input type="number" step="0.1" class="form-control" id="kpi_${f.prefix}_danger" value="${kpiSettings[`kpi_${f.prefix}_danger`] || 0}">
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveKpiSettings()">저장</button>
    `;

    openModal('KPI 임계치 설정', html, footer);
  } catch (error) {
    showToast('KPI 설정 로드 실패: ' + error.message, 'error');
  }
}

async function saveKpiSettings() {
  try {
    const prefixes = ['pi', 'qi', 'yield', 'defect', 'waste'];
    const levels = ['target', 'warning', 'danger'];
    const data = {};

    prefixes.forEach(p => {
      levels.forEach(l => {
        const key = `kpi_${p}_${l}`;
        const el = document.getElementById(key);
        if (el) data[key] = parseFloat(el.value) || 0;
      });
    });

    await API.kpi.saveSettings(data);
    kpiSettings = data;
    closeModal();
    showToast('KPI 설정이 저장되었습니다.', 'success');

    // 현재 페이지 새로고침
    if (currentPage === 'kpi-productivity') renderKpiProductivity();
    if (currentPage === 'kpi-quality') renderKpiQuality();
  } catch (error) {
    showToast('KPI 설정 저장 실패: ' + error.message, 'error');
  }
}

// 스냅샷 생성 (공유)
async function generateKpiSnapshot() {
  const date = document.getElementById('kpi-snapshot-date')
    ? document.getElementById('kpi-snapshot-date').value
    : new Date().toISOString().split('T')[0];

  try {
    const result = await API.kpi.generateSnapshot({ date });
    showToast(result.message, result.count > 0 ? 'success' : 'warning');
  } catch (error) {
    showToast('스냅샷 생성 실패: ' + error.message, 'error');
  }
}

// 생산성 페이지 렌더
async function renderKpiProductivity() {
  const container = document.getElementById('content-body');
  container.innerHTML = '<div class="loading">로딩 중...</div>';

  // 헤더 액션
  document.getElementById('header-actions').innerHTML = `
    <button class="btn btn-sm btn-secondary" onclick="openKpiSettingsModal()">임계치 설정</button>
  `;

  try {
    // 설정 로드
    kpiSettings = await API.kpi.getSettings();

    // 제품 목록 로드
    const products = await API.products.getAll();

    // 기본 날짜범위: 최근 30일
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    container.innerHTML = `
      <!-- 필터 -->
      <div class="kpi-filter-bar">
        <input type="date" id="kpi-prod-start" value="${startDate}">
        <span>~</span>
        <input type="date" id="kpi-prod-end" value="${endDate}">
        <select id="kpi-prod-product">
          <option value="">전체 제품</option>
          ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" onclick="loadProductivityData()">조회</button>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
          <input type="date" id="kpi-snapshot-date" value="${endDate}">
          <button class="btn btn-success btn-sm" onclick="generateKpiSnapshot()">스냅샷 생성</button>
        </div>
      </div>

      <!-- KPI 요약 카드 -->
      <div class="kpi-summary-grid" id="kpi-prod-summary"></div>

      <!-- 일별 테이블 -->
      <div class="card">
        <div class="card-header"><h3>일별 생산지수</h3></div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>완료 건수</th>
                  <th>실적 수량</th>
                  <th>계획 수량</th>
                  <th>PI (%)</th>
                </tr>
              </thead>
              <tbody id="kpi-prod-daily-body"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 제품별 테이블 -->
      <div class="card" style="margin-top:20px;">
        <div class="card-header"><h3>제품별 생산지수</h3></div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>제품코드</th>
                  <th>제품명</th>
                  <th>완료 건수</th>
                  <th>실적 수량</th>
                  <th>계획 수량</th>
                  <th>PI (%)</th>
                </tr>
              </thead>
              <tbody id="kpi-prod-product-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    loadProductivityData();
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><div class="icon">!</div><p>데이터 로드 실패: ${error.message}</p></div>`;
  }
}

async function loadProductivityData() {
  try {
    const params = {};
    const startVal = document.getElementById('kpi-prod-start').value;
    const endVal = document.getElementById('kpi-prod-end').value;
    const productVal = document.getElementById('kpi-prod-product').value;

    if (startVal) params.start_date = startVal;
    if (endVal) params.end_date = endVal;
    if (productVal) params.product_id = productVal;

    const data = await API.kpi.getProductivity(params);

    // 요약 카드
    const piStatus = getKpiStatus(data.summary.pi, 'pi');
    document.getElementById('kpi-prod-summary').innerHTML = `
      <div class="kpi-card ${piStatus}">
        <div class="kpi-label">생산지수 (PI)</div>
        <div class="kpi-value">${data.summary.pi}%</div>
        <div class="kpi-bar"><div class="kpi-bar-fill ${piStatus}" style="width:${Math.min(data.summary.pi, 100)}%"></div></div>
        <div class="kpi-sub">목표: ${kpiSettings.kpi_pi_target || 0}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">총 실적 수량</div>
        <div class="kpi-value" style="color:var(--primary-color)">${formatNumber(data.summary.total_actual)}</div>
        <div class="kpi-sub">계획: ${formatNumber(data.summary.total_planned)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">완료 건수</div>
        <div class="kpi-value" style="color:var(--primary-color)">${formatNumber(data.summary.production_count)}</div>
        <div class="kpi-sub">완료된 생산 건</div>
      </div>
    `;

    // 일별 테이블
    const dailyBody = document.getElementById('kpi-prod-daily-body');
    if (data.daily.length === 0) {
      dailyBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#7f8c8d;">데이터가 없습니다.</td></tr>';
    } else {
      dailyBody.innerHTML = data.daily.map(d => {
        const status = getKpiStatus(d.pi, 'pi');
        return `
          <tr>
            <td>${d.date}</td>
            <td>${formatNumber(d.production_count)}</td>
            <td>${formatNumber(d.actual_qty)}</td>
            <td>${formatNumber(d.planned_qty)}</td>
            <td class="kpi-${status}">${d.pi}%</td>
          </tr>
        `;
      }).join('');
    }

    // 제품별 테이블
    const productBody = document.getElementById('kpi-prod-product-body');
    if (data.byProduct.length === 0) {
      productBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#7f8c8d;">데이터가 없습니다.</td></tr>';
    } else {
      productBody.innerHTML = data.byProduct.map(p => {
        const status = getKpiStatus(p.pi, 'pi');
        return `
          <tr>
            <td>${p.product_code}</td>
            <td>${p.product_name}</td>
            <td>${formatNumber(p.production_count)}</td>
            <td>${formatNumber(p.actual_qty)}</td>
            <td>${formatNumber(p.planned_qty)}</td>
            <td class="kpi-${status}">${p.pi}%</td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    showToast('생산성 데이터 로드 실패: ' + error.message, 'error');
  }
}
