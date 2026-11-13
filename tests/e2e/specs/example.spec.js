// The app opens in the worked example, with the band to leave it; once left, a reload stays out.
// The same test is in every Triodian app that has a worked example.
import { test, expect } from '@playwright/test';
import { ADMIN } from '../helpers.js';

test('opens in the worked example; leaving it is remembered for the session', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('dialog', d => d.accept());
  await page.goto('/');
  const band = page.locator('.examplenote', { hasText: 'Worked example:' });
  await expect(band).toBeVisible({ timeout: 15_000 });
  await expect(band).toContainText('for practice only. Nothing is saved.');
  await band.getByRole('button', { name: 'Leave the worked example' }).click();
  await expect(band).toHaveCount(0);
  await page.reload(); await page.waitForTimeout(1500);
  await expect(page.locator('.examplenote', { hasText: 'Worked example:' })).toHaveCount(0);
  // It opens again from the menu or, with no engagement yet, the start screen, with the same wording in every app.
  const menu = await page.locator('header [data-act="drawer"]').count();
  if (menu) await page.click('header [data-act="drawer"]');
  await page.locator((menu ? '.drawer ' : '') + '[data-act="example"]', { hasText: 'Open the worked example' }).first().click();
  await expect(page.locator('.examplenote', { hasText: 'Worked example:' })).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

// The worked example is Harrow Valley Foods, the company in the AI Board Direction worked example, buying a supplier.
// The board's position it loads is the file that example issues (kept here as a fixture, made from it).
test('the worked example is Harrow Valley Foods, with the position its board resolved; a sector link from Start opens it', async ({ browser }) => {
  const { readFileSync } = await import('node:fs');
  const issued = JSON.parse(readFileSync(new URL('../fixtures/harrow-position.json', import.meta.url), 'utf8'));
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto('/?other=1&example=unregulated');
  await expect(p.locator('.examplenote', { hasText: 'Harrow Valley Foods' }).first()).toBeVisible({ timeout: 15_000 });
  await expect(p).toHaveURL(/\/\?other=1(#.*)?$/);                 // only its own parameter is removed
  const s = await p.evaluate(() => { const S = window.CEAApp.state; return { company: S.engagement.company, pos: S.boardPosition, people: S.people.map(x => x.name), code: S.profile.codeName, broken: window.CEAApp.broken().length, hits: window.CEAApp.hits().length,
    text: JSON.stringify(S), channels: S.channels.length, findings: S.channels.map(c => { try { const f = window.CEAApp.finding(c.id); return f.type || f.label || ''; } catch (e) { return 'ERR ' + e; } }) }; });
  expect(s.company).toBe('Harrow Valley Foods (fictional)');
  expect(s.pos.markings).toEqual(issued.markings);                 // the marks Board Direction's example issues
  expect(s.pos.conditions).toEqual(issued.conditions);
  expect(s.pos.resolvedOn).toBe('2026-12-02'); expect(s.pos.status).toBe('resolved');
  expect(s.people).toEqual(expect.arrayContaining(['Jess Carter', 'Nikhil Rao']));   // the GC and head of technology in that example
  expect(s.text).not.toMatch(/Marrowgate|Kestrel|Harrow & Finch|Quillon|Helen Brandt|Priya Natarajan|Lena Hartmann|2026-1[01]-/);
  expect(s.broken).toBe(0);
  expect(s.findings.filter(f => /^ERR/.test(f))).toEqual([]);
  expect(s.findings).toEqual(['F1', 'F2', 'F1', 'F2', 'F1', 'F1', 'F4', 'F2', 'Considered, absent']);   // every channel has its finding
  // the board does not permit board and transaction information in a sanctioned chatbot, so containment is suggested
  await p.selectOption('#who-hdr', 'p4');
  await p.evaluate(() => window.CEAApp.go('profile'));
  await expect(p.locator('#positionCard')).toContainText(/resolved by the board 2 December 2026/i);
  await p.evaluate(() => { window.CEA.UI.channelId = null; window.CEAApp.go('register'); });
  await p.click('[data-act="openChannel"][data-id="CH-02"]');
  await p.click('#etab-counsel');
  await expect(p.locator('#suggest-CH-02')).toContainText('marked N (not permitted)');
  await expect(p.locator('#suggest-CH-02')).toContainText('Suggested required rung: N5');
  for (const scr of ['overview', 'profile', 'register', 'counsel', 'findings', 'outputs']) expect(await p.evaluate(x => { try { window.CEAApp.go(x); return true; } catch (e) { return String(e); } }, scr)).toBe(true);
  expect(errs).toEqual([]);
  await ctx.close();
});

// From Start, the visitor is the shared demo account, which has no access to this app. The example link still opens the
// example: nothing in it is saved. Without the link, someone without access sees the no-access note and can open it by hand.
test('a sector link from Start opens the example for a visitor without access to the app', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': 'visitor@cea.test' }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto('/?example=unregulated');
  await expect(p.locator('.examplenote', { hasText: 'Harrow Valley Foods' }).first()).toBeVisible({ timeout: 15_000 });
  await expect(p).toHaveURL(/\/(#.*)?$/);
  await p.locator('.examplenote').getByRole('button', { name: 'Leave the worked example' }).click();
  await expect(p.locator('#app')).toContainText("You don't have access yet");
  await p.goto('/'); await p.waitForTimeout(1200);
  await expect(p.locator('.examplenote', { hasText: 'Worked example:' })).toHaveCount(0);   // no link: the note, not the example
  await expect(p.locator('#app')).toContainText("You don't have access yet");
  expect(errs).toEqual([]);
  await ctx.close();
});
