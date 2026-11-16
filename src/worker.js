// Cloudflare Worker entry point for the AI Confidentiality Exposure Assessment app.
// Static files in /public (the app, /admin and /profile) are served by Cloudflare. Requests to /api/* come here.
// All the app logic is in lib/core (cloud-neutral); this file only connects it to Cloudflare:
//   identity → lib/identity/session.js (the /login page and sessions; Cloudflare Access guards /auth/email only)
//   storage  → lib/store/d1.js (Cloudflare D1)
//   email    → Cloudflare Email Service binding EMAIL, only when NOTIFY_SENDING is "on"
// The same handler runs on Node with SQLite (src/node.js, lib/platform/node.js): env is the platform (development plan ID.3).
import { whoIs, handleAuth, gate, markDemo } from '../lib/identity/session.js';
import { handleLink } from '../lib/platform/links.js';
import { statusForService } from './status.js';
import { d1Store } from '../lib/store/d1.js';
import { identityUsers, withIdentity } from '../lib/identity/people.js';
import { handle } from '../lib/core/api.js';
import { dueReminders, deliver } from '../lib/core/notify.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

/** Returns a function that emails one message, or null while sending is switched off. */
function emailSender(env) {
  if (env.NOTIFY_SENDING !== 'on' || !env.EMAIL || !env.NOTIFY_FROM) return null;
  return m => env.EMAIL.send({ to: m.to, from: { email: env.NOTIFY_FROM, name: 'AI Confidentiality Exposure Assessment' }, subject: m.subject, text: m.text });
}
const siteUrl = (env, request) => env.SITE_URL || (request ? new URL(request.url).origin : 'https://confidentiality.triodian.com');

/** The app's store. With the IDENTITY binding (the suite's shared identity database, plan task 1B.2) its users and their
 *  roles come from there, so a person is added once for the suite; everything else stays in this app's own database. */
const APP_ID = 'confidentiality';
const storeFor = env => withIdentity(d1Store(env.DB), env.IDENTITY ? identityUsers(env.IDENTITY, APP_ID, env.DB) : null);

/** The commit this Worker was deployed from (APP_COMMIT, set by the gated workflow's deploy step), on every response
 *  as X-Triodian-Release and at /api/version, so a test can attest the deployed revision rather than infer it
 *  (penetration retest 16 Nov 2026: "live authentication results alone do not establish that the fixes are deployed";
 *  development plan P.14). The repositories are public, so the commit is not a secret. */
export const release = env => String((env && env.APP_COMMIT) || '').trim() || 'unknown';
const withRelease = (res, env) => { try { const r = new Response(res.body, res); r.headers.set('X-Triodian-Release', release(env)); return r; } catch (e) { return res; } };

/** What the other apps may read from this one over a link (src/status-service.js on Cloudflare; /api/link/<method>
 *  with LINK_SECRET elsewhere, lib/platform/links.js). */
export const LINK_METHODS = { status: async env => ({ status: 200, body: await statusForService(env) }) };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/version' && request.method === 'GET') return withRelease(json({ app: APP_ID, commit: release(env), site: env.SITE_LABEL || '' }), env);
    return withRelease(await this.app(request, env, ctx), env);
  },
  async app(request, env, ctx) {
    const url = new URL(request.url);
    // Sign-in: /login (a static page), /auth/* (lib/identity/session.js). Pages need a session; assets do not.
    if (url.pathname.startsWith('/auth/')) return (await handleAuth(request, env)) || new Response('Not found', { status: 404 });
    if (!url.pathname.startsWith('/api/')) return (await gate(request, env)) || markDemo(await env.ASSETS.fetch(request), env);

    // Another app of the suite (the practice hub), over HTTPS with the deployment's LINK_SECRET (only where there are no service bindings).
    const link = await handleLink(request, env, LINK_METHODS);
    if (link) return link;

    const who = await whoIs(request, env);
    if (!who.email) return json({ error: who.error }, who.status || 401);
    if (!env.DB) return json({ error: 'The database is not connected to this site yet.' }, 503);

    try {
      const r = await handle({
        method: request.method, path: url.pathname, email: who.email, text: () => request.text(),
        firstAdmins: String(env.FIRST_ADMINS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
        site: env.SITE_LABEL || '', origin: siteUrl(env, request), sender: emailSender(env), defer: p => ctx.waitUntil(p),
      }, storeFor(env));
      return json(r.body, r.status);
    } catch (e) {
      console.error(e);
      return json({ error: 'The server hit an error. Try again.' }, 500);
    }
  },

  // Daily: remind counsel about questions open beyond the agreed turnaround.
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    const store = storeFor(env);
    ctx.waitUntil((async () => {
      await store.init();
      const e = await store.getEngagement(); if (!e) return;
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: env.REMINDER_TZ || 'Australia/Brisbane' }).format(new Date());
      await deliver(dueReminders(e.data, await store.listUsers(), today, siteUrl(env)), store, emailSender(env), new Date().toISOString());
    })());
  },
};
