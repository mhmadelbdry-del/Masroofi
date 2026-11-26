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
  await db.exec(readFileSync("migrations/0010_bank_bridge_pending.sql","utf8"));
  const sql: any = async (s: TemplateStringsArray, ...v: any[]) => {
    let q = ""; s.forEach((p,i)=>{ q += p + (i<v.length?`$${i+1}`:""); });
    return (await db.query(q, v)).rows;
  };
  await db.exec(`insert into households(id, join_code) values ('h1','AAAAAA')`);
  await db.exec(`insert into household_members(id, household_id, name, sort_order) values ('m1','h1','A',0)`);
  await db.exec(`insert into household_users(user_id, household_id, member_id) values ('u1','h1','m1')`);
  await db.exec(`insert into categories(id, household_id, name, kind, monthly_limit, sort_order) values ('c1','h1','x','necessity',0,0)`);
  const token = newToken();
  await db.exec(`insert into bank_bridge_devices(id,user_id,household_id,member_id,label,token_hash) values ('d1','u1','h1','m1','phone','${hashToken(token)}')`);
  const now = new Date("2026-11-25T20:00:00Z");
  const post = (b: any, t = token) => handleBridgePost(sql, `Bearer ${t}`, "application/json", JSON.stringify({ occurredAt: now.getTime() - 1000 * (b.at ?? 1), amount: b.amount }), now, undefined, "203.0.113.9");
  assert.deepEqual((await post({amount: 120.5})).body, {ok:true, duplicate:false});
  assert.deepEqual((await post({amount: 120.5})).body, {ok:true, duplicate:true});
  assert.deepEqual((await post({amount: 120.5, at: 2})).body, {ok:true, duplicate:false}); // same amount, different notification
  assert.equal((await post({amount: 10})).status, 200);
  const pend = (await db.query(`select amount::float8 amount, member_id, user_id, household_id, sms_key from bank_bridge_pending order by amount`)).rows;
  assert.equal(pend.length, 3);
  assert.equal((await db.query(`select count(*)::int n from expenses`)).rows[0].n, 0); // nothing recorded until a category is chosen
  assert.deepEqual(pend.map((r: any) => r.amount), [10, 120.5, 120.5]);
  assert.equal(pend[0].member_id, "m1");
  assert.equal((await db.query(`select count(*)::int n from bank_sms_receipts`)).rows[0].n, 3);
  // resolve: same statements the app uses, then a late repeat delivery of the same notification must not resurrect it
  const first = (await db.query(`delete from bank_bridge_pending where amount = 10 returning id, sms_key`)).rows[0];
  await db.query(`insert into expenses (id, household_id, category_id, description, amount, occurred_at, accounting_year, accounting_month, created_by_member_id, updated_by_member_id, bank_sms_key, bank_sms_owner) values ($1,'h1','c1','x',10,now(),2026,11,'m1','m1',$2,'bridge:d1')`, [first.id, first.sms_key]);
  assert.deepEqual((await post({amount: 10})).body, {ok:true, duplicate:true});
  assert.equal((await db.query(`select count(*)::int n from bank_bridge_pending where amount = 10`)).rows[0].n, 0);
  // dismiss also keeps the receipt, so a repeat never comes back
  await db.query(`delete from bank_bridge_pending where amount = 120.5 and sms_key = (select sms_key from bank_bridge_pending where amount = 120.5 limit 1)`);
  assert.deepEqual((await post({amount: 120.5})).body, {ok:true, duplicate:true});
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
  // rate limit: 30/hour
  for (let i = 0; i < 30; i++) await db.query(`insert into bank_sms_receipts(owner_user_id, sms_key, expense_id) values ('bridge:d1', 'k'||$1, 'e'||$1)`, [i]);
  assert.equal((await post({amount: 14})).status, 429);
});
