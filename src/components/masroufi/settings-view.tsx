import { useState } from "react";
import { Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMasroufiMutations, useSnapshot } from "@/lib/masroufi/hooks";
import { MemberDot } from "./member-dot";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const user = useCurrentUser();
  const { data } = useSnapshot();
  const mut = useMasroufiMutations();
  const [signingOut, setSigningOut] = useState(false);

  if (!data?.household || !data.me) return null;

  const [income, setIncome] = useState(String(data.household.monthlyIncome));
  const [goal, setGoal] = useState(String(data.household.savingsGoal));
  const [names, setNames] = useState(data.members.map((m) => ({ id: m.id, name: m.name })));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">إعداد الأسرة</h1>

      <section className="paper-card rounded-lg p-4">
        <h2 className="mb-3 font-semibold">المستخدم الحالي على هذا الجهاز</h2>
        <p className="mb-3 text-sm text-muted">
          كل قيد جديد يُسجَّل باسم من تختاره هنا، مع التاريخ والوقت تلقائياً.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {data.members.map((m) => {
            const active = m.id === data.me?.memberId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => mut.member.mutate(m.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-3 text-right",
                  active ? "bg-primary text-primary-fg" : "bg-bg-warm text-fg",
                )}
              >
                <MemberDot name={m.name} size="sm" active={active} />
                <span className="text-sm font-medium">{m.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="paper-card rounded-lg p-4">
        <h2 className="mb-1 font-semibold">رمز مزامنة البيت</h2>
        <p className="mb-3 text-sm text-muted">
          شارك هذا الرمز مع زوجك/زوجتك. بعد تسجيل الدخول يدخله ليرى نفس الدفتر فوراً.
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
                await navigator.clipboard.writeText(data.household!.joinCode);
                toast.success("تم نسخ الرمز");
              } catch {
                toast.error("تعذر النسخ");
              }
            }}
            aria-label="نسخ الرمز"
          >
            <Copy className="size-4" />
          </Button>
        </div>
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
              onChange={(e) =>
                setNames((prev) => prev.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))
              }
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
        <p className="text-sm text-muted">
          الحساب: {user?.displayName ?? user?.primaryEmail ?? "—"}
        </p>
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
