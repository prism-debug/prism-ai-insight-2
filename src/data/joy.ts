// Joy settings, sequences and activity. Counts derive from the lead cohort and the metrics module.
import { LEADS, APPOINTMENTS } from './seed.ts';
import { CUR } from './metrics.ts';
import { NOW, DAY, MIN, RANGE } from './clock.ts';
import { service, SALON } from './salon.ts';
import { winBackPool } from './metrics.ts';
import { dur, clock, stamp, first, ago } from '../lib/format.ts';

const week = LEADS.filter((l) => l.firstTouchAt > NOW - 7 * DAY);
const joyWeek = week.filter((l) => l.firstReplyBy === 'joy');

// 30-day window: the same definitions Home uses ('Joy, last 30 days').
const month = LEADS.filter((l) => l.firstTouchAt >= RANGE.start);
export const MONTH = {
  answered: CUR.joyCovered,
  total: CUR.leadsNew,
  booked: LEADS.filter((l) => l.status === 'booked' && l.firstReplyBy === 'joy' && l.firstTouchAt >= RANGE.start).length,
  handed: CUR.needsPerson,
  afterHours: month.filter((l) => l.firstReplyBy === 'joy' && l.afterHours).length,
  noConsent: month.filter((l) => !l.consentSms).length,
  median: CUR.firstReplyJoy ?? 0,
};

export const WEEK = {
  answered: joyWeek.length,
  total: week.length,
  booked: APPOINTMENTS.filter((a) => a.bookedBy === 'joy' && a.createdAt > NOW - 7 * DAY && a.createdAt <= NOW).length,
  handed: week.filter((l) => l.status === 'needs_person').length,
  afterHours: joyWeek.filter((l) => l.afterHours).length,
  handling: week.filter((l) => l.status === 'joy_handling').length,
  noConsent: week.filter((l) => !l.consentSms).length,
};

export interface Channel { id: string; label: string; icon: string; on: boolean; does: string; last: string; locked?: string }
export const CHANNELS: Channel[] = [
  { id: 'sms', label: 'Texts', icon: 'message-square', on: true, does: 'Answers questions from Brand Hub, offers open times and books.', last: `Offered 2 times to Maya Chen, 12 min ago` },
  { id: 'ig', label: 'Instagram messages', icon: 'camera', on: true, does: 'Replies to Instagram messages and story replies, then moves booking to text.', last: 'Replied to a message about balayage, 41 min ago' },
  { id: 'fb', label: 'Facebook messages', icon: 'message-circle', on: true, does: 'Replies to Messenger and lead-ad leads within seconds.', last: 'Texted a lead-ad lead, 1 h 20 m ago' },
  { id: 'calls', label: 'Calls', icon: 'phone', on: true, does: 'Picks up when the front desk has let it ring 3 times, and after hours. Books, offers add-ons, then texts and emails the guest.', last: 'Booked Rebecca Hale, 54 min ago' },
  { id: 'web', label: 'Web chat', icon: 'globe', on: true, does: `Chat bubble on ${SALON.site}. Collects a number before booking.`, last: 'Answered a parking question, yesterday 4:12 pm' },
  { id: 'mctb', label: 'Text back after a missed call', icon: 'phone-missed', on: true, does: 'Texts back within a minute when the desk misses a call.', last: 'Texted back Priya Shah, 38 min ago' },
];

export const CONSENT_LINE = 'Joy only texts people who agreed to appointment texts, never between 9 pm and 8 am, and stops the moment someone replies STOP.';

export interface Rule { id: string; when: string; why: string; on: boolean }
export const RULES: Rule[] = [
  { id: 'r1', when: 'A price is asked that is not in Brand Hub', why: 'Joy never guesses a price.', on: true },
  { id: 'r2', when: 'The guest asks for a stylist by name', why: 'Stylist diaries are the team’s call.', on: true },
  { id: 'r3', when: 'The message sounds upset or angry', why: 'A person should say sorry first.', on: true },
  { id: 'r4', when: 'A group booking of 4 or more', why: 'Needs chair planning.', on: true },
  { id: 'r5', when: 'Anything about a refund or a charge', why: 'Money questions go to a person.', on: true },
  { id: 'r6', when: 'The guest asks about hair health or damage', why: 'Needs a consult, not a text.', on: false },
];
export const NOTIFY = [
  { id: 'tamsin', name: 'Tamsin Ortiz', role: 'Manager' }, { id: 'devon', name: 'Devon Park', role: 'Front desk' }, { id: 'casey', name: 'Casey Marlow', role: 'Owner' },
];

export interface Step { day: number; channel: 'Text' | 'Email'; template: string; stopOnReply: boolean; stopOnBooking: boolean; quiet: boolean; consent: boolean; sent: number; replied: number; booked: number }
export interface Sequence { id: string; name: string; trigger: string; on: boolean; audience: number; steps: Step[] }

const noShows = APPOINTMENTS.filter((a) => a.status === 'no_show' && a.start > RANGE.start).length;
const checkedOut = APPOINTMENTS.filter((a) => a.status === 'checked_out' && a.start > RANGE.start).length;
const winPool = winBackPool().length;

function build(base: number, days: number[], texts: string[], rr: number[], br: number[], decay: number[]): Step[] {
  return days.map((day, i) => {
    const sent = Math.max(0, Math.round(base * decay[i]));
    const replied = Math.round(sent * rr[i]);
    return { day, channel: 'Text', template: texts[i], stopOnReply: true, stopOnBooking: true, quiet: true, consent: true, sent, replied, booked: Math.min(replied, Math.round(sent * br[i])) };
  });
}
export const SEQUENCES: Sequence[] = [
  { id: 'new-lead', name: 'New-lead follow-up', trigger: 'A new lead arrives and has not booked', on: true, audience: CUR.leadsNew, steps: build(CUR.leadsNew, [0, 1, 3, 5, 8, 13],
    ['Thanks for reaching out to Marlow & Finch. What are you hoping to book?', 'Just checking you saw our message. We have a few openings this week.', 'Here are two times that suit most people for {service}.', 'Still thinking it over? A free consult can help you decide.', 'We are holding your spot until Friday if you would like it.', 'Last note from us. Reply any time and we will pick it back up.'],
    [0.46, 0.18, 0.14, 0.1, 0.08, 0.05], [0.2, 0.08, 0.07, 0.05, 0.04, 0.02], [1, 0.78, 0.6, 0.46, 0.35, 0.27]) },
  { id: 'win-back', name: 'Win-back', trigger: 'A client is overdue by more than their usual gap', on: true, audience: winPool, steps: build(winPool, [0, 7, 21],
    ['Hi {first}, it has been a while. Want us to find you a time with {stylist}?', 'We have openings next week for {service}. Shall I hold one?', 'Last check-in from us. Your $20 welcome-back offer ends soon.'],
    [0.14, 0.08, 0.05], [0.07, 0.04, 0.02], [1, 0.8, 0.62]) },
  { id: 'review', name: 'Post-visit review request', trigger: 'Two hours after an appointment is checked out', on: true, audience: checkedOut, steps: build(checkedOut, [0, 3],
    ['Thanks for coming in today. If you loved it, a quick review helps a lot: {link}', 'No pressure, but if you have a minute, a review would mean a lot: {link}'],
    [0.12, 0.05], [0, 0], [0.9, 0.5]) },
  { id: 'no-show', name: 'No-show rescue', trigger: 'An appointment is marked no-show', on: false, audience: noShows, steps: build(noShows, [0, 2],
    ['We missed you today. Everything okay? Reply and we will find another time.', 'Want to rebook? We can hold a time this week.'],
    [0.3, 0.12], [0.18, 0.06], [1, 0.7]) },
];

export type EvType = 'replied' | 'offered' | 'booked' | 'handed' | 'followed' | 'paused';
export const EV_LABEL: Record<EvType, string> = { replied: 'Replied', offered: 'Offered times', booked: 'Booked', handed: 'Handed off', followed: 'Followed up', paused: 'Paused' };
export const EV_ICON: Record<EvType, string> = { replied: 'message-square', offered: 'clock', booked: 'calendar-check', handed: 'user-round', followed: 'repeat', paused: 'pause' };
export interface Ev { at: number; type: EvType; who: string; leadId: string; text: string; why: string }

const ev: Ev[] = [];
for (const l of LEADS.filter((x) => x.firstTouchAt > NOW - 7 * DAY)) {
  const svc = service(l.serviceId).name.toLowerCase();
  const rt = l.firstTouchAt + (l.firstReplyMs ?? 60_000);
  if (l.firstReplyBy === 'joy') {
    ev.push({ at: rt, type: 'replied', who: l.name, leadId: l.id, text: `Replied to ${first(l.name)} about ${svc}`, why: l.afterHours ? 'Sent after hours so the lead did not wait until morning' : 'First reply inside the speed-to-lead window' });
    if (l.status === 'joy_handling') ev.push({ at: Math.min(NOW - MIN, rt + 6 * MIN), type: 'offered', who: l.name, leadId: l.id, text: `Offered ${first(l.name)} two times for ${svc}`, why: 'Open chairs matched the stylists who do this service' });
  }
  if (l.status === 'needs_person') ev.push({ at: Math.min(NOW - MIN, l.lastInboundAt + 2 * MIN), type: 'handed', who: l.name, leadId: l.id, text: `Handed ${first(l.name)} to the team`, why: l.handoffReason ?? 'Needs a person' });
  if (l.status === 'went_quiet' && l.firstReplyBy === 'joy') ev.push({ at: Math.min(NOW - MIN, l.lastInboundAt + 26 * 60 * MIN), type: 'followed', who: l.name, leadId: l.id, text: `Sent day 1 follow-up to ${first(l.name)}`, why: 'New-lead follow-up, no reply to the first message' });
  if (!l.consentSms) ev.push({ at: Math.min(NOW - MIN, l.firstTouchAt + 3 * MIN), type: 'paused', who: l.name, leadId: l.id, text: `Did not text ${first(l.name)}`, why: 'No text consent on file. Joy waits for them to message first' });
}
for (const a of APPOINTMENTS.filter((x) => x.bookedBy === 'joy' && x.createdAt > NOW - 7 * DAY && x.createdAt <= NOW && x.leadId)) ev.push({ at: a.createdAt, type: 'booked', who: a.name, leadId: a.leadId!, text: `Booked ${first(a.name)} for ${service(a.serviceId).name.toLowerCase()}`, why: 'Guest picked one of the two times Joy offered' });
export const ACTIVITY: Ev[] = ev.sort((a, b) => b.at - a.at).slice(0, 80);
export const when = (t: number) => stamp(t);

export const PERSONA = {
  name: 'Joy',
  voice: ['Warm', 'Concise', 'Expert', 'Reassuring'],
  greeting: `Hi, it's Joy from ${SALON.name}. How can I help today?`,
  signoff: 'Reply STOP any time to opt out.',
};
export { dur, clock };

// last action per channel comes from the log, so the Overview and Activity agree
const rep = ACTIVITY.filter((e) => e.type === 'replied' || e.type === 'offered');
const lastOf = (i: number, fallback: string) => (rep[i] ? `${rep[i].text}, ${ago(rep[i].at)}` : fallback);
CHANNELS[0].last = lastOf(0, 'No texts yet');
CHANNELS[1].last = lastOf(2, 'No messages yet');
CHANNELS[2].last = lastOf(4, 'No messages yet');
CHANNELS[4].last = lastOf(7, 'No chats yet');
CHANNELS[5].last = lastOf(5, 'No missed calls yet');
