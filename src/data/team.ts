import { TEAM, STYLISTS, SALON, service } from './salon.ts';
import { CLIENTS } from './seed.ts';
import { NOW, DAY } from './clock.ts';

export const ROLES = ['Owner', 'Manager', 'Front desk', 'Stylist', 'Marketing partner'] as const;
export type Access = 'E' | 'V' | 'O' | '-';
export const ROLE_COPY: Record<string, { sees: string; can: string }> = {
  Owner: { sees: 'Everything, including money and billing', can: 'Edit all pages, invite people, delete records (soft)' },
  Manager: { sees: 'Everything except billing; Team and Settings are view only', can: 'Edit leads, clients, inbox, bookings, Brand Hub, Joy, forms' },
  'Front desk': { sees: 'Leads, Inbox, Bookings, Clients; Home without money', can: 'Reply, confirm booking requests, log outreach' },
  Stylist: { sees: 'Only their own clients, inbox threads and schedule', can: 'Work their own records; no marketing or money' },
  'Marketing partner': { sees: 'Marketing, Forms, Brand Hub; Home, Retention, Joy and Reviews view only', can: 'Edit campaigns, forms and Brand Hub; no client records' },
};
// From brain/03-architecture-and-flows.md. note = the qualifier kept from the source table.
export const MATRIX: { page: string; v: [Access, Access, Access, Access, Access]; notes?: Partial<Record<number, string>> }[] = [
  { page: 'Home', v: ['E', 'V', 'V', '-', 'V'], notes: { 2: 'no money' } },
  { page: 'Leads', v: ['E', 'E', 'E', 'O', 'V'] },
  { page: 'Client records', v: ['E', 'E', 'E', 'O', '-'] },
  { page: 'Inbox', v: ['E', 'E', 'E', 'O', '-'] },
  { page: 'Retention', v: ['E', 'E', 'V', 'O', 'V'] },
  { page: 'Marketing', v: ['E', 'V', '-', '-', 'E'] },
  { page: 'Reviews', v: ['E', 'E', 'E', '-', 'V'] },
  { page: 'Bookings', v: ['E', 'E', 'E', 'O', '-'] },
  { page: 'Brand Hub', v: ['E', 'E', 'V', 'V', 'E'] },
  { page: 'Joy', v: ['E', 'E', '-', '-', 'V'] },
  { page: 'Forms', v: ['E', 'E', '-', '-', 'E'] },
  { page: 'Connectors', v: ['E', 'V', '-', '-', 'V'], notes: { 4: 'Meta, Google only' } },
  { page: 'Team', v: ['E', 'V', '-', '-', '-'] },
  { page: 'Settings', v: ['E', 'V', '-', '-', '-'] },
  { page: 'Billing', v: ['E', '-', '-', '-', '-'] },
  { page: 'Ask Dash', v: ['E', 'E', 'V', '-', 'V'], notes: { 2: 'no money' } },
  { page: 'Export', v: ['E', 'E', '-', '-', 'V'], notes: { 4: 'marketing only' } },
  { page: 'Delete', v: ['E', 'E', '-', '-', '-'], notes: { 0: 'soft', 1: 'soft' } },
];
export const ACCESS_LABEL: Record<Access, string> = { E: 'Edit', V: 'View', O: 'Own records only', '-': 'Hidden' };

export const NOTIFY_PREFS = TEAM.filter((p) => p.role !== 'Marketing partner').map((p) => ({
  id: p.id, name: p.name,
  unanswered: ['Owner', 'Manager', 'Front desk'].includes(p.role),
  handoff: ['Manager', 'Front desk'].includes(p.role),
  missed: ['Owner', 'Front desk'].includes(p.role),
}));

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export function scorecards() {
  const rows = STYLISTS.map((s) => {
    const mine = CLIENTS.filter((c) => c.stylistId === s.id);
    const recent = mine.flatMap((c) => c.visits.filter((v) => v.t >= NOW - 90 * DAY));
    const cohort = mine.filter((c) => c.visits.some((v) => v.t >= NOW - 180 * DAY && v.t < NOW - 90 * DAY));
    const back = cohort.filter((c) => { const v = c.visits.filter((x) => x.t >= NOW - 180 * DAY && x.t < NOW - 90 * DAY).sort((a, b) => b.t - a.t)[0]; return c.visits.some((x) => x.t > v.t && x.t <= v.t + 90 * DAY); }).length;
    const booked = sum(mine.flatMap((c) => c.visits.filter((v) => v.t >= NOW - 28 * DAY).map((v) => service(v.serviceId).minutes)));
    const weeklyHours = sum(SALON.hours.map((h) => (h.open ? h.open[1] - h.open[0] : 0)));
    const capacity = weeklyHours * 4 * 60; // one chair, four weeks of opening hours
    const seen = mine.filter((c) => c.lastVisitAt >= NOW - 180 * DAY);
    const rebooked = seen.filter((c) => c.nextApptAt && c.nextApptAt > NOW).length;
    const lastVisitInWindow = mine.filter((c) => c.lastVisitAt >= NOW - 90 * DAY);
    return {
      id: s.id, name: s.name, role: s.role, clients: mine.length,
      back: cohort.length ? back / cohort.length : 0, backN: `${back} of ${cohort.length}`,
      ticket: recent.length ? sum(recent.map((v) => v.v)) / recent.length : 0, visits: recent.length,
      util: Math.min(1, booked / capacity), hours: Math.round(booked / 60),
      rebook: lastVisitInWindow.length ? lastVisitInWindow.filter((c) => c.nextApptAt && c.nextApptAt > NOW).length / lastVisitInWindow.length : 0,
      rebookN: `${lastVisitInWindow.filter((c) => c.nextApptAt && c.nextApptAt > NOW).length} of ${lastVisitInWindow.length}`,
    };
  });
  const avg = (k: 'back' | 'ticket' | 'util' | 'rebook') => sum(rows.map((r) => r[k])) / rows.length;
  return { rows, avg: { back: avg('back'), ticket: avg('ticket'), util: avg('util'), rebook: avg('rebook') } };
}
