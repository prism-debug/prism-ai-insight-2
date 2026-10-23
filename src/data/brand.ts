// Brand Hub fixtures: the structured facts Joy answers from. Synthetic, for the Marlow & Finch demo.
import { SALON, SERVICES, STYLISTS } from './salon.ts';

export const BUSINESS = {
  name: SALON.name,
  phone: SALON.phone,
  address: SALON.address,
  parking: 'Free two-hour parking behind the building (enter from Davis St). Metered street parking on Chicago Ave.',
  landmarks: 'Next to the Evanston Public Library, one block from the Davis St Metra station.',
  booking: `https://${SALON.site}/book`,
  tagline: SALON.tagline,
};

export const SERVICE_ROWS = SERVICES.map((s) => ({
  ...s,
  stylists: STYLISTS.filter((t) => t.services.includes(s.id)).map((t) => t.name),
}));

export const POLICIES = {
  cancellation: 'Free to change or cancel up to 24 hours before. Inside 24 hours, a fee of 50% of the service price.',
  deposit: 'A $50 deposit holds any colour, extensions or bridal appointment. It comes off the final bill.',
  late: 'We can wait 15 minutes. After that we may need to shorten or rebook the appointment.',
  noshow: 'No-shows lose their deposit, and we ask for a card to rebook.',
};

export const VOICE = {
  tones: [
    { label: 'Warm', on: true }, { label: 'Concise', on: true }, { label: 'Polished', on: false },
    { label: 'Playful', on: false }, { label: 'Expert', on: true }, { label: 'Reassuring', on: true },
  ],
  greeting: `Hi, it's Joy from ${SALON.name}. How can I help today?`,
  differentiators: [
    'Colour specialist on site five days a week',
    'Free 15-minute consult before any colour change',
    'Bridal trials booked up to a year ahead',
  ],
  never: ['Guarantee a result', 'Quote a price for a service that needs a consult', 'Comment on anyone’s hair health or appearance', 'Mention competitors by name'],
  offer: 'New clients get $20 off a first cut or gloss. Joy mentions it once, never twice in a thread.',
};

export interface Faq { id: string; q: string; a: string; used: number; last: string }
export const FAQS: Faq[] = [
  { id: 'f1', q: 'Do you take walk-ins?', a: 'We book mostly by appointment, but ask and we will fit you in if a chair is free.', used: 14, last: '2 days ago' },
  { id: 'f2', q: 'How long does balayage take?', a: 'Plan on about three hours. A consult first helps us give you an exact time.', used: 11, last: 'Yesterday' },
  { id: 'f3', q: 'Do you do bridal trials?', a: 'Yes. A trial is 90 minutes and we can book it up to a year before your date.', used: 9, last: '3 days ago' },
  { id: 'f4', q: 'Can I bring my own extensions?', a: 'We prefer to supply them so we can match the colour, but Priya can look at yours at a consult.', used: 6, last: '5 days ago' },
  { id: 'f5', q: 'Is there parking?', a: BUSINESS.parking, used: 22, last: 'Today' },
  { id: 'f6', q: 'What is your cancellation policy?', a: POLICIES.cancellation, used: 8, last: 'Yesterday' },
];

export interface Doc { id: string; name: string; kind: string; size: string; state: 'ready' | 'processing'; used: number; added: string }
export const DOCS: Doc[] = [
  { id: 'd1', name: 'Price list autumn 2026.pdf', kind: 'PDF', size: '212 KB', state: 'ready', used: 31, added: '2 Oct' },
  { id: 'd2', name: 'Bridal packages.pdf', kind: 'PDF', size: '1.4 MB', state: 'ready', used: 12, added: '18 Sep' },
  { id: 'd3', name: 'Aftercare for extensions.docx', kind: 'Word', size: '64 KB', state: 'ready', used: 5, added: '4 Sep' },
  { id: 'd4', name: 'Studio policies.pdf', kind: 'PDF', size: '98 KB', state: 'processing', used: 0, added: 'Today' },
];

export interface Gap { id: string; q: string; times: number; field: string; ph: string }
export const GAPS: Gap[] = [
  { id: 'g1', q: 'Price of a toner on top', times: 9, field: 'Price for toner on top', ph: 'For example $35' },
  { id: 'g2', q: 'Do you colour hair for children?', times: 4, field: 'Policy on children', ph: 'For example: from age 12, with a parent present' },
  { id: 'g3', q: 'Do you offer student discounts?', times: 4, field: 'Student discount', ph: 'For example: not offered' },
  { id: 'g4', q: 'Can I pay with Apple Pay?', times: 3, field: 'Payment methods', ph: 'For example: cards, Apple Pay, cash' },
  { id: 'g5', q: 'Do you do men’s colour?', times: 3, field: 'Men’s colour', ph: 'For example: yes, same prices' },
  { id: 'g6', q: 'Is the salon wheelchair accessible?', times: 2, field: 'Accessibility', ph: 'For example: step-free entrance on Davis St' },
];
