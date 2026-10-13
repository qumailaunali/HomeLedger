import { Suspense } from "react";
import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getLedgerPage } from "@/server/queries/ledger";
import { getActiveMembers, getPeriodTotals, getPotBalances, getShoppingBudget } from "@/server/queries/summary";
import { ledgerQueryFromParams } from "@/server/ledger-params";
import type { SearchParams } from "@/server/params";
import { todayIso, yearRange } from "@/lib/dates";
import { RecordsView, TypePageIcon } from "@/components/ledger/records-view";
import { ShoppingBudgets } from "./shopping-budgets";

export const metadata: Metadata = { title: "Shopping" };

export default async function ShoppingPage({ searchParams }: { searchParams: SearchParams }) {
  const { household } = await requireHousehold();
  const query = ledgerQueryFromParams(await searchParams, todayIso(household.timezone), "SHOPPING", "year");
  const [page, members, budget, pots, yearTotals] = await Promise.all([
    getLedgerPage(household, query.filters),
    getActiveMembers(household.id, query.year),
    getShoppingBudget(household.id, query.year),
    getPotBalances(household),
    getPeriodTotals(household.id, yearRange(query.year)),
  ]);

  return (
    <Suspense fallback={<div className="animate-pulse rounded-2xl bg-muted/50 h-96" />}>
      <RecordsView
        title="Shopping"
        description="Yearly shopping budgets for each family member."
        icon={<TypePageIcon type="SHOPPING" />}
        variant="SHOPPING"
        page={page}
        query={query}
        categories={[]}
        members={members}
      >
        <ShoppingBudgets
          lines={budget.lines}
          totals={budget.totals}
          year={query.year}
          balanceCents={pots.SHOPPING}
          yearSpentCents={yearTotals.shoppingCents}
        />
      </RecordsView>
    </Suspense>
  );
}
