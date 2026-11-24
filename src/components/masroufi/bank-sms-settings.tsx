import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BankSms,
  bankSmsSupported,
  syncBankSms,
  type BankSmsEntry,
  type BankSmsStatus,
} from "@/lib/masroufi/bank-sms";
import type { Category } from "@/lib/masroufi/types";
import { importBankExpense } from "@/lib/masroufi/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BankSmsSettings({
  ownerKey,
  categories,
  onSynced,
}: {
  ownerKey: string;
  categories: Category[];
  onSynced: () => unknown;
}) {
  const [supported, setSupported] = useState(false);
  const [reviews, setReviews] = useState<BankSmsEntry[]>([]);
  const [status, setStatus] = useState<BankSmsStatus>({});
  const [senders, setSenders] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function reload() {
    const next = await BankSms.getStatus();
    setStatus(next);
    setReviews([]);
    if (next.ownerKey === ownerKey) {
      const pending = await BankSms.getPending({ ownerKey });
      setReviews(pending.entries.filter((e) => e.review));
      setSenders(next.senders?.join(", ") ?? "");
      setCategoryId(next.categoryId ?? "");
    }
  }
  useEffect(() => {
    const available = bankSmsSupported();
    setSupported(available);
    if (available) void reload().catch(() => setError("تعذر قراءة إعدادات الرسائل"));
  }, [ownerKey]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر إتمام العملية");
    } finally {
      setBusy(false);
    }
  }
  const sameOwner = !status.ownerKey || status.ownerKey === ownerKey;
  return (
    <section className="paper-card space-y-3 rounded-lg p-4" aria-label="رسائل البنك أو المحفظة">
      <h2 className="font-semibold">تسجيل مصروفات البنك أو المحفظة تلقائياً</h2>
      <p className="text-sm leading-6 text-muted">
        للرسائل الجديدة من المرسلين الذين تختارهم، بالجنيه المصري فقط. نتجاهل أكواد التحقق
        والإيداعات والتحويلات والسحب وشحن المحفظة. الرسائل التي تشير لمصروف ولا نفهم مبلغها تبقى
        للمراجعة محلياً. لا نقرأ سجل رسائلك القديم.
      </p>
      {!supported ? (
        <p className="rounded-md bg-primary-soft p-3 text-sm text-primary">
          متاح في نسخة أندرويد التي تتضمن إضافة رسائل البنك أو المحفظة، وليس في المتصفح أو الآيفون.
        </p>
      ) : (
        <>
          <p role="status" className="text-sm">
            الحالة: {status.enabled ? (status.granted ? "مفعّل" : "إذن الرسائل غير متاح") : "متوقف"}{" "}
            · عمليات تنتظر المزامنة: {status.pending ?? 0}
          </p>
          {status.storageWarning ? (
            <p role="alert" className="text-sm text-red-600">
              تعذر حفظ بعض العمليات أو امتلأ طابور الجهاز. راجع مصروفاتك يدوياً. لا يتم حذف العمليات
              القديمة تلقائياً.
            </p>
          ) : null}
          {!sameOwner ? (
            <p role="alert" className="text-sm text-red-600">
              الإعدادات مرتبطة بحساب أو أسرة أخرى. ارجع للحساب السابق لمزامنة العمليات، أو أوقف
              الميزة وامسح الطابور قبل إعادة تفعيلها هنا.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="bank-senders">اسم مرسل البنك أو المحفظة كما يظهر في الرسالة</Label>
                <Input
                  id="bank-senders"
                  value={senders}
                  onChange={(e) => setSenders(e.target.value)}
                  placeholder="اسم المرسل بالضبط، وافصل بين الأسماء بفاصلة"
                />
                <p className="text-xs text-muted">
                  قائمة محددة، بدون نجمة أو مطابقة جزئية. اسم المرسل وحده ليس ضماناً لأصالة الرسالة.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-category">فئة المصروفات التلقائية</Label>
                <select
                  id="bank-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-surface px-3"
                >
                  <option value="">اختر الفئة</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-start gap-2 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 size-4"
                />
                <span>
                  أوافق على معالجة الرسائل الجديدة محلياً وتسجيل العمليات المفهومة تلقائياً في الفئة
                  المختارة. عند فتح التطبيق تُرسل قيمة العملية وتاريخها والفئة ومعرّف منع التكرار
                  إلى دفتر الأسرة، فتظهر لأعضاء الأسرة. لا يُرسل نص الرسالة أو بيانات البطاقة.
                </span>
              </label>
              <Button
                className="w-full"
                disabled={busy || !consent || !categoryId || !senders.trim()}
                onClick={() =>
                  void run(async () => {
                    const list = [
                      ...new Set(
                        senders
                          .split(/[,،\n]/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      ),
                    ];
                    if (
                      !list.length ||
                      list.length > 20 ||
                      list.some((s) => s.length > 40 || s.includes("*"))
                    )
                      throw new Error("أدخل أسماء مرسلين محددة وصحيحة");
                    if (!(await BankSms.requestAccess()).granted)
                      throw new Error(
                        "لم يتم منح إذن استقبال الرسائل. يمكنك منحه من إعدادات أندرويد",
                      );
                    await BankSms.configure({ ownerKey, senders: list, categoryId });
                    await BankSms.requestNotifications();
                    toast.success("تم تفعيل حفظ العمليات على الجهاز");
                  })
                }
              >
                {busy ? "جارٍ التنفيذ…" : "تفعيل / حفظ الإعدادات"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={busy || !status.enabled}
                onClick={() =>
                  void run(async () => {
                    const count = await syncBankSms(ownerKey);
                    onSynced();
                    toast.success(`تمت مزامنة ${count} عملية`);
                  })
                }
              >
                مزامنة العمليات الآن
              </Button>
            </>
          )}
          {status.enabled || status.pending ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "إيقاف الميزة وحذف العمليات غير المتزامنة من الجهاز؟ المصروفات المسجلة في الدفتر لن تُحذف.",
                  )
                )
                  void run(() => BankSms.disable());
              }}
            >
              إيقاف الميزة ومسح الطابور المحلي
            </Button>
          ) : null}
          {sameOwner && reviews.length ? (
            <div className="space-y-3 border-t border-border pt-3">
              <h3 className="font-semibold">عمليات تحتاج مراجعة ({reviews.length})</h3>
              <p className="text-xs text-muted">
                لم نسجّل هذه العمليات. راجع الرسالة الأصلية على هاتفك وأدخل مبلغ المصروف بالجنيه، أو
                تجاهلها. الأرقام مخفية في المعاينة المحلية ولا تُرسل للخادم.
              </p>
              {reviews.map((entry) => (
                <ReviewEntry
                  key={entry.id}
                  entry={entry}
                  categories={categories}
                  busy={busy}
                  onSave={(amount, categoryId) =>
                    void run(async () => {
                      await importBankExpense({
                        data: {
                          key: entry.id,
                          amount,
                          categoryId,
                          occurredAt: entry.occurredAt,
                          ownerKey,
                        },
                      });
                      await BankSms.acknowledge({ ownerKey, id: entry.id });
                      onSynced();
                    })
                  }
                  onDiscard={() => void run(() => BankSms.acknowledge({ ownerKey, id: entry.id }))}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
      <p className="text-xs leading-5 text-muted">
        تُحفظ العمليات على الجهاز في الخلفية وتُزامن عند فتح التطبيق أو الرجوع إليه. الإشعار اختياري
        ولا يعرض المبلغ. الإيقاف الإجباري أو قيود الجهاز قد تمنع الاستقبال. راجع المصروفات، فالقراءة
        التلقائية قد تخطئ.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ReviewEntry({
  entry,
  categories,
  busy,
  onSave,
  onDiscard,
}: {
  entry: BankSmsEntry;
  categories: Category[];
  busy: boolean;
  onSave: (amount: number, categoryId: string) => void;
  onDiscard: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(entry.categoryId);
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs text-muted">{new Date(entry.occurredAt).toLocaleDateString("ar-EG")}</p>
      <p className="break-words text-sm leading-6">{entry.preview}</p>
      <Input
        aria-label="مبلغ العملية للمراجعة بالجنيه"
        type="number"
        min="0.01"
        max="1000000"
        step="0.01"
        placeholder="مبلغ المصروف بالجنيه"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <select
        aria-label="فئة العملية للمراجعة"
        className="h-11 w-full rounded-md border border-border bg-surface px-3"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={
            busy ||
            !categoryId ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) <= 0 ||
            Number(amount) > 1000000
          }
          onClick={() => onSave(Number(amount), categoryId)}
        >
          تسجيل كمصروف
        </Button>
        <Button disabled={busy} variant="outline" onClick={onDiscard}>
          تجاهل
        </Button>
      </div>
    </div>
  );
}
