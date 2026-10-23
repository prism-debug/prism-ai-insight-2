// Joy's and Dash's windows play on their own while they are on screen. Joy's runs three conversations in turn,
// bubble by bubble, typing before each of her replies. Dash's presses three questions in turn and "thinks" before
// each answer. A click on a Dash question stops its autoplay for good. Every scene sits in the same grid cell, so
// neither window ever changes size. Under reduced motion both stay on their first scene, fully shown.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// runs fn() in a loop only while el is on screen and the tab is visible
function whileVisible(el: HTMLElement, fn: (alive: () => boolean) => Promise<void>) {
  let onScreen = false, run = 0;
  const alive = (id: number) => () => id === run && onScreen && !document.hidden;
  const go = () => { if (onScreen && !document.hidden) { const id = ++run; fn(alive(id)); } else run++; };
  new IntersectionObserver((es) => { const was = onScreen; onScreen = es[0].isIntersecting; if (onScreen !== was) go(); }, { threshold: .3 }).observe(el);
  document.addEventListener('visibilitychange', go);
}

const joy = document.querySelector<HTMLElement>('[data-joy]');
if (joy && !reduce) {
  const scenes = [...joy.querySelectorAll<HTMLElement>('[data-scene]')];
  let at = 0;
  whileVisible(joy, async (alive) => {
    joy.classList.add('is-playing');   // until now the first conversation shows complete
    while (alive()) {
      const sc = scenes[at];
      scenes.forEach((s) => s.classList.toggle('is-on', s === sc));
      const bubbles = [...sc.querySelectorAll<HTMLElement>('[data-b]')];
      bubbles.forEach((b) => b.classList.remove('is-shown', 'is-typing'));
      await wait(600);
      for (const b of bubbles) {
        if (!alive()) return;
        const typing = b.classList.contains('c-joy');
        if (typing) b.classList.add('is-typing');
        b.classList.add('is-shown');
        await wait(typing ? 1100 : 900);
        b.classList.remove('is-typing');
        await wait(typing ? 700 : 300);
      }
      await wait(3200);
      if (!alive()) return;
      at = (at + 1) % scenes.length;
    }
  });
}

const ask = document.querySelector<HTMLElement>('.ai-ask');
if (ask) {
  const chips = [...ask.querySelectorAll<HTMLButtonElement>('[data-ask]')];
  const answers = [...ask.querySelectorAll<HTMLElement>('[data-answer]')];
  const show = (i: number, think: boolean) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(+c.dataset.ask! === i)));
    answers.forEach((a) => { a.classList.toggle('is-on', +a.dataset.answer! === i); a.classList.toggle('is-thinking', think && +a.dataset.answer! === i); });
  };
  let auto = !reduce;
  chips.forEach((c) => c.addEventListener('click', () => { auto = false; show(+c.dataset.ask!, false); }));
  if (auto) {
    // the day's plan, the channel question, the win-back list
    const order = [0, 1, 3].filter((i) => i < chips.length);
    let k = 0;
    whileVisible(ask, async (alive) => {
      while (alive() && auto) {
        show(order[k], true);
        await wait(1000);
        if (!auto) return;
        show(order[k], false);
        await wait(6500);
        if (!alive() || !auto) return;
        k = (k + 1) % order.length;
      }
    });
  }
}

export {};
