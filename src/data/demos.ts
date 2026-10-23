// The guided demos behind the 1 2 3 buttons in the top bar (steps live in src/scripts/demo.ts).
export const DEMOS = [
  { id: 'call', n: 1, title: 'Joy answers a call' },
  { id: 'winback', n: 2, title: 'Win back overdue clients' },
  { id: 'ads', n: 3, title: 'Find the money in your ads' },
] as const;
export type DemoId = (typeof DEMOS)[number]['id'];
