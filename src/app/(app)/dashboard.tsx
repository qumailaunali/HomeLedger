"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  Download,
  Plus,
  Receipt,
  TableProperties,
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
import { TYPE_META, TypeIcon, primaryLabel } from "@/components/ledger/type-meta";
import { BreakdownDonut, SpendingTrendChart } from "@/components/charts/charts";
import type { DashboardData, ExpenseType, PeriodTotals } from "@/types";

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

  return (
    <>
      <TypeTabs current={data.current} previous={data.previous} year={data.year} month={data.month} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">
            {greeting(prefs.timezone)}, {userName.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Here is your {monthName} spending overview.</p>
        </div>
        <MonthSelector year={data.year} month={data.month} />
      </div>

      {data.warnings.length > 0 && (
        <ul className="grid gap-2" aria-label="Budget warnings">
          {data.warnings.map((w) => (
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
      <section aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button size="xl" className="col-span-2 sm:min-w-48" onClick={() => openExpense()}>
          <Plus className="size-5" /> Add Expense
        </Button>
        <Button size="lg" variant="positive" className="h-12" onClick={() => openIncome()}>
          <ArrowDownLeft /> Receive Money
        </Button>
        <Link href="/records" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12")}>
          <TableProperties /> View Records
        </Link>
        <Link href="/export" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "col-span-2 h-12 sm:col-span-1")}>
          <Download /> Export
        </Link>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <SpendingTrendChart
          data={data.trend}
          title="Spending overview"
          description="Last 6 months by type"
          className="lg:col-span-3"
        />
        <BreakdownDonut
          homeCents={data.current.homeCents}
          shoppingCents={data.current.shoppingCents}
          outingCents={data.current.outingCents}
          title="Expense breakdown"
          description={formatMonthYear(data.year, data.month)}
          className="lg:col-span-2"
        />
      </div>

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

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
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

        <div className="grid content-start gap-4 lg:col-span-2">
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

/** Floating header: Home · Outing · Shopping with this month's totals. */
function TypeTabs({
  current,
  previous,
  year,
  month,
}: {
  current: PeriodTotals;
  previous: PeriodTotals;
  year: number;
  month: number;
}) {
  const { money } = useApp();
  const tabs: { type: ExpenseType; href: string; key: "homeCents" | "outingCents" | "shoppingCents" }[] = [
    { type: "HOME", href: `/home?year=${year}&month=${month}`, key: "homeCents" },
    { type: "OUTING", href: `/outing?year=${year}&month=${month}`, key: "outingCents" },
    { type: "SHOPPING", href: `/shopping?year=${year}`, key: "shoppingCents" },
  ];
  return (
    <nav
      aria-label="Expense types"
      className="sticky top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] z-10 rounded-2xl border border-border/70 bg-card/90 p-1.5 shadow-lg shadow-black/5 backdrop-blur-md"
    >
      <ul className="grid grid-cols-3 gap-1">
        {tabs.map((t) => {
          const change = percentChange(current[t.key], previous[t.key]);
          const Icon = TYPE_META[t.type].icon;
          return (
            <li key={t.type}>
              <Link
                href={t.href}
                className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-row sm:gap-3 sm:px-3 sm:text-left"
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TYPE_META[t.type].soft)} aria-hidden>
                  <Icon className={cn("size-4", TYPE_META[t.type].text)} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-muted-foreground sm:text-[13px]">{TYPE_META[t.type].label}</span>
                  <span className="tabular block truncate text-sm font-semibold sm:text-base">{money(current[t.key])}</span>
                  {change !== null && (
                    <span className="hidden text-[11px] text-muted-foreground sm:block">
                      {change > 0 ? "+" : ""}
                      {change}% vs last month
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
