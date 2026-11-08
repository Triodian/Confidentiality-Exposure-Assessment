// Matter types (development plan task 2.7), tried in the worked example: the deal profile reads as it always has;
// choosing another type changes the profile's wording, its stages and adviser types, and the information classes.
import { test, expect } from '@playwright/test';
import { ADMIN } from '../helpers.js';

test('each matter type renders its own profile questions; the deal type reads as before', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto('/');
  await expect(p.locator('.examplebar', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  await p.selectOption('#who-hdr', 'p4');   // the method owner in the example
  await p.locator('nav.steps [data-act="go"][data-to="profile"]').first().click();
  const main = p.locator('main');

  // the worked example is a deal, and reads as it did before matter types
  await expect(p.locator('#f_profile_matterType')).toHaveValue('deal');
  await expect(main).toContainText('The deal profile');
  await expect(main).toContainText('Deal code name (P1, chosen by counsel)');
  await expect(main).toContainText('Deal team size and insider list size (P3, counts by role)');
  await expect(main).toContainText('P4 · Deal folders');
  await expect(p.locator('#f_profile_stage')).toHaveValue('diligence');

  // litigation: its own wording and stages; the deal stage it does not have is cleared
  await p.selectOption('#f_profile_matterType', 'litigation');
  await expect(main).toContainText('The dispute profile');
  await expect(main).toContainText('Matter code name (P1, chosen by counsel)');
  await expect(main).toContainText('Stage of the dispute (P2)');
  await expect(main).toContainText('P4 · Matter folders');
  await expect(p.locator('#f_profile_stage')).toHaveValue('');
  await expect(p.locator('#f_profile_stage option')).toHaveText(['—', 'Before proceedings', 'Pleadings and discovery', 'Evidence and hearing', 'Judgment, appeal or settlement within 90 days']);
  await expect(p.locator('[data-path="profile.advisers.0.type"] option')).toContainText(['Barrister', 'Expert witness']);
  await expect(main).toContainText('Role in the dispute');

  // every other type renders its own P1 and P4
  for (const [id, p1, p4] of [['rdIp', 'Programme code name', 'Programme folders and repositories'], ['tender', 'Bid code name', 'Bid folders'], ['boardPapers', 'Matter code name', 'Board folders'], ['exportControlled', 'Project code name', 'Controlled data folders']]) {
    await p.selectOption('#f_profile_matterType', id);
    await expect(main).toContainText(`${p1} (P1, chosen by counsel)`);
    await expect(main).toContainText(`P4 · ${p4}`);
  }

  // the information classes on the reference screen follow the type
  await p.selectOption('#f_profile_matterType', 'boardPapers');
  await p.evaluate(() => { const b = document.querySelector('[data-act="go"][data-to="reference"]'); if (b) b.click(); });
  await expect(p.locator('main')).toContainText('Board deliberations and resolutions');

  // back to a deal: as before
  await p.locator('nav.steps [data-act="go"][data-to="profile"]').first().click();
  await p.selectOption('#f_profile_matterType', 'deal');
  await expect(main).toContainText('Deal code name (P1, chosen by counsel)');
  expect(errs).toEqual([]);
  await ctx.close();
});
