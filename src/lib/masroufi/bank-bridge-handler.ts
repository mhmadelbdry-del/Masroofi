import type { Sql } from "@/lib/db";
import { FAIL_LIMIT, FAIL_WINDOW_MS, LIMIT_PER_DAY, LIMIT_PER_HOUR, dedupeKey, hashToken, ipKey, parseBridgeBody, tokenFromHeader } from "./bank-bridge.ts";

export type BridgeResponse = { status: number; body: Record<string, unknown> };
const json = (status: number, body: Record<string, unknown>): BridgeResponse => ({ status, body });

/**
 * Core of POST /api/bank-bridge. Transport (headers, body text) is passed in so it can be tested
 * with a fake Sql. Failures never reveal whether a token exists.
 */
export async function handleBridgePost(
  sql: Sql, authorization: string | null, contentType: string | null, rawBody: string, now: Date = new Date(),
  newId: () => string = () => crypto.randomUUID(),
  callerAddr: string | null = null,
): Promise<BridgeResponse> {
  const ip = ipKey(callerAddr);
  const since = new Date(now.getTime() - FAIL_WINDOW_MS).toISOString();
  const fails = await sql<{ n: number | string }>`select count(*) as n from bank_bridge_failures where ip_hash = ${ip} and at > ${since}::timestamptz`;
  if (Number(fails[0]?.n ?? 0) >= FAIL_LIMIT) return json(429, { ok: false });
  const fail = async (): Promise<BridgeResponse> => {
    await sql`insert into bank_bridge_failures (ip_hash, at) values (${ip}, ${now.toISOString()}::timestamptz)`;
    await sql`delete from bank_bridge_failures where at < ${new Date(now.getTime() - 86400_000).toISOString()}::timestamptz`;
    return json(401, { ok: false });
  };
  const token = tokenFromHeader(authorization);
  if (!token) return fail();
  if (!contentType || !contentType.toLowerCase().startsWith("application/json")) return json(415, { ok: false });
  const devices = await sql<{ id: string; user_id: string; household_id: string; member_id: string }>`
    select id, user_id, household_id, member_id from bank_bridge_devices
    where token_hash = ${hashToken(token)} and revoked_at is null limit 1`;
  const dev = devices[0];
  if (!dev) return fail();
  // The enrolled account must still belong to the same household member (same rule as ownerKey in importBankExpense).
  const still = await sql<{ n: number | string }>`
    select count(*) as n from household_users where user_id = ${dev.user_id} and household_id = ${dev.household_id} and member_id = ${dev.member_id}`;
  if (Number(still[0]?.n ?? 0) < 1) return json(403, { ok: false });

  const parsed = parseBridgeBody(rawBody, now);
  if (!parsed.ok) return json(400, { ok: false, error: parsed.reason });
  const { amount, occurredAt } = parsed.value;

  const owner = `bridge:${dev.id}`;
  const rate = await sql<{ h: number | string; d: number | string }>`
    select count(*) filter (where created_at > ${new Date(now.getTime() - 3600_000).toISOString()}::timestamptz) as h,
           count(*) as d
    from bank_sms_receipts where owner_user_id = ${owner} and created_at > ${new Date(now.getTime() - 86400_000).toISOString()}::timestamptz`;
  if (Number(rate[0]?.h ?? 0) >= LIMIT_PER_HOUR || Number(rate[0]?.d ?? 0) >= LIMIT_PER_DAY) return json(429, { ok: false });

  const key = dedupeKey(dev.id, amount, occurredAt);
  // The receipt is the dedupe ledger: one row per notification, kept even after the item is registered or dismissed.
  // The notification then waits in bank_bridge_pending (amount + time only) until the user picks a category in the app.
  const pendingId = newId();
  const rows = await sql<{ id: string }>`
    with receipt as (
      insert into bank_sms_receipts (owner_user_id, sms_key, expense_id)
      values (${owner}, ${key}, ${pendingId})
      on conflict (owner_user_id, sms_key) do nothing returning expense_id
    )
    insert into bank_bridge_pending (id, device_id, user_id, household_id, member_id, sms_key, amount, occurred_at)
    select r.expense_id, ${dev.id}, ${dev.user_id}, ${dev.household_id}, ${dev.member_id}, ${key}, ${amount}, ${occurredAt.toISOString()}::timestamptz
    from receipt r returning id`;
  await sql`update bank_bridge_devices set last_used_at = now() where id = ${dev.id}`;
  return json(200, { ok: true, duplicate: !rows[0] });
}
