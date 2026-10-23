// Bookings: request actions, day schedule (grid on desktop, agenda on phones), details and New booking panels, no-show texts.
import { freeGaps, startsFor, fmtMin, fmtDur, dayLabel, isoOf, offsetOfIso, type Iv } from '../data/bookings-core.ts';

type Appt = { id: string; name: string; clientId?: string; phone: string; consent: boolean; stylist: string; service: string; day: number; start: number; minutes: number; value: number; status: string; by: string; bookedAgo: string };
type Slot = { day: number; min: number; stylist: string };
const raw = JSON.parse(document.getElementById('bk-data')!.textContent || '{}');
const S = raw.schedule as { nowMin: number; stylists: { id: string; name: string; role: string; tone: number; services: string[] }[]; services: { id: string; name: string; minutes: number; price: number; consult: boolean }[]; appts: Appt[]; breaks: Record<string, number>; hours: Record<string, [number, number] | null> };
let appts: Appt[] = S.appts.map((a) => ({ ...a }));

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const toast = (m: string, undo?: () => void) => (window as any).prism.toast(m, undo);
const first = (n: string) => n.split(' ')[0];
const sty = (id: string) => S.stylists.find((s) => s.id === id)!;
const svc = (id: string) => S.services.find((s) => s.id === id)!;
const hoursOn = (d: number): [number, number] | null => (S.hours[String(d)] ?? null);
const fmtLong = (s: Slot) => `${dayLabel(s.day)} ${fmtMin(s.min)} with ${first(sty(s.stylist).name)}`;
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

// ---- state icons (same shapes as StatusIcon.astro)
const ICON: Record<string, string> = {
  pending: `<circle cx="7" cy="7" r="5.5" stroke="var(--watch)" stroke-width="1.5"/><path d="M7 3.6a3.4 3.4 0 0 1 0 6.8z" fill="var(--watch)"/>`,
  confirmed: `<circle cx="7" cy="7" r="5.5" stroke="var(--violet)" stroke-width="1.5"/><path d="M7 7V3.6A3.4 3.4 0 1 1 3.6 7z" fill="var(--violet)"/>`,
  active: `<circle cx="7" cy="7" r="6" fill="var(--good)"/>`,
  done: `<circle cx="7" cy="7" r="6" fill="var(--good)"/><path d="M4.4 7.2l1.9 1.9 3.3-3.8" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  declined: `<circle cx="7" cy="7" r="5.5" stroke="var(--ink-4)" stroke-width="1.5"/><path d="M5 5l4 4M9 5l-4 4" stroke="var(--ink-4)" stroke-width="1.5" stroke-linecap="round"/>`,
  no_show: `<circle cx="7" cy="7" r="5.5" stroke="var(--attn)" stroke-width="1.5" stroke-dasharray="2.4 2.2"/>`,
  proposed: `<circle cx="7" cy="7" r="5.5" stroke="var(--violet)" stroke-width="1.5" stroke-dasharray="2.4 2.2"/>`,
};
const STATE_ICON: Record<string, string> = { booked: 'pending', confirmed: 'confirmed', in_progress: 'active', checked_out: 'done', no_show: 'no_show', pending: 'pending', declined: 'declined', proposed: 'proposed' };
const STATE_LABEL: Record<string, string> = { booked: 'Booked', confirmed: 'Confirmed', in_progress: 'In the chair', checked_out: 'Done', no_show: 'No-show' };
const sIcon = (state: string, size = 14) => `<svg class="state-icon" width="${size}" height="${size}" viewBox="0 0 14 14" fill="none" role="img" aria-label="${STATE_LABEL[state] ?? state}"><title>${STATE_LABEL[state] ?? state}</title>${ICON[STATE_ICON[state] ?? 'pending']}</svg>`;
const BY: Record<string, string> = { joy: 'Joy', team: 'The team', online: 'Online booking', client: 'The guest, online' };

// ---- gaps
const breakIv = (sid: string, day: number): Iv | null => {
  const b = S.breaks[sid]; if (b === undefined || !hoursOn(day)) return null; const iv = { s: b, e: b + 30 };
  return appts.some((a) => a.stylist === sid && a.day === day && a.start < iv.e && a.start + a.minutes > iv.s) ? null : iv;
};
const busyOf = (sid: string, day: number, ignore?: string): Iv[] => {
  const v = appts.filter((a) => a.stylist === sid && a.day === day && a.status !== 'no_show' && a.id !== ignore).map((a) => ({ s: a.start, e: a.start + a.minutes }));
  const b = breakIv(sid, day); if (b) v.push(b); return v;
};
const gapsOf = (sid: string, day: number, ignore?: string) => freeGaps(hoursOn(day), busyOf(sid, day, ignore), day === 0 ? Math.ceil(S.nowMin / 15) * 15 : 0);

// ================= Requests =================
type Req = { id: string; name: string; phone: string; consent: boolean; service: string; minutes: number; stylist: string; suggestion: Slot | null; suggestionLabel: string; svcName: string; price: number; fromPrice: boolean; stylistName: string; via: string; waited: string; asked: string[]; reason: string; awaiting: boolean; notes: string; flagSet: { deposit: boolean; consult: boolean; photos: boolean }; other: string[]; alts: { v: string; label: string }[] };
const RQ = raw.requests as Record<string, Req>;
const list = $('#req-list');
const drawer = $('#req-drawer')!, scrim = $('#req-scrim')!, bkRoot = $('.bk')!;
let openReq: string | null = null;
const CLOCK = `<svg class="state-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" role="img" aria-label="Waiting for you"><title>Waiting for you</title><circle cx="7" cy="7" r="5.5" stroke="var(--watch)" stroke-width="1.5"/><path d="M7 4.2V7l1.9 1.2" stroke="var(--watch)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function counts() {
  let pending = 0;
  $$('.group', list!).forEach((g) => {
    const n = $$('.row.req', g).length; const c = $('.count', g); if (c) c.textContent = String(n); g.hidden = n === 0;
    if (['urgent', 'week', 'later'].includes(g.dataset.group!)) pending += n;
  });
  const cnt = $('#cnt-req'); if (cnt) { cnt.textContent = String(pending); cnt.classList.toggle('hot', pending > 0); }
  const lead = $('#req-lead'); if (lead) lead.textContent = pending ? `${pending} ${pending === 1 ? 'request' : 'requests'} to answer. Nothing reaches Phorest or a guest until you approve.` : 'No requests waiting.';
  const e = $('#req-empty'); if (e) e.hidden = pending !== 0;
}
function setState(row: HTMLElement, state: string, note = '') {
  row.dataset.state = state;
  const target = state === 'pending' ? row.dataset.grp! : state;
  $(`.group[data-group="${target}"] .group-body`, list!)!.appendChild(row);
  const ic = $('[data-state-icon]', row); if (ic) ic.innerHTML = state === 'pending' ? CLOCK : sIcon(state, 14);
  const done = $('[data-done]', row)!; done.hidden = state === 'pending'; done.textContent = state === 'confirmed' ? 'Confirmed' : state === 'declined' ? 'Declined' : 'Proposed';
  const rv = $('.req-review', row) as HTMLElement | null; if (rv) rv.hidden = state !== 'pending';
  if (note) { const ln = $('[data-line]', row); if (ln) { ln.textContent = note; ln.title = note; } }
  counts(); if (openReq === row.dataset.req) renderDrawer(note);
}
const timeNow = '9:41 am';
const kv = (k: string, v: string) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
function renderDrawer(doneNote = '') {
  const r = RQ[openReq!]; const row = $<HTMLElement>(`.row.req[data-req="${r.id}"]`, list!)!; const st = row.dataset.state!;
  const fn = first(r.name); const sg = r.suggestion;
  const flags = [kv('Deposit', r.flagSet.deposit ? 'Required' : 'Not needed'), kv('Consult', r.flagSet.consult ? 'Needed first' : 'Not needed'), kv('Photos', r.flagSet.photos ? 'Attached' : 'None'), kv('Text consent', r.consent ? 'Yes' : 'No')].join('');
  const stateTxt = st === 'confirmed' ? 'Confirmed' : st === 'declined' ? 'Declined' : st === 'proposed' ? 'Waiting on the guest' : '';
  const acts = st === 'pending' ? `<div class="rd-acts">
      <button type="button" class="btn btn-black" data-act="approve" ${sg ? '' : 'disabled'}>Approve this booking<span class="arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button>
      <p class="rd-note">${r.consent ? 'Approve. Phorest is updated and the guest gets a text.' : 'Approve. Phorest is updated; no text is sent (no text consent).'}</p>
      <button type="button" class="btn" data-act="propose">Propose another time</button>
      <div class="rd-picker" id="rd-picker" hidden>
        <label class="field">Propose another time<select class="select" data-pick>${r.alts.map((a) => `<option value="${a.v}">${esc(a.label)}</option>`).join('')}</select></label>
        <p class="rd-note">${r.consent ? `Joy texts ${esc(fn)} the new time.` : `${esc(fn)} has not agreed to texts. Call ${esc(r.phone)}; the time is saved as proposed.`}</p>
        <div class="row-btns"><button type="button" class="btn" data-act="send-proposal">${r.consent ? 'Send proposal' : 'Save as proposed'}</button><button type="button" class="btn btn-quiet" data-act="cancel-propose">Cancel</button></div>
      </div>
      <button type="button" class="btn btn-danger" data-act="decline">Decline</button>
    </div>` : `<div class="rd-done">${esc(doneNote || stateTxt)}</div>`;
  drawer.innerHTML = `<div class="rd-head"><span class="avatar md" data-tone="1">${esc(r.name.split(' ').map((p) => p[0]).slice(0, 2).join(''))}</span><div><h2>${esc(r.name)}</h2><div class="t-meta">${esc(r.via)} · ${esc(r.waited)}${r.phone ? ' · ' + esc(r.phone) : ''}</div></div><button type="button" class="icon-btn" data-act="close" aria-label="Close panel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div class="rd-why"><b>Joy's reasoning</b><span>${esc(r.reason || 'Joy has no suggestion yet.')}</span>${sg ? `<span class="muted">${r.awaiting ? 'Booked' : 'Suggested'}: ${esc(r.suggestionLabel)}</span>` : ''}</div>
    <dl class="rd-dl">${kv('Asked for', r.asked.length ? r.asked.map(esc).join('<br>') : 'No time given')}${kv('Service', `${esc(r.svcName)} · ${r.fromPrice ? 'from ' : ''}$${r.price}`)}${kv('Stylist', esc(r.stylistName))}${flags}${r.other.length ? kv('Also', r.other.map(esc).join(', ')) : ''}${r.notes ? kv('Guest note', esc(r.notes)) : ''}</dl>
    ${acts}`;
}
function openDrawer(id: string) {
  $$('.row.req[aria-selected]', list!).forEach((x) => x.removeAttribute('aria-selected'));
  openReq = id; $(`.row.req[data-req="${id}"]`, list!)!.setAttribute('aria-selected', 'true');
  renderDrawer(); drawer.hidden = false; scrim.hidden = false; bkRoot.classList.add('req-open');
  (drawer as HTMLElement).scrollTop = 0; $<HTMLElement>('[data-act="approve"]', drawer)?.focus({ preventScroll: true });
}
function closeDrawer() {
  if (!openReq) return;
  $(`.row.req[data-req="${openReq}"]`, list!)?.removeAttribute('aria-selected');
  openReq = null; drawer.hidden = true; scrim.hidden = true; bkRoot.classList.remove('req-open');
}
function act(act: string) {
  const r = RQ[openReq!]; if (!r) return; const row = $<HTMLElement>(`.row.req[data-req="${r.id}"]`, list!)!; const fn = first(r.name);
  if (act === 'approve') {
    const slot = r.suggestion; if (!slot) { toast(`No gap found for ${fn}. Use Propose another time to pick one by hand.`); return; }
    const id = `appt-${r.id}`;
    appts.push({ id, name: r.name, phone: r.phone, consent: r.consent, stylist: slot.stylist, service: r.service, day: slot.day, start: slot.min, minutes: r.minutes, value: svc(r.service).price, status: 'confirmed', by: 'online', bookedAgo: 'just now' });
    const msg = r.consent ? `Confirmation text sent to ${fn}.` : `${fn} has not agreed to texts, so nothing was sent. Call ${r.phone}.`;
    setState(row, 'confirmed', `Confirmed ${fmtLong(slot)}`); renderSchedule();
    toast(`Confirmed ${r.name}, ${fmtLong(slot)}. Sent to Phorest. ${msg}`, () => { appts = appts.filter((a) => a.id !== id); setState(row, 'pending'); renderSchedule(); });
  } else if (act === 'decline') {
    setState(row, 'declined', 'Declined');
    toast(`Declined ${r.name}. ${r.consent ? 'A kind decline text goes out.' : 'No text sent: no consent on file.'}`, () => setState(row, 'pending'));
  } else if (act === 'propose') { const p = $('#rd-picker', drawer)!; p.hidden = !p.hidden; if (!p.hidden) $('select', p)?.focus(); }
  else if (act === 'cancel-propose') { $('#rd-picker', drawer)!.hidden = true; }
  else if (act === 'send-proposal') {
    const [d, m, s] = $<HTMLSelectElement>('[data-pick]', drawer)!.value.split('|'); const slot = { day: +d, min: +m, stylist: s };
    setState(row, 'proposed', `Proposed ${fmtLong(slot)}${r.consent ? `, texted ${timeNow}` : ', call to confirm'}`);
    toast(r.consent ? `Proposed ${fmtLong(slot)} to ${fn} by text.` : `Saved. ${fn} has no text consent: call ${r.phone}.`, () => setState(row, 'pending'));
  } else if (act === 'close') closeDrawer();
}
list?.addEventListener('click', (e) => {
  const row = (e.target as HTMLElement).closest<HTMLElement>('.row.req'); if (!row) return;
  if (row.dataset.req === openReq && !(e.target as HTMLElement).closest('[data-act]')) { closeDrawer(); return; }
  openDrawer(row.dataset.req!);
});
drawer.addEventListener('click', (e) => { const a = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (a) act(a.dataset.act!); });
scrim.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && openReq) closeDrawer(); });
document.addEventListener('click', (ev) => { if (!(ev.target as HTMLElement).closest('[role="tab"], [data-tm-go]')) return; closeDrawer(); });
counts();

// ================= No-shows =================
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-ns-text]'); if (!b) return;
  const done = $('[data-ns-done]', b.parentElement!)!; const name = b.dataset.name!;
  b.hidden = true; done.hidden = false; done.textContent = `Texted ${timeNow}`;
  toast(`Rebook text sent to ${first(name)}: “Hi ${first(name)}, we missed you for ${b.dataset.svc!.toLowerCase()}. Want a new time this week?”`, () => { b.hidden = false; done.hidden = true; });
});

// ================= Schedule =================
let day = 0, filter = 'all', sel: string | null = null, mode: 'day' | 'appt' | 'new' = 'day', subpanel: '' | 'text' | 'move' = '';
let draft = { name: '', phone: '', service: 'cut', stylist: 'any', date: 0, start: 0 };
const aside = $('#sch-aside')!, gridEl = $('#sch-grid')!, agendaEl = $('#sch-agenda')!;
const visible = () => S.stylists.filter((s) => filter === 'all' || s.id === filter);
const dayAppts = (d: number) => appts.filter((a) => a.day === d);
const PX = 64, H0 = 9, H1 = 20;
const yOf = (m: number) => ((m - H0 * 60) * PX) / 60;

function renderBar() {
  $$('[data-day]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.day! === day)));
  const dt = $<HTMLInputElement>('#sch-date')!; dt.value = isoOf(day);
  $('#sch-label')!.textContent = dayLabel(day, 'long') + (day === 0 ? ' · today' : '');
  const chips = $('#sch-chips')!;
  chips.innerHTML = [{ id: 'all', name: 'Everyone' }, ...S.stylists].map((s) => `<button type="button" class="chip ${filter === s.id ? 'on' : ''}" data-f="${s.id}" aria-pressed="${filter === s.id}">${esc(s.id === 'all' ? s.name : first(s.name))}</button>`).join('');
}
function renderGrid() {
  const cols = visible(); const open = hoursOn(day);
  if (!open) { gridEl.innerHTML = `<div class="empty tg-closed"><strong>Closed ${dayLabel(day, 'long')}</strong>Opening hours say closed, and Joy, the phone line and your forms tell guests the same. <a class="link" style="color:var(--violet-deep);font-weight:600" href="/settings#hours">Change hours</a></div>`; return; }
  const hrs = H1 - H0; let h = `<div class="tg" style="--n:${cols.length};--hrs:${hrs}"><div class="tg-h"></div>`;
  for (const s of cols) h += `<div class="tg-h"><span class="avatar sm" data-tone="${s.tone}">${esc(s.name.split(' ').map((p) => p[0]).join(''))}</span>${esc(first(s.name))}<small>${dayAppts(day).filter((a) => a.stylist === s.id).length} booked</small></div>`;
  h += `<div class="tg-gutter">${Array.from({ length: hrs + 1 }, (_, i) => (i === 0 ? '' : `<span style="top:${i * PX}px">${fmtMin((H0 + i) * 60).replace(':00', '')}</span>`)).join('')}</div>`;
  for (const s of cols) {
    h += `<div class="tg-col" data-col="${s.id}">`;
    if (open[0] > H0) h += `<div class="tg-shade" style="top:0;height:${yOf(open[0] * 60)}px"></div>`;
    if (open[1] < H1) h += `<div class="tg-shade" style="top:${yOf(open[1] * 60)}px;bottom:0"></div>`;
    const b = breakIv(s.id, day); if (b) h += `<div class="tg-blk brk" style="top:${yOf(b.s)}px;height:${yOf(b.e) - yOf(b.s) - 2}px">Break</div>`;
    for (const a of dayAppts(day).filter((x) => x.stylist === s.id)) {
      const hgt = (a.minutes * PX) / 60 - 2; const short = a.minutes < 50;
      h += `<button type="button" class="tg-blk s-${a.status} ${short ? 'short' : ''}" data-appt="${a.id}" aria-pressed="${sel === a.id}" style="top:${yOf(a.start)}px;height:${hgt}px" aria-label="${esc(a.name)}, ${esc(svc(a.service).name)}, ${fmtMin(a.start)}, ${STATE_LABEL[a.status] ?? a.status}"><span class="b-t"><span class="truncate">${esc(a.name)}</span>${sIcon(a.status, 12)}</span><span class="b-s truncate">${fmtMin(a.start)} ${esc(svc(a.service).name)}</span></button>`;
    }
    h += `</div>`;
  }
  if (day === 0 && S.nowMin >= H0 * 60 && S.nowMin <= H1 * 60) h += `<div class="tg-now" data-t="${fmtMin(S.nowMin).replace(' am', '').replace(' pm', '')}" style="top:${38 + yOf(S.nowMin)}px"></div>`;
  gridEl.innerHTML = h + `</div>`;
}
function renderAgenda() {
  const open = hoursOn(day);
  if (!open) { agendaEl.innerHTML = `<div class="empty"><strong>Closed ${dayLabel(day, 'long')}</strong>Opening hours say closed. Pick another day.</div>`; return; }
  agendaEl.innerHTML = visible().map((s) => {
    const mine = dayAppts(day).filter((a) => a.stylist === s.id); const gaps = gapsOf(s.id, day).filter((g) => g.e - g.s >= 30);
    const items = [...mine.map((a) => ({ t: a.start, a })), ...gaps.map((g) => ({ t: g.s, g }))].sort((x, y) => x.t - y.t);
    return `<div class="group"><button type="button" class="group-head"><svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg><span>${esc(s.name)}</span><span class="count">${mine.length}</span></button><div class="group-body">${items.map((i) => 'a' in i && i.a
      ? `<button type="button" class="ag-row" data-appt="${i.a!.id}"><span class="tnum muted">${fmtMin(i.a!.start)}</span><span class="truncate"><b>${esc(i.a!.name)}</b> <span class="muted">${esc(svc(i.a!.service).name)}</span></span>${sIcon(i.a!.status)}</button>`
      : `<button type="button" class="ag-row free" data-free="${s.id}|${i.g!.s}"><span class="tnum">${fmtMin(i.g!.s)}</span><span class="truncate">Free until ${fmtMin(i.g!.e)}</span><span>Book</span></button>`).join('') || '<div class="empty">Nothing booked.</div>'}</div></div>`;
  }).join('');
}
const prop = (k: string, v: string) => `<div class="prop"><dt>${k}</dt><dd>${v}</dd></div>`;
const closeBtn = `<button type="button" class="icon-btn a-close-btn" data-close-aside aria-label="Close panel"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
function renderAside() {
  const a = sel ? appts.find((x) => x.id === sel) : null;
  if (mode === 'appt' && a) {
    const canNoShow = ['confirmed', 'booked', 'in_progress'].includes(a.status) && a.day <= 0;
    aside.innerHTML = `<div class="a-head"><span class="avatar md" data-tone="${sty(a.stylist).tone}">${esc(a.name.split(' ').map((p) => p[0]).slice(0, 2).join(''))}</span><div><h2>${esc(a.name)}</h2><div class="t-meta">${esc(a.phone || 'No phone on file')}</div></div>${closeBtn}</div>
      <dl>${prop('State', `${sIcon(a.status)}${STATE_LABEL[a.status] ?? a.status}`)}${prop('Service', esc(svc(a.service).name))}${prop('Stylist', esc(sty(a.stylist).name))}${prop('When', `${dayLabel(a.day)}, ${fmtMin(a.start)} to ${fmtMin(a.start + a.minutes)}`)}${prop('Price', money(a.value))}${prop('Booked by', `${BY[a.by] ?? a.by}${a.by === 'joy' ? ' <span class="tag joy">Joy</span>' : ''}`)}${prop('Booked', esc(a.bookedAgo))}${prop('Text consent', a.consent ? 'Yes' : '<span class="a-note warn">No consent on file</span>')}</dl>
      <div class="a-acts"><button type="button" class="btn btn-sm" data-sub="text">Text</button><button type="button" class="btn btn-sm" data-sub="move">Reschedule</button><button type="button" class="btn btn-sm btn-danger" data-noshow ${canNoShow ? '' : 'disabled'} title="${canNoShow ? '' : 'Only for appointments that have started'}">Mark no-show</button></div>
      ${subpanel === 'text' ? textPanel(a) : ''}${subpanel === 'move' ? movePanel(a) : ''}
      <p class="a-note" style="margin-top:12px">Phorest stays the record. Changes here are written to Phorest only when you confirm them.</p>`;
  } else if (mode === 'new') {
    aside.innerHTML = newPanel();
  } else {
    const list = dayAppts(day).filter((x) => x.status !== 'no_show'); const open = hoursOn(day);
    const gaps = visible().map((s) => { const g = gapsOf(s.id, day).sort((x, y) => y.e - y.s - (x.e - x.s))[0]; return { s, g }; });
    aside.innerHTML = `<div class="a-head"><h2>${dayLabel(day, 'long')}</h2>${closeBtn}</div><dl>${prop('Hours', open ? `${fmtMin(open[0] * 60)} to ${fmtMin(open[1] * 60)}` : 'Closed')}${prop('Appointments', String(list.length))}${prop('Booked value', money(list.reduce((n, x) => n + x.value, 0)))}</dl>
      ${open ? `<div class="props-title">Longest open gap</div><div class="a-gaps">${gaps.map(({ s, g }) => `<div><span>${esc(first(s.name))}</span><span class="tnum ${g ? '' : 'muted'}">${g ? `${fmtMin(g.s)} to ${fmtMin(g.e)}` : 'Full'}</span></div>`).join('')}</div>` : ''}
      <p class="a-note" style="margin-top:12px">Select an appointment for its details, or use New booking to check a service against a stylist's gaps.</p>`;
  }
}
function textPanel(a: Appt) {
  if (!a.consent) return `<div class="a-form"><p class="a-note bad">No text consent for ${esc(first(a.name))}. PRISM will not text. Call ${esc(a.phone)}.</p></div>`;
  return `<div class="a-form"><label class="field">Message to ${esc(first(a.name))}<textarea class="textarea" id="txt-body">Hi ${esc(first(a.name))}, a quick note about your ${esc(svc(a.service).name.toLowerCase())} on ${dayLabel(a.day)} at ${fmtMin(a.start)}. See you then! Marlow &amp; Finch</textarea></label><p class="a-note ok">Consent on file. Quiet hours (9 pm to 8 am) are not active, so it sends now.</p><button type="button" class="btn btn-sm" data-send-text>Send text</button></div>`;
}
function movePanel(a: Appt) {
  const d = (document.getElementById('mv-date') as HTMLInputElement | null)?.value ? offsetOfIso((document.getElementById('mv-date') as HTMLInputElement).value) : a.day;
  const starts = hoursOn(d) ? startsFor(gapsOf(a.stylist, d, a.id), a.minutes, 15) : [];
  return `<div class="a-form"><label class="field">Day<input class="input" type="date" id="mv-date" value="${isoOf(d)}"></label><label class="field">New start<select class="select" id="mv-time">${starts.length ? starts.map((m) => `<option value="${m}">${fmtMin(m)} to ${fmtMin(m + a.minutes)}</option>`).join('') : '<option value="">No gap long enough</option>'}</select></label><p class="a-note ${starts.length ? '' : 'warn'}">${starts.length ? `${esc(first(sty(a.stylist).name))} is free for the ${fmtDur(a.minutes)} this service takes.` : `${esc(first(sty(a.stylist).name))} has no ${fmtDur(a.minutes)} gap on ${dayLabel(d)}.`}</p><button type="button" class="btn btn-sm" data-do-move ${starts.length ? '' : 'disabled'}>Move and update Phorest</button></div>`;
}
function newPanel() {
  const sv = svc(draft.service); const cands = S.stylists.filter((s) => s.services.includes(sv.id));
  const sid = draft.stylist === 'any' ? '' : draft.stylist;
  const pool = sid ? cands.filter((c) => c.id === sid) : cands;
  const open = hoursOn(draft.date);
  const starts = open ? [...new Set(pool.flatMap((s) => startsFor(gapsOf(s.id, draft.date), sv.minutes, 15)))].sort((a, b) => a - b) : [];
  if (!starts.includes(draft.start)) draft.start = starts[0] ?? 0;
  const pick = pool.find((s) => startsFor(gapsOf(s.id, draft.date), sv.minutes, 15).includes(draft.start));
  const gapTxt = pool.map((s) => { const g = gapsOf(s.id, draft.date); return `<div><span>${esc(first(s.name))}</span><span class="tnum">${g.length ? g.map((x) => `${fmtMin(x.s).replace(':00', '')}-${fmtMin(x.e).replace(':00', '')}`).join(', ') : 'Full'}</span></div>`; }).join('');
  return `<div class="a-head"><h2>New booking</h2>${closeBtn}</div><div class="a-form">
    <label class="field">Guest<input class="input" id="nb-name" value="${esc(draft.name)}" placeholder="Name" autocomplete="off"></label>
    <label class="field">Phone<input class="input" id="nb-phone" value="${esc(draft.phone)}" placeholder="(847) 555-0100" inputmode="tel"></label>
    <label class="field">Service<select class="select" id="nb-svc">${S.services.map((s) => `<option value="${s.id}" ${s.id === draft.service ? 'selected' : ''}>${esc(s.name)} · ${fmtDur(s.minutes)}</option>`).join('')}</select></label>
    <label class="field">Stylist<select class="select" id="nb-sty"><option value="any">Anyone who does it</option>${cands.map((s) => `<option value="${s.id}" ${s.id === draft.stylist ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
    <label class="field">Day<input class="input" type="date" id="nb-date" value="${isoOf(draft.date)}"></label>
    <label class="field">Start<select class="select" id="nb-time">${starts.length ? starts.map((m) => `<option value="${m}" ${m === draft.start ? 'selected' : ''}>${fmtMin(m)}</option>`).join('') : '<option value="">No start fits</option>'}</select></label>
    <p class="a-note ${starts.length ? 'ok' : 'bad'}">${!open ? `Closed ${dayLabel(draft.date, 'long')}.` : starts.length ? `${esc(sv.name)} takes ${fmtDur(sv.minutes)}. ${pick ? esc(first(pick.name)) + ' is free ' + fmtMin(draft.start) + ' to ' + fmtMin(draft.start + sv.minutes) + '.' : ''}` : `${esc(sv.name)} takes ${fmtDur(sv.minutes)} and there is no gap that long ${dayLabel(draft.date)}. Try another day or stylist.`}</p>
    ${sv.consult ? `<p class="a-note warn">${esc(sv.name)} starts with a consult. Tell the guest.</p>` : ''}
    <div><div class="props-title">Gaps on ${dayLabel(draft.date)}</div><div class="a-gaps">${gapTxt}</div></div>
    <button type="button" class="btn btn-dash" data-create ${starts.length && draft.name.trim() ? '' : 'disabled'}>Confirm and add to Phorest</button>
    ${draft.name.trim() ? '' : '<p class="a-note">Add the guest\'s name to continue.</p>'}</div>`;
}
function renderSchedule() { renderBar(); renderGrid(); renderAgenda(); renderAside(); }
function openAside() { aside.classList.add('open'); }
function closeAside() { aside.classList.remove('open'); sel = null; mode = 'day'; subpanel = ''; renderSchedule(); }
function select(id: string) { sel = id; mode = 'appt'; subpanel = ''; renderSchedule(); openAside(); }
function startNew(over: Partial<typeof draft> = {}) { draft = { ...draft, date: day, ...over }; sel = null; mode = 'new'; renderSchedule(); openAside(); if (matchMedia('(min-width: 961px)').matches) $('#nb-name')?.focus(); }
function setDay(d: number) { day = Math.max(-14, Math.min(55, d)); sel = null; mode = 'day'; subpanel = ''; renderSchedule(); }

const panel = $('[data-panel-id="schedule"]')!;
panel.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const dd = t.closest<HTMLElement>('[data-day]'); if (dd) { setDay(+dd.dataset.day!); return; }
  const st = t.closest<HTMLElement>('[data-day-step]'); if (st) { setDay(day + +st.dataset.dayStep!); return; }
  const f = t.closest<HTMLElement>('[data-f]'); if (f) { filter = f.dataset.f!; renderSchedule(); return; }
  if (t.closest('#new-booking')) { startNew(); return; }
  const ap = t.closest<HTMLElement>('[data-appt]'); if (ap) { select(ap.dataset.appt!); return; }
  const fr = t.closest<HTMLElement>('[data-free]'); if (fr) { const [s, m] = fr.dataset.free!.split('|'); startNew({ stylist: s, start: +m }); return; }
  if (t.closest('[data-close-aside]')) { closeAside(); return; }
  const sub = t.closest<HTMLElement>('[data-sub]'); if (sub) { subpanel = subpanel === sub.dataset.sub ? '' : (sub.dataset.sub as 'text' | 'move'); renderAside(); return; }
  const a = sel ? appts.find((x) => x.id === sel) : undefined;
  if (t.closest('[data-send-text]') && a) { toast(`Text sent to ${a.name} at ${a.phone}. Logged in the audit log.`); subpanel = ''; renderAside(); return; }
  if (t.closest('[data-noshow]') && a) { const prev = a.status; a.status = 'no_show'; renderSchedule(); toast(`Marked ${a.name} as a no-show. Add to No-shows to rebook.`, () => { a.status = prev; renderSchedule(); }); return; }
  if (t.closest('[data-do-move]') && a) {
    const nd = offsetOfIso((document.getElementById('mv-date') as HTMLInputElement).value); const nm = +(document.getElementById('mv-time') as HTMLSelectElement).value; const old = { day: a.day, start: a.start };
    a.day = nd; a.start = nm; day = nd; subpanel = ''; renderSchedule();
    toast(`Moved ${a.name} to ${dayLabel(nd)} ${fmtMin(nm)}. Phorest updated.`, () => { a.day = old.day; a.start = old.start; day = old.day; renderSchedule(); }); return;
  }
  if (t.closest('[data-create]')) {
    const sv = svc(draft.service); const pool = S.stylists.filter((s) => s.services.includes(sv.id) && (draft.stylist === 'any' || s.id === draft.stylist));
    const who = pool.find((s) => startsFor(gapsOf(s.id, draft.date), sv.minutes, 15).includes(draft.start)); if (!who) return;
    const id = `new-${appts.length}-${draft.start}`;
    appts.push({ id, name: draft.name.trim(), phone: draft.phone, consent: true, stylist: who.id, service: sv.id, day: draft.date, start: draft.start, minutes: sv.minutes, value: sv.price, status: 'booked', by: 'team', bookedAgo: 'just now' });
    day = draft.date; const nm = draft.name; draft.name = ''; draft.phone = ''; sel = id; mode = 'appt'; renderSchedule();
    toast(`Booked ${nm}, ${dayLabel(day)} ${fmtMin(draft.start)} with ${first(who.name)}. Written to Phorest.`, () => { appts = appts.filter((x) => x.id !== id); closeAside(); });
  }
});
panel.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement; let re = true;
  if (t.id === 'sch-date') { if (t.value) setDay(offsetOfIso(t.value)); return; }
  if (t.id === 'nb-name') { draft.name = t.value; const had = !!draft.name.trim(); (aside.querySelector('[data-create]') as HTMLButtonElement | null)?.toggleAttribute('disabled', !had); re = false; }
  else if (t.id === 'nb-phone') { draft.phone = t.value; re = false; }
  else if (t.id === 'nb-svc') { draft.service = t.value; if (draft.stylist !== 'any' && !sty(draft.stylist).services.includes(t.value)) draft.stylist = 'any'; }
  else if (t.id === 'nb-sty') draft.stylist = t.value;
  else if (t.id === 'nb-date') { if (t.value) draft.date = offsetOfIso(t.value); }
  else if (t.id === 'nb-time') draft.start = +t.value;
  else if (t.id === 'mv-date') { renderAside(); return; }
  else re = false;
  if (re) { const keep = document.activeElement?.id; renderAside(); if (keep) document.getElementById(keep)?.focus(); }
});
document.addEventListener('keydown', (e) => {
  if (panel.hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  const el = document.activeElement as HTMLElement | null; if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) { if (e.key === 'Escape') closeAside(); return; }
  if (e.key === 'ArrowLeft') setDay(day - 1); else if (e.key === 'ArrowRight') setDay(day + 1);
  else if (e.key.toLowerCase() === 't') setDay(0); else if (e.key.toLowerCase() === 'n') { e.preventDefault(); startNew(); } else if (e.key === 'Escape') closeAside();
});
// Upcoming rows open that appointment in the schedule
document.addEventListener('click', (e) => {
  const r = (e.target as HTMLElement).closest<HTMLElement>('[data-goto-appt]'); if (!r) return;
  day = +r.dataset.gotoDay!; $<HTMLElement>('[data-panel="schedule"]')?.click(); select(r.dataset.gotoAppt!);
});
document.addEventListener('keydown', (e) => { const r = (e.target as HTMLElement).closest<HTMLElement>?.('[data-goto-appt]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); r.click(); } });
renderSchedule();
export {};

document.addEventListener('click', (e) => { const t = (e.target as HTMLElement).closest('[role="tab"]'); if (t) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });
