/**
 * Pure financial calculations. Every page (dashboard, analytics, settings,
 * exports) goes through these functions so totals can never disagree.
 * All inputs and outputs are integer cents.
 */

import { type Cents, percentUsed } from "./money";
import { MONTH_SHORT, shiftMonth } from "./dates";

export type ExpenseTypeKey = "HOME" | "SHOPPING" | "OUTING";
export type BudgetStatus = "none" | "within" | "near" | "over";

/** Spending at or above this share of the budget counts as "near". */
export const NEAR_BUDGET_PERCENT = 85;

/** Balance = starting balance + money received - expenses. */
export function computeBalance(startingCents: Cents, receivedCents: Cents, spentCents: Cents): Cents {
  return startingCents + receivedCents - spentCents;
}

export function budgetStatus(spentCents: Cents, budgetCents: Cents): BudgetStatus {
  if (budgetCents <= 0) return spentCents > 0 ? "over" : "none";
  if (spentCents > budgetCents) return "over";
  if (percentUsed(spentCents, budgetCents) >= NEAR_BUDGET_PERCENT) return "near";
  return "within";
}

export interface BudgetLine {
  id: string;
  name: string;
  budgetCents: Cents;
  spentCents: Cents;
  /** budget - spent; negative when over budget */
  remainingCents: Cents;
  overCents: Cents;
  percent: number;
  status: BudgetStatus;
}

export function budgetLine(id: string, name: string, budgetCents: Cents, spentCents: Cents): BudgetLine {
  const remainingCents = budgetCents - spentCents;
  return {
    id,
    name,
    budgetCents,
    spentCents,
    remainingCents,
    overCents: remainingCents < 0 ? -remainingCents : 0,
    percent: percentUsed(spentCents, budgetCents),
    status: budgetStatus(spentCents, budgetCents),
  };
}

/**
 * Yearly shopping progress: each member's budget for that specific year minus
 * their shopping expenses dated in that year.
 */
export function shoppingProgress(
  members: { id: string; name: string }[],
  budgetsByMember: Map<string, Cents>,
  spentByMember: Map<string, Cents>,
): BudgetLine[] {
  return members.map((m) => budgetLine(m.id, m.name, budgetsByMember.get(m.id) ?? 0, spentByMember.get(m.id) ?? 0));
}

/** Monthly Home progress: expected monthly amount minus that month's spending per category. */
export function homeProgress(
  categories: { id: string; name: string; expectedCents: Cents }[],
  spentByCategory: Map<string, Cents>,
): BudgetLine[] {
  return categories.map((c) => budgetLine(c.id, c.name, c.expectedCents, spentByCategory.get(c.id) ?? 0));
}

export function totalsOf(lines: BudgetLine[]): { budgetCents: Cents; spentCents: Cents; remainingCents: Cents } {
  let budgetCents = 0;
  let spentCents = 0;
  for (const l of lines) {
    budgetCents += l.budgetCents;
    spentCents += l.spentCents;
  }
  return { budgetCents, spentCents, remainingCents: budgetCents - spentCents };
}

export interface MonthTotals {
  year: number;
  month: number;
  label: string;
  homeCents: Cents;
  shoppingCents: Cents;
  outingCents: Cents;
  spentCents: Cents;
  receivedCents: Cents;
  /** number of expenses */
  count: number;
  outingCount: number;
}

export interface MonthlyRow {
  year: number;
  month: number;
  kind: ExpenseTypeKey | "RECEIVED";
  cents: Cents;
  count: number;
}

/** Builds a continuous month-by-month series (zero-filled) from grouped rows. */
export function monthlySeries(
  rows: MonthlyRow[],
  start: { year: number; month: number },
  monthCount: number,
): MonthTotals[] {
  const series: MonthTotals[] = [];
  const index = new Map<string, MonthTotals>();
  const spansYears = shiftMonth(start.year, start.month, monthCount - 1).year !== start.year;
  for (let i = 0; i < monthCount; i++) {
    const { year, month } = shiftMonth(start.year, start.month, i);
    const entry: MonthTotals = {
      year,
      month,
      label: spansYears ? `${MONTH_SHORT[month - 1]} '${String(year).slice(2)}` : MONTH_SHORT[month - 1],
      homeCents: 0,
      shoppingCents: 0,
      outingCents: 0,
      spentCents: 0,
      receivedCents: 0,
      count: 0,
      outingCount: 0,
    };
    series.push(entry);
    index.set(`${year}-${month}`, entry);
  }
  for (const r of rows) {
    const e = index.get(`${r.year}-${r.month}`);
    if (!e) continue;
    if (r.kind === "RECEIVED") {
      e.receivedCents += r.cents;
      continue;
    }
    if (r.kind === "HOME") e.homeCents += r.cents;
    else if (r.kind === "SHOPPING") e.shoppingCents += r.cents;
    else {
      e.outingCents += r.cents;
      e.outingCount += r.count;
    }
    e.spentCents += r.cents;
    e.count += r.count;
  }
  return series;
}

export interface PeriodTotals {
  receivedCents: Cents;
  homeCents: Cents;
  shoppingCents: Cents;
  outingCents: Cents;
  spentCents: Cents;
  netCents: Cents;
}

export function periodTotals(byKind: Partial<Record<ExpenseTypeKey | "RECEIVED", Cents>>): PeriodTotals {
  const homeCents = byKind.HOME ?? 0;
  const shoppingCents = byKind.SHOPPING ?? 0;
  const outingCents = byKind.OUTING ?? 0;
  const receivedCents = byKind.RECEIVED ?? 0;
  const spentCents = homeCents + shoppingCents + outingCents;
  return { receivedCents, homeCents, shoppingCents, outingCents, spentCents, netCents: receivedCents - spentCents };
}

/** Percent change from previous to current, or null when there is no baseline. */
export function percentChange(currentCents: Cents, previousCents: Cents): number | null {
  if (previousCents <= 0) return null;
  return Math.round(((currentCents - previousCents) * 100) / previousCents);
}

export interface Warning {
  id: string;
  tone: "warning" | "danger";
  message: string;
}

/**
 * Dashboard warnings — only the useful ones: shopping members near/over their
 * yearly limit, Home categories over the expected amount, and outings up on
 * last month. Capped so the banner never becomes noise.
 */
export function buildWarnings(input: {
  shopping: BudgetLine[];
  home: BudgetLine[];
  monthName: string;
  outingThisMonthCents: Cents;
  outingLastMonthCents: Cents;
  formatMoney: (cents: Cents) => string;
  limit?: number;
}): Warning[] {
  const warnings: Warning[] = [];

  for (const s of input.shopping) {
    if (s.budgetCents <= 0) continue;
    if (s.status === "over") {
      warnings.push({
        id: `shop-${s.id}`,
        tone: "danger",
        message: `${s.name} is ${input.formatMoney(s.overCents)} over the yearly shopping budget.`,
      });
    } else if (s.status === "near") {
      warnings.push({
        id: `shop-${s.id}`,
        tone: "warning",
        message: `${s.name} has used ${s.percent}% of the yearly shopping budget.`,
      });
    }
  }

  for (const h of input.home) {
    if (h.status !== "over" || h.budgetCents <= 0) continue;
    const above = h.percent - 100;
    warnings.push({
      id: `home-${h.id}`,
      tone: "danger",
      message: `${h.name} spending is ${above}% above ${input.monthName}'s expected amount.`,
    });
  }

  if (input.outingLastMonthCents > 0 && input.outingThisMonthCents > input.outingLastMonthCents) {
    warnings.push({
      id: "outing-up",
      tone: "warning",
      message: `Outing spending is higher than last month (${input.formatMoney(input.outingThisMonthCents)} vs ${input.formatMoney(input.outingLastMonthCents)}).`,
    });
  }

  // Most severe first
  warnings.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "danger" ? -1 : 1));
  return warnings.slice(0, input.limit ?? 5);
}

/** Share of each slice in a whole, rounded, for category breakdowns. */
export function shares<T extends { cents: Cents }>(items: T[]): (T & { percent: number })[] {
  const total = items.reduce((s, i) => s + i.cents, 0);
  return items.map((i) => ({ ...i, percent: total > 0 ? Math.round((i.cents * 100) / total) : 0 }));
}
