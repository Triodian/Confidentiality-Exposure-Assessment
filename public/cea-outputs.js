/* AI Confidentiality Exposure Assessment · Triodian
   The outputs: Markdown generated from the assessment for CD1 to CD5, the question set, the closing measures and the
   review pack, plus the worksheet parts A to J, the CD1 CSV and the redline between versions. No DOM. */
(function (root) {
'use strict';

/** create(ctx) → ctx: { C, S: () => state, R: rules, pname(id), dDoc(ymd), fmtAt(iso), today() } */
function create(ctx) {
  const { C, R } = ctx, S = () => ctx.S();
  const tbl = (h, rows) => '| ' + h.join(' | ') + ' |\n| ' + h.map(() => '---').join(' | ') + ' |\n' + rows.map(r => '| ' + r.map(x => String(x == null || x === '' ? '—' : x).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |').join('\n') + '\n\n';
  const fvs = (e, n) => { const f = e.fields[n]; if (!f) return ''; if (f.notKnown) return 'not known'; return (R.codeName(f.value) ? R.codeOpt(f.value) : R.optL(f.value)) + (f.detail ? ' · ' + f.detail : ''); };
  const pname = ctx.pname, dDoc = ctx.dDoc;
  let RAW = false, FORCE = '';
  const FREQ = { N0: 'n/a', N1: 'Once per deal, re-issued on change to the team', N2: 'Once per adviser per deal window', N3: 'Dated export at the start of the window, and on change', N4: 'Retrievable on demand for the window', N5: 'Dated export at the start of the window, re-checked at close', N6: 'Per submission' };

  /* ---------- status ---------- */
  /** An output is final only when R5 is cleared, the phase 5 gate passes and its own gate passes. */
  const finalWhy = o => !R.r5Clear() ? 'Some R5 (legal-line and content check) hits are still open.' : !R.gates()[5].ok ? 'The phase 5 gate is not met.' : !R.gates()[o.gate].ok ? `The phase ${o.gate} gate is not met.` : '';
  const outStatus = o => FORCE === 'draft' ? 'Draft' : FORCE === 'final' ? 'Final' : finalWhy(o) ? 'Draft' : 'Final';
  function mdHead(o) {
    const s = S(), e = s.engagement, p = s.profile, st = RAW ? '' : outStatus(o);
    return `${p.privilegeMarking || '[Privilege marking not recorded in the profile]'}\n\n# ${o.id} · ${o.name}\n\n**${p.codeName || '[Code name]'}**${st ? ' · ' + st : ''} · ${dDoc(ctx.today())}${e.example ? ' · WORKED EXAMPLE, FICTIONAL' : ''}\n\n${e.company || '[Company]'} · ${e.reference || '[reference]'} · prepared for ${e.counselFirm || 'counsel'}\n\n${bothRoles()}`;
  }
  /* Development plan task 0.5: every output records that the GC held both roles, and who gave the second agreement. */
  function bothRoles() {
    const e = S().engagement; if (!e.gcActsAsCounsel) return '';
    return `The GC also acted as counsel in this assessment. The second agreement to the profile (R1) was given by the second approver${e.secondApproverId ? ', ' + (pname(e.secondApproverId) || e.secondApproverId) : ''}.\n\n`;
  }

  /* ---------- pieces ---------- */
  const fieldOut = (e, n) => {
    if (n === 1) return e.id;
    if (n === 17) { const ix = R.indicative(e); return ix ? R.codeOpt(ix.value) : 'not known'; }
    if (n === 21) { const ob = R.obResult(e); return ob.done ? R.codeOpt(ob.rung) : 'not known'; }
    if (n === 22) { const ob = R.obResult(e); return ob.done ? (R.confidence(e) || 'not known') : 'not known'; }
    if (n === 25) { const f = R.finding(e); return (f.type ? f.type + ' ' + R.findingName(f.type) : f.label || 'not yet set') + (f.route ? ' · route: ' + f.route : '') + (f.owner ? ' · owner: ' + f.owner : '') + (f.f5 ? ' · F5 beside it' : ''); }
    return fvs(e, n);
  };
  const fieldSrc = (e, n) => n === 17 ? (R.indicative(e) || {}).adjustment : n === 21 || n === 22 ? 'Obtainability test' : n === 25 ? 'Finding' : (e.fields[n] || {}).source;
  function summaryTable() {
    return tbl(['Channel', 'Kind', 'Boundary', 'Reach', 'Class', 'Indicative', 'Required', 'Obtainable', 'Finding', 'Priority', 'F5'], S().channels.map(e => { const f = R.finding(e), ix = R.indicative(e), ob = R.obResult(e);
      return [e.id, R.kindOf(e), R.boundaryOf(e), R.reachOf(e), R.classOf(e), ix ? ix.value : '', R.fv(e, 24), ob.done ? ob.rung : '', f.type ? R.codeOpt(f.type) : f.label, f.priority || '', f.f5 ? 'yes' : (f.absent ? '' : 'no')]; }));
  }
  function worksheetParts(e) {
    const s = S(), f = R.finding(e), qs = s.questions.filter(q => q.channelId === e.id), P_ = [], ix = R.indicative(e), ob = R.obResult(e), T = R.testsFor(e);
    const add = (k, title, md) => P_.push({ k, title, md: `**${k}. ${title}.** ${md}` });
    const parties = (R.boundaryOf(e) === 'B2' ? 'the adviser' : R.boundaryOf(e) === 'B3' ? 'a member of the deal team or insider list' : 'the company') + (R.fv(e, 6) ? ' → ' + fvs(e, 6) : '');
    add('A', 'Identification', `${e.id} · kind ${R.codeOpt(R.kindOf(e))} · boundary ${R.codeOpt(R.boundaryOf(e))} · preparer: ${pname(e.classifiedBy) || '—'} · reviewer: ${pname((e.peerReview || {}).personId) || '—'}${e.absent && e.absent.on ? ' · considered, absent: ' + (e.absent.reason || '—') : ''}\n\n`);
    add('B', 'Path', `From ${R.fv(e, 4) ? R.optL(R.fv(e, 4)) : 'the deal folders'} by ${R.fv(e, 8) ? R.optL(R.fv(e, 8)).toLowerCase() : '—'} into ${fvs(e, 5) || 'the tool'}, through ${parties}, processed in ${fvs(e, 7) || 'not known'}.\n\n`);
    add('C', 'Facts', '\n\n' + tbl(['Field', 'Value', 'Source'], [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(n => [n + ' ' + R.FLD(n).name, fvs(e, n), (e.fields[n] || {}).source])));
    add('D', 'Classification', '\n\n' + tbl(['Item', 'Value', 'Rationale'], [['Reach (15)', R.reachOf(e) ? R.codeOpt(R.reachOf(e)) : '', [(e.reachTests || []).map((t, i) => t.answer == null ? '' : `test ${i + 1}: ${t.answer ? 'yes' : 'no'}${t.source ? ' (' + t.source + ')' : ''}`).filter(Boolean).join('; '), e.reachOverrideReason ? 'override: ' + e.reachOverrideReason : '', e.reachConfirmedBy ? 'confirmed by ' + pname(e.reachConfirmedBy) : 'not yet confirmed by the deal team lead', (e.peerReview || {}).reach ? `re-derived ${R.codeOpt(e.peerReview.reach)}${e.peerReview.differs ? ', resolution: ' + (e.peerReview.resolution || '—') : ', agrees'}` : ''].filter(Boolean).join(' · ')], ['Information class (16)', R.classOf(e) ? R.codeOpt(R.classOf(e)) : '', (e.fields[16] || {}).source || ''], ['Exposure consequence', R.exposure(e) ? R.codeOpt(R.exposure(e)) : '', 'Technical label from the class and who uses the channel']]));
    add('E', 'Ladder', '\n\n' + tbl(['Indicative rung', 'Adjustment and reason', 'Evidence held today'], [[ix ? R.codeOpt(ix.value) : '', [ix ? ix.adjustment : '', e.adjustmentReason].filter(Boolean).join(' · '), fvs(e, 18)]]));
    const Rg = (e.obtainability || {}).rungs || {};
    add('F', 'Obtainability', '\n\n' + (Object.keys(Rg).length ? tbl(['Rung', ...T.map(t => t.id + ' ' + t.name)], Object.keys(Rg).sort().reverse().map(r => [R.codeOpt(r), ...T.map(t => Rg[r][t.id] ? (Rg[r][t.id].pass ? 'pass' : 'fail') + (Rg[r][t.id].source ? ' (' + Rg[r][t.id].source + ')' : '') : '')])) : '') + `Obtainable ${ob.done ? R.codeOpt(ob.rung) : 'not yet tested'} · confidence ${R.confidence(e) || '—'} (proposed ${R.proposedConfidence(e) || '—'}${e.confRaiseReason ? '; raised: ' + e.confRaiseReason : ''})${R.boundaryOf(e) === 'B3' ? ' · at B3 the test asks only whether a direction exists and was acknowledged (T1)' : ''}\n\n`);
    add('G', 'Questions to counsel', '\n\n' + (qs.length ? tbl(['Ref', 'Question', 'Sent', 'Response', 'Received'], qs.map(q => [q.ref, q.question, dDoc(q.sentOn), q.response || q.status, dDoc(q.respondedOn)])) : 'None.\n\n'));
    add('H', 'Counsel’s determinations', '\n\n' + tbl(['Field', 'Determination', 'Question'], [23, 24].map(n => [n + ' ' + R.FLD(n).name, e.fields[n] && e.fields[n].value ? fvs(e, n) : 'awaiting counsel', (e.fields[n] || {}).source || ''])));
    let I = f.type ? f.type + ' ' + R.findingName(f.type) : f.label || '—';
    if (f.type === 'F2') I += ` · gap ${f.gap} ${f.gap === 1 ? 'rung' : 'rungs'} (required ${f.required}, obtainable ${f.obtainable}) · priority ${f.priority} (${f.exposure}) · failed test ${f.failedTest} · route ${f.route} · owner ${f.owner} · 90-day step: ${f.step}`;
    if (f.type === 'F1') I += ` · obtainable ${f.obtainable} meets required ${f.required} · owner ${f.owner || '—'}`;
    if (f.type === 'F3') I += ` · counsel’s determination ${f.ref}: ${f.basis || ''} · technical classification beside it: ${R.reachOf(e) || '—'} / ${R.classOf(e) || '—'}`;
    if (f.type === 'F4') I += ` · question that would resolve it: ${f.question || '—'} · who could answer: ${f.who || '—'}`;
    if (f.f5) I += `\n\n**F5, residual gap, recorded beside the finding.** The channel accepts typed or pasted text and no deployed control reads meaning. Class of control that would close it: one at the boundary that reads the meaning of outbound text against the deal’s sensitive content, independent of the AI, with a signed record per submission. Earliest horizon: ${e.horizon || 'not stated'}. No product is named.`;
    add('I', 'Finding', I + '\n\n');
    const nk = Object.entries(e.fields || {}).filter(([, x]) => x && x.notKnown).map(([n]) => `field ${n} ${R.FLD(n).name}`);
    add('J', 'Not known', (nk.length ? nk.join('; ') + (f.type === 'F4' ? ' · would be resolved by: ' + (f.question || '—') : '') : 'None.') + '\n\n');
    return P_;
  }
  const worksheetMd = (e, h) => `${h || '###'} Worksheet ${e.id}: ${fvs(e, 5) || R.kindName(R.kindOf(e))}\n\n` + worksheetParts(e).map(p => p.md).join('');

  /* ---------- versions and redline ---------- */
  const nowSnap = () => R.snapshotOf(S());
  const snapFor = v => (v === 'now' ? nowSnap() : ((S().versions.find(x => x.id === v) || {}).snapshot) || { channels: {}, findings: {} });
  const verLabel = v => { if (v === 'now') return 'the assessment now'; const x = S().versions.find(y => y.id === v); return x ? `${x.id} · ${x.label} · ${ctx.fmtAt(x.at)}` : v; };
  const lastBy = (id, n) => { const h = S().history.slice().reverse().find(x => x.target === id && (n ? x.action === 'field ' + n : true)); return h ? h.by : ''; };
  function diffSnap(a, b) {
    const out = [], ids = [...new Set([...Object.keys(a.channels || {}), ...Object.keys(b.channels || {})])].sort();
    ids.forEach(id => {
      const x = (a.channels || {})[id], y = (b.channels || {})[id];
      if (!x) return out.push({ id, what: 'channel added', from: '', to: (y.kind || '') + (y.f && y.f[5] ? ' · ' + y.f[5] : ''), by: lastBy(id) });
      if (!y) return out.push({ id, what: 'channel removed', from: (x.kind || ''), to: '', by: '' });
      [...new Set([...Object.keys(x.f || {}), ...Object.keys(y.f || {})])].sort((p, q) => +p - +q).forEach(n => { const f = (x.f || {})[n] || '', t = (y.f || {})[n] || ''; if (f !== t) out.push({ id, what: `field ${n} ${R.FLD(n).name}`, from: f, to: t, by: lastBy(id, n) }); });
      const fa = (a.findings || {})[id] || '', fb = (b.findings || {})[id] || ''; if (fa !== fb) out.push({ id, what: 'finding', from: fa, to: fb, by: '' });
    });
    return out;
  }
  function redlineMd() {
    const vs = S().versions; if (!vs.length) return '';
    const last = vs[vs.length - 1], d = diffSnap(last.snapshot, nowSnap());
    return `## Changes since ${last.id} · ${last.label} · ${dDoc(String(last.at).slice(0, 10))}\n\n` + (d.length ? tbl(['Channel', 'What', 'Was', 'Now', 'Last changed by'], d.map(c => [c.id, c.what, c.from, c.to, c.by])) : 'No changes to recorded values since this version.\n\n');
  }

  /* ---------- the outputs ---------- */
  function genCD1() {
    const s = S(); let m = mdHead(O('CD1')) + `Every channel, with all 25 fields and their sources. Fields recorded as not known: ${s.channels.reduce((n, e) => n + R.notKnownCount(e), 0)}. Channel kinds considered: ${R.KINDS.filter(k => R.considered()[k]).join(', ') || 'none'}.\n\n`;
    s.channels.forEach(e => { m += `## ${e.id} · ${R.codeOpt(R.kindOf(e))}${e.absent && e.absent.on ? ' · considered, absent: ' + (e.absent.reason || '—') : ''}\n\n` + tbl(['#', 'Field', 'Value', 'Source'], C.fields.map(d => [d.n, R.FLD(d.n).name, fieldOut(e, d.n), fieldSrc(e, d.n)])) + `Not known: ${R.notKnownCount(e)}${e.movedTo ? ' · use moved to ' + e.movedTo : ''}\n\n`; });
    m += redlineMd();
    m += `## Source index\n\n` + tbl(['ID', 'Document', 'Status', 'Date'], s.documents.map(d => [d.id, d.title, d.status, d.date])) + tbl(['ID', 'Interview', 'Date', 'Notes'], s.interviews.map(v => [v.id, v.who, v.date, v.notesRef]));
    return m;
  }
  function cd1Csv() {
    const s = S(), q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', o = O('CD1');
    const head = ['Channel', ...C.fields.map(d => d.n + ' ' + R.FLD(d.n).name), ...C.fields.map(d => d.n + ' source'), 'Not known', 'Absent'];
    return [[s.profile.privilegeMarking || '[Privilege marking not recorded]'], [s.profile.codeName || '[Code name]'], [outStatus(o) + ' · ' + dDoc(ctx.today())], [(s.engagement.company || '[Company]') + ' · ' + (s.engagement.reference || '')], ...(bothRoles() ? [[bothRoles().trim()]] : []), [],
      head, ...s.channels.map(e => [e.id, ...C.fields.map(d => fieldOut(e, d.n)), ...C.fields.map(d => fieldSrc(e, d.n)), R.notKnownCount(e), e.absent && e.absent.on ? e.absent.reason || 'yes' : ''])].map(r => r.map(q).join(',')).join('\n');
  }
  function genCD2() { return mdHead(O('CD2')) + `## Summary\n\n` + summaryTable() + `## Worksheets\n\n` + S().channels.map(e => worksheetMd(e)).join(''); }
  function genCD3() {
    const steps = R.planSteps();
    return mdHead(O('CD3')) + `Every F2 step by owner and week, ordered by priority, using only configuration, contract or direction the company already has. Who closes the residual gap (F5), and with what, is a separate decision for the company and is not part of this plan.\n\n## Steps by priority\n\n` + (steps.length ? tbl(['Week', 'Channel', 'Priority', 'Gap', 'Failed test', 'Route', 'Owner', 'Step', 'Evidence it produces'], steps.map(x => [x.week, `${x.channel} (${x.kind}, ${x.boundary})`, x.priority, x.gap, x.failedTest, x.route, x.owner, x.step, x.produces])) : 'No F2 findings: nothing to close from what exists.\n\n')
      + `## Steps by owner\n\n` + (steps.length ? [...new Set(steps.map(x => x.owner))].map(o => `### ${o}\n\n` + steps.filter(x => x.owner === o).map(x => `- ${x.week}: ${x.channel} · ${x.step} → ${x.produces}`).join('\n') + '\n\n').join('') : '') + redlineMd();
  }
  function genCD4() {
    const f = R.f5Summary(), s = S();
    return mdHead(O('CD4')) + `Every channel that accepts typed or pasted text has the same gap: a paraphrase of a deal paragraph, or fragments across many prompts that add up to the deal, pass every control the company owns, because those controls check files, patterns and destinations and none reads meaning. This output marks the extent of that gap. It names no product.\n\n## Extent\n\n${f.count} of ${s.channels.length} channels carry F5: ${f.channels.join(', ') || 'none'}.\n\nBy kind: ${Object.entries(f.kinds).map(([k, n]) => `${k} ${R.kindName(k)}: ${n}`).join('; ') || '—'}.\n\nInformation classes reachable through them: ${f.classes.map(c => R.codeOpt(c)).join('; ') || '—'}.\n\n## Channels\n\n` + tbl(['Channel', 'Kind', 'Boundary', 'Reach', 'Class', 'Finding beside it', 'Earliest horizon'], s.channels.filter(e => R.hasF5(e)).map(e => { const x = R.finding(e); return [e.id, R.kindOf(e), R.boundaryOf(e), R.reachOf(e), R.classOf(e), x.type || x.label, e.horizon]; }))
      + `## The class of control that would close it\n\nA control at the boundary that reads the meaning of outbound text against the deal’s sensitive content, independent of the AI, with a signed record per submission of what was requested, what applied and what was allowed (ladder rung N6). No control the company has deployed reaches that rung.\n\n## What the company would be able to show once it existed\n\nFor each submission on each channel carrying F5: what was requested, what applied and what was allowed, signed at the time, independently checkable. That is the evidence type N6 on the ladder, which closes the paraphrase gap; N4 shows what left after the fact, and N5 contains only R3 and R4 reach.\n\nEarliest horizons stated: ${f.horizons.join('; ') || 'none stated'}. The decision is the company’s.\n\n`;
  }
  function genCD5() {
    const s = S(), e = s.engagement, p = s.profile, A = e.annexText || {}, d = s.demonstration || {};
    const nk = {}; s.channels.forEach(x => { const k = R.kindOf(x) || '?'; nk[k] = (nk[k] || 0) + R.notKnownCount(x); });
    const fails = {}; s.channels.forEach(x => Object.values((x.obtainability || {}).rungs || {}).forEach(t => C.tests.forEach(k => { if (t[k.id] && t[k.id].pass === false) { const key = k.id + ' at ' + (R.boundaryOf(x) || '?'); fails[key] = (fails[key] || 0) + 1; } })));
    const f5 = R.f5Summary();
    const gen = [
      `The assessment answers one question: for each channel by which deal information can reach an external model, what evidence can ${e.company || 'the company'} produce that the information did not leave, or of what left and when?`,
      'No deal content was read. No tenant was connected to, queried or tested. No prompt log, chat history or individual submission was read. No AI vendor was approached and no adviser system was examined. No forensic investigation was performed. No legal advice is given.',
      `${p.codeName || '[Code name]'} · stage: ${C.stageLabels[p.stage] || p.stage || '—'} · deal team and insider list: ${p.teamCounts || '—'} · advisers: ${(p.advisers || []).length} · sanctioned tools: ${(p.tools || []).length} · device policy: ${C.deviceLabels[p.devicePolicy] || '—'}.\n\nChannel kinds covered: ${R.KINDS.map(k => k + (R.considered()[k] ? ' ✓' : ' not considered')).join(' · ')}.`,
      'A register of 25 fields for each channel, the five questions asked in order, the non-egress evidence ladder (N0 to N6) with its base rule and boundary adjustments, and the five-part obtainability test (T1 to T5). Every legal determination is the company’s and its counsel’s.',
      d.performed === 'yes' ? `Performed on ${dDoc(d.on)}${d.observers ? ' in front of ' + d.observers : ''}, on ${d.text || 'a redacted paragraph'}. Controls the paraphrase passed: ${d.controlsPassed || '—'}. Controls that stopped it: ${d.controlsStopped || 'none'}.` : d.performed === 'no' ? 'Not performed' + (d.text ? ': ' + d.text : '.') : '[Not yet recorded]',
      summaryTable(),
      s.channels.map(x => worksheetMd(x, '###')).join(''),
      (R.planSteps().length ? tbl(['Owner', 'Week', 'Channel', 'Step'], R.planSteps().map(x => [x.owner, x.week, x.channel, x.step])) : 'No F2 steps.\n\n'),
      `${f5.count} of ${s.channels.length} channels carry F5 (${f5.channels.join(', ') || 'none'}), reaching classes ${f5.classes.join(', ') || '—'}. The class of control that would close it reads the meaning of outbound text at the boundary, independent of the AI, with a signed record per submission. Earliest horizon: ${f5.horizons.join('; ') || 'not stated'}.`,
      Object.keys(fails).length ? tbl(['Failed test', 'Count'], Object.entries(fails).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, n])) : 'No failed tests recorded.\n\n',
      `Fields not known, by kind: ${Object.entries(nk).map(([k, n]) => `${k}: ${n}`).join(' · ') || 'none'}. ${s.channels.filter(x => R.obResult(x).done).map(x => `${x.id} ${R.confidence(x) || '—'}`).join(', ') || ''}`,
      `Register extract: CD1. Question log: ${s.questions.map(q => q.ref).join(', ') || 'none'}. Source index: ${s.documents.filter(x => x.status === 'received').map(x => x.id).join(', ') || 'none'}. Exceptions log: below.`,
    ];
    let m = mdHead(O('CD5')) + `Issued in Triodian’s name.\n\n`;
    C.annexOutline.forEach((t, k) => { m += `## ${k + 1}. ${t}\n\n${gen[k]}\n\n${A[k + 1] ? A[k + 1] + '\n\n' : '[Method owner’s text]\n\n'}`; });
    m += redlineMd();
    m += `## Exceptions log\n\n` + (s.exceptions.length ? tbl(['Ref', 'Departure', 'Reason', 'Approved by', 'Date'], s.exceptions.map(x => [x.ref, x.departure, x.reason, pname(x.approvedBy), x.on])) : 'None.\n\n');
    m += `Signed for Triodian: ${e.annexSigned.by ? pname(e.annexSigned.by) + ', method owner, ' + dDoc(e.annexSigned.on) : '[not signed]'}\n`;
    return m;
  }
  function genQS() { const q = S().questions.filter(x => x.status !== 'answered'); return mdHead(O('QS')) + (q.length ? q.map(x => `## ${x.ref}\n\n` + tbl(['Field', 'Contents'], [['Channel', x.channelId || '—'], ['Which of the five questions', x.question5], ['Facts', x.facts], ['Question', x.question], ['Why it matters to the assessment', x.why], ['Response', x.response || ''], ['Status', x.status + (x.owner ? ' · ' + pname(x.owner) : '')]])).join('') : 'No open questions.\n\n'); }
  function genRP() {
    const s = S(), e = s.engagement, ext = e.checkerMode === 'external';
    const strip = t => t.split('\n').slice(4).join('\n');
    return mdHead(O('RP')) + `For the ${ext ? 'independent checker' + (e.checkerOrganisation ? ' (' + e.checkerOrganisation + ')' : '') : 'validation review standing as R7'}, received from ${e.counselFirm || 'counsel'}, not from Triodian. Queries and Triodian’s answers go through the same line. R7 is confirmed by ${ext ? 'the checker' : 'validation'}.\n\n## What to check\n\n${C.reviews.find(r => r.id === 'R7').tests}. Each rung should trace to a test result, each finding to a required and an obtainable rung, and each determination to a numbered question.\n\n## Summary\n\n` + summaryTable() + `## Register\n\n` + strip(genCD1()) + `## Findings\n\n` + strip(genCD2()) + `## Check points so far\n\n` + (s.independentReviewPoints.length ? tbl(['Ref', 'Output', 'Section', 'Point', 'Response', 'Status'], s.independentReviewPoints.map(x => [x.ref, x.output, x.section, x.point, x.response, x.status])) : 'None.\n\n');
  }
  function genCM() { return mdHead(O('CM')) + tbl(['Measure', 'Result'], R.measures()) + `## Exceptions\n\n` + (S().exceptions.length ? tbl(['Ref', 'Departure', 'Reason'], S().exceptions.map(x => [x.ref, x.departure, x.reason])) : 'None.\n'); }

  const OUTS = [
    { id: 'CD1', name: 'Channel register', gate: 2, gen: genCD1 },
    { id: 'CD2', name: 'Finding per channel', gate: 5, gen: genCD2 },
    { id: 'CD3', name: '90-day plan from what exists', gate: 5, gen: genCD3 },
    { id: 'CD4', name: 'The residual gap, marked', gate: 5, gen: genCD4 },
    { id: 'CD5', name: 'Technical annex', gate: 6, gen: genCD5 },
    { id: 'QS', name: 'Question set to counsel', gate: 2, gen: genQS },
    { id: 'RP', name: 'Review pack for the check', gate: 5, gen: genRP },
    { id: 'CM', name: 'Closing measures', gate: 7, gen: genCM },
  ];
  const O = id => OUTS.find(o => o.id === id) || OUTS[0];
  const outDesc = o => ((C.deliverables || []).find(d => d.id === o.id) || {}).contents || ({ QS: 'Every open question put to counsel, in the template layout.', RP: 'What the checker needs to test the assessment, received through counsel.', CM: 'The measures that close the assessment (framework 12.5).' })[o.id] || '';

  /* ---------- cache ---------- */
  let cache = { rev: -1, map: {} };
  /* Generating a view text asks the status, which scans the raw texts; the raw and view caches are kept apart so that
     re-entrant call cannot clear the one being filled. */
  function outText(o, rev) {
    if (cache.rev !== rev) cache = { rev, map: {} };
    const k = o.id + '|' + (RAW ? 'raw' : FORCE || 'view');
    if (k in cache.map) return cache.map[k];
    const v = o.gen(); if (cache.rev === rev) cache.map[k] = v; return v;
  }
  function rawTexts(rev) { RAW = true; try { return OUTS.map(o => [o.id, outText(o, rev)]); } finally { RAW = false; } }
  function withMode(mode, fn) { FORCE = mode; try { return fn(); } finally { FORCE = ''; } }

  return { OUTS, O, outDesc, outText, rawTexts, withMode, finalWhy, outStatus, mdHead, tbl, fvs, summaryTable, worksheetParts, worksheetMd, cd1Csv, redlineMd, diffSnap, nowSnap, snapFor, verLabel, FREQ };
}

const api = { create };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.CEAOutputs = api;
})(typeof window !== 'undefined' ? window : globalThis);
