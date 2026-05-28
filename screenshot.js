const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  const BASE = 'http://localhost:3000';
  const OUT  = '/tmp/screenshots';
  require('fs').mkdirSync(OUT, { recursive: true });

  // --- Login ---
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/01_login.png` });

  // Fill login — username field is type="text"
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 8000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/02_dashboard.png` });

  const routes = [
    ['accounts',  '03_accounts.png'],
    ['orders',    '04_orders.png'],
    ['returns',   '05_returns.png'],
    ['products',  '06_products.png'],
    ['payments',  '07_payments.png'],
    ['settings',  '08_settings.png'],
  ];

  for (const [route, file] of routes) {
    await page.goto(`${BASE}/${route}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: false });
    console.log(`✓ ${file}`);
  }

  await browser.close();
  console.log('All screenshots saved to', OUT);
})();
