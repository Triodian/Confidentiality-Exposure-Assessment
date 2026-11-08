// The board's confidentiality position, the file this app reads from AI Board Direction, conforms to the published
// exchange schema (Triodian_Metamodel exchange/, vendored in vendor/exchange by tools/sync-exchange.mjs; task R.4),
// and a conforming file is accepted. The fixture was made by Board Direction's own builder from its worked example.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { exchangeErrors, fixture } from '../exchange.js';

const require = createRequire(import.meta.url);
const C = JSON.parse(readFileSync(new URL('../../../public/cea-content.json', import.meta.url), 'utf8'));
const R = require('../../../public/cea-rules.js').create(C, () => null, { today: () => '2026-12-02' });

test('reads: the confidentiality position conforms, and the app accepts it', () => {
  const f = fixture('confidentiality-position.json');
  expect(exchangeErrors('confidentiality-position-v1.schema.json', f)).toEqual([]);
  const r = R.readBoardPosition(f, '2026-12-02', 'Test');
  expect(r.error).toBeUndefined();
  expect(Object.keys(r.position.markings).length).toBe(Object.keys(f.markings).length);
});
