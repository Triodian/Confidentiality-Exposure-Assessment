/* AI Confidentiality Exposure Assessment · Triodian
   The rules engine: pure functions over the assessment (S) and the content file (C). No DOM, no network.
   Loaded by the app (window.CEARules) and by the unit tests (module.exports). Every number the screens and
   outputs show comes from here: reach, the indicative rung, the ladder, the obtainability result, confidence,
   the exposure code, the finding, the gates and the legal-line, product and deal-content hits. */
(function (root) {
'use strict';

const RE = ['R1', 'R2', 'R3', 'R4'], IC = ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'], NV = ['N0', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6'], XC = ['X1', 'X2', 'X3', 'X4'], CONF = ['low', 'medium', 'high'];
const KINDS = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'];
const FACTS_N = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], CLASS_N = [15, 16, 17], EVID_N = [18, 19, 20, 21, 22];
const rk = (a, v) => a.indexOf(v);
const IDRE = /^[A-Za-z0-9_.:-]{1,64}$/;

/** create(C, getS, opts) → the rules bound to one content file and one state getter. opts.today() → 'YYYY-MM-DD'. */
function create(C, getS, opts) {
  opts = opts || {};
  const S = () => getS();
  const today = opts.today || (() => new Date().toISOString().slice(0, 10));
  const uid = () => Math.random().toString(36).slice(2, 9);

  /* ---------- model ---------- */
  function newAssessment() {
    return {
      schema: 'triodian.cea.v1',
      engagement: { id: uid(), company: '', reference: '', counselFirm: 'DLC Legal', startDate: '', briefConfirmed: { by: '', on: '', ref: '' }, documentsRequestedOn: '',
        checkerMode: 'validation', checkerPersonId: '', checkerOrganisation: '', example: false, autosave: false,
        legalPhrases: C.legalPhrases.slice(), productPhrases: C.productPhrases.slice(), annexText: {}, annexSigned: { by: '', on: '' }, closure: { by: '', on: '', disposition: '', note: '' } },
      profile: { codeName: '', stage: '', teamCounts: '', folders: [], advisers: [], tools: [], devicePolicy: '', privilegeMarking: '', counselTurnaround: 2 },
      profileAgreed: { gcBy: '', gcOn: '', counselBy: '', counselOn: '' },
      people: [],
      documents: C.documents.map(d => ({ id: d.ref, ref: d.ref, title: d.name, status: '', date: '' })),
      interviews: C.interviews.map((v, i) => ({ id: 'IV-' + (i + 1), who: v.who, date: '', notesRef: '' })),
      channels: [], questions: [], findings: [],
      reviews: C.reviews.map(r => ({ point: r.id, by: '', on: '', result: '', notes: '' })),
      demonstration: { performed: '', on: '', text: '', controlsPassed: '', controlsStopped: '', observers: '' },
      exceptions: [], independentReviewPoints: [], r5Cleared: {}, versions: [], previous: null, history: []
    };
  }
  function newChannel(kind, id) {
    const s = S();
    if (!id) { const n = s.channels.reduce((m, e) => Math.max(m, parseInt(String(e.id).slice(3), 10) || 0), 0) + 1; id = 'CH-' + String(n).padStart(2, '0'); }
    const k = C.kinds.find(x => x.code === kind), b = k && /^B\d$/.test(k.boundary) ? k.boundary : '';
    const fields = {};
    if (kind) fields[2] = { value: kind, source: 'framework 2.3', notKnown: false, by: '', on: '' };
    if (b) fields[3] = { value: b, source: 'framework 2.3', notKnown: false, by: '', on: '' };
    return { id, fields, adviserId: '', absent: { on: false, reason: '' }, reachTests: [0, 1, 2].map(() => ({ answer: null, source: '' })), reachOverrideReason: '', adjustmentReason: '',
      classifiedBy: '', reviewedBy: '', reachConfirmedBy: '', reachConfirmedOn: '', obtainability: { start: '', rungs: {} }, confChosen: '', confRaiseReason: '',
      peerReview: { personId: '', reach: '', differs: false, resolution: '', on: '' }, notDeterminable: { on: false, question: '', who: '', since: '' }, owner: '', horizon: '', movedTo: '' };
  }

  /* ---------- field helpers ---------- */
  const FLD = n => { const f = C.fields.find(x => x.n === +n); return f || { n: +n, name: 'Unknown field ' + n, format: '', kind: 'text', tab: 'facts', missing: true }; };
  const fv = (e, n) => { const f = e && e.fields && e.fields[n]; return f && !f.notKnown ? (f.value == null ? '' : f.value) : ''; };
  const kindOf = e => fv(e, 2);
  const boundaryOf = e => fv(e, 3);
  const notKnownCount = e => Object.values(e.fields || {}).filter(f => f && f.notKnown).length;
  const isAbsent = e => !!(e.absent && e.absent.on);
  function fieldDone(e, n) {
    n = +n; const f = (e.fields || {})[n];
    if (n === 1 || n === 2) return true;
    if (n === 3) return !!fv(e, 3);
    if (n === 15) return !!fv(e, 15);
    if (n === 17) return !!indicative(e);
    if (n === 21) return obResult(e).done;
    if (n === 22) return obResult(e).none || !!confidence(e);
    if (n === 25) return !!finding(e).type;
    if (!f) return false; if (f.notKnown) return true;
    if (n === 16 || n >= 23) return !!f.value;
    return !!(f.value && String(f.value).trim() && f.source && String(f.source).trim());
  }
  const missingIn = (e, ns) => ns.filter(k => !fieldDone(e, k)).length;

  /* ---------- question 1: reach and information class ---------- */
  /** Reach proposed from the three tests (section 7.2); the highest supported class wins. Falls back to field 8. */
  function proposeReach(e) {
    const t = e.reachTests || [];
    let r = null; const up = x => { if (!r || rk(RE, x) > rk(RE, r)) r = x; };
    if (t[0] && t[0].answer === true) up('R3');
    if (t[1] && t[1].answer === true) up('R2');
    if (t[2] && t[2].answer === true) up('R4');
    if (!r && t.some(x => x && x.answer === false)) r = 'R1';
    if (!r) { const h = fv(e, 8); r = ({ scope: 'R3', paste: 'R1', upload: 'R2', transcription: 'R4', export: 'R2' })[h] || null; }
    return r;
  }
  const reachOf = e => fv(e, 15);
  const classOf = e => fv(e, 16);
  /** Exposure consequence X1 to X4: a technical label for the information the channel can reach (section 8.2). */
  function exposure(e) {
    const c = classOf(e); if (!c) return '';
    const i = rk(IC, c);
    if (i <= 0) return 'X1';
    if (i === 1) return 'X2';
    return fv(e, 4) === 'everyone' ? 'X4' : 'X3';
  }

  /* ---------- question 5: the ladder ---------- */
  /** Indicative rung by the base rule (8.3) with the boundary adjustments. Returns null until reach is set. */
  function indicative(e) {
    const r = reachOf(e); if (!r) return null;
    const b = boundaryOf(e), base = C.baseRule[r];
    if (b === 'B3') return { value: 'N1', basis: 'boundary', adjustment: `Base rule ${base}; B3: nothing above N1 can be produced for a personal estate, so the indicative rung is N1` };
    if (b === 'B2' && rk(NV, base) > rk(NV, 'N4')) return { value: 'N4', basis: 'boundary', adjustment: `Base rule ${base}; B2: capped at N4, the company configures nothing in an adviser’s estate` };
    return { value: base, basis: 'baseRule', adjustment: `Base rule for ${r}: ${base}, no adjustment` };
  }
  /** The rungs tested, from the indicative rung down to N1. */
  function ladder(e) { const ix = indicative(e); if (!ix) return []; const out = []; for (let i = rk(NV, ix.value); i >= 1; i--) out.push(NV[i]); return out; }
  /** At B3 the test asks only whether a direction exists and was acknowledged (T1). */
  const testsFor = e => (boundaryOf(e) === 'B3' ? C.tests.filter(t => t.id === 'T1') : C.tests);
  function obResult(e) {
    const L = ladder(e), R = (e.obtainability || {}).rungs || {}, T = testsFor(e);
    if (!L.length) return { rung: null, done: false, current: null };
    for (const r of L) {
      const t = R[r] || {}; const ans = T.map(x => t[x.id] ? t[x.id].pass : null);
      if (ans.every(a => a === true)) return { rung: r, done: true, current: null };
      if (ans.some(a => a === false)) continue;
      return { rung: null, done: false, current: r };
    }
    return { rung: 'N0', done: true, current: null, none: true };
  }
  const needsRetest = e => { const ix = indicative(e); return !!(ix && e.obtainability && e.obtainability.start && e.obtainability.start !== ix.value); };
  /** Confidence (8.4): high where the export, log sample or attestation has been seen (the T1 source cites a received
      document); medium where documentation describes it (any document reference); low where inferred. Low by default at B2. */
  function proposedConfidence(e) {
    const ob = obResult(e); if (!ob.done || ob.none) return ob.none ? 'low' : '';
    const src = String(((((e.obtainability || {}).rungs || {})[ob.rung] || {}).T1 || {}).source || '');
    const recv = S().documents.filter(d => d.status === 'received' && d.id && src.toUpperCase().includes(String(d.id).toUpperCase()));
    let c = recv.length ? 'high' : /\bD\d+/i.test(src) ? 'medium' : 'low';
    if (boundaryOf(e) === 'B2') { const f13 = (e.fields || {})[13], attested = f13 && !f13.notKnown && /\bD\d+/i.test(String(f13.source || '')); if (!attested) c = 'low'; }
    return c;
  }
  const confRaisedNoReason = e => { const p = proposedConfidence(e); return !!(p && e.confChosen && rk(CONF, e.confChosen) > rk(CONF, p) && !String(e.confRaiseReason || '').trim()); };
  function confidence(e) { const p = proposedConfidence(e); if (!p) return ''; const ch = e.confChosen; if (!ch || confRaisedNoReason(e)) return p; return ch; }

  /* ---------- findings ---------- */
  /** F5 applies wherever the channel accepts typed or pasted text (section 3.4); nothing deployed reaches N6. */
  const acceptsText = e => !['transcription', 'export'].includes(fv(e, 8)) && ['R1', 'R2', 'R3'].includes(reachOf(e) || 'R1');
  const hasF5 = e => !isAbsent(e) && acceptsText(e) && fv(e, 18) !== 'N6';
  const qOrder = q => (q.respondedOn || '') + String(S().questions.indexOf(q)).padStart(5, '0');
  const newest = list => list.slice().sort((a, b) => qOrder(b).localeCompare(qOrder(a)))[0];
  /** F3 follows from counsel's explicit determination of no reasonable reach. The newest answer wins. */
  function reachDetermination(e) {
    const qs = S().questions.filter(q => q.channelId === e.id && q.status === 'answered' && q.reach);
    const q = newest(qs); return q ? { ref: q.ref, none: q.reach === 'none', basis: q.response } : null;
  }
  function finding(e) {
    if (!e) return { type: null, label: 'No channel' };
    if (isAbsent(e)) return { type: null, label: 'Considered, absent', absent: true };
    if (e.notDeterminable && e.notDeterminable.on) return { type: 'F4', question: e.notDeterminable.question, who: e.notDeterminable.who, f5: false };
    const rd = reachDetermination(e); if (rd && rd.none) return { type: 'F3', ref: rd.ref, basis: rd.basis, f5: false };
    const req = fv(e, 24); if (!req) return { type: null, label: 'Awaiting counsel', awaiting: true, f5: hasF5(e) };
    const ob = obResult(e); if (!ob.done) return { type: null, label: 'Awaiting obtainability test', awaiting: true, f5: hasF5(e) };
    const gap = rk(NV, req) - rk(NV, ob.rung), x = exposure(e) || 'X1';
    if (gap <= 0) return { type: 'F1', required: req, obtainable: ob.rung, gap: 0, exposure: x, f5: hasF5(e), owner: e.owner || '' };
    const g = gap >= 3 ? 'g3' : 'g' + gap, priority = C.matrix[g][x];
    const R = (e.obtainability || {}).rungs || {}, tested = R[req] ? req : ladder(e)[0];
    const ft = testsFor(e).find(t => R[tested] && R[tested][t.id] && R[tested][t.id].pass === false);
    const failedTest = ft ? ft.id : 'T1';
    const route = C.routes[failedTest === 'T1' ? 'T1:' + (boundaryOf(e) || 'B1') : failedTest] || C.routes['T1:B1'];
    return { type: 'F2', required: req, obtainable: ob.rung, gap, exposure: x, priority, failedTest, route: route.route, owner: e.owner || route.owner, step: route.step, f5: hasF5(e) };
  }
  const findingCls = t => ({ F1: 'b-green', F2: 'b-red', F3: 'b-slate', F4: 'b-ochre' }[t] || 'b-grey');
  const findingName = t => (C.findings.find(f => f.code === t) || {}).name || '';
  /** The 90-day plan: every F2 step by owner, ordered by priority then gap (section 9.3). Week from priority. */
  function planSteps() {
    const P = { High: 0, Medium: 1, Low: 2 }, W = { High: 'Weeks 1 to 4', Medium: 'Weeks 4 to 8', Low: 'Weeks 8 to 12' };
    return S().channels.map(e => ({ e, f: finding(e) })).filter(x => x.f.type === 'F2').sort((a, b) => (P[a.f.priority] - P[b.f.priority]) || (b.f.gap - a.f.gap))
      .map(x => ({ channel: x.e.id, kind: kindOf(x.e), boundary: boundaryOf(x.e), priority: x.f.priority, gap: x.f.gap, failedTest: x.f.failedTest, route: x.f.route, owner: x.f.owner, step: x.f.step, week: W[x.f.priority] || '', produces: x.f.required + ' ' + rungName(x.f.required) }));
  }
  /** The residual gap, by count and by the information classes it reaches (CD4). */
  function f5Summary() {
    const es = S().channels.filter(e => hasF5(e));
    const classes = [...new Set(es.map(classOf).filter(Boolean))].sort();
    const kinds = {}; es.forEach(e => { const k = kindOf(e) || '?'; kinds[k] = (kinds[k] || 0) + 1; });
    return { count: es.length, channels: es.map(e => e.id), classes, kinds, horizons: [...new Set(es.map(e => e.horizon).filter(Boolean))] };
  }

  /* ---------- names ---------- */
  const rungName = c => (C.rungs.find(t => t.code === c) || {}).name || '';
  const reachName = c => (C.reaches.find(t => t.code === c) || {}).name || '';
  const className = c => (C.infoClasses.find(t => t.code === c) || {}).name || '';
  const kindName = c => (C.kinds.find(t => t.code === c) || {}).name || '';
  const exposureName = c => (C.exposures.find(t => t.code === c) || {}).name || '';
  const codeName = c => { const all = [].concat(C.rungs, C.reaches, C.infoClasses, C.findings, C.boundaries, C.exposures, C.kinds); return (all.find(t => t.code === c) || {}).name || ''; };
  const codeOpt = c => codeName(c) ? c + ' ' + codeName(c) : String(c || '');
  const optL = v => C.optLabels[v] || v;

  /* ---------- gates ---------- */
  const rev = id => S().reviews.find(r => r.point === id) || { point: id, by: '', on: '', result: '', notes: '' };
  const considered = () => { const ks = new Set(S().channels.map(kindOf).filter(Boolean)); return Object.fromEntries(KINDS.map(k => [k, ks.has(k)])); };
  const live = () => S().channels.filter(e => !isAbsent(e));
  function gates() {
    const s = S(), e = s.engagement, p = s.profile || {}, g = [];
    g[0] = [['Brief confirmed by the GC', !!(e.briefConfirmed.on && e.briefConfirmed.by)], ['Privilege marking entered', !!String(p.privilegeMarking || '').trim()], ['Deal code name chosen', !!String(p.codeName || '').trim()], ['Document request issued', !!e.documentsRequestedOn]];
    const cv = considered();
    g[1] = [['Profile agreed by the GC and by counsel (R1)', !!(s.profileAgreed.gcBy && s.profileAgreed.counselBy)], ['Every channel kind K1 to K7 considered: a channel entered, or recorded as absent with the reason', KINDS.every(k => cv[k])]];
    const es = live(), ab = s.channels.filter(isAbsent);
    g[2] = [['At least one channel', es.length > 0], ['Fields 1 to 14 filled in or marked not known, each value with a source (R2)', es.length > 0 && es.every(x => FACTS_N.every(n => fieldDone(x, n)))], ['Every absent channel has a reason', ab.every(x => String(x.absent.reason || '').trim())], ['No broken references', brokenRefs().filter(x => !x.info).length === 0]];
    const cl = es.filter(x => !(x.notDeterminable && x.notDeterminable.on));
    g[3] = [['Fields 15 to 22 complete', cl.length > 0 && cl.every(x => [15, 16, 17, 18, 19, 20, 21, 22].every(n => fieldDone(x, n)))], ['R3 (classification review) recorded for every classified channel, differences resolved', cl.length > 0 && cl.every(x => x.peerReview.reach && (!x.peerReview.differs || String(x.peerReview.resolution || '').trim()))], ['R4 (validation) passed', rev('R4').result === 'passed'], ['Five-minute demonstration recorded: performed or not', !!(s.demonstration && s.demonstration.performed)]];
    g[4] = [['Every question to counsel answered, or left open with a named owner', s.questions.every(q => q.status === 'answered' || (q.status === 'openWithOwner' && q.owner))]];
    g[5] = [['Every channel has a finding, or is recorded as F4 or absent', es.length > 0 && s.channels.every(x => { const f = finding(x); return f.type || f.absent; })], ['R5 (legal-line and content check) cleared', r5Clear()], ['R6 (counsel review) recorded', !!rev('R6').on]];
    g[6] = [['R7 (check) complete', rev('R7').result === 'complete']];
    g[7] = [['Technical annex signed', !!(e.annexSigned && e.annexSigned.by)], ['Closure recorded by counsel: working papers archived or destroyed as directed', !!(e.closure && e.closure.by && e.closure.disposition)]];
    return g.map(items => ({ ok: items.every(i => i[1]), items }));
  }
  function brokenRefs() {
    const s = S(), out = [], cid = new Set(s.channels.map(e => e.id)), pid = new Set(s.people.map(p => p.id)), aid = new Set((s.profile.advisers || []).map(a => a.id));
    const add = (item, ref, where) => out.push({ item, ref, where });
    s.channels.forEach(e => {
      Object.keys(e.fields || {}).forEach(k => { if (FLD(k).missing) add(e.id, 'field ' + k, 'Channel'); });
      if (fv(e, 2) && !KINDS.includes(fv(e, 2))) add(e.id, 'kind ' + fv(e, 2), 'Channel');
      if (e.adviserId && !aid.has(e.adviserId)) add(e.id, 'adviser ' + e.adviserId, 'Channel');
      [['classifiedBy', 'Classifier'], ['reviewedBy', 'Reviewer']].forEach(([k, w]) => { if (e[k] && !pid.has(e[k])) add(e.id, 'person ' + e[k], w); });
      if (e.peerReview.personId && !pid.has(e.peerReview.personId)) add(e.id, 'person ' + e.peerReview.personId, 'Classification reviewer');
      if (e.movedTo && !cid.has(e.movedTo)) add(e.id, 'channel ' + e.movedTo, 'Moved to K5');
    });
    s.questions.forEach(q => { if (q.channelId && !cid.has(q.channelId)) add(q.ref, 'channel ' + q.channelId, 'Question to counsel'); if (q.owner && !pid.has(q.owner)) add(q.ref, 'person ' + q.owner, 'Question owner'); if (q.question5 === '' || q.question5 == null) add(q.ref, 'question number missing', 'Question to counsel'); });
    (s.loadNotes || []).forEach(n => out.push(Object.assign({ info: true }, n)));
    return out;
  }

  /* ---------- R5: legal line, product names and deal content ---------- */
  /** Every free-text value in the assessment, with where it came from. Outputs are scanned separately for fixed text. */
  function textSources() {
    const s = S(), src = [], add = (id, label, t) => { if (t != null && String(t).trim()) src.push({ id, label, text: String(t) }); };
    s.channels.forEach(e => { Object.entries(e.fields || {}).forEach(([n, f]) => { if (!f) return; add(`${e.id}.f${n}`, `${e.id} field ${n}`, f.value); add(`${e.id}.f${n}.d`, `${e.id} field ${n} detail`, f.detail); add(`${e.id}.f${n}.s`, `${e.id} field ${n} source`, f.source); });
      add(e.id + '.override', e.id + ' reach override reason', e.reachOverrideReason); add(e.id + '.adj', e.id + ' adjustment reason', e.adjustmentReason); add(e.id + '.raise', e.id + ' confidence reason', e.confRaiseReason); add(e.id + '.ndq', e.id + ' F4 question', (e.notDeterminable || {}).question); add(e.id + '.ndw', e.id + ' F4 who', (e.notDeterminable || {}).who); add(e.id + '.res', e.id + ' R3 resolution', (e.peerReview || {}).resolution); add(e.id + '.abs', e.id + ' absent reason', (e.absent || {}).reason); add(e.id + '.hor', e.id + ' F5 horizon', e.horizon); add(e.id + '.own', e.id + ' owner', e.owner);
      (e.reachTests || []).forEach((t, j) => add(`${e.id}.rt${j}`, `${e.id} reach test ${j + 1} source`, t && t.source));
      Object.entries((e.obtainability || {}).rungs || {}).forEach(([r, t]) => Object.entries(t || {}).forEach(([k, v]) => add(`${e.id}.${r}.${k}`, `${e.id} ${r} ${k} source`, v && v.source))); });
    s.questions.forEach(q => ['facts', 'question', 'why', 'response'].forEach(k => add(`${q.ref}.${k}`, `${q.ref} ${k}`, q[k])));
    Object.entries(s.engagement.annexText || {}).forEach(([k, v]) => add('annex.' + k, 'Annex section ' + k, v));
    s.exceptions.forEach(x => ['departure', 'reason'].forEach(k => add(`${x.ref}.${k}`, `${x.ref} ${k}`, x[k])));
    s.independentReviewPoints.forEach(x => ['point', 'response', 'section'].forEach(k => add(`${x.ref}.${k}`, `${x.ref} ${k}`, x[k])));
    ['company', 'reference', 'checkerOrganisation', 'counselFirm'].forEach(k => add('eng.' + k, 'Set-up ' + k, s.engagement[k]));
    const p = s.profile || {}; ['codeName', 'teamCounts', 'privilegeMarking'].forEach(k => add('prof.' + k, 'Profile ' + k, p[k]));
    (p.folders || []).forEach((f, i) => { add(`prof.folder.${i}.l`, 'Profile folder ' + (i + 1) + ' location', f.location); add(`prof.folder.${i}.n`, 'Profile folder ' + (i + 1) + ' name', f.name); });
    (p.advisers || []).forEach((a, i) => { add(`prof.adv.${i}.n`, 'Profile adviser ' + (a.id || i + 1), a.name); add(`prof.adv.${i}.r`, 'Profile adviser ' + (a.id || i + 1) + ' role', a.role); });
    (p.tools || []).forEach((t, i) => add(`prof.tool.${i}`, 'Profile tool ' + (i + 1), t.tool));
    const d = s.demonstration || {}; add('demo.text', 'Demonstration text', d.text); add('demo.passed', 'Demonstration controls passed', d.controlsPassed); add('demo.stopped', 'Demonstration controls that stopped it', d.controlsStopped);
    s.documents.forEach(x => add('doc.' + x.id, 'Document ' + x.id, x.title)); s.interviews.forEach(v => { add('iv.' + v.id, 'Interview ' + v.id, v.who); add('ivn.' + v.id, 'Interview ' + v.id + ' notes', v.notesRef); });
    return src;
  }
  const nz = s => String(s).toLowerCase().replace(/\\\|/g, '|').replace(/\s+/g, ' ').trim();
  const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const normLine = s => String(s).replace(/^[\s|>*#-]+/, '').replace(/\s+/g, ' ').trim().slice(0, 240);
  /** Deal-content patterns: money, large figures, percentages, per-share, named counterparties (framework 6.3, 10.4). */
  const contentRes = () => (C.contentPatterns || []).map(p => ({ id: p.id, label: p.label, re: new RegExp(p.re, 'i') }));
  /**
   * Hits for R5. outputsText: [[outputId, rawMarkdown]] from the outputs module (fixed text is scanned there).
   * Three kinds: legal (a legal-line phrase), product (a product name), content (deal content). Each hit is keyed by
   * phrase, source and text hash, so clearing it clears it everywhere the same text appears.
   */
  function hits(outputsText) {
    const s = S(), by = {};
    const legal = (s.engagement.legalPhrases || []).map(p => String(p).trim().toLowerCase()).filter(Boolean);
    const products = (s.engagement.productPhrases || []).map(p => String(p).trim().toLowerCase()).filter(Boolean);
    const cres = contentRes();
    const texts = (outputsText || []).map(([id, raw]) => [id, nz(raw), raw]);
    const srcs = textSources().map(x => Object.assign(x, { n: nz(x.text) })).sort((x, y) => y.n.length - x.n.length);
    const put = (kind, phrase, src, text, outs) => { const key = kind + '|' + phrase + '|' + src.id + '|' + hash(text); const h = by[key] = by[key] || { key, kind, phrase, source: src.label, line: String(text).trim().slice(0, 240), outs: [] }; outs.forEach(o => { if (!h.outs.includes(o)) h.outs.push(o); }); };
    srcs.forEach(src => {
      const probe = src.n.slice(0, 80), outs = texts.filter(t => t[1].includes(probe)).map(t => t[0]);
      legal.forEach(p => { if (src.n.includes(p)) put('legal', p, src, src.text, outs); });
      products.forEach(p => { if (src.n.includes(p)) put('product', p, src, src.text, outs); });
      cres.forEach(c => { const m = c.re.exec(src.text); if (m) put('content', c.label, src, src.text, outs); });
    });
    texts.forEach(([oid, , raw]) => raw.split('\n').forEach(line => {
      let rest = nz(line); if (!legal.some(p => rest.includes(p)) && !products.some(p => rest.includes(p))) return;
      srcs.forEach(x => { if (x.n && rest.includes(x.n)) rest = rest.split(x.n).join(' '); });
      legal.forEach(p => { if (rest.includes(p)) put('legal', p, { id: 'fixed', label: 'Fixed text' }, normLine(line), [oid]); });
      products.forEach(p => { if (rest.includes(p)) put('product', p, { id: 'fixed', label: 'Fixed text' }, normLine(line), [oid]); });
    }));
    return Object.values(by).map(h => Object.assign(h, { cleared: !!s.r5Cleared[h.key] }));
  }
  let hitsProvider = () => [];
  const setHitsProvider = fn => { hitsProvider = fn; };
  const legalHits = () => hitsProvider();
  const r5Clear = () => legalHits().every(h => h.cleared);

  /* ---------- measures (12.5) ---------- */
  function measures() {
    const s = S(), es = s.channels;
    const cnt = (list, f) => { const o = {}; list.forEach(x => { const k = f(x); if (k) o[k] = (o[k] || 0) + 1; }); return o; };
    const fmt = o => Object.entries(o).map(([k, n]) => `${k}: ${n}`).join(' · ') || '—';
    const byKindB = cnt(es, e => (kindOf(e) || '?') + ' ' + (boundaryOf(e) || '?'));
    const nkByKind = {}; es.forEach(e => { const k = kindOf(e) || '?'; nkByKind[k] = (nkByKind[k] || 0) + notKnownCount(e); });
    const fnd = cnt(es, e => { const f = finding(e); return f.type ? f.type + (f.priority ? ' ' + f.priority : '') : (f.absent ? 'absent' : f.label || ''); });
    const f5 = f5Summary();
    const conf = cnt(es.filter(e => obResult(e).done), e => (obResult(e).rung || '?') + ' ' + (confidence(e) || '?'));
    const ft = {}; es.forEach(e => Object.values((e.obtainability || {}).rungs || {}).forEach(t => C.tests.forEach(k => { if (t[k.id] && t[k.id].pass === false) { const key = k.id + ' at ' + (boundaryOf(e) || '?'); ft[key] = (ft[key] || 0) + 1; } })));
    const steps = cnt(planSteps(), x => x.owner);
    const diffs = es.filter(e => e.peerReview && e.peerReview.differs).length, reviewed = es.filter(e => e.peerReview && e.peerReview.reach).length;
    const q = { sent: s.questions.length, answered: s.questions.filter(x => x.status === 'answered').length, open: s.questions.filter(x => x.status !== 'answered').length };
    return [
      ['Channels by kind and boundary', fmt(byKindB)],
      ['Fields not known, by kind', fmt(nkByKind)],
      ['Findings by type and priority', fmt(fnd)],
      ['F5 count and the information classes it reaches', `${f5.count} of ${es.length} channels · classes ${f5.classes.join(', ') || '—'}`],
      ['Obtainable rungs by confidence', fmt(conf)],
      ['Failed tests by type and boundary', fmt(ft)],
      ['90-day steps by owner', fmt(steps)],
      ['Classifier and reviewer differences', `${diffs} of ${reviewed} reviewed`],
      ['Questions to counsel: sent, answered, open', `${q.sent} sent · ${q.answered} answered · ${q.open} open`],
    ];
  }

  /* ---------- versions (copies of lib/core/versions.js, for the worked example) ---------- */
  function snapshotOf(d) {
    const channels = {};
    (d.channels || []).forEach(e => { const f = {}; Object.entries(e.fields || {}).forEach(([n, x]) => { if (!x) return; const v = x.notKnown ? 'not known' : String(x.value == null ? '' : x.value) + (x.detail ? ' · ' + x.detail : ''); if (v) f[n] = v; });
      [17, 21, 22, 25].forEach(n => { delete f[n]; }); channels[e.id] = { kind: ((e.fields || {})[2] || {}).value || '', f }; });
    const findings = {}; (d.channels || []).forEach(e => { const f = finding(e); if (f.type) findings[e.id] = f.type; });
    return { channels, findings };
  }
  function signOffs(o, n) {
    const rv = (d, p) => ((d && d.reviews) || []).find(r => r && r.point === p) || {}, eng = d => (d && d.engagement) || {}, pa = d => ((d && d.profileAgreed) || {}), out = [];
    if (pa(n).gcBy && pa(n).counselBy && !(pa(o).gcBy && pa(o).counselBy)) out.push('Profile agreed (R1)');
    if (rv(n, 'R6').on && !rv(o, 'R6').on) out.push('Counsel review recorded (R6)');
    if (rv(n, 'R7').result === 'complete' && rv(o, 'R7').result !== 'complete') out.push('Check complete (R7)');
    if ((eng(n).annexSigned || {}).by && !(eng(o).annexSigned || {}).by) out.push('Technical annex signed');
    if ((eng(n).closure || {}).by && !(eng(o).closure || {}).by) out.push('Closure recorded');
    return out;
  }

  /* ---------- file validation and hydration ---------- */
  function capWalk(v, p, E, depth) { depth = depth || 0; if (depth > 14) return E(p, 'nested too deeply'); if (typeof v === 'string') { if (v.length > 10000) E(p, 'longer than 10,000 characters'); } else if (v && typeof v === 'object') Object.keys(v).forEach(k => { if (k.length > 200) E(p, 'a key is longer than 200 characters'); capWalk(v[k], p + '.' + k, E, depth + 1); }); }
  function validateFile(o) {
    const err = [], E = (p, m) => err.push(p + ': ' + m), roles = C.roles.map(r => r.id);
    if (!o || typeof o !== 'object' || Array.isArray(o)) return 'The file is not an object.';
    if (o.schema !== 'triodian.cea.v1') return 'This file is not an AI Confidentiality Exposure Assessment file (expected schema triodian.cea.v1).';
    capWalk(o, 'file', E);
    const isObj = v => v && typeof v === 'object' && !Array.isArray(v), str = (v, p) => { if (v != null && typeof v !== 'string') E(p, 'must be text'); };
    if (!isObj(o.engagement)) E('engagement', 'missing');
    if (o.profile != null && !isObj(o.profile)) E('profile', 'must be an object');
    ['channels', 'questions', 'reviews', 'exceptions', 'independentReviewPoints', 'documents', 'interviews', 'people', 'history', 'versions'].forEach(k => { if (o[k] != null && !Array.isArray(o[k])) E(k, 'must be a list'); });
    (Array.isArray(o.channels) ? o.channels : []).forEach((e, i) => { const p = 'channels[' + i + ']'; if (!isObj(e)) return E(p, 'not an object'); if (e.id != null && e.id !== '' && (typeof e.id !== 'string' || !IDRE.test(e.id))) E(p + '.id', 'not a valid id'); if (e.fields != null && !isObj(e.fields)) E(p + '.fields', 'must be an object');
      Object.entries(e.fields || {}).forEach(([n, f]) => { if (!/^\d+$/.test(n) || +n < 1 || +n > 25) E(p + '.fields.' + n, 'unknown field'); if (f != null && !isObj(f)) E(p + '.fields.' + n, 'must be an object'); else if (f) { str(f.value, p + '.fields.' + n + '.value'); str(f.source, p + '.fields.' + n + '.source'); } }); });
    (Array.isArray(o.people) ? o.people : []).forEach((x, i) => { if (!isObj(x)) return E('people[' + i + ']', 'not an object'); (Array.isArray(x.roles) ? x.roles : []).forEach(r => { if (!roles.includes(r)) E('people[' + i + '].roles', 'unknown role ' + r); }); });
    (Array.isArray(o.reviews) ? o.reviews : []).forEach((x, i) => { if (!isObj(x) || !C.reviews.some(r => r.id === x.point)) E('reviews[' + i + ']', 'not a review point'); });
    return err.length ? 'The file could not be loaded: ' + err.slice(0, 5).join('; ') + (err.length > 5 ? '; and ' + (err.length - 5) + ' more' : '') : '';
  }
  function hydrate(o) {
    const why = validateFile(o); if (why) throw new Error(why);
    const d = newAssessment(), m = {};
    Object.keys(d).forEach(k => { const v = o[k], dv = d[k]; m[k] = v == null ? dv : Array.isArray(dv) ? (Array.isArray(v) ? v : dv) : dv && typeof dv === 'object' ? (v && typeof v === 'object' && !Array.isArray(v) ? Object.assign({}, dv, v) : dv) : v; });
    m.engagement.briefConfirmed = Object.assign({ by: '', on: '', ref: '' }, m.engagement.briefConfirmed); m.engagement.annexSigned = Object.assign({ by: '', on: '' }, m.engagement.annexSigned); m.engagement.closure = Object.assign({ by: '', on: '', disposition: '', note: '' }, m.engagement.closure);
    if (!Array.isArray(m.engagement.legalPhrases)) m.engagement.legalPhrases = C.legalPhrases.slice();
    if (!Array.isArray(m.engagement.productPhrases)) m.engagement.productPhrases = C.productPhrases.slice();
    ['folders', 'advisers', 'tools'].forEach(k => { if (!Array.isArray(m.profile[k])) m.profile[k] = []; });
    m.people = m.people.map(p => Object.assign({ id: 'p' + uid(), name: '', organisation: '', roles: [] }, p, { roles: Array.isArray(p.roles) ? p.roles : [] }));
    m.questions = m.questions.map(q => Object.assign({ ref: '', channelId: '', question5: '', targetField: '', facts: '', question: '', why: '', sentOn: '', response: '', respondedOn: '', status: 'open', owner: '', reach: '', requiredRung: '' }, q));
    m.loadNotes = []; const used = new Set(m.channels.map(e => e && e.id).filter(Boolean)); let nx = [...used].reduce((mx, id) => Math.max(mx, parseInt(String(id).slice(3), 10) || 0), 0);
    m.channels.forEach(e => { if (!e.id) { do { nx++; } while (used.has('CH-' + String(nx).padStart(2, '0'))); e.id = 'CH-' + String(nx).padStart(2, '0'); used.add(e.id); m.loadNotes.push({ item: e.id, ref: 'id assigned on load', where: 'Channel' }); } });
    m.channels = m.channels.map(e => { const b = newChannel('', e.id), x = Object.assign(b, e);
      x.fields = e.fields && typeof e.fields === 'object' ? e.fields : {}; x.peerReview = Object.assign({ personId: '', reach: '', differs: false, resolution: '', on: '' }, e.peerReview); x.obtainability = Object.assign({ start: '', rungs: {} }, e.obtainability); x.obtainability.rungs = x.obtainability.rungs || {};
      x.notDeterminable = Object.assign({ on: false, question: '', who: '', since: '' }, e.notDeterminable); x.absent = Object.assign({ on: false, reason: '' }, e.absent); x.reachTests = Array.isArray(e.reachTests) && e.reachTests.length === 3 ? e.reachTests.map(t => Object.assign({ answer: null, source: '' }, t)) : b.reachTests;
      delete x.indicative; delete x.flags; delete x.confidence; return x; });
    m.reviews = C.reviews.map(r => Object.assign({ point: r.id, by: '', on: '', result: '', notes: '' }, (o.reviews || []).find(x => x.point === r.id)));
    m.demonstration = Object.assign({ performed: '', on: '', text: '', controlsPassed: '', controlsStopped: '', observers: '' }, o.demonstration);
    m.findings = [];
    return m;
  }

  return { RE, IC, NV, XC, CONF, KINDS, FACTS_N, CLASS_N, EVID_N, rk, newAssessment, newChannel, FLD, fv, kindOf, boundaryOf, notKnownCount, isAbsent, fieldDone, missingIn,
    proposeReach, reachOf, classOf, exposure, indicative, ladder, testsFor, obResult, needsRetest, proposedConfidence, confRaisedNoReason, confidence,
    acceptsText, hasF5, reachDetermination, finding, findingCls, findingName, planSteps, f5Summary, newest,
    rungName, reachName, className, kindName, exposureName, codeName, codeOpt, optL,
    rev, considered, live, gates, brokenRefs, textSources, hits, setHitsProvider, legalHits, r5Clear, measures, snapshotOf, signOffs, validateFile, hydrate, uid, today };
}

const api = { create };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.CEARules = api;
})(typeof window !== 'undefined' ? window : globalThis);
