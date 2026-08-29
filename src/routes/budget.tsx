import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/masroufi/app-shell";
import { AuthGate, HouseholdGate } from "@/components/masroufi/auth-gate";
import { BudgetView } from "@/components/masroufi/budget-view";

export const Route = createFileRoute("/budget")({ component: BudgetPage });

function BudgetPage() {
  return (
    <AuthGate>
      <HouseholdGate>
        <AppShell>
          <BudgetView />
        </AppShell>
      </HouseholdGate>
    </AuthGate>
  );
}
