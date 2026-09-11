const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto('http://localhost:8791/index.html', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500); // let the preloader hide + auth state settle

  await page.screenshot({ path: 'scripts/screenshot-landing.png', fullPage: false });

  // Try opening the auth modal
  const loginBtn = page.locator('text=تسجيل الدخول').first();
  let modalOpened = false;
  try {
    await loginBtn.click({ timeout: 5000 });
    await page.waitForSelector('#auth-modal-overlay.open', { timeout: 5000 });
    modalOpened = true;
    await page.screenshot({ path: 'scripts/screenshot-modal.png', fullPage: false });
  } catch (e) {
    pageErrors.push('Could not open auth modal: ' + e.message);
  }

  const preloaderHidden = await page.evaluate(() => {
    const el = document.getElementById('site-preloader');
    return el ? el.classList.contains('preloader-hidden') : 'no-element';
  });

  console.log(JSON.stringify({ errors, pageErrors, modalOpened, preloaderHidden }, null, 2));

  await browser.close();
})();
