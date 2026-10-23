// Leads list + board: views, search, filters, display, selection, bulk actions, undoable moves.
type M = { id: string; name: string; status: string; owner: string | null; source: string; service: string; channel: string; score: number; value: number; after: boolean; sms: boolean; promo: boolean; firstBy: string | null; first: number; last: number; late: boolean };
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const toast = (m: string, u?: () => void) => (window as any).prism?.toast(m, u);
try { const nl = $('.nav-item[href="/leads"] .nav-count'); if (nl) $('.nav-item[href="/leads"]')!.setAttribute('title', `${nl.textContent} waiting: not answered plus needs a person`); } catch {}
const app = $('#leads-app');
if (app) {
  const { models, meta } = JSON.parse($('#leads-data')!.textContent!) as { models: M[]; meta: any };
  const byId = new Map(models.map((m) => [m.id, m]));
  const ORDER = ['not_answered', 'needs_person', 'joy_handling', 'went_quiet', 'booked'];
  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const first = (n: string) => n.split(' ')[0];
  const rowEl = new Map<string, HTMLElement>($$('.lead-row[data-id]').map((r) => [r.dataset.id!, r]));
  const cardEl = new Map<string, HTMLElement>($$('.bcard').map((r) => [r.dataset.id!, r]));
  const handler = (m: M): { kind: string; name: string } => {
    if (m.status === 'joy_handling') return { kind: 'joy', name: 'Joy' };
    if (m.status === 'not_answered') return meta.joyChannels.includes(m.channel) ? { kind: 'paused', name: 'Joy paused' } : { kind: 'none', name: 'Nobody' };
    if (m.status === 'needs_person') return m.owner && m.owner !== 'joy' ? { kind: 'person', name: first(meta.owners[m.owner]) } : { kind: 'wait', name: 'Waiting for a person' };
    if (m.owner === 'joy') return { kind: 'joy', name: 'Joy' };
    return m.owner ? { kind: 'person', name: first(meta.owners[m.owner]) } : { kind: 'dash', name: '—' };
  };
  const icon = (k: string) => $(`#icons [data-ic="${k}"]`)?.innerHTML ?? '';

  type Filters = Record<'status' | 'source' | 'service' | 'owner' | 'consent', Set<string>>;
  const st = {
    view: 'needs', group: 'status', order: 'needs', q: '', mode: 'list',
    f: { status: new Set(), source: new Set(), service: new Set(), owner: new Set(), consent: new Set() } as Filters,
    sel: new Set<string>(), spam: new Set<string>(), collapsed: new Map<string, string>(), focus: '' as string,
  };
  const VIEWS: Record<string, { group: string; order: string; test: (m: M) => boolean }> = {
    needs: { group: 'status', order: 'needs', test: (m) => m.status === 'not_answered' || m.status === 'needs_person' },
    hot: { group: 'status', order: 'score', test: (m) => m.score >= 70 },
    after: { group: 'status', order: 'newest', test: (m) => m.after },
    joybooked: { group: 'none', order: 'newest', test: (m) => m.status === 'booked' && m.firstBy === 'joy' },
    all: { group: 'none', order: 'newest', test: () => true },
  };
  const ownerKey = (m: M) => m.owner ?? 'none';
  const chipTest = (m: M) => {
    const f = st.f;
    if (f.status.size && !f.status.has(m.status)) return false;
    if (f.source.size && !f.source.has(m.source)) return false;
    if (f.service.size && !f.service.has(m.service)) return false;
    if (f.owner.size && !f.owner.has(ownerKey(m))) return false;
    if (f.consent.size) {
      const ok = [...f.consent].every((c) => (c === 'sms' ? m.sms : c === 'nosms' ? !m.sms : m.promo));
      if (!ok) return false;
    }
    if (st.q) { const t = rowEl.get(m.id)?.dataset.text ?? m.name.toLowerCase(); if (!t.includes(st.q)) return false; }
    return !st.spam.has(m.id);
  };
  const visible = () => models.filter((m) => VIEWS[st.view].test(m) && chipTest(m));
  const cmp = (a: M, b: M): number => {
    if (st.order === 'score') return b.score - a.score;
    if (st.order === 'value') return b.value - a.value;
    if (st.order === 'newest') return b.first - a.first;
    const ra = ORDER.indexOf(a.status), rb = ORDER.indexOf(b.status);
    if (ra !== rb) return ra - rb;
    // waiting groups: longest wait first (oldest unanswered on top)
    if (a.status === 'not_answered' || a.status === 'needs_person') return a.last - b.last;
    return b.last - a.last;
  };
  const groupKey = (m: M) => (st.group === 'status' ? m.status : st.group === 'source' ? m.source : st.group === 'service' ? m.service : 'all');
  const groupLabel = (k: string) => (st.group === 'status' ? meta.statusLabel[k] : st.group === 'source' ? meta.sources[k] : st.group === 'service' ? meta.services[k] : 'All leads');

  function render() {
    const vis = visible().sort(cmp);
    const visSet = new Set(vis.map((m) => m.id));
    // list
    $$('#groups .group').forEach((g) => st.collapsed.set(g.dataset.key!, g.dataset.collapsed || 'false'));
    const gm = new Map<string, M[]>();
    vis.forEach((m) => { const k = groupKey(m); (gm.get(k) ?? gm.set(k, []).get(k)!).push(m); });
    let keys = [...gm.keys()];
    if (st.group === 'status') keys = ORDER.filter((k) => gm.has(k));
    else if (st.group !== 'none') keys.sort((a, b) => gm.get(b)!.reduce((s, m) => s + m.value, 0) - gm.get(a)!.reduce((s, m) => s + m.value, 0));
    const waitN = (k: string) => models.filter((m) => m.status === k && !st.spam.has(m.id)).length;
    const nA = waitN('not_answered'), nP = waitN('needs_person');
    const ws = $('#wait-sum'); if (ws) ws.innerHTML = `${nA + nP} waiting = ${nA} not answered + ${nP} ${nP === 1 ? 'needs' : 'need'} a person.`;
    const host = $('#groups')!; const frag = document.createDocumentFragment();
    models.forEach((m) => { const r = rowEl.get(m.id)!; if (!visSet.has(m.id)) r.hidden = true; });
    const stash = document.createDocumentFragment();
    rowEl.forEach((r) => stash.appendChild(r)); // detach all, re-add below
    keys.forEach((k) => {
      const list = gm.get(k)!;
      const g = document.createElement('section'); g.className = 'group'; g.dataset.key = k; g.dataset.collapsed = st.collapsed.get(k) ?? 'false';
      const sum = list.reduce((s, m) => s + m.value, 0);
      const note = st.group === 'status' && k === 'not_answered' ? `<p class="group-note muted t-small hide-m">Joy answers texts and DMs. These asked by phone, form or email, or came when Joy was off.</p>` : '';
      g.innerHTML = `<button class="group-head" type="button">${icon('chev')}${st.group === 'status' ? icon(k) : ''}<span>${groupLabel(k)}</span><span class="count">${list.length}</span><span class="gval muted t-small tnum">${money(sum)} likely</span></button>${note}<div class="group-body"></div>`;
      const body = $('.group-body', g)!;
      list.forEach((m) => { const r = rowEl.get(m.id)!; r.hidden = false; r.setAttribute('aria-selected', String(st.sel.has(m.id))); $<HTMLInputElement>('[data-select]', r)!.checked = st.sel.has(m.id); body.appendChild(r); });
      frag.appendChild(g);
    });
    host.replaceChildren(frag);
    // board
    cardEl.forEach((c, id) => { c.hidden = !visSet.has(id); });
    ORDER.forEach((s) => {
      const col = $(`.bcol[data-col="${s}"]`)!; const body = $('.bcol-body', col)!; const inCol = vis.filter((m) => m.status === s);
      inCol.forEach((m) => body.appendChild(cardEl.get(m.id)!));
      $('[data-ccount]', col)!.textContent = String(inCol.length); $('[data-cval]', col)!.textContent = money(inCol.reduce((t, m) => t + m.value, 0));
    });
    // chrome
    $('#lead-empty')!.hidden = vis.length > 0;
    $('#list-view')!.hidden = st.mode !== 'list' || vis.length === 0; $('#board-view')!.hidden = st.mode !== 'board' || vis.length === 0;
    app!.dataset.mode = st.mode;
    $$('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === st.mode)));
    const vt = $(`#menu-views [data-view="${st.view}"]`); if (vt) { $('[data-view-label]')!.textContent = vt.childNodes[0].textContent; }
    $$('[data-view]').forEach((t) => { t.setAttribute('aria-selected', String(t.dataset.view === st.view)); const n = $('[data-view-count]', t)!; n.textContent = String(models.filter((m) => VIEWS[t.dataset.view!].test(m) && !st.spam.has(m.id)).length); });
    $('[data-view-now]')!.textContent = $(`#menu-views [data-view="${st.view}"] [data-view-count]`)?.textContent ?? '';
    $$('[data-group]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.group === st.group)));
    $$('[data-order]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.order === st.order)));
    let any = !!st.q;
    $$('[data-chip]').forEach((c) => {
      const k = c.dataset.chip as keyof Filters; const s = st.f[k]; any = any || s.size > 0;
      const labels = [...s].map((v) => (k === 'status' ? meta.statusLabel[v] : k === 'source' ? meta.sources[v] : k === 'service' ? meta.services[v] : k === 'owner' ? (v === 'none' ? 'Unassigned' : meta.owners[v]) : ({ sms: 'Can text', nosms: 'No text consent', promo: 'Promo OK' } as any)[v]));
      $('.chip-t', c)!.textContent = s.size ? `${c.dataset.label}: ${labels.length > 1 ? labels.length + ' selected' : labels[0]}` : c.dataset.label!;
      c.classList.toggle('on', s.size > 0); c.setAttribute('aria-pressed', String(s.size > 0));
      const ic = $('svg', c); if (ic) ic.style.display = s.size ? 'none' : '';
    });
    $$('.menu-item[data-filter]').forEach((b) => b.setAttribute('aria-checked', String(st.f[b.dataset.filter as keyof Filters].has(b.dataset.value!))));
    $('#clear-filters')!.hidden = !any;
    const fb = $('#btn-filters')!; const fr = $('#filter-row')!;
    if (any) { fr.hidden = false; fb.setAttribute('aria-pressed', 'true'); fb.classList.add('on'); } else fb.classList.remove('on');
    try { sessionStorage.setItem('prism.leadlist', JSON.stringify({ ids: vis.map((m) => m.id), label: $(`[data-view="${st.view}"]`)?.textContent?.replace(/\d+$/, '').trim() })); } catch {}
    bulkUi();
    const q = new URLSearchParams(); if (st.view !== 'needs') q.set('view', st.view);
    (Object.keys(st.f) as (keyof Filters)[]).forEach((k) => st.f[k].size && q.set(k, [...st.f[k]].join(',')));
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
  }

  function patch(id: string) {
    const m = byId.get(id)!; const r = rowEl.get(id)!;
    $('[data-state]', r)!.innerHTML = icon(m.status);
    const hd = handler(m);
    const mo = $('[data-m-owner]', r); if (mo) mo.textContent = ` · ${hd.name}`;
    const txt = $('[data-status-text]', r); if (txt) txt.textContent = meta.statusLabel[m.status];
    const o = $('[data-owner]', r)!;
    const init = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('');
    o.innerHTML = hd.kind === 'joy' ? `<span class="avatar sm joy" title="Joy"><img src="/brand/joy-mark.svg" alt="" /></span><span>Joy</span>` : hd.kind === 'person' ? `<span class="avatar sm" data-tone="${(([...meta.owners[m.owner!]].reduce((a: number, c: string) => a + c.charCodeAt(0), 0)) % 5) + 1}">${init(meta.owners[m.owner!])}</span><span class="truncate">${first(meta.owners[m.owner!])}</span>` : `<span class="muted truncate"${hd.kind === 'paused' ? ` title="${meta.pausedWhy}"` : ''}>${hd.name}</span>`;
  }
  type Snap = { id: string; status: string; owner: string | null };
  const snap = (ids: string[]): Snap[] => ids.map((id) => ({ id, status: byId.get(id)!.status, owner: byId.get(id)!.owner }));
  const restore = (s: Snap[]) => { s.forEach((x) => { const m = byId.get(x.id)!; m.status = x.status; m.owner = x.owner; patch(x.id); }); render(); };
  function setStatus(ids: string[], status: string, owner?: string | null) {
    ids.forEach((id) => { const m = byId.get(id)!; m.status = status; if (owner !== undefined) m.owner = owner; else if (status === 'joy_handling') m.owner = 'joy'; else if (status === 'needs_person' && (m.owner === 'joy' || m.owner === null)) m.owner = 'casey'; patch(id); });
  }

  // ---- toolbar wiring
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const view = t.closest<HTMLElement>('[data-view]');
    if (view) { st.view = view.dataset.view!; st.group = VIEWS[st.view].group; st.order = VIEWS[st.view].order; render(); return; }
    const mode = t.closest<HTMLElement>('[data-mode]'); if (mode) { st.mode = mode.dataset.mode!; render(); return; }
    const flt = t.closest<HTMLElement>('.menu-item[data-filter]');
    if (flt) { const s = st.f[flt.dataset.filter as keyof Filters]; const v = flt.dataset.value!; s.has(v) ? s.delete(v) : s.add(v); render(); return; }
    const g = t.closest<HTMLElement>('.menu-item[data-group]'); if (g) { st.group = g.dataset.group!; render(); return; }
    const o = t.closest<HTMLElement>('.menu-item[data-order]'); if (o) { st.order = o.dataset.order!; render(); return; }
    if (t.closest('#clear-filters') || t.closest('#empty-clear')) { (Object.values(st.f) as Set<string>[]).forEach((s) => s.clear()); st.q = ''; ($('#lead-search') as HTMLInputElement).value = ''; st.view = 'needs'; st.group = 'status'; st.order = 'needs'; render(); return; }
    if (t.closest('#btn-filters')) { const b = $('#btn-filters')!; const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); $('#filter-row')!.hidden = !on && !st.q; if (on) $('#lead-search')?.focus(); }
  });
  $<HTMLInputElement>('#lead-search')!.addEventListener('input', (e) => { st.q = (e.target as HTMLInputElement).value.trim().toLowerCase(); render(); });

  // ---- row / card menus
  let curRow = '';
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const rm = t.closest<HTMLElement>('[data-row-menu]'); if (rm) { curRow = rm.closest<HTMLElement>('[data-id]')!.dataset.id!; ($('#row-open') as HTMLAnchorElement).href = `/inbox?t=${curRow}`; }
    const cm = t.closest<HTMLElement>('[data-card-menu]'); if (cm) curRow = cm.closest<HTMLElement>('[data-id]')!.dataset.id!;
  }, true);
  const logs: Record<string, string> = { texted: 'texted', called: 'called', emailed: 'emailed', 'sent a DM to': 'sent a DM to', 'saw in person': 'saw in person' };
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const lg = t.closest<HTMLElement>('[data-log]');
    if (lg && curRow) { const m = byId.get(curRow)!; toast(`Logged: you ${logs[lg.dataset.log!]} ${m.name}`, () => toast('Log entry removed')); return; }
    const act = t.closest<HTMLElement>('[data-row-act]');
    if (act && curRow) {
      const m = byId.get(curRow)!; const s = snap([curRow]);
      if (act.dataset.rowAct === 'joy') { setStatus([curRow], 'joy_handling'); render(); toast(`Handed ${m.name} back to Joy. She replies to texts and DMs again.`, () => restore(s)); }
      else { setStatus([curRow], 'booked'); render(); toast(`Marked ${m.name} as a client`, () => restore(s)); }
      return;
    }
    const mv = t.closest<HTMLElement>('[data-move]'); if (mv && curRow) { requestMove([curRow], mv.dataset.move!); return; }
  });

  // ---- board: rule preview before moving
  let pending: { ids: string[]; to: string } | null = null;
  function requestMove(ids: string[], to: string) {
    const ids2 = ids.filter((id) => byId.get(id)!.status !== to); if (!ids2.length) return;
    pending = { ids: ids2, to };
    const who = ids2.length === 1 ? byId.get(ids2[0])!.name : `${ids2.length} leads`;
    $('#rule-title')!.textContent = `Move ${who} to ${meta.statusLabel[to]}?`; $('#rule-text')!.textContent = meta.statusRule[to];
    $('#rule-bar')!.hidden = false; $('#rule-ok')!.textContent = to === 'needs_person' ? 'Move and pause Joy' : 'Move';
    if (st.mode !== 'board') { st.mode = 'board'; render(); }
    $('#rule-bar')!.scrollIntoView({ block: 'nearest' });
  }
  $('#rule-cancel')!.addEventListener('click', () => { pending = null; $('#rule-bar')!.hidden = true; });
  $('#rule-ok')!.addEventListener('click', () => {
    if (!pending) return; const { ids, to } = pending; const s = snap(ids); pending = null; $('#rule-bar')!.hidden = true;
    setStatus(ids, to); render();
    const n = ids.length === 1 ? byId.get(ids[0])!.name : `${ids.length} leads`;
    toast(to === 'needs_person' ? `Moved ${n} to Needs a person. Joy is paused on ${ids.length === 1 ? 'this lead' : 'these leads'}.` : `Moved ${n} to ${meta.statusLabel[to]}`, () => restore(s));
  });
  let dragId = '';
  cardEl.forEach((c, id) => {
    c.addEventListener('dragstart', (e) => { dragId = id; c.classList.add('dragging'); e.dataTransfer?.setData('text/plain', id); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; });
    c.addEventListener('dragend', () => { c.classList.remove('dragging'); $$('.bcol').forEach((x) => x.classList.remove('drop')); });
  });
  $$('.bcol').forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drop'); });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', (e) => { e.preventDefault(); col.classList.remove('drop'); if (dragId) requestMove([dragId], col.dataset.col!); dragId = ''; });
  });

  // ---- selection + bulk
  function bulkUi() {
    const n = st.sel.size; $('#bulk')!.hidden = n === 0; $('#bulk-n')!.textContent = `${n} selected`;
    const all = $<HTMLInputElement>('#select-all')!; const vis = $$('.lead-row[data-id]').filter((r) => !r.hidden);
    all.checked = n > 0 && vis.length > 0 && vis.every((r) => st.sel.has(r.dataset.id!)); all.indeterminate = n > 0 && !all.checked;
  }
  const mark = (id: string) => { const r = rowEl.get(id)!; r.setAttribute('aria-selected', String(st.sel.has(id))); $<HTMLInputElement>('[data-select]', r)!.checked = st.sel.has(id); };
  app.addEventListener('change', (e) => { const c = (e.target as HTMLElement).closest<HTMLInputElement>('[data-select]'); if (!c) return; const id = c.closest<HTMLElement>('[data-id]')!.dataset.id!; c.checked ? st.sel.add(id) : st.sel.delete(id); mark(id); bulkUi(); });
  $('#select-all')!.addEventListener('change', (e) => { const on = (e.target as HTMLInputElement).checked; $$('.lead-row[data-id]').filter((r) => !r.hidden).forEach((r) => { on ? st.sel.add(r.dataset.id!) : st.sel.delete(r.dataset.id!); mark(r.dataset.id!); }); bulkUi(); });
  $('#bulk-clear')!.addEventListener('click', () => { [...st.sel].forEach((id) => { st.sel.delete(id); mark(id); }); bulkUi(); });
  const sels = () => [...st.sel];
  const nm = (ids: string[]) => (ids.length === 1 ? byId.get(ids[0])!.name : `${ids.length} leads`);
  $('#bulk-joy')!.addEventListener('click', () => { const ids = sels(); const s = snap(ids); setStatus(ids, 'joy_handling'); render(); toast(`Handed ${nm(ids)} back to Joy`, () => restore(s)); });
  $('#bulk-text')!.addEventListener('click', () => {
    const ids = sels(); const ok = ids.filter((id) => byId.get(id)!.sms); const skip = ids.length - ok.length;
    toast(ok.length ? `Texting ${ok.length} ${ok.length === 1 ? 'lead' : 'leads'} from (847) 555-0114${skip ? `. Skipped ${skip} with no text consent.` : '.'} Quiet hours respected.` : `Nobody texted: none of these ${ids.length} agreed to texts. Call or email instead.`, ok.length ? () => toast('Texts cancelled before sending') : undefined);
  });
  $('#bulk-spam')!.addEventListener('click', () => { const ids = sels(); ids.forEach((id) => { st.spam.add(id); st.sel.delete(id); }); render(); toast(`Marked ${nm(ids)} as spam and hid them`, () => { ids.forEach((id) => st.spam.delete(id)); render(); }); });
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement; const a = t.closest<HTMLElement>('[data-assign]'); const q = t.closest<HTMLElement>('[data-seq]');
    if (a && st.sel.size) { const ids = sels(); const s = snap(ids); const who = a.textContent!.trim(); ids.forEach((id) => { byId.get(id)!.owner = a.dataset.assign!; patch(id); }); render(); toast(`Assigned ${nm(ids)} to ${who}. Joy pauses on them.`, () => restore(s)); }
    if (q && st.sel.size) { const ids = sels(); toast(`Added ${nm(ids)} to “${q.dataset.seq}”. Texts go only to leads who agreed, in quiet-hours-safe times.`, () => toast('Removed from sequence')); }
  });

  // ---- keyboard
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement as HTMLElement | null;
    if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey || st.mode !== 'list') return;
    const rows = $$('.lead-row[data-id]').filter((r) => !r.hidden && r.offsetParent && !r.closest('[data-collapsed="true"]'));
    const i = rows.findIndex((r) => r.dataset.id === st.focus);
    const go = (n: number) => { const r = rows[Math.max(0, Math.min(rows.length - 1, n))]; if (!r) return; $$('.is-focus').forEach((x) => x.classList.remove('is-focus')); r.classList.add('is-focus'); st.focus = r.dataset.id!; r.scrollIntoView({ block: 'nearest' }); };
    if (e.key === 'j') { e.preventDefault(); go(i + 1); } else if (e.key === 'k') { e.preventDefault(); go(i < 0 ? 0 : i - 1); }
    else if (e.key === 'x' && i >= 0) { const id = rows[i].dataset.id!; st.sel.has(id) ? st.sel.delete(id) : st.sel.add(id); mark(id); bulkUi(); }
    else if (e.key === 'Enter' && i >= 0) location.href = `/leads/${rows[i].dataset.id}`;
  });

  // ---- initial state from the URL (Home links to ?status=not_answered)
  const p = new URLSearchParams(location.search);
  if (p.get('view') && VIEWS[p.get('view')!]) { st.view = p.get('view')!; st.group = VIEWS[st.view].group; st.order = VIEWS[st.view].order; }
  (Object.keys(st.f) as (keyof Filters)[]).forEach((k) => p.get(k)?.split(',').filter(Boolean).forEach((v) => st.f[k].add(v)));
  render();
}
export {};
