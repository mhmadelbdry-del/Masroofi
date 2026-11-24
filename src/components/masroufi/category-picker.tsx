import { useId, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
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
import type { Category } from "@/lib/masroufi/types";
import { orderCategoriesByUsage } from "@/lib/masroufi/category-order";
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
export function CategoryPicker({ categories, value, onChange }: {
  categories: Category[]; value: string; onChange: (id: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const ordered = useMemo(() => orderCategoriesByUsage(categories), [categories]);
  const frequent = ordered.filter((category) => (category.usageCount ?? 0) > 0).slice(0, 4);
  const visible = open ? ordered : frequent;
  const selected = categories.find((category) => category.id === value);
  const SelectedIcon = ICONS.find(([pattern]) => pattern.test(selected?.name ?? ""))?.[1] ?? LayoutGrid;
  return (
    <section className="rounded-lg border border-border bg-surface px-3 py-1.5" aria-label="الفئة">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}
        className="flex min-h-9 w-full items-center gap-2 rounded-md text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/30">
        <SelectedIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <span className="flex-1 text-start font-medium">الفئة{selected ? `: ${selected.name}` : ""}</span>
        <span className="text-xs text-muted">{open ? "عرض الأكثر استخدامًا" : "عرض كل الفئات"}</span>
        <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      <div id={id}>
        
        <div role="group" aria-label="اختيار الفئة" className="grid grid-cols-4 gap-1 py-1">
          {visible.map((category) => {
            const Icon = ICONS.find(([pattern]) => pattern.test(category.name))?.[1] ?? Ellipsis;
            return <button key={category.id} type="button" aria-pressed={category.id === value} onClick={() => onChange(category.id)}
              className={cn("flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-1.5 text-xs leading-tight transition-colors", category.id === value ? "border-primary bg-primary-soft text-primary" : "border-border bg-bg-warm text-muted")}>
              <Icon aria-hidden="true" className="size-4 shrink-0" /><span className="w-full break-words text-center">{category.name}{category.id === value ? <Check aria-hidden="true" className="mr-0.5 inline size-3" /> : null}</span>
            </button>;
          })}
        </div>
        {!categories.length ? <p className="py-2 text-xs text-muted">أضف فئة من إدارة الفئات قبل تسجيل مصروف.</p> : !open && !frequent.length ? <p className="py-2 text-xs text-muted">لا توجد فئات مستخدمة بعد. افتح كل الفئات للاختيار.</p> : null}
        <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-muted"><span>{open ? "كل الفئات" : "الأكثر استخدامًا"}</span><Link to="/budget" className="inline-flex min-h-8 shrink-0 items-center font-medium text-primary hover:underline">إدارة الفئات</Link></div>
      </div>
    </section>
  );
}
