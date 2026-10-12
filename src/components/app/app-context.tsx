"use client";

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import type { CategoryOption, ExpenseType, HouseholdPrefs, MemberOption, TransactionRow } from "@/types";

export interface ExpenseDialogOptions {
  type?: ExpenseType;
  categoryId?: string;
  memberId?: string;
  /** When set, the dialog edits this transaction instead of creating one. */
  edit?: TransactionRow;
}

export interface AppContextValue {
  prefs: HouseholdPrefs;
  categories: CategoryOption[];
  members: MemberOption[];
  balanceCents: number;
  money: (cents: number, opts?: { signed?: boolean }) => string;
  date: (iso: string) => string;
  openExpense: (opts?: ExpenseDialogOptions) => void;
  openIncome: (edit?: TransactionRow) => void;
  openTransaction: (row: TransactionRow) => void;
}

export const AppContext = React.createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside the app shell");
  return ctx;
}

export function useFormatters(prefs: HouseholdPrefs) {
  return React.useMemo(
    () => ({
      money: (cents: number, opts?: { signed?: boolean }) => formatMoney(cents, prefs.currencySymbol, opts),
      date: (iso: string) => formatDate(iso, prefs.dateFormat),
    }),
    [prefs.currencySymbol, prefs.dateFormat],
  );
}
