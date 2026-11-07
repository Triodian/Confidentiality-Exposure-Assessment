// Every screen loads without script errors, in the worked example and in a saved assessment.
import { test, expect } from '@playwright/test';
import { pageAs, U, api } from '../helpers.js';

const SCREENS = ['overview', 'actions', 'setup', 'profile', 'register', 'classify', 'counsel', 'findings', 'review', 'outputs', 'reference'];

test('worked example: every screen and every output opens without errors', async ({ browser }) => {
  const page = await pageAs(browser, U.assessor);
  if (await page.locator('.entry [data-act="example"]').count()) await page.click('.entry [data-act="example"]');
  else { await page.click('header [data-act="drawer"]'); await page.click('.drawer [data-act="example"]'); }
  for (const s of SCREENS) { await page.evaluate(s => window.CEAApp.go(s), s); await page.waitForTimeout(150); }
  // the channel editor, every tab
  await page.evaluate(() => { window.CEA.UI.channelId = null; window.CEAApp.go('register'); });
  await page.click('[data-act="openChannel"][data-id="CH-01"]');
  for (const t of ['facts', 'classify', 'evidence', 'counsel', 'finding']) { await page.click(`#etab-${t}`); await page.waitForTimeout(80); }
  // every classify step, for several people
  for (const who of ['p5', 'p6', 'p3']) { await page.selectOption('#who-hdr', who); for (let k = 1; k <= 5; k++) { await page.evaluate(k => { window.CEA.UI.step = k; window.CEAApp.go('classify'); }, k); await page.waitForTimeout(60); } }
  await page.selectOption('#who-hdr', 'p5');
  await page.evaluate(() => window.CEAApp.go('outputs'));
  const n = await page.locator('.outrow').count();
  expect(n).toBe(9);
  for (let i = 0; i < n; i++) { await page.locator('.outrow').nth(i).click(); await expect(page.locator('#out-back')).toBeVisible(); await page.click('#out-back'); }
  const gates = await page.evaluate(() => window.CEAApp.gates().map(g => g.ok));
  expect(gates.slice(0, 3)).toEqual([true, true, true]);
  expect(page._errors).toEqual([]);
});

test('the method owner starts the assessment; everyone can open every screen', async ({ browser }) => {
  const mo = await pageAs(browser, U.mo);
  if (!(await api('GET', '/api/engagement', undefined, U.mo)).body.exists) {
    await mo.click('[data-act="new"]');
    await expect(mo.locator('#savechip')).toHaveText(/Saved/, { timeout: 10_000 });
  }
  const e = await api('GET', '/api/engagement', undefined, U.mo);
  expect(e.body.exists).toBe(true);
  for (const who of Object.values(U)) {
    const p = await pageAs(browser, who, '/#overview');
    for (const s of SCREENS) { await p.evaluate(s => window.CEAApp.go(s), s); await p.waitForTimeout(80); }
    expect(p._errors, who).toEqual([]);
    await p.context().close();
  }
});

test('admin, profile and user guide pages load', async ({ browser }) => {
  for (const path of ['/admin/', '/admin/#activity', '/admin/#notifications', '/profile/', '/user-guide/']) {
    const p = await pageAs(browser, 'damian.hickey@triodian.com', path);
    expect(p._errors, path).toEqual([]);
    await p.context().close();
  }
});
