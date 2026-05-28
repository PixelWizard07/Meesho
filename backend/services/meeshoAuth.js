/**
 * Meesho Supplier Panel authentication service.
 * Handles OTP-based login, session management, and real API calls.
 *
 * Meesho supplier panel: https://supplier.meesho.com
 * Internal API base:      https://supplier-app-api.meesho.com
 */

const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const SUPPLIER_API = 'https://supplier-app-api.meesho.com';
const SUPPLIER_WEB  = 'https://supplier.meesho.com';

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 Chrome/112.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Origin': SUPPLIER_WEB,
  'Referer': `${SUPPLIER_WEB}/`,
  'Content-Type': 'application/json',
  'x-app-source': 'supplier-web',
};

function buildClient(cookieJar, authToken) {
  const jar = cookieJar || new CookieJar();
  const headers = { ...BASE_HEADERS };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  return wrapper(axios.create({
    baseURL: SUPPLIER_API,
    jar,
    withCredentials: true,
    timeout: 20000,
    headers,
  }));
}

/**
 * Step 1: Request OTP for a phone number.
 * Returns { success, message, data }
 */
async function requestOTP(phone) {
  try {
    const client = buildClient();
    const res = await client.post('/api/v1/supply/auth/send-otp', {
      phone_number: phone.replace(/\D/g, ''),
    });
    return { success: true, message: 'OTP sent', data: res.data };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return { success: false, message: msg, status: err.response?.status };
  }
}

/**
 * Step 2: Verify OTP and get session token.
 * Returns { success, token, supplierId, storeName, cookieString }
 */
async function verifyOTP(phone, otp) {
  try {
    const jar = new CookieJar();
    const client = buildClient(jar);
    const res = await client.post('/api/v1/supply/auth/verify-otp', {
      phone_number: phone.replace(/\D/g, ''),
      otp: String(otp),
    });

    const data = res.data;

    // Extract token from response body or Authorization header
    const token =
      data?.data?.token ||
      data?.token ||
      data?.access_token ||
      res.headers['authorization']?.replace('Bearer ', '') ||
      null;

    const supplierId =
      data?.data?.supplier_id ||
      data?.supplier_id ||
      data?.data?.id ||
      null;

    const storeName =
      data?.data?.store_name ||
      data?.data?.business_name ||
      data?.store_name ||
      null;

    const cookieString = await jar.getCookiesSync(SUPPLIER_API)
      .map(c => `${c.key}=${c.value}`)
      .join('; ');

    return {
      success: true,
      token,
      supplierId: String(supplierId || ''),
      storeName,
      cookieString,
    };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return { success: false, message: msg, status: err.response?.status };
  }
}

/**
 * Login with email + password (some supplier accounts support this).
 */
async function loginWithPassword(email, password) {
  try {
    const jar = new CookieJar();
    const client = buildClient(jar);
    const res = await client.post('/api/v1/supply/auth/login', {
      email,
      password,
    });

    const data = res.data;
    const token =
      data?.data?.token ||
      data?.token ||
      data?.access_token ||
      res.headers['authorization']?.replace('Bearer ', '') ||
      null;

    const supplierId = data?.data?.supplier_id || data?.supplier_id || null;
    const storeName  = data?.data?.store_name  || data?.store_name  || null;

    const cookieString = await jar.getCookiesSync(SUPPLIER_API)
      .map(c => `${c.key}=${c.value}`)
      .join('; ');

    return {
      success: true,
      token,
      supplierId: String(supplierId || ''),
      storeName,
      cookieString,
    };
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    return { success: false, message: msg, status: err.response?.status };
  }
}

/**
 * Fetch live data from Meesho using a stored session token.
 */
class MeeshoLiveAPI {
  constructor(token, cookieString) {
    const jar = new CookieJar();
    if (cookieString) {
      cookieString.split(';').forEach(pair => {
        const [key, ...rest] = pair.trim().split('=');
        if (key) jar.setCookieSync(`${key}=${rest.join('=')}`, SUPPLIER_API);
      });
    }
    this.client = buildClient(jar, token);
  }

  async getOrders(params = {}) {
    try {
      const res = await this.client.get('/api/v1/supply/orders', { params });
      return { success: true, data: res.data };
    } catch (err) {
      return this._error(err);
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const res = await this.client.post(`/api/v1/supply/orders/${orderId}/status`, { status });
      return { success: true, data: res.data };
    } catch (err) {
      return this._error(err);
    }
  }

  async getProducts(params = {}) {
    try {
      const res = await this.client.get('/api/v1/supply/catalog', { params });
      return { success: true, data: res.data };
    } catch (err) {
      return this._error(err);
    }
  }

  async updateInventory(productId, quantity) {
    try {
      const res = await this.client.put(`/api/v1/supply/catalog/${productId}/inventory`, { quantity });
      return { success: true, data: res.data };
    } catch (err) {
      return this._error(err);
    }
  }

  async getProfile() {
    try {
      const res = await this.client.get('/api/v1/supply/supplier/profile');
      return { success: true, data: res.data };
    } catch (err) {
      return this._error(err);
    }
  }

  async getPayments(params = {}) {
    try {
      const res = await this.client.get('/api/v1/supply/payments', { params });
      return { success: true, data: res.data };
    } catch (err) {
      return this._error(err);
    }
  }

  _error(err) {
    const isExpired = err.response?.status === 401 || err.response?.status === 403;
    return {
      success: false,
      expired: isExpired,
      message: err.response?.data?.message || err.message,
      status: err.response?.status,
    };
  }
}

module.exports = { requestOTP, verifyOTP, loginWithPassword, MeeshoLiveAPI };
