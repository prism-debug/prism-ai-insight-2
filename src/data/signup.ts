// Pre-onboarding (signup) fixtures: who signs up, what kind of business, and which booking system they run on. The booking
// system is the one qualifying question: PRISM reads Phorest and Zenoti today, everything else goes on a waitlist.

export interface BookingSystem { id: string; name: string; icon: string; supported: boolean }
export const BOOKING_SYSTEMS: BookingSystem[] = [
  { id: 'phorest', name: 'Phorest', icon: 'calendar-sync', supported: true },
  { id: 'zenoti', name: 'Zenoti', icon: 'calendar-sync', supported: true },
  { id: 'fresha', name: 'Fresha', icon: 'calendar-days', supported: false },
  { id: 'vagaro', name: 'Vagaro', icon: 'calendar-days', supported: false },
  { id: 'boulevard', name: 'Boulevard', icon: 'calendar-days', supported: false },
  { id: 'mangomint', name: 'Mangomint', icon: 'calendar-days', supported: false },
  { id: 'mindbody', name: 'Mindbody', icon: 'calendar-days', supported: false },
  { id: 'square', name: 'Square Appointments', icon: 'calendar-days', supported: false },
  { id: 'booksy', name: 'Booksy', icon: 'calendar-days', supported: false },
  { id: 'glossgenius', name: 'GlossGenius', icon: 'calendar-days', supported: false },
];
// the three catch-alls at the bottom of the tile grid
export const BOOKING_OTHER = [
  { id: 'other', name: 'Something else', icon: 'pen-line', hint: 'Tell us which' },
  { id: 'none', name: 'Pen and paper, or none', icon: 'notebook-pen', hint: 'No booking software yet' },
  { id: 'unsure', name: 'Not sure', icon: 'circle-help', hint: 'We’ll sort it out together' },
];
export const bookingName = (id: string) => BOOKING_SYSTEMS.find((b) => b.id === id)?.name ?? BOOKING_OTHER.find((b) => b.id === id)?.name ?? id;
export const SUPPORTED = BOOKING_SYSTEMS.filter((b) => b.supported);

export const ROLES = ['Owner', 'Manager', 'Front desk', 'Stylist', 'Marketing partner'];
export const BUSINESS_TYPES = ['Salon', 'Med spa', 'Barbershop', 'Spa', 'Other'];

// personal mailboxes: allowed, but we don't guess a salon name from them
export const FREE_MAIL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'ymail.com', 'comcast.net', 'att.net'];

export const STEPS = [
  { id: 'email', label: 'Email', seconds: 15 },
  { id: 'you', label: 'You', seconds: 15 },
  { id: 'salon', label: 'Salon', seconds: 15 },
  { id: 'booking', label: 'Booking', seconds: 10 },
] as const;
export type StepId = (typeof STEPS)[number]['id'] | 'in' | 'list';
