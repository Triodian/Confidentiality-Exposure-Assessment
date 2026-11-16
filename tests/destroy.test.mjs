// Destruction directed by counsel (penetration test 16 Nov 2026, PT-05; development plan P.5). A "destroyed" assessment
// used to leave the notifications outbox (with every email body) and carry the working-document names into the next
// assessment. Runs the real API against the real D1 store on SQLite, seeded as the penetration test seeded it.
// Run: node tests/destroy.test.mjs
import { DatabaseSync } from 'node:sqlite';
import { handle } from '../lib/core/api.js';
let instance = 0; // the store module keeps one `ready` flag per Worker, so each seeded database gets its own module instance
const freshStore = async () => (await import(`../lib/store/d1.js?i=${++instance}`)).d1Store;

let fails = 0; const ok = (label, cond, extra) => { if (!cond) fails++; console.log((cond ? 'PASS' : 'FAIL') + ' · ' + label + (extra ? ' → ' + extra : '')); };
function d1(sql) {
  const stmt = (q, args = []) => ({ bind: (...a) => stmt(q, a),
    async run() { const r = sql.prepare(q).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
    async first() { return sql.prepare(q).get(...args) || null; }, async all() { return { results: sql.prepare(q).all(...args) }; } });
  return { prepare: q => stmt(q), async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; } };
}
const ADMIN = 'admin@acme.test', NOW = '2026-11-16T01:00:00.000Z';
const SECRET_DOC = 'Project Kestrel - bid price sensitivity.xlsx', SECRET_BODY = 'Counsel question on Project Kestrel: the earn-out at $42m', SECRET_INTERVIEW = 'Kestrel CFO interview';
async function seeded(disposition) {
  const sql = new DatabaseSync(':memory:'), store = (await freshStore())(d1(sql)); await store.init();
  await store.insertUser({ id: 'u-admin', email: ADMIN, name: 'Ada', organisation: 'Acme', roles: ['methodOwner', 'counsel'], isAdmin: true }, 'seed', NOW);
  // a closed assessment: R7 complete, counsel's closure recorded with the disposition
  const data = { schema: 'triodian.cea.v1', engagement: { id: 'e1', company: 'Acme', reference: 'M-1', closure: { by: 'u-admin', on: '2026-11-15', disposition, note: '' } },
    profile: { matterType: 'deal', codeName: 'Kestrel', tools: [{ name: 'Copilot' }], devicePolicy: 'managed', counselTurnaround: 2 },
    people: [], documents: [{ id: 'D5', name: SECRET_DOC, status: 'received', date: '2026-11-01' }], interviews: [{ id: 'I1', name: SECRET_INTERVIEW, date: '2026-11-02', notesRef: 'N1' }],
    channels: [], questions: [], reviews: [{ point: 'R7', result: 'complete', by: 'u-admin', on: '2026-11-14' }], findings: [], history: [] };
  await store.putEngagement(JSON.stringify(data), 0, ADMIN, NOW);
  await store.putEngagement(JSON.stringify({ ...data, engagement: { ...data.engagement, note: 'rev 2' } }), 1, ADMIN, NOW);
  await store.addNotification({ key: 'q-1', to: 'counsel@law.test', subject: 'Question for counsel', body: SECRET_BODY, status: 'sent' }, NOW);
  await store.addNotification({ key: 'q-2', to: 'gc@acme.test', subject: 'Reminder', body: 'The ' + SECRET_DOC + ' is due', status: 'held' }, NOW);
  const call = (method, path, body) => handle({ method, path, email: ADMIN, text: async () => (body === undefined ? '' : JSON.stringify(body)), firstAdmins: [], sender: null }, store);
  return { sql, store, call };
}
const dump = sql => ['engagement', 'engagement_revisions', 'engagement_archive', 'notifications', 'audit_log'].map(t => JSON.stringify(sql.prepare(`SELECT * FROM ${t}`).all())).join('\n');

{
  const { sql, store, call } = await seeded('destroy');
  const before = (await store.getEngagement()).revision;
  const r = await call('POST', '/api/next-assessment', { revision: before });
  ok('destruction directed: the next assessment starts and says it destroyed', r.status === 200 && r.body.destroyed === true, JSON.stringify(r.body).slice(0, 200));
  ok('the response says what was removed, in numbers', r.body.removed && r.body.removed.revisions === 2 && r.body.removed.notifications === 2, JSON.stringify(r.body.removed));
  ok('and what stays, and what it cannot reach (delivered email)', /audit log/.test(r.body.retained || '') && /cannot be recalled/.test(r.body.beyondReach || ''));
  ok('no saved revision of the destroyed matter remains (only the new, empty assessment’s)', sql.prepare('SELECT COUNT(*) AS n FROM engagement_revisions').get().n === 1 && sql.prepare('SELECT MIN(revision) AS r FROM engagement_revisions').get().r === 3);
  ok('the notifications outbox is empty: no body of any email about the matter remains', sql.prepare('SELECT COUNT(*) AS n FROM notifications').get().n === 0);
  ok('nothing was archived', sql.prepare('SELECT COUNT(*) AS n FROM engagement_archive').get().n === 0);
  const after = (await store.getEngagement()).data;
  ok('the new assessment carries no document or interview names from the destroyed matter', after.documents.length === 0 && after.interviews.length === 0, JSON.stringify({ d: after.documents, i: after.interviews }));
  ok('nor the matter’s label; it records only that an assessment was destroyed and when it closed', after.previous.label === '' && after.previous.destroyed === true && after.previous.closedOn === '2026-11-15', JSON.stringify(after.previous));
  ok('the organisation’s settings do carry (sanctioned tools, device policy, people)', after.profile.tools.length === 1 && after.profile.devicePolicy === 'managed');
  const all = dump(sql);
  ok('no table in the database holds the matter’s document name, interview name or the email body', !all.includes(SECRET_DOC) && !all.includes(SECRET_INTERVIEW) && !all.includes(SECRET_BODY) && !all.includes('Kestrel'), all.match(/Kestrel[^"]{0,40}/g)?.join(' | '));
  const audit = sql.prepare(`SELECT action, detail FROM audit_log WHERE action = 'engagement.destroyed'`).get();
  ok('the audit log records the destruction, with counts and no matter content', audit && /"revisions":2/.test(audit.detail) && !/Kestrel/.test(audit.detail), audit && audit.detail);
}
{
  // archive (control): kept read-only, names carried as before, outbox untouched
  const { sql, store, call } = await seeded('archive');
  const r = await call('POST', '/api/next-assessment', { revision: (await store.getEngagement()).revision });
  ok('archive directed: kept under Earlier assessments, named (control)', r.status === 200 && r.body.destroyed === false && r.body.archived && /Kestrel/.test(r.body.label), JSON.stringify(r.body).slice(0, 160));
  const after = (await store.getEngagement()).data;
  ok('the document and interview lists carry over on an archive (as the user guide says)', after.documents.length === 1 && after.interviews.length === 1 && after.previous.label === r.body.label);
  ok('the outbox is untouched on an archive', sql.prepare('SELECT COUNT(*) AS n FROM notifications').get().n === 2);
}
{
  // without counsel's closure nothing can be destroyed
  const { store, call } = await seeded('destroy');
  const cur = await store.getEngagement(); const d = cur.data; d.engagement.closure.by = '';
  await store.putEngagement(JSON.stringify(d), cur.revision, ADMIN, NOW);
  const r = await call('POST', '/api/next-assessment', { revision: cur.revision + 1 });
  ok('without counsel’s closure the request is refused (as before)', r.status === 409, JSON.stringify(r.body));
}
console.log(fails ? `\n${fails} failed` : '\nAll passed'); process.exit(fails ? 1 : 0);
