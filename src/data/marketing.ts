// Marketing data: weekly series, agency report, campaign notes, spend log, budget, attribution status, calendar.
// Figures come from metrics.ts and seed.ts. Attribution status, manual spend and calendar entries are synthetic.
import { LEADS, SPEND } from './seed.ts';
import { CUR, apptsOf, byCampaign, cohort } from './metrics.ts';
import { NOW, DAY, RANGE, atDay, dow, inRange } from './clock.ts';
import { CAMPAIGNS, RECURRING, SOURCES, source, campaign } from './salon.ts';
import { money, times, pct0, dateShort } from '../lib/format.ts';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// ---- spend vs booked value, by week (8 weeks ending today). Counted in the week the guest first asked.
export const WEEKLY = Array.from({ length: 8 }, (_, k) => {
  const d0 = -55 + 7 * k, d1 = d0 + 6;
  const spend = sum(SPEND.filter((s) => s.day >= d0 && s.day <= d1).map((s) => s.amount));
  const leads = LEADS.filter((l) => l.firstTouchAt >= atDay(d0) && l.firstTouchAt < atDay(d1 + 1));
  const booked = leads.filter((l) => l.status === 'booked');
  const value = sum(booked.flatMap((l) => apptsOf(l).filter((a) => a.status !== 'no_show').map((a) => a.value)));
  return { label: dateShort(atDay(d0)), spend, value, leads: leads.length, booked: booked.length };
});

// ---- channel payback (paid channels first, then free sources)
// Same cohort and same booked-value definition as the strip above (no-shows excluded), so paid-channel lead counts match the agency card.
const bookedValue = (ls: typeof LEADS) => sum(ls.filter((l) => l.status === 'booked').flatMap((l) => apptsOf(l).filter((a) => a.status !== 'no_show').map((a) => a.value)));
const adSpendOf = (id: string) => sum(SPEND.filter((x) => x.sourceId === id && inRange(atDay(x.day, 12), RANGE)).map((x) => x.amount));
const recurringOf = (id: string) => sum(RECURRING.filter((x) => 'sourceId' in x && x.sourceId === id).map((x) => (x.monthly / 30.4) * ((RANGE.end - RANGE.start) / DAY)));
export const CHANNELS = SOURCES.map((s) => {
  const leads = cohort(RANGE).filter((l) => l.sourceId === s.id); const booked = leads.filter((l) => l.status === 'booked');
  const value = bookedValue(leads); const spend = adSpendOf(s.id) + recurringOf(s.id);
  return { source: s, leads: leads.length, booked: booked.length, value, spend, back: spend ? value / spend : null };
}).sort((a, b) => (b.spend > 0 ? 1 : 0) - (a.spend > 0 ? 1 : 0) || (b.back ?? 0) - (a.back ?? 0) || b.value - a.value);
// Whole-dollar display values that add up exactly: largest-remainder rounding so the rows sum to the rounded total.
function apportion(raw: number[]): number[] {
  const target = Math.round(sum(raw)); const base = raw.map(Math.floor); let left = target - sum(base);
  raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f).forEach(({ i }) => { if (left > 0) { base[i]++; left--; } });
  return base;
}
const adRows = CHANNELS.filter((c) => c.source.type === 'ads');
const shownSpend = apportion(adRows.map((c) => c.spend)); const shownValue = apportion(adRows.map((c) => c.value));
export const CHANNELS_SHOWN = CHANNELS.map((c) => { const i = adRows.indexOf(c); return { ...c, spendShown: i >= 0 ? shownSpend[i] : Math.round(c.spend), valueShown: i >= 0 ? shownValue[i] : Math.round(c.value) }; });
export const CHANNEL_ADS_TOTAL = { spend: sum(shownSpend), value: sum(shownValue), leads: sum(adRows.map((c) => c.leads)), booked: sum(adRows.map((c) => c.booked)) };

// ---- agency report: Northshore Social retainer
const adLeads = cohort(RANGE).filter((l) => ['meta', 'google'].includes(l.sourceId));
const adBooked = adLeads.filter((l) => l.status === 'booked');
export const RETAINER = RECURRING[0].monthly;
export const AGENCY = {
  retainer: RETAINER, adSpend: adSpendOf('meta') + adSpendOf('google'), leads: adLeads.length, booked: adBooked.length,
  value: bookedValue(adLeads),
  googlePhone: adLeads.filter((l) => l.sourceId === 'google' && l.channel === 'phone').length,
};
export const AGENCY_COST = AGENCY.adSpend + (RETAINER / 30.4) * 30;
export const AGENCY_BACK = AGENCY_COST ? AGENCY.value / AGENCY_COST : 0;

// ---- attribution status (synthetic): how each lead gets its source
export type State = 'ok' | 'partial' | 'missing';
export const TRACKING = [
  { channel: 'Meta ads', sourceId: 'meta', number: '(847) 555-0171', via: 'Lead forms, DMs and a landing page', utm: 0.86, clickId: 0.74, clickName: 'fbclid', state: 'ok' as State },
  { channel: 'Google Ads', sourceId: 'google', number: '(847) 555-0172', via: 'Landing page and call extension', utm: 0.58, clickId: 0.41, clickName: 'gclid', state: 'partial' as State },
  { channel: 'Instagram bio', sourceId: 'ig', number: null, via: 'Bio link with a tag', utm: 0.92, clickId: 0, clickName: '', state: 'ok' as State },
  { channel: 'The Knot', sourceId: 'knot', number: '(847) 555-0173', via: 'Directory listing number', utm: 0, clickId: 0, clickName: '', state: 'ok' as State },
  { channel: 'Website', sourceId: 'form', number: '(847) 555-0114', via: 'Main number, no tracking', utm: 0.31, clickId: 0, clickName: '', state: 'partial' as State },
];
const adUtm = (() => { const m = adLeads.filter((l) => l.sourceId === 'meta').length, g = adLeads.filter((l) => l.sourceId === 'google').length; return (m * 0.86 + g * 0.58) / Math.max(1, m + g); })();
export const UTM_ADS = adUtm;
export const CONVERSIONS = [
  { name: 'Meta Conversions API', what: 'Sends booked appointments back to Meta so it finds more people like them', state: 'ok' as State, last: 'Today 8:12 am', sent: 21, matched: 19 },
  { name: 'Google offline conversions', what: 'Uploads booked appointments to Google Ads, matched by click ID', state: 'missing' as State, last: 'Never sent', sent: 0, matched: 0 },
];
export const MATCH = { leads: CUR.leadsNew, booked: CUR.booked, matched: CUR.booked, value: CUR.bookedValue };

export const CHECKS: { key: string; label: string; detail: string; state: State }[] = [
  { key: 'num', label: 'Tracking number on their landing page', state: 'missing', detail: `The Google page still shows the main salon number, so ${AGENCY.googlePhone} calls from Google Ads cannot be tied to a campaign.` },
  { key: 'utm', label: 'Campaign tags (UTMs) on every lead', state: 'partial', detail: `A UTM is a tag on an ad link that says which campaign a click came from. ${pct0(UTM_ADS)} of ad leads arrive with one; Google is the gap (${pct0(TRACKING[1].utm)}).` },
  { key: 'conv', label: 'Bookings reported back to Meta and Google', state: 'partial', detail: 'This tells each ad platform which clicks became clients. Meta gets bookings; Google does not, so its bidding learns from clicks, not from clients.' },
];
const bad = CHECKS.filter((c) => c.state !== 'ok').length;
export const VERDICT = bad
  ? `Not proven yet. ${bad} of ${CHECKS.length} checks are not clean, so the ${money(AGENCY.value)} booked from ads is partly a guess. Counting the retainer, each $1 returns ${times(AGENCY_BACK)}.`
  : `Working. Tracking is clean, and each $1 including the retainer returns ${times(AGENCY_BACK)}.`;

// ---- campaigns: one plain line per weak campaign
export const CAMPAIGN_ROWS = byCampaign().map((r) => {
  const c = r.campaign;
  let tip: string | null = null;
  if (c.status === 'learning') tip = 'Still learning. Give it two weeks and about 50 results before judging it.';
  else if (c.status === 'paused') tip = null;
  else if (r.spend > 0 && (r.back ?? 0) < 1) tip = c.sourceId === 'google' && c.objective === 'Calls'
    ? `${r.leads} calls, ${r.booked} booked. Answer the missed calls and add a tracking number before spending more here.`
    : `${money(r.spend)} spent for ${r.booked} bookings. Move half of its $${c.dailyBudget} a day to ${bestCampaign()}.`;
  return { ...r, tip };
});
function bestCampaign() { const b = [...byCampaign()].filter((r) => r.campaign.status === 'active' || r.campaign.status === 'learning').sort((a, b) => (b.back ?? 0) - (a.back ?? 0))[0]; return b.campaign.name; }

// ---- spend log
export interface LogRow { day: number; sourceId: string; campaign: string; amount: number; origin: 'Synced' | 'Manual' | 'Recurring'; note?: string }
const manual: LogRow[] = [
  { day: -3, sourceId: 'meta', campaign: 'Boost: Saturday open chairs', amount: 25, origin: 'Manual', note: 'Paid from the owner’s card' },
  { day: -8, sourceId: 'google', campaign: 'Call extension trial', amount: 40, origin: 'Manual', note: 'Entered by Tamsin' },
];
const recurring: LogRow[] = RECURRING.map((r) => ({ day: -9, sourceId: 'sourceId' in r ? r.sourceId! : 'agency', campaign: r.name, amount: r.monthly, origin: 'Recurring' as const }));
const synced: LogRow[] = SPEND.filter((s) => s.day >= -13).map((s) => ({ day: s.day, sourceId: s.sourceId, campaign: campaign(s.campaignId!)?.name ?? '', amount: s.amount, origin: 'Synced' as const }));
export const LOG = [...synced, ...manual, ...recurring].sort((a, b) => b.day - a.day || b.amount - a.amount);
export const LOG_THIS = LOG.filter((r) => r.day >= -6);
export const LOG_LAST = LOG.filter((r) => r.day < -6);
export const srcName = (id: string) => (id === 'agency' ? 'Agency' : source(id)?.name ?? id);

// ---- this month's budget against actual (Oct 1 to today)
const dim = 31, elapsed = 10;
const mtd = (id: string) => sum(SPEND.filter((s) => s.day >= -(elapsed - 1) && s.sourceId === id).map((s) => s.amount)) + sum(manual.filter((m) => m.sourceId === id && m.day >= -(elapsed - 1)).map((m) => m.amount));
const live = (id: string) => CAMPAIGNS.filter((c) => c.sourceId === id && c.status !== 'paused').reduce((s, c) => s + c.dailyBudget, 0) * dim;
export const BUDGET = [
  { name: 'Meta ads', budget: live('meta'), spent: mtd('meta'), pace: true },
  { name: 'Google Ads', budget: live('google'), spent: mtd('google'), pace: true },
  ...RECURRING.map((r) => ({ name: r.name, budget: r.monthly, spent: r.monthly, pace: false })),
].map((b) => ({ ...b, projected: b.pace ? (b.spent / elapsed) * dim : b.spent }));
export const BUDGET_TOTAL = { budget: sum(BUDGET.map((b) => b.budget)), spent: sum(BUDGET.map((b) => b.spent)), projected: sum(BUDGET.map((b) => b.projected)) };
export const DAY_OF_MONTH = elapsed;

// ---- calendar (synthetic plan)
export type Kind = 'campaign' | 'promo' | 'bridal';
export interface Ev { from: string; to: string; label: string; kind: Kind; note?: string }
export const EVENTS: Ev[] = [
  { from: '2026-10-01', to: '2026-10-31', label: 'Balayage reel', kind: 'campaign', note: 'Meta · Messages' },
  { from: '2026-10-01', to: '2026-10-31', label: 'Bridal season', kind: 'campaign', note: 'Meta · Leads' },
  { from: '2026-10-05', to: '2026-12-31', label: 'Extensions consult', kind: 'campaign', note: 'Meta · learning' },
  { from: '2026-10-12', to: '2026-10-18', label: 'Fall gloss, $15 off', kind: 'promo' },
  { from: '2026-10-24', to: '2026-10-25', label: 'Bridal expo, Evanston', kind: 'bridal', note: 'Booth and sign-up sheet' },
  { from: '2026-10-26', to: '2026-10-31', label: 'Halloween colour', kind: 'promo' },
  { from: '2026-11-01', to: '2027-01-31', label: 'Engagement season', kind: 'bridal', note: 'Many couples start looking now; plan trial slots' },
  { from: '2026-11-15', to: '2026-12-24', label: 'Holiday gift cards', kind: 'promo' },
  { from: '2026-11-27', to: '2026-11-30', label: 'Gift-card weekend push', kind: 'campaign', note: 'Meta · Sales' },
  { from: '2026-12-10', to: '2026-12-24', label: 'Holiday updos', kind: 'promo' },
  { from: '2026-12-28', to: '2027-01-10', label: 'New-year bridal push', kind: 'campaign', note: 'Meta + Google' },
];
export const MONTHS = [{ y: 2026, m: 9, name: 'October 2026' }, { y: 2026, m: 10, name: 'November 2026' }, { y: 2026, m: 11, name: 'December 2026' }];
export { SOURCES, dow };
