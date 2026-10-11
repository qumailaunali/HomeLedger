import React from "react";
import { getHouseholdSummary, getAllTransactionsList } from "@/lib/ledger-service";
import { getMetadataAction } from "@/app/actions";
import { AppShell } from "@/components/layout/app-shell";
import { RecordsClient } from "@/app/records/records-client";
import { Coffee, DollarSign, Utensils, Award } from "lucide-react";
import { formatDisplayDate } from "@/lib/date";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function OutingPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const now = new Date();
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : (now.getMonth() + 1);
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();

  const summary = await getHouseholdSummary(currentYear, currentMonth);
  const metadata = await getMetadataAction(currentYear);
  const outingTransactions = await getAllTransactionsList({
    month: currentMonth,
    year: currentYear,
    type: "OUTING",
  });

  const { outingSummary } = summary;

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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Outing & Dining Expenses
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Restaurant bills, family dining, and recreation
            </p>
          </div>
        </div>
      </div>

      {/* Outing Statistics Cards (Section 8) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Outings this Month */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            This Month
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {summary.household.currencySymbol} {outingSummary.totalSpentMonth.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block">
            {outingSummary.countMonth} outings recorded
          </span>
        </div>

        {/* Year Total Outings */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {currentYear} Outings Total
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {summary.household.currencySymbol} {outingSummary.totalSpentYear.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block">
            {outingSummary.countYear} outings this year
          </span>
        </div>

        {/* Average Outing Cost */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Average Outing Cost
          </span>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.household.currencySymbol} {outingSummary.averageCost.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Per restaurant visit
          </span>
        </div>

        {/* Largest Outing */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Largest Outing
          </span>
          {outingSummary.largestOuting ? (
            <div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {summary.household.currencySymbol} {outingSummary.largestOuting.amount.toLocaleString()}
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block truncate">
                {outingSummary.largestOuting.place} ({formatDisplayDate(outingSummary.largestOuting.date)})
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-2">None recorded yet</div>
          )}
        </div>
      </div>

      {/* Outing Table View */}
      <RecordsClient
        initialTransactions={outingTransactions}
        categories={metadata.categories}
        members={metadata.members}
        currencySymbol={summary.household.currencySymbol}
      />
    </AppShell>
  );
}
