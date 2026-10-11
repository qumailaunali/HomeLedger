import React from "react";
import { getAllTransactionsList, getHouseholdSummary } from "@/lib/ledger-service";
import { getMetadataAction } from "@/app/actions";
import { AppShell } from "@/components/layout/app-shell";
import { RecordsClient } from "./records-client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string; search?: string; type?: string }>;
}

export default async function RecordsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const now = new Date();
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : (now.getMonth() + 1);
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();

  const transactions = await getAllTransactionsList({
    month: currentMonth,
    year: currentYear,
    search: resolvedParams.search,
    type: resolvedParams.type,
  });

  const summary = await getHouseholdSummary(currentYear, currentMonth);
  const metadata = await getMetadataAction(currentYear);

  return (
    <AppShell
      currentMonth={currentMonth}
      currentYear={currentYear}
      householdName={summary.household.name}
      currencySymbol={summary.household.currencySymbol}
      currentBalance={summary.currentBalance}
      categories={metadata.categories}
      members={metadata.members}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            All Records
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Spreadsheet-style ledger view with running balance
          </p>
        </div>
      </div>

      <RecordsClient
        initialTransactions={transactions}
        categories={metadata.categories}
        members={metadata.members}
        currencySymbol={summary.household.currencySymbol}
      />
    </AppShell>
  );
}
