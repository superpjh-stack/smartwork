// 회원 관리 컴포넌트
async function renderUsers() {
  const contentBody = document.getElementById('content-body');
  const headerActions = document.getElementById('header-actions');

  if (currentUser && currentUser.role === 'super_admin') {
    headerActions.innerHTML = `
      <button class="btn btn-primary" onclick="openUserModal()">+ 사용자 등록</button>
    `;
  } else {
    headerActions.innerHTML = '';
  }

  contentBody.innerHTML = '<div class="loading">로딩 중...</div>';

  try {
    const users = await API.users.getAll();

    contentBody.innerHTML = `
      <div class="card">
        <div class="card-body">
          ${users.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>아이디</th>
                    <th>이름</th>
                    <th>역할</th>
                    <th>회사</th>
                    <th>상태</th>
                    <th>등록일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${users.map(user => `
                    <tr>
                      <td>${escapeHtml(user.username)}</td>
                      <td>${escapeHtml(user.name)}</td>
                      <td>${getRoleBadge(user.role)}</td>
                      <td>${escapeHtml(user.company_name || '-')}</td>
                      <td>${user.is_active ? '<span class="badge badge-success">활성</span>' : '<span class="badge badge-secondary">비활성</span>'}</td>
                      <td>${formatDate(user.created_at)}</td>
                      <td class="action-btns">
                        <button class="btn btn-sm btn-primary" onclick="viewUser(${user.id})">상세</button>
                        ${currentUser && currentUser.role === 'super_admin' ? `
                          <button class="btn btn-sm btn-secondary" onclick="openUserModal(${user.id})">수정</button>
                          ${user.id !== currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">삭제</button>` : ''}
                        ` : ''}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="empty-state">
              <i data-lucide="users" class="empty-icon"></i>
              <p>등록된 사용자가 없습니다.</p>
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

// 역할 배지
function getRoleBadge(role) {
  if (role === 'super_admin') {
    return '<span class="badge badge-danger">전체관리자</span>';
  }
  return '<span class="badge badge-primary">회사관리자</span>';
}

// 사용자 상세 모달
async function viewUser(id) {
  try {
    const user = await API.users.getById(id);

    const body = `
      <div class="detail-grid">
        <div class="detail-item">
          <label>아이디</label>
          <div class="value">${escapeHtml(user.username)}</div>
        </div>
        <div class="detail-item">
          <label>이름</label>
          <div class="value">${escapeHtml(user.name)}</div>
        </div>
        <div class="detail-item">
          <label>역할</label>
          <div class="value">${getRoleBadge(user.role)}</div>
        </div>
        <div class="detail-item">
          <label>소속 회사</label>
          <div class="value">${escapeHtml(user.company_name || '-')}</div>
        </div>
        <div class="detail-item">
          <label>상태</label>
          <div class="value">${user.is_active ? '<span class="badge badge-success">활성</span>' : '<span class="badge badge-secondary">비활성</span>'}</div>
        </div>
        <div class="detail-item">
          <label>등록일</label>
          <div class="value">${formatDateTime(user.created_at)}</div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="closeModal()">닫기</button>
      ${currentUser && (currentUser.role === 'super_admin' || currentUser.id === user.id) ? `
        <button class="btn btn-primary" onclick="closeModal(); openUserModal(${user.id})">수정</button>
      ` : ''}
    `;

    openModal('사용자 상세', body, footer);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 사용자 등록/수정 모달
async function openUserModal(id = null) {
  let user = { username: '', name: '', role: 'company_admin', company_id: '', is_active: 1 };
  let companies = [];

  try {
    if (currentUser && currentUser.role === 'super_admin') {
      companies = await API.users.getCompanies();
    }

    if (id) {
      user = await API.users.getById(id);
    }
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }

  const isSuperAdmin = currentUser && currentUser.role === 'super_admin';
  const title = id ? '사용자 수정' : '사용자 등록';

  const body = `
    <form id="user-form">
      <input type="hidden" id="user-id" value="${id || ''}">
      <div class="form-row">
        <div class="form-group">
          <label for="user-username">아이디 *</label>
          <input type="text" id="user-username" class="form-control" value="${escapeHtml(user.username)}" ${!isSuperAdmin && id ? 'readonly' : ''} required>
        </div>
        <div class="form-group">
          <label for="user-name">이름 *</label>
          <input type="text" id="user-name" class="form-control" value="${escapeHtml(user.name)}" required>
        </div>
      </div>
      <div class="form-group">
        <label for="user-password">비밀번호 ${id ? '(변경 시에만 입력)' : '*'}</label>
        <input type="password" id="user-password" class="form-control" placeholder="${id ? '변경하지 않으려면 비워두세요' : '비밀번호 입력'}">
      </div>
      ${isSuperAdmin ? `
        <div class="form-row">
          <div class="form-group">
            <label for="user-role">역할</label>
            <select id="user-role" class="form-control">
              <option value="company_admin" ${user.role === 'company_admin' ? 'selected' : ''}>회사관리자</option>
              <option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>전체관리자</option>
            </select>
          </div>
          <div class="form-group">
            <label for="user-company">소속 회사</label>
            <select id="user-company" class="form-control">
              <option value="">없음</option>
              ${companies.map(c => `<option value="${c.id}" ${user.company_id == c.id ? 'selected' : ''}>${escapeHtml(c.name)} (${escapeHtml(c.company_code)})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="user-active">상태</label>
          <select id="user-active" class="form-control">
            <option value="1" ${user.is_active ? 'selected' : ''}>활성</option>
            <option value="0" ${!user.is_active ? 'selected' : ''}>비활성</option>
          </select>
        </div>
      ` : ''}
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">취소</button>
    <button class="btn btn-primary" onclick="saveUser()">저장</button>
  `;

  openModal(title, body, footer);
}

// 사용자 저장
async function saveUser() {
  const id = document.getElementById('user-id').value;
  const isSuperAdmin = currentUser && currentUser.role === 'super_admin';

  const data = {
    username: document.getElementById('user-username').value.trim(),
    name: document.getElementById('user-name').value.trim(),
    password: document.getElementById('user-password').value,
  };

  if (isSuperAdmin) {
    data.role = document.getElementById('user-role') ? document.getElementById('user-role').value : 'company_admin';
    data.company_id = document.getElementById('user-company') ? (document.getElementById('user-company').value || null) : null;
    data.is_active = document.getElementById('user-active') ? parseInt(document.getElementById('user-active').value) : 1;
  }

  if (!data.username || !data.name) {
    showToast('아이디와 이름은 필수입니다.', 'warning');
    return;
  }

  if (!id && !data.password) {
    showToast('비밀번호는 필수입니다.', 'warning');
    return;
  }

  try {
    if (id) {
      await API.users.update(id, data);
      showToast('사용자가 수정되었습니다.', 'success');
    } else {
      await API.users.create(data);
      showToast('사용자가 등록되었습니다.', 'success');
    }
    closeModal();
    renderUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 사용자 삭제
async function deleteUser(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  try {
    await API.users.delete(id);
    showToast('사용자가 삭제되었습니다.', 'success');
    renderUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
