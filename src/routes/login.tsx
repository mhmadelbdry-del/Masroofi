import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/masroufi/logo";
import { Splash } from "@/components/masroufi/auth-gate";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) return <Splash />;
  if (user) return <Navigate to="/" />;

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({ email, password, name: name || "مستخدم" });
        if (err) throw new Error(err.message ?? "تعذر إنشاء الحساب");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message ?? "بيانات الدخول غير صحيحة");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <Logo size="lg" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">مصروفي</h1>
        <p className="mt-2 text-muted">دفتر البيت — مصروفكما في مكان واحد، يتزامن بين الجوالين.</p>
      </div>

      <div className="paper-card rounded-xl p-5">
        {authEnabled ? (
          <div className="space-y-3">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                متابعة عبر {p.label === "Google" ? "جوجل" : "X"}
              </Button>
            ))}
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-subtle">أو بالبريد</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-bg-warm p-1">
              <button
                type="button"
                className={`h-9 rounded-sm text-sm font-medium ${mode === "in" ? "bg-surface text-fg shadow-card" : "text-muted"}`}
                onClick={() => setMode("in")}
              >
                دخول
              </button>
              <button
                type="button"
                className={`h-9 rounded-sm text-sm font-medium ${mode === "up" ? "bg-surface text-fg shadow-card" : "text-muted"}`}
                onClick={() => setMode("up")}
              >
                حساب جديد
              </button>
            </div>
            <form className="space-y-3" onSubmit={onEmail}>
              {mode === "up" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name">الاسم</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="محمد" />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "لحظة…" : mode === "up" ? "إنشاء الحساب" : "دخول"}
              </Button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted">تسجيل الدخول غير مفعّل حالياً.</p>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        بعد الدخول يمكنك إنشاء بيت جديد أو الانضمام برمز الشريك.
      </p>
    </main>
  );
}
