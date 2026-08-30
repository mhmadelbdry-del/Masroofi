import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMasroufiMutations, useSnapshot } from "@/lib/masroufi/hooks";
import { formatMonthTitle } from "@/lib/masroufi/format";
import { useMonth } from "@/lib/masroufi/month-store";
import type { Expense } from "@/lib/masroufi/types";
import { ExpenseForm } from "./expense-form";
import { ExpenseRow } from "./expense-row";

export function ExpensesView() {
  const { year, month } = useMonth();
  const { data } = useSnapshot();
  const mut = useMasroufiMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filter, setFilter] = useState("all");

  const list = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.expenses;
    return data.expenses.filter((e) => e.categoryId === filter);
  }, [data, filter]);

  if (!data?.household || !data.me) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">المصروفات اليومية</h1>
          <p className="mt-1 text-sm text-muted">{formatMonthTitle(year, month)}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          قيد جديد
        </Button>
      </div>

      <section className="paper-card rounded-lg p-4">
        <h2 className="mb-3 font-semibold">إضافة سريعة لمصروف</h2>
        <ExpenseForm
          categories={data.categories}
          me={data.me}
          pending={mut.add.isPending}
          onSubmit={(payload) => mut.add.mutate({ ...payload, accountingYear: year, accountingMonth: month })}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">سجل العمليات الأخير</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-xs text-fg"
          >
            <option value="all">كل الفئات</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {list.length === 0 ? (
          <p className="paper-card rounded-lg p-8 text-center text-sm text-muted">
            لا توجد عمليات في هذا العرض.
          </p>
        ) : (
          list.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              onClick={() => setEditing(e)}
              onMovePrevious={() => mut.move.mutate({ id: e.id, direction: "previous" })}
              onMoveNext={() => mut.move.mutate({ id: e.id, direction: "next" })}
              onDelete={() => {
                if (window.confirm(`حذف مصروف «${e.description}»؟`)) mut.remove.mutate(e.id);
              }}
              busy={mut.move.isPending || mut.remove.isPending}
            />
          ))
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="قيد جديد">
          <ExpenseForm
            categories={data.categories}
            me={data.me}
            pending={mut.add.isPending}
            onSubmit={(payload) => {
              mut.add.mutate({ ...payload, accountingYear: year, accountingMonth: month });
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

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
