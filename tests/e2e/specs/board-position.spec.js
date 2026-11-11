// The board's confidentiality position (development plan task 2.8), in the worked example: the profile shows the
// board's marks for the matter's class; each channel's Counsel tab shows a suggested required rung, "from the board's
// position, counsel to confirm"; field 24 stays empty until counsel answers. A file that is not a position is refused.
import { test, expect } from '@playwright/test';
import { ADMIN } from '../helpers.js';

test('the board’s position suggests a required rung on each channel; only counsel sets it', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto('/');
  await expect(p.locator('.examplenote', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  await p.selectOption('#who-hdr', 'p4');   // the method owner
  await p.evaluate(() => window.CEAApp.go('profile'));
  const card = p.locator('#positionCard');
  await expect(card).toContainText(/resolved by the board/i);
  await expect(card).toContainText('G6 Board and transaction');
  await expect(card).toContainText('Enterprise tools only where the assistant’s scope excludes');

  // a file that is not a position is refused with the reason
  await p.locator('[data-act="togglePosPaste"]').click();
  await p.fill('#pos_paste', '{"briefFormat":"triodian.matterBrief/1"}');
  await p.locator('[data-act="pastePosition"]').click();
  await expect(card).toContainText('This is a matter brief from the AI Obligations Atlas');

  // each channel: a suggestion beside field 24, which is not filled by it
  const ids = await p.evaluate(() => window.CEA.S.channels.filter(c => c.fields && c.fields[2]).map(c => ({ id: c.id, kind: c.fields[2].value, f24: !!(c.fields[24] && c.fields[24].value) })));
  const pick = ids.find(c => !c.f24) || ids[0];
  await p.evaluate(() => { window.CEA.UI.channelId = null; window.CEAApp.go('register'); });
  await p.click(`[data-act="openChannel"][data-id="${pick.id}"]`);
  await p.click('#etab-counsel');
  const sg = p.locator(`#suggest-${pick.id}`);
  await expect(sg).toContainText('From the board’s position, counsel to confirm');
  if (pick.kind === 'K6') await expect(sg).toContainText('no column for data-room');
  else await expect(sg).toContainText(/Suggested required rung: N\d|marked [PCN] \(|unmarked/);
  if (!pick.f24) await expect(p.locator('main')).toContainText(/awaiting counsel/i);

  // a tender is G3: the suggestion follows the matter type
  await p.evaluate(() => window.CEAApp.go('profile'));
  await p.selectOption('#f_profile_matterType', 'tender');
  await expect(card).toContainText('G3 Commercial in confidence');
  expect(errs).toEqual([]);
  await ctx.close();
});
