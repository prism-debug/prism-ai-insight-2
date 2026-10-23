import { NAV_COUNTS } from '../data/metrics.ts';

export interface NavItem { key: string; label: string; href: string; icon: string; count?: number; hot?: boolean; key2?: string; progress?: boolean }
export const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Grow', items: [
    { key: 'onboarding', label: 'Salon setup', href: '/onboarding', icon: 'list-checks', key2: 'o', progress: true },
    { key: 'home', label: 'Home', href: '/', icon: 'house', key2: 'h' },
    { key: 'leads', label: 'Leads', href: '/leads', icon: 'trending-up', count: NAV_COUNTS.leads, key2: 'l' },
    { key: 'clients', label: 'Clients', href: '/clients', icon: 'heart', key2: 'c' },
    { key: 'inbox', label: 'Inbox', href: '/inbox', icon: 'message-square', count: NAV_COUNTS.inbox, key2: 'i' },
    { key: 'retention', label: 'Retention', href: '/retention', icon: 'repeat', key2: 'r' },
    { key: 'marketing', label: 'Marketing', href: '/marketing', icon: 'megaphone', key2: 'm' },
    { key: 'reviews', label: 'Reviews', href: '/reviews', icon: 'star', key2: 'v' },
  ] },
  { group: 'Run', items: [
    { key: 'bookings', label: 'Bookings', href: '/bookings', icon: 'calendar', count: NAV_COUNTS.bookings, key2: 'b' },
    { key: 'brand', label: 'Brand Hub', href: '/brand', icon: 'book-open', key2: 'k' },
    { key: 'forms', label: 'Forms', href: '/forms', icon: 'file-text', key2: 'f' },
    { key: 'joy', label: 'Joy', href: '/joy', icon: 'sparkles', key2: 'j' },
    { key: 'team', label: 'Team', href: '/team', icon: 'users', key2: 't' },
    { key: 'connectors', label: 'Connectors', href: '/connectors', icon: 'plug', key2: 'n' },
    { key: 'settings', label: 'Settings', href: '/settings', icon: 'settings', key2: 's' },
  ] },
];
export const ALL_NAV = NAV.flatMap((g) => g.items);
export const TABS = ['home', 'leads', 'inbox', 'clients'].map((k) => ALL_NAV.find((n) => n.key === k)!);
