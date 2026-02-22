// 거래처 관리 컴포넌트
async function renderCustomers() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');

  headerActions.innerHTML = `
    <button class="btn btn-primary" onclick="openCustomerModal()">+ 거래처 등록</button>
  `;

  contentBody.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const customers = await API.customers.getAll();

    contentBody.innerHTML = `
      <div class="card">
        <div class="card-body">
          ${customers.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>거래처코드</th>
                    <th>거래처명</th>
                    <th>연락처</th>
                    <th>주소</th>
                    <th>등록일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${customers.map(customer => `
                    <tr>
                      <td>${escapeHtml(customer.customer_code)}</td>
                      <td>${escapeHtml(customer.name)}</td>
                      <td>${escapeHtml(customer.contact || '-')}</td>
                      <td>${escapeHtml(customer.address || '-')}</td>
                      <td>${formatDate(customer.created_at)}</td>
                      <td class="action-btns">
                        <button class="btn btn-sm btn-primary" onclick="viewCustomer(${customer.id})">상세</button>
                        <button class="btn btn-sm btn-secondary" onclick="openCustomerModal(${customer.id})">수정</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})">삭제</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <i data-lucide="building-2" class="empty-icon"></i>
              <p>등록된 거래처가 없습니다.</p>
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

// 거래처 상세 보기
async function viewCustomer(id) {
  try {
    const customer = await API.customers.getById(id);

    const body = `
      <div class="detail-grid">
        <div class="detail-item">
          <label>거래처코드</label>
          <div class="value">${escapeHtml(customer.customer_code)}</div>
        </div>
        <div class="detail-item">
          <label>거래처명</label>
          <div class="value">${escapeHtml(customer.name)}</div>
        </div>
        <div class="detail-item">
          <label>연락처</label>
          <div class="value">${escapeHtml(customer.contact || '-')}</div>
        </div>
        <div class="detail-item">
          <label>등록일</label>
          <div class="value">${formatDate(customer.created_at)}</div>
        </div>
      </div>
      <div class="detail-item" style="margin-top: 15px;">
        <label>주소</label>
        <div class="value">${escapeHtml(customer.address || '-')}</div>
      </div>

      ${customer.orders && customer.orders.length > 0 ? `
        <h4 style="margin-top: 20px; margin-bottom: 10px;">최근 주문 이력</h4>
        <table>
          <thead>
            <tr>
              <th>주문번호</th>
              <th>주문일</th>
              <th>상태</th>
              <th>금액</th>
            </tr>
          </thead>
          <tbody>
            ${customer.orders.map(order => `
              <tr>
                <td>${escapeHtml(order.order_number)}</td>
                <td>${formatDate(order.order_date)}</td>
                <td>${getStatusBadge(order.status)}</td>
                <td>${formatNumber(order.total_amount)}원</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p style="margin-top: 20px; color: var(--color-text-secondary);">주문 이력이 없습니다.</p>'}
    `;

    const footer = `<button class="btn btn-secondary" onclick="closeModal()">닫기</button>`;

    openModal('거래처 상세', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 거래처 모달 열기
async function openCustomerModal(id = null) {
  let customer = { customer_code: '', name: '', contact: '', address: '' };

  if (id) {
    try {
      customer = await API.customers.getById(id);
    } catch (error) {
      showToast(error.message, 'error');
      return;
    }
  }

  const title = id ? '거래처 수정' : '거래처 등록';
  const body = `
    <form id="customer-form">
      <input type="hidden" id="customer-id" value="${id || ''}">
      <div class="form-row">
        <div class="form-group">
          <label for="customer-code">거래처코드 *</label>
          <input type="text" id="customer-code" class="form-control" value="${escapeHtml(customer.customer_code)}" required>
        </div>
        <div class="form-group">
          <label for="customer-name">거래처명 *</label>
          <input type="text" id="customer-name" class="form-control" value="${escapeHtml(customer.name)}" required>
        </div>
      </div>
      <div class="form-group">
        <label for="customer-contact">연락처</label>
        <input type="text" id="customer-contact" class="form-control" value="${escapeHtml(customer.contact || '')}" placeholder="예: 02-1234-5678">
      </div>
      <div class="form-group">
        <label for="customer-address">주소</label>
        <textarea id="customer-address" class="form-control" rows="2" placeholder="주소를 입력하세요">${escapeHtml(customer.address || '')}</textarea>
      </div>
    </form>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">취소</button>
    <button class="btn btn-primary" onclick="saveCustomer()">저장</button>
  `;

  openModal(title, body, footer);
}

// 거래처 저장
async function saveCustomer() {
  const id = document.getElementById('customer-id').value;
  const data = {
    customer_code: document.getElementById('customer-code').value.trim(),
    name: document.getElementById('customer-name').value.trim(),
    contact: document.getElementById('customer-contact').value.trim(),
    address: document.getElementById('customer-address').value.trim(),
  };

  if (!data.customer_code || !data.name) {
    showToast('거래처코드와 거래처명은 필수입니다.', 'warning');
    return;
  }

  try {
    if (id) {
      await API.customers.update(id, data);
      showToast('거래처가 수정되었습니다.', 'success');
    } else {
      await API.customers.create(data);
      showToast('거래처가 등록되었습니다.', 'success');
    }
    closeModal();
    renderCustomers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 거래처 삭제
async function deleteCustomer(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  try {
    await API.customers.delete(id);
    showToast('거래처가 삭제되었습니다.', 'success');
    renderCustomers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
