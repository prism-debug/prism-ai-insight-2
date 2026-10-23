// Usage: node scripts/shoot.mjs [--widths 1440,390] [--out .loop/shots] [--full] / /leads /leads/L-2000
// Serves ./dist statically, screenshots each route at each width, and reports horizontal overflow + console errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const widths = opt('--widths', '1440,390').split(',').map(Number);
const out = opt('--out', '.loop/shots');
const fold = args.includes('--fold') ? (args.splice(args.indexOf('--fold'), 1), true) : false;
const full = args.includes('--full') ? (args.splice(args.indexOf('--full'), 1), true) : false;
const routes = args.length ? args : ['/'];
const dist = path.resolve('dist');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webp': 'image/webp' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const tries = [p, p + '.html', path.join(p, 'index.html')];
  for (const t of tries) {
    const f = path.join(dist, t);
    if (f.startsWith(dist) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); return fs.createReadStream(f).pipe(res); }
  }
  res.writeHead(404); res.end('not found');
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
fs.mkdirSync(out, { recursive: true });
const report = [];
for (const route of routes) {
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 800 ? 900 : 844 }, deviceScaleFactor: w > 800 ? 1 : 2, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { try { if (!location.pathname.startsWith('/login')) sessionStorage.setItem('prism-in', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*{animation:none!important;transition:none!important}' + (full || (w <= 800 && !fold) ? '.tabbar{position:static!important}.topbar{position:static!important}.row.head.sticky{position:static!important}' : '') });
    const m = await page.evaluate(() => {
      const de = document.documentElement; const bad = [];
      document.querySelectorAll('body *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.palette,.drawer,.sheet,.toast,.menu,[hidden]')) bad.push((el.className && String(el.className).slice(0, 30)) || el.tagName); });
      return { overflowX: de.scrollWidth - innerWidth, wide: [...new Set(bad)].slice(0, 4), h: de.scrollHeight };
    });
    const name = `${route === '/' ? 'home' : route.replace(/^\//, '').replace(/[/?=&]+/g, '-')}-${w}.png`;
    await page.screenshot({ path: path.join(out, name), fullPage: full || (w <= 800 && !fold) ? true : false });
    report.push(`${route} @${w}: ${name} h=${m.h} overflowX=${m.overflowX}${m.wide.length ? ' wide=' + m.wide.join('|') : ''}${errors.length ? ' ERR=' + errors.join(' ; ') : ''}`);
    await ctx.close();
  }
}
await browser.close(); server.close();
console.log(report.join('\n'));
