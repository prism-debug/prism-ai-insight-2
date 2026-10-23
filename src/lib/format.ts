import { NOW, MIN, HOUR, DAY, TZ } from '../data/clock.ts';

export const money = (n: number, cents = false) => (n < 0 ? '-' : '') + '$' + Math.abs(cents ? n : Math.round(n)).toLocaleString('en-US', cents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : undefined);
export const moneyK = (n: number) => (Math.abs(n) >= 10000 ? `$${(n / 1000).toFixed(1)}K` : money(n));
export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
export const pct0 = (n: number) => `${Math.round(n * 100)}%`;
export const times = (n: number) => `$${n.toFixed(2)}`;
export const num = (n: number) => n.toLocaleString('en-US');
export const plural = (n: number, one: string, many = one + 's') => `${num(n)} ${n === 1 ? one : many}`;

/** compact duration: 38 s · 14 min · 3 h 12 m · 6 d */
export function dur(ms: number): string {
  const a = Math.abs(ms);
  if (a < 90_000) return `${Math.max(1, Math.round(a / 1000))} s`;
  if (a < HOUR) return `${Math.round(a / MIN)} min`;
  if (a < DAY) { const h = Math.floor(a / HOUR); const m = Math.round((a % HOUR) / MIN); return m ? `${h} h ${m} m` : `${h} h`; }
  return `${Math.round(a / DAY)} d`;
}
export const ago = (t: number) => { const d = NOW - t; return d < 0 ? `in ${dur(-d)}` : d < 45_000 ? 'just now' : `${dur(d)} ago`; };
const f = (t: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...o }).format(t);
export const clock = (t: number) => f(t, { hour: 'numeric', minute: '2-digit' }).replace(' AM', ' am').replace(' PM', ' pm');
export const dateShort = (t: number) => f(t, { month: 'short', day: 'numeric' });
export const dateLong = (t: number) => f(t, { weekday: 'long', month: 'long', day: 'numeric' });
export const dayShort = (t: number) => f(t, { weekday: 'short', month: 'short', day: 'numeric' });
export const weekday = (t: number) => f(t, { weekday: 'short' });
export const stamp = (t: number) => (NOW - t < DAY && NOW - t >= 0 && f(t, { day: 'numeric' }) === f(NOW, { day: 'numeric' }) ? `Today ${clock(t)}` : NOW - t < 2 * DAY && NOW - t > 0 && f(t, { day: 'numeric' }) === f(NOW - DAY, { day: 'numeric' }) ? `Yesterday ${clock(t)}` : `${dateShort(t)} ${clock(t)}`);
export const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('');
export const tone = (s: string) => ([...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 5) + 1;
export const first = (n: string) => n.split(' ')[0];

/** delta descriptor against a previous value. higher = better by default. */
export function delta(cur: number, prev: number, opts: { higherIsBetter?: boolean; fmt?: (n: number) => string } = {}) {
  const { higherIsBetter = true, fmt = (n: number) => String(Math.round(n)) } = opts;
  const diff = cur - prev;
  const dirn = Math.abs(diff) < 1e-9 ? 'flat' : diff > 0 ? 'up' : 'down';
  const good = dirn === 'flat' ? 'flat' : (dirn === 'up') === higherIsBetter ? 'good' : 'bad';
  return { was: fmt(prev), dir: dirn as 'up' | 'down' | 'flat', tone: good as 'good' | 'bad' | 'flat' };
}
