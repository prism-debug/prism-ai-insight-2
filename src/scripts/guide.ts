// Dash out front: the Ask Dash launcher with a prompt, and a first-sign-in guided tour that ends by asking a starting question.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const P = () => (window as any).prism as { askDash(q: string): void; openDash(): void };
const dg = $('#dg');
if (dg) {
  const owner = dg.dataset.owner || 'there', salon = dg.dataset.salon || 'your salon';
  const counts = JSON.parse(dg.dataset.counts || '{}') as { leads: number; inbox: number; bookings: number };
  const suggested = (JSON.parse(document.getElementById('dash-data')?.textContent || '{}').suggested || []) as string[];
  const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } } };
  const sess = { get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } } };
  const narrow = () => window.matchMedia('(max-width: 900px)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- launcher + prompt bubble
  const bubble = $('#dg-bubble')!;
  const showBubble = () => { if (sess.get('dg-dismissed') || document.getElementById('dg-tour')) return; bubble.hidden = false; requestAnimationFrame(() => bubble.classList.add('on')); };
  const hideBubble = (remember = false) => { bubble.classList.remove('on'); setTimeout(() => (bubble.hidden = true), 160); if (remember) sess.set('dg-dismissed', '1'); };
  $('#dg-x')!.addEventListener('click', () => hideBubble(true));
  dg.addEventListener('click', (e) => {
    const t = e.target as HTMLElement; const q = t.closest<HTMLElement>('[data-dg-ask]');
    if (q) { hideBubble(true); P().askDash(q.dataset.dgAsk!); return; }
    if (t.closest('.dg-fab')) hideBubble(true);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !bubble.hidden && !document.getElementById('dg-tour')) hideBubble(false); });

  // ---- tour
  type Step = { id: string; target?: string[]; title: string; body: string; kind?: 'welcome' | 'moves' | 'ask'; place?: 'right' | 'bottom' | 'left' | 'top' };
  const val = (sel: string) => ($(sel)?.textContent || '').trim();
  const verdict = val('[data-tour="verdict"] h1') || 'one sentence on what to do today';
  const steps: Step[] = [
    { id: 'welcome', kind: 'welcome', title: `Hi ${owner}, I’m Dash.`, body: `I read your leads, ads, clients and bookings every morning so you don’t have to. Let me show you around ${salon}. It takes about a minute, then you can ask me anything.` },
    { id: 'verdict', target: ['[data-tour="verdict"] .verdict-copy', '[data-tour="verdict"]'], place: 'bottom', title: 'This is the call for today', body: `Every morning I write one sentence: “${verdict}” Read this first, and you know where to put your time.` },
    { id: 'next', target: ['[data-tour="next"]'], place: 'left', title: 'One orange button, always', body: 'On every screen exactly one button is orange. It’s the single most useful next step. If you only do one thing, press it.' },
    { id: 'do', target: ['[data-tour="do"]'], place: 'right', title: 'Four moves, ranked by value', body: 'These are what’s worth doing this week, biggest first. The dollar figure is a best guess at what each could bring in, not money already booked.' },
    { id: 'needs', target: ['[data-tour="needs"]'], place: 'right', title: 'People waiting on you', body: 'Leads still waiting for a reply, longest first. Red times mean they’ve waited too long. Tap a row to open the conversation and send my suggested reply.' },
    { id: 'numbers', target: ['[data-tour="numbers"]'], place: 'left', title: 'Your numbers, in plain words', body: 'Each figure shows how it moved against the 30 days before. Hover over any chart, bar or meter to see what it means and where it comes from.' },
    { id: 'nav', target: ['[data-tour-nav]', '.tabbar'], place: 'right', title: 'Where everything lives', body: `Leads (${counts.leads || ''} waiting) is who needs you. Inbox (${counts.inbox || ''}) is every text, DM and call in one thread per guest. Retention wins back overdue clients, Marketing shows what each ad dollar brought back, and Bookings holds requests and the calendar.` },
    { id: 'joy', target: ['[data-tour-joy]'], place: 'right', title: 'Joy covers the front desk', body: 'Joy answers texts and DMs when you can’t, and books what she can. When she needs a person, she hands it to you and it shows up as waiting.' },
    { id: 'where', target: ['.loc-trig', '.loc-m'], place: 'right', title: 'Switch location', body: 'Run more than one location? Pick the whole company or a single site here. Everything on screen follows.' },
    { id: 'ask', target: ['[data-tour-dash]', '[data-tour-dash-m]'], place: 'bottom', title: 'Ask me, any time', body: 'This button, or ⌘J, opens me from any screen. ⌘K searches everything: guests, pages and actions.' },
    { id: 'moves', kind: 'moves', title: 'Your first three moves', body: 'If you do nothing else today, do these, in this order.' },
    { id: 'start', kind: 'ask', title: 'What do you want to know first?', body: 'Pick one, or type your own. I’ll answer from your real numbers and tell you what to do next.' },
  ];
  const finish = (ask?: string) => {
    store.set('prism-tour', 'done'); document.getElementById('dg-tour')?.remove(); document.removeEventListener('keydown', onKey, true);
    document.body.classList.remove('dg-touring'); history.replaceState(null, '', location.pathname + location.hash);
    if (ask) P().askDash(ask); else setTimeout(showBubble, 600);
  };
  let i = 0, root: HTMLElement, hl: HTMLElement, card: HTMLElement;
  const visible = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).getClientRects().length > 0 && (el as HTMLElement).offsetWidth > 0;
  const findTarget = (s: Step) => { for (const q of s.target || []) { const el = $(q); if (visible(el)) return el; } return null; };
  const movesHtml = () => {
    const pick = (re: RegExp) => ($('[data-tour="do"] .row:not(.head)') ? [...document.querySelectorAll<HTMLElement>('[data-tour="do"] .row')].find((r) => re.test(r.textContent || '')) : undefined);
    const rows = [[/waiting leads|Reply/i, 'Reply to the people waiting', '/leads'], [/Win back/i, 'Win back overdue clients', '/retention'], [/booking requests|Confirm/i, 'Confirm booking requests', '/bookings']] as const;
    return `<ol class="dg-moves">${rows.map(([re, fallback, href], n) => { const r = pick(re); const txt = (r?.querySelector('.name, a, .title') as HTMLElement | null)?.textContent?.trim() || fallback; return `<li><span class="dg-n">${n + 1}</span><a href="${href}" data-dg-go>${esc(txt)}</a></li>`; }).join('')}</ol>`;
  };
  function render() {
    let s = steps[i]; let el = s.target ? findTarget(s) : null;
    while (s.target && !el && i < steps.length - 1) { i++; s = steps[i]; el = s.target ? findTarget(s) : null; }
    const modal = !s.target;
    const real = steps.filter((x) => !x.target || findTarget(x)); const idx = real.indexOf(s) + 1;
    root.classList.toggle('modal', modal);
    card.innerHTML = `<div class="dg-head"><span class="dg-av"></span><div><div class="dg-by">Dash</div><div class="dg-step">${s.kind === 'welcome' ? 'Quick tour' : `Step ${idx - 1} of ${real.length - 1}`}</div></div><button type="button" class="icon-btn dg-skip" data-dg="skip" aria-label="Close the tour"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`
      + `<h2 id="dg-title" tabindex="-1">${esc(s.title)}</h2><p>${esc(s.body)}</p>`
      + (s.kind === 'moves' ? movesHtml() : '')
      + (s.kind === 'ask' ? `<div class="dg-asks">${suggested.slice(0, 4).map((q) => `<button type="button" data-dg-q="${esc(q)}">${esc(q)}</button>`).join('')}</div><form class="dg-form" data-dg-form><input class="input" name="q" placeholder="Or type your own question" autocomplete="off" aria-label="Your question for Dash" /><button class="btn btn-black" type="submit"><span>Ask</span><span class="arrow">→</span></button></form>` : '')
      + `<div class="dg-foot"><div class="dg-dots" aria-hidden="true">${real.map((x) => `<i class="${x === s ? 'on' : ''}"></i>`).join('')}</div><div class="dg-btns">`
      + (s.kind === 'welcome' ? `<button type="button" class="btn" data-dg="skip">I’ll explore on my own</button><button type="button" class="btn btn-black" data-dg="next"><span>Show me around</span><span class="arrow">→</span></button>`
        : s.kind === 'ask' ? `<button type="button" class="btn" data-dg="back">Back</button><button type="button" class="btn" data-dg="skip">Skip</button>`
        : `<button type="button" class="btn" data-dg="back">Back</button><button type="button" class="btn btn-black" data-dg="next"><span>${s.kind === 'moves' ? 'Got it' : 'Next'}</span><span class="arrow">→</span></button>`) + `</div></div>`;
    const av = document.getElementById('dg-avatar') as HTMLTemplateElement | null; if (av) $('.dg-av', card)!.appendChild(av.content.cloneNode(true));
    if (el) {
      el.scrollIntoView({ block: narrow() ? 'start' : 'center', behavior: 'auto' });
      requestAnimationFrame(() => { const r = el!.getBoundingClientRect(); place(r, s); });
    } else { hl.style.opacity = '0'; card.style.cssText = ''; }
    card.setAttribute('aria-labelledby', 'dg-title'); ($('#dg-title', card) as HTMLElement).focus({ preventScroll: true });
  }
  function place(r: DOMRect, s: Step) {
    const pad = 8; hl.style.opacity = '1';
    hl.style.cssText += `;top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px;opacity:1`;
    if (narrow()) { card.style.cssText = 'left:12px;right:12px;bottom:12px;top:auto;width:auto'; return; }
    const w = Math.min(380, window.innerWidth - 24); card.style.width = `${w}px`; const h = card.offsetHeight; const vw = window.innerWidth, vh = window.innerHeight; const gap = 18;
    const opts: Record<string, [number, number]> = { right: [r.right + gap + pad, r.top], left: [r.left - gap - pad - w, r.top], bottom: [r.left, r.bottom + gap + pad], top: [r.left, r.top - gap - pad - h] };
    const order = [s.place || 'right', 'right', 'bottom', 'left', 'top'];
    let pos = opts[order[0]];
    for (const o of order) { const [x, y] = opts[o]; if (x >= 12 && x + w <= vw - 12 && y >= 12 && y + h <= vh - 12) { pos = [x, y]; break; } }
    const x = Math.max(12, Math.min(pos[0], vw - w - 12)); const y = Math.max(12, Math.min(pos[1], vh - h - 12));
    card.style.cssText = `left:${x}px;top:${y}px;width:${w}px`;
  }
  const go = (n: number) => { i = Math.max(0, Math.min(steps.length - 1, n)); render(); };
  function onKey(e: KeyboardEvent) {
    if (!document.getElementById('dg-tour')) return; const inField = (e.target as HTMLElement)?.tagName === 'INPUT';
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
    else if (!inField && (e.key === 'ArrowRight' || e.key === 'Enter') && !(e.target as HTMLElement).closest?.('[data-dg-q],[data-dg-go],a')) { e.preventDefault(); if (steps[i].kind !== 'ask') go(i + 1); }
    else if (!inField && e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  }
  function start() {
    if (document.getElementById('dg-tour')) return;
    hideBubble(); document.body.classList.add('dg-touring');
    root = document.createElement('div'); root.id = 'dg-tour'; root.className = 'dg-tour' + (reduce ? ' nomotion' : '');
    root.innerHTML = '<div class="dg-shield"></div><div class="dg-hl"></div><div class="dg-card" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(root); hl = $('.dg-hl', root)!; card = $('.dg-card', root)!;
    root.addEventListener('click', (e) => {
      const t = e.target as HTMLElement; const b = t.closest<HTMLElement>('[data-dg]');
      if (b) { const a = b.dataset.dg; if (a === 'next') go(i + 1); else if (a === 'back') go(i - 1); else finish(); return; }
      const q = t.closest<HTMLElement>('[data-dg-q]'); if (q) { finish(q.dataset.dgQ!); return; }
      if (t.closest('[data-dg-go]')) { store.set('prism-tour', 'done'); }
    });
    root.addEventListener('submit', (e) => { e.preventDefault(); const f = (e.target as HTMLFormElement).elements.namedItem('q') as HTMLInputElement; const v = f.value.trim(); if (v) finish(v); else f.focus(); });
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', () => { if (document.getElementById('dg-tour')) render(); });
    i = 0; render();
  }
  (window as any).prism = Object.assign((window as any).prism || {}, { startTour: start });

  const wants = new URLSearchParams(location.search).has('tour');
  const home = location.pathname === '/' || location.pathname === '/index.html';
  // a guided demo (src/scripts/demo.ts) has its own card; Dash stays out of its way
  if (sess.get('prism-demo')) { /* no first-run tour or prompt while a demo runs */ }
  else if (home && (wants || !store.get('prism-tour'))) setTimeout(start, 700);
  else setTimeout(showBubble, 2500);
}
