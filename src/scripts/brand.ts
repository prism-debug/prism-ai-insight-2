// Brand Hub interactions: autosave with undo, lists, documents, Test Joy sandbox, coverage gaps.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const toast = (m: string, u?: () => void) => (window as any).prism?.toast(m, u);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const facts = JSON.parse($('#brand-facts')?.textContent || '{}') as { today: number; hours: { d: number; label: string; text: string }[]; services: { id: string; name: string }[] };

// ---- autosave on change, with undo
type F = HTMLInputElement | HTMLTextAreaElement;
const val = (el: F) => (el instanceof HTMLInputElement && el.type === 'checkbox' ? String(el.checked) : el.value);
const setVal = (el: F, v: string) => { if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = v === 'true'; else el.value = v; el.dataset.prev = v; };
$$<F>('[data-save]').forEach((el) => {
  el.dataset.prev = val(el);
  el.addEventListener('change', () => {
    const prev = el.dataset.prev ?? '';
    const next = val(el);
    if (el instanceof HTMLInputElement && el.type === 'number' && (el.dataset.field === 'price') && next === '') { toast(`Cleared ${el.dataset.label}. Joy will hand price questions for this to a person.`, () => setVal(el, prev)); el.dataset.prev = next; return; }
    el.dataset.prev = next;
    toast(`Saved: ${el.dataset.label}`, () => { setVal(el, prev); });
  });
});

// ---- tone chips
$$('[data-tone]').forEach((c) => c.addEventListener('click', () => { const on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', String(on)); toast(`${on ? 'Added' : 'Removed'} tone: ${c.textContent}`, () => c.setAttribute('aria-pressed', String(!on))); }));

// ---- editable lists (differentiators, never-say)
const liHtml = (text: string, never: boolean) => `${never ? '<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>' : ''}<span>${esc(text)}</span><button type="button" class="icon-btn" data-remove aria-label="Remove: ${esc(text)}"><svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-remove]'); if (!b) return;
  const li = b.closest('li')!; const ul = li.parentElement!; const next = li.nextSibling;
  li.remove(); toast(`Removed: ${li.querySelector('span')?.textContent}`, () => ul.insertBefore(li, next));
});
$$<HTMLFormElement>('[data-add-to]').forEach((f) => f.addEventListener('submit', (e) => {
  e.preventDefault(); const inp = $<HTMLInputElement>('input', f)!; const t = inp.value.trim(); if (!t) { inp.focus(); return; }
  const ul = document.getElementById(f.dataset.addTo!)!; const li = document.createElement('li'); li.innerHTML = liHtml(t, ul.classList.contains('never')); ul.append(li); inp.value = '';
  toast(`Added: ${t}`, () => li.remove());
}));

// ---- FAQs
const faqForm = $<HTMLFormElement>('#faq-form')!;
$('#faq-new')?.addEventListener('click', () => { faqForm.hidden = false; $<HTMLInputElement>('input', faqForm)?.focus(); });
$('#faq-cancel')?.addEventListener('click', () => { faqForm.hidden = true; faqForm.reset(); });
faqForm?.addEventListener('submit', (e) => {
  e.preventDefault(); const q = (faqForm.elements.namedItem('q') as HTMLInputElement).value.trim(); const a = (faqForm.elements.namedItem('a') as HTMLTextAreaElement).value.trim(); if (!q || !a) return;
  const d = document.createElement('div'); d.className = 'bh-faq';
  d.innerHTML = `<div class="bh-faq-q"><strong>${esc(q)}</strong><span class="t-small muted">New · Joy hasn’t used it yet</span></div><textarea class="textarea" rows="2" aria-label="Answer to: ${esc(q)}">${esc(a)}</textarea>`;
  $('#faq-list')!.prepend(d); faqForm.reset(); faqForm.hidden = true; bump(1, 0);
  toast(`Joy can now answer: ${q}`, () => { d.remove(); bump(-1, 0); });
});

// ---- documents: soft delete and upload
const docList = $('#doc-list')!;
docList.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('[data-doc-remove]'); if (!b) return;
  const row = b.closest<HTMLElement>('[data-doc]')!; row.hidden = true;
  toast(`Removed ${row.querySelector('.name')?.textContent}. Joy stops using it.`, () => { row.hidden = false; });
});
$('#doc-up')?.addEventListener('click', () => {
  const row = document.createElement('div'); row.className = 'row bh-doc'; row.dataset.doc = '';
  row.innerHTML = `<span class="cell"><span class="truncate"><span class="name">Winter offers.pdf</span> <span class="sub">PDF · 140 KB</span></span></span><span class="cell muted hide-m">Today</span><span class="cell right muted hide-m">0 times</span><span class="cell" data-state><span class="spin" aria-hidden="true"></span><span class="t-small">Reading it</span></span><span class="cell right"><button class="btn btn-quiet btn-sm btn-danger" type="button" data-doc-remove aria-label="Remove Winter offers.pdf">Remove</button></span>`;
  docList.append(row); toast('Uploaded Winter offers.pdf. Joy is reading it.');
  setTimeout(() => { const s = $('[data-state]', row); if (s) s.innerHTML = '<svg class="state-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" role="img" aria-label="Ready"><circle cx="7" cy="7" r="6" fill="var(--good)"/><path d="M4.4 7.2l1.9 1.9 3.3-3.8" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="t-small">Ready</span>'; }, 2400);
});

// ---- coverage
let known = Number($('#cov-known')?.textContent), gaps = Number($('#cov-gaps')?.textContent);
function bump(k: number, g: number) { known += k; gaps += g; $('#cov-known')!.textContent = String(known); $('#cov-gaps')!.textContent = String(gaps); $('#gaps-empty')!.hidden = gaps > 0; document.querySelectorAll('[data-gaps-n]').forEach((x) => (x.textContent = String(gaps))); }
$('#gaps')?.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const li = t.closest<HTMLElement>('[data-gap]'); if (!li) return;
  if (t.closest('[data-gap-open]')) { const f = $<HTMLFormElement>('.gap-form', li)!; f.hidden = !f.hidden; if (!f.hidden) $('input', f)?.focus(); }
  if (t.closest('[data-gap-cancel]')) $<HTMLFormElement>('.gap-form', li)!.hidden = true;
});
$$<HTMLFormElement>('.gap-form').forEach((f) => f.addEventListener('submit', (e) => {
  e.preventDefault(); const li = f.closest<HTMLElement>('[data-gap]')!; const v = $<HTMLInputElement>('input', f)!.value.trim(); if (!v) return;
  li.hidden = true; bump(1, -1); extra.push(`${f.dataset.field}: ${v}`);
  toast(`Added to Brand Hub: ${f.dataset.field}`, () => { li.hidden = false; f.hidden = true; bump(-1, 1); extra.pop(); });
}));
const extra: string[] = [];

// ---- Test Joy sandbox: answers only from the fields on this page
const log = $('#chat-log')!, form = $<HTMLFormElement>('#chat-form')!, input = $<HTMLInputElement>('#chat-input')!;
const field = (id: string) => ($<F>(`#${id}`)?.value || '').trim();
const money = (n: string) => '$' + Number(n).toLocaleString('en-US');
const KEY: Record<string, string[]> = { balayage: ['balayage', 'highlight'], cut: ['cut', 'haircut', 'trim'], gloss: ['gloss', 'tone', 'toner'], correction: ['correction'], extensions: ['extension'], bridal: ['bridal', 'wedding', 'trial'], blowout: ['blowout', 'blow dry', 'blow-dry'], keratin: ['keratin', 'smoothing'] };
function reply(q: string): { text: string; why?: string; unsure?: boolean } {
  const s = q.toLowerCase();
  const isPrice = /price|cost|how much|\$|charge|rate/.test(s);
  if (/toner on top|toner/.test(s) && isPrice && !extra.some((x) => /toner/i.test(x))) return { text: 'I’m not sure, I’ll ask the team and text you back.', why: 'Reason: there is no price for “toner on top” in Services and prices. Joy never guesses a price.', unsure: true };
  const hit = Object.entries(KEY).find(([, ks]) => ks.some((k) => s.includes(k)));
  if (isPrice || hit) {
    if (!hit) return { text: 'Happy to help with prices. Which service do you have in mind?', why: 'Asked a clarifying question: no service named.' };
    const row = $(`[data-svc="${hit[0]}"]`)!; const price = $<HTMLInputElement>('[data-field="price"]', row)?.value;
    const name = row.dataset.name!;
    if (!price) return { text: 'I’m not sure, I’ll ask the team and text you back.', why: `Reason: the price for ${name} is blank in Services and prices.`, unsure: true };
    const from = $<HTMLInputElement>('[data-field="from"]', row)?.checked, mins = $<HTMLInputElement>('[data-field="minutes"]', row)?.value, consult = $<HTMLInputElement>('[data-field="consult"]', row)?.checked;
    return { text: `${name} is ${from ? 'from ' : ''}${money(price)} and takes about ${mins} minutes.${consult ? ' We start with a free consult so we can confirm the exact price. Would you like to book one?' : ' Want me to find you a time?'}`, why: `From Services and prices: ${name}.` };
  }
  if (/open|hours|close|closing|when are you/.test(s)) {
    const day = facts.hours.find((h) => h.d === facts.today)!;
    if (/today|now|tonight/.test(s)) return { text: day.text === 'Closed' ? `We’re closed ${day.label}. Want the next open day?` : `Yes, today (${day.label}) we’re open ${day.text}.`, why: 'From Hours and policies.' };
    return { text: 'Our hours: ' + facts.hours.filter((h) => h.text !== 'Closed').map((h) => `${h.label.slice(0, 3)} ${h.text}`).join(', ') + '. Closed Sunday and Monday.', why: 'From Hours and policies.' };
  }
  if (/park/.test(s)) return field('f-parking') ? { text: field('f-parking'), why: 'From Business: Parking.' } : { text: 'I’m not sure, I’ll ask the team.', why: 'Reason: Parking is blank in Business.', unsure: true };
  if (/deposit/.test(s)) return field('f-deposit') ? { text: field('f-deposit'), why: 'From Hours and policies: Deposit.' } : { text: 'I’m not sure, I’ll ask the team.', why: 'Reason: Deposit is blank.', unsure: true };
  if (/cancel|resched|late/.test(s)) return { text: /late/.test(s) ? field('f-late') : field('f-cancel'), why: 'From Hours and policies.' };
  if (/book|link|online/.test(s)) return { text: `You can book any time here: ${field('f-booking')}`, why: 'From Business: Booking link.' };
  return { text: 'I’m not sure, I’ll ask the team and text you back.', why: 'Reason: nothing in Brand Hub covers this question yet. It would show up under Coverage as a gap.', unsure: true };
}
function ask(q: string) {
  q = q.trim(); if (!q) return;
  $('#chat-sugg')?.remove();
  log.insertAdjacentHTML('beforeend', `<div class="msg you">${esc(q)}</div>`);
  const r = reply(q);
  setTimeout(() => {
    log.insertAdjacentHTML('beforeend', `<div class="msg joy${r.unsure ? ' unsure' : ''}"><span>${esc(r.text)}</span>${r.why ? `<span class="why">${esc(r.why)}</span>` : ''}</div>`);
    log.scrollTop = log.scrollHeight;
  }, 260);
  log.scrollTop = log.scrollHeight;
}
form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; ask(v); });
$('#chat-sugg')?.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-q]'); if (b) ask(b.dataset.q!); });
export {};

document.addEventListener('click', (e) => { const t = (e.target as HTMLElement).closest('[role="tab"]'); if (t) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });

document.querySelectorAll('[data-open-view]').forEach((b) => b.addEventListener('click', (e) => { const v = (e.currentTarget as HTMLElement).dataset.openView!; document.dispatchEvent(new CustomEvent('tm-view', { detail: v })); }));
