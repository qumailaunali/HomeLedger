import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getLedgerPage } from "@/server/queries/ledger";
import { getOutingStats } from "@/server/queries/summary";
import { ledgerQueryFromParams } from "@/server/ledger-params";
import type { SearchParams } from "@/server/params";
import { todayIso } from "@/lib/dates";
import { RecordsView, TypePageIcon } from "@/components/ledger/records-view";
import { OutingStats } from "./outing-stats";

export const metadata: Metadata = { title: "Outing" };

export default async function OutingPage({ searchParams }: { searchParams: SearchParams }) {
  const { household } = await requireHousehold();
  const query = ledgerQueryFromParams(await searchParams, todayIso(household.timezone), "OUTING");
  const [page, stats] = await Promise.all([
    getLedgerPage(household, query.filters),
    getOutingStats(household.id, query.year, query.month),
  ]);

  return (
    <RecordsView
      title="Outing"
      description="Restaurant bills and family outings."
      icon={<TypePageIcon type="OUTING" />}
      variant="OUTING"
      page={page}
      query={query}
      categories={[]}
      members={[]}
    >
      <OutingStats stats={stats} year={query.year} month={query.month} />
    </RecordsView>
  );
}
