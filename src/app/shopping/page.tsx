import React from "react";
import { getHouseholdSummary, getAllTransactionsList } from "@/lib/ledger-service";
import { getMetadataAction } from "@/app/actions";
import { AppShell } from "@/components/layout/app-shell";
import { RecordsClient } from "@/app/records/records-client";
import { ShoppingProgressCards } from "@/components/dashboard/shopping-progress-cards";
import { ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function ShoppingPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const now = new Date();
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : (now.getMonth() + 1);
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();

  const summary = await getHouseholdSummary(currentYear, currentMonth);
  const metadata = await getMetadataAction(currentYear);
  const shoppingTransactions = await getAllTransactionsList({
    month: currentMonth,
    year: currentYear,
    type: "SHOPPING",
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
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Shopping Expenses
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Personal yearly budgets for family members & general shopping
            </p>
          </div>
        </div>
      </div>

      {/* Yearly Shopping Budgets */}
      <ShoppingProgressCards
        shoppingBudgetsProgress={summary.shoppingBudgetsProgress}
        currencySymbol={summary.household.currencySymbol}
        year={currentYear}
      />

      {/* Shopping Records Table */}
      <RecordsClient
        initialTransactions={shoppingTransactions}
        categories={metadata.categories}
        members={metadata.members}
        currencySymbol={summary.household.currencySymbol}
      />
    </AppShell>
  );
}
