// 제품 관리 컴포넌트
async function renderProducts() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');

  headerActions.innerHTML = `
    <button class="btn btn-primary" onclick="openProductModal()">+ 제품 등록</button>
  `;

  contentBody.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const products = await API.products.getAll();

    contentBody.innerHTML = `
      <div class="card">
        <div class="card-body">
          ${products.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>제품코드</th>
                    <th>제품명</th>
                    <th>단위</th>
                    <th>단가</th>
                    <th>재고</th>
                    <th>등록일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${products.map(product => `
                    <tr>
                      <td>${product.product_code}</td>
                      <td>${product.name}</td>
                      <td>${product.unit}</td>
                      <td>${formatNumber(product.price)}원</td>
                      <td style="${product.stock_quantity <= 10 ? 'color: var(--color-danger); font-weight: bold;' : ''}">
                        ${formatNumber(product.stock_quantity)}
                      </td>
                      <td>${formatDate(product.created_at)}</td>
                      <td class="action-btns">
                        <button class="btn btn-sm btn-secondary" onclick="openProductModal(${product.id})">수정</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">삭제</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <i data-lucide="package" class="empty-icon"></i>
              <p>등록된 제품이 없습니다.</p>
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

// 제품 모달 열기
async function openProductModal(id = null) {
  let product = { product_code: '', name: '', unit: '개', price: 0 };

  if (id) {
    try {
      product = await API.products.getById(id);
    } catch (error) {
      showToast(error.message, 'error');
      return;
    }
  }

  const title = id ? '제품 수정' : '제품 등록';
  const body = `
    <form id="product-form">
      <input type="hidden" id="product-id" value="${id || ''}">
      <div class="form-row">
        <div class="form-group">
          <label for="product-code">제품코드 *</label>
          <input type="text" id="product-code" class="form-control" value="${product.product_code}" required>
        </div>
        <div class="form-group">
          <label for="product-name">제품명 *</label>
          <input type="text" id="product-name" class="form-control" value="${product.name}" required>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="product-unit">단위</label>
          <input type="text" id="product-unit" class="form-control" value="${product.unit}" placeholder="예: 개, EA, kg">
        </div>
        <div class="form-group">
          <label for="product-price">단가</label>
          <input type="number" id="product-price" class="form-control" value="${product.price}" min="0">
        </div>
      </div>
    </form>
  `;
  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">취소</button>
    <button class="btn btn-primary" onclick="saveProduct()">저장</button>
  `;

  openModal(title, body, footer);
}

// 제품 저장
async function saveProduct() {
  const id = document.getElementById('product-id').value;
  const data = {
    product_code: document.getElementById('product-code').value.trim(),
    name: document.getElementById('product-name').value.trim(),
    unit: document.getElementById('product-unit').value.trim() || '개',
    price: parseFloat(document.getElementById('product-price').value) || 0,
  };

  if (!data.product_code || !data.name) {
    showToast('제품코드와 제품명은 필수입니다.', 'warning');
    return;
  }

  try {
    if (id) {
      await API.products.update(id, data);
      showToast('제품이 수정되었습니다.', 'success');
    } else {
      await API.products.create(data);
      showToast('제품이 등록되었습니다.', 'success');
    }
    closeModal();
    renderProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 제품 삭제
async function deleteProduct(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  try {
    await API.products.delete(id);
    showToast('제품이 삭제되었습니다.', 'success');
    renderProducts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
