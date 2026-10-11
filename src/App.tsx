import { useEffect, useRef, useState } from 'react'
import { AreaChart as ChartIcon, ArrowDownToLine, ArrowUpRight, BarChart3, Check, ChevronRight, CircleHelp, Coins, LayoutDashboard, Plus, RotateCcw, Target, Trash2, TrendingUp, Wallet, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { calculate, COLORS, defaultPlan, exportCsv, money, numeric, parsePlan, percent, STORAGE_KEY, type Category, type Plan } from './model'

function initialPlan() {
  try { return parsePlan(localStorage.getItem(STORAGE_KEY)) ?? defaultPlan() } catch { return defaultPlan() }
}
const tone = (n: number) => n > 0 ? 'positive' : n < 0 ? 'negative' : 'neutral'

export default function App() {
  const [plan, setPlan] = useState<Plan>(initialPlan)
  const [storageError, setStorageError] = useState(false)
  const [notice, setNotice] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [chartView, setChartView] = useState<'profit' | 'returns'>('profit')
  const resetRef = useRef<HTMLDialogElement>(null)
  const helpRef = useRef<HTMLDialogElement>(null)
  const nameRefs = useRef(new Map<string, HTMLInputElement>())
  const result = calculate(plan)
  const budgetValid = numeric(plan.budget) > 0
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); setStorageError(false) } catch { setStorageError(true) }
  }, [plan])
  useEffect(() => { if (focusId) { nameRefs.current.get(focusId)?.focus(); setFocusId(null) } }, [focusId])
  useEffect(() => { if (resetOpen) resetRef.current?.showModal(); else resetRef.current?.close() }, [resetOpen])
  useEffect(() => { if (helpOpen) helpRef.current?.showModal(); else helpRef.current?.close() }, [helpOpen])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer) }, [notice])
  function update(id: string, key: keyof Category, value: string) {
    if ((key === 'share' && numeric(value) < 0) || (key === 'roi' && numeric(value) < -100)) {
      setNotice(key === 'roi' ? 'Minimalny ROI wynosi −100%.' : 'Udział w budżecie nie może być ujemny.'); return
    }
    setPlan(p => ({ ...p, categories: p.categories.map(c => c.id === id ? { ...c, [key]: value } : c) }))
  }
  function addCategory() {
    const id = crypto.randomUUID()
    setPlan(p => ({ ...p, categories: [...p.categories, { id, name: '', share: '0', roi: '0', color: COLORS[p.categories.length % COLORS.length] }] }))
    setFocusId(id)
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportCsv(plan)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'plan-marketingowy.csv'; a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Raport CSV został wyeksportowany.')
  }
  const pieData = result.rows.filter(c => c.investment > 0).map(c => ({ name: c.name || 'Bez nazwy', value: c.investment, color: c.color }))
  if (result.remaining > 0) pieData.push({ name: 'Nieprzydzielone', value: result.remaining, color: '#e7eaf0' })
  const profitData = result.rows.map(c => ({ name: c.name || 'Bez nazwy', value: chartView === 'profit' ? c.profit : c.returns, color: c.color }))

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Nawigacja">
      <div className="brand"><span className="brand-mark"><ChartIcon size={23} strokeWidth={2.5} /></span><span>budget<span className="brand-accent">wise</span><span className="brand-dot">.</span></span></div>
      <div className="workspace-label">TWOJA PRZESTRZEŃ</div>
      <a className="nav-item active" href="#dashboard"><LayoutDashboard size={18} /> Planer budżetu <ChevronRight size={15} className="nav-arrow" /></a>
      <div className="sidebar-bottom"><div className="sidebar-tip"><span className="tip-icon"><Target size={20} /></span><strong>Dobry plan. Lepsze wyniki.</strong><p>Zobacz, jak każdy kanał pracuje na Twój budżet.</p></div><button className="nav-item help-button" onClick={() => setHelpOpen(true)}><CircleHelp size={18} /> Jak działa planer?</button><div className="sidebar-footer">Twoje dane zostają u Ciebie.<br /><span>Zapis lokalny · bez konta</span></div></div>
    </aside>
    <main id="dashboard">
      <div className="topbar"><span>Twoja przestrzeń <ChevronRight size={13} /> <strong>Planer budżetu</strong></span><span className={storageError ? 'save-state negative' : 'save-state'}><span className="status-dot" />{storageError ? 'Zapis niedostępny' : 'Zapisano na tym urządzeniu'}</span></div>
      <div className="page-content">
        <header className="page-header"><div><div className="eyebrow">PLANUJ ŚWIADOMIE</div><h1>Marketing Budget & ROI Planner<span>.</span></h1><p>Podziel budżet. Porównaj kanały. Zobacz potencjał swoich inwestycji.</p></div><div className="header-actions"><button className="button secondary" onClick={() => setResetOpen(true)}><RotateCcw size={16} /> Resetuj</button><button className="button primary" onClick={download} disabled={!budgetValid}><ArrowDownToLine size={16} /> Eksportuj CSV</button></div></header>
        <section className="budget-panel" aria-labelledby="budget-title"><div className="budget-intro"><div className="budget-icon"><Wallet size={23} /></div><div><h2 id="budget-title">Od jakiego budżetu zaczynamy?</h2><p>Ustal roczną kwotę przeznaczoną na marketing.</p></div></div><div className="budget-control"><label htmlFor="annual-budget">Budżet roczny</label><div className={'budget-input ' + (!budgetValid ? 'invalid' : '')}><input id="annual-budget" type="number" min="0.01" step="any" inputMode="decimal" value={plan.budget} aria-invalid={!budgetValid} aria-describedby={!budgetValid ? 'budget-error' : undefined} onChange={e => { if (numeric(e.target.value) < 0) { setNotice('Budżet nie może być ujemny.'); return } setPlan(p => ({ ...p, budget: e.target.value })) }} /><span>PLN</span></div>{!budgetValid && <small id="budget-error" className="negative">Wpisz budżet większy od zera.</small>}</div></section>
        <section className="kpi-grid" aria-label="Podsumowanie planu">
          <article className="kpi"><div className="kpi-label">Budżet roczny <Wallet size={17} /></div><strong data-testid="budget-total">{money(result.budget)}</strong><span>Twój punkt wyjścia</span></article>
          <article className="kpi"><div className="kpi-label">Przydzielony budżet <Coins size={17} /></div><strong data-testid="allocated-total">{money(result.allocated)}</strong><span><b className={result.overBudget ? 'negative' : ''}>{percent(result.share)}</b> całego budżetu</span></article>
          <article className="kpi"><div className="kpi-label">Prognozowany zysk <TrendingUp size={17} /></div><strong className={tone(result.profit)} data-testid="profit-total">{money(result.profit)}</strong><span>Zwrot brutto: {money(result.returns)}</span></article>
          <article className={'kpi roi-kpi ' + tone(result.roi)}><div className="kpi-label">Całkowity ROI <Target size={17} /></div><strong data-testid="roi-total">{percent(result.roi)}{result.roi > 0 && <ArrowUpRight size={28} />}</strong><span>Ważony przydzielonym budżetem</span></article>
        </section>
        <section className={'allocation-status ' + (result.overBudget ? 'over' : result.share < 100 - 1e-8 ? 'partial' : 'complete')} role="status"><div>{result.overBudget ? <CircleHelp size={17} /> : result.share < 100 - 1e-8 ? <Wallet size={17} /> : <Check size={17} />}<span>{result.overBudget ? <>Budżet przekroczony o <strong>{money(-result.remaining)}</strong>. Zmniejsz udziały kategorii.</> : result.share < 100 - 1e-8 ? <>Pozostało do rozdysponowania <strong>{money(result.remaining)}</strong>.</> : <><strong>Budżet w pełni rozdysponowany.</strong> Każda złotówka ma swoje miejsce.</>}</span></div><span className="allocation-percent">{percent(result.share)} / 100%</span></section>
        <div className="dashboard-grid">
          <section className="card categories-card" aria-labelledby="categories-heading"><div className="card-heading"><div><h2 id="categories-heading">Twój marketing, kanał po kanale</h2><p>Edytuj udziały i ROI, aby znaleźć najlepszy podział.</p></div><span className="count-badge">{plan.categories.length} kategorii</span></div>
            <div className="table-scroll"><table><thead><tr><th scope="col">Kategoria</th><th scope="col">Budżet (%)</th><th scope="col">Kwota (PLN)</th><th scope="col">ROI (%)</th><th scope="col">Zysk (PLN)</th><th scope="col"><span className="sr-only">Usuń</span></th></tr></thead><tbody>{result.rows.map(c => <tr key={c.id}><td><div className="category-name"><span className="category-dot" style={{ background: c.color }} /><input ref={el => { if (el) nameRefs.current.set(c.id, el); else nameRefs.current.delete(c.id) }} aria-label={`Nazwa kategorii ${c.name || 'bez nazwy'}`} value={c.name} placeholder="Nazwa kategorii" onChange={e => update(c.id, 'name', e.target.value)} /></div></td><td><input className="number-input" aria-label={`Budżet (%) — ${c.name || 'bez nazwy'}`} type="number" min="0" step="any" inputMode="decimal" value={c.share} onChange={e => update(c.id, 'share', e.target.value)} /></td><td className="amount">{money(c.investment)}</td><td><input className={'number-input roi-input ' + tone(numeric(c.roi))} aria-label={`ROI (%) — ${c.name || 'bez nazwy'}`} type="number" min="-100" step="any" inputMode="decimal" value={c.roi} onChange={e => update(c.id, 'roi', e.target.value)} /></td><td className={'amount profit-amount ' + tone(c.profit)}>{money(c.profit)}</td><td><button className="icon-button delete-button" title="Usuń kategorię" aria-label={`Usuń kategorię ${c.name || 'bez nazwy'}`} onClick={() => setPlan(p => ({ ...p, categories: p.categories.filter(row => row.id !== c.id) }))}><Trash2 size={15} /></button></td></tr>)}</tbody><tfoot><tr><th scope="row">Łącznie</th><td className={result.overBudget ? 'negative' : ''}>{percent(result.share)}</td><td>{money(result.allocated)}</td><td className={tone(result.roi)}>{percent(result.roi)}</td><td className={tone(result.profit)}>{money(result.profit)}</td><td /></tr></tfoot></table></div>
            {plan.categories.length === 0 && <p className="empty-table">Zacznij od dodania pierwszego kanału marketingowego.</p>}
            <div className="table-bottom"><button className="add-button" onClick={addCategory}><Plus size={17} /> Dodaj kategorię</button><span>Zmiany przeliczają się na bieżąco</span></div>
          </section>
          <div className="charts-column"><section className="card structure-card" aria-labelledby="structure-heading"><div className="card-heading"><div><h2 id="structure-heading">Struktura budżetu</h2><p>Gdzie inwestujesz swoje środki?</p></div><ChartIcon size={19} className="muted" /></div><div className="donut-wrapper" role="img" aria-label={`Struktura budżetu: ${pieData.map(c => `${c.name}: ${money(c.value)}`).join(', ') || 'Brak przydzielonego budżetu'}`}><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={pieData} dataKey="value" innerRadius={72} outerRadius={97} paddingAngle={pieData.length > 1 ? 3 : 0} stroke="none" isAnimationActive={false}>{pieData.map((c, i) => <Cell key={i} fill={c.color} />)}</Pie><Tooltip formatter={value => money(Number(value))} /></PieChart></ResponsiveContainer><div className="donut-center"><span>{result.overBudget ? 'Przydzielono' : 'Wykorzystano'}</span><strong>{percent(result.share)}</strong><small>budżetu</small></div></div><div className="chart-legend">{pieData.length ? pieData.map((c, i) => <div key={i}><span className="legend-name"><i style={{ background: c.color }} />{c.name}</span><strong>{percent(result.budget > 0 ? c.value / result.budget * 100 : 0)}</strong></div>) : <p className="muted">Dodaj budżet i udziały, aby zobaczyć wykres.</p>}</div>{result.overBudget && <p className="chart-warning">Wykres przedstawia proporcje przydzielonych środków. Ich suma przekracza budżet roczny.</p>}</section>
          <section className="insight-card"><span className="insight-icon"><TrendingUp size={20} /></span><div><h3>Każdy kanał ma znaczenie</h3><p>ROI całego planu to średnia ważona. Większy budżet kanału oznacza większy wpływ na wynik.</p></div></section></div>
        </div>
        <section className="card profit-card" aria-labelledby="profit-heading"><div className="card-heading"><div><h2 id="profit-heading">Potencjał Twoich kanałów</h2><p>Porównaj prognozowane wyniki finansowe każdej inwestycji.</p></div><div className="chart-tabs" aria-label="Rodzaj wyniku"><button aria-pressed={chartView === 'profit'} className={chartView === 'profit' ? 'selected' : ''} onClick={() => setChartView('profit')}>Zysk / strata</button><button aria-pressed={chartView === 'returns'} className={chartView === 'returns' ? 'selected' : ''} onClick={() => setChartView('returns')}>Zwrot brutto</button></div></div><div className="bar-chart-scroll"><div className="bar-chart" style={{ minWidth: Math.max(560, plan.categories.length * 88) }} role="img" aria-label={profitData.map(c => `${c.name}: ${money(c.value)}`).join(', ') || 'Brak kategorii'}><ResponsiveContainer width="100%" height={270}><BarChart data={profitData} margin={{ top: 15, right: 20, bottom: 25, left: 10 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9edf2" /><XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 10, fill: '#778193' }} tickFormatter={name => name.length > 17 ? name.slice(0, 16) + '…' : name} dy={12} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#778193' }} tickFormatter={value => new Intl.NumberFormat('pl-PL', { notation: 'compact' }).format(value) + ' zł'} /><ReferenceLine y={0} stroke="#c9d0dc" /><Tooltip cursor={{ fill: '#f5f6fa' }} formatter={value => [money(Number(value)), chartView === 'profit' ? 'Zysk / strata' : 'Zwrot brutto']} /><Bar dataKey="value" maxBarSize={44} radius={[5, 5, 0, 0]} isAnimationActive={false}>{profitData.map((c, i) => <Cell key={i} fill={c.value < 0 ? '#d87174' : c.color} />)}</Bar></BarChart></ResponsiveContainer></div></div><div className="chart-footnote"><BarChart3 size={14} /> Prognozy na podstawie wprowadzonego ROI. Zwrot brutto = inwestycja + zysk.</div></section>
        <footer className="page-footer"><span>Marketing Budget & ROI Planner</span><span>Dobry marketing zaczyna się od dobrego planu.</span></footer>
      </div>
    </main>
    <div className="toast-region" role="status" aria-live="polite">{notice && <div className="toast"><Check size={17} />{notice}<button className="icon-button" aria-label="Zamknij komunikat" onClick={() => setNotice('')}><X size={16} /></button></div>}</div>
    {storageError && <div className="storage-warning" role="alert">Nie można zapisać planu w przeglądarce. Eksportuj CSV, aby zachować wyniki.</div>}
    <dialog ref={resetRef} onCancel={() => setResetOpen(false)} onClose={() => setResetOpen(false)}><div className="dialog-icon"><RotateCcw size={24} /></div><h2>Resetować cały plan?</h2><p>Twoje zmiany zostaną usunięte. Przywrócimy budżet 100 000 zł i przykładowy podział z ROI 42%.</p><div className="dialog-actions"><button className="button secondary" onClick={() => setResetOpen(false)} autoFocus>Anuluj</button><button className="button primary" onClick={() => { setPlan(defaultPlan()); setResetOpen(false); setNotice('Przywrócono przykładowy plan.') }}>Resetuj plan</button></div></dialog>
    <dialog ref={helpRef} onCancel={() => setHelpOpen(false)} onClose={() => setHelpOpen(false)} className="help-dialog"><div className="dialog-icon"><Target size={24} /></div><h2>Od budżetu do świadomej decyzji</h2><p>Wpisz roczny budżet, podziel go procentowo między kanały i określ oczekiwany ROI. Wszystkie wyniki aktualizują się na bieżąco.</p><dl><dt>Inwestycja</dt><dd>Budżet roczny × udział kategorii / 100</dd><dt>Zysk lub strata</dt><dd>Inwestycja × ROI / 100</dd><dt>Zwrot brutto</dt><dd>Inwestycja + zysk</dd><dt>ROI całego planu</dt><dd>Suma zysków / suma inwestycji × 100</dd></dl><p>ROI 0% oznacza próg rentowności, a −100% utratę całej inwestycji. Przy braku inwestycji pokazujemy 0%.</p><p>To model Twoich założeń, a nie automatyczna prognoza. ROI powinien uwzględniać koszty związane ze sprzedażą, a nie sam przychód. Model nie uwzględnia sezonowości, nakładania się kanałów ani opóźnień zwrotu.</p><button className="button primary" onClick={() => setHelpOpen(false)} autoFocus>Rozumiem</button></dialog>
  </div>
}
