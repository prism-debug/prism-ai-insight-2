// Joy settings interactions: master and channel switches, rules, step editor, sequences, persona.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const toast = (m: string, u?: () => void) => (window as any).prism?.toast(m, u);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// master switch
const master = $<HTMLInputElement>('#joy-master')!;
master.addEventListener('change', () => {
  const on = master.checked; $('#joy-state')!.textContent = on ? 'Joy is on' : 'Joy is paused';
  $$<HTMLInputElement>('[data-chan-switch]').forEach((s) => { if (!s.disabled) s.dataset.paused = on ? '' : '1'; });
  toast(on ? 'Joy is on. She is answering again.' : 'Joy is paused. New messages wait in Inbox for your team.', () => { master.checked = !on; master.dispatchEvent(new Event('change')); });
});

// channel switches
const recount = () => { const n = $$<HTMLInputElement>('[data-chan-switch]').filter((x) => x.checked).length; const el = $('#joy-chan-n'); if (el) el.textContent = String(n); const off = $$<HTMLInputElement>('[data-chan-switch]').filter((x) => !x.checked).map((x) => x.closest('[data-chan]')?.querySelector('.name')?.textContent + ' off'); const o = $('#joy-chan-off'); if (o) { o.textContent = off.length ? ` (${off.join(', ')})` : ''; } };
document.addEventListener('click', (e) => { const t = (e.target as HTMLElement).closest('[role="tab"]'); if (t) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });
$$<HTMLInputElement>('[data-chan-switch]').forEach((s) => s.addEventListener('change', () => {
  const name = s.closest('[data-chan]')?.querySelector('.name')?.textContent;
  const on = s.checked; recount(); toast(on ? `Joy is answering ${name} again` : `Joy stopped answering ${name}. The team sees those in Inbox.`, () => { s.checked = !on; });
}));

// rules
const rules = $('#rules')!;
rules.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement; const row = t.closest<HTMLElement>('[data-rule]'); if (!row) return;
  const text = $<HTMLInputElement>('[data-rule-text]', row)!.value;
  if (t.matches('[data-rule-switch]')) toast(`${t.checked ? 'Joy will hand off' : 'Joy will no longer hand off'}: ${text}`, () => { t.checked = !t.checked; });
  else toast('Rule saved');
});
rules.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('[data-rule-del]'); if (!b) return;
  const row = b.closest<HTMLElement>('[data-rule]')!; row.hidden = true; toast('Rule removed', () => { row.hidden = false; });
});
$<HTMLFormElement>('#rule-form').addEventListener('submit', (e) => {
  e.preventDefault(); const i = $<HTMLInputElement>('#rule-new')!; const v = i.value.trim(); if (!v) { i.focus(); return; }
  const row = document.createElement('div'); row.className = 'row jy-rule'; row.dataset.rule = '';
  row.innerHTML = `<span class="cell"><input class="input bare" value="${esc(v)}" aria-label="Rule" data-rule-text></span><span class="cell sub hide-m">Added by you</span><span class="cell right"><input type="checkbox" class="switch" data-rule-switch checked aria-label="Rule on"><button class="icon-btn" type="button" data-rule-del aria-label="Remove rule">&times;</button></span>`;
  rules.append(row); i.value = ''; toast(`Joy will hand off: ${v}`, () => row.remove());
});

// generic select/input toast
$$<HTMLInputElement>('[data-save-toast]').forEach((el) => el.addEventListener('change', () => toast(`Saved: ${el.dataset.saveToast}`)));

// sequences
$$<HTMLInputElement>('[data-seq-switch]').forEach((s) => s.addEventListener('change', () => {
  const n = s.getAttribute('aria-label')!.replace(' is on', ''); toast(`${n} is ${s.checked ? 'on' : 'off'}`, () => { s.checked = !s.checked; });
}));
$$('[data-step]').forEach((wrap) => {
  const form = $<HTMLFormElement>('[data-step-form]', wrap)!, btn = $<HTMLElement>('[data-step-edit]', wrap)!;
  const set = (open: boolean) => { form.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Close' : 'Edit'; };
  btn.addEventListener('click', () => set(form.hidden));
  $('[data-step-cancel]', wrap)!.addEventListener('click', () => set(false));
  form.addEventListener('submit', (e) => {
    e.preventDefault(); const tpl = $('[data-tpl]', wrap)!; const prev = tpl.textContent!; const next = (form.elements.namedItem('tpl') as HTMLTextAreaElement).value.trim();
    if (!next) { toast('A step needs a message. Add some text first.'); return; }
    tpl.textContent = next; set(false); toast('Step saved. Consent is checked before every send.', () => { tpl.textContent = prev; (form.elements.namedItem('tpl') as HTMLTextAreaElement).value = prev; });
  });
});
// keyboard for group heads (div role=button)
$$('.group-head[role="button"]').forEach((h) => h.addEventListener('keydown', (e) => { const k = (e as KeyboardEvent).key; if (k === 'Enter' || k === ' ') { e.preventDefault(); h.click(); } }));
export {};
