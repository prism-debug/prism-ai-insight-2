// The bento's live windows. Each [data-live] window gets .is-in the first time it scrolls into view (CSS runs the
// entrance). The queue then keeps moving while it is on screen: wait times tick up, the longest wait is answered by
// Joy and leaves, and the next lead arrives at the top. Demo time runs fast: one minute every 1.5 seconds.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TICK = 1500, TURN = 5200;

for (const el of document.querySelectorAll<HTMLElement>('[data-live]')) {
  if (reduce || !('IntersectionObserver' in window)) { el.classList.add('is-in'); continue; }
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { el.classList.add('is-in'); io.disconnect(); } }, { threshold: .35 });
  io.observe(el);
}

const queue = document.querySelector<HTMLElement>('[data-queue]');
if (queue && !reduce) runQueue(queue);

function runQueue(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('.uq-list')!;
  const rows = () => [...list.querySelectorAll<HTMLElement>('.uq-row')];
  const shown = () => rows().filter((r) => !r.hidden);
  const paint = (r: HTMLElement) => {
    const m = +(r.dataset.min || 1);
    r.querySelector('[data-wait]')!.textContent = m < 60 ? `${m} min` : `${Math.floor(m / 60)} h`;
    r.classList.toggle('is-late', m >= 20);
  };
  rows().forEach(paint);

  let onScreen = false, tick = 0, turn = 0;
  function start() {
    if (tick) return;
    tick = window.setInterval(() => shown().forEach((r) => { if (!r.classList.contains('is-done')) { r.dataset.min = String(+(r.dataset.min || 1) + 1); paint(r); } }), TICK);
    turn = window.setInterval(step, TURN);
  }
  function stop() { clearInterval(tick); clearInterval(turn); tick = turn = 0; }

  function step() {
    const vis = shown();
    // the longest wait: Joy answers, the row settles, then leaves
    const oldest = vis.reduce((a, b) => (+(b.dataset.min || 0) > +(a.dataset.min || 0) ? b : a));
    oldest.classList.add('is-done');
    setTimeout(() => oldest.classList.add('is-out'), 1300);
    setTimeout(() => {
      oldest.hidden = true; oldest.classList.remove('is-done', 'is-out');
      oldest.dataset.min = '1'; paint(oldest);
      list.append(oldest);                       // back of the line, to arrive again later
      const next = rows().find((r) => r.hidden && r !== oldest) ?? oldest;
      next.dataset.min = '1'; paint(next);
      list.prepend(next); next.hidden = false;
      next.classList.remove('is-new'); void next.offsetWidth; next.classList.add('is-new');
    }, 1900);
  }

  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; onScreen && !document.hidden ? start() : stop(); }, { threshold: .2 }).observe(root);
  document.addEventListener('visibilitychange', () => (onScreen && !document.hidden ? start() : stop()));
}

export {};
