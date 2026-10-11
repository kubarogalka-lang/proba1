export interface Category { id: string; name: string; share: string; roi: string; color: string }
export interface Plan { budget: string; categories: Category[] }
export const STORAGE_KEY = 'marketing-roi-plan-v1'
export const COLORS = ['#5b59dc', '#39a799', '#699de2', '#edb667', '#cf81a3', '#96a263', '#9271c2', '#69b9c3', '#db8b63', '#98a2b3']
const names = ['Social Media', 'Strona WWW / SEO', 'Google Ads', 'Radio', 'Prasa', 'Outdoor / Billboardy', 'Eventy i targi', 'E-mail marketing', 'Influencer marketing', 'Inne']
export function defaultPlan(): Plan {
  return { budget: '100000', categories: names.map((name, i) => ({ id: `default-${i}`, name, share: ['50', '30', '0', '20'][i] ?? '0', roi: ['40', '80', '0', '-10'][i] ?? '0', color: COLORS[i] })) }
}
export function numeric(value: string) { const n = Number(value); return Number.isFinite(n) ? n : 0 }
export function calculate(plan: Plan) {
  const budget = Math.max(0, numeric(plan.budget))
  const rows = plan.categories.map(c => {
    const share = Math.max(0, numeric(c.share))
    const investment = budget * share / 100
    const profit = investment * Math.max(-100, numeric(c.roi)) / 100
    return { ...c, shareValue: share, investment, profit, returns: investment + profit }
  })
  const share = rows.reduce((s, c) => s + c.shareValue, 0)
  const allocated = rows.reduce((s, c) => s + c.investment, 0)
  const profit = rows.reduce((s, c) => s + c.profit, 0)
  return { budget, rows, share, allocated, remaining: budget - allocated, profit, returns: allocated + profit, roi: allocated > 0 ? profit / allocated * 100 : 0, overBudget: share > 100 + 1e-8 }
}
export const money = (value: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 }).format(value)
export const percent = (value: number) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value) + '%'
export function parsePlan(raw: string | null): Plan | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    const validNumber = (v: unknown, min: number) => typeof v === 'string' && (v === '' || (Number.isFinite(Number(v)) && Number(v) >= min))
    if (!p || !validNumber(p.budget, 0) || !Array.isArray(p.categories)) return null
    const ids = new Set<string>()
    for (const c of p.categories) {
      if (!c || typeof c.id !== 'string' || ids.has(c.id) || typeof c.name !== 'string' || !validNumber(c.share, 0) || !validNumber(c.roi, -100) || typeof c.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.color)) return null
      ids.add(c.id)
    }
    return { budget: p.budget, categories: p.categories }
  } catch { return null }
}
function csvCell(value: string | number) {
  let text = String(value)
  if (typeof value === 'string' && !/^-?\d+(,\d+)?$/.test(text) && /^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}
export function exportCsv(plan: Plan) {
  const result = calculate(plan)
  const decimal = (n: number) => n.toFixed(2).replace('.', ',')
  const rows: (string | number)[][] = [
    ['Kategoria', 'Budżet (%)', 'Inwestycja (PLN)', 'ROI (%)', 'Zysk (PLN)', 'Zwrot brutto (PLN)'],
    ...result.rows.map(c => [c.name, decimal(c.shareValue), decimal(c.investment), decimal(numeric(c.roi)), decimal(c.profit), decimal(c.returns)]),
    [], ['Podsumowanie', 'Wartość'], ['Budżet roczny (PLN)', decimal(result.budget)],
    ['Przydzielony budżet (PLN)', decimal(result.allocated)], ['Pozostało (PLN)', decimal(result.remaining)],
    ['Prognozowany zysk (PLN)', decimal(result.profit)], ['Zwrot brutto (PLN)', decimal(result.returns)],
    ['Całkowity ROI (%)', decimal(result.roi)], ['Status planu', result.overBudget ? 'Przekroczony budżet' : 'Poprawny']
  ]
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n')
}
