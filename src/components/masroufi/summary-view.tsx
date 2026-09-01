import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  daysLeftInMonth,
  formatMoney,
  formatMonthTitle,
  formatExpenseWhen,
  shiftMonth,
} from "@/lib/masroufi/format";
import { useMasroufiMutations, useSnapshot } from "@/lib/masroufi/hooks";
import { useMonth } from "@/lib/masroufi/month-store";
import { ExpenseForm } from "./expense-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Expense } from "@/lib/masroufi/types";
import { KIND_LABEL } from "@/lib/masroufi/types";

export function SummaryView() {
  const { year, month, setMonth } = useMonth();
  const { data } = useSnapshot();
  const mut = useMasroufiMutations();
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [recentOpen, setRecentOpen] = useState(false);

  if (!data?.household || !data.me) return null;

  const spent = data.expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = data.household.monthlyIncome - spent - data.household.savingsGoal;
  const left = daysLeftInMonth(year, month);
  const goalMet = remaining >= 0 && data.household.savingsGoal > 0;
  const reflection = note ?? data.reflection;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ملخص {formatMonthTitle(year, month)}</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full hover:bg-bg-warm"
            onClick={() => {
              const n = shiftMonth(year, month, -1);
              setMonth(n.year, n.month);
            }}
            aria-label="الشهر السابق"
          >
            <ChevronRight className="size-5" />
          </button>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full hover:bg-bg-warm"
            onClick={() => {
              const n = shiftMonth(year, month, 1);
              setMonth(n.year, n.month);
            }}
            aria-label="الشهر التالي"
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>
      </div>

      <section className="hero-panel rounded-xl p-5">
        <p className="text-sm text-hero-muted">المتبقي للإنفاق لتحقيق هدف الادخار</p>
        <p className="num mt-1 text-4xl font-semibold tracking-tight">
          {formatMoney(remaining)}
        </p>
        <p className="mt-1 text-xs text-hero-muted">
          {left > 0 ? `باقي ${left} يوم` : "انتهى الشهر"}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <HeroStat label="الدخل" value={formatMoney(data.household.monthlyIncome)} />
          <HeroStat label="إجمالي المصروف" value={formatMoney(spent)} />
          <HeroStat
            label="هدف الادخار"
            value={formatMoney(data.household.savingsGoal)}
            hint={goalMet ? "الهدف مُتحقِق" : "غير متحقق"}
            tone={goalMet ? "normal" : "danger"}
          />
        </div>
      </section>

      <section className="paper-card rounded-lg p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">تسجيل سريع</h2>
          <Plus className="size-4 text-subtle" />
        </div>
        <ExpenseForm
          categories={data.categories}
          me={data.me}
          pending={mut.add.isPending}
          onSubmit={(payload) => mut.add.mutate({ ...payload, accountingYear: year, accountingMonth: month })}
        />
      </section>

      <section className="paper-card overflow-hidden rounded-lg">
        <div className="flex items-center gap-3 px-4 py-2">
          <button
            type="button"
            className="flex min-h-11 flex-1 items-center gap-2 text-right"
            onClick={() => setRecentOpen((open) => !open)}
            aria-expanded={recentOpen}
          >
            <ChevronDown className={`size-4 text-subtle transition-transform ${recentOpen ? "rotate-180" : ""}`} />
            <span className="font-semibold">آخر 5 مصروفات</span>
          </button>
          <Link to="/expenses" className="text-sm text-primary">
            كل المصروفات
          </Link>
        </div>
        {recentOpen ? (
          data.expenses.length === 0 ? (
            <p className="border-t border-border/70 p-6 text-center text-sm text-muted">لا مصروفات في هذا الشهر بعد.</p>
          ) : (
            <div className="overflow-x-auto border-t border-border/70">
              <table className="w-full min-w-[620px] text-right text-xs">
                <thead className="bg-bg-warm text-muted">
                  <tr>
                    <th className="px-3 py-3 font-medium">المصروف</th>
                    <th className="px-3 py-3 font-medium">قيمته</th>
                    <th className="px-3 py-3 font-medium">تاريخه</th>
                    <th className="px-3 py-3 font-medium">وقته</th>
                    <th className="px-3 py-3 font-medium">فئته</th>
                    <th className="px-3 py-3 font-medium">من سجله</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.slice(0, 5).map((expense) => {
                    const when = formatExpenseWhen(expense.occurredAt);
                    return (
                      <tr
                        key={expense.id}
                        className="cursor-pointer border-t border-border/60 hover:bg-bg-warm"
                        onClick={() => setEditing(expense)}
                        title="اضغط لعرض تفاصيل المصروف"
                      >
                        <td className="max-w-40 truncate px-3 py-3 font-medium">{expense.description}</td>
                        <td className="num whitespace-nowrap px-3 py-3 font-semibold">{formatMoney(expense.amount)}</td>
                        <td dir="ltr" className="whitespace-nowrap px-3 py-3 text-left text-muted"><bdi dir="ltr" className="inline-block">{when.date}</bdi></td>
                        <td dir="ltr" className="whitespace-nowrap px-3 py-3 text-left text-muted"><bdi dir="ltr" className="inline-block">{when.time}</bdi></td>
                        <td className="px-3 py-3 text-muted">{KIND_LABEL[expense.categoryKind]}</td>
                        <td className="px-3 py-3 text-muted">{expense.createdByName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </section>

      <section className="paper-card rounded-lg p-4">
        <h2 className="font-semibold">تأمل وانعاش الشهر</h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          مساحة هادئة لمراجعة ما كان ممتعاً وما يمكن ترشيده في الشهر القادم.
        </p>
        <Textarea
          value={reflection}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثال: أسعدنا رحلة نهاية الأسبوع. الشهر القادم سنقلل طلبات المطاعم."
        />
        <Button
          className="mt-3 w-full"
          variant="secondary"
          disabled={mut.reflection.isPending}
          onClick={() => mut.reflection.mutate({ year, month, note: reflection })}
        >
          حفظ التأمل الشهري
        </Button>
      </section>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="تعديل المصروف">
          {editing ? (
            <div className="space-y-3">
              <ExpenseForm
                categories={data.categories}
                me={data.me}
                initial={{
                  description: editing.description,
                  amount: editing.amount,
                  categoryId: editing.categoryId,
                }}
                pending={mut.update.isPending}
                submitLabel="حفظ التعديل"
                onSubmit={(payload) => {
                  mut.update.mutate({ id: editing.id, ...payload });
                  setEditing(null);
                }}
              />
              <Button
                variant="outline"
                className="w-full text-danger"
                onClick={() => {
                  if (!window.confirm(`حذف مصروف «${editing.description}»؟`)) return;
                  mut.remove.mutate(editing.id);
                  setEditing(null);
                }}
              >
                حذف المصروف
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeroStat({ label, value, hint, tone = "normal" }: { label: string; value: string; hint?: string; tone?: "normal" | "danger" }) {
  return (
    <div className={`rounded-md px-2.5 py-2 ${tone === "danger" ? "bg-danger/35 ring-1 ring-danger-soft/70" : "bg-surface/10"}`}>
      <p className="text-xs text-hero-muted">{label}</p>
      <p className="num mt-0.5 text-sm font-semibold">{value}</p>
      {hint ? (
        <Badge tone="hero" className="mt-1">
          {hint}
        </Badge>
      ) : null}
    </div>
  );
}
