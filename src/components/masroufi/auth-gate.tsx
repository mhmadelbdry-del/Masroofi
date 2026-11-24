import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isUnauthorized } from "@/lib/utils";
import { useSnapshot } from "@/lib/masroufi/hooks";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useStartupAnimation } from "./startup-loading";
import { AnimatedSplashIcon } from "./animated-splash-icon";

export function Splash({ label = "جاري التحميل…" }: { label?: string }) {
  const startup = useStartupAnimation();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <AnimatedSplashIcon onComplete={startup.finish} alreadyComplete={startup.complete} />
      <p className="mt-2 text-2xl font-semibold" style={{ fontFamily: "Aref Ruqaa, serif" }}>
        ﴿ وَكَفَىٰ بِٱللَّهِ حَسِیبࣰا ﴾
      </p>
      <p className="text-base font-medium" style={{ fontFamily: "Aref Ruqaa, serif" }}>
        التطبيق بواسطة م محمد البدري
      </p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const startup = useStartupAnimation();
  const snapshot = useSnapshot({ enabled: !!user && !isPending });
  if (isPending || !startup.complete || (!!user && snapshot.isPending)) return <Splash label={isPending ? "جاري التحميل…" : "نجهّز دفتر البيت…"} />;
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}

export function HouseholdGate({ children }: { children: ReactNode }) {
  const { data, isPending, error } = useSnapshot();
  if (isPending) return <Splash label="نجهّز دفتر البيت…" />;
  if (error && isUnauthorized(error)) return <RedirectToSignIn />;
  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-fg">تعذر تحميل البيانات</p>
        <p className="text-sm text-muted">{error.message}</p>
      </div>
    );
  }
  if (!data?.household) return <Navigate to="/onboarding" />;
  return <>{children}</>;
}
