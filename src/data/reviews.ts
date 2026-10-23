// Reviews: Google reviews for the fictitious salon. All reviewers, texts and counts are synthetic.
import { APPOINTMENTS, CLIENTS, LEADS } from './seed.ts';
import { NOW, DAY, atDay, dayIndex } from './clock.ts';
import { service, stylist, SALON } from './salon.ts';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// ---- 12 months of star counts [1,2,3,4,5 stars]. October is the first 10 days.
export const MONTHS12: { label: string; stars: number[] }[] = [
  ['Nov', [0, 0, 1, 3, 11]], ['Dec', [0, 1, 0, 4, 12]], ['Jan', [1, 0, 1, 3, 13]], ['Feb', [0, 0, 2, 4, 12]], ['Mar', [0, 1, 1, 5, 15]], ['Apr', [1, 0, 1, 4, 16]],
  ['May', [0, 1, 2, 5, 18]], ['Jun', [1, 0, 1, 6, 20]], ['Jul', [0, 1, 1, 5, 17]], ['Aug', [0, 0, 2, 4, 16]], ['Sep', [1, 1, 1, 5, 19]], ['Oct', [0, 1, 0, 2, 6]],
].map(([label, stars]) => ({ label: label as string, stars: stars as number[] }));
export const TREND = MONTHS12.map((m) => { const n = sum(m.stars); return { label: m.label, n, avg: sum(m.stars.map((c, i) => c * (i + 1))) / n }; });
export const SPLIT = [5, 4, 3, 2, 1].map((s) => ({ stars: s, n: sum(MONTHS12.map((m) => m.stars[s - 1])) }));
export const TOTAL = sum(SPLIT.map((s) => s.n));
export const AVG = sum(SPLIT.map((s) => s.stars * s.n)) / TOTAL;

export interface Review {
  id: string; name: string; stars: number; daysAgo: number; text: string; serviceId: string; stylistId: string | null;
  replied: boolean; reply?: string; viaRequest: boolean; issue?: string;
}
const R = (id: string, name: string, stars: number, daysAgo: number, serviceId: string, stylistId: string | null, text: string, o: Partial<Review> = {}): Review =>
  ({ id, name, stars, daysAgo, text, serviceId, stylistId, replied: false, viaRequest: false, ...o });
const thanks = (n: string, who: string) => `Thank you, ${n}! ${who} will be so happy to read this. See you next time. Casey`;

export const REVIEWS: Review[] = [
  R('rv-1', 'Hannah L.', 5, 0, 'balayage', 'elena', 'Elena listened for twenty minutes before she touched my hair and the colour is exactly what I showed her. So soft. Booked my next one on the way out.', { viaRequest: true }),
  R('rv-2', 'Odette M.', 4, 1, 'cut', 'marcus', 'Great cut and Marcus is lovely. Ran about fifteen minutes behind, but he apologised and it was worth the wait.', { viaRequest: true }),
  R('rv-3', 'Tasha R.', 2, 2, 'extensions', 'priya', 'Love the length but the consult took far longer than I was told and nobody explained the aftercare. I left not sure how to wash them.', { issue: 'the consult ran long and the aftercare was not explained', viaRequest: false }),
  R('rv-4', 'Imani B.', 5, 3, 'keratin', 'marcus', 'My frizz is gone. Marcus walked me through every step and the salon smells amazing.', { viaRequest: true }),
  R('rv-5', 'Keira S.', 5, 4, 'bridal', 'jules', 'Jules did my bridal trial and I cried a little. The team made the whole morning easy. Booking the wedding date now.', { viaRequest: true }),
  R('rv-6', 'Wen Z.', 5, 5, 'gloss', 'elena', 'Quick gloss, shiny result, fair price. Easy online booking too.'),
  R('rv-7', 'Dylan P.', 4, 6, 'cut', 'marcus', 'Clean fade and a friendly chat. Parking behind the salon is a bonus.', { viaRequest: true }),
  R('rv-8', 'Amara T.', 5, 8, 'balayage', 'elena', 'Third balayage with Elena and it keeps getting better. Highly recommend for anyone nervous about going lighter.', { viaRequest: true }),
  R('rv-9', 'Sofia V.', 5, 9, 'extensions', 'priya', 'Priya matched my colour perfectly. I get compliments every day.', { viaRequest: true, replied: true, reply: thanks('Sofia', 'Priya') }),
  R('rv-10', 'Grant H.', 5, 12, 'cut', 'marcus', 'Best haircut I have had in years.', { replied: true, reply: thanks('Grant', 'Marcus') }),
  R('rv-11', 'Nora K.', 4, 14, 'blowout', 'jules', 'Lovely blowout for a wedding guest day. Lasted all night.', { replied: true, reply: thanks('Nora', 'Jules') }),
  R('rv-12', 'Lucia F.', 1, 20, 'correction', 'elena', 'Booked a colour correction and was told it would take one visit. It needed two and I was charged for a second appointment I did not expect.', { replied: true, reply: 'Hi Lucia, I am sorry the plan changed without a clear conversation first. I called you on 1 Oct to talk it through and have noted the pricing step on your file. Casey', issue: 'the price of a second visit was not explained' }),
  R('rv-13', 'Ruth O.', 5, 22, 'gloss', 'elena', 'Always a calm, kind appointment.', { replied: true, reply: thanks('Ruth', 'Elena') }),
  R('rv-14', 'Theo N.', 3, 25, 'cut', 'marcus', 'Good cut, but the music was loud and I could not chat. Not a big deal.', { replied: true, reply: 'Thanks for telling us, Theo. We have turned the music down in the afternoons. Casey', issue: 'the music was loud' }),
  R('rv-15', 'Pia D.', 5, 27, 'balayage', 'jules', 'Jules is a wizard with blonde. Worth every dollar.', { viaRequest: true, replied: true, reply: thanks('Pia', 'Jules') }),
  R('rv-16', 'Remy A.', 4, 31, 'cut', 'marcus', 'Efficient and friendly.', { replied: true, reply: thanks('Remy', 'Marcus') }),
  R('rv-17', 'Ines G.', 5, 35, 'keratin', 'priya', 'Smooth hair for weeks. Priya explained exactly what to avoid.', { replied: true, reply: thanks('Ines', 'Priya') }),
];
export const reviewDate = (r: Review) => atDay(-r.daysAgo, 12);
/** Calendar days: the review date's midnight to today's midnight (Oct 8 vs Oct 10 = 2). */
export const ageDays = (r: Review) => Math.max(0, dayIndex(NOW) - dayIndex(reviewDate(r)));
export const ageLabel = (r: Review) => { const n = ageDays(r); return n === 0 ? 'from today' : `${n} ${n === 1 ? 'day' : 'days'} old`; };
export const sentiment = (r: Review) => (r.stars >= 4 ? 'positive' : r.stars === 3 ? 'mixed' : 'negative') as 'positive' | 'mixed' | 'negative';

/** Dash's draft. Short, specific, and never promises a refund. */
export function draftFor(r: Review): string {
  const f = r.name.split(' ')[0]; const sv = service(r.serviceId); const sty = r.stylistId ? stylist(r.stylistId).name.split(' ')[0] : 'the team';
  if (r.stars >= 4) return `Thank you, ${f}! I am so glad your ${sv.name.toLowerCase()} with ${sty} turned out the way you hoped. ${sv.rebookDays <= 120 ? `We would love to see you again in about ${Math.round(sv.rebookDays / 7)} weeks.` : 'We would love to see you again.'} Casey, ${SALON.name}`;
  return `Hi ${f}, thank you for telling us, and I am sorry ${r.issue ?? 'your visit fell short'}. That is not the experience we want you to have. Please call me on ${SALON.phone} or reply here and I will make time to put it right. Casey, ${SALON.name}`;
}

// ---- review requests
// Lowest rating first, then the longest-waiting; the pill targets row one.
export const NEEDS_REPLY = REVIEWS.filter((r) => !r.replied).sort((a, b) => a.stars - b.stars || b.daysAgo - a.daysAgo);
export const REPLIED = REVIEWS.filter((r) => r.replied);
const done30 = APPOINTMENTS.filter((a) => a.status === 'checked_out' && a.start >= NOW - 30 * DAY);
const consentOf = (a: (typeof done30)[number]) => CLIENTS.find((c) => c.id === a.clientId)?.consentSms ?? false;
export const REQ = (() => {
  const consented = done30.filter(consentOf);
  const sent = consented.length;
  const opened = Math.round(sent * 0.55);
  const reviewed = REVIEWS.filter((r) => r.viaRequest && r.daysAgo <= 30).length;
  const noConsent = done30.length - sent;
  const complaint = LEADS.filter((l) => l.firstTouchAt >= NOW - 30 * DAY && l.status === 'needs_person' && /upset|refund/i.test(l.handoffReason ?? '')).length;
  return { sent, opened, reviewed, noConsent, complaint, visits: done30.length };
})();
