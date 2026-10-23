// Salon setup: files in, sections filled, owner confirms. State lives in localStorage so the flow survives page changes.
import { SECTIONS, SOURCES, FILE_SOURCES, REQUIRED_FILES, OPTIONAL_FILES, STATUS, fillsFor, src, type SourceId, type Status, type Section } from '../data/onboarding.ts';
import { SALON } from '../data/salon.ts';

type FileRec = { name: string; size: string; facts: number; detail?: string };
interface State { files: Partial<Record<SourceId, FileRec>>; skipped: SourceId[]; extra: { name: string; size: string }[]; confirmed: string[]; manual: string[]; live?: boolean; pct?: number }
const KEY = 'prism-onboarding';
const blank = (): State => ({ files: {}, skipped: [], extra: [], confirmed: [], manual: [] });
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const toast = (m: string, undo?: () => void) => (window as any).prism?.toast?.(m, undo);
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

let st: State = (() => { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return blank(); } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* storage unavailable */ } };
const commit = () => { persist(); render(); };
const has = (id: SourceId) => !!st.files[id];
const ids = (need: string) => need.split(',').filter(Boolean) as SourceId[];
const all = (need: string) => ids(need).every(has);
const any = (need: string) => ids(need).some(has);
const busy = new Set<SourceId>();
const here = $('[data-ob-section]')?.dataset.obSection;
const list = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : a[0] || '');
const kb = (bytes: number) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);

// ---------- model
interface Row { s: Section; status: Status; answered: number }
function model() {
  const open = (s: Section) => (st.confirmed.includes(s.slug) ? [] : (s.conflicts ?? []).filter((c) => all(c.need.join(','))));
  const rows: Row[] = SECTIONS.filter((s) => s.sources.length).map((s) => {
    const present = s.sources.filter(has).length, manual = st.manual.includes(s.slug);
    if (st.confirmed.includes(s.slug)) return { s, status: s.slug === 'connections' ? 'waiting' : 'complete', answered: s.total };
    if (!present && !manual) return { s, status: 'todo', answered: 0 };
    const frac = present ? present / s.sources.length : 0.3;
    return { s, status: 'review', answered: Math.max(1, Math.min(s.total - 1, Math.round(s.total * frac) - open(s).length)) };
  });
  const setUp = (r: Row) => r.status === 'complete' || r.status === 'waiting';
  const filesN = REQUIRED_FILES.filter((f) => has(f.id)).length;
  const live = SECTIONS.find((s) => !s.sources.length)!;
  const conflicts = SECTIONS.flatMap((s) => open(s).map((c) => ({ s, c })));
  const checks = { files: filesN >= REQUIRED_FILES.length - REQUIRED_FILES.filter((f) => st.skipped.includes(f.id)).length && filesN > 0, phorest: has('phorest'), sections: rows.filter(setUp).length };
  const allSet = rows.every(setUp);
  const liveAnswered = [checks.files, checks.phorest, allSet, !conflicts.length && allSet].filter(Boolean).length;
  rows.push({ s: live, status: st.live ? 'complete' : allSet ? 'review' : 'todo', answered: liveAnswered });
  rows.sort((a, b) => a.s.n - b.s.n);
  // Prism filling a section is half the job; the owner confirming it is the other half.
  const total = rows.reduce((a, r) => a + r.s.total, 0), credit = rows.reduce((a, r) => a + (setUp(r) ? r.s.total : r.answered * 0.5), 0);
  const pct = Math.round((credit / total) * 100);
  const count = (k: Status) => rows.filter((r) => r.status === k).length;
  const facts = SOURCES.reduce((a, s) => a + (st.files[s.id]?.facts ?? 0), 0) + st.extra.length * 3;
  const confirmedFacts = Math.round(SOURCES.reduce((a, s) => { const f = st.files[s.id]; if (!f) return a; const sec = fillsFor(s.id); return a + (f.facts * sec.filter((x) => st.confirmed.includes(x.slug)).length) / sec.length; }, 0));
  const asks = rows.filter((r) => r.status !== 'todo').reduce((a, r) => a + r.s.asks.length, 0);
  const ready = Math.max(0, Math.min(100, Math.round(pct * 0.92 + (has('phorest') ? 8 : 0) - conflicts.length * 3)));
  const missing = REQUIRED_FILES.filter((f) => !has(f.id) && !st.skipped.includes(f.id));
  const gaps = [
    ...conflicts.map(({ s, c }) => ({ text: c.short, where: s.title, href: `/onboarding/${s.slug}` })),
    ...missing.map((f) => ({ text: `Add ${f.ask}`, where: 'Your files', href: '/onboarding/files' })),
    ...rows.filter((r) => r.status === 'review' && !open(r.s).length && r.s.sources.length).map((r) => ({ text: `Confirm ${r.s.title.toLowerCase()}`, where: r.s.title, href: `/onboarding/${r.s.slug}` })),
  ];
  const next = !has('phorest') || (!filesN && !has('website')) ? '/onboarding/files' : `/onboarding/${(rows.find((r) => r.status === 'review') ?? rows.find((r) => r.status === 'todo') ?? rows[rows.length - 1]).s.slug}`;
  const minsLeft = rows.filter((r) => !setUp(r)).reduce((a, r) => a + r.s.minutes, 0);
  return { rows, pct, count, filesN, facts, confirmedFacts, asks, ready, conflicts, gaps, next, minsLeft, checks, allSet, setUp: rows.filter(setUp).length };
}

// ---------- render
const SHORT: Partial<Record<SourceId, string>> = { phorest: SALON.booking.system, website: 'your website' };
function rowHint(s: Section, status: Status, conflicts: string[]) {
  if (!s.sources.length) return status === 'todo' ? 'Opens when the other sections are confirmed' : st.live ? 'Joy is live' : 'Chat with Joy, then turn her on';
  if (status === 'waiting') return 'Texting number waiting on carrier approval';
  if (status === 'todo') { const miss = s.sources.find((id) => !has(id)); return st.manual.includes(s.slug) || !miss ? 'Started' : `Waiting for ${src(miss).ask}`; }
  if (conflicts.length) return conflicts[0];
  const from = s.sources.filter(has).map((id) => SHORT[id] ?? st.files[id]!.name);
  const opt = (s.extras ?? []).filter((id) => !has(id)).map((id) => src(id).ask.replace(/^your /, ''));
  const base = status === 'complete' ? 'Confirmed' : from.length ? `From ${list(from)}` : 'Typed in by you';
  return opt.length && status !== 'complete' ? `${base} · ${opt[0]} optional` : base;
}
const bind = (k: string, v: string | number) => $$(`[data-bind="${k}"]`).forEach((el) => (el.textContent = String(v)));
function render() {
  const m = model();
  if (st.pct !== m.pct) { st.pct = m.pct; persist(); }
  bind('pct', m.pct); bind('done', m.setUp); bind('mins', m.minsLeft); bind('files-n', `${m.filesN}/${REQUIRED_FILES.length}`);
  bind('facts', m.facts); bind('confirmed', m.confirmedFacts); bind('conflicts', m.conflicts.length); bind('asks', m.asks); bind('ready', m.ready);
  bind('kb-n', Object.keys(st.files).filter((k) => src(k as SourceId).kind === 'file').length + st.extra.length); bind('gaps-n', m.gaps.length);
  $$('[data-nav-pct]').forEach((el) => (el.textContent = `${m.pct}%`));

  $$('[data-ring-fill]').forEach((c) => { const len = Number(c.dataset.c); c.setAttribute('stroke-dashoffset', String(len * (1 - m.pct / 100))); c.closest('[data-ring]')?.setAttribute('aria-label', `${m.pct}% set up`); });
  (['complete', 'review', 'todo', 'waiting'] as Status[]).forEach((k) => $$(`[data-count="${k}"]`).forEach((el) => (el.textContent = String(m.count(k)))));

  // anything that depends on a source
  $$('[data-need]').forEach((el) => {
    const need = el.dataset.need || '';
    if (!need) return;
    if (el.classList.contains('ob-fill')) {
      const met = any(need), manual = !!here && st.manual.includes(here);
      el.dataset.ready = met ? 'true' : manual ? 'manual' : 'false';
      if (!met && manual && !el.dataset.cleared) { el.dataset.cleared = '1'; $$<HTMLInputElement>('.ob-fill-body input:not([type]), .ob-fill-body input[type="text"], .ob-fill-body input[type="email"], .ob-fill-body textarea', el).forEach((i) => { if (!i.readOnly) i.value = ''; }); }
    } else el.dataset.ready = String(all(need));
  });
  $$('[data-need-one]').forEach((b) => (b.hidden = has(b.dataset.needOne as SourceId)));
  $$('[data-from]').forEach((el) => (el.dataset.ready = String(all(el.dataset.from!))));
  $$('[data-chip]').forEach((el) => { const id = el.dataset.chip as SourceId; el.dataset.ready = String(has(id)); el.dataset.busy = String(busy.has(id)); });
  $$('[data-chip-name]').forEach((el) => { const f = st.files[el.dataset.chipName as SourceId]; if (f) el.textContent = f.name; });

  // section cards and step lists
  m.rows.forEach(({ s, status }) => {
    const meta = STATUS[status];
    $$(`[data-card="${s.slug}"]`).forEach((card) => {
      card.dataset.status = status;
      const tag = $('[data-status-tag]', card)!; tag.className = `tag ${meta.tone}`; tag.textContent = meta.label;
      $('[data-cta]', card)!.textContent = s.sources.length ? meta.cta : st.live ? 'View' : 'Test Joy';
      const hint = $('[data-row-hint]', card); if (hint) hint.textContent = rowHint(s, status, m.conflicts.filter((x) => x.s === s).map((x) => x.c.short));
    });
    $$(`[data-step="${s.slug}"]`).forEach((el) => (el.dataset.status = status));
    if (s.slug === here) {
      const sec = $('[data-ob-section]')!;
      sec.dataset.confirmed = String(st.confirmed.includes(s.slug));
      const tag = $('.ob-sec-head [data-status-tag]')!; tag.className = `tag ${meta.tone}`; tag.textContent = meta.label;
      $$('[data-confirm-label]').forEach((el) => (el.textContent = st.confirmed.includes(s.slug) ? 'Confirmed' : 'Confirm summary'));
      $$('[data-confirm-next-label]').forEach((el) => (el.textContent = status === 'todo' ? 'Skip for now' : st.confirmed.includes(s.slug) ? 'Next section' : 'Confirm & next'));
    }
  });
  $$('[data-files-step]').forEach((el) => (el.dataset.done = String(m.filesN === REQUIRED_FILES.length)));

  // files step
  $$('[data-slot]').forEach((el) => {
    const id = el.dataset.slot as SourceId;
    if (busy.has(id)) return;
    el.dataset.state = has(id) ? 'done' : st.skipped.includes(id) ? 'skipped' : 'empty';
    const f = st.files[id];
    if (f) { $('[data-slot-name]', el)!.textContent = f.name; $('[data-slot-detail]', el)!.textContent = [f.size, f.detail ?? src(id).sample.detail].filter(Boolean).join(' · '); $('[data-slot-facts]', el)!.textContent = String(f.facts); }
  });
  $$('[data-files-tag]').forEach((el) => (el.className = `tag ${m.filesN === REQUIRED_FILES.length ? 'good' : m.filesN ? 'violet' : ''}`));
  $$('[data-filled]').forEach((el) => {
    const s = SECTIONS.find((x) => x.slug === el.dataset.filled)!, n = s.sources.filter(has).length;
    el.dataset.level = n === 0 ? 'none' : n === s.sources.length ? 'full' : 'part';
    $('[data-filled-n]', el)!.textContent = n === s.sources.length ? 'Filled' : `${n}/${s.sources.length}`;
  });
  $$('[data-fill-go]').forEach((a) => a.setAttribute('href', m.filesN || has('website') ? m.next : '/onboarding'));
  if (OPTIONAL_FILES.some((f) => has(f.id) || busy.has(f.id))) $$<HTMLDetailsElement>('details.ob-opt').forEach((d) => { if (!d.dataset.auto) { d.open = true; d.dataset.auto = '1'; } });
  const extra = $('[data-extra]');
  if (extra) extra.innerHTML = st.extra.map((f) => `<li><span>${esc(f.name)}</span><span class="muted">Added to your knowledge base</span></li>`).join('');

  // hub
  $$('[data-src-tile]').forEach((el) => { const id = el.dataset.srcTile as SourceId; el.dataset.ready = has(id) ? 'true' : st.skipped.includes(id) ? 'skipped' : 'false'; const f = st.files[id]; const n = $('[data-tile-facts]', el); if (f && n) n.textContent = String(f.facts); });
  const connect = $('[data-hub-step="connect"]'), filesStep = $('[data-hub-step="files"]');
  if (connect && filesStep) {
    const filesDone = m.checks.files && has('website');
    connect.dataset.state = has('phorest') ? 'done' : 'todo';
    filesStep.dataset.state = filesDone ? 'done' : 'todo';
    connect.toggleAttribute('data-active', !has('phorest'));
    filesStep.toggleAttribute('data-active', has('phorest') && !filesDone);
    $('[data-files-cta]', filesStep)!.textContent = filesDone ? 'Manage files' : m.filesN || has('website') ? 'Add the rest' : 'Add files';
  }
  $$('[data-continue]').forEach((a) => a.setAttribute('href', m.next));
  $$('[data-sum-sub]').forEach((el) => (el.textContent = m.facts ? `Built from ${m.filesN} ${m.filesN === 1 ? 'file' : 'files'}${has('website') ? `, ${SALON.site}` : ''}${has('phorest') ? ` and ${SALON.booking.system}` : ''}. Joy only uses facts you confirm.` : `Nothing yet. Connect ${SALON.booking.system} and Prism starts filling this in.`));
  $$('[data-gaps]').forEach((ul) => {
    const golive = !!ul.closest('.ob-sec');
    const g = m.gaps.slice(0, golive ? 6 : 3);
    ul.innerHTML = g.length
      ? g.map((x) => golive
        ? `<li>${ICON.warn}<span><strong>${esc(x.text)}</strong><small>${esc(x.where)}</small></span><a class="btn btn-sm" href="${x.href}">Fix ${ICON.arrow}</a></li>`
        : `<li>${ICON.warn}<span>${esc(x.text)}</span><a href="${x.href}">${esc(x.where)} ${ICON.arrow}</a></li>`).join('')
      : `<li class="ok">${ICON.check}<span>${m.allSet ? 'No gaps left. Joy is ready for review.' : 'Nothing flagged yet.'}</span></li>`;
    if (golive && m.gaps.length > g.length) ul.insertAdjacentHTML('beforeend', `<li class="more t-small muted">+ ${m.gaps.length - g.length} more. Confirm the remaining sections from the list on the left.</li>`);
  });

  // knowledge base
  const kbl = $('[data-kb-list]');
  if (kbl) {
    const rows = [
      ...FILE_SOURCES.filter((f) => has(f.id)).map((f) => ({ name: st.files[f.id]!.name, sub: [st.files[f.id]!.size, st.files[f.id]!.detail ?? f.sample.detail].filter(Boolean).join(' · '), facts: st.files[f.id]!.facts, to: fillsFor(f.id).map((x) => x.title).slice(0, 2).join(' · ') })),
      ...st.extra.map((f) => ({ name: f.name, sub: f.size, facts: 3, to: 'Knowledge base' })),
    ];
    kbl.innerHTML = rows.map((r) => `<li>${ICON.file}<span class="truncate"><strong class="truncate">${esc(r.name)}</strong><small>${esc(r.sub)}</small></span><span class="ob-kb-to"><b>${r.facts} facts found</b>Fed: ${esc(r.to)}</span></li>`).join('');
    $('[data-kb-empty]')!.hidden = rows.length > 0;
  }

  // go live
  $$('[data-check]').forEach((li) => {
    const k = li.dataset.check as 'files' | 'phorest' | 'sections';
    const done = k === 'sections' ? m.allSet : m.checks[k];
    li.dataset.done = String(done);
    $('[data-check-t]', li)!.textContent = k === 'sections' ? `${m.checks.sections} of ${SECTIONS.length - 1}` : done ? 'Done' : 'To do';
  });
  $$('[data-ready-segs]').forEach((el) => { const segs = $$('i', el); segs.forEach((i, n) => i.classList.toggle('on', n < Math.round((m.ready / 100) * segs.length))); });
  const launch = $('[data-launch]');
  if (launch) {
    const ok = m.allSet && !m.conflicts.length;
    launch.dataset.ready = String(ok || !!st.live);
    $<HTMLButtonElement>('[data-turn-on]', launch)!.disabled = !ok || !!st.live;
    $('[data-launch-sub]', launch)!.textContent = st.live ? 'Joy is on. She’s answering texts, DMs and calls.' : ok ? 'Everything is confirmed. PRISM reviews Joy within 1 business day, then she goes live.' : `Close ${m.gaps.length} ${m.gaps.length === 1 ? 'gap' : 'gaps'} to turn Joy on.`;
  }
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const svg = (d: string) => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  warn: svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  arrow: svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  file: svg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13H8"/><path d="M16 17H8"/>'),
};

// ---------- upload simulation
function ingest(id: SourceId, file?: { name: string; size: string }) {
  if (busy.has(id)) return;
  const s = src(id);
  const rec: FileRec = { name: file?.name || s.sample.name, size: file ? file.size : s.sample.size, facts: s.sample.facts, detail: file && s.kind === 'file' ? '' : s.sample.detail };
  busy.add(id); st.skipped = st.skipped.filter((x) => x !== id);
  const slot = $(`[data-slot="${id}"]`);
  if (slot) { slot.dataset.state = 'uploading'; $('[data-slot-name]', slot)!.textContent = rec.name; $('[data-slot-detail]', slot)!.textContent = [rec.size, rec.detail].filter(Boolean).join(' · '); }
  render();
  const bar = slot ? $('[data-slot-pct]', slot) : null;
  const t0 = performance.now(), up = calm ? 0 : 700, read = calm ? 300 : 1100;
  const tick = (t: number) => { const p = Math.min(1, (t - t0) / Math.max(up, 1)); if (bar) bar.style.width = `${Math.round(p * 100)}%`; if (p < 1) requestAnimationFrame(tick); else reading(); };
  const reading = () => {
    if (slot) slot.dataset.state = 'reading';
    setTimeout(() => {
      busy.delete(id); st.files[id] = rec; commit();
      const fills = fillsFor(id).map((x) => x.title);
      toast(`${s.kind === 'file' ? rec.name : s.label}: ${rec.facts} facts found. Filled ${list(fills)}.`);
    }, read);
  };
  requestAnimationFrame(tick);
}
function match(name: string): SourceId | null {
  const n = name.toLowerCase();
  for (const s of FILE_SOURCES) if (s.id !== 'photos' && s.keywords.some((k) => n.includes(k))) return s.id;
  if (/\.(jpe?g|png|heic|webp|gif)$/.test(n) || n.includes('photo')) return 'photos';
  return null;
}
function takeFiles(files: File[], forced?: SourceId) {
  if (!files.length) return;
  if (forced) {
    const name = files.length > 1 ? `${files.length} files` : files[0].name;
    ingest(forced, { name, size: kb(files.reduce((a, f) => a + f.size, 0)) });
    return;
  }
  const images = files.filter((f) => match(f.name) === 'photos');
  const sorted: string[] = [], extra: string[] = [];
  if (images.length && !has('photos')) { ingest('photos', { name: images.length > 1 ? `${images.length} photos` : images[0].name, size: kb(images.reduce((a, f) => a + f.size, 0)) }); sorted.push('photos'); }
  files.filter((f) => !images.includes(f)).forEach((f) => {
    const id = match(f.name);
    if (id && !has(id) && !busy.has(id)) { ingest(id, { name: f.name, size: kb(f.size) }); sorted.push(src(id).ask.replace(/^your /, '')); }
    else { st.extra.push({ name: f.name, size: kb(f.size) }); extra.push(f.name); }
  });
  if (extra.length) commit();
  toast([sorted.length ? `Prism sorted ${sorted.length} ${sorted.length === 1 ? 'file' : 'files'}` : '', extra.length ? `${extra.length} added to your knowledge base` : ''].filter(Boolean).join('. ') + '.');
}

// shared hidden picker for "Upload your price list" buttons outside the files step
const picker = Object.assign(document.createElement('input'), { type: 'file', className: 'sr-only', tabIndex: -1 });
picker.setAttribute('aria-hidden', 'true');
document.body.appendChild(picker);
let pickFor: SourceId | null = null;
picker.addEventListener('change', () => { if (pickFor && picker.files?.length) takeFiles(Array.from(picker.files), pickFor); picker.value = ''; pickFor = null; });

// ---------- events
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const pick = t.closest<HTMLElement>('[data-pick]');
  if (pick) {
    e.preventDefault();
    const id = pick.dataset.pick as SourceId;
    if (src(id).kind === 'link') ingest(id);
    else { pickFor = id; picker.multiple = id === 'photos'; picker.click(); }
    return;
  }
  const chip = t.closest<HTMLElement>('.ob-chips .chip');
  if (chip) {
    const group = chip.closest<HTMLElement>('.ob-chips')!;
    if (group.hasAttribute('data-single')) $$('.chip', group).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    else chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
    if (group.hasAttribute('data-handoff')) { const note = $('[data-handoff-note]'); if (note) note.hidden = !!$('.chip[aria-pressed="true"]', group); }
    return;
  }
  const step = t.closest<HTMLElement>('[data-scale] button');
  if (step) {
    const btns = $$('button', step.parentElement!), idx = btns.indexOf(step);
    btns.forEach((b, i) => { b.dataset.on = String(i <= idx); b.setAttribute('aria-checked', String(i === idx)); });
    return;
  }
  if (t.closest('[data-sample]')) {
    const todo = SOURCES.filter((s) => !s.optional && !has(s.id) && !busy.has(s.id));
    todo.forEach((s, i) => setTimeout(() => ingest(s.id), calm ? 0 : i * 260));
    return;
  }
  const skip = t.closest<HTMLElement>('[data-skip]');
  if (skip) { const id = skip.dataset.skip as SourceId; if (!st.skipped.includes(id)) st.skipped.push(id); commit(); return; }
  const unskip = t.closest<HTMLElement>('[data-unskip]');
  if (unskip) { st.skipped = st.skipped.filter((x) => x !== unskip.dataset.unskip); commit(); return; }
  const rm = t.closest<HTMLElement>('[data-remove-src]');
  if (rm) {
    const id = rm.dataset.removeSrc as SourceId, was = st.files[id];
    delete st.files[id]; commit();
    toast(`Removed ${was?.name ?? src(id).label}. Its facts are no longer used.`, () => { if (was) { st.files[id] = was; commit(); } });
    return;
  }
  if (t.closest('[data-manual]') && here) {
    if (!st.manual.includes(here)) st.manual.push(here);
    commit();
    $<HTMLInputElement>('.ob-fill[data-ready="manual"] input:not([readonly]), .ob-fill[data-ready="manual"] textarea')?.focus();
    return;
  }
  if (t.closest('[data-confirm]') && here) {
    if (st.confirmed.includes(here)) { st.confirmed = st.confirmed.filter((x) => x !== here); commit(); toast('Back to review. Joy won’t use these facts until you confirm again.'); }
    else { st.confirmed.push(here); commit(); toast('Confirmed. Joy will use these facts.', () => { st.confirmed = st.confirmed.filter((x) => x !== here); commit(); }); }
    return;
  }
  const cn = t.closest<HTMLElement>('[data-confirm-next]');
  if (cn && here) {
    const row = model().rows.find((r) => r.s.slug === here)!;
    if (row.status !== 'todo' && !st.confirmed.includes(here)) { st.confirmed.push(here); persist(); }
    location.href = cn.dataset.next!;
    return;
  }
  if (t.closest('[data-save-draft]')) { persist(); toast('Draft saved. Pick up where you left off any time.'); return; }
  if (t.closest('[data-edit]')) { const f = $<HTMLElement>('.ob-sec-main input:not([readonly]), .ob-sec-main textarea, .ob-sec-main .chip'); f?.focus(); f?.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' }); return; }
  if (t.closest('[data-reread]')) { ingest('website', st.files.website ? { name: st.files.website.name, size: '' } : undefined); return; }
  const imp = t.closest<HTMLElement>('[data-improve]');
  if (imp) {
    const ta = imp.closest('.field')?.querySelector<HTMLTextAreaElement>('textarea');
    if (ta && ta.value.trim()) { const old = ta.value; const first = old.split(/(?<=[.!?])\s+/)[0]; ta.value = first === old ? old.replace(/\s+/g, ' ').trim() : first; toast('Joy tightened it to one line.', () => (ta.value = old)); }
    return;
  }
  const keep = t.closest<HTMLElement>('[data-keep]');
  if (keep) { const li = keep.closest<HTMLElement>('[data-faq]')!; const on = li.dataset.kept !== 'true'; li.dataset.kept = String(on); $('span', keep)!.textContent = on ? 'Kept' : 'Keep'; return; }
  const ft = t.closest<HTMLElement>('[data-faq-toggle]');
  if (ft) {
    const li = ft.closest<HTMLElement>('[data-faq]')!, ta = $<HTMLTextAreaElement>('[data-faq-edit]', li)!, p = $('[data-faq-a]', li)!;
    const editing = ta.hidden; ta.hidden = !editing; p.hidden = editing; $('span', ft)!.textContent = editing ? 'Done' : 'Edit';
    if (editing) ta.focus(); else p.textContent = ta.value;
    return;
  }
  const ct = t.closest<HTMLElement>('[data-conn-toggle]');
  if (ct) {
    const li = ct.closest('li')!, tag = $('[data-conn-tag]', li)!, on = tag.textContent !== 'Connected';
    tag.textContent = on ? 'Connected' : 'Not connected'; tag.className = `tag ${on ? 'good' : ''}`; ct.textContent = on ? 'Manage' : 'Connect'; ct.classList.toggle('btn-primary', !on);
    if (on) toast(`${$('strong', li)!.textContent} connected.`);
    return;
  }
  const ask = t.closest<HTMLElement>('[data-ask]');
  if (ask) { chat(ask.dataset.ask!); return; }
  const on = t.closest<HTMLButtonElement>('[data-turn-on]');
  if (on && !on.disabled) { st.live = true; commit(); toast('Joy is on. PRISM will check her first replies today.'); }
});

document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.matches('[data-slot-input]') && t.files?.length) { takeFiles(Array.from(t.files), t.dataset.slotInput as SourceId); t.value = ''; return; }
  if (t.matches('[data-drop-input]') && t.files?.length) { takeFiles(Array.from(t.files)); t.value = ''; return; }
  if (t.matches('[data-step-select]')) { location.href = (t as unknown as HTMLSelectElement).value; return; }
  if (t.matches('[data-hours] .switch')) {
    const li = t.closest<HTMLElement>('li')!, txt = $('.t', li)!;
    li.dataset.closed = String(!t.checked); txt.textContent = t.checked ? txt.dataset.openText! : 'Closed';
    return;
  }
  if (t.matches('[data-book]')) { const lbl = t.parentElement!.querySelector('span')!; lbl.textContent = t.checked ? 'Joy can book' : 'Joy can’t book'; }
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.matches('[data-missing]')) { const note = $('[data-missing-note]'); if (note) note.hidden = !!t.value.trim(); }
});
document.addEventListener('submit', (e) => {
  const f = e.target as HTMLFormElement;
  if (f.matches('[data-url-form]')) {
    e.preventDefault();
    const v = (f.querySelector('input') as HTMLInputElement).value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!v) return;
    ingest('website', { name: v, size: '' });
  }
  if (f.matches('[data-chat-form]')) { e.preventDefault(); const i = f.querySelector('input')!; chat(i.value); i.value = ''; }
});

// drag and drop onto any drop zone
$$('[data-drop]').forEach((z) => {
  ['dragenter', 'dragover'].forEach((ev) => z.addEventListener(ev, (e) => { e.preventDefault(); z.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => z.addEventListener(ev, () => z.classList.remove('is-over')));
  z.addEventListener('drop', (e) => { e.preventDefault(); takeFiles(Array.from((e as DragEvent).dataTransfer?.files ?? [])); });
});
// a file dropped anywhere else on the page should not navigate away
['dragover', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => { if (!(e.target as HTMLElement).closest?.('[data-drop]')) e.preventDefault(); }));

// test chat on Review & go live
const chatData: { q: string; a: string }[] = JSON.parse(document.getElementById('ob-chat-data')?.textContent || '[]');
function chat(q: string) {
  q = q.trim(); const log = $('[data-chat]'); if (!q || !log) return;
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const hit = chatData.map((c) => ({ c, n: words.filter((w) => c.q.toLowerCase().includes(w.slice(0, 4))).length })).sort((a, b) => b.n - a.n)[0];
  const a = hit && hit.n > 0 ? hit.c.a : 'I don’t have a confirmed answer for that yet, so I’ll ask the front desk and get back to you within 2 business hours.';
  log.insertAdjacentHTML('beforeend', `<p class="you">${esc(q)}</p>`);
  setTimeout(() => { log.insertAdjacentHTML('beforeend', `<p class="joy">${esc(a)}</p>`); log.scrollTop = log.scrollHeight; }, calm ? 0 : 420);
  log.scrollTop = log.scrollHeight;
}

render();
