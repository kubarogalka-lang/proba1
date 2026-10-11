import { test } from 'node:test'
import assert from 'node:assert/strict'
import '../model.js'
const { calculate, defaultPlan, exportCsv, parsePlan } = globalThis.PlannerModel

test('PRD example: weighted ROI, profit and gross return', () => {
  const r = calculate(defaultPlan())
  assert.equal(r.allocated, 100000)
  assert.equal(r.profit, 42000)
  assert.equal(r.returns, 142000)
  assert.equal(r.roi, 42)
  assert.equal(r.rows[3].profit, -2000)
})
test('ROI is weighted by invested capital, including partially allocated plans', () => {
  const p = defaultPlan()
  p.categories = p.categories.slice(0, 2)
  const r = calculate(p)
  assert.equal(r.allocated, 80000)
  assert.equal(r.remaining, 20000)
  assert.ok(Math.abs(r.roi - 55) < 1e-10)
})
test('over-allocation retains shares and exposes negative remainder', () => {
  const p = defaultPlan(); p.categories[0].share = '70'
  const r = calculate(p)
  assert.equal(r.share, 120)
  assert.equal(r.remaining, -20000)
  assert.equal(r.overBudget, true)
  assert.equal(p.categories[0].share, '70')
})
test('empty inputs, no categories and zero investment never divide by zero', () => {
  const p = defaultPlan(); p.budget = ''; p.categories[0].share = ''; p.categories[0].roi = ''
  assert.equal(calculate(p).roi, 0)
  assert.equal(calculate({ budget: '100', categories: [] }).remaining, 100)
  assert.equal(calculate({ budget: '100', categories: [] }).returns, 0)
})
test('loss of all capital and positive ROI above 100% are supported', () => {
  const p = defaultPlan(); p.categories = p.categories.slice(0, 1); p.categories[0].share = '100'; p.categories[0].roi = '-100'
  assert.equal(calculate(p).returns, 0)
  p.categories[0].roi = '250'
  assert.equal(calculate(p).profit, 250000)
})
test('intermediate calculations retain fractional precision', () => {
  const p = defaultPlan(); p.budget = '123.45'; p.categories = p.categories.slice(0, 1); p.categories[0].share = '33.3333'; p.categories[0].roi = '12.3456'
  const r = calculate(p)
  assert.equal(r.rows[0].investment, 123.45 * 33.3333 / 100)
  assert.equal(r.profit, 123.45 * 33.3333 / 100 * 12.3456 / 100)
})
test('storage accepts valid empty categories, rejects corrupt and invalid state', () => {
  const p = defaultPlan(); p.categories[0].name = ''
  assert.deepEqual(parsePlan(JSON.stringify(p)), p)
  for (const raw of ['bad', '{}', '{"budget":"Infinity","categories":[]}', JSON.stringify({ ...p, budget: '-1' })]) assert.equal(parsePlan(raw), null)
  p.categories[0].roi = '-101'; assert.equal(parsePlan(JSON.stringify(p)), null)
})
test('CSV contains UTF-8 BOM, all results and escapes formulas, delimiters and quotes', () => {
  const p = defaultPlan(); p.categories[0].name = '=SUM(1;2) "kanał"'
  const csv = exportCsv(p)
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('"\'=SUM(1;2) ""kanał"""'))
  assert.ok(csv.includes('"Całkowity ROI (%)";"42,00"'))
  assert.ok(csv.includes('"Zwrot brutto (PLN)";"142000,00"'))
  assert.ok(csv.includes('"-2000,00"'))
})
