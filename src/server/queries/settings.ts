import "server-only";
import { prisma } from "../db";
import { toCents } from "@/lib/money";

export async function getAllCategories(householdId: string) {
  const [cats, usage] = await Promise.all([
    prisma.homeCategory.findMany({ where: { householdId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.expense.groupBy({ by: ["homeCategoryId"], where: { householdId, type: "HOME" }, _count: true }),
  ]);
  const used = new Map(usage.map((u) => [u.homeCategoryId, u._count]));
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    expectedCents: toCents(c.expectedMonthlyAmount),
    isActive: c.isActive,
    usedBy: used.get(c.id) ?? 0,
  }));
}
export type SettingsCategory = Awaited<ReturnType<typeof getAllCategories>>[number];

export async function getAllMembers(householdId: string) {
  const [members, usage] = await Promise.all([
    prisma.shoppingMember.findMany({
      where: { householdId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { budgets: { orderBy: { year: "desc" } } },
    }),
    prisma.expense.groupBy({ by: ["shoppingMemberId"], where: { householdId, type: "SHOPPING" }, _count: true }),
  ]);
  const used = new Map(usage.map((u) => [u.shoppingMemberId, u._count]));
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    isActive: m.isActive,
    usedBy: used.get(m.id) ?? 0,
    budgets: m.budgets.map((b) => ({ year: b.year, cents: toCents(b.budgetAmount) })),
  }));
}
export type SettingsMember = Awaited<ReturnType<typeof getAllMembers>>[number];
