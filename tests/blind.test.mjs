import { redactFor, unredactSave } from '../lib/core/blind.js';
const peer = { id: 'pr', roles: ['peer'] };
const stored = { channels: [{ id: 'CH-01', classifiedBy: 'as', fields: { '8': { value: 'scope' }, '15': { value: 'R3' }, '16': { value: 'I6' } }, reachTests: [{ answer: true }, { answer: true }, { answer: false }], obtainability: { start: 'N5', rungs: { N5: {} } }, peerReview: { personId: '', reach: '' } }], history: [{ at: 'x', action: 'field 15', target: 'CH-01', from: null, to: 'R3' }], versions: [{ id: 'V1', snapshot: { channels: { 'CH-01': { kind: 'K1', f: { 8: 'scope', 15: 'R3' } } }, findings: {} } }], findings: [{ channelId: 'CH-01', type: 'F1' }] };
let fails = 0; const t = (l, c) => { if (!c) fails++; console.log((c ? 'PASS' : 'FAIL') + ' · ' + l); };
const r = redactFor(stored, peer);
t('reach hidden', !r.channels[0].fields[15]); t('field 8 kept', r.channels[0].fields[8].value === 'scope'); t('classifier hidden', r.channels[0].classifiedBy === ''); t('tests blank', r.channels[0].reachTests[0].answer === null);
t('history masked', r.history[0].action === 'hidden'); t('version trimmed', !r.versions[0].snapshot.channels['CH-01'].f[15]); t('findings emptied', r.findings.length === 0); t('blind list sent', r.blind[0] === 'CH-01');
const save = JSON.parse(JSON.stringify(r)); save.channels[0].peerReview = { personId: 'pr', reach: 'R2' };
const u = unredactSave(stored, save, peer);
t('restored reach', u.data.channels[0].fields[15].value === 'R3'); t('restored classifier', u.data.channels[0].classifiedBy === 'as'); t('difference computed', u.data.channels[0].peerReview.differs === true); t('unblinded', u.unblinded === true); t('history restored', u.data.history[0].action === 'field 15');

// ---- through the API: every response that carries the assessment is redacted for the reader (security review 15 Nov 2026, S.1) ----
{
  const { handle } = await import('../lib/core/api.js');
  const apiUsers = [{ id: 'as', email: 'as@x.test', name: 'Jo', roles: ['assessor'], active: true, isAdmin: false }, { id: 'pr', email: 'pr@x.test', name: 'Ravi', roles: ['peer'], active: true, isAdmin: false }];
  const full = { schema: 'triodian.cea.v1', engagement: { id: 'e1' }, ...JSON.parse(JSON.stringify(stored)), reviews: [], questions: [] };
  full.history[0].by = 'Jo';
  let eng = { revision: 3, data: structuredClone(full), updatedAt: 't', updatedBy: 'Jo' }; const archive = [{ id: 1, label: 'earlier', data: structuredClone(full) }];
  const store = new Proxy({ init: async () => {}, getUserByEmail: async e => apiUsers.find(u => u.email === e) || null, touchUser: async () => {}, listUsers: async () => apiUsers, getEngagement: async () => eng, audit: async () => {},
    putEngagement: async (txt, from, by, at) => { if (from !== eng.revision) return false; eng = { revision: from + 1, data: JSON.parse(txt), updatedAt: at, updatedBy: by }; return true; },
    getRevision: async () => null, listArchive: async () => archive.map(a => ({ id: a.id, label: a.label })), getArchive: async id => { const a = archive.find(x => x.id === id); return a ? { ...a, archived_at: 'x', archived_by: 'as' } : null; } },
    { get: (tg, k) => k in tg ? tg[k] : (k === 'then' ? undefined : async () => null) });
  const call = (email, method, path, body) => handle({ method, path, email, text: async () => JSON.stringify(body || {}) }, store);
  const leaks = o => { const s = JSON.stringify(o); return ['"R3"', 'classifiedBy":"as"'].filter(x => s.includes(x)); };
  const got = await call('pr@x.test', 'GET', '/api/engagement');
  t('GET /engagement is redacted for a blind peer: ' + got.status, got.status === 200 && leaks(got.body).length === 0 && got.body.data.blind.includes('CH-01'));
  const same = structuredClone(got.body.data);
  const r0 = await call('pr@x.test', 'PUT', '/api/engagement', { revision: 3, data: same });
  t('a save that adds no history returns an empty history delta, not the whole history: ' + r0.status + ' ' + (r0.body.error || ''), r0.status === 200 && Array.isArray(r0.body.history) && r0.body.history.length === 0 && leaks(r0.body).length === 0);
  const next = structuredClone(got.body.data); next.channels[0].peerReview = { personId: 'pr', reach: 'R2' };
  next.history.push({ at: 't3', by: 'Ravi', action: 'peerReview', target: 'CH-01', from: null, to: 'R2' });
  const r1 = await call('pr@x.test', 'PUT', '/api/engagement', { revision: 4, data: next });
  t('the history delta carries only what was added and nothing withheld: ' + r1.status + ' ' + (r1.body.error || ''), r1.status === 200 && r1.body.history.length === 1 && r1.body.reload === true && leaks({ h: r1.body.history }).length === 0);
  const a = await call('pr@x.test', 'GET', '/api/archive/1');
  t('an earlier assessment is redacted for a blind peer too', a.status === 200 && leaks(a.body).length === 0);
  const f = await call('as@x.test', 'GET', '/api/archive/1');
  t('and not for the assessor', f.status === 200 && f.body.data.channels[0].fields[15].value === 'R3');
}
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
