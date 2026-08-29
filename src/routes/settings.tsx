import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/masroufi/app-shell";
import { AuthGate, HouseholdGate } from "@/components/masroufi/auth-gate";
import { SettingsView } from "@/components/masroufi/settings-view";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <AuthGate>
      <HouseholdGate>
        <AppShell>
          <SettingsView />
        </AppShell>
      </HouseholdGate>
    </AuthGate>
  );
}
