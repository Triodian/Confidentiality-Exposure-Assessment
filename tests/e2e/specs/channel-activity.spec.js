// AI activity by tool (development plan task 6.6), in the worked example: a summary made by Triodian integrations from
// a Purview or Harmonic Security export loads on the profile; a channel whose tool it names shows the counts on its
// Facts tab; a tool not in the register can be added as a channel with its facts carried, to confirm. A file that is
// not a summary is refused.
import { test, expect } from '@playwright/test';
import { ADMIN } from '../helpers.js';

const SUMMARY = { format: 'triodian.cea.channels.v1', source: 'harmonic', period: { from: '2026-10-10', to: '2026-10-12' }, events: 6, tools: [
  { tool: 'Enterprise chatbot', domain: '', suggestedKind: 'K2', events: 4, people: 3, withSensitiveInfo: 2, withSensitivityLabel: 0, enforcement: { block: 1, warn: 0, audit: 0, allow: 3 }, howEntered: 'paste' },
  { tool: 'Gemini', domain: 'gemini.google.com', suggestedKind: 'K4', events: 2, people: 1, withSensitiveInfo: 1, withSensitivityLabel: 0, enforcement: { block: 1, warn: 0, audit: 0, allow: 1 }, howEntered: 'upload' }] };

test('an AI activity summary shows on matching channels and adds the tools the register lacks', async ({ browser }) => {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto('/');
  await expect(p.locator('.examplenote', { hasText: 'Worked example:' })).toBeVisible({ timeout: 15_000 });
  await p.selectOption('#who-hdr', 'p4');   // the method owner
  await p.evaluate(() => window.CEAApp.go('profile'));
  const card = p.locator('#activityCard');
  await expect(card).toContainText('No summary loaded.');

  // a file that is not a summary is refused with the reason
  await p.locator('[data-act="toggleActPaste"]').click();
  await p.fill('#act_paste', '{"format":"triodian.bd.confidentiality.v1","markings":{}}');
  await p.locator('[data-act="pasteActivity"]').click();
  await expect(card).toContainText('This file is not an AI activity summary');

  await p.fill('#act_paste', JSON.stringify(SUMMARY));
  await p.locator('[data-act="pasteActivity"]').click();
  await expect(card).toContainText('Harmonic Security');
  const matched = await p.evaluate(() => window.CEA.S.channels.find(c => /Enterprise chatbot/.test((c.fields[5] || {}).value || '')).id);
  await expect(card.locator(`[data-act="openChannel"][data-id="${matched}"]`)).toBeVisible();

  // the matching channel shows the counts on its Facts tab
  await card.locator(`[data-act="openChannel"][data-id="${matched}"]`).click();
  await expect(p.locator(`#activity-${matched}`)).toContainText('Harmonic Security recorded 4 AI events for Enterprise chatbot');
  const before = await p.evaluate(id => JSON.stringify([15, 16, 24].map(n => window.CEA.S.channels.find(c => c.id === id).fields[n] || null)), matched);

  // the tool the register lacks is added as a channel, its facts carried
  await p.evaluate(() => window.CEAApp.go('profile'));
  await card.locator('[data-act="addActivityChannel"][data-tool="Gemini"]').click();
  const added = await p.evaluate(() => { const c = window.CEA.S.channels[window.CEA.S.channels.length - 1]; return { id: c.id, kind: c.fields[2].value, tool: c.fields[5].value, how: c.fields[8].value, carried: !!c.fields[5].carried, f11: c.fields[11].value }; });
  expect(added).toMatchObject({ kind: 'K4', tool: 'Gemini', how: 'upload', carried: true });
  expect(added.f11).toMatch(/^Harmonic Security recorded 2 AI events for Gemini from 2026-10-10 to 2026-10-12, by 1 person; 1 with sensitive information detected; the policy 1 blocked\./);
  await expect(p.locator(`#activity-${added.id}`)).toBeVisible();
  // the summary sets no classification
  expect(await p.evaluate(id => JSON.stringify([15, 16, 24].map(n => window.CEA.S.channels.find(c => c.id === id).fields[n] || null)), matched)).toBe(before);
  expect(errs).toEqual([]);
  await ctx.close();
});
