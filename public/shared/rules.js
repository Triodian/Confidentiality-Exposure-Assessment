// Permission rules for the AI Confidentiality Exposure Assessment, shared by the server (lib/core/rbac.js) and the
// browser (cea.js). One copy, so the reason a control is disabled on screen is the reason the server would refuse the save.
// Plain JavaScript, no platform code.
//
// The assessment document (schema triodian.cea.v1):
//   engagement        company, reference, counsel firm, dates, brief confirmation, checker, legal and product phrase
//                     lists, annex text and signature, closure
//   profile           the nine deal-profile items P1 to P9 (code name, stage, counts, folders, advisers, tools, device
//                     policy, privilege marking, counsel turnaround)
//   profileAgreed     R1: the GC's and counsel's agreement to the profile
//   channels          one entry per channel, CH-01 onward: fields 1 to 25, reach tests, classification, obtainability,
//                     classification review (R3), not-determinable stop rule, finding owner
//   questions         questions to counsel, QC-01 onward
//   reviews           R1 to R7
//   demonstration     the five-minute demonstration record
//   exceptions, independentReviewPoints, r5Cleared, findings, versions, previous, history

export const ROLES = [
  { id: 'methodOwner', name: 'Method owner (Triodian)' },
  { id: 'assessor', name: 'Assessor (Triodian)' },
  { id: 'peer', name: 'Classification reviewer (Triodian)' },
  { id: 'validation', name: 'Validation (Triodian)' },
  { id: 'delivery', name: 'Delivery manager (Triodian)' },
  { id: 'counsel', name: 'Counsel (law firm)' },
  { id: 'gc', name: 'GC or approving executive (company)' },
  { id: 'dealLead', name: 'Deal team lead (company)' },
  { id: 'tenantOwner', name: 'Tenant owner (company)' },
  { id: 'checker', name: 'Independent checker' },
  // Where the GC also acts as counsel (development plan task 0.5), the second agreement at R1 comes from this person.
  { id: 'executive', name: 'Second approver (company executive)' },
];
export const ROLE_IDS = ROLES.map(r => r.id);
export const TRIODIAN = ['methodOwner', 'assessor', 'peer', 'validation', 'delivery'];

/** Summary for the Admin page: what each role may do. */
export const PERMISSIONS = [
  { what: 'Set-up: engagement details, documents, interviews, checker', roles: ['methodOwner', 'delivery'] },
  { what: 'The deal profile (P1 to P9)', roles: ['methodOwner', 'delivery'] },
  { what: 'GC agreement to the profile (R1)', roles: ['gc'] },
  { what: 'Counsel agreement to the profile (R1)', roles: ['counsel'] },
  { what: 'Second agreement to the profile (R1), where the GC also acts as counsel: the named second approver', roles: ['executive'] },
  { what: 'Register facts, fields 1 to 14 (not on channels they review)', roles: ['assessor', 'methodOwner'] },
  { what: 'Classification, fields 15 to 22 (not on channels they review)', roles: ['assessor', 'methodOwner'] },
  { what: 'Confirm who can reach a channel (question 1)', roles: ['dealLead'] },
  { what: 'Blind re-derivation of reach, R3 (not on channels they classified)', roles: ['peer'] },
  { what: 'Completeness and deal-content check, R2', roles: ['delivery'] },
  { what: 'Validation, R4 (only if they classified or reviewed nothing)', roles: ['validation'] },
  { what: 'Legal-line and content hits, phrase lists, R5', roles: ['methodOwner'] },
  { what: 'Counsel review, R6', roles: ['counsel'] },
  { what: 'Check complete, R7', roles: ['checker', 'validation'] },
  { what: 'Questions to counsel', roles: TRIODIAN },
  { what: 'Responses from counsel', roles: ['counsel', ...TRIODIAN] },
  { what: 'Check points: log, close or disclose', roles: ['checker'] },
  { what: 'Check points: respond', roles: TRIODIAN },
  { what: 'Demonstration record, exceptions, finding owners', roles: TRIODIAN },
  { what: 'Annex text and signature (CD5)', roles: ['methodOwner'] },
  { what: 'Closure: archive or destroy working papers', roles: ['counsel'] },
];

const rev = (S, p) => (((S && S.reviews) || []).find(r => r && r.point === p)) || {};
/** Closed: the check (R7) is complete and counsel has recorded the closure. */
export const isClosed = S => !!(S && rev(S, 'R7').result === 'complete' && (((S.engagement || {}).closure || {}).by));
const OPEN_WHEN_CLOSED = new Set(['annex', 'sign', 'close', 'r7']);
const validatedBy = (S, id) => !!(rev(S, 'R4').by === id && rev(S, 'R4').result);

/** One person may not give both agreements to the profile (R1) unless set-up says the GC also acts as counsel. */
export const BOTH_AGREEMENTS = 'You recorded the other agreement to the profile. One person cannot give both: if the GC also acts as counsel, tick “The GC also acts as counsel” in set-up and name a second approver, who gives the second agreement.';

/**
 * The app's rules. user: { id, roles[], isAdmin }. S: the stored assessment. x: the stored channel, when the change is to one.
 * Returns '' when allowed, otherwise the reason, which the browser shows beside the disabled control.
 */
export function deny(target, user, S, x) {
  const r = k => (user.roles || []).includes(k), tri = TRIODIAN.some(r), id = user.id;
  const channels = (S && S.channels) || [];
  const blind = e => !!(e && r('peer') && !(e.peerReview || {}).reach && e.classifiedBy !== id);
  if (isClosed(S) && !OPEN_WHEN_CLOSED.has(target)) return 'This assessment is closed: the check (R7) is complete and counsel has recorded the closure. Start another deal assessment to make further changes.';
  switch (target) {
    case 'setup': return r('methodOwner') || r('delivery') || user.isAdmin ? '' : 'Only the method owner, the delivery manager or an administrator can change set-up.';
    case 'profile': return r('methodOwner') || r('delivery') || user.isAdmin ? '' : 'Only the method owner, the delivery manager or an administrator can change the deal profile.';
    case 'agreeGC': {
      if (!r('gc')) return 'Only the GC can record the GC’s agreement to the profile.';
      const pa = (S && S.profileAgreed) || {}, e = (S && S.engagement) || {};
      if (!e.gcActsAsCounsel && pa.counselBy && pa.counselBy === id) return BOTH_AGREEMENTS;
      return '';
    }
    case 'agreeCounsel': {
      // Where the GC also acts as counsel (development plan task 0.5), the second agreement comes from the second approver named in set-up.
      const pa = (S && S.profileAgreed) || {}, e = (S && S.engagement) || {};
      if (e.gcActsAsCounsel) {
        if (!e.secondApproverId) return 'The GC also acts as counsel. Name the second approver in set-up first.';
        return e.secondApproverId === id && r('executive') ? '' : 'The GC also acts as counsel, so the second agreement to the profile comes from the second approver named in set-up.';
      }
      if (!r('counsel')) return 'Only counsel can record counsel’s agreement to the profile.';
      if (pa.gcBy && pa.gcBy === id) return BOTH_AGREEMENTS;
      return '';
    }
    case 'facts':
      if (!(r('assessor') || r('methodOwner'))) return 'Only an assessor or the method owner can enter facts.';
      if (x && (x.peerReview || {}).personId === id) return 'You are the classification reviewer of this channel, so you cannot edit it.';
      return '';
    case 'classify':
      if (!(r('assessor') || r('methodOwner'))) return 'Only an assessor or the method owner can classify a channel.';
      if (validatedBy(S, id)) return 'You recorded R4 (validation), so you cannot classify channels in this assessment.';
      if (x && (x.peerReview || {}).personId === id) return 'You are the classification reviewer of this channel, so you cannot classify it.';
      if (x && blind(x)) return 'Record your own reach for this channel first (R3, classification review).';
      return '';
    case 'confirmReach': return r('dealLead') ? '' : 'Only the deal team lead can confirm who can reach a channel.';
    case 'peer':
      if (!r('peer')) return 'Only a classification reviewer can re-derive the reach (R3).';
      if (validatedBy(S, id)) return 'You recorded R4 (validation), so you cannot review channels in this assessment.';
      if (x && x.classifiedBy === id) return 'You classified this channel, so you cannot review it.';
      if (x && (x.peerReview || {}).personId && x.peerReview.personId !== id) return 'Another reviewer has already recorded R3 for this channel.';
      return '';
    case 'r2': return r('delivery') ? '' : 'Only the delivery manager can run R2 (register completeness).';
    case 'r4':
      if (!r('validation')) return 'Only a validation person can record R4 (validation).';
      if (channels.some(e => e.classifiedBy === id || (e.peerReview || {}).personId === id)) return 'You classified or reviewed a channel in the register, so you cannot validate it.';
      return '';
    case 'r5': return r('methodOwner') ? '' : 'Only the method owner can clear legal-line and content hits or change the phrase lists (R5).';
    case 'r6': return r('counsel') ? '' : 'Only counsel can record R6 (counsel review).';
    case 'r7': {
      const e = (S && S.engagement) || {};
      if (((S && S.independentReviewPoints) || []).some(p => p.status === 'open')) return 'Close or disclose every check point first.';
      if (e.checkerMode === 'external') return r('checker') && (!e.checkerPersonId || e.checkerPersonId === id) ? '' : 'An external checker is confirmed, so only the checker named in set-up can confirm R7 (check).';
      if (!r('validation')) return 'No external checker is confirmed, so validation stands as R7 and only a validation person can confirm it.';
      if (channels.some(c => c.classifiedBy === id || (c.peerReview || {}).personId === id)) return 'You classified or reviewed a channel, so you cannot confirm the check.';
      return '';
    }
    case 'irLog': return r('checker') ? '' : 'Only the independent checker can log check points.';
    case 'irRespond': return tri ? '' : 'Only someone with a Triodian role can respond to check points.';
    case 'irClose': return r('checker') ? '' : 'Only the independent checker can close or disclose a check point.';
    case 'tri': return tri ? '' : 'Only someone with a Triodian role can record this.';
    case 'ask': return tri ? '' : 'Only someone with a Triodian role can raise questions to counsel.';
    case 'answer': return r('counsel') || tri ? '' : 'Only counsel can record the response, or someone with a Triodian role transcribing counsel’s written response.';
    case 'annex': return r('methodOwner') ? '' : 'Only the method owner can write the annex text.';
    case 'sign':
      if (!r('methodOwner')) return 'Only the method owner can sign the annex.';
      if (channels.some(e => (e.peerReview || {}).personId === id)) return 'You are the classification reviewer of at least one channel, so you cannot sign the annex.';
      return '';
    case 'close': return r('counsel') ? '' : 'Only counsel records the closure and directs what happens to the working papers.';
  }
  return 'This change is not allowed.';
}

/** Which rule a change to a channel field falls under. Fields 1 to 14 are facts; 15 to 22 classification; 23 and 24 counsel's. */
export const fieldTarget = n => (n <= 14 ? 'facts' : n <= 22 ? 'classify' : n <= 24 ? 'answer' : 'tri');

/** Which rule a change to a channel key (other than fields) falls under. */
export function channelKeyTarget(key, newE) {
  if (['reachTests', 'reachOverrideReason', 'adjustmentReason', 'obtainability', 'classifiedBy', 'confChosen', 'confRaiseReason'].includes(key)) return 'classify';
  if (key === 'reachConfirmedBy' || key === 'reachConfirmedOn') return (newE && newE.reachConfirmedBy) ? 'confirmReach' : 'classify';
  if (key === 'peerReview' || key === 'reviewedBy') return 'peer';
  if (key === 'owner' || key === 'horizon') return 'tri';
  return 'facts';
}
