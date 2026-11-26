import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { dismissPendingBridge, listPendingBridge, resolvePendingBridge } from "@/lib/masroufi/bank-bridge-admin";
import { useSnapshot } from "@/lib/masroufi/hooks";
import { CategoryPicker } from "./category-picker";
import { Button } from "@/components/ui/button";

const money = (v: number | string) => Number(v).toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const when = (v: string) => new Date(v).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });

/** Asks which category a notification-detected expense belongs to. Shows the oldest waiting item; the rest queue behind it. */
export function PendingBankExpense() {
  const qc = useQueryClient();
  const { data } = useSnapshot();
  const [categoryId, setCategoryId] = useState("");
  const pending = useQuery({ queryKey: ["bridge-pending"], queryFn: () => listPendingBridge(), refetchInterval: 30_000, refetchOnWindowFocus: true });
  const done = () => { setCategoryId(""); void qc.invalidateQueries({ queryKey: ["bridge-pending"] }); void qc.invalidateQueries({ queryKey: ["snapshot"] }); };
  const save = useMutation({
    mutationFn: (id: string) => resolvePendingBridge({ data: { id, categoryId } }),
    onSuccess: () => { toast.success("تم تسجيل المصروف"); done(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر التسجيل"),
  });
  const skip = useMutation({
    mutationFn: (id: string) => dismissPendingBridge({ data: { id } }),
    onSuccess: () => { toast.success("تم التجاهل"); done(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر التجاهل"),
  });
  const items = pending.data ?? [];
  const item = items[0];
  if (!item || !data?.categories) return null;
  const busy = save.isPending || skip.isPending;
  return (
    <section role="alert" aria-label="مصروف جديد من إشعار" className="paper-card mb-4 space-y-3 rounded-lg border-2 border-primary/40 p-4">
      <h2 className="flex items-center gap-2 font-semibold"><BellRing className="size-4 text-primary" aria-hidden />مصروف جديد من إشعار البنك{items.length > 1 ? ` (${items.length - 1} بعده)` : ""}</h2>
      <p className="text-sm"><span className="num text-lg font-semibold">{money(item.amount)}</span> جنيه · <span className="text-muted">{when(item.occurred_at)}</span></p>
      <p className="text-sm font-medium">تسجله في أنهي فئة؟</p>
      <CategoryPicker categories={data.categories} value={categoryId} onChange={setCategoryId} />
      <div className="flex gap-2">
        <Button type="button" className="flex-1" disabled={busy || !categoryId} onClick={() => save.mutate(item.id)}>سجّل</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { if (window.confirm("تجاهل هذا المصروف؟ لن يُسجّل.")) skip.mutate(item.id); }}>تجاهل</Button>
      </div>
    </section>
  );
}
