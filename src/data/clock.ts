// "Now" is fixed so every page agrees: Saturday 10 Oct 2026, 9:41 am, America/Chicago (CDT, UTC-5).
export const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
export const TZ = 'America/Chicago';
export const DAY0 = Date.UTC(2026, 9, 10, 5, 0, 0); // midnight today, Chicago
export const NOW = DAY0 + 9 * HOUR + 41 * MIN;
/** epoch ms for `offset` days from today at hour:minute (local salon time). Negative = past. */
export const atDay = (offset: number, hour = 0, minute = 0) => DAY0 + offset * DAY + hour * HOUR + minute * MIN;
export const dayIndex = (t: number) => Math.floor((t - DAY0) / DAY); // 0 = today, -1 = yesterday
export const dow = (t: number) => new Date(t - 5 * HOUR).getUTCDay(); // 0 Sun .. 6 Sat (salon-local)
export const hourOf = (t: number) => new Date(t - 5 * HOUR).getUTCHours();
export type Range = { start: number; end: number; label: string };
export const RANGE: Range = { start: NOW - 30 * DAY, end: NOW, label: 'Last 30 days' };
export const PREV: Range = { start: NOW - 60 * DAY, end: NOW - 30 * DAY, label: 'Previous 30 days' };
export const inRange = (t: number, r: Range) => t >= r.start && t < r.end;
