// The presale sign-up (src/components/site/Pricing.astro). The plan cards are a native radio group; the form shows
// the chosen plan and carries it in a hidden field. Submitting saves the sign-up to Netlify Forms ("presale") over
// fetch, then sends the browser to that plan's Stripe Payment Link with the email prefilled and a reference id.
// A plan whose link is empty (data-stripe-link="") stays on the page and says a checkout link will follow by email.
const form = document.querySelector<HTMLFormElement>('[data-presale]');
const radios = [...document.querySelectorAll<HTMLInputElement>('input[type=radio][name=plan]')];

if (form && radios.length) {
  const planField = form.querySelector<HTMLInputElement>('[data-plan-field]')!;
  const summary = form.querySelector<HTMLOutputElement>('[data-summary]')!;
  const status = form.querySelector<HTMLElement>('[data-status]')!;
  const body = form.querySelector<HTMLElement>('[data-form-body]')!;
  const done = form.querySelector<HTMLElement>('[data-done]')!;
  const doneMsg = form.querySelector<HTMLElement>('[data-done-msg]')!;
  const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const chosen = () => radios.find((r) => r.checked) ?? radios[0];

  const sync = () => { const r = chosen(); planField.value = r.value; summary.textContent = `${r.dataset.name} · ${r.dataset.price}`; };
  radios.forEach((r) => r.addEventListener('change', sync));
  sync();   // a back/forward visit can restore a different checked card

  // inline errors under each required field; cleared as soon as the field is fixed
  const checks: { name: string; msg: (el: HTMLInputElement) => string }[] = [
    { name: 'name', msg: () => 'Enter your name.' },
    { name: 'salon', msg: () => 'Enter your salon’s name.' },
    { name: 'email', msg: (el) => (el.value.trim() ? 'Enter an email like you@yoursalon.com.' : 'Enter your work email.') },
  ];
  const field = (n: string) => form.elements.namedItem(n) as HTMLInputElement;
  const setErr = (el: HTMLInputElement, text: string) => {
    const p = document.getElementById(`${el.id}-err`);
    if (p) p.textContent = text;
    if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  };
  for (const c of checks) {
    const el = field(c.name);
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') && el.checkValidity()) setErr(el, ''); });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let first: HTMLInputElement | null = null;
    for (const c of checks) {
      const el = field(c.name);
      el.value = el.value.trim();
      if (el.checkValidity()) setErr(el, '');
      else { setErr(el, c.msg(el)); first ??= el; }
    }
    if (first) { first.focus(); return; }

    const r = chosen(), plan = r.value, email = field('email').value;
    planField.value = plan;
    btn.disabled = true; status.classList.remove('err'); status.textContent = 'Saving…';
    try {
      const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString() });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      status.textContent = 'That didn’t go through. Check your connection and try again.'; status.classList.add('err');
      btn.disabled = false;
      return;
    }

    const link = (r.dataset.stripeLink ?? '').trim();
    if (link) {
      let url: URL | null = null;
      try { url = new URL(link); } catch { /* a malformed link falls through to the reserved state */ }
      if (url) {
        url.searchParams.set('prefilled_email', email);
        url.searchParams.set('client_reference_id', `${plan}-${Date.now()}`);
        status.textContent = 'Saved. Taking you to secure checkout…';
        location.assign(url.href);
        return;
      }
    }
    doneMsg.textContent = `Your ${r.dataset.name} seat is reserved. We’ll email ${email} a secure checkout link within one business day.`;
    body.hidden = true; done.hidden = false; doneMsg.focus();
  });
}
