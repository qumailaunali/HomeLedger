import React from "react";
import { getHouseholdSummary } from "@/lib/ledger-service";
import { getMetadataAction } from "@/app/actions";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsClient } from "./settings-client";
import { prisma } from "@/lib/prisma";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const now = new Date();
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month, 10) : (now.getMonth() + 1);
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();

  const summary = await getHouseholdSummary(currentYear, currentMonth);
  const metadata = await getMetadataAction(currentYear);

  const allCategories = await prisma.homeCategory.findMany({
    where: { householdId: summary.household.id },
    orderBy: { sortOrder: "asc" },
  });

  const allMembers = await prisma.shoppingMember.findMany({
    where: { householdId: summary.household.id },
    include: {
      budgets: { where: { year: currentYear } },
    },
    orderBy: { sortOrder: "asc" },
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
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Settings & Customization
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage categories, yearly family budgets, currency, and data
            </p>
          </div>
        </div>
      </div>

      <SettingsClient
        household={summary.household}
        categories={allCategories}
        members={allMembers}
      />
    </AppShell>
  );
}
