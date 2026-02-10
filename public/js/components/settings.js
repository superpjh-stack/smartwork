// 설정 컴포넌트
async function renderSettings() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');
  headerActions.innerHTML = '';

  contentBody.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const settings = await API.settings.getAll();

    contentBody.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>기본 설정</h3>
        </div>
        <div class="card-body">
          <form id="settings-form">
            <div class="form-row">
              <div class="form-group">
                <label for="setting-company">회사명</label>
                <input type="text" id="setting-company" class="form-control" value="${settings.company_name || '스마트공방'}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="setting-order-prefix">주문번호 접두어</label>
                <input type="text" id="setting-order-prefix" class="form-control" value="${settings.order_prefix || 'ORD'}" placeholder="예: ORD">
              </div>
              <div class="form-group">
                <label for="setting-production-prefix">생산번호 접두어</label>
                <input type="text" id="setting-production-prefix" class="form-control" value="${settings.production_prefix || 'PRD'}" placeholder="예: PRD">
              </div>
              <div class="form-group">
                <label for="setting-shipment-prefix">출하번호 접두어</label>
                <input type="text" id="setting-shipment-prefix" class="form-control" value="${settings.shipment_prefix || 'SHP'}" placeholder="예: SHP">
              </div>
            </div>
            <div style="margin-top: 20px;">
              <button type="button" class="btn btn-primary" onclick="saveSettings()">설정 저장</button>
            </div>
          </form>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <h3>데이터 관리</h3>
        </div>
        <div class="card-body">
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-success" onclick="loadSampleData()">샘플 데이터 생성</button>
          </div>
          <p style="color: var(--text-light); margin-top: 10px; font-size: 0.9rem;">
            * 샘플 데이터 생성은 테스트 목적으로 사용하세요.
          </p>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <h3>시스템 정보</h3>
        </div>
        <div class="card-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>시스템명</label>
              <div class="value">스마트공방 시스템</div>
            </div>
            <div class="detail-item">
              <label>버전</label>
              <div class="value">1.0.0</div>
            </div>
            <div class="detail-item">
              <label>데이터베이스</label>
              <div class="value">SQLite3</div>
            </div>
            <div class="detail-item">
              <label>서버</label>
              <div class="value">Node.js + Express</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    contentBody.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    showToast(error.message, 'error');
  }
}

async function saveSettings() {
  const settings = {
    company_name: document.getElementById('setting-company').value.trim(),
    order_prefix: document.getElementById('setting-order-prefix').value.trim(),
    production_prefix: document.getElementById('setting-production-prefix').value.trim(),
    shipment_prefix: document.getElementById('setting-shipment-prefix').value.trim(),
  };

  try {
    await API.settings.setBulk(settings);
    showToast('설정이 저장되었습니다.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 샘플 데이터 생성
async function loadSampleData() {
  if (!confirm('샘플 데이터를 생성하시겠습니까? 기존 데이터에 추가됩니다.')) return;

  try {
    // 샘플 제품 등록
    const sampleProducts = [
      { product_code: 'P001', name: '스마트 센서 A', unit: 'EA', price: 50000 },
      { product_code: 'P002', name: '스마트 센서 B', unit: 'EA', price: 75000 },
      { product_code: 'P003', name: '컨트롤러 유닛', unit: 'SET', price: 150000 },
      { product_code: 'P004', name: '전원 모듈', unit: 'EA', price: 30000 },
      { product_code: 'P005', name: '통신 모듈', unit: 'EA', price: 45000 },
    ];

    for (const product of sampleProducts) {
      try {
        await API.products.create(product);
      } catch (e) {
        console.log('Product already exists:', product.product_code);
      }
    }

    // 샘플 거래처 등록
    const sampleCustomers = [
      { customer_code: 'C001', name: '테크솔루션', contact: '02-1234-5678', address: '서울시 강남구 테헤란로 123' },
      { customer_code: 'C002', name: '스마트팩토리', contact: '031-987-6543', address: '경기도 성남시 분당구 판교로 456' },
      { customer_code: 'C003', name: '자동화시스템', contact: '032-555-1234', address: '인천시 연수구 송도동 789' },
    ];

    for (const customer of sampleCustomers) {
      try {
        await API.customers.create(customer);
      } catch (e) {
        console.log('Customer already exists:', customer.customer_code);
      }
    }

    // 재고 입고
    const products = await API.products.getAll();
    for (const product of products.slice(0, 5)) {
      try {
        await API.inventory.receive({
          product_id: product.id,
          quantity: 100,
          reason: '샘플 데이터 초기 재고',
        });
      } catch (e) {
        console.log('Inventory receive error:', e.message);
      }
    }

    showToast('샘플 데이터가 생성되었습니다.', 'success');
    renderSettings();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
