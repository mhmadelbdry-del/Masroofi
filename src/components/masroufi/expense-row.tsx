import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { formatExpenseWhen, formatMoney } from "@/lib/masroufi/format";
import type { Expense } from "@/lib/masroufi/types";
import { KIND_LABEL } from "@/lib/masroufi/types";

export function ExpenseRow({
  expense,
  onClick,
  onMovePrevious,
  onMoveNext,
  onDelete,
  busy = false,
}: {
  expense: Expense;
  onClick?: () => void;
  onMovePrevious?: () => void;
  onMoveNext?: () => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const when = formatExpenseWhen(expense.occurredAt);
  const edited = expense.updatedByMemberId !== expense.createdByMemberId;
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);

  const clearLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const startLongPress = () => {
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      suppressClick.current = true;
      setMenuOpen(true);
    }, 550);
  };

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onClick?.();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={startLongPress}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
        onContextMenu={(event) => event.preventDefault()}
        className="paper-card flex w-full items-start justify-between gap-3 rounded-lg p-4 text-right transition-[transform] duration-150 active:scale-[0.99]"
        aria-label={`${expense.description}. اضغط مطولاً لعرض الإجراءات`}
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

      {menuOpen ? (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-2 shadow-sm" role="menu" aria-label="إجراءات المصروف">
          <button
            type="button"
            disabled={busy || !onMoveNext}
            onClick={() => {
              setMenuOpen(false);
              onMoveNext?.();
            }}
            className="flex items-center justify-center gap-1 rounded-md bg-primary-soft px-2 py-2 text-xs font-medium text-primary disabled:opacity-50"
            role="menuitem"
          >
            <ArrowLeft className="size-3.5" />
            الشهر التالي
          </button>
          <button
            type="button"
            disabled={busy || !onMovePrevious}
            onClick={() => {
              setMenuOpen(false);
              onMovePrevious?.();
            }}
            className="flex items-center justify-center gap-1 rounded-md bg-primary-soft px-2 py-2 text-xs font-medium text-primary disabled:opacity-50"
            role="menuitem"
          >
            <ArrowRight className="size-3.5" />
            الشهر السابق
          </button>
          <button
            type="button"
            disabled={busy || !onClick}
            onClick={() => {
              setMenuOpen(false);
              onClick?.();
            }}
            className="flex items-center justify-center gap-1 rounded-md border border-border px-2 py-2 text-xs text-fg disabled:opacity-50"
            role="menuitem"
          >
            <Pencil className="size-3.5" />
            تعديل
          </button>
          <button
            type="button"
            disabled={busy || !onDelete}
            onClick={() => {
              setMenuOpen(false);
              onDelete?.();
            }}
            className="flex items-center justify-center gap-1 rounded-md border border-danger/30 px-2 py-2 text-xs text-danger disabled:opacity-50"
            role="menuitem"
          >
            <Trash2 className="size-3.5" />
            حذف
          </button>
        </div>
      ) : null}
    </div>
  );
}
