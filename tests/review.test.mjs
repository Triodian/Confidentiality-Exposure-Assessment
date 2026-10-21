import { nextAssessment, isClosed, archiveLabel, destroyDirected } from '../lib/core/review.js';
const d = { engagement: { id: 'e1', company: 'Acme', reference: 'R1', closure: { by: 'cn', on: '2026-11-10', disposition: 'destroy' }, annexSigned: { by: 'mo', on: 'x' } }, profile: { codeName: 'Kestrel', tools: [{ tool: 'A' }], devicePolicy: 'byod', advisers: [{ id: 'ADV-01' }], folders: [{ name: 'x' }], counselTurnaround: 3 }, profileAgreed: { gcBy: 'g' }, reviews: [{ point: 'R7', result: 'complete', on: '2026-11-09' }], channels: [{ id: 'CH-01' }], questions: [{ ref: 'QC-01' }], documents: [{ id: 'D1', status: 'received', date: 'x' }], interviews: [{ id: 'IV-1', date: 'x', notesRef: 'n' }], versions: [{ id: 'V1' }], history: [{}] };
let fails = 0; const t = (l, c) => { if (!c) fails++; console.log((c ? 'PASS' : 'FAIL') + ' · ' + l); };
t('closed', isClosed(d)); t('label uses the code name', archiveLabel(d).startsWith('Kestrel · R1 · closed 10 November 2026')); t('destroy directed', destroyDirected(d));
const n = nextAssessment(d, 'e2', 'Mo', 'now', 'L');
t('channels cleared', n.channels.length === 0); t('profile deal items cleared', n.profile.codeName === '' && n.profile.advisers.length === 0 && n.profile.folders.length === 0);
t('tools carried and marked', n.profile.tools[0].carried === true && n.profile.devicePolicy === 'byod'); t('turnaround kept', n.profile.counselTurnaround === 3);
t('documents reset', n.documents[0].status === ''); t('closure reset', n.engagement.closure.by === ''); t('previous recorded', n.previous.label === 'L');
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
