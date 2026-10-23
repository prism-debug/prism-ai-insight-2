// Signup: one question per screen. Every keystroke is saved, the step lives in the URL hash so Back works, and the booking
// system decides whether the account opens now (Phorest, Zenoti) or waits on the list.
import { STEPS, FREE_MAIL, BOOKING_SYSTEMS, bookingName, type StepId } from '../data/signup.ts';

interface State { email: string; name: string; role: string; salon: string; type: string; booking: string; bookingOther: string; step: StepId; done?: boolean; salonGuessed?: boolean }
const KEY = 'prism-signup';
const blank = (): State => ({ email: '', name: '', role: '', salon: '', type: '', booking: '', bookingOther: '', step: 'email' });
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const root = $('[data-signup]');
if (root) run(root);

function run(root: HTMLElement) {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let st: State = blank();
  let resumed = false;
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && typeof saved === 'object') { st = { ...blank(), ...saved }; resumed = !!(st.email || st.name || st.salon); } } catch { /* fresh start */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* storage unavailable */ } };

  const order: StepId[] = [...STEPS.map((s) => s.id), 'in'];
  const err = $('[data-err]', root)!;
  const announce = $('[data-announce]', root)!;

  // ---------- fields
  $$<HTMLInputElement>('[data-field]', root).forEach((i) => {
    const k = i.dataset.field as keyof State;
    i.value = (st[k] as string) || '';
    i.addEventListener('input', () => { (st as any)[k] = i.value; if (k === 'salon') st.salonGuessed = false; save(); clearErr(); });
  });
  const setRadio = (group: string, value: string) => {
    $$('[data-radios="' + group + '"] [role="radio"]', root).forEach((b) => { const on = b.dataset.value === value; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    const first = $('[data-radios="' + group + '"] [role="radio"]', root);
    if (!value && first) first.tabIndex = 0;
  };
  $$('[data-radios]', root).forEach((g) => {
    const k = g.dataset.radios as 'role' | 'type' | 'booking';
    setRadio(k, st[k]);
    g.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[role="radio"]'); if (!b) return;
      st[k] = b.dataset.value!; save(); setRadio(k, st[k]); clearErr();
      if (k === 'booking') otherField();
    });
    // arrow keys move and select, like native radios
    g.addEventListener('keydown', (e) => {
      const btns = $$('[role="radio"]', g); const i = btns.indexOf(document.activeElement as HTMLElement); if (i < 0) return;
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
      e.preventDefault(); const n = btns[(i + d + btns.length) % btns.length]; n.focus(); n.click();
    });
  });
  const otherField = () => { const f = $('[data-other]', root)!; f.hidden = st.booking !== 'other'; if (!f.hidden) $<HTMLInputElement>('input', f)!.focus(); };
  otherField();

  // ---------- steps
  function show(step: StepId, push = true) {
    st.step = step; save();
    root.dataset.step = step;
    $$('[data-panel]', root).forEach((p) => (p.hidden = p.dataset.panel !== step));
    const idx = order.indexOf(step);
    $$('[data-prog]', root).forEach((li) => { const i = order.indexOf(li.dataset.prog as StepId); li.dataset.state = step === 'in' || step === 'list' || i < idx ? 'done' : i === idx ? 'current' : 'todo'; });
    const left = STEPS.slice(Math.max(0, idx)).reduce((a, s) => a + s.seconds, 0);
    const time = $('[data-time]', root)!; time.hidden = step === 'in' || step === 'list';
    $('[data-time-n]', root)!.textContent = left >= 60 ? 'a minute' : `${left} seconds`;
    $('[data-back]', root)!.hidden = idx <= 0 && step !== 'list';
    $('[data-progress]', root)!.hidden = step === 'list';
    if (push && location.hash !== '#' + step) history.pushState(null, '', '#' + step); else if (!push) history.replaceState(null, '', '#' + step);
    clearErr();
    // salon prefill from the work-email domain
    if (step === 'salon' && !st.salon) { const g = guessSalon(st.email); if (g) { st.salon = g; st.salonGuessed = true; save(); $<HTMLInputElement>('[data-field="salon"]', root)!.value = g; } }
    $('[data-hint="salon"]', root)!.hidden = !(step === 'salon' && st.salonGuessed);
    if (step === 'in' || step === 'list') fillBinds();
    const panel = $('[data-panel="' + step + '"]', root)!;
    const title = $('.su-title', panel)!;
    announce.textContent = title.textContent;
    const field = $<HTMLInputElement>('input:not([hidden]) , [role="radio"][tabindex="0"]', panel);
    const focusTarget = step === 'in' || step === 'list' ? $<HTMLElement>('.btn, .login-link', panel) : field && !field.closest('[hidden]') ? field : title;
    focusTarget?.focus({ preventScroll: calm });
    if (!calm) panel.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
  }
  function guessSalon(email: string) {
    const dom = email.split('@')[1]?.toLowerCase(); if (!dom || FREE_MAIL.includes(dom)) return '';
    const base = dom.split('.')[0].replace(/[-_]+/g, ' ').trim(); if (!base || base.length < 3) return '';
    return base.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function fillBinds() {
    const crm = st.booking === 'unsure' ? 'your booking system' : st.booking === 'none' ? 'a booking system' : st.booking === 'other' ? st.bookingOther || 'your booking system' : bookingName(st.booking);
    const vals: Record<string, string> = { name: st.name || 'there', salon: st.salon || 'your salon', crm, crmOther: st.booking === 'none' ? 'a paper book' : crm, email: st.email };
    $$('[data-bind]', root).forEach((el) => (el.textContent = vals[el.dataset.bind!] ?? ''));
  }
  const showErr = (msg: string, field?: HTMLInputElement) => { err.textContent = msg; err.hidden = false; if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); } };
  const clearErr = () => { err.hidden = true; err.textContent = ''; $$('[aria-invalid]', root).forEach((f) => f.removeAttribute('aria-invalid')); };

  // ---------- validation, in plain words with the fix
  function next(from: StepId) {
    if (from === 'email') {
      const i = $<HTMLInputElement>('[data-field="email"]', root)!; const v = i.value.trim().toLowerCase(); i.value = v; st.email = v; save();
      if (!v) return showErr('Add your email so we can send you a sign-in link.', i);
      if (!v.includes('@')) return showErr('That email is missing an @. Try you@yoursalon.com.', i);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return showErr('That email looks incomplete. Check the part after the @.', i);
      return show('you');
    }
    if (from === 'you') { st.name = st.name.trim(); save(); return show('salon'); }
    if (from === 'salon') { st.salon = st.salon.trim(); save(); return show('booking'); }
    if (from === 'booking') {
      if (!st.booking) return showErr('Pick your booking system, or “Not sure” if you don’t know.');
      if (st.booking === 'other' && !st.bookingOther.trim()) return showErr('Tell us the name of your booking system.', $<HTMLInputElement>('[data-field="bookingOther"]', root)!);
      const ok = BOOKING_SYSTEMS.find((b) => b.id === st.booking)?.supported || st.booking === 'unsure';
      return show(ok ? 'in' : 'list');
    }
  }

  // ---------- events
  root.addEventListener('submit', (e) => { e.preventDefault(); const p = (e.target as HTMLElement).closest<HTMLElement>('[data-panel]'); if (p) next(p.dataset.panel as StepId); });
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-back]')) { e.preventDefault(); const i = order.indexOf(st.step); show(st.step === 'list' ? 'booking' : order[Math.max(0, i - 1)]); return; }
    if (t.closest('[data-skip]')) { next(st.step); return; }
    const go = t.closest<HTMLElement>('[data-goto]'); if (go) { show(go.dataset.goto as StepId); return; }
    if (t.closest('[data-google]')) {
      // prototype: Google hands back a verified work address
      const i = $<HTMLInputElement>('[data-field="email"]', root)!; if (!i.value.trim()) { i.value = 'amara@marlowfinch.example'; st.email = i.value; save(); }
      st.name = st.name || 'Amara'; $<HTMLInputElement>('[data-field="name"]', root)!.value = st.name; save(); next('email'); return;
    }
    if (t.closest('[data-reset]')) { st = blank(); save(); location.hash = ''; location.reload(); return; }
    if (t.closest('[data-finish]')) {
      st.done = true; save();
      try { sessionStorage.setItem('prism-in', '1'); } catch { /* ignore */ }
    }
  });
  window.addEventListener('popstate', () => { const h = location.hash.slice(1) as StepId; if (h && [...order, 'list'].includes(h)) show(h, false); });

  // ---------- start: the hash wins, then the saved step, else the top
  const hash = location.hash.slice(1) as StepId;
  let start: StepId = hash && [...order, 'list'].includes(hash) ? hash : st.step || 'email';
  // never land on a later step without the email that step depends on
  if (start !== 'email' && !st.email) start = 'email';
  if (resumed) $('[data-resume]', root)!.hidden = false;
  show(start, false);
}
