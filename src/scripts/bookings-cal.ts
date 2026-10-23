// Bookings: List, Week and Month views of upcoming appointments. Same data as the schedule; click an appointment to open it there.
import { fmtMin, fmtDur, isoOf } from '../data/bookings-core.ts';

type Appt = { id: string; name: string; stylist: string; service: string; day: number; start: number; minutes: number; value: number; status: string; by: string };
const raw = JSON.parse(document.getElementById('bk-data')!.textContent || '{}');
const S = raw.schedule as { nowMin: number; stylists: { id: string; name: string }[]; services: { id: string; name: string }[]; appts: Appt[]; hours: Record<string, [number, number] | null> };
const BASE = Date.UTC(2026, 9, 10); // Sat 10 Oct 2026 is day 0
const DAY = 86400000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const sty = (id: string) => S.stylists.find((s) => s.id === id)?.name ?? id;
const svc = (id: string) => S.services.find((s) => s.id === id)?.name ?? id;
const dateOf = (off: number) => new Date(BASE + off * DAY);
const offOf = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m, d) - BASE) / DAY);
const first = (n: string) => n.split(' ')[0];
const short = (n: string) => { const p = n.split(' '); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };
const clock = (m: number) => fmtMin(m).replace(':00', '');
const hoursOn = (d: number) => S.hours[String(d)] ?? null;
const STATUS: Record<string, [string, string]> = { booked: ['Booked', 'up'], confirmed: ['Confirmed', 'up'], in_progress: ['In the chair', 'live'], checked_out: ['Done', 'done'], no_show: ['No-show', 'miss'] };
const mobile = () => window.matchMedia('(max-width: 700px)').matches;

const byDay = new Map<number, Appt[]>();
for (const a of S.appts) { (byDay.get(a.day) ?? byDay.set(a.day, []).get(a.day)!).push(a); }
for (const l of byDay.values()) l.sort((a, b) => a.start - b.start);

const root = document.getElementById('up-cal')!;
const listEl = document.getElementById('up-list')!;
const nav = document.getElementById('cal-nav')!;
const label = document.getElementById('cal-label')!;
let view: 'list' | 'week' | 'month' = 'list';
try { const v = localStorage.getItem('bk-upview'); if (v === 'week' || v === 'month') view = v; } catch { /* storage unavailable */ }
if (view === 'week' && mobile()) view = 'month';
let anchor = 0; // any day offset inside the period being shown

const tipOf = (a: Appt) => `${a.name}|Service~${svc(a.service)}|Time~${clock(a.start)} to ${clock(a.start + a.minutes)} (${fmtDur(a.minutes)})|Stylist~${sty(a.stylist)}|Value~$${Math.round(a.value)}|Status~${STATUS[a.status]?.[0] ?? a.status}|${a.by === 'joy' ? 'Booked by Joy' : a.by === 'team' ? 'Booked by the team' : 'Booked online'}`;
const goDay = (d: number) => {
  (document.querySelector('[data-panel="schedule"]') as HTMLElement | null)?.click();
  const dt = document.getElementById('sch-date') as HTMLInputElement | null; if (dt) { dt.value = isoOf(d); dt.dispatchEvent(new Event('change', { bubbles: true })); }
};

function month() {
  const d = dateOf(anchor); const y = d.getUTCFullYear(), m = d.getUTCMonth();
  label.textContent = `${MONTHS[m]} ${y}`;
  const firstWd = new Date(Date.UTC(y, m, 1)).getUTCDay(); const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const rows = Math.ceil((firstWd + dim) / 7); const start = offOf(y, m, 1) - firstWd;
  let h = `<div class="cal-m" role="grid" aria-label="${MONTHS[m]} ${y}"><div class="cal-wd" role="row">${WEEKDAYS.map((w) => `<span role="columnheader">${w}</span>`).join('')}</div><div class="cal-grid" style="--rows:${rows}">`;
  for (let i = 0; i < rows * 7; i++) {
    const off = start + i; const dd = dateOf(off); const inM = dd.getUTCMonth() === m; const list = byDay.get(off) ?? []; const closed = !hoursOn(off);
    const live = list.filter((a) => a.status !== 'no_show');
    const shown = mobile() ? [] : list.slice(0, 3);
    h += `<div class="cal-day${inM ? '' : ' out'}${off === 0 ? ' today' : ''}${closed ? ' closed' : ''}" role="gridcell" data-day="${off}">`
      + `<button type="button" class="cal-n" data-day-go="${off}" aria-label="${dd.getUTCDate()} ${MONTHS[dd.getUTCMonth()]}${list.length ? `, ${list.length} appointments` : ''}">${dd.getUTCDate()}</button>`
      + (closed && inM && !list.length ? '<span class="cal-closed">Closed</span>' : '')
      + (mobile() && live.length ? `<span class="cal-count" data-day-go="${off}">${live.length}</span>` : '')
      + shown.map((a) => `<button type="button" class="cal-chip ${STATUS[a.status]?.[1] ?? 'up'}" data-goto-appt="${a.id}" data-goto-day="${a.day}" data-tip="${esc(tipOf(a))}"><b>${clock(a.start)}</b> ${esc(short(a.name))}</button>`).join('')
      + (!mobile() && list.length > 3 ? `<button type="button" class="cal-more" data-day-go="${off}">+${list.length - 3} more</button>` : '')
      + `</div>`;
  }
  root.innerHTML = h + '</div></div>';
}

function week() {
  const wd = dateOf(anchor).getUTCDay(); const start = anchor - wd;
  const a0 = dateOf(start), a1 = dateOf(start + 6);
  label.textContent = a0.getUTCMonth() === a1.getUTCMonth() ? `${MONTHS[a0.getUTCMonth()].slice(0, 3)} ${a0.getUTCDate()} to ${a1.getUTCDate()}, ${a1.getUTCFullYear()}` : `${MONTHS[a0.getUTCMonth()].slice(0, 3)} ${a0.getUTCDate()} to ${MONTHS[a1.getUTCMonth()].slice(0, 3)} ${a1.getUTCDate()}, ${a1.getUTCFullYear()}`;
  const T0 = 8 * 60, T1 = 20 * 60, ROW = 52;
  let h = `<div class="cal-w" style="--row:${ROW}px;--hrs:${(T1 - T0) / 60}"><div class="cal-wh"><span></span>${Array.from({ length: 7 }, (_, i) => { const dd = dateOf(start + i); return `<button type="button" class="cal-wd2${start + i === 0 ? ' today' : ''}" data-day-go="${start + i}"><small>${WEEKDAYS[dd.getUTCDay()]}</small><b>${dd.getUTCDate()}</b></button>`; }).join('')}</div>`;
  h += `<div class="cal-wb"><div class="cal-hours">${Array.from({ length: (T1 - T0) / 60 }, (_, i) => `<span style="top:${i * ROW}px">${clock(T0 + i * 60)}</span>`).join('')}</div>`;
  for (let i = 0; i < 7; i++) {
    const off = start + i; const hrs = hoursOn(off); const list = (byDay.get(off) ?? []).filter((a) => a.start < T1 && a.start + a.minutes > T0);
    const lanes: number[] = []; const laneOf = new Map<string, number>();
    for (const a of list) { let l = lanes.findIndex((e) => e <= a.start); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = a.start + a.minutes; laneOf.set(a.id, l); }
    const n = Math.max(1, lanes.length);
    h += `<div class="cal-col${hrs ? '' : ' closed'}${off === 0 ? ' today' : ''}">`;
    if (hrs) { if (hrs[0] > T0) h += `<i class="cal-off" style="top:0;height:${((hrs[0] - T0) / 60) * ROW}px"></i>`; if (hrs[1] < T1) h += `<i class="cal-off" style="top:${((hrs[1] - T0) / 60) * ROW}px;height:${((T1 - hrs[1]) / 60) * ROW}px"></i>`; } else if (!list.length) h += '<span class="cal-closed">Closed</span>';
    for (const a of list) {
      const top = ((Math.max(a.start, T0) - T0) / 60) * ROW; const ht = Math.max(24, (Math.min(a.start + a.minutes, T1) - Math.max(a.start, T0)) / 60 * ROW - 2); const l = laneOf.get(a.id)!;
      h += `<button type="button" class="cal-ev ${STATUS[a.status]?.[1] ?? 'up'}" style="top:${top}px;height:${ht}px;left:calc(${(l / n) * 100}% + 2px);width:calc(${100 / n}% - 4px)" data-goto-appt="${a.id}" data-goto-day="${a.day}" data-tip="${esc(tipOf(a))}"><b>${esc(first(a.name))}</b>${ht > 38 ? `<span>${esc(svc(a.service))}</span>` : ''}${ht > 52 ? `<small>${clock(a.start)}</small>` : ''}</button>`;
    }
    if (off === 0 && S.nowMin >= T0 && S.nowMin <= T1) h += `<i class="cal-now" style="top:${((S.nowMin - T0) / 60) * ROW}px"></i>`;
    h += '</div>';
  }
  root.innerHTML = h + '</div></div>';
}

function render() {
  document.querySelectorAll<HTMLElement>('[data-upview]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.upview === view)));
  const cal = view !== 'list'; listEl.hidden = cal; root.hidden = !cal; nav.hidden = !cal;
  if (view === 'month') month(); else if (view === 'week') week();
}
const step = (n: number) => { if (view === 'week') anchor += n * 7; else { const d = dateOf(anchor); anchor = offOf(d.getUTCFullYear(), d.getUTCMonth() + n, 1); } render(); };

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const v = t.closest<HTMLElement>('[data-upview]'); if (v) { view = v.dataset.upview as typeof view; if (view !== 'list') { try { localStorage.setItem('bk-upview', view); } catch { /* ignore */ } } render(); return; }
  if (t.closest('[data-cal-step]')) { step(+t.closest<HTMLElement>('[data-cal-step]')!.dataset.calStep!); return; }
  if (t.closest('[data-cal-today]')) { anchor = 0; render(); return; }
  const g = t.closest<HTMLElement>('[data-day-go]'); if (g && root.contains(g)) goDay(+g.dataset.dayGo!);
});
window.matchMedia('(max-width: 700px)').addEventListener('change', () => { if (mobile() && view === 'week') view = 'month'; if (view !== 'list') render(); });
// a calendar opened from the Upcoming tab should render once that panel is visible
document.querySelector('[data-panel="upcoming"]')?.addEventListener('click', () => render());
render();
