import { formatExpenseWhen, formatMoney } from "@/lib/masroufi/format";
import type { Expense } from "@/lib/masroufi/types";
import { KIND_LABEL } from "@/lib/masroufi/types";

export function ExpenseRow({
  expense,
  onClick,
}: {
  expense: Expense;
  onClick?: () => void;
}) {
  const when = formatExpenseWhen(expense.occurredAt);
  const edited = expense.updatedByMemberId !== expense.createdByMemberId;
  return (
    <button
      type="button"
      onClick={onClick}
      className="paper-card flex w-full items-start justify-between gap-3 rounded-lg p-4 text-right transition-[transform] duration-150 active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-fg">{expense.description}</p>
        <p className="mt-1 text-xs text-subtle">
          {expense.categoryName} · {KIND_LABEL[expense.categoryKind]} · {when.date} ({when.time})
        </p>
        <p className="mt-1 text-xs text-muted">
          سجّله {expense.createdByName}
          {edited ? ` · آخر تعديل: ${expense.updatedByName}` : ""}
        </p>
      </div>
      <span className="num shrink-0 text-base font-semibold text-fg">{formatMoney(expense.amount, { fixed: true })}</span>
    </button>
  );
}
