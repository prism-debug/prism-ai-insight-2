// The one metrics module. Every page reads from here; nothing computes a figure on its own.
// Definitions follow prism-ai/brain/06-metrics-and-data.md. Prototype notes are marked NOTE.
import { NOW, DAY, HOUR, RANGE, PREV, atDay, inRange, type Range } from './clock.ts';
import { LEADS, CLIENTS, APPOINTMENTS, SPEND, THREADS, REQUESTS, lifecycleOf, stageOf } from './seed.ts';
import { RECURRING, SOURCES, CAMPAIGNS, SALON, source } from './salon.ts';
import type { Lead } from './types.ts';

const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const spendT = (d: number) => atDay(d, 12);

export const cohort = (r: Range): Lead[] => LEADS.filter((l) => inRange(l.firstTouchAt, r));
export const apptsOf = (l: Lead) => APPOINTMENTS.filter((a) => a.leadId === l.id);

export function adSpend(r: Range) { return sum(SPEND.filter((s) => inRange(spendT(s.day), r)).map((s) => s.amount)); }
export function marketingSpend(r: Range) { const days = (r.end - r.start) / DAY; return adSpend(r) + sum(RECURRING.map((x) => (x.monthly / 30.4) * days)); }

export function metrics(r: Range = RANGE) {
  const leads = cohort(r);
  const booked = leads.filter((l) => l.status === 'booked');
  const spend = adSpend(r);
  // NOTE: kit counts checked-out revenue only. The prototype counts the value of appointments booked by this
  // cohort (completed or upcoming) so recent leads are not undercounted. Tooltip says so.
  const bookedValue = sum(booked.flatMap((l) => apptsOf(l).filter((a) => a.status !== 'no_show').map((a) => a.value)));
  // Return on ads counts only bookings from paid ad sources (Meta, Google), so it matches the per-channel table.
  const adValue = sum(booked.filter((l) => source(l.sourceId).type === 'ads').flatMap((l) => apptsOf(l).filter((a) => a.status !== 'no_show').map((a) => a.value)));
  const revenueTotal = sum(APPOINTMENTS.filter((a) => a.status === 'checked_out' && inRange(a.start, r)).map((a) => a.value));
  const joyFirst = leads.filter((l) => l.firstReplyBy === 'joy').map((l) => l.firstReplyMs!);
  const teamFirst = leads.filter((l) => l.firstReplyBy === 'team').map((l) => l.firstReplyMs!);
  const statusCount = (s: Lead['status']) => leads.filter((l) => l.status === s).length;
  const lifecycle = { active: 0, at_risk: 0, lapsed: 0 } as Record<'active' | 'at_risk' | 'lapsed', number>;
  for (const c of CLIENTS) { const k = lifecycleOf(c, r.end); if (k !== 'prospect') lifecycle[k]++; }
  const withVisits = CLIENTS.filter((c) => c.visits.length);
  const avgTicket = sum(withVisits.map((c) => c.avgTicket)) / Math.max(1, withVisits.length);
  // return within 90 days (kit: cohort seen 90-180 days before range end)
  const win = CLIENTS.map((c) => c.visits.find((v) => v.t >= r.end - 180 * DAY && v.t < r.end - 90 * DAY)).filter(Boolean) as { t: number }[];
  const cl = CLIENTS.filter((c) => c.visits.some((v) => v.t >= r.end - 180 * DAY && v.t < r.end - 90 * DAY));
  const returned = cl.filter((c) => { const v = c.visits.filter((x) => x.t >= r.end - 180 * DAY && x.t < r.end - 90 * DAY).sort((a, b) => b.t - a.t)[0]; return c.visits.some((x) => x.t > v.t && x.t <= v.t + 90 * DAY); }).length;
  const return90 = cl.length ? returned / cl.length : 0;
  const openingLeads = leads.filter((l) => !['booked', 'went_quiet'].includes(l.status)).length;
  const m = {
    range: r, leadsNew: leads.length, booked: booked.length, bookingRate: leads.length ? booked.length / leads.length : 0,
    notAnswered: statusCount('not_answered'), joyHandling: statusCount('joy_handling'), needsPerson: statusCount('needs_person'), wentQuiet: statusCount('went_quiet'), openLeads: openingLeads,
    adSpend: spend, marketingSpend: marketingSpend(r), bookedValue, adValue, keptAfterAds: adValue - spend, returnPerAd: spend ? adValue / spend : 0,
    costPerLead: leads.length ? spend / leads.length : 0, costPerNewClient: booked.length ? spend / booked.length : 0,
    revenueTotal, avgTicket, firstReplyJoy: median(joyFirst), firstReplyTeam: median(teamFirst),
    lifecycle, clients: CLIENTS.length, return90, afterHours: leads.filter((l) => l.afterHours).length,
    joyCovered: leads.filter((l) => l.firstReplyBy === 'joy').length,
  };
  return m;
}
export type Metrics = ReturnType<typeof metrics>;
export const CUR = metrics(RANGE);
export const PRV = metrics(PREV);

// what the not-answered pile is worth, and who is at risk
export const notAnsweredLeads = () => LEADS.filter((l) => l.status === 'not_answered').sort((a, b) => a.lastInboundAt - b.lastInboundAt);
export const notAnsweredValue = () => sum(notAnsweredLeads().map((l) => l.likelyValue));
export const winBackPool = () => CLIENTS.filter((c) => ['at_risk', 'lapsed'].includes(lifecycleOf(c)) && c.consentSms && c.consentMarketing);
export const revenueAtRisk = () => sum(CLIENTS.filter((c) => lifecycleOf(c) === 'at_risk').map((c) => c.avgTicket));
export const revenueLapsed = () => sum(CLIENTS.filter((c) => lifecycleOf(c) === 'lapsed').map((c) => c.avgTicket));

// health score (proposal): weights from brain/06; each 0..100 linear between bounds
const lin = (v: number, lo: number, hi: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
export function health(m: Metrics) {
  const reply = ((m.firstReplyJoy ?? 0) * m.joyCovered + (m.firstReplyTeam ?? 0) * (m.leadsNew - m.joyCovered - m.notAnswered)) / Math.max(1, m.leadsNew - m.notAnswered);
  const speed = 100 - lin(Math.log10(Math.max(1, reply / 60000)), Math.log10(5), Math.log10(24 * 60)) - (m.notAnswered / Math.max(1, m.leadsNew)) * 60;
  const parts = [
    { key: 'speed', label: 'Reply speed', weight: 25, score: Math.round(Math.max(0, Math.min(100, speed))), why: `${m.notAnswered} leads waiting for a first reply` },
    { key: 'booking', label: 'Lead booking', weight: 25, score: Math.round(lin(m.bookingRate, 0.02, 0.3)), why: `${(m.bookingRate * 100).toFixed(1)}% of leads booked` },
    { key: 'return', label: 'Ad payback', weight: 20, score: Math.round(lin(m.returnPerAd, 1, 5)), why: `$${m.returnPerAd.toFixed(2)} back per $1 on ads` },
    { key: 'retention', label: 'Retention', weight: 20, score: Math.round(lin(m.return90, 0.2, 0.6)), why: `${Math.round(m.return90 * 100)}% back within 90 days` },
    { key: 'calls', label: 'Calls', weight: 10, score: 62, why: 'Missed-call follow-up is partly set up' },
  ];
  const total = Math.round(sum(parts.map((p) => (p.score * p.weight) / 100)));
  return { total, parts };
}
export const HEALTH = health(CUR); export const HEALTH_PREV = health(PRV);

// series for charts: one point per day, oldest first
export function dailySeries(days = 30, end = 0) {
  return Array.from({ length: days }, (_, i) => {
    const d = end - (days - 1 - i); const t0 = atDay(d), t1 = atDay(d + 1);
    return {
      day: d, t: t0,
      leads: LEADS.filter((l) => l.firstTouchAt >= t0 && l.firstTouchAt < t1).length,
      spend: sum(SPEND.filter((s) => s.day === d).map((s) => s.amount)),
      revenue: sum(APPOINTMENTS.filter((a) => a.status === 'checked_out' && a.start >= t0 && a.start < t1).map((a) => a.value)),
    };
  });
}

// per-source and per-campaign performance (cohort = current range)
export function bySource(r: Range = RANGE) {
  return SOURCES.map((s) => {
    const leads = cohort(r).filter((l) => l.sourceId === s.id); const booked = leads.filter((l) => l.status === 'booked');
    const value = sum(booked.flatMap((l) => apptsOf(l).map((a) => a.value)));
    const spend = sum(SPEND.filter((x) => x.sourceId === s.id && inRange(spendT(x.day), r)).map((x) => x.amount)) + sum(RECURRING.filter((x) => 'sourceId' in x && x.sourceId === s.id).map((x) => (x.monthly / 30.4) * ((r.end - r.start) / DAY)));
    return { source: s, leads: leads.length, booked: booked.length, value, spend, back: spend ? value / spend : null, rate: leads.length ? booked.length / leads.length : 0 };
  });
}
export function byCampaign(r: Range = RANGE) {
  return CAMPAIGNS.map((c) => {
    const leads = cohort(r).filter((l) => l.campaignId === c.id); const booked = leads.filter((l) => l.status === 'booked');
    const value = sum(booked.flatMap((l) => apptsOf(l).map((a) => a.value)));
    const spend = sum(SPEND.filter((x) => x.campaignId === c.id && inRange(spendT(x.day), r)).map((x) => x.amount));
    return { campaign: c, leads: leads.length, booked: booked.length, value, spend, back: spend ? value / spend : null, cpl: leads.length ? spend / leads.length : null };
  });
}

export const NAV_COUNTS = {
  leads: CUR.notAnswered + CUR.needsPerson, inbox: THREADS.filter((t) => t.unread).length,
  retention: CUR.lifecycle.at_risk, bookings: REQUESTS.filter((r) => r.status === 'pending').length,
};
export { stageOf, lifecycleOf };
