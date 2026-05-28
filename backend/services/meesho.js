const axios = require('axios');

const MEESHO_API_BASE = 'https://supplier-app-api.meesho.com';

class MeeshoService {
  constructor(apiToken) {
    this.client = axios.create({
      baseURL: MEESHO_API_BASE,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MeeshoSupplierApp/2.0',
      },
      timeout: 15000,
    });
  }

  async getOrders(params = {}) {
    try {
      const response = await this.client.get('/api/v1/orders', { params });
      return { success: true, data: response.data };
    } catch (err) {
      return this._handleError(err);
    }
  }

  async getOrderDetails(orderId) {
    try {
      const response = await this.client.get(`/api/v1/orders/${orderId}`);
      return { success: true, data: response.data };
    } catch (err) {
      return this._handleError(err);
    }
  }

  async updateOrderStatus(orderId, status, reason = '') {
    try {
      const response = await this.client.post(`/api/v1/orders/${orderId}/status`, {
        status,
        reason,
      });
      return { success: true, data: response.data };
    } catch (err) {
      return this._handleError(err);
    }
  }

  async getProducts(params = {}) {
    try {
      const response = await this.client.get('/api/v1/catalog', { params });
      return { success: true, data: response.data };
    } catch (err) {
      return this._handleError(err);
    }
  }

  async updateProductInventory(productId, quantity) {
    try {
      const response = await this.client.put(`/api/v1/catalog/${productId}/inventory`, {
        quantity,
      });
      return { success: true, data: response.data };
    } catch (err) {
      return this._handleError(err);
    }
  }

  async getPayments(params = {}) {
    try {
      const response = await this.client.get('/api/v1/payments', { params });
      return { success: true, data: response.data };
    } catch (err) {
      return this._handleError(err);
    }
  }

  async getAnalytics(period = '7d') {
    try {
      const response = await this.client.get('/api/v1/analytics', { params: { period } });
      return { success: true, data: response.data };
    } catch (err) {
      return this._handleError(err);
    }
  }

  async getSupplierProfile() {
    try {
      const response = await this.client.get('/api/v1/supplier/profile');
      return { success: true, data: response.data };
    } catch (err) {
      return this._handleError(err);
    }
  }

  _handleError(err) {
    if (err.response) {
      return {
        success: false,
        error: err.response.data?.message || 'API error',
        status: err.response.status,
      };
    }
    return {
      success: false,
      error: err.message || 'Network error',
      status: 503,
    };
  }
}

// Generate mock demo data for accounts without live API tokens
function getMockDashboardData(accountId) {
  const statuses = ['Pending', 'Accepted', 'Dispatched', 'Delivered', 'Cancelled'];
  const categories = ['Sarees', 'Kurtis', 'Lehenga', 'Tops', 'Jeans', 'Ethnic Wear'];

  const orders = Array.from({ length: 24 }, (_, i) => ({
    order_id: `ORD${accountId}${String(i + 1000).padStart(6, '0')}`,
    product_name: `${categories[i % categories.length]} Style ${i + 1}`,
    customer_name: `Customer ${i + 1}`,
    customer_city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'][i % 5],
    amount: Math.floor(Math.random() * 2000) + 200,
    status: statuses[i % statuses.length],
    order_date: new Date(Date.now() - i * 86400000).toISOString(),
    quantity: Math.floor(Math.random() * 3) + 1,
  }));

  const products = Array.from({ length: 15 }, (_, i) => ({
    product_id: `PRD${accountId}${String(i + 100).padStart(5, '0')}`,
    name: `${categories[i % categories.length]} Collection ${i + 1}`,
    category: categories[i % categories.length],
    price: Math.floor(Math.random() * 1500) + 150,
    inventory: Math.floor(Math.random() * 100) + 5,
    sales: Math.floor(Math.random() * 200) + 10,
    rating: (Math.random() * 2 + 3).toFixed(1),
    status: i % 7 === 0 ? 'inactive' : 'active',
    image_url: null,
  }));

  const revenue = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-IN', { weekday: 'short' }),
    revenue: Math.floor(Math.random() * 15000) + 3000,
    orders: Math.floor(Math.random() * 30) + 5,
  }));

  return {
    stats: {
      total_orders: orders.length,
      pending_orders: orders.filter(o => o.status === 'Pending').length,
      total_revenue: orders.reduce((s, o) => s + o.amount, 0),
      active_products: products.filter(p => p.status === 'active').length,
    },
    orders,
    products,
    revenue_chart: revenue,
  };
}

async function verifyMeeshoToken(token) {
  try {
    const client = axios.create({
      baseURL: MEESHO_API_BASE,
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    await client.get('/api/v1/supplier/profile');
    return true;
  } catch {
    return false;
  }
}

module.exports = { MeeshoService, getMockDashboardData, verifyMeeshoToken };
