import { KIND_LABEL, type Category } from "@/lib/masroufi/types";
import { formatMoney, usagePct, usageTone } from "@/lib/masroufi/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE_LABEL = { ok: "ضمن الحد", warn: "قارب الحد", over: "تجاوز الحد" } as const;

export function CategoryBar({
  category,
  onEdit,
}: {
  category: Category;
  onEdit?: () => void;
}) {
  const tone = usageTone(category.spent, category.monthlyLimit);
  const pct = usagePct(category.spent, category.monthlyLimit);
  return (
    <article className="paper-card rounded-lg p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-fg">{category.name}</h3>
          <p className="mt-0.5 text-xs text-subtle">{KIND_LABEL[category.kind]}</p>
        </div>
        <Badge tone={tone}>{TONE_LABEL[tone]}</Badge>
      </div>
      <div className="mb-2 flex items-end justify-between text-sm">
        <span className="text-muted">
          السقف <span className="num font-medium text-fg">{formatMoney(category.monthlyLimit)}</span>
        </span>
        <span className="text-muted">
          تم صرف <span className="num font-semibold text-fg">{formatMoney(category.spent)}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-warm">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            tone === "ok" && "bg-primary",
            tone === "warn" && "bg-warn",
            tone === "over" && "bg-danger",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-subtle">استهلاك {pct}%</span>
        {onEdit ? (
          <button type="button" onClick={onEdit} className="text-xs font-medium text-primary hover:underline">
            تعديل الحد
          </button>
        ) : null}
      </div>
    </article>
  );
}
