import { prisma } from "./prisma";
import { getOrCreateDefaultHousehold } from "./auth";
import { addMoney, subtractMoney, roundMoney, calculatePercentage } from "./currency";
import { getMonthBounds, getYearBounds } from "./date";
import { DashboardSummary, TransactionItem } from "@/types";

export async function getHouseholdSummary(
  targetYear?: number,
  targetMonth?: number
): Promise<DashboardSummary> {
  const household = await getOrCreateDefaultHousehold();
  const now = new Date();
  const year = targetYear ?? now.getFullYear();
  const month = targetMonth ?? now.getMonth() + 1; // 1-indexed

  const { startDate: monthStart, endDate: monthEnd } = getMonthBounds(year, month);
  const { startDate: yearStart, endDate: yearEnd } = getYearBounds(year);

  // 1. All-time balance computation
  const allIncomesSum = await prisma.income.aggregate({
    where: { householdId: household.id },
    _sum: { amount: true },
  });
  const allExpensesSum = await prisma.expense.aggregate({
    where: { householdId: household.id },
    _sum: { amount: true },
  });

  const totalIncomesAllTime = allIncomesSum._sum.amount ?? 0;
  const totalExpensesAllTime = allExpensesSum._sum.amount ?? 0;
  const currentBalance = roundMoney(
    addMoney(household.startingBalance, totalIncomesAllTime) - totalExpensesAllTime
  );

  // 2. Selected Month Incomes
  const monthIncomes = await prisma.income.findMany({
    where: {
      householdId: household.id,
      date: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { date: "desc" },
  });
  const monthReceived = roundMoney(
    monthIncomes.reduce((acc, curr) => acc + curr.amount, 0)
  );

  // 3. Selected Month Expenses
  const monthExpenses = await prisma.expense.findMany({
    where: {
      householdId: household.id,
      date: { gte: monthStart, lte: monthEnd },
    },
    include: {
      homeCategory: true,
      shoppingMember: true,
    },
    orderBy: { date: "desc" },
  });

  const monthSpent = roundMoney(
    monthExpenses.reduce((acc, curr) => acc + curr.amount, 0)
  );
  const netMonthChange = roundMoney(monthReceived - monthSpent);

  const homeExpenses = monthExpenses.filter((e) => e.type === "HOME");
  const shoppingExpenses = monthExpenses.filter((e) => e.type === "SHOPPING");
  const outingExpenses = monthExpenses.filter((e) => e.type === "OUTING");

  const homeSpent = roundMoney(homeExpenses.reduce((acc, e) => acc + e.amount, 0));
  const shoppingSpent = roundMoney(
    shoppingExpenses.reduce((acc, e) => acc + e.amount, 0)
  );
  const outingSpent = roundMoney(
    outingExpenses.reduce((acc, e) => acc + e.amount, 0)
  );

  // 4. Home Categories expected vs actual
  const homeCategories = await prisma.homeCategory.findMany({
    where: { householdId: household.id, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  let homeBudgetTotal = 0;
  const homeCategoriesProgress = homeCategories.map((cat) => {
    homeBudgetTotal = addMoney(homeBudgetTotal, cat.expectedMonthlyAmount);
    const catSpent = roundMoney(
      homeExpenses
        .filter((e) => e.homeCategoryId === cat.id)
        .reduce((sum, e) => sum + e.amount, 0)
    );
    const remaining = roundMoney(cat.expectedMonthlyAmount - catSpent);
    const isOver = catSpent > cat.expectedMonthlyAmount && cat.expectedMonthlyAmount > 0;
    const pct = calculatePercentage(catSpent, cat.expectedMonthlyAmount);

    return {
      categoryId: cat.id,
      name: cat.name,
      expected: cat.expectedMonthlyAmount,
      spent: catSpent,
      remaining,
      isOverBudget: isOver,
      percentage: pct,
    };
  });

  // 5. Shopping Members yearly budget progress (for the selected year)
  const shoppingMembers = await prisma.shoppingMember.findMany({
    where: { householdId: household.id, isActive: true },
    include: {
      budgets: { where: { year } },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Year shopping expenses for each member
  const yearShoppingExpenses = await prisma.expense.findMany({
    where: {
      householdId: household.id,
      type: "SHOPPING",
      date: { gte: yearStart, lte: yearEnd },
    },
  });

  const shoppingBudgetsProgress = shoppingMembers.map((member) => {
    const budgetObj = member.budgets.find((b) => b.year === year);
    const yearlyBudget = budgetObj ? budgetObj.budgetAmount : 0;
    const spentYear = roundMoney(
      yearShoppingExpenses
        .filter((e) => e.shoppingMemberId === member.id)
        .reduce((sum, e) => sum + e.amount, 0)
    );
    const remainingBudget = roundMoney(yearlyBudget - spentYear);
    const isOverBudget = spentYear > yearlyBudget && yearlyBudget > 0;
    const overAmount = isOverBudget ? roundMoney(spentYear - yearlyBudget) : 0;
    const percentage = calculatePercentage(spentYear, yearlyBudget);

    return {
      memberId: member.id,
      name: member.name,
      yearlyBudget,
      spentYear,
      remainingBudget,
      percentage,
      isOverBudget,
      overAmount,
    };
  });

  // 6. Outing analytics
  const yearOutingExpenses = await prisma.expense.findMany({
    where: {
      householdId: household.id,
      type: "OUTING",
      date: { gte: yearStart, lte: yearEnd },
    },
    orderBy: { amount: "desc" },
  });

  const totalSpentYearOuting = roundMoney(
    yearOutingExpenses.reduce((sum, e) => sum + e.amount, 0)
  );
  const countYearOuting = yearOutingExpenses.length;
  const countMonthOuting = outingExpenses.length;
  const avgCostMonth =
    countMonthOuting > 0 ? roundMoney(outingSpent / countMonthOuting) : 0;

  const largestOutingRecord = yearOutingExpenses[0] || null;

  // 7. Recent Transactions (combining latest expenses & incomes)
  const recentExps = await prisma.expense.findMany({
    where: { householdId: household.id },
    include: { homeCategory: true, shoppingMember: true },
    orderBy: { date: "desc" },
    take: 10,
  });

  const recentIncs = await prisma.income.findMany({
    where: { householdId: household.id },
    orderBy: { date: "desc" },
    take: 5,
  });

  const combinedRecent: TransactionItem[] = [
    ...recentExps.map((e) => ({
      id: e.id,
      type: e.type as "HOME" | "SHOPPING" | "OUTING",
      amount: e.amount,
      date: e.date.toISOString(),
      description: e.description,
      notes: e.notes,
      homeCategory: e.homeCategory ? { id: e.homeCategory.id, name: e.homeCategory.name } : null,
      shoppingMember: e.shoppingMember ? { id: e.shoppingMember.id, name: e.shoppingMember.name } : null,
      place: e.place,
      numberOfPeople: e.numberOfPeople,
      paymentMethod: e.paymentMethod,
    })),
    ...recentIncs.map((i) => ({
      id: i.id,
      type: "RECEIVED" as const,
      amount: i.amount,
      date: i.date.toISOString(),
      description: i.description,
      source: i.source,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
   .slice(0, 10);

  // 8. Monthly trend for the past 6 months
  const monthlyTrend: DashboardSummary["monthlyTrend"] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  for (let i = 5; i >= 0; i--) {
    let tMonth = month - i;
    let tYear = year;
    if (tMonth <= 0) {
      tMonth += 12;
      tYear -= 1;
    }
    const bounds = getMonthBounds(tYear, tMonth);
    const mExps = await prisma.expense.findMany({
      where: {
        householdId: household.id,
        date: { gte: bounds.startDate, lte: bounds.endDate },
      },
    });
    const mIncs = await prisma.income.findMany({
      where: {
        householdId: household.id,
        date: { gte: bounds.startDate, lte: bounds.endDate },
      },
    });

    const mHome = mExps.filter((e) => e.type === "HOME").reduce((s, e) => s + e.amount, 0);
    const mShop = mExps.filter((e) => e.type === "SHOPPING").reduce((s, e) => s + e.amount, 0);
    const mOut = mExps.filter((e) => e.type === "OUTING").reduce((s, e) => s + e.amount, 0);
    const mSpent = mHome + mShop + mOut;
    const mRecv = mIncs.reduce((s, i) => s + i.amount, 0);

    monthlyTrend.push({
      monthName: `${monthNames[tMonth - 1]} ${tYear === year ? "" : "'" + String(tYear).slice(2)}`,
      month: tMonth,
      year: tYear,
      spent: roundMoney(mSpent),
      received: roundMoney(mRecv),
      home: roundMoney(mHome),
      shopping: roundMoney(mShop),
      outing: roundMoney(mOut),
    });
  }

  // 9. Warnings logic
  const warnings: string[] = [];
  for (const s of shoppingBudgetsProgress) {
    if (s.isOverBudget) {
      warnings.push(`${s.name} is ${household.currencySymbol} ${s.overAmount.toLocaleString()} over the yearly shopping budget.`);
    } else if (s.percentage >= 80) {
      warnings.push(`${s.name} has used ${s.percentage}% of their yearly shopping budget.`);
    }
  }

  for (const h of homeCategoriesProgress) {
    if (h.isOverBudget) {
      warnings.push(`${h.name} spending is ${h.percentage}% of the monthly expected budget.`);
    }
  }

  return {
    household: {
      id: household.id,
      name: household.name,
      currency: household.currency,
      currencySymbol: household.currencySymbol,
      startingBalance: household.startingBalance,
      dateFormat: household.dateFormat,
    },
    selectedMonth: month,
    selectedYear: year,
    currentBalance,
    monthReceived,
    monthSpent,
    netMonthChange,
    homeSpent,
    shoppingSpent,
    outingSpent,
    homeBudgetTotal: roundMoney(homeBudgetTotal),
    recentTransactions: combinedRecent,
    monthlyTrend,
    shoppingBudgetsProgress,
    homeCategoriesProgress,
    outingSummary: {
      totalSpentMonth: outingSpent,
      totalSpentYear: totalSpentYearOuting,
      countMonth: countMonthOuting,
      countYear: countYearOuting,
      averageCost: avgCostMonth,
      largestOuting: largestOutingRecord
        ? {
            place: largestOutingRecord.place || "Restaurant",
            amount: largestOutingRecord.amount,
            date: largestOutingRecord.date.toISOString(),
          }
        : null,
    },
    warnings,
  };
}

export async function getAllTransactionsList(options: {
  year?: number;
  month?: number;
  type?: string;
  search?: string;
  categoryId?: string;
  memberId?: string;
}) {
  const household = await getOrCreateDefaultHousehold();
  
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (options.year && options.month) {
    const { startDate, endDate } = getMonthBounds(options.year, options.month);
    dateFilter = { gte: startDate, lte: endDate };
  } else if (options.year) {
    const { startDate, endDate } = getYearBounds(options.year);
    dateFilter = { gte: startDate, lte: endDate };
  }

  const expenseWhere: Record<string, unknown> = {
    householdId: household.id,
  };
  if (dateFilter) expenseWhere.date = dateFilter;
  if (options.type && options.type !== "ALL" && options.type !== "RECEIVED") {
    expenseWhere.type = options.type;
  }
  if (options.categoryId) expenseWhere.homeCategoryId = options.categoryId;
  if (options.memberId) expenseWhere.shoppingMemberId = options.memberId;

  const expenses = options.type === "RECEIVED" ? [] : await prisma.expense.findMany({
    where: expenseWhere,
    include: { homeCategory: true, shoppingMember: true },
    orderBy: { date: "desc" },
  });

  const incomeWhere: Record<string, unknown> = {
    householdId: household.id,
  };
  if (dateFilter) incomeWhere.date = dateFilter;

  const incomes =
    options.type && options.type !== "ALL" && options.type !== "RECEIVED"
      ? []
      : await prisma.income.findMany({
          where: incomeWhere,
          orderBy: { date: "desc" },
        });

  // Combine into unified list
  let transactions: TransactionItem[] = [
    ...expenses.map((e) => ({
      id: e.id,
      type: e.type as "HOME" | "SHOPPING" | "OUTING",
      amount: e.amount,
      date: e.date.toISOString(),
      description: e.description,
      notes: e.notes,
      homeCategory: e.homeCategory ? { id: e.homeCategory.id, name: e.homeCategory.name } : null,
      shoppingMember: e.shoppingMember ? { id: e.shoppingMember.id, name: e.shoppingMember.name } : null,
      place: e.place,
      numberOfPeople: e.numberOfPeople,
      paymentMethod: e.paymentMethod,
    })),
    ...incomes.map((i) => ({
      id: i.id,
      type: "RECEIVED" as const,
      amount: i.amount,
      date: i.date.toISOString(),
      description: i.description,
      source: i.source,
    })),
  ];

  // Search filter
  if (options.search && options.search.trim()) {
    const query = options.search.toLowerCase().trim();
    transactions = transactions.filter((t) => {
      const desc = (t.description || "").toLowerCase();
      const place = (t.place || "").toLowerCase();
      const cat = (t.homeCategory?.name || "").toLowerCase();
      const mem = (t.shoppingMember?.name || "").toLowerCase();
      const amt = String(t.amount);
      const src = (t.source || "").toLowerCase();
      return (
        desc.includes(query) ||
        place.includes(query) ||
        cat.includes(query) ||
        mem.includes(query) ||
        amt.includes(query) ||
        src.includes(query)
      );
    });
  }

  // Sort ascending by date for accurate running balance calculation
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Running balance calculation
  let running = household.startingBalance;
  // If we filtered by month or year, calculate starting balance before this window
  if (dateFilter?.gte) {
    const prevIncomes = await prisma.income.aggregate({
      where: { householdId: household.id, date: { lt: dateFilter.gte } },
      _sum: { amount: true },
    });
    const prevExpenses = await prisma.expense.aggregate({
      where: { householdId: household.id, date: { lt: dateFilter.gte } },
      _sum: { amount: true },
    });
    running = roundMoney(
      household.startingBalance +
        (prevIncomes._sum.amount ?? 0) -
        (prevExpenses._sum.amount ?? 0)
    );
  }

  for (const t of transactions) {
    if (t.type === "RECEIVED") {
      running = addMoney(running, t.amount);
    } else {
      running = subtractMoney(running, t.amount);
    }
    t.balanceAfter = running;
  }

  // Return reverse chronological (newest first)
  return transactions.reverse();
}
