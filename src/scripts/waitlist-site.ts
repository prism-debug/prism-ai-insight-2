// The launch site's page behaviour, shared by the waitlist (/waitlist) and the presale (/presale) pages: counters,
// the nav tucking in, the river's pause button, the phone menu and, where the page has them, the waitlist forms and
// the fixed waitlist bar. Every part checks its elements exist, so a page leaves out what it does not need.
const KEY = 'prism-waitlist';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// counters count up once, when they scroll into view
type Fmt = (n: number) => string;
const fmt: Record<string, Fmt> = {
  money: (n) => '$' + Math.round(n).toLocaleString('en-US'),
  num: (n) => Math.round(n).toLocaleString('en-US'),
  cents: (n) => '$' + n.toFixed(2),
};
function run(el: HTMLElement) {
  const to = +(el.dataset.count ?? 0), f = fmt[el.dataset.fmt ?? ''] || fmt.num, t0 = performance.now(), d = 1400;
  const step = (t: number) => { const k = Math.min(1, (t - t0) / d); el.textContent = f(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  step(t0);
}
const counters = document.querySelectorAll<HTMLElement>('[data-count]');
if (!reduce && 'IntersectionObserver' in window && counters.length) {
  counters.forEach((el) => { const f = fmt[el.dataset.fmt ?? '']; el.textContent = f ? f(0) : '0'; });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { run(e.target as HTMLElement); io.unobserve(e.target); } }), { threshold: 0.4 });
  counters.forEach((el) => io.observe(el));
}

// the nav tucks into a contained bar once the page has scrolled
const nav = document.querySelector<HTMLElement>('.wl-nav');
if (nav) {
  let tick = false;
  const navState = () => { tick = false; nav.classList.toggle('is-stuck', window.scrollY > 8); };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(navState); } }, { passive: true });
  navState();
}

// "Get alpha access" links bring the hero form into view and focus it
const heroEmail = document.getElementById('wl-email-hero');
if (heroEmail) {
  document.querySelectorAll<HTMLElement>('[data-focus-hero]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    heroEmail.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    heroEmail.focus({ preventScroll: true });
  }));
}

// river: a visible pause for touch and keyboard, not just hover
const river = document.querySelector<HTMLElement>('.wl-river'), rt = document.getElementById('wl-river-toggle');
if (river && rt) {
  rt.addEventListener('click', () => {
    const on = !river.classList.contains('is-paused'); river.classList.toggle('is-paused', on);
    rt.setAttribute('aria-pressed', on ? 'true' : 'false');
    const l = rt.querySelector('.wl-river-toggle-l'); if (l) l.textContent = on ? 'Play the numbers' : 'Pause the numbers';
  });
}

// phone menu: the section anchors and the call to action, behind a hamburger
const menuBtn = document.querySelector<HTMLButtonElement>('.wl-menu-btn'), menu = document.getElementById('wl-menu');
if (menuBtn && menu) {
  const setMenu = (open: boolean, refocus?: boolean) => {
    menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); }
    else { menu.classList.remove('is-open'); menu.hidden = true; if (refocus) menuBtn.focus(); }
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if ((e.target as Element).closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false, true); });
  document.addEventListener('click', (e) => { if (!menu.hidden && !(e.target as Element).closest('.wl-nav')) setMenu(false); });
  matchMedia('(min-width: 701px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });
}

// the fixed waitlist bar shows only once the hero form has scrolled away, and steps aside for the closing form.
// On phones it starts as one row; Join opens the email field inside it.
const bar = document.querySelector<HTMLElement>('.wl-bar');
if (bar) {
  const barOpen = bar.querySelector<HTMLButtonElement>('.wl-bar-open');
  barOpen?.addEventListener('click', () => { bar.classList.add('is-open'); barOpen.setAttribute('aria-expanded', 'true'); document.getElementById('wl-email-bar')?.focus(); });
  const heroForm = document.querySelector('.wl-form-hero'), close = document.querySelector('.wl-close');
  let heroIn = !!heroForm, closeIn = false;
  const place = () => { const show = !heroIn && !closeIn; bar.classList.toggle('is-shown', show); bar.inert = !show; };
  if ('IntersectionObserver' in window) {
    if (heroForm) new IntersectionObserver((es) => { heroIn = es[0].isIntersecting || es[0].boundingClientRect.top > 0; place(); }).observe(heroForm);
    if (close) new IntersectionObserver((es) => { closeIn = es[0].isIntersecting; place(); }, { threshold: 0.15 }).observe(close);
    place();
  } else { heroIn = false; place(); }
}

// waitlist forms: Netlify Forms over fetch, every form on the page shares one state
const forms = document.querySelectorAll<HTMLFormElement>('[data-waitlist]');
if (forms.length) {
  const done = (email: string) => {
    document.body.classList.add('wl-joined');
    forms.forEach((f) => { const m = f.querySelector('.wl-form-msg'); if (!m) return; m.textContent = 'You’re on the list. We’ll email ' + email + ' when your alpha seat opens.'; m.classList.remove('err'); });
  };
  try { const saved = localStorage.getItem(KEY); if (saved) done(saved); } catch { /* storage blocked */ }
  forms.forEach((f) => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = f.elements.namedItem('email') as HTMLInputElement, email = input.value.trim();
      const m = f.querySelector('.wl-form-msg')!, btn = f.querySelector<HTMLButtonElement>('button[type=submit]')!;
      if (!input.checkValidity()) { m.textContent = 'Enter an email like you@yoursalon.com.'; m.classList.add('err'); input.focus(); return; }
      btn.disabled = true; m.classList.remove('err'); m.textContent = 'Saving…';
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(f) as unknown as Record<string, string>).toString() })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); try { localStorage.setItem(KEY, email); } catch { /* storage blocked */ } done(email); })
        .catch(() => { m.textContent = 'That didn’t go through. Check your connection and try again.'; m.classList.add('err'); })
        .finally(() => { btn.disabled = false; });
    });
  });
}
