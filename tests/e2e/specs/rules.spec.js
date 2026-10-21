// The server refuses what it should, and nothing is stored on a refusal.
import { test, expect } from '@playwright/test';
import { api, editAs, pageAs, U, ADMIN } from '../helpers.js';

test.describe.configure({ mode: 'serial' });
let ids = {};
const stored = async (as = ADMIN) => (await api('GET', '/api/engagement', undefined, as)).body;
const f = (value, source = 'D1 p.1') => ({ value, source, notKnown: false, by: '', on: '' });
const blank = (id, kind) => ({ id, fields: { 2: f(kind, 'framework'), 3: f(kind === 'K7' ? 'B2' : kind === 'K5' ? 'B3' : 'B1', 'framework') }, adviserId: '', absent: { on: false, reason: '' }, reachTests: [0, 1, 2].map(() => ({ answer: null, source: '' })), reachOverrideReason: '', adjustmentReason: '',
  classifiedBy: '', reviewedBy: '', reachConfirmedBy: '', reachConfirmedOn: '', obtainability: { start: '', rungs: {} }, confChosen: '', confRaiseReason: '', peerReview: { personId: '', reach: '', differs: false, resolution: '', on: '' }, notDeterminable: { on: false, question: '', who: '', since: '' }, owner: '', horizon: '', movedTo: '' });
const unchanged = async (before, r, status) => { expect(r.status, JSON.stringify(r.body)).toBe(status); expect((await stored()).revision).toBe(before.revision); };

test('the method owner starts an assessment with two channels', async ({ browser }) => {
  ids = Object.fromEntries((await api('GET', '/api/admin/users')).body.users.map(u => [u.email, u.id]));
  if (!(await stored()).exists) { const mo = await pageAs(browser, U.mo); await mo.click('[data-act="new"]'); await expect(mo.locator('#savechip')).toHaveText(/Saved/, { timeout: 10_000 }); await mo.context().close(); }
  const r = await editAs(U.mo, d => { d.profile.codeName = 'Project Test'; d.channels = [blank('CH-01', 'K1'), blank('CH-02', 'K5')]; });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
});
test.describe('malformed saves are refused with a 400, not a server error', () => {
  const cases = {
    'two channels with the same id': d => { d.channels.push({ ...structuredClone(d.channels[0]), fields: { 15: f('R3') } }); },
    'a channel that is not a record': d => { d.channels.push(null); },
    'a review point that is not R1 to R7': d => { d.reviews = [...(d.reviews || []), { point: 'constructor', by: '', on: '', result: 'complete', notes: '' }]; },
    'a field number outside 1 to 25': d => { d.channels[0].fields[26] = f('x'); },
  };
  for (const [name, change] of Object.entries(cases)) test(name, async () => { const before = await stored(); await unchanged(before, await editAs(U.assessor, change), 400); });
});
test('a new channel cannot arrive classified from a role without facts rights', async () => {
  const before = await stored();
  await unchanged(before, await editAs(U.dealLead, d => { d.channels.push({ ...blank('CH-09', 'K2'), fields: { 15: f('R1') }, classifiedBy: ids[U.assessor] }); }), 403);
});
test('two people changing the same item: the second save is refused, others merge', async () => {
  const cur = await stored(U.assessor), mine = structuredClone(cur.data), theirs = structuredClone(cur.data);
  theirs.channels[0].fields[5] = f('Assistant A'); theirs.history.push({ at: 'x', action: 'field 5', target: 'CH-01' });
  expect((await api('PUT', '/api/engagement', { revision: cur.revision, data: theirs }, U.mo)).status).toBe(200);
  const after = await stored();
  mine.channels[0].fields[5] = f('Assistant B'); mine.history.push({ at: 'x', action: 'field 5', target: 'CH-01' });
  await unchanged(after, await api('PUT', '/api/engagement', { revision: cur.revision, data: mine }, U.assessor), 409);
  const other = structuredClone(cur.data); other.channels[1].fields[5] = f('A phone'); other.history.push({ at: 'x', action: 'field 5', target: 'CH-02' });
  const m = await api('PUT', '/api/engagement', { revision: cur.revision, data: other }, U.assessor);
  expect(m.status, JSON.stringify(m.body).slice(0, 300)).toBe(200); expect(m.body.merged).toBe(true);
  const fin = (await stored()).data; expect(fin.channels[0].fields[5].value).toBe('Assistant A'); expect(fin.channels[1].fields[5].value).toBe('A phone');
});
test('the assessor classifies; the reviewer is sent a blind copy; the reviewer re-derives', async () => {
  let r = await editAs(U.assessor, d => { d.channels[0].fields[8] = f('scope', 'D5 p.3'); d.channels[0].fields[15] = f('R3', 'reach tests'); d.channels[0].classifiedBy = ids[U.assessor]; });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  const peerView = (await api('GET', '/api/engagement', undefined, U.peer)).body;
  expect(peerView.data.blind).toEqual(['CH-01']);
  expect(peerView.data.channels[0].fields[15]).toBeUndefined();
  r = await editAs(U.peer, d => { d.channels[0].peerReview = { personId: ids[U.peer], reach: 'R2', differs: false, resolution: '', on: '2026-11-01' }; });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  expect(r.body.reload).toBe(true);
  const after = (await stored()).data;
  expect(after.channels[0].fields[15].value).toBe('R3');
  expect(after.channels[0].peerReview.differs).toBe(true);
});
test('the deal lead confirms reach in own name only', async () => {
  const before = await stored();
  await unchanged(before, await editAs(U.dealLead, d => { d.channels[0].reachConfirmedBy = ids[U.assessor]; d.channels[0].reachConfirmedOn = '2026-11-01'; }), 403);
  const r = await editAs(U.dealLead, d => { d.channels[0].reachConfirmedBy = ids[U.dealLead]; d.channels[0].reachConfirmedOn = '2026-11-01'; });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
});
test('counsel answers and sets the required rung; a version is kept when the profile is agreed', async () => {
  let r = await editAs(U.assessor, d => { d.questions.push({ ref: 'QC-01', channelId: 'CH-01', question5: 5, targetField: '24', facts: 'f', question: 'q', why: 'w', sentOn: '2026-11-01', response: '', respondedOn: '', status: 'open', owner: '', reach: '', requiredRung: '' }); });
  expect(r.status).toBe(200);
  r = await editAs(U.counsel, d => { Object.assign(d.questions[0], { response: 'N5', respondedOn: '2026-11-02', status: 'answered', requiredRung: 'N5', reach: 'reach' }); d.channels[0].fields[24] = f('N5', 'QC-01'); });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  r = await editAs(U.gc, d => { d.profileAgreed.gcBy = ids[U.gc]; d.profileAgreed.gcOn = '2026-11-02'; });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  r = await editAs(U.counsel, d => { d.profileAgreed.counselBy = ids[U.counsel]; d.profileAgreed.counselOn = '2026-11-02'; });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  expect(r.body.versions.length).toBe(1);
  expect(r.body.versions[0].label).toBe('Profile agreed (R1)');
});
test('only counsel records the closure, and only after R7', async () => {
  const before = await stored();
  await unchanged(before, await editAs(U.mo, d => { d.engagement.closure = { by: ids[U.mo], on: '2026-11-10', disposition: 'archive', note: '' }; }), 403);
});
