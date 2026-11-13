// ISO readiness (development plan tasks ISO.3, ISO.4 and ISO.9): the gap grade is an evidence shortfall grade, not a
// priority or a risk rating; the Reference screen sets the ladder N0 to N6 beside ISO/IEC 27002:2022; and every
// technical annex states how the records are kept, when the assessment is run again, and that likelihood is not assessed.
import { test, expect } from '@playwright/test';
import { ADMIN } from '../helpers.js';

async function open(browser) {
  const ctx = await browser.newContext({ extraHTTPHeaders: { 'X-Dev-User': ADMIN }, viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('triodian.suite.seen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); p._errors = []; p.on('pageerror', e => p._errors.push(String(e))); p.on('dialog', d => d.accept());
  await p.goto('/');
  await expect(p.locator('.examplenote', { hasText: 'Worked example:' }).first()).toBeVisible({ timeout: 15_000 });
  return { ctx, p };
}
const texts = p => p.evaluate(() => Object.fromEntries(window.CEA.O.OUTS.map(o => [o.id, o.gen()])));

test('the annex carries the records, the re-assessment and the ISO statements; no output grades a gap as a priority', async ({ browser }) => {
  const { ctx, p } = await open(browser);
  const T = await texts(p);
  const annex = T.CD5;
  expect(annex).toContain('## Records: retention, storage and disposition');
  expect(annex).toContain('| Retention period | Seven years from completion of the purchase |');
  expect(annex).toContain('| At the end of the period | Deleted, with a record of the deletion kept by counsel |');
  expect(annex).toContain('It is run again at this interval: At signing, and again within 90 days of completion');
  expect(annex).toContain('The assessment does not assess likelihood, bias, data or model behaviour.');
  expect(annex).toContain('It is not an AI system impact assessment (A.5; ISO/IEC 42005:2025).');
  expect(annex).toContain('## Non-egress rungs N0 to N6 beside ISO/IEC 27002:2022');
  expect(annex).toContain('8.12 Data leakage prevention');
  for (const [id, t] of Object.entries(T)) {
    expect(t, id).not.toMatch(/\bpriority\b/i);
    expect(t.replace(/not a risk rating/gi, ''), id).not.toMatch(/risk rating/i);   // only to say the grade is not one
  }
  expect(T.CD2).toContain('| Grade |');
  expect(T.CD3).toContain('## Steps by grade');
  expect(p._errors).toEqual([]);
  await ctx.close();
});

test('the Reference screen and set-up show the cross-walk and the records', async ({ browser }) => {
  const { ctx, p } = await open(browser);
  await p.evaluate(() => window.CEAApp.go('reference'));
  const xw = p.locator('#crosswalks');
  await expect(xw).toContainText('Non-egress rungs N0 to N6 beside ISO/IEC 27002:2022');
  await expect(xw.locator('tbody tr')).toHaveCount(7);
  await expect(xw).toContainText('5.14 Information transfer');
  await expect(xw).toContainText('8.10 Information deletion');
  await expect(xw).toContainText('it is not an equivalence');
  await expect(p.locator('body')).toContainText('Evidence shortfall grade');
  await expect(p.locator('body')).not.toContainText('Gap priority');
  await p.evaluate(() => window.CEAApp.go('setup'));
  const rc = p.locator('#records');
  await expect(rc).toContainText('Records and re-assessment');
  await expect(rc.locator('[data-path="engagement.retention.period"]')).toHaveValue('Seven years from completion of the purchase');
  await expect(rc.locator('[data-path="engagement.reassessment"]')).toHaveValue('At signing, and again within 90 days of completion');
  expect(p._errors).toEqual([]);
  await ctx.close();
});
