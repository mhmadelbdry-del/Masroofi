import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/masroufi/logo";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPassword });

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: err } = await authClient.requestPasswordReset({ email, redirectTo });
      if (err) throw new Error(err.message ?? "تعذر إرسال رابط الاستعادة");
      setMessage("إذا كان البريد مسجّلًا، فسيصلك رابط لإعادة ضبط كلمة المرور.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إرسال رابط الاستعادة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center"><Logo size="lg" /></div>
        <h1 className="text-3xl font-semibold tracking-tight">استعادة كلمة المرور</h1>
        <p className="mt-2 text-sm text-muted">اكتب بريدك الإلكتروني وسنرسل لك رابطًا آمنًا.</p>
      </div>
      <form className="paper-card space-y-4 rounded-xl p-5" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">البريد الإلكتروني</Label>
          <Input id="forgot-email" type="email" dir="ltr" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "جارٍ الإرسال…" : "إرسال رابط الاستعادة"}
        </Button>
        <Link to="/login" className="block text-center text-sm font-medium text-primary hover:underline">
          العودة إلى تسجيل الدخول
        </Link>
      </form>
    </main>
  );
}
