import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { HouseholdContext } from "../auth";
import { formatMoney, toCents, type Cents } from "@/lib/money";
import {
  MONTH_NAMES,
  isoRange,
  monthRange,
  shiftMonth,
  yearRange,
  type IsoDate,
} from "@/lib/dates";
import {
  buildWarnings,
  computeBalance,
  homeProgress,
  monthlySeries,
  periodTotals,
  shoppingProgress,
  totalsOf,
  type ExpenseTypeKey,
  type MonthlyRow,
  type PeriodTotals,
} from "@/lib/calculations";
import { getLedgerPage, getRecentTransactions } from "./ledger";
import type { CategoryOption, DashboardData, MemberOption } from "@/types";

type DateRange = { gte: Date; lt: Date };

export async function getBalanceCents(household: HouseholdContext): Promise<Cents> {
  const [received, spent] = await Promise.all([
    prisma.income.aggregate({ where: { householdId: household.id }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { householdId: household.id }, _sum: { amount: true } }),
  ]);
  return computeBalance(household.startingBalanceCents, toCents(received._sum.amount), toCents(spent._sum.amount));
}

export async function getActiveCategories(householdId: string): Promise<CategoryOption[]> {
  const rows = await prisma.homeCategory.findMany({
    where: { householdId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, expectedMonthlyAmount: true },
  });
  return rows.map((c) => ({ id: c.id, name: c.name, expectedCents: toCents(c.expectedMonthlyAmount) }));
}

export async function getActiveMembers(householdId: string, year: number): Promise<MemberOption[]> {
  const rows = await prisma.shoppingMember.findMany({
    where: { householdId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, budgets: { where: { year }, select: { budgetAmount: true } } },
  });
  return rows.map((m) => ({ id: m.id, name: m.name, budgetCents: toCents(m.budgets[0]?.budgetAmount) }));
}

export interface PotBalances {
  HOME: Cents;
  OUTING: Cents;
  SHOPPING: Cents;
  /** Starting balance + money received without a pot. */
  generalCents: Cents;
  totalCents: Cents;
}

/**
 * Money pots: each pot's balance = money added to that pot − that type's
 * expenses (all time). The total is the household balance, so the pots plus
 * the general amount always add up to it.
 */
export async function getPotBalances(household: HouseholdContext): Promise<PotBalances> {
  const [received, spent] = await Promise.all([
    prisma.income.groupBy({ by: ["pot"], where: { householdId: household.id }, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["type"], where: { householdId: household.id }, _sum: { amount: true } }),
  ]);
  const into = (pot: ExpenseTypeKey | null) => toCents(received.find((r) => r.pot === pot)?._sum.amount);
  const out = (type: ExpenseTypeKey) => toCents(spent.find((r) => r.type === type)?._sum.amount);
  const HOME = into("HOME") - out("HOME");
  const OUTING = into("OUTING") - out("OUTING");
  const SHOPPING = into("SHOPPING") - out("SHOPPING");
  const generalCents = household.startingBalanceCents + into(null);
  return { HOME, OUTING, SHOPPING, generalCents, totalCents: generalCents + HOME + OUTING + SHOPPING };
}

/** Totals by expense type plus money received, for any date range. */
export async function getPeriodTotals(householdId: string, range: DateRange): Promise<PeriodTotals> {
  const [byType, received] = await Promise.all([
    prisma.expense.groupBy({
      by: ["type"],
      where: { householdId, date: range },
      _sum: { amount: true },
    }),
    prisma.income.aggregate({ where: { householdId, date: range }, _sum: { amount: true } }),
  ]);
  const map: Partial<Record<ExpenseTypeKey | "RECEIVED", Cents>> = { RECEIVED: toCents(received._sum.amount) };
  for (const row of byType) map[row.type] = toCents(row._sum.amount);
  return periodTotals(map);
}

/** Month-by-month totals per type (zero-filled), from one grouped query. */
export async function getMonthlySeries(householdId: string, start: { year: number; month: number }, months: number) {
  const end = shiftMonth(start.year, start.month, months);
  const from = `${start.year}-${String(start.month).padStart(2, "0")}-01`;
  const to = `${end.year}-${String(end.month).padStart(2, "0")}-01`;
  const rows = await prisma.$queryRaw<{ year: number; month: number; kind: string; total: Prisma.Decimal; count: number }[]>`
    SELECT EXTRACT(YEAR FROM date)::int AS year, EXTRACT(MONTH FROM date)::int AS month,
           type::text AS kind, SUM(amount) AS total, COUNT(*)::int AS count
      FROM "Expense"
     WHERE "householdId" = ${householdId} AND date >= ${from}::date AND date < ${to}::date
     GROUP BY 1, 2, 3
    UNION ALL
    SELECT EXTRACT(YEAR FROM date)::int, EXTRACT(MONTH FROM date)::int,
           'RECEIVED', SUM(amount), COUNT(*)::int
      FROM "Income"
     WHERE "householdId" = ${householdId} AND date >= ${from}::date AND date < ${to}::date
     GROUP BY 1, 2`;
  const grouped: MonthlyRow[] = rows.map((r) => ({
    year: r.year,
    month: r.month,
    kind: r.kind as MonthlyRow["kind"],
    cents: toCents(r.total),
    count: r.count,
  }));
  return monthlySeries(grouped, start, months);
}

async function homeSpendingByCategory(householdId: string, range: DateRange) {
  const rows = await prisma.expense.groupBy({
    by: ["homeCategoryId"],
    where: { householdId, type: "HOME", date: range },
    _sum: { amount: true },
    _count: true,
  });
  return new Map(rows.filter((r) => r.homeCategoryId).map((r) => [r.homeCategoryId!, toCents(r._sum.amount)]));
}

async function shoppingSpendingByMember(householdId: string, year: number) {
  const rows = await prisma.expense.groupBy({
    by: ["shoppingMemberId"],
    where: { householdId, type: "SHOPPING", date: yearRange(year) },
    _sum: { amount: true },
  });
  return new Map(rows.filter((r) => r.shoppingMemberId).map((r) => [r.shoppingMemberId!, toCents(r._sum.amount)]));
}

/** Expected-vs-actual for each active Home category in one month. */
export async function getHomeBudget(householdId: string, year: number, month: number) {
  const [categories, spent] = await Promise.all([
    getActiveCategories(householdId),
    homeSpendingByCategory(householdId, monthRange(year, month)),
  ]);
  const lines = homeProgress(categories, spent);
  return { lines, totals: totalsOf(lines) };
}

/** Yearly budget vs spent for each active shopping member, using that year's budget. */
export async function getShoppingBudget(householdId: string, year: number) {
  const [members, spent] = await Promise.all([
    getActiveMembers(householdId, year),
    shoppingSpendingByMember(householdId, year),
  ]);
  const budgets = new Map(members.map((m) => [m.id, m.budgetCents]));
  const lines = shoppingProgress(members, budgets, spent);
  return { lines, totals: totalsOf(lines) };
}

export async function getDashboard(household: HouseholdContext, year: number, month: number): Promise<DashboardData> {
  const prev = shiftMonth(year, month, -1);
  const range = monthRange(year, month);
  const trendStart = shiftMonth(year, month, -5);
  const symbol = household.currencySymbol;

  const [pots, current, previous, trend, home, shopping, recent, largest, outingCount] = await Promise.all([
    getPotBalances(household),
    getPeriodTotals(household.id, range),
    getPeriodTotals(household.id, monthRange(prev.year, prev.month)),
    getMonthlySeries(household.id, trendStart, 6),
    getHomeBudget(household.id, year, month),
    getShoppingBudget(household.id, year),
    getRecentTransactions(household, 8),
    getLedgerPage(household, {
      type: "EXPENSES",
      from: isoOf(range.gte),
      to: lastDayIso(year, month),
      sort: "amount",
      dir: "desc",
      pageSize: 5,
    }),
    prisma.expense.count({ where: { householdId: household.id, type: "OUTING", date: range } }),
  ]);

  const warnings = buildWarnings({
    shopping: shopping.lines,
    home: home.lines,
    monthName: MONTH_NAMES[month - 1],
    outingThisMonthCents: current.outingCents,
    outingLastMonthCents: previous.outingCents,
    formatMoney: (c) => formatMoney(c, symbol),
  });

  return {
    year,
    month,
    balanceCents: pots.totalCents,
    pots,
    current,
    previous,
    trend,
    home: home.lines,
    homeTotals: home.totals,
    shopping: shopping.lines,
    shoppingTotals: shopping.totals,
    recent,
    largest: largest.rows,
    outingCount,
    warnings,
  };
}

function isoOf(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

function lastDayIso(year: number, month: number): IsoDate {
  return isoOf(new Date(monthRange(year, month).lt.getTime() - 86_400_000));
}

/** Outing statistics for a month and its year. */
export async function getOutingStats(householdId: string, year: number, month: number) {
  const [monthAgg, yearAgg, prevAgg, largest] = await Promise.all([
    prisma.expense.aggregate({
      where: { householdId, type: "OUTING", date: monthRange(year, month) },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { householdId, type: "OUTING", date: yearRange(year) },
      _sum: { amount: true },
      _count: true,
    }),
    (() => {
      const p = shiftMonth(year, month, -1);
      return prisma.expense.aggregate({
        where: { householdId, type: "OUTING", date: monthRange(p.year, p.month) },
        _sum: { amount: true },
        _count: true,
      });
    })(),
    prisma.expense.findFirst({
      where: { householdId, type: "OUTING", date: yearRange(year) },
      orderBy: [{ amount: "desc" }, { date: "desc" }],
      select: { place: true, amount: true, date: true },
    }),
  ]);
  const monthCents = toCents(monthAgg._sum.amount);
  const yearCents = toCents(yearAgg._sum.amount);
  return {
    monthCents,
    monthCount: monthAgg._count,
    previousMonthCents: toCents(prevAgg._sum.amount),
    previousMonthCount: prevAgg._count,
    yearCents,
    yearCount: yearAgg._count,
    averageCents: yearAgg._count ? Math.round(yearCents / yearAgg._count) : 0,
    largest: largest
      ? { place: largest.place ?? "Outing", amountCents: toCents(largest.amount), date: isoOf(largest.date) }
      : null,
  };
}

/** Analytics over an inclusive date range. */
export async function getAnalytics(household: HouseholdContext, from: IsoDate, to: IsoDate) {
  const range = isoRange(from, to)!;
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const months = (ty - fy) * 12 + (tm - fm) + 1;
  const hid = household.id;

  const [totals, series, homeByCat, categories, largest, outingAgg, outingLargest] = await Promise.all([
    getPeriodTotals(hid, range),
    getMonthlySeries(hid, { year: fy, month: fm }, months),
    homeSpendingByCategory(hid, range),
    prisma.homeCategory.findMany({
      where: { householdId: hid },
      select: { id: true, name: true, expectedMonthlyAmount: true, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getLedgerPage(household, { type: "EXPENSES", from, to, sort: "amount", dir: "desc", pageSize: 1 }),
    prisma.expense.aggregate({ where: { householdId: hid, type: "OUTING", date: range }, _sum: { amount: true }, _count: true }),
    prisma.expense.findFirst({
      where: { householdId: hid, type: "OUTING", date: range },
      orderBy: [{ amount: "desc" }],
      select: { place: true, amount: true, date: true },
    }),
  ]);

  // Per-month Home spending by category, to count months over the expected amount.
  const homeMonthly = await prisma.$queryRaw<{ categoryId: string; year: number; month: number; total: Prisma.Decimal }[]>`
    SELECT "homeCategoryId" AS "categoryId", EXTRACT(YEAR FROM date)::int AS year,
           EXTRACT(MONTH FROM date)::int AS month, SUM(amount) AS total
      FROM "Expense"
     WHERE "householdId" = ${hid} AND type = 'HOME' AND "homeCategoryId" IS NOT NULL
       AND date >= ${from}::date AND date <= ${to}::date
     GROUP BY 1, 2, 3`;

  const homeCategories = categories
    .map((c) => {
      const spentCents = homeByCat.get(c.id) ?? 0;
      const expectedMonthlyCents = toCents(c.expectedMonthlyAmount);
      const monthsOver = homeMonthly.filter(
        (r) => r.categoryId === c.id && expectedMonthlyCents > 0 && toCents(r.total) > expectedMonthlyCents,
      ).length;
      return {
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        spentCents,
        expectedCents: c.isActive ? expectedMonthlyCents * months : 0,
        monthsOver,
      };
    })
    .filter((c) => c.spentCents > 0 || (c.isActive && c.expectedCents > 0));

  const activeMonths = series.filter((m) => m.spentCents > 0);
  const highest = series.reduce<(typeof series)[number] | null>(
    (best, m) => (m.spentCents > 0 && (!best || m.spentCents > best.spentCents) ? m : best),
    null,
  );

  return {
    from,
    to,
    months,
    totals,
    series,
    averageMonthlyCents: activeMonths.length ? Math.round(totals.spentCents / activeMonths.length) : 0,
    highestMonth: highest ? { label: `${MONTH_NAMES[highest.month - 1]} ${highest.year}`, cents: highest.spentCents } : null,
    largestExpense: largest.rows[0] ?? null,
    homeCategories: homeCategories.sort((a, b) => b.spentCents - a.spentCents),
    outing: {
      totalCents: toCents(outingAgg._sum.amount),
      count: outingAgg._count,
      averageCents: outingAgg._count ? Math.round(toCents(outingAgg._sum.amount) / outingAgg._count) : 0,
      largest: outingLargest
        ? { place: outingLargest.place ?? "Outing", amountCents: toCents(outingLargest.amount), date: isoOf(outingLargest.date) }
        : null,
    },
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;

/** Year summary: totals and January–December series. */
export async function getYearSummary(householdId: string, year: number) {
  const [totals, series] = await Promise.all([
    getPeriodTotals(householdId, yearRange(year)),
    getMonthlySeries(householdId, { year, month: 1 }, 12),
  ]);
  const monthsWithSpending = series.filter((m) => m.spentCents > 0).length;
  return {
    year,
    totals,
    series,
    averageMonthlyCents: monthsWithSpending ? Math.round(totals.spentCents / monthsWithSpending) : 0,
  };
}

export type YearSummary = Awaited<ReturnType<typeof getYearSummary>>;
