import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { hashToken, newToken } from "./bank-bridge";

/** Enrollment and revocation. These run under the normal login session, never under a bridge token. */
async function mine(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const rows = await sql<{ household_id: string; member_id: string }>`
    select household_id, member_id from household_users where user_id = ${userId} limit 1`;
  if (!rows[0]) throw new Error("لا يوجد بيت مرتبط بحسابك");
  return rows[0];
}

export const createBridgeDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ label: z.string().trim().min(1).max(60), categoryId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const m = await mine(sql, context.userId);
    const cat = await sql<{ id: string }>`select id from categories where id = ${data.categoryId} and household_id = ${m.household_id} and archived = false`;
    if (!cat[0]) throw new Error("الفئة غير متاحة");
    const live = await sql<{ n: number | string }>`select count(*) as n from bank_bridge_devices where user_id = ${context.userId} and revoked_at is null`;
    if (Number(live[0]?.n ?? 0) >= 5) throw new Error("وصلت للحد الأقصى من الأجهزة. ألغِ جهازًا أولًا");
    const token = newToken();
    const id = crypto.randomUUID();
    await sql`insert into bank_bridge_devices (id, user_id, household_id, member_id, category_id, label, token_hash)
      values (${id}, ${context.userId}, ${m.household_id}, ${m.member_id}, ${data.categoryId}, ${data.label}, ${hashToken(token)})`;
    // The token is returned once, to the signed-in user's screen only. It is never stored in clear or logged.
    return { id, token };
  });

export const listBridgeDevices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{ id: string; label: string; created_at: string; last_used_at: string | null; revoked_at: string | null }>`
      select id, label, created_at, last_used_at, revoked_at from bank_bridge_devices where user_id = ${context.userId} order by created_at desc`;
  });

export const revokeBridgeDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`update bank_bridge_devices set revoked_at = now() where id = ${data.id} and user_id = ${context.userId} and revoked_at is null`;
    return { ok: true };
  });
