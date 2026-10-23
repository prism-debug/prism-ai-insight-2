// Vanilla interaction layer: command palette, Ask Dash, shortcuts, menus, filters, tabs, groups, toast.
type Cmd = { label: string; hint?: string; href?: string; dash?: boolean; icon?: string; k?: string };
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const json = (id: string) => JSON.parse(document.getElementById(id)?.textContent || '{}');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const typing = () => { const t = document.activeElement as HTMLElement | null; return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };

const scrim = $('#scrim')!, palette = $('#palette')!, pInput = $<HTMLInputElement>('#palette-input')!, pList = $('#palette-list')!;
const dash = $('#dash')!, sheet = $('#sheet')!;
let layer: 'palette' | 'dash' | 'sheet' | null = null;
function openLayer(l: 'palette' | 'dash' | 'sheet') {
  closeLayers();
  layer = l; scrim.classList.add('open');
  if (l === 'palette') { palette.classList.add('open'); pInput.value = ''; renderPalette(''); pInput.focus(); }
  if (l === 'dash') { dash.classList.add('open'); dash.setAttribute('aria-hidden', 'false'); setTimeout(() => $<HTMLInputElement>('#dash-input')?.focus(), 160); }
  if (l === 'sheet') sheet.classList.add('open');
}
function closeLayers() {
  palette.classList.remove('open'); dash.classList.remove('open'); dash.setAttribute('aria-hidden', 'true'); sheet.classList.remove('open'); scrim.classList.remove('open'); layer = null;
  $$('.menu.open').forEach((m) => m.classList.remove('open'));
}
scrim.addEventListener('click', closeLayers);
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('[data-open-palette]')) { openLayer('palette'); return; }
  if (t.closest('[data-open-dash]')) { openLayer('dash'); return; }
  if (t.closest('[data-close-dash]')) { closeLayers(); return; }
  if (t.closest('[data-open-sheet]')) { openLayer('sheet'); return; }
  const g = t.closest<HTMLElement>('.group-head'); if (g && !t.closest('.add')) { const grp = g.parentElement!; grp.dataset.collapsed = String(grp.dataset.collapsed !== 'true'); }
  const mt = t.closest<HTMLElement>('[data-menu]');
  if (mt) { toggleMenu(mt); return; }
  if (!t.closest('.menu')) $$('.menu.open').forEach((m) => m.classList.remove('open'));
  const row = t.closest<HTMLElement>('[data-href]'); if (row && !t.closest('a,button,input,label,select')) location.href = row.dataset.href!;
});

// ---- menus
function toggleMenu(trigger: HTMLElement) {
  const m = document.getElementById(trigger.dataset.menu!); if (!m) return;
  const was = m.classList.contains('open'); $$('.menu.open').forEach((x) => x.classList.remove('open'));
  if (was) { trigger.setAttribute('aria-expanded', 'false'); return; }
  const r = trigger.getBoundingClientRect(); m.classList.add('open'); trigger.setAttribute('aria-expanded', 'true');
  const w = m.offsetWidth, h = m.offsetHeight;
  const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8); const top = r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6;
  m.style.left = `${left}px`; m.style.top = `${top}px`;
}
document.addEventListener('click', (e) => { const it = (e.target as HTMLElement).closest<HTMLElement>('.menu .menu-item'); if (it) { const m = it.closest('.menu')!; setTimeout(() => m.classList.remove('open'), 0); } });

// ---- command palette
const data = json('cmd-data') as { pages: Cmd[]; actions: Cmd[]; leads: Cmd[]; clients: Cmd[] };
let items: Cmd[] = [], active = 0;
function renderPalette(q: string) {
  const s = q.trim().toLowerCase();
  const groups: [string, Cmd[]][] = s
    ? [['Results', [...data.actions, ...data.pages, ...data.leads, ...data.clients].filter((c) => (c.label + ' ' + (c.hint || '')).toLowerCase().includes(s)).slice(0, 40)]]
    : [['Jump to', data.pages], ['Suggested', data.actions]];
  items = groups.flatMap(([, l]) => l); active = 0;
  pList.innerHTML = items.length ? groups.filter(([, l]) => l.length).map(([g, l]) => `<div class="menu-head">${g}</div>` + l.map((c) => `<a class="menu-item" role="option" href="${c.href || '#'}" data-i="${items.indexOf(c)}">${esc(c.label)}${c.hint ? `<span class="muted t-small" style="margin-left:8px">${esc(c.hint)}</span>` : ''}${c.k ? `<span class="kbd">g ${c.k}</span>` : ''}</a>`).join('')).join('') : `<div class="empty"><strong>No match</strong>Try a name, a page, or “not answered”.</div>`;
  mark();
}
function mark() { $$('#palette-list .menu-item').forEach((el) => el.dataset.active = String(Number(el.dataset.i) === active)); $(`#palette-list .menu-item[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }
function run(c: Cmd) { if (c.dash) openLayer('dash'); else if (c.href) location.href = c.href; }
pInput.addEventListener('input', () => renderPalette(pInput.value));
pInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); mark(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); mark(); }
  else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) run(items[active]); }
});
pList.addEventListener('click', (e) => { const a = (e.target as HTMLElement).closest<HTMLElement>('.menu-item'); if (a) { const c = items[Number(a.dataset.i)]; if (c?.dash) { e.preventDefault(); run(c); } } });

// ---- shortcuts
let gTimer = 0, gArmed = false;
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); layer === 'palette' ? closeLayers() : openLayer('palette'); return; }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); layer === 'dash' ? closeLayers() : openLayer('dash'); return; }
  if (e.key === 'Escape') { if (layer || $('.menu.open')) { closeLayers(); } return; }
  if (typing() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); openLayer('palette'); return; }
  if (gArmed) { gArmed = false; clearTimeout(gTimer); const p = data.pages.find((x) => x.k === e.key.toLowerCase()); if (p?.href) { e.preventDefault(); location.href = p.href; } return; }
  if (e.key === 'g') { gArmed = true; gTimer = window.setTimeout(() => (gArmed = false), 1100); }
});

// ---- Ask Dash
const dd = json('dash-data') as { answers: { q: string; match: string[]; text: string; cites: string[]; cta?: { label: string; href: string } }[]; suggested: string[] };
const log = $('#dash-log')!, form = $<HTMLFormElement>('#dash-form')!, dInput = $<HTMLInputElement>('#dash-input')!;
function answerFor(q: string) { const s = q.toLowerCase(); return dd.answers.find((a) => a.q.toLowerCase() === s) || dd.answers.map((a) => ({ a, n: a.match.filter((m) => s.includes(m)).length })).sort((x, y) => y.n - x.n).find((x) => x.n > 0)?.a; }
function ask(q: string) {
  q = q.trim(); if (!q) return;
  $('#dash-suggest')?.remove();
  log.insertAdjacentHTML('beforeend', `<div class="ask-msg you">${esc(q)}</div><div class="ask-msg dash" data-typing><span class="muted">Dash is looking at your numbers…</span></div>`);
  log.scrollTop = log.scrollHeight;
  const a = answerFor(q);
  setTimeout(() => {
    const el = log.querySelector('[data-typing]')!; el.removeAttribute('data-typing');
    el.innerHTML = a
      ? `<span>${esc(a.text)}</span><span class="cites">From: ${a.cites.map(esc).join(' · ')}</span>${a.cta ? `<a class="btn btn-primary btn-sm" href="${a.cta.href}" style="justify-self:start">${esc(a.cta.label)}</a>` : ''}`
      : `<span>I can answer questions about leads, ads, clients, Joy and bookings. Try one of these.</span><span class="suggest">${dd.suggested.map((s) => `<button type="button" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</span>`;
    log.scrollTop = log.scrollHeight;
  }, 520);
}
log.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-q]'); if (b) ask(b.dataset.q!); });
form.addEventListener('submit', (e) => { e.preventDefault(); const v = dInput.value; dInput.value = ''; ask(v); });

// ---- tabs (hash-synced) and filters
$$('[data-tabs]').forEach((root) => {
  const tabs = $$('[role="tab"]', root), panels = $$('[data-panel-id]', root.parentElement || document);
  const show = (id: string) => { tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.panel === id))); panels.forEach((p) => (p.hidden = p.dataset.panelId !== id)); };
  tabs.forEach((t) => t.addEventListener('click', () => { show(t.dataset.panel!); history.replaceState(null, '', `#${t.dataset.panel}`); }));
  const h = location.hash.slice(1); show(tabs.some((t) => t.dataset.panel === h) ? h : tabs[0]?.dataset.panel || '');
});
$$('[data-filterable]').forEach((root) => {
  const rows = $$('[data-row]', root), filters: Record<string, string> = {}; let q = '';
  const params = new URLSearchParams(location.search);
  const apply = () => {
    let n = 0;
    rows.forEach((r) => { const ok = Object.entries(filters).every(([k, v]) => !v || r.dataset[k] === v) && (!q || (r.dataset.text || r.textContent || '').toLowerCase().includes(q)); r.hidden = !ok; if (ok) n++; });
    $$('.group', root).forEach((g) => { const vis = $$('[data-row]', g).filter((r) => !r.hidden).length; g.hidden = vis === 0; const c = $('.count', g); if (c) c.textContent = String(vis); });
    $$('[data-filter-count]', root).forEach((el) => (el.textContent = String(n)));
    const empty = $('[data-filter-empty]', root); if (empty) empty.hidden = n !== 0;
    $$('[data-filter-key]', root).forEach((b) => { const k = b.dataset.filterKey!; const on = (filters[k] || '') === (b.dataset.filterValue || ''); b.setAttribute(b.getAttribute('role') === 'tab' ? 'aria-selected' : 'aria-pressed', String(on)); });
  };
  root.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-filter-key]'); if (!b) return; const k = b.dataset.filterKey!, v = b.dataset.filterValue || ''; filters[k] = b.dataset.toggle && filters[k] === v ? '' : v; apply(); });
  $<HTMLInputElement>('[data-filter-search]', root)?.addEventListener('input', (e) => { q = (e.target as HTMLInputElement).value.trim().toLowerCase(); apply(); });
  params.forEach((v, k) => { if ($(`[data-filter-key="${k}"]`, root)) filters[k] = v; });
  apply();
});

// ---- toast (undo over confirm)
const toast = $('#toast')!, tMsg = $('#toast-msg')!, tUndo = $<HTMLButtonElement>('#toast-undo')!; let tt = 0, undoFn: (() => void) | null = null;
(window as any).prism = { toast(msg: string, undo?: () => void) { tMsg.textContent = msg; undoFn = undo || null; tUndo.hidden = !undo; toast.classList.add('open'); clearTimeout(tt); tt = window.setTimeout(() => toast.classList.remove('open'), 4500); }, openDash: () => openLayer('dash') };
tUndo.addEventListener('click', () => { undoFn?.(); toast.classList.remove('open'); });
$$('[data-toast]').forEach((el) => el.addEventListener('click', (e) => { if (el.tagName === 'A' && !(el as HTMLAnchorElement).getAttribute('href')?.startsWith('#') && (el as HTMLAnchorElement).getAttribute('href')) return; e.preventDefault(); (window as any).prism.toast(el.dataset.toast!, el.dataset.undo ? () => (window as any).prism.toast('Undone') : undefined); }));
export {};

// ---- location switcher (label only in the prototype; data is company-wide)
(() => {
  const label = document.querySelector<HTMLElement>('[data-loc-label]'); const menu = document.getElementById('menu-loc');
  if (!label || !menu) return;
  const apply = (id: string) => {
    const it = menu.querySelector<HTMLElement>(`[data-loc="${id}"]`) ?? menu.querySelector<HTMLElement>('[data-loc="all"]')!;
    menu.querySelectorAll<HTMLElement>('[data-loc]').forEach((b) => { b.dataset.active = String(b === it); b.setAttribute('aria-checked', String(b === it)); });
    label.textContent = it.dataset.locName!;
    const short = document.querySelector<HTMLElement>('[data-loc-short]'); if (short) short.textContent = it.dataset.loc === 'all' ? 'All' : it.querySelector('span')!.firstChild!.textContent!;
    try { localStorage.setItem('prism-loc', it.dataset.loc!); } catch { /* storage unavailable */ }
  };
  menu.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-loc]'); if (b) apply(b.dataset.loc!); });
  let saved = 'all'; try { saved = localStorage.getItem('prism-loc') || 'all'; } catch { /* ignore */ }
  apply(saved);
})();

// ---- chart tooltips: data-tip="Title|Label~Value|Label~Value|note", data-tip-c = swatch colour
(() => {
  const tip = document.createElement('div'); tip.className = 'dtip'; tip.id = 'data-tip-el'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  let cur: HTMLElement | null = null;
  const render = (el: HTMLElement) => {
    const parts = (el.dataset.tip || '').split('|'); const sw = el.dataset.tipC;
    tip.innerHTML = `<strong>${sw ? `<i style="background:${sw}"></i>` : ''}${esc(parts[0])}</strong>` + parts.slice(1).map((p) => { const k = p.indexOf('~'); return k > 0 ? `<span class="dtip-r"><span>${esc(p.slice(0, k))}</span><b>${esc(p.slice(k + 1))}</b></span>` : `<span class="dtip-n">${esc(p)}</span>`; }).join('');
  };
  const place = (x: number, y: number) => {
    const w = tip.offsetWidth, h = tip.offsetHeight; const l = Math.max(8, Math.min(x - w / 2, window.innerWidth - w - 8)); let t = y - h - 14; if (t < 8) t = y + 20;
    tip.style.transform = `translate(${l}px, ${t}px)`;
  };
  const show = (el: HTMLElement, x: number, y: number) => { if (cur !== el) { cur?.removeAttribute('aria-describedby'); cur = el; render(el); el.setAttribute('aria-describedby', 'data-tip-el'); } tip.classList.add('on'); place(x, y); };
  const hide = () => { cur?.removeAttribute('aria-describedby'); cur = null; tip.classList.remove('on'); };
  const target = (e: Event) => (e.target as HTMLElement).closest?.<HTMLElement>('[data-tip]') ?? null;
  document.addEventListener('pointermove', (e) => { const el = target(e); if (el) show(el, e.clientX, e.clientY); else hide(); });
  document.addEventListener('pointerdown', (e) => { const el = target(e); if (el && e.pointerType !== 'mouse') show(el, e.clientX, e.clientY); else if (!el) hide(); });
  document.addEventListener('focusin', (e) => { const el = target(e); if (el) { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); } });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', hide, { passive: true });
  document.addEventListener('pointerleave', hide);
})();
(window as any).prism = Object.assign((window as any).prism || {}, { askDash(q: string) { openLayer('dash'); if (q) ask(q); }, openDash() { openLayer('dash'); } });
