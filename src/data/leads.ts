// Leads area data: list model, timeline, score breakdown, duplicates. Deterministic; no Date.now().
import { LEADS, CLIENTS, APPOINTMENTS, REQUESTS, thread } from './seed.ts';
import type { Lead, LeadStatus, Msg } from './types.ts';
import { NOW, DAY, MIN, HOUR, atDay, dow, hourOf } from './clock.ts';
import { source, campaign, service, stylist, person, SALON, SERVICES, TEAM } from './salon.ts';
import { mulberry32 } from './rng.ts';
import { dur, first, money, clock, dateShort, dayShort } from '../lib/format.ts';

export const STATUS_ORDER: LeadStatus[] = ['not_answered', 'needs_person', 'joy_handling', 'went_quiet', 'booked'];
export const STATUS_LABEL: Record<LeadStatus, string> = { not_answered: 'Not answered', needs_person: 'Needs a person', joy_handling: 'Joy is handling', went_quiet: 'Went quiet', booked: 'Booked' };
export const STATUS_RULE: Record<LeadStatus, string> = {
  not_answered: 'Nobody has replied yet.',
  needs_person: 'Moving to Needs a person pauses Joy. She stops replying until you hand it back.',
  joy_handling: 'Moving to Joy is handling lets Joy reply to texts and DMs again, with a reason on every action.',
  went_quiet: 'Moving to Went quiet stops Joy’s follow-ups. You can win them back later.',
  booked: 'Moving to Booked marks this lead as a client and stops all follow-ups.',
};
export const OWNERS = [{ id: 'joy', name: 'Joy' }, { id: 'casey', name: 'Casey Marlow' }, { id: 'tamsin', name: 'Tamsin Ortiz' }, { id: 'devon', name: 'Devon Park' }];
export const ownerName = (id: string | null) => (id === null ? 'Unassigned' : id === 'joy' ? 'Joy' : person(id)?.name ?? id);
/** Who is dealing with a lead, from its status first: Joy only when she is handling it. */
/** Channels Joy covers: texts, Instagram, Facebook and web chat. */
export const JOY_CHANNELS = ['sms', 'instagram', 'facebook', 'webchat'];
export const JOY_PAUSED_WHY = 'Joy was paused or outside her hours for this guest';
export function handler(status: string, ownerId: string | null, channel?: string): { kind: 'joy' | 'person' | 'wait' | 'none' | 'paused' | 'dash'; name: string } {
  if (status === 'joy_handling') return { kind: 'joy', name: 'Joy' };
  if (status === 'not_answered') return channel && JOY_CHANNELS.includes(channel) ? { kind: 'paused', name: 'Joy paused' } : { kind: 'none', name: 'Nobody' };
  if (status === 'needs_person') return ownerId && ownerId !== 'joy' ? { kind: 'person', name: ownerName(ownerId).split(' ')[0] } : { kind: 'wait', name: 'Waiting for a person' };
  if (ownerId === 'joy') return { kind: 'joy', name: 'Joy' };
  return ownerId ? { kind: 'person', name: ownerName(ownerId).split(' ')[0] } : { kind: 'dash', name: '—' };
}
export const channelIcon = (c: string) => ({ phone: 'phone', instagram: 'camera', facebook: 'message-circle', form: 'file-text', email: 'mail', walk_in: 'footprints' } as Record<string, string>)[c] ?? 'message-square';
export const channelName = (c: string) => ({ phone: 'Phone call', instagram: 'Instagram DM', facebook: 'Facebook message', form: 'Website form', email: 'Email', walk_in: 'Walk-in', sms: 'Text' } as Record<string, string>)[c] ?? c;

// current 30-day window, plus a handful of older ones
export const WINDOW = LEADS.filter((l) => l.firstTouchAt > NOW - 30 * DAY);
const older = LEADS.filter((l) => l.firstTouchAt <= NOW - 30 * DAY);
export const OLDER = [...older.filter((l) => l.status === 'booked').slice(0, 5), ...older.filter((l) => l.status === 'went_quiet').slice(0, 3)];
export const DETAIL_LEADS = [...WINDOW, ...OLDER];

export const isWaiting = (l: Lead) => l.status === 'not_answered' || l.status === 'needs_person';
export const waitMs = (l: Lead) => (l.status === 'booked' ? NOW - l.firstTouchAt : NOW - l.lastInboundAt);
/** shortest unit for a wait: 12 min / 3 h / 2 d */
export function waitShort(ms: number): string { const a = Math.max(0, ms); if (a < HOUR) return `${Math.max(1, Math.round(a / MIN))} min`; if (a < DAY) return `${Math.floor(a / HOUR)} h`; return `${Math.floor(a / DAY)} d`; }
/** Quiet hours: same value as Settings (9 pm to 8 am). */
export const QUIET = { from: '9 pm', to: '8 am' };
const clockHour = (s: string) => { const h = parseInt(s, 10) % 12; return /pm/i.test(s) ? h + 12 : h; };
/** True when NOW falls inside quiet hours (computed from the QUIET constant). */
export const inQuietHours = (t = NOW) => { const h = hourOf(t), a = clockHour(QUIET.from), b = clockHour(QUIET.to); return a > b ? h >= a || h < b : h >= a && h < b; };
export const quietLine = () => inQuietHours() ? `Texts wait until ${QUIET.to} (quiet hours ${QUIET.from} to ${QUIET.to})` : `Texts allowed now (quiet hours ${QUIET.from} to ${QUIET.to})`;
/** Relative stamp: today at 9:27 am / yesterday at 4:10 pm / Tue at 2:00 pm / Oct 3 */
export function relStamp(t: number) {
  const d = Math.floor((t - atDay(0)) / DAY);
  return d === 0 ? `today at ${clock(t)}` : d === -1 ? `yesterday at ${clock(t)}` : d > -7 ? `${dayShort(t).split(',')[0]} at ${clock(t)}` : dateShort(t);
}
/** One definition of the saved views, used for tab counts and list contents. */
export const VIEW_TESTS: Record<string, (l: Lead) => boolean> = {
  needs: (l) => isWaiting(l), hot: (l) => l.score >= 70, after: (l) => l.afterHours, joybooked: (l) => l.status === 'booked' && l.firstReplyBy === 'joy', all: () => true,
};
export const viewCount = (id: string) => WINDOW.filter(VIEW_TESTS[id]).length;
/** Same order as the list: state group, then the longest wait first inside the waiting groups (oldest unanswered on top), newest first elsewhere. */
export const LIST_ORDER = [...WINDOW].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (isWaiting(a) ? a.lastInboundAt - b.lastInboundAt : b.lastInboundAt - a.lastInboundAt));
export const NEEDS_ORDER = LIST_ORDER.filter(isWaiting);
export const isLate = (l: Lead) => isWaiting(l) && waitMs(l) > 15 * MIN;
/** The three longest-waiting leads: the only rows that show the wait in red. */
export const URGENT = new Set([...WINDOW].filter(isLate).sort((a, b) => waitMs(b) - waitMs(a)).slice(0, 3).map((l) => l.id));
export const isUrgent = (l: Lead) => URGENT.has(l.id);
/** Joy has written a reply and is holding it for a person to send. */
export const joyHoldsDraft = (ev: Ev[]) => ev.some((e) => e.actorKind === 'joy' && /^Drafted a reply/.test(e.text));
export const topReason = (l: Lead) => l.scoreWhy[0] ?? 'Average interest';

export function nextStep(l: Lead): string {
  const f = first(l.name);
  switch (l.status) {
    case 'not_answered': return l.consentSms ? `Reply to ${f}` : `Call ${f} (no text consent)`;
    case 'needs_person': return l.handoffReason ? `Answer: ${l.handoffReason.toLowerCase()}` : `Reply to ${f}`;
    case 'joy_handling': return 'Joy is replying';
    case 'went_quiet': return `Win back with a text`;
    default: return l.apptId ? 'Appointment held' : 'Confirm the booking';
  }
}

export function listModel(l: Lead) {
  return {
    id: l.id, name: l.name, status: l.status, owner: l.ownerId, source: l.sourceId, service: l.serviceId, channel: l.channel,
    score: l.score, value: l.likelyValue, after: l.afterHours, sms: l.consentSms, promo: l.consentMarketing,
    firstBy: l.firstReplyBy, first: l.firstTouchAt, last: l.lastInboundAt, late: isUrgent(l),
  };
}

// ---- score breakdown (HubSpot-style): each factor adds or removes points, baseline balances to the stored score
export function scoreFactors(l: Lead) {
  const svc = service(l.serviceId); const f: { label: string; pts: number }[] = [];
  f.push({ label: `${svc.name} is ${svc.price >= 240 ? 'a big-ticket service' : svc.price >= 85 ? 'a mid-priced service' : 'a quick, low-priced service'}`, pts: Math.round(Math.min(26, svc.price / 650 * 26)) });
  if (l.sourceId === 'referral') f.push({ label: 'A friend sent them your way', pts: 16 });
  if (l.sourceId === 'knot') f.push({ label: 'Found you in a bridal directory, so they are planning', pts: 12 });
  if (l.sourceId === 'google') f.push({ label: 'Searched for you on Google', pts: 8 });
  if (l.firstReplyBy === 'joy') f.push({ label: 'Got a reply within a minute', pts: 8 });
  f.push({ label: l.touches === 1 ? 'Has been in touch once' : `Has been in touch ${l.touches} times`, pts: Math.min(14, l.touches * 2) });
  if (l.status === 'not_answered') { const w = NOW - l.lastInboundAt; f.push({ label: w > DAY ? 'Waited over a day, so interest is cooling' : 'Still waiting for a reply', pts: -Math.round(Math.min(30, w / HOUR / 3)) }); }
  if (l.status === 'went_quiet') f.push({ label: 'Stopped replying', pts: -22 });
  f.push(l.consentSms ? { label: 'OK to text about appointments', pts: 3 } : { label: 'Has not agreed to texts yet', pts: 0 });
  const sum = f.reduce((s, x) => s + x.pts, 0); const base = l.score - sum;
  if (Math.abs(base) >= 1) f.unshift({ label: base > 0 ? 'Every new enquiry starts with some credit' : 'Other things we know about them, taken together', pts: base });
  return f;
}
export const tier = (s: number) => (s >= 70 ? 'Hot' : s >= 40 ? 'Warm' : 'Cool');

// ---- possible duplicate: same last name AND same last 4 phone digits; otherwise none
const lastName = (n: string) => n.trim().split(/\s+/).slice(1).join(' ').toLowerCase();
const last4 = (p: string) => p.replace(/\D/g, '').slice(-4);
const sameKin = (a: { name: string; phone: string }, b: { name: string; phone: string }) => !!lastName(a.name) && lastName(a.name) === lastName(b.name) && last4(a.phone) === last4(b.phone);
export function duplicateOf(l: Lead): { name: string; href: string; why: string } | null {
  const o = LEADS.find((x) => x.id !== l.id && sameKin(x, l));
  if (o) return { name: o.name, href: `/leads/${o.id}`, why: `Same last name and phone ending ${last4(l.phone)}, asked ${dateShort(o.firstTouchAt)}` };
  const c = CLIENTS.find((x) => x.id !== l.clientId && sameKin(x, l));
  if (c) return { name: c.name, href: `/clients/${c.id}`, why: `Same last name and phone ending ${last4(l.phone)}, a client` };
  return null;
}

// ---- timeline
export type Ev = { at: number; kind: 'in' | 'out' | 'call' | 'form' | 'handoff' | 'booking' | 'note' | 'log' | 'system'; actor: string; actorKind: 'guest' | 'joy' | 'team' | 'system'; text: string; reason?: string; sub?: string };

const NOTES: Record<string, (l: Lead) => Ev[]> = {
  'Maya Chen': (l) => [{ at: l.firstTouchAt - 2 * MIN, kind: 'system', actor: 'Dash', actorKind: 'system', text: 'Maya clicked the Balayage reel ad, then opened the booking page twice before messaging.' }],
  'Priya Shah': (l) => [
    { at: l.firstTouchAt + 10 * MIN, kind: 'log', actor: 'Devon Park', actorKind: 'team', text: 'Called, no answer.', sub: 'Logged call' },
    { at: l.lastInboundAt - 2 * MIN, kind: 'note', actor: 'Tamsin Ortiz', actorKind: 'team', text: 'Third missed call this month, always about colour correction. Ask Elena for a consult slot before quoting.' },
  ],
  'Jordan Alvarez': (l) => [{ at: NOW - 40 * MIN, kind: 'note', actor: 'Casey Marlow', actorKind: 'team', text: 'Let Joy keep this one. Priya N. has a tape-in opening on the 21st if they ask for dates.' }],
  'Noah Patel': (l) => [
    { at: l.lastInboundAt + 6 * MIN, kind: 'note', actor: 'Tamsin Ortiz', actorKind: 'team', text: 'Party of 6 needs two stylists. Jules is free on the requested Saturday, check Elena before replying.' },
  ],
  'Grace Liu': (l) => [{ at: l.lastInboundAt + 20 * MIN, kind: 'log', actor: 'Devon Park', actorKind: 'team', text: 'Left a voicemail asking for text consent.', sub: 'Logged call' }],
};

function reasonFor(l: Lead, m: Msg, idx: number, msgs: Msg[]): string | undefined {
  if (m.by !== 'joy') return undefined;
  const svc = service(l.serviceId);
  const firstJoy = msgs.findIndex((x) => x.by === 'joy') === idx;
  if (firstJoy && idx > 0) return `First reply in ${dur(m.at - msgs[0].at)}${l.afterHours ? ', and the salon was closed' : ''}. ${svc.consult ? 'Brand Hub says this service starts with a consult.' : 'Brand Hub has open times for this service.'}`;
  if (/just checking in|Last nudge/.test(m.text)) return 'No reply after a day, so the Went quiet follow-up rule sent a nudge.';
  if (/Held for you/.test(m.text)) return 'Guest said yes to the slot. Brand Hub asks for a $40 deposit to confirm.';
  if (/not certain/.test(m.text)) return 'Asked something Brand Hub does not answer, so Joy handed over instead of guessing.';
  if (/Parking|Deposits are/.test(m.text)) return 'Answered from Brand Hub (parking and deposit policy).';
  if (/openings:/.test(m.text)) return 'Guest asked for availability. Times read from Bookings.';
  return 'Answered from Brand Hub.';
}

/** Rebase a thread so its last guest message lands on the lead's last inbound time (header, list and timeline agree). */
export function shiftThread<T extends { messages: Msg[] }>(l: Lead, t: T): T {
  const lastGuest = [...t.messages].reverse().find((m) => m.dir === 'in');
  const shift = lastGuest && l.status !== 'booked' && l.status !== 'went_quiet' && l.lastInboundAt > lastGuest.at ? l.lastInboundAt - lastGuest.at : 0;
  return shift ? { ...t, messages: t.messages.map((m) => ({ ...m, at: m.at + shift })) } : t;
}
function pickStylist(l: Lead) {
  const svc = service(l.serviceId); const req = REQUESTS.find((r) => r.name === l.name);
  return req?.stylistId ? stylist(req.stylistId) : stylist(['elena', 'marcus', 'priya', 'jules'].find((id) => stylist(id).services.includes(svc.id)) ?? 'elena');
}
function joyActions(l: Lead, base: number): Ev[] {
  const svc = service(l.serviceId); const sty = pickStylist(l); const f = first(l.name);
  const out: Ev[] = [
    { at: base + MIN + 2000, kind: 'system', actor: 'Joy', actorKind: 'joy', text: `Drafted a reply to ${f} and is holding it for you`, reason: svc.consult ? `${svc.name} starts with a consult, so Joy drafts and waits for a person to say go.` : 'Nobody has told Joy to reply to this lead yet, so she is holding a draft instead of sending.' },
    { at: base + MIN, kind: 'system', actor: 'Joy', actorKind: 'joy', text: `Found open times with ${sty.name.split(' ')[0]}`, reason: `Brand Hub lists ${sty.name.split(' ')[0]} for ${svc.name.toLowerCase()}. Times are read from Bookings, and nothing is held yet.` },
  ];
  if (svc.consult) out.push({ at: base + MIN + 1000, kind: 'system', actor: 'Joy', actorKind: 'joy', text: 'Tagged this lead “Needs consult”', reason: `Brand Hub marks ${svc.name.toLowerCase()} as consult-first, so a person should confirm the price.` });
  return out;
}

export function timeline(l0: Lead): Ev[] {
  const ev: Ev[] = [];
  // keep the thread consistent with the header: the last guest message is the last inbound touch
  const t0 = thread(l0.id);
  const lastGuest = t0 ? [...t0.messages].reverse().find((m) => m.dir === 'in') : undefined;
  const shift = lastGuest && l0.status !== 'booked' && l0.status !== 'went_quiet' && l0.lastInboundAt > lastGuest.at ? l0.lastInboundAt - lastGuest.at : 0;
  const l = { ...l0, firstTouchAt: l0.firstTouchAt + shift } as Lead;
  const sh = (m: Msg): Msg => ({ ...m, at: m.at + shift });
  const src = source(l.sourceId); const camp = l.campaignId ? campaign(l.campaignId) : undefined;
  ev.push({ at: l.firstTouchAt - 1, kind: 'system', actor: 'PRISM', actorKind: 'system', text: `${first(l.name)} found you through ${src.name}${camp ? ` · ${camp.name}` : ''}. Lead created.`, sub: l.afterHours ? 'After hours' : undefined });
  const t = t0 ? { ...t0, messages: t0.messages.map(sh) } : undefined;
  if (t) {
    t.messages.forEach((m, i, arr) => {
      const actor = m.by === 'guest' ? first(l.name) : m.by === 'joy' ? 'Joy' : m.by === 'team' ? (l.status === 'booked' || l.firstReplyBy === 'team' ? 'Front desk' : 'Team') : 'PRISM';
      if (m.kind === 'handoff') ev.push({ at: m.at, kind: 'handoff', actor: 'Joy', actorKind: 'joy', text: 'Handed this lead to your team', reason: l.handoffReason ?? 'Needs a person' });
      else if (m.kind === 'booking') ev.push({ at: m.at, kind: 'booking', actor: 'Bookings', actorKind: 'system', text: m.text, reason: l.apptId ? 'Appointment created in Bookings and synced to Phorest.' : undefined });
      else if (m.kind === 'call') ev.push({ at: m.at, kind: 'call', actor: first(l.name), actorKind: 'guest', text: m.text, sub: m.callSec ? `${Math.floor(m.callSec / 60)} min ${m.callSec % 60} s` : 'No voicemail' });
      else if (m.kind === 'form') ev.push({ at: m.at, kind: 'form', actor: first(l.name), actorKind: 'guest', text: m.text.replace(/^New-client form: [^.]*\.\s*/, '').replace(/^“|”$/g, ''), sub: `Form submission · ${service(l.serviceId).name}` });
      else ev.push({ at: m.at, kind: m.dir === 'in' ? 'in' : 'out', actor, actorKind: m.by === 'guest' ? 'guest' : m.by === 'joy' ? 'joy' : m.by === 'team' ? 'team' : 'system', text: m.text, reason: reasonFor(l, m, i, arr) });
    });
  } else {
    ev.push({ at: l.firstTouchAt, kind: l.channel === 'phone' ? 'call' : 'in', actor: first(l.name), actorKind: 'guest', text: `Asked about ${service(l.serviceId).name.toLowerCase()}.` });
    if (l.status === 'booked') ev.push({ at: l.firstTouchAt + 2 * HOUR, kind: 'booking', actor: 'Bookings', actorKind: 'system', text: `Booked · ${service(l.serviceId).name}`, reason: 'Older conversation. Messages are archived after 30 days.' });
    else ev.push({ at: l.lastInboundAt, kind: 'system', actor: 'Joy', actorKind: 'joy', text: 'Stopped follow-ups', reason: 'No reply after three nudges, so the lead moved to Went quiet.' });
  }
  const extra = NOTES[l.name]?.(l); if (extra) ev.push(...extra);
  if (l.status === 'not_answered' || (l.status === 'needs_person' && !ev.some((e) => e.kind === 'handoff'))) ev.push(...joyActions(l, l.lastInboundAt));
  return ev.filter((e) => e.at <= NOW).sort((a, b) => a.at - b.at);
}

export function dayLabel(t: number) {
  const d0 = (x: number) => Math.floor((x - atDay(0)) / DAY);
  const d = d0(t); return d === 0 ? 'Today' : d === -1 ? 'Yesterday' : dayShort(t);
}

// ---- summary line, banner copy, suggested reply, templates
export function summary(l: Lead): string {
  const svc = service(l.serviceId); const camp = l.campaignId ? campaign(l.campaignId) : undefined;
  const via = l.channel === 'phone' ? 'called' : l.channel === 'form' ? 'sent the form' : l.channel === 'email' ? 'emailed' : l.channel === 'instagram' ? 'messaged on Instagram' : 'texted';
  const when = dur(NOW - l.lastInboundAt) + ' ago';
  return `${first(l.name)} ${via} about ${svc.name.toLowerCase()} ${when}, from ${source(l.sourceId).name}${camp ? ` (${camp.name})` : ''}. Likely ${money(l.likelyValue)}, score ${l.score}.`;
}
/** The next 5 days the salon is open (after today), so offers are never limited to two fixed dates. */
export const OPEN_DAYS = (() => { const out: number[] = []; for (let o = 1; out.length < 5 && o < 14; o++) if (SALON.hours.find((h) => h.d === dow(atDay(o, 12)))?.open) out.push(o); return out; })();
function offerSlots(requested: number[] | undefined): string {
  const lo = atDay(OPEN_DAYS[0]), hi = atDay(OPEN_DAYS[OPEN_DAYS.length - 1] + 1);
  const picks = (requested ?? []).filter((t) => t >= lo && t < hi).slice(0, 2);
  const fill = [atDay(OPEN_DAYS[0], 11), atDay(OPEN_DAYS[2], 14), atDay(OPEN_DAYS[4], 10)];
  for (const t of fill) { if (picks.length >= 3) break; if (!picks.some((p) => Math.floor((p - atDay(0)) / DAY) === Math.floor((t - atDay(0)) / DAY))) picks.push(t); }
  picks.sort((a, b) => a - b);
  const txt = picks.map((t) => `${dayShort(t).replace(',', '')} at ${clock(t)}`);
  return txt.length > 1 ? `${txt.slice(0, -1).join(', ')} or ${txt[txt.length - 1]}` : txt[0];
}
export function suggestedReply(l: Lead): { text: string; why: string } {
  const f = first(l.name); const svc = service(l.serviceId); const req = REQUESTS.find((r) => r.name === l.name);
  const sty = req?.stylistId ? stylist(req.stylistId) : (stylist(['elena', 'marcus', 'priya', 'jules'].find((id) => stylist(id).services.includes(svc.id)) ?? 'elena'));
  const slots = offerSlots(req?.requested);
  if (l.status === 'went_quiet') return { text: `Hi ${f}, it's ${SALON.name}. Still thinking about ${svc.name.toLowerCase()}? ${sty.name.split(' ')[0]} has ${slots} open and I can hold one for you.`, why: 'Won back by offering a held time; no promotion, so no promo consent needed.' };
  if (l.status === 'needs_person') return { text: `Hi ${f}, it's the team at ${SALON.name}${l.channel === 'phone' ? ', sorry we missed your call' : ''}. I'm picking this up from Joy. ${sty.name.split(' ')[0]} has ${slots} for ${svc.name.toLowerCase()}. Which works for you?`, why: `Joy handed off: ${(l.handoffReason ?? 'needs a person').toLowerCase()}. Edit before sending.` };
  return { text: `Hi ${f}! Thanks for reaching out to ${SALON.name}. ${svc.name} ${svc.fromPrice ? `starts at ${money(svc.price)}` : `is ${money(svc.price)}`} (${Math.round(svc.minutes / 60 * 10) / 10} h)${svc.consult ? ' and begins with a short consult' : ''}. ${sty.name.split(' ')[0]} has ${slots} open. Want me to hold one?`, why: 'Price and length from Brand Hub; times from Bookings.' };
}
export function templates(l: Lead) {
  const f = first(l.name); const svc = service(l.serviceId);
  return [
    { label: 'Hold a time', text: `Hi ${f}, I can hold Tuesday at 11:00 am for ${svc.name.toLowerCase()}. Shall I book it?` },
    { label: 'Price range', text: `${svc.name} ${svc.fromPrice ? 'starts at' : 'is'} ${money(svc.price)}. Your stylist confirms the final price at the consult.` },
    { label: 'Ask for photos', text: `Could you send a photo of your hair in natural light? It helps us plan time and price.` },
    { label: 'Deposit link', text: `A $40 deposit confirms your time and comes off the final bill: pay.marlowfinch.example/d/${l.id.slice(2)}` },
  ];
}
export const tagChoices = ['Bridal party', 'Needs consult', 'After hours', 'Referral', 'Callback', 'VIP intro'];
export const lastTouch = (l: Lead) => `${channelName(l.channel)} · ${waitShort(NOW - l.lastInboundAt)} ago`;
export const relatedAppts = (l: Lead) => APPOINTMENTS.filter((a) => a.leadId === l.id);
export { SERVICES, TEAM };
