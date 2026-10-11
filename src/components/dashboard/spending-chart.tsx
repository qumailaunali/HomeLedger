"use client";

import React from "react";
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

interface SpendingChartProps {
  monthlyTrend: {
    monthName: string;
    spent: number;
    received: number;
    home: number;
    shopping: number;
    outing: number;
  }[];
  homeSpent: number;
  shoppingSpent: number;
  outingSpent: number;
  currencySymbol?: string;
}

export function SpendingChart({
  monthlyTrend,
  homeSpent,
  shoppingSpent,
  outingSpent,
  currencySymbol = "Rs.",
}: SpendingChartProps) {
  const pieData = [
    { name: "Home", value: homeSpent, color: "#3b82f6" },
    { name: "Shopping", value: shoppingSpent, color: "#a855f7" },
    { name: "Outing", value: outingSpent, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const totalPie = homeSpent + shoppingSpent + outingSpent;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Monthly Spending & Inflow Trend */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Spending & Inflow Overview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              6-month trend comparison
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
              Spent
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Received
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {monthlyTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No trend data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="monthName"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    `${currencySymbol} ${Number(val).toLocaleString()}`,
                    "",
                  ]}
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderRadius: "12px",
                    border: "none",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="spent" name="Spent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Expense Category Breakdown Donut */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Category Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This month's division
          </p>
        </div>

        <div className="h-52 w-full relative flex items-center justify-center">
          {totalPie === 0 ? (
            <div className="text-xs text-slate-400 text-center">
              No expenses recorded this month
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [
                      `${currencySymbol} ${Number(val).toLocaleString()}`,
                      "",
                    ]}
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "12px",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Total</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {currencySymbol} {totalPie.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Legend pills */}
        <div className="grid grid-cols-3 gap-1 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">Home</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {totalPie > 0 ? Math.round((homeSpent / totalPie) * 100) : 0}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase">Shopping</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {totalPie > 0 ? Math.round((shoppingSpent / totalPie) * 100) : 0}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Outing</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {totalPie > 0 ? Math.round((outingSpent / totalPie) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
