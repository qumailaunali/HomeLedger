"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DashboardSummary } from "@/types";
import { ArrowUpRight, TrendingUp, DollarSign, Award, Users, Coffee } from "lucide-react";

interface AnalyticsClientProps {
  summary: DashboardSummary;
}

export function AnalyticsClient({ summary }: AnalyticsClientProps) {
  const { household, monthlyTrend, homeCategoriesProgress, shoppingBudgetsProgress, outingSummary } = summary;
  const currencySymbol = household.currencySymbol;

  // Compute analytics numbers
  const totalTrendSpent = monthlyTrend.reduce((sum, m) => sum + m.spent, 0);
  const avgMonthlySpent = monthlyTrend.length > 0 ? Math.round(totalTrendSpent / monthlyTrend.length) : 0;
  
  // Highest spending month
  const sortedMonths = [...monthlyTrend].sort((a, b) => b.spent - a.spent);
  const highestMonth = sortedMonths[0] || null;

  // Home categories sorted by highest spending
  const sortedHomeCats = [...homeCategoriesProgress].sort((a, b) => b.spent - a.spent);
  const totalHomeSpent = sortedHomeCats.reduce((sum, c) => sum + c.spent, 0);

  // Highest shopping spender
  const sortedShoppingMembers = [...shoppingBudgetsProgress].sort((a, b) => b.spentYear - a.spentYear);
  const highestSpender = sortedShoppingMembers[0] || null;
  const totalShoppingBudget = shoppingBudgetsProgress.reduce((sum, m) => sum + m.yearlyBudget, 0);
  const totalShoppingSpentYear = shoppingBudgetsProgress.reduce((sum, m) => sum + m.spentYear, 0);
  const totalShoppingRemaining = totalShoppingBudget - totalShoppingSpentYear;

  // Shopping bar chart data
  const shoppingChartData = shoppingBudgetsProgress.map((m) => ({
    name: m.name,
    spent: m.spentYear,
    budget: m.yearlyBudget,
    remaining: Math.max(m.remainingBudget, 0),
  }));

  return (
    <div className="space-y-6">
      {/* Top 4 Insight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Spending (6 Months) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            6-Month Total Spending
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {currencySymbol} {totalTrendSpent.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Across recent months
          </span>
        </div>

        {/* Monthly Average */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Average Monthly Spending
          </span>
          <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {currencySymbol} {avgMonthlySpent.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Normalized expenditure
          </span>
        </div>

        {/* Highest Spending Month */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Peak Spending Month
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {highestMonth ? `${currencySymbol} ${highestMonth.spent.toLocaleString()}` : "—"}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block">
            {highestMonth ? highestMonth.monthName : "No data"}
          </span>
        </div>

        {/* Combined Shopping Budget Remaining */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Shopping Budget Left
          </span>
          <div className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {currencySymbol} {totalShoppingRemaining.toLocaleString()}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Combined family limit
          </span>
        </div>
      </div>

      {/* Monthly Category Trends Breakdown Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Category Spending Trends
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stacked breakdown of Home, Shopping, and Outing expenditures
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
              Home
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-600 inline-block" />
              Shopping
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
              Outing
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="monthName" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip
                formatter={(val: unknown) => [`${currencySymbol} ${Number(val).toLocaleString()}`, ""]}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: "12px",
                  border: "none",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="home" name="Home" fill="#3b82f6" stackId="a" />
              <Bar dataKey="shopping" name="Shopping" fill="#a855f7" stackId="a" />
              <Bar dataKey="outing" name="Outing" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid of Section 19 (Home Categories) and Section 20 (Shopping Comparison) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 19: Home Category Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Home Expense Categories Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Which household categories consume the most money
            </p>
          </div>

          <div className="space-y-3">
            {sortedHomeCats.map((cat) => {
              const share = totalHomeSpent > 0 ? Math.round((cat.spent / totalHomeSpent) * 100) : 0;
              return (
                <div key={cat.categoryId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {cat.name}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {currencySymbol} {cat.spent.toLocaleString()} ({share}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 20: Family Shopping Comparison */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Family Shopping Comparison
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Yearly budget vs actual spending per family member
                </p>
              </div>
              {highestSpender && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                  Top Spender: {highestSpender.name}
                </span>
              )}
            </div>

            <div className="h-60 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shoppingChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [`${currencySymbol} ${Number(val).toLocaleString()}`, ""]}
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="spent" name="Spent" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budget" name="Yearly Limit" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Total Family Shopping: {currencySymbol} {totalShoppingSpentYear.toLocaleString()}</span>
            <span>Limit: {currencySymbol} {totalShoppingBudget.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
