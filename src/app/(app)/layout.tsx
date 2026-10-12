import { requireHousehold } from "@/server/auth";
import { getBalanceCents, getHomeBudget, getShoppingBudget } from "@/server/queries/summary";
import { todayIso } from "@/lib/dates";
import { AppShell } from "@/components/app/app-shell";

/**
 * Authenticated area. Loads what every page needs (balance, categories and
 * members for quick entry) once, here, instead of in each page.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, household } = await requireHousehold();
  const today = todayIso(household.timezone);
  const [year, month] = today.split("-").map(Number);

  const [balanceCents, home, shopping] = await Promise.all([
    getBalanceCents(household),
    getHomeBudget(household.id, year, month),
    getShoppingBudget(household.id, year),
  ]);

  return (
    <AppShell
      prefs={{
        name: household.name,
        currency: household.currency,
        currencySymbol: household.currencySymbol,
        dateFormat: household.dateFormat,
        timezone: household.timezone,
        today,
      }}
      categories={home.lines.map((l) => ({ id: l.id, name: l.name, expectedCents: l.budgetCents, spentCents: l.spentCents }))}
      members={shopping.lines.map((l) => ({ id: l.id, name: l.name, budgetCents: l.budgetCents, spentCents: l.spentCents }))}
      balanceCents={balanceCents}
      user={{ name: user.name, email: user.email }}
    >
      {children}
    </AppShell>
  );
}
