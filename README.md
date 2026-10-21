# AI Confidentiality Exposure Assessment (Triodian)

Single-deal web app: each deployment holds one assessment for one transaction, run as the technical half of an
engagement led by DLC Legal. It runs as a Cloudflare Worker: the files in `public/` are served as static assets, and
`src/worker.js` handles `/api/*`. It is built from the AI Use Assessment app (`Triodian/use-assessment`) and keeps its
server design; the audit that set the baseline is in `docs/specs/`.

- `public/` – the app
  - `/` – the assessment (`index.html`, `cea-core.js` shell and persistence, `cea-screens.js` screens, `cea.js` events,
    worked example and boot, `cea-rules.js` the rules engine, `cea-outputs.js` the outputs, `cea-content.js`, `app.css`)
  - `/shared/rules.js` – the roles and per-change permission rules, one copy read by the browser and the server
  - `/admin/` – users, their roles, access requests and activity (administrators only), from `account.js`
  - `/profile/` – your name, organisation, email address and preferences, from `account.js`
  - `/user-guide/` – the user guide
- `src/worker.js` – Cloudflare entry point
- `lib/core/` – cloud-neutral API (`api.js`), the server-side save check (`rbac.js`), blind re-derivation (`blind.js`),
  versions, another deal (`review.js`), notifications, three-way merge
- `lib/identity/cloudflare-access.js` – verifies the Cloudflare Access sign-in
- `lib/store/d1.js` – database access (Cloudflare D1)
- `lib/config.js` – Access team domain and AUD tag, first administrator
- `wrangler.jsonc` – Worker configuration (name, custom domain, database, test site)
- `tools/build-content.py` – builds `public/cea-content.json` and `.js` (the scales, fields, questions, glossary and the
  framework text). Change a scale there, not in the code.
- `docs/specs/` – the framework and the baseline audit
- `tests/` – server rules and the rules engine (`node tests/<name>.test.mjs`); `tests/e2e/` – browser and API tests

## Setting up a deployment (three steps in Cloudflare)
1. **Database.** `npx wrangler d1 create confidentiality-exposure-db` and paste the id into `wrangler.jsonc`
   (`database_id`). Do the same for the test database if the test site is wanted.
2. **Sign-in.** In Zero Trust, create an Access application covering `confidentiality.triodian.com` (and the test
   address). Paste its AUD tag into `lib/config.js`, or set the Worker variable `ACCESS_AUD`. Until it is set, every API
   request answers 503 "Sign-in is not configured".
3. **Deploy.** Connect the repository to Cloudflare Workers Builds (`main` → live, `test` → test site with
   `--env test`), or run `npx wrangler deploy`. The first person in `BOOTSTRAP_ADMINS` to sign in becomes the
   administrator and adds everyone else in Admin.

Email needs `triodian.com` onboarded in Cloudflare Email Service; until then sends are listed as Failed in
Admin → Notifications and saves are unaffected. There is no link to the Risk Appetite app: a deal assessment has no
calibration set.

## How it works
- Everyone signs in through Cloudflare Access; the app's user list (managed in `/admin`) decides who gets in.
- Ten roles: method owner, assessor, classification reviewer, validation and delivery manager (Triodian); counsel
  (DLC Legal); GC, deal team lead and tenant owner (the company); independent checker. A person may hold several.
- Every change is saved to the server within about a second. The server checks each save against the signed-in
  person's roles, including the rules that depend on who did what: blind re-derivation of reach (R3), independent
  validation (R4), the check (R7) by the external checker or by validation, confirmations in one's own name.
  History is append-only and signed by the server.
- Two people editing at once: their changes are merged; only a change to the very same item by both is refused.
- The worked example (a fictional company and deal) runs in the browser only and is never saved.

## The method, as the app applies it
- **Deal profile** (P1 to P9) under a code name; the GC and counsel agree it (R1).
- **Channel register**: one entry per channel, kinds K1 to K7, boundaries B1 to B3, fields 1 to 25. Every kind is
  entered or recorded as absent with the reason. Fields are scanned for deal content.
- **Reach** R1 to R4 from three tests; **information class** I1 to I6; **exposure consequence** X1 to X4 derived.
- **Indicative rung** by the base rule (R1/R2 → N4, R3/R4 → N5), capped at N4 in an adviser's estate and N1 on a
  personal device. **Obtainability** T1 to T5 walks the ladder down; at B3 only T1 is asked.
- **Findings** F1 to F4 per channel once counsel sets the required rung (field 24); **F5**, the residual gap, is
  recorded beside F1 or F2 wherever the channel accepts typed or pasted text. Priority from the gap size and X code.
- **Outputs**: CD1 register (+CSV), CD2 findings and worksheets, CD3 90-day plan, CD4 residual gap, CD5 technical
  annex, QS question set, RP review pack, CM closing measures. Draft until R5 is cleared and the gates are met.
- **R5** scans every field and output for legal-line phrases, product names and deal content.
- **Close**: counsel records the closure and directs archive or destroy; another deal can then be started.

## Tests
```
for f in tests/*.test.mjs; do node "$f"; done
cd tests/e2e && npm ci && npx playwright install chromium && npx playwright test
```
The e2e run starts the Worker locally with a local database and signs in with the `X-Dev-User` header, which the app
honours only on localhost.

## Running locally
```
npx wrangler dev --local-upstream localhost --var LOCAL_DEV_NO_SIGNIN_EMAIL:you@example.com
```
