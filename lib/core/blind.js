// Blind re-derivation (R3), enforced on the server.
// Until a classification reviewer records their own reach for a channel, the server does not send them the
// classifier's work on it: the reach and every later field, who classified it, the reach tests, the obtainability
// work, and the values in the change history and in kept versions. When they save, the withheld values are put
// back from the stored assessment, so their save cannot change or lose them.

const HIDDEN_KEYS = ['reachTests', 'reachOverrideReason', 'adjustmentReason', 'classifiedBy', 'reviewedBy', 'reachConfirmedBy', 'reachConfirmedOn', 'obtainability', 'confChosen', 'confRaiseReason',
  'indicative', 'flags', 'confidence', 'notDeterminable', 'owner', 'horizon'];
const FIRST_HIDDEN_FIELD = 15;

/** The channels this user may not yet see the classification of. */
export function blindIds(data, user) {
  if (!data || !user || !(user.roles || []).includes('peer')) return new Set();
  // Only a channel with classification work to hide is blind: a recorded reach, or reach tests already answered.
  const started = e => !!(((e.fields || {})[15] || {}).value) || (e.reachTests || []).some(t => t && t.answer != null);
  return new Set((data.channels || []).filter(e => e && started(e) && e.classifiedBy !== user.id && !((e.peerReview || {}).reach)).map(e => e.id));
}

/** A copy of the assessment with the classifier's work removed from the user's blind channels. */
export function redactFor(data, user) {
  const ids = blindIds(data, user);
  if (!ids.size) return data;
  const d = JSON.parse(JSON.stringify(data));
  d.channels.forEach(e => {
    if (!ids.has(e.id)) return;
    const blank = { reachTests: [0, 0, 0].map(() => ({ answer: null, source: '' })), reachOverrideReason: '', adjustmentReason: '', classifiedBy: '', reviewedBy: '', reachConfirmedBy: '', reachConfirmedOn: '',
      obtainability: { start: '', rungs: {} }, confChosen: '', confRaiseReason: '', notDeterminable: { on: false, question: '', who: '', since: '' }, owner: '', horizon: '' };
    HIDDEN_KEYS.forEach(k => { if (k in blank) e[k] = blank[k]; else delete e[k]; });
    Object.keys(e.fields || {}).forEach(n => { if (+n >= FIRST_HIDDEN_FIELD) delete e.fields[n]; });
    e.peerReview = { ...(e.peerReview || {}), differs: false };
  });
  d.history = (d.history || []).map(h => (h && ids.has(h.target) ? { at: h.at, by: h.by, action: 'hidden', target: h.target } : h));
  d.versions = (d.versions || []).map(v => {
    const s = v && v.snapshot; if (!s || !s.channels) return v;
    const channels = {};
    Object.entries(s.channels).forEach(([id, x]) => { channels[id] = ids.has(id) ? { kind: x.kind, f: Object.fromEntries(Object.entries(x.f || {}).filter(([n]) => +n < FIRST_HIDDEN_FIELD)) } : x; });
    return { ...v, snapshot: { ...s, channels, findings: {} } };
  });
  d.findings = [];
  d.blind = [...ids];
  return d;
}

/**
 * Puts the withheld values back into a save from a user who was sent a redacted copy.
 * Also decides whether a newly recorded reviewer reach differs from the classifier's, which the reviewer could not see.
 * Returns { data, unblinded } where unblinded is true when the save ends blindness on any channel.
 */
export function unredactSave(stored, incoming, user) {
  const ids = blindIds(stored, user);
  delete incoming.blind;
  if (!ids.size || !stored) return { data: incoming, unblinded: false };
  const sE = new Map((stored.channels || []).map(e => [e.id, e]));
  let unblinded = false;
  (incoming.channels || []).forEach(e => {
    if (!e || !ids.has(e.id) || !sE.has(e.id)) return;
    const s = sE.get(e.id);
    HIDDEN_KEYS.forEach(k => { if (k in s) e[k] = JSON.parse(JSON.stringify(s[k])); else delete e[k]; });
    e.fields = e.fields && typeof e.fields === 'object' ? e.fields : {};
    Object.keys(e.fields).forEach(n => { if (+n >= FIRST_HIDDEN_FIELD) delete e.fields[n]; });
    Object.entries(s.fields || {}).forEach(([n, f]) => { if (+n >= FIRST_HIDDEN_FIELD) e.fields[n] = JSON.parse(JSON.stringify(f)); });
    const pr = e.peerReview || {}, was = s.peerReview || {};
    if (pr.reach && !was.reach) {
      const t = ((s.fields || {})[15] || {}).value || '';
      e.peerReview = { ...pr, differs: !!t && pr.reach !== t };
      unblinded = true;
    } else if (e.peerReview) e.peerReview = { ...e.peerReview, differs: !!was.differs };
  });
  const sh = stored.history || [];
  if (Array.isArray(incoming.history)) incoming.history = incoming.history.map((h, i) => (i < sh.length ? sh[i] : h));
  incoming.findings = JSON.parse(JSON.stringify(stored.findings || []));
  return { data: incoming, unblinded };
}
