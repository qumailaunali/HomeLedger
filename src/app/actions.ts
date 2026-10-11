"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultHousehold } from "@/lib/auth";
import { parseCalendarDate } from "@/lib/date";
import { roundMoney } from "@/lib/currency";

export async function getMetadataAction(year: number = new Date().getFullYear()) {
  const household = await getOrCreateDefaultHousehold();
  const categories = await prisma.homeCategory.findMany({
    where: { householdId: household.id, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const members = await prisma.shoppingMember.findMany({
    where: { householdId: household.id, isActive: true },
    include: {
      budgets: { where: { year } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return {
    household: {
      id: household.id,
      name: household.name,
      currency: household.currency,
      currencySymbol: household.currencySymbol,
      startingBalance: household.startingBalance,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      expected: c.expectedMonthlyAmount,
      icon: c.icon,
    })),
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      yearlyBudget: m.budgets[0]?.budgetAmount ?? 0,
    })),
  };
}

export async function createExpenseAction(data: {
  type: "HOME" | "SHOPPING" | "OUTING";
  amount: number;
  date: string;
  description: string;
  notes?: string;
  homeCategoryId?: string;
  shoppingMemberId?: string;
  place?: string;
  numberOfPeople?: number;
  paymentMethod?: string;
}) {
  const household = await getOrCreateDefaultHousehold();
  
  if (!data.amount || data.amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (!data.date) {
    throw new Error("Date is required");
  }
  if (!data.description?.trim()) {
    throw new Error("Description is required");
  }

  const parsedDate = parseCalendarDate(data.date);

  const expense = await prisma.expense.create({
    data: {
      householdId: household.id,
      type: data.type,
      amount: roundMoney(Number(data.amount)),
      date: parsedDate,
      description: data.description.trim(),
      notes: data.notes?.trim() || null,
      homeCategoryId: data.type === "HOME" ? data.homeCategoryId || null : null,
      shoppingMemberId: data.type === "SHOPPING" ? data.shoppingMemberId || null : null,
      place: data.type === "OUTING" ? data.place?.trim() || null : null,
      numberOfPeople: data.type === "OUTING" && data.numberOfPeople ? Number(data.numberOfPeople) : null,
      paymentMethod: data.type === "OUTING" ? data.paymentMethod || null : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/records");
  revalidatePath("/home");
  revalidatePath("/shopping");
  revalidatePath("/outing");
  revalidatePath("/analytics");
  return { success: true, expenseId: expense.id };
}

export async function updateExpenseAction(
  id: string,
  data: {
    amount: number;
    date: string;
    description: string;
    notes?: string;
    homeCategoryId?: string;
    shoppingMemberId?: string;
    place?: string;
    numberOfPeople?: number;
    paymentMethod?: string;
  }
) {
  const household = await getOrCreateDefaultHousehold();

  const expense = await prisma.expense.findUnique({
    where: { id },
  });
  if (!expense || expense.householdId !== household.id) {
    throw new Error("Expense not found");
  }

  await prisma.expense.update({
    where: { id },
    data: {
      amount: roundMoney(Number(data.amount)),
      date: parseCalendarDate(data.date),
      description: data.description.trim(),
      notes: data.notes?.trim() || null,
      homeCategoryId: expense.type === "HOME" ? data.homeCategoryId || null : null,
      shoppingMemberId: expense.type === "SHOPPING" ? data.shoppingMemberId || null : null,
      place: expense.type === "OUTING" ? data.place?.trim() || null : null,
      numberOfPeople: expense.type === "OUTING" && data.numberOfPeople ? Number(data.numberOfPeople) : null,
      paymentMethod: expense.type === "OUTING" ? data.paymentMethod || null : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/records");
  revalidatePath("/home");
  revalidatePath("/shopping");
  revalidatePath("/outing");
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteExpenseAction(id: string) {
  const household = await getOrCreateDefaultHousehold();
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.householdId !== household.id) {
    throw new Error("Expense not found");
  }

  await prisma.expense.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/records");
  revalidatePath("/home");
  revalidatePath("/shopping");
  revalidatePath("/outing");
  revalidatePath("/analytics");
  return { success: true };
}

export async function createIncomeAction(data: {
  amount: number;
  date: string;
  description: string;
  source?: string;
}) {
  const household = await getOrCreateDefaultHousehold();
  if (!data.amount || data.amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (!data.date) {
    throw new Error("Date is required");
  }

  await prisma.income.create({
    data: {
      householdId: household.id,
      amount: roundMoney(Number(data.amount)),
      date: parseCalendarDate(data.date),
      description: data.description.trim() || "Money received",
      source: data.source?.trim() || "House money",
    },
  });

  revalidatePath("/");
  revalidatePath("/records");
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteIncomeAction(id: string) {
  const household = await getOrCreateDefaultHousehold();
  const income = await prisma.income.findUnique({ where: { id } });
  if (!income || income.householdId !== household.id) {
    throw new Error("Income record not found");
  }

  await prisma.income.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/records");
  revalidatePath("/analytics");
  return { success: true };
}

export async function saveHomeCategoryAction(data: {
  id?: string;
  name: string;
  expectedMonthlyAmount: number;
  icon?: string;
  isActive?: boolean;
}) {
  const household = await getOrCreateDefaultHousehold();
  if (data.id) {
    await prisma.homeCategory.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        expectedMonthlyAmount: roundMoney(Number(data.expectedMonthlyAmount)),
        icon: data.icon || null,
        isActive: data.isActive ?? true,
      },
    });
  } else {
    await prisma.homeCategory.create({
      data: {
        householdId: household.id,
        name: data.name.trim(),
        expectedMonthlyAmount: roundMoney(Number(data.expectedMonthlyAmount)),
        icon: data.icon || null,
        isActive: true,
      },
    });
  }
  revalidatePath("/settings");
  revalidatePath("/settings/home-categories");
  revalidatePath("/");
  return { success: true };
}

export async function deleteHomeCategoryAction(id: string) {
  await prisma.homeCategory.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/settings/home-categories");
  revalidatePath("/");
  return { success: true };
}

export async function saveShoppingMemberAction(data: {
  id?: string;
  name: string;
  isActive?: boolean;
  yearlyBudget?: number;
  year?: number;
}) {
  const household = await getOrCreateDefaultHousehold();
  const currentYear = data.year || new Date().getFullYear();

  let memberId = data.id;
  if (memberId) {
    await prisma.shoppingMember.update({
      where: { id: memberId },
      data: {
        name: data.name.trim(),
        isActive: data.isActive ?? true,
      },
    });
  } else {
    const created = await prisma.shoppingMember.create({
      data: {
        householdId: household.id,
        name: data.name.trim(),
        isActive: true,
      },
    });
    memberId = created.id;
  }

  if (data.yearlyBudget !== undefined && memberId) {
    await prisma.shoppingBudget.upsert({
      where: {
        memberId_year: {
          memberId,
          year: currentYear,
        },
      },
      update: {
        budgetAmount: roundMoney(Number(data.yearlyBudget)),
      },
      create: {
        memberId,
        year: currentYear,
        budgetAmount: roundMoney(Number(data.yearlyBudget)),
      },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/shopping-members");
  revalidatePath("/");
  return { success: true };
}

export async function deleteShoppingMemberAction(id: string) {
  await prisma.shoppingMember.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/settings/shopping-members");
  revalidatePath("/");
  return { success: true };
}

export async function updateGeneralSettingsAction(data: {
  name: string;
  currency: string;
  currencySymbol: string;
  startingBalance: number;
}) {
  const household = await getOrCreateDefaultHousehold();
  await prisma.household.update({
    where: { id: household.id },
    data: {
      name: data.name.trim(),
      currency: data.currency.trim(),
      currencySymbol: data.currencySymbol.trim(),
      startingBalance: roundMoney(Number(data.startingBalance)),
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}

export async function resetDatabaseWithSeedAction() {
  const household = await getOrCreateDefaultHousehold();
  // Deletes all records and runs seed
  const { execSync } = await import("child_process");
  execSync("npm run seed");
  revalidatePath("/");
  revalidatePath("/records");
  revalidatePath("/settings");
  return { success: true };
}
