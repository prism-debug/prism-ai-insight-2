// Captures the new-layout screenshots on /upgrades (public/compare/<name>.webp, not the old-* ones) at 2x, as PNGs.
// Usage: npm run build && node scripts/upgrades/capture.mjs <out-dir>
// then: python3 -c "from PIL import Image; import glob, os; [Image.open(f).convert('RGB').resize((1280, 800), Image.LANCZOS).save('public/compare/' + os.path.basename(f)[:-4] + '.webp', 'WEBP', quality=84, method=6) for f in glob.glob('<out-dir>/*.png')]"
// home-numbers and home-phone are crops without the wordmark and are not recaptured here.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const out = path.resolve(process.argv[2] || 'scripts/upgrades/shots');
fs.mkdirSync(out, { recursive: true });
const dist = path.resolve('dist');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json' };
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
// name on /upgrades -> route; the inbox shot opens Chloe Albright's voicemail thread, the record is Noah Brooks
const shots = {
  home: '/', leads: '/leads', inbox: '/inbox?t=L-2070', marketing: '/marketing', brand: '/brand', retention: '/retention',
  clients: '/clients', 'client-record': '/clients/C-3000', bookings: '/bookings', forms: '/forms', team: '/team',
  connectors: '/connectors', settings: '/settings',
};
for (const [name, route] of Object.entries(shots)) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
}
await browser.close(); server.close();
console.log('captured', Object.keys(shots).length, 'to', out);
