// Captures the prototype screens the waitlist film is built from, at 2x.
// Usage: npm run build && node scripts/video/capture.mjs <out-dir>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const out = path.resolve(process.argv[2] || 'scripts/video/shots');
fs.mkdirSync(out, { recursive: true });
const dist = path.resolve('dist');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const t of [p, p + '.html', path.join(p, 'index.html')]) {
    const f = path.join(dist, t);
    if (f.startsWith(dist) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); return fs.createReadStream(f).pipe(res); }
  }
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { try { sessionStorage.setItem('prism-in', '1'); } catch (e) {} });
const page = await ctx.newPage();
const shots = { home: '/', leads: '/leads', inbox: '/inbox', marketing: '/marketing', joy: '/joy', retention: '/retention', brand: '/brand' };
for (const [name, route] of Object.entries(shots)) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
}
// Ask Dash open with an answer
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.click('[data-open-dash]:visible');
await page.fill('#dash-input', 'What should I do today?');
await page.press('#dash-input', 'Enter');
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'dash.png') });
await browser.close(); server.close();
console.log('captured to', out);
