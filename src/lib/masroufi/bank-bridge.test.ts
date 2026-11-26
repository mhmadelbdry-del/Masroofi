import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dedupeKey, hashToken, newToken, parseBridgeBody, tokenFromHeader } from "./bank-bridge.ts";
import { handleBridgePost } from "./bank-bridge-handler.ts";

const NOW = new Date("2026-11-25T20:00:00Z");

describe("token", () => {
  it("round-trips through the header and never equals its hash", () => {
    const t = newToken();
    assert.equal(tokenFromHeader(`Bearer ${t}`), t);
    assert.notEqual(hashToken(t), t);
    assert.equal(hashToken(t).length, 64);
  });
  it("rejects malformed headers", () => {
    for (const h of [null, "", "Bearer x", "Basic abc", "Bearer mb1_short"]) assert.equal(tokenFromHeader(h), null);
  });
});

describe("parseBridgeBody", () => {
  it("requires occurredAt (the notification post time) and uses it", () => {
    const r = parseBridgeBody(JSON.stringify({ amount: 120.5, occurredAt: NOW.getTime() - 5000 }), NOW);
    assert.ok(r.ok && r.value.amount === 120.5 && r.value.occurredAt.getTime() === NOW.getTime() - 5000);
    assert.ok(!parseBridgeBody('{"amount":120.5}', NOW).ok);
  });
  it("accepts numeric string amounts and epoch ms", () => {
    const r = parseBridgeBody(JSON.stringify({ amount: "99.90", occurredAt: NOW.getTime() - 60000 }), NOW);
    assert.ok(r.ok && r.value.amount === 99.9);
  });
  it("rejects raw text, balances or any extra field", () => {
    for (const k of ["text", "notification", "balance", "card"]) {
      const r = parseBridgeBody(JSON.stringify({ amount: 5, occurredAt: NOW.getTime(), [k]: "x" }), NOW);
      assert.ok(!r.ok && r.reason === "unknown_field");
    }
  });
  it("rejects bad amounts and times", () => {
    for (const a of [0, -1, 1_000_001, 1.234, "abc", null]) assert.ok(!parseBridgeBody(JSON.stringify({ amount: a }), NOW).ok);
    assert.ok(!parseBridgeBody(JSON.stringify({ amount: 5, occurredAt: NOW.getTime() + 3600_000 }), NOW).ok);
    assert.ok(!parseBridgeBody(JSON.stringify({ amount: 5, occurredAt: NOW.getTime() - 2 * 86400_000 }), NOW).ok);
    assert.ok(!parseBridgeBody("not json", NOW).ok);
    assert.ok(!parseBridgeBody("[1]", NOW).ok);
    assert.ok(!parseBridgeBody(JSON.stringify({ amount: 5, pad: "x".repeat(600) }), NOW).ok);
  });
});

describe("dedupeKey", () => {
  it("same notification = same key; two purchases of the same amount seconds apart differ", () => {
    const a = dedupeKey("d1", 10, new Date("2026-11-25T20:00:05.000Z"));
    assert.equal(a, dedupeKey("d1", 10, new Date("2026-11-25T20:00:05.000Z")));
    assert.notEqual(a, dedupeKey("d1", 10, new Date("2026-11-25T20:00:06.000Z")));
    assert.notEqual(a, dedupeKey("d2", 10, new Date("2026-11-25T20:00:05.000Z")));
    assert.notEqual(a, dedupeKey("d1", 11, new Date("2026-11-25T20:00:05.000Z")));
    assert.match(a, /^[a-f0-9]{64}$/);
  });
});

/** Tiny in-memory stand-in for the queries the handler issues. */
function fakeSql(opts: { revoked?: boolean; stillMember?: boolean; recent?: number; categoryOk?: boolean; failures?: number } = {}) {
  const token = newToken();
  const receipts = new Map<string, string>();
  const expenses: any[] = [];
  const calls: string[] = [];
  const failLog: string[] = [];
  const sql: any = async (strings: TemplateStringsArray, ...v: any[]) => {
    const q = strings.join("?");
    calls.push(q);
    if (q.includes("from bank_bridge_failures")) return [{ n: opts.failures ?? 0 }];
    if (q.includes("into bank_bridge_failures")) { failLog.push(v[0]); return []; }
    if (q.includes("delete from bank_bridge_failures")) return [];
    if (q.includes("from bank_bridge_devices")) {
      return !opts.revoked && v[0] === hashToken(token) ? [{ id: "dev1", user_id: "u1", household_id: "h1", member_id: "m1" }] : [];
    }
    if (q.includes("from household_users")) return [{ n: opts.stillMember === false ? 0 : 1 }];
    if (q.includes("count(*) filter")) return [{ h: opts.recent ?? 0, d: opts.recent ?? 0 }];
    if (q.includes("with receipt as")) {
      const [owner, key, expId] = v;
      if (receipts.has(owner + key)) return [];
      receipts.set(owner + key, expId);
      expenses.push({ id: expId, amount: v[6], owner, hh: v[3], member: v[4], noCategory: true });
      return [{ id: expId }];
    }
    if (q.includes("update bank_bridge_devices")) return [];
    if (q.includes("from bank_sms_receipts")) { const r = receipts.get(v[0] + v[1]); return r ? [{ id: r }] : []; }
    throw new Error("unexpected query " + q);
  };
  return { sql, token, expenses, calls, failLog };
}
const post = (f: ReturnType<typeof fakeSql>, body: unknown, ct = "application/json", auth?: string | null) =>
  handleBridgePost(f.sql, auth === undefined ? `Bearer ${f.token}` : auth, ct, JSON.stringify({ occurredAt: NOW.getTime() - 1000, ...(body as object) }), NOW, () => "exp-" + Math.random(), "203.0.113.9");

describe("handleBridgePost", () => {
  it("queues one pending item with no category, then reports a duplicate for a repeat", async () => {
    const f = fakeSql();
    const a = await post(f, { amount: 75 });
    assert.deepEqual(a, { status: 200, body: { ok: true, duplicate: false } });
    const b = await post(f, { amount: 75 });
    assert.deepEqual(b, { status: 200, body: { ok: true, duplicate: true } });
    assert.equal(f.expenses.length, 1);
    assert.equal(f.expenses[0].owner, "bridge:dev1");
  });
  it("401 for missing, malformed, unknown or revoked tokens, with identical bodies", async () => {
    const f = fakeSql();
    const r1 = await post(f, { amount: 5 }, "application/json", null);
    const r2 = await post(f, { amount: 5 }, "application/json", "Bearer mb1_" + "a".repeat(43));
    const r3 = await post(fakeSql({ revoked: true }), { amount: 5 });
    for (const r of [r1, r2, r3]) assert.deepEqual(r, { status: 401, body: { ok: false } });
    assert.equal(f.expenses.length, 0);
  });
  it("403 when the enrolled member no longer belongs to the household", async () => {
    const r = await post(fakeSql({ stillMember: false }), { amount: 5 });
    assert.equal(r.status, 403);
  });
  it("415 for wrong content type, 400 for extra fields", async () => {
    const f = fakeSql();
    assert.equal((await post(f, { amount: 5 }, "text/plain")).status, 415);
    assert.equal((await post(f, { amount: 5, text: "x" })).status, 400);
    assert.equal(f.expenses.length, 0);
  });
  it("two real same-amount purchases at different post times are both kept", async () => {
    const f = fakeSql();
    await post(f, { amount: 50, occurredAt: NOW.getTime() - 30000 });
    await post(f, { amount: 50, occurredAt: NOW.getTime() - 20000 });
    assert.equal(f.expenses.length, 2);
  });
  it("records failed auth by hashed address only, and blocks after the limit", async () => {
    const f = fakeSql();
    await post(f, { amount: 5 }, "application/json", "Bearer nope");
    assert.equal(f.failLog.length, 1);
    assert.match(f.failLog[0], /^[a-f0-9]{64}$/);
    assert.ok(!f.failLog[0].includes("203.0.113.9"));
    assert.equal((await post(fakeSql({ failures: 20 }), { amount: 5 })).status, 429);
  });
  it("429 over the hourly limit", async () => {
    assert.equal((await post(fakeSql({ recent: 30 }), { amount: 5 })).status, 429);
  });
  it("never inserts into expenses and never needs a category: the item waits for the user to choose", async () => {
    const f = fakeSql();
    await post(f, { amount: 75 });
    assert.ok(f.expenses[0].noCategory);
    assert.ok(!f.calls.some((q) => q.includes("insert into expenses")));
    assert.ok(f.calls.some((q) => q.includes("bank_bridge_pending")));
  });
});

import { callerAddress } from "./bank-bridge.ts";
describe("callerAddress", () => {
  const h = (m: Record<string, string>) => ({ get: (k: string) => m[k] ?? null });
  it("ignores x-forwarded-for always", () => {
    assert.equal(callerAddress(h({ "x-forwarded-for": "1.2.3.4" }), true), "unknown");
    assert.equal(callerAddress(h({ "x-forwarded-for": "1.2.3.4", "x-vercel-forwarded-for": "5.6.7.8" }), false), "unknown");
  });
  it("uses Vercel header only on Vercel", () => {
    assert.equal(callerAddress(h({ "x-vercel-forwarded-for": "5.6.7.8, 9.9.9.9" }), true), "5.6.7.8");
    assert.equal(callerAddress(h({ "x-real-ip": "5.6.7.8" }), true), "5.6.7.8");
  });
});

import { parseAmountText } from "./bank-bridge.ts";
describe("parseAmountText", () => {
  it("normalizes Arabic digits and separators", () => {
    assert.equal(parseAmountText("١٢٣٫٥"), 123.5);
    assert.equal(parseAmountText("١٢٬٠٠٠"), 12000);
    assert.equal(parseAmountText("۴۵۰"), 450);
    assert.equal(parseAmountText("1,250.50"), 1250.5);
  });
  it("rejects ambiguous or non-numeric text", () => {
    for (const t of ["1.234", "12,34", "1,2", "EGP 5", "5 ", "", "1e3", "-5", "١٢٣.٤٥٦"]) assert.ok(Number.isNaN(parseAmountText(t)), t);
  });
  it("body parser keeps range checks for string amounts", () => {
    const now = new Date();
    const mk = (a: string) => parseBridgeBody(JSON.stringify({ amount: a, occurredAt: now.getTime() - 1000 }), now);
    assert.equal(mk("2,000,000").ok, false);
    assert.equal(mk("0").ok, false);
    assert.equal(mk("١٢٠٫٥٠").ok, true);
  });
});
