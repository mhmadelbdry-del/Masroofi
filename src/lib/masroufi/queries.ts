import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, type Sql } from "@/lib/db";
import { sendHouseholdPush } from "./push.server";
import { authMiddleware } from "@/lib/auth/middleware";
import { DEFAULT_CATEGORIES, DEMO_EXPENSES } from "./defaults";
import { cairoLocalToDate, cairoParts, monthBoundsIso } from "./format";
import type { Category, CategoryKind, Expense, HomeRequest, Member, MonthSnapshot } from "./types";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function joinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

type MembershipRow = {
  household_id: string;
  member_id: string;
  member_name: string;
  monthly_income: string | number;
  savings_goal: string | number;
  join_code: string;
};

async function membership(sql: Sql, userId: string): Promise<MembershipRow | null> {
  const rows = await sql<MembershipRow>`
    select
      hu.household_id,
      hu.member_id,
      m.name as member_name,
      h.monthly_income,
      h.savings_goal,
      h.join_code
    from household_users hu
    join households h on h.id = hu.household_id
    join household_members m on m.id = hu.member_id
    where hu.user_id = ${userId}
    limit 1
  `;
  return rows[0] ?? null;
}

async function loadMembers(sql: Sql, householdId: string): Promise<Member[]> {
  const rows = await sql<{
    id: string;
    name: string;
    sort_order: number;
    claimed: boolean | string | number;
  }>`
    select
      m.id,
      m.name,
      m.sort_order,
      exists(select 1 from household_users u where u.member_id = m.id) as claimed
    from household_members m
    where m.household_id = ${householdId}
    order by m.sort_order asc
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: num(r.sort_order),
    claimed: r.claimed === true || r.claimed === "t" || r.claimed === "true",
  }));
}

async function loadSnapshot(
  sql: Sql,
  userId: string,
  year: number,
  month: number,
): Promise<MonthSnapshot> {
  const mine = await membership(sql, userId);
  if (!mine) {
    return {
      household: null,
      members: [],
      me: null,
      categories: [],
      expenses: [],
      homeRequests: [],
      reflection: "",
      year,
      month,
    };
  }

  const { start, end } = monthBoundsIso(year, month);
  const hid = mine.household_id;

  const [members, catRows, expRows, requestRows, refRows] = await Promise.all([
    loadMembers(sql, hid),
    sql<{
      id: string;
      name: string;
      kind: CategoryKind;
      monthly_limit: string | number;
      sort_order: number;
      spent: string | number;
    }>`
      select
        c.id,
        c.name,
        c.kind,
        c.monthly_limit,
        c.sort_order,
        coalesce((
          select sum(e.amount) from expenses e
          where e.category_id = c.id
            and e.household_id = ${hid}
            and e.occurred_at >= ${start}::timestamptz
            and e.occurred_at < ${end}::timestamptz
        ), 0) as spent
      from categories c
      where c.household_id = ${hid} and c.archived = false
      order by c.sort_order asc
    `,
    sql<{
      id: string;
      category_id: string;
      category_name: string;
      category_kind: CategoryKind;
      description: string;
      amount: string | number;
      occurred_at: unknown;
      created_by_member_id: string;
      created_by_name: string;
      updated_by_member_id: string;
      updated_by_name: string;
    }>`
      select
        e.id,
        e.category_id,
        c.name as category_name,
        c.kind as category_kind,
        e.description,
        e.amount,
        e.occurred_at,
        e.created_by_member_id,
        cm.name as created_by_name,
        e.updated_by_member_id,
        um.name as updated_by_name
      from expenses e
      join categories c on c.id = e.category_id
      join household_members cm on cm.id = e.created_by_member_id
      join household_members um on um.id = e.updated_by_member_id
      join household_users hu on hu.household_id = e.household_id
      where hu.user_id = ${userId}
        and e.occurred_at >= ${start}::timestamptz
        and e.occurred_at < ${end}::timestamptz
      order by e.occurred_at desc
    `,
    sql<{
      id: string;
      title: string;
      quantity: string;
      completed: boolean | string | number;
      completed_at: unknown;
      created_at: unknown;
      created_by_member_id: string;
      created_by_name: string;
      completed_by_member_id: string | null;
      completed_by_name: string | null;
    }>`
      select
        r.id,
        r.title,
        r.quantity,
        r.completed,
        r.completed_at,
        r.created_at,
        r.created_by_member_id,
        cm.name as created_by_name,
        r.completed_by_member_id,
        xm.name as completed_by_name
      from home_requests r
      join household_members cm on cm.id = r.created_by_member_id
      left join household_members xm on xm.id = r.completed_by_member_id
      where r.household_id = ${hid}
      order by r.completed asc, r.created_at desc
    `,
    sql<{ note: string }>`
      select note from reflections
      where household_id = ${hid} and year = ${year} and month = ${month}
      limit 1
    `,
  ]);

  const categories: Category[] = catRows.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    monthlyLimit: num(c.monthly_limit),
    sortOrder: num(c.sort_order),
    spent: num(c.spent),
  }));

  const expenses: Expense[] = expRows.map((e) => ({
    id: e.id,
    categoryId: e.category_id,
    categoryName: e.category_name,
    categoryKind: e.category_kind,
    description: e.description,
    amount: num(e.amount),
    occurredAt: iso(e.occurred_at),
    createdByMemberId: e.created_by_member_id,
    createdByName: e.created_by_name,
    updatedByMemberId: e.updated_by_member_id,
    updatedByName: e.updated_by_name,
  }));

  const homeRequests: HomeRequest[] = requestRows.map((r) => ({
    id: r.id,
    title: r.title,
    quantity: r.quantity,
    completed: r.completed === true || r.completed === "t" || r.completed === "true" || r.completed === 1,
    createdAt: iso(r.created_at),
    createdByMemberId: r.created_by_member_id,
    createdByName: r.created_by_name,
    completedAt: r.completed_at == null ? null : iso(r.completed_at),
    completedByMemberId: r.completed_by_member_id,
    completedByName: r.completed_by_name,
  }));

  return {
    household: {
      id: hid,
      monthlyIncome: num(mine.monthly_income),
      savingsGoal: num(mine.savings_goal),
      joinCode: mine.join_code,
    },
    members,
    me: { memberId: mine.member_id, name: mine.member_name },
    categories,
    expenses,
    homeRequests,
    reflection: refRows[0]?.note ?? "",
    year,
    month,
  };
}

const monthInput = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

export const getMonthSnapshot = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: unknown) => monthInput.parse(d))
  .handler(async ({ context, data }): Promise<MonthSnapshot> => {
    const sql = await getSql();
    return loadSnapshot(sql, context.userId, data.year, data.month);
  });

const createHouseholdInput = z.object({
  selfName: z.string().trim().min(1).max(40),
  partnerName: z.string().trim().min(1).max(40),
  monthlyIncome: z.number().min(0).max(10_000_000),
  savingsGoal: z.number().min(0).max(10_000_000),
});

export const createHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => createHouseholdInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await membership(sql, context.userId);
    if (existing) throw new Error("لديك بيت مسجّل بالفعل");

    const householdId = crypto.randomUUID();
    const selfId = crypto.randomUUID();
    const partnerId = crypto.randomUUID();
    let code = joinCode();
    for (let i = 0; i < 5; i += 1) {
      const clash = await sql<{ id: string }>`select id from households where join_code = ${code} limit 1`;
      if (clash.length === 0) break;
      code = joinCode();
    }

    await sql`
      insert into households (id, monthly_income, savings_goal, join_code)
      values (${householdId}, ${data.monthlyIncome}, ${data.savingsGoal}, ${code})
    `;
    await sql`
      insert into household_members (id, household_id, name, sort_order)
      values
        (${selfId}, ${householdId}, ${data.selfName}, 0),
        (${partnerId}, ${householdId}, ${data.partnerName}, 1)
    `;
    await sql`
      insert into household_users (user_id, household_id, member_id)
      values (${context.userId}, ${householdId}, ${selfId})
    `;

    for (let i = 0; i < DEFAULT_CATEGORIES.length; i += 1) {
      const c = DEFAULT_CATEGORIES[i];
      await sql`
        insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
        values (${crypto.randomUUID()}, ${householdId}, ${c.name}, ${c.kind}, ${c.monthlyLimit}, ${i})
      `;
    }

    const cats = await sql<{ id: string; sort_order: number }>`
      select id, sort_order from categories
      where household_id = ${householdId}
      order by sort_order asc
    `;
    const { year, month, day } = cairoParts();
    const memberIds = [selfId, partnerId];
    for (const row of DEMO_EXPENSES) {
      const useDay = Math.min(row.day, day);
      const cat = cats[row.categoryIndex];
      if (!cat) continue;
      const when = cairoLocalToDate(year, month, useDay, row.hour, row.minute);
      const mid = memberIds[row.memberIndex];
      await sql`
        insert into expenses (
          id, household_id, category_id, description, amount, occurred_at,
          created_by_member_id, updated_by_member_id
        ) values (
          ${crypto.randomUUID()}, ${householdId}, ${cat.id}, ${row.description},
          ${row.amount}, ${when.toISOString()}::timestamptz, ${mid}, ${mid}
        )
      `;
    }

    return { householdId, joinCode: code };
  });

const joinInput = z.object({
  code: z.string().trim().min(4).max(12),
  memberId: z.string().uuid(),
});

export const joinHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => joinInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await membership(sql, context.userId);
    if (existing) throw new Error("أنت بالفعل ضمن بيت");

    const code = data.code.trim().toUpperCase();
    const houses = await sql<{ id: string }>`
      select id from households where join_code = ${code} limit 1
    `;
    const house = houses[0];
    if (!house) throw new Error("رمز الانضمام غير صحيح");

    const members = await sql<{ id: string }>`
      select id from household_members where household_id = ${house.id} and id = ${data.memberId}
    `;
    if (!members[0]) throw new Error("الاسم المختار غير موجود في هذا البيت");

    const taken = await sql<{ user_id: string }>`
      select user_id from household_users where member_id = ${data.memberId} limit 1
    `;
    if (taken[0] && taken[0].user_id !== context.userId) {
      throw new Error("هذا الاسم مرتبط بحساب آخر");
    }

    await sql`
      insert into household_users (user_id, household_id, member_id)
      values (${context.userId}, ${house.id}, ${data.memberId})
    `;
    return { householdId: house.id };
  });

export const lookupJoinCode = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ code: z.string().trim().min(4).max(12) }).parse(d))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const code = data.code.trim().toUpperCase();
    const houses = await sql<{ id: string }>`
      select id from households where join_code = ${code} limit 1
    `;
    if (!houses[0]) return { found: false as const, members: [] as Member[] };
    const members = await loadMembers(sql, houses[0].id);
    return { found: true as const, members };
  });

const pushDeviceInput = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["android", "ios", "web"]).default("android"),
});

export const registerPushDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => pushDeviceInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");
    await sql`
      insert into push_devices (token, user_id, household_id, platform, updated_at)
      values (${data.token}, ${context.userId}, ${mine.household_id}, ${data.platform}, now())
      on conflict (token) do update set
        user_id = excluded.user_id,
        household_id = excluded.household_id,
        platform = excluded.platform,
        updated_at = now()
    `;
    return { ok: true };
  });

const homeRequestInput = z.object({
  title: z.string().trim().min(1).max(120),
  quantity: z.string().trim().min(1).max(40).default("1"),
});

export const addHomeRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => homeRequestInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");
    const id = crypto.randomUUID();
    await sql`
      insert into home_requests (id, household_id, title, quantity, created_by_member_id)
      values (${id}, ${mine.household_id}, ${data.title}, ${data.quantity}, ${mine.member_id})
    `;
    await sendHouseholdPush({
      householdId: mine.household_id,
      actorUserId: context.userId,
      title: "طلب منزلي جديد",
      body: `${mine.member_name} أضاف: ${data.title} (${data.quantity})`,
    });
    return { id };
  });

const toggleHomeRequestInput = z.object({
  id: z.string().uuid(),
  completed: z.boolean(),
});

export const toggleHomeRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => toggleHomeRequestInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");
    await sql`
      update home_requests
      set
        completed = ${data.completed},
        completed_at = ${data.completed ? new Date().toISOString() : null}::timestamptz,
        completed_by_member_id = ${data.completed ? mine.member_id : null},
        updated_at = now()
      where id = ${data.id} and household_id = ${mine.household_id}
    `;
    return { ok: true };
  });

export const deleteHomeRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");
    await sql`
      delete from home_requests
      where id = ${data.id} and household_id = ${mine.household_id}
    `;
    return { ok: true };
  });

const addExpenseInput = z.object({
  description: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(1_000_000),
  categoryId: z.string().uuid(),
});

export const addExpense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => addExpenseInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");

    const cats = await sql<{ id: string }>`
      select id from categories
      where id = ${data.categoryId} and household_id = ${mine.household_id} and archived = false
    `;
    if (!cats[0]) throw new Error("الفئة غير موجودة");

    const id = crypto.randomUUID();
    await sql`
      insert into expenses (
        id, household_id, category_id, description, amount,
        created_by_member_id, updated_by_member_id
      ) values (
        ${id}, ${mine.household_id}, ${data.categoryId}, ${data.description},
        ${data.amount}, ${mine.member_id}, ${mine.member_id}
      )
    `;
    await sendHouseholdPush({
      householdId: mine.household_id,
      actorUserId: context.userId,
      title: "مصروف جديد",
      body: `${mine.member_name} سجّل: ${data.description} — ${data.amount}`,
    });
    return { id };
  });

const updateExpenseInput = z.object({
  id: z.string().uuid(),
  description: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(1_000_000),
  categoryId: z.string().uuid(),
});

export const updateExpense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => updateExpenseInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");

    const result = await sql`
      update expenses e
      set
        description = ${data.description},
        amount = ${data.amount},
        category_id = ${data.categoryId},
        updated_by_member_id = ${mine.member_id},
        updated_at = now()
      where e.id = ${data.id}
        and e.household_id = ${mine.household_id}
        and exists (
          select 1 from categories c
          where c.id = ${data.categoryId}
            and c.household_id = ${mine.household_id}
        )
    `;
    void result;
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");
    await sql`
      delete from expenses
      where id = ${data.id} and household_id = ${mine.household_id}
    `;
    return { ok: true };
  });

const upsertCategoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(40),
  kind: z.enum(["necessity", "extra", "unexpected"]),
  monthlyLimit: z.number().min(0).max(10_000_000),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => upsertCategoryInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");

    if (data.id) {
      await sql`
        update categories
        set name = ${data.name}, kind = ${data.kind}, monthly_limit = ${data.monthlyLimit}
        where id = ${data.id} and household_id = ${mine.household_id}
      `;
      return { id: data.id };
    }

    const maxRows = await sql<{ m: number | string | null }>`
      select max(sort_order) as m from categories where household_id = ${mine.household_id}
    `;
    const next = num(maxRows[0]?.m) + 1;
    const id = crypto.randomUUID();
    await sql`
      insert into categories (id, household_id, name, kind, monthly_limit, sort_order)
      values (${id}, ${mine.household_id}, ${data.name}, ${data.kind}, ${data.monthlyLimit}, ${next})
    `;
    return { id };
  });

export const archiveCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");
    await sql`
      update categories
      set archived = true
      where id = ${data.id} and household_id = ${mine.household_id}
    `;
    return { ok: true };
  });

const updateHouseholdInput = z.object({
  monthlyIncome: z.number().min(0).max(10_000_000),
  savingsGoal: z.number().min(0).max(10_000_000),
  members: z
    .array(z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(40) }))
    .min(2)
    .max(2),
});

export const updateHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => updateHouseholdInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");

    await sql`
      update households
      set monthly_income = ${data.monthlyIncome}, savings_goal = ${data.savingsGoal}
      where id = ${mine.household_id}
    `;
    for (const m of data.members) {
      await sql`
        update household_members
        set name = ${m.name}
        where id = ${m.id} and household_id = ${mine.household_id}
      `;
    }
    return { ok: true };
  });

export const setActiveMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");
    const ok = await sql<{ id: string }>`
      select id from household_members
      where id = ${data.memberId} and household_id = ${mine.household_id}
    `;
    if (!ok[0]) throw new Error("عضو غير موجود");
    await sql`
      update household_users
      set member_id = ${data.memberId}
      where user_id = ${context.userId} and household_id = ${mine.household_id}
    `;
    return { ok: true };
  });

const saveReflectionInput = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  note: z.string().max(800),
});

export const saveReflection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => saveReflectionInput.parse(d))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const mine = await membership(sql, context.userId);
    if (!mine) throw new Error("لا يوجد بيت مرتبط بحسابك");
    await sql`
      insert into reflections (household_id, year, month, note, updated_by_member_id, updated_at)
      values (${mine.household_id}, ${data.year}, ${data.month}, ${data.note}, ${mine.member_id}, now())
      on conflict (household_id, year, month)
      do update set
        note = excluded.note,
        updated_by_member_id = excluded.updated_by_member_id,
        updated_at = now()
    `;
    return { ok: true };
  });
