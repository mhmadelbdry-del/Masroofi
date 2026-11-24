import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category, Member } from "@/lib/masroufi/types";
import { CategoryPicker } from "./category-picker";
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
      <div className="grid gap-3">
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
      </div>
      <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
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
