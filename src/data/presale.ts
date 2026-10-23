// Presale plans, word for word from the client's sales site (prism-ai/01-research/02-sales-site-read.md §2). Do
// not add terms the site does not state (billing period, cancellation, trials, guarantees).
//
// Checkout: each plan's Stripe Payment Link is read at build time from PUBLIC_STRIPE_LINK_ESSENTIAL,
// PUBLIC_STRIPE_LINK_GROWTH and PUBLIC_STRIPE_LINK_PRO (Netlify site settings, Environment variables). A plan with
// no link still saves the sign-up; the page then says a checkout link will follow by email.

export type PlanId = 'essential' | 'growth' | 'pro';

// one row of the allowance table; every plan has the same rows in the same order, so the cards line up
export interface Quota { label: string; value: string; included: boolean }

export interface Plan {
  id: PlanId;
  name: string;
  price: number;        // dollars a month, as the site shows it
  promise: string;
  popular?: boolean;
  quotas: [Quota, Quota, Quota, Quota];
  perks: string[];
  link: string;         // Stripe Payment Link, '' until it is set
}

const env = import.meta.env;
const link = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const PLANS: Plan[] = [
  {
    id: 'essential', name: 'Essential', price: 229, promise: 'Never miss a text lead.',
    quotas: [
      { label: 'Active leads a month', value: '100', included: true },
      { label: 'Texts a month', value: '1,000', included: true },
      { label: 'Instagram + Facebook', value: 'Not included', included: false },
      { label: 'AI call minutes a month', value: 'None', included: false },
    ],
    perks: ['AI text conversations', 'Instant lead response', 'Automatic follow-up', 'Booking assistance', 'Full marketing insights'],
    link: link(env.PUBLIC_STRIPE_LINK_ESSENTIAL),
  },
  {
    id: 'growth', name: 'Growth', price: 329, promise: 'Turn social conversations into bookings.', popular: true,
    quotas: [
      { label: 'Active leads a month', value: '200', included: true },
      { label: 'Texts a month', value: '1,500', included: true },
      { label: 'Instagram + Facebook', value: 'Included', included: true },
      { label: 'AI call minutes a month', value: 'None', included: false },
    ],
    perks: ['Everything in Essential', 'Social lead conversations', 'Cross-channel follow-up', 'Centralised lead inbox', 'Conversion reporting'],
    link: link(env.PUBLIC_STRIPE_LINK_GROWTH),
  },
  {
    id: 'pro', name: 'Pro', price: 549, promise: 'Give your salon a 24/7 AI front desk.',
    quotas: [
      { label: 'Active leads a month', value: '300', included: true },
      { label: 'AI texts a month', value: '1,500', included: true },
      { label: 'Instagram + Facebook', value: 'Included', included: true },
      { label: 'AI call minutes a month', value: '1,200', included: true },
    ],
    perks: ['Everything in Growth', 'AI phone answering', 'AI follow-up calls', 'Missed-call recovery', 'Booking through AI voice'],
    link: link(env.PUBLIC_STRIPE_LINK_PRO),
  },
];

export const DEFAULT_PLAN: PlanId = 'growth';

// the site's own line under the plans
export const OVERAGE = 'Have a busier month? No problem. Your plan keeps running and additional usage is billed separately.';

export const priceLabel = (p: Plan) => `$${p.price} / mo`;
