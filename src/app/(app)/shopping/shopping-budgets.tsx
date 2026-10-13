"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetProgress, EmptyState, SummaryCard } from "@/components/ledger/display";
import { PotBalanceCard } from "@/components/ledger/pot-stats";
import { TYPE_META } from "@/components/ledger/type-meta";
import type { BudgetLine } from "@/types";

/** One card per person: yearly budget, spent, remaining, % used, overspending. */
export function ShoppingBudgets({
  lines,
  totals,
  year,
  balanceCents,
  yearSpentCents,
}: {
  lines: BudgetLine[];
  totals: { budgetCents: number; spentCents: number; remainingCents: number };
  year: number;
  balanceCents: number;
  yearSpentCents: number;
}) {
  const { money, openExpense } = useApp();
  // Collapsed by default on phones so transactions are reachable with less scroll.
  const [expanded, setExpanded] = React.useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 639px)").matches,
  );

  // Always visible, also on phones: pot balance and this year's shopping total.
  const cards = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <PotBalanceCard type="SHOPPING" balanceCents={balanceCents} />
      <SummaryCard
        label={`Total in ${year}`}
        cents={yearSpentCents}
        hint={totals.budgetCents > 0 ? `of ${money(totals.budgetCents)} budget` : "Shopping expenses"}
      />
    </div>
  );

  if (lines.length === 0) {
    return (
      <div className="grid gap-3">
        {cards}
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
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {cards}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-xs sm:p-4"
      >
        <span className="grid gap-0.5">
          <span className="text-sm font-semibold">Family total {year}</span>
          <span className="text-sm text-muted-foreground">
            <span className="tabular font-semibold text-foreground">{money(totals.spentCents)}</span> of{" "}
            <span className="tabular">{money(totals.budgetCents)}</span>
            {" · "}
            <span className={cn("tabular font-semibold", totals.remainingCents < 0 ? "text-danger" : "text-foreground")}>
              {money(totals.remainingCents)}
            </span>{" "}
            left
          </span>
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>
      {expanded && (
        <>
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
                    className="size-11"
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
          <div className="flex justify-end">
            <Link href="/settings/budgets" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Edit budgets
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
