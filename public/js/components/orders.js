// 주문 관리 컴포넌트
let orderFilterStatus = '';

async function renderOrders() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');

  headerActions.innerHTML = `
    <button class="btn btn-primary" onclick="openOrderModal()">+ 주문 등록</button>
  `;

  contentBody.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const params = {};
    if (orderFilterStatus) params.status = orderFilterStatus;

    const orders = await API.orders.getAll(params);

    contentBody.innerHTML = `
      <div class="filter-bar">
        <select id="order-status-filter" onchange="filterOrdersByStatus(this.value)">
          <option value="">전체 상태</option>
          <option value="대기" ${orderFilterStatus === '대기' ? 'selected' : ''}>대기</option>
          <option value="진행중" ${orderFilterStatus === '진행중' ? 'selected' : ''}>진행중</option>
          <option value="완료" ${orderFilterStatus === '완료' ? 'selected' : ''}>완료</option>
          <option value="취소" ${orderFilterStatus === '취소' ? 'selected' : ''}>취소</option>
        </select>
      </div>

      <div class="card">
        <div class="card-body">
          ${orders.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>주문번호</th>
                    <th>거래처</th>
                    <th>주문일</th>
                    <th>납기일</th>
                    <th>상태</th>
                    <th>금액</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.map(order => `
                    <tr>
                      <td>${order.order_number}</td>
                      <td>${order.customer_name || '-'}</td>
                      <td>${formatDate(order.order_date)}</td>
                      <td>${formatDate(order.due_date)}</td>
                      <td>${getStatusBadge(order.status)}</td>
                      <td>${formatNumber(order.total_amount)}원</td>
                      <td class="action-btns">
                        <button class="btn btn-sm btn-primary" onclick="viewOrder(${order.id})">상세</button>
                        ${order.status === '대기' ? `
                          <button class="btn btn-sm btn-success" onclick="changeOrderStatus(${order.id}, '진행중')">진행</button>
                          <button class="btn btn-sm btn-secondary" onclick="openOrderModal(${order.id})">수정</button>
                        ` : ''}
                        ${order.status === '진행중' ? `
                          <button class="btn btn-sm btn-success" onclick="changeOrderStatus(${order.id}, '완료')">완료</button>
                        ` : ''}
                        ${(order.status === '대기' || order.status === '취소') ? `
                          <button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.id})">삭제</button>
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <div class="icon">📝</div>
              <p>등록된 주문이 없습니다.</p>
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

function filterOrdersByStatus(status) {
  orderFilterStatus = status;
  renderOrders();
}

// 주문 상세 보기
async function viewOrder(id) {
  try {
    const order = await API.orders.getById(id);

    const body = `
      <div class="detail-grid">
        <div class="detail-item">
          <label>주문번호</label>
          <div class="value">${order.order_number}</div>
        </div>
        <div class="detail-item">
          <label>상태</label>
          <div class="value">${getStatusBadge(order.status)}</div>
        </div>
        <div class="detail-item">
          <label>거래처</label>
          <div class="value">${order.customer_name || '-'}</div>
        </div>
        <div class="detail-item">
          <label>연락처</label>
          <div class="value">${order.contact || '-'}</div>
        </div>
        <div class="detail-item">
          <label>주문일</label>
          <div class="value">${formatDate(order.order_date)}</div>
        </div>
        <div class="detail-item">
          <label>납기일</label>
          <div class="value">${formatDate(order.due_date)}</div>
        </div>
      </div>
      <div class="detail-item" style="margin-top: 15px;">
        <label>배송지</label>
        <div class="value">${order.address || '-'}</div>
      </div>

      <h4 style="margin-top: 20px; margin-bottom: 10px;">주문 품목</h4>
      <table>
        <thead>
          <tr>
            <th>제품코드</th>
            <th>제품명</th>
            <th>단위</th>
            <th>수량</th>
            <th>단가</th>
            <th>금액</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td>${item.product_code}</td>
              <td>${item.product_name}</td>
              <td>${item.unit}</td>
              <td>${formatNumber(item.quantity)}</td>
              <td>${formatNumber(item.unit_price)}원</td>
              <td>${formatNumber(item.quantity * item.unit_price)}원</td>
            </tr>
          `).join('')}
          <tr style="font-weight: bold; background-color: #f8f9fa;">
            <td colspan="5" style="text-align: right;">합계</td>
            <td>${formatNumber(order.total_amount)}원</td>
          </tr>
        </tbody>
      </table>
    `;

    const footer = `<button class="btn btn-secondary" onclick="closeModal()">닫기</button>`;

    openModal('주문 상세', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 주문 모달
let orderItems = [];

async function openOrderModal(id = null) {
  let order = { customer_id: '', due_date: '', items: [] };

  if (id) {
    try {
      order = await API.orders.getById(id);
      orderItems = order.items.map(item => ({
        product_id: item.product_id,
        product_name: `${item.product_code} - ${item.product_name}`,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));
    } catch (error) {
      showToast(error.message, 'error');
      return;
    }
  } else {
    orderItems = [];
  }

  try {
    const [customers, products] = await Promise.all([
      API.customers.getAll(),
      API.products.getAll(),
    ]);

    const title = id ? '주문 수정' : '주문 등록';
    const body = `
      <form id="order-form">
        <input type="hidden" id="order-id" value="${id || ''}">
        <div class="form-row">
          <div class="form-group">
            <label>거래처 *</label>
            <select id="order-customer" class="form-control" required>
              <option value="">선택하세요</option>
              ${customers.map(c => `<option value="${c.id}" ${order.customer_id == c.id ? 'selected' : ''}>${c.customer_code} - ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>납기일</label>
            <input type="date" id="order-due-date" class="form-control" value="${order.due_date || ''}">
          </div>
        </div>

        <h4 style="margin-top: 20px; margin-bottom: 10px;">주문 품목</h4>
        <div class="form-row" style="margin-bottom: 10px;">
          <div class="form-group" style="flex: 2;">
            <select id="add-item-product" class="form-control">
              <option value="">제품 선택</option>
              ${products.map(p => `<option value="${p.id}" data-name="${p.product_code} - ${p.name}" data-price="${p.price}">${p.product_code} - ${p.name} (${formatNumber(p.price)}원)</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex: 1;">
            <input type="number" id="add-item-qty" class="form-control" placeholder="수량" min="1">
          </div>
          <div class="form-group" style="flex: 1;">
            <input type="number" id="add-item-price" class="form-control" placeholder="단가">
          </div>
          <button type="button" class="btn btn-success" onclick="addOrderItem()">추가</button>
        </div>

        <div id="order-items-list"></div>
        <div id="order-total" style="text-align: right; font-weight: bold; margin-top: 10px;"></div>
      </form>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn btn-primary" onclick="saveOrder()">저장</button>
    `;

    openModal(title, body, footer);

    // 제품 선택 시 단가 자동 입력
    document.getElementById('add-item-product').addEventListener('change', function () {
      const option = this.options[this.selectedIndex];
      if (option.value) {
        document.getElementById('add-item-price').value = option.dataset.price;
      }
    });

    renderOrderItems();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function addOrderItem() {
  const productSelect = document.getElementById('add-item-product');
  const product_id = parseInt(productSelect.value);
  const product_name = productSelect.options[productSelect.selectedIndex].dataset.name;
  const quantity = parseInt(document.getElementById('add-item-qty').value);
  const unit_price = parseFloat(document.getElementById('add-item-price').value);

  if (!product_id || !quantity || !unit_price) {
    showToast('제품, 수량, 단가를 모두 입력해주세요.', 'warning');
    return;
  }

  // 중복 체크
  const existing = orderItems.find(item => item.product_id === product_id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    orderItems.push({ product_id, product_name, quantity, unit_price });
  }

  // 입력 필드 초기화
  productSelect.value = '';
  document.getElementById('add-item-qty').value = '';
  document.getElementById('add-item-price').value = '';

  renderOrderItems();
}

function removeOrderItem(index) {
  orderItems.splice(index, 1);
  renderOrderItems();
}

function renderOrderItems() {
  const container = document.getElementById('order-items-list');
  const totalEl = document.getElementById('order-total');

  if (orderItems.length === 0) {
    container.innerHTML = '<div style="color: var(--text-light); text-align: center; padding: 20px;">품목을 추가해주세요.</div>';
    totalEl.innerHTML = '';
    return;
  }

  let total = 0;
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>제품</th>
          <th>수량</th>
          <th>단가</th>
          <th>금액</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${orderItems.map((item, index) => {
    const amount = item.quantity * item.unit_price;
    total += amount;
    return `
            <tr>
              <td>${item.product_name}</td>
              <td>${formatNumber(item.quantity)}</td>
              <td>${formatNumber(item.unit_price)}원</td>
              <td>${formatNumber(amount)}원</td>
              <td><button type="button" class="btn btn-sm btn-danger" onclick="removeOrderItem(${index})">삭제</button></td>
            </tr>
          `;
  }).join('')}
      </tbody>
    </table>
  `;

  totalEl.innerHTML = `합계: ${formatNumber(total)}원`;
}

async function saveOrder() {
  const id = document.getElementById('order-id').value;
  const data = {
    customer_id: parseInt(document.getElementById('order-customer').value),
    due_date: document.getElementById('order-due-date').value || null,
    items: orderItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  };

  if (!data.customer_id) {
    showToast('거래처를 선택해주세요.', 'warning');
    return;
  }

  if (data.items.length === 0) {
    showToast('주문 품목을 추가해주세요.', 'warning');
    return;
  }

  try {
    if (id) {
      await API.orders.update(id, data);
      showToast('주문이 수정되었습니다.', 'success');
    } else {
      await API.orders.create(data);
      showToast('주문이 등록되었습니다.', 'success');
    }
    closeModal();
    renderOrders();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function changeOrderStatus(id, status) {
  if (!confirm(`주문 상태를 '${status}'(으)로 변경하시겠습니까?`)) return;

  try {
    await API.orders.updateStatus(id, status);
    showToast('상태가 변경되었습니다.', 'success');
    renderOrders();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteOrder(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  try {
    await API.orders.delete(id);
    showToast('주문이 삭제되었습니다.', 'success');
    renderOrders();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
