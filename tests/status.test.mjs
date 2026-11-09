// The status the practice hub reads over a service binding (development plan task 4.1): stage, counts, roles and
// dates only, never names, the matter's code name, channels, reach or findings. Run: node tests/status.test.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { engagementStatus, STATUS_FORMAT } from '../lib/core/status.js';
import { statusForService } from '../src/status.js';
const require = createRequire(import.meta.url);

let fails = 0;
const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
const KEYS = ['app', 'format', 'generated', 'lastActivity', 'nextBoardDate', 'nextSignOff', 'openActions', 'stage', 'waitingOn'];
const at = { today: '2026-11-10', now: '2026-11-10T00:00:00.000Z' };
const C = JSON.parse(readFileSync(new URL('../public/cea-content.json', import.meta.url)));
let S; const R = require('../public/cea-rules.js').create(C, () => S, { today: () => '2026-11-10' });

let s = engagementStatus(null, at);
ok('no engagement: not started', s.format === STATUS_FORMAT && s.app === 'confidentiality' && s.stage.step === 0 && s.stage.steps === 8 && s.openActions === 0);

// A new assessment from the app's own model: the app's gates and the status agree it is at set-up
S = R.newAssessment();
s = engagementStatus({ data: S }, at);
ok('new assessment: set-up, as the app’s own gates say', s.stage.step === 1 && !R.gates()[0].ok && s.nextSignOff.label === 'The GC confirms the brief', JSON.stringify(s.stage));

// Set-up done, profile agreed by the GC only, one channel, one open question
Object.assign(S.engagement, { company: 'Marrowgate Holdings (fictional)', briefConfirmed: { by: 'p2', on: '2026-10-27', ref: 'Brief v1' }, documentsRequestedOn: '2026-10-27' });
Object.assign(S.profile, { codeName: 'Project Kestrel', privilegeMarking: 'Privileged and confidential' });
S.people = [{ id: 'p2', name: 'Helen Brandt', roles: ['gc'] }];
S.profileAgreed = { gcBy: 'p2', gcOn: '2026-10-27', counselBy: '', counselOn: '' };
S.channels = [R.newChannel('K1', 'CH-01'), { ...R.newChannel('K6', 'CH-02'), absent: { on: true, reason: 'No personal devices' } }];
S.questions = [{ ref: 'Q-01', question: 'May the deal team use the enterprise assistant on the data room?', status: 'open' }];
s = engagementStatus({ data: S, updatedAt: '2026-11-09T03:00:00Z' }, at);
ok('only the contract fields', JSON.stringify(Object.keys(s).sort()) === JSON.stringify(KEYS), Object.keys(s).join());
ok('set-up met: the profile (R1), as the app’s own gates say', s.stage.step === 2 && R.gates()[0].ok && !R.gates()[1].ok, JSON.stringify(s.stage));
ok('waits on counsel (R1 and the question) and Triodian (the demonstration)', JSON.stringify(s.waitingOn) === '[{"role":"Counsel","actions":2},{"role":"Triodian","actions":1}]' && s.openActions === 3, JSON.stringify(s.waitingOn));
const text = JSON.stringify(s), leaks = ['Marrowgate', 'Kestrel', 'Helen', 'CH-01', 'data room', 'enterprise assistant'].filter(w => text.includes(w));
ok('no company, code name, names, channels or questions', !leaks.length, leaks.join(' | '));

S.engagement.gcActsAsCounsel = true;
s = engagementStatus({ data: S }, at);
ok('GC acts as counsel: the second approver gives the second agreement', s.waitingOn.some(w => w.role === 'Second approver') && /second approver/.test(s.nextSignOff.label), JSON.stringify(s.waitingOn));

// Late: everything through R7; the annex is signed; counsel's closure is all that is left
S.engagement.gcActsAsCounsel = false; S.profileAgreed.counselBy = 'p1'; S.questions[0].status = 'answered'; S.demonstration.performed = 'yes';
S.reviews = [{ point: 'R2', result: 'passed' }, { point: 'R4', result: 'passed' }, { point: 'R6', on: '2026-11-08' }, { point: 'R7', result: 'complete' }];
S.engagement.annexSigned = { by: 'p4', on: '2026-11-09' };
s = engagementStatus({ data: S }, at);
ok('only the closure left: last gate, waiting on counsel', s.stage.step === 8 && s.stage.label === 'Annex and closure' && JSON.stringify(s.waitingOn) === '[{"role":"Counsel","actions":1}]' && s.nextSignOff.label === 'Counsel records the closure', JSON.stringify(s));
S.engagement.closure = { by: 'p1', on: '2026-11-10', disposition: 'archive' };
s = engagementStatus({ data: S }, at);
ok('closed: complete, nothing left', /^Closed/.test(s.stage.label) && s.stage.step === 8 && s.nextSignOff === null && s.openActions === 0);

const dbWith = data => { const stmt = () => ({ bind() { return this; }, first: async () => data ? ({ revision: 3, data: JSON.stringify(data), updated_at: '2026-11-09T05:00:00Z', updated_by: 'y' }) : null, all: async () => ({ results: [] }), run: async () => ({ meta: {} }) }); return { prepare: stmt, batch: async () => [], exec: async () => ({}) }; };
s = await statusForService({ DB: dbWith(S) }, new Date('2026-11-10T00:00:00Z'));
ok('statusForService reads the stored engagement', /^Closed/.test(s.stage.label) && s.lastActivity === '2026-11-09');
const fresh = { prepare: () => ({ bind() { return this; }, first: async () => { throw new Error('D1_ERROR: no such table: engagement: SQLITE_ERROR'); }, all: async () => { throw new Error('D1_ERROR: no such table: users: SQLITE_ERROR'); } }) };
s = await statusForService({ DB: fresh }, new Date('2026-11-10T00:00:00Z'));
ok('a deployment nobody has opened (no tables yet): not started', s.stage.step === 0 && s.stage.label === 'Not started', JSON.stringify(s.stage));
let threw = false; try { await statusForService({}); } catch (e) { threw = true; }
ok('no database: it throws, so the hub shows the app as unreachable', threw);

const idx = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8'), svc = readFileSync(new URL('../src/status-service.js', import.meta.url), 'utf8');
ok('src/index.js exports the app and StatusService', /export \{ default \} from '\.\/worker\.js'/.test(idx) && /export \{ StatusService \} from '\.\/status-service\.js'/.test(idx));
ok('StatusService offers status() only', (svc.match(/async \w+\(/g) || []).join() === 'async status(' && /class StatusService extends WorkerEntrypoint/.test(svc));
ok('wrangler.jsonc runs src/index.js', /"main": "src\/index\.js"/.test(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')));
console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
