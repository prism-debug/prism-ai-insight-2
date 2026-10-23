// Inbox behaviour: thread switching, filters, search, composer, Joy control, details sheet.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const toast = (m: string, undo?: () => void) => (window as any).prism?.toast(m, undo);
const root = $('#inbox')!;
const list = $('[data-rows]', root)!;
const old: { id: string; name: string; text: string; status: string }[] = JSON.parse($('#inbox-old')?.textContent || '[]');
const mobile = () => window.matchMedia('(max-width: 900px)').matches;
const rows = () => $$('.trow', list);
let filter = 'all', q = '', current = '', newest = false;

// ---- selection
function convOf(id: string) { return $(`[data-conv="${id}"]`, root); }
function select(id: string, opts: { push?: boolean; quiet?: boolean } = {}) {
  current = id;
  rows().forEach((r) => r.setAttribute('aria-selected', String(r.dataset.thread === id)));
  $$('[data-conv]', root).forEach((c) => (c.hidden = c.dataset.conv !== id));
  $$('[data-rail]', root).forEach((c) => (c.hidden = c.dataset.rail !== id));
  const oldEl = $('[data-old]', root)!, none = $('[data-none]', root)!;
  const hasConv = !!convOf(id);
  oldEl.hidden = hasConv || !id; none.hidden = !!id;
  if (id && !hasConv) {
    const o = old.find((x) => x.id === id);
    $('[data-old-name]', root)!.textContent = o?.name ?? id;
    $('[data-old-text]', root)!.textContent = o?.text ?? '';
    $<HTMLAnchorElement>('[data-old-link]', root)!.href = `/leads/${id}`;
  }
  const row = rows().find((r) => r.dataset.thread === id);
  if (row && !opts.quiet && row.dataset.unread === '1') { row.dataset.unread = '0'; $('.unread-dot', row)!.hidden = true; recount(); }
  if (mobile()) root.dataset.view = id ? 'thread' : 'list';
  if (opts.push !== false) { const u = new URL(location.href); id ? u.searchParams.set('t', id) : u.searchParams.delete('t'); u.hash = ''; history.replaceState(null, '', u); }
  scrollEnd();
}
function scrollEnd() { const s = $('[data-conv]:not([hidden]) [data-scroll]', root); if (s) s.scrollTop = s.scrollHeight; }
list.addEventListener('click', (e) => { const r = (e.target as HTMLElement).closest<HTMLElement>('.trow'); if (r) select(r.dataset.thread!); });
root.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('[data-back]')) { root.dataset.view = 'list'; current = ''; const u = new URL(location.href); u.searchParams.delete('t'); history.replaceState(null, '', u); }
});

// ---- filters + search
const gstatus = (r: HTMLElement) => (r.dataset.unread === '1' ? 'needs' : r.dataset.status === 'joy_handling' ? 'joy' : 'done');
function regroup() {
  // Needs a reply: longest wait first (oldest on top) unless Newest is chosen; other groups newest first
  rows().sort((a, b) => (a.dataset.unread === '1' && b.dataset.unread === '1' && !newest ? Number(a.dataset.ts) - Number(b.dataset.ts) : Number(b.dataset.ts) - Number(a.dataset.ts))).forEach((r) => { const g = $(`.t-group[data-group="${gstatus(r)}"]`, list); if (g) g.appendChild(r); });
  $$('.t-group', list).forEach((g) => { const n = $$('.trow', g).filter((r) => !r.hidden).length; $('[data-gcount]', g)!.textContent = String(n); g.hidden = n === 0; });
}
function apply() {
  let n = 0;
  rows().forEach((r) => { const ok = (r.dataset.filters || '').split(' ').includes(filter) && (!q || (r.dataset.text || '').includes(q)); r.hidden = !ok; if (ok) n++; });
  regroup();
  $('[data-empty]', root)!.hidden = n !== 0;
  $$('.l-tabs .tab', root).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.filter === filter)));
  const fn = $('[data-filter-now]', root); if (fn) fn.textContent = (filter === 'all' ? 'All conversations' : $('.l-tabs .tab[aria-selected="true"]', root)?.firstChild?.textContent ?? '') + (q ? ` · “${q}”` : '');
}
function recount() {
  $$('[data-count]', root).forEach((c) => { const k = c.dataset.count!; c.textContent = String(rows().filter((r) => (r.dataset.filters || '').split(' ').includes(k) && (k !== 'needs' || r.dataset.unread === '1')).length); });
  const n = rows().filter((r) => r.dataset.unread === '1').length; const s = $('[data-stat="needs"]', root); if (s) s.textContent = String(n);
  const ub = $('[data-unread-n]'); if (ub) ub.textContent = String(n);
  rows().forEach((r) => { const f = (r.dataset.filters || '').split(' ').filter((x) => x !== 'needs'); if (r.dataset.unread === '1') f.push('needs'); r.dataset.filters = f.join(' '); });
  regroup();
}
document.addEventListener('click', (e) => { const o = (e.target as HTMLElement).closest<HTMLElement>('[data-inbox-order]'); if (!o) return; newest = o.dataset.inboxOrder === 'newest'; $$('[data-inbox-order]').forEach((b) => b.setAttribute('aria-checked', String(b === o))); regroup(); });
$('.l-tabs', root)!.addEventListener('click', (e) => { const t = (e.target as HTMLElement).closest<HTMLElement>('.tab'); if (t) { filter = t.dataset.filter!; apply(); } });
$<HTMLInputElement>('[data-search]', root)!.addEventListener('input', (e) => { q = (e.target as HTMLInputElement).value.trim().toLowerCase(); apply(); });
$('[data-clear]', root)!.addEventListener('click', () => { filter = 'all'; q = ''; $<HTMLInputElement>('[data-search]', root)!.value = ''; apply(); });

$('#f-toggle')?.addEventListener('click', () => { const h = $('.l-head', root)!; const o = h.dataset.fOpen !== 'true'; h.dataset.fOpen = String(o); $('#f-toggle')!.setAttribute('aria-expanded', String(o)); if (o) $<HTMLInputElement>('[data-search]', root)!.focus(); });
try { $('.nav-item[href="/inbox"]')?.setAttribute('title', `${$('[data-unread-n]')?.textContent ?? ''} conversations with an unread message`); } catch {}

// ---- composer
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const nowLabel = () => 'now';
function activeConv() { return $<HTMLElement>('[data-conv]:not([hidden])', root); }
function mode(c: HTMLElement) { return $('[data-mode][aria-selected="true"]', c)?.dataset.mode || 'reply'; }
function setMode(c: HTMLElement, m: string) {
  $$('[data-mode]', c).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
  const ta = $<HTMLTextAreaElement>('[data-input]', c)!, line = $('[data-consent-line]', c)!, txt = $('[data-consent-text]', c)!, send = $<HTMLButtonElement>('[data-send]', c)!;
  const ok = c.dataset.consent === '1';
  if (m === 'note') { ta.disabled = false; ta.placeholder = 'Write a note for your team'; txt.textContent = line.dataset.note!; line.classList.remove('bad'); send.disabled = false; $('[data-send-label]', c)!.textContent = 'Save note'; }
  else { ta.disabled = !ok; ta.placeholder = ok ? `Reply to ${c.dataset.first}` : `Texts to ${c.dataset.first} are off. Add a note or call instead.`; txt.textContent = ok ? line.dataset.ok! : line.dataset.no!; line.classList.toggle('bad', !ok); send.disabled = !ok; $('[data-send-label]', c)!.textContent = 'Send'; }
}
function bubble(c: HTMLElement, text: string, kind: 'team' | 'note') {
  const log = $('[data-log]', c)!;
  log.insertAdjacentHTML('beforeend', `<div class="msg ${kind === 'note' ? 'team note' : 'team'}"><span class="avatar sm" data-tone="5" title="Casey Marlow">CM</span><div class="bub"><p>${esc(text)}</p><span class="mt tnum">${kind === 'note' ? 'Note · only your team · ' : 'Casey · '}${nowLabel()}</span></div></div>`);
  scrollEnd();
}
function bumpRow(id: string, text: string) {
  const r = rows().find((x) => x.dataset.thread === id); if (!r) return;
  $('.t-prev', r)!.textContent = text; $('.t-time', r)!.textContent = 'now'; $('.t-time', r)!.classList.remove('late'); r.dataset.text = (r.dataset.text || '') + ' ' + text.toLowerCase();
  r.dataset.ts = String(Date.now()); apply();
}
root.addEventListener('click', (e) => {
  const t = e.target as HTMLElement; const c = t.closest<HTMLElement>('[data-conv]'); if (!c) return;
  const ta = $<HTMLTextAreaElement>('[data-input]', c)!; const id = c.dataset.conv!; const f = c.dataset.first!;
  const m = t.closest<HTMLElement>('[data-mode]'); if (m) { setMode(c, m.dataset.mode!); ta.focus(); return; }
  const tpl = t.closest<HTMLElement>('[data-tpl]'); if (tpl && !ta.disabled) { ta.value = (ta.value ? ta.value.trimEnd() + ' ' : '') + tpl.dataset.tpl; ta.focus(); return; }
  const use = t.closest<HTMLElement>('[data-use-sug]'); if (use) { setMode(c, 'reply'); ta.value = use.dataset.text!; ta.focus(); $('[data-sug]', c)?.setAttribute('hidden', ''); return; }
  if (t.closest('[data-reply-focus]')) { ta.focus(); return; }
  const heard = t.closest<HTMLElement>('[data-vm-heard]');
  if (heard) {
    const tag = $('[data-vm-tag]', c)!; tag.textContent = 'Heard by you'; tag.className = 'tag'; heard.remove();
    const s = $('[data-stat="unheard"]', root); if (s) s.textContent = String(Math.max(0, Number(s.textContent) - 1));
    toast('Marked as heard', () => { tag.textContent = 'Not heard yet'; tag.className = 'tag violet'; if (s) s.textContent = String(Number(s.textContent) + 1); }); return;
  }
  const joy = t.closest<HTMLElement>('[data-joy-toggle]');
  if (joy) {
    const on = c.dataset.joy === '1'; const flip = (v: boolean) => {
      c.dataset.joy = v ? '1' : '0'; $('[data-joy-label]', c)!.textContent = v ? 'Pause Joy' : 'Hand back to Joy'; joy.classList.toggle('btn-dash', !v);
      $('[data-state-text]', c)!.innerHTML = v ? `<strong>Joy is handling this.</strong> She replies within a minute and hands over when unsure.` : `<strong>You are handling this.</strong> Joy is paused on this thread and will not reply.`;
    };
    flip(!on); toast(on ? `Joy paused on ${f}. You are replying.` : `Handed back to Joy. She will reply to ${f} and hand over if unsure.`, () => flip(on)); return;
  }
  const sched = t.closest<HTMLElement>('[data-sched]');
  if (sched) {
    const text = ta.value.trim(); if (!text) { toast('Write a message first, then choose when to send it'); ta.focus(); return; }
    const log = $('[data-log]', c)!; log.insertAdjacentHTML('beforeend', `<div class="sysline" data-sched-line><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span><strong>Scheduled for ${esc(sched.dataset.sched!)}.</strong> “${esc(text.slice(0, 80))}”</span></div>`);
    const line = log.lastElementChild!; ta.value = ''; scrollEnd();
    toast(`Scheduled for ${sched.dataset.sched}. Consent and quiet hours are checked again when it sends.`, () => { line.remove(); ta.value = text; }); return;
  }
  if (t.closest('[data-send]')) {
    const text = ta.value.trim(); if (!text) { toast('Write a message first'); ta.focus(); return; }
    const mm = mode(c); bubble(c, text, mm === 'note' ? 'note' : 'team'); ta.value = '';
    if (mm === 'reply') { bumpRow(id, text); toast(`Text sent to ${f}. Consent checked.`); } else toast('Note saved. Only your team can see it.');
  }
});
root.addEventListener('keydown', (e) => {
  const ta = e.target as HTMLElement; if (ta.matches('[data-input]') && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $<HTMLButtonElement>('[data-send]', ta.closest<HTMLElement>('[data-conv]')!)?.click(); }
});

// ---- details sheet
const det = $('#details')!, scrim = document.getElementById('scrim')!;
const closeDet = () => { det.classList.remove('open'); scrim.classList.remove('open'); };
root.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-open-details]')) { det.classList.add('open'); scrim.classList.add('open'); } });
scrim.addEventListener('click', closeDet);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDet(); });
$('.sheet-grip', det)?.addEventListener('click', closeDet);

// ---- keyboard: j/k move through the list, r replies
document.addEventListener('keydown', (e) => {
  const el = document.activeElement as HTMLElement | null; if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return; if (e.metaKey || e.ctrlKey || e.altKey) return;
  const vis = rows().filter((r) => !r.hidden);
  if (e.key === 'j' || e.key === 'k') { const i = vis.findIndex((r) => r.dataset.thread === current); const n = vis[Math.max(0, Math.min(vis.length - 1, i + (e.key === 'j' ? 1 : -1)))]; if (n) { select(n.dataset.thread!); n.scrollIntoView({ block: 'nearest' }); } }
  if (e.key === 'r') { const c = activeConv(); if (c) { e.preventDefault(); $<HTMLTextAreaElement>('[data-input]', c)?.focus(); } }
});

// ---- boot
const url = new URL(location.href);
const want = url.searchParams.get('t') || location.hash.slice(1);
const known = want && (rows().some((r) => r.dataset.thread === want));
if (known) select(want, { push: false });
else { const id = root.dataset.first!; select(id, { push: false, quiet: true }); if (mobile()) root.dataset.view = 'list'; }
apply();
export {};
