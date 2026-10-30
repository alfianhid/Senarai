const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'shots';
const BASE = 'http://localhost:3000';
const Q1 = 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?';

async function newCtx(browser, actor) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  await ctx.addCookies([
    { name: 'senarai_actor', value: actor, url: BASE },
    { name: 'senarai_locale', value: 'id', url: BASE },
  ]);
  return ctx;
}

async function ask(page, question) {
  await page.goto(`${BASE}/ask`, { waitUntil: 'networkidle' });
  await page.fill('#question', question);
  await page.click('button.btn-primary');
  await page.waitForURL(/\/ask\/TH-/, { timeout: 40000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const staff = await newCtx(browser, 'A1');
  const sp = await staff.newPage();

  await sp.goto(`${BASE}/ask`, { waitUntil: 'networkidle' });
  await sp.screenshot({ path: `${OUT}/01-ask.png` });

  await ask(sp, Q1);
  await sp.screenshot({ path: `${OUT}/02-answer-staff.png`, fullPage: true });

  await sp.click('button.cite');
  await sp.waitForTimeout(600);
  await sp.screenshot({ path: `${OUT}/03-source-drawer.png` });
  await sp.click('.drawer .icon-btn');
  await sp.waitForTimeout(400);

  await sp.locator('button:has-text("Tinjau draf")').first().click();
  await sp.waitForTimeout(600);
  await sp.screenshot({ path: `${OUT}/04-approval-gate.png` });
  await sp.click('button:has-text("Batal")');
  await sp.waitForTimeout(400);

  await ask(sp, 'Berapa denda kontrak Anugrah?');
  await sp.screenshot({ path: `${OUT}/05-empty-staff.png` });

  await sp.goto(`${BASE}/access`, { waitUntil: 'networkidle' });
  await sp.screenshot({ path: `${OUT}/06-access-before.png`, fullPage: true });

  await sp.locator('button[aria-label^="customer"]').click();
  await sp.waitForTimeout(1500);

  await ask(sp, Q1);
  await sp.screenshot({ path: `${OUT}/07-answer-after-revoke.png`, fullPage: true });

  await sp.goto(`${BASE}/audit`, { waitUntil: 'networkidle' });
  await sp.screenshot({ path: `${OUT}/08-audit-staff.png`, fullPage: true });

  const mgr = await newCtx(browser, 'A2');
  const mp = await mgr.newPage();
  await ask(mp, Q1);
  await mp.screenshot({ path: `${OUT}/09-answer-manager.png`, fullPage: true });

  await mp.goto(`${BASE}/audit`, { waitUntil: 'networkidle' });
  await mp.screenshot({ path: `${OUT}/10-audit-manager.png`, fullPage: true });

  await browser.close();
  console.log('done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
