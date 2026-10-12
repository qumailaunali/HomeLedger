"use client";

import { Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  Plus,
  Receipt,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MONTH_NAMES, formatMonthYear, shiftMonth } from "@/lib/dates";
import { percentChange } from "@/lib/calculations";
import { useApp } from "@/components/app/app-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetProgress, EmptyState, Money, SummaryCard } from "@/components/ledger/display";
import { MonthSelector } from "@/components/ledger/month-selector";
import { TransactionList } from "@/components/ledger/transaction-list";
import { TypeTabs } from "@/components/ledger/type-tabs";
import { CategoryWatch } from "@/components/ledger/category-watch";
import { TYPE_META, TypeIcon, primaryLabel } from "@/components/ledger/type-meta";
import type { DashboardData, PeriodTotals } from "@/types";

/** Lazy-load recharts (heavy) — the trend chart is below the fold. */
const SpendingTrendChart = dynamic(
  () => import("@/components/charts/charts").then((m) => m.SpendingTrendChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted/50" /> },
);

function greeting(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Dashboard({ data, userName }: { data: DashboardData; userName: string }) {
  const { prefs, money, openExpense, openIncome } = useApp();
  const monthName = MONTH_NAMES[data.month - 1];
  const prev = shiftMonth(data.year, data.month, -1);
  const spentChange = percentChange(data.current.spentCents, data.previous.spentCents);
  const hasActivity = data.recent.length > 0;
  // Only red (over-budget) alerts; yellow cautions are not shown.
  const alerts = data.warnings.filter((w) => w.tone === "danger");

  return (
    <>
      <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-muted/50" />}>
        <TypeTabs />
      </Suspense>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">
            {greeting(prefs.timezone)}, {userName.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Here is your {monthName} spending overview.</p>
        </div>
        <Suspense fallback={<div className="h-10 w-32 animate-pulse rounded-xl bg-muted/50" />}>
          <MonthSelector year={data.year} month={data.month} />
        </Suspense>
      </div>

      {alerts.length > 0 && (
        <ul className="grid gap-2" aria-label="Budget warnings">
          {alerts.map((w) => (
            <li
              key={w.id}
              className={cn(
                "flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm",
                w.tone === "danger" ? "bg-danger-soft" : "bg-warning-soft",
              )}
            >
              {w.tone === "danger" ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Over budget" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-label="Warning" />
              )}
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Balances: total and each money pot */}
      <section aria-label="Balances" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Total Available Balance"
          cents={data.balanceCents}
          tone="auto"
          icon={Wallet}
          iconClass="bg-positive-soft text-positive"
          className="col-span-2 lg:col-span-1"
          hint={
            <span className="flex flex-col gap-0.5">
              <span>
                {monthName.slice(0, 3)}: received {money(data.current.receivedCents)} · spent {money(data.current.spentCents)}
              </span>
              <ChangeHint change={spentChange} previous={data.previous.spentCents} />
            </span>
          }
        />
        {(["HOME", "OUTING", "SHOPPING"] as const).map((t) => (
          <SummaryCard
            key={t}
            label={`${TYPE_META[t].label} balance`}
            cents={data.pots[t]}
            tone={data.pots[t] < 0 ? "danger" : "default"}
            icon={TYPE_META[t].icon}
            iconClass={cn(TYPE_META[t].soft, TYPE_META[t].text)}
            hint={data.pots[t] < 0 ? "Spent more than was added" : "Money added − expenses"}
            className={t === "SHOPPING" ? "col-span-2 lg:col-span-1" : undefined}
          />
        ))}
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:flex">
        <Button size="xl" className="sm:min-w-48" onClick={() => openExpense()}>
          <Plus className="size-5" /> Add Expense
        </Button>
        <Button size="xl" variant="positive" className="sm:min-w-44" onClick={() => openIncome()}>
          <ArrowDownLeft /> Receive Money
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <Link href="/records" className="text-xs font-medium text-muted-foreground hover:text-foreground">
            All records
          </Link>
        </CardHeader>
        <CardContent className="pt-2">
          {hasActivity ? (
            <TransactionList rows={data.recent} />
          ) : (
            <EmptyState
              icon={Receipt}
              title={`No expenses recorded for ${monthName} yet.`}
              description="Start with today's spending — it takes a few seconds."
              action={
                <Button onClick={() => openExpense()}>
                  <Plus /> Add your first expense
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <CategoryWatch categories={data.home} monthly={data.categoryMonthly} trend={data.trend} homeTotalCents={data.current.homeCents} />

      <SpendingTrendChart data={data.trend} title="Spending overview" description="Last 6 months by type" />

      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlySummary title={formatMonthYear(data.year, data.month)} totals={data.current} previous={data.previous} prevLabel={MONTH_NAMES[prev.month - 1]} />

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Shopping budgets</CardTitle>
              <CardDescription>Yearly budget per person · {data.year}</CardDescription>
            </div>
            <Link href={`/shopping?year=${data.year}`} className="text-xs font-medium text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 pt-1">
            {data.shopping.length === 0 ? (
              <EmptyState icon={TYPE_META.SHOPPING.icon} title="No shopping members yet" description="Add family members and yearly budgets in Settings." action={<Link href="/settings/shopping-members" className={buttonVariants({ variant: "outline", size: "sm" })}>Open settings</Link>} />
            ) : (
              data.shopping.map((l) => <BudgetProgress key={l.id} line={l} period="yearly" compact />)
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Largest expenses</CardTitle>
              <CardDescription>{formatMonthYear(data.year, data.month)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {data.largest.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No expenses this month.</p>
            ) : (
              <ol className="grid gap-1">
                {data.largest.map((r, i) => (
                  <li key={r.id} className="flex items-center gap-3 py-1.5">
                    <span className="tabular w-4 text-xs text-muted-foreground">{i + 1}</span>
                    <TypeIcon type={r.type} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">{primaryLabel(r)}</span>
                    <Money cents={r.amountCents} className="text-sm font-medium" />
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <HomeBudgetOverview data={data} />
      </div>
    </>

  );
}

function ChangeHint({ change, previous }: { change: number | null; previous: number }) {
  const { money } = useApp();
  if (change === null) return <span>No spending last month</span>;
  const up = change > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={cn("size-3.5", up ? "text-danger" : "text-positive")} aria-hidden />
      {Math.abs(change)}% {up ? "more" : "less"} than last month ({money(previous)})
    </span>
  );
}

/** Monthly summary: received, each type, total, net change, compared with last month. */
export function MonthlySummary({
  title,
  totals,
  previous,
  prevLabel,
}: {
  title: string;
  totals: PeriodTotals;
  previous?: PeriodTotals;
  prevLabel?: string;
}) {
  const { money } = useApp();
  const rows: { label: string; cents: number; prev?: number; strong?: boolean }[] = [
    { label: "Received", cents: totals.receivedCents, prev: previous?.receivedCents },
    { label: "Home", cents: totals.homeCents, prev: previous?.homeCents },
    { label: "Shopping", cents: totals.shoppingCents, prev: previous?.shoppingCents },
    { label: "Outing", cents: totals.outingCents, prev: previous?.outingCents },
    { label: "Total expenses", cents: totals.spentCents, prev: previous?.spentCents, strong: true },
  ];
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="uppercase tracking-wide">{title}</CardTitle>
          <CardDescription>Monthly summary</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <table className="w-full text-sm">
          {previous && (
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="pb-2 text-left font-medium">
                  <span className="sr-only">Item</span>
                </th>
                <th scope="col" className="pb-2 text-right font-medium">This month</th>
                <th scope="col" className="pb-2 text-right font-medium">{prevLabel}</th>
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.label} className={r.strong ? "font-semibold" : undefined}>
                <th scope="row" className="py-2 text-left font-normal">{r.label}</th>
                <td className={cn("tabular py-2 text-right", r.label === "Received" && "text-positive")}>{money(r.cents)}</td>
                {previous && <td className="tabular py-2 text-right text-muted-foreground">{money(r.prev ?? 0)}</td>}
              </tr>
            ))}
            <tr className="font-semibold">
              <th scope="row" className="py-2.5 text-left">Net change</th>
              <td className={cn("tabular py-2.5 text-right", totals.netCents < 0 ? "text-danger" : "text-positive")}>
                {money(totals.netCents, { signed: true })}
              </td>
              {previous && <td className="tabular py-2.5 text-right text-muted-foreground">{money(previous.netCents, { signed: true })}</td>}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function HomeBudgetOverview({ data }: { data: DashboardData }) {
  // Show the categories that need attention first.
  const rank = { over: 0, near: 1, within: 2, none: 3 } as const;
  if (!data.home.some((l) => l.budgetCents > 0)) return null;
  const lines = [...data.home].filter((l) => l.budgetCents > 0).sort((a, b) => rank[a.status] - rank[b.status] || b.percent - a.percent).slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Home budget</CardTitle>
          <CardDescription>Expected vs actual this month</CardDescription>
        </div>
        <Link href={`/home?year=${data.year}&month=${data.month}`} className="text-xs font-medium text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent className="divide-y divide-border/60 pt-1">
        {lines.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Set expected monthly amounts in Settings to track your Home budget.</p>
        ) : (
          lines.map((l) => <BudgetProgress key={l.id} line={l} period="monthly" compact />)
        )}
      </CardContent>
    </Card>
  );
}
