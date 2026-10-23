// Retention: selection, the win-back side panel, live preview, scheduled send with undo.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const prism = () => (window as any).prism;

const panel = $('#wb'); const scrim = $('#scrim');
if (panel) {
  const checks = () => $$<HTMLInputElement>('.wb-check');
  const text = $<HTMLTextAreaElement>('#wb-text')!;
  const all = $<HTMLInputElement>('#wb-all')!;
  const salon = 'Marlow & Finch';
  const selected = () => checks().filter((c) => c.checked && !c.disabled);
  const skipped = () => checks().filter((c) => c.disabled && !c.dataset.queued).length;
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const whenNow = () => ($<HTMLInputElement>('input[name="wbwhen"]:checked')?.value ?? 'now');

  function render() {
    const sel = selected(); const n = sel.length;
    $$('[data-wb-n]').forEach((el) => (el.textContent = String(n)));
    $$('[data-open-winback]').forEach((b) => b.toggleAttribute('disabled', n === 0));
    const send = $('[data-wb-send]'); if (send) send.toggleAttribute('disabled', n === 0);
    $('[data-wb-skip]')!.textContent = String(skipped());
    const eligible = checks().filter((c) => !c.disabled).length; const left = eligible - n;
    $('[data-wb-left]')!.textContent = String(left); $('[data-wb-left-row]')!.hidden = left <= 0;
    $('[data-wb-value]')!.textContent = fmt(sel.reduce((s, c) => s + Number(c.dataset.ticket || 0), 0));
    all.checked = n > 0 && left === 0; all.indeterminate = n > 0 && left > 0;
    $$('.wb').forEach((r) => r.classList.toggle('is-selected', !!r.querySelector<HTMLInputElement>('.wb-check:checked')));
    preview();
  }
  function preview() {
    const s = selected()[0]; const who = s ? { f: s.dataset.first!, st: s.dataset.stylist!, sv: s.dataset.service! } : { f: 'Maya', st: 'Elena', sv: 'balayage' };
    $('[data-wb-who]')!.textContent = s ? who.f : 'a sample client';
    const body = text.value.replaceAll('{first_name}', who.f).replaceAll('{stylist}', who.st).replaceAll('{last_service}', who.sv).replaceAll('{salon}', salon).replaceAll('{booking_link}', 'marlowfinch.example/b/xxxx');
    $('[data-wb-preview]')!.textContent = `${body}\n\nReply STOP to opt out`;
    $('[data-wb-len]')!.textContent = String(text.value.length);
  }
  function open() {
    if (!selected().length) return;
    panel!.classList.add('open'); panel!.setAttribute('aria-hidden', 'false'); scrim?.classList.add('open'); render();
    setTimeout(() => text.focus(), 200);
  }
  function close() { panel!.classList.remove('open'); panel!.setAttribute('aria-hidden', 'true'); scrim?.classList.remove('open'); }

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-open-winback]')) open();
    else if (t.closest('[data-close-wb]')) close();
    else if (t === scrim && panel.classList.contains('open')) close();
    const m = t.closest<HTMLElement>('[data-merge]');
    if (m) { const tok = `{${m.dataset.merge}}`; const a = text.selectionStart ?? text.value.length, b = text.selectionEnd ?? a; text.setRangeText(tok, a, b, 'end'); text.focus(); preview(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  text.addEventListener('input', preview);
  checks().forEach((c) => c.addEventListener('change', render));
  all.addEventListener('change', () => { checks().forEach((c) => { if (!c.disabled) c.checked = all.checked; }); render(); });
  $$('input[name="wbwhen"]').forEach((r) => r.addEventListener('change', () => {
    $('[data-wb-when-note]')!.textContent = whenNow() === 'now' ? 'It is before 10 am, so Joy starts at 10 am today.' : 'Joy starts tomorrow (Sunday) at 10 am. Replies still reach the Inbox.';
  }));

  $('[data-wb-send]')?.addEventListener('click', () => {
    const sel = selected(); const n = sel.length; if (!n) return;
    const tomorrow = whenNow() === 'tomorrow';
    close();
    sel.forEach((c) => { c.checked = false; c.disabled = true; c.dataset.queued = '1'; const st = c.closest('.row')?.querySelector('.wb-state'); if (st) st.insertAdjacentHTML('beforeend', '<span class="tag joy queued" style="margin-left:4px">Queued</span>'); });
    render();
    prism().toast(`Joy will text ${n} clients ${tomorrow ? 'tomorrow ' : ''}between 10 am and 7 pm`, () => {
      sel.forEach((c) => { c.disabled = false; c.checked = true; delete c.dataset.queued; c.closest('.row')?.querySelector('.queued')?.remove(); });
      render(); prism().toast('Win-back cancelled. Nothing was sent.');
    });
  });
  render();
}
