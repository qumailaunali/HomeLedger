import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getLedgerPage } from "@/server/queries/ledger";
import { getActiveMembers, getShoppingBudget } from "@/server/queries/summary";
import { ledgerQueryFromParams } from "@/server/ledger-params";
import type { SearchParams } from "@/server/params";
import { todayIso } from "@/lib/dates";
import { RecordsView, TypePageIcon } from "@/components/ledger/records-view";
import { ShoppingBudgets } from "./shopping-budgets";

export const metadata: Metadata = { title: "Shopping" };

export default async function ShoppingPage({ searchParams }: { searchParams: SearchParams }) {
  const { household } = await requireHousehold();
  const query = ledgerQueryFromParams(await searchParams, todayIso(household.timezone), "SHOPPING", "year");
  const [page, members, budget] = await Promise.all([
    getLedgerPage(household, query.filters),
    getActiveMembers(household.id, query.year),
    getShoppingBudget(household.id, query.year),
  ]);

  return (
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
      <ShoppingBudgets lines={budget.lines} totals={budget.totals} year={query.year} />
    </RecordsView>
  );
}
