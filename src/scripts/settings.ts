// Team, Settings and Connectors behaviour: dirty/save tracking, role grid, drawer, hours, exceptions, connector rows.
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const toast = (m: string, undo?: () => void) => (window as any).prism.toast(m, undo);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// ---- dirty / save
const form = $<HTMLFormElement>('form[data-form]');
if (form) {
  form.addEventListener('submit', (e) => e.preventDefault());
  const flag = (on: boolean) => { $$('[data-unsaved]', form).forEach((u) => (u.hidden = !on)); $$('[data-clean]', form).forEach((u) => (u.hidden = on)); $$('[data-save]', form).forEach((b) => ((b as HTMLButtonElement).disabled = !on)); };
  const dirty = () => flag(true);
  form.addEventListener('input', (e) => { if ((e.target as HTMLElement).closest('[data-dirty]')) dirty(); });
  form.addEventListener('change', (e) => { if ((e.target as HTMLElement).closest('[data-dirty]')) dirty(); });
  form.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-save]');
    if (!b || (b as HTMLButtonElement).disabled) return;
    $$('input,select,textarea', form).forEach((el: any) => { if (el.type === 'checkbox' || el.type === 'radio') el.defaultChecked = el.checked; else if (el.tagName === 'SELECT') Array.from(el.options as HTMLOptionElement[]).forEach((o) => (o.defaultSelected = o.selected)); else el.defaultValue = el.value; });
    $$('[data-mx]', form).forEach((c) => { c.dataset.orig = c.dataset.v; c.classList.remove('changed'); });
    flag(false); toast(b.dataset.save!);
  });
  form.addEventListener('reset', () => setTimeout(() => { $$('[data-mx]', form).forEach((c) => { setCell(c, c.dataset.orig!); c.classList.remove('changed'); }); flag(false); hoursPreview(); }, 0));
  // role grid
  const ORDER = ['E', 'V', 'O', '-'];
  const NAME: Record<string, string> = { E: 'Edit', V: 'View', O: 'Own records only', '-': 'Hidden' };
  function setCell(c: HTMLElement, v: string) { c.dataset.v = v; const b = c.querySelector('b'); if (b) b.textContent = v === '-' ? '—' : v; c.className = c.className.replace(/v-\w+/, `v-${v === '-' ? 'none' : v}`); c.setAttribute('aria-label', c.getAttribute('aria-label')!.replace(/: [^.]+\./, `: ${NAME[v]}.`)); }
  form.addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('[data-mx]'); if (!c || (c as HTMLButtonElement).disabled) return;
    setCell(c, ORDER[(ORDER.indexOf(c.dataset.v!) + 1) % 4]); c.classList.toggle('changed', c.dataset.v !== c.dataset.orig); dirty();
  });
}

// ---- Settings business rows: address expands in place, time zone uses the themed menu
const addrBtn = $<HTMLElement>('[data-addr-toggle]');
if (addrBtn) {
  const box = document.getElementById('b-addr')!;
  addrBtn.addEventListener('click', () => { const open = addrBtn.getAttribute('aria-expanded') !== 'true'; addrBtn.setAttribute('aria-expanded', String(open)); box.hidden = !open; if (open) $<HTMLInputElement>('input', box)?.focus(); });
  box.addEventListener('input', () => { $('[data-addr-text]')!.textContent = $$<HTMLInputElement>('[data-addr]', box).map((i) => i.value.trim()).filter(Boolean).join(', '); });
  document.getElementById('tz-menu')?.addEventListener('click', (e) => {
    const it = (e.target as HTMLElement).closest<HTMLElement>('[data-tz]'); if (!it) return;
    $('[data-tz-text]')!.textContent = it.dataset.tz!; const h = document.getElementById('b-tz') as HTMLInputElement; h.value = it.dataset.tz!; h.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

// ---- Team: change role / remove (owner only)
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement; const row = t.closest<HTMLElement>('.p-row[data-person]'); if (!row) return;
  const name = $('.name', row)!.textContent!;
  const set = t.closest<HTMLElement>('[data-set-role]');
  if (set) {
    const prev = $('[data-role]', row)!.textContent!; const next = set.dataset.setRole!; if (prev === next) return;
    const apply = (r: string) => { $$('[data-role]', row).forEach((x) => (x.textContent = r)); $$('[data-set-role]', row).forEach((m) => { const on = m.dataset.setRole === r; m.setAttribute('aria-checked', String(on)); m.querySelector('svg')?.remove(); if (on) m.insertAdjacentHTML('beforeend', '<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'); }); };
    apply(next); toast(`${name} is now ${next}. Recorded in the audit log.`, () => apply(prev)); return;
  }
  if (t.closest('[data-remove-person]')) { row.hidden = true; toast(`Removed ${name} from the team. They can no longer sign in.`, () => (row.hidden = false)); }
});

// ---- drawer (Team invite)
const scrim = $('[data-drawer-scrim]');
function drawer(id: string, open: boolean) { const d = document.getElementById(id); if (!d) return; d.classList.toggle('open', open); d.setAttribute('aria-hidden', String(!open)); scrim?.classList.toggle('open', open); if (open) setTimeout(() => $<HTMLInputElement>('input', d)?.focus(), 180); }
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const o = t.closest<HTMLElement>('[data-open-drawer]'); if (o) { drawer(o.dataset.openDrawer!, true); return; }
  if (t.closest('[data-close-drawer]') || t === scrim) { $$('.drawer.open').forEach((d) => drawer(d.id, false)); return; }
  if (t.closest('[data-invite]')) {
    const em = $<HTMLInputElement>('#inv-email')!; const role = $<HTMLInputElement>('input[name="role"]:checked')?.value ?? 'Manager';
    if (!/^\S+@\S+\.\S+$/.test(em.value)) { em.focus(); em.setAttribute('aria-invalid', 'true'); toast('Enter a full email address, like name@marlowfinch.example'); return; }
    const to = em.value; em.value = ''; drawer('invite', false); toast(`Invite sent to ${to} as ${role}. It expires if not accepted.`, () => toast('Invite cancelled'));
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.drawer.open:not(#dash)').forEach((d) => drawer(d.id, false)); });

// ---- hours (Settings)
const hl = $('#hours-list');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function hoursPreview() {
  const out = $('[data-hours-preview]'); if (!hl || !out) return;
  const parts: string[] = []; const closed: string[] = []; let bad = '';
  $$('.h-row', hl).forEach((r) => {
    const d = +r.dataset.d!; const on = $<HTMLInputElement>('[data-open]', r)!.checked;
    const f = $<HTMLSelectElement>('[data-from]', r)!, t = $<HTMLSelectElement>('[data-to]', r)!;
    $<HTMLElement>('[data-open-label]', r)!.textContent = on ? 'Open' : 'Closed'; f.disabled = t.disabled = !on; (r.querySelector('[data-copy-hours]') as HTMLButtonElement).disabled = !on;
    if (!on) { closed.push(DAYS[d]); return; }
    if (+t.value <= +f.value) bad = `${DAYS[d]} closes before it opens.`;
    parts.push(`${DAYS[d].slice(0, 3)} ${f.selectedOptions[0].text} to ${t.selectedOptions[0].text}`);
  });
  const sat = $('.h-row[data-d="6"]', hl)!; const on = $<HTMLInputElement>('[data-open]', sat)!.checked;
  out.className = `t-small st-preview ${bad ? '' : 'muted'}`; out.style.color = bad ? 'var(--attn)' : '';
  out.textContent = bad || `Today is Saturday. ${on ? `Joy would tell a guest you are open ${$<HTMLSelectElement>('[data-from]', sat)!.selectedOptions[0].text} to ${$<HTMLSelectElement>('[data-to]', sat)!.selectedOptions[0].text}.` : 'Joy would tell a guest you are closed.'} Closed ${closed.length ? closed.join(' and ') : 'never'}.`;
}
if (hl) {
  hl.addEventListener('change', hoursPreview);
  hl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-copy-hours]'); if (!b) return;
    const src = $(`.h-row[data-d="${b.dataset.copyHours}"]`, hl)!; const f = $<HTMLSelectElement>('[data-from]', src)!.value, t = $<HTMLSelectElement>('[data-to]', src)!.value;
    $$('.h-row', hl).forEach((r) => { if ($<HTMLInputElement>('[data-open]', r)!.checked) { $<HTMLSelectElement>('[data-from]', r)!.value = f; $<HTMLSelectElement>('[data-to]', r)!.value = t; } });
    hoursPreview(); form?.dispatchEvent(new Event('input', { bubbles: true })); (b as HTMLElement).dispatchEvent(new Event('change', { bubbles: true }));
    $$('[data-save]', form!).forEach((s) => ((s as HTMLButtonElement).disabled = false)); $$('[data-unsaved]', form!).forEach((u) => (u.hidden = false));
    toast('Copied to every open day. Save to apply.');
  });
  hoursPreview();
}
// exceptions
const exc = $('#exc-list');
exc?.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('[data-remove-exc]'); if (!b) return; const row = b.closest<HTMLElement>('[data-exc]')!;
  row.hidden = true; markDirty(); toast(`Removed ${$('.name', row)!.textContent}`, () => (row.hidden = false));
});
$('#x-go')?.addEventListener('click', () => {
  const n = $<HTMLInputElement>('#x-name')!, d = $<HTMLInputElement>('#x-date')!, k = $<HTMLSelectElement>('#x-kind')!;
  if (!n.value.trim() || !d.value) { toast('Add a name and a date for the exception'); return; }
  const when = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(d.value + 'T00:00:00Z'));
  const row = document.createElement('div'); row.className = 'row x-row'; row.setAttribute('data-exc', '');
  row.innerHTML = `<span class="cell name">${esc(n.value)}</span><span class="cell muted truncate">${when}</span><span class="cell">${esc(k.value)}</span><span class="cell right"><button type="button" class="btn btn-sm btn-quiet" data-remove-exc>Remove</button></span>`;
  exc!.appendChild(row); n.value = ''; d.value = ''; markDirty(); toast('Exception added. Save to apply.', () => row.remove());
});
function markDirty() { if (!form) return; $$('[data-save]', form).forEach((s) => ((s as HTMLButtonElement).disabled = false)); $$('[data-unsaved]', form).forEach((u) => (u.hidden = false)); }
// phone
$<HTMLInputElement>('[data-ring]')?.addEventListener('input', (e) => { const el = $('[data-ring-out]'); if (el) el.textContent = (e.target as HTMLInputElement).value || '20'; });
const vm = $<HTMLTextAreaElement>('#ph-vm'); if (vm) { const out = document.getElementById(vm.dataset.count!)!; const u = () => (out.textContent = String(vm.value.length)); vm.addEventListener('input', u); u(); }
// privacy
$('#del-go')?.addEventListener('click', () => { const n = $<HTMLInputElement>('#del-name')!; if (!n.value.trim()) { n.focus(); toast("Type the client's name first"); return; } const v = n.value; n.value = ''; toast(`${v} soft-deleted. Joy will not contact them. Restore it from the audit log.`, () => toast('Restored')); });

// ---- connectors
const cn = $('#cn');
if (cn) {
  const ICO = { connected: '<circle cx="7" cy="7" r="6" fill="var(--good)"/><path d="M4.4 7.2l1.9 1.9 3.3-3.8" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', warn: '<circle cx="7" cy="7" r="5.5" stroke="var(--watch)" stroke-width="1.5"/><path d="M7 3.6a3.4 3.4 0 0 1 0 6.8z" fill="var(--watch)"/>', off: '<circle cx="7" cy="7" r="5.5" stroke="var(--ink-4)" stroke-width="1.5"/>' };
  const label = { connected: 'Connected', warn: 'Needs attention', off: 'Off' };
  const counts = () => $$('.group', cn).forEach((g) => { const n = $$('.cx', g).length; $('.count', g)!.textContent = String(n); g.hidden = n === 0; });
  function setState(cx: HTMLElement, s: 'connected' | 'warn' | 'off', health: string, _sync?: string) {
    cx.dataset.state = s; $('[data-cx-icon]', cx)!.innerHTML = `<svg class="state-icon" width="15" height="15" viewBox="0 0 14 14" fill="none" role="img" aria-label="${label[s]}"><title>${label[s]}</title>${ICO[s]}</svg>`;
    $('[data-cx-health]', cx)!.textContent = health;
    const slot = $('[data-cx-act]', cx); if (slot && !slot.querySelector('a')) {
      const nm = esc($('.name', cx)!.textContent!);
      slot.innerHTML = s === 'warn' ? `<button type="button" class="btn btn-sm" data-cx-reconnect data-cx-main>Reconnect</button>` : s === 'off' ? `<button type="button" class="btn btn-sm" data-cx-connect data-cx-main>Connect</button>`
        : `<button type="button" class="icon-btn cx-menu-btn" data-menu="cxm-${cx.dataset.cx}" aria-haspopup="menu" aria-expanded="false" aria-label="More actions for ${nm}"><svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button><div class="menu" id="cxm-${cx.dataset.cx}" role="menu"><button type="button" role="menuitem" class="menu-item" data-cx-disconnect>${cx.dataset.cx === 'phorest' ? 'Disconnect (Bookings depends on this)' : 'Disconnect'}</button></div>`;
    }
    const gid = s === 'warn' ? 'attn' : s === 'off' ? 'off' : 'on'; $(`.group[data-group="${gid}"] .group-body`, cn!)!.appendChild(cx); counts();
  }
  cn.addEventListener('click', (e) => {
    const t = e.target as HTMLElement; const cx = t.closest<HTMLElement>('.cx'); if (!cx) return;
    const name = $('.name', cx)!.textContent!; const was = { s: cx.dataset.state as 'connected' | 'warn' | 'off', h: $('[data-cx-health]', cx)!.textContent!, y: '' };
    const row = t.closest<HTMLElement>('.cx-row');
    if (row) { const open = row.getAttribute('aria-expanded') !== 'true'; row.setAttribute('aria-expanded', String(open)); $(`#cx-${cx.dataset.cx}`, cx)!.hidden = !open; return; }
    const btn = t.closest<HTMLButtonElement>('button'); if (!btn) return;
    if (btn.matches('[data-cx-test]')) {
      const old = btn.textContent; btn.textContent = 'Testing…'; btn.classList.add('busy');
      setTimeout(() => { btn.textContent = old; btn.classList.remove('busy');
        if (cx.dataset.state === 'warn') toast(`${name} answered. One part needs attention: ${was.h.toLowerCase()}. Reconnect soon.`);
        else { toast(`${name} answered. Everything it is allowed to do works.`); if (cx.dataset.state === 'connected') $('[data-cx-health]', cx)!.textContent = 'Connected, checked just now'; } }, 700);
    } else if (btn.matches('[data-cx-reconnect]')) {
      if (cx.dataset.state === 'warn') { setState(cx, 'connected', 'Connected, checked just now', 'Synced just now'); $$('.cx-parts .state-icon', cx).forEach((i) => (i.outerHTML = `<svg class="state-icon" width="13" height="13" viewBox="0 0 14 14" fill="none" role="img" aria-label="Connected">${ICO.connected}</svg>`)); toast(`${name} sign-in renewed. Nothing else changed.`, () => setState(cx, was.s, was.h, was.y)); }
      else toast(`Opening ${name} sign-in. Nothing changes until you approve there.`);
    } else if (btn.matches('[data-cx-disconnect]')) {
      setState(cx, 'off', 'Off, disconnected just now', 'Not connected');
      toast(`Disconnected ${name}.${cx.dataset.cx === 'phorest' ? ' PRISM can no longer read your bookings.' : ''}`, () => setState(cx, was.s, was.h, was.y));
    } else if (btn.matches('[data-cx-connect]')) toast(`Opening ${name} sign-in. Joy's voice stays off until you approve there.`);
  });
}
export {};
