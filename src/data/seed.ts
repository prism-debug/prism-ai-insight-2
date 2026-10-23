import { rand, int, chance, pick, weighted, shuffle, jitter } from './rng.ts';
import { NOW, DAY, HOUR, MIN, atDay, dayIndex, dow, hourOf, RANGE, PREV } from './clock.ts';
import type { Lead, Client, Appointment, BookingRequest, Thread, Msg, SpendEntry, LeadStatus, Channel, Visit } from './types.ts';
import { SERVICES, STYLISTS, SOURCES, CAMPAIGNS, SALON, service, stylist, source, FRONT_DESK } from './salon.ts';

const FIRST = ['Maya','Priya','Jordan','Ivy','Sam','Grace','Noah','Alicia','Dana','Ruth','Tess','Chloe','Amara','Lucia','Hannah','Imani','Sofia','Keira','Bea','Naomi','Talia','Renee','Camille','Dylan','Wen','Aisha','Fiona','Nadia','Owen','Leah','Zoe','Mina','Rosa','Julia','Tasha','Kiran','Esme','Pia','Marin','Odette','Lena','Cora','Ines','Yara','Theo','Remy','Anika','Sage','Willa','Nora'];
const LAST = ['Okafor','Chen','Shah','Alvarez','Liu','Tran','Patel','Moreno','Whitfield','Kapoor','Albright','Nguyen','Brooks','Hayes','Ito','Kowalski','Mendez','Park','Reyes','Sato','Thompson','Underwood','Vega','Walsh','Xu','Young','Zhang','Abbott','Bishop','Carver','Dunn','Ellis','Foster','Grant','Hale','Iverson','Joshi','Kim','Lund','Morales','Novak','Osei','Pruitt','Quinn','Rao','Sloan','Tate','Urrea','Voss','Wren'];
const used = new Set<string>();
const reserved = new Set(['Maya Chen','Priya Shah','Jordan Alvarez','Sam Okafor','Grace Liu','Noah Patel','Ivy Tran','Alicia Moreno','Dana Whitfield','Ruth Kapoor','Tess Albright']);
function nameFor(): string {
  for (let i = 0; i < 500; i++) { const n = `${pick(FIRST)} ${pick(LAST)}`; if (!used.has(n) && !reserved.has(n)) { used.add(n); return n; } }
  return `Guest ${used.size}`;
}
const AREAS = [847, 312, 224, 773, 708, 630];
const phone = () => `(${pick(AREAS)}) 555-01${String(int(0, 99)).padStart(2, '0')}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

// ---------------------------------------------------------------- leads
const CHANNEL_BY_SOURCE: Record<string, [Channel, number][]> = {
  meta: [['form', 0.5], ['instagram', 0.3], ['facebook', 0.2]],
  google: [['phone', 0.6], ['form', 0.25], ['sms', 0.15]],
  ig: [['instagram', 1]],
  phone: [['phone', 1]],
  form: [['form', 0.8], ['email', 0.2]],
  referral: [['sms', 0.6], ['phone', 0.4]],
  knot: [['form', 0.6], ['email', 0.4]],
};
const SERVICE_BY_CAMPAIGN: Record<string, string[]> = {
  'm-balayage': ['balayage', 'balayage', 'gloss', 'correction'], 'm-bridal': ['bridal', 'bridal', 'balayage'], 'm-ext': ['extensions', 'extensions', 'extensions', 'keratin'],
  'g-near': ['cut', 'blowout', 'balayage', 'gloss', 'cut'], 'g-balayage': ['balayage', 'balayage', 'correction'], 'g-bridal': ['bridal'],
};
const HANDOFF = ['The price of a toner on top is not in Brand Hub', 'Asked for a stylist by name', 'Wants a consult before booking', 'Wants a group booking for a party of 6', 'Message sounded upset about a past visit', 'Asked whether the colour will damage thin hair', 'Asked to move an existing appointment', 'Asked about a refund'];

function hourWeights() { return [[8,.5],[9,1],[10,1.4],[11,1.2],[12,1.1],[13,.9],[14,.8],[15,.8],[16,.9],[17,1],[18,1.1],[19,1.3],[20,1.4],[21,1.1],[22,.5],[23,.2],[7,.2],[6,.1]] as [number, number][]; }
function leadTime(maxDaysAgo: number, minDaysAgo = 0) {
  for (;;) {
    const d = minDaysAgo + rand() * (maxDaysAgo - minDaysAgo);
    const h = weighted(hourWeights());
    const t = atDay(-Math.floor(d), h, int(0, 59));
    if (t < NOW - 2 * MIN) return t;
  }
}
const isOpen = (t: number) => { const h = SALON.hours.find((x) => x.d === dow(t)); const hr = hourOf(t); return !!h?.open && hr >= h.open[0] && hr < h.open[1]; };

function makeLead(i: number, firstTouchAt: number, win: 'cur' | 'prev'): Lead {
  const sourceId = weighted(SOURCES.map((s) => [s.id, s.share] as [string, number]));
  const channel = weighted(CHANNEL_BY_SOURCE[sourceId]);
  const camps = CAMPAIGNS.filter((c) => c.sourceId === sourceId && (win === 'cur' ? c.status !== 'paused' : true));
  const campaignId = camps.length ? weighted(camps.map((c) => [c.id, c.dailyBudget] as [string, number])) : undefined;
  const svcId = campaignId ? pick(SERVICE_BY_CAMPAIGN[campaignId]) : sourceId === 'knot' ? 'bridal' : pick(['cut', 'balayage', 'gloss', 'blowout', 'extensions', 'keratin', 'cut']);
  const svc = service(svcId);
  const name = nameFor();
  const likelyValue = Math.round((svc.price * (svc.fromPrice ? jitter(1.18, 0.22) : jitter(1, 0.08))) / 5) * 5;
  const afterHours = !isOpen(firstTouchAt);
  return {
    id: `L-${1000 + i}`, name, phone: phone(), ig: channel === 'instagram' ? `@${slug(name).replace('.', '_')}` : undefined, email: chance(0.55) ? `${slug(name)}@example.com` : undefined,
    sourceId, campaignId, channel, firstTouchAt, lastInboundAt: firstTouchAt, status: 'went_quiet', ownerId: null, serviceId: svcId, likelyValue,
    score: 0, scoreWhy: [], consentSms: chance(0.88), consentMarketing: chance(0.6), firstReplyMs: null, firstReplyBy: null, afterHours, preview: '', tags: [], touches: 1,
  };
}

const curLeads: Lead[] = Array.from({ length: 139 }, (_, i) => makeLead(i, leadTime(30), 'cur')).sort((a, b) => a.firstTouchAt - b.firstTouchAt);
const prevLeads: Lead[] = Array.from({ length: 121 }, (_, i) => makeLead(500 + i, leadTime(60, 31), 'prev')).sort((a, b) => a.firstTouchAt - b.firstTouchAt);
curLeads.forEach((l, i) => (l.id = `L-${2000 + i}`));
prevLeads.forEach((l, i) => (l.id = `L-${1000 + i}`));

// ---- statuses (current window): not answered waits, then fill by constraints
const age = (l: Lead) => NOW - l.firstTouchAt;
const free = new Set(curLeads);
function take(n: number, pred: (l: Lead) => boolean, order: (a: Lead, b: Lead) => number): Lead[] {
  const pool = [...free].filter(pred).sort(order);
  const out = pool.slice(0, n);
  if (out.length < n) { const rest = [...free].filter((l) => !out.includes(l)).sort(order).slice(0, n - out.length); out.push(...rest); }
  out.forEach((l) => free.delete(l));
  return out;
}
const waits = [...Array.from({ length: 4 }, () => int(4, 28) * MIN), ...Array.from({ length: 9 }, () => int(40, 330) * MIN), ...Array.from({ length: 11 }, () => int(7, 23) * HOUR), ...Array.from({ length: 22 }, () => int(26, 21 * 24) * HOUR)].sort((a, b) => b - a);
const notAnsweredPref = (l: Lead) => (['phone', 'form', 'email'].includes(l.channel) ? 3 : 1) * (l.consentSms ? 1 : 2);
for (const w of waits) {
  const cands = [...free].filter((l) => age(l) >= w + 5 * MIN);
  const l = cands.length ? weighted(cands.map((c) => [c, notAnsweredPref(c)] as [Lead, number])) : [...free].sort((a, b) => age(b) - age(a))[0];
  free.delete(l); l.status = 'not_answered'; l.lastInboundAt = NOW - w; l.firstReplyMs = null;
}
const needs = take(14, (l) => age(l) < 7 * DAY, (a, b) => age(a) - age(b));
needs.forEach((l) => { l.status = 'needs_person'; l.ownerId = 'joy'; l.handoffReason = pick(HANDOFF); l.lastInboundAt = NOW - int(10, 36 * 60) * MIN; });
const handling = take(22, (l) => age(l) < 10 * DAY && ['sms', 'instagram', 'facebook', 'form'].includes(l.channel), (a, b) => age(a) - age(b));
handling.forEach((l) => { l.status = 'joy_handling'; l.ownerId = 'joy'; l.lastInboundAt = NOW - int(2, 48 * 60) * MIN; });
const quiet = take(26, (l) => age(l) > 8 * DAY, (a, b) => age(b) - age(a));
quiet.forEach((l) => { l.status = 'went_quiet'; l.ownerId = pick(['joy', 'joy', 'tamsin', 'devon']); l.lastInboundAt = l.firstTouchAt + int(1, 90) * MIN; });
const booked = [...free]; booked.forEach((l) => { l.status = 'booked'; l.ownerId = 'joy'; });

// ---- featured storylines (named leads the design refers to)
function feature(i: number, patch: Partial<Lead> & { waitMin?: number }) {
  const l = curLeads[i]; const { waitMin, ...rest } = patch; Object.assign(l, rest);
  if (waitMin !== undefined) { l.lastInboundAt = NOW - waitMin * MIN; l.firstTouchAt = Math.min(l.firstTouchAt, l.lastInboundAt); }
  return l;
}
const lastIdx = curLeads.length - 1;
feature(lastIdx, { name: 'Maya Chen', ig: '@maya.chen', sourceId: 'meta', campaignId: 'm-balayage', channel: 'instagram', serviceId: 'balayage', likelyValue: 285, status: 'not_answered', ownerId: null, waitMin: 12, consentSms: true, phone: '(847) 555-0142', afterHours: false, handoffReason: undefined });
feature(lastIdx - 1, { name: 'Priya Shah', sourceId: 'google', campaignId: 'g-near', channel: 'phone', serviceId: 'correction', likelyValue: 380, status: 'needs_person', ownerId: 'joy', waitMin: 38, handoffReason: 'Missed call with no voicemail, and the number is a repeat caller', consentSms: true, phone: '(312) 555-0166' });
feature(lastIdx - 2, { name: 'Jordan Alvarez', sourceId: 'ig', campaignId: undefined, channel: 'sms', serviceId: 'extensions', likelyValue: 720, status: 'joy_handling', ownerId: 'joy', waitMin: 4, consentSms: true, phone: '(224) 555-0138' });
feature(lastIdx - 3, { name: 'Noah Patel', sourceId: 'knot', campaignId: undefined, channel: 'form', serviceId: 'bridal', likelyValue: 900, status: 'needs_person', ownerId: 'joy', waitMin: 22, handoffReason: 'Wants a group booking for a party of 6', consentSms: true, phone: '(773) 555-0171' });
feature(lastIdx - 4, { name: 'Grace Liu', sourceId: 'meta', campaignId: 'm-ext', channel: 'form', serviceId: 'extensions', likelyValue: 780, status: 'not_answered', ownerId: null, waitMin: 3 * 60 + 12, consentSms: false, phone: '(847) 555-0123' });
feature(lastIdx - 5, { name: 'Ivy Tran', sourceId: 'google', campaignId: 'g-balayage', channel: 'sms', serviceId: 'gloss', likelyValue: 70, status: 'joy_handling', ownerId: 'joy', waitMin: 1, consentSms: true, phone: '(630) 555-0109' });
if (quiet[0]) Object.assign(quiet[0], { name: 'Sam Okafor', sourceId: 'ig', campaignId: undefined, channel: 'instagram', ig: '@sam.okafor', serviceId: 'cut', likelyValue: 90, status: 'went_quiet', ownerId: 'devon', phone: '(708) 555-0155' });
const FEATURED = ['Maya Chen', 'Priya Shah', 'Jordan Alvarez', 'Noah Patel', 'Grace Liu', 'Ivy Tran', 'Sam Okafor'];

// ---- first replies, score, preview
const names = new Map<string, number>();
function finishLead(l: Lead, win: 'cur' | 'prev') {
  const joyCovers = ['sms', 'instagram', 'facebook'].includes(l.channel) || (l.channel === 'form' && l.consentSms);
  if (l.status !== 'not_answered') {
    if (joyCovers) { l.firstReplyBy = 'joy'; l.firstReplyMs = int(18, 95) * 1000; }
    else { l.firstReplyBy = 'team'; l.firstReplyMs = l.afterHours ? int(10, 16) * HOUR : int(6, 170) * MIN; }
  } else { l.firstReplyBy = null; l.firstReplyMs = null; }
  l.touches = l.status === 'booked' ? int(4, 9) : l.status === 'went_quiet' ? int(2, 5) : l.status === 'not_answered' ? 1 : int(2, 7);
  const svc = service(l.serviceId);
  let s = 28 + Math.min(26, svc.price / 650 * 26);
  const why: string[] = [];
  if (svc.price >= 240) { why.push(`High-value service (${svc.name.toLowerCase()})`); }
  if (l.sourceId === 'referral') { s += 16; why.push('Came by referral'); }
  if (l.sourceId === 'knot') { s += 12; why.push('Bridal directory, ready to plan'); }
  if (l.sourceId === 'google') { s += 8; why.push('Searched for you on Google'); }
  if (l.firstReplyBy === 'joy') { s += 8; why.push('Replied within a minute'); }
  s += Math.min(14, l.touches * 2);
  if (l.touches >= 4) why.push('Active conversation');
  if (l.status === 'not_answered') { const w = NOW - l.lastInboundAt; s -= Math.min(30, w / HOUR / 3); why.push(w > DAY ? 'Cooling: no reply for over a day' : 'Waiting for a reply'); }
  if (l.status === 'went_quiet') { s -= 22; }
  if (l.consentSms) s += 3; else why.push('No text consent yet');
  l.score = Math.max(6, Math.min(98, Math.round(s)));
  l.scoreWhy = why.slice(0, 3);
  l.tags = [...(l.afterHours ? ['After hours'] : []), ...(svc.consult ? ['Needs consult'] : []), ...(l.sourceId === 'referral' ? ['Referral'] : [])];
}
curLeads.forEach((l) => finishLead(l, 'cur'));

// previous window: mostly resolved
const prevBookedN = 24;
const prevShuffled = shuffle(prevLeads);
prevShuffled.forEach((l, i) => { l.status = i < prevBookedN ? 'booked' : 'went_quiet'; l.ownerId = 'joy'; l.lastInboundAt = l.firstTouchAt + int(1, 600) * MIN; finishLead(l, 'prev'); });

export const LEADS: Lead[] = [...curLeads, ...prevLeads].sort((a, b) => b.firstTouchAt - a.firstTouchAt);
export const lead = (id: string) => LEADS.find((l) => l.id === id)!;

// ---------------------------------------------------------------- clients
const clients: Client[] = [];
const visitsFor = (stage: number) => stage;
function stageVisits() { return weighted<number>([[1, 20], [2, 20], [3, 10], [4, 10], [5, 8], [7, 12], [9, 8], [12, 5], [15, 3]]); }
function genClient(i: number, bucket: 'active' | 'at_risk' | 'lapsed', over: Partial<Client> = {}): Client {
  const name = over.name ?? nameFor();
  const nVisits = stageVisits();
  const lastDaysAgo = bucket === 'active' ? int(1, 59) : bucket === 'at_risk' ? int(61, 119) : int(121, 420);
  const svc = service(pick(['cut', 'cut', 'blowout', 'balayage', 'gloss', 'extensions', 'keratin', 'balayage', 'cut']));
  const sty = pick(STYLISTS.filter((s) => s.services.includes(svc.id)).length ? STYLISTS.filter((s) => s.services.includes(svc.id)) : STYLISTS);
  const avg = Math.round((svc.price * (svc.fromPrice ? 1.25 : 1) * jitter(1, 0.18)) / 5) * 5;
  const visits: Visit[] = [];
  let t = atDay(-lastDaysAgo, int(10, 17), int(0, 5) * 10);
  for (let k = 0; k < nVisits; k++) {
    const sv = k === 0 ? svc : service(pick([svc.id, svc.id, 'cut', 'gloss']));
    visits.push({ t, v: Math.round((avg * jitter(1, 0.15)) / 5) * 5, serviceId: sv.id });
    t -= Math.round(jitter(svc.rebookDays, 0.25)) * DAY;
  }
  const c: Client = {
    id: `C-${3000 + i}`, name, phone: phone(), email: `${slug(name)}@example.com`, sourceId: weighted(SOURCES.map((s) => [s.id, s.share + (s.id === 'referral' ? 0.12 : 0)] as [string, number])), stylistId: sty.id,
    visits, firstVisitAt: visits[visits.length - 1].t, lastVisitAt: visits[0].t, avgTicket: Math.round(visits.reduce((s, v) => s + v.v, 0) / visits.length), lifetimeSpend: visits.reduce((s, v) => s + v.v, 0),
    consentSms: chance(0.9), consentMarketing: chance(0.62), tags: [], preferredServiceId: svc.id,
    ...over,
  };
  if (bucket === 'active' && chance(0.46)) c.nextApptAt = atDay(int(0, 20), int(10, 16), int(0, 5) * 10);
  if (nVisits >= 12 && c.lifetimeSpend >= 1500) c.tags.push('VIP'); if (!c.consentMarketing) c.tags.push('No promo texts');
  return c;
}
let ci = 0;
for (let i = 0; i < 150; i++) clients.push(genClient(ci++, 'active'));
for (let i = 0; i < 124; i++) clients.push(genClient(ci++, 'at_risk'));
for (let i = 0; i < 107; i++) clients.push(genClient(ci++, 'lapsed'));
// named win-back clients
Object.assign(clients[160], { name: 'Alicia Moreno' }); Object.assign(clients[161], { name: 'Dana Whitfield' }); Object.assign(clients[162], { name: 'Ruth Kapoor', consentSms: false }); Object.assign(clients[163], { name: 'Tess Albright' });
for (const c of clients.slice(160, 164)) { c.email = `${slug(c.name)}@example.com`; }

// leads that booked become clients
const appts: Appointment[] = [];
let ai = 0;
for (const l of LEADS.filter((x) => x.status === 'booked')) {
  const svc = service(l.serviceId); const sty = pick(STYLISTS.filter((s) => s.services.includes(svc.id)).length ? STYLISTS.filter((s) => s.services.includes(svc.id)) : STYLISTS);
  const firstApptStart = (() => { for (let k = 0; k < 30; k++) { const t = l.firstTouchAt + int(1, 12) * DAY + int(-3, 3) * HOUR; const d = dow(t); if (d >= 2) { const o = atDay(dayIndex(t), int(10, 16), int(0, 5) * 10); if (o <= atDay(14, 12)) return o; } } return atDay(int(1, 10), 11); })();
  const value = Math.round((svc.price * (svc.fromPrice ? jitter(1.35, 0.25) : jitter(1.05, 0.1))) / 5) * 5;
  const done = firstApptStart < NOW - 2 * HOUR;
  const bookedBy = l.firstReplyBy === 'joy' && chance(0.55) ? 'joy' : chance(0.3) ? 'online' : 'team';
  const cl: Client = {
    id: `C-${3000 + ci++}`, name: l.name, phone: l.phone, email: l.email ?? `${slug(l.name)}@example.com`, sourceId: l.sourceId, stylistId: sty.id,
    visits: done ? [{ t: firstApptStart, v: value, serviceId: svc.id }] : [], firstVisitAt: firstApptStart, lastVisitAt: done ? firstApptStart : 0, avgTicket: value, lifetimeSpend: done ? value : 0,
    consentSms: l.consentSms, consentMarketing: l.consentMarketing, tags: ['New client'], preferredServiceId: svc.id, leadId: l.id, nextApptAt: done ? undefined : firstApptStart,
  };
  if (!done) { cl.firstVisitAt = firstApptStart; cl.lastVisitAt = 0; }
  clients.push(cl); l.clientId = cl.id;
  const a: Appointment = { id: `A-${5000 + ai++}`, clientId: cl.id, leadId: l.id, name: l.name, stylistId: sty.id, serviceId: svc.id, start: firstApptStart, minutes: svc.minutes, value, status: done ? 'checked_out' : 'confirmed', bookedBy: bookedBy as any, createdAt: l.firstTouchAt + int(2, 300) * MIN };
  appts.push(a); l.apptId = a.id;
}
export const CLIENTS: Client[] = clients;
export const client = (id: string) => CLIENTS.find((c) => c.id === id)!;
export const lifecycleOf = (c: Client, at = NOW): 'active' | 'at_risk' | 'lapsed' | 'prospect' => {
  if (!c.lastVisitAt) return 'prospect';
  const d = (at - c.lastVisitAt) / DAY; return d <= 60 ? 'active' : d <= 120 ? 'at_risk' : 'lapsed';
};
// a few at-risk clients withdrew promo consent, so the reachable pool is not the same size as the at-risk group
CLIENTS.filter((c) => lifecycleOf(c) === 'at_risk' && c.consentSms && c.consentMarketing).slice(0, 6).forEach((c) => { c.consentMarketing = false; if (!c.tags.includes('No promo texts')) c.tags.push('No promo texts'); });
// VIP needs both frequency and spend, so a 12-visit $60 client is Loyal, not VIP
export const stageOf = (c: Client) => { const n = c.visits.length; return n <= 1 ? 'New' : n === 2 ? 'Returning' : n <= 5 ? 'Regular' : n <= 11 || c.lifetimeSpend < 1500 ? 'Loyal' : 'VIP'; };

// ---------------------------------------------------------------- appointments
// past visits (last 70 days) from client history
for (const c of CLIENTS.filter((x) => !x.leadId)) {
  for (const v of c.visits) {
    if (v.t < NOW - 70 * DAY || v.t >= NOW - 3 * HOUR) continue;
    appts.push({ id: `A-${5000 + ai++}`, clientId: c.id, name: c.name, stylistId: c.stylistId, serviceId: v.serviceId, start: v.t, minutes: service(v.serviceId).minutes, value: v.v, status: 'checked_out', bookedBy: pick(['team', 'team', 'online', 'client', 'joy']), createdAt: v.t - int(2, 21) * DAY });
  }
}
// upcoming (days 0..20): pack per stylist per day
const upcoming: Appointment[] = [];
for (const c of CLIENTS.filter((x) => !x.leadId && x.nextApptAt)) {
  const svc = service(c.preferredServiceId); const d = dayIndex(c.nextApptAt!); const dw = dow(atDay(d));
  const day = dw < 2 ? d + (2 - dw) : d; // closed Sun/Mon
  upcoming.push({ id: `A-${5000 + ai++}`, clientId: c.id, name: c.name, stylistId: c.stylistId, serviceId: svc.id, start: atDay(day, 12), minutes: svc.minutes, value: Math.round(c.avgTicket), status: 'confirmed', bookedBy: pick(['team', 'online', 'joy', 'client']), createdAt: NOW - int(2, 20) * DAY });
}
// extra today walk-in style appts to make Saturday busy
const futureLeadAppts = appts.filter((a) => a.start >= atDay(0) && a.leadId);
const grouped = new Map<string, Appointment[]>();
for (const a of [...upcoming, ...futureLeadAppts]) { const k = `${a.stylistId}:${dayIndex(a.start)}`; (grouped.get(k) ?? grouped.set(k, []).get(k)!).push(a); }
for (const [k, list] of grouped) {
  const d = Number(k.split(':')[1]); const hrs = SALON.hours.find((h) => h.d === dow(atDay(d)))!.open!;
  let cursor = atDay(d, hrs[0], 0);
  for (const a of shuffle(list)) {
    if (cursor + a.minutes * MIN > atDay(d, hrs[1], 0)) { a.status = 'cancelled'; continue; }
    a.start = cursor; cursor += (a.minutes + pick([0, 15, 30])) * MIN;
    if (a.start < NOW - a.minutes * MIN) a.status = 'checked_out'; else if (a.start <= NOW) a.status = 'in_progress'; else a.status = chance(0.8) ? 'confirmed' : 'booked';
  }
}
appts.push(...upcoming.filter((a) => a.status !== 'cancelled'));
// a no-show or two this week
for (const a of shuffle(appts.filter((a) => a.status === 'checked_out' && a.start > NOW - 14 * DAY && !a.leadId)).slice(0, 5)) a.status = 'no_show';
export const APPOINTMENTS: Appointment[] = appts.filter((a) => a.status !== 'cancelled').sort((a, b) => a.start - b.start);

// ---------------------------------------------------------------- booking requests
const REQ_LINES = ['Would love Thursday afternoon if possible.', 'First time here. Hair is shoulder length and has box dye.', 'Wedding is June 13, party of 4 for trials.', 'Is Elena available? A friend recommended her.', 'Any chance of an early Saturday slot?', 'Need this before a trip on the 24th.', 'Thin hair, a bit nervous about bleach.'];
export const REQUESTS: BookingRequest[] = [
  { id: 'R-1', name: 'Maya Chen', phone: '(847) 555-0142', serviceId: 'balayage', requested: [atDay(5, 16), atDay(6, 11)], notes: REQ_LINES[0], createdAt: NOW - 6 * MIN, via: 'instagram', status: 'pending', flags: ['New guest', 'Needs consult'], stylistId: 'elena' },
  { id: 'R-2', name: 'Noah Patel', phone: '(773) 555-0171', serviceId: 'bridal', requested: [atDay(9, 11), atDay(10, 14)], notes: REQ_LINES[2], createdAt: NOW - 22 * MIN, via: 'form', status: 'pending', flags: ['Group of 4', 'Deposit required'], stylistId: 'jules' },
  { id: 'R-3', name: 'Grace Liu', phone: '(847) 555-0123', serviceId: 'extensions', requested: [atDay(8, 12)], notes: REQ_LINES[3], createdAt: NOW - 3 * HOUR - 10 * MIN, via: 'form', status: 'pending', flags: ['Needs consult', 'No text consent'], stylistId: 'priya' },
  { id: 'R-4', name: 'Imani Brooks', phone: '(312) 555-0188', serviceId: 'keratin', requested: [atDay(4, 10), atDay(5, 10)], notes: REQ_LINES[5], createdAt: NOW - 5 * HOUR, via: 'joy', status: 'pending', flags: ['Booked by Joy, needs approval'], stylistId: 'marcus' },
  { id: 'R-5', name: 'Camille Hale', phone: '(630) 555-0132', serviceId: 'correction', requested: [atDay(7, 13)], notes: REQ_LINES[1], createdAt: NOW - 20 * HOUR, via: 'form', status: 'pending', flags: ['Needs consult', 'Photos attached'], stylistId: 'elena' },
  { id: 'R-6', name: 'Renee Voss', phone: '(224) 555-0147', serviceId: 'balayage', requested: [atDay(2, 15), atDay(3, 15)], notes: REQ_LINES[6], createdAt: NOW - 26 * HOUR, via: 'instagram', status: 'pending', flags: ['Thin hair'], stylistId: 'elena' },
  { id: 'R-7', name: 'Theo Quinn', phone: '(708) 555-0192', serviceId: 'cut', requested: [atDay(3, 12)], notes: REQ_LINES[4], createdAt: NOW - 2 * DAY, via: 'form', status: 'pending', flags: [], stylistId: 'marcus' },
  { id: 'R-8', name: 'Lena Abbott', phone: '(847) 555-0101', serviceId: 'gloss', requested: [atDay(-1, 13)], notes: '', createdAt: NOW - 3 * DAY, via: 'joy', status: 'confirmed', flags: [], stylistId: 'marcus' },
  { id: 'R-9', name: 'Fiona Dunn', phone: '(312) 555-0120', serviceId: 'bridal', requested: [atDay(-2, 11)], notes: '', createdAt: NOW - 4 * DAY, via: 'form', status: 'declined', flags: ['Date unavailable'], stylistId: 'jules' },
];

// ---------------------------------------------------------------- conversations
const first = (n: string) => n.split(' ')[0];
function slotText(l: Lead) { const d = atDay(int(1, 6)); const sty = stylist(pick(STYLISTS.filter((s) => s.services.includes(l.serviceId)).length ? STYLISTS.filter((s) => s.services.includes(l.serviceId)) : STYLISTS).id); const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; return `${days[Math.max(2, dow(d))]} at ${pick(['10:30 am','12:00 pm','2:00 pm','4:00 pm'])} with ${sty.name.split(' ')[0]}`; }
function opener(l: Lead): string {
  const s = service(l.serviceId).name.toLowerCase();
  if (l.serviceId === 'bridal') return pick([`Hi! Getting married next June and looking for a hair trial. Do you do bridal parties?`, `Hello, looking for bridal hair for a party of ${int(3, 6)}. What dates do you have for trials?`]);
  if (l.serviceId === 'extensions') return pick([`Hi, do you do tape-in or hand-tied extensions? My hair is shoulder length.`, `Interested in extensions. How much for a full head and how long does it take?`]);
  return pick([`Hi! Do you have ${s} openings this week?`, `How much is ${s}? Any availability Saturday?`, `Hello, I'd like to book ${s}. First time with you.`]);
}
function buildThread(l: Lead): Thread {
  const msgs: Msg[] = []; const t0 = l.firstTouchAt; const f = first(l.name); const svc = service(l.serviceId);
  const ch = l.channel;
  const guest = (at: number, text: string, kind?: Msg['kind']): Msg => ({ at, dir: 'in', by: 'guest', text, kind });
  const joy = (at: number, text: string): Msg => ({ at, dir: 'out', by: 'joy', text });
  const team = (at: number, text: string): Msg => ({ at, dir: 'out', by: 'team', text });
  if (ch === 'phone') {
    if (l.status === 'not_answered' || l.status === 'needs_person') msgs.push({ at: l.lastInboundAt, dir: 'in', by: 'guest', text: 'Missed call · no voicemail', kind: 'call', callSec: 0 });
    else msgs.push({ at: t0, dir: 'in', by: 'guest', text: `Call about ${svc.name.toLowerCase()}`, kind: 'call', callSec: int(70, 210) });
  } else if (ch === 'form' || ch === 'email') {
    msgs.push({ at: t0, dir: 'in', by: 'guest', text: `New-client form: ${svc.name}. “${opener(l)}”`, kind: 'form' });
  } else msgs.push(guest(t0, opener(l)));
  const replyAt = t0 + (l.firstReplyMs ?? 0);
  if (l.status === 'not_answered') { return { id: `T-${l.id}`, leadId: l.id, channel: ch, messages: msgs, unread: l.lastInboundAt > NOW - 3 * DAY }; }
  if (l.firstReplyBy === 'joy') msgs.push(joy(replyAt, `Hi ${f}! Thanks for reaching out to ${SALON.name}. ${svc.consult ? `${svc.name} starts with a quick consult. ` : ''}${slotText(l)} is open. Want me to hold it?`));
  else msgs.push(team(replyAt, `Hi ${f}, it's ${pick(['Tamsin','Devon'])} at ${SALON.name}. ${slotText(l)} works for ${svc.name.toLowerCase()}. Shall I book it?`));
  if (l.status === 'booked') {
    msgs.push(guest(replyAt + int(2, 40) * MIN, 'Yes please!')); msgs.push(joy(replyAt + int(41, 44) * MIN, `Held for you. A $40 deposit confirms it: pay.marlowfinch.example/d/${l.id.slice(2)}`));
    msgs.push(guest(replyAt + int(50, 80) * MIN, 'Paid, thank you!')); msgs.push({ at: replyAt + int(81, 90) * MIN, dir: 'out', by: 'system', text: `Booked · ${svc.name}`, kind: 'booking' });
  } else if (l.status === 'joy_handling') {
    msgs.push(guest(l.lastInboundAt, pick(['That works. What should I bring?', 'Can I see availability for next week too?', 'Do you take deposits?', 'Is there parking nearby?']))); 
    msgs.push(joy(l.lastInboundAt + int(20, 70) * 1000, pick(['Parking is free behind the salon on Chicago Ave. Anything else I can sort out?', 'Deposits are $40 and come off the final bill. Want me to hold the slot?', 'Sure, here are the next openings: Tue 11:00 am, Wed 2:00 pm, Fri 10:30 am.'])));
  } else if (l.status === 'needs_person') {
    msgs.push(guest(l.lastInboundAt - 3 * MIN, pick(['And how much for a toner on top?', 'Can I book with Elena specifically?', 'We would be a party of six, is that okay?', 'Hair is quite thin, will it be damaged?'])));
    msgs.push({ at: l.lastInboundAt - 2 * MIN, dir: 'out', by: 'joy', text: `I'm not certain about that, so I'm asking the team to reply to you personally. Your slot is still held.` });
    msgs.push({ at: l.lastInboundAt - 2 * MIN + 2000, dir: 'out', by: 'system', text: `Joy handed off: ${l.handoffReason ?? 'needs a person'}`, kind: 'handoff' });
  } else if (l.status === 'went_quiet') {
    msgs.push(joy(replyAt + 1 * DAY, `Hi ${f}, just checking in. Still thinking about ${svc.name.toLowerCase()}? I can hold a time for you.`)); msgs.push(joy(replyAt + 3 * DAY, `Last nudge from me, ${f}: our ${pick(['Tuesday','Thursday'])} openings go quickly. Reply any time.`));
  }
  const last = msgs[msgs.length - 1];
  return { id: `T-${l.id}`, leadId: l.id, channel: ch, messages: msgs.filter((m) => m.at <= NOW).sort((a, b) => a.at - b.at), unread: ((l.status === 'needs_person' || l.status === 'not_answered') && l.lastInboundAt > NOW - 3 * DAY) || (l.status === 'joy_handling' && last.dir === 'in' && l.lastInboundAt > NOW - 6 * HOUR) };
}
export const THREADS: Thread[] = LEADS.filter((l) => l.firstTouchAt > NOW - 30 * DAY).map(buildThread).sort((a, b) => b.messages[b.messages.length - 1].at - a.messages[a.messages.length - 1].at);
LEADS.forEach((l) => { const t = THREADS.find((x) => x.leadId === l.id); if (t) { const m = t.messages.filter((x) => x.by !== 'system').slice(-1)[0]; l.preview = m ? m.text : ''; if (t.messages.length) l.lastInboundAt = Math.max(l.lastInboundAt, t.messages.filter((x) => x.dir === 'in').slice(-1)[0]?.at ?? l.lastInboundAt); } });
export const thread = (leadId: string) => THREADS.find((t) => t.leadId === leadId);

// ---------------------------------------------------------------- ad spend
export const SPEND: SpendEntry[] = [];
for (let d = -59; d <= 0; d++) {
  const wk = [0.8, 0.85, 1.05, 1.05, 1.1, 1.15, 1.0][dow(atDay(d))];
  for (const c of CAMPAIGNS) {
    if (c.status === 'paused' && d > -34) continue;
    if (c.id === 'm-ext' && d < -40) continue;
    SPEND.push({ day: d, sourceId: c.sourceId, campaignId: c.id, amount: Math.round(c.dailyBudget * wk * jitter(1, 0.1) * 100) / 100 });
  }
}
