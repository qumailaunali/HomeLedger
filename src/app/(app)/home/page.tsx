import { Suspense } from "react";
import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getLedgerPage } from "@/server/queries/ledger";
import { getActiveCategories, getHomeStats, getPotBalances } from "@/server/queries/summary";
import { ledgerQueryFromParams } from "@/server/ledger-params";
import type { SearchParams } from "@/server/params";
import { todayIso } from "@/lib/dates";
import { RecordsView, TypePageIcon } from "@/components/ledger/records-view";
import { HomeStats } from "./home-stats";

export const metadata: Metadata = { title: "Home Expenses" };

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { household } = await requireHousehold();
  const query = ledgerQueryFromParams(await searchParams, todayIso(household.timezone), "HOME");
  const [page, categories, stats, pots] = await Promise.all([
    getLedgerPage(household, query.filters),
    getActiveCategories(household.id),
    getHomeStats(household.id, query.year, query.month),
    getPotBalances(household),
  ]);

  return (
    <Suspense fallback={<div className="animate-pulse rounded-2xl bg-muted/50 h-96" />}>
      <RecordsView
        title="Home Expenses"
        description="Regular household expenses."
        icon={<TypePageIcon type="HOME" />}
        variant="HOME"
        page={page}
        query={query}
        categories={categories}
        members={[]}
      >
        <HomeStats stats={stats} balanceCents={pots.HOME} year={query.year} month={query.month} />
      </RecordsView>
    </Suspense>
  );
}
