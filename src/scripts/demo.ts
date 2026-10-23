// Guided demos, started from the 1 2 3 buttons in the top bar (src/components/DemoPick.astro). A demo is a list of
// steps that can span pages; the step we're on lives in sessionStorage so it survives sign-in and page loads. Each
// step points a card at one element. "click" steps move on when that element is pressed (or "Do it for me"), so the
// visitor drives the app themselves. Nothing here changes the prototype's data.
import { DEMOS, type DemoId } from '../data/demos.ts';

type Step = {
  path: string; target?: string[]; title: string; body: string;
  place?: 'right' | 'left' | 'bottom' | 'top';
  cta?: string;          // label of the Next button
  click?: boolean;       // move on when the target is pressed
  enter?: () => void;    // runs when the step shows; inside the button press when reached by Next/Back
  wait?: number;         // ms to wait after enter() before finding the target (it appears in response)
};
const KEY = 'prism-demo';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => matchMedia('(max-width: 900px)').matches;
const call = () => (window as any).prismCall as { playStage(id: string): void; pause(): void } | undefined;
const prism = () => (window as any).prism as { askDash(q: string): void } | undefined;
const stage = (id: string, title: string, body: string): Step => ({ path: '/calls/rebecca', target: [`.did li[data-stage="${id}"]`], place: 'bottom', title, body, enter: () => call()?.playStage(id) });

const STEPS: Record<DemoId, Step[]> = {
  call: [
    { path: '/login', target: ['.login-submit'], place: 'left', click: true, title: 'You’re Casey, the owner', body: 'It’s Saturday, 9:41 am. Sign in to see what happened before you got in.' },
    { path: '/', target: ['#dm-call-note'], place: 'bottom', click: true, title: 'Joy took a call at 8:47 am', body: 'The salon opens at 9. Rebecca, a first-time guest, called anyway. Joy answered, and she’s already booked. Open the call.' },
    { path: '/calls/rebecca', target: ['[data-call-head]'], place: 'bottom', title: 'Every call gets a page', body: 'Who called, what she wanted, what was booked and what it’s worth: $224, and nobody on your team picked up the phone.' },
    { path: '/calls/rebecca', target: ['[data-call-player]'], place: 'right', cta: 'Start listening', title: 'Hear the call', body: 'This is the recording, with the transcript following along. Next plays the call one part at a time.' },
    stage('answer', 'She answers, on brand', 'Your salon’s name, her name and a warm opening. Every call, at any hour.'),
    stage('discover', 'She asks what matters', 'First visit? Natural or bright? The two questions your best front-desk person would ask. The answers go on Rebecca’s profile.'),
    stage('recommend', 'Prices from your Brand Hub', 'Joy quotes the artist levels and prices you set. She never guesses a price. Then she asks for a budget.'),
    stage('close', 'She matches the budget to a slot', 'About $200 means a Level 3 artist. Joy checks the calendar and offers Olivia, Friday at 2:30. Rebecca takes it.'),
    stage('upsell', 'She offers the add-on', 'Blonding guests often add a nourishing treatment, so Joy offers it. Yes: +$45, and the visit is now $224.'),
    stage('book', 'She books it and holds it', 'A secure link for the guest profile and card on file goes out by text, and the slot is held for 24 hours.'),
    stage('thank', 'She thanks her', 'And promises the address and parking, because it’s a first visit.'),
    { path: '/calls/rebecca', target: ['[data-call-booking]'], place: 'left', enter: () => call()?.pause(), title: 'It’s on the books', body: 'Held in your calendar for Friday with Olivia. It confirms itself when Rebecca adds her card. If she doesn’t, Joy nudges once, then frees the slot.' },
    { path: '/calls/rebecca', target: ['[data-call-sms]'], place: 'top', title: 'The text, two minutes later', body: 'The booking and the secure link, sent from your salon’s own number.' },
    { path: '/calls/rebecca', target: ['[data-call-email]'], place: 'top', title: 'The email, with directions', body: 'Your address, the parking notes from your Brand Hub and what to expect on a first visit. The reminder and a review request are already scheduled.' },
    { path: '/calls/rebecca', title: 'That’s Joy on the phone', body: 'One call of 1 minute 37 seconds: a new guest booked at $224, with an add-on, before you opened. Calls come with the Pro plan.' },
  ],
  winback: [
    { path: '/retention', target: ['.pg-head .pg-copy', '.pg-head'], place: 'bottom', title: 'Money already in your client list', body: 'PRISM reads your booking system and finds clients past their usual rebook date. This is what their next visits are worth.' },
    { path: '/retention', target: ['section[aria-labelledby="h-wb"]'], place: 'top', title: 'Who’s overdue, and why', body: 'Each row shows when they last came, who they saw and what they usually spend. Only people who said yes to texts are ticked.' },
    { path: '/retention', target: ['.pg-head [data-open-winback]', '[data-open-winback]'], place: 'left', click: true, title: 'One tap', body: 'Press Win back to write to all of them at once.' },
    { path: '/retention', target: ['#wb [data-wb-preview]'], place: 'left', title: 'Written for each client', body: 'Joy fills in the first name, stylist and last service for every client, in your salon’s voice. Edit it if you like.' },
    { path: '/retention', target: ['#wb [data-wb-send]'], place: 'top', title: 'Send it, or schedule it', body: 'Texts only go to people who agreed, never after 9 pm. Replies come back to Joy, who books them. Nothing is sent in this demo.' },
    { path: '/retention', target: ['section[aria-labelledby="h-past"]'], place: 'top', enter: () => { if (document.querySelector('#wb.open')) document.querySelector<HTMLElement>('#wb [data-close-wb]')?.click(); }, title: 'Then see what came back', body: 'Every win-back shows who rebooked and what they spent, so you know it paid for itself.' },
    { path: '/retention', title: 'That’s retention on autopilot', body: 'No spreadsheets, no list-building: overdue clients found, written to and rebooked from one button.' },
  ],
  ads: [
    { path: '/marketing', target: ['.pg-head'], place: 'bottom', title: 'Your ads, in one sentence', body: 'What each $1 of Meta and Google spend brought back in bookings, counted from real appointments, not clicks.' },
    { path: '/marketing', target: ['section[aria-labelledby="h-chan"]'], place: 'top', title: 'Which channel pays back', body: 'Spend, leads, bookings and money booked for each channel, side by side. Cut what doesn’t pay; feed what does.' },
    { path: '/marketing', target: ['section[aria-labelledby="h-ag"]'], place: 'top', title: 'Is your agency earning its fee?', body: 'PRISM sets the agency’s retainer against the bookings their campaigns actually brought in.' },
    { path: '/marketing', target: ['#dash-log .ask-msg.dash:last-child', '#dash'], place: 'left', wait: 650, enter: () => prism()?.askDash('Which channel pays back best?'), title: 'Or just ask Dash', body: 'Ask in plain words. Dash answers from your own numbers, then tells you the next move.' },
    { path: '/marketing', title: 'That’s your marketing, answered', body: 'Every ad dollar traced to a booked appointment, and someone to ask about it any time.' },
  ],
};

type State = { id: DemoId; i: number };
const read = (): State | null => { try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return s && STEPS[s.id as DemoId] ? s : null; } catch { return null; } };
const write = (s: State) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked: the demo still runs on this page */ } };
const clear = () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } };
const here = () => location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1') || '/';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const visible = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).getClientRects().length > 0;
const find = (s: Step) => { for (const q of s.target || []) { const el = document.querySelector(q); if (visible(el)) return el; } return null; };

let st = read();
let root: HTMLElement | null = null, hl: HTMLElement, card: HTMLElement, el: HTMLElement | null = null;

function start(id: DemoId) {
  st = { id, i: 0 }; write(st);
  if (id === 'call') { try { sessionStorage.removeItem('prism-in'); } catch { /* ignore */ } }   // Demo 1 begins at sign-in
  if (STEPS[id][0].path === here() && id !== 'call') show(); else location.href = STEPS[id][0].path;
}
function go(i: number) {
  if (!st) return;
  const steps = STEPS[st.id];
  st = { id: st.id, i: Math.max(0, Math.min(steps.length - 1, i)) }; write(st);
  if (steps[st.i].path !== here()) { location.href = steps[st.i].path; return; }
  show();
}
function finish() { clear(); st = null; root?.remove(); root = null; document.body.classList.remove('dm-touring'); paintPick(); }

function show() {
  if (!st) return;
  const steps = STEPS[st.id], s = steps[st.i], demo = DEMOS.find((d) => d.id === st!.id)!;
  if (!root) {
    root = document.createElement('div'); root.className = 'dm-tour' + (reduce ? ' nomotion' : '');
    root.innerHTML = '<div class="dm-hl"></div><div class="dg-card dm-card" role="dialog" aria-modal="false" aria-labelledby="dm-title"></div>';
    document.body.appendChild(root); hl = root.querySelector('.dm-hl')!; card = root.querySelector('.dm-card')!;
    root.addEventListener('click', onCardClick);
  }
  document.body.classList.add('dm-touring'); paintPick();
  el = find(s);
  const last = st.i === steps.length - 1;
  const nextDemo = DEMOS[(DEMOS.findIndex((d) => d.id === demo.id) + 1) % DEMOS.length];
  card.innerHTML = `<div class="dg-head"><span class="dm-n">${demo.n}</span><div><div class="dg-by">Demo ${demo.n} · ${esc(demo.title)}</div><div class="dg-step">${last ? 'Done' : `Step ${st.i + 1} of ${steps.length - 1}`}</div></div><button type="button" class="icon-btn dg-skip" data-dm="close" aria-label="Close the demo"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`
    + `<h2 id="dm-title" tabindex="-1">${esc(s.title)}</h2><p>${esc(s.body)}</p>`
    + `<div class="dg-foot"><div class="dg-dots" aria-hidden="true">${steps.slice(0, -1).map((_, k) => `<i class="${k === st!.i ? 'on' : ''}"></i>`).join('')}</div><div class="dg-btns">`
    + (last ? `<button type="button" class="btn" data-dm="close">Finish</button><button type="button" class="btn btn-black" data-dm-start="${nextDemo.id}"><span>Demo ${nextDemo.n}: ${esc(nextDemo.title)}</span><span class="arrow">→</span></button>`
      : `${st.i > 0 ? '<button type="button" class="btn" data-dm="back">Back</button>' : ''}`
        + (s.click && el ? `<button type="button" class="btn btn-black" data-dm="do"><span>Do it for me</span><span class="arrow">→</span></button>`
          : `<button type="button" class="btn btn-black" data-dm="next"><span>${esc(s.cta || 'Next')}</span><span class="arrow">→</span></button>`))
    + '</div></div>';
  root.classList.toggle('modal', !el);
  if (el) { el.style.scrollMarginTop = '84px'; el.scrollIntoView({ block: narrow() ? 'start' : 'center', behavior: 'auto' }); }
  place();
  (card.querySelector('#dm-title') as HTMLElement).focus({ preventScroll: true });
  s.enter?.();
  // measure again once the answer is in and once any slide-in has settled
  if (s.wait) [s.wait, s.wait + 450].forEach((ms) => setTimeout(() => { if (!root || !st || STEPS[st.id][st.i] !== s) return; el = find(s); root.classList.toggle('modal', !el); place(); }, ms));
}

function place() {
  if (!root || !st) return;
  const s = STEPS[st.id][st.i];
  if (!el || !visible(el)) { hl.style.opacity = '0'; card.style.cssText = ''; return; }
  const r = el.getBoundingClientRect(), pad = 8;
  hl.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;opacity:1`;
  if (narrow()) { card.style.cssText = 'left:12px;right:12px;bottom:12px;top:auto;width:auto'; return; }
  const w = Math.min(380, innerWidth - 24); card.style.width = `${w}px`;
  const h = card.offsetHeight, gap = 18, vw = innerWidth, vh = innerHeight;
  const opts: Record<string, [number, number]> = { right: [r.right + gap + pad, r.top], left: [r.left - gap - pad - w, r.top], bottom: [r.left, r.bottom + gap + pad], top: [r.left, r.top - gap - pad - h] };
  let pos = opts[s.place || 'right'];
  for (const o of [s.place || 'right', 'right', 'left', 'bottom', 'top']) { const [x, y] = opts[o]; if (x >= 12 && x + w <= vw - 12 && y >= 12 && y + h <= vh - 12) { pos = [x, y]; break; } }
  card.style.cssText = `left:${Math.max(12, Math.min(pos[0], vw - w - 12))}px;top:${Math.max(12, Math.min(pos[1], vh - h - 12))}px;width:${w}px`;
}

function onCardClick(e: Event) {
  const t = e.target as HTMLElement;
  const startBtn = t.closest<HTMLElement>('[data-dm-start]'); if (startBtn) { finish(); start(startBtn.dataset.dmStart as DemoId); return; }
  const b = t.closest<HTMLElement>('[data-dm]'); if (!b || !st) return;
  const a = b.dataset.dm;
  if (a === 'close') finish();
  else if (a === 'back') go(st.i - 1);
  else if (a === 'next') go(st.i + 1);
  else if (a === 'do' && el) el.click();   // the page's own handler runs; advanceOn() below moves the demo on
}

// a "click" step moves on when its target is pressed, by the visitor or by "Do it for me"
function advanceOn(e: Event) {
  if (!st || !root) return;
  const s = STEPS[st.id][st.i];
  if (!s.click || !el) return;
  const t = e.target as HTMLElement;
  if (!(el === t || el.contains(t) || (e.type === 'submit' && t.contains(el)))) return;
  const next = st.i + 1; st = { id: st.id, i: next }; write(st);
  el = null;   // a sign-in press is a click and then a submit: count it once
  // same-page steps render once the page has reacted (e.g. a side panel opened); navigation renders on the next load
  if (STEPS[st.id][next].path === here()) setTimeout(show, reduce ? 0 : 380);
}
document.addEventListener('click', advanceOn, true);
document.addEventListener('submit', advanceOn, true);

let ticking = false;
const reflow = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; place(); }); };
addEventListener('resize', reflow); addEventListener('scroll', reflow, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && root) finish(); });

// the 1 2 3 buttons
function paintPick() { document.querySelectorAll<HTMLElement>('[data-demo-start]').forEach((b) => b.setAttribute('aria-pressed', String(!!st && b.dataset.demoStart === st.id))); }
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('.demo-pick [data-demo-start]');
  if (!b) return;
  if (root) finish();
  start(b.dataset.demoStart as DemoId);
});

// Demo 1's Home: Joy's call waiting at the top of the page
function callNote() {
  const home = document.querySelector('.home'); if (!home || document.getElementById('dm-call-note')) return;
  const note = document.createElement('a');
  note.id = 'dm-call-note'; note.className = 'dm-note'; note.href = '/calls/rebecca';
  note.innerHTML = '<span class="avatar joy md"><img src="/brand/joy-mark.svg" alt="" /></span><span class="dm-note-copy"><strong>Joy answered a call from Rebecca Hale</strong><span>8:47 am, before opening · New guest · Booked Friday 2:30 with Olivia · $224</span></span><span class="dm-note-go">Open the call <span aria-hidden="true">→</span></span>';
  home.prepend(note);
}

// pick up where the demo is: render its step here, or offer to resume it from another page
paintPick();
if (st) {
  const s = STEPS[st.id][st.i];
  if (st.id === 'call' && here() === '/') callNote();
  if (s.path === here()) setTimeout(show, here() === '/login' ? 300 : 650);
  else {
    const pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'dm-resume';
    pill.innerHTML = `Demo ${DEMOS.find((d) => d.id === st!.id)!.n} paused <span>Resume →</span>`;
    pill.addEventListener('click', () => go(st!.i));
    document.body.appendChild(pill);
  }
}

export {};
