/* AI Confidentiality Exposure Assessment · Triodian
   Core: state, helpers, the shell (header, drawer, footer, document band), permissions bridge, persistence.
   The assessment is saved on the server (one deal per site) and every save is checked against the signed-in
   person's roles there too. The worked example runs in the browser only and is never saved.
   Loaded before cea-screens.js and cea.js; everything shared sits on window.CEA. */
(function () {
'use strict';
const CEA = window.CEA = {};
let C = null, S = null, R = null, O = null, REV = 0;
const UI = CEA.UI = { screen: 'entry', personId: '', drawer: false, pop: null, sheet: null, channelId: null, tab: 'facts', step: 1, outTab: '', filt: { kind: '', b: '', f: '', nk: false }, refQ: '', dirty: false, err: {}, hist: null, ask: null, expanded: {}, qOpen: null, showDone: false, acct: false, annexOpen: false, vkey: null };
const TRI = ['methodOwner', 'assessor', 'peer', 'validation', 'delivery'];
const IDRE = /^[A-Za-z0-9_.:-]{1,64}$/;
const sid = s => String(s == null ? '' : s).replace(/[^a-zA-Z0-9_-]/g, '_');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const nowISO = () => new Date().toISOString();
/* Dates. Data is stored as ISO dates and UTC timestamps. Screens follow the user's Profile choice of date format and
   time zone; output documents always use the long form ("21 October 2026"). */
const prefDF = () => (SRV.user && SRV.user.dateFormat) || 'long';
const prefTZ = () => (SRV.user && SRV.user.timeZone) || undefined;
const DF_OPTS = { long: { day: 'numeric', month: 'long', year: 'numeric' }, short: { day: 'numeric', month: 'short', year: 'numeric' }, numeric: { day: '2-digit', month: '2-digit', year: 'numeric' } };
const ymdIn = (d, tz) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };
const today = () => { try { return ymdIn(new Date(), prefTZ()); } catch (e) { return ymdIn(new Date()); } };
const fmtYMD = (s, df) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s)); if (!m) return String(s); if (df === 'iso') return s; return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString('en-AU', Object.assign({ timeZone: 'UTC' }, DF_OPTS[df] || DF_OPTS.long)); };
const fmtLocal = s => { if (!s) return ''; const d = new Date(s); if (isNaN(d)) return s; const tz = prefTZ(), df = prefDF();
  try { const time = d.toLocaleTimeString('en-AU', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }); return fmtYMD(ymdIn(d, tz), df === 'long' ? 'short' : df) + ', ' + time; } catch (e) { return d.toLocaleString('en-AU'); } };
const dAU = s => !s ? '' : /^\d{4}-\d{2}-\d{2}T/.test(String(s)) ? fmtLocal(s) : fmtYMD(s, prefDF());
const dDoc = s => s ? fmtYMD(s, 'long') : '';
const fmtAt = s => s ? fmtLocal(s) : '';
const bp = () => innerWidth >= 1024 ? 'desk' : innerWidth >= 640 ? 'tab' : 'phone';
const T = (id, text) => C.glossary[id] ? `<button type="button" class="term" data-term="${id}" aria-expanded="false" aria-controls="poproot">${text || esc(C.glossary[id].term)}</button>` : (text || '');
const linkify = s => esc(s).replace(/\[\[(\w+)(?:\|([^\]]+))?\]\]/g, (m, id, t) => T(id, t ? esc(t) : esc(C.glossary[id] ? C.glossary[id].term.toLowerCase() : id)));
const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const roleName = r => (C.roles.find(x => x.id === r) || {}).name || r;
const person = id => S.people.find(p => p.id === id);
const pname = id => { const p = person(id); return p ? p.name : ''; };
const me = () => S ? person(UI.personId) || (SRV.user && !practice() && UI.personId === SRV.user.id ? { id: SRV.user.id, name: SRV.user.name || SRV.user.email, roles: SRV.user.roles || [], isAdmin: SRV.user.isAdmin } : null) : null;
const has = r => { const p = me(); return !!(p && p.roles.includes(r)); };
const isTri = () => TRI.some(has);
const codeHtml = c => R.codeName(c) ? `${esc(c)} <span class="clbl">${esc(R.codeName(c))}</span>` : esc(c);
const ch = id => S.channels.find(e => e.id === id);
const chIdx = e => S.channels.indexOf(e);
const adviser = id => (S.profile.advisers || []).find(a => a.id === id);

/* ---------- change log ---------- */
function log(action, target, from, to) { REV++; S.history.push({ at: nowISO(), by: pname(UI.personId) || 'unknown', action, target, from: from === undefined ? null : from, to: to === undefined ? null : to }); UI.dirty = true; autosave(); }
function setFieldVal(e, n, patch) {
  const f = e.fields[n] || { value: '', source: '', notKnown: false, by: '', on: '' }, from = f.notKnown ? 'not known' : (patch.source !== undefined && patch.value === undefined ? 'source: ' + (f.source || '') : patch.detail !== undefined ? f.detail || '' : f.value);
  Object.assign(f, patch, { by: UI.personId, on: today() }); delete f.carried; e.fields[n] = f;
  log('field ' + n, e.id, from, f.notKnown ? 'not known' : (patch.value !== undefined ? patch.value : patch.source !== undefined ? 'source: ' + patch.source : patch.detail !== undefined ? patch.detail : null));
}

/* ---------- permissions: the shared rules, with the browser's own front checks ---------- */
function deny(target, x) {
  if (UI.archived) return 'This is an earlier assessment. It can be read but not changed.';
  const p = me(); if (!p) return practice() || !SRV.user ? 'Choose a person under "Acting as" in the header.' : 'Your account has no role in this assessment. An administrator can give you a role in Admin.';
  if (practice() === false && SRV.user && SRV.user.isAdmin && (target === 'setup' || target === 'profile')) return '';
  return window.CEARuleset.deny(target, { id: p.id, roles: p.roles, isAdmin: !!p.isAdmin }, S, x);
}
const ok = (t, x) => !deny(t, x);
const whyNote = why => why ? `<p class="small soft" style="margin:6px 0">${esc(why)} ${T('roleLimits', 'Why')}</p>` : '';
function pathTarget(path) {
  const k = path.split('.');
  if (k[0] === 'engagement') return k[1] === 'legalPhrasesText' || k[1] === 'productPhrasesText' ? ['r5'] : k[1] === 'annexText' ? ['annex'] : k[1] === 'closure' ? ['close'] : ['setup'];
  if (k[0] === 'profile') return ['profile'];
  if (['people', 'documents', 'interviews'].includes(k[0])) return ['setup'];
  if (k[0] === 'demonstration') return ['tri'];
  if (k[0] === 'channels') { const e = S.channels[+k[1]]; if (['reachOverrideReason', 'adjustmentReason', 'confChosen', 'confRaiseReason'].includes(k[2]) || (k[2] === 'fields' && +k[3] >= 15 && +k[3] <= 22)) return ['classify', e]; if (k[2] === 'peerReview') return ['peer', e]; if (k[2] === 'owner' || k[2] === 'horizon') return ['tri']; return ['facts', e]; }
  if (k[0] === 'exceptions') return ['tri'];
  if (k[0] === 'independentReviewPoints') return k[2] === 'response' ? ['irRespond'] : k[2] === 'status' ? ['irClose'] : ['irLog'];
  return ['setup'];
}
function setPath(path, v) {
  const pt = pathTarget(path), why = deny(pt[0], pt[1]); if (why) { toast(why); return false; }
  if (path === 'engagement.legalPhrasesText') { S.engagement.legalPhrases = String(v).split('\n').map(x => x.trim()).filter(Boolean); log('legalPhrases', 'R5', null, S.engagement.legalPhrases.length + ' phrases'); return true; }
  if (path === 'engagement.productPhrasesText') { S.engagement.productPhrases = String(v).split('\n').map(x => x.trim()).filter(Boolean); log('productPhrases', 'R5', null, S.engagement.productPhrases.length + ' names'); return true; }
  const ks = path.split('.'), last = ks.pop(); let o = S; ks.forEach(k => { if (o[k] == null) o[k] = {}; o = o[k]; });
  const from = o[last]; if (from === v) return true; o[last] = v;
  if (/^channels\.\d+\.notDeterminable\.on$/.test(path) && v) { const nd = S.channels[+ks[1]].notDeterminable; if (!nd.since) nd.since = today(); }
  log('edit', path, typeof from === 'object' ? null : from, v); return true;
}
const blindFor = e => { const p = me(); if (!(p && e && p.roles.includes('peer') && !e.peerReview.reach && e.classifiedBy !== p.id)) return false; return !!(R.reachOf(e) || (e.reachTests || []).some(t => t && t.answer != null)); };
const blindChannels = () => S.channels.filter(blindFor);
const reachShown = e => blindFor(e) ? '' : R.reachOf(e);

/* ---------- shell pieces ---------- */
const MARKSVG = () => (C.markSvg || '').replace('<svg', '<svg aria-hidden="true" focusable="false"');
const LOGO = h => `<img class="logo" src="/triodian-logo.svg" alt="Triodian" style="height:${h}px;width:auto;display:block">`;
const badge = (l, c) => { l = String(l == null ? '' : l); return `<span class="badge ${c}">${esc(l.charAt(0).toUpperCase() + l.slice(1))}</span>`; };
const gate = (ok, t) => `<span class="gate ${ok ? 'ok' : 'no'}" role="status"><i></i>${esc(t)}</span>`;
const SEQ = ['setup', 'overview', 'profile', 'register', 'classify', 'counsel', 'findings', 'review', 'outputs'];
const SNAME = { actions: 'My actions', setup: 'Set-up', overview: 'Overview', profile: 'Profile', register: 'Register', classify: 'Classify', counsel: 'Counsel', findings: 'Findings', review: 'Review', outputs: 'Outputs', reference: 'Reference' };
function personSelect(id) { return `<select id="${id}" data-act="person" aria-label="Acting as"><option value="">Choose person</option>${S.people.map(p => `<option value="${esc(p.id)}" ${UI.personId === p.id ? 'selected' : ''}>${esc(p.name || 'Unnamed')} · ${esc(p.roles.map(r => roleName(r).replace(/ \(.*\)/, '')).join(', ') || 'no role')}</option>`).join('')}</select>`; }
/* Document band under the header: the privilege marking counsel directs, and the deal code name. */
function docband() {
  if (!S) return '';
  if (UI.archived) return `<div class="docband practice"><div class="docband-in"><span class="priv none" style="color:var(--ochre)"><strong>Earlier assessment · ${esc(UI.archived.label)} · read only</strong></span><span class="stat"><button class="lnk" data-act="leaveArchive">Back to the current assessment</button></span></div></div>`;
  const p = S.profile, canSet = !deny('profile');
  const priv = String(p.privilegeMarking || '').trim() ? `<span class="priv" title="Privilege marking · printed as the first line of every output">${esc(p.privilegeMarking)}</span>`
    : `<span class="priv none">No privilege marking set.${canSet ? ' <button class="lnk" data-act="go" data-to="profile">Set it in the profile</button>' : ' Counsel directs the marking.'}</span>`;
  const stat = p.codeName || S.engagement.company ? `<span class="stat"><strong>${esc(p.codeName || '[no code name]')}</strong>${S.engagement.reference ? ' · ' + esc(S.engagement.reference) : ''}</span>` : '';
  return `<div class="docband"><div class="docband-in"><span style="display:inline-flex;align-items:center;gap:14px;flex-wrap:wrap">${priv}${TriodianBrand.chip(S.engagement.practitioner)}</span>${stat}</div></div>`;
}
function header() {
  const b = bp(), steps = ['setup', 'profile', 'register', 'classify', 'counsel', 'findings', 'review', 'outputs'], nAct = S ? CEA.myActions().length : 0;
  return `<header class="hdr"><div class="hdr-in">
    <button class="brand" data-act="go" data-to="overview" aria-label="Triodian · go to overview">${b !== 'phone' ? LOGO(22) : MARKSVG()}</button>
    ${b !== 'phone' ? '<span class="vrule" aria-hidden="true"></span>' : ''}<span class="apptitle">Confidentiality Exposure</span>
    ${b === 'desk' ? `<nav class="steps" aria-label="Steps">${S && (SRV.user || practice()) ? `<button data-act="go" data-to="actions" ${UI.screen === 'actions' ? 'aria-current="page"' : ''}>My actions${nAct ? ` <span class="navcount">${nAct}</span>` : ''}</button>` : ''}${steps.map(s => `<button data-act="go" data-to="${s}" ${UI.screen === s ? 'aria-current="page"' : ''}>${SNAME[s]}</button>`).join('')}</nav>` : ''}
    <div class="hdr-r">${saveChip()}
      ${b !== 'phone' && (practice() || !SRV.user) ? `<label class="chip" title="Practice only: choose whose view to try"><span aria-hidden="true">⌾</span>${personSelect('who-hdr')}</label>` : ''}
      ${account()}<button class="iconbtn" data-act="drawer" aria-label="Menu" aria-expanded="${UI.drawer}">☰</button></div></div>${docband()}</header>
    ${SRV.site ? `<div class="examplebar" style="background:#FDF0E1;color:#8A4B08;border-color:#F0D2AE">${esc(SRV.site)}: a test site for trying things out, not the live assessment</div>` : ''}
    ${S.engagement.example ? `<div class="examplebar">Worked example: a fictional company, deal and advisers, for practice only. Nothing is saved. <button class="lnk" data-act="leaveExample">Leave the worked example</button></div>` : ''}
    ${blindChannels().length ? `<div class="examplebar" style="background:var(--aubergine-bg);color:var(--aubergine);border-color:#D9CFE0">Blind re-derivation (R3): the classifier’s work on ${esc(blindChannels().map(e => e.id).join(', '))} is hidden until you record your own reach</div>` : ''}`;
}
function drawer() {
  if (!UI.drawer) return '';
  const it = (to, label) => `<button class="item" data-act="go" data-to="${to}" ${UI.screen === to ? 'aria-current="page"' : ''}>${label}</button>`;
  return `<div class="drawer-bg" data-act="drawer"></div><aside class="drawer" role="dialog" aria-label="Menu">
    <div class="row between"><strong>Menu</strong><button class="iconbtn" data-act="drawer" aria-label="Close menu">✕</button></div>
    ${S && (SRV.user || practice()) ? it('actions', 'My actions' + (CEA.myActions().length ? ` <span class="navcount">${CEA.myActions().length}</span>` : '')) : ''}<div class="grp">Steps</div>${SEQ.map(s => it(s, SNAME[s])).join('')}${it('reference', 'Reference')}
    ${practice() || !SRV.user ? `<div class="grp">Acting as (practice only)</div><label class="chip" style="width:100%"><span aria-hidden="true">⌾</span>${personSelect('who-drw')}</label>` : ''}
    ${(SRV.archives || []).length ? `<div class="grp">Earlier assessments</div>${SRV.archives.map(a => `<button class="item" data-act="openArchive" data-id="${a.id}">${esc(a.label)}<span class="small soft" style="margin-left:auto">read only</span></button>`).join('')}` : ''}
    <div class="grp">Practice</div>
    ${practice() ? '<button class="item" data-act="leaveExample">Leave the worked example</button>' : '<button class="item" data-act="example">Open the worked example</button>'}
    <p class="small soft" style="padding:0 10px">The worked example is fictional and runs in this browser only. Nothing in it is saved.</p>
    <div class="grp">Account</div>
    ${SRV.user ? `<p class="small soft" style="padding:0 10px">Signed in as ${esc(SRV.user.email)}</p><a class="item" href="/profile/" style="text-decoration:none">Your profile</a>` : ''}
    <a class="item" href="/auth/logout" style="text-decoration:none">Sign out</a>
    <div class="grp">Apps</div>
    <a class="item" href="${SRV.site ? 'https://obligations-atlas-test.triodian.com/?suite=1' : 'https://obligations-atlas.triodian.com/?suite=1'}" style="text-decoration:none"><span class="appic" style="background:#E3E9EF;color:var(--navy)">OA</span><span>AI Obligations Atlas<br><span class="small soft">Obligations by jurisdiction, tier and use case</span></span></a>
    <a class="item" href="${SRV.site ? 'https://board-direction-test.triodian.com/?suite=1' : 'https://board-direction.triodian.com/?suite=1'}" style="text-decoration:none"><span class="appic" style="background:var(--green-bg);color:var(--green)">BD</span><span>AI Board Direction<br><span class="small soft">The board’s direction on AI: where to use it and what to rule out</span></span></a>
    <a class="item" href="${SRV.site ? 'https://risk-appetite-test.triodian.com/?suite=1' : 'https://risk-appetite.triodian.com/?suite=1'}" style="text-decoration:none"><span class="appic" style="background:var(--aubergine-bg);color:var(--aubergine)">RA</span><span>AI Risk Appetite<br><span class="small soft">Board positions and calibration set</span></span></a>
    <a class="item" href="${SRV.site ? 'https://use-assessment-test.triodian.com/?suite=1' : 'https://use-assessment.triodian.com/?suite=1'}" style="text-decoration:none"><span class="appic" style="background:#E3E9EF;color:var(--navy)">UA</span><span>AI Use Assessment<br><span class="small soft">Register, tests and findings</span></span></a>
    <div class="item" aria-current="page"><span class="appic" style="background:#F1E6DD;color:var(--copper)">CE</span><span>AI Confidentiality Exposure Assessment<br><span class="small soft">Channels, ladder, findings for one deal</span></span><span class="badge b-green" style="margin-left:auto">now</span></div>
  </aside>`;
}
function footer() {
  return `<footer class="ft"><div class="wrap"><div class="scope" role="note"><span aria-hidden="true">⚠</span><span><strong>Scope.</strong> ${esc(C.banner)}</span></div>
    <div class="ftrow"><span class="row" style="gap:12px">${LOGO(20)}<span class="mono soft">Framework ${esc(C.frameworkDate)}</span></span>
    <span class="row"><a class="lnk" href="/user-guide/">User guide</a><button class="lnk" data-act="go" data-to="reference">Reference</button><span class="mono">${S && S.profile.codeName ? esc(S.profile.codeName) : 'No code name yet'}</span></span></div></div></footer>`;
}
function entryStatus() {
  const box = t => `<div class="panel2" role="status" style="padding:12px 14px;margin:14px 0 4px">${t}</div>`;
  if (!SRV.checked) return box('Connecting…');
  if (SRV.code === 'no_access') return box(`<strong>You don't have access yet.</strong> ${esc(SRV.reason)} You can still open the worked example.`);
  if (!SRV.on) return box(`<strong>The server could not be reached.</strong> ${esc(SRV.reason || '')} Reload the page to try again. The worked example works without it.`);
  if (!canSetup()) return box(`<strong>The assessment has not been started yet.</strong> The method owner, the delivery manager or an administrator starts it. ${(SRV.user.roles || []).length ? '' : 'Your account has no role in it yet. An administrator can give you one in Admin.'}`);
  return '';
}
function entryOverlay() {
  return `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="entry-h"><div class="entry" style="border-top-color:var(--copper)">
    <div class="row" style="gap:12px;margin-bottom:22px">${LOGO(26)}<span class="vrule"></span><span style="font-weight:600">AI Confidentiality Exposure Assessment</span></div>
    <div class="eyebrow">For one live or recently closed transaction</div>
    <h1 id="entry-h" class="h1" style="font-size:32px">Every channel by which deal information can reach an external AI model, and what the company could show about each</h1>
    <p class="soft">The assessment runs in eight phases over two weeks, from set-up to close. Each channel goes through five questions. Starting from the indicative rung, each rung of the non-egress evidence ladder is tested in turn until one passes the obtainability test. Each channel ends with one finding, and the residual gap is marked beside it.</p>
    ${entryStatus()}
    <div class="acts">
      ${SRV.on && canSetup() ? `<button class="act" data-act="new"><span class="mono" style="color:var(--copper)">01</span><span><strong>Start the assessment</strong><br><span class="small soft">Begin at set-up. Everyone with a role then works on the same assessment.</span></span></button>` : ''}
      <button class="act" data-act="example"><span class="mono" style="color:var(--copper)">${SRV.on && canSetup() ? '02' : '01'}</span><span><strong>Open the worked example</strong><br><span class="small soft">Practise on a fictional deal: a listed company in diligence, with an enterprise assistant, a data room and three advisers. Never saved.</span></span></button>
    </div><p class="small" style="margin-top:16px">New to the app? <a href="/user-guide/">Read the user guide</a>: who does what, the eight phases, and how the outputs are made.</p>${SRV.user ? `<p class="small soft" style="margin-top:8px">Signed in as ${esc(SRV.user.email)} · <a href="/profile/">Your profile</a>${SRV.user.isAdmin ? ' · <a href="/admin/">Admin</a>' : ''} · <a href="/auth/logout">Sign out</a></p>` : `<p class="small soft" style="margin-top:8px"><a href="/auth/logout">Sign out</a></p>`}<div class="scope" style="margin-top:22px"><span aria-hidden="true">⚠</span><span>${esc(C.banner)}</span></div></div></div>`;
}
const opening = (eb, h1, sub) => `<div class="opening"><div class="eyebrow">${eb}</div><h1 class="h1">${h1}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`;
function seqNav() { const i = SEQ.indexOf(UI.screen); return i < 0 ? {} : { prev: SEQ[i - 1], next: SEQ[i + 1] }; }
function stepbar(g) { const n = seqNav(); return `<div class="stepbar">${n.prev ? `<button class="btn" data-act="go" data-to="${n.prev}">← ${SNAME[n.prev]}</button>` : '<span></span>'}${g || ''}${n.next ? `<button class="btn primary" data-act="go" data-to="${n.next}">${SNAME[n.next]} →</button>` : '<span></span>'}</div>`; }
function bottombar(g) { if (bp() !== 'phone' || SEQ.indexOf(UI.screen) < 0) return '';
  if (UI.screen === 'outputs' && UI.outTab) return `<nav class="bottombar" aria-label="Step"><button class="btn" data-act="outList" aria-label="Back to all outputs">←</button>${g || ''}<span style="width:44px"></span></nav>`; const n = seqNav(); return `<nav class="bottombar" aria-label="Step">${n.prev ? `<button class="btn" data-act="go" data-to="${n.prev}" aria-label="Previous: ${SNAME[n.prev]}">←</button>` : '<span style="width:44px"></span>'}${g || ''}${n.next ? `<button class="btn primary" data-act="go" data-to="${n.next}" aria-label="Next: ${SNAME[n.next]}">→</button>` : '<span style="width:44px"></span>'}</nav>`; }
/* Every path-bound control asks deny() first; the reason is the control's tooltip and is shown beside the card. */
function fld(label, path, value, o) {
  o = o || {}; const id = 'f_' + path.replace(/[^a-zA-Z0-9]/g, '_'), pt = pathTarget(path), why = o.disabled === true ? 'locked' : deny(pt[0], pt[1]), dis = why ? `disabled title="${esc(why)}"` : '';
  const ctl = o.select ? `<select class="in" id="${id}" data-path="${esc(path)}" ${dis}>${o.select.map(x => `<option value="${esc(x[0])}" ${String(value) === String(x[0]) ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select>`
    : o.area ? `<textarea class="in" id="${id}" data-path="${esc(path)}" placeholder="${esc(o.ph || '')}" ${dis}>${esc(value)}</textarea>`
    : `<input class="in" id="${id}" data-path="${esc(path)}" type="${o.type || 'text'}" value="${esc(value)}" placeholder="${esc(o.ph || '')}" ${dis}>`;
  return `<label class="f" for="${id}"><span>${o.raw ? label : esc(label)}</span>${ctl}</label>`;
}
const peopleOpts = (role, blank) => [['', blank || '—'], ...S.people.filter(p => !role || p.roles.includes(role)).map(p => [p.id, p.name])];
/* Under an open gate item, the channels that hold it open, as chips that open the channel at the right tab. */
function gateChips(n, label) {
  const es = S.channels.filter(x => !blindFor(x) && !R.isAbsent(x));
  let list = [];
  if (n === 2 && /^Fields 1 to 14/.test(label)) list = es.map(e => [e, R.missingIn(e, R.FACTS_N), 'facts']).filter(x => x[1]);
  else if (n === 3 && /^Fields 15 to 22/.test(label)) list = es.filter(e => !e.notDeterminable.on).map(e => { const c = R.missingIn(e, R.CLASS_N), v = R.missingIn(e, R.EVID_N); return [e, c + v, c ? 'classify' : 'evidence']; }).filter(x => x[1]);
  if (!list.length) return '';
  return `<div class="row fchips" style="gap:6px;margin:2px 0 4px 22px">${list.map(([e, k, tab]) => `<button class="fchip" data-act="openChannel" data-id="${esc(e.id)}" data-t="${tab}" title="Open ${esc(e.id)}">${esc(e.id)} · ${k} to do</button>`).join('')}</div>`;
}
const gateCard = n => { const g = R.gates()[n]; return `<section class="card" style="margin-top:18px"><h2 class="sh">Phase ${n} exit gate</h2><div class="stack" style="gap:6px">${g.items.map(i => gate(i[1], i[0]) + (i[1] ? '' : gateChips(n, i[0]))).join('')}</div></section>`; };
function srcList() { return `<datalist id="srcs">${S.documents.filter(d => d.status === 'received').map(d => `<option value="${esc(d.id)} p.">`).join('')}${S.interviews.filter(v => v.date).map(v => `<option value="${esc(v.id)} ${esc(v.date)}">`).join('')}</datalist>`; }

/* ---------- My actions: what is waiting for the signed-in person (or the person being practised as) ---------- */
function myActions() {
  const p = me(); if (!S || !p || UI.archived) return [];
  const r = k => p.roles.includes(k), out = [], G = R.gates(), tri = TRI.some(r);
  const add = (title, detail, nav, tone) => out.push({ title, detail, nav, tone: tone || '' });
  if ((r('methodOwner') || r('delivery')) && !G[0].ok) add('Finish set-up and the profile', 'Still open: ' + G[0].items.filter(i => !i[1]).map(i => i[0]).join('; ') + '.', { act: 'go', to: G[0].items[0][1] && G[0].items[3][1] ? 'profile' : 'setup' });
  if ((r('methodOwner') || r('delivery')) && G[0].ok && !G[1].items[1][1]) add('Consider every channel kind', 'Enter a channel for each kind K1 to K7, or record it as absent with the reason.', { act: 'go', to: 'register' });
  if (r('gc') && S.profile.codeName && !S.profileAgreed.gcBy) add('Agree the deal profile (R1)', 'The GC records their own agreement to the profile.', { act: 'go', to: 'profile' });
  if (r('counsel') && S.profile.codeName && !S.profileAgreed.counselBy) add('Agree the deal profile (R1)', 'Counsel records its own agreement to the profile.', { act: 'go', to: 'profile' });
  S.channels.forEach(e => {
    if (blindFor(e) || R.isAbsent(e)) return;
    if ((r('assessor') || r('methodOwner')) && !deny('facts', e)) { const m = R.missingIn(e, R.FACTS_N); if (m) add(`Record the facts for ${e.id}`, `${m} of 12 fields still to record or mark not known · ${R.kindOf(e)}`, { act: 'openChannel', id: e.id, t: 'facts' }); }
    if ((r('assessor') || r('methodOwner')) && !deny('classify', e) && !R.missingIn(e, R.FACTS_N) && !e.notDeterminable.on) { const m = R.missingIn(e, R.CLASS_N) + R.missingIn(e, R.EVID_N); if (m) add(`Classify and test ${e.id}`, `${m} of fields 15 to 22 still to fill in · ${R.kindOf(e)}`, { act: 'openChannel', id: e.id, t: R.missingIn(e, R.CLASS_N) ? 'classify' : 'evidence' }); }
    if (r('dealLead') && R.reachOf(e) && !e.reachConfirmedBy) add(`Confirm who can reach ${e.id}`, `Recorded: ${R.codeOpt(R.reachOf(e))} · ${R.optL(R.fv(e, 4)) || 'users not recorded'} · ${R.fv(e, 5) || R.kindOf(e)}`, { act: 'classifyChannel', id: e.id, step: 1 });
    if (r('peer') && R.reachOf(e) && !e.peerReview.reach && e.classifiedBy !== p.id && (!e.peerReview.personId || e.peerReview.personId === p.id)) add(`Re-derive the reach for ${e.id} (R3)`, 'Blind re-derivation: set the reach from fields 4 and 8 only, without seeing the classifier’s work.', { act: 'classifyChannel', id: e.id, step: 5 });
    if (r('peer') && e.peerReview.personId === p.id && e.peerReview.differs && !String(e.peerReview.resolution || '').trim()) add(`Record how the R3 difference on ${e.id} was resolved`, `Your reach ${R.codeOpt(e.peerReview.reach)} differs from the recorded ${R.codeOpt(R.reachOf(e))}. Agree it with the classifier, then record the resolution.`, { act: 'classifyChannel', id: e.id, step: 5 }, 'due');
  });
  if (r('counsel')) S.questions.filter(q => q.status !== 'answered').forEach(q => add(`Answer question ${q.ref}`, String(q.question || '').slice(0, 160), { act: 'go', to: 'counsel' }, 'due'));
  if (r('delivery') && G[2].items[0][1] && R.rev('R2').result !== 'passed') add('Run the register completeness and content check (R2)', 'Check that fields 1 to 14 are filled in or marked not known, every value has a source, and no field holds deal content.', { act: 'go', to: 'review' });
  if (tri && !S.demonstration.performed) add('Record the five-minute demonstration', 'Performed or not; on what text; which controls passed the paraphrase.', { act: 'go', to: 'review' });
  if (r('validation') && G[3].items[0][1] && !R.rev('R4').result && !deny('r4')) add('Record validation (R4)', 'Check that the rules were applied consistently and that every adjustment has a reason.', { act: 'go', to: 'review' });
  if (r('methodOwner')) { const open = R.legalHits().filter(h => !h.cleared).length; if (open) add('Clear legal-line and content hits (R5)', `${open} ${open === 1 ? 'hit is' : 'hits are'} open. No output can be exported as final until each is cleared.`, { act: 'go', to: 'review' }, 'due'); }
  if (r('counsel') && G[3].ok && G[4].ok && G[5].items[0][1] && !R.rev('R6').on) add('Record counsel review (R6)', 'Confirm that counsel saw the draft first and that counsel’s determinations were transcribed accurately.', { act: 'go', to: 'review' });
  S.independentReviewPoints.filter(x => x.status === 'open').forEach(x => {
    if (tri && !String(x.response || '').trim()) add(`Respond to check point ${x.ref}`, String(x.point || x.section || '').slice(0, 160), { act: 'go', to: 'review' }, 'due');
    if (r('checker') && String(x.response || '').trim()) add(`Close or disclose check point ${x.ref}`, 'Triodian has responded.', { act: 'go', to: 'review' });
  });
  if (G[5].ok && !deny('r7') && R.rev('R7').result !== 'complete') add('Confirm the check (R7)', 'No check points are open.', { act: 'go', to: 'review' });
  if (r('methodOwner') && G[5].ok && !S.engagement.annexSigned.by) add('Sign the technical annex', 'The method owner signs the annex before it goes to counsel.', { act: 'outTab', t: 'CD5' });
  if (r('counsel') && G[6].ok && !S.engagement.closure.by) add('Record the closure', 'Direct whether the working papers are archived or destroyed.', { act: 'outTab', t: 'CM' });
  return out.sort((a, b) => (b.tone === 'due') - (a.tone === 'due'));
}

/* ---------- markdown and popovers ---------- */
function mdToHtml(md, anchors) {
  const L = md.split('\n'); let h = '', i = 0;
  const inl = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/~~([^~]+)~~/g, '<del>$1</del>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>').replace(/\\([\[\]|])/g, '$1');
  const isBlock = l => /^(#{1,4} |\s*\||\s*([-*]|\d+\.) |---\s*$)/.test(l);
  const splitRow = r => { const out = []; let cur = ''; const s = r.trim().replace(/^\|/, '').replace(/\|$/, ''); for (let k = 0; k < s.length; k++) { if (s[k] === '\\' && s[k + 1] === '|') { cur += '|'; k++; } else if (s[k] === '|') { out.push(cur.trim()); cur = ''; } else cur += s[k]; } out.push(cur.trim()); return out; };
  while (i < L.length) {
    const l = L[i];
    if (/^#{1,4} /.test(l)) { const n = l.match(/^#+/)[0].length, text = l.slice(n + 1); const id = anchors ? ` id="fw-${sid(text).toLowerCase().slice(0, 40)}"` : ''; h += `<h${n + 1}${id} class="${anchors ? 'fwsec' : ''}">${inl(text)}</h${n + 1}>`; i++; continue; }
    if (/^\s*\|/.test(l)) { const rows = []; while (i < L.length && /^\s*\|/.test(L[i])) rows.push(L[i++]); const head = splitRow(rows[0]), body = rows.slice(2).map(splitRow); h += `<div class="tw"><table class="lg"><thead><tr>${head.map(c => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; continue; }
    if (/^\s*([-*]|\d+\.) /.test(l)) { const ol = /^\s*\d+\./.test(l), items = []; while (i < L.length && /^\s*([-*]|\d+\.) /.test(L[i])) items.push(L[i++].replace(/^\s*([-*]|\d+\.) /, '').replace(/^\[( |x)\] /, (m, x) => x === 'x' ? '☑ ' : '☐ ')); h += `<${ol ? 'ol' : 'ul'}>${items.map(x => `<li>${inl(x)}</li>`).join('')}</${ol ? 'ol' : 'ul'}>`; continue; }
    if (/^---\s*$/.test(l)) { h += '<hr>'; i++; continue; }
    if (!l.trim()) { i++; continue; }
    const para = []; while (i < L.length && L[i].trim() && !isBlock(L[i])) para.push(L[i++]); h += `<p>${inl(para.join(' '))}</p>`;
  }
  return h;
}
let popAnchor = null;
function openPop(id, anchor) { closePop(true); popAnchor = anchor; UI.pop = { stack: [id] }; anchor.setAttribute('aria-expanded', 'true'); renderPop(); }
function closePop(silent) {
  const r = document.getElementById('poproot'); if (r) r.innerHTML = '';
  if (popAnchor) { popAnchor.setAttribute('aria-expanded', 'false'); if (!silent && document.body.contains(popAnchor)) popAnchor.focus(); }
  UI.pop = null; if (!silent) popAnchor = null;
}
function renderPop() {
  const root = document.getElementById('poproot'); if (!UI.pop) { root.innerHTML = ''; return; }
  const id = UI.pop.stack[UI.pop.stack.length - 1], g = C.glossary[id], back = UI.pop.stack.length > 1;
  if (!g) { root.innerHTML = ''; return; }
  const phone = bp() === 'phone';
  const body = `<div class="pop${phone ? ' sheet' : ''}" role="dialog" aria-label="${esc(g.term)}">${phone ? '<div class="handle" aria-hidden="true"></div>' : ''}<div class="row between" style="margin-bottom:8px">${back ? '<button class="lnk" data-pact="back">← Back</button>' : '<span></span>'}<button class="iconbtn" data-pact="close" aria-label="Close">✕</button></div><div class="eyebrow">${esc(g.where || '')}</div><h3 style="margin:4px 0 8px;font:600 18px/1.3 var(--serif)">${esc(g.term)}</h3><p class="small">${linkify(g.def)}</p><p class="small" style="margin:10px 0 0"><button class="lnk" data-pact="more" data-id="${id}">More in Reference →</button></p></div>`;
  root.innerHTML = phone ? `<div class="sheet-bg" data-pact="close"></div>${body}` : body;
  if (!phone && popAnchor) { const el = root.querySelector('.pop'), r = popAnchor.getBoundingClientRect(); const top = r.bottom + scrollY + 8, left = Math.max(12, Math.min(r.left + scrollX, innerWidth - 360)); el.style.top = top + 'px'; el.style.left = left + 'px'; }
  const first = root.querySelector('button'); if (first) first.focus();
}
function download(name, text, mime) {
  try { const blob = new Blob([text], { type: mime || 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('Downloading ' + name); return true; }
  catch (e) { toast('This viewer blocked the download. Use Copy instead.'); return false; }
}
function copyText(text) {
  const done = () => toast('Copied to clipboard');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  function fallback() { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Select the markdown and copy it manually.'); } ta.remove(); }
}
const slug = s => (s || 'deal').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/* ---------- render ---------- */
let lastBp = null, inChange = false, pendingRender = false, LEAVING = false;
function render() { if (inChange) { if (!pendingRender) { pendingRender = true; setTimeout(() => { pendingRender = false; doRender(); }, 0); } return; } doRender(); }
const dsKey = el => el && el !== document.body && el.dataset && Object.keys(el.dataset).length ? el.tagName + '|' + JSON.stringify(Object.assign({}, el.dataset)) : null;
function doRender() {
  const app = document.getElementById('app'); lastBp = bp();
  if (!S) { app.innerHTML = entryOverlay(); return; }
  if (UI.personId && !person(UI.personId) && (practice() || !SRV.user)) UI.personId = '';
  if (S && !practice()) applyIdentity();
  practiceVersions();
  const ae = document.activeElement, fid = ae && ae.id, fkey = !fid ? dsKey(ae) : null; let sel = null; try { if (ae && ae.selectionStart != null) sel = [ae.selectionStart, ae.selectionEnd]; } catch (e) {}
  const s = UI.screen, G = R.gates(), gi = { setup: 0, profile: 1, register: 2, classify: 3, counsel: 4, findings: 5, review: 6, outputs: 7 }[s];
  const scr = CEA.screens[s] || CEA.screens.overview;
  app.innerHTML = header() + `<main id="main" tabindex="-1"><div class="wrap">${scr()}</div></main>` + footer() + bottombar(gi != null ? gate(G[gi].ok, G[gi].ok ? 'Gate met' : 'Gate open') : '') + drawer();
  renderSheet();
  let el = fid ? document.getElementById(fid) : null;
  if (!el && fkey) el = [...document.querySelectorAll('[data-act],[data-path],[data-fv],[data-fs],[data-ob],[data-obs],[data-rt],[data-rts],[data-filt],[data-ask],[data-cls],[data-fnk],[data-fd]')].find(x => dsKey(x) === fkey) || null;
  if (el && el.disabled && UI.lastCtl) el = document.getElementById(UI.lastCtl) || el;
  if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange && /text|search|textarea/.test(el.type || el.tagName.toLowerCase())) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
}
function renderSheet() {
  const root = document.getElementById('sheetroot'); if (!root) return;
  if (!S || !UI.sheet || bp() !== 'phone') { root.innerHTML = ''; return; }
  const title = UI.sheet === 'filters' ? 'Filters' : 'New question to counsel', body = UI.sheet === 'filters' ? `<div class="stack">${CEA.filterControls('sf')}</div>` : CEA.askForm('sask');
  root.innerHTML = `<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet tall" role="dialog" aria-modal="true" aria-label="${title}"><div class="row between" style="margin-bottom:10px"><strong>${title}</strong><button class="iconbtn" id="sheetClose" data-act="closeSheet" aria-label="Close">✕</button></div>${body}</div>`;
}
function toast(msg) { if (!msg) return; const t = document.getElementById('toast'); t.textContent = msg; t.className = 'toast'; clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'vh'; }, 3400); }
function go(to, fromPop) { const same = UI.screen === to; UI.screen = to; UI.drawer = false; UI.sheet = null; UI.acct = false; closePop(true); popAnchor = null; if (to !== 'register') UI.hist = null; if (!fromPop && !same) { try { if (!history.state) history.replaceState({ screen: to }, '', '#' + to); else history.pushState({ screen: to }, '', '#' + to); } catch (e) {} } render(); window.scrollTo(0, 0); }

/* ---------- the server: sign-in identity, loading and saving ---------- */
const SRV = CEA.SRV = { checked: false, on: false, user: null, reason: '', code: '', exists: false, rev: 0, state: 'saved', err: '', timer: null, inflight: null, again: false, conflict: null, lastAt: '', lastBy: '', site: '', archives: [] };
async function api(method, path, body) {
  let r;
  try { r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin', redirect: 'manual', cache: 'no-store' }); }
  catch (e) { return { ok: false, status: 0, error: 'The server could not be reached. Check your connection.' }; }
  if (r.type === 'opaqueredirect' || r.status === 401) return { ok: false, status: 401, error: 'Your sign-in has expired. Reload the page to sign in again.' };
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) return { ok: false, status: r.status, error: (j && j.error) || ('The server returned an error (' + r.status + ').'), code: j && j.code, body: j };
  return { ok: true, status: r.status, body: j };
}
function practice() { return !!(S && S.engagement.example); }
const savesHere = () => SRV.on && S && !practice() && !UI.archived;
const canSetup = () => !!(SRV.user && (SRV.user.isAdmin || (SRV.user.roles || []).some(r => r === 'methodOwner' || r === 'delivery')));
function applyIdentity() { if (!SRV.user || practice()) return; UI.personId = SRV.user.id; }
function autosave() { if (!savesHere() || SRV.state === 'conflict') return; SRV.state = 'pending'; clearTimeout(SRV.timer); SRV.timer = setTimeout(saveNow, 1200); paintSave(); }
function conflictNames(paths) {
  if (!Array.isArray(paths) || !paths.length) return '';
  const name = p => p[0] === 'channels' && p[1] ? p[1] + (p[2] === 'fields' && p[3] ? ' · field ' + p[3] : p[2] ? ' · ' + p[2] : '') : p[0] === 'questions' ? 'a question to counsel' : p.slice(0, 2).join(' · ');
  return [...new Set(paths.map(name))].slice(0, 4).join('; ');
}
async function saveNow() {
  clearTimeout(SRV.timer); SRV.timer = null;
  if (!savesHere() || SRV.state === 'conflict') return;
  if (SRV.inflight) { SRV.again = true; return SRV.inflight; }
  const snap = S, text = JSON.parse(JSON.stringify(S)); delete text.loadNotes;
  SRV.state = 'saving'; paintSave();
  SRV.inflight = (async () => {
    const r = await api('PUT', '/api/engagement', { revision: SRV.rev, data: text });
    SRV.inflight = null;
    if (S !== snap) return;
    if (r.ok && r.body.merged && r.body.data) {
      let next = r.body.data;
      if (window.RAFMerge && JSON.stringify(S) !== JSON.stringify(text)) next = window.RAFMerge.merge3(text, JSON.parse(JSON.stringify(S)), next).data;
      try { const keep = { screen: UI.screen, channelId: UI.channelId, tab: UI.tab }; CEA.setState(R.hydrate(next)); Object.assign(UI, keep); applyIdentity(); } catch (e) { toast('Your changes were merged with someone else’s, but the result could not be shown. Reload the page.'); }
      toast('Saved, together with changes by ' + (r.body.mergedWith || 'someone else') + '.'); REV++; render();
    }
    if (r.ok && r.body.reload) { setTimeout(async () => { const keep = { screen: UI.screen, channelId: UI.channelId, tab: UI.tab, step: UI.step }; await loadReal(true); Object.assign(UI, keep); render(); }, 0); }
    if (r.ok && Array.isArray(r.body.versions)) { S.versions = r.body.versions; REV++; setTimeout(render, 0); }
    if (r.ok) { SRV.rev = r.body.revision; SRV.exists = true; SRV.lastAt = r.body.updatedAt; SRV.lastBy = r.body.updatedBy; SRV.err = ''; if (SRV.again) { SRV.again = false; SRV.state = 'pending'; return saveNow(); } SRV.state = 'saved'; UI.dirty = false; }
    else if (r.status === 409) { SRV.state = 'conflict'; SRV.conflict = r.body || {}; const items = conflictNames(SRV.conflict.conflicts); SRV.err = r.error + (items ? ' Item: ' + items + '.' : ''); toast(SRV.err); }
    else { SRV.state = 'error'; SRV.err = r.error; toast('Not saved: ' + r.error); }
    SRV.again = false; paintSave();
  })();
  return SRV.inflight;
}
async function flushSave() { if (!savesHere()) return true; if (SRV.state === 'pending' || SRV.timer) await saveNow(); else if (SRV.inflight) await SRV.inflight; return SRV.state === 'saved'; }
function saveLabel() {
  if (!S) return null;
  if (practice()) return ['b-ochre', 'Practice · not saved', 'The worked example is for practice. Nothing here is saved.'];
  if (UI.archived) return ['b-grey', 'Read only', 'An earlier assessment. Nothing here can be changed.'];
  if (!SRV.on) return ['b-ochre', 'Not saved', 'The server is not reachable.'];
  return { saved: ['b-green', 'Saved', SRV.lastAt ? 'Saved ' + fmtAt(SRV.lastAt) + ' by ' + SRV.lastBy : 'Saved'], pending: ['b-grey', 'Saving…', 'Changes will be saved in a moment'], saving: ['b-grey', 'Saving…', 'Saving'], error: ['b-red', 'Not saved', SRV.err], conflict: ['b-red', 'Changed elsewhere', SRV.err] }[SRV.state] || ['b-grey', '', ''];
}
function saveChip() { const l = saveLabel(); if (!l || !l[1]) return ''; return `<button class="badge ${l[0]}" id="savechip" data-act="saveChip" title="${esc(l[2])}" style="cursor:pointer">${esc(l[1])}</button>`; }
function paintSave() { const el = document.getElementById('savechip'); if (el) el.outerHTML = saveChip(); }
async function loadReal(quiet) {
  const r = await api('GET', '/api/engagement');
  if (!r.ok) { if (!quiet) toast('Could not load the assessment: ' + r.error); return false; }
  SRV.exists = !!r.body.exists; SRV.rev = r.body.revision || 0; SRV.state = 'saved'; SRV.err = ''; SRV.conflict = null; SRV.lastAt = r.body.updatedAt || ''; SRV.lastBy = r.body.updatedBy || ''; SRV.people = r.body.people || [];
  UI.dirty = false;
  if (r.body.exists) { try { CEA.setState(R.hydrate(r.body.data)); } catch (e) { CEA.setState(null); toast('The saved assessment could not be read: ' + e.message); return false; } applyIdentity(); REV++; }
  else CEA.setState(null);
  return true;
}
async function loadArchives() { const r = await api('GET', '/api/archive'); SRV.archives = r.ok ? r.body.entries || [] : []; }
async function refreshIfQuiet() {
  if (!savesHere() || SRV.state !== 'saved' || SRV.inflight || UI.pop || UI.sheet) return;
  const ae = document.activeElement; if (ae && (/TEXTAREA|SELECT/.test(ae.tagName) || (ae.tagName === 'INPUT' && !/checkbox|radio|button|submit/.test(ae.type)))) return;
  const r = await api('GET', '/api/engagement');
  if (!r.ok || !r.body.exists || r.body.revision === SRV.rev) return;
  const keep = { screen: UI.screen, channelId: UI.channelId, tab: UI.tab }; await loadReal(true); Object.assign(UI, keep); render(); toast('Updated with the latest saved changes from ' + (r.body.updatedBy || 'another user') + '.');
}
const initials = s => String(s || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('');
function account() {
  const u = SRV.user; if (!u) return '';
  const roles = (u.roles || []).map(roleName).join(', ');
  return `<span class="acct"><button class="avatar-link" data-act="acct" aria-haspopup="menu" aria-expanded="${!!UI.acct}" title="${esc(u.name || u.email)}" aria-label="Account: ${esc(u.name || u.email)}"><span class="avatar" aria-hidden="true">${esc(initials(u.name || u.email))}</span></button>${UI.acct ? `<div class="acct-menu" role="menu">
    <div class="acct-who"><span class="avatar" aria-hidden="true">${esc(initials(u.name || u.email))}</span><div><strong>${esc(u.name || u.email)}</strong>${u.name ? `<div class="small soft">${esc(u.email)}</div>` : ''}<div class="small soft">${esc(roles || 'No role in this assessment')}${u.isAdmin ? ' · administrator' : ''}</div></div></div>
    <a role="menuitem" class="item" href="/profile/">Your profile</a>
    ${u.isAdmin ? '<a role="menuitem" class="item" href="/admin/">Admin · users and activity</a>' : ''}
    <a role="menuitem" class="item" href="/user-guide/">User guide</a>
    <button role="menuitem" class="item" data-act="go" data-to="reference">Reference</button>
    <a role="menuitem" class="item signout" href="/auth/logout">Sign out</a></div>` : ''}</span>`;
}
function snapshotForSave() {
  const o = JSON.parse(JSON.stringify(S));
  o.findings = S.channels.map(e => { const f = R.finding(e); return { channelId: e.id, type: f.type || null, label: f.label || '', gapSize: f.gap || 0, priority: f.priority || '', exposure: f.exposure || '', failedTest: f.failedTest || '', route: f.route || '', owner: f.owner || '', step: f.step || '', f5: !!f.f5 }; });
  o.channels.forEach((e, i) => { const x = S.channels[i], ix = R.indicative(x); e.indicative = ix ? { value: ix.value, basis: ix.basis, adjustment: ix.adjustment } : null; e.confidence = R.confidence(x) || null; });
  o.savedAt = nowISO(); o.note = 'findings, indicative and confidence are a record of what was shown. They are recomputed on load.'; return o;
}
/* Versions for the worked example are kept in the browser; the server keeps them for a real assessment. */
function practiceVersions() {
  if (!S || !practice()) return;
  const key = JSON.stringify(S.channels.map(e => [e.id, e.fields, e.peerReview]).concat([S.reviews, S.profileAgreed, S.engagement.annexSigned, S.engagement.closure]));
  if (UI.vkey === key) return; UI.vkey = key;
  const prev = UI.vprev || { reviews: [], profileAgreed: {}, engagement: {} };
  const labels = R.signOffs(prev, S);
  if (labels.length) { const snap = R.snapshotOf(S); labels.forEach(label => S.versions.push({ id: 'V' + (S.versions.length + 1), label, at: nowISO(), by: pname(UI.personId) || '', snapshot: snap })); }
  UI.vprev = JSON.parse(JSON.stringify({ reviews: S.reviews, profileAgreed: S.profileAgreed, engagement: { annexSigned: S.engagement.annexSigned, closure: S.engagement.closure } }));
}

/* ---------- boot for the core ---------- */
CEA.init = content => {
  C = content; CEA.C = C;
  C.glossary.rule8 = { term: 'Field 8 before field 15', def: 'How information enters the channel is written before the reach is set, so a reviewer can re-derive the reach from it. Field 8 must be saved with a source, or recorded as not known, first.', where: 'Classify' };
  R = CEA.R = window.CEARules.create(C, () => S, { today });
  O = CEA.O = window.CEAOutputs.create({ C, S: () => S, R, pname, dDoc, fmtAt, today });
  R.setHitsProvider(() => R.hits(O.rawTexts(REV)));
};
CEA.setState = x => { S = x; REV++; };
Object.defineProperties(CEA, { S: { get: () => S }, REV: { get: () => REV }, popAnchor: { get: () => popAnchor, set: v => { popAnchor = v; } }, inChange: { get: () => inChange, set: v => { inChange = v; } }, LEAVING: { get: () => LEAVING, set: v => { LEAVING = v; } }, lastBp: { get: () => lastBp } });
Object.assign(CEA, { bump: () => { REV++; }, TRI, IDRE, sid, esc, uid, nowISO, today, dAU, dDoc, fmtAt, bp, T, linkify, inFrame, roleName, person, pname, me, has, isTri, codeHtml, ch, chIdx, adviser,
  log, setFieldVal, deny, ok, whyNote, pathTarget, setPath, blindFor, blindChannels, reachShown, MARKSVG, LOGO, badge, gate, SEQ, SNAME, personSelect, docband, header, drawer, footer, entryOverlay, opening, stepbar, bottombar, fld, peopleOpts, gateChips, gateCard, srcList, myActions,
  mdToHtml, openPop, closePop, renderPop, download, copyText, slug, render, renderSheet, toast, go,
  api, practice, savesHere, canSetup, applyIdentity, autosave, saveNow, flushSave, paintSave, loadReal, loadArchives, refreshIfQuiet, account, snapshotForSave, practiceVersions });
})();
