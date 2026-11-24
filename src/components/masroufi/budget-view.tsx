import { getCategoryUsage } from "@/lib/masroufi/queries";
import { useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatMoney, usagePct, usageTone } from "@/lib/masroufi/format";
import { useMasroufiMutations, useSnapshot } from "@/lib/masroufi/hooks";
import { KIND_LABEL, type Category, type CategoryKind } from "@/lib/masroufi/types";
import { CategoryBar } from "./category-bar";
import { cn } from "@/lib/utils";


const GROUPS: { id: CategoryKind; label: string }[] = [
  { id: "necessity", label: "الضروريات" },
  { id: "extra", label: "الكماليات" },
  { id: "unexpected", label: "غير متوقع" },
];

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "necessity", label: "الضروريات" },
  { id: "extra", label: "الكماليات" },
  { id: "over", label: "تجاوز الحد" },
] as const;

export function BudgetView() {
  const { data } = useSnapshot();
  const mut = useMasroufiMutations();
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [replacementId, setReplacementId] = useState("");
  const [deleteUsage, setDeleteUsage] = useState<{ count: number; total: number } | null>(null);
  const [checkingDelete, setCheckingDelete] = useState(false);
  const deleteRequest = useRef(0);
  async function beginDelete(category: Category) {
    const request = ++deleteRequest.current;
    setDeleting(category); setReplacementId(""); setDeleteUsage(null); setDeleteError(""); setCheckingDelete(true);
    try { const usage = await getCategoryUsage({ data: { id: category.id } }); if (request === deleteRequest.current) setDeleteUsage(usage); }
    catch { if (request === deleteRequest.current) setDeleteError("تعذر التأكد من المصروفات المرتبطة بالفئة. اقفل النافذة وجرّب تاني."); }
    finally { if (request === deleteRequest.current) setCheckingDelete(false); }
  }
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
  const spent = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const groupSummaries = GROUPS.map((group) => {
    const categories = data.categories.filter((c) => c.kind === group.id);
    const limit = categories.reduce((s, c) => s + c.monthlyLimit, 0);
    const actual = data.expenses.filter((expense) => expense.categoryKind === group.id).reduce((sum, expense) => sum + expense.amount, 0);
    return { ...group, limit, actual, pct: usagePct(actual, limit), tone: usageTone(actual, limit) };
  });

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

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">ملخص الفئات الرئيسية</h2>
          <p className="mt-1 text-sm text-muted">إجمالي كل فئة رئيسية مقارنة بسقوف الفئات الفرعية التابعة لها.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {groupSummaries.map((group) => (
            <article key={group.id} className="paper-card rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{group.label}</h3>
                <span className="num text-sm font-semibold text-fg">{group.pct}%</span>
              </div>
              <p className="mt-2 text-xs text-muted">
                المصروف <span className="num font-semibold text-fg">{formatMoney(group.actual)}</span>
                <span className="mx-1">من</span>
                <span className="num font-semibold text-fg">{formatMoney(group.limit)}</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-warm">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300",
                    group.tone === "ok" && "bg-primary",
                    group.tone === "warn" && "bg-warn",
                    group.tone === "over" && "bg-danger",
                  )}
                  style={{ width: `${group.pct}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

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
          list.map((c) => <CategoryBar key={c.id} category={c} onEdit={() => setEditing(c)} onDelete={() => void beginDelete(c)} />)
        )}
      </div>

      <section className="paper-card rounded-lg p-4">
        <h2 className="mb-3 font-semibold">تعديل سريع لحد فئة</h2>
        <QuickLimit categories={data.categories} onSave={(payload) => mut.saveCat.mutate(payload)} pending={mut.saveCat.isPending || mut.hideCat.isPending} />
      </section>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "فئة جديدة" : "تعديل الفئة"}>
          {editing ? (
            <CategoryForm
              initial={editing === "new" ? undefined : (editing as Category)}
              pending={mut.saveCat.isPending || mut.hideCat.isPending}
              onSubmit={(payload) => {
                mut.saveCat.mutate(payload);
                setEditing(null);
              }}
              onArchive={
                editing !== "new" && (editing as Category).id
                  ? () => {
                      void beginDelete(editing as Category);
                      setEditing(null);
                    }
                  : undefined
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !mut.hideCat.isPending) setDeleting(null); }}>
        <DialogContent title="حذف الفئة الفرعية">
          <p className="text-sm leading-7">حذف «{deleting?.name}» من اختيارات المصروفات الجديدة؟</p>
          <p className="mt-2 text-sm leading-7 text-muted">لن تُحذف أي مصروفات. الحذف يشمل فئات البيت المشترك، ويزيل سقف الفئة من الميزانية.</p>
          {checkingDelete ? <p role="status" className="mt-3 text-sm">جارٍ فحص المصروفات في كل الشهور…</p> : deleteUsage ? <p className="mt-3 text-sm leading-7">{deleteUsage.count > 0 ? `الفئة مرتبطة بـ ${deleteUsage.count} مصروف بإجمالي ${formatMoney(deleteUsage.total)} في كل الشهور. اختر فئة بديلة لنقلها قبل الحذف.` : "مفيش مصروفات مسجلة في الفئة دي."}</p> : null}
          {deleteUsage && deleteUsage.count > 0 ? <div className="mt-4 space-y-2">
            <Label htmlFor="delete-replacement">انقل المصروفات إلى</Label>
            <select id="delete-replacement" className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm" value={replacementId} onChange={event => setReplacementId(event.target.value)} disabled={mut.hideCat.isPending}>
              <option value="">اختر الفئة البديلة…</option>
              {data.categories.filter(category => category.id !== deleting?.id).map(category => <option key={category.id} value={category.id}>{category.name} · {KIND_LABEL[category.kind]}</option>)}
            </select>
            {data.categories.filter(category => category.id !== deleting?.id).length === 0 ? <p className="text-sm text-danger">أضف فئة جديدة الأول علشان تقدر تنقل المصروفات.</p> : null}
            <p className="text-xs leading-6 text-muted">أسماء المصروفات ومبالغها وتواريخها هتفضل زي ما هي. هتتغير الفئة في كل الشهور، وتتحسب ضمن نوع الفئة البديلة. مش هننقل سقف الفئة المالي.</p>
          </div> : null}
          {deleteError ? <p role="alert" className="mt-3 text-sm text-danger">{deleteError}</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" disabled={mut.hideCat.isPending} onClick={() => setDeleting(null)}>إلغاء</Button>
            <Button type="button" className="bg-danger text-white" disabled={mut.hideCat.isPending || checkingDelete || !deleteUsage || (deleteUsage.count > 0 && !replacementId)} onClick={async () => {
              if (!deleting) return;
              setDeleteError("");
              try { await mut.hideCat.mutateAsync({ id: deleting.id, replacementId: replacementId || undefined }); setDeleting(null); }
              catch (error) { setDeleteError(error instanceof Error ? error.message : "تعذر حذف الفئة. لم نحذف مصروفاتك، جرّب تاني.");
                try { setDeleteUsage(await getCategoryUsage({ data: { id: deleting.id } })); } catch { /* Keep existing error visible. */ }
              }
            }}>{mut.hideCat.isPending ? "جارٍ الحذف…" : deleteUsage?.count ? "نقل المصروفات وحذف الفئة" : "حذف الفئة فقط"}</Button>
          </div>
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
          حذف الفئة الفرعية
        </Button>
      ) : null}
    </form>
  );
}
