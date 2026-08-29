import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatMoney, usageTone } from "@/lib/masroufi/format";
import { useMasroufiMutations, useSnapshot } from "@/lib/masroufi/hooks";
import { KIND_LABEL, type Category, type CategoryKind } from "@/lib/masroufi/types";
import { CategoryBar } from "./category-bar";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "necessity", label: "الضروريات" },
  { id: "extra", label: "الكماليات" },
  { id: "over", label: "تجاوز الحد" },
] as const;

export function BudgetView() {
  const { data } = useSnapshot();
  const mut = useMasroufiMutations();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [editing, setEditing] = useState<Partial<Category> | "new" | null>(null);

  const list = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.categories;
    if (filter === "over") return data.categories.filter((c) => usageTone(c.spent, c.monthlyLimit) === "over");
    return data.categories.filter((c) => c.kind === filter);
  }, [data, filter]);

  if (!data?.household) return null;

  const cap = data.categories.reduce((s, c) => s + c.monthlyLimit, 0);
  const spent = data.categories.reduce((s, c) => s + c.spent, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">حدود الميزانية</h1>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="size-4" />
          فئة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="paper-card rounded-lg p-4">
          <p className="text-xs text-muted">إجمالي السقف الشهري</p>
          <p className="num mt-1 text-2xl font-semibold">{formatMoney(cap)}</p>
        </div>
        <div className="paper-card rounded-lg p-4">
          <p className="text-xs text-muted">إجمالي المصروف الفعلي</p>
          <p className="num mt-1 text-2xl font-semibold">{formatMoney(spent)}</p>
          <p className="mt-1 text-xs text-subtle">{data.categories.length} فئات</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-9 shrink-0 rounded-full px-3 text-sm font-medium",
              filter === f.id ? "bg-primary text-primary-fg" : "bg-surface text-muted shadow-card",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <p className="paper-card rounded-lg p-8 text-center text-sm text-muted">لا فئات في هذا التبويب.</p>
        ) : (
          list.map((c) => <CategoryBar key={c.id} category={c} onEdit={() => setEditing(c)} />)
        )}
      </div>

      <section className="paper-card rounded-lg p-4">
        <h2 className="mb-3 font-semibold">تعديل سريع لحد فئة</h2>
        <QuickLimit categories={data.categories} onSave={(payload) => mut.saveCat.mutate(payload)} pending={mut.saveCat.isPending} />
      </section>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "فئة جديدة" : "تعديل الفئة"}>
          {editing ? (
            <CategoryForm
              initial={editing === "new" ? undefined : (editing as Category)}
              pending={mut.saveCat.isPending}
              onSubmit={(payload) => {
                mut.saveCat.mutate(payload);
                setEditing(null);
              }}
              onArchive={
                editing !== "new" && (editing as Category).id
                  ? () => {
                      mut.hideCat.mutate((editing as Category).id);
                      setEditing(null);
                    }
                  : undefined
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickLimit({
  categories,
  onSave,
  pending,
}: {
  categories: Category[];
  pending: boolean;
  onSave: (data: { id: string; name: string; kind: CategoryKind; monthlyLimit: number }) => void;
}) {
  const [id, setId] = useState("");
  const [limit, setLimit] = useState("");
  const selected = categories.find((c) => c.id === id);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) return;
        const monthlyLimit = Number(limit);
        if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) return;
        onSave({ id: selected.id, name: selected.name, kind: selected.kind, monthlyLimit });
        setLimit("");
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ql-cat">اختر الفئة</Label>
        <select
          id="ql-cat"
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            const c = categories.find((x) => x.id === e.target.value);
            setLimit(c ? String(c.monthlyLimit) : "");
          }}
          className="flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
        >
          <option value="">اختر…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ql-limit">الحد الشهري الجديد</Label>
        <Input id="ql-limit" inputMode="decimal" type="number" min="0" step="1" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="مثال: 3200" />
      </div>
      <Button type="submit" className="w-full" disabled={pending || !id}>
        حفظ السقف الجديد للشهر
      </Button>
    </form>
  );
}

function CategoryForm({
  initial,
  pending,
  onSubmit,
  onArchive,
}: {
  initial?: Category;
  pending: boolean;
  onSubmit: (data: { id?: string; name: string; kind: CategoryKind; monthlyLimit: number }) => void;
  onArchive?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? "necessity");
  const [limit, setLimit] = useState(initial ? String(initial.monthlyLimit) : "");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const monthlyLimit = Number(limit);
        if (!name.trim() || !Number.isFinite(monthlyLimit) || monthlyLimit < 0) return;
        onSubmit({ id: initial?.id, name: name.trim(), kind, monthlyLimit });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">اسم الفئة</Label>
        <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-kind">النوع</Label>
        <select
          id="cat-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as CategoryKind)}
          className="flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
        >
          {(Object.keys(KIND_LABEL) as CategoryKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-limit">الحد المالي الشهري</Label>
        <Input id="cat-limit" type="number" min="0" step="1" value={limit} onChange={(e) => setLimit(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        حفظ الفئة
      </Button>
      {onArchive ? (
        <Button type="button" variant="outline" className="w-full text-danger" onClick={onArchive}>
          إخفاء الفئة
        </Button>
      ) : null}
    </form>
  );
}
