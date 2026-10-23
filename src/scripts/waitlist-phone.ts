// "Built for the phone": a flat phone frame whose screen plays the reply workflow (waitlist-phone-ui.ts) on a loop.
// The frame is a fixed size and the card clips its bottom, so nothing in the bento ever resizes. The loop starts
// from the top each time the phone scrolls into view and runs only while it is on screen; under reduced motion it
// holds on Home.
import { createPhoneUI, T, type PhoneData } from './waitlist-phone-ui.ts';

export function startPhone(fig: HTMLElement) {
  const data: PhoneData = JSON.parse(fig.dataset.phone || '{}');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = fig.querySelector<HTMLElement>('.ph-frame')!;
  // drawn at the frame's size times the screen's pixel ratio, so text stays sharp
  const ui = createPhoneUI(data, Math.max(1, (frame.clientWidth / 390) * Math.min(devicePixelRatio || 1, 2)));
  ui.canvas.className = 'ph-screen';
  ui.canvas.setAttribute('aria-hidden', 'true');
  frame.append(ui.canvas);

  let t0 = performance.now(), visible = false, raf = 0, still = reduce ? .5 : -1;
  const now = () => (still >= 0 ? still : ((performance.now() - t0) / 1000) % T);
  const loop = () => { ui.draw(now()); raf = visible && !document.hidden && still < 0 ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  new IntersectionObserver((es) => {
    const was = visible; visible = es[0].isIntersecting;
    if (visible && !was) { t0 = performance.now(); kick(); }
  }, { threshold: .25 }).observe(fig);
  document.addEventListener('visibilitychange', kick);
  ui.ready.then(() => { ui.draw(now()); fig.classList.add('is-live'); kick(); });
  // a deterministic frame for tests and capture
  (window as unknown as { __phAt: (t: number) => void }).__phAt = (t: number) => { still = t % T; ui.draw(still); };
}

const fig = document.getElementById('ph');
if (fig) startPhone(fig);
