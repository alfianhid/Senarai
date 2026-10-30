// Regenerates the submission screenshots from the running production server.
// Usage: node scripts/shots.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ timeout: 60_000 });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await ctx.addCookies([{ name: 'senarai_actor', value: 'A1', url: base }]);
const page = await ctx.newPage();

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true, timeout: 30_000, animations: 'disabled' });
  console.log('shot', name);
};

const ask = async (question, actor = 'A1') => {
  const res = await ctx.request.post(`${base}/api/ask`, {
    headers: { cookie: `senarai_actor=${actor}`, 'content-type': 'application/json' },
    data: { question },
  });
  const { threadId } = await res.json();
  return threadId;
};

const MAIN = 'Kenapa stok telat di Makassar, dan apa yang masih terbuka?';

await page.goto(`${base}/ask`, { waitUntil: 'domcontentloaded' });
await shot('01-ask');

const staffThread = await ask(MAIN);
await page.goto(`${base}/ask/${staffThread}`, { waitUntil: 'domcontentloaded' });
await page.getByText('Kronologi').first().waitFor({ timeout: 20_000 });
await shot('02-answer-staff');

// Open the first citation mark.
const mark = page.locator('button.cite').first();
await mark.click();
await page.waitForTimeout(500);
await shot('03-source-drawer');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const drawerStillOpen = await page.locator('aside[role="dialog"]').count();
console.log('drawer after Escape:', drawerStillOpen ? 'still open' : 'closed');
if (drawerStillOpen) await page.goto(`${base}/ask/${staffThread}`, { waitUntil: 'domcontentloaded' });

// The approval sheet, opened from a gap card.
const review = page.getByRole('button', { name: /Tinjau draf/i }).first();
if (await review.count()) {
  await review.click();
  await page.waitForTimeout(500);
  await shot('04-approval-gate');
  await page.keyboard.press('Escape');
}

// Staff asks a question whose answer is out of scope.
const emptyThread = await ask('Berapa denda kontrak Anugrah?');
await page.goto(`${base}/ask/${emptyThread}`, { waitUntil: 'domcontentloaded' });
await shot('05-empty-staff');

await page.goto(`${base}/access`, { waitUntil: 'domcontentloaded' });
await shot('06-access');

// Manager sees what staff could not.
const managerThread = await ask('Berapa denda kontrak Anugrah?', 'A2');
await ctx.addCookies([{ name: 'senarai_actor', value: 'A2', url: base }]);
await page.goto(`${base}/ask/${managerThread}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
await shot('09-answer-manager');

await page.goto(`${base}/audit`, { waitUntil: 'domcontentloaded' });
await shot('10-audit-manager');

await browser.close();
console.log('done');
