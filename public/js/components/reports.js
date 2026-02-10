// 리포트 컴포넌트
let reportActiveTab = 'production';

async function renderReports() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');
  headerActions.innerHTML = '';

  contentBody.innerHTML = `
    <div class="tabs">
      <button class="tab ${reportActiveTab === 'production' ? 'active' : ''}" onclick="switchReportTab('production')">생산 현황</button>
      <button class="tab ${reportActiveTab === 'shipment' ? 'active' : ''}" onclick="switchReportTab('shipment')">출하 현황</button>
      <button class="tab ${reportActiveTab === 'sales' ? 'active' : ''}" onclick="switchReportTab('sales')">매출 현황</button>
      <button class="tab ${reportActiveTab === 'inventory' ? 'active' : ''}" onclick="switchReportTab('inventory')">재고 현황</button>
    </div>
    <div id="report-content"></div>
  `;

  switch (reportActiveTab) {
    case 'production':
      await renderProductionReport();
      break;
    case 'shipment':
      await renderShipmentReport();
      break;
    case 'sales':
      await renderSalesReport();
      break;
    case 'inventory':
      await renderInventoryReport();
      break;
  }
}

function switchReportTab(tab) {
  reportActiveTab = tab;
  renderReports();
}

// 생산 현황 리포트
async function renderProductionReport() {
  const container = document.getElementById('report-content');
  container.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const [daily, byProduct] = await Promise.all([
      API.reports.productionDaily(),
      API.reports.productionByProduct(),
    ]);

    container.innerHTML = `
      <div class="grid-2col">
        <!-- 일별 생산 현황 -->
        <div class="card">
          <div class="card-header">
            <h3>일별 생산 현황</h3>
          </div>
          <div class="card-body">
            ${daily.length > 0 ? `
              <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>생산건수</th>
                      <th>생산수량</th>
                      <th>불량</th>
                      <th>폐기</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${daily.map(d => `
                      <tr>
                        <td>${d.date}</td>
                        <td>${formatNumber(d.production_count)}</td>
                        <td>${formatNumber(d.total_actual)}</td>
                        <td style="color: var(--warning-color);">${formatNumber(d.total_defect)}</td>
                        <td style="color: var(--danger-color);">${formatNumber(d.total_waste)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<div class="empty-state">데이터가 없습니다.</div>'}
          </div>
        </div>

        <!-- 제품별 생산 현황 -->
        <div class="card">
          <div class="card-header">
            <h3>제품별 생산 현황</h3>
          </div>
          <div class="card-body">
            ${byProduct.length > 0 ? `
              <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>제품</th>
                      <th>생산건수</th>
                      <th>생산수량</th>
                      <th>불량률</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${byProduct.filter(p => p.production_count > 0).map(p => `
                      <tr>
                        <td>${p.product_code} - ${p.product_name}</td>
                        <td>${formatNumber(p.production_count)}</td>
                        <td>${formatNumber(p.total_actual)}</td>
                        <td style="color: ${p.defect_rate > 5 ? 'var(--danger-color)' : 'var(--text-color)'};">
                          ${p.defect_rate || 0}%
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<div class="empty-state">데이터가 없습니다.</div>'}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    showToast(error.message, 'error');
  }
}

// 출하 현황 리포트
async function renderShipmentReport() {
  const container = document.getElementById('report-content');
  container.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const daily = await API.reports.shipmentDaily();

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>일별 출하 현황</h3>
        </div>
        <div class="card-body">
          ${daily.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>출하건수</th>
                    <th>출하수량</th>
                  </tr>
                </thead>
                <tbody>
                  ${daily.map(d => `
                    <tr>
                      <td>${d.date}</td>
                      <td>${formatNumber(d.shipment_count)}</td>
                      <td>${formatNumber(d.total_quantity)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state">데이터가 없습니다.</div>'}
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    showToast(error.message, 'error');
  }
}

// 매출 현황 리포트
async function renderSalesReport() {
  const container = document.getElementById('report-content');
  container.innerHTML = '<div class="loading">로딩 중...</div>';

  const currentYear = new Date().getFullYear();

  try {
    const [byCustomer, monthly] = await Promise.all([
      API.reports.salesByCustomer(),
      API.reports.salesMonthly(currentYear),
    ]);

    const totalSales = byCustomer.reduce((sum, c) => sum + (c.total_sales || 0), 0);

    container.innerHTML = `
      <div class="grid-2col">
        <!-- 거래처별 매출 -->
        <div class="card">
          <div class="card-header">
            <h3>거래처별 매출</h3>
          </div>
          <div class="card-body">
            ${byCustomer.length > 0 ? `
              <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>거래처</th>
                      <th>주문건수</th>
                      <th>매출액</th>
                      <th>비율</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${byCustomer.filter(c => c.order_count > 0).map(c => `
                      <tr>
                        <td>${c.customer_code} - ${c.customer_name}</td>
                        <td>${formatNumber(c.order_count)}</td>
                        <td>${formatNumber(c.total_sales)}원</td>
                        <td>${totalSales > 0 ? ((c.total_sales / totalSales) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    `).join('')}
                    <tr style="font-weight: bold; background-color: #f8f9fa;">
                      <td colspan="2">합계</td>
                      <td>${formatNumber(totalSales)}원</td>
                      <td>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ` : '<div class="empty-state">데이터가 없습니다.</div>'}
          </div>
        </div>

        <!-- 월별 매출 -->
        <div class="card">
          <div class="card-header">
            <h3>${currentYear}년 월별 매출</h3>
          </div>
          <div class="card-body">
            ${monthly.length > 0 ? `
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>월</th>
                      <th>주문건수</th>
                      <th>매출액</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${monthly.map(m => `
                      <tr>
                        <td>${m.month}</td>
                        <td>${formatNumber(m.order_count)}</td>
                        <td>${formatNumber(m.total_sales)}원</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<div class="empty-state">데이터가 없습니다.</div>'}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    showToast(error.message, 'error');
  }
}

// 재고 현황 리포트
async function renderInventoryReport() {
  const container = document.getElementById('report-content');
  container.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const report = await API.reports.inventoryStatus();

    container.innerHTML = `
      <!-- 요약 -->
      <div class="dashboard-grid" style="margin-bottom: 20px;">
        <div class="stat-card">
          <div class="stat-value">${formatNumber(report.summary.total_products)}</div>
          <div class="stat-label">총 제품 수</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${formatNumber(report.summary.total_stock_value)}원</div>
          <div class="stat-label">재고 금액</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">${formatNumber(report.summary.low_stock_count)}</div>
          <div class="stat-label">재고 부족</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-value">${formatNumber(report.summary.out_of_stock_count)}</div>
          <div class="stat-label">재고 없음</div>
        </div>
      </div>

      <!-- 상세 목록 -->
      <div class="card">
        <div class="card-header">
          <h3>재고 상세 현황</h3>
        </div>
        <div class="card-body">
          ${report.items.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>제품코드</th>
                    <th>제품명</th>
                    <th>단위</th>
                    <th>단가</th>
                    <th>현재 재고</th>
                    <th>재고 금액</th>
                    <th>위치</th>
                  </tr>
                </thead>
                <tbody>
                  ${report.items.map(item => `
                    <tr>
                      <td>${item.product_code}</td>
                      <td>${item.product_name}</td>
                      <td>${item.unit}</td>
                      <td>${formatNumber(item.price)}원</td>
                      <td style="${item.current_stock <= 10 ? 'color: var(--danger-color); font-weight: bold;' : ''}">
                        ${formatNumber(item.current_stock)}
                      </td>
                      <td>${formatNumber(item.stock_value)}원</td>
                      <td>${item.location || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state">데이터가 없습니다.</div>'}
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    showToast(error.message, 'error');
  }
}
