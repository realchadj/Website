/* ---------------------------------------------------------------------------
   QUOTE ENGINE
   ---------------------------------------------------------------------------
   No build step, no framework, no backend. Loads CATALOG from catalog.js and
   drives the whole page. Submission is wired for three modes — see CONFIG.
--------------------------------------------------------------------------- */

const CONFIG = {
  labName: 'Midwest Biolabs',
  labEmail: 'midwestbiolabs@proton.me',
  labPhone: '',
  labAddress: '',

  /* How submitted requests reach you. Options:
       'mailto' — opens the customer's mail client, pre-filled. Zero setup,
                  works the moment you deploy, but delivery depends on the
                  customer actually pressing send.
       'post'   — POSTs JSON to `endpoint`. Point it at Formspree, Basin,
                  a Google Apps Script, or your own server. Recommended
                  once you have five minutes to set one up.
     Both modes always offer a download and a clipboard copy as a fallback. */
  submitMode: 'mailto',
  endpoint: ''
};

const state = {
  categoryId: CATALOG.categories[0].id,
  selected: new Map(),     // code -> test object
  sampleCount: 1,
  turnaroundId: 'standard',
  addOns: new Set(['coc']),
  customer: {}
};

const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const allTests = () => CATALOG.categories.flatMap(c => c.tests.map(t => ({ ...t, categoryId: c.id })));
const findTest = code => allTests().find(t => t.code === code);

/* -------------------------------------------------------------- pricing -- */

function computeQuote() {
  const tests = Array.from(state.selected.values());
  const n = Math.max(1, state.sampleCount);

  const perSample = tests.reduce((sum, t) => sum + t.price, 0);
  const testingBase = perSample * n;

  const turnaround = CATALOG.turnaround.find(t => t.id === state.turnaroundId);
  const rushAmount = testingBase * (turnaround.multiplier - 1);
  const afterRush = testingBase + rushAmount;

  const tier = CATALOG.volumeBreaks
    .filter(b => n >= b.min)
    .sort((a, b) => b.min - a.min)[0] || null;
  const discountAmount = tier ? afterRush * tier.discount : 0;
  const afterDiscount = afterRush - discountAmount;

  const addOnLines = CATALOG.addOns
    .filter(a => state.addOns.has(a.id))
    .map(a => ({ ...a, qty: a.perSample ? n : 1, amount: a.price * (a.perSample ? n : 1) }))
    .filter(a => a.amount > 0 || a.price === 0);
  const addOnTotal = addOnLines.reduce((s, a) => s + a.amount, 0);

  const subtotal = afterDiscount + addOnTotal;
  const minimumApplied = tests.length > 0 && subtotal > 0 && subtotal < CATALOG.minimumOrder;
  const total = minimumApplied ? CATALOG.minimumOrder : subtotal;

  const slowest = tests.reduce((max, t) => Math.max(max, t.tat), 0);
  const businessDays =
    state.turnaroundId === 'rush'     ? Math.min(2, slowest || 2) :
    state.turnaroundId === 'priority' ? Math.min(3, slowest || 3) : slowest;

  return {
    tests, n, perSample, testingBase, turnaround, rushAmount, tier,
    discountAmount, addOnLines, addOnTotal, subtotal, minimumApplied, total,
    businessDays
  };
}

/* ------------------------------------------------------------ rendering -- */

function renderTabs() {
  $('#tabs').innerHTML = CATALOG.categories.map(c => `
    <button class="tab${c.id === state.categoryId ? ' is-active' : ''}"
            data-cat="${c.id}" type="button" role="tab"
            aria-selected="${c.id === state.categoryId}">
      ${c.name}
      ${countInCategory(c.id) ? `<span class="tab-badge">${countInCategory(c.id)}</span>` : ''}
    </button>`).join('');
}

const countInCategory = id =>
  Array.from(state.selected.values()).filter(t => t.categoryId === id).length;

function renderTests() {
  const cat = CATALOG.categories.find(c => c.id === state.categoryId);
  $('#cat-blurb').textContent = cat.blurb;
  $('#tests').innerHTML = cat.tests.map(t => {
    const on = state.selected.has(t.code);
    return `
      <label class="test${on ? ' is-on' : ''}" for="t-${t.code}">
        <input type="checkbox" id="t-${t.code}" data-code="${t.code}" ${on ? 'checked' : ''}>
        <span class="test-body">
          <span class="test-head">
            <span class="test-name">${t.name}</span>
            <span class="test-price">${money(t.price)}<small>/sample</small></span>
          </span>
          <span class="test-detail">${t.detail}</span>
          <span class="test-meta">
            <span class="chip">${t.code}</span>
            <span class="chip chip-quiet">${t.method}</span>
            <span class="chip chip-quiet">${t.tat} business days</span>
          </span>
        </span>
      </label>`;
  }).join('');
}

function renderTurnaround() {
  $('#turnaround').innerHTML = CATALOG.turnaround.map(t => `
    <label class="radio${t.id === state.turnaroundId ? ' is-on' : ''}">
      <input type="radio" name="tat" value="${t.id}" ${t.id === state.turnaroundId ? 'checked' : ''}>
      <span>
        <strong>${t.name}</strong>
        ${t.multiplier !== 1 ? `<em>+${Math.round((t.multiplier - 1) * 100)}%</em>` : '<em>included</em>'}
        <small>${t.note}</small>
      </span>
    </label>`).join('');
}

function renderAddOns() {
  $('#addons').innerHTML = CATALOG.addOns.map(a => `
    <label class="radio${state.addOns.has(a.id) ? ' is-on' : ''}">
      <input type="checkbox" data-addon="${a.id}" ${state.addOns.has(a.id) ? 'checked' : ''}>
      <span>
        <strong>${a.name}</strong>
        <em>${a.price === 0 ? 'no charge' : money(a.price) + (a.perSample ? ' /sample' : '')}</em>
        <small>${a.detail}</small>
      </span>
    </label>`).join('');
}

function renderQuote() {
  const q = computeQuote();
  const box = $('#quote-lines');

  if (q.tests.length === 0) {
    box.innerHTML = `<p class="empty">Select the tests you need and your price appears here immediately —
      no waiting on a callback.</p>`;
    $('#total').textContent = money(0);
    $('#tat-summary').textContent = '—';
    $('#submit').disabled = true;
    $('#print').disabled = true;
    return;
  }

  const rows = [];
  q.tests.forEach(t => rows.push(
    line(`${t.code} · ${t.name}`, `${money(t.price)} × ${q.n} sample${q.n > 1 ? 's' : ''}`, t.price * q.n)
  ));
  if (q.rushAmount > 0) rows.push(
    line(`${q.turnaround.name} turnaround`, `+${Math.round((q.turnaround.multiplier - 1) * 100)}% on testing`, q.rushAmount)
  );
  if (q.discountAmount > 0) rows.push(
    line(`Volume discount — ${q.tier.label}`, `−${Math.round(q.tier.discount * 100)}%`, -q.discountAmount, 'credit')
  );
  q.addOnLines.forEach(a => rows.push(
    line(a.name, a.perSample ? `${money(a.price)} × ${q.n}` : 'per order', a.amount)
  ));
  if (q.minimumApplied) rows.push(
    line('Minimum order adjustment', `Orders are billed at a ${money(CATALOG.minimumOrder)} minimum`,
         CATALOG.minimumOrder - q.subtotal)
  );

  box.innerHTML = rows.join('');
  $('#total').textContent = money(q.total);
  $('#tat-summary').textContent = q.businessDays
    ? `${q.businessDays} business day${q.businessDays > 1 ? 's' : ''} from receipt`
    : '—';
  $('#per-sample').textContent = `${money(q.total / q.n)} per sample · ${q.n} sample${q.n > 1 ? 's' : ''}`;
  $('#submit').disabled = false;
  $('#print').disabled = false;

  const next = CATALOG.volumeBreaks.find(b => q.n < b.min);
  $('#nudge').innerHTML = next
    ? `Add ${next.min - q.n} more sample${next.min - q.n > 1 ? 's' : ''} to reach
       <strong>${next.label}</strong> and save ${Math.round(next.discount * 100)}%.`
    : '';
}

const line = (name, meta, amount, cls = '') => `
  <div class="line ${cls}">
    <div><span class="line-name">${name}</span><span class="line-meta">${meta}</span></div>
    <div class="line-amount">${amount < 0 ? '−' : ''}${money(Math.abs(amount))}</div>
  </div>`;

/* ----------------------------------------------------------- quote text -- */

function quoteReference() {
  const d = new Date();
  const stamp = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.abs(hash(JSON.stringify([...state.selected.keys()]) + d.getTime())) % 9000 + 1000;
  return `Q-${stamp}-${rand}`;
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

function quoteAsText(ref) {
  const q = computeQuote();
  const c = readCustomer();
  const L = [];
  L.push(`${CONFIG.labName.toUpperCase()} — SAMPLE SUBMISSION & QUOTE`);
  L.push(`Reference: ${ref}`);
  L.push(`Date: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`);
  L.push('');
  L.push('SUBMITTED BY');
  L.push(`  Name:     ${c.name || '—'}`);
  L.push(`  Company:  ${c.company || '—'}`);
  L.push(`  Email:    ${c.email || '—'}`);
  L.push(`  Phone:    ${c.phone || '—'}`);
  L.push('');
  L.push(`SAMPLES: ${q.n}   MATRIX: ${c.matrix || '—'}   TURNAROUND: ${q.turnaround.name}`);
  if (c.projectRef) L.push(`PROJECT / PO: ${c.projectRef}`);
  L.push('');
  L.push('ANALYSES REQUESTED');
  q.tests.forEach(t => L.push(`  [${t.code}] ${t.name} — ${t.method} — ${money(t.price)}/sample`));
  L.push('');
  L.push('PRICING');
  L.push(`  Testing (${money(q.perSample)}/sample × ${q.n})        ${money(q.testingBase)}`);
  if (q.rushAmount > 0)      L.push(`  ${q.turnaround.name} turnaround                    ${money(q.rushAmount)}`);
  if (q.discountAmount > 0)  L.push(`  Volume discount (${q.tier.label})            −${money(q.discountAmount)}`);
  q.addOnLines.forEach(a =>  L.push(`  ${a.name}${' '.repeat(Math.max(1, 38 - a.name.length))}${money(a.amount)}`));
  if (q.minimumApplied)      L.push(`  Minimum order adjustment                ${money(CATALOG.minimumOrder - q.subtotal)}`);
  L.push(`  ${'-'.repeat(52)}`);
  L.push(`  TOTAL                                   ${money(q.total)}`);
  L.push('');
  L.push(`Estimated turnaround: ${q.businessDays} business days from sample receipt.`);
  L.push(`Quote valid ${CATALOG.quoteValidDays} days from the date above.`);
  if (c.notes) { L.push(''); L.push('NOTES FROM CUSTOMER'); L.push('  ' + c.notes.replace(/\n/g, '\n  ')); }
  return L.join('\n');
}

function readCustomer() {
  const g = id => ($('#' + id) ? $('#' + id).value.trim() : '');
  return {
    name: g('f-name'), company: g('f-company'), email: g('f-email'),
    phone: g('f-phone'), matrix: g('f-matrix'), projectRef: g('f-project'),
    notes: g('f-notes')
  };
}

/* ---------------------------------------------------------- submission -- */

async function submitRequest() {
  const c = readCustomer();
  if (!c.name || !c.email) {
    $('#form-error').textContent = 'Name and email are required so we can send your results.';
    $('#f-name').focus();
    return;
  }
  $('#form-error').textContent = '';

  const ref = quoteReference();
  const text = quoteAsText(ref);
  const q = computeQuote();

  const payload = {
    reference: ref,
    submittedAt: new Date().toISOString(),
    customer: c,
    sampleCount: q.n,
    turnaround: q.turnaround.name,
    tests: q.tests.map(t => ({ code: t.code, name: t.name, price: t.price })),
    addOns: q.addOnLines.map(a => ({ name: a.name, amount: a.amount })),
    total: Number(q.total.toFixed(2)),
    plainText: text
  };

  saveDraft();
  showConfirmation(ref, q.total, text, payload);

  if (CONFIG.submitMode === 'post' && CONFIG.endpoint) {
    try {
      const res = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      $('#confirm-status').textContent = res.ok
        ? 'Your request was delivered to the lab.'
        : 'The lab server did not confirm receipt — please send the copy below by email.';
    } catch {
      $('#confirm-status').textContent =
        'We could not reach the lab server — please send the copy below by email.';
    }
  } else {
    const subject = encodeURIComponent(`Sample submission ${ref} — ${c.company || c.name}`);
    const body = encodeURIComponent(text);
    $('#confirm-mail').href = `mailto:${CONFIG.labEmail}?subject=${subject}&body=${body}`;
    $('#confirm-status').textContent = 'Press “Send by email” below to deliver this to the lab.';
  }
}

function showConfirmation(ref, total, text, payload) {
  $('#confirm-ref').textContent = ref;
  $('#confirm-total').textContent = money(total);
  $('#confirm-text').value = text;
  $('#confirm').hidden = false;
  $('#confirm').scrollIntoView({ behavior: 'smooth', block: 'center' });

  $('#confirm-download').onclick = () => download(`${ref}.txt`, text, 'text/plain');
  $('#confirm-json').onclick = () => download(`${ref}.json`, JSON.stringify(payload, null, 2), 'application/json');
  $('#confirm-copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      $('#confirm-copy').textContent = 'Copied';
      setTimeout(() => ($('#confirm-copy').textContent = 'Copy to clipboard'), 1800);
    } catch {
      $('#confirm-text').select();
    }
  };
  $('#confirm-mail').hidden = CONFIG.submitMode === 'post' && !!CONFIG.endpoint;
}

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------- printable quote/COC -- */

function buildPrintable() {
  const q = computeQuote();
  const c = readCustomer();
  const ref = quoteReference();
  const rows = q.tests.map(t => `
    <tr><td>${t.code}</td><td>${t.name}<br><small>${t.method}</small></td>
        <td class="r">${money(t.price)}</td><td class="r">${q.n}</td>
        <td class="r">${money(t.price * q.n)}</td></tr>`).join('');

  const extras = [
    q.rushAmount > 0 ? `<tr><td colspan="4">${q.turnaround.name} turnaround</td><td class="r">${money(q.rushAmount)}</td></tr>` : '',
    q.discountAmount > 0 ? `<tr><td colspan="4">Volume discount — ${q.tier.label}</td><td class="r">−${money(q.discountAmount)}</td></tr>` : '',
    ...q.addOnLines.map(a => `<tr><td colspan="4">${a.name}</td><td class="r">${money(a.amount)}</td></tr>`),
    q.minimumApplied ? `<tr><td colspan="4">Minimum order adjustment</td><td class="r">${money(CATALOG.minimumOrder - q.subtotal)}</td></tr>` : ''
  ].join('');

  $('#print-area').innerHTML = `
    <div class="doc">
      <header class="doc-head">
        <div><h1>${CONFIG.labName}</h1><p>Quotation &amp; Chain of Custody</p></div>
        <div class="r"><strong>${ref}</strong><br>
          ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</div>
      </header>
      <section class="doc-grid">
        <div><h3>Submitted by</h3>
          <p>${esc(c.name) || '&nbsp;'}<br>${esc(c.company)}<br>${esc(c.email)}<br>${esc(c.phone)}</p></div>
        <div><h3>Sample details</h3>
          <p>Samples: ${q.n}<br>Matrix: ${esc(c.matrix) || '—'}<br>
             Turnaround: ${q.turnaround.name}<br>Project/PO: ${esc(c.projectRef) || '—'}</p></div>
      </section>
      <table class="doc-table">
        <thead><tr><th>Code</th><th>Analysis</th><th class="r">Unit</th><th class="r">Qty</th><th class="r">Amount</th></tr></thead>
        <tbody>${rows}${extras}</tbody>
        <tfoot><tr><th colspan="4" class="r">Total</th><th class="r">${money(q.total)}</th></tr></tfoot>
      </table>
      <p class="doc-note">Estimated turnaround ${q.businessDays} business days from sample receipt.
        Quote valid ${CATALOG.quoteValidDays} days. Prices exclude applicable taxes.</p>
      <section class="doc-coc">
        <h3>Chain of custody</h3>
        <table class="doc-table">
          <thead><tr><th>Relinquished by</th><th>Date / time</th><th>Received by</th><th>Date / time</th></tr></thead>
          <tbody>${'<tr><td></td><td></td><td></td><td></td></tr>'.repeat(3)}</tbody>
        </table>
      </section>
      ${c.notes ? `<section><h3>Notes</h3><p>${esc(c.notes)}</p></section>` : ''}
    </div>`;
  window.print();
}

const esc = s => String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

/* ------------------------------------------------------------ persistence */

const DRAFT_KEY = 'labquote.draft.v1';

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      codes: [...state.selected.keys()],
      sampleCount: state.sampleCount,
      turnaroundId: state.turnaroundId,
      addOns: [...state.addOns],
      customer: readCustomer()
    }));
  } catch { /* storage disabled — the app still works, it just won't remember */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    (d.codes || []).forEach(code => { const t = findTest(code); if (t) state.selected.set(code, t); });
    if (d.sampleCount) state.sampleCount = d.sampleCount;
    if (d.turnaroundId) state.turnaroundId = d.turnaroundId;
    if (Array.isArray(d.addOns)) state.addOns = new Set(d.addOns);
    if (d.customer) Object.entries(d.customer).forEach(([k, v]) => {
      const el = $('#f-' + ({ projectRef: 'project' }[k] || k));
      if (el && v) el.value = v;
    });
    if ($('#samples')) $('#samples').value = state.sampleCount;
  } catch { /* corrupt draft — start clean rather than break the page */ }
}

/* ------------------------------------------------------------------ init */

function init() {
  $('#lab-name').textContent = CONFIG.labName;
  document.title = `Instant Quote — ${CONFIG.labName}`;

  renderTabs(); renderTests(); renderTurnaround(); renderAddOns();
  loadDraft();
  renderTabs(); renderTests(); renderTurnaround(); renderAddOns();
  renderQuote();

  $('#tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.categoryId = btn.dataset.cat;
    renderTabs(); renderTests();
  });

  $('#tests').addEventListener('change', e => {
    const code = e.target.dataset.code;
    if (!code) return;
    if (e.target.checked) state.selected.set(code, findTest(code));
    else state.selected.delete(code);
    renderTabs(); renderTests(); renderQuote(); saveDraft();
  });

  $('#samples').addEventListener('input', e => {
    state.sampleCount = Math.max(1, Math.min(9999, parseInt(e.target.value, 10) || 1));
    renderQuote(); saveDraft();
  });

  $('#turnaround').addEventListener('change', e => {
    if (e.target.name !== 'tat') return;
    state.turnaroundId = e.target.value;
    renderTurnaround(); renderQuote(); saveDraft();
  });

  $('#addons').addEventListener('change', e => {
    const id = e.target.dataset.addon;
    if (!id) return;
    e.target.checked ? state.addOns.add(id) : state.addOns.delete(id);
    renderAddOns(); renderQuote(); saveDraft();
  });

  $('#clear').addEventListener('click', () => {
    state.selected.clear();
    renderTabs(); renderTests(); renderQuote(); saveDraft();
  });

  $('#submit').addEventListener('click', submitRequest);
  $('#print').addEventListener('click', buildPrintable);
  $$('#form input, #form textarea').forEach(el => el.addEventListener('change', saveDraft));
}

document.addEventListener('DOMContentLoaded', init);
