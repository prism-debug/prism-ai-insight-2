// The waitlist film, live. Three.js draws the app on a tilting window that wipes between four screens, with the
// client's gradient shapes (src/assets/ai-shapes) extruded in 3D around it. The HTML layer of cards and captions in
// Film.astro rides the same clock. Everything is a function of t in [0, T), so the loop is seamless.
import * as THREE from 'three';
import { PAL, svg, buildShape, webglOK } from './ai-shapes-3d.ts';

const T = 24;                       // loop length, seconds
const BEAT = T / 4;                 // one screen per beat
const SCREENS = ['inbox', 'marketing', 'retention', 'home'];
const STAGE_W = 1600, STAGE_H = 1000;

const cl = (x: number) => Math.max(0, Math.min(1, x));
const p = (t: number, a: number, d: number) => cl((t - a) / d);
const eo = (x: number) => 1 - Math.pow(1 - x, 3);
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const TAU = Math.PI * 2;

// shape, palette, size (world units), position, motion. Behind the window: z < 0; in front: z > 0.
const PLACES: { n: string; pal: keyof typeof PAL; size: number; pos: [number, number, number]; spin: number; bob: number; ph: number; tilt: number }[] = [
  { n: '01', pal: 'sun', size: 2.6, pos: [-7.2, 3.3, -2.2], spin: 1, bob: .35, ph: 0, tilt: .5 },
  { n: '17', pal: 'deep', size: 1.5, pos: [7.4, 3.9, 1.4], spin: -1, bob: .25, ph: 1.3, tilt: .6 },
  { n: '20', pal: 'brand', size: 2.3, pos: [7.6, -3.4, -1.6], spin: 0, bob: .3, ph: 2.1, tilt: .35 },
  { n: '03', pal: 'teal', size: 1.25, pos: [-7.7, -3.6, 1.8], spin: 1, bob: .3, ph: 3.2, tilt: .7 },
  { n: '09', pal: 'teal', size: 1.7, pos: [-2.4, 4.9, -3.2], spin: -1, bob: .22, ph: 4.4, tilt: .4 },
  { n: '05', pal: 'brand', size: 1.5, pos: [3.6, -4.9, -2.8], spin: 1, bob: .25, ph: 5.1, tilt: .5 },
  { n: '06', pal: 'sun', size: .9, pos: [5.4, 4.6, 2.4], spin: 2, bob: .2, ph: .7, tilt: .8 },
  { n: '11', pal: 'sun', size: 1.2, pos: [-4.6, -4.8, -1.2], spin: -1, bob: .2, ph: 2.6, tilt: .6 },
  { n: '18', pal: 'teal', size: 1.0, pos: [8.6, .4, -3.6], spin: 1, bob: .3, ph: 3.9, tilt: .5 },
  { n: '10', pal: 'sun', size: 1.1, pos: [-8.7, .8, -3.4], spin: -1, bob: .25, ph: 1.9, tilt: .4 },
  { n: '02', pal: 'brand', size: .8, pos: [1.2, 5.2, 1.9], spin: 2, bob: .15, ph: 5.6, tilt: .9 },
];

// the app window: two screens wiped across with a brand-gradient seam, rounded corners from an SDF
const winVert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const winFrag = /* glsl */ `
  uniform sampler2D tA; uniform sampler2D tB; uniform float w; uniform vec2 size; uniform float radius;
  varying vec2 vUv;
  float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
  void main() {
    vec2 p = (vUv - .5) * size;
    float d = rbox(p, size * .5, radius);
    float a = 1. - smoothstep(-1.5, .5, d * 60.);
    float s = vUv.x * .75 + (1. - vUv.y) * .25;
    float edge = w * 1.3 - .15;
    float m = smoothstep(edge - .02, edge + .02, s);
    vec3 col = mix(texture2D(tB, vUv).rgb, texture2D(tA, vUv).rgb, m);
    float seam = (1. - smoothstep(0., .035, abs(s - edge))) * step(.001, w) * step(w, .999);
    vec3 seamCol = pow(mix(vec3(.373, .827, .78), vec3(1., .604, .29), vUv.y), vec3(2.2));
    col = mix(col, seamCol, seam * .85);
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }`;
const shadowFrag = /* glsl */ `
  uniform vec2 size; varying vec2 vUv;
  float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
  void main() { vec2 p = (vUv - .5) * size; float d = rbox(p, size * .5 - vec2(1.2), .4); gl_FragColor = vec4(.024, .165, .176, (1. - smoothstep(-.6, 1.1, d)) * .32); }`;

export function startFilm(fig: HTMLElement) {
  const canvas = fig.querySelector<HTMLCanvasElement>('#fx-gl')!;
  const stage = fig.querySelector<HTMLElement>('#fx-stage')!;
  const toggle = fig.querySelector<HTMLButtonElement>('#fx-toggle')!;
  const capM = document.getElementById('fx-cap-m');
  const caps: string[] = JSON.parse(fig.dataset.caps || '[]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 700px)').matches;
  if (!webglOK()) { toggle.hidden = true; return; }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  // world units: the visible plane at z=0 is 16 x 10, matching the 1600 x 1000 HTML stage
  const camera = new THREE.PerspectiveCamera(30, 16 / 10, .1, 100);
  camera.position.set(0, 0, 5 / Math.tan(THREE.MathUtils.degToRad(15)));

  const loader = new THREE.TextureLoader();
  const tex = SCREENS.map((n) => { const t = loader.load(`/waitlist/film/${n}.webp`, () => draw()); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
  const WIN_W = 14, WIN_H = 8.75;
  const winMat = new THREE.ShaderMaterial({
    vertexShader: winVert, fragmentShader: winFrag, transparent: true,
    uniforms: { tA: { value: tex[0] }, tB: { value: tex[0] }, w: { value: 1 }, size: { value: new THREE.Vector2(WIN_W, WIN_H) }, radius: { value: .3 } },
  });
  const win = new THREE.Group();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W + 2.4, WIN_H + 2.4), new THREE.ShaderMaterial({ vertexShader: winVert, fragmentShader: shadowFrag, transparent: true, depthWrite: false, uniforms: { size: { value: new THREE.Vector2(WIN_W + 2.4, WIN_H + 2.4) } } }));
  shadow.position.set(.1, -.45, -.3);
  win.add(shadow, new THREE.Mesh(new THREE.PlaneGeometry(WIN_W, WIN_H), winMat));
  win.position.set(0, -.02, 0);
  scene.add(win);

  const places = small ? PLACES.slice(0, 7) : PLACES;
  const meshes = places.map((pl) => { const m = buildShape(svg(pl.n), PAL[pl.pal], pl.size); scene.add(m); return { m, pl }; });

  // HTML layer
  const scenes = [...stage.querySelectorAll<HTMLElement>('.fx-scene')];
  const capsEl = [...stage.querySelectorAll<HTMLElement>('.fx-cap')];
  const q = (i: number, k: string) => scenes[i].querySelector<HTMLElement>(`[data-k="${k}"]`)!;
  const pop = (el: HTMLElement | null, k: number, dy = 24) => { if (!el) return; el.style.opacity = String(k); el.style.transform = `translateY(${(1 - k) * dy}px) scale(${.96 + .04 * k})`; };
  const type = (el: HTMLElement, k: number) => { const s = el.dataset.text || ''; el.textContent = s.slice(0, Math.round(s.length * k)); };
  const money = (v: number, dp = 0) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

  function overlay(t: number) {
    const beat = Math.floor(t / BEAT) % 4;
    scenes.forEach((el, i) => {
      // each beat fades in over .5s at its start and out over .4s at its end
      const l = ((t - i * BEAT) % T + T) % T;
      const k = l < BEAT ? Math.min(eo(p(l, 0, .5)), 1 - eio(p(l, BEAT - .4, .4))) : 0;
      el.style.opacity = String(k);
      const c = capsEl[i]; const ck = l < BEAT ? Math.min(eo(p(l, .3, .6)), 1 - eio(p(l, BEAT - .4, .4))) : 0;
      c.style.opacity = String(ck); c.style.transform = `translateX(${(1 - ck) * -40}px)`;
    });
    if (capM && capM.textContent !== caps[beat]) capM.textContent = caps[beat];
    const L = (i: number) => ((t - i * BEAT) % T + T) % T;
    // 1. Joy
    let l = L(0);
    pop(q(0, 'note'), eo(p(l, .2, .5)), -30); pop(q(0, 'chat'), eo(p(l, .45, .6)), 40);
    pop(q(0, 'b1'), eo(p(l, .8, .4)));
    const b2 = q(0, 'b2'), typing = l > 1.3 && l < 2.3; b2.style.display = l < 2.3 ? 'inline-flex' : 'none'; pop(b2, typing ? eo(p(l, 1.3, .3)) : 0, 10);
    b2.querySelectorAll('i').forEach((d, i) => ((d as HTMLElement).style.opacity = String(.35 + .65 * (.5 + .5 * Math.sin(l * 9 - i * 1.1)))));
    pop(q(0, 'b3'), eo(p(l, 2.3, .45))); pop(q(0, 'b4'), eo(p(l, 3.2, .4))); pop(q(0, 'b5'), eo(p(l, 3.9, .5)), 16);
    const sec = q(0, 'sec'); sec.textContent = Math.round(+(sec.dataset.to || 0) * cl(p(l, 1.1, 1.3))) + ' s';
    // 2. Marketing
    l = L(1);
    pop(q(1, 'card'), eo(p(l, .45, .6)), 40);
    const n1 = q(1, 'num'); n1.textContent = money(+(n1.dataset.to || 0) * eo(p(l, .7, 1.5)), 2);
    q(1, 'b1').style.transform = `scaleX(${eo(p(l, 1.1, 1.1))})`; q(1, 'b2').style.transform = `scaleX(${eo(p(l, 1.4, 1.1))})`;
    // 3. Win-back
    l = L(2);
    pop(q(2, 'card'), eo(p(l, .45, .6)), 40);
    const n2 = q(2, 'num'); n2.textContent = money(Math.round(+(n2.dataset.to || 0) * eo(p(l, .7, 1.5))));
    const press = l > 2.9 && l < 3.15, done = l >= 3.15;
    const btn = q(2, 'btn'); btn.style.opacity = String(done ? 1 - eo(p(l, 3.15, .3)) : 1); btn.style.transform = `scale(${press ? .96 : 1})`;
    pop(q(2, 'done'), eo(p(l, 3.25, .45)), 14);
    const cur = q(2, 'cursor'); const ck = eio(p(l, 1.8, 1.0));
    cur.style.opacity = String(l > 1.6 && l < 4.2 ? Math.min(eo(p(l, 1.6, .3)), 1 - p(l, 3.45, .3)) : 0);
    cur.style.transform = `translate(${1380 - 280 * ck}px, ${860 - 315 * ck}px) scale(${press ? .86 : 1})`;
    // 4. Dash
    l = L(3);
    const card = q(3, 'card'); pop(card, eo(p(l, .35, .6)), 40); card.style.transform += ` translateX(${(1 - eo(p(l, .35, .7))) * 80}px)`;
    const qk = p(l, .9, 1.0); type(q(3, 'q'), qk);
    q(3, 'caret').style.opacity = String(qk < 1 ? (Math.floor(l * 3) % 2 ? .2 : 1) : 0);
    q(3, 'a').style.opacity = l > 2.1 ? '1' : '0'; type(q(3, 'at'), p(l, 2.2, 2.0));
    q(3, 'src').style.opacity = String(eo(p(l, 4.3, .4))); pop(scenes[3].querySelector('[data-k="cta"]'), eo(p(l, 4.5, .45)), 12);
  }

  function gl(t: number) {
    const ph = t / T;
    // which two screens, and how far the wipe has gone (first .9s of each beat)
    const i = Math.floor(t / BEAT) % 4, lt = t - i * BEAT;
    const w = eio(p(lt, 0, .9));
    winMat.uniforms.tA.value = tex[(i + 3) % 4]; winMat.uniforms.tB.value = tex[i]; winMat.uniforms.w.value = w;
    const kick = (1 - eio(p(lt, 0, 1.4))) * (i % 2 ? -1 : 1);
    win.rotation.y = .06 * Math.sin(TAU * ph * 2) + .12 * kick;
    win.rotation.x = .035 * Math.sin(TAU * ph * 3 + 1);
    win.position.z = -.25 * Math.abs(kick);
    for (const { m, pl } of meshes) {
      const a = TAU * ph;
      m.position.set(pl.pos[0] + .25 * Math.sin(a + pl.ph), pl.pos[1] + pl.bob * Math.sin(a * 2 + pl.ph), pl.pos[2] + .2 * Math.cos(a + pl.ph));
      m.rotation.set(pl.tilt * .4 * Math.sin(a + pl.ph), pl.tilt * Math.sin(a + pl.ph * 1.3), pl.spin ? a * pl.spin : .25 * Math.sin(a * 2 + pl.ph));
    }
    renderer.render(scene, camera);
  }

  function size() {
    const r = fig.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
    stage.style.transform = `scale(${r.width / STAGE_W})`;
  }

  let t0 = performance.now(), offset = reduce ? 3.9 + 2.2 : 0, playing = !reduce, visible = true, raf = 0;
  const now = () => (playing ? (performance.now() - t0) / 1000 + offset : offset) % T;
  function draw() { const t = now(); gl(t); overlay(t); }
  function loop() { draw(); raf = requestAnimationFrame(loop); }
  function run() { cancelAnimationFrame(raf); if (playing && visible) loop(); else draw(); }
  function sync() { toggle.classList.toggle('is-paused', !playing); toggle.setAttribute('aria-label', playing ? 'Pause the film' : 'Play the film'); }

  toggle.addEventListener('click', () => {
    if (playing) { offset = now(); playing = false; } else { t0 = performance.now(); playing = true; }
    sync(); run();
  });
  new ResizeObserver(() => { size(); draw(); }).observe(fig);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; run(); }, { threshold: 0 }).observe(fig);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; run(); });
  size(); sync();
  fig.classList.add('is-live');
  run();
  // a deterministic frame for capture and tests
  (window as unknown as { __fxAt: (t: number) => void }).__fxAt = (t: number) => { playing = false; offset = t; sync(); cancelAnimationFrame(raf); gl(t % T); overlay(t % T); };
}

const fig = document.getElementById('fx');
if (fig) startFilm(fig);
