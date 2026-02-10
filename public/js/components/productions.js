// 생산 관리 컴포넌트
let productionFilterStatus = '';

async function renderProductions() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');

  headerActions.innerHTML = `
    <button class="btn btn-primary" onclick="openProductionModal()">+ 생산 등록</button>
  `;

  contentBody.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const params = {};
    if (productionFilterStatus) params.status = productionFilterStatus;

    const productions = await API.productions.getAll(params);

    contentBody.innerHTML = `
      <div class="filter-bar">
        <select id="production-status-filter" onchange="filterProductionsByStatus(this.value)">
          <option value="">전체 상태</option>
          <option value="대기" ${productionFilterStatus === '대기' ? 'selected' : ''}>대기</option>
          <option value="진행중" ${productionFilterStatus === '진행중' ? 'selected' : ''}>진행중</option>
          <option value="완료" ${productionFilterStatus === '완료' ? 'selected' : ''}>완료</option>
          <option value="중단" ${productionFilterStatus === '중단' ? 'selected' : ''}>중단</option>
        </select>
      </div>

      <div class="card">
        <div class="card-body">
          ${productions.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>생산번호</th>
                    <th>제품</th>
                    <th>주문번호</th>
                    <th>계획/실적</th>
                    <th>불량/폐기</th>
                    <th>작업자</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${productions.map(prod => `
                    <tr>
                      <td>${prod.production_number}</td>
                      <td>${prod.product_name || '-'}</td>
                      <td>${prod.order_number || '-'}</td>
                      <td>${formatNumber(prod.planned_qty)} / ${formatNumber(prod.actual_qty)}</td>
                      <td>${formatNumber(prod.defect_qty)} / ${formatNumber(prod.waste_qty)}</td>
                      <td>${prod.worker || '-'}</td>
                      <td>${getStatusBadge(prod.status)}</td>
                      <td class="action-btns">
                        <button class="btn btn-sm btn-primary" onclick="viewProduction(${prod.id})">상세</button>
                        ${prod.status === '대기' ? `
                          <button class="btn btn-sm btn-success" onclick="startProduction(${prod.id})">시작</button>
                          <button class="btn btn-sm btn-secondary" onclick="openProductionModal(${prod.id})">수정</button>
                        ` : ''}
                        ${prod.status === '진행중' ? `
                          <button class="btn btn-sm btn-success" onclick="openCompleteProductionModal(${prod.id})">완료</button>
                          <button class="btn btn-sm btn-warning" onclick="stopProduction(${prod.id})">중단</button>
                        ` : ''}
                        ${(prod.status === '대기' || prod.status === '중단') ? `
                          <button class="btn btn-sm btn-danger" onclick="deleteProduction(${prod.id})">삭제</button>
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <div class="icon">🏭</div>
              <p>등록된 생산이 없습니다.</p>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    contentBody.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    showToast(error.message, 'error');
  }
}

function filterProductionsByStatus(status) {
  productionFilterStatus = status;
  renderProductions();
}

// 생산 상세 보기
async function viewProduction(id) {
  try {
    const prod = await API.productions.getById(id);

    const body = `
      <div class="detail-grid">
        <div class="detail-item">
          <label>생산번호</label>
          <div class="value">${prod.production_number}</div>
        </div>
        <div class="detail-item">
          <label>상태</label>
          <div class="value">${getStatusBadge(prod.status)}</div>
        </div>
        <div class="detail-item">
          <label>제품</label>
          <div class="value">${prod.product_code} - ${prod.product_name}</div>
        </div>
        <div class="detail-item">
          <label>단위</label>
          <div class="value">${prod.unit || '-'}</div>
        </div>
        <div class="detail-item">
          <label>주문번호</label>
          <div class="value">${prod.order_number || '-'}</div>
        </div>
        <div class="detail-item">
          <label>작업자</label>
          <div class="value">${prod.worker || '-'}</div>
        </div>
        <div class="detail-item">
          <label>계획 수량</label>
          <div class="value">${formatNumber(prod.planned_qty)}</div>
        </div>
        <div class="detail-item">
          <label>실제 수량</label>
          <div class="value">${formatNumber(prod.actual_qty)}</div>
        </div>
        <div class="detail-item">
          <label>불량 수량</label>
          <div class="value" style="color: var(--warning-color);">${formatNumber(prod.defect_qty)}</div>
        </div>
        <div class="detail-item">
          <label>폐기 수량</label>
          <div class="value" style="color: var(--danger-color);">${formatNumber(prod.waste_qty)}</div>
        </div>
        <div class="detail-item">
          <label>시작일시</label>
          <div class="value">${formatDateTime(prod.started_at)}</div>
        </div>
        <div class="detail-item">
          <label>완료일시</label>
          <div class="value">${formatDateTime(prod.completed_at)}</div>
        </div>
      </div>
    `;

    const footer = `<button class="btn btn-secondary" onclick="closeModal()">닫기</button>`;

    openModal('생산 상세', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 생산 모달
async function openProductionModal(id = null) {
  let production = { product_id: '', order_id: '', planned_qty: '', worker: '' };

  if (id) {
    try {
      production = await API.productions.getById(id);
    } catch (error) {
      showToast(error.message, 'error');
      return;
    }
  }

  try {
    const [products, orders] = await Promise.all([
      API.products.getAll(),
      API.orders.getAll({ status: '진행중' }),
    ]);

    const title = id ? '생산 수정' : '생산 등록';
    const body = `
      <form id="production-form">
        <input type="hidden" id="production-id" value="${id || ''}">
        <div class="form-group">
          <label>제품 *</label>
          <select id="production-product" class="form-control" required>
            <option value="">선택하세요</option>
            ${products.map(p => `<option value="${p.id}" ${production.product_id == p.id ? 'selected' : ''}>${p.product_code} - ${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>연결 주문 (선택)</label>
          <select id="production-order" class="form-control">
            <option value="">선택안함</option>
            ${orders.map(o => `<option value="${o.id}" ${production.order_id == o.id ? 'selected' : ''}>${o.order_number} - ${o.customer_name || ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>계획 수량 *</label>
            <input type="number" id="production-qty" class="form-control" value="${production.planned_qty}" min="1" required>
          </div>
          <div class="form-group">
            <label>작업자</label>
            <input type="text" id="production-worker" class="form-control" value="${production.worker || ''}" placeholder="작업자명">
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveProduction()">저장</button>
    `;

    openModal(title, body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function saveProduction() {
  const id = document.getElementById('production-id').value;
  const data = {
    product_id: parseInt(document.getElementById('production-product').value),
    order_id: document.getElementById('production-order').value || null,
    planned_qty: parseInt(document.getElementById('production-qty').value),
    worker: document.getElementById('production-worker').value.trim(),
  };

  if (!data.product_id || !data.planned_qty) {
    showToast('제품과 계획 수량은 필수입니다.', 'warning');
    return;
  }

  try {
    if (id) {
      await API.productions.update(id, data);
      showToast('생산이 수정되었습니다.', 'success');
    } else {
      await API.productions.create(data);
      showToast('생산이 등록되었습니다.', 'success');
    }
    closeModal();
    renderProductions();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 생산 시작
async function startProduction(id) {
  const worker = prompt('작업자명을 입력하세요 (선택):');

  try {
    await API.productions.start(id, worker || null);
    showToast('생산이 시작되었습니다.', 'success');
    renderProductions();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 생산 완료 모달
async function openCompleteProductionModal(id) {
  try {
    const prod = await API.productions.getById(id);

    const body = `
      <form id="complete-form">
        <input type="hidden" id="complete-id" value="${id}">
        <div class="detail-item" style="margin-bottom: 15px;">
          <label>생산번호</label>
          <div class="value">${prod.production_number}</div>
        </div>
        <div class="detail-item" style="margin-bottom: 15px;">
          <label>제품</label>
          <div class="value">${prod.product_code} - ${prod.product_name}</div>
        </div>
        <div class="detail-item" style="margin-bottom: 15px;">
          <label>계획 수량</label>
          <div class="value">${formatNumber(prod.planned_qty)}</div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>실제 생산 수량 *</label>
            <input type="number" id="complete-actual" class="form-control" value="${prod.planned_qty}" min="0" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>불량 수량</label>
            <input type="number" id="complete-defect" class="form-control" value="0" min="0">
          </div>
          <div class="form-group">
            <label>폐기 수량</label>
            <input type="number" id="complete-waste" class="form-control" value="0" min="0">
          </div>
        </div>
        <p style="color: var(--text-light); font-size: 0.9rem;">
          * 재고에는 (실제 수량 - 불량 - 폐기) 만큼 입고됩니다.
        </p>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-success" onclick="completeProduction()">완료</button>
    `;

    openModal('생산 완료', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function completeProduction() {
  const id = document.getElementById('complete-id').value;
  const data = {
    actual_qty: parseInt(document.getElementById('complete-actual').value) || 0,
    defect_qty: parseInt(document.getElementById('complete-defect').value) || 0,
    waste_qty: parseInt(document.getElementById('complete-waste').value) || 0,
  };

  try {
    await API.productions.complete(id, data);
    showToast('생산이 완료되었습니다.', 'success');
    closeModal();
    renderProductions();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 생산 중단
async function stopProduction(id) {
  if (!confirm('생산을 중단하시겠습니까?')) return;

  const reason = prompt('중단 사유를 입력하세요 (선택):');

  try {
    await API.productions.stop(id, reason || null);
    showToast('생산이 중단되었습니다.', 'success');
    renderProductions();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 생산 삭제
async function deleteProduction(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  try {
    await API.productions.delete(id);
    showToast('생산이 삭제되었습니다.', 'success');
    renderProductions();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
