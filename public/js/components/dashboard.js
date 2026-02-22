// 대시보드 컴포넌트
async function renderDashboard() {
  const contentBody = document.getElementById('content-body');
  contentBody.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const [summary, recentOrders, recentProductions, inventoryStatus] = await Promise.all([
      API.dashboard.getSummary(),
      API.dashboard.getRecentOrders(),
      API.dashboard.getRecentProductions(),
      API.dashboard.getInventoryStatus(),
    ]);

    contentBody.innerHTML = `
      <!-- 요약 카드 -->
      <div class="dashboard-grid">
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon stat-icon--primary">
              <i data-lucide="package"></i>
            </div>
            <span class="stat-label">등록 제품</span>
          </div>
          <div class="stat-value">${formatNumber(summary.products)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon stat-icon--info">
              <i data-lucide="building-2"></i>
            </div>
            <span class="stat-label">거래처</span>
          </div>
          <div class="stat-value">${formatNumber(summary.customers)}</div>
        </div>
        <div class="stat-card ${summary.pendingOrders > 0 ? 'warning' : ''}">
          <div class="stat-header">
            <div class="stat-icon stat-icon--warning">
              <i data-lucide="clipboard-list"></i>
            </div>
            <span class="stat-label">진행중 주문</span>
          </div>
          <div class="stat-value">${formatNumber(summary.pendingOrders)}</div>
        </div>
        <div class="stat-card ${summary.activeProductions > 0 ? 'success' : ''}">
          <div class="stat-header">
            <div class="stat-icon stat-icon--success">
              <i data-lucide="factory"></i>
            </div>
            <span class="stat-label">생산 진행중</span>
          </div>
          <div class="stat-value">${formatNumber(summary.activeProductions)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon stat-icon--primary">
              <i data-lucide="truck"></i>
            </div>
            <span class="stat-label">오늘 출하 예정</span>
          </div>
          <div class="stat-value">${formatNumber(summary.todayShipments)}</div>
        </div>
        <div class="stat-card ${summary.lowStock > 0 ? 'danger' : ''}">
          <div class="stat-header">
            <div class="stat-icon stat-icon--danger">
              <i data-lucide="alert-triangle"></i>
            </div>
            <span class="stat-label">재고 부족</span>
          </div>
          <div class="stat-value">${formatNumber(summary.lowStock)}</div>
        </div>
      </div>

      <div class="grid-2col">
        <!-- 최근 주문 -->
        <div class="card">
          <div class="card-header">
            <h3>최근 주문</h3>
            <button class="btn btn-sm btn-primary" onclick="navigateTo('orders')">전체보기</button>
          </div>
          <div class="card-body">
            ${recentOrders.length > 0 ? `
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>주문번호</th>
                      <th>거래처</th>
                      <th>상태</th>
                      <th>금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentOrders.map(order => `
                      <tr>
                        <td>${escapeHtml(order.order_number)}</td>
                        <td>${escapeHtml(order.customer_name || '-')}</td>
                        <td>${getStatusBadge(order.status)}</td>
                        <td>${formatNumber(order.total_amount)}원</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<div class="empty-state"><p>최근 주문이 없습니다.</p></div>'}
          </div>
        </div>

        <!-- 최근 생산 -->
        <div class="card">
          <div class="card-header">
            <h3>최근 생산</h3>
            <button class="btn btn-sm btn-primary" onclick="navigateTo('productions')">전체보기</button>
          </div>
          <div class="card-body">
            ${recentProductions.length > 0 ? `
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>생산번호</th>
                      <th>제품</th>
                      <th>상태</th>
                      <th>수량</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentProductions.map(prod => `
                      <tr>
                        <td>${escapeHtml(prod.production_number)}</td>
                        <td>${escapeHtml(prod.product_name || '-')}</td>
                        <td>${getStatusBadge(prod.status)}</td>
                        <td>${formatNumber(prod.actual_qty)}/${formatNumber(prod.planned_qty)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<div class="empty-state"><p>최근 생산이 없습니다.</p></div>'}
          </div>
        </div>
      </div>

      <!-- 재고 현황 -->
      <div class="card">
        <div class="card-header">
          <h3>재고 현황 (재고 부족 순)</h3>
          <button class="btn btn-sm btn-primary" onclick="navigateTo('inventory')">전체보기</button>
        </div>
        <div class="card-body">
          ${inventoryStatus.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>제품코드</th>
                    <th>제품명</th>
                    <th>현재 수량</th>
                    <th>위치</th>
                  </tr>
                </thead>
                <tbody>
                  ${inventoryStatus.map(inv => `
                    <tr>
                      <td>${escapeHtml(inv.product_code)}</td>
                      <td>${escapeHtml(inv.product_name)}</td>
                      <td style="${inv.quantity <= 10 ? 'color: var(--color-danger); font-weight: bold;' : ''}">
                        ${formatNumber(inv.quantity)}
                      </td>
                      <td>${escapeHtml(inv.location || '-')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div class="empty-state"><p>등록된 재고가 없습니다.</p></div>'}
        </div>
      </div>
    `;
  } catch (error) {
    contentBody.innerHTML = `<div class="empty-state"><p>데이터를 불러오는 중 오류가 발생했습니다.</p></div>`;
    showToast(error.message, 'error');
  }
}
