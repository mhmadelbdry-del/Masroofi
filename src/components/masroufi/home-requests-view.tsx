import { useMemo, useState } from "react";
import { Check, Circle, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMasroufiMutations, useSnapshot } from "@/lib/masroufi/hooks";
import type { HomeRequest } from "@/lib/masroufi/types";
import { cn } from "@/lib/utils";

function RequestRow({
  request,
  pending,
  onToggle,
  onRemove,
}: {
  request: HomeRequest;
  pending: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <article
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/70 bg-surface p-3 shadow-card transition-opacity",
        request.completed && "opacity-65",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-label={request.completed ? "إعادة الطلب إلى القائمة" : "تعليم الطلب كمكتمل"}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary transition-colors hover:bg-primary hover:text-primary-fg disabled:opacity-50"
      >
        {request.completed ? <Check className="size-5" strokeWidth={2.5} /> : <Circle className="size-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", request.completed && "text-muted line-through")}>{request.title}</p>
        <p className="mt-1 text-xs text-muted">
          الكمية: {request.quantity} · أضافه {request.createdByName}
          {request.completed && request.completedByName ? ` · أكمله ${request.completedByName}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        aria-label="حذف الطلب"
        className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
    </article>
  );
}

export function HomeRequestsView() {
  const { data } = useSnapshot();
  const mut = useMasroufiMutations();
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("1");

  const requests = useMemo(() => data?.homeRequests ?? [], [data?.homeRequests]);
  const pendingRequests = requests.filter((request) => !request.completed);
  const completedRequests = requests.filter((request) => request.completed);

  if (!data?.household || !data.me) return null;

  const addRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanQuantity = quantity.trim() || "1";
    if (!cleanTitle) return;
    mut.homeRequestAdd.mutate(
      { title: cleanTitle, quantity: cleanQuantity },
      {
        onSuccess: () => {
          setTitle("");
          setQuantity("1");
        },
      },
    );
  };

  const renderRequest = (request: HomeRequest) => (
    <RequestRow
      key={request.id}
      request={request}
      pending={mut.homeRequestToggle.isPending || mut.homeRequestRemove.isPending}
      onToggle={() => mut.homeRequestToggle.mutate({ id: request.id, completed: !request.completed })}
      onRemove={() => mut.homeRequestRemove.mutate(request.id)}
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <ShoppingBasket className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">طلبات المنزل</h1>
          <p className="mt-1 text-sm text-muted">قائمة مشتركة بينك وبين شريكك، تتحدّث تلقائيًا على الجهازين.</p>
        </div>
      </div>

      <form className="paper-card space-y-3 rounded-lg p-4" onSubmit={addRequest}>
        <div className="flex items-center gap-2">
          <Plus className="size-4 text-primary" />
          <h2 className="font-semibold">إضافة طلب جديد</h2>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="request-title">اسم الطلب</Label>
          <Input
            id="request-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="مثال: حليب، مناديل، خبز"
            maxLength={120}
            required
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="request-quantity">الكمية</Label>
            <Input
              id="request-quantity"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="1"
              maxLength={40}
            />
          </div>
          <Button type="submit" disabled={mut.homeRequestAdd.isPending}>
            {mut.homeRequestAdd.isPending ? "جارٍ الإضافة…" : "أضف الطلب"}
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">قائمة الشراء</h2>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
            {pendingRequests.length} متبقٍ
          </span>
        </div>
        {pendingRequests.length === 0 ? (
          <div className="paper-card rounded-lg p-8 text-center">
            <ShoppingBasket className="mx-auto size-8 text-primary/60" />
            <p className="mt-3 text-sm text-muted">لا توجد طلبات حاليًا. أضف أول طلب للبيت.</p>
          </div>
        ) : (
          pendingRequests.map(renderRequest)
        )}
      </section>

      {completedRequests.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted">تم شراؤها ({completedRequests.length})</h2>
          {completedRequests.map(renderRequest)}
        </section>
      ) : null}
    </div>
  );
}
