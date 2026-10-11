(() => {
  'use strict';
  const { STORAGE_KEY, COLORS, defaultPlan, numeric, calculate, money, percent, parsePlan, exportCsv } = globalThis.PlannerModel;
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const tone = value => value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  const paths = {
    chart: '<path d="M3 3v18h18M6 15l4-5 4 3 6-8"/>',
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16h.01"/>',
    wallet: '<path d="M20 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v14H5a2 2 0 0 1-2-2V5M20 11h-5v6h5M17 14h.01"/>',
    coins: '<circle cx="9" cy="9" r="6"/><path d="M13 4a6 6 0 1 1-9 9M16 9a6 6 0 1 1-7 7M8 6v6M10 6v6"/>',
    trend: '<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
    reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>'
  };
  function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.chart}</svg>`; }
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  let plan;
  try { plan = parsePlan(localStorage.getItem(STORAGE_KEY)) || defaultPlan(); } catch { plan = defaultPlan(); }
  let chartView = 'profit';
  let toastTimer;
  const rowNodes = new Map();

  function notice(message) {
    clearTimeout(toastTimer);
    $('toast-region').innerHTML = `<div class="toast">${icon('check')}<span>${escape(message)}</span><button class="icon-button" aria-label="Zamknij komunikat">${icon('close')}</button></div>`;
    $('toast-region').querySelector('button').addEventListener('click', () => { $('toast-region').replaceChildren(); });
    toastTimer = setTimeout(() => $('toast-region').replaceChildren(), 4500);
  }
  function save() {
    let failed = false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); } catch { failed = true; }
    $('save-state').className = 'save-state' + (failed ? ' negative' : '');
    $('save-label').textContent = failed ? 'Zapis niedostępny' : 'Zapisano na tym urządzeniu';
    $('storage-warning').hidden = !failed;
  }
  function createRow(category) {
    const tr = document.createElement('tr');
    // This template contains only fixed markup; user text is assigned as values/textContent.
    tr.innerHTML = `<td><div class="category-name"><span class="category-dot"></span><input data-field="name" placeholder="Nazwa kategorii"></div></td><td><input class="number-input" data-field="share" type="number" min="0" step="any" inputmode="decimal"></td><td class="amount" data-output="investment"></td><td><input class="number-input roi-input" data-field="roi" type="number" min="-100" step="any" inputmode="decimal"></td><td class="amount profit-amount" data-output="profit"></td><td><button class="icon-button delete-button" title="Usuń kategorię">${icon('trash')}</button></td>`;
    tr.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        const current = plan.categories.find(c => c.id === category.id);
        if (!current) return;
        const field = input.dataset.field;
        const minimum = field === 'roi' ? -100 : 0;
        if (field !== 'name' && (numeric(input.value) < minimum || (input.value && !Number.isFinite(Number(input.value))))) {
          input.value = current[field];
          notice(field === 'roi' ? 'Minimalny ROI wynosi −100%.' : 'Udział w budżecie nie może być ujemny.');
          return;
        }
        current[field] = input.value;
        render(); save();
      });
    });
    tr.querySelector('button').addEventListener('click', () => {
      const index = plan.categories.findIndex(c => c.id === category.id);
      plan.categories = plan.categories.filter(c => c.id !== category.id);
      render(); save();
      const next = plan.categories[Math.min(index, plan.categories.length - 1)];
      if (next) rowNodes.get(next.id).querySelector('[data-field="name"]').focus(); else $('add-category').focus();
    });
    return tr;
  }
  function renderRows(result) {
    for (const [id, row] of rowNodes) {
      if (!plan.categories.some(c => c.id === id)) { row.remove(); rowNodes.delete(id); }
    }
    for (const c of result.rows) {
      let tr = rowNodes.get(c.id);
      if (!tr) { tr = createRow(c); rowNodes.set(c.id, tr); $('category-rows').append(tr); }
      const label = c.name || 'bez nazwy';
      for (const field of ['name', 'share', 'roi']) {
        const input = tr.querySelector(`[data-field="${field}"]`);
        if (input.value !== c[field]) input.value = c[field];
        input.setAttribute('aria-label', field === 'name' ? `Nazwa kategorii ${label}` : `${field === 'share' ? 'Budżet' : 'ROI'} (%) — ${label}`);
      }
      tr.querySelector('.category-dot').style.background = c.color;
      tr.querySelector('[data-output="investment"]').textContent = money(c.investment);
      const profit = tr.querySelector('[data-output="profit"]');
      profit.textContent = money(c.profit); profit.className = 'amount profit-amount ' + tone(c.profit);
      tr.querySelector('[data-field="roi"]').className = 'number-input roi-input ' + tone(numeric(c.roi));
      tr.querySelector('button').setAttribute('aria-label', `Usuń kategorię ${label}`);
    }
    $('category-count').textContent = `${plan.categories.length} kategorii`;
    $('empty-table').hidden = plan.categories.length > 0;
  }
  function renderDonut(result) {
    const data = result.rows.filter(c => c.investment > 0).map(c => ({ name: c.name || 'Bez nazwy', value: c.investment, color: c.color }));
    if (result.remaining > 0) data.push({ name: 'Nieprzydzielone', value: result.remaining, color: '#e7eaf0' });
    const sum = data.reduce((s, c) => s + c.value, 0);
    const circumference = 2 * Math.PI * 85;
    let offset = 0;
    $('donut-chart').innerHTML = '<circle cx="150" cy="110" r="85" fill="none" stroke="#edf0f5" stroke-width="24"/>' + data.map(c => {
      const arc = sum > 0 ? c.value / sum * circumference : 0;
      const gap = data.length > 1 ? Math.min(3, arc / 4) : 0;
      const circle = `<circle cx="150" cy="110" r="85" fill="none" stroke="${c.color}" stroke-width="24" stroke-dasharray="${Math.max(0, arc - gap)} ${circumference - Math.max(0, arc - gap)}" stroke-dashoffset="${-offset}" transform="rotate(-90 150 110)"><title>${escape(c.name)}: ${escape(money(c.value))}</title></circle>`;
      offset += arc;
      return circle;
    }).join('');
    $('donut-wrapper').setAttribute('aria-label', `Struktura budżetu: ${data.map(c => `${c.name}: ${money(c.value)}`).join(', ') || 'Brak przydzielonego budżetu'}`);
    $('donut-label').textContent = result.overBudget ? 'Przydzielono' : 'Wykorzystano';
    $('donut-percent').textContent = percent(result.share);
    $('chart-legend').innerHTML = data.length ? data.map(c => `<div><span class="legend-name"><i style="background:${c.color}"></i>${escape(c.name)}</span><strong>${percent(result.budget > 0 ? c.value / result.budget * 100 : 0)}</strong></div>`).join('') : '<p class="muted">Dodaj budżet i udziały, aby zobaczyć wykres.</p>';
    $('chart-warning').hidden = !result.overBudget;
  }
  function renderBars(result) {
    const data = result.rows.map(c => ({ name: c.name || 'Bez nazwy', value: chartView === 'profit' ? c.profit : c.returns, color: c.color }));
    const width = Math.max(560, data.length * 96 + 90);
    const left = 76, right = width - 20, top = 20, bottom = 212;
    let minimum = Math.min(0, ...data.map(c => c.value));
    let maximum = Math.max(0, ...data.map(c => c.value));
    if (minimum === maximum) maximum = 1;
    const y = value => bottom - (value - minimum) / (maximum - minimum) * (bottom - top);
    const zero = y(0);
    const compact = n => new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 1 }).format(n) + ' zł';
    let svg = '';
    for (let i = 0; i <= 4; i++) {
      const value = minimum + (maximum - minimum) * i / 4;
      const position = y(value);
      svg += `<line x1="${left}" x2="${right}" y1="${position}" y2="${position}" stroke="#e9edf2" stroke-dasharray="3 5"/><text x="${left - 9}" y="${position + 4}" text-anchor="end" fill="#778193" font-size="10">${escape(compact(value))}</text>`;
    }
    svg += `<line x1="${left}" x2="${right}" y1="${zero}" y2="${zero}" stroke="#c9d0dc"/>`;
    const step = (right - left) / Math.max(1, data.length);
    svg += data.map((c, i) => {
      const x = left + step * (i + .5);
      const barWidth = Math.min(44, step * .55);
      const height = Math.abs(y(c.value) - zero);
      const label = c.name.length > 17 ? c.name.slice(0, 16) + '…' : c.name;
      return `<g><title>${escape(c.name)}: ${escape(money(c.value))}</title><rect data-value="${c.value}" x="${x - barWidth / 2}" y="${c.value >= 0 ? y(c.value) : zero}" width="${barWidth}" height="${height}" rx="4" fill="${c.value < 0 ? '#d87174' : c.color}"/><text x="${x}" y="244" text-anchor="middle" fill="#778193" font-size="10">${escape(label)}</text></g>`;
    }).join('');
    if (!data.length) svg += `<text x="${width / 2}" y="105" text-anchor="middle" fill="#778193" font-size="12">Dodaj kategorie, aby porównać wyniki.</text>`;
    $('bar-svg').setAttribute('viewBox', `0 0 ${width} 270`);
    $('bar-svg').innerHTML = svg;
    $('bar-chart').style.minWidth = width + 'px';
    $('bar-chart').setAttribute('aria-label', data.map(c => `${c.name}: ${money(c.value)}`).join(', ') || 'Brak kategorii');
    for (const mode of ['profit', 'returns']) {
      $(mode + '-tab').classList.toggle('selected', chartView === mode);
      $(mode + '-tab').setAttribute('aria-pressed', String(chartView === mode));
    }
  }
  function render() {
    const r = calculate(plan);
    const valid = numeric(plan.budget) > 0;
    if ($('annual-budget').value !== plan.budget) $('annual-budget').value = plan.budget;
    $('annual-budget').setAttribute('aria-invalid', String(!valid));
    if (!valid) $('annual-budget').setAttribute('aria-describedby', 'budget-error'); else $('annual-budget').removeAttribute('aria-describedby');
    $('budget-error').hidden = valid; $('budget-input').classList.toggle('invalid', !valid);
    $('export-button').disabled = !valid;
    for (const [id, value] of [['budget-total', r.budget], ['allocated-total', r.allocated], ['profit-total', r.profit], ['sum-investment', r.allocated], ['sum-profit', r.profit]]) $(id).textContent = money(value);
    $('profit-total').className = tone(r.profit); $('sum-profit').className = tone(r.profit);
    $('gross-total').textContent = `Zwrot brutto: ${money(r.returns)}`;
    for (const id of ['roi-total', 'sum-roi']) { $(id).textContent = percent(r.roi); $(id).className = tone(r.roi); }
    $('roi-card').className = 'kpi roi-kpi ' + tone(r.roi);
    for (const id of ['allocated-percent', 'sum-share']) { $(id).textContent = percent(r.share); $(id).className = r.overBudget ? 'negative' : ''; }
    const partial = r.share < 100 - 1e-8;
    $('allocation-status').className = 'allocation-status ' + (r.overBudget ? 'over' : partial ? 'partial' : 'complete');
    $('allocation-status').innerHTML = `<div>${icon(r.overBudget ? 'help' : partial ? 'wallet' : 'check')}<span>${r.overBudget ? `Budżet przekroczony o <strong>${money(-r.remaining)}</strong>. Zmniejsz udziały kategorii.` : partial ? `Pozostało do rozdysponowania <strong>${money(r.remaining)}</strong>.` : '<strong>Budżet w pełni rozdysponowany.</strong> Każda złotówka ma swoje miejsce.'}</span></div><span class="allocation-percent">${percent(r.share)} / 100%</span>`;
    renderRows(r); renderDonut(r); renderBars(r);
  }
  for (const mode of ['profit', 'returns']) {
    $(mode + '-tab').addEventListener('click', () => { chartView = mode; renderBars(calculate(plan)); });
  }
  $('annual-budget').addEventListener('input', e => {
    if (numeric(e.target.value) < 0) { e.target.value = plan.budget; notice('Budżet nie może być ujemny.'); return; }
    plan.budget = e.target.value; render(); save();
  });
  $('add-category').addEventListener('click', () => {
    const id = globalThis.crypto?.randomUUID?.() || `category-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    plan.categories.push({ id, name: '', share: '0', roi: '0', color: COLORS[plan.categories.length % COLORS.length] });
    render(); save(); rowNodes.get(id).querySelector('[data-field="name"]').focus();
  });
  $('export-button').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([exportCsv(plan)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'plan-marketingowy.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notice('Raport CSV został wyeksportowany.');
  });
  $('reset-button').addEventListener('click', () => $('reset-dialog').showModal());
  $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
  $('confirm-reset').addEventListener('click', () => {
    plan = defaultPlan();
    rowNodes.forEach(row => row.remove()); rowNodes.clear();
    render(); save(); $('reset-dialog').close(); notice('Przywrócono przykładowy plan.');
  });
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  $('close-help').addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('close', () => $('help-button').focus());
  $('reset-dialog').addEventListener('close', () => $('reset-button').focus());
  render(); save();
})();
