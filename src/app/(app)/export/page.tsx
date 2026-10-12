import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getActiveCategories, getActiveMembers } from "@/server/queries/summary";
import { todayIso } from "@/lib/dates";
import { ExportView } from "./export-view";
import { ImportPanel } from "./import-panel";
import { RestorePanel } from "./restore-panel";
import { PageHeader } from "@/components/ledger/display";

export const metadata: Metadata = { title: "Export & Import" };

export default async function ExportPage() {
  const { household } = await requireHousehold();
  const today = todayIso(household.timezone);
  const [categories, members] = await Promise.all([
    getActiveCategories(household.id),
    getActiveMembers(household.id, Number(today.slice(0, 4))),
  ]);
  return (
    <>
      <PageHeader title="Export & Import" description="Download your records for Excel, or bring records in from a spreadsheet." />
      <ExportView today={today} />
      <ImportPanel categories={categories} members={members} />
      <RestorePanel />
    </>
  );
}
