// Marketing: pause/resume with undo, inline "Add spend", recurring toggles, calendar month switcher.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const prism = () => (window as any).prism;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// ---- campaigns: pause / resume
function setState(row: HTMLElement, state: 'active' | 'learning' | 'paused') {
  row.dataset.state = state;
  $$('[data-st]', row).forEach((el) => (el.hidden = el.dataset.st !== state));
  $('.paused-tag', row)!.hidden = state !== 'paused';
  const learn = $('.learn', row); if (learn) learn.hidden = state === 'paused';
  const b = $('.camp-toggle', row)!; b.textContent = state === 'paused' ? 'Resume' : 'Pause';
}
$$('.camp-toggle').forEach((b) => b.addEventListener('click', () => {
  const row = b.closest<HTMLElement>('.crow')!; const prev = row.dataset.state as 'active' | 'learning' | 'paused';
  const name = b.dataset.name!;
  if (prev === 'paused') {
    const back = (row.dataset.was as any) || 'active'; setState(row, back);
    prism().toast(`${name} resumed. The ad platform may take an hour to start spending.`, () => { setState(row, 'paused'); });
  } else {
    row.dataset.was = prev; setState(row, 'paused');
    prism().toast(`${name} paused. No more spend until you resume it.`, () => { setState(row, prev); });
  }
}));

// ---- add spend (inline panel)
const form = $<HTMLFormElement>('#add-spend'), openBtn = $<HTMLButtonElement>('#add-spend-btn');
const setOpen = (on: boolean) => { if (!form || !openBtn) return; form.hidden = !on; openBtn.setAttribute('aria-expanded', String(on)); if (on) $<HTMLInputElement>('input[name="campaign"]', form)?.focus(); };
openBtn?.addEventListener('click', () => setOpen(form!.hidden));
$('#add-cancel')?.addEventListener('click', () => setOpen(false));
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(form); const amount = Number(fd.get('amount')); if (!amount) return;
  const src = $<HTMLSelectElement>('select[name="source"]', form)!; const srcName = src.selectedOptions[0].textContent!;
  const date = new Date(String(fd.get('date')) + 'T12:00:00'); const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const row = document.createElement('div'); row.className = 'row lg';
  row.innerHTML = `<span class="cell tnum muted">${label}</span><span class="cell name truncate">${esc(srcName)}</span><span class="cell muted truncate hide-m">${esc(String(fd.get('campaign')))}</span><span class="cell hide-m muted">Manual</span><span class="cell right tnum">$${amount.toFixed(2)}</span>`;
  const body = $('#log-this')!; body.prepend(row);
  const cnt = $('#log .group .count')!; cnt.textContent = String(Number(cnt.textContent) + 1);
  form.reset(); setOpen(false);
  prism().toast(`Added $${amount.toFixed(2)} on ${srcName}. Marked Manual in the log.`, () => { row.remove(); cnt.textContent = String(Number(cnt.textContent) - 1); });
});

// ---- recurring toggles
$$<HTMLInputElement>('.rec-switch').forEach((s) => s.addEventListener('change', () => {
  const name = s.dataset.name!; const on = s.checked;
  prism().toast(`${name} ${on ? 'is counted in' : 'is left out of'} your marketing cost.`, () => { s.checked = !on; });
}));

// ---- calendar months
const btns = $$('[data-cal-btn]'), months = $$('.cal');
btns.forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.calBtn!; btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  months.forEach((m) => (m.hidden = m.dataset.cal !== k));
  const names: Record<string, string> = { '2026-9': 'October 2026', '2026-10': 'November 2026', '2026-11': 'December 2026' };
  $('#cal-name')!.textContent = names[k];
}));

// ---- shortcuts: "Campaigns" link opens its tab; "Agency report" scrolls to the card
$$('[data-goto-tab]').forEach((b) => b.addEventListener('click', () => { $<HTMLElement>(`[role="tab"][data-panel="${b.dataset.gotoTab}"]`)?.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
$('[data-goto-agency]')?.addEventListener('click', (e) => { e.preventDefault(); $('#agency')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
