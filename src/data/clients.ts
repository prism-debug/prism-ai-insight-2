// Client CRM view-model: derived rows, smart lists, cadence and the Dash "at risk" note.
import { CLIENTS, APPOINTMENTS, lifecycleOf, stageOf } from './seed.ts';
import { NOW, DAY } from './clock.ts';
import { service, stylist, source } from './salon.ts';
import { first } from '../lib/format.ts';
import type { Client } from './types.ts';

export const STAGES = ['New', 'Returning', 'Regular', 'Loyal', 'VIP'] as const;
export type StageName = (typeof STAGES)[number];

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NOTES = [
  'Prefers a quiet chair at the back. Likes to book the same weekday.',
  'Allergic to ammonia-based colour. Patch test done, patch note on file.',
  'Brings her daughter for cuts. Likes to be texted, not called.',
  'Fine hair, tends to over-tone. Keep gloss to the lighter shade.',
  'Moving house in the spring; may need to rebook further out.',
  'Sensitive scalp. Use the gentle shampoo and a cool dryer setting.',
  'Always early. Likes a cup of tea on arrival.',
  'Planning a colour change for a wedding in the new year.',
];

export interface CRow {
  c: Client; id: string; name: string; lifecycle: 'active' | 'at_risk' | 'lapsed' | 'prospect'; stage: StageName;
  last: number; next?: number; avg: number; spend: number; stylist: string; stylistId: string; svc: string; svcId: string; src: string; srcId: string;
  consent: boolean; promo: boolean; rebookDue: number; overdueDays: number; cadenceDays: number; overdueCadence: number;
}

const nextBy = new Map<string, number>();
for (const a of APPOINTMENTS) {
  if (!a.clientId || a.start < NOW || !['booked', 'confirmed', 'in_progress'].includes(a.status)) continue;
  const p = nextBy.get(a.clientId); if (p === undefined || a.start < p) nextBy.set(a.clientId, a.start);
}

export function cadenceDays(c: Client): number {
  const v = c.visits;
  if (v.length >= 2) return Math.max(14, Math.round((v[0].t - v[v.length - 1].t) / DAY / (v.length - 1)));
  return service(c.preferredServiceId).rebookDays;
}

export const ROWS: CRow[] = CLIENTS.map((c) => {
  const next = nextBy.get(c.id);
  const svc = service(c.preferredServiceId);
  const rebookDue = c.lastVisitAt ? c.lastVisitAt + svc.rebookDays * DAY : 0;
  const cad = cadenceDays(c);
  return {
    c, id: c.id, name: c.name, lifecycle: lifecycleOf(c), stage: stageOf(c) as StageName, last: c.lastVisitAt, next, avg: c.avgTicket, spend: c.lifetimeSpend,
    stylist: stylist(c.stylistId).name, stylistId: c.stylistId, svc: svc.name, svcId: svc.id, src: source(c.sourceId).name, srcId: c.sourceId,
    consent: c.consentSms, promo: c.consentMarketing, rebookDue,
    overdueDays: c.lastVisitAt && !next ? Math.floor((NOW - rebookDue) / DAY) : -999,
    cadenceDays: cad, overdueCadence: c.lastVisitAt ? Math.round((NOW - (c.lastVisitAt + cad * DAY)) / DAY) : 0,
  };
}).sort((a, b) => b.last - a.last);

export const byId = (id: string) => ROWS.find((r) => r.id === id)!;

export interface SmartList { key: string; label: string; test: (r: CRow) => boolean; hint: string }
export const LISTS: SmartList[] = [
  { key: 'all', label: 'All', test: () => true, hint: 'Everyone in your booking system' },
  { key: 'active', label: 'Active', test: (r) => r.lifecycle === 'active', hint: 'Visited in the last 60 days' },
  { key: 'at_risk', label: 'At risk', test: (r) => r.lifecycle === 'at_risk', hint: 'Last visit 61 to 120 days ago' },
  { key: 'lapsed', label: 'Lapsed', test: (r) => r.lifecycle === 'lapsed', hint: 'Last visit over 120 days ago' },
  { key: 'new', label: 'New', test: (r) => r.stage === 'New', hint: 'One visit or fewer' },
  { key: 'vip', label: 'VIP', test: (r) => r.stage === 'VIP', hint: '12 or more visits' },
  { key: 'overdue', label: 'Overdue, can text', test: (r) => (r.lifecycle === 'at_risk' || r.lifecycle === 'lapsed') && r.consent && r.promo, hint: 'At risk or lapsed (no visit in 60+ days) and agreed to promotional texts. Same group as Retention win-back' },
  { key: 'ext', label: 'Extensions due', test: (r) => r.svcId === 'extensions' && r.overdueDays > -14 && r.lifecycle !== 'prospect' && !r.next, hint: 'Extensions clients due for a reinstall within two weeks or overdue, with nothing booked' },
  { key: 'bridal', label: 'Bridal', test: (r) => r.svcId === 'bridal', hint: 'Booked or enquired about bridal' },
].map((l) => l);
export const LIST_COUNTS: Record<string, number> = Object.fromEntries(LISTS.map((l) => [l.key, ROWS.filter(l.test).length]));
/** Next-visit value of a slipping segment: what one more visit each would be worth at their average ticket. */
export const LC_VALUE = { at_risk: ROWS.filter((r) => r.lifecycle === 'at_risk').reduce((t, r) => t + r.avg, 0), lapsed: ROWS.filter((r) => r.lifecycle === 'lapsed').reduce((t, r) => t + r.avg, 0) };
export const NEXT_BOOKED = ROWS.filter((r) => r.next).length;
export const STYLIST_OPTS = Array.from(new Map(ROWS.map((r) => [r.stylistId, r.stylist])));
export const SERVICE_OPTS = Array.from(new Map(ROWS.map((r) => [r.svcId, r.svc])));
export const SOURCE_OPTS = Array.from(new Map(ROWS.map((r) => [r.srcId, r.src])));

export const notesOf = (c: Client) => c.notes ?? NOTES[hash(c.id) % NOTES.length];
export const birthdayOf = (c: Client) => c.birthday ?? (hash(c.id + 'b') % 100 < 58 ? `${MONTHS[hash(c.id + 'm') % 12]} ${1 + (hash(c.id + 'd') % 28)}` : undefined);

const wk = (days: number) => { const w = Math.round(days / 7); return w <= 1 ? '1 week' : `${w} weeks`; };
/** Dash's note on a client who is slipping away, computed from the visit history. */
export function dashNote(r: CRow): { text: string; why: string } | null {
  if (r.lifecycle !== 'at_risk' && r.lifecycle !== 'lapsed') return null;
  const since = Math.round((NOW - r.last) / DAY);
  const usually = r.c.visits.length >= 2 ? `Usually returns every ${wk(r.cadenceDays)}` : `Most ${r.svc.toLowerCase()} clients rebook every ${wk(r.cadenceDays)}`;
  const over = r.overdueCadence >= 7 ? `overdue by ${wk(r.overdueCadence)}` : `last seen ${wk(since)} ago`;
  const ok = r.consent && r.promo;
  const why = r.next ? 'A visit is already booked.' : ok ? `${first(r.name)} agreed to promotional texts, so a win-back text can go out now.` : r.consent ? `${first(r.name)} has not agreed to promotional texts. A personal reply is fine; a campaign text is not.` : `${first(r.name)} has not agreed to texts. Call or email instead.`;
  return { text: `${usually}; ${over}.`, why };
}
