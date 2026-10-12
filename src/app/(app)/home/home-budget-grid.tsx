"use client";

import Link from "next/link";
import { formatMonthYear } from "@/lib/dates";
import { useApp } from "@/components/app/app-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BudgetProgress, BudgetStatusLabel, EmptyState } from "@/components/ledger/display";
import { TYPE_META } from "@/components/ledger/type-meta";
import { budgetStatus } from "@/lib/calculations";
import { percentUsed } from "@/lib/money";
import type { BudgetLine } from "@/types";

/** Section 7: expected vs actual per Home category for the selected month. */
export function HomeBudgetGrid({
  lines,
  totals,
  year,
  month,
}: {
  lines: BudgetLine[];
  totals: { budgetCents: number; spentCents: number; remainingCents: number };
  year: number;
  month: number;
}) {
  const { money } = useApp();
  const status = budgetStatus(totals.spentCents, totals.budgetCents);

  return (
    <Card>
      <CardHeader className="flex-col sm:flex-row">
        <div>
          <CardTitle>Monthly budget · {formatMonthYear(year, month)}</CardTitle>
          <CardDescription>
            Spent <span className="tabular font-medium text-foreground">{money(totals.spentCents)}</span> of{" "}
            <span className="tabular">{money(totals.budgetCents)}</span> expected
            {totals.budgetCents > 0 && ` · ${percentUsed(totals.spentCents, totals.budgetCents)}% used`}
          </CardDescription>
        </div>
        {totals.budgetCents > 0 && <BudgetStatusLabel status={status} className="text-sm" />}
      </CardHeader>
      <CardContent className="pt-2">
        {lines.length === 0 ? (
          <EmptyState
            icon={TYPE_META.HOME.icon}
            title="No Home categories yet"
            description="Add categories like Food, Internet and Masi with their expected monthly amounts."
            action={
              <Link href="/settings/home-categories" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Set up categories
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {lines.map((l) => (
              <li key={l.id} className="border-b border-border/60 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0">
                <BudgetProgress line={l} period="monthly" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
