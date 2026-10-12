"use server";

import { prisma } from "../db";
import { authedAction, revalidateLedger, UserError, type ActionResult } from "../action";
import {
  budgetSchema,
  categorySchema,
  generalSettingsSchema,
  memberSchema,
  type BudgetInput,
  type CategoryInput,
  type GeneralSettingsInput,
} from "@/lib/validation";
import { centsToDecimalString, parseAmountToCents } from "@/lib/money";

const money = (v: string) => centsToDecimalString(parseAmountToCents(v) ?? 0);

export async function updateGeneralSettings(raw: GeneralSettingsInput): Promise<ActionResult> {
  return authedAction("Could not save settings. Please try again.", async ({ householdId }) => {
    const input = generalSettingsSchema.parse(raw);
    await prisma.household.update({
      where: { id: householdId },
      data: {
        name: input.name,
        currency: input.currency,
        currencySymbol: input.currencySymbol,
        startingBalance: money(input.startingBalance),
        dateFormat: input.dateFormat,
        timezone: input.timezone,
      },
    });
    revalidateLedger();
    return null;
  });
}

// ---------- Home categories ----------

export async function saveCategory(id: string | null, raw: CategoryInput): Promise<ActionResult> {
  return authedAction("Could not save the category. Please try again.", async ({ householdId }) => {
    const input = categorySchema.parse(raw);
    const duplicate = await prisma.homeCategory.findFirst({
      where: { householdId, name: { equals: input.name, mode: "insensitive" }, NOT: id ? { id } : undefined },
      select: { id: true },
    });
    if (duplicate) throw new UserError(`A category called "${input.name}" already exists.`);

    if (id) {
      const res = await prisma.homeCategory.updateMany({
        where: { id, householdId },
        data: { name: input.name, expectedMonthlyAmount: money(input.expectedMonthlyAmount) },
      });
      if (!res.count) throw new UserError("This category no longer exists.");
    } else {
      const last = await prisma.homeCategory.aggregate({ where: { householdId }, _max: { sortOrder: true } });
      await prisma.homeCategory.create({
        data: {
          householdId,
          name: input.name,
          expectedMonthlyAmount: money(input.expectedMonthlyAmount),
          sortOrder: (last._max.sortOrder ?? 0) + 1,
        },
      });
    }
    revalidateLedger();
    return null;
  });
}

export async function setCategoryActive(id: string, isActive: boolean): Promise<ActionResult> {
  return authedAction("Could not update the category.", async ({ householdId }) => {
    const res = await prisma.homeCategory.updateMany({ where: { id, householdId }, data: { isActive } });
    if (!res.count) throw new UserError("This category no longer exists.");
    revalidateLedger();
    return null;
  });
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  return authedAction("Could not delete the category.", async ({ householdId }) => {
    const used = await prisma.expense.count({ where: { householdId, homeCategoryId: id } });
    if (used > 0) {
      throw new UserError(
        `This category is used by ${used} expense${used === 1 ? "" : "s"}. Disable it instead so past records stay intact.`,
      );
    }
    const res = await prisma.homeCategory.deleteMany({ where: { id, householdId } });
    if (!res.count) throw new UserError("This category was already deleted.");
    revalidateLedger();
    return null;
  });
}

/** Saves a new order — `ids` is the full list in display order. */
export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  return authedAction("Could not reorder categories.", async ({ householdId }) => {
    await prisma.$transaction(
      ids.map((id, index) => prisma.homeCategory.updateMany({ where: { id, householdId }, data: { sortOrder: index + 1 } })),
    );
    revalidateLedger();
    return null;
  });
}

// ---------- Shopping members & yearly budgets ----------

export async function saveMember(
  id: string | null,
  raw: { name: string; year?: number; budget?: string },
): Promise<ActionResult> {
  return authedAction("Could not save the member. Please try again.", async ({ householdId }) => {
    const { name } = memberSchema.parse(raw);
    const duplicate = await prisma.shoppingMember.findFirst({
      where: { householdId, name: { equals: name, mode: "insensitive" }, NOT: id ? { id } : undefined },
      select: { id: true },
    });
    if (duplicate) throw new UserError(`A member called "${name}" already exists.`);

    if (id) {
      const res = await prisma.shoppingMember.updateMany({ where: { id, householdId }, data: { name } });
      if (!res.count) throw new UserError("This member no longer exists.");
    } else {
      const last = await prisma.shoppingMember.aggregate({ where: { householdId }, _max: { sortOrder: true } });
      const member = await prisma.shoppingMember.create({
        data: { householdId, name, sortOrder: (last._max.sortOrder ?? 0) + 1 },
      });
      if (raw.year && raw.budget) {
        const b = budgetSchema.parse({ memberId: member.id, year: raw.year, amount: raw.budget });
        await prisma.shoppingBudget.create({ data: { memberId: member.id, year: b.year, budgetAmount: money(b.amount) } });
      }
    }
    revalidateLedger();
    return null;
  });
}

export async function setMemberActive(id: string, isActive: boolean): Promise<ActionResult> {
  return authedAction("Could not update the member.", async ({ householdId }) => {
    const res = await prisma.shoppingMember.updateMany({ where: { id, householdId }, data: { isActive } });
    if (!res.count) throw new UserError("This member no longer exists.");
    revalidateLedger();
    return null;
  });
}

export async function deleteMember(id: string): Promise<ActionResult> {
  return authedAction("Could not remove the member.", async ({ householdId }) => {
    const used = await prisma.expense.count({ where: { householdId, shoppingMemberId: id } });
    if (used > 0) {
      throw new UserError(
        `This member has ${used} shopping record${used === 1 ? "" : "s"}. Disable them instead so past records stay intact.`,
      );
    }
    const res = await prisma.shoppingMember.deleteMany({ where: { id, householdId } });
    if (!res.count) throw new UserError("This member was already removed.");
    revalidateLedger();
    return null;
  });
}

export async function reorderMembers(ids: string[]): Promise<ActionResult> {
  return authedAction("Could not reorder members.", async ({ householdId }) => {
    await prisma.$transaction(
      ids.map((id, index) => prisma.shoppingMember.updateMany({ where: { id, householdId }, data: { sortOrder: index + 1 } })),
    );
    revalidateLedger();
    return null;
  });
}

/** Sets (or replaces) one member's budget for one specific year. */
export async function setYearlyBudget(raw: BudgetInput): Promise<ActionResult> {
  return authedAction("Could not update the budget. Please try again.", async ({ householdId }) => {
    const input = budgetSchema.parse(raw);
    const member = await prisma.shoppingMember.findFirst({ where: { id: input.memberId, householdId }, select: { id: true } });
    if (!member) throw new UserError("This member no longer exists.");
    await prisma.shoppingBudget.upsert({
      where: { memberId_year: { memberId: member.id, year: input.year } },
      update: { budgetAmount: money(input.amount) },
      create: { memberId: member.id, year: input.year, budgetAmount: money(input.amount) },
    });
    revalidateLedger();
    return null;
  });
}

export async function deleteYearlyBudget(memberId: string, year: number): Promise<ActionResult> {
  return authedAction("Could not remove the budget.", async ({ householdId }) => {
    const member = await prisma.shoppingMember.findFirst({ where: { id: memberId, householdId }, select: { id: true } });
    if (!member) throw new UserError("This member no longer exists.");
    await prisma.shoppingBudget.deleteMany({ where: { memberId, year } });
    revalidateLedger();
    return null;
  });
}

/** Copies every member's budget from one year into another (skipping ones already set). */
export async function copyBudgets(fromYear: number, toYear: number): Promise<ActionResult<{ copied: number }>> {
  return authedAction("Could not copy budgets.", async ({ householdId }) => {
    const source = await prisma.shoppingBudget.findMany({
      where: { year: fromYear, member: { householdId } },
      select: { memberId: true, budgetAmount: true },
    });
    const result = await prisma.shoppingBudget.createMany({
      data: source.map((b) => ({ memberId: b.memberId, year: toYear, budgetAmount: b.budgetAmount })),
      skipDuplicates: true,
    });
    revalidateLedger();
    return { copied: result.count };
  });
}
