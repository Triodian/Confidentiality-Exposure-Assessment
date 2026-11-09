// Where the assessment stands, for the practitioner's practice hub (development plan task 4.1). Cloud-neutral.
// The hub reads it over a service binding (src/status-service.js) and shows it beside the practitioner's other clients.
// It says where the work is and who it waits on, by role and count: no names, no code name or matter, no channels,
// reach or findings, no questions' wording. Format triodian.status.v1 (see Triodian/practice-hub README).
// The stage follows the recorded sign-offs of the eight phase gates; the screens check each gate in full.

export const STATUS_FORMAT = 'triodian.status.v1';
const ymd = v => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : null);
const filled = v => !!String(v || '').trim();

/** e: the stored engagement ({ data, updatedAt }) or null. today: 'YYYY-MM-DD'. now: an ISO timestamp. */
export function engagementStatus(e, { today, now } = {}) {
  today = today || new Date().toISOString().slice(0, 10);
  const base = { format: STATUS_FORMAT, app: 'confidentiality', generated: now || new Date().toISOString() };
  const GATES = 8;
  if (!e || !e.data) return { ...base, stage: { label: 'Not started', step: 0, steps: GATES }, openActions: 0, waitingOn: [], nextSignOff: null, nextBoardDate: null, lastActivity: null };
  const d = e.data, en = d.engagement || {}, pr = d.profile || {}, agreed = d.profileAgreed || {}, qs = d.questions || [];
  const live = (d.channels || []).filter(c => !(c.absent && c.absent.on));
  const rev = id => (d.reviews || []).find(r => r && r.point === id) || {};
  const counselSide = en.gcActsAsCounsel ? 'Second approver' : 'Counsel';
  const closed = !!((en.closure || {}).by && (en.closure || {}).disposition);

  // [stage label, met, the sign-off that meets it]
  const gates = [
    ['Set-up', !!((en.briefConfirmed || {}).by && (en.briefConfirmed || {}).on) && filled(pr.privilegeMarking) && filled(pr.codeName) && !!en.documentsRequestedOn, 'The GC confirms the brief'],
    ['The matter profile (R1)', !!(agreed.gcBy && agreed.counselBy), `The GC and ${counselSide.toLowerCase()} agree the profile (R1)`],
    ['The register (R2)', live.length > 0 && rev('R2').result === 'passed', 'The register completeness and content check (R2)'],
    ['Classify and test (R4)', rev('R4').result === 'passed' && filled((d.demonstration || {}).performed), 'Validation (R4) and the five-minute demonstration'],
    ['Counsel', qs.every(q => q.status === 'answered' || (q.status === 'openWithOwner' && q.owner)), 'Counsel answers the open questions'],
    ['Findings and counsel review (R6)', !!rev('R6').on, 'Counsel review (R6)'],
    ['The check (R7)', rev('R7').result === 'complete', 'The check (R7)'],
    ['Annex and closure', !!(en.annexSigned || {}).by && closed, 'Counsel records the closure'],
  ];
  const next = gates.findIndex(g => !g[1]);
  const stage = next < 0 ? { label: 'Closed: working papers dealt with as directed', step: GATES, steps: GATES } : { label: gates[next][0], step: next + 1, steps: GATES };

  // Who it waits on, by role: the sign-offs, questions and check points still open.
  const wait = new Map(), add = (role, n = 1) => { if (n > 0) wait.set(role, (wait.get(role) || 0) + n); };
  if (filled(pr.codeName)) { if (!agreed.gcBy) add('GC'); if (!agreed.counselBy) add(counselSide); }
  add('Counsel', qs.filter(q => q.status !== 'answered').length);
  if (live.length && !filled((d.demonstration || {}).performed)) add('Triodian');
  const points = (d.independentReviewPoints || []).filter(x => x.status === 'open');
  add('Triodian', points.filter(x => !filled(x.response)).length);
  add('Checker', points.filter(x => filled(x.response)).length);
  if (rev('R6').on && !(en.annexSigned || {}).by) add('Method owner');
  if (rev('R7').result === 'complete' && !closed) add('Counsel');
  const waitingOn = [...wait].map(([role, actions]) => ({ role, actions }));

  return { ...base, stage, openActions: waitingOn.reduce((n, w) => n + w.actions, 0), waitingOn,
    nextSignOff: next < 0 ? null : { label: gates[next][2], due: null }, nextBoardDate: null, lastActivity: ymd(e.updatedAt) };
}
