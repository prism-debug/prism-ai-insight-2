// Inbox view-model: one row per guest thread, plus call and voicemail detail derived from the seed.
// Uses its own hash-seeded generator so it never disturbs the shared rng stream in seed.ts.
import { THREADS, LEADS, APPOINTMENTS, CLIENTS } from './seed.ts';
import { mulberry32 } from './rng.ts';
import { NOW, atDay, dayIndex } from './clock.ts';
import { service, stylist, source, STYLISTS, SALON } from './salon.ts';
import { CUR, PRV } from './metrics.ts';
import { first, clock, dateShort, weekday } from '../lib/format.ts';
import { QUIET as QUIET_HOURS, shiftThread } from './leads.ts';
import type { Thread, Lead, Msg } from './types.ts';

const seedOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const rng = (s: string) => mulberry32(seedOf(s));

export const CHANNEL_ICON: Record<string, string> = { sms: 'message-square', instagram: 'camera', facebook: 'message-circle', phone: 'phone', form: 'file-text', email: 'mail', walk_in: 'user-round' };
export const CHANNEL_LABEL: Record<string, string> = { sms: 'Text', instagram: 'Instagram', facebook: 'Facebook', phone: 'Phone', form: 'Website form', email: 'Email', walk_in: 'Walk-in' };

export interface CallInfo { missed: boolean; sec: number; answeredBy?: string; outcome: string; summary: string; transcript: { who: 'Guest' | 'Team'; text: string }[]; wave: number[]; voicemail?: { sec: number; heard: boolean; heardBy?: string; transcript: string } }

function wave(key: string, n = 56): number[] {
  const r = rng(key); let v = 0.5;
  return Array.from({ length: n }, (_, i) => { v = Math.max(0.12, Math.min(1, v + (r() - 0.5) * 0.55)); return Math.round(v * (0.65 + 0.35 * Math.sin((i / n) * Math.PI)) * 100) / 100; });
}
export function callInfo(l: Lead, m: Msg): CallInfo {
  const r = rng(l.id + 'call'); const svc = service(l.serviceId); const f = first(l.name);
  if (!m.callSec) {
    const wantsVm = !/no voicemail/i.test(l.handoffReason ?? '') && r() < 0.45 && l.status !== 'needs_person';
    if (!wantsVm) return { missed: true, sec: 0, outcome: 'Missed. No voicemail left.', summary: 'Nobody picked up and the caller did not leave a message.', transcript: [], wave: [] };
    const sec = 14 + Math.floor(r() * 31);
    const heard = r() < 0.35;
    return { missed: true, sec, outcome: heard ? 'Voicemail, heard' : 'Voicemail, not heard yet', summary: `${f} left a voicemail about ${svc.name.toLowerCase()}.`, transcript: [], wave: wave(l.id + 'vm', 40),
      voicemail: { sec, heard, heardBy: heard ? 'Devon' : undefined, transcript: `Hi, this is ${f}. I was calling about ${svc.name.toLowerCase()}. Could someone call me back on this number? Thanks.` } };
  }
  const by = r() < 0.5 ? 'Devon Park' : 'Tamsin Ortiz';
  const booked = l.status === 'booked';
  const outcome = booked ? `Booked ${svc.name.toLowerCase()}` : l.status === 'went_quiet' ? 'Asked for pricing; no booking yet' : 'Follow-up text sent';
  return {
    missed: false, sec: m.callSec, answeredBy: by, outcome, wave: wave(l.id),
    summary: booked ? `${f} asked about ${svc.name.toLowerCase()}, was offered a slot and booked on the call.` : `${f} asked about ${svc.name.toLowerCase()} and availability. ${by.split(' ')[0]} offered options and said a text would follow.`,
    transcript: [
      { who: 'Team', text: `Thanks for calling ${SALON.name}, this is ${by.split(' ')[0]}.` },
      { who: 'Guest', text: `Hi, I'm interested in ${svc.name.toLowerCase()}. Do you have anything this week?` },
      { who: 'Team', text: `We do. ${svc.consult ? 'It starts with a short consult, ' : ''}I can send a couple of times by text if that's easier.` },
      { who: 'Guest', text: booked ? 'Let me book the first one, please.' : 'Yes please, text me.' },
    ],
  };
}

export interface Row {
  id: string; lead: Lead; thread: Thread; last: Msg; lastText: string; time: string; ts: number; unread: boolean; indicator: 'joy' | 'team' | null;
  filters: string[]; chan: string; call?: CallInfo; unheardVm: boolean; recent: boolean;
}
function listTime(t: number) {
  const d = dayIndex(NOW) - dayIndex(t);
  return d <= 0 ? clock(t) : d === 1 ? 'Yesterday' : d < 7 ? weekday(t) : dateShort(t);
}
export const ROWS: Row[] = THREADS.map((t0, i) => {
  const l = LEADS.find((x) => x.id === t0.leadId)!;
  const t = shiftThread(l, t0);
  const msgs = t.messages.filter((m) => m.by !== 'system');
  const last = msgs[msgs.length - 1] ?? t.messages[t.messages.length - 1];
  const out = [...msgs].reverse().find((m) => m.dir === 'out');
  const callMsg = t.messages.find((m) => m.kind === 'call');
  const call = callMsg ? callInfo(l, callMsg) : undefined;
  const lastText = last.kind === 'call' ? (call?.voicemail ? `Voicemail · ${call.voicemail.sec} s` : call?.missed ? 'Missed call' : `Call · ${Math.floor((call?.sec ?? 0) / 60)}:${String((call?.sec ?? 0) % 60).padStart(2, '0')}`) : last.text;
  const filters = ['all'];
  if (t.unread) filters.push('needs');
  if (l.status === 'joy_handling') filters.push('joy');
  if (t.channel === 'phone') filters.push('calls');
  if (t.channel === 'instagram') filters.push('instagram');
  if (t.channel === 'sms') filters.push('texts');
  return { id: l.id, lead: l, thread: t, last, lastText, time: listTime(last.at), ts: last.at, unread: t.unread, indicator: out ? (out.by === 'joy' ? 'joy' : out.by === 'team' ? 'team' : null) : null, filters, chan: t.channel, call, unheardVm: !!call?.voicemail && !call.voicemail.heard, recent: false };
}).sort((a, b) => b.ts - a.ts).map((r, i) => ({ ...r, recent: i < 40 }));
export type Group = 'needs' | 'joy' | 'done';
export const GROUPS: { key: Group; label: string }[] = [{ key: 'needs', label: 'Needs a reply' }, { key: 'joy', label: 'Handled by Joy' }, { key: 'done', label: 'Done' }];
export const groupOf = (r: Row): Group => (r.unread ? 'needs' : r.lead.status === 'joy_handling' ? 'joy' : 'done');
export const FILTERS = [
  { key: 'all', label: 'All' }, { key: 'needs', label: 'Needs reply' }, { key: 'joy', label: 'Joy handling' },
  { key: 'calls', label: 'Calls' }, { key: 'instagram', label: 'Instagram' }, { key: 'texts', label: 'Texts' },
].map((f) => ({ ...f, count: ROWS.filter((r) => r.filters.includes(f.key)).length }));

// stats strip
const calls = ROWS.filter((r) => r.call);
const missed = calls.filter((r) => r.call!.missed);
export const STATS = {
  needsReply: ROWS.filter((r) => r.unread).length,
  missedCalls: missed.length, callsTotal: calls.length, missedRate: calls.length ? missed.length / calls.length : 0, missedAim: 0.05,
  unheard: ROWS.filter((r) => r.unheardVm).length,
  joy: CUR.firstReplyJoy ?? 0, joyPrev: PRV.firstReplyJoy ?? 0, team: CUR.firstReplyTeam ?? 0, teamPrev: PRV.firstReplyTeam ?? 0,
};

// Dash-suggested reply (a draft, never sent without a person pressing Send)
const REASON_DRAFT: [RegExp, (f: string) => string][] = [
  [/toner/i, (f) => `Hi ${f}, good question. I'm checking the toner price with your stylist and will text you the exact figure today.`],
  [/stylist by name/i, (f) => `Hi ${f}, yes, I can book you with her. Which day suits you best?`],
  [/consult/i, (f) => `Hi ${f}, a quick 15-minute consult first is a good idea. Want me to find a time this week?`],
  [/group booking/i, (f) => `Hi ${f}, we can do a party of six. I'll check which day has enough chairs and come back to you this afternoon.`],
  [/upset/i, (f) => `Hi ${f}, I'm sorry about your last visit. I'd like to hear more and put it right. Can I call you today?`],
  [/damage|thin hair/i, (f) => `Hi ${f}, thin hair is common here and your colourist will plan around it. Shall we book a consult so she can see it first?`],
  [/move an existing/i, (f) => `Hi ${f}, no problem. Which day would you like instead? I'll move it now.`],
  [/refund/i, (f) => `Hi ${f}, I'm sorry about that. I'm looking at your visit now and will reply with what we can do today.`],
  [/voicemail|repeat caller/i, (f) => `Hi ${f}, sorry we missed your call. What can we help with? I can also call you back this morning.`],
];
export function suggestion(r: Row): string | null {
  const l = r.lead; const f = first(l.name); const svc = service(l.serviceId).name.toLowerCase();
  const sty = stylist(STYLISTS.find((s) => s.services.includes(l.serviceId))?.id ?? 'elena').name.split(' ')[0];
  if (l.status === 'joy_handling') return null;
  if (l.status === 'needs_person') { const hit = REASON_DRAFT.find(([re]) => re.test(l.handoffReason ?? '')); return hit ? hit[1](f) : `Hi ${f}, thanks for your patience. I'm picking this up personally and will reply here shortly.`; }
  if (l.status === 'not_answered') return `Hi ${f}, sorry for the wait. ${svc[0].toUpperCase() + svc.slice(1)} with ${sty} has openings this week. Want me to hold one for you?`;
  if (l.status === 'booked') return `Thanks ${f}! You're all set. Reply here any time if anything changes.`;
  return `Hi ${f}, still thinking about ${svc}? I can hold a time for you this week.`;
}
export const TEMPLATES = [
  { label: 'Opening hours', text: `We're open Tue to Fri 10 to 7 (Thu until 8) and Sat 9 to 5.` },
  { label: 'Deposit', text: `A $40 deposit holds your time and comes off your final bill.` },
  { label: 'Parking', text: `Parking is free behind the salon on Chicago Ave.` },
  { label: 'Consult first', text: `This service starts with a short consult so your stylist can see your hair. It's free and takes about 15 minutes.` },
  { label: 'Confirm booking', text: `You're booked! We'll text a reminder the day before.` },
];

export const apptOf = (l: Lead) => APPOINTMENTS.find((a) => a.leadId === l.id);
export const clientOf = (l: Lead) => CLIENTS.find((c) => c.id === l.clientId);
export const srcName = (l: Lead) => source(l.sourceId).name;
export const STATUS_LABEL: Record<string, string> = { not_answered: 'Not answered', joy_handling: 'Joy is handling', needs_person: 'Needs a person', booked: 'Booked', went_quiet: 'Went quiet' };
export const SCHEDULES = [
  { label: 'In 1 hour', at: NOW + 3600000 }, { label: 'Today 4:00 pm', at: atDay(0, 16) }, { label: 'Tuesday 10:00 am', at: atDay(3, 10) },
];
export const QUIET = QUIET_HOURS;
