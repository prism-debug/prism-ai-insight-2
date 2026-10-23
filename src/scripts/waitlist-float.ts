// The film's 3D shapes, floating behind the whole waitlist page. One fixed canvas sits between the Paper background
// and the content. Each shape is pinned to a spot in a section and moves at its own speed as the page scrolls:
// big ones faster (near), small ones slower (far). Scrolling also turns them, and they drift a little at rest.
// Shapes shrink away while they pass behind the film, which has its own set.
import * as THREE from 'three';
import { PAL, svg, buildShape, webglOK } from './ai-shapes-3d.ts';

type Spot = {
  n: string; pal: keyof typeof PAL; px: number;  // shape, gradient, size in CSS px
  at: string; y: number;                           // section selector and how far down it (0..1)
  side: -1 | 1; gx: number;                        // left or right of the content column, px out into the gutter
  speed: number; spin: number; ph: number; m?: 1;  // parallax speed, turn per scroll, phase; m = also on phones
};

const HERO = '.wl-hero', RIVER = '.wl-river-sec', FEAT = '#features', AI = '[aria-labelledby="h-ai"]';
const SPOTS: Spot[] = [
  { n: '01', pal: 'sun', px: 210, at: HERO, y: .22, side: -1, gx: 40, speed: 1.35, spin: 1, ph: 0, m: 1 },
  { n: '17', pal: 'deep', px: 86, at: HERO, y: .1, side: 1, gx: 70, speed: 1.6, spin: -1.4, ph: 1.2, m: 1 },
  { n: '09', pal: 'teal', px: 130, at: HERO, y: .78, side: 1, gx: 10, speed: 1.2, spin: .8, ph: 2.4 },
  { n: '20', pal: 'brand', px: 170, at: RIVER, y: .15, side: -1, gx: 20, speed: 1.3, spin: -.7, ph: .6, m: 1 },
  { n: '06', pal: 'sun', px: 66, at: RIVER, y: .05, side: 1, gx: 90, speed: 1.7, spin: 2, ph: 3.1 },
  { n: '03', pal: 'teal', px: 110, at: RIVER, y: .9, side: 1, gx: 30, speed: .8, spin: 1.2, ph: 4.2, m: 1 },
  { n: '05', pal: 'brand', px: 150, at: FEAT, y: .1, side: 1, gx: 20, speed: 1.25, spin: -.9, ph: 1.7 },
  { n: '11', pal: 'sun', px: 92, at: FEAT, y: .34, side: -1, gx: 70, speed: .75, spin: 1.1, ph: 5 },
  { n: '18', pal: 'teal', px: 124, at: FEAT, y: .62, side: -1, gx: 10, speed: 1.4, spin: -1.2, ph: 2.9, m: 1 },
  { n: '02', pal: 'brand', px: 70, at: FEAT, y: .55, side: 1, gx: 80, speed: 1.8, spin: 2.2, ph: .3 },
  { n: '10', pal: 'sun', px: 130, at: FEAT, y: .92, side: 1, gx: 20, speed: .9, spin: -.8, ph: 3.6 },
  { n: '01', pal: 'teal', px: 140, at: AI, y: .12, side: -1, gx: 20, speed: 1.3, spin: .9, ph: 4.8, m: 1 },
  { n: '17', pal: 'sun', px: 80, at: AI, y: .3, side: 1, gx: 80, speed: 1.6, spin: -1.6, ph: 2.2 },
  { n: '20', pal: 'teal', px: 160, at: AI, y: .86, side: 1, gx: 10, speed: .85, spin: .7, ph: 5.5, m: 1 },
  { n: '09', pal: 'sun', px: 100, at: AI, y: .95, side: -1, gx: 60, speed: 1.2, spin: -1, ph: 1.1 },
];

const COL = 1200;  // the content column (.wl-wrap max-width)
const cl = (x: number) => Math.max(0, Math.min(1, x));
const ss = (x: number) => { const k = cl(x); return k * k * (3 - 2 * k); };

export function startFloat(canvas: HTMLCanvasElement) {
  if (!webglOK()) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 700px)');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 20000);
  const film = document.getElementById('fx');

  const live = SPOTS.map((s) => {
    const mesh = buildShape(svg(s.n), PAL[s.pal], s.px);
    mesh.visible = false; scene.add(mesh);
    return { s, mesh, el: document.querySelector<HTMLElement>(s.at), docY: 0 };
  });

  let W = 0, H = 0, filmTop = 0, filmBot = 0, filmL = 0, filmR = 0, small = phone.matches;
  function measure() {
    W = innerWidth; H = innerHeight; small = phone.matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.setSize(W, H, false);
    // 1 world unit = 1 CSS px on the z=0 plane
    camera.aspect = W / H; camera.position.set(0, 0, H / 2 / Math.tan(THREE.MathUtils.degToRad(15))); camera.updateProjectionMatrix();
    for (const o of live) { if (o.el) { const r = o.el.getBoundingClientRect(); o.docY = r.top + scrollY + r.height * o.s.y; } }
    if (film) { const r = film.getBoundingClientRect(); filmTop = r.top + scrollY; filmBot = r.bottom + scrollY; filmL = r.left; filmR = r.right; }
  }

  function draw(time: number) {
    const sy = scrollY, edge = Math.max(0, (W - COL) / 2);
    const k = small ? .5 : W < 1100 ? .75 : 1;
    for (const o of live) {
      const { s, mesh } = o;
      if (!o.el || (small && !s.m)) { mesh.visible = false; continue; }
      const px = s.px * k;
      const speed = reduce ? 1 : s.speed;
      const y0 = o.docY - sy;                         // where the spot sits on screen right now
      const y = y0 + (y0 - H / 2) * (speed - 1);      // parallax about the middle of the screen
      // out in the gutter beside the content column; on narrow screens, half off the edge
      const x = s.side < 0 ? Math.max(edge - s.gx, -px * .3) : Math.min(W - edge + s.gx, W + px * .3);
      if (y < -px || y > H + px) { mesh.visible = false; continue; }
      // shrink away behind the film so its own shapes are not doubled
      let fade = 1;
      if (film) {
        const fy = Math.max(filmTop - sy - y, y - (filmBot - sy), 0), fx = Math.max(filmL - x, x - filmR, 0);
        fade = ss((Math.hypot(fx, fy) - px * .1) / (px * .6));
      }
      if (fade < .01) { mesh.visible = false; continue; }
      mesh.visible = true;
      const z = (speed - 1) * 120;
      mesh.position.set(x - W / 2, H / 2 - y, z);
      mesh.scale.setScalar(k * (.3 + .7 * fade));
      const a = reduce ? 0 : time * .00025 + s.ph, turn = reduce ? 0 : sy * .0011 * s.spin;
      mesh.rotation.set(.35 * Math.sin(a * .9 + s.ph) + .2, .5 * Math.sin(a + s.ph * 1.3) + turn * .4, s.ph + turn + (reduce ? 0 : .15 * Math.sin(a * 1.4)));
    }
    renderer.render(scene, camera);
  }

  let raf = 0; const idle = !reduce;
  const frame = (t: number) => { draw(t); raf = idle && !document.hidden ? requestAnimationFrame(frame) : 0; };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', () => { measure(); kick(); });
  new ResizeObserver(() => { measure(); kick(); }).observe(document.body);
  document.addEventListener('visibilitychange', kick);
  phone.addEventListener('change', () => { measure(); kick(); });
  measure();
  canvas.classList.add('is-live');
  kick();
}

const c = document.getElementById('wl-float') as HTMLCanvasElement | null;
if (c) {
  const go = () => startFloat(c);
  // after first paint, so the hero is never waiting on it
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 300);
}
