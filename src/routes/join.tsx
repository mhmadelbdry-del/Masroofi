import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthGate, Splash } from "@/components/masroufi/auth-gate";
import { Logo } from "@/components/masroufi/logo";
import { MemberDot } from "@/components/masroufi/member-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useJoinLookup, useMasroufiMutations, useSnapshot } from "@/lib/masroufi/hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/join")({ component: JoinPage });

function JoinPage() {
  return (
    <AuthGate>
      <JoinForm />
    </AuthGate>
  );
}

function JoinForm() {
  const user = useCurrentUser();
  const { data, isPending } = useSnapshot();
  const nav = useNavigate();
  const mut = useMasroufiMutations();
  const [code, setCode] = useState("");
  const [memberId, setMemberId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const lookup = useJoinLookup(code);

  if (isPending) return <Splash />;
  if (data?.household) return <Navigate to="/" />;

  const members = lookup.data?.found ? lookup.data.members : [];
  const waiting = Boolean(data?.pendingJoinRequest) || submitted;

  if (waiting) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 text-center">
        <Logo withWord />
        <h1 className="mt-5 text-2xl font-semibold">طلبك قيد المراجعة</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          تم إرسال طلب الانضمام إلى صاحب الأسرة. سيختار طريقة التعامل مع بياناتك القديمة ثم يوافق على انضمامك.
        </p>
        <Button className="mt-6 w-full" onClick={() => void nav({ to: "/settings" })}>
          العودة إلى الضبط
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <Logo withWord />
      <h1 className="mt-5 text-2xl font-semibold">الانضمام لدفتر البيت</h1>
      <p className="mt-2 mb-5 text-sm text-muted">أدخل الرمز الذي وصلك، ثم اختر اسمك.</p>
      <form
        className="paper-card space-y-4 rounded-xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!memberId) return;
          try {
            await mut.join.mutateAsync({
              code,
              memberId,
              requesterName: user?.displayName ?? user?.primaryEmail ?? "شريك",
            });
            setSubmitted(true);
          } catch {
            /* toast from mutation */
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="code">رمز الانضمام</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setMemberId("");
            }}
            placeholder="K7M2QX"
            dir="ltr"
            className="text-center tracking-widest"
          />
        </div>
        {lookup.data?.found === false && code.trim().length >= 4 ? (
          <p className="text-sm text-danger">لا بيت بهذا الرمز.</p>
        ) : null}
        {members.length > 0 ? (
          <div className="space-y-2">
            <Label>من أنت؟</Label>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={m.claimed}
                onClick={() => setMemberId(m.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-3",
                  memberId === m.id ? "bg-primary text-primary-fg" : "bg-bg-warm",
                  m.claimed && "opacity-50",
                )}
              >
                <span className="flex items-center gap-2">
                  <MemberDot name={m.name} size="sm" active={memberId === m.id} />
                  {m.name}
                </span>
                {m.claimed ? <span className="text-xs">مرتبط بحساب</span> : null}
              </button>
            ))}
          </div>
        ) : null}
        <Button type="submit" className="w-full" disabled={!memberId || mut.join.isPending}>
          {mut.join.isPending ? "جارٍ إرسال الطلب…" : "إرسال طلب الانضمام"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        لا رمز لديك؟{" "}
        <Link to="/onboarding" className="font-medium text-primary">
          أنشئ بيتاً جديداً
        </Link>
      </p>
    </main>
  );
}
