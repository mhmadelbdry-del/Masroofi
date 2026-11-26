// Needs: npm i -D @electric-sql/pglite. Run from the project root: node --experimental-strip-types --test scripts/bank-bridge.sql.test.ts
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { handleBridgePost } from "../src/lib/masroufi/bank-bridge-handler.ts";
import { hashToken, newToken } from "../src/lib/masroufi/bank-bridge.ts";
const M = "migrations/";
test("bridge against real SQL", async () => {
  const db = new PGlite();
  for (const f of ["0002_masroufi.sql","0003_home_requests.sql","0006_expense_accounting_month.sql","0007_bank_sms.sql"]) await db.exec(readFileSync(M+f,"utf8"));
  await db.exec(readFileSync("migrations/0009_bank_bridge_devices.sql","utf8"));
  const sql: any = async (s: TemplateStringsArray, ...v: any[]) => {
    let q = ""; s.forEach((p,i)=>{ q += p + (i<v.length?`$${i+1}`:""); });
    return (await db.query(q, v)).rows;
  };
  await db.exec(`insert into households(id, join_code) values ('h1','AAAAAA')`);
  await db.exec(`insert into household_members(id, household_id, name, sort_order) values ('m1','h1','A',0)`);
  await db.exec(`insert into household_users(user_id, household_id, member_id) values ('u1','h1','m1')`);
  await db.exec(`insert into categories(id, household_id, name, kind, monthly_limit, sort_order) values ('c1','h1','x','necessity',0,0)`);
  const token = newToken();
  await db.exec(`insert into bank_bridge_devices(id,user_id,household_id,member_id,category_id,label,token_hash) values ('d1','u1','h1','m1','c1','phone','${hashToken(token)}')`);
  const now = new Date("2026-11-25T20:00:00Z");
  const post = (b: any, t = token) => handleBridgePost(sql, `Bearer ${t}`, "application/json", JSON.stringify({ occurredAt: now.getTime() - 1000 * (b.at ?? 1), amount: b.amount }), now, undefined, "203.0.113.9");
  assert.deepEqual((await post({amount: 120.5})).body, {ok:true, duplicate:false});
  assert.deepEqual((await post({amount: 120.5})).body, {ok:true, duplicate:true});
  assert.deepEqual((await post({amount: 120.5, at: 2})).body, {ok:true, duplicate:false}); // same amount, different notification
  assert.equal((await post({amount: 10})).status, 200);
  const rows = (await db.query(`select amount, accounting_year, accounting_month, bank_sms_owner, created_by_member_id from expenses order by amount`)).rows;
  
  assert.equal(rows.length, 3);
  assert.equal((await db.query(`select count(*)::int n from bank_sms_receipts`)).rows[0].n, 3);
  assert.equal((await db.query(`select last_used_at from bank_bridge_devices`)).rows[0].last_used_at !== null, true);
  // failed-token throttle: 20 bad attempts from one address then 429, even with a valid token afterwards
  for (let i = 0; i < 20; i++) assert.equal((await post({amount: 5}, "mb1_" + "b".repeat(43))).status, 401);
  assert.equal((await post({amount: 5})).status, 429);
  assert.equal((await db.query(`select count(*)::int n from bank_bridge_failures`)).rows[0].n, 20);
  await db.exec(`delete from bank_bridge_failures`);
  // revoke
  await db.exec(`update bank_bridge_devices set revoked_at = now()`);
  assert.equal((await post({amount: 11})).status, 401);
  await db.exec(`update bank_bridge_devices set revoked_at = null`);
  // member removed
  await db.exec(`delete from household_users`);
  assert.equal((await post({amount: 12})).status, 403);
  await db.exec(`insert into household_users(user_id, household_id, member_id) values ('u1','h1','m1')`);
  // archived category
  await db.exec(`update categories set archived = true`);
  assert.equal((await post({amount: 13})).status, 409);
  await db.exec(`update categories set archived = false`);
  // rate limit: 30/hour
  for (let i = 0; i < 30; i++) await db.query(`insert into bank_sms_receipts(owner_user_id, sms_key, expense_id) values ('bridge:d1', 'k'||$1, 'e'||$1)`, [i]);
  assert.equal((await post({amount: 14})).status, 429);
});
