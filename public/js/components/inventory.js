// 재고 관리 컴포넌트
let inventoryActiveTab = 'list';

async function renderInventory() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');

  headerActions.innerHTML = `
    <button class="btn btn-success" onclick="openInventoryReceiveModal()">+ 입고</button>
    <button class="btn btn-warning" onclick="openInventoryUseModal()">- 출고/사용</button>
  `;

  contentBody.innerHTML = `
    <div class="tabs">
      <button class="tab ${inventoryActiveTab === 'list' ? 'active' : ''}" onclick="switchInventoryTab('list')">재고 현황</button>
      <button class="tab ${inventoryActiveTab === 'history' ? 'active' : ''}" onclick="switchInventoryTab('history')">입출고 이력</button>
    </div>
    <div id="inventory-content"></div>
  `;

  if (inventoryActiveTab === 'list') {
    await renderInventoryList();
  } else {
    await renderInventoryHistory();
  }
}

function switchInventoryTab(tab) {
  inventoryActiveTab = tab;
  renderInventory();
}

async function renderInventoryList() {
  const container = document.getElementById('inventory-content');
  container.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const inventory = await API.inventory.getAll();

    container.innerHTML = `
      <div class="card">
        <div class="card-body">
          ${inventory.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>제품코드</th>
                    <th>제품명</th>
                    <th>단위</th>
                    <th>현재수량</th>
                    <th>위치</th>
                    <th>최종수정</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${inventory.map(inv => `
                    <tr>
                      <td>${escapeHtml(inv.product_code)}</td>
                      <td>${escapeHtml(inv.product_name)}</td>
                      <td>${escapeHtml(inv.unit)}</td>
                      <td style="${inv.quantity <= 10 ? 'color: var(--danger-color); font-weight: bold;' : ''}">
                        ${formatNumber(inv.quantity)}
                      </td>
                      <td>${escapeHtml(inv.location || '-')}</td>
                      <td>${formatDateTime(inv.updated_at)}</td>
                      <td class="action-btns">
                        <button class="btn btn-sm btn-secondary" onclick="openInventoryAdjustModal(${inv.product_id})">조정</button>
                        <button class="btn btn-sm btn-primary" onclick="openInventoryHistoryModal(${inv.product_id})">이력</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <i data-lucide="warehouse" class="empty-icon"></i>
              <p>등록된 재고가 없습니다.</p>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    showToast(error.message, 'error');
  }
}

async function renderInventoryHistory() {
  const container = document.getElementById('inventory-content');
  container.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const history = await API.inventory.getAllHistory();

    container.innerHTML = `
      <div class="card">
        <div class="card-body">
          ${history.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>일시</th>
                    <th>제품코드</th>
                    <th>제품명</th>
                    <th>구분</th>
                    <th>수량</th>
                    <th>사유</th>
                  </tr>
                </thead>
                <tbody>
                  ${history.map(h => `
                    <tr>
                      <td>${formatDateTime(h.created_at)}</td>
                      <td>${escapeHtml(h.product_code)}</td>
                      <td>${escapeHtml(h.product_name)}</td>
                      <td>${getChangeTypeBadge(h.change_type)}</td>
                      <td style="color: ${h.quantity >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)'}">
                        ${h.quantity >= 0 ? '+' : ''}${formatNumber(h.quantity)}
                      </td>
                      <td>${escapeHtml(h.reason || '-')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <i data-lucide="clipboard-list" class="empty-icon"></i>
              <p>입출고 이력이 없습니다.</p>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    showToast(error.message, 'error');
  }
}

function getChangeTypeBadge(type) {
  const colors = {
    '입고': 'success',
    '출고': 'danger',
    '사용': 'warning',
    '조정': 'secondary',
  };
  return `<span class="badge badge-${colors[escapeHtml(type)] || 'secondary'}">${escapeHtml(type)}</span>`;
}

// 입고 모달
async function openInventoryReceiveModal() {
  try {
    const products = await API.products.getAll();

    const body = `
      <form id="receive-form">
        <div class="form-group">
          <label>제품 *</label>
          <select id="receive-product" class="form-control" required>
            <option value="">선택하세요</option>
            ${products.map(p => `<option value="${p.id}">${escapeHtml(p.product_code)} - ${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>수량 *</label>
          <input type="number" id="receive-quantity" class="form-control" min="1" required>
        </div>
        <div class="form-group">
          <label>사유</label>
          <input type="text" id="receive-reason" class="form-control" placeholder="예: 발주 입고, 반품 등">
        </div>
      </form>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-success" onclick="saveInventoryReceive()">입고</button>
    `;

    openModal('재고 입고', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function saveInventoryReceive() {
  const data = {
    product_id: parseInt(document.getElementById('receive-product').value),
    quantity: parseInt(document.getElementById('receive-quantity').value),
    reason: document.getElementById('receive-reason').value.trim(),
  };

  if (!data.product_id || !data.quantity || data.quantity <= 0) {
    showToast('제품과 수량을 확인해주세요.', 'warning');
    return;
  }

  try {
    await API.inventory.receive(data);
    showToast('입고 처리되었습니다.', 'success');
    closeModal();
    renderInventory();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 출고/사용 모달
async function openInventoryUseModal() {
  try {
    const products = await API.products.getAll();

    const body = `
      <form id="use-form">
        <div class="form-group">
          <label>제품 *</label>
          <select id="use-product" class="form-control" required>
            <option value="">선택하세요</option>
            ${products.map(p => `<option value="${p.id}">${escapeHtml(p.product_code)} - ${escapeHtml(p.name)} (재고: ${p.stock_quantity})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>구분 *</label>
          <select id="use-type" class="form-control" required>
            <option value="사용">사용</option>
            <option value="출고">출고</option>
          </select>
        </div>
        <div class="form-group">
          <label>수량 *</label>
          <input type="number" id="use-quantity" class="form-control" min="1" required>
        </div>
        <div class="form-group">
          <label>사유</label>
          <input type="text" id="use-reason" class="form-control" placeholder="예: 생산 사용, 폐기 등">
        </div>
      </form>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-warning" onclick="saveInventoryUse()">출고/사용</button>
    `;

    openModal('재고 출고/사용', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function saveInventoryUse() {
  const data = {
    product_id: parseInt(document.getElementById('use-product').value),
    quantity: parseInt(document.getElementById('use-quantity').value),
    change_type: document.getElementById('use-type').value,
    reason: document.getElementById('use-reason').value.trim(),
  };

  if (!data.product_id || !data.quantity || data.quantity <= 0) {
    showToast('제품과 수량을 확인해주세요.', 'warning');
    return;
  }

  try {
    await API.inventory.use(data);
    showToast('출고 처리되었습니다.', 'success');
    closeModal();
    renderInventory();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 재고 조정 모달
async function openInventoryAdjustModal(productId) {
  try {
    const inventory = await API.inventory.getById(productId);

    const body = `
      <form id="adjust-form">
        <input type="hidden" id="adjust-product-id" value="${productId}">
        <div class="form-group">
          <label>제품</label>
          <input type="text" class="form-control" value="${escapeHtml(inventory.product_code)} - ${escapeHtml(inventory.product_name)}" disabled>
        </div>
        <div class="form-group">
          <label>현재 수량</label>
          <input type="text" class="form-control" value="${inventory.quantity}" disabled>
        </div>
        <div class="form-group">
          <label>조정 수량 *</label>
          <input type="number" id="adjust-quantity" class="form-control" value="${inventory.quantity}" min="0" required>
        </div>
        <div class="form-group">
          <label>사유</label>
          <input type="text" id="adjust-reason" class="form-control" placeholder="예: 실사 조정, 오류 수정 등">
        </div>
      </form>
    `;
    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveInventoryAdjust()">조정</button>
    `;

    openModal('재고 조정', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function saveInventoryAdjust() {
  const data = {
    product_id: parseInt(document.getElementById('adjust-product-id').value),
    quantity: parseInt(document.getElementById('adjust-quantity').value),
    reason: document.getElementById('adjust-reason').value.trim(),
  };

  if (data.quantity < 0) {
    showToast('수량은 0 이상이어야 합니다.', 'warning');
    return;
  }

  try {
    await API.inventory.adjust(data);
    showToast('재고가 조정되었습니다.', 'success');
    closeModal();
    renderInventory();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 제품별 이력 모달
async function openInventoryHistoryModal(productId) {
  try {
    const history = await API.inventory.getHistory(productId);

    const body = history.length > 0 ? `
      <div class="table-container" style="max-height: 400px; overflow-y: auto;">
        <table>
          <thead>
            <tr>
              <th>일시</th>
              <th>구분</th>
              <th>수량</th>
              <th>사유</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(h => `
              <tr>
                <td>${formatDateTime(h.created_at)}</td>
                <td>${getChangeTypeBadge(h.change_type)}</td>
                <td style="color: ${h.quantity >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)'}">
                  ${h.quantity >= 0 ? '+' : ''}${formatNumber(h.quantity)}
                </td>
                <td>${escapeHtml(h.reason || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<div class="empty-state">이력이 없습니다.</div>';

    const footer = `<button class="btn btn-secondary" onclick="closeModal()">닫기</button>`;

    openModal('입출고 이력', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}
