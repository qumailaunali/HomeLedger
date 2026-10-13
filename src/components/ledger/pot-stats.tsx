"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONTH_NAMES, shiftMonth } from "@/lib/dates";
import { percentChange } from "@/lib/calculations";
import { useApp } from "@/components/app/app-context";
import { SummaryCard } from "@/components/ledger/display";
import { TYPE_META } from "@/components/ledger/type-meta";

interface StatCard {
  label: string;
  cents: number;
  hint: React.ReactNode;
}

/**
 * Collapsible summary for a money pot page (Home, Outing): available balance,
 * this month's total vs last month, plus two page-specific cards.
 */
export function PotStats({
  type,
  balanceCents,
  monthCents,
  monthCount,
  previousMonthCents,
  countNoun,
  month,
  year,
  extra,
}: {
  type: "HOME" | "OUTING";
  balanceCents: number;
  monthCents: number;
  monthCount: number;
  previousMonthCents: number;
  /** Singular noun for the month count, e.g. "outing". */
  countNoun: string;
  year: number;
  month: number;
  extra: [StatCard, StatCard];
}) {
  const { money } = useApp();
  const meta = TYPE_META[type];
  // Collapsed by default on phones so transactions are reachable with less scroll.
  const [expanded, setExpanded] = React.useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 639px)").matches,
  );
  const prev = MONTH_NAMES[shiftMonth(year, month, -1).month - 1];
  const change = percentChange(monthCents, previousMonthCents);
  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-xs sm:p-4"
      >
        <span className="grid gap-0.5">
          <span className="text-sm font-semibold">{meta.label} summary</span>
          <span className="text-sm text-muted-foreground">
            <span className={cn("tabular font-semibold", balanceCents < 0 ? "text-danger" : "text-foreground")}>
              {money(balanceCents)}
            </span>{" "}
            available ·{" "}
            <span className="tabular font-semibold text-foreground">{money(monthCents)}</span> in{" "}
            {MONTH_NAMES[month - 1]}
          </span>
        </span>
        <ChevronDown
          className={cn("size-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Available balance"
            cents={balanceCents}
            tone={balanceCents < 0 ? "danger" : "positive"}
            icon={Wallet}
            iconClass={cn(meta.soft, meta.text)}
            hint={balanceCents < 0 ? "Spent more than was added" : `Left in the ${meta.label} pot`}
          />
          <SummaryCard
            label={`Total in ${MONTH_NAMES[month - 1]}`}
            cents={monthCents}
            hint={
              <span className="inline-flex flex-wrap items-center gap-1">
                {monthCount} {countNoun}
                {monthCount === 1 ? "" : "s"}
                {change !== null && (
                  <>
                    {" · "}
                    {change > 0 ? <ArrowUpRight className="size-3.5 text-danger" aria-hidden /> : <ArrowDownRight className="size-3.5 text-positive" aria-hidden />}
                    {Math.abs(change)}% vs {prev}
                  </>
                )}
              </span>
            }
          />
          {extra.map((card) => (
            <SummaryCard key={card.label} label={card.label} cents={card.cents} hint={card.hint} />
          ))}
        </div>
      )}
    </div>
  );
}
