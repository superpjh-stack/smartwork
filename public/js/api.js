// API 통신 모듈
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    // Authorization 헤더 자동 추가
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      // 401 응답 시 로그인 화면으로 리다이렉트
      if (response.status === 401 && !endpoint.startsWith('/auth/')) {
        localStorage.removeItem('token');
        if (typeof showLoginScreen === 'function') {
          showLoginScreen();
        }
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // GET
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  // POST
  post(endpoint, data) {
    return this.request(endpoint, { method: 'POST', body: data });
  },

  // PUT
  put(endpoint, data) {
    return this.request(endpoint, { method: 'PUT', body: data });
  },

  // PATCH
  patch(endpoint, data) {
    return this.request(endpoint, { method: 'PATCH', body: data });
  },

  // DELETE
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // Auth
  auth: {
    login: (username, password) => API.post('/auth/login', { username, password }),
    logout: () => API.post('/auth/logout'),
    me: () => API.get('/auth/me'),
  },

  // Users
  users: {
    getAll: () => API.get('/users'),
    getById: (id) => API.get(`/users/${id}`),
    create: (data) => API.post('/users', data),
    update: (id, data) => API.put(`/users/${id}`, data),
    delete: (id) => API.delete(`/users/${id}`),
    getCompanies: () => API.get('/users/companies/list'),
  },

  // Dashboard
  dashboard: {
    getSummary: () => API.get('/dashboard/summary'),
    getRecentOrders: () => API.get('/dashboard/recent-orders'),
    getRecentProductions: () => API.get('/dashboard/recent-productions'),
    getInventoryStatus: () => API.get('/dashboard/inventory-status'),
  },

  // Products
  products: {
    getAll: () => API.get('/products'),
    getById: (id) => API.get(`/products/${id}`),
    create: (data) => API.post('/products', data),
    update: (id, data) => API.put(`/products/${id}`, data),
    delete: (id) => API.delete(`/products/${id}`),
  },

  // Inventory
  inventory: {
    getAll: () => API.get('/inventory'),
    getById: (productId) => API.get(`/inventory/${productId}`),
    receive: (data) => API.post('/inventory/receive', data),
    use: (data) => API.post('/inventory/use', data),
    adjust: (data) => API.post('/inventory/adjust', data),
    updateLocation: (productId, location) => API.put(`/inventory/${productId}/location`, { location }),
    getHistory: (productId) => API.get(`/inventory/${productId}/history`),
    getAllHistory: () => API.get('/inventory/history/all'),
  },

  // Customers
  customers: {
    getAll: () => API.get('/customers'),
    getById: (id) => API.get(`/customers/${id}`),
    create: (data) => API.post('/customers', data),
    update: (id, data) => API.put(`/customers/${id}`, data),
    delete: (id) => API.delete(`/customers/${id}`),
  },

  // Orders
  orders: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/orders${query ? '?' + query : ''}`);
    },
    getById: (id) => API.get(`/orders/${id}`),
    create: (data) => API.post('/orders', data),
    update: (id, data) => API.put(`/orders/${id}`, data),
    updateStatus: (id, status) => API.patch(`/orders/${id}/status`, { status }),
    delete: (id) => API.delete(`/orders/${id}`),
  },

  // Productions
  productions: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/productions${query ? '?' + query : ''}`);
    },
    getById: (id) => API.get(`/productions/${id}`),
    create: (data) => API.post('/productions', data),
    update: (id, data) => API.put(`/productions/${id}`, data),
    start: (id, worker) => API.patch(`/productions/${id}/start`, { worker }),
    complete: (id, data) => API.patch(`/productions/${id}/complete`, data),
    stop: (id, reason) => API.patch(`/productions/${id}/stop`, { reason }),
    delete: (id) => API.delete(`/productions/${id}`),
  },

  // Shipments
  shipments: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/shipments${query ? '?' + query : ''}`);
    },
    getById: (id) => API.get(`/shipments/${id}`),
    create: (data) => API.post('/shipments', data),
    complete: (id) => API.patch(`/shipments/${id}/complete`),
    cancel: (id) => API.patch(`/shipments/${id}/cancel`),
    delete: (id) => API.delete(`/shipments/${id}`),
  },

  // Reports
  reports: {
    productionDaily: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/reports/production/daily${query ? '?' + query : ''}`);
    },
    productionByProduct: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/reports/production/by-product${query ? '?' + query : ''}`);
    },
    shipmentDaily: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/reports/shipment/daily${query ? '?' + query : ''}`);
    },
    salesByCustomer: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/reports/sales/by-customer${query ? '?' + query : ''}`);
    },
    salesMonthly: (year) => API.get(`/reports/sales/monthly?year=${year}`),
    inventoryStatus: () => API.get('/reports/inventory/status'),
    inventoryHistory: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/reports/inventory/history${query ? '?' + query : ''}`);
    },
  },

  // Settings
  settings: {
    getAll: () => API.get('/settings'),
    get: (key) => API.get(`/settings/${key}`),
    set: (key, value) => API.put(`/settings/${key}`, { value }),
    setBulk: (settings) => API.post('/settings/bulk', settings),
    delete: (key) => API.delete(`/settings/${key}`),
  },

  // KPI
  kpi: {
    getProductivity: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/kpi/productivity${query ? '?' + query : ''}`);
    },
    getQuality: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/kpi/quality${query ? '?' + query : ''}`);
    },
    getSettings: () => API.get('/kpi/settings'),
    saveSettings: (data) => API.put('/kpi/settings', data),
    generateSnapshot: (data) => API.post('/kpi/snapshot', data),
    getSnapshots: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.get(`/kpi/snapshots${query ? '?' + query : ''}`);
    },
  },
};
