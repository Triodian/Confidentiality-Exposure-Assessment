import { withVersions, signOffs } from '../lib/core/versions.js';
const o = { reviews: [], profileAgreed: {}, engagement: {}, channels: [], versions: [] };
const n = { reviews: [{ point: 'R6', on: 'x' }], profileAgreed: { gcBy: 'g', counselBy: 'c' }, engagement: { annexSigned: { by: '' }, closure: { by: '' } }, channels: [{ id: 'CH-01', fields: { '2': { value: 'K1' }, '5': { value: 'tool' }, '17': { value: 'N5' } } }], versions: [{ id: 'bogus' }] };
let fails = 0; const t = (l, c) => { if (!c) fails++; console.log((c ? 'PASS' : 'FAIL') + ' · ' + l); };
t('two sign-offs found', signOffs(o, n).length === 2);
const nv = withVersions(o, n, 'Mo', 'now');
t('new version flag', nv === true); t('browser versions ignored', n.versions.length === 2 && n.versions[0].id === 'V1'); t('field 17 not kept', !n.versions[0].snapshot.channels['CH-01'].f[17]); t('kind kept', n.versions[0].snapshot.channels['CH-01'].kind === 'K1');
t('no new version on a plain save', withVersions(n, JSON.parse(JSON.stringify(n)), 'Mo', 'now') === false);
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
