/**
 * Meesho Supplier Panel — authentication & live API service.
 * Primary login: email + password (no OTP required).
 * All calls target https://supplier-app-api.meesho.com
 */
const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const BASE   = 'https://supplier-app-api.meesho.com';
const ORIGIN = 'https://supplier.meesho.com';

const HEADERS = {
  'User-Agent'         : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept'             : 'application/json, text/plain, */*',
  'Accept-Language'    : 'en-IN,en;q=0.9,hi;q=0.8',
  'Accept-Encoding'    : 'gzip, deflate, br',
  'Origin'             : ORIGIN,
  'Referer'            : `${ORIGIN}/`,
  'Content-Type'       : 'application/json',
  'x-app-source'       : 'supplier-web',
  'x-platform'         : 'web',
  'x-meesho-client-name': 'supplier-web',
  'x-device-id'        : 'web-' + Math.random().toString(36).slice(2, 12),
  'sec-ch-ua'          : '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile'   : '?0',
  'sec-ch-ua-platform' : '"Windows"',
  'sec-fetch-dest'     : 'empty',
  'sec-fetch-mode'     : 'cors',
  'sec-fetch-site'     : 'same-site',
};

function makeClient(jar, token) {
  const h = { ...HEADERS };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return wrapper(axios.create({
    baseURL: BASE, jar: jar || new CookieJar(),
    withCredentials: true, timeout: 20000, headers: h,
  }));
}

/* ─── Login with email + password ─────────────────────────────────────── */
async function loginWithPassword(email, password) {
  const jar    = new CookieJar();
  const client = makeClient(jar);
  const endpoints = [
    { url: '/api/v1/supply/auth/supplier-login', body: { email, password } },
    { url: '/api/v1/supply/auth/login',          body: { email, password } },
    { url: '/api/v2/supply/auth/login',          body: { email, password } },
    { url: '/api/v1/supply/auth/supplier-login', body: { email_id: email, password } },
  ];

  let lastErr = null;
  for (const { url, body } of endpoints) {
    try {
      const res = await client.post(url, body);
      if (res.data && (res.data.token || res.data?.data?.token || res.data?.access_token || res.data?.data?.access_token)) {
        return extractSession(res, jar);
      }
      // If we get 200 but no token, treat as partial success — try to extract anyway
      if (res.status === 200) return extractSession(res, jar);
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      // 400/404 → wrong endpoint, try next
      // 401 → wrong credentials, stop trying
      if (status === 401) {
        const msg = err.response?.data?.message || err.response?.data?.error || 'Invalid email or password';
        return { success: false, message: msg, status: 401 };
      }
      if (status === 429) return { success: false, message: 'Too many attempts. Please wait before trying again.', status: 429 };
      // Continue to next endpoint for other errors
    }
  }

  const errMsg = lastErr?.response?.data?.message || lastErr?.response?.data?.error || lastErr?.message || 'Unable to connect to Meesho. Check your credentials and network.';
  return { success: false, message: errMsg, status: lastErr?.response?.status };
}

function extractSession(res, jar) {
  const d = res.data;
  const token =
    d?.data?.token       || d?.token        || d?.access_token ||
    d?.data?.access_token|| d?.data?.jwt    ||
    res.headers['authorization']?.replace('Bearer ', '') || null;

  const supplier =
    d?.data?.supplier    || d?.supplier     || d?.data || {};

  const cookies = jar.getCookiesSync(BASE).map(c => `${c.key}=${c.value}`).join('; ');

  return {
    success    : true,
    token,
    cookies,
    supplierId : String(supplier.supplier_id || supplier.id || ''),
    storeName  : supplier.store_name || supplier.business_name || supplier.name || '',
    email      : supplier.email || '',
    phone      : supplier.phone_number || supplier.phone || '',
  };
}

/* ─── Live API wrapper ─────────────────────────────────────────────────── */
class MeeshoAPI {
  constructor(token, cookies) {
    const jar = new CookieJar();
    if (cookies) cookies.split(';').forEach(pair => {
      const [k, ...v] = pair.trim().split('=');
      if (k) try { jar.setCookieSync(`${k}=${v.join('=')}`, BASE); } catch {}
    });
    this.client = makeClient(jar, token);
  }

  /* Orders */
  async getOrders(params = {})          { return this._get('/api/v1/supply/orders', params); }
  async acceptOrder(subOrderId)         { return this._post(`/api/v1/supply/orders/${subOrderId}/accept`); }
  async cancelOrder(subOrderId, reason) { return this._post(`/api/v1/supply/orders/${subOrderId}/cancel`, { reason }); }
  async dispatchOrder(subOrderId, data) { return this._post(`/api/v1/supply/orders/${subOrderId}/dispatch`, data); }

  /* Label — returns raw buffer (PDF) */
  async getLabel(subOrderId) {
    try {
      const res = await this.client.get(`/api/v1/supply/orders/${subOrderId}/manifest`, {
        responseType: 'arraybuffer',
      });
      return { success: true, data: res.data, contentType: res.headers['content-type'] || 'application/pdf' };
    } catch (err) { return this._err(err); }
  }

  /* Returns */
  async getReturns(params = {})         { return this._get('/api/v1/supply/returns', params); }
  async getReturnOTP(returnId)          { return this._get(`/api/v1/supply/returns/${returnId}/otp`); }
  async acceptReturn(returnId)          { return this._post(`/api/v1/supply/returns/${returnId}/accept`); }
  async rejectReturn(returnId, reason)  { return this._post(`/api/v1/supply/returns/${returnId}/reject`, { reason }); }

  /* Payments */
  async getPayments(params = {})        { return this._get('/api/v1/supply/payments/settlements', params); }
  async getEarnings()                   { return this._get('/api/v1/supply/payments/earnings'); }

  /* Products */
  async getProducts(params = {})        { return this._get('/api/v1/supply/catalog/products', params); }
  async updateInventory(catalogId, qty) { return this._put(`/api/v1/supply/catalog/${catalogId}/inventory`, { quantity: qty }); }
  async toggleProduct(catalogId, active){ return this._put(`/api/v1/supply/catalog/${catalogId}/status`, { is_active: active }); }

  /* Profile */
  async getProfile()                    { return this._get('/api/v1/supply/supplier/profile'); }

  async _get(url, params)  {
    try { const r = await this.client.get(url, { params }); return { success: true, data: r.data }; }
    catch(e) { return this._err(e); }
  }
  async _post(url, body)  {
    try { const r = await this.client.post(url, body || {}); return { success: true, data: r.data }; }
    catch(e) { return this._err(e); }
  }
  async _put(url, body)   {
    try { const r = await this.client.put(url, body); return { success: true, data: r.data }; }
    catch(e) { return this._err(e); }
  }
  _err(e) {
    return { success: false, expired: e.response?.status === 401, message: e.response?.data?.message || e.message, status: e.response?.status };
  }
}

module.exports = { loginWithPassword, MeeshoAPI };
