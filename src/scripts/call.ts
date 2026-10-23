// The call log page (src/pages/calls/rebecca.astro). One audio element drives everything: the progress bar, the
// transcript line that is speaking, and the "What Joy did" step it belongs to. Pressing a line, a step or the bar
// plays from there. window.prismCall lets the guided demo play a stage from its Next button.
const root = document.querySelector<HTMLElement>('[data-call]');
if (root) {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const $$ = <T extends HTMLElement = HTMLElement>(s: string) => [...root.querySelectorAll<T>(s)];
  const audio = $<HTMLAudioElement>('[data-call-audio]');
  const total = Number(root.dataset.total) || 97;
  const fill = $('[data-call-fill]'), now = $('[data-call-now]'), track = $('[data-call-track]'), list = $('[data-call-lines]');
  const lines = $$('[data-line]').map((el) => ({ el, start: Number(el.dataset.start), end: Number(el.dataset.end), stage: el.dataset.stage! }));
  const steps = $$('.did li[data-stage]');
  const segs = $$('[data-seg]');
  const order = steps.map((s) => s.dataset.stage!);
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let shown = -1, stopAt = 0;   // stopAt: the demo plays one stage and stops at its end

  function paint() {
    const t = audio.currentTime;
    fill.style.width = `${Math.min(100, (t / total) * 100)}%`;
    now.textContent = mmss(t);
    track.setAttribute('aria-valuenow', String(Math.round(t)));
    // the line speaking, or the last one started when between lines
    let at = -1;
    for (let i = 0; i < lines.length; i++) if (t >= lines[i].start - 0.05) at = i;
    if (at !== shown) {
      shown = at;
      lines.forEach((l, i) => l.el.classList.toggle('is-now', i === at));
      const stage = at >= 0 ? lines[at].stage : '';
      const k = order.indexOf(stage);
      steps.forEach((s, i) => { s.classList.toggle('is-now', i === k); s.classList.toggle('is-done', k >= 0 && i < k); });
      segs.forEach((s) => s.classList.toggle('is-now', s.dataset.seg === stage));
      const el = lines[at]?.el;
      if (el) list.scrollTo({ top: el.offsetTop - list.offsetTop - 8 });
    }
  }
  let raf = 0;
  const loop = () => { paint(); if (stopAt && audio.currentTime >= stopAt) { stopAt = 0; audio.pause(); return; } raf = requestAnimationFrame(loop); };
  audio.addEventListener('play', () => { root.classList.add('is-playing'); cancelAnimationFrame(raf); loop(); });
  audio.addEventListener('pause', () => { root.classList.remove('is-playing'); cancelAnimationFrame(raf); paint(); });
  audio.addEventListener('ended', () => { steps.forEach((s) => s.classList.add('is-done')); steps[steps.length - 1]?.classList.add('is-now'); });
  audio.addEventListener('seeked', paint);

  const playFrom = (t: number, until = 0) => { stopAt = until; audio.currentTime = Math.max(0, t); audio.play().catch(() => {}); };
  $('[data-call-play]').addEventListener('click', () => { stopAt = 0; if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-seek]');
    if (b) playFrom(Number(b.dataset.seek));
  });
  const seekTo = (x: number) => { const r = track.getBoundingClientRect(); playFrom(((x - r.left) / r.width) * total); };
  track.addEventListener('click', (e) => seekTo(e.clientX));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); audio.currentTime = Math.max(0, Math.min(total, audio.currentTime + (e.key === 'ArrowRight' ? 5 : -5))); paint(); }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); audio.paused ? audio.play().catch(() => {}) : audio.pause(); }
  });

  (window as any).prismCall = {
    playFrom,
    playStage(id: string) {
      const mine = lines.filter((l) => l.stage === id);
      if (mine.length) playFrom(mine[0].start, mine[mine.length - 1].end + 0.3);
    },
    pause() { audio.pause(); },
  };
}

export {};
