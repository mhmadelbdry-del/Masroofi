import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category, Member } from "@/lib/masroufi/types";
import { MemberDot } from "./member-dot";

export function ExpenseForm({
  categories,
  me,
  pending,
  onSubmit,
  initial,
  submitLabel = "حفظ المصروف",
}: {
  categories: Category[];
  me: Member | { name: string };
  pending?: boolean;
  submitLabel?: string;
  initial?: { description: string; amount?: number; categoryId?: string };
  onSubmit: (data: { description: string; amount: number; categoryId: string }) => void;
}) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const value = Number(amount);
        if (!description.trim() || !categoryId || !Number.isFinite(value) || value <= 0) return;
        onSubmit({ description: description.trim(), amount: value, categoryId });
        if (!initial) {
          setDescription("");
          setAmount("");
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="exp-desc">بيان المصروف</Label>
        <Input
          id="exp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="مثال: تموينات، سوبرماركت، وقود"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="exp-amount">المبلغ</Label>
          <Input
            id="exp-amount"
            inputMode="decimal"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="exp-cat">الفئة</Label>
          <select
            id="exp-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          >
            <option value="">اختر الفئة…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md bg-primary-soft/60 px-3 py-2">
        <span className="text-xs text-muted">يُسجَّل تلقائياً باسم المستخدم الحالي</span>
        <span className="flex items-center gap-2 text-sm font-medium text-primary">
          {me.name}
          <MemberDot name={me.name} size="sm" active />
        </span>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : submitLabel}
      </Button>
    </form>
  );
}
