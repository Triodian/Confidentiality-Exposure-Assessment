// Email notifications: who should hear about what. Cloud-neutral. Same design as the AI Use Assessment app.
// Messages are always written to the notifications table. They are only emailed when a sender is
// configured (see src/worker.js); until then they are held, and administrators can see them in Admin.
// Emails carry channel ids and question references only: no deal content, no code name beyond the engagement reference.

const short = (s, n = 160) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const dLong = ymd => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString('en-AU', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : ymd; };
const fval = (e, n) => { const f = e && e.fields && e.fields[n]; return f && !f.notKnown ? f.value || '' : ''; };
const TRI = ['methodOwner', 'assessor', 'peer', 'validation', 'delivery'];

function footer(origin) {
  return `\n\nOpen your actions: ${origin}/#actions\n\nYou get these emails because you take part in the AI confidentiality exposure assessment. You can turn them off in your profile: ${origin}/profile/`;
}

/** Messages caused by one save. users: all users (with roles, active, notify). actor: the user who saved. */
export function eventsFromSave(oldData, newData, users, actor, origin) {
  if (!oldData || !newData) return [];
  const msgs = [], active = users.filter(u => u.active && u.id !== actor.id);
  const byId = id => active.find(u => u.id === id);
  const withRole = r => active.filter(u => (u.roles || []).includes(r));
  const who = actor.name || actor.email;
  const ref = (newData.engagement && newData.engagement.reference) || 'the assessment';
  const send = (list, subject, text) => [...new Map(list.filter(Boolean).map(u => [u.id, u])).values()].forEach(u => msgs.push({ to: u, subject, text: text + footer(origin) }));

  // Questions to counsel: new → counsel; answered → the method owner
  const oldQ = new Map((oldData.questions || []).map(q => [q.ref, q]));
  (newData.questions || []).forEach(q => {
    const was = oldQ.get(q.ref);
    if (!was) send(withRole('counsel'), `Question to counsel ${q.ref} · ${ref}`, `${who} sent a question to counsel${q.channelId ? ' on ' + q.channelId : ''}:\n\n"${short(q.question, 600)}"`);
    else if (q.status === 'answered' && was.status !== 'answered') send(withRole('methodOwner'), `Counsel answered ${q.ref} · ${ref}`, `${who} recorded counsel's answer to ${q.ref}:\n\n"${short(q.response, 600)}"`);
  });

  const oldE = new Map((oldData.channels || []).map(e => [e.id, e]));
  (newData.channels || []).forEach(e => {
    const was = oldE.get(e.id) || { fields: {}, peerReview: {} };
    // Reach recorded → the deal team lead confirms it; reviewers re-derive it blind (not the classifier)
    if (fval(e, 15) && !fval(was, 15)) {
      send(withRole('dealLead'), `Reach to confirm · ${e.id} · ${ref}`, `${who} recorded reach ${fval(e, 15)} for ${e.id}. The deal team lead confirms who can reach this channel.`);
      send(withRole('peer').filter(u => u.id !== e.classifiedBy), `Reach to re-derive (R3) · ${e.id} · ${ref}`, `${who} recorded a reach class for ${e.id}. Re-derive it from fields 4 and 8 alone; the classifier's reach stays hidden until you record yours.`);
    }
    // R3 difference → the classifier and the method owner
    const pr = e.peerReview || {}, wpr = was.peerReview || {};
    if (pr.differs && !wpr.differs)
      send([byId(e.classifiedBy), ...withRole('methodOwner')], `R3 difference to resolve · ${e.id} · ${ref}`, `${who} re-derived ${e.id} as ${pr.reach}, which differs from the recorded reach ${fval(e, 15)}. Agree it with the reviewer, who records the resolution. Phase 3 cannot close until it is resolved.`);
    // A channel recorded as not determinable → the delivery manager tracks the question
    if (e.notDeterminable && e.notDeterminable.on && !(was.notDeterminable || {}).on)
      send(withRole('delivery'), `Not determinable on documents · ${e.id} · ${ref}`, `${who} recorded ${e.id} as F4. The question that would resolve it: "${short(e.notDeterminable.question, 300)}". Who could answer: ${short(e.notDeterminable.who, 120) || 'not named'}.`);
  });

  // Check points: new → Triodian (method owner and delivery manager); response → the checker
  const oldIR = new Map((oldData.independentReviewPoints || []).map(x => [x.ref, x]));
  (newData.independentReviewPoints || []).forEach(x => {
    const was = oldIR.get(x.ref);
    const logged = (!was && String(x.point || '').trim()) || (was && !String(was.point || '').trim() && String(x.point || '').trim());
    if (logged) send([...withRole('methodOwner'), ...withRole('delivery')], `Check point ${x.ref} · ${ref}`, `${who} logged a check point${x.output ? ' on ' + x.output : ''}:\n\n"${short(x.point, 600)}"`);
    else if (was && String(x.response || '').trim() && (x.response || '') !== (was.response || '')) send(withRole('checker'), `Response to check point ${x.ref} · ${ref}`, `${who} responded to ${x.ref}:\n\n"${short(x.response, 600)}"`);
  });

  // Check complete → counsel and the GC
  const r7 = d => ((d.reviews || []).find(r => r.point === 'R7') || {}).result;
  if (r7(newData) === 'complete' && r7(oldData) !== 'complete') send([...withRole('counsel'), ...withRole('gc')], `Check complete · ${ref}`, `${who} recorded the check (R7) as complete. The assessment can move to close.`);
  return msgs;
}

/** Daily: questions to counsel open beyond the agreed turnaround (P9, default two working days) → counsel, one email each per day. */
export function dueReminders(data, users, today, origin) {
  if (!data) return [];
  const t = Date.parse(today), days = Math.max(1, parseInt(((data.profile || {}).counselTurnaround), 10) || 2);
  const open = (data.questions || []).filter(q => q.status !== 'answered' && q.sentOn && (t - Date.parse(q.sentOn)) / 864e5 > days);
  if (!open.length) return [];
  const ref = (data.engagement && data.engagement.reference) || 'the assessment';
  const lines = open.map(q => `- ${q.ref}: sent ${dLong(q.sentOn)} · ${short(q.question, 120)}`).join('\n');
  return users.filter(u => u.active && (u.roles || []).includes('counsel')).map(u => ({ to: u, subject: `Questions waiting for counsel · ${ref}`, text: `These questions to counsel have been open for more than the agreed ${days} working ${days === 1 ? 'day' : 'days'}:\n\n${lines}` + footer(origin), key: `due:${u.id}:${today}` }));
}

/** Writes messages to the outbox and sends them if a sender is configured. Never throws. */
export async function deliver(msgs, store, sender, now) {
  for (const m of msgs) {
    try {
      if (m.to.notify === false) continue;
      if (m.key && await store.hasNotification(m.key)) continue;
      const id = await store.addNotification({ key: m.key || null, to: m.to.email, subject: m.subject, body: m.text, status: sender ? 'sending' : 'held' }, now);
      if (!sender) continue;
      try { await sender({ to: m.to.email, subject: m.subject, text: m.text }); await store.markNotification(id, 'sent', '', now); }
      catch (e) { await store.markNotification(id, 'failed', String(e && (e.code || e.message) || e).slice(0, 200), now); }
    } catch (e) { /* a notification problem must never stop a save */ }
  }
}

export { TRI };
