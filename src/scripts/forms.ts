// Form builder: field list (reorder, required, remove), live preview with device toggle, properties.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const toast = (m: string, u?: () => void) => (window as any).prism?.toast(m, u);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
interface Field { id: string; label: string; type: string; required: boolean; options?: string[] }
const S = JSON.parse($('#fb-state')!.textContent!) as { name: string; blurb: string; fields: Field[]; confirm: string; consentAppt: boolean; consentPromo: boolean; types: Record<string, string>; texts: { appt: string; promo: string }; salon: string; cta: string };
let fields: Field[] = S.fields.map((f) => ({ ...f }));
let apptOn = S.consentAppt, promoOn = S.consentPromo;
const ic = (d: string) => `<svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const UP = ic('<path d="m18 15-6-6-6 6"/>'), DOWN = ic('<path d="m6 9 6 6 6-6"/>'), TRASH = ic('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>');

function renderList() {
  $('#fcount')!.textContent = String(fields.length);
  $('#flist')!.innerHTML = fields.map((f, i) => `<li data-i="${i}"><span><span class="f-name">${esc(f.label)}</span><span class="f-type">${S.types[f.type] || f.type}</span></span><span></span>
    <span class="f-ctl"><label class="f-req"><input type="checkbox" class="switch" data-req ${f.required ? 'checked' : ''} aria-label="${esc(f.label)} required"> Required</label>
    <button class="icon-btn" type="button" data-up ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(f.label)} up">${UP}</button>
    <button class="icon-btn" type="button" data-down ${i === fields.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(f.label)} down">${DOWN}</button>
    <button class="icon-btn" type="button" data-del aria-label="Remove ${esc(f.label)}">${TRASH}</button></span></li>`).join('') || '<li><span class="t-small muted">No fields yet. Add one below.</span></li>';
}
function renderPreview() {
  const consentOf = (f: Field) => (f.id === 'c1' ? (apptOn ? S.texts.appt : '') : f.id === 'c2' ? (promoOn ? S.texts.promo : '') : '');
  const body = fields.map((f) => {
    const req = f.required ? '<span class="req" aria-hidden="true"> *</span>' : '';
    if (f.type === 'consent') { const t = consentOf(f); return t ? `<div class="pv-consent"><i></i><span>${esc(t)}</span></div>` : ''; }
    if (f.type === 'choice') return `<div class="pv-field"><span>${esc(f.label)}${req}</span><div class="pv-opts">${(f.options?.length ? f.options : ['Option 1', 'Option 2']).map((o) => `<span class="pv-opt">${esc(o)}</span>`).join('')}</div></div>`;
    if (f.type === 'photo') return `<div class="pv-field"><span>${esc(f.label)}${req}</span><div class="pv-ph photo">${ic('<path d="M12 5v14M5 12h14"/>')}Add a photo</div></div>`;
    const ph = f.type === 'phone' ? '(847) 555-0100' : f.type === 'email' ? 'you@example.com' : f.type === 'date' ? 'Pick a day' : '';
    return `<div class="pv-field"><span>${esc(f.label)}${req}</span><div class="pv-ph${f.type === 'longtext' ? ' tall' : ''}">${ph}</div></div>`;
  }).join('');
  $('#preview')!.innerHTML = `<div class="pv-brand"><i></i>${esc(S.salon)}</div><h3>${esc(S.name)}</h3><p class="t-small muted">${esc(S.blurb)}</p>${body || '<div class="pv-empty">Add a field to see it here.</div>'}<div class="pv-btn">${esc(S.cta)}</div>`;
}
const render = () => { renderList(); renderPreview(); };

const list = $('#flist')!;
list.addEventListener('click', (e) => {
  const t = e.target as HTMLElement; const li = t.closest<HTMLElement>('li[data-i]'); if (!li) return; const i = Number(li.dataset.i);
  const keep = (btn: string) => requestAnimationFrame(() => $(`li[data-i="${Math.max(0, Math.min(fields.length - 1, btn === 'up' ? i - 1 : i + 1))}"] [data-${btn}]`)?.focus());
  if (t.closest('[data-up]') && i > 0) { [fields[i - 1], fields[i]] = [fields[i], fields[i - 1]]; render(); keep('up'); }
  else if (t.closest('[data-down]') && i < fields.length - 1) { [fields[i + 1], fields[i]] = [fields[i], fields[i + 1]]; render(); keep('down'); }
  else if (t.closest('[data-del]')) { const [gone] = fields.splice(i, 1); render(); toast(`Removed field: ${gone.label}`, () => { fields.splice(i, 0, gone); render(); }); }
});
list.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement; if (!t.matches('[data-req]')) return; const i = Number(t.closest<HTMLElement>('li')!.dataset.i);
  fields[i].required = t.checked; renderPreview(); toast(`${fields[i].label} is ${t.checked ? 'required' : 'optional'}`, () => { fields[i].required = !t.checked; render(); });
});
$('#add-field')!.addEventListener('click', () => {
  const type = $<HTMLSelectElement>('#add-type')!.value; const label = S.types[type];
  const f: Field = { id: 'n' + Date.now(), label: `New ${label.toLowerCase()}`, type, required: false, options: type === 'choice' ? ['Option 1', 'Option 2'] : undefined };
  fields.push(f); render(); toast(`Added ${label.toLowerCase()} field`, () => { fields = fields.filter((x) => x !== f); render(); });
});

// device toggle
$$('[data-dev]', $('.seg')!).forEach((b) => b.addEventListener('click', () => {
  $('#stage')!.dataset.dev = b.dataset.dev!; $$('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
}));

// properties
const cA = $<HTMLInputElement>('#c-appt')!, cP = $<HTMLInputElement>('#c-promo')!;
const syncConsent = () => { $('#t-appt')!.classList.toggle('off', !apptOn); $('#t-promo')!.classList.toggle('off', !promoOn); };
cA.addEventListener('change', () => { apptOn = cA.checked; syncConsent(); renderPreview(); toast(`Appointment text consent ${apptOn ? 'shown' : 'hidden'} on this form`, () => { cA.checked = apptOn = !apptOn; syncConsent(); renderPreview(); }); });
cP.addEventListener('change', () => { promoOn = cP.checked; syncConsent(); renderPreview(); toast(`Promotional text consent ${promoOn ? 'shown' : 'hidden'} on this form`, () => { cP.checked = promoOn = !promoOn; syncConsent(); renderPreview(); }); });
$$<HTMLInputElement>('[data-track]').forEach((s) => s.addEventListener('change', () => toast(`${s.dataset.track} capture ${s.checked ? 'on' : 'off'}`, () => { s.checked = !s.checked; })));
$('#pixel')!.addEventListener('change', () => toast('Saved: pixel or tag'));
$('#confirm')!.addEventListener('input', (e) => { $('#after')!.textContent = (e.target as HTMLTextAreaElement).value; });
$('#confirm')!.addEventListener('change', () => toast('Saved: confirmation message'));
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const t = document.getElementById(b.dataset.copy!)!.textContent || ''; try { await navigator.clipboard.writeText(t); } catch { /* clipboard may be blocked */ }
  toast(b.dataset.copy === 'share' ? 'Link copied' : 'Embed snippet copied');
}));

// status, unpublish, delete (all undoable)
const status = $<HTMLSelectElement>('#status')!, unpub = $('#unpublish')!, root = $('.fb')!;
const LABEL: Record<string, string> = { published: 'Published', draft: 'Draft', test: 'Test, hidden from metrics' };
function setStatus(v: string) { status.value = v; $('#fb-status')!.textContent = LABEL[v]; $('#counts')!.textContent = v === 'test' ? 'No' : 'Yes'; unpub.hidden = v !== 'published'; }
let cur = status.value;
status.addEventListener('change', () => { const prev = cur; cur = status.value; setStatus(cur); toast(cur === 'published' ? 'Published. The link is live.' : `Moved to ${LABEL[cur].toLowerCase()}. The link is off.`, () => { cur = prev; setStatus(prev); }); });
unpub.addEventListener('click', () => { const prev = cur; cur = 'draft'; setStatus('draft'); toast('Unpublished. The link and embed stop working.', () => { cur = prev; setStatus(prev); }); });
$('#delete')!.addEventListener('click', () => { root.classList.add('deleted'); $('#gone')!.hidden = false; toast(`Deleted ${S.name}`, () => { root.classList.remove('deleted'); $('#gone')!.hidden = true; }); });

syncConsent(); render();
export {};
