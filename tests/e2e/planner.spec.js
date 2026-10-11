import { test, expect } from '@playwright/test'

test('edits update all results, charts and persisted plan; export and confirmed reset work', async ({ page }) => {
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByTestId('roi-total')).toHaveText('42%')
  await expect(page.getByTestId('profit-total')).toContainText('42')
  await page.getByLabel('Budżet (%) — Social Media', { exact: true }).fill('70')
  await expect(page.getByRole('status').filter({ hasText: 'Budżet przekroczony' })).toBeVisible()
  await expect(page.getByTestId('allocated-total')).toContainText('120')
  await page.getByLabel('ROI (%) — Social Media', { exact: true }).fill('100')
  await expect(page.getByTestId('roi-total')).toHaveText('76,67%')
  await expect(page.getByRole('img').first()).toHaveAttribute('aria-label', /Social Media.*70/)
  await page.reload()
  await expect(page.getByLabel('Budżet (%) — Social Media', { exact: true })).toHaveValue('70')
  await expect(page.getByTestId('roi-total')).toHaveText('76,67%')
  await page.getByRole('button', { name: 'Dodaj kategorię', exact: true }).click()
  const newName = page.getByLabel('Nazwa kategorii bez nazwy')
  await expect(newName).toBeFocused()
  await newName.fill('Podcast')
  await page.getByLabel('Budżet (%) — Podcast', { exact: true }).fill('5')
  await page.getByLabel('ROI (%) — Podcast', { exact: true }).fill('250')
  await page.getByRole('button', { name: 'Usuń kategorię Podcast', exact: true }).click()
  await expect(page.getByLabel('Nazwa kategorii Podcast')).toHaveCount(0)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Eksportuj CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('plan-marketingowy.csv')
  const path = await download.path()
  const { readFile } = await import('node:fs/promises')
  const csv = await readFile(path, 'utf8')
  expect(csv).toContain('"Całkowity ROI (%)";"76,67"')
  await page.getByRole('button', { name: 'Resetuj', exact: true }).click()
  await page.getByRole('button', { name: 'Anuluj' }).click()
  await expect(page.getByTestId('roi-total')).toHaveText('76,67%')
  await page.getByRole('button', { name: 'Resetuj', exact: true }).click()
  await page.getByRole('button', { name: 'Resetuj plan', exact: true }).click()
  await expect(page.getByTestId('roi-total')).toHaveText('42%')
  await page.getByLabel('Budżet roczny', { exact: true }).fill('200000')
  await expect(page.getByTestId('profit-total')).toContainText('84')
  await page.getByLabel('Budżet roczny', { exact: true }).fill('')
  await expect(page.getByText('Wpisz budżet większy od zera.')).toBeVisible()
  await expect(page.getByTestId('roi-total')).toHaveText('0%')
  await expect(page.getByRole('button', { name: 'Eksportuj CSV' })).toBeDisabled()
  expect(errors).toEqual([])
})
test('supports partial allocations, losses, limits, empty names and keyboard-accessible help', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Budżet (%) — Social Media', { exact: true }).fill('0')
  await expect(page.getByRole('status').filter({ hasText: 'Pozostało' })).toContainText('50')
  await page.getByLabel('ROI (%) — Strona WWW / SEO', { exact: true }).fill('-100')
  await expect(page.getByTestId('roi-total')).toHaveText('-64%')
  await page.getByLabel('ROI (%) — Strona WWW / SEO', { exact: true }).fill('-101')
  await expect(page.getByLabel('ROI (%) — Strona WWW / SEO', { exact: true })).toHaveValue('-100')
  await page.getByLabel('Nazwa kategorii Social Media', { exact: true }).fill('')
  await expect(page.getByLabel('Nazwa kategorii bez nazwy')).toBeVisible()
  await page.getByRole('button', { name: 'Jak działa planer?' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
test('mobile page fits viewport while the financial table remains scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }))
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport)
  await page.getByRole('button', { name: 'Dodaj kategorię', exact: true }).click()
  await expect(page.getByLabel('Nazwa kategorii bez nazwy')).toBeFocused()
  await page.screenshot({ path: '/tmp/planner-mobile.png', fullPage: true })
})
test('corrupt saved data recovers to the default plan', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('marketing-roi-plan-v1', '{invalid'))
  await page.goto('/')
  await expect(page.getByTestId('roi-total')).toHaveText('42%')
})

test('works offline with just the three local app files and no external resources', async ({ page }) => {
  const { readFile } = await import('node:fs/promises');
  const files = new Map([
    ['/', ['index.html', 'text/html']],
    ['/model.js', ['model.js', 'text/javascript']],
    ['/app.js', ['app.js', 'text/javascript']],
  ]);
  const errors = [];
  const unexpectedRequests = [];
  page.on('pageerror', e => errors.push(e.message));
  // Serve only local files through the test harness, with the network offline.
  await page.route('**/*', async route => {
    const file = files.get(new URL(route.request().url()).pathname);
    if (!file) { unexpectedRequests.push(route.request().url()); await route.abort(); return; }
    await route.fulfill({ body: await readFile(file[0]), contentType: file[1] });
  });
  await page.context().setOffline(true);
  await page.goto('/');
  await expect(page.getByTestId('roi-total')).toHaveText('42%');
  await page.getByLabel('Budżet roczny', { exact: true }).fill('200000');
  await expect(page.getByTestId('profit-total')).toContainText('84');
  await page.getByRole('button', { name: 'Dodaj kategorię', exact: true }).click();
  await expect(page.getByLabel('Nazwa kategorii bez nazwy')).toBeFocused();
  expect(unexpectedRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('shows real SVG losses and gross returns, and supports removing every category', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#bar-svg rect[data-value="-2000"]')).toHaveAttribute('fill', '#d87174');
  await expect(page.locator('#donut-chart circle')).toHaveCount(4);
  await page.getByRole('button', { name: 'Zwrot brutto', exact: true }).click();
  await expect(page.locator('#bar-svg rect[data-value="70000"]')).toHaveCount(1);
  await expect(page.locator('#bar-svg rect[data-value="18000"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Zwrot brutto', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const deleteButtons = page.getByRole('button', { name: /^Usuń kategorię/ });
  while (await deleteButtons.count()) await deleteButtons.first().click();
  await expect(page.getByTestId('roi-total')).toHaveText('0%');
  await expect(page.getByText('Zacznij od dodania pierwszego kanału marketingowego.')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Pozostało' })).toContainText('100');
  await page.getByRole('button', { name: 'Dodaj kategorię', exact: true }).click();
  const name = page.getByLabel('Nazwa kategorii bez nazwy');
  await name.pressSequentially('<img src=x onerror=alert(1)>');
  await expect(page.getByLabel('Nazwa kategorii <img src=x onerror=alert(1)>', { exact: true })).toHaveValue('<img src=x onerror=alert(1)>');
  await page.getByLabel('Budżet (%) — <img src=x onerror=alert(1)>', { exact: true }).fill('50');
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.getByTestId('allocated-total')).toContainText('50');
});

test('local storage failure is reported while calculation and export still work', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Disabled storage', 'QuotaExceededError'); };
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Nie można zapisać planu');
  await expect(page.getByText('Zapis niedostępny', { exact: true })).toBeVisible();
  await page.getByLabel('Budżet roczny', { exact: true }).fill('200000');
  await expect(page.getByTestId('profit-total')).toContainText('84');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportuj CSV' }).click();
  expect((await download).suggestedFilename()).toBe('plan-marketingowy.csv');
});

test('restores an existing plan from the React version without changing its data', async ({ page }) => {
  const saved = {
    budget: '123456',
    categories: [
      { id: 'existing-1', name: 'Mój kanał', share: '75', roi: '60', color: '#5b59dc' },
      { id: 'existing-2', name: 'Kampania', share: '25', roi: '-20', color: '#39a799' },
    ],
  };
  await page.addInitScript(plan => localStorage.setItem('marketing-roi-plan-v1', JSON.stringify(plan)), saved);
  await page.goto('/');
  await expect(page.getByLabel('Budżet roczny', { exact: true })).toHaveValue('123456');
  await expect(page.getByTestId('roi-total')).toHaveText('40%');
  await expect(page.getByLabel('Budżet (%) — Mój kanał', { exact: true })).toHaveValue('75');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('marketing-roi-plan-v1')))).toEqual(saved);
});
