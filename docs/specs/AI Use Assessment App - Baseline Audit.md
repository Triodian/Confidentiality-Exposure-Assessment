# AI Use Assessment App: Baseline Audit

Oct 21, 2026 · @Damian Hickey · Audit of Triodian/use-assessment at commit ae9d7cd, as the baseline for the AI Confidentiality Exposure Assessment app

## 1. Purpose and what was audited

The AI Use Assessment app is a working, single-tenant web app with a server-checked role model, and most of it carries straight into the deal app. This audit records what exists at commit `ae9d7cd` of `Triodian/use-assessment` (18 October 2026) so the AI Confidentiality Exposure Assessment app can be specified as changes to a known baseline rather than from nothing.

Every file in the repository was read: the Worker entry point, the cloud-neutral server library, the storage and identity adapters, the three front-end scripts, the stylesheet, the content file, the user guide, the tests and the deployment configuration. The live site was not opened and no database was queried; everything here is from the code.

| Area | Files | Lines |
| --- | --- | --- |
| Server entry (Cloudflare) | `src/worker.js` | 74 |
| Server rules, cloud-neutral | `lib/core/api.js`, `rbac.js`, `roles.js`, `blind.js`, `versions.js`, `review.js`, `notify.js`, `merge.js` | 1,020 |
| Adapters | `lib/identity/cloudflare-access.js`, `lib/store/d1.js`, `lib/config.js` | 251 |
| Assessment UI | `public/aua.js` (243 KB), `public/aua-content.json`, `public/export.js`, `public/shared/merge.js` | 2,700 |
| Admin and profile UI | `public/account.js`, `public/admin/index.html`, `public/profile/index.html` | 260 |
| Styles and shells | `public/app.css` (38 KB), `public/index.html`, `public/user-guide/index.html` | 940 |
| Tests | `tests/*.test.mjs` (5), `tests/e2e/specs/*.spec.js` (2) | 380 |
| Specs kept in the repo | `docs/specs/` build specification, fix mini-specs v1 and v2, framework | — |

Terms used below: *entry* is one register row (REG-001 onward); *arrangement* is the thing an entry belongs to (ARR-01 onward); *engagement* is the one assessment a deployment holds; *S* is the browser's copy of it.

## 2. Architecture and deployment

The app is one Cloudflare Worker per deployment: static files from `public/` and an `/api/*` handler, with all business rules in a cloud-neutral library so the Cloudflare parts (identity, storage, email) are swappable adapters.

&#91;embedded content: deployment architecture · 7 parts\]

The browser never talks to the database or the Risk Appetite app directly; the Worker reads the calibration set with a service token and writes emails to an outbox before sending.

| Item | Position |
| --- | --- |
| Hosting | Cloudflare Workers with static assets; `workers_dev` and preview URLs switched off; reachable only at the custom domain |
| Live site | `use-assessment.triodian.com`, branch `main`, database `use-assessment-db` |
| Test site | `use-assessment-test.triodian.com`, branch `test`, own database, `SITE_LABEL` banner on every page; deployed with `wrangler deploy --env test` |
| Deploy | Cloudflare builds from GitHub on push; GitHub Actions runs the tests separately and does not gate the deploy |
| Configuration | `wrangler.jsonc` (name, routes, D1 binding, cron, email binding, plain vars); `lib/config.js` (Access team domain, AUD tag, bootstrap admins); secrets set in the Cloudflare dashboard only |
| Secrets | `APPETITE_CLIENT_ID`, `APPETITE_CLIENT_SECRET` (service token halves); optional `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` overrides |
| Scheduled work | One cron at 21:00 UTC (07:00 Brisbane): reminds counsel of questions open 7 days or more |
| Dependencies | None at runtime beyond the bundled `docx.min.js`; fonts self-hosted; Playwright and wrangler for tests only |
| Local run | `wrangler dev` with `LOCAL_DEV_NO_SIGNIN_EMAIL`; an `X-Dev-User` header picks a user, honoured on localhost only |

The server library is the part a second cloud would keep: `handle(req, store)` in `lib/core/api.js` takes a plain request description and a storage adapter and returns `{status, body}`. `src/worker.js` is 74 lines of wiring.

## 3. Security model

Three layers gate every API call: Cloudflare Access proves who the person is, the user list decides whether they may enter, and `rbac.js` decides per change whether their roles allow it. The browser's own `deny()` only mirrors the server; nothing in the browser is trusted.

### 3.1 Identity (`lib/identity/cloudflare-access.js`)

- Everyone signs in through Cloudflare Access (one Access application covers live and test). The Worker verifies the `Cf-Access-Jwt-Assertion` header or `CF_Authorization` cookie itself: RS256 only, key fetched from `/cdn-cgi/access/certs` and cached for an hour, audience must match the configured AUD tag, issuer must be the team domain, `exp` must be in the future, `email` must be present.
- Fails closed: no team domain or AUD configured gives 503; a missing, unsigned, expired or wrong-audience token gives 401 with a plain-English reason.
- The email is lower-cased and is the only identity the rest of the server sees. Replacing this file with a Cognito or Entra adapter is the documented route to another cloud.
- Local development only: `LOCAL_DEV_NO_SIGNIN_EMAIL` on `localhost`/`127.0.0.1` bypasses Access, and `X-Dev-User` picks a user. The hostname check means it cannot apply in production.

### 3.2 Entry (`lib/core/api.js`)

- Signed in is not enough: the email must match an active row in `users`. Otherwise the request is logged in `access_requests` (first and last attempt, count) and refused 403 with code `no_access`, and the person sees it in Admin under "Waiting for access".
- Bootstrap: while no active administrator exists, an email in `BOOTSTRAP_ADMINS` becomes one on first sign-in, audited as `user.create · first administrator`.
- Email change is two-step: the person requests a new address in Profile; signing in with that address (through Access) confirms it. Audited both ways.
- Request body limit 5 MB; invalid JSON gives 400. Admin routes require `isAdmin`; `POST /next-assessment` requires admin or method owner.

### 3.3 Authorisation per change (`lib/core/rbac.js`)

A save is a whole-assessment `PUT /engagement` with the revision it was based on. The server diffs the stored assessment against the incoming one and maps every changed item to a rule target, then asks `deny(target, user, stored, entry)`. Any refusal rejects the whole save with 403 and nothing is stored.

| Target | Who may change it | Rules that depend on who did what |
| --- | --- | --- |
| `setup` (engagement details, documents, interviews, calibration, anything else top-level) | method owner, delivery manager, administrator | — |
| `set` (arrangements) | method owner, assessor, delivery | `findingOwner`, `dl4Triggers` are `tri` instead |
| `facts` (fields 1–14, new or removed entries) | assessor, method owner | not the entry's peer reviewer |
| `classify` (fields 15–22, tier, tests, obtainability, confidence) | assessor, method owner | not if they recorded R4; not the entry's peer reviewer; a peer with the peer role must record their own tier first |
| `consequence` (field 16 confirmation) | arrangement owner | in own name only |
| `peer` (R3 re-derivation) | peer reviewer | not if they classified the entry; not if they recorded R4; one peer per entry; in own name only |
| `r2`, `r4`, `r5`, `r6` | delivery · validation · method owner · counsel | R4 refused if the person classified or peer-reviewed anything |
| `r7` | independent reviewer, or the named CRO when the reporting line is "directly to the CRO" | all independent review points must be closed or disclosed |
| `agreeGC`, `agreeCounsel` (R1) | GC · counsel | each in own name only |
| `ask`, `answer`, `tri` | Triodian roles; counsel may answer | — |
| `irLog`, `irClose`, `irRespond` | independent reviewer · independent reviewer · Triodian | — |
| `annex`, `sign` | method owner | cannot sign if sole peer reviewer of any entry |
| `handBack` | arrangement owner | in own name only |

Further invariants enforced on the server: `classifiedBy` and `peerReview.personId` can only be changed by the method owner once set (so a classifier cannot clear their name and review their own work); a new entry is checked as an edit of a blank one, so it cannot arrive pre-classified; the change history is append-only and the server overwrites `by` on new history entries with the signed-in person's name; once closed (R7 complete and hand-back accepted) only `annex`, `sign`, `handBack` and `r7` may change; `people` is always rebuilt from the user list, never taken from the browser.

### 3.4 Shape validation (`structureError`)

Before any rule runs, the save must be schema `triodian.aua.v1`, every keyed list (`arrangements`, `entries`, `questions`, `reviews`, `independentReviewPoints`, `exceptions`) must hold objects with unique ids matching `^[A-Za-z0-9_.:-]{1,64}$`, review points must be R1–R7, field numbers 1–26. Browser-only keys (`loadNotes`, `savedAt`, `note`) are stripped. Malformed saves get 400, never a 500.

### 3.5 Blind re-derivation (`lib/core/blind.js`)

The one place the server redacts data by reader. A peer reviewer who has not yet recorded a tier for an entry they did not classify receives that entry with the classifier's work removed (tier and fields 15+, `classifiedBy`, authority tests, obtainability, confidence, consequence confirmation, DL3 rows), history entries for it replaced by `action: 'hidden'`, version snapshots trimmed, and `findings` emptied. On save the server puts the withheld values back from the stored copy, computes whether the peer's tier differs, and tells the browser to reload. The blind list travels as `data.blind`.

### 3.6 Concurrency

Optimistic locking on `engagement.revision`. A save on a stale revision is three-way merged (`public/shared/merge.js`, shared with the browser) against the revision it started from, kept for the last 200 saves in `engagement_revisions`. Only a change to the very same path by both people is refused (409 with the conflicting item named); otherwise the merged result is stored and returned so the browser rehydrates. `putEngagement` is a conditional `UPDATE … WHERE revision = ?`, so two simultaneous saves cannot both win.

### 3.7 Transport and content

- `public/_headers`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. API responses add `Cache-Control: no-store`.
- No Content-Security-Policy header is set. All scripts and fonts are same-origin, so one could be added cheaply.
- Every string rendered in the browser passes through `esc()`; file loads (calibration set, older engagement files) are validated by `validateFile` / `validateCalibration` with length and depth caps (10,000 characters per string, keys ≤ 200, depth ≤ 14).
- The calibration link to the Risk Appetite app uses a Cloudflare Access service token held as Worker secrets; the Risk Appetite Worker allows exactly one Client ID to read exactly one path (`docs/calibration-link.md`).

### 3.8 Data classification as built

The engagement is stored as one JSON blob per deployment and contains client names, counterparty names, document titles, sources and counsel's verbatim determinations. There is no field-level encryption beyond D1's at-rest encryption, no retention or purge routine, and no export of the audit log. Working papers for the deal app will need the stricter "no deal content" rule enforced in the UI and the validator, not only in method.

## 4. Administration

Administration is a separate page (`/admin/`, `account.js`) with three tabs; administrators manage users and roles there, and everyone with a role appears automatically under People in set-up. Users are deactivated, never deleted, so their names stay on the work they recorded.

### 4.1 Admin page

| Tab | What it shows | Actions |
| --- | --- | --- |
| Users and roles | Every user: name, email, organisation, roles, admin flag, active flag, last seen. "Waiting for access": people who signed in through Access but are not users (email, last tried, attempts). A roles × permissions matrix generated from `PERMISSIONS` in `roles.js` | Add user; edit user (email, name, organisation, roles, admin, active); grant access from the waiting list (pre-fills the form); dismiss a request |
| Activity | The `audit_log`, newest first, 300 rows: when, who, what, details | Read only |
| Notifications | The `notifications` outbox, 200 rows: when, to, subject (expands to the body), status Held / Sending / Sent / Failed with the error | Read only |

Server guards on user edits: an administrator cannot remove their own admin flag or deactivate themselves; there must always be at least one active administrator; email must be unique and valid; roles must be known ids; name required.

### 4.2 Roles

Ten roles, held in any combination, five of them Triodian: `methodOwner`, `assessor`, `peer`, `validation`, `delivery`; and `counsel`, `gc`, `owner` (arrangement owner, insurer), `ir` (independent reviewer), `cro`. `isAdmin` is a separate flag, not a role: an administrator with no role can change set-up and manage users but cannot classify, review or sign.

### 4.3 Profile page (`/profile/`)

- Name and organisation (shown on recorded work).
- Email change with sign-in confirmation (section 3.2).
- Date format (long, short, numeric, ISO) and time zone (device default or any IANA zone). Screens follow these; output documents always print dates in full.
- Email notifications on or off.
- Read-only view of roles and admin status; sign-out link to `/cdn-cgi/access/logout`.

### 4.4 Notifications (`lib/core/notify.js`)

Every save is diffed for events; each event writes a row to the outbox and, if `NOTIFY_SENDING` is `on` and the `EMAIL` binding exists, sends through Cloudflare Email Service from `notifications@triodian.com`. A send failure is recorded on the row and never fails the save. Recipients who turned emails off are skipped.

| Event | Recipients |
| --- | --- |
| New question to counsel | counsel |
| Question answered | method owner |
| Failure consequence proposed (field 16) | arrangement owner |
| Tier recorded (field 15) | peer reviewers other than the classifier |
| R3 difference found | the classifier and the method owner |
| Independent review point logged | method owner and delivery manager |
| Response to a review point | independent reviewer |
| R7 complete | counsel and the GC |
| Daily 07:00 Brisbane: questions open ≥ 7 days | counsel, one email per day (deduplicated by key) |

Each email ends with a link to `/#actions` and a line on how to turn emails off.

### 4.5 Audit log

Actions recorded: `user.create`, `user.update` (with a from/to diff per field), `user.profile`, `user.email_requested`, `user.email`, `engagement.create`, `engagement.save` (revision, number of history entries added, merged-with), `engagement.refused` (roles and reason, on a 403), `engagement.next_review`. Individual field edits are not in the audit log; they are in the assessment's own `history` array, which is append-only and server-signed.

### 4.6 Annual cycle (`lib/core/review.js`)

Once closed, an administrator or the method owner can start the next assessment. The closed one is copied to `engagement_archive` with a label (insurer · reference · closed date) and listed read-only under "Earlier assessments". The new one keeps set-up, people, calibration, the set, the document and interview lists and fields 1–14 with sources, each marked `carried: true` until confirmed; everything else starts empty.

## 5. Data model and persistence

One deployment holds one assessment, stored as a single JSON document (schema `triodian.aua.v1`) in the `engagement` row; users, audit, notifications and archives are relational tables beside it. The JSON is the unit of save, merge, redaction and versioning.

### 5.1 Tables (`lib/store/d1.js`)

| Table | Purpose | Notes |
| --- | --- | --- |
| `users` | Identity, roles (comma-separated), admin and active flags, profile, prefs, `last_seen_at`, `pending_email` | Columns added after first release are migrated by `PRAGMA table_info` on init |
| `engagement` | The one assessment: `data` JSON, `revision`, `updated_at`, `updated_by` | `CHECK (id = 'main')` |
| `engagement_revisions` | Last 200 saved versions, for three-way merge | Trimmed on each save |
| `engagement_archive` | Closed assessments, read-only | Label, archived by and when |
| `notifications` | Email outbox with status and error | `key` deduplicates daily reminders |
| `audit_log` | Actor, action, target, JSON detail | Read by Admin → Activity |
| `access_requests` | Sign-ins by non-users | Cleared when the person is added |

Plain SQL throughout; the file notes that PostgreSQL or Azure SQL would need small changes only.

### 5.2 The engagement document

| Key | Holds |
| --- | --- |
| `engagement` | Insurer, reference, counsel firm, privilege marking, start date, brief confirmation (by, on, ref), document request date, independent reviewer (person, organisation, reporting line counsel/CRO), CRO person, `legalPhrases` for R5, `annexText` by section, `annexSigned`, `handBack`, flags `example` and `autosave` (always false on the server) |
| `people` | Rebuilt from users on every read and save: id, name, organisation, roles, active |
| `calibration` | Loaded flag, status (default/working/approved), version, date, approvers, parameters P1–P10, `fellBack` list |
| `documents` | D1–D10 plus any added: id, ref, title, status (requested/received/notHeld), date |
| `interviews` | id, who, date, notes reference |
| `arrangements` | ARR-nn: name, parties, boundaries (B1–B3), six selection criteria, reason, next contracting date, function, `findingOwner`, `dl4Triggers` |
| `setAgreed` | GC and counsel R1 agreements, each by and on |
| `entries` | REG-nnn: `arrangementId`, `fields` 1–26 (each `{value, source, notKnown, by, on, detail?, carried?}`), `functionName`, locations, four `authorityTests`, `tierProposed`, `tierOverrideReason`, `classifiedBy`, `reviewedBy`, consequence confirmation, `obtainability` (`start`, `rungs` → T1–T5 → `{pass, source}`), `confChosen`, `confRaiseReason`, `peerReview` (person, tier, differs, resolution, on), `notDeterminable` (on, question, who, since), `dl3Rows` |
| `questions` | QC-nn to counsel: arrangement, entry, which of the seven questions, target field 23–25, facts, question, why, sent on, response, responded on, determination, reach, status (open/answered/openWithOwner), owner, transcribed by |
| `reviews` | R1–R7: by, on, result, notes |
| `r5Cleared` | Legal-line hits cleared, keyed by phrase + source + hash |
| `findings` | Computed in the browser and stored as a record of what was shown; recomputed on load |
| `exceptions`, `independentReviewPoints` | EX-nn, IR-nn with ref, text, status open/closed/disclosed, response |
| `diffReports` | Written when a new calibration version is loaded |
| `versions` | Server-added snapshots at each sign-off (section 5.3) |
| `previous` | Label and close date of the archived assessment this one started from |
| `history` | Append-only log of every edit: at, by, action, target, from, to |

Computed, never trusted from the file: expected rung (field 17), obtainable rung (21), confidence (22), finding (26), flags. `hydrate()` in the browser fills defaults, migrates older field names (`confBasis`, `b2Support`, `noReach`) and assigns ids to entries that lack them, noting each repair in `loadNotes`.

### 5.3 Versions and redline (`lib/core/versions.js`)

A version is appended by the server when a save first records: set agreed (R1 by both), counsel review (R6), independent check complete (R7), annex signed, hand-back accepted. A snapshot keeps each entry's shown field values (not 17, 21, 22, 26), each arrangement's name, and the arrangement each entry belongs to. The browser cannot add, change or remove one. Outputs → Compare versions redlines any version against a later one or against now, with who last changed each field; DL1 and DL5 end with "Changes since" the latest version.

### 5.4 Files that leave the app

| File | Schema | Direction |
| --- | --- | --- |
| Engagement file | `triodian.aua.v1` JSON | Load from file (older saves); the server copy is authoritative |
| Calibration set | from the Risk Appetite app, validated by `validateCalibration` | In, by API link or file |
| Register extract | `triodian.aua.extract.v1`: per entry function, location, tier, consequence, received rung; no facts or client wording | Out, for the Risk Appetite app's check K10 |
| Outputs | Markdown, Word (.docx via bundled `docx.min.js`), PDF (print dialog), CSV for DL1 | Out |

## 6. UI shell and navigation

The app is a single page (`index.html` + `aua.js`) that re-renders the whole `#app` from state on every change, with no framework and no build step; a vanilla event-delegation model on `data-act` and `data-path` attributes handles every control. Focus and cursor position are restored after each render.

### 6.1 Entry and start screen

Before an assessment exists the page shows an overlay: app name, one-line purpose, a status box (connecting; no access yet; server unreachable; not started yet), then two numbered actions: **Start the assessment** (shown only to the method owner, delivery manager or an administrator) and **Open the worked example**. Below: links to the user guide, profile, admin and sign-out, and the scope banner. The worked example is a fictional insurer built in `buildExample()`; it runs in the browser only and is never saved.

### 6.2 Header

- Brand mark and app title; on desktop a step nav: **My actions** (with a count), Set-up, Set, Register, Classify, Counsel, Findings, Review, Outputs. The current step carries `aria-current="page"`.
- Right side: the save chip (Saved / Saving… / Not saved / Changed elsewhere / Practice · not saved / Read only, with the last save time and person on hover), the calibration badge (uncalibrated · default vN · working vN · approved vN), the account avatar with a menu (profile, admin, user guide, reference, sign out), and the ☰ menu button.
- The **document band** under the header shows the privilege marking exactly as it will print on every output, or "No privilege marking set" with a link to set-up, plus insurer and reference.
- Context bars appear as needed: test site; worked example; uncalibrated; blind re-derivation (naming the hidden entries); earlier assessment, read only.

### 6.3 Drawer menu

My actions, the nine steps in sequence, Acting-as person picker (worked example only), calibration badge, Earlier assessments (archives), Practice (open or leave the worked example), and an Apps list linking to the Risk Appetite app with the current app marked.

### 6.4 Navigation model

- Screens are addressed by hash (`#overview`, `#register` …) with `pushState`, so back and forward work and a link can open a screen.
- Every step screen ends with a **step bar**: previous step, this phase's gate status, next step. On phone the same three sit in a fixed bottom bar.
- Each phase screen ends with its **gate card**: the gate's conditions with a tick or cross, and under an unmet condition, chips that open the entries holding it open at the right tab.
- The overview's **Next step** panel names the first phase whose gate is open and what is still missing, with one button to go there.

### 6.5 My actions

A per-person worklist computed from state and roles: set-up to finish, R1 agreements, facts to record, entries to classify, consequences to confirm, tiers to re-derive, R3 differences to resolve, questions to answer, R2/R4/R6/R7 to record, R5 hits to clear, review points to respond to or close, the annex to sign, the hand-back to accept. Items marked "Now" sort first. Each item opens where the work is.

### 6.6 Live collaboration

- Autosave 1.2 s after the last change, batched; a save in flight queues one more. `beforeunload` warns if unsaved.
- Every 30 s while visible, and on return to the tab, the browser checks the server revision and reloads quietly if someone else saved, unless a text field is focused or a sheet or popover is open.
- A merged save (section 3.6) rehydrates state and keeps the current screen, entry and tab. A conflict freezes saving and shows "Changed elsewhere" with the item named; the person reloads.

### 6.7 Term popovers and reference

Underlined terms (`T(id, text)`) open a glossary popover with definition, where the term is used, and a link into the Reference screen. Popovers nest (a term inside a popover pushes onto a stack with Back), close on Escape, outside click or swipe-down on phone, and return focus to the anchor. The glossary has 45 terms in `aua-content.json`.

### 6.8 Feedback and errors

- A single toast (`aria-live="polite"`) for saves, copies, downloads and refusals.
- Every disabled control carries the reason as its `title`, and the same reason is printed beside the card with a "Why" term link (`whyNote`). The reason comes from the same `deny()` the server runs, so the person never sees a control they cannot use without being told why.
- Inline errors use `role="alert"`. Broken references (an entry pointing to a missing arrangement, person or field) are listed on the Review screen and block the phase 2 gate rather than crashing a screen; every lookup returns a placeholder.

## 7. Screens

Eleven screens map onto the framework's eight phases plus three supporting views; each phase screen opens with an eyebrow ("Phase 2 · map the AI"), a serif heading and one line of purpose, and closes with its gate card and step bar.

| Screen | Phase | What it holds | Who can edit |
| --- | --- | --- | --- |
| **Overview** | — | Next-step panel; counts (arrangements, entries, open questions, findings set); a card per phase with its gate conditions, each a button to that screen | — |
| **My actions** | — | The person's worklist (section 6.5) | — |
| **Set-up** | 0 | Six numbered cards: 1 Engagement (insurer, reference, counsel firm, start date, privilege marking, GC brief confirmation, document request date); 2 People (read-only list from users, "Manage in Admin" for admins; editable only in the worked example); 3 Independent reviewer (person, organisation, reporting line, CRO) with a sentence saying who the review pack is addressed to and who confirms R7; 4 Calibration set (badge, **Load from the Risk Appetite app**, **Load from a file**, parameters that fell back, difference reports); 5 Documents D1–D10 as a table (ID, ref, title, status, date) or cards on phone; 6 Interviews. Then the next-assessment card when closed | method owner, delivery, admin |
| **Set** | 1 | Coverage strip (B1/B2/B3 present or missing, authority spread); a card per arrangement: name, parties, next contracting date, function (when calibrated), boundary checkboxes, six criteria checkboxes, ceiling for the function, reason, remove; the finding badge in the card header. **Agree the set (R1)**: GC and counsel each record their own agreement | method owner, assessor, delivery; R1 by GC and counsel |
| **Register** | 2 | Add-entry control (choose arrangement); filters (arrangement, boundary, finding, flag, has not-known) as a row on desktop or a sheet on phone; the register table (desktop: 12 columns incl. tier, consequence, expected, obtainable, finding, flags, facts done; tablet: 7 columns with an expand row; phone: cards). Clicking an entry opens the **entry editor** (below) | assessor, method owner |
| **Entry editor** | 2–5 | Opened inside Register. Header with arrangement, entry id, system, flags, not-known count, delete. Five tabs: Facts 1–14, Classify 15–17, Evidence 18–22, Counsel 23–25, Finding 26. Each field row: number and name, format hint, the control (text, select, textarea, rung + description), source reference with a datalist of received documents and held interviews, Not known checkbox, history (last 5 changes), ask counsel; a red "Add a source" error when a value has none; a "carried over" banner with Confirm per field and Confirm all. Facts tab also holds function override, provider locations, and the F4 not-determinable stop rule. Counsel tab shows fields 23–25 as read-only cards filled only from answered questions. During blind re-derivation only fields 11–13 show | per field target |
| **Classify** | 3 | Entry picker; three-column layout on desktop (facts 11–13 · the step · result so far); five step tabs: **1 Authority** (four tests with source each, proposed tier, record tier, override reason; locked until field 11 is sourced), **2 Consequence** (C1–C5 radio cards with the insurer's P2 thresholds, reason/source, Confirm as arrangement owner), **3 Expected/indicative rung** (big code, adjustment basis, field 18, stop rule note), **4 Obtainability** (one card per rung tested with T1–T5 pass/fail and source; result badge; confidence proposal and override), **5 Blind re-derivation** (peer picks a tier blind; then side-by-side classifier vs peer, agrees/differs, resolution text) | assessor, method owner; owner for step 2 confirm; peer for step 5 |
| **Counsel** | 4 | Question log table (ref, arrangement · entry, Q, question, response, status) with an expanding detail per question: facts, why, response; counsel records a response (or Triodian transcribes it with a "pasted word for word" tick), determination on questions 1–3, reach determination; "Record in field 23/24/25" applies the newest answer to the entry and locks it; keep open with a named owner. New-question form (arrangement, entry, which of the seven questions, target field, facts, question, why) inline or as a phone sheet | Triodian ask; counsel or Triodian answer |
| **Findings** | 5 | Concentration strip (P9: top platform share of critical operations, limit, unknowns); summary table per arrangement (tier, consequence, expected, required, obtainable, priority, finding, flags); a card per arrangement with a large finding badge, flags separated from the finding, named gap owner field, and the worksheet parts A–J rendered from markdown (collapsible; per-part on phone) | Triodian for owner |
| **Review** | 6 | R1–R7 table (open points first, completed ones folded into one line): reviewer, status, by/on, action buttons (Run R2, Passed/Exceptions for R4, Record R6, Confirm R7 with open-points guard); Broken references card; **R5 legal-line check** (phrase list, each hit with phrase, source, outputs it appears in, Clear); Exceptions log; Independent review points (output, section, status, point, response) | per target |
| **Outputs** | 7 | List of ten outputs with draft/final status and the reason it is still draft; opening one shows the rendered markdown with Download Word / PDF / .md (and .csv, Copy extract for DL1), Copy markdown; per-output editors folded above the preview (DL3 rule rows, DL4 trigger selection, DL5 annex text per section and Sign, DL6 Accept hand-back). **Compare versions** card | method owner for annex; owner for hand-back |
| **Reference** | — | The seven questions, tiers, consequences (with P2 thresholds), evidence ladder with frequency, obtainability tests, finding types, deliverables, searchable glossary, and the full framework markdown | read only |
| **Earlier assessment** | — | Any archived assessment opened read-only with a band and a "Back to the current assessment" link | none |

## 8. Design system and responsive behaviour

The look is shared with the Risk Appetite app: a parchment page, white cards, a serif for headings, a sans for everything else, one accent per app (navy here, aubergine for Risk Appetite), and a small set of coloured badges that carry status everywhere. It is 383 lines of hand-written CSS with no preprocessor.

### 8.1 Tokens (`app.css`)

| Token | Value | Used for |
| --- | --- | --- |
| `--parchment`, `--parchment-2` | `#FAF8F2`, `#F4F0E7` | Page and unfinished field rows |
| `--card` | `#FFFDF8` | Cards and finished field rows |
| `--ink`, `--ink-soft`, `--ink-faint` | `#211E18`, `#726B5D`, `#746D5F` | Text, secondary, hints |
| `--rule`, `--rule-soft` | `#C9C2B0`, `#E9E4D8` | Borders and dividers |
| `--navy` | `#182635` | This app's accent: header top border, step numbers, primary buttons |
| `--aubergine`, `--aubergine-bg` | `#4E3A5E`, `#EDE7F0` | Classification badges, blind-review bar, Risk Appetite link |
| `--green`, `--ochre`, `--red`, `--grey`, `--slate` (+ `-bg`) | `#3B6B4A` · `#7E5E1C` · `#A8261D` · `#837C6E` · `#4A5A6A` | Badges: met/final/F1 · warning/draft/F4 · failed/F2 · neutral · F3 |
| `--privilege` | `#7D1D2C` | The privilege marking in the document band |
| `--serif` | Source Serif 4 | h1 and arrangement names |
| `--sans`, `--mono` | IBM Plex Sans (both) | Body; codes use the same face with `.mono` spacing |

A second, cooler set of the same token names (`#ECEEF1` page, `#17202B` ink) is defined in the file and overrides the warm set; the "desk" look is the one in force. Fonts are self-hosted woff2 with licences beside them and preloaded in the HTML.

### 8.2 Components (CSS classes)

`.card`, `.panel2` (inset panel), `.badge` with `.b-green/.b-ochre/.b-red/.b-grey/.b-aub/.b-slate`, `.gate` (tick/cross status line), `.btn` with `.primary/.ghost/.sm/.aub`, `.in` (inputs, selects, textareas), `.f` (label + control), `.fgrid` (responsive form grid), `.cb` (checkbox label), `.tabs` (ARIA tablist), `.dcard`/`.dgrid` (phase and entry cards), `.calstrip` (summary strip), `.stepbar`, `.bottombar`, `.drawer`, `.sheet` (phone bottom sheet), `.pop` (term popover), `.term` (underlined glossary trigger), `.toast`, `.docband`, `.examplebar`, `.outrow/.outlist` (outputs list), `.actitem` (action rows), `.md` (rendered markdown), `.tw` + `table.lg` (scrollable data tables), `.adm-*` (admin page), `.kv` (definition list), `.vh` (visually hidden).

### 8.3 Breakpoints

| Width | Mode | Behaviour |
| --- | --- | --- |
| ≥ 1024 px | desk | Full step nav in the header; three-column Classify layout; 12-column register table; two-column field rows (control · source) |
| 640–1023 px | tab | No header nav (drawer only); two-column Classify; 7-column register with an expand row per entry |
| < 640 px | phone | Mark instead of logo; fixed bottom bar for prev/gate/next; register as cards; filters and the new-question form as bottom sheets; entry tabs as a select; one rung card at a time in the obtainability test; badges wrap |

Also `@media print` (page header carries the privilege marking), `prefers-reduced-motion`, and `hover:hover` for hover-only affordances. Base font size 16 px on phone to stop iOS zoom.

### 8.4 Accessibility as built

Landmarks (`header`, `main`, `footer`, `nav` with labels); `aria-current` on the active step; `role="tablist"/"tab"` with `aria-selected`; `role="dialog" aria-modal` on the overlay, drawer and sheets; `aria-expanded` on toggles and popover anchors; `aria-live` toast; `role="status"` on gate lines; every input labelled (`<label for>` or `aria-label`); reasons for disabled controls in `title` and in visible text; Escape closes popover, sheet, drawer and account menu; focus returns to the popover anchor on close and is preserved across re-renders. Not present: skip link, focus trap inside dialogs, keyboard handling for the custom tabs beyond click.

## 9. Rules engine in the browser

All classification arithmetic lives in `aua.js` as pure functions over state and is recomputed on every render; the server stores the stored values and the record of what was shown but never recalculates. The functions are the part of the app that the deal framework replaces almost one for one.

| Function | Framework rule | How it works |
| --- | --- | --- |
| `proposeTier(e)` | Section 7.2, authority tier | Field 12 (acts/decides) and the four authority test answers; the highest supported tier wins; the assessor may override with a reason |
| `expected(e)` | Field 17, expected or indicative rung | If a calibration set holds P3 for tier × consequence, that cell; otherwise the base rule (tier index + 1) with the C1 down-one and C4/C5 up-one adjustments; returns value, basis and a sentence of explanation |
| `stopRule(e)` | A1 × C1 | The ladder collapses to E1 only |
| `ladder(e)` | Section 7.4 | Rungs from the expected rung down to E1 |
| `obResult(e)` | Obtainability test, field 21 | Walks the ladder: a rung passes when T1–T5 all pass; a rung with any fail moves to the next; the first rung with no answer is "current"; none left gives E0 |
| `needsRetest(e)` | — | Flags when the expected rung moved after a test began |
| `proposedConfidence(e)`, `confidence(e)` | Field 22 | High if the T1 source cites a received D7/D8/D9 document, medium if it cites any document, low otherwise; at B2, low unless field 14 is document-sourced; the assessor may lower it, and raising it needs a reason |
| `flags(e)` | Calibration P1, P6, P7, P8 | Above ceiling, location not accepted or escalate, below minimum confidence, not-known fields over limit, F4 open too long; each a labelled badge. Only when a calibration set is loaded |
| `concentration()` | P9 | Share of critical operations on the top platform against the limit |
| `reachDetermination(a)` | F3 | Counsel's answers to questions 1–3 all negative, or an explicit "no reasonable reach"; the newest answer wins |
| `finding(a)` | Section 8, field 26 | Per arrangement: F4 if any entry is not determinable; F3 from counsel; awaiting counsel if any entry lacks field 25; awaiting test if any obtainability test is open; else the worst entry's gap (required minus obtainable) → F1 or F2 with priority from P4 or the framework matrix, the failed test, the usual owner and routes from `gapOwners`, and P5 due date and interim position |
| `gates()` | Phase exit gates 0–7 | Fixed lists of boolean conditions per phase, each shown with a tick and, when open, chips to the entries |
| `fieldDone(e, n)` | R2 | A field is done when it has a value and a source, or is marked not known; computed fields are done when their inputs are |
| `legalHits()` | R5 | Scans every output's text for the phrase list, keyed by phrase + source text so one clearance covers every output that quotes that text; fixed paragraphs are keyed separately |
| `brokenRefs()` | — | Entries pointing to missing arrangements, people or fields; questions to missing entries |
| `myActions()` | — | The worklist (section 6.5) |

Two rules worth keeping exactly: field 15 cannot be set until field 11 is saved with a source (so a reviewer can re-derive from the description), and fields 23–25 can be filled only from the newest answered question for that entry and field, after which they lock until counsel answers again.

The content file carries the scales and text the rules read: 26 field definitions with kind, format and tab; 6 tiers; 5 consequences; 7 rungs; 5 tests; 4 finding types; the gap matrix; gap owners by failed test; 8 phases; 7 review points; 10 annex sections; 7 default legal phrases; 45 glossary terms; 6 deliverables; and the framework markdown itself. Changing a scale is a content change, not a code change, for everything except the rule functions above.

## 10. Outputs and exports

Ten outputs are generated as Markdown from state, rendered in the browser, and exported as Word, PDF, Markdown or CSV; each one is "final" only when R5 is cleared, the phase 5 gate is met and its own gate is met, otherwise every download is stamped Draft.

| Output | Gate | Contents |
| --- | --- | --- |
| DL1 AI dependency register | 3 | Every entry with all 26 fields and sources, flags and not-known count; changes since the last version; source index. Also CSV and the register extract for the Risk Appetite app |
| DL2 Evidence obtainable at each boundary | 5 | Summary table; one worksheet (parts A–J) per arrangement |
| DL3 Control-library shape | 5 | For B3 entries: categories of rule and the record each would produce, from rows the method owner enters |
| DL4 Technical schedule, tolerance and trigger design | 5 | For each F1/F2: evidence item, contents, frequency by rung, P10 triggers selected per arrangement |
| DL5 Technical annex | 6 | Ten sections from the annex outline, each with generated text plus the method owner's own text; redline; exceptions log; signature line |
| DL6 Hand-back list | 2 | Entries not on the insurer's inventory (field 6 no/partly); acceptance line |
| QS Question set to counsel | 3 | Every open question in the template layout |
| RP Review pack | 5 | Addressed to counsel or the CRO; the outputs the independent reviewer needs |
| CM Closing measures | 7 | The measures table from framework 12.5, plus calibration flags and concentration |
| DR Difference report | 0 | What changed when a new calibration version was loaded |

### 10.1 Common header

Every output begins with the privilege marking (or a bracketed placeholder), then title, calibration label and version, Draft or Final, the date in long form, insurer and reference. The worked example adds "WORKED EXAMPLE, FICTIONAL".

### 10.2 Export pipeline (`export.js`)

- One Markdown-to-blocks parser (headings, tables with escaped pipes, lists with task boxes, rules, paragraphs; inline bold, italic, code, strike) feeds both exporters.
- **Word**: the bundled `docx.min.js` (loaded on first use) builds a .docx with the privilege marking in the page header so it prints on every page.
- **PDF**: opens a print window with the same content and the marking in the page header; the person chooses Save as PDF.
- **Markdown**: a Blob download named from the insurer slug, output id and status.
- Inside an iframe downloads are replaced by Copy.
- Blind reviewers cannot open Outputs at all while any entry is hidden from them.

### 10.3 Compare versions

The Outputs screen's compare card picks any two versions (or a version and now) and shows a redline: struck-through old values beside new ones, with who last changed each field from `history`. The same `snapshotOf` lives in both `versions.js` and `aua.js` so the worked example can redline without a server.

## 11. Quality: tests, CI and known gaps

The server rules are covered by unit tests and the whole stack by a Playwright run against the real Worker with a local database; the browser rules engine (expected rung, obtainability, findings, flags) has no automated tests and relies on the worked example and manual QA.

### 11.1 Tests

| Suite | Runs | Covers |
| --- | --- | --- |
| `tests/rbac.test.mjs` | `node` | 21 permission cases: who may edit facts, classify, peer-review, confirm, validate, answer, edit set-up, sign; own-name rules; history cannot be rewritten; browser-only keys ignored |
| `tests/blind.test.mjs` | `node` | Redaction and restoration for a blind peer |
| `tests/versions.test.mjs` | `node` | Versions added at sign-offs; browser-sent versions ignored |
| `tests/review.test.mjs` | `node` | Next assessment carries facts and resets the rest |
| `tests/notify.test.mjs` | `node` | Event-to-recipient mapping and daily reminders |
| `tests/e2e/specs/smoke.spec.js` | Playwright, one user per role | Every screen and every output opens without script errors in the worked example and in a saved assessment; admin, profile and user guide load |
| `tests/e2e/specs/rules.spec.js` | Playwright | Regressions from the October QA run: malformed saves refused with 400 (duplicate ids, non-objects, bad review point, field outside 1–26, no assessment); a new entry cannot arrive classified; stale-revision saves refused; nothing stored on refusal |

CI (`.github/workflows/tests.yml`): Node 22, every `*.test.mjs`, then `npm ci` + Chromium + Playwright with a fresh `.state`; the report is kept 14 days on failure. The deploy is not gated.

### 11.2 Review points on the code itself

| # | Observation | Weight for the new app |
| --- | --- | --- |
| 1 | `aua.js` is one 1,515-line file with lines up to 2,000 characters; screens, rules, shell, persistence and the worked example share one closure. Workable, but every change touches one file | Split by concern from the start: shell, rules, screens, persistence, content |
| 2 | The browser `deny()` and the server `deny()` are two hand-kept copies of the same rules (`aua.js` line 99, `rbac.js`). They agree today; nothing checks that they do | Serve one rules module to both, as `merge.js` already is |
| 3 | The rules engine has no unit tests; `finding()`, `obResult()`, `expected()` and `flags()` are exercised only through the worked example | Add pure-function tests for the ladder and findings before the deal app inherits them |
| 4 | No Content-Security-Policy header; no rate limiting beyond Cloudflare's; the 5 MB body cap is the only size guard | Add CSP; consider a per-user save rate |
| 5 | Whole-document saves: every autosave sends the full JSON (hundreds of KB on a large register) and the server stores 200 revisions of it | Acceptable for 12–25 entries; fine for the deal app's 12–25 channels |
| 6 | Two colour-token sets in `app.css`, the later overriding the earlier; the file's own comments are the only design documentation | Keep one set; name it in the spec |
| 7 | D1 `ready` flag is module-scoped, so schema migration runs once per isolate; adding a column still needs the `PRAGMA` check pattern | Keep the pattern; add a schema version row |
| 8 | No retention or purge: engagement, revisions, audit and notification rows live until the database is deleted; no export of the audit log | The deal app needs retention under counsel's direction (framework 12.3) |
| 9 | Email change confirmation depends on Access sending a code to the new address; nothing in the app verifies it | Acceptable while Access is the identity provider |
| 10 | `people` is rebuilt from users on every read, so a person removed from the user list disappears from set-up but their id stays on `classifiedBy` and `peerReview`; names resolve to blank | Keep inactive users resolvable by id (they are: deactivated, not deleted) |

### 11.3 Specs kept in the repo

`docs/specs/` holds the build specification (14 sections: format, users and roles, design system, header, screens, data model, rules, popovers, responsive, outputs, accessibility, acceptance tests, build sequence, open items), two fix mini-specs (v1: seven must-fix, twelve should-fix; v2: five must-fix, eight should-fix, all applied), and the framework. The user guide at `/user-guide/` covers who does what, the eight phases, the register, review points, outputs, versions, the annual cycle and notifications.

## 12. What carries to the deal app, and what changes

About four fifths of the baseline carries unchanged: the Worker, identity, storage, user and role administration, save checking, merge, versions, notifications, the shell, the design system, exports and the test harness. What changes is the content (scales, fields, questions, outputs), the role list, the rules engine, and the stricter handling of client content that the deal framework demands. This matches the 21 October opportunity note's recommendation of a separate, lighter app sharing components and file formats.

### 12.1 Carries as is

- `src/worker.js`, `lib/identity`, `lib/store/d1.js`, `lib/config.js`, `wrangler.jsonc` pattern (new Worker name, domain, database, Access application).
- `lib/core/api.js` routes (me, prefs, email change, engagement get/put with merge, archive, admin, access requests, notifications), `merge.js`, `versions.js` (new sign-off list), `notify.js` (new event list).
- `account.js` admin and profile pages, `app.css` tokens and components, the popover, drawer, sheet, step bar, gate card, My actions and save-chip patterns, `export.js`, the Playwright harness and helpers.

### 12.2 Changes by framework section

| Framework element | Baseline equivalent | Change |
| --- | --- | --- |
| Deal profile P1–P9 (6.1) | Set-up engagement card + calibration set | A nine-field profile card replaces the calibration card; no calibration load, no flags, no difference report, no Risk Appetite link |
| Channel register, 25 fields (6.2) | Register entry, 26 fields in five tabs | New field list with the deal's kinds (K1–K7), boundaries, information classes (I1–I6) and sanctioned status; tabs become Facts 1–14 · Classify 15–22 · Counsel 23–24 · Finding 25; "no deal content" check on every text field (names, prices, figures) feeding an exceptions entry rather than a save refusal |
| Channels, not arrangements (2.3, 2.5) | Arrangements with entries beneath | One level only: a channel is both the unit and the row; "every kind considered" replaces B1/B2/B3 coverage, with a chip per kind K1–K7 and a reason field for a kind recorded as absent |
| The five questions (7) | Seven questions, `questions7` content | Content change; Q4 and Q5 are the ones that go to counsel; the three standing B2 flags become prompts on every K7 entry |
| Reach R1–R4 (8.1) | Authority tier A1–A6 and `proposeTier` | Three yes/no tests derive the reach class; the override-with-reason pattern stays |
| Information class I1–I6 and consequence X1–X4 (2.4, 8.2) | Failure consequence C1–C5 with owner confirmation | Class is set by the assessor from folder contents; no owner confirmation step; X-code is derived, never entered |
| Ladder N0–N6 and base rule (8.3) | E0–E6, `expected()` with P3 | Base rule by reach (R1/R2→N4, R3/R4→N5) with the B2 cap and B3 floor as recorded adjustments; `rungLabel` is always "indicative" |
| Obtainability T1–T5 (8.4) | T1–T5, `obResult()` | Same walk; T2 reworded "deal-scoped"; confidence from whether the export or attestation was seen |
| Findings F1–F5 (9.1) | F1–F4, `finding()` | Per channel, not per arrangement; F5 is a flag recorded beside F1/F2, counted and never rated; gap matrix uses X1–X4 columns |
| 90-day plan (9.3) | DL4 trigger design, gap owners | New output: F2 steps by owner and week, ordered by priority |
| Worksheet A–J (9.4) | `worksheetParts` A–J | Part B becomes the path from folder to model; part H holds fields 23–24 |
| Deliverables CD1–CD5 (10.1) | DL1–DL6, QS, RP, CM, DR | Five outputs plus QS and the question log; RP only if an external checker is confirmed |
| Language rules (10.4) | R5 legal-line phrase list | Add a second phrase list for product names (Triodian, Pinpole and any named vendor) and a deal-content scan; "required" and "gap" usage checked the same way |
| Review points R1–R7 (12.1) | R1–R7 | R1 becomes profile review by GC and counsel; R3 is the second-reviewer re-derivation of reach from field 8 (blind, as now); R4 validation; R7 by the checker or by validation if none |
| Five-minute demonstration (5.4) | — | New small record on the Review screen: performed or not, on what text, which controls passed |
| Roles (4.1) | Ten roles | Method owner, assessor, peer (reviewer), validation, delivery, counsel (DLC Legal), GC, deal team lead, tenant owner, checker; drop owner, IR, CRO |
| Ten-day plan (5.1) | Eight phases with gates | Phases 0–7 as now with new gate conditions; day numbers shown on the overview |
| Working papers (12.3) | No retention | Retention or destruction at close as counsel directs: an admin action that purges revisions and archives |

### 12.3 Open decisions for the next step

- [ ] One repository with a mode switch, or a new repository seeded from this one (the opportunity note recommends the second).
- [ ] Whether the deal-content scan refuses the save or only logs an exception (framework 6.3 says the field is cleared and an exception recorded).
- [ ] Whether the checker is a user with a role in the app or receives the pack through DLC Legal only (framework 4.4 says the latter, so RP may not need a reader role).
- [ ] Whether the register extract to the AI Use Assessment (framework 11) is built now or left as a file format.

### Sources

- `Triodian/use-assessment` at commit `ae9d7cd`, every file read on 21 October 2026.
- AI Confidentiality Exposure Assessment Framework, 21 October 2026, for section 12.
- AI Use Assessment App: Build Specification and Fix Mini-Specs v1 and v2, in `docs/specs/`.
