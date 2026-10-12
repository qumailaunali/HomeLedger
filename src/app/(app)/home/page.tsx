import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getLedgerPage } from "@/server/queries/ledger";
import { getActiveCategories, getHomeBudget } from "@/server/queries/summary";
import { ledgerQueryFromParams } from "@/server/ledger-params";
import type { SearchParams } from "@/server/params";
import { todayIso } from "@/lib/dates";
import { RecordsView, TypePageIcon } from "@/components/ledger/records-view";
import { HomeBudgetGrid } from "./home-budget-grid";

export const metadata: Metadata = { title: "Home Expenses" };

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { household } = await requireHousehold();
  const query = ledgerQueryFromParams(await searchParams, todayIso(household.timezone), "HOME");
  const [page, categories, budget] = await Promise.all([
    getLedgerPage(household, query.filters),
    getActiveCategories(household.id),
    getHomeBudget(household.id, query.year, query.month),
  ]);

  return (
    <RecordsView
      title="Home Expenses"
      description="Regular household expenses against each category's expected monthly amount."
      icon={<TypePageIcon type="HOME" />}
      variant="HOME"
      page={page}
      query={query}
      categories={categories}
      members={[]}
    >
      <HomeBudgetGrid lines={budget.lines} totals={budget.totals} year={query.year} month={query.month} />
    </RecordsView>
  );
}
