// Matter types (development plan task 2.7): each type has its own profile wording, stages, adviser types and
// information classes; the deal type keeps the wording the app had before types; the server and file checks know them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { structureError } from '../lib/core/rbac.js';
import { nextAssessment } from '../lib/core/review.js';
const require = createRequire(import.meta.url);
const C = JSON.parse(readFileSync(new URL('../public/cea-content.json', import.meta.url)));
let S; const R = require('../public/cea-rules.js').create(C, () => S, { today: () => '2026-11-08' });

test('six matter types, each complete', () => {
  assert.deepEqual(C.matterTypes.map((t) => t.id), ['deal', 'litigation', 'rdIp', 'tender', 'boardPapers', 'exportControlled']);
  for (const t of C.matterTypes) {
    for (const k of ['codeName', 'stage', 'teamCounts', 'teamPh', 'folders', 'sharingPh', 'role', 'reaches', 'section1']) assert.ok(t.p[k], `${t.id}: ${k}`);
    assert.ok(t.name && t.noun && t.title && t.lede, t.id);
    assert.equal(Object.keys(t.stages).length, 4, t.id);
    assert.equal(t.infoClasses.length, 6, t.id);
    assert.ok(t.adviserTypes.includes('Other'), t.id);
    if (t.id !== 'deal') assert.equal(t.exposures.length, 3, `${t.id}: X2 to X4`);
    assert.ok(!/\b(must|required)\b/i.test(JSON.stringify(t)), `${t.id}: no "must" or "required"`);
  }
});

test('the deal type reads as the app did before matter types', () => {
  const d = C.matterTypes[0];
  assert.deepEqual(d.infoClasses, C.infoClasses.map((x) => [x.name, x.def]));
  assert.deepEqual(d.stages, C.stageLabels);
  assert.deepEqual(d.adviserTypes, C.adviserTypes);
  const name = (id) => C.profile.find((x) => x.id === id).name;
  assert.equal(d.p.codeName, name('codeName')); assert.equal(d.p.stage, name('stage')); assert.equal(d.p.teamCounts, name('teamCounts')); assert.equal(d.p.folders, name('folders'));
  assert.equal(d.title, 'The deal profile');
});

test('the rules follow the type: information classes and the code name gate', () => {
  S = R.newAssessment();
  assert.equal(S.profile.matterType, 'deal');
  assert.equal(R.className('I1'), 'Existence of the deal and the counterparty');
  S.profile.matterType = 'litigation';
  assert.equal(R.className('I6'), 'Privileged advice and instructions');
  assert.equal(R.codeName('I3'), 'Settlement position and offers');
  assert.ok(R.gates()[0].items.some(([label]) => label === 'Matter code name chosen'));
  S.profile.matterType = 'deal';
  assert.ok(R.gates()[0].items.some(([label]) => label === 'Deal code name chosen'), 'a deal keeps its wording');
  delete S.profile.matterType;
  assert.equal(R.matterType().id, 'deal', 'an assessment without a type is a deal');
});

test('files and the server accept the types and refuse others', () => {
  S = R.newAssessment();
  const file = { ...S, profile: { ...S.profile, matterType: 'tender' } };
  assert.equal(R.validateFile(file), '');
  assert.match(R.validateFile({ ...S, profile: { ...S.profile, matterType: 'heist' } }), /not a matter type/);
  assert.equal(structureError({ engagement: {}, profile: { matterType: 'rdIp' } }), '');
  assert.match(structureError({ engagement: {}, profile: { matterType: 'heist' } }), /matter type/);
  for (const t of C.matterTypes) assert.equal(structureError({ engagement: {}, profile: { matterType: t.id } }), '', `server knows ${t.id}`);
});

test('the next assessment keeps the matter type', () => {
  S = R.newAssessment(); S.profile.matterType = 'boardPapers';
  assert.equal(nextAssessment(S, 'next1', 'p1', '2026-11-08T00:00:00Z', 'x').profile.matterType, 'boardPapers');
});

test('the exposure consequences X2 to X4 read for the type; a deal keeps the original labels', () => {
  S = R.newAssessment();
  assert.deepEqual(R.exposures(), C.exposures);
  S.profile.matterType = 'litigation';
  assert.equal(R.exposureName('X4'), 'Privilege consequence');
  assert.equal(R.exposureName('X1'), 'Immaterial');
  assert.equal(R.codeName('X2'), 'Order and undertaking consequence');
});
