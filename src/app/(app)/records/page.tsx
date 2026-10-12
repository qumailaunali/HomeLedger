import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getLedgerPage } from "@/server/queries/ledger";
import { getActiveCategories, getActiveMembers } from "@/server/queries/summary";
import { ledgerQueryFromParams } from "@/server/ledger-params";
import type { SearchParams } from "@/server/params";
import { todayIso } from "@/lib/dates";
import { RecordsView } from "@/components/ledger/records-view";

export const metadata: Metadata = { title: "All Records" };

export default async function RecordsPage({ searchParams }: { searchParams: SearchParams }) {
  const { household } = await requireHousehold();
  const sp = await searchParams;
  const today = todayIso(household.timezone);
  const query = ledgerQueryFromParams(sp, today);
  const [page, categories, members] = await Promise.all([
    getLedgerPage(household, query.filters),
    getActiveCategories(household.id),
    getActiveMembers(household.id, query.year),
  ]);

  return (
    <RecordsView
      title="All Records"
      description="Every expense and money received, with the running balance."
      variant="ALL"
      page={page}
      query={query}
      categories={categories}
      members={members}
      autoFocusSearch={sp.focus === "search"}
    />
  );
}
