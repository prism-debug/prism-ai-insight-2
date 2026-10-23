// Salon setup fixtures: the files Prism asks for, the 11 setup sections, and what each one teaches Joy. Synthetic, for the Marlow & Finch demo.
import { SALON, SERVICES, STYLISTS, LOCATIONS } from './salon.ts';
import { POLICIES, FAQS } from './brand.ts';

export type SourceId = 'price' | 'policies' | 'brand' | 'team' | 'photos' | 'faq' | 'website' | 'phorest';
export type FactSrc = SourceId | 'answer';
export type Status = 'complete' | 'review' | 'todo' | 'waiting';

export interface Source {
  id: SourceId; kind: 'file' | 'link'; icon: string;
  label: string;      // "Price list or service menu"
  ask: string;        // "your price list", used in "Add your price list and Prism fills this in"
  why: string;
  accepts: string;
  keywords: string[];
  sample: { name: string; size: string; detail: string; facts: number };
  optional?: true;    // the booking system already covers it
  note?: string;
}

export const SOURCES: Source[] = [
  { id: 'phorest', kind: 'link', icon: 'calendar-sync', label: `${SALON.booking.system} booking system`, ask: `your ${SALON.booking.system} connection`, why: 'Brings in your services, prices, team and hours, read-only. Joy never books without it.', accepts: 'Sign in', keywords: [], sample: { name: SALON.booking.system, size: '', detail: `${SERVICES.length} services, ${STYLISTS.length} stylists, hours synced`, facts: 22 } },
  { id: 'website', kind: 'link', icon: 'globe', label: 'Your website', ask: 'your website', why: 'Prism reads it for services, parking, FAQs and your tone.', accepts: 'Web address', keywords: [], sample: { name: SALON.site, size: '', detail: '18 pages read', facts: 31 } },
  { id: 'policies', kind: 'file', icon: 'scroll-text', label: 'Salon policies', ask: 'your salon policies', why: 'Deposits, cancellations, late arrivals and patch tests.', accepts: 'PDF or Word', keywords: ['polic', 'cancel', 'terms', 'deposit', 'rules'], sample: { name: 'Studio policies.pdf', size: '98 KB', detail: '2 pages', facts: 18 } },
  { id: 'brand', kind: 'file', icon: 'palette', label: 'Brand guide or logo', ask: 'your brand guide or logo', why: 'Your colours, logo and the words you like to use.', accepts: 'PDF, SVG or PNG', keywords: ['brand', 'logo', 'guide', 'style'], sample: { name: 'Brand guide 2026.pdf', size: '3.4 MB', detail: '14 pages', facts: 18 } },
  { id: 'faq', kind: 'file', icon: 'message-circle-question', label: 'FAQs or aftercare notes', ask: 'your FAQs or aftercare notes', why: 'The answers your front desk gives every day.', accepts: 'PDF, Word or a pasted list', keywords: ['faq', 'aftercare', 'question', 'care'], sample: { name: 'Aftercare for extensions.docx', size: '64 KB', detail: '6 pages', facts: 14 } },
  { id: 'photos', kind: 'file', icon: 'image', label: 'Salon photos', ask: 'a few salon photos', why: 'Used on social posts and in Joy’s replies.', accepts: 'JPG, PNG or HEIC, as many as you like', keywords: ['photo', 'salon-', 'img'], sample: { name: 'Salon photos.zip', size: '28 MB', detail: '12 photos', facts: 12 } },
  { id: 'price', kind: 'file', icon: 'receipt', label: 'Price list or service menu', ask: 'your price list', why: 'Lets Prism cross-check menu prices and add-on wording.', accepts: 'PDF, photo of the menu or spreadsheet', keywords: ['price', 'menu', 'service', 'rate'], sample: { name: 'Price list autumn 2026.pdf', size: '212 KB', detail: '4 pages', facts: 24 }, optional: true, note: `${SALON.booking.system} already has your services and prices. Add a menu only if its wording or add-ons differ.` },
  { id: 'team', kind: 'file', icon: 'users', label: 'Team list or bios', ask: 'your team list', why: 'Bios and specialties Joy can mention to new guests.', accepts: 'Word, PDF or spreadsheet', keywords: ['team', 'staff', 'bio', 'stylist', 'roster'], sample: { name: 'Team bios.docx', size: '40 KB', detail: '4 pages', facts: 9 }, optional: true, note: `${SALON.booking.system} already has your team and schedules. Add bios only if you want Joy to describe each stylist.` },
];
export const FILE_SOURCES = SOURCES.filter((s) => s.kind === 'file');
export const REQUIRED_FILES = FILE_SOURCES.filter((s) => !s.optional);
export const OPTIONAL_FILES = FILE_SOURCES.filter((s) => s.optional);
export const LINK_SOURCES = SOURCES.filter((s) => s.kind === 'link');
export const src = (id: SourceId) => SOURCES.find((s) => s.id === id)!;
export const SRC_BADGE: Record<FactSrc, { label: string; icon: string }> = {
  price: { label: 'File', icon: 'file-text' }, policies: { label: 'File', icon: 'file-text' }, brand: { label: 'File', icon: 'file-text' },
  team: { label: 'File', icon: 'file-text' }, photos: { label: 'File', icon: 'image' }, faq: { label: 'File', icon: 'file-text' },
  website: { label: 'Website', icon: 'globe' }, phorest: { label: SALON.booking.system, icon: 'calendar-sync' }, answer: { label: 'You', icon: 'message-square' },
};

export interface Fact { text: string; src: FactSrc }
export interface Section {
  n: number; slug: string; title: string; feeds: string[]; minutes: number; total: number;
  sources: SourceId[];   // needed to fill the section
  extras?: SourceId[];   // optional files that add detail or cross-checks
  note: string;           // Joy's one-liner once filled
  facts: Fact[];
  asks: string[];         // "Joy will ask or escalate"
  conflicts?: { need: SourceId[]; short: string; text: string }[];
}

const gloss = SERVICES.find((s) => s.id === 'gloss')!;
const keratin = SERVICES.find((s) => s.id === 'keratin')!;
const balayage = SERVICES.find((s) => s.id === 'balayage')!;
const pb = SALON.booking.system;

export const SECTIONS: Section[] = [
  { n: 1, slug: 'salon-basics', title: 'Salon basics', feeds: ['Salon profile', 'Business info'], minutes: 5, total: 9, sources: ['website', 'phorest'],
    note: `${SALON.name}, ${LOCATIONS.length} locations, open five days. Free parking behind the building.`,
    facts: [
      { text: `${SALON.name}, colour, cuts and extensions, ${LOCATIONS.length} locations`, src: 'website' },
      { text: 'Open Tue to Sat, closed Sunday and Monday', src: 'phorest' },
      { text: 'Free two-hour parking behind the building', src: 'website' },
      { text: `Main line ${SALON.phone} matches ${pb}`, src: 'phorest' },
    ],
    asks: ['Holiday hours are not set, so Joy checks with the front desk'] },
  { n: 2, slug: 'brand-identity', title: 'Brand & identity', feeds: ['Website', 'Social', 'Joy'], minutes: 4, total: 7, sources: ['brand', 'photos'],
    note: 'Warm, expert, colour-led. Teal and copper palette, logo and 12 photos uploaded.',
    facts: [
      { text: 'Brand words: warm, expert, reassuring', src: 'brand' },
      { text: 'Primary colour teal #0F6B66 (brand guide, p2)', src: 'brand' },
      { text: 'Tagline: “Colour you’ll want to keep”', src: 'brand' },
      { text: '12 approved photos for social posts', src: 'photos' },
    ],
    asks: ['Press and collaboration requests go to the owner'] },
  { n: 3, slug: 'voice-tone', title: 'Voice & tone', feeds: ['Joy', 'Voice and tone'], minutes: 3, total: 9, sources: ['brand', 'website'],
    note: 'Friendly and concise, light emoji in DMs. Sign-off phrase not confirmed.',
    facts: [
      { text: 'Friendly, upbeat, short replies', src: 'brand' },
      { text: 'Often says “lived-in colour” and “gloss”', src: 'website' },
      { text: 'Light emoji in DMs, never on calls', src: 'answer' },
      { text: 'Signs off “See you soon, the M&F team”', src: 'website' },
    ],
    asks: ['Upset or complaining guests go to the manager right away', 'Joy never jokes about prices or results'],
    conflicts: [{ need: ['brand', 'website'], short: 'Sign-off phrase not confirmed', text: 'Your brand guide signs off “Love, Marlow & Finch”, your website says “See you soon”. Pick one.' }] },
  { n: 4, slug: 'services-pricing', title: 'Services & pricing', feeds: ['Joy', `Business info (${pb}, read-only)`], minutes: 4, total: SERVICES.length + 2, sources: ['phorest'], extras: ['price'],
    note: `${SERVICES.length} services from ${pb}. Your price list disagrees on 2 prices.`,
    facts: [
      { text: `${SERVICES.length} services with prices and durations from ${pb}`, src: 'phorest' },
      { text: `Balayage from $${balayage.price}, about ${balayage.minutes / 60} hours`, src: 'phorest' },
      { text: 'Colour quoted as “from” a price', src: 'answer' },
      { text: 'New colour guests book a free consult first', src: 'phorest' },
    ],
    asks: ['Colour corrections: offer a consult, never a price', `Any service not in ${pb}: hand off to the front desk`],
    conflicts: [{ need: ['price', 'phorest'], short: `2 price conflicts with ${pb}`, text: `${gloss.name}: menu says $${gloss.price + 5}, ${pb} says $${gloss.price}. ${keratin.name}: menu says $${keratin.price - 20}, ${pb} says $${keratin.price}. ${pb} wins until you update it.` }] },
  { n: 5, slug: 'team-stylists', title: 'Team & stylists', feeds: ['Team', 'Bookings'], minutes: 3, total: STYLISTS.length + 2, sources: ['phorest'], extras: ['team'],
    note: `${STYLISTS.length} stylists. Elena leads colour, Priya does extensions. Specialties mapped.`,
    facts: [
      { text: `${STYLISTS.length} stylists, schedules synced from ${pb}`, src: 'phorest' },
      { text: 'Elena handles all colour corrections', src: 'phorest' },
      { text: 'Priya is the only extensions specialist', src: 'phorest' },
      { text: 'Jules takes bridal trials up to a year ahead', src: 'team' },
    ],
    asks: ['When Elena is fully booked, offer the waitlist', 'Stylist complaints go to the owner'] },
  { n: 6, slug: 'policies-booking', title: 'Policies & booking rules', feeds: ['Joy', 'Booking rules'], minutes: 4, total: 10, sources: ['policies'],
    note: 'A $50 deposit holds colour and extensions. No-show fee not set.',
    facts: [
      { text: 'Colour, extensions and bridal need a $50 deposit', src: 'policies' },
      { text: 'Patch test 48 hours before first colour', src: 'policies' },
      { text: 'Free to cancel up to 24 hours before', src: 'policies' },
      { text: 'Late arrivals: 15 minutes grace', src: 'policies' },
    ],
    asks: ['Refund requests: always hand off', 'Allergy or skin reactions: hand off, never advise'],
    conflicts: [{ need: ['policies'], short: 'No-show fee not set', text: 'No-show fee is missing. Joy will not quote one until you set it.' }] },
  { n: 7, slug: 'website-channels', title: 'Website & channels', feeds: ['Website', 'Social', 'Inbox'], minutes: 2, total: 5, sources: ['website'],
    note: `${SALON.site} read, 18 pages. Instagram and Facebook linked.`,
    facts: [
      { text: '18 pages read: services, about, FAQ, policies', src: 'website' },
      { text: 'Blog posts left out of answers', src: 'website' },
      { text: 'Joy answers Instagram, Facebook and web chat', src: 'answer' },
      { text: `Booking link points to ${pb}`, src: 'phorest' },
    ],
    asks: ['Press and partnership messages: hand off to the owner'] },
  { n: 8, slug: 'faqs-escalation', title: 'FAQs & escalation', feeds: ['Joy', 'Escalation', 'Inbox'], minutes: 6, total: 8, sources: ['faq', 'website'],
    note: `${FAQS.length} FAQs drafted from your website and files, waiting for your review.`,
    facts: [
      { text: `${FAQS.length} FAQs drafted, none confirmed yet`, src: 'website' },
      { text: 'Extensions aftercare found in your notes', src: 'faq' },
      { text: 'Default hand-off: front desk, within 2 business hours', src: 'answer' },
    ],
    asks: ['Upset guests, refunds, allergy or medical questions', `Prices or services not in ${pb}`, 'Anyone who asks for a person'] },
  { n: 9, slug: 'knowledge-base', title: 'Knowledge base', feeds: ['Joy', 'Knowledge base'], minutes: 3, total: 6, sources: ['faq'],
    note: 'Your files, read and private to Marlow & Finch. Prices always come from the price table.',
    facts: [
      { text: 'Facts pulled from every file you added', src: 'faq' },
      { text: 'Aftercare: no washing for 48 hours after colour', src: 'faq' },
      { text: 'Extensions: brush twice a day, loop brush only', src: 'faq' },
    ],
    asks: ['Medical questions found in aftercare notes: never advise, hand off'] },
  { n: 10, slug: 'connections', title: 'Connections', feeds: ['Integrations', 'Calls', 'Social'], minutes: 3, total: 5, sources: ['phorest'],
    note: `${pb} connected. Phone number waiting on carrier approval (2 to 5 days).`,
    facts: [
      { text: `${pb} connected for all ${LOCATIONS.length} locations`, src: 'phorest' },
      { text: 'Joy can read services, team and open times', src: 'phorest' },
      { text: `Texting number ${SALON.phone} requested`, src: 'answer' },
    ],
    asks: ['Until texting is approved, Joy answers calls and DMs only', `Joy never says “booked” until ${pb} confirms`] },
  { n: 11, slug: 'review-go-live', title: 'Review & go live', feeds: ['Joy', 'Go live'], minutes: 5, total: 4, sources: [],
    note: 'Close the open gaps before Joy goes live.',
    facts: [
      { text: 'Every confirmed section, in one place', src: 'answer' },
      { text: `Services, team and availability live from ${pb}`, src: 'phorest' },
      { text: 'Your files, read and private to your salon', src: 'faq' },
    ],
    asks: ['Anything not confirmed in a section', `Bookings, until ${pb} confirms the slot`] },
];
export const section = (slug: string) => SECTIONS.find((s) => s.slug === slug);
export const fillsFor = (id: SourceId) => SECTIONS.filter((s) => s.sources.includes(id) || s.extras?.includes(id));

export const STATUS: Record<Status, { label: string; tone: 'good' | 'watch' | 'off' | 'violet'; cta: string }> = {
  complete: { label: 'Complete', tone: 'good', cta: 'View' },
  review: { label: 'Needs review', tone: 'watch', cta: 'Review' },
  todo: { label: 'Not started', tone: 'off', cta: 'Start' },
  waiting: { label: 'Waiting on provider', tone: 'violet', cta: 'View status' },
};

// Section-specific fixtures
export const BRAND_COLOURS = [
  { name: 'Teal', hex: '#0F6B66' }, { name: 'Copper', hex: '#C6784E' }, { name: 'Cream', hex: '#F6EFE6' }, { name: 'Ink', hex: '#17323A' },
];
export const BRAND_WORDS = [
  { label: 'Warm', on: true }, { label: 'Expert', on: true }, { label: 'Luxurious', on: false }, { label: 'Playful', on: false },
  { label: 'Eco-conscious', on: false }, { label: 'Reassuring', on: true }, { label: 'Inclusive', on: true },
];
export const VOICE_SLIDERS = [
  { label: 'Formality', lo: 'Casual', hi: 'Formal', v: 2 }, { label: 'Energy', lo: 'Calm', hi: 'Upbeat', v: 4 },
  { label: 'Emoji use', lo: 'None', hi: 'Lots', v: 2 }, { label: 'Message length', lo: 'Short', hi: 'Detailed', v: 2 },
];
export const WORDS_USE = ['Lived-in colour', 'Gloss', 'Refresh', 'Consultation'];
export const WORDS_AVOID = [{ label: 'Cheap', on: true }, { label: 'Discount', on: true }, { label: 'Fix', on: true }, { label: 'Damage', on: false }];
export const SERVICE_NOTES: Record<string, { note: string; check?: string }> = {
  balayage: { note: 'New guests book a free consultation first' },
  cut: { note: 'Ask if they want a blow-dry finish' },
  gloss: { note: 'Suggest with any colour. Lasts 4 to 6 weeks', check: `Menu says $${gloss.price + 5}` },
  correction: { note: 'Consult only. Never quote a price' },
  extensions: { note: 'Priya only. Consult first' },
  bridal: { note: 'Book up to a year ahead' },
  blowout: { note: '' },
  keratin: { note: 'No washing for 72 hours after', check: `Menu says $${keratin.price - 20}` },
};
export const STYLIST_SPECIALTIES: Record<string, { tags: string[]; level: string; bookable: boolean }> = {
  elena: { tags: ['Balayage', 'Colour correction'], level: 'Senior colourist', bookable: true },
  marcus: { tags: ['Precision cuts', 'Keratin'], level: 'Senior stylist', bookable: true },
  priya: { tags: ['Extensions', 'Blowouts'], level: 'Extensions specialist', bookable: true },
  jules: { tags: ['Bridal', 'Updos'], level: 'Stylist', bookable: false },
};
export const POLICY_FIELDS = [
  { label: 'Deposit for colour', value: '$50 at booking' },
  { label: 'Cancellation window', value: '24 hours' },
  { label: 'Late cancellation fee', value: '50% of service' },
  { label: 'No-show fee', value: '', missing: true },
];
export const BOOKING_TOGGLES = [
  { label: 'Patch test 48h before first colour', hint: 'Joy books the patch test before the colour appointment', on: true },
  { label: 'Children under 12', hint: 'Cuts only, with a parent or guardian present', on: true },
  { label: 'Late arrival grace period', hint: '15 minutes, then Joy offers to reschedule', on: true },
  { label: 'Waitlist when fully booked', hint: `Joy adds guests to the ${pb} waitlist`, on: true },
];
export const SITE_PAGES = [{ label: 'Services', on: true }, { label: 'About', on: true }, { label: 'FAQ', on: true }, { label: 'Policies', on: true }, { label: 'Gift cards', on: true }, { label: 'Blog', on: false }];
export const CHANNELS = [
  { label: 'Instagram DMs', hint: '@marlowfinch · connected', on: true },
  { label: 'Facebook Messenger', hint: `${SALON.name} · connected`, on: true },
  { label: 'Website chat', hint: 'Widget installed on 18 pages', on: true },
  { label: 'Text replies', hint: 'Waiting on carrier approval, turns on by itself', on: false, waiting: true },
];
export const FAQ_DRAFTS = FAQS.slice(0, 4).map((f, i) => ({ ...f, src: (['website', 'faq', 'website', 'policies'] as FactSrc[])[i] }));
export const HANDOFF_WHEN = [
  { label: 'Guest is upset', on: true }, { label: 'Colour correction', on: true }, { label: 'Refund request', on: true },
  { label: 'Allergy or medical', on: true }, { label: 'Price not in ' + pb, on: false }, { label: 'Asks for a person', on: true },
];
export const HANDOFF_TO = [{ label: 'Front desk', on: true }, { label: 'Manager', on: false }, { label: 'Owner', on: false }];
export const CONNECTIONS = [
  { id: 'phorest', name: pb, hint: 'Reads services, team and availability. Books only when ' + pb + ' confirms.', icon: 'calendar-sync', need: 'phorest' as SourceId },
  { id: 'sms', name: 'Phone and texting', hint: 'Number approved. Texting is under carrier review, usually 2 to 5 business days.', icon: 'phone', waiting: true },
  { id: 'ig', name: 'Instagram', hint: '@marlowfinch · DMs and comments', icon: 'camera', on: true },
  { id: 'fb', name: 'Facebook', hint: `${SALON.name} · Messenger`, icon: 'message-circle', on: true },
  { id: 'gbp', name: 'Google Business Profile', hint: 'Optional. Lets Joy answer Google messages.', icon: 'map-pin', on: false },
];
export const TEST_CHAT = [
  { q: 'How much is balayage?', a: `Balayage starts at $${balayage.price} and takes about ${balayage.minutes / 60} hours. Want me to check Elena’s openings this week?` },
  { q: 'Can I add a gloss?', a: `A gloss is $${gloss.price} and adds ${gloss.minutes} minutes. I can request Saturday at 10 am, and I’ll confirm once ${pb} books it.` },
  { q: 'Do I need a deposit?', a: POLICIES.deposit },
  { q: 'Where do I park?', a: 'Free two-hour parking behind the building, enter from Davis St.' },
];
