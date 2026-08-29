import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/masroufi/app-shell";
import { AuthGate, HouseholdGate } from "@/components/masroufi/auth-gate";
import { ExpensesView } from "@/components/masroufi/expenses-view";

export const Route = createFileRoute("/expenses")({ component: ExpensesPage });

function ExpensesPage() {
  return (
    <AuthGate>
      <HouseholdGate>
        <AppShell>
          <ExpensesView />
        </AppShell>
      </HouseholdGate>
    </AuthGate>
  );
}
