import React from "react";
import { getHouseholdSummary } from "@/lib/ledger-service";
import { getMetadataAction } from "@/app/actions";
import { AppShell } from "@/components/layout/app-shell";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { ShoppingProgressCards } from "@/components/dashboard/shopping-progress-cards";
import { RecentTransactionsList } from "@/components/dashboard/recent-transactions-list";
import { BudgetWarningsBanner } from "@/components/dashboard/budget-warnings-banner";
import { formatMonthYear } from "@/lib/date";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const now = new Date();
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : (now.getMonth() + 1);
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();

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
      {/* Dashboard Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Household Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Financial summary for {formatMonthYear(currentYear, currentMonth)}
          </p>
        </div>
      </div>

      {/* Smart Budget Warnings */}
      <BudgetWarningsBanner warnings={summary.warnings} />

      {/* Top 6 Summary Cards */}
      <SummaryCards
        currentBalance={summary.currentBalance}
        monthReceived={summary.monthReceived}
        monthSpent={summary.monthSpent}
        netMonthChange={summary.netMonthChange}
        homeSpent={summary.homeSpent}
        shoppingSpent={summary.shoppingSpent}
        outingSpent={summary.outingSpent}
        homeBudgetTotal={summary.homeBudgetTotal}
        currencySymbol={summary.household.currencySymbol}
      />

      {/* Spending Trend & Category Breakdown Charts */}
      <SpendingChart
        monthlyTrend={summary.monthlyTrend}
        homeSpent={summary.homeSpent}
        shoppingSpent={summary.shoppingSpent}
        outingSpent={summary.outingSpent}
        currencySymbol={summary.household.currencySymbol}
      />

      {/* Family Shopping Budgets Progress */}
      <ShoppingProgressCards
        shoppingBudgetsProgress={summary.shoppingBudgetsProgress}
        currencySymbol={summary.household.currencySymbol}
        year={currentYear}
      />

      {/* Recent Transactions */}
      <RecentTransactionsList
        transactions={summary.recentTransactions}
        categories={metadata.categories}
        members={metadata.members}
        currencySymbol={summary.household.currencySymbol}
      />
    </AppShell>
  );
}
