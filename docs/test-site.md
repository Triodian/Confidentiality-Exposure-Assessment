# Test site: confidentiality-test.triodian.com

A separate copy of the app for trying changes before they reach the live assessment. It has its own Worker
(`confidentiality-exposure-assessment-test`) and its own database (`confidentiality-exposure-test-db`), so nothing
done there touches the live assessment. A banner on every page says "Test site".

- Changes go to the `test` branch first; Cloudflare deploys them to the test site.
- When they have been checked there, merge `test` into `main`; Cloudflare deploys the live site.
- The first person listed in `BOOTSTRAP_ADMINS` (lib/config.js) to sign in becomes the site's administrator.
- Both addresses should be covered by the same Access application, or each by its own with the AUD set per environment.

| | Live | Test |
|---|---|---|
| Worker name | `confidentiality-exposure-assessment` | `confidentiality-exposure-assessment-test` |
| Branch | `main` | `test` |
| Deploy command | `npx wrangler deploy` | `npx wrangler deploy --env test` |
| Address | confidentiality.triodian.com | confidentiality-test.triodian.com |
| Database | confidentiality-exposure-db | confidentiality-exposure-test-db |
