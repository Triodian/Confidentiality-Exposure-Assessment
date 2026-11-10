import { checkSave, deny } from '../lib/core/rbac.js';
const users = [
  { id: 'mo', name: 'Mo', roles: ['methodOwner'], active: true }, { id: 'as', name: 'Asha', roles: ['assessor'], active: true },
  { id: 'pr', name: 'Pete', roles: ['peer'], active: true }, { id: 'va', name: 'Val', roles: ['validation'], active: true },
  { id: 'dl', name: 'Dan', roles: ['dealLead'], active: true }, { id: 'cn', name: 'Cass', roles: ['counsel'], active: true },
  { id: 'gc', name: 'Gia', roles: ['gc'], active: true }, { id: 'ck', name: 'Chk', roles: ['checker'], active: true },
  { id: 'ap', name: 'AsPeer', roles: ['assessor', 'peer'], active: true }, { id: 'ad', name: 'Admin', roles: [], isAdmin: true, active: true },
  { id: 'gx', name: 'Gina', roles: ['gc', 'counsel'], active: true }, { id: 'ex', name: 'Ed', roles: ['executive'], active: true }, { id: 'ex2', name: 'Eve', roles: ['executive'], active: true },
];
const U = id => users.find(u => u.id === id);
const base = () => ({ schema: 'triodian.cea.v1', engagement: { id: 'e1', company: 'Acme', legalPhrases: [], productPhrases: [], annexText: {}, annexSigned: { by: '', on: '' }, closure: { by: '', on: '', disposition: '', note: '' }, checkerMode: 'external', checkerPersonId: 'ck' }, profile: { codeName: 'Kestrel', folders: [], advisers: [], tools: [] }, profileAgreed: { gcBy: '', gcOn: '', counselBy: '', counselOn: '' }, people: [], documents: [], interviews: [], demonstration: {},
  channels: [{ id: 'CH-01', fields: { '2': { value: 'K1' }, '3': { value: 'B1' } }, classifiedBy: '', reachConfirmedBy: '', peerReview: { personId: '', reach: '' } }],
  questions: [], findings: [], reviews: [{ point: 'R2' }, { point: 'R4' }, { point: 'R7' }], exceptions: [], independentReviewPoints: [], r5Cleared: {}, history: [] });
let fails = 0;
const t = (label, who, mutate, expectOk, old) => { const o = old || base(), n = JSON.parse(JSON.stringify(o)); mutate(n); n.history.push({ at: 'x', action: 't' }); const r = checkSave(o, n, U(who), users); const okd = !r.error; if (okd !== expectOk) fails++; console.log((okd === expectOk ? 'PASS' : 'FAIL') + ' · ' + label + (r.error ? ' → ' + r.error : '')); };
t('assessor edits a fact', 'as', n => n.channels[0].fields['4'] = { value: 'dealTeam' }, true);
t('deal lead cannot edit a fact', 'dl', n => n.channels[0].fields['4'] = { value: 'dealTeam' }, false);
t('assessor classifies (reach, classifiedBy self)', 'as', n => { n.channels[0].fields['15'] = { value: 'R3' }; n.channels[0].classifiedBy = 'as'; }, true);
t('assessor cannot record classification in another name', 'as', n => { n.channels[0].classifiedBy = 'mo'; }, false);
const classified = base(); classified.channels[0].classifiedBy = 'as'; classified.channels[0].fields['15'] = { value: 'R3' };
t('deal lead confirms reach in own name', 'dl', n => { n.channels[0].reachConfirmedBy = 'dl'; n.channels[0].reachConfirmedOn = '2026-11-01'; }, true, classified);
t('assessor cannot confirm reach', 'as', n => { n.channels[0].reachConfirmedBy = 'as'; }, false, classified);
t('reviewer re-derives a channel someone else classified', 'pr', n => n.channels[0].peerReview = { personId: 'pr', reach: 'R3' }, true, classified);
t('classifier cannot review own channel (assessor+peer)', 'ap', n => n.channels[0].peerReview = { personId: 'ap', reach: 'R3' }, false, (() => { const b = base(); b.channels[0].classifiedBy = 'ap'; return b; })());
const reviewed = JSON.parse(JSON.stringify(classified)); reviewed.channels[0].peerReview = { personId: 'pr', reach: 'R3' };
t('reviewer cannot then edit the channel facts', 'pr', n => n.channels[0].fields['4'] = { value: 'z' }, false, reviewed);
t('assessor+peer is blind: cannot classify before own R3', 'ap', n => n.channels[0].fields['16'] = { value: 'I2' }, false, classified);
t('validation person independent → R4 ok', 'va', n => n.reviews[1] = { point: 'R4', by: 'va', result: 'passed' }, true, reviewed);
const vaClassified = JSON.parse(JSON.stringify(reviewed)); vaClassified.channels[0].classifiedBy = 'va';
t('validation person who classified → R4 refused', 'va', n => n.reviews[1] = { point: 'R4', by: 'va', result: 'passed' }, false, vaClassified);
t('counsel answers a question', 'cn', n => n.questions[0].response = 'Answer', true, (() => { const b = base(); b.questions.push({ ref: 'QC-01', question: 'Q?', response: '', status: 'open' }); return b; })());
t('deal lead cannot ask a question', 'dl', n => n.questions.push({ ref: 'QC-01', question: 'Q?' }), false);
t('counsel sets field 24 (required rung)', 'cn', n => n.channels[0].fields['24'] = { value: 'N5', source: 'QC-01' }, true);
t('deal lead cannot set field 24 (Triodian may transcribe)', 'dl', n => n.channels[0].fields['24'] = { value: 'N5', source: 'QC-01' }, false);
t('admin edits set-up', 'ad', n => n.engagement.company = 'Acme Mutual', true);
// the board's confidentiality position (task 2.8): loading it is set-up; it never lets anyone but counsel set field 24
t('admin loads the board’s confidentiality position', 'ad', n => n.boardPosition = { format: 'triodian.bd.confidentiality.v1', status: 'resolved', markings: { 'G6:K1': 'N' }, conditions: [] }, true);
t('deal lead cannot load the position', 'dl', n => n.boardPosition = { format: 'triodian.bd.confidentiality.v1', status: 'resolved', markings: { 'G6:K1': 'N' }, conditions: [] }, false);
const withPos = (() => { const b = base(); b.boardPosition = { format: 'triodian.bd.confidentiality.v1', status: 'resolved', markings: { 'G6:K1': 'N' }, conditions: [] }; return b; })();
t('with the position loaded, deal lead still cannot set field 24', 'dl', n => n.channels[0].fields['24'] = { value: 'N5', source: 'board position' }, false, withPos);
t('with the position loaded, the GC still cannot set field 24', 'gc', n => n.channels[0].fields['24'] = { value: 'N5', source: 'board position' }, false, withPos);
t('with the position loaded, counsel sets field 24', 'cn', n => n.channels[0].fields['24'] = { value: 'N5', source: 'QC-01' }, true, withPos);
t('a malformed position is refused', 'ad', n => n.boardPosition = { markings: { 'X9:K1': 'maybe' } }, false);
// the AI activity summary (task 6.6): loading it is set-up, like the board's position
const act = { format: 'triodian.cea.channels.v1', source: 'purview', period: {}, tools: [{ tool: 'ChatGPT', events: 3 }] };
t('admin loads an AI activity summary', 'ad', n => n.channelActivity = act, true);
t('assessor cannot load the summary', 'as', n => n.channelActivity = act, false);
t('a malformed summary is refused', 'ad', n => n.channelActivity = { tools: [{ events: 3 }] }, false);
t('assessor cannot edit the profile', 'as', n => n.profile.codeName = 'Other', false);
t('GC agrees the profile in own name', 'gc', n => { n.profileAgreed.gcBy = 'gc'; n.profileAgreed.gcOn = 'x'; }, true);
t('checker logs a check point', 'ck', n => n.independentReviewPoints.push({ ref: 'CP-01', point: 'p', status: 'open' }), true);
t('external checker confirms R7', 'ck', n => n.reviews[2] = { point: 'R7', by: 'ck', result: 'complete' }, true);
t('validation cannot confirm R7 when an external checker is named', 'va', n => n.reviews[2] = { point: 'R7', by: 'va', result: 'complete' }, false);
t('validation confirms R7 when no external checker', 'va', n => n.reviews[2] = { point: 'R7', by: 'va', result: 'complete' }, true, (() => { const b = base(); b.engagement.checkerMode = 'validation'; return b; })());
t('counsel records the closure', 'cn', n => n.engagement.closure = { by: 'cn', on: 'x', disposition: 'archive' }, true);
t('method owner cannot record the closure', 'mo', n => n.engagement.closure = { by: 'mo', on: 'x', disposition: 'archive' }, false);
t('method owner signs the annex', 'mo', n => n.engagement.annexSigned = { by: 'mo', on: 'x' }, true);
t('history cannot be rewritten', 'as', n => { n.history = []; }, false, (() => { const b = base(); b.history.push({ at: '1', action: 'a' }); return b; })());
t('field 26 is unknown', 'as', n => n.channels[0].fields['26'] = { value: 'x' }, false);
t('closed assessment refuses facts', 'as', n => n.channels[0].fields['4'] = { value: 'y' }, false, (() => { const b = base(); b.reviews[2] = { point: 'R7', result: 'complete' }; b.engagement.closure = { by: 'cn', on: 'x', disposition: 'archive' }; return b; })());
console.log('deny facts no role:', deny('facts', { id: 'z', roles: [] }, base()));
// The GC also acts as counsel (development plan task 0.5)
const pa = (gcBy, counselBy) => { const b = base(); b.profileAgreed = { gcBy, gcOn: gcBy ? '2026-11-06' : '', counselBy, counselOn: counselBy ? '2026-11-06' : '' }; return b; };
t('without the setting, the same person cannot give the second agreement', 'gx', n => { n.profileAgreed.counselBy = 'gx'; n.profileAgreed.counselOn = '2026-11-06'; }, false, pa('gx', ''));
t('without the setting, nor the GC agreement after giving counsel’s', 'gx', n => { n.profileAgreed.gcBy = 'gx'; n.profileAgreed.gcOn = '2026-11-06'; }, false, pa('', 'gx'));
t('without the setting, counsel (another person) agrees as usual', 'cn', n => { n.profileAgreed.counselBy = 'cn'; n.profileAgreed.counselOn = '2026-11-06'; }, true, pa('gx', ''));
const dual = pa('gx', ''); dual.engagement.gcActsAsCounsel = true; dual.engagement.secondApproverId = 'ex';
t('with the setting, the named second approver gives the second agreement', 'ex', n => { n.profileAgreed.counselBy = 'ex'; n.profileAgreed.counselOn = '2026-11-06'; }, true, dual);
t('with the setting, the GC cannot give it', 'gx', n => { n.profileAgreed.counselBy = 'gx'; n.profileAgreed.counselOn = '2026-11-06'; }, false, dual);
t('with the setting, counsel cannot give it either', 'cn', n => { n.profileAgreed.counselBy = 'cn'; n.profileAgreed.counselOn = '2026-11-06'; }, false, dual);
t('with the setting, an executive who is not named cannot give it', 'ex2', n => { n.profileAgreed.counselBy = 'ex2'; n.profileAgreed.counselOn = '2026-11-06'; }, false, dual);
t('the method owner turns the setting on in set-up', 'mo', n => { n.engagement.gcActsAsCounsel = true; n.engagement.secondApproverId = 'ex'; }, true);
t('the GC cannot turn the setting on', 'gx', n => { n.engagement.gcActsAsCounsel = true; }, false);
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
