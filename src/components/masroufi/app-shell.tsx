import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { ClipboardList, LayoutGrid, Receipt, Scale, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSnapshot } from "@/lib/masroufi/hooks";
import { initializePushNotifications } from "@/lib/masroufi/push-client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { bankSmsSupported, syncBankSms } from "@/lib/masroufi/bank-sms";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logo } from "./logo";
import { MemberDot } from "./member-dot";
import { useTheme } from "./theme";

const TABS = [
  { to: "/", label: "ملخص الشهر", icon: LayoutGrid },
  { to: "/expenses", label: "المصروفات", icon: Receipt },
  { to: "/budget", label: "حدود الميزانية", icon: Scale },
  { to: "/home-requests", label: "طلبات المنزل", icon: ClipboardList },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useSnapshot();
  const me = data?.me;
  const user = useCurrentUser();
  const qc = useQueryClient();
  const ownerKey =
    user && data?.household && me
      ? JSON.stringify([user.id, data.household.id, me.memberId])
      : null;
  useEffect(() => {
    if (!ownerKey || !bankSmsSupported()) return;
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      void syncBankSms(ownerKey)
        .then((count) => {
          if (count) {
            void qc.invalidateQueries({ queryKey: ["snapshot"] });
            toast.success(`تمت مزامنة ${count} عملية بنكية`);
          }
        })
        .catch(() =>
          toast.error(
            "تعذرت مزامنة عمليات البنك. العمليات محفوظة على الجهاز، راجع إعدادات رسائل البنك",
          ),
        );
    };
    sync();
    const localQueueCheck = window.setInterval(sync, 30000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(localQueueCheck);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, [ownerKey, qc]);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!me || !data?.members.length) return;
    try {
      if (!window.localStorage.getItem("masroofi-theme")) {
        setTheme(me.memberId === data.members[0]?.id ? "teal" : "pink");
      }
    } catch {
      setTheme(me.memberId === data.members[0]?.id ? "teal" : "pink");
    }
  }, [data?.members, me, setTheme]);

  useEffect(() => {
    void initializePushNotifications().catch(() => {
      /* Push service is optional; SMS settings remain usable. */
    });
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/70 bg-bg/90 px-4 py-3 backdrop-blur-md">
        <Logo withWord size="sm" />
        <div className="flex items-center gap-1.5">
          {me ? (
            <span className="flex items-center gap-2 rounded-full bg-surface py-1 pr-1 pl-3 shadow-card">
              <span className="text-xs font-medium text-muted">{me.name}</span>
              <MemberDot name={me.name} size="sm" active />
            </span>
          ) : null}
          <Link
            to="/settings"
            className={cn(
              "grid size-11 place-items-center rounded-full text-muted hover:bg-bg-warm",
              pathname === "/settings" && "bg-primary-soft text-primary",
            )}
            aria-label="الإعدادات"
          >
            <Settings className="size-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-32">{children}</main>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex w-full max-w-md items-center justify-around rounded-xl bg-surface px-2 py-2 shadow-nav">
          {TABS.map((tab) => {
            const active = pathname === tab.to;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex min-h-11 min-w-20 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors duration-150",
                  active ? "bg-primary-soft text-primary" : "text-subtle hover:text-fg",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
