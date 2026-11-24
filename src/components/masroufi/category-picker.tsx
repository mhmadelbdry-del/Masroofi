import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Search,
  LayoutGrid,
  ReceiptText,
  HandHeart,
  Shirt,
  GraduationCap,
  Zap,
  Gamepad2,
  Utensils,
  Flame,
  Gift,
  ShoppingCart,
  HeartPulse,
  House,
  Wifi,
  Baby,
  Wrench,
  Ellipsis,
  User,
  Smartphone,
  Building2,
  PiggyBank,
  ShoppingBag,
  Repeat,
  Car,
  Droplet,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/masroufi/types";
import { REFERENCE_CATEGORIES, CATEGORY_ALIASES } from "@/lib/masroufi/reference-categories";
import { cn } from "@/lib/utils";

const ICONS = [
  [/فواتير/, ReceiptText],
  [/صدقة|زكاة/, HandHeart],
  [/ملابس/, Shirt],
  [/تعليم/, GraduationCap],
  [/كهرباء/, Zap],
  [/ترفيه/, Gamepad2],
  [/مطاعم|طعام|لحوم/, Utensils],
  [/غاز|وقود/, Flame],
  [/هدايا/, Gift],
  [/بقالة/, ShoppingCart],
  [/صحة|علاج/, HeartPulse],
  [/المنزل/, House],
  [/إنترنت|انترنت/, Wifi],
  [/أطفال/, Baby],
  [/صيان/, Wrench],
  [/شخصي/, User],
  [/موبايل/, Smartphone],
  [/إيجار/, Building2],
  [/ادخار|جمعيات/, PiggyBank],
  [/تسوق/, ShoppingBag],
  [/اشتراكات/, Repeat],
  [/مواصلات/, Car],
  [/مياه/, Droplet],
] as const;
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ordered = useMemo(() => {
    const names = REFERENCE_CATEGORIES.map((c) => c.name);
    const rank = (name: string) => {
      const i = names.findIndex((n) => n === name || CATEGORY_ALIASES[n]?.includes(name));
      return i < 0 ? 1000 : i;
    };
    return [...categories].sort((a, b) => rank(a.name) - rank(b.name));
  }, [categories]);
  const visible = useMemo(
    () => ordered.filter((c) => c.name.includes(search.trim())),
    [ordered, search],
  );
  const selected = categories.find((c) => c.id === value);
  const quick = ordered.slice(0, 4);
  if (selected && !quick.some((c) => c.id === selected.id)) quick.push(selected);
  const chip = (c: Category) => {
    const Icon = ICONS.find(([pattern]) => pattern.test(c.name))?.[1] ?? Ellipsis;
    return (
      <button
        key={c.id}
        type="button"
        aria-pressed={c.id === value}
        onClick={() => onChange(c.id)}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-2 px-3 py-2 text-sm transition-colors",
          c.id === value
            ? "border-primary bg-primary-soft text-primary"
            : "border-border bg-bg-warm text-muted",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span>{c.name}</span>
        {c.id === value ? <Check className="size-3.5" /> : null}
      </button>
    );
  };
  return (
    <section className="rounded-2xl border border-border bg-surface p-4" aria-label="الفئة">
      <p className="mb-3 text-sm text-muted">الفئة</p>
      <div className="flex flex-wrap gap-2">{quick.map(chip)}</div>
      <button
        type="button"
        className="mt-3 flex min-h-11 items-center gap-2 font-medium text-primary"
        onClick={() => {
          setSearch("");
          setOpen(true);
        }}
      >
        <LayoutGrid className="size-4" />
        عرض الكل
      </button>
      {!value ? <p className="mt-1 text-xs text-muted">اختر فئة للمصروف</p> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="الفئة"
          dir="rtl"
          className="top-auto bottom-0 max-h-[88dvh] w-full max-w-lg translate-y-0 overflow-y-auto rounded-b-none sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-xl"
        >
          <div className="relative mb-5">
            <Search className="absolute top-3 right-3 size-5 text-subtle" />
            <Input
              aria-label="بحث الفئات"
              placeholder="بحث عن فئة"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <p className="mb-2 text-xs text-muted">{visible.length} فئة · مرّر لعرض المزيد</p>
          <div className="flex max-h-[48dvh] flex-wrap content-start gap-2 overflow-y-auto pb-3">
            {visible.map(chip)}
            {!visible.length ? <p className="py-5 text-muted">لا توجد فئات مطابقة</p> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button type="button" onClick={() => setOpen(false)}>
              تم
            </Button>
            <Link
              to="/budget"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center justify-center rounded-md border border-primary text-sm font-semibold text-primary"
            >
              إدارة الفئات
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
