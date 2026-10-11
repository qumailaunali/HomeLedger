import React from "react";
import { getHouseholdSummary } from "@/lib/ledger-service";
import { getMetadataAction } from "@/app/actions";
import { AppShell } from "@/components/layout/app-shell";
import { AnalyticsClient } from "./analytics-client";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Financial Analytics
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Clear breakdown of spending trends, category ratios, and budget health
            </p>
          </div>
        </div>
      </div>

      <AnalyticsClient summary={summary} />
    </AppShell>
  );
}
