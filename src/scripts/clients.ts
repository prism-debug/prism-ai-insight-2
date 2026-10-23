// Clients list: smart lists, filters, search, grouping, ordering, list/board, selection and bulk actions.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const toast = (m: string, undo?: () => void) => (window as any).prism?.toast(m, undo);
const root = $('#clients')!;
const pool = $('[data-pool]', root)!, out = $('[data-out]', root)!, board = $('[data-board]', root)!, tableWrap = $('[data-view-list]', root)!;
const all = $$('.crow[data-row]', pool);
const chev = ($('#chev') as HTMLTemplateElement).innerHTML;
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const state = { list: 'all', q: '', f: { stylist: '', svc: '', src: '', consent: '' } as Record<string, string>, group: 'lifecycle', order: 'last', mode: 'list' };
const sel = new Set<string>();
const LABEL: Record<string, string> = { stylist: 'Stylist', svc: 'Service', src: 'Source', consent: 'Consent' };
const num = (r: HTMLElement, k: string) => Number(r.dataset[k] || 0);

function passes(r: HTMLElement) {
  if (!(r.dataset.lists || '').split(' ').includes(state.list)) return false;
  if (state.q && !(r.dataset.name || '').includes(state.q)) return false;
  const f = state.f;
  if (f.stylist && r.dataset.stylist !== f.stylist) return false;
  if (f.svc && r.dataset.svc !== f.svc) return false;
  if (f.src && r.dataset.src !== f.src) return false;
  if (f.consent === 'yes' && r.dataset.consent !== '1') return false;
  if (f.consent === 'no' && r.dataset.consent !== '0') return false;
  if (f.consent === 'promo' && !(r.dataset.consent === '1' && r.dataset.promo === '1')) return false;
  return true;
}
function sorted(rows: HTMLElement[]) {
  const o = state.order;
  return [...rows].sort((a, b) => {
    if (o === 'spend') return num(b, 'spend') - num(a, 'spend');
    if (o === 'next') { const x = num(a, 'next') || Infinity, y = num(b, 'next') || Infinity; return x - y; }
    return num(b, 'last') - num(a, 'last') || num(b, 'next') - num(a, 'next');
  });
}
const STAGES = ['New', 'Returning', 'Regular', 'Loyal', 'VIP'];
const lcIcon = (k?: string) => (k ? document.querySelector<HTMLTemplateElement>('#lc-icons')?.content.querySelector<HTMLElement>(`[data-lc="${k}"]`)?.innerHTML ?? '' : '');
const LC: [string, string][] = [['active', 'Active'], ['at_risk', 'At risk'], ['lapsed', 'Lapsed'], ['prospect', 'New, first visit booked']];
function groupsOf(rows: HTMLElement[]): { label: string; key?: string; rows: HTMLElement[] }[] {
  if (state.group === 'none') return [{ label: '', rows }];
  if (state.group === 'stage') return STAGES.map((s) => ({ label: s, rows: rows.filter((r) => r.dataset.stage === s) }));
  if (state.group === 'lifecycle') return LC.map(([k, l]) => ({ label: l, key: k, rows: rows.filter((r) => r.dataset.lifecycle === k) }));
  const names = new Map<string, string>(); rows.forEach((r) => names.set(r.dataset.stylist!, $('.cell:nth-child(9) span:last-child', r)?.textContent || r.dataset.stylist!));
  return [...names].sort((a, b) => a[1].localeCompare(b[1])).map(([k, l]) => ({ label: l, rows: rows.filter((r) => r.dataset.stylist === k) }));
}

function render() {
  const shown = all.filter(passes);
  all.forEach((r) => pool.appendChild(r)); // park everything, then place what is visible
  $('[data-shown]', root)!.textContent = String(shown.length);
  $('[data-empty]', root)!.hidden = shown.length !== 0;
  out.textContent = '';
  const rows = sorted(shown);
  if (state.mode === 'list') {
    const frag = document.createDocumentFragment();
    for (const g of groupsOf(rows)) {
      if (!g.rows.length) continue;
      if (!g.label) { g.rows.forEach((r) => frag.appendChild(r)); continue; }
      const grp = document.createElement('div'); grp.className = 'group';
      grp.innerHTML = `<button type="button" class="group-head">${chev}${state.group === 'lifecycle' ? lcIcon(g.key) : ''}<span>${esc(g.label)}</span><span class="count">${g.rows.length}</span></button><div class="group-body"></div>`;
      const body = $('.group-body', grp)!; g.rows.forEach((r) => body.appendChild(r)); frag.appendChild(grp);
    }
    out.appendChild(frag);
  } else {
    const cols = STAGES.map((s) => {
      const rs = rows.filter((r) => r.dataset.stage === s); const sum = rs.reduce((t, r) => t + num(r, 'spend'), 0);
      const cap = 30;
      return `<div class="b-col"><div class="b-head"><span>${s}</span><span class="count tnum">${rs.length}</span><span class="sum tnum">${money(sum)}</span></div>` +
        rs.slice(0, cap).map((r) => `<a class="b-card" href="/clients/${r.dataset.id}"><span class="name truncate">${esc($('.name', r)!.textContent!)}</span><span class="line"><span>${r.dataset.lifecycle === 'active' ? 'Active' : r.dataset.lifecycle === 'at_risk' ? 'At risk' : r.dataset.lifecycle === 'lapsed' ? 'Lapsed' : 'New'}</span><span class="tnum strong">${money(num(r, 'spend'))}</span></span></a>`).join('') +
        (rs.length > cap ? `<div class="b-more tnum">and ${rs.length - cap} more. Narrow the list to see them.</div>` : '') + `</div>`;
    }).join('');
    board.innerHTML = cols;
  }
  tableWrap.hidden = state.mode !== 'list'; board.hidden = state.mode !== 'board';
  syncUI(); syncBulk();
}
function syncUI() {
  $$('[data-list]', root).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.list === state.list)));
  const mi = $(`#m-more [data-list="${state.list}"]`, root); const mt = $('[data-more]', root);
  if (mt) { mt.setAttribute('aria-selected', String(!!mi)); $('[data-more-label]', mt)!.textContent = mi ? mi.dataset.lbl! : 'More'; }
  const cur = $(`#m-lists [data-list="${state.list}"]`, root); if (cur) { $('[data-list-label]', root)!.textContent = cur.dataset.lbl!; $('[data-list-n]', root)!.textContent = $('.mi-n', cur)!.textContent; }
  $$('[data-chip]', root).forEach((c) => {
    const k = c.dataset.chip!, v = state.f[k]; c.setAttribute('aria-pressed', String(!!v));
    const opt = v ? $(`[data-f="${k}"][data-v="${v}"]`)?.textContent : ''; $('[data-chip-label]', c)!.textContent = v ? `${LABEL[k]}: ${opt}` : LABEL[k];
  });
  const anyF = Object.values(state.f).some(Boolean) || !!state.q;
  $$('[data-clear-filters]', root).forEach((b) => { if (b.closest('.c-bar')) b.hidden = !anyF; });
  const fb = $('#c-filter', root)!; const fr = $('#c-filter-row', root)!;
  if (anyF) fb.setAttribute('aria-pressed', 'true');
  fr.hidden = fb.getAttribute('aria-pressed') !== 'true';
  $$('[data-grp]').forEach((i) => i.setAttribute('aria-checked', String(i.dataset.grp === state.group)));
  $$('[data-ord]').forEach((i) => i.setAttribute('aria-checked', String(i.dataset.ord === state.order)));
  $$('[data-mode]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
  $$('.crow[data-row]', root).forEach((r) => { const on = sel.has(r.dataset.id!); r.classList.toggle('is-selected', on); const cb = $<HTMLInputElement>('[data-select]', r); if (cb) cb.checked = on; });
}
function syncBulk() {
  const visible = all.filter(passes).map((r) => r.dataset.id!);
  [...sel].forEach((id) => { if (!visible.includes(id)) sel.delete(id); });
  $('[data-bulk]', root)!.hidden = sel.size === 0; $('[data-sel-n]', root)!.textContent = String(sel.size);
  const sa = $<HTMLInputElement>('[data-select-all]', root)!; sa.checked = sel.size > 0 && sel.size === visible.length; sa.indeterminate = sel.size > 0 && sel.size < visible.length;
  $$('.crow[data-row]', root).forEach((r) => { const on = sel.has(r.dataset.id!); r.classList.toggle('is-selected', on); });
}
const chosen = () => all.filter((r) => sel.has(r.dataset.id!));

// ---- events
root.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const list = t.closest<HTMLElement>('[data-list]'); if (list) { state.list = list.dataset.list!; sel.clear(); render(); const u = new URL(location.href); state.list === 'all' ? u.searchParams.delete('view') : u.searchParams.set('view', state.list); history.replaceState(null, '', u); return; }
  const jump = t.closest<HTMLElement>('[data-list-jump]'); if (jump) { state.list = jump.dataset.listJump!; sel.clear(); render(); toast(`Showing ${$('[data-shown]', root)!.textContent} overdue clients who said yes to texts. Select them to text or add to win-back.`); return; }
  if (t.closest('#c-filter')) { const b = $('#c-filter', root)!; const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); $('#c-filter-row', root)!.hidden = !on; if (on) $<HTMLInputElement>('[data-search]', root)!.focus(); return; }
  const mode = t.closest<HTMLElement>('[data-mode]'); if (mode) { state.mode = mode.dataset.mode!; render(); return; }
  if (t.closest('[data-clear-filters]')) { state.f = { stylist: '', svc: '', src: '', consent: '' }; state.q = ''; $<HTMLInputElement>('[data-search]', root)!.value = ''; render(); return; }
  const bulk = t.closest<HTMLElement>('[data-bulk]'); if (bulk) { doBulk(bulk.dataset.bulk!); return; }
});
$<HTMLInputElement>('[data-search]', root)!.addEventListener('input', (e) => { state.q = (e.target as HTMLInputElement).value.trim().toLowerCase(); render(); });
root.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.matches('[data-select]')) { const id = t.closest<HTMLElement>('.crow')!.dataset.id!; t.checked ? sel.add(id) : sel.delete(id); syncBulk(); }
  if (t.matches('[data-select-all]')) { sel.clear(); if (t.checked) all.filter(passes).forEach((r) => sel.add(r.dataset.id!)); syncUI(); syncBulk(); }
});
// menus live in the page root; ui.ts opens and closes them
root.addEventListener('click', (e) => {
  const t = e.target as HTMLElement; const it = t.closest<HTMLElement>('.menu-item'); if (!it) return;
  if (it.dataset.f) { state.f[it.dataset.f] = it.dataset.v || ''; sel.clear(); render(); }
  else if (it.dataset.grp) { state.group = it.dataset.grp; render(); }
  else if (it.dataset.ord) { state.order = it.dataset.ord; render(); }
  else if (it.dataset.seq) bulkSeq(it.dataset.seq);
  else if (it.dataset.tag) bulkTag(it.dataset.tag);
});

// ---- bulk actions (every one undoable, consent checked before any text)
function doBulk(kind: string) {
  const rs = chosen(); if (!rs.length) return;
  if (kind === 'clear') { sel.clear(); syncUI(); syncBulk(); return; }
  if (kind === 'text') {
    const ok = rs.filter((r) => r.dataset.consent === '1'); const skipped = rs.length - ok.length;
    if (!ok.length) { toast(`No text sent. None of the ${rs.length} selected have agreed to texts.`); return; }
    toast(`Texting ${ok.length === 1 ? ok[0].dataset.first : ok.length + ' clients'}${skipped ? `. ${skipped} skipped, no text consent` : '. Consent checked'}. Quiet hours respected.`, () => toast('Text cancelled before sending'));
  }
  if (kind === 'winback') {
    const ok = rs.filter((r) => r.dataset.consent === '1' && r.dataset.promo === '1'); const skipped = rs.length - ok.length;
    if (!ok.length) { toast(`Nobody added. None of the ${rs.length} selected agreed to promotional texts.`); return; }
    toast(`Added ${ok.length} to the win-back list${skipped ? `. ${skipped} skipped, no promotional consent` : ''}`, () => toast('Removed from the win-back list'));
  }
}
function bulkSeq(name: string) {
  const rs = chosen(); if (!rs.length) return; const ok = rs.filter((r) => r.dataset.consent === '1'); const sk = rs.length - ok.length;
  toast(`Added ${ok.length} to “${name}”${sk ? `. ${sk} skipped, no text consent` : ''}`, () => toast('Removed from the sequence'));
}
function bulkTag(tag: string) {
  const rs = chosen(); if (!rs.length) return;
  const els = rs.map((r) => { const s = document.createElement('span'); s.className = 'tag violet'; s.textContent = tag; $('[data-tags]', r)!.appendChild(s); return s; });
  toast(`Tagged ${rs.length} ${rs.length === 1 ? 'client' : 'clients'} “${tag}”`, () => els.forEach((s) => s.remove()));
}

// ---- boot
const view = new URLSearchParams(location.search).get('view') || location.hash.slice(1);
if (view && $(`[data-list="${view}"]`, root)) state.list = view;
render();
export {};
