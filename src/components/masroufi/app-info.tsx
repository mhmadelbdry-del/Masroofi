import { APP_CREDIT, APP_EMAIL, APP_VERSION } from "@/lib/app-version";

export function AppInfo() {
  return (
    <footer className="space-y-1 pt-2 pb-4 text-center text-xs text-muted" aria-label="معلومات التطبيق">
      <p>الإصدار <span dir="ltr" className="num">{APP_VERSION}</span></p>
      <p dir="ltr">{APP_CREDIT}</p>
      <p dir="ltr">{APP_EMAIL}</p>
    </footer>
  );
}
