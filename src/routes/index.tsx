import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/masroufi/app-shell";
import { AuthGate, HouseholdGate } from "@/components/masroufi/auth-gate";
import { SummaryView } from "@/components/masroufi/summary-view";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AuthGate>
      <HouseholdGate>
        <AppShell>
          <SummaryView />
        </AppShell>
      </HouseholdGate>
    </AuthGate>
  );
}
