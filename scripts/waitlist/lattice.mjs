// Writes public/waitlist/lattice.svg: the Refract triangle lattice with a soft refraction band, for the waitlist hero.
// Usage: node scripts/waitlist/lattice.mjs
import fs from 'node:fs';
const W = 1600, H = 1000, s = 72, h = s * Math.sqrt(3) / 2;
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const stops = [[0, hex('#5FD3C7')], [0.55, hex('#14A098')], [1, hex('#FF9A4A')]];
const grad = (d) => { for (let i = 1; i < stops.length; i++) if (d <= stops[i][0]) { const [a, A] = stops[i - 1], [b, B] = stops[i], t = (d - a) / (b - a); return A.map((v, k) => Math.round(v + (B[k] - v) * t)); } return stops.at(-1)[1]; };
const P = (r, c) => [c * s + (r % 2) * s / 2, r * h];
const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
const R = Math.ceil(H / h) + 1, C = Math.ceil(W / s) + 2;
const f = (n) => Math.round(n * 10) / 10;
let lines = '', tris = '';
for (let r = 0; r <= R; r++) {
  const a = P(r, -1), b = P(r, C); lines += `M${f(a[0])} ${f(a[1])}H${f(b[0])}`;
}
// diagonals: two families of parallel lines through the lattice points
for (let k = -R; k <= C + R; k++) {
  const x0 = k * s; lines += `M${f(x0)} 0L${f(x0 + (R * h) / Math.sqrt(3))} ${f(R * h)}M${f(x0)} 0L${f(x0 - (R * h) / Math.sqrt(3))} ${f(R * h)}`;
}
// a diagonal band of filled triangles, brightest along its centre line
const dir = [0.78, 0.62], nrm = [-0.62, 0.78], p0 = [120, -60], len = 1900, half = 260;
for (let r = 0; r < R; r++) for (let c = -1; c <= C; c++) for (const up of [0, 1]) {
  const A = P(r, c), B = P(r, c + 1), T = up ? P(r + 1, c + (r % 2 ? 1 : 0)) : P(r + 1, c + (r % 2 ? 1 : 0) - 1);
  const pts = up ? [A, B, T] : [A, T, P(r + 1, c + (r % 2 ? 1 : 0))];
  const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
  const rx = cx - p0[0], ry = cy - p0[1], d = (rx * dir[0] + ry * dir[1]) / len, n = rx * nrm[0] + ry * nrm[1];
  const band = 1 - ss(half * 0.35, half, Math.abs(n));
  const wave = 0.5 + 0.5 * Math.sin(d * 19 + (r * 7 + c * 3) % 5);
  const k = band * (0.25 + 0.75 * wave);
  if (k < 0.06 || d < 0 || d > 1) continue;
  const col = grad(Math.min(1, Math.max(0, d))), sc = 0.82;
  const q = pts.map(([x, y]) => [cx + (x - cx) * sc, cy + (y - cy) * sc]);
  tris += `<path d="M${q.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="rgb(${col})" fill-opacity="${(k * 0.15).toFixed(3)}"/>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMin slice"><path d="${lines}" stroke="#14A098" stroke-opacity=".09" stroke-width="1" fill="none"/>${tris}</svg>`;
fs.writeFileSync('public/waitlist/lattice.svg', svg);
console.log('lattice.svg', svg.length, 'bytes');
