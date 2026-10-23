// Forms and quizzes. Funnel figures are derived from the lead cohort so pages agree.
import { LEADS } from './seed.ts';
import { NOW, DAY } from './clock.ts';
import { SALON } from './salon.ts';

const cur = LEADS.filter((l) => l.firstTouchAt > NOW - 30 * DAY);
const formLeads = cur.filter((l) => l.channel === 'form' || l.sourceId === 'form' || l.sourceId === 'knot');
const metaLeads = cur.filter((l) => l.sourceId === 'meta');
const bookedOf = (a: typeof cur) => a.filter((l) => l.status === 'booked').length;

export type FieldType = 'text' | 'phone' | 'email' | 'choice' | 'date' | 'longtext' | 'photo' | 'consent';
export interface Field { id: string; label: string; type: FieldType; required: boolean; options?: string[] }
export interface Form {
  id: string; name: string; kind: 'Form' | 'Quiz'; status: 'published' | 'draft' | 'test';
  is_test: boolean; utm: boolean; clickId: boolean; pixel: string; consentAppt: boolean; consentPromo: boolean;
  views: number; started: number; submitted: number; booked: number;
  fields: Field[]; confirm: string; blurb: string; updated: string;
}

export const CONSENT_APPT = `I agree to receive appointment texts from ${SALON.name}, such as confirmations and reminders. Message frequency varies. Msg and data rates may apply. Reply STOP to opt out, HELP for help.`;
export const CONSENT_PROMO = `I agree to receive promotional texts from ${SALON.name}, such as offers and news. Consent is not a condition of purchase. Message frequency varies. Msg and data rates may apply. Reply STOP to opt out, HELP for help.`;

const F = (id: string, label: string, type: FieldType, required = false, options?: string[]): Field => ({ id, label, type, required, options });
const base = () => [F('name', 'Your name', 'text', true), F('phone', 'Mobile number', 'phone', true), F('email', 'Email', 'email')];
const consent = () => [F('c1', 'Appointment texts', 'consent', true), F('c2', 'Offers and news by text', 'consent', false)];
const mk = (n: number, rate: number) => { const submitted = Math.max(1, n); return { submitted, started: Math.round(submitted / rate) }; };
const s1 = mk(formLeads.length, 0.62), s2 = mk(Math.round(cur.length * 0.07), 0.55), s3 = mk(Math.round(cur.length * 0.05), 0.5), s5 = mk(metaLeads.length, 0.8);

export const FORMS: Form[] = [
  { id: 'booking-request', name: 'Booking request', kind: 'Form', status: 'published', is_test: false, utm: true, clickId: true, pixel: 'Meta pixel and Google tag', consentAppt: true, consentPromo: true,
    views: Math.round(s1.started / 0.34), ...s1, booked: bookedOf(formLeads), updated: '3 Oct',
    blurb: 'Pick a service and a day that suits you. We confirm by text.', confirm: 'Thanks. We have your request and will text you within the hour to confirm a time.',
    fields: [...base(), F('service', 'Service', 'choice', true, ['Cut & style', 'Balayage', 'Gloss & tone', 'Hair extensions', 'Bridal trial']), F('when', 'Preferred day', 'date'), F('notes', 'Anything we should know?', 'longtext'), ...consent()] },
  { id: 'new-client-quiz', name: 'New-client quiz', kind: 'Quiz', status: 'published', is_test: false, utm: true, clickId: true, pixel: 'Meta pixel', consentAppt: true, consentPromo: true,
    views: Math.round(s2.started / 0.58), ...s2, booked: Math.max(1, Math.round(s2.submitted * 0.22)), updated: '28 Sep',
    blurb: 'A few quick questions and we will suggest the right first appointment.', confirm: 'Thanks. Check your texts: we have a suggestion and two times to choose from.',
    fields: [F('goal', 'What are you hoping to change?', 'choice', true, ['A fresh cut', 'Colour', 'Longer hair', 'A special event']), F('length', 'Hair length now', 'choice', true, ['Short', 'Shoulder', 'Long']), F('last', 'Last colour or cut', 'choice', false, ['This month', '1 to 3 months', 'Over 3 months', 'Never coloured']), ...base(), ...consent()] },
  { id: 'bridal-inquiry', name: 'Bridal inquiry', kind: 'Form', status: 'published', is_test: false, utm: true, clickId: false, pixel: 'Meta pixel', consentAppt: true, consentPromo: false,
    views: Math.round(s3.started / 0.46), ...s3, booked: Math.max(1, Math.round(s3.submitted * 0.3)), updated: '21 Sep',
    blurb: 'Tell us about the day and we will plan your trial.', confirm: 'Thank you. Jules will be in touch about your trial within one working day.',
    fields: [...base(), F('date', 'Wedding date', 'date', true), F('party', 'People having hair done', 'choice', true, ['Just me', '2 to 4', '5 or more']), F('photo', 'Inspiration photo', 'photo'), F('c1', 'Appointment texts', 'consent', true)] },
  { id: 'extensions-consult', name: 'Extensions consult', kind: 'Form', status: 'draft', is_test: false, utm: false, clickId: false, pixel: 'None yet', consentAppt: true, consentPromo: false,
    views: 0, started: 0, submitted: 0, booked: 0, updated: '6 Oct',
    blurb: 'Book a free consult with Priya to plan your extensions.', confirm: 'Thanks. Priya will text you to set up your consult.',
    fields: [...base(), F('length', 'What do you want?', 'choice', true, ['Add length', 'Add volume', 'Both']), F('photo', 'Photo of your hair now', 'photo'), F('c1', 'Appointment texts', 'consent', true)] },
  { id: 'meta-lead-ad', name: 'Meta lead ad form', kind: 'Form', status: 'published', is_test: false, utm: false, clickId: true, pixel: 'Meta pixel (lead event)', consentAppt: true, consentPromo: true,
    views: Math.round(s5.started / 0.7), ...s5, booked: bookedOf(metaLeads), updated: '1 Oct',
    blurb: 'Form shown inside the Facebook and Instagram ad.', confirm: 'Thanks. Joy will text you in a moment.',
    fields: [F('name', 'Full name', 'text', true), F('phone', 'Phone', 'phone', true), F('service', 'Interested in', 'choice', false, ['Balayage', 'Bridal', 'Extensions', 'Cut & style']), ...consent()] },
  { id: 'test-quiz', name: 'Hair type quiz', kind: 'Quiz', status: 'test', is_test: true, utm: false, clickId: false, pixel: 'None', consentAppt: false, consentPromo: false,
    views: 41, started: 22, submitted: 9, booked: 0, updated: 'Today',
    blurb: 'Internal test. Not counted in any metric.', confirm: 'Test submitted.',
    fields: [F('type', 'Hair type', 'choice', true, ['Straight', 'Wavy', 'Curly', 'Coily']), F('name', 'Name', 'text')] },
];
export const form = (id: string) => FORMS.find((f) => f.id === id)!;
export const funnel = (f: Form) => {
  const steps: [string, number][] = [['Viewed', f.views], ['Started', f.started], ['Submitted', f.submitted], ['Booked', f.booked]];
  return steps.map(([label, n], i) => ({ label, n, drop: i === 0 || !steps[i - 1][1] ? null : Math.round((1 - n / steps[i - 1][1]) * 100) }));
};
export const counted = () => FORMS.filter((f) => !f.is_test);
export const FIELD_TYPES: Record<FieldType, string> = { text: 'Short text', phone: 'Phone', email: 'Email', choice: 'Choice', date: 'Date', longtext: 'Long text', photo: 'Photo upload', consent: 'Consent checkbox' };
