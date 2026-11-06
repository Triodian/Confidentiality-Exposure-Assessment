// Server-side permission check for assessment saves. The rules themselves (deny) are shared with the browser in
// public/shared/rules.js; this file applies them to what actually changed between the stored assessment and the one
// being saved. Rules that depend on who did what (reviewer independence, validation independence, blind review) are
// checked against the stored data. Cloud-neutral: no Cloudflare, AWS or Azure code here.
import { deny, fieldTarget, channelKeyTarget } from './rules.js';
import { withVersions } from './versions.js';

const IDRE = /^[A-Za-z0-9_.:-]{1,64}$/;

export function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const same = (a, b) => stable(a) === stable(b);
/** Shown by the browser only (notes from loading an older file, the time a file was saved); never stored. */
const CLIENT_ONLY = ['loadNotes', 'savedAt', 'note', 'blind'];
const keysOf = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])];
const byKey = (arr, k) => new Map((Array.isArray(arr) ? arr : []).filter(x => x && typeof x === 'object').map(x => [String(x[k]), x]));
const isPrefix = (oldArr, newArr, ignore = []) => {
  if (!Array.isArray(newArr) || newArr.length < oldArr.length) return false;
  const strip = x => { if (!x || typeof x !== 'object') return x; const c = { ...x }; ignore.forEach(k => delete c[k]); return c; };
  return oldArr.every((x, i) => same(strip(x), strip(newArr[i])));
};

/** The assessment's people list comes from the user list: everyone with at least one engagement role. */
export function buildPeople(users) {
  return users.filter(u => (u.roles || []).length).map(u => ({ id: u.id, name: u.name || u.email, organisation: u.organisation || '', roles: u.roles.slice(), active: !!u.active }));
}

/** Empty values a blank channel starts with: '', null, false, [], {} and anything made only of those. */
const deepEmpty = v => v == null || v === '' || v === false || (Array.isArray(v) ? v.every(deepEmpty) : typeof v === 'object' ? Object.values(v).every(deepEmpty) : false);
const REVIEW_POINTS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];
/** Practitioner branding (development plan task 0.4): a firm, a line under it and a PNG logo of 100 KB at most.
 *  The browser applies the same rule in public/brand.js. Returns a message, or '' when it is sound. */
function practitionerError(p) {
  if (p == null) return '';
  if (typeof p !== 'object' || Array.isArray(p)) return 'The practitioner details are not valid.';
  if (p.firm != null && (typeof p.firm !== 'string' || p.firm.length > 200)) return 'The practitioner firm must be text of 200 characters or less.';
  if (p.line != null && (typeof p.line !== 'string' || p.line.length > 300)) return 'The line under the firm must be text of 300 characters or less.';
  if (p.logo != null && p.logo !== '') {
    const m = typeof p.logo === 'string' && /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(p.logo);
    if (!m || !m[1].startsWith('iVBORw0KGgo')) return 'The logo must be a PNG image.';
    if (Math.floor(m[1].length * 3 / 4) > 100 * 1024 + 2) return 'The logo must be 100 KB or less.';
  }
  return '';
}

/**
 * The shape every save must have. Each keyed list holds objects with a valid, unique key, so that one item
 * cannot be listed twice. Returns a message, or '' when the shape is sound.
 */
export function structureError(d) {
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  if (!isObj(d.engagement)) return 'The engagement details are missing.';
  { const pe = practitionerError(d.engagement.practitioner); if (pe) return pe; }
  if (d.profile != null && !isObj(d.profile)) return 'The deal profile is not valid.';
  const lists = { channels: 'id', questions: 'ref', reviews: 'point', independentReviewPoints: 'ref', exceptions: 'ref', documents: null, interviews: null, findings: null, history: null, versions: null };
  for (const [name, key] of Object.entries(lists)) {
    const v = d[name];
    if (v == null) continue;
    if (!Array.isArray(v)) return `"${name}" must be a list.`;
    const seen = new Set();
    for (let i = 0; i < v.length; i++) {
      const x = v[i];
      if (!isObj(x)) return `Item ${i + 1} of "${name}" is not valid.`;
      if (!key) continue;
      const k = x[key];
      if (typeof k !== 'string' || !IDRE.test(k)) return `Item ${i + 1} of "${name}" has no valid ${key}.`;
      if (name === 'reviews' && !REVIEW_POINTS.includes(k)) return `"${k}" is not a review point.`;
      if (seen.has(k)) return `"${k}" appears twice in "${name}".`;
      seen.add(k);
    }
  }
  for (const name of ['folders', 'advisers', 'tools']) {
    const v = (d.profile || {})[name];
    if (v != null && !Array.isArray(v)) return `The profile's "${name}" must be a list.`;
    for (const x of v || []) if (!isObj(x)) return `An item in the profile's "${name}" is not valid.`;
  }
  for (const e of d.channels || []) {
    if (e.fields != null && !isObj(e.fields)) return `The fields of ${e.id} are not valid.`;
    for (const [n, f] of Object.entries(e.fields || {})) {
      if (!/^\d+$/.test(n) || +n < 1 || +n > 25) return `${e.id} has an unknown field "${n}".`;
      if (f != null && !isObj(f)) return `Field ${n} of ${e.id} is not valid.`;
    }
    if (e.peerReview != null && !isObj(e.peerReview)) return `The classification review of ${e.id} is not valid.`;
  }
  return '';
}

/**
 * Checks a save. oldData: the stored assessment (null if none). newData: what the browser sent.
 * user: { id, email, name, roles[], isAdmin }. users: all users (for the people list).
 * Returns { error, status } or { data, newVersion } with the assessment to store.
 */
export function checkSave(oldData, newData, user, users) {
  if (!newData || typeof newData !== 'object' || newData.schema !== 'triodian.cea.v1') return { status: 400, error: 'Not an AI Confidentiality Exposure Assessment.' };
  const shape = structureError(newData);
  if (shape) return { status: 400, error: shape + ' Nothing was saved.' };
  const data = JSON.parse(JSON.stringify(newData));
  data.engagement.example = false;
  data.engagement.autosave = false;
  CLIENT_ONLY.forEach(k => { delete data[k]; });
  if (oldData) data.engagement.id = oldData.engagement.id;
  else if (typeof data.engagement.id !== 'string' || !IDRE.test(data.engagement.id)) return { status: 400, error: 'The assessment id is not valid.' };
  data.people = buildPeople(users);

  const refusals = [];
  const need = (t, x) => { const why = deny(t, user, oldData, x); if (why) refusals.push(why); };
  const needOneOf = (ts, x) => { if (!ts.some(t => !deny(t, user, oldData, x))) refusals.push(deny(ts[0], user, oldData, x)); };

  if (!oldData) {
    need('setup');
  } else {
    const o = oldData, n = data;
    // engagement details
    keysOf(o.engagement, n.engagement).forEach(k => {
      if (['id', 'example', 'autosave'].includes(k) || same(o.engagement[k], n.engagement[k])) return;
      if (k === 'legalPhrases' || k === 'productPhrases') return need('r5');
      if (k === 'annexText') return need('annex');
      if (k === 'annexSigned') { need('sign'); if (n.engagement.annexSigned && n.engagement.annexSigned.by && n.engagement.annexSigned.by !== user.id) refusals.push('The annex is signed in your own name only.'); return; }
      if (k === 'closure') { need('close'); if (n.engagement.closure && n.engagement.closure.by && n.engagement.closure.by !== user.id) refusals.push('The closure is recorded in your own name only.'); return; }
      need('setup');
    });
    // the deal profile
    if (!same(o.profile, n.profile)) need('profile');
    // profile agreement (R1)
    const oa = o.profileAgreed || {}, na = n.profileAgreed || {};
    if (!same(oa.gcBy, na.gcBy) || !same(oa.gcOn, na.gcOn)) { need('agreeGC'); if (na.gcBy && na.gcBy !== user.id) refusals.push('The GC’s agreement is recorded in your own name only.'); }
    if (!same(oa.counselBy, na.counselBy) || !same(oa.counselOn, na.counselOn)) { need('agreeCounsel'); if (na.counselBy && na.counselBy !== user.id) refusals.push('Counsel’s agreement is recorded in your own name only.'); }
    // set-up collections
    ['documents', 'interviews'].forEach(k => { if (!same(o[k], n[k])) need('setup'); });
    if (!same(o.demonstration, n.demonstration)) need('tri');
    // channels
    const oE = byKey(o.channels, 'id'), nE = byKey(n.channels, 'id');
    keysOf(Object.fromEntries(oE), Object.fromEntries(nE)).forEach(id => {
      let a = oE.get(id); const b = nE.get(id);
      if (!b) return need('facts', a);
      // A new channel is checked as an edit of a blank one, so it cannot arrive already classified or reviewed.
      if (!a) { need('facts'); a = { id: b.id, fields: {} }; }
      keysOf(a, b).forEach(k => {
        if (same(a[k], b[k]) || (!(k in a) && deepEmpty(b[k]))) return;
        if (k === 'fields') {
          keysOf(a.fields, b.fields).forEach(f => { const fa = (a.fields || {})[f], fb = (b.fields || {})[f]; if (!same(fa, fb) && !(fa == null && deepEmpty(fb))) need(fieldTarget(+f), a); });
          return;
        }
        need(channelKeyTarget(k, b), a);
        if (k === 'classifiedBy' && b.classifiedBy && b.classifiedBy !== user.id) refusals.push('A classification is recorded in your own name only.');
        // Who classified a channel, and who reviewed it, can be changed only by the method owner: otherwise a
        // classifier could clear their own name and then review their own work.
        if (k === 'classifiedBy' && a.classifiedBy && !(user.roles || []).includes('methodOwner')) refusals.push('Only the method owner can change who classified a channel.');
        if (k === 'peerReview' && (a.peerReview || {}).personId && (b.peerReview || {}).personId !== a.peerReview.personId && !(user.roles || []).includes('methodOwner')) refusals.push('Only the method owner can change who reviewed a channel.');
        if (k === 'reachConfirmedBy' && b.reachConfirmedBy && b.reachConfirmedBy !== user.id) refusals.push('Reach is confirmed in your own name only.');
        if (k === 'peerReview' && (b.peerReview || {}).personId && b.peerReview.personId !== user.id && !same((a.peerReview || {}).personId, b.peerReview.personId)) refusals.push('A classification review is recorded in your own name only.');
      });
    });
    // questions to counsel
    const oQ = byKey(o.questions, 'ref'), nQ = byKey(n.questions, 'ref');
    keysOf(Object.fromEntries(oQ), Object.fromEntries(nQ)).forEach(ref => {
      const a = oQ.get(ref), b = nQ.get(ref);
      if (!a || !b) return need('ask');
      keysOf(a, b).forEach(k => {
        if (same(a[k], b[k])) return;
        if (['response', 'respondedOn', 'enteredBy', 'transcribedBy', 'reach', 'requiredRung'].includes(k) || (k === 'status' && b.status === 'answered')) return need('answer');
        if (k === 'owner' || (k === 'status' && b.status === 'openWithOwner')) return need('tri');
        need('ask');
      });
    });
    // review points R1 to R7
    const oR = byKey(o.reviews, 'point'), nR = byKey(n.reviews, 'point');
    const RT = { R1: ['agreeGC', 'agreeCounsel'], R2: ['r2'], R3: ['peer'], R4: ['r4'], R5: ['r5'], R6: ['r6'], R7: ['r7'] };
    keysOf(Object.fromEntries(oR), Object.fromEntries(nR)).forEach(p => {
      const a = oR.get(p) || {}, b = nR.get(p) || {};
      if (same(a, b) || (!oR.has(p) && deepEmpty({ ...b, point: '' }))) return;
      needOneOf(RT[p] || ['tri']);
      if (b.by && b.by !== a.by && b.by !== user.id) refusals.push(`${p} is recorded in your own name only.`);
    });
    if (!same(o.r5Cleared, n.r5Cleared)) need('r5');
    // Triodian's records
    ['findings', 'exceptions'].forEach(k => { if (!same(o[k], n[k])) need('tri'); });
    // check points
    const oI = byKey(o.independentReviewPoints, 'ref'), nI = byKey(n.independentReviewPoints, 'ref');
    keysOf(Object.fromEntries(oI), Object.fromEntries(nI)).forEach(ref => {
      const a = oI.get(ref), b = nI.get(ref);
      if (!a || !b) return need('irLog');
      keysOf(a, b).forEach(k => { if (!same(a[k], b[k])) need(k === 'response' ? 'irRespond' : k === 'status' ? 'irClose' : 'irLog'); });
    });
    // anything else at the top level is set-up
    keysOf(o, n).forEach(k => {
      if (CLIENT_ONLY.includes(k)) return;
      if (['schema', 'engagement', 'profile', 'profileAgreed', 'people', 'documents', 'interviews', 'demonstration', 'channels', 'questions', 'reviews', 'r5Cleared', 'findings', 'exceptions', 'independentReviewPoints', 'versions', 'previous', 'history'].includes(k)) return;
      if (!same(o[k], n[k])) need('setup');
    });
    // history is append only; new entries are signed by the server
    if (!isPrefix(o.history || [], n.history, ['by'])) return { status: 409, error: 'The change history does not match the saved assessment. Reload to get the latest version.' };
    n.history = (o.history || []).concat((n.history || []).slice((o.history || []).length));
  }

  if (refusals.length) return { status: 403, error: [...new Set(refusals)].slice(0, 3).join(' ') + ' Nothing was saved.' };
  const start = oldData ? (oldData.history || []).length : 0;
  data.history = (data.history || []).map((h, i) => (i >= start && h && typeof h === 'object' ? { ...h, by: user.name || user.email } : h));
  data.previous = oldData ? (oldData.previous || null) : null;
  const newVersion = withVersions(oldData, data, user.name || user.email, new Date().toISOString());
  return { data, newVersion };
}

export { deny };
