import { useId, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Label } from "@/components/ui/label";
import type { Category } from "@/lib/masroufi/types";
import { KIND_LABEL } from "@/lib/masroufi/types";
import { orderCategoriesByUsage } from "@/lib/masroufi/category-order";

export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const id = useId();
  const ordered = useMemo(() => orderCategoriesByUsage(categories), [categories]);
  const availableValue = categories.some((category) => category.id === value) ? value : "";
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>الفئة</Label>
      <select
        id={id}
        value={availableValue}
        onChange={(event) => onChange(event.target.value)}
        required
        disabled={categories.length === 0}
        className="flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      >
        <option value="" disabled>{categories.length ? "اختر الفئة…" : "لا توجد فئات متاحة"}</option>
        {ordered.map((category) => (
          <option key={category.id} value={category.id}>{category.name} · {KIND_LABEL[category.kind]}</option>
        ))}
      </select>
      {categories.length === 0 ? <p className="text-xs text-muted">أضف فئة من إدارة الفئات قبل تسجيل مصروف.</p> : null}
      <p className="text-xs text-muted">الأكثر استخدامًا في مصروفات البيت يظهر أولًا.</p>
      <Link to="/budget" className="inline-flex min-h-9 items-center text-sm font-medium text-primary hover:underline">إدارة الفئات</Link>
    </div>
  );
}
