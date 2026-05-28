/* Rich mock data for all Meesho supplier panel features */

const CATEGORIES = ['Sarees', 'Kurtis', 'Lehenga', 'Tops', 'Jeans', 'Ethnic Wear', 'Dress Material', 'Salwar Suit'];
const CITIES     = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Kolkata', 'Surat'];
const STATES     = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Punjab', 'Rajasthan', 'Gujarat', 'West Bengal'];
const COURIERS   = ['Delhivery', 'Ekart', 'Shadowfax', 'Xpressbees', 'Bluedart'];

const ORDER_STATUSES  = ['Pending', 'Accepted', 'Label Generated', 'Dispatched', 'Delivered', 'Cancelled'];
const RETURN_STATUSES = ['Return Requested', 'Return OTP Shared', 'Return Received', 'Refund Initiated', 'Refund Completed', 'Return Rejected'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function seeded(seed, max) { return ((seed * 1103515245 + 12345) & 0x7fffffff) % max; }

function getOrders(accountId, count = 30) {
  return Array.from({ length: count }, (_, i) => {
    const s   = seeded(accountId * 100 + i, 100);
    const statusIdx = seeded(accountId + i * 7, ORDER_STATUSES.length);
    const cat = CATEGORIES[seeded(accountId + i, CATEGORIES.length)];
    const city = CITIES[seeded(i * 3, CITIES.length)];
    const amt  = 200 + seeded(accountId * i + 1, 2800);
    const daysAgo = seeded(i, 30);
    return {
      order_id      : `ORD${accountId}${String(1000 + i).padStart(5,'0')}`,
      sub_order_id  : `SUB${accountId}${String(1000 + i).padStart(6,'0')}`,
      product_name  : `${cat} Style ${i + 1}`,
      sku           : `SKU${accountId}${String(100 + i).padStart(4,'0')}`,
      category      : cat,
      customer_name : `Customer ${i + 1}`,
      customer_city : city,
      customer_state: STATES[seeded(i*2, STATES.length)],
      customer_phone: `98${String(seeded(i*99, 100000000)).padStart(8,'0')}`,
      address       : `${rand(1,200)} Sample Street, ${city}`,
      pincode       : String(400000 + seeded(i * 13, 99999)),
      amount        : amt,
      quantity      : seeded(i + 5, 3) + 1,
      status        : ORDER_STATUSES[statusIdx],
      courier       : pick(COURIERS),
      tracking_id   : statusIdx >= 3 ? `TRACK${accountId}${String(100000 + i).padStart(8,'0')}` : null,
      label_url     : statusIdx >= 2 ? `/api/orders/SUB${accountId}${String(1000+i).padStart(6,'0')}/label` : null,
      order_date    : new Date(Date.now() - daysAgo * 86400000).toISOString(),
      account_id    : accountId,
    };
  });
}

function getReturns(accountId, count = 12) {
  return Array.from({ length: count }, (_, i) => {
    const statusIdx = seeded(accountId + i * 11, RETURN_STATUSES.length);
    const cat  = CATEGORIES[seeded(accountId + i * 3, CATEGORIES.length)];
    const daysAgo = seeded(i * 2, 20);
    const otp  = String(100000 + seeded(accountId * i + 7, 899999));
    return {
      return_id     : `RET${accountId}${String(100 + i).padStart(5,'0')}`,
      order_id      : `ORD${accountId}${String(1000 + i).padStart(5,'0')}`,
      sub_order_id  : `SUB${accountId}${String(1000 + i).padStart(6,'0')}`,
      product_name  : `${cat} Style ${i + 1}`,
      customer_name : `Customer ${i + 1}`,
      customer_phone: `98${String(seeded(i*77, 100000000)).padStart(8,'0')}`,
      amount        : 300 + seeded(accountId + i * 5, 2200),
      reason        : pick(['Size issue', 'Wrong item', 'Damaged product', 'Not as described', 'Changed mind']),
      status        : RETURN_STATUSES[statusIdx],
      return_otp    : (statusIdx === 1 || statusIdx === 2) ? otp : null,
      otp_expiry    : (statusIdx === 1) ? new Date(Date.now() + 24 * 3600000).toISOString() : null,
      return_date   : new Date(Date.now() - daysAgo * 86400000).toISOString(),
      images        : [],
      account_id    : accountId,
    };
  });
}

function getProducts(accountId, count = 20) {
  return Array.from({ length: count }, (_, i) => {
    const cat = CATEGORIES[seeded(accountId + i, CATEGORIES.length)];
    return {
      product_id  : `PRD${accountId}${String(100 + i).padStart(5,'0')}`,
      catalog_id  : `CAT${accountId}${String(100 + i).padStart(5,'0')}`,
      name        : `${cat} Collection ${i + 1}`,
      category    : cat,
      price       : 150 + seeded(accountId + i * 3, 1850),
      mrp         : 200 + seeded(accountId + i * 4, 2500),
      inventory   : seeded(accountId + i * 7, 95) + 5,
      sales       : seeded(accountId + i * 13, 300) + 5,
      rating      : (3 + seeded(i, 20) / 10).toFixed(1),
      status      : seeded(accountId + i, 7) === 0 ? 'inactive' : 'active',
      is_active   : seeded(accountId + i, 7) !== 0,
      account_id  : accountId,
    };
  });
}

function getPayments(accountId, count = 15) {
  return Array.from({ length: count }, (_, i) => {
    const daysAgo = i * 7;
    const orders  = rand(10, 60);
    const amount  = orders * (200 + seeded(accountId + i, 800));
    const tds     = Math.floor(amount * 0.01);
    const commission = Math.floor(amount * 0.05);
    return {
      settlement_id : `SET${accountId}${String(1000 + i).padStart(6,'0')}`,
      period        : `Week ${i + 1}`,
      from_date     : new Date(Date.now() - (daysAgo + 7) * 86400000).toISOString().slice(0, 10),
      to_date       : new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10),
      orders        : orders,
      gross_amount  : amount,
      commission    : commission,
      tds           : tds,
      net_amount    : amount - commission - tds,
      status        : i === 0 ? 'Processing' : 'Paid',
      utr           : i === 0 ? null : `UTR${String(seeded(accountId * i, 1000000000)).padStart(10, '0')}`,
      account_id    : accountId,
    };
  });
}

function getDashboard(accountId) {
  const orders   = getOrders(accountId);
  const returns  = getReturns(accountId);
  const products = getProducts(accountId);
  const payments = getPayments(accountId, 4);

  const revByDay = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    revByDay[label] = { date: label, revenue: 0, orders: 0 };
  }
  orders.forEach(o => {
    const label = new Date(o.order_date).toLocaleDateString('en-IN', { weekday: 'short' });
    if (revByDay[label]) { revByDay[label].revenue += o.amount; revByDay[label].orders++; }
  });

  return {
    stats: {
      total_orders    : orders.length,
      pending_orders  : orders.filter(o => o.status === 'Pending').length,
      total_revenue   : orders.filter(o => !['Cancelled'].includes(o.status)).reduce((s, o) => s + o.amount, 0),
      active_products : products.filter(p => p.is_active).length,
      open_returns    : returns.filter(r => ['Return Requested', 'Return OTP Shared'].includes(r.status)).length,
      pending_payments: payments.filter(p => p.status === 'Processing').reduce((s, p) => s + p.net_amount, 0),
    },
    orders,
    returns,
    products,
    payments,
    revenue_chart: Object.values(revByDay),
  };
}

module.exports = { getOrders, getReturns, getProducts, getPayments, getDashboard };
