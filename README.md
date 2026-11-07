# AI Confidentiality Exposure Assessment

[![Tests](https://github.com/Triodian/Confidentiality-Exposure-Assessment/actions/workflows/tests.yml/badge.svg)](https://github.com/Triodian/Confidentiality-Exposure-Assessment/actions/workflows/tests.yml) [![Licence: Apache 2.0](https://img.shields.io/badge/licence-Apache%202.0-blue.svg)](LICENSE)

AI Confidentiality Exposure Assessment shows, for one transaction, where confidential information can reach an
external AI model: each channel the information passes through (email, document rooms, meeting tools, advisers'
systems), what protection that channel gives, and the protection counsel requires. It is the technical half of an
engagement led by the company's counsel, and is built for companies outside prudential regulation.

> The app records facts and the positions people take. It is not legal advice and does not say what the law requires;
> counsel decides what applies.

**Try it.** The demo runs at [confidentiality.triodian.com](https://confidentiality.triodian.com), with a worked example you can open without changing
anything. Ask Triodian for the demo sign-in.

**Run it yourself.** It runs as a Cloudflare Worker with a D1 database. See [Running locally](#running-locally) and
[Tests](#tests) below, and the [installer](https://github.com/Triodian/triodian-install) to put it into your own
Cloudflare account.

## Part of the Triodian AI governance apps

| App | What it is for |
| --- | --- |
| [AI Obligations Atlas](https://github.com/Triodian/obligations-atlas) | The AI governance obligations that apply by jurisdiction and use case, tiered by source, with a matter brief for counsel |
| [AI Board Direction](https://github.com/Triodian/board-direction) | A board sets its direction on AI: where to use it, what to rule out, what comes back to the board |
| [AI Risk Appetite](https://github.com/Triodian/risk_appetite) | A regulated entity settles its appetite for AI risk, for the board to approve |
| [AI Use Assessment](https://github.com/Triodian/use-assessment) | The AI in a regulated entity's supply chain, measured against that appetite |
| [AI Confidentiality Exposure Assessment](https://github.com/Triodian/Confidentiality-Exposure-Assessment) | Where confidential information in one transaction can reach an external AI model |
| [Installer and suite test](https://github.com/Triodian/triodian-install) | Puts the apps a client needs into a Cloudflare account, and tests them together |

The engagement apps are separate, each with its own repo and database. Deployed together they share one sign-in and
reach each other through Cloudflare service bindings.

## How it is built

Single-deal web app: each deployment holds one assessment for one transaction, run as the technical half of an
engagement led by the company’s counsel (any law firm; the firm is named in set-up). It runs as a Cloudflare Worker: the files in `public/` are served as static assets, and
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
  (the engaging law firm); GC, deal team lead and tenant owner (the company); independent checker. A person may hold several.
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

## Contributing

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](CODE_OF_CONDUCT.md).
Report security problems privately, as [SECURITY.md](SECURITY.md) describes, not as issues.

## Supporting the project

This is one of five open-source apps from Triodian. There are four ways to help: use it, contribute to it, review it, or adopt it in your own work. See [SUPPORTING.md](SUPPORTING.md).

## Licence

AI Confidentiality Exposure Assessment is open source under the [Apache License, Version 2.0](LICENSE). Copyright 2026 Triodian Pty Ltd.
Third-party components bundled with it keep their own licences; see [`NOTICE`](NOTICE).
