import type { BudgetLine, MonthTotals, PeriodTotals, Warning } from "@/lib/calculations";
import type { IsoDate } from "@/lib/dates";

/** All money values are integer cents. All dates are "YYYY-MM-DD". */

export type ExpenseType = "HOME" | "SHOPPING" | "OUTING";
export type TransactionType = ExpenseType | "RECEIVED";

export interface HouseholdPrefs {
  name: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timezone: string;
  today: IsoDate;
}

export interface CategoryOption {
  id: string;
  name: string;
  expectedCents: number;
  /** Spent in the current calendar month (for quick-entry hints). */
  spentCents?: number;
}

export interface MemberOption {
  id: string;
  name: string;
  /** Budget for the current year. */
  budgetCents: number;
  /** Spent in the current year (for quick-entry hints). */
  spentCents?: number;
}

export interface TransactionRow {
  id: string;
  kind: "EXPENSE" | "INCOME";
  type: TransactionType;
  amountCents: number;
  date: IsoDate;
  description: string;
  notes: string | null;
  place: string | null;
  numberOfPeople: number | null;
  paymentMethod: string | null;
  source: string | null;
  homeCategoryId: string | null;
  categoryName: string | null;
  shoppingMemberId: string | null;
  memberName: string | null;
  /** Household balance right after this transaction. */
  balanceCents: number;
  /** Shopping only: member's yearly budget left after this purchase. */
  budgetRemainingCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerFilters {
  from?: IsoDate;
  to?: IsoDate;
  type?: TransactionType | "ALL" | "EXPENSES";
  categoryId?: string;
  memberId?: string;
  search?: string;
  sort?: "date" | "amount";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface LedgerPage {
  rows: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  spentCents: number;
  receivedCents: number;
}

export interface DashboardData {
  year: number;
  month: number;
  balanceCents: number;
  current: PeriodTotals;
  previous: PeriodTotals;
  trend: MonthTotals[];
  home: BudgetLine[];
  homeTotals: { budgetCents: number; spentCents: number; remainingCents: number };
  shopping: BudgetLine[];
  shoppingTotals: { budgetCents: number; spentCents: number; remainingCents: number };
  recent: TransactionRow[];
  largest: TransactionRow[];
  outingCount: number;
  warnings: Warning[];
}

export type { BudgetLine, MonthTotals, PeriodTotals, Warning };
