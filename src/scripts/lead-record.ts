// Lead record: composer, in-place property edits, Joy pause, hand-back, consent. Every change ends in a toast with undo.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const toast = (m: string, u?: () => void) => (window as any).prism?.toast(m, u);
const root = $('#lead-record');
if (root) {
  const D = JSON.parse($('#rec-data')!.textContent!);
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const S = { status: D.status as string, owner: D.owner as string | null, sms: D.sms as boolean, promo: D.promo as boolean, service: D.service as string, tags: [...D.tags] as string[] };
  const ic = (k: string) => $(`[data-ic="${k}"]`)?.innerHTML ?? '';
  const stateSvg = (s: string) => $(`#menu-status [data-value="${s}"] svg`)?.outerHTML ?? '';
  const IC: Record<string, string> = { out: 'send', note: 'notebook-pen', log: 'clipboard-pen', system: 'info' };
  const PATH: Record<string, string> = {
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    'notebook-pen': '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
    'clipboard-pen': '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M10.42 12.61a2.1 2.1 0 1 1 2.97 2.97L7.95 21 4 22l.99-3.95 5.43-5.44Z"/><path d="M16 4h2a2 2 0 0 1 2 2v.5"/><path d="M20 12v8a2 2 0 0 1-2 2h-3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  };
  const svg = (n: string) => `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATH[n]}</svg>`;
  // pager follows the list the user came from (saved by the Leads list)
  try {
    const saved = JSON.parse(sessionStorage.getItem('prism.leadlist') || 'null') as { ids: string[]; label?: string } | null;
    const i = saved ? saved.ids.indexOf(D.id) : -1;
    if (saved && i >= 0) {
      const p = $<HTMLAnchorElement>('#rec-prev'), n = $<HTMLAnchorElement>('#rec-next'), pos = $('#rec-pos');
      if (p && saved.ids[i - 1]) p.href = `/leads/${saved.ids[i - 1]}`;
      if (n && saved.ids[i + 1]) n.href = `/leads/${saved.ids[i + 1]}`;
      if (pos) { pos.textContent = `${i + 1} of ${saved.ids.length}`; if (saved.label) pos.title = saved.label; }
    }
  } catch {}
  const tl = $('#timeline')!;
  function addEvent(o: { kind: string; actor: string; actorKind: 'team' | 'joy' | 'system'; text: string; reason?: string; sub?: string }) {
    if (!$$('.tl-day', tl).some((d) => d.textContent === 'Today')) tl.insertAdjacentHTML('beforeend', '<li class="tl-day"><span>Today</span></li>');
    const bubble = o.kind === 'out';
    const li = document.createElement('li'); li.className = `tl tl-${o.kind} by-${o.actorKind}`;
    li.innerHTML = `<span class="tl-ic">${o.actorKind === 'joy' ? `<span class="avatar sm joy" title="Joy">${$('#menu-owner .avatar.joy')?.innerHTML ?? ''}</span>` : svg(IC[o.kind] || 'info')}</span><div class="tl-main"><div class="tl-head"><span class="strong">${esc(o.actor)}</span>${o.sub ? `<span class="muted"> · ${esc(o.sub)}</span>` : ''}<span class="muted tnum tl-time">${D.nowLabel}</span></div><p class="${bubble ? 'bubble' : 'tl-text'}">${esc(o.text)}</p>${o.reason ? `<p class="tl-why t-small">Why: ${esc(o.reason)}</p>` : ''}</div>`;
    tl.appendChild(li); li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return () => li.remove();
  }

  // ---- derived UI
  const JOY_LABEL: Record<string, string> = { joy_handling: 'Joy is handling', needs_person: 'Paused, a person is replying', not_answered: 'Joy has not replied', went_quiet: 'Joy stopped follow-ups', booked: 'Booked, Joy is finished' };
  function paint() {
    $('[data-val="status"]')!.textContent = D.statusLabel[S.status]; $('[data-ic="status"]')!.innerHTML = stateSvg(S.status);
    $('#head-status')!.textContent = D.statusLabel[S.status]; $('#head-state')!.innerHTML = stateSvg(S.status);
    const ownerTxt = S.status === 'joy_handling' ? 'Joy' : S.status === 'not_answered' ? 'Nobody' : S.status === 'needs_person' && (!S.owner || S.owner === 'joy') ? 'Waiting for a person' : S.owner ? D.owners[S.owner] : '—';
    $('[data-val="owner"]')!.textContent = ownerTxt;
    const sw = $<HTMLInputElement>('#joy-switch')!; sw.checked = S.status === 'joy_handling'; sw.disabled = S.status === 'booked'; $('#joy-label')!.textContent = JOY_LABEL[S.status];
    $('#banner-handoff')!.hidden = S.status !== 'needs_person'; $('#banner-wait')!.hidden = S.status !== 'not_answered';
    $<HTMLInputElement>('#c-sms')!.checked = S.sms; $<HTMLInputElement>('#c-promo')!.checked = S.promo;
    const cv = (k: string, label: string, on: boolean) => { $(`[data-cv="${k}"]`)!.innerHTML = `${$(`[data-cic="${on ? 'yes' : 'no'}"]`)?.innerHTML ?? ''}${label}: ${on ? 'Yes' : 'No'}`; };
    cv('sms', 'Texts', S.sms); cv('promo', 'Promos', S.promo);
    $('#props-toggle .truncate')!.textContent = `${D.statusLabel[S.status]} · ${ownerTxt} · ${($('[data-val="source"]')!.textContent ?? '').split(' · ')[0]}`;
    consentLine();
    const cs = $('#c-bar-sub')!; cs.textContent = S.sms ? (D.draft ? '· Joy has a draft' : '· consent on file') : '· no text consent'; cs.classList.toggle('bad', !S.sms);
    $('#tags')!.querySelectorAll('[data-tag]').forEach((e) => e.remove());
    const add = $('#tags [data-menu="menu-tag"]')!;
    S.tags.forEach((t) => add.insertAdjacentHTML('beforebegin', `<span class="tag" data-tag="${esc(t)}">${esc(t)}<button aria-label="Remove ${esc(t)}" data-untag="${esc(t)}">${svg('info').replace(/<path[^>]*>|<circle[^>]*>/g, '').replace('</svg>', '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>').replace('width="13" height="13"', 'width="10" height="10"')}</button></span>`));
    sendState();
  }
  function consentLine() {
    $('#consent-line')!.innerHTML = S.sms
      ? `<span class="strong">Consent on file</span>: ${esc(D.first)} agreed to appointment texts${S.promo ? ' and promotions' : ', not promotions'}. Quiet hours ${D.quiet.from} to ${D.quiet.to}; it is ${D.nowLabel}, so this sends now.`
      : `<span class="strong late">No text consent.</span> ${esc(D.first)} has not agreed to texts, so sending is blocked. Call or email, then switch on Appointment consent.`;
  }
  const msg = $<HTMLTextAreaElement>('#msg')!, send = $<HTMLButtonElement>('#btn-send')!;
  function sendState() { const n = msg.value.length; $('#msg-count')!.textContent = `${n}/160${n > 160 ? ` · ${Math.ceil(n / 153)} texts` : ''}`; send.disabled = !S.sms || !msg.value.trim(); send.textContent = S.sms ? 'Send text' : 'Can’t text yet'; }
  msg.addEventListener('input', sendState);
  $$('[data-tpl]').forEach((b) => b.addEventListener('click', () => { msg.value = b.dataset.tpl!; sendState(); msg.focus(); }));
  $('#use-sug')!.addEventListener('click', () => { msg.value = $('#sug-text')!.textContent!; sendState(); msg.focus(); });
  $$('[data-ctab]').forEach((t) => t.addEventListener('click', () => { $$('[data-ctab]').forEach((x) => x.setAttribute('aria-selected', String(x === t))); $$('[data-cpanel]').forEach((p) => (p.hidden = p.dataset.cpanel !== t.dataset.ctab)); }));
  const comp = $('#composer')!; const bar = $('#c-bar')!;
  const setOpen = (o: boolean) => { comp.dataset.open = String(o); bar.setAttribute('aria-expanded', String(o)); };
  bar.addEventListener('click', () => setOpen(comp.dataset.open !== 'true'));
  $('#btn-text')!.addEventListener('click', () => { setOpen(true); $('#ct-text')!.click(); $('#composer')!.scrollIntoView({ block: 'end', behavior: 'smooth' }); msg.focus(); });

  type Snapshot = { status: string; owner: string | null };
  const snap = (): Snapshot => ({ status: S.status, owner: S.owner });
  const back = (s: Snapshot) => { S.status = s.status; S.owner = s.owner; paint(); };
  function pauseJoyIfNeeded(): (() => void) | null {
    if (S.status === 'needs_person' || S.status === 'booked') return null;
    const s = snap(); S.status = 'needs_person'; if (!S.owner || S.owner === 'joy') S.owner = 'casey'; paint();
    const rm = addEvent({ kind: 'system', actor: 'Joy', actorKind: 'joy', text: 'Paused while a person replies', reason: 'You sent a message, so Joy stops replying to avoid talking over you.' });
    return () => { back(s); rm(); };
  }
  send.addEventListener('click', () => {
    const text = msg.value.trim(); if (!text || !S.sms) return;
    const undoPause = pauseJoyIfNeeded(); const rm = addEvent({ kind: 'out', actor: 'You', actorKind: 'team', text, sub: 'Text' });
    msg.value = ''; sendState();
    toast(`Text sent to ${D.first} at ${D.phoneLead}${undoPause ? '. Joy is paused while you reply.' : ''}`, () => { rm(); undoPause?.(); });
  });
  const note = $<HTMLTextAreaElement>('#note')!, nb = $<HTMLButtonElement>('#btn-note')!;
  note.addEventListener('input', () => (nb.disabled = !note.value.trim()));
  nb.addEventListener('click', () => { const rm = addEvent({ kind: 'note', actor: 'You', actorKind: 'team', text: note.value.trim(), sub: 'Note' }); note.value = ''; nb.disabled = true; toast('Note added for your team', rm); });
  $$('[data-logtype]').forEach((b) => b.addEventListener('click', () => $$('[data-logtype]').forEach((x) => { x.setAttribute('aria-checked', String(x === b)); x.setAttribute('aria-pressed', String(x === b)); })));
  $('#btn-log')!.addEventListener('click', () => {
    const t = $('[data-logtype][aria-checked="true"]')!; const d = $<HTMLInputElement>('#log-detail')!;
    const rm = addEvent({ kind: 'log', actor: 'You', actorKind: 'team', text: `${t.dataset.lt}${d.value ? `: ${d.value}` : ''}`, sub: 'Logged outreach' }); d.value = '';
    toast(`Logged: you ${t.dataset.logtype} ${D.first}`, rm);
  });

  // ---- hand back / let Joy reply
  function toJoy(msgText: string, why: string) {
    const s = snap(); S.status = 'joy_handling'; S.owner = 'joy'; paint();
    const rm = addEvent({ kind: 'system', actor: 'Joy', actorKind: 'joy', text: msgText, reason: why });
    toast(`${msgText}. Every action will show its reason.`, () => { back(s); rm(); });
  }
  $('#btn-handback')!.addEventListener('click', () => toJoy(`Took ${D.first} back from the team`, 'You handed it back. Joy replies to new messages until she hits something she is unsure about.'));
  $('#btn-letjoy')!.addEventListener('click', () => toJoy(`Started replying to ${D.first}`, 'You asked Joy to reply because nobody had answered yet.'));
  $('#joy-switch')!.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).checked) toJoy(`Resumed replying to ${D.first}`, 'You switched Joy on for this lead.');
    else { const s = snap(); S.status = 'needs_person'; if (!S.owner || S.owner === 'joy') S.owner = 'casey'; paint(); const rm = addEvent({ kind: 'system', actor: 'Joy', actorKind: 'joy', text: 'Paused', reason: 'You switched Joy off, so a person is replying.' }); toast(`Joy paused on ${D.first}. A person is replying.`, () => { back(s); rm(); }); }
  });

  // ---- property menus (in place)
  function setProp(k: string, v: string) {
    const s = snap(); const prev = { ...S, tags: [...S.tags] }; let note = '';
    if (k === 'status') { S.status = v; if (v === 'joy_handling') S.owner = 'joy'; else if (v === 'needs_person' && (!S.owner || S.owner === 'joy')) S.owner = 'casey'; note = `Status set to ${D.statusLabel[v]}`; }
    if (k === 'owner') { S.owner = v === 'none' ? null : v; note = `Now looking after: ${v === 'none' ? 'nobody' : D.owners[v]}`; }
    if (k === 'service') { S.service = v; const sv = D.services[v]; const val = Math.round((sv.price * (sv.from ? 1.18 : 1)) / 5) * 5; $('[data-val="service"]')!.textContent = sv.name; $('[data-val="price"]')!.textContent = `${sv.from ? 'from ' : ''}${money(sv.price)} in Brand Hub`; $('[data-val="value"]')!.textContent = money(val); note = `Service set to ${sv.name}, likely ${money(val)}`; }
    if (k === 'source') { $('[data-val="source"]')!.textContent = D.sources[v]; note = `First-touch source set to ${D.sources[v]}`; }
    paint();
    const prevSvc = prev.service;
    const rm = addEvent({ kind: 'system', actor: 'You', actorKind: 'team', text: note });
    toast(note, () => { rm(); S.status = prev.status; S.owner = prev.owner; if (k === 'service') { S.service = prevSvc; const sv = D.services[prevSvc]; $('[data-val="service"]')!.textContent = sv.name; $('[data-val="price"]')!.textContent = `${sv.from ? 'from ' : ''}${money(sv.price)} in Brand Hub`; $('[data-val="value"]')!.textContent = money(Math.round((sv.price * (sv.from ? 1.18 : 1)) / 5) * 5); } paint(); });
    void s;
  }
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const st = t.closest<HTMLElement>('.menu-item[data-set]'); if (st) { setProp(st.dataset.set!, st.dataset.value!); return; }
    const at = t.closest<HTMLElement>('[data-addtag]'); if (at) { const tag = at.dataset.addtag!; if (!S.tags.includes(tag)) { S.tags.push(tag); paint(); toast(`Tagged ${D.first}: ${tag}`, () => { S.tags = S.tags.filter((x) => x !== tag); paint(); }); } return; }
    const ut = t.closest<HTMLElement>('[data-untag]'); if (ut) { const tag = ut.dataset.untag!; S.tags = S.tags.filter((x) => x !== tag); paint(); toast(`Removed tag ${tag}`, () => { S.tags.push(tag); paint(); }); return; }
  });
  $$('.prop.editable').forEach((p) => p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.click(); } }));
  [['#c-sms', 'sms', 'Appointment texts'], ['#c-promo', 'promo', 'Promotional texts']].forEach(([sel, k, label]) => $(sel)!.addEventListener('change', (e) => {
    const on = (e.target as HTMLInputElement).checked; (S as any)[k] = on; paint();
    const rm = addEvent({ kind: 'system', actor: 'You', actorKind: 'team', text: `${label} consent ${on ? 'recorded as allowed' : 'removed'}` });
    toast(`${label} ${on ? 'allowed' : 'blocked'} for ${D.first}`, () => { (S as any)[k] = !on; rm(); paint(); });
  }));
  $('#consent-edit')!.addEventListener('click', () => { const b = $('#consent-box')!; b.hidden = !b.hidden; $('#consent-edit')!.setAttribute('aria-expanded', String(!b.hidden)); $('#consent-edit')!.textContent = b.hidden ? 'Edit' : 'Done'; });
  // ---- duplicate prompt
  const dupe = $('#dupe');
  $('#dupe-merge')?.addEventListener('click', () => { dupe!.hidden = true; toast('Merged the two records. History from both is on this timeline.', () => (dupe!.hidden = false)); });
  $('#dupe-no')?.addEventListener('click', () => { dupe!.hidden = true; toast('Marked as different people. We will not suggest this again.', () => (dupe!.hidden = false)); });
  // ---- mobile properties
  $('#props-toggle')!.addEventListener('click', () => { const a = $('#rec-aside')!; const o = a.dataset.open !== 'true'; a.dataset.open = String(o); $('#props-toggle')!.setAttribute('aria-expanded', String(o)); });
  paint();
}
export {};
