// Renders an SVG to PNG with headless Chromium, at 2x for print.
// Usage: node scripts/render-svg.mjs submission/architecture.svg submission/architecture.png
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('usage: node scripts/render-svg.mjs <input.svg> <output.png>');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 980 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(resolve(input)).href);
await page.screenshot({ path: resolve(output), fullPage: true });
await browser.close();
console.log(`wrote ${output}`);
