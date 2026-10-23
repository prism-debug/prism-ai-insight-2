import type { Service, Stylist, Source, Campaign } from './types.ts';

// A fictitious salon. Not Refined Beauty, not any real business or person.
export const SALON = {
  name: 'Marlow & Finch',
  short: 'Marlow & Finch',
  place: 'Evanston, IL',
  tagline: 'Colour, cuts, extensions and bridal hair',
  phone: '(847) 555-0114',
  site: 'marlowfinch.example',
  address: '1412 Chicago Ave, Evanston, IL 60201',
  timezone: 'America/Chicago',
  booking: { system: 'Phorest', lastSync: '9:30 am', status: 'Connected' },
  plan: { name: 'Pro', price: 549, texts: { used: 812, cap: 1500 }, leads: { used: 139, cap: 300 }, minutes: { used: 186, cap: 1200 } },
  // weekday 0=Sun
  hours: [
    { d: 0, label: 'Sunday', open: null }, { d: 1, label: 'Monday', open: null },
    { d: 2, label: 'Tuesday', open: [10, 19] }, { d: 3, label: 'Wednesday', open: [10, 19] },
    { d: 4, label: 'Thursday', open: [10, 20] }, { d: 5, label: 'Friday', open: [10, 19] }, { d: 6, label: 'Saturday', open: [9, 17] },
  ] as { d: number; label: string; open: [number, number] | null }[],
};

// Company-level scope first, then each location. One entry means a single-location salon and the switcher renders as plain text.
export const LOCATIONS = [
  { id: 'evanston', name: 'Evanston', address: '1412 Chicago Ave' },
  { id: 'wicker-park', name: 'Wicker Park', address: '1650 N Milwaukee Ave' },
  { id: 'lincoln-park', name: 'Lincoln Park', address: '2210 N Halsted St' },
];

export const SERVICES: Service[] = [
  { id: 'balayage', name: 'Balayage', price: 240, minutes: 180, rebookDays: 84, category: 'Colour', fromPrice: true, consult: true },
  { id: 'cut', name: 'Cut & style', price: 85, minutes: 60, rebookDays: 42, category: 'Cut' },
  { id: 'gloss', name: 'Gloss & tone', price: 65, minutes: 45, rebookDays: 56, category: 'Colour' },
  { id: 'correction', name: 'Colour correction', price: 320, minutes: 240, rebookDays: 120, category: 'Colour', fromPrice: true, consult: true },
  { id: 'extensions', name: 'Hair extensions', price: 650, minutes: 210, rebookDays: 63, category: 'Extensions', fromPrice: true, consult: true },
  { id: 'bridal', name: 'Bridal trial', price: 150, minutes: 90, rebookDays: 365, category: 'Bridal' },
  { id: 'blowout', name: 'Blowout', price: 55, minutes: 45, rebookDays: 14, category: 'Cut' },
  { id: 'keratin', name: 'Keratin smoothing', price: 320, minutes: 150, rebookDays: 112, category: 'Treatment', fromPrice: true },
];
export const service = (id: string) => SERVICES.find((s) => s.id === id)!;

export const STYLISTS: Stylist[] = [
  { id: 'elena', name: 'Elena Rossi', role: 'Colour specialist', services: ['balayage', 'gloss', 'correction', 'cut'], chairs: 1, tone: 5 },
  { id: 'marcus', name: 'Marcus Bell', role: 'Cuts and styling', services: ['cut', 'blowout', 'gloss', 'keratin'], chairs: 1, tone: 4 },
  { id: 'priya', name: 'Priya Nair', role: 'Extensions', services: ['extensions', 'cut', 'blowout', 'keratin'], chairs: 1, tone: 2 },
  { id: 'jules', name: 'Jules Hartman', role: 'Bridal and updos', services: ['bridal', 'balayage', 'cut', 'blowout'], chairs: 1, tone: 3 },
];
export const stylist = (id: string) => STYLISTS.find((s) => s.id === id)!;

export const TEAM = [
  { id: 'casey', name: 'Casey Marlow', role: 'Owner', access: 'Everything', email: 'casey@marlowfinch.example', last: 'Active now', tone: 5 },
  { id: 'tamsin', name: 'Tamsin Ortiz', role: 'Manager', access: 'Everything except billing', email: 'tamsin@marlowfinch.example', last: 'Active now', tone: 1 },
  { id: 'devon', name: 'Devon Park', role: 'Front desk', access: 'Leads, Inbox, Bookings, Clients', email: 'devon@marlowfinch.example', last: '2 hours ago', tone: 3 },
  { id: 'elena', name: 'Elena Rossi', role: 'Stylist', access: 'Own clients and schedule', email: 'elena@marlowfinch.example', last: 'Today', tone: 5 },
  { id: 'marcus', name: 'Marcus Bell', role: 'Stylist', access: 'Own clients and schedule', email: 'marcus@marlowfinch.example', last: 'Yesterday', tone: 4 },
  { id: 'priya', name: 'Priya Nair', role: 'Stylist', access: 'Own clients and schedule', email: 'priya@marlowfinch.example', last: 'Today', tone: 2 },
  { id: 'jules', name: 'Jules Hartman', role: 'Stylist', access: 'Own clients and schedule', email: 'jules@marlowfinch.example', last: '3 days ago', tone: 3 },
  { id: 'sam', name: 'Sam Greer', role: 'Marketing partner', access: 'Marketing, Forms, Brand Hub', email: 'sam@northshoresocial.example', last: 'Yesterday', tone: 1 },
] as const;
export const OWNER = TEAM[0];
export const FRONT_DESK = ['tamsin', 'devon'] as const;
export const person = (id: string) => TEAM.find((t) => t.id === id);

export const SOURCES: Source[] = [
  { id: 'meta', name: 'Meta ads', type: 'ads', share: 0.38 },
  { id: 'google', name: 'Google Ads', type: 'ads', share: 0.2 },
  { id: 'ig', name: 'Instagram DM', type: 'organic', share: 0.13 },
  { id: 'phone', name: 'Phone call', type: 'phone', share: 0.11 },
  { id: 'form', name: 'Website form', type: 'form', share: 0.08 },
  { id: 'referral', name: 'Referral', type: 'referral', share: 0.06 },
  { id: 'knot', name: 'The Knot', type: 'directory', share: 0.04 },
];
export const source = (id: string) => SOURCES.find((s) => s.id === id)!;

export const CAMPAIGNS: Campaign[] = [
  { id: 'm-balayage', sourceId: 'meta', name: 'Balayage reel', status: 'active', dailyBudget: 40, objective: 'Messages' },
  { id: 'm-bridal', sourceId: 'meta', name: 'Bridal season', status: 'active', dailyBudget: 32, objective: 'Leads' },
  { id: 'm-ext', sourceId: 'meta', name: 'Extensions consult', status: 'learning', dailyBudget: 28, objective: 'Leads' },
  { id: 'g-near', sourceId: 'google', name: 'Hair salon near me', status: 'active', dailyBudget: 30, objective: 'Calls' },
  { id: 'g-balayage', sourceId: 'google', name: 'Balayage Evanston', status: 'active', dailyBudget: 24, objective: 'Calls' },
  { id: 'g-bridal', sourceId: 'google', name: 'Bridal hair Chicago North Shore', status: 'paused', dailyBudget: 12, objective: 'Calls' },
];
export const campaign = (id: string) => CAMPAIGNS.find((c) => c.id === id);

export const RECURRING = [
  { id: 'agency', name: 'Northshore Social · retainer', type: 'agency', monthly: 700 },
  { id: 'knot', name: 'The Knot listing', type: 'listing', monthly: 200, sourceId: 'knot' },
  { id: 'site', name: 'Website hosting and forms', type: 'website', monthly: 49 },
] as const;
