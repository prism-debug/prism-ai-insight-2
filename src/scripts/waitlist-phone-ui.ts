// The phone's screen, drawn with the canvas 2D API so it stays sharp at any size and can move. It plays one
// workflow on a loop: Home, tap "Reply to the N waiting leads", open the longest wait, use Dash's suggested
// reply, send it, come back to one fewer waiting, and land on what that was worth. Every word and number comes from the prototype's data
// (passed in from waitlist.astro). The bottom quarter of the phone is cut off by the card, so everything that
// matters happens in the top 600 of the 844 logical pixels.
export interface PhoneData {
  waiting: number; verdict: string; money: string; na: number; np: number;
  focus: { t: string; v: string; tone: string }[];
  list: { name: string; svc: string; src: string; chan: string; min: number; preview: string }[];
  thread: { name: string; svc: string; src: string; label: string; msg: string; at: string; min: number; reply: string; value: number; teamReply: string };
}

export const T = 17.5;                             // loop length, seconds
const W = 390, H = 844;                            // logical screen
const C = {
  ink: '#062A2D', ink2: '#2F4B4D', ink3: '#566A6C', line: '#E2E4E1', sunken: '#EDEAE6', action: '#FF9A4A',
  attn: '#B4381F', attnWash: '#FDE8E3', good: '#1F8A5B', goodWash: '#E3F4EA', watch: '#8A5A0B', joy: '#C9501A',
  select: '#D8F0EC', deep: '#08615D', teal: '#14A098',
};
const FONT = '"Albert Sans Variable", "Albert Sans", system-ui, sans-serif';

const cl = (x: number) => Math.max(0, Math.min(1, x));
const p = (t: number, a: number, d: number) => cl((t - a) / d);
const eo = (x: number) => 1 - Math.pow(1 - x, 3);
const eio = (x: number) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// where the finger goes, and when it presses (seconds into the loop)
const BTN = { x: 195, y: 0 }, ROW0 = { x: 200, y: 232 }, BACK = { x: 24, y: 78 };
const TAPS = [2.3, 4.15, 6.95, 9.45, 10.6, 12.45];

export function createPhoneUI(d: PhoneData, scale: number) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
  const g = cv.getContext('2d')!;
  const img: Record<string, HTMLImageElement> = {};
  for (const k of ['mark-color', 'dash-mark', 'joy-mark']) { const i = new Image(); i.src = `/brand/${k}.svg`; img[k] = i; }
  const ready = Promise.all([
    ...Object.values(img).map((i) => i.decode().catch(() => {})),
    ...['400', '600', '650', '700'].map((w) => document.fonts.load(`${w} 16px "Albert Sans Variable"`).catch(() => [])),
  ]);

  // ---------- primitives
  const font = (w: number | string, px: number) => { g.font = `${w} ${px}px ${FONT}`; };
  const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const txt = (s: string, x: number, y: number, w: number | string, px: number, col: string, align: CanvasTextAlign = 'left') => { font(w, px); g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; };
  const wrap = (s: string, max: number) => {
    const out: string[] = []; let line = '';
    for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (g.measureText(t).width > max && line) { out.push(line); line = word; } else line = t; }
    if (line) out.push(line); return out;
  };
  const clip = (s: string, max: number) => { if (g.measureText(s).width <= max) return s; let t = s; while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1); return t.trimEnd() + '…'; };
  const stroke = (col: string, w = 1.6) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; };
  const hline = (y: number, x0 = 20, x1 = W - 20) => { g.fillStyle = C.line; g.fillRect(x0, y, x1 - x0, 1); };
  const pic = (k: string, x: number, y: number, s: number) => { const i = img[k]; if (i.complete && i.naturalWidth) g.drawImage(i, x, y, s, s); };

  function status(state: string, cx: number, cy: number, r = 7) {
    g.save(); const col = state === 'not_answered' ? C.attn : state === 'at_risk' ? C.watch : state === 'joy' ? C.joy : C.good;
    stroke(col, 1.7);
    if (state === 'not_answered') { g.setLineDash([2.4, 2.6]); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
    else if (state === 'done') { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(cx - 3.2, cy + .2); g.lineTo(cx - .8, cy + 2.6); g.lineTo(cx + 3.4, cy - 2.4); g.stroke(); }
    else { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r - 2.6, state === 'joy' ? -Math.PI / 2 : Math.PI / 2, state === 'joy' ? Math.PI : Math.PI * 1.5); g.closePath(); g.fill(); }
    g.restore();
  }
  const chev = (x: number, y: number, dir: 1 | -1, col: string, s = 5) => { stroke(col, 1.8); g.beginPath(); g.moveTo(x - s * .5 * dir, y - s); g.lineTo(x + s * .5 * dir, y); g.lineTo(x - s * .5 * dir, y + s); g.stroke(); };
  const arrow = (x: number, y: number, col: string) => { stroke(col, 1.8); g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.moveTo(x + 1.5, y - 4.5); g.lineTo(x + 6, y); g.lineTo(x + 1.5, y + 4.5); g.stroke(); };
  function chanIcon(c: string, x: number, y: number, col: string) {
    g.save(); stroke(col, 1.4);
    if (c === 'phone') { g.beginPath(); g.moveTo(x - 4, y - 5); g.quadraticCurveTo(x - 6, y + 4, x + 4, y + 6); g.stroke(); }
    else if (c === 'instagram') { rr(x - 5.5, y - 5, 11, 10, 3); g.stroke(); g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.stroke(); }
    else if (c === 'form' || c === 'email') { rr(x - 4.5, y - 6, 9, 12, 1.5); g.stroke(); g.beginPath(); g.moveTo(x - 2, y - 1); g.lineTo(x + 2, y - 1); g.moveTo(x - 2, y + 2); g.lineTo(x + 2, y + 2); g.stroke(); }
    else { rr(x - 6, y - 5, 12, 9, 2.5); g.stroke(); }
    g.restore();
  }

  // ---------- chrome shared by every screen
  function statusBar() {
    txt('9:41', 34, 33, 650, 16, C.ink);
    g.fillStyle = '#000'; rr(W / 2 - 58, 12, 116, 34, 17); g.fill();
    g.fillStyle = C.ink; for (let i = 0; i < 4; i++) { rr(300 + i * 6, 30 - (i + 1) * 3, 4, (i + 1) * 3, 1); g.fill(); }
    stroke(C.ink, 1.3); rr(330, 21, 24, 12, 3.5); g.stroke(); g.fillStyle = C.ink; rr(332.5, 23.5, 16, 7, 2); g.fill(); rr(355.5, 25, 2, 4, 1); g.fill();
  }

  // ---------- screens
  function home(n: number, press: number) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    pic('mark-color', 18, 64, 28); txt('Home', 54, 84, 650, 17, C.ink);
    stroke(C.line, 1.2); rr(212, 62, 58, 32, 16); g.stroke(); txt('All', 248, 83, 650, 14, C.ink, 'center');
    stroke(C.ink3, 1.2); g.beginPath(); g.arc(229, 76, 4, 0, 7); g.stroke();
    stroke(C.ink2, 1.6); g.beginPath(); g.arc(294, 76, 6.5, 0, 7); g.moveTo(299, 81); g.lineTo(303, 85); g.stroke();
    pic('dash-mark', 318, 66, 22);
    stroke(C.ink2, 1.6); g.beginPath(); g.moveTo(357, 85); g.lineTo(357, 76); g.arc(363, 76, 6, Math.PI, 0); g.lineTo(369, 85); g.closePath(); g.stroke(); g.fillStyle = C.attn; g.beginPath(); g.arc(371, 68, 3.5, 0, 7); g.fill();
    hline(106, 0, W);
    font(700, 23); const vl = wrap(d.verdict.replace(String(d.waiting), String(n)), 330);
    let y = 146; for (const l of vl) { txt(l, 20, y, 700, 23, C.ink); y += 29; }
    txt('Last 30 days vs the 30 before', 20, y - 4, 400, 13.5, C.ink3);
    const by = y + 14; BTN.y = by + 26;
    g.fillStyle = C.action; rr(20, by, 350, 52, 13); g.fill();
    if (press) { g.fillStyle = `rgba(6,42,45,${.14 * press})`; rr(20, by, 350, 52, 13); g.fill(); }
    txt(`Reply to the ${n} waiting leads`, 38, by + 32, 650, 15.5, C.ink);
    g.fillStyle = C.ink; rr(328, by + 10, 32, 32, 8); g.fill(); arrow(344, by + 26, '#fff');
    font(400, 13); y = by + 78; for (const l of wrap(d.money, 350)) { txt(l, 20, y, 400, 13, C.ink3); y += 18; }
    txt('Do this week', 20, y + 22, 650, 16.5, C.ink); txt('Likely value, not booked revenue.', 20, y + 44, 400, 12.5, C.ink3);
    y += 60;
    d.focus.forEach((f, i) => {
      hline(y);
      font(600, 15); const tl = wrap(i === 0 ? `Reply to the ${n} waiting leads` : f.t, 200);
      const h = Math.max(54, tl.length * 20 + 26);
      status(f.tone, 30, y + h / 2);
      tl.forEach((l, j) => txt(l, 50, y + h / 2 - (tl.length - 1) * 10 + 5 + j * 20, 600, 15, C.ink));
      txt(f.v, 348, y + h / 2 + 4.5, 400, 12.5, C.ink3, 'right'); chev(364, y + h / 2, 1, C.ink3, 4.5);
      y += h;
    });
    hline(y);
    txt('Needs you now', 20, y + 40, 650, 15.5, C.ink); txt(`See all ${n}`, 370, y + 40, 600, 13.5, C.ink2, 'right');
  }

  function list(count: number, gone: number) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    chev(24, 78, -1, C.ink, 6); txt('Waiting for a reply', 46, 84, 650, 17, C.ink);
    g.fillStyle = C.attnWash; rr(322, 63, 48, 28, 14); g.fill(); txt(String(count), 346, 82, 700, 14, C.attn, 'center');
    hline(106, 0, W);
    const na = d.na - (count < d.waiting ? 1 : 0);
    g.fillStyle = C.ink; rr(20, 120, 150, 36, 18); g.fill(); txt(`Not answered ${na}`, 95, 143, 600, 14, '#fff', 'center');
    stroke(C.line, 1.2); rr(178, 120, 156, 36, 18); g.stroke(); txt(`Needs a person ${d.np}`, 256, 143, 600, 14, C.ink2, 'center');
    txt('Longest wait first', 20, 182, 400, 12.5, C.ink3);
    let y = 190;
    d.list.forEach((r, i) => {
      const k = i === 0 ? 1 - eio(gone) : 1, h = 84 * k;
      if (h < .5) return;
      g.save(); g.globalAlpha = i === 0 ? cl(k * 1.4 - .2) : 1; g.beginPath(); g.rect(0, y, W, h); g.clip();
      if (i === 0 && gone > 0) { g.fillStyle = C.goodWash; g.fillRect(0, y, W, h); }
      status(i === 0 && gone > 0 ? 'done' : 'not_answered', 30, y + 24);
      font(650, 15.5); const nm = r.name; const nw = g.measureText(nm).width;
      txt(nm, 48, y + 29, 650, 15.5, C.ink); font(400, 15); txt(clip(` · ${r.svc}`, 250 - nw), 48 + nw, y + 29, 400, 15, C.ink2);
      txt(`${r.min} min`, 370, y + 29, 600, 13, r.min >= 20 ? C.attn : C.ink3, 'right');
      chanIcon(r.chan, 54, y + 47, C.ink3); txt(r.src, 66, y + 51, 400, 13, C.ink3);
      font(400, 13); txt(clip(r.preview, 322), 48, y + 71, 400, 13, C.ink2);
      g.restore();
      y += h; hline(y, 20, W);
    });
  }

  function thread(t: number) {
    const th = d.thread;
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    chev(24, 78, -1, C.ink, 6);
    g.fillStyle = '#FCE4F1'; g.beginPath(); g.arc(64, 78, 18, 0, 7); g.fill();
    txt(th.name.split(' ').map((s) => s[0]).join(''), 64, 83, 650, 13, '#9B2C66', 'center');
    txt(th.name, 92, 74, 650, 16.5, C.ink); txt(`${th.label} · ${th.src}`, 92, 94, 400, 12.5, C.ink3);
    hline(112, 0, W);
    // status pill: not answered, then replied
    const sent = eo(p(t, 9.6, .5));
    const pill = sent > .5 ? `Replied · first reply in ${th.min} min` : `Not answered · waiting ${th.min} min`;
    font(600, 13); const pw = g.measureText(pill).width + 44;
    g.fillStyle = sent > .5 ? C.goodWash : C.attnWash; rr(20, 126, pw, 30, 15); g.fill();
    status(sent > .5 ? 'done' : 'not_answered', 38, 141, 6.5); txt(pill, 52, 145.5, 600, 13, sent > .5 ? C.good : C.attn);
    // the guest's form, as a message
    font(400, 15); const ml = wrap(th.msg, 262);
    const mh = 48 + ml.length * 21;
    g.fillStyle = C.sunken; rr(20, 172, 300, mh, 18); g.fill();
    txt(`${th.label} · ${th.svc}`, 36, 196, 600, 12.5, C.ink3);
    ml.forEach((l, i) => txt(l, 36, 220 + i * 21, 400, 15, C.ink));
    txt(th.at, 22, 172 + mh + 18, 400, 12, C.ink3);
    let y = 172 + mh + 40;
    font(400, 14.5); const rl = wrap(th.reply, 318);
    // Dash's suggestion card rises, is used, and becomes a draft
    const sug = eo(p(t, 5.2, .5)), use = p(t, 7.05, .35);
    if (sug > 0 && use < 1) {
      g.save(); g.globalAlpha = sug * (1 - use); g.translate(0, (1 - sug) * 18);
      const ch = 66 + rl.length * 20 + 48;
      g.fillStyle = C.select; rr(20, y, 350, ch, 18); g.fill();
      pic('dash-mark', 34, y + 14, 20); txt('Dash suggests', 60, y + 29, 650, 13.5, C.deep);
      rl.forEach((l, i) => txt(l, 34, y + 56 + i * 20, 400, 14.5, C.ink));
      const uy = y + 56 + rl.length * 20 + 2;
      g.fillStyle = C.ink; rr(34, uy, 104, 38, 10); g.fill();
      if (t > 6.8 && t < 7.1) { g.fillStyle = 'rgba(255,255,255,.18)'; rr(34, uy, 104, 38, 10); g.fill(); }
      txt('Use reply', 86, uy + 24, 600, 14, '#fff', 'center');
      g.restore();
      USE.y = uy + 19 + (1 - sug) * 18;
    }
    const typed = p(t, 7.3, 1.3);
    if (use > 0 && sent < 1) {
      g.save(); g.globalAlpha = Math.min(use, 1 - sent);
      const dh = 30 + rl.length * 21 + 56;
      g.fillStyle = '#fff'; rr(20, y, 350, dh, 16); g.fill(); stroke(C.teal, 2); rr(20, y, 350, dh, 16); g.stroke();
      txt('Reply by text', 34, y + 22, 600, 12, C.ink3);
      const shown = th.reply.slice(0, Math.round(th.reply.length * typed));
      font(400, 15); const tl = wrap(shown, 318);
      tl.forEach((l, i) => txt(l, 34, y + 46 + i * 21, 400, 15, C.ink));
      if (typed < 1 && Math.floor(t * 3) % 2 === 0) { const last = tl[tl.length - 1] ?? ''; font(400, 15); g.fillStyle = C.teal; g.fillRect(34 + g.measureText(last).width + 1, y + 32 + (tl.length - 1) * 21, 2, 18); }
      const sy = y + dh - 50;
      g.fillStyle = C.action; rr(270, sy, 88, 40, 11); g.fill();
      if (t > 9.3 && t < 9.6) { g.fillStyle = 'rgba(6,42,45,.14)'; rr(270, sy, 88, 40, 11); g.fill(); }
      txt('Send', 300, sy + 25, 650, 14.5, C.ink, 'center'); arrow(336, sy + 20, C.ink);
      g.restore();
      SEND.y = sy + 20;
    }
    if (sent > 0) {
      g.save(); g.globalAlpha = sent; g.translate(0, (1 - sent) * 14);
      font(400, 15); const ol = wrap(th.reply, 262); const oh = 26 + ol.length * 21;
      g.fillStyle = C.select; rr(W - 20 - 300, y, 300, oh, 18); g.fill();
      ol.forEach((l, i) => txt(l, W - 304, y + 28 + i * 21, 400, 15, C.ink));
      txt('Sent by you · just now', W - 22, y + oh + 18, 400, 12, C.ink3, 'right');
      g.restore();
    }
  }
  const USE = { x: 86, y: 520 }, SEND = { x: 314, y: 520 };

  // ---------- the payoff: what that one reply was worth, and how much sooner it went out
  function payoff(t: number) {
    const th = d.thread, k = eo(p(t, 13.4, .6)), c = eo(p(t, 13.7, 1.0));
    if (k <= 0) return;
    g.save();
    g.fillStyle = `rgba(6,42,45,${.38 * k})`; g.fillRect(0, 0, W, H);
    g.globalAlpha = k; g.translate(0, (1 - k) * 40);
    const x = 20, y = 214, w = 350, h = 300;
    g.shadowColor = 'rgba(6,42,45,.35)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
    g.fillStyle = C.ink; rr(x, y, w, h, 26); g.fill();
    g.shadowColor = 'transparent';
    pic('dash-mark', x + 24, y + 24, 22);
    txt(`${th.name.split(' ')[0]} answered in 4 taps`, x + 54, y + 41, 600, 15, '#9FE3DA');
    const v = Math.round(th.value * c);
    txt(`+$${v.toLocaleString('en-US')}`, x + 24, y + 116, 700, 60, C.action);
    txt('likely value back in play', x + 24, y + 146, 450, 15.5, 'rgba(255,255,255,.82)');
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x + 24, y + 172, w - 48, 1);
    txt(`${th.min} min`, x + 24, y + 214, 700, 26, '#fff');
    txt('first reply, with', x + 24, y + 238, 400, 13, 'rgba(255,255,255,.7)');
    txt('Dash’s draft', x + 24, y + 256, 400, 13, 'rgba(255,255,255,.7)');
    txt(th.teamReply, x + 190, y + 214, 700, 26, 'rgba(255,255,255,.5)');
    g.fillStyle = 'rgba(255,255,255,.5)'; font(700, 26); g.fillRect(x + 188, y + 205, g.measureText(th.teamReply).width * c + 4, 2.5);
    txt('the team’s usual', x + 190, y + 238, 400, 13, 'rgba(255,255,255,.7)');
    txt('first reply', x + 190, y + 256, 400, 13, 'rgba(255,255,255,.7)');
    g.restore();
  }

  // ---------- the finger
  function finger(t: number) {
    const path: [number, { x: number; y: number }][] = [
      [1.0, { x: 300, y: 560 }], [2.0, BTN], [2.6, BTN], [3.3, BTN], [3.95, ROW0], [4.6, ROW0], [5.9, { x: 230, y: 600 }], [6.7, USE], [7.4, USE],
      [8.6, { x: 250, y: 600 }], [9.25, SEND], [9.8, SEND], [10.4, BACK], [10.9, BACK], [11.6, { x: 120, y: 300 }], [12.25, BACK], [12.9, BACK], [13.6, { x: 260, y: 640 }],
    ];
    if (t < path[0][0] || t > 13.6) return;
    let i = 0; while (i < path.length - 2 && t > path[i + 1][0]) i++;
    const [ta, a] = path[i], [tb, b] = path[i + 1];
    const k = eio(p(t, ta, tb - ta));
    const x = lerp(a.x, b.x, k), y = lerp(a.y, b.y, k);
    const alpha = Math.min(p(t, 1.0, .3), 1 - p(t, 13.2, .4));
    let press = 0, ring = 0;
    for (const tp of TAPS) { press = Math.max(press, 1 - Math.abs(t - tp) / .15); if (t >= tp && t < tp + .45) ring = (t - tp) / .45; }
    g.save(); g.globalAlpha = alpha;
    if (ring) { stroke(`rgba(20,160,152,${.5 * (1 - ring)})`, 2.5); g.beginPath(); g.arc(x, y, 20 + 26 * ring, 0, 7); g.stroke(); }
    const r = 19 * (1 - .18 * cl(press));
    g.fillStyle = 'rgba(6,42,45,.22)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    stroke('rgba(255,255,255,.95)', 2.5); g.stroke();
    g.restore();
  }

  // push: the new screen slides in from the right over the old one; pop is the reverse
  function slide(a: () => void, b: () => void, k: number) {
    const e = eio(k);
    g.save(); g.translate(-W * .3 * e, 0); a(); g.fillStyle = `rgba(6,42,45,${.1 * e})`; g.fillRect(0, 0, W, H); g.restore();
    g.save(); g.translate(W * (1 - e), 0); g.shadowColor = 'rgba(6,42,45,.18)'; g.shadowBlur = 24; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.shadowBlur = 0; b(); g.restore();
  }

  function draw(t: number) {
    g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    const n = d.waiting, n1 = n - 1;
    const pressBtn = t > 2.15 && t < 2.5 ? 1 : 0;
    const gone = p(t, 11.6, .6), cnt = t > 11.9 ? n1 : n;
    if (t < 2.5) home(n, pressBtn);
    else if (t < 3.0) slide(() => home(n, 0), () => list(n, 0), p(t, 2.5, .5));
    else if (t < 4.3) list(n, 0);
    else if (t < 4.8) slide(() => list(n, 0), () => thread(t), p(t, 4.3, .5));
    else if (t < 10.9) thread(t);
    else if (t < 11.4) slide(() => list(n, 0), () => thread(t), 1 - p(t, 10.9, .5));
    else if (t < 12.6) list(cnt, gone);
    else if (t < 13.1) slide(() => home(n1, 0), () => list(n1, 1), 1 - p(t, 12.6, .5));
    else if (t < 16.8) { home(n1, 0); payoff(t); }
    else { home(n1, 0); payoff(t); g.globalAlpha = p(t, 16.8, .7); home(n, 0); g.globalAlpha = 1; }
    if (t > 4.15 && t < 4.4) { g.fillStyle = C.select; g.globalAlpha = .5; g.fillRect(0, 190, W, 84); g.globalAlpha = 1; }
    finger(t);
    g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    statusBar();
  }

  return { canvas: cv, draw, ready };
}
