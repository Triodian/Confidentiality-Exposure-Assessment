// Versions of the assessment, kept at each sign-off so later changes can be compared and redlined.
// The server adds them (lib/core/rbac.js); a browser cannot add, change or remove one.
// public/cea-rules.js has the same two functions for the worked example, which is never saved.

/** What a version keeps: each channel's field values as shown, its kind, and the finding per channel. */
export function snapshotOf(d) {
  const channels = {};
  (d.channels || []).forEach(e => {
    const f = {};
    Object.entries(e.fields || {}).forEach(([n, x]) => {
      if (!x) return;
      const v = x.notKnown ? 'not known' : String(x.value == null ? '' : x.value) + (x.detail ? ' · ' + x.detail : '');
      if (v) f[n] = v;
    });
    // Fields 17, 21, 22 and 25 are worked out from the stored values, so they are not kept.
    [17, 21, 22, 25].forEach(n => { delete f[n]; });
    channels[e.id] = { kind: ((e.fields || {})[2] || {}).value || '', f };
  });
  const findings = {};
  (d.findings || []).forEach(x => { if (x && x.channelId) findings[x.channelId] = x.type || ''; });
  return { channels, findings };
}

/** The sign-offs this save records: each one starts a new version. */
export function signOffs(o, n) {
  const rev = (d, p) => ((d && d.reviews) || []).find(r => r && r.point === p) || {};
  const eng = d => (d && d.engagement) || {};
  const out = [];
  const pa = d => ((d && d.profileAgreed) || {});
  if (pa(n).gcBy && pa(n).counselBy && !(pa(o).gcBy && pa(o).counselBy)) out.push('Profile agreed (R1)');
  if (rev(n, 'R6').on && !rev(o, 'R6').on) out.push('Counsel review recorded (R6)');
  if (rev(n, 'R7').result === 'complete' && rev(o, 'R7').result !== 'complete') out.push('Check complete (R7)');
  if ((eng(n).annexSigned || {}).by && !(eng(o).annexSigned || {}).by) out.push('Technical annex signed');
  if ((eng(n).closure || {}).by && !(eng(o).closure || {}).by) out.push('Closure recorded');
  return out;
}

/** Appends a version for each sign-off in this save. Keeps the stored versions; ignores any sent by the browser. */
export function withVersions(oldData, data, by, now) {
  const versions = ((oldData && oldData.versions) || []).slice();
  const labels = signOffs(oldData, data);
  if (labels.length) {
    const snap = snapshotOf(data);
    labels.forEach(label => versions.push({ id: 'V' + (versions.length + 1), label, at: now, by, snapshot: snap }));
  }
  data.versions = versions;
  return labels.length > 0;
}
