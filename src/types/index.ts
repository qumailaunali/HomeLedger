export type ExpenseType = "HOME" | "SHOPPING" | "OUTING";

export interface HouseholdData {
  id: string;
  name: string;
  currency: string;
  currencySymbol: string;
  startingBalance: number;
  dateFormat: string;
}

export interface HomeCategoryItem {
  id: string;
  name: string;
  expectedMonthlyAmount: number;
  isActive: boolean;
  sortOrder: number;
  icon?: string | null;
}

export interface ShoppingMemberItem {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  budgets?: {
    id: string;
    year: number;
    budgetAmount: number;
  }[];
}

export interface TransactionItem {
  id: string;
  type: "HOME" | "SHOPPING" | "OUTING" | "RECEIVED";
  amount: number;
  date: string; // ISO date
  description: string;
  notes?: string | null;
  // Relations
  homeCategory?: { id: string; name: string } | null;
  shoppingMember?: { id: string; name: string } | null;
  place?: string | null;
  numberOfPeople?: number | null;
  paymentMethod?: string | null;
  source?: string | null; // For received money
  balanceAfter?: number;
}

export interface DashboardSummary {
  household: HouseholdData;
  selectedMonth: number;
  selectedYear: number;
  currentBalance: number;
  monthReceived: number;
  monthSpent: number;
  netMonthChange: number;
  homeSpent: number;
  shoppingSpent: number;
  outingSpent: number;
  homeBudgetTotal: number;
  recentTransactions: TransactionItem[];
  monthlyTrend: {
    monthName: string;
    month: number;
    year: number;
    spent: number;
    received: number;
    home: number;
    shopping: number;
    outing: number;
  }[];
  shoppingBudgetsProgress: {
    memberId: string;
    name: string;
    yearlyBudget: number;
    spentYear: number;
    remainingBudget: number;
    percentage: number;
    isOverBudget: boolean;
    overAmount: number;
  }[];
  homeCategoriesProgress: {
    categoryId: string;
    name: string;
    expected: number;
    spent: number;
    remaining: number;
    isOverBudget: boolean;
    percentage: number;
  }[];
  outingSummary: {
    totalSpentMonth: number;
    totalSpentYear: number;
    countMonth: number;
    countYear: number;
    averageCost: number;
    largestOuting: {
      place: string;
      amount: number;
      date: string;
    } | null;
  };
  warnings: string[];
}
