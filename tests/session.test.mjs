// session: the session step in index.html (between "igi-session: begin" and "igi-session: end"), run as
// written, with a fake engine, a fake Firebase user and a fake page. tnw Step 12 (Justin, 22 Oct 2026):
// POST /auth/session that fails (5xx, the timeout, no network) is tried once more; if that fails too and
// the token has no tenantId claim, the page says "Could not finish signing in" with Try again instead of
// loading with no Firestore access. A first call that succeeds changes nothing.
// Run: node --test tests/session.test.mjs   (Node 20 or later; nothing to install)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/\r\n/g, "\n");
const BLOCK = (() => {
  const m = HTML.match(/\/\/ igi-session: begin[^\n]*\n([\s\S]*?)\/\/ igi-session: end/);
  assert.ok(m, "index.html carries the igi-session block");
  return m[1];
})();
const SESSION = "_propSession", IF_STALE = "_propSessionIfStale";
const tick = () => new Promise((r) => setTimeout(r, 0));

// answers: one per call, each a status number, "network" (fetch rejects) or "timeout" (an AbortError).
function page({ answers = [], claims = {} } = {}) {
  const calls = [];
  const els = {};
  let reloaded = 0, signedOut = 0, refreshed = 0, health = 0;
  const user = {
    getIdToken: async (force) => { if (force) refreshed++; return "tok"; },
    getIdTokenResult: async () => ({ claims }),
  };
  const auth = { currentUser: user, signOut: async () => { signedOut++; } };
  const mkEl = (tag) => {
    const el = { tagName: tag, id: "", style: {}, innerHTML: "", children: [], listeners: {}, textContent: "", className: "",
      appendChild(c) { this.children.push(c); if (c.id) els[c.id] = c; return c; },
      addEventListener(t, fn) { this.listeners[t] = fn; },
      querySelector(sel) { if (sel !== "button") return null; const b = { listeners: {}, addEventListener(t, fn) { this.listeners[t] = fn; }, set onclick(fn) { this.listeners.click = fn; } }; this._button = this._button || b; return this._button; } };
    return el;
  };
  const body = mkEl("body");
  const document = {
    body, readyState: "complete",
    createElement: mkEl,
    getElementById: (id) => els[id] || null,
    addEventListener() {},
  };
  const fetch = async (url, init) => {
    calls.push({ url, init });
    const a = answers[calls.length - 1] ?? 200;
    if (a === "network") throw new TypeError("Failed to fetch");
    if (a === "timeout") { const e = new Error("The operation was aborted due to timeout"); e.name = "TimeoutError"; throw e; }
    if (typeof a === "object") return { status: a.status, json: async () => a.body || {} };
    return { status: a, json: async () => ({}) };
  };
  const ctx = {
    console: { warn() {}, log() {} }, Promise, Date, Number, JSON,
    fetch, document, location: { reload: () => { reloaded++; } },
    setTimeout: (fn) => setTimeout(fn, 1),
    AbortSignal: { timeout: () => undefined },
    INTEL_BASE: "https://engine.invalid", showLogin() {},
  };
  ctx.auth = auth;
  ctx.checkFirestoreHealth = () => { ctx.__health = (ctx.__health || 0) + 1; };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(BLOCK, ctx);
  return {
    calls, els, auth, ctx,
    get reloaded() { return reloaded; }, get signedOut() { return signedOut; }, get refreshed() { return refreshed; }, get health() { return ctx.__health || 0; },
    run: (name = SESSION) => ctx[name](),
    stuck: () => els["igi-session-stuck"] || null,
  };
}
// Settles within a few ticks, or reports "pending" (the page held behind the message).
async function settle(p) {
  let out = "pending";
  p.then((v) => { out = v; }, (e) => { out = e; });
  for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 2));
  return out;
}

test("a first call that succeeds: one call, the token refreshed, the page goes on, no message", async () => {
  const p = page({ answers: [200] });
  assert.equal(await settle(p.run()), true);
  assert.equal(p.calls.length, 1);
  assert.equal(p.refreshed, 1);
  assert.equal(p.stuck(), null);
});

test("a 5xx then a success: tried once more, the page goes on, no message", async () => {
  const p = page({ answers: [503, 200] });
  assert.equal(await settle(p.run()), true);
  assert.equal(p.calls.length, 2);
  assert.equal(p.stuck(), null);
});

test("no network, then the timeout, and no tenantId claim: \"Could not finish signing in\", the page held, Try again reloads", async () => {
  const p = page({ answers: ["network", "timeout"] });
  assert.equal(await settle(p.run()), "pending");
  assert.equal(p.calls.length, 2, "exactly one retry");
  const s = p.stuck();
  assert.ok(s, "the message is shown");
  assert.match(s.innerHTML, /Could not finish signing in/);
  assert.match(s.innerHTML, /Try again/);
  s._button.listeners.click();
  assert.equal(p.reloaded, 1);
});

test("two 5xx, but the token already carries tenantId: the page goes on (Firestore works for it), no message", async () => {
  const p = page({ answers: [500, 502], claims: { tenantId: "default", claimsAt: 1 } });
  assert.equal(await settle(p.run()), true);
  assert.equal(p.calls.length, 2);
  assert.equal(p.stuck(), null);
});

test("an empty tenantId claim does not count: two failures show the message", async () => {
  const p = page({ answers: [503, 503], claims: { tenantId: "" } });
  assert.equal(await settle(p.run()), "pending");
  assert.ok(p.stuck());
});

test("403 not_provisioned: signed out and false, as before; no retry, no message", async () => {
  const p = page({ answers: [{ status: 403, body: { error: "not_provisioned" } }] });
  assert.equal(await settle(p.run()), false);
  assert.equal(p.calls.length, 1);
  assert.equal(p.signedOut, 1);
  assert.equal(p.stuck(), null);
});

test("any other 4xx: carries on as before; no retry, no message", async () => {
  const p = page({ answers: [400] });
  assert.equal(await settle(p.run()), true);
  assert.equal(p.calls.length, 1);
  assert.equal(p.stuck(), null);
});

test("a restored session with fresh claims makes no call at all", async () => {
  const p = page({ claims: { tenantId: "default", claimsAt: Math.floor(Date.now() / 1000) } });
  assert.equal(await settle(p.run(IF_STALE)), true);
  assert.equal(p.calls.length, 0);
});

test("a restored session without the claim goes through the same retry and message", async () => {
  const p = page({ answers: [503, 503] });
  assert.equal(await settle(p.run(IF_STALE)), "pending");
  assert.equal(p.calls.length, 2);
  assert.ok(p.stuck());
});
