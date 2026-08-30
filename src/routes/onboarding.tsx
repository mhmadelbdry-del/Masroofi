import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthGate, Splash } from "@/components/masroufi/auth-gate";
import { Logo } from "@/components/masroufi/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMasroufiMutations, useSnapshot } from "@/lib/masroufi/hooks";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

function OnboardingPage() {
  return (
    <AuthGate>
      <OnboardingForm />
    </AuthGate>
  );
}

function OnboardingForm() {
  const { data, isPending } = useSnapshot();
  const nav = useNavigate();
  const mut = useMasroufiMutations();
  const [selfName, setSelfName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [income, setIncome] = useState("");
  const [goal, setGoal] = useState("");

  if (isPending) return <Splash />;
  if (data?.household) return <Navigate to="/" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6">
        <Logo withWord />
        <h1 className="mt-5 text-2xl font-semibold">إعداد الأسرة</h1>
        <p className="mt-2 text-sm text-muted">
          أدخل الراتب الحالي والمبلغ الذي تريد توفيره شهريًا، ليحسب التطبيق ميزانية البيت بوضوح.
        </p>
      </div>
      <Link
        to="/join"
        className="mb-4 block rounded-xl border-2 border-primary bg-primary/10 p-4 text-center font-semibold text-primary"
      >
        لدي كود من شريكي — الانضمام إلى بيت موجود
      </Link>
      <form
        className="paper-card space-y-3 rounded-xl p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await mut.create.mutateAsync({
              selfName: selfName.trim(),
              partnerName: partnerName.trim(),
              monthlyIncome: Number(income) || 0,
              savingsGoal: Number(goal) || 0,
            });
            await nav({ to: "/" });
          } catch {
            /* toast from mutation */
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="self">اسمك</Label>
          <Input id="self" value={selfName} onChange={(e) => setSelfName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="partner">اسم زوجتك / زوجك</Label>
          <Input id="partner" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="income">الراتب الشهري الحالي</Label>
          <Input id="income" type="number" min="0" value={income} onChange={(e) => setIncome(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal">المبلغ المراد توفيره شهريًا</Label>
          <Input id="goal" type="number" min="0" value={goal} onChange={(e) => setGoal(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={mut.create.isPending}>
          {mut.create.isPending ? "نجهّز الدفتر…" : "ابدأ مصروفي"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        شريكك أنشأ البيت مسبقاً؟{" "}
        <Link to="/join" className="font-medium text-primary">
          أدخل رمز الانضمام
        </Link>
      </p>
    </main>
  );
}
