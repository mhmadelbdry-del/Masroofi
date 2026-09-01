import { useEffect, useState } from "react";
import { Check, Copy, Eye, LogOut, Palette, UserPlus, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJoinRequestDetail, useMasroufiMutations, useSnapshot } from "@/lib/masroufi/hooks";
import { cn } from "@/lib/utils";
import { useTheme, type MasroofiTheme } from "./theme";

export function SettingsView() {
  const user = useCurrentUser();
  const { data } = useSnapshot();

  if (!data?.household || !data.me) {
    return <NoHouseholdSettings userLabel={user?.displayName ?? user?.primaryEmail ?? "—"} />;
  }

  return (
    <HouseholdSettings
      householdData={data as HouseholdData}
      userLabel={user?.displayName ?? user?.primaryEmail ?? "—"}
    />
  );
}

function NoHouseholdSettings({ userLabel }: { userLabel: string }) {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">إعدادات التطبيق</h1>
      <ThemePicker defaultTheme="teal" />

      <section className="paper-card rounded-lg border-2 border-primary/30 p-4">
        <h2 className="mb-2 font-semibold">إعداد الأسرة</h2>
        <p className="mb-4 text-sm leading-6 text-muted">
          انضم إلى أسرة موجودة باستخدام كود الشريك أو أنشئ أسرة جديدة.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            to="/join"
            className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-center font-semibold text-primary-fg"
          >
            <UserPlus className="size-4" />
            الانضمام إلى أسرة بكود الشريك
          </Link>
          <Link
            to="/onboarding"
            className="rounded-md bg-bg-warm px-4 py-3 text-center text-sm font-medium text-fg"
          >
            إنشاء أسرة جديدة
          </Link>
        </div>
      </section>

      <section className="paper-card rounded-lg p-4">
        <p className="text-sm text-muted">الحساب: {userLabel}</p>
        <Button
          variant="outline"
          className="mt-3 w-full"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
        >
          <LogOut className="size-4" />
          {signingOut ? "جارٍ الخروج…" : "تسجيل الخروج"}
        </Button>
      </section>
    </div>
  );
}

type SnapshotData = NonNullable<ReturnType<typeof useSnapshot>["data"]>;
type HouseholdData = SnapshotData & {
  household: NonNullable<SnapshotData["household"]>;
  me: NonNullable<SnapshotData["me"]>;
};

function JoinRequestCard({ request }: { request: HouseholdData["joinRequests"][number] }) {
  const [showCompare, setShowCompare] = useState(false);
  const detail = useJoinRequestDetail(request.id, showCompare);
  const mut = useMasroufiMutations();

  return (
    <div className="rounded-md bg-bg-warm p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{request.requesterName}</p>
          <p className="mt-1 text-xs text-muted">يريد استخدام اسم: {request.targetMemberName}</p>
        </div>
        <span className="rounded-full bg-surface px-2 py-1 text-xs text-muted">طلب جديد</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded bg-surface px-2 py-2">
          <strong className="block text-sm">{request.sourceExpenseCount}</strong>
          مصروف قديم
        </div>
        <div className="rounded bg-surface px-2 py-2">
          <strong className="block text-sm">{request.sourceExpenseTotal.toLocaleString("ar-EG")}</strong>
          إجمالي قديم
        </div>
        <div className="rounded bg-surface px-2 py-2">
          <strong className="block text-sm">{request.sourceRequestCount}</strong>
          طلب قديم
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowCompare((value) => !value)}>
          <Eye className="size-4" />
          {showCompare ? "إخفاء المقارنة" : "عرض ومقارنة"}
        </Button>
        <Button
          size="sm"
          disabled={mut.joinResolve.isPending}
          onClick={() => mut.joinResolve.mutate({ id: request.id, decision: "keep" })}
        >
          <Check className="size-4" />
          قبول والاحتفاظ
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={mut.joinResolve.isPending}
          onClick={() => mut.joinResolve.mutate({ id: request.id, decision: "erase" })}
        >
          قبول مع المحو
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={mut.joinResolve.isPending}
          onClick={() => mut.joinResolve.mutate({ id: request.id, decision: "reject" })}
        >
          <X className="size-4" />
          رفض
        </Button>
      </div>
      {showCompare ? (
        <div className="mt-3 rounded-md border border-border bg-surface p-3 text-sm">
          {detail.isPending ? <p className="text-muted">جارٍ تحميل البيانات…</p> : null}
          {detail.error ? <p className="text-danger">تعذر تحميل بيانات المقارنة.</p> : null}
          {detail.data ? <JoinComparison detail={detail.data} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function JoinComparison({ detail }: { detail: NonNullable<ReturnType<typeof useJoinRequestDetail>["data"]> }) {
  return (
    <div className="space-y-3">
      <p className="font-semibold">بيانات {detail.requesterName} القديمة</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div><strong className="block text-sm">{detail.sourceExpenses.length}</strong>مصروفات</div>
        <div><strong className="block text-sm">{detail.sourceRequests.length}</strong>طلبات</div>
        <div><strong className="block text-sm">{detail.targetExpenseTotal.toLocaleString("ar-EG")}</strong>إجمالي بيتك</div>
      </div>
      {detail.sourceExpenses.length > 0 ? (
        <div>
          <p className="mb-1 font-medium">المصروفات القديمة</p>
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {detail.sourceExpenses.map((expense, index) => (
              <div key={`${expense.description}-${index}`} className="flex justify-between gap-2 rounded bg-bg-warm px-2 py-1.5 text-xs">
                <span>{expense.description}</span>
                <span>{expense.amount.toLocaleString("ar-EG")}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="text-xs text-muted">لا توجد مصروفات قديمة أضافها هذا الشريك.</p>}
      {detail.sourceRequests.length > 0 ? (
        <div>
          <p className="mb-1 font-medium">الطلبات القديمة</p>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {detail.sourceRequests.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded bg-bg-warm px-2 py-1.5 text-xs">
                {item.title} — {item.quantity}
              </div>
            ))}
          </div>
        </div>
      ) : <p className="text-xs text-muted">لا توجد طلبات منزلية قديمة أضافها هذا الشريك.</p>}
      <p className="text-xs leading-5 text-muted">
        خيار الاحتفاظ يقبل الانضمام ويُبقي الدفتر القديم كما هو. خيار المحو يحذف المصروفات والطلبات التي أضافها هذا الشريك فقط قبل ربطه بالأسرة الجديدة.
      </p>
    </div>
  );
}

function ThemePicker({ defaultTheme }: { defaultTheme: MasroofiTheme }) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    try {
      if (!window.localStorage.getItem("masroofi-theme")) setTheme(defaultTheme);
    } catch {
      setTheme(defaultTheme);
    }
  }, [defaultTheme, setTheme]);

  return (
    <section className="paper-card rounded-lg p-4">
      <div className="flex items-center gap-2">
        <Palette className="size-5 text-primary" />
        <div>
          <h2 className="font-semibold">لون الثيمة</h2>
          <p className="mt-1 text-sm text-muted">اختر اللون الذي يناسبك على هذا الجهاز.</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ThemeButton active={theme === "teal"} onClick={() => setTheme("teal")} label="الأخضر" swatch="bg-primary" />
        <ThemeButton active={theme === "pink"} onClick={() => setTheme("pink")} label="وردي" swatch="bg-[#b84f79]" />
      </div>
    </section>
  );
}

function ThemeButton({ active, onClick, label, swatch }: { active: boolean; onClick: () => void; label: string; swatch: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center justify-center gap-2 rounded-md border px-3 py-3 text-sm font-medium", active ? "border-primary bg-primary-soft" : "border-border bg-bg-warm")}
      aria-pressed={active}
    >
      <span className={cn("size-4 rounded-full", swatch)} />
      {label}
    </button>
  );
}

function HouseholdSettings({ householdData: data, userLabel }: { householdData: HouseholdData; userLabel: string }) {
  const mut = useMasroufiMutations();
  const [signingOut, setSigningOut] = useState(false);
  const [income, setIncome] = useState(String(data.household.monthlyIncome));
  const [goal, setGoal] = useState(String(data.household.savingsGoal));
  const [names, setNames] = useState(data.members.map((m) => ({ id: m.id, name: m.name })));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">إعدادات التطبيق</h1>

      <ThemePicker defaultTheme={data.me.memberId === data.members[0]?.id ? "teal" : "pink"} />

      <section className="paper-card rounded-lg p-4">
        <h2 className="mb-1 font-semibold">إعداد الأسرة</h2>
        <p className="mb-3 text-sm text-muted">
          رمز المزامنة والانضمام إلى أسرة جديدة وإدارة مغادرة الأسرة كلها من هذا القسم.
        </p>
        <div className="flex items-center gap-2">
          <div className="num flex-1 rounded-md bg-bg-warm px-3 py-3 text-center text-lg font-semibold tracking-widest">
            {data.household.joinCode}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(data.household.joinCode);
                toast.success("تم نسخ الرمز");
              } catch {
                toast.error("تعذر النسخ");
              }
            }}
            aria-label="نسخ رمز المزامنة"
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">شارك هذا الرمز مع شريكك لمزامنة نفس الدفتر.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            to="/join"
            className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-fg"
          >
            <UserPlus className="size-4" />
            الانضمام إلى أسرة جديدة
          </Link>
          <Button
            variant="outline"
            className="min-h-11 border-danger/40 text-danger hover:bg-danger/10"
            disabled={mut.leave.isPending}
            onClick={() => {
              const confirmed = window.confirm("هل تريد مغادرة الأسرة؟ ستحتاج إلى كود جديد للانضمام إلى أسرة أخرى.");
              if (confirmed) mut.leave.mutate();
            }}
          >
            {mut.leave.isPending ? "جارٍ المغادرة…" : "مغادرة الأسرة"}
          </Button>
        </div>
        {data.isOwner && data.joinRequests.length > 0 ? (
          <div className="mt-5 border-t border-border/70 pt-4">
            <h3 className="mb-1 font-semibold">طلبات الانضمام</h3>
            <p className="mb-3 text-sm leading-6 text-muted">
              راجع بيانات الشريك قبل الموافقة قبل ربطه بالأسرة.
            </p>
            <div className="space-y-3">
              {data.joinRequests.map((request) => (
                <JoinRequestCard key={request.id} request={request} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <form
        className="paper-card space-y-3 rounded-lg p-4"
        onSubmit={(e) => {
          e.preventDefault();
          mut.household.mutate({
            monthlyIncome: Number(income) || 0,
            savingsGoal: Number(goal) || 0,
            members: names,
          });
        }}
      >
        <h2 className="font-semibold">الدخل والأسماء</h2>
        {names.map((m, i) => (
          <div key={m.id} className="space-y-1.5">
            <Label htmlFor={`n-${m.id}`}>{i === 0 ? "الاسم الأول" : "اسم الشريك"}</Label>
            <Input
              id={`n-${m.id}`}
              value={m.name}
              onChange={(e) => setNames((prev) => prev.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="income">الدخل الشهري</Label>
          <Input id="income" type="number" min="0" value={income} onChange={(e) => setIncome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal">هدف الادخار الشهري</Label>
          <Input id="goal" type="number" min="0" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={mut.household.isPending}>
          حفظ الإعدادات
        </Button>
      </form>

      <section className="paper-card rounded-lg p-4">
        <p className="text-sm text-muted">الحساب: {userLabel}</p>
        <Button
          variant="outline"
          className="mt-3 w-full"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
        >
          <LogOut className="size-4" />
          {signingOut ? "جارٍ الخروج…" : "تسجيل الخروج"}
        </Button>
      </section>
    </div>
  );
}
