import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/masroufi/app-shell";
import { AuthGate, HouseholdGate } from "@/components/masroufi/auth-gate";
import { HomeRequestsView } from "@/components/masroufi/home-requests-view";

export const Route = createFileRoute("/home-requests")({ component: HomeRequestsPage });

function HomeRequestsPage() {
  return (
    <AuthGate>
      <HouseholdGate>
        <AppShell>
          <HomeRequestsView />
        </AppShell>
      </HouseholdGate>
    </AuthGate>
  );
}
