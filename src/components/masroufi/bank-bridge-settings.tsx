import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createBridgeDevice, listBridgeDevices, revokeBridgeDevice } from "@/lib/masroufi/bank-bridge-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : "لم يُستخدم بعد");

/**
 * Enrolls a MacroDroid device. The one-time key is shown only here, to the signed-in user, kept in component state
 * (never stored, logged or put in a URL) and dropped when dismissed or when the page unmounts.
 */
export function BankBridgeSettings() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState<{ id: string; token: string } | null>(null);
  const endpoint = typeof window === "undefined" ? "" : `${window.location.origin}/api/bank-bridge`;
  const devices = useQuery({ queryKey: ["bridge-devices"], queryFn: () => listBridgeDevices() });
  const create = useMutation({
    mutationFn: () => createBridgeDevice({ data: { label: label.trim() } }),
    onSuccess: (r) => { setSecret(r); setLabel(""); void qc.invalidateQueries({ queryKey: ["bridge-devices"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إنشاء المفتاح"),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeBridgeDevice({ data: { id } }),
    onSuccess: () => { toast.success("تم إلغاء المفتاح"); void qc.invalidateQueries({ queryKey: ["bridge-devices"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إلغاء المفتاح"),
  });
  async function copy(text: string, ok: string) {
    try { await navigator.clipboard.writeText(text); toast.success(ok); } catch { toast.error("تعذر النسخ، حدد النص يدوياً"); }
  }
  const live = (devices.data ?? []).filter((d) => !d.revoked_at);
  return (
    <section className="paper-card space-y-3 rounded-lg p-4" aria-label="ربط MacroDroid">
      <h2 className="flex items-center gap-2 font-semibold"><KeyRound className="size-4" aria-hidden />ربط إشعارات البنك عبر MacroDroid</h2>
      <p className="text-sm leading-6 text-muted">
        بديل لا يحتاج إذن الإشعارات داخل تطبيقك. MacroDroid يستخرج المبلغ على الموبايل ويرسل المبلغ ووقت الإشعار فقط، بدون نص الرسالة أو الرصيد. بعدها يسألك التطبيق: تسجله في أنهي فئة؟ MacroDroid نفسه يحتاج إذن الوصول للإشعارات. كل جهاز له مفتاح مستقل يمكن إلغاؤه في أي وقت.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="bridge-endpoint">عنوان الاستقبال</Label>
        <div className="flex items-center gap-2">
          <div id="bridge-endpoint" dir="ltr" className="num min-w-0 flex-1 break-all rounded-md bg-bg-warm px-3 py-2 text-xs">{endpoint}</div>
          <Button type="button" variant="outline" size="icon" aria-label="نسخ العنوان" onClick={() => void copy(endpoint, "تم نسخ العنوان")}><Copy className="size-4" /></Button>
        </div>
      </div>
      {secret ? (
        <div role="alert" className="space-y-2 rounded-md border-2 border-primary/40 bg-primary-soft p-3">
          <p className="text-sm font-semibold">المفتاح يظهر مرة واحدة فقط</p>
          <div className="flex items-center gap-2">
            <div dir="ltr" className="num min-w-0 flex-1 select-all break-all rounded-md bg-surface px-3 py-2 text-xs">{secret.token}</div>
            <Button type="button" variant="outline" size="icon" aria-label="نسخ المفتاح" onClick={() => void copy(secret.token, "تم نسخ المفتاح")}><Copy className="size-4" /></Button>
          </div>
          <p className="text-xs leading-5">الصقه داخل MacroDroid على نفس الموبايل فقط (Authorization: Bearer ثم المفتاح). لا ترسله في أي محادثة ولا لأي برنامج ذكاء اصطناعي. لو ضاع، ألغِه وأنشئ مفتاحاً جديداً.</p>
          <Button type="button" size="sm" onClick={() => setSecret(null)}>تم اللصق، أخفِ المفتاح</Button>
        </div>
      ) : (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (label.trim()) create.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="bridge-label">اسم الجهاز</Label>
            <Input id="bridge-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder="مثال: موبايل محمد" />
          </div>
          <Button type="submit" disabled={create.isPending || !label.trim() || live.length >= 5}>إنشاء مفتاح جهاز</Button>
        </form>
      )}
      <ul className="space-y-2" aria-label="الأجهزة المرتبطة">
        {(devices.data ?? []).map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
            <span className="min-w-0"><span className="block truncate font-medium">{d.label}</span><span className="block text-xs text-muted">{d.revoked_at ? "ملغي" : `آخر استخدام: ${fmt(d.last_used_at)}`}</span></span>
            {d.revoked_at ? null : <Button type="button" variant="outline" size="sm" disabled={revoke.isPending} onClick={() => { if (window.confirm("إلغاء هذا المفتاح؟ سيتوقف الجهاز فوراً.")) revoke.mutate(d.id); }}><Trash2 className="size-4" aria-hidden />إلغاء</Button>}
          </li>
        ))}
        {devices.data && devices.data.length === 0 ? <li className="text-sm text-muted">لا توجد أجهزة مرتبطة.</li> : null}
      </ul>
    </section>
  );
}
