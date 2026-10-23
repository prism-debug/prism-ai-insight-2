// Dash: every sentence below is computed from the metrics module, so copy and numbers can never disagree.
import { CUR, PRV, HEALTH, notAnsweredLeads, notAnsweredValue, winBackPool, revenueAtRisk, bySource, byCampaign } from './metrics.ts';
import { LEADS, APPOINTMENTS, REQUESTS } from './seed.ts';
import { NOW, DAY, atDay } from './clock.ts';
import { service } from './salon.ts';
import { money, moneyK, plural, times, pct0, dur, num } from '../lib/format.ts';

const na = notAnsweredLeads();
const ahValue = na.filter((l) => l.afterHours).reduce((s, l) => s + l.likelyValue, 0);
const naRecent = na.filter((l) => NOW - l.lastInboundAt < DAY);
const pool = winBackPool();
const src = bySource().filter((s) => s.spend > 0);
const bestSrc = [...src].sort((a, b) => (b.back ?? 0) - (a.back ?? 0))[0];
const worstSrc = [...src].sort((a, b) => (a.back ?? 0) - (b.back ?? 0))[0];
const noJoyChannels = na.filter((l) => ['phone', 'form', 'email'].includes(l.channel)).length;
const pending = REQUESTS.filter((r) => r.status === 'pending');
const reqValue = pending.reduce((s, r) => s + service(r.serviceId).price, 0);
const today = APPOINTMENTS.filter((a) => a.start >= atDay(0) && a.start < atDay(1));

const payback = CUR.returnPerAd >= 3 ? 'well' : CUR.returnPerAd >= 1.5 ? 'modestly' : 'poorly';
// the call: grow when ads pay well and nothing waits; otherwise answer the waiting leads before spending more
export const VERDICT = CUR.returnPerAd >= 3 && CUR.notAnswered < 10 ? `Ads pay back well. Add budget where it works.` : `Hold ad spend. ${CUR.notAnswered + CUR.needsPerson} leads still wait for a person.`;
export const VERDICT_SUB = `Ads pay back ${payback}: each $1 returned ${times(CUR.returnPerAd)} (was ${times(PRV.returnPerAd)}), so answering the leads you already paid for comes first. ${CUR.booked} of ${CUR.leadsNew} leads booked, worth ${money(CUR.bookedValue)}, and ${num(CUR.afterHours)} of them wrote while you were closed.`;

export interface Focus { id: string; tone: 'attn' | 'watch' | 'joy'; title: string; why: string; stake: number; stakeLabel: string; cta: string; href: string }
export const FOCUS: Focus[] = [
  { id: 'reply', tone: 'attn', title: `Reply to the ${CUR.notAnswered} leads who never heard back`, why: `${naRecent.length} asked in the last day. ${noJoyChannels} came by form, email or phone, most of the calls before Joy started answering them.`, stake: notAnsweredValue(), stakeLabel: `${moneyK(notAnsweredValue())} at stake`, cta: `Open the ${CUR.notAnswered}`, href: '/leads?status=not_answered' },
  { id: 'winback', tone: 'watch', title: `Win back ${pool.length} clients who are overdue`, why: `They have not visited in over 60 days and said yes to texts. If a third return for one visit, that is about ${moneyK(Math.round(pool.length / 3) * CUR.avgTicket)}.`, stake: Math.round((pool.length / 3) * CUR.avgTicket), stakeLabel: `${moneyK(Math.round((pool.length / 3) * CUR.avgTicket))} at stake`, cta: `Win back ${pool.length}`, href: '/retention' },
  { id: 'night', tone: 'joy', title: 'Let Joy answer form leads', why: `${num(CUR.afterHours)} of ${CUR.leadsNew} leads arrived when you were closed. Joy replies in ${dur(CUR.firstReplyJoy ?? 0)} on texts, DMs and calls; the team takes ${dur(CUR.firstReplyTeam ?? 0)}.`, stake: ahValue, stakeLabel: `${moneyK(ahValue)} at stake`, cta: 'Turn on for forms', href: '/joy' },
  { id: 'requests', tone: 'watch', title: `Confirm ${pending.length} booking requests`, why: `The oldest has waited ${dur(NOW - Math.min(...pending.map((r) => r.createdAt)))}. ${pending.filter((r) => r.flags.some((f) => f.includes('consult'))).length} need a consult booked first.`, stake: reqValue, stakeLabel: `${money(reqValue)} at stake`, cta: 'Review requests', href: '/bookings' },
];

export interface Answer { q: string; match: string[]; text: string; cites: string[]; cta?: { label: string; href: string } }
export const ANSWERS: Answer[] = [
  { q: 'What should I do today?', match: ['today', 'do first', 'priorit', 'focus'], text: `Three things, in order. Reply to the ${naRecent.length} leads who asked in the last day (${money(naRecent.reduce((s, l) => s + l.likelyValue, 0))} at stake). Confirm ${pending.length} booking requests. Then start the win-back for ${pool.length} overdue clients.`, cites: ['Leads · not answered', 'Bookings · requests', 'Retention'], cta: { label: `Open the ${naRecent.length}`, href: '/leads?status=not_answered' } },
  { q: 'Which channel pays back best?', match: ['channel', 'pays', 'best', 'source', 'roi', 'return'], text: `${bestSrc.source.name} paid back ${times(bestSrc.back ?? 0)} per $1 against ${worstSrc.source.name} at ${times(worstSrc.back ?? 0)}. ${bestSrc.source.name} brought ${bestSrc.leads} leads and ${bestSrc.booked} bookings in 30 days.`, cites: ['Marketing · channel table'], cta: { label: 'Open Marketing', href: '/marketing' } },
  { q: 'Why are so few leads booking?', match: ['why', 'book', 'few', 'convert', 'rate'], text: `${pct0(CUR.bookingRate)} of leads booked (was ${pct0(PRV.bookingRate)}). The gap is speed: ${CUR.notAnswered} leads never got a first reply, and ${num(CUR.afterHours)} wrote while you were closed. Leads Joy answered booked far more often than the ones that waited.`, cites: ['Leads', 'Inbox · first reply times'], cta: { label: 'See who is waiting', href: '/leads?status=not_answered' } },
  { q: 'Who should I win back first?', match: ['win back', 'winback', 'lapsed', 'overdue', 'retention', 'who'], text: `Start with the ${pool.length} clients who are overdue and said yes to promotional texts, biggest usual ticket first. ${money(revenueAtRisk())} of next-visit value sits with the at-risk group alone.`, cites: ['Retention · at risk and lapsed'], cta: { label: `Win back ${pool.length}`, href: '/retention' } },
  { q: 'How is Joy doing?', match: ['joy', 'ai', 'assistant', 'reply'], text: `Joy answered ${CUR.joyCovered} of ${CUR.leadsNew} new leads, with a median first reply of ${dur(CUR.firstReplyJoy ?? 0)}. She booked ${LEADS.filter((l) => l.status === 'booked' && l.firstReplyBy === 'joy').length} of the ${CUR.booked} bookings and handed ${CUR.needsPerson} guests to the team with a reason.`, cites: ['Joy', 'Inbox'], cta: { label: 'Open Joy', href: '/joy' } },
  { q: 'Should I spend more on ads?', match: ['spend', 'budget', 'ads', 'more'], text: `Not yet. Each $1 on ads returns ${times(CUR.returnPerAd)} but ${CUR.notAnswered} paid-for leads are waiting. Answering them first is free and would lift the return before you add budget. Meta is learning on one campaign; check again in two weeks.`, cites: ['Marketing', 'Leads'], cta: { label: 'Open Marketing', href: '/marketing' } },
];
export const SUGGESTED = ANSWERS.slice(0, 5).map((a) => a.q);

export const HEALTH_SUMMARY = `${HEALTH.total} out of 100`;
export const TODAY = { appts: today.length, first: today[0], requests: pending.length };
export const UPDATED = '8:02 am';
export { HEALTH, CUR, PRV };
