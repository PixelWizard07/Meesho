import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('panel_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('panel_token');
      localStorage.removeItem('panel_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const accountsAPI = {
  list: () => api.get('/accounts'),
  add: (data) => api.post('/accounts', data),
  get: (id) => api.get(`/accounts/${id}`),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  getDashboard: (id) => api.get(`/accounts/${id}/dashboard`),
  getAggregate: () => api.get('/accounts/aggregate/dashboard'),
  // Meesho credential-based login
  sendOTP: (id) => api.post(`/accounts/${id}/send-otp`),
  verifyOTP: (id, otp) => api.post(`/accounts/${id}/verify-otp`, { otp }),
  loginPassword: (id, email, password) => api.post(`/accounts/${id}/login-password`, { email, password }),
  disconnect: (id) => api.post(`/accounts/${id}/disconnect`),
};

export const ordersAPI = {
  all: (params) => api.get('/orders/all', { params }),
  byAccount: (accountId, params) => api.get(`/orders/account/${accountId}`, { params }),
  updateStatus: (orderId, data) => api.post(`/orders/${orderId}/status`, data),
  stats: () => api.get('/orders/stats'),
};

export const productsAPI = {
  all: (params) => api.get('/products/all', { params }),
  updateInventory: (productId, data) => api.put(`/products/${productId}/inventory`, data),
  categories: () => api.get('/products/categories'),
};

export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (ids) => api.post('/notifications/mark-read', { ids }),
  unreadCount: () => api.get('/notifications/unread-count'),
};

export default api;
