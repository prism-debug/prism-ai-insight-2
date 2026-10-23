// Settings fixtures. Opening hours are the single source of truth: Joy, the phone line, forms and the schedule all read hoursForDay().
import { SALON } from './salon.ts';
import { weekdayOf, dayLabel } from './bookings-core.ts';

export const WEEK = SALON.hours.map((h) => ({ ...h }));
export type Exception = { id: string; label: string; rule: string; kind: 'closed' | 'hours'; hours?: [number, number]; from?: number; every?: number; dates?: number[]; weekday?: number };
// Day offsets are from Sat 10 Oct 2026.
export const EXCEPTIONS: Exception[] = [
  { id: 'alt-sat', label: 'Alternate Saturdays', rule: 'Every second Saturday from 31 Oct', kind: 'hours', hours: [9, 13], weekday: 6, from: 21, every: 14 },
  { id: 'thanks', label: 'Thanksgiving', rule: 'Thursday 26 Nov', kind: 'closed', dates: [47] },
  { id: 'xmas-eve', label: 'Christmas Eve', rule: 'Thursday 24 Dec, closes at 3 pm', kind: 'hours', hours: [10, 15], dates: [75] },
];
export function hoursForDay(offset: number): [number, number] | null {
  for (const e of EXCEPTIONS) {
    if (e.dates?.includes(offset)) return e.kind === 'closed' ? null : e.hours!;
    if (e.every && e.from !== undefined && offset >= e.from && (offset - e.from) % e.every === 0 && weekdayOf(offset) === e.weekday) return e.kind === 'closed' ? null : e.hours!;
  }
  return WEEK.find((h) => h.d === weekdayOf(offset))?.open ?? null;
}
export const hoursNote = (offset: number) => { const h = hoursForDay(offset); return h ? `${dayLabel(offset, 'long')}: open ${h[0] > 12 ? h[0] - 12 : h[0]}${h[0] >= 12 ? ' pm' : ' am'} to ${h[1] > 12 ? h[1] - 12 : h[1]}${h[1] >= 12 ? ' pm' : ' am'}` : `${dayLabel(offset, 'long')}: closed`; };

export const NOTIFY_EVENTS = [
  { id: 'unanswered', label: 'New lead not answered', why: 'After 5 minutes with no reply from Joy or the team', push: true, sms: true, email: false, to: 'Front desk' },
  { id: 'handoff', label: 'Joy hands a lead to a person', why: 'Always comes with a plain-English reason', push: true, sms: false, email: false, to: 'Front desk' },
  { id: 'missed', label: 'Missed call', why: 'When no one picks up and the caller leaves no voicemail', push: true, sms: true, email: false, to: 'Front desk' },
  { id: 'request', label: 'New booking request', why: 'From the website form, Joy or Instagram', push: true, sms: false, email: true, to: 'Front desk' },
  { id: 'review', label: 'Review under 4 stars', why: 'So the owner can reply the same day', push: true, sms: false, email: true, to: 'Owner' },
  { id: 'connector', label: 'A connector needs attention', why: 'A sign-in is about to expire or a sync failed', push: false, sms: false, email: true, to: 'Owner' },
];
export const INVOICES = [
  { id: 'INV-1010', date: 'Oct 1, 2026', amount: SALON.plan.price, status: 'Paid' },
  { id: 'INV-0910', date: 'Sep 1, 2026', amount: SALON.plan.price, status: 'Paid' },
  { id: 'INV-0810', date: 'Aug 1, 2026', amount: SALON.plan.price, status: 'Paid' },
  { id: 'INV-0710', date: 'Jul 1, 2026', amount: SALON.plan.price, status: 'Paid' },
  { id: 'INV-0610', date: 'Jun 1, 2026', amount: SALON.plan.price, status: 'Paid' },
];
export const AUDIT = [
  { who: 'Joy', what: 'Texted Maya Chen: held Thursday 4:00 pm with Elena', why: 'She asked for Thursday afternoon', t: 'Today 9:35 am', actor: 'joy' },
  { who: 'Tamsin Ortiz', what: 'Confirmed booking request R-8 (Lena Abbott)', why: '', t: 'Yesterday 4:12 pm', actor: 'team' },
  { who: 'PRISM', what: 'Read 38 appointments from Phorest', why: 'Scheduled sync, read-only', t: 'Today 9:30 am', actor: 'prism' },
  { who: 'Devon Park', what: 'Texted Dana Carver to rebook after a no-show', why: 'Consent on file', t: 'Yesterday 11:02 am', actor: 'team' },
  { who: 'Casey Marlow', what: 'Changed Saturday hours to 9 am to 5 pm', why: '', t: 'Oct 3, 2:20 pm', actor: 'team' },
  { who: 'Joy', what: 'Handed Priya Shah to the team', why: 'Asked about pricing for a colour correction', t: 'Oct 2, 10:18 am', actor: 'joy' },
  { who: 'Casey Marlow', what: 'Invited Sam Greer as Marketing partner', why: '', t: 'Sep 28, 9:05 am', actor: 'team' },
  { who: 'PRISM', what: 'Google Business Profile sign-in marked as expiring', why: 'Token expires in 6 days', t: 'Today 6:00 am', actor: 'prism' },
];
export const CONSENT_LOG = [
  { name: 'Noah Brooks', change: 'Opted in to texts', via: 'Website form', t: 'Oct 9, 4:41 pm' },
  { name: 'Grace Liu', change: 'Form submitted without text consent', via: 'Website form', t: 'Oct 10, 6:31 am' },
  { name: 'Hana Ito', change: 'Replied STOP', via: 'Text', t: 'Oct 8, 8:12 pm' },
  { name: 'Leah Hayes', change: 'Opted in to marketing texts', via: 'Front desk', t: 'Oct 6, 11:20 am' },
  { name: 'Maya Chen', change: 'Opted in to texts', via: 'Instagram DM link', t: 'Oct 10, 9:35 am' },
];

// Connectors. Never holds tokens or keys: only state, scopes and plain-English health.
export type Connector = {
  id: string; name: string; what: string; icon: string; state: 'connected' | 'warn' | 'off';
  health: string; checked: string; sync: string; readOnly?: boolean;
  scopes: string[]; parts?: { name: string; state: 'connected' | 'warn' | 'off'; note: string }[];
  events: { t: string; text: string; ok: boolean }[]; offNote?: string; plan?: boolean;
};
export const CONNECTORS: Connector[] = [
  { id: 'phorest', name: 'Phorest', what: 'Booking system', icon: 'calendar-check', state: 'connected', health: 'Connected · last checked 2 min ago', checked: '2 min ago', sync: 'Synced 9:30 am', readOnly: true,
    scopes: ['Read clients', 'Read appointments', 'Read services and stylists', 'Read opening hours'],
    events: [{ t: '9:30 am', text: 'Read 38 appointments and 6 new clients', ok: true }, { t: '9:00 am', text: 'Read 37 appointments', ok: true }, { t: '8:30 am', text: 'Read 37 appointments', ok: true }, { t: 'Yesterday 5:30 pm', text: 'Read 4 changed appointments', ok: true }, { t: 'Yesterday 5:00 pm', text: 'Read 4 changed appointments', ok: true }] },
  { id: 'meta', name: 'Meta', what: 'Instagram and Facebook messages, ads and ad tracking', icon: 'megaphone', state: 'connected', health: 'Connected · last checked 3 min ago', checked: '3 min ago', sync: 'Synced 9:38 am',
    scopes: ['Read and reply to page messages', 'Read Instagram messages', 'Read ad accounts and spend', 'Send booking events (Conversions API)'],
    parts: [{ name: 'Messages', state: 'connected', note: 'Instagram and Facebook messages reach Joy' }, { name: 'Ads', state: 'connected', note: '3 campaigns read' }, { name: 'Pixel and Conversions API', state: 'connected', note: 'Booking events sent' }],
    events: [{ t: '9:38 am', text: 'Read 3 new messages', ok: true }, { t: '9:35 am', text: 'Sent 1 booking event (Conversions API)', ok: true }, { t: '9:00 am', text: 'Read ad spend for yesterday', ok: true }, { t: '8:05 am', text: 'Read 2 new messages', ok: true }, { t: 'Yesterday 6:41 pm', text: 'Sent 2 booking events (Conversions API)', ok: true }] },
  { id: 'google', name: 'Google', what: 'Ads, Business Profile and Analytics', icon: 'search', state: 'warn', health: 'Business Profile sign-in expires in 6 days. Reviews and hours will stop syncing', checked: '2 min ago', sync: 'Synced 9:36 am',
    scopes: ['Read Google Ads spend and calls', 'Read and reply to Business Profile reviews', 'Read Business Profile hours and listing', 'Read Analytics events'],
    parts: [{ name: 'Ads', state: 'connected', note: '3 campaigns read' }, { name: 'Business Profile', state: 'warn', note: 'Token expiring in 6 days. Reviews and hours stop syncing after that' }, { name: 'Analytics', state: 'connected', note: 'Form and call events read' }],
    events: [{ t: '9:36 am', text: 'Read 2 new reviews from Business Profile', ok: true }, { t: '9:00 am', text: 'Read ad spend for yesterday', ok: true }, { t: '6:00 am', text: 'Business Profile sign-in marked as expiring in 6 days', ok: false }, { t: 'Yesterday 9:00 am', text: 'Read ad spend', ok: true }, { t: 'Yesterday 6:00 am', text: 'Read Analytics events', ok: true }] },
  { id: 'twilio', name: 'Twilio', what: "The salon's number and texting", icon: 'phone', state: 'connected', health: 'Connected · last checked 1 min ago', checked: '1 min ago', sync: 'Number (847) 555-0114',
    scopes: ['Send and receive texts on the salon number', 'Receive call events', 'Read registration status'],
    parts: [{ name: 'Number', state: 'connected', note: '(847) 555-0114 can text and call' }, { name: 'Texting registration (A2P 10DLC)', state: 'connected', note: 'Approved' }],
    events: [{ t: '9:35 am', text: 'Sent 1 text (consent on file)', ok: true }, { t: '9:12 am', text: 'Received 2 texts', ok: true }, { t: '8:51 am', text: 'Missed call logged, text-back sent', ok: true }, { t: 'Yesterday 7:20 pm', text: 'Received 1 text', ok: true }, { t: 'Yesterday 4:12 pm', text: 'Sent 3 texts (consent on file)', ok: true }] },
  { id: 'stripe', name: 'Stripe', what: "The salon's plan and deposits", icon: 'credit-card', state: 'connected', health: 'Connected · last checked 41 min ago', checked: '41 min ago', sync: 'Plan paid Oct 1',
    scopes: ['Read the subscription and invoices', 'Create deposit links'],
    events: [{ t: 'Oct 1, 6:00 am', text: 'Invoice INV-1010 paid', ok: true }, { t: 'Oct 1, 6:00 am', text: 'Renewed Pro plan', ok: true }, { t: 'Sep 29, 3:14 pm', text: 'Created a deposit link for a booking', ok: true }, { t: 'Sep 14, 11:02 am', text: 'Created a deposit link for a booking', ok: true }, { t: 'Sep 1, 6:00 am', text: 'Invoice INV-0910 paid', ok: true }] },
  { id: 'elevenlabs', name: 'ElevenLabs', what: "Joy's voice for phone calls", icon: 'mic', state: 'connected', health: 'Connected · last checked 1 min ago', checked: '1 min ago', sync: `${SALON.plan.minutes.used} of ${SALON.plan.minutes.cap.toLocaleString('en-US')} call minutes this month`,
    scopes: ['Turn Joy\'s replies into speech', 'Answer calls after the front desk has let them ring', 'Transcribe calls for the call log'],
    parts: [{ name: 'Voice', state: 'connected', note: 'Joy speaks as "Kathryn", warm and to the point' }, { name: 'Calls', state: 'connected', note: 'Answers on (847) 555-0114 after 3 rings and after hours' }],
    events: [{ t: '8:49 am', text: 'Call with (917) 555-0186 ended after 1 min 37 s, appointment booked', ok: true }, { t: '8:47 am', text: 'Answered a call after hours', ok: true }, { t: 'Yesterday 6:52 pm', text: 'Answered an after-hours call, booked a gloss and tone', ok: true }, { t: 'Yesterday 1:15 pm', text: 'Answered a call, passed it to the front desk', ok: true }, { t: 'Yesterday 11:40 am', text: 'Answered a call about parking', ok: true }] },
];
