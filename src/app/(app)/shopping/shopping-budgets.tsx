"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useApp } from "@/components/app/app-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetProgress, EmptyState } from "@/components/ledger/display";
import { TYPE_META } from "@/components/ledger/type-meta";
import type { BudgetLine } from "@/types";

/** One card per person: yearly budget, spent, remaining, % used, overspending. */
export function ShoppingBudgets({
  lines,
  totals,
  year,
}: {
  lines: BudgetLine[];
  totals: { budgetCents: number; spentCents: number; remainingCents: number };
  year: number;
}) {
  const { money, openExpense } = useApp();

  if (lines.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={TYPE_META.SHOPPING.icon}
          title="No shopping members yet"
          description="Add people like Sarah, Qumail and Others, each with a yearly budget."
          action={
            <Link href="/settings/shopping-members" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Set up members
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          Family total {year}: <span className="tabular font-semibold text-foreground">{money(totals.spentCents)}</span> of{" "}
          <span className="tabular">{money(totals.budgetCents)}</span>
        </span>
        <span>
          Combined remaining:{" "}
          <span className={`tabular font-semibold ${totals.remainingCents < 0 ? "text-danger" : "text-foreground"}`}>
            {money(totals.remainingCents)}
          </span>
        </span>
        <Link href="/settings/budgets" className="text-xs font-medium hover:text-foreground sm:ml-auto">
          Edit budgets
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lines.map((l) => (
          <Card key={l.id}>
            <CardHeader className="pb-0">
              <div>
                <CardTitle>{l.name}</CardTitle>
                <CardDescription>
                  Yearly budget {l.budgetCents > 0 ? money(l.budgetCents) : "not set"}
                </CardDescription>
              </div>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={`Add shopping for ${l.name}`}
                onClick={() => openExpense({ type: "SHOPPING", memberId: l.id })}
              >
                <Plus />
              </Button>
            </CardHeader>
            <CardContent className="pt-1">
              <BudgetProgress line={{ ...l, name: "Spent" }} period="yearly" compact />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
