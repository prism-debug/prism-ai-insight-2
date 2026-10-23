// Pure helpers shared by the server (data) and the browser (schedule script). No imports from seed, so the client bundle stays small.
export type Iv = { s: number; e: number }; // minutes since midnight, salon-local
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** free intervals inside opening hours after removing busy blocks (from `from` minutes onward). */
export function freeGaps(open: [number, number] | null, busy: Iv[], from = 0): Iv[] {
  if (!open) return [];
  let cur = Math.max(open[0] * 60, from); const end = open[1] * 60; const out: Iv[] = [];
  for (const b of [...busy].sort((x, y) => x.s - y.s)) {
    if (b.e <= cur) continue;
    if (b.s > cur) out.push({ s: cur, e: Math.min(b.s, end) });
    cur = Math.max(cur, b.e);
    if (cur >= end) break;
  }
  if (cur < end) out.push({ s: cur, e: end });
  return out.filter((g) => g.e - g.s >= 15);
}
export function startsFor(gaps: Iv[], minutes: number, step = 15): number[] {
  const out: number[] = [];
  for (const g of gaps) for (let t = Math.ceil(g.s / step) * step; t + minutes <= g.e; t += step) out.push(t);
  return out;
}
export function fmtMin(m: number): string {
  const h = Math.floor(m / 60), mm = m % 60; const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ':00'} ${h < 12 ? 'am' : 'pm'}`;
}
export function fmtDur(min: number): string { const h = Math.floor(min / 60), m = min % 60; return h ? (m ? `${h} h ${m} m` : `${h} h`) : `${m} min`; }
export function fmtGap(g: Iv): string { return `${fmtMin(g.s)} to ${fmtMin(g.e)}`; }
/** Day label for an offset from Sat 10 Oct 2026. */
export function dayLabel(offset: number, style: 'short' | 'long' | 'rel' = 'short'): string {
  const d = new Date(Date.UTC(2026, 9, 10 + offset));
  const base = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: style === 'long' ? 'long' : 'short', month: style === 'long' ? 'long' : 'short', day: 'numeric' }).format(d);
  if (style !== 'rel') return base;
  return offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : base;
}
export const weekdayOf = (offset: number) => new Date(Date.UTC(2026, 9, 10 + offset)).getUTCDay();
export const isoOf = (offset: number) => new Date(Date.UTC(2026, 9, 10 + offset)).toISOString().slice(0, 10);
export const offsetOfIso = (iso: string) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(2026, 9, 10)) / 86400000);
