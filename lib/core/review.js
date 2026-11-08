// Another matter: keep the closed assessment as a read-only record and start the next one from it.
// A matter assessment is for one transaction, so almost nothing carries: the engagement details, the people, the
// company's sanctioned tools and device policy (P6, P7, marked for checking), the document and interview lists.
// Counsel's closure direction (archive or destroy) decides whether the closed assessment is kept at all.

const dLong = ymd => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString('en-AU', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : (ymd || ''); };
const rev = (d, p) => ((d && d.reviews) || []).find(r => r && r.point === p) || {};

/** Closed: the check (R7) is complete and counsel has recorded the closure. */
export function isClosed(data) {
  return rev(data, 'R7').result === 'complete' && !!(((data && data.engagement) || {}).closure || {}).by;
}

export const archiveLabel = data => {
  const e = data.engagement || {}, p = data.profile || {}, c = e.closure || {};
  return `${p.codeName || e.company || 'Matter'}${e.reference ? ' · ' + e.reference : ''} · closed ${dLong(c.on || rev(data, 'R7').on)}`.trim();
};

/** Whether counsel directed the working papers to be destroyed rather than archived. */
export const destroyDirected = data => (((data && data.engagement) || {}).closure || {}).disposition === 'destroy';

/** A new assessment for another matter. */
export function nextAssessment(data, newId, actor, now, label) {
  const n = JSON.parse(JSON.stringify(data));
  const e = n.engagement || {}, p = n.profile || {};
  n.engagement = { ...e, id: newId, reference: '', startDate: '', briefConfirmed: { by: '', on: '', ref: '' }, documentsRequestedOn: '',
    annexText: {}, annexSigned: { by: '', on: '' }, closure: { by: '', on: '', disposition: '', note: '' }, example: false, autosave: false };
  n.profile = { matterType: p.matterType || 'deal', codeName: '', stage: '', teamCounts: '', folders: [], advisers: [], tools: (p.tools || []).map(t => ({ ...t, carried: true })), devicePolicy: p.devicePolicy || '', privilegeMarking: '', counselTurnaround: p.counselTurnaround || 2, carried: !!(p.tools || []).length || !!p.devicePolicy };
  n.profileAgreed = { gcBy: '', gcOn: '', counselBy: '', counselOn: '' };
  n.documents = (n.documents || []).map(d => ({ ...d, status: '', date: '' }));
  n.interviews = (n.interviews || []).map(v => ({ ...v, date: '', notesRef: '' }));
  n.channels = []; n.questions = []; n.reviews = []; n.r5Cleared = {}; n.findings = []; n.exceptions = []; n.independentReviewPoints = []; n.versions = [];
  n.demonstration = { performed: '', on: '', text: '', controlsPassed: '', controlsStopped: '', observers: '' };
  n.previous = { label, closedOn: ((e.closure || {}).on) || '' };
  n.history = [{ at: now, by: actor, action: 'nextAssessment', target: 'assessment', from: label, to: 'new matter assessment' }];
  return n;
}
