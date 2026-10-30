const { chromium } = require('playwright');
const fs = require('fs');

const OUT = 'shots';
const BASE = 'http://localhost:3000';
const Q1 = 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?';

async function ctxFor(browser, actor, project, locale = 'id') {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  await ctx.addCookies([
    { name: 'senarai_actor', value: actor, url: BASE },
    { name: 'senarai_locale', value: locale, url: BASE },
    { name: 'senarai_project', value: project, url: BASE },
  ]);
  return ctx;
}

async function ask(page, question) {
  await page.goto(`${BASE}/ask`, { waitUntil: 'networkidle' });
  await page.fill('#question', question);
  await page.click('button.btn-primary');
  await page.waitForURL(/\/ask\/TH-/, { timeout: 60000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const staff = await ctxFor(browser, 'A1', 'makassar-q4');
  const sp = await staff.newPage();
  await ask(sp, Q1);
  await sp.screenshot({ path: `${OUT}/02-answer-staff.png`, fullPage: true });

  await sp.locator('details.trace summary').click();
  await sp.waitForTimeout(400);
  await sp.screenshot({ path: `${OUT}/11-agent-trace.png`, fullPage: true });

  const onboard = await ctxFor(browser, 'A1', 'onboarding-2026');
  const op = await onboard.newPage();
  await ask(op, 'Berapa tunjangan bahan bakar per bulan?');
  await op.screenshot({ path: `${OUT}/12-onboarding-conflict.png`, fullPage: true });

  await ask(op, 'Berapa hari cuti tahunan?');
  await op.screenshot({ path: `${OUT}/13-onboarding-fact.png`, fullPage: true });

  await ask(op, 'Berapa anggaran onboarding Q4?');
  await op.screenshot({ path: `${OUT}/05-empty-staff.png`, fullPage: true });

  const mgr = await ctxFor(browser, 'A2', 'makassar-q4');
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
