import axios from 'axios';

const api = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('panel_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401 || err.response?.status === 403) {
    localStorage.removeItem('panel_token');
    localStorage.removeItem('panel_user');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

export const authAPI = {
  login          : d  => api.post('/auth/login', d),
  me             : () => api.get('/auth/me'),
  changePassword : d  => api.post('/auth/change-password', d),
};

export const accountsAPI = {
  list        : ()         => api.get('/accounts'),
  add         : d          => api.post('/accounts', d),
  get         : id         => api.get(`/accounts/${id}`),
  update      : (id,d)     => api.put(`/accounts/${id}`, d),
  delete      : id         => api.delete(`/accounts/${id}`),
  getDashboard: id         => api.get(`/accounts/${id}/dashboard`),
  getAggregate: ()         => api.get('/accounts/aggregate/dashboard'),
  connect     : (id, pwd)  => api.post(`/accounts/${id}/connect`, { password: pwd }),
  disconnect  : id         => api.post(`/accounts/${id}/disconnect`),
};

export const ordersAPI = {
  all          : p              => api.get('/orders/all', { params: p }),
  byAccount    : (id,p)         => api.get(`/orders/account/${id}`, { params: p }),
  accept       : (id, accountId)=> api.post(`/orders/${id}/accept`, { account_id: accountId }),
  cancel       : (id, d)        => api.post(`/orders/${id}/cancel`, d),
  dispatch     : (id, d)        => api.post(`/orders/${id}/dispatch`, d),
  labelUrl     : (subOrderId, accountId) => `/api/orders/${subOrderId}/label?account_id=${accountId}`,
  skuSummary   : p              => api.get('/orders/sku-summary', { params: p }),
};

export const returnsAPI = {
  all      : p          => api.get('/returns/all', { params: p }),
  getOTP   : (id, aid)  => api.get(`/returns/${id}/otp`, { params: { account_id: aid } }),
  accept   : (id, aid)  => api.post(`/returns/${id}/accept`, { account_id: aid }),
  reject   : (id, d)    => api.post(`/returns/${id}/reject`, d),
};

export const productsAPI = {
  all            : p       => api.get('/products/all', { params: p }),
  updateInventory: (id, d) => api.put(`/products/${id}/inventory`, d),
  toggle         : (id, d) => api.put(`/products/${id}/toggle`, d),
  categories     : ()      => api.get('/products/categories'),
};

export const paymentsAPI = {
  all: p => api.get('/payments/all', { params: p }),
};

export default api;
