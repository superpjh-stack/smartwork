// 출하 관리 컴포넌트
let shipmentFilterStatus = '';

async function renderShipments() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');

  headerActions.innerHTML = `
    <button class="btn btn-primary" onclick="openShipmentModal()">+ 출하 등록</button>
  `;

  contentBody.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const params = {};
    if (shipmentFilterStatus) params.status = shipmentFilterStatus;

    const shipments = await API.shipments.getAll(params);

    contentBody.innerHTML = `
      <div class="filter-bar">
        <select id="shipment-status-filter" onchange="filterShipmentsByStatus(this.value)">
          <option value="">전체 상태</option>
          <option value="대기" ${shipmentFilterStatus === '대기' ? 'selected' : ''}>대기</option>
          <option value="완료" ${shipmentFilterStatus === '완료' ? 'selected' : ''}>완료</option>
          <option value="취소" ${shipmentFilterStatus === '취소' ? 'selected' : ''}>취소</option>
        </select>
      </div>

      <div class="card">
        <div class="card-body">
          ${shipments.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>출하번호</th>
                    <th>주문번호</th>
                    <th>거래처</th>
                    <th>출하일</th>
                    <th>상태</th>
                    <th>등록일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${shipments.map(ship => `
                    <tr>
                      <td>${ship.shipment_number}</td>
                      <td>${ship.order_number || '-'}</td>
                      <td>${ship.customer_name || '-'}</td>
                      <td>${formatDate(ship.shipment_date)}</td>
                      <td>${getStatusBadge(ship.status)}</td>
                      <td>${formatDate(ship.created_at)}</td>
                      <td class="action-btns">
                        <button class="btn btn-sm btn-primary" onclick="viewShipment(${ship.id})">상세</button>
                        ${ship.status === '대기' ? `
                          <button class="btn btn-sm btn-success" onclick="completeShipment(${ship.id})">출하완료</button>
                          <button class="btn btn-sm btn-warning" onclick="cancelShipment(${ship.id})">취소</button>
                        ` : ''}
                        ${ship.status !== '완료' ? `
                          <button class="btn btn-sm btn-danger" onclick="deleteShipment(${ship.id})">삭제</button>
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <i data-lucide="truck" class="empty-icon"></i>
              <p>등록된 출하가 없습니다.</p>
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

function filterShipmentsByStatus(status) {
  shipmentFilterStatus = status;
  renderShipments();
}

// 출하 상세 보기
async function viewShipment(id) {
  try {
    const ship = await API.shipments.getById(id);

    const body = `
      <div class="detail-grid">
        <div class="detail-item">
          <label>출하번호</label>
          <div class="value">${ship.shipment_number}</div>
        </div>
        <div class="detail-item">
          <label>상태</label>
          <div class="value">${getStatusBadge(ship.status)}</div>
        </div>
        <div class="detail-item">
          <label>주문번호</label>
          <div class="value">${ship.order_number || '-'}</div>
        </div>
        <div class="detail-item">
          <label>납기일</label>
          <div class="value">${formatDate(ship.due_date)}</div>
        </div>
        <div class="detail-item">
          <label>거래처</label>
          <div class="value">${ship.customer_name || '-'}</div>
        </div>
        <div class="detail-item">
          <label>출하일</label>
          <div class="value">${formatDate(ship.shipment_date)}</div>
        </div>
        <div class="detail-item">
          <label>연락처</label>
          <div class="value">${ship.contact || '-'}</div>
        </div>
        <div class="detail-item">
          <label>등록일</label>
          <div class="value">${formatDateTime(ship.created_at)}</div>
        </div>
      </div>
      <div class="detail-item" style="margin-top: 15px;">
        <label>배송지</label>
        <div class="value">${ship.address || '-'}</div>
      </div>

      <h4 style="margin-top: 20px; margin-bottom: 10px;">출하 품목</h4>
      <table>
        <thead>
          <tr>
            <th>제품코드</th>
            <th>제품명</th>
            <th>단위</th>
            <th>수량</th>
          </tr>
        </thead>
        <tbody>
          ${ship.items.map(item => `
            <tr>
              <td>${item.product_code}</td>
              <td>${item.product_name}</td>
              <td>${item.unit}</td>
              <td>${formatNumber(item.quantity)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const footer = `<button class="btn btn-secondary" onclick="closeModal()">닫기</button>`;

    openModal('출하 상세', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 출하 모달
let shipmentItems = [];

async function openShipmentModal() {
  shipmentItems = [];

  try {
    const [orders, products] = await Promise.all([
      API.orders.getAll({ status: '진행중' }),
      API.products.getAll(),
    ]);

    const today = new Date().toISOString().slice(0, 10);

    const body = `
      <form id="shipment-form">
        <div class="form-row">
          <div class="form-group">
            <label>주문 *</label>
            <select id="shipment-order" class="form-control" required onchange="loadOrderItems(this.value)">
              <option value="">선택하세요</option>
              ${orders.map(o => `<option value="${o.id}">${o.order_number} - ${o.customer_name || ''}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>출하일</label>
            <input type="date" id="shipment-date" class="form-control" value="${today}">
          </div>
        </div>

        <h4 style="margin-top: 20px; margin-bottom: 10px;">출하 품목</h4>
        <div id="shipment-items-container">
          <p style="color: var(--color-text-secondary);">주문을 선택하면 품목이 표시됩니다.</p>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveShipment()">등록</button>
    `;

    openModal('출하 등록', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadOrderItems(orderId) {
  const container = document.getElementById('shipment-items-container');

  if (!orderId) {
    container.innerHTML = '<p style="color: var(--color-text-secondary);">주문을 선택하면 품목이 표시됩니다.</p>';
    shipmentItems = [];
    return;
  }

  try {
    const order = await API.orders.getById(orderId);
    const inventory = await API.inventory.getAll();
    const invMap = {};
    inventory.forEach(inv => invMap[inv.product_id] = inv.quantity);

    shipmentItems = order.items.map(item => ({
      product_id: item.product_id,
      product_name: `${item.product_code} - ${item.product_name}`,
      order_qty: item.quantity,
      quantity: item.quantity,
      stock: invMap[item.product_id] || 0,
    }));

    renderShipmentItems();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderShipmentItems() {
  const container = document.getElementById('shipment-items-container');

  if (shipmentItems.length === 0) {
    container.innerHTML = '<p style="color: var(--color-text-secondary);">품목이 없습니다.</p>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>제품</th>
          <th>주문수량</th>
          <th>재고</th>
          <th>출하수량</th>
        </tr>
      </thead>
      <tbody>
        ${shipmentItems.map((item, index) => `
          <tr>
            <td>${item.product_name}</td>
            <td>${formatNumber(item.order_qty)}</td>
            <td style="${item.stock < item.order_qty ? 'color: var(--danger-color);' : ''}">${formatNumber(item.stock)}</td>
            <td>
              <input type="number" class="form-control" style="width: 100px;"
                     value="${item.quantity}" min="0" max="${item.stock}"
                     onchange="updateShipmentItemQty(${index}, this.value)">
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function updateShipmentItemQty(index, qty) {
  shipmentItems[index].quantity = parseInt(qty) || 0;
}

async function saveShipment() {
  const orderId = document.getElementById('shipment-order').value;
  const shipmentDate = document.getElementById('shipment-date').value;

  if (!orderId) {
    showToast('주문을 선택해주세요.', 'warning');
    return;
  }

  const items = shipmentItems.filter(item => item.quantity > 0).map(item => ({
    product_id: item.product_id,
    quantity: item.quantity,
  }));

  if (items.length === 0) {
    showToast('출하 품목을 입력해주세요.', 'warning');
    return;
  }

  // 재고 확인
  for (const item of shipmentItems) {
    if (item.quantity > item.stock) {
      showToast(`${item.product_name}의 재고가 부족합니다.`, 'warning');
      return;
    }
  }

  try {
    await API.shipments.create({
      order_id: parseInt(orderId),
      shipment_date: shipmentDate,
      items,
    });
    showToast('출하가 등록되었습니다.', 'success');
    closeModal();
    renderShipments();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function completeShipment(id) {
  if (!confirm('출하를 완료하시겠습니까? 재고에서 차감됩니다.')) return;

  try {
    await API.shipments.complete(id);
    showToast('출하가 완료되었습니다.', 'success');
    renderShipments();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function cancelShipment(id) {
  if (!confirm('출하를 취소하시겠습니까?')) return;

  try {
    await API.shipments.cancel(id);
    showToast('출하가 취소되었습니다.', 'success');
    renderShipments();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteShipment(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  try {
    await API.shipments.delete(id);
    showToast('출하가 삭제되었습니다.', 'success');
    renderShipments();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
