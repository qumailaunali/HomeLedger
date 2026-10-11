"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  PlusCircle,
  ArrowDownLeft,
  Calendar,
} from "lucide-react";
import { formatMonthYear } from "@/lib/date";

interface TopBarProps {
  currentMonth: number;
  currentYear: number;
  householdName: string;
  currencySymbol: string;
  currentBalance: number;
  onOpenAddExpense: () => void;
  onOpenReceiveMoney: () => void;
}

export function TopBar({
  currentMonth,
  currentYear,
  householdName,
  currencySymbol,
  currentBalance,
  onOpenAddExpense,
  onOpenReceiveMoney,
}: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();

  const handleMonthChange = (offset: number) => {
    let nextMonth = currentMonth + offset;
    let nextYear = currentYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(now.getMonth() + 1));
    params.set("year", String(now.getFullYear()));
    router.push(`${pathname}?${params.toString()}`);
  };

  const now = new Date();
  const isCurrentCalendarMonth =
    currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear();

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 lg:px-8 py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Title or Desktop breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="lg:hidden flex items-center gap-2">
            <span className="font-bold text-base text-slate-900 dark:text-white">
              HomeLedger
            </span>
          </div>

          {/* Month Selector Component (Section 17) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200/60 dark:border-slate-800">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-2.5 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 opacity-60 hidden sm:inline" />
              <span>{formatMonthYear(currentYear, currentMonth)}</span>
            </div>

            <button
              onClick={() => handleMonthChange(1)}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isCurrentCalendarMonth && (
            <button
              onClick={handleThisMonth}
              className="hidden sm:inline-flex text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 transition-colors"
            >
              This Month
            </button>
          )}
        </div>

        {/* Right side: Quick actions & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Quick Balance indicator on desktop */}
          <div className="hidden md:flex flex-col text-right pr-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Available Balance</span>
            <span className={`text-sm font-bold ${currentBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {currencySymbol} {currentBalance.toLocaleString()}
            </span>
          </div>

          {/* Quick Desktop Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onOpenReceiveMoney}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-medium text-xs border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receive</span>
            </button>
            <button
              onClick={onOpenAddExpense}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm shadow-blue-500/25 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          </div>

          {/* Theme Switcher (Light / Dark) */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
