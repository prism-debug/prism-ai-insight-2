import { APPOINTMENTS, REQUESTS, CLIENTS, client } from './seed.ts';
import { NOW, atDay, dayIndex, MIN, HOUR, DAY } from './clock.ts';
import { SALON, SERVICES, STYLISTS, service, stylist } from './salon.ts';
import { hoursForDay } from './settings.ts';
import { freeGaps, startsFor, fmtMin, fmtDur, fmtGap, dayLabel, type Iv } from './bookings-core.ts';

export { REQUESTS, hoursForDay };
export const SYNC = { at: '9:30 am', note: 'Synced from Phorest at 9:30 am. Nothing goes back to Phorest until you approve it.' };
export const NOW_MIN = 9 * 60 + 41;
const minOfDay = (t: number) => Math.round((t - atDay(dayIndex(t))) / MIN);
// Short staff breaks are drawn only when they do not collide with a booking (Phorest does not send them; this is a demo layer).
export const BREAKS: Record<string, number> = { priya: 12 * 60 + 30, elena: 13 * 60, jules: 13 * 60, marcus: 13 * 60 + 30 };

export type ApptView = { id: string; name: string; clientId?: string; phone: string; consent: boolean; stylist: string; service: string; day: number; start: number; minutes: number; value: number; status: string; by: string; bookedAgo: string };
export const APPT_VIEWS: ApptView[] = APPOINTMENTS.filter((a) => dayIndex(a.start) >= -14 && dayIndex(a.start) <= 21).map((a) => {
  const c = a.clientId ? client(a.clientId) : undefined;
  return { id: a.id, name: a.name, clientId: a.clientId, phone: c?.phone ?? '', consent: c ? c.consentSms : true, stylist: a.stylistId, service: a.serviceId, day: dayIndex(a.start), start: minOfDay(a.start), minutes: a.minutes, value: a.value, status: a.status, by: a.bookedBy, bookedAgo: `${Math.max(1, Math.round((NOW - a.createdAt) / DAY))} d ago` };
});
const busy = (sid: string, day: number): Iv[] => APPT_VIEWS.filter((a) => a.stylist === sid && a.day === day && !['no_show'].includes(a.status)).map((a) => ({ s: a.start, e: a.start + a.minutes }));
export const gapsOf = (sid: string, day: number, from = 0) => freeGaps(hoursForDay(day), busy(sid, day), from);

export type Slot = { day: number; min: number; stylist: string };
export const slotLabel = (s: Slot) => `${dayLabel(s.day)} ${fmtMin(s.min)} with ${stylist(s.stylist).name.split(' ')[0]}`;

function suggest(r: (typeof REQUESTS)[number]) {
  const svc = service(r.serviceId); const sid = r.stylistId ?? 'elena';
  const reqs = r.requested.map((t) => ({ day: dayIndex(t), min: minOfDay(t) }));
  for (const q of reqs) {
    const open = hoursForDay(q.day);
    if (!open) continue;
    const starts = startsFor(gapsOf(sid, q.day), svc.minutes);
    if (starts.includes(q.min)) return { slot: { day: q.day, min: q.min, stylist: sid }, reason: `${stylist(sid).name.split(' ')[0]} is free ${fmtMin(q.min)} to ${fmtMin(q.min + svc.minutes)} and does ${svc.name.toLowerCase()}` };
  }
  const q = reqs[0]; const open = hoursForDay(q.day);
  for (let d = 0; d < 8; d++) {
    for (const day of [q.day + d, q.day - d]) {
      if (day < 1 || !hoursForDay(day)) continue;
      const starts = startsFor(gapsOf(sid, day), svc.minutes, 30);
      if (!starts.length) continue;
      const best = starts.reduce((a, b) => (Math.abs(b - q.min) < Math.abs(a - q.min) ? b : a));
      const why = !open ? `${dayLabel(q.day)} is a closed day` : `${service(r.serviceId).name} takes ${fmtDur(svc.minutes)} and does not fit around ${dayLabel(q.day)} ${fmtMin(q.min)}`;
      return { slot: { day, min: best, stylist: sid }, reason: `${why}; this is the nearest gap in ${stylist(sid).name.split(' ')[0]}'s day` };
    }
  }
  return { slot: null, reason: 'No gap found in the next week; pick a time by hand' };
}
function alternates(sid: string, minutes: number): Slot[] {
  const out: Slot[] = [];
  for (let day = 2; day < 14 && out.length < 6; day++) {
    const starts = startsFor(gapsOf(sid, day), minutes, 30);
    if (starts.length) out.push({ day, min: starts.find((m) => m >= 10 * 60) ?? starts[0], stylist: sid });
  }
  return out;
}
// Grouped by the REQUESTED date against NOW: the next open day counts as "tomorrow" when Sunday is closed.
const nextOpenDay = (() => { for (let d = 1; d < 8; d++) if (hoursForDay(d)) return d; return 1; })();
const bucketOf = (day: number): 'urgent' | 'week' | 'later' => (day <= nextOpenDay ? 'urgent' : day <= 7 ? 'week' : 'later');
export const REQUEST_VIEWS = REQUESTS.map((r) => {
  const svc = service(r.serviceId); const sg = r.status === 'pending' ? suggest(r) : { slot: null, reason: '' };
  const lead = r.leadId; void lead;
  const consent = !r.flags.includes('No text consent');
  return {
    ...r, svcName: svc.name, minutes: svc.minutes, price: svc.price, fromPrice: !!svc.fromPrice, consult: !!svc.consult || r.flags.includes('Needs consult'),
    stylistName: stylist(r.stylistId ?? 'elena').name, consent, waitMs: NOW - r.createdAt,
    reqLabels: r.requested.map((t) => `${dayLabel(dayIndex(t))} ${fmtMin(minOfDay(t))}`),
    reqClosed: r.requested.filter((t) => !hoursForDay(dayIndex(t))).map((t) => dayLabel(dayIndex(t)).split(',')[0]),
    awaiting: r.flags.includes('Booked by Joy, needs approval'),
    suggestion: sg.slot, suggestionLabel: sg.slot ? slotLabel(sg.slot) : '', reason: sg.reason,
    alts: alternates(r.stylistId ?? 'elena', svc.minutes).map((s) => ({ ...s, label: slotLabel(s) })),
    urgent: dayIndex(r.requested[0]) <= 4 && r.status === 'pending',
    bucket: bucketOf(r.requested.length ? dayIndex(r.requested[0]) : 99),
    firstDay: r.requested.length ? dayIndex(r.requested[0]) : null as number | null,
    flagSet: { deposit: r.flags.includes('Deposit required'), consult: !!svc.consult || r.flags.includes('Needs consult'), photos: r.flags.includes('Photos attached') },
    otherFlags: r.flags.filter((f) => !['Deposit required', 'Needs consult', 'Photos attached', 'No text consent', 'Booked by Joy, needs approval'].includes(f)),
  };
});
export type RequestView = (typeof REQUEST_VIEWS)[number];

export const NO_SHOWS = APPT_VIEWS.filter((a) => a.status === 'no_show').sort((a, b) => b.day - a.day || b.start - a.start).map((a) => {
  const c = a.clientId ? client(a.clientId) : undefined;
  const prior = c ? c.visits.length : 0;
  return { ...a, svcName: service(a.service).name, stylistName: stylist(a.stylist).name, prior, consent: c ? c.consentSms : false, next: c?.nextApptAt && c.nextApptAt > NOW ? c.nextApptAt : 0 };
});

export const UPCOMING = (() => {
  const days: { day: number; items: ApptView[]; closed: boolean }[] = [];
  for (let d = 0; d < 14; d++) {
    const items = APPT_VIEWS.filter((a) => a.day === d && !['checked_out', 'no_show'].includes(a.status)).sort((a, b) => a.start - b.start);
    const closed = !hoursForDay(d);
    if (items.length || closed) days.push({ day: d, items, closed });
  }
  return days;
})();

export const SCHEDULE_DATA = {
  today: 0, nowMin: NOW_MIN,
  stylists: STYLISTS.map((s) => ({ id: s.id, name: s.name, role: s.role, tone: s.tone, services: s.services })),
  services: SERVICES.map((s) => ({ id: s.id, name: s.name, minutes: s.minutes, price: s.price, consult: !!s.consult })),
  appts: APPT_VIEWS, breaks: BREAKS,
  hours: Object.fromEntries(Array.from({ length: 70 }, (_, i) => [i - 14, hoursForDay(i - 14)])),
  salon: SALON.name,
};
export const gapsSummary = (sid: string, day: number) => gapsOf(sid, day).map(fmtGap);
void HOUR; void CLIENTS;
