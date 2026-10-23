// Reviews: open the reply drawer from a row, edit Dash's draft, post with a toast, move the row to Replied.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const prism = () => (window as any).prism;
type Rv = { id: string; name: string; stars: number; text: string; replied: boolean; reply: string; draft: string; meta: string };
const data: Rv[] = JSON.parse(document.getElementById('rv-data')?.textContent || '[]');
const panel = $('#rv'); const scrim = $('#scrim');

if (panel) {
  const ta = $<HTMLTextAreaElement>('#rv-reply')!; const post = $<HTMLButtonElement>('[data-rv-post]')!;
  let cur: Rv | null = null;
  const open = (id: string) => {
    const r = data.find((x) => x.id === id); if (!r) return; cur = r;
    $('[data-rv-name]')!.textContent = r.name; $('[data-rv-meta]')!.textContent = r.meta; $('[data-rv-text]')!.textContent = r.text;
    $('[data-rv-stars]')!.innerHTML = `<span class="strong tnum">${r.stars} out of 5</span>`;
    ta.value = r.replied ? r.reply : r.draft;
    $('[data-rv-why]')!.textContent = r.replied ? 'Posted on Google. Editing and posting again replaces it.' : r.stars <= 3 ? 'Dash kept this short, named the problem and offered a call. It promises nothing about refunds.' : 'Dash named the service and stylist so the reply reads as written for this guest.';
    post.textContent = r.replied ? 'Update reply' : 'Post on Google';
    panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); scrim?.classList.add('open'); setTimeout(() => ta.focus(), 200);
  };
  const close = () => { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); scrim?.classList.remove('open'); };

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const trig = t.closest<HTMLElement>('[data-open-review]'); if (trig) { open(trig.dataset.openReview!); return; }
    const row = t.closest<HTMLElement>('.rv-row'); if (row) { open(row.dataset.id!); return; }
    if (t.closest('[data-close-rv]') || (t === scrim && panel.classList.contains('open'))) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) close();
    const row = (e.target as HTMLElement).closest?.<HTMLElement>('.rv-row'); if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(row.dataset.id!); }
  });
  $('[data-rv-redo]')?.addEventListener('click', () => { if (cur) { ta.value = cur.draft; prism().toast('Draft reset to Dash’s version'); } });

  post.addEventListener('click', () => {
    if (!cur || !ta.value.trim()) return;
    const r = cur; const was = { replied: r.replied, reply: r.reply };
    r.replied = true; r.reply = ta.value.trim(); close();
    const row = $<HTMLElement>(`.rv-row[data-id="${r.id}"]`)!; const from = row.parentElement!; const toGroup = $('[data-group="done"] .group-body')!;
    const label = $('.act-label', row)!; label.textContent = 'View reply';
    if (!was.replied) { toGroup.prepend(row); recount(); }
    prism().toast(`Reply posted to ${r.name}’s review on Google`, () => {
      r.replied = was.replied; r.reply = was.reply;
      if (!was.replied) { label.textContent = 'Review draft'; $('[data-group="need"] .group-body')!.prepend(row); recount(); }
      prism().toast('Reply withdrawn');
    });
    void from;
  });
  function recount() { $$('#inbox .group').forEach((g) => { const c = $('.count', g); if (c) c.textContent = String($$('[data-row]', g).filter((x) => !x.hidden).length); }); }
}

// ---- request settings: save on change
$$<HTMLInputElement>('.set-sw').forEach((el) => el.addEventListener('change', () => {
  const label = el.dataset.label || 'Setting';
  prism().toast(`${label} ${el.checked ? 'on' : 'off'}. Saved.`, () => { el.checked = !el.checked; });
}));
$$('[data-wait]').forEach((it) => it.addEventListener('click', () => {
  const was = $('[data-wait-label]')!.textContent!; const v = it.dataset.wait!;
  $('[data-wait-label]')!.textContent = v;
  prism().toast(`Ask timing set to ${v}. Saved.`, () => { $('[data-wait-label]')!.textContent = was; });
}));
