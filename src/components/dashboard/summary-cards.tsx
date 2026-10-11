"use client";

import React from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Home,
  ShoppingBag,
  Coffee,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface SummaryCardsProps {
  currentBalance: number;
  monthReceived: number;
  monthSpent: number;
  netMonthChange: number;
  homeSpent: number;
  shoppingSpent: number;
  outingSpent: number;
  homeBudgetTotal: number;
  currencySymbol?: string;
}

export function SummaryCards({
  currentBalance,
  monthReceived,
  monthSpent,
  netMonthChange,
  homeSpent,
  shoppingSpent,
  outingSpent,
  homeBudgetTotal,
  currencySymbol = "Rs.",
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Current Available Balance */}
      <div className="col-span-2 sm:col-span-1 md:col-span-1 lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/15 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-100">
            Available Balance
          </span>
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <Wallet className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="my-3">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {currencySymbol} {currentBalance.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-100">
            {netMonthChange >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
            )}
            <span>
              {netMonthChange >= 0 ? "+" : ""}
              {currencySymbol} {netMonthChange.toLocaleString()} this month
            </span>
          </div>
        </div>

        <div className="text-[11px] text-blue-200/80">
          Auto-updated across all records
        </div>
      </div>

      {/* 2. Received This Month */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Received
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {currencySymbol} {monthReceived.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            This month
          </span>
        </div>
      </div>

      {/* 3. Spent This Month */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Spent
          </span>
          <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {currencySymbol} {monthSpent.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            Across 3 categories
          </span>
        </div>
      </div>

      {/* 4. Home Expenses */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Home
          </span>
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Home className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {currencySymbol} {homeSpent.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            Budget: {currencySymbol} {homeBudgetTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 5. Shopping Expenses */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Shopping
          </span>
          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <ShoppingBag className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {currencySymbol} {shoppingSpent.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            Family purchases
          </span>
        </div>
      </div>

      {/* 6. Outing Expenses */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Outing
          </span>
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Coffee className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {currencySymbol} {outingSpent.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            Dining & leisure
          </span>
        </div>
      </div>
    </div>
  );
}
