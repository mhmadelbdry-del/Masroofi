import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/masroufi/logo";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setError("رابط الاستعادة غير صالح أو منتهي الصلاحية");
      return;
    }
    if (password.length < 8) {
      setError("يجب أن تتكون كلمة المرور من 8 أحرف على الأقل");
      return;
    }
    if (password !== confirmation) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await authClient.resetPassword({ newPassword: password, token });
      if (err) throw new Error(err.message ?? "تعذر تغيير كلمة المرور");
      window.location.href = "/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تغيير كلمة المرور");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center"><Logo size="lg" /></div>
        <h1 className="text-3xl font-semibold tracking-tight">تعيين كلمة مرور جديدة</h1>
        <p className="mt-2 text-sm text-muted">اختر كلمة مرور جديدة لحماية حسابك.</p>
      </div>
      <form className="paper-card space-y-4 rounded-xl p-5" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">كلمة المرور الجديدة</Label>
          <Input id="reset-password" type="password" dir="ltr" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirmation">تأكيد كلمة المرور</Label>
          <Input id="reset-confirmation" type="password" dir="ltr" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور الجديدة"}
        </Button>
        <Link to="/login" className="block text-center text-sm font-medium text-primary hover:underline">
          العودة إلى تسجيل الدخول
        </Link>
      </form>
    </main>
  );
}
