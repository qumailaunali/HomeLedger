import "server-only";
import { prisma } from "../db";
import { centsToDecimalString, toCents } from "@/lib/money";
import type { Backup } from "@/lib/backup";

/** Builds the JSON backup for a household. Used by the export route. */
export async function buildBackup(householdId: string): Promise<Backup> {
  const [h, cats, members, incomes, expenses] = await Promise.all([
    prisma.household.findUniqueOrThrow({ where: { id: householdId } }),
    prisma.homeCategory.findMany({ where: { householdId }, orderBy: { sortOrder: "asc" } }),
    prisma.shoppingMember.findMany({
      where: { householdId },
      orderBy: { sortOrder: "asc" },
      include: { budgets: { orderBy: { year: "asc" } } },
    }),
    prisma.income.findMany({ where: { householdId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
    prisma.expense.findMany({ where: { householdId }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
  ]);
  const m = (d: { toString(): string }) => centsToDecimalString(toCents(d));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    app: "HomeLedger",
    version: 2,
    exportedAt: new Date().toISOString(),
    household: {
      name: h.name,
      currency: h.currency,
      currencySymbol: h.currencySymbol,
      startingBalance: m(h.startingBalance),
      dateFormat: h.dateFormat,
      timezone: h.timezone,
    },
    homeCategories: cats.map((c) => ({
      id: c.id,
      name: c.name,
      expectedMonthlyAmount: m(c.expectedMonthlyAmount),
      isActive: c.isActive,
      sortOrder: c.sortOrder,
    })),
    shoppingMembers: members.map((s) => ({
      id: s.id,
      name: s.name,
      isActive: s.isActive,
      sortOrder: s.sortOrder,
      budgets: s.budgets.map((b) => ({ year: b.year, budgetAmount: m(b.budgetAmount) })),
    })),
    incomes: incomes.map((i) => ({ date: iso(i.date), amount: m(i.amount), description: i.description, source: i.source, pot: i.pot })),
    expenses: expenses.map((e) => ({
      type: e.type,
      date: iso(e.date),
      amount: m(e.amount),
      description: e.description,
      notes: e.notes,
      homeCategoryId: e.homeCategoryId,
      shoppingMemberId: e.shoppingMemberId,
      place: e.place,
      numberOfPeople: e.numberOfPeople,
      paymentMethod: e.paymentMethod,
    })),
  };
}
