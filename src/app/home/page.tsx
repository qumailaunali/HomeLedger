import React from "react";
import { getHouseholdSummary, getAllTransactionsList } from "@/lib/ledger-service";
import { getMetadataAction } from "@/app/actions";
import { AppShell } from "@/components/layout/app-shell";
import { RecordsClient } from "@/app/records/records-client";
import { Home, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const now = new Date();
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : (now.getMonth() + 1);
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();

  const summary = await getHouseholdSummary(currentYear, currentMonth);
  const metadata = await getMetadataAction(currentYear);
  const homeTransactions = await getAllTransactionsList({
    month: currentMonth,
    year: currentYear,
    type: "HOME",
  });

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
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Home Expenses
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Regular household bills, groceries, fuel & maintenance
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Budget vs Actual Grid (Section 7) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Category Budgets (Expected vs Actual)
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            Total Spent: {summary.household.currencySymbol} {summary.homeSpent.toLocaleString()} / Budget: {summary.household.currencySymbol} {summary.homeBudgetTotal.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {summary.homeCategoriesProgress.map((cat) => {
            const isOver = cat.isOverBudget;
            const isNear = cat.percentage >= 85 && !isOver;

            return (
              <div
                key={cat.categoryId}
                className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                  isOver
                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900"
                    : isNear
                    ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                    : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>{cat.name}</span>
                  {isOver ? (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" /> Over
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                      {cat.percentage}%
                    </span>
                  )}
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isOver ? "bg-rose-500" : isNear ? "bg-amber-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>
                    Spent: <strong className="text-slate-800 dark:text-slate-200">{summary.household.currencySymbol} {cat.spent.toLocaleString()}</strong>
                  </span>
                  <span>
                    Budget: {summary.household.currencySymbol} {cat.expected.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions Table for Home */}
      <RecordsClient
        initialTransactions={homeTransactions}
        categories={metadata.categories}
        members={metadata.members}
        currencySymbol={summary.household.currencySymbol}
      />
    </AppShell>
  );
}
