// Retention data. Everything derives from the client list in seed.ts; the past win-backs are synthetic.
import { CLIENTS, lifecycleOf, stageOf } from './seed.ts';
import { NOW, DAY } from './clock.ts';
import { SERVICES, STYLISTS, SOURCES, service, stylist, source } from './salon.ts';
import { CUR } from './metrics.ts';
import type { Client } from './types.ts';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// ---- lifecycle: counts and the dollars of next-visit value (usual spend) in each group
export const LIFE = (['active', 'at_risk', 'lapsed'] as const).map((k) => {
  const list = CLIENTS.filter((c) => lifecycleOf(c) === k);
  return { key: k, label: k === 'active' ? 'Active' : k === 'at_risk' ? 'At risk' : 'Lapsed', n: list.length, value: sum(list.map((c) => c.avgTicket)),
    rule: k === 'active' ? 'Visited in the last 60 days' : k === 'at_risk' ? 'Last visit 61 to 120 days ago' : 'Last visit over 120 days ago' };
});
export const LIFE_TOTAL = sum(LIFE.map((l) => l.n));

// ---- win-back list
export const canText = (c: Client) => c.consentSms && c.consentMarketing;
export const noTextReason = (c: Client) => (!c.consentSms ? 'No text consent' : 'No promo consent');
export const WINBACK = CLIENTS.filter((c) => ['at_risk', 'lapsed'].includes(lifecycleOf(c)))
  .sort((a, b) => b.avgTicket - a.avgTicket || b.lastVisitAt - a.lastVisitAt)
  .map((c) => ({ c, life: lifecycleOf(c) as 'at_risk' | 'lapsed', ok: canText(c), days: Math.round((NOW - c.lastVisitAt) / DAY), svc: service(c.visits[0]?.serviceId ?? c.preferredServiceId), sty: stylist(c.stylistId) }));
export const WB_OK = WINBACK.filter((w) => w.ok);
export const WB_SKIP = WINBACK.filter((w) => !w.ok);
export const WB_OK_VALUE = sum(WB_OK.map((w) => w.c.avgTicket));
export const WB_TOTAL_VALUE = sum(WINBACK.map((w) => w.c.avgTicket));
export const TEMPLATE = 'Hi {first_name}, it is {stylist} at {salon}. It has been a while since your {last_service}. I can fit you in this week if you would like a spot: {booking_link}';
export const MERGE = [
  { key: 'first_name', label: 'First name' }, { key: 'stylist', label: 'Stylist' }, { key: 'last_service', label: 'Last service' },
  { key: 'salon', label: 'Salon' }, { key: 'booking_link', label: 'Booking link' },
];

// ---- stage funnel (clients with at least one visit). "Moves up" = share of those who reached this stage that reached the next.
const STAGES = ['New', 'Returning', 'Regular', 'Loyal', 'VIP'] as const;
const seen = CLIENTS.filter((c) => c.visits.length > 0);
const atStage = STAGES.map((s) => seen.filter((c) => stageOf(c) === s).length);
export const FUNNEL = STAGES.map((s, i) => {
  const reached = sum(atStage.slice(i)); const next = sum(atStage.slice(i + 1));
  return { stage: s, here: atStage[i], reached, up: i < STAGES.length - 1 && reached ? next / reached : null,
    rule: s === 'New' ? '1 visit' : s === 'Returning' ? '2 visits' : s === 'Regular' ? '3 to 5 visits' : s === 'Loyal' ? '6 to 11 visits' : '12 or more visits' };
});

// ---- back in 90 days: same definition as metrics.ts, split by stylist and by first source
function back90(pred: (c: Client) => boolean) {
  const end = NOW;
  const cl = CLIENTS.filter((c) => pred(c) && c.visits.some((v) => v.t >= end - 180 * DAY && v.t < end - 90 * DAY));
  const returned = cl.filter((c) => { const v = c.visits.filter((x) => x.t >= end - 180 * DAY && x.t < end - 90 * DAY).sort((a, b) => b.t - a.t)[0]; return c.visits.some((x) => x.t > v.t && x.t <= v.t + 90 * DAY); }).length;
  return { n: cl.length, back: returned, rate: cl.length ? returned / cl.length : null };
}
export const BACK_ALL = back90(() => true);
export const BACK_BY_STYLIST = STYLISTS.map((s) => ({ name: s.name, id: s.id, ...back90((c) => c.stylistId === s.id) }));
export const BACK_BY_SOURCE = SOURCES.map((s) => ({ name: s.name, id: s.id, ...back90((c) => c.sourceId === s.id) })).filter((r) => r.n > 0);

// ---- rebook due: active clients with nothing booked who are past the usual interval for their last service
export const REBOOK = CLIENTS.filter((c) => lifecycleOf(c) === 'active' && !c.nextApptAt && c.visits.length)
  .map((c) => { const svc = service(c.visits[0].serviceId); const dueAt = c.lastVisitAt + svc.rebookDays * DAY; return { c, svc, over: Math.round((NOW - dueAt) / DAY), ok: canText(c), sty: stylist(c.stylistId) }; })
  .filter((r) => r.over > 0)
  .sort((a, b) => b.over - a.over || b.c.avgTicket - a.c.avgTicket);

// ---- past win-backs (synthetic, internally consistent: dollars = rebooked x the audience's usual spend)
export const PAST = [
  { name: 'Overdue colour clients', when: '14 Sep', sent: 96, replied: 23, rebooked: 11, optedOut: 2, ticket: 214 },
  { name: 'Lapsed over 4 months', when: '20 Aug', sent: 71, replied: 14, rebooked: 6, optedOut: 3, ticket: 168 },
  { name: 'Summer gloss reminder', when: '2 Jul', sent: 58, replied: 17, rebooked: 9, optedOut: 1, ticket: 92 },
].map((p) => ({ ...p, value: p.rebooked * p.ticket }));

// ---- headline
export const AT_RISK = LIFE[1]; export const LAPSED = LIFE[2];
export const HEADLINE = `${'$' + (AT_RISK.value + LAPSED.value).toLocaleString('en-US')} of next visits sit with ${AT_RISK.n + LAPSED.n} overdue clients, and ${WB_OK.length} of them said yes to texts.`;
export { CUR, source };

// rebook due: how many can be texted, and why the rest cannot
export const REBOOK_OK = REBOOK.filter((r) => r.ok);
export const REBOOK_NO_PROMO = REBOOK.filter((r) => !r.ok && r.c.consentSms).length;
export const REBOOK_NO_TEXT = REBOOK.filter((r) => !r.c.consentSms).length;
export const LIFE_OVERDUE_VALUE = AT_RISK.value + LAPSED.value;
export const REBOOK_VALUE = sum(REBOOK.map((r) => r.c.avgTicket));
