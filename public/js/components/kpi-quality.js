// KPI 품질 페이지

async function renderKpiQuality() {
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
        <input type="date" id="kpi-qual-start" value="${startDate}">
        <span>~</span>
        <input type="date" id="kpi-qual-end" value="${endDate}">
        <select id="kpi-qual-product">
          <option value="">전체 제품</option>
          ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" onclick="loadQualityData()">조회</button>
      </div>

      <!-- KPI 요약 카드 -->
      <div class="kpi-summary-grid" id="kpi-qual-summary"></div>

      <!-- 일별 테이블 -->
      <div class="card">
        <div class="card-header"><h3>일별 품질지수</h3></div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>건수</th>
                  <th>실적</th>
                  <th>불량</th>
                  <th>폐기</th>
                  <th>QI (%)</th>
                  <th>수율 (%)</th>
                  <th>불량률 (%)</th>
                  <th>폐기률 (%)</th>
                </tr>
              </thead>
              <tbody id="kpi-qual-daily-body"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 제품별 테이블 -->
      <div class="card" style="margin-top:20px;">
        <div class="card-header"><h3>제품별 품질지수</h3></div>
        <div class="card-body">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>제품코드</th>
                  <th>제품명</th>
                  <th>실적</th>
                  <th>불량</th>
                  <th>폐기</th>
                  <th>QI (%)</th>
                  <th>수율 (%)</th>
                  <th>불량률 (%)</th>
                  <th>폐기률 (%)</th>
                </tr>
              </thead>
              <tbody id="kpi-qual-product-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    loadQualityData();
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle" class="empty-icon"></i><p>데이터 로드 실패: ${escapeHtml(error.message)}</p></div>`;
  }
}

async function loadQualityData() {
  try {
    const params = {};
    const startVal = document.getElementById('kpi-qual-start').value;
    const endVal = document.getElementById('kpi-qual-end').value;
    const productVal = document.getElementById('kpi-qual-product').value;

    if (startVal) params.start_date = startVal;
    if (endVal) params.end_date = endVal;
    if (productVal) params.product_id = productVal;

    const data = await API.kpi.getQuality(params);

    // 요약 카드
    const qiStatus = getKpiStatus(data.summary.qi, 'qi');
    const yieldStatus = getKpiStatus(data.summary.yield_rate, 'yield');
    const defectStatus = getKpiStatus(data.summary.defect_rate, 'defect');
    const wasteStatus = getKpiStatus(data.summary.waste_rate, 'waste');

    document.getElementById('kpi-qual-summary').innerHTML = `
      <div class="kpi-card ${qiStatus}">
        <div class="kpi-label">품질지수 (QI)</div>
        <div class="kpi-value">${data.summary.qi}%</div>
        <div class="kpi-bar"><div class="kpi-bar-fill ${qiStatus}" style="width:${Math.min(data.summary.qi, 100)}%"></div></div>
        <div class="kpi-sub">목표: ${kpiSettings.kpi_qi_target || 0}%</div>
      </div>
      <div class="kpi-card ${yieldStatus}">
        <div class="kpi-label">수율 (Yield)</div>
        <div class="kpi-value">${data.summary.yield_rate}%</div>
        <div class="kpi-bar"><div class="kpi-bar-fill ${yieldStatus}" style="width:${Math.min(data.summary.yield_rate, 100)}%"></div></div>
        <div class="kpi-sub">목표: ${kpiSettings.kpi_yield_target || 0}%</div>
      </div>
      <div class="kpi-card ${defectStatus}">
        <div class="kpi-label">불량률</div>
        <div class="kpi-value">${data.summary.defect_rate}%</div>
        <div class="kpi-bar"><div class="kpi-bar-fill ${defectStatus}" style="width:${Math.min(data.summary.defect_rate * 10, 100)}%"></div></div>
        <div class="kpi-sub">목표: ${kpiSettings.kpi_defect_target || 0}% 이하</div>
      </div>
      <div class="kpi-card ${wasteStatus}">
        <div class="kpi-label">폐기률</div>
        <div class="kpi-value">${data.summary.waste_rate}%</div>
        <div class="kpi-bar"><div class="kpi-bar-fill ${wasteStatus}" style="width:${Math.min(data.summary.waste_rate * 10, 100)}%"></div></div>
        <div class="kpi-sub">목표: ${kpiSettings.kpi_waste_target || 0}% 이하</div>
      </div>
    `;

    // 일별 테이블
    const dailyBody = document.getElementById('kpi-qual-daily-body');
    if (data.daily.length === 0) {
      dailyBody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--color-text-secondary);">데이터가 없습니다.</td></tr>';
    } else {
      dailyBody.innerHTML = data.daily.map(d => {
        return `
          <tr>
            <td>${escapeHtml(d.date)}</td>
            <td>${formatNumber(d.production_count)}</td>
            <td>${formatNumber(d.actual_qty)}</td>
            <td>${formatNumber(d.defect_qty)}</td>
            <td>${formatNumber(d.waste_qty)}</td>
            <td class="kpi-${getKpiStatus(d.qi, 'qi')}">${d.qi}%</td>
            <td class="kpi-${getKpiStatus(d.yield_rate, 'yield')}">${d.yield_rate}%</td>
            <td class="kpi-${getKpiStatus(d.defect_rate, 'defect')}">${d.defect_rate}%</td>
            <td class="kpi-${getKpiStatus(d.waste_rate, 'waste')}">${d.waste_rate}%</td>
          </tr>
        `;
      }).join('');
    }

    // 제품별 테이블
    const productBody = document.getElementById('kpi-qual-product-body');
    if (data.byProduct.length === 0) {
      productBody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--color-text-secondary);">데이터가 없습니다.</td></tr>';
    } else {
      productBody.innerHTML = data.byProduct.map(p => {
        return `
          <tr>
            <td>${escapeHtml(p.product_code)}</td>
            <td>${escapeHtml(p.product_name)}</td>
            <td>${formatNumber(p.actual_qty)}</td>
            <td>${formatNumber(p.defect_qty)}</td>
            <td>${formatNumber(p.waste_qty)}</td>
            <td class="kpi-${getKpiStatus(p.qi, 'qi')}">${p.qi}%</td>
            <td class="kpi-${getKpiStatus(p.yield_rate, 'yield')}">${p.yield_rate}%</td>
            <td class="kpi-${getKpiStatus(p.defect_rate, 'defect')}">${p.defect_rate}%</td>
            <td class="kpi-${getKpiStatus(p.waste_rate, 'waste')}">${p.waste_rate}%</td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    showToast('품질 데이터 로드 실패: ' + error.message, 'error');
  }
}
