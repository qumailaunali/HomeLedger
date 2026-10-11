"use client";

import React, { useState } from "react";
import {
  Settings,
  Layers,
  Users,
  Database,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { HouseholdData, HomeCategoryItem, ShoppingMemberItem } from "@/types";
import { useToast } from "@/components/ui/toast";
import {
  updateGeneralSettingsAction,
  saveHomeCategoryAction,
  deleteHomeCategoryAction,
  saveShoppingMemberAction,
  deleteShoppingMemberAction,
  resetDatabaseWithSeedAction,
} from "@/app/actions";

interface SettingsClientProps {
  household: HouseholdData;
  categories: HomeCategoryItem[];
  members: ShoppingMemberItem[];
}

export function SettingsClient({
  household,
  categories,
  members,
}: SettingsClientProps) {
  const { success, error, info } = useToast();
  const [activeTab, setActiveTab] = useState<"general" | "home-categories" | "shopping-members" | "data">("general");

  // General Settings state
  const [name, setName] = useState(household.name);
  const [currency, setCurrency] = useState(household.currency);
  const [currencySymbol, setCurrencySymbol] = useState(household.currencySymbol);
  const [startingBalance, setStartingBalance] = useState(String(household.startingBalance));
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Category modal / editing state
  const [newCatName, setNewCatName] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");
  const [isAddingCat, setIsAddingCat] = useState(false);

  // Shopping member state
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberBudget, setNewMemberBudget] = useState("35000");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Reset state
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    try {
      await updateGeneralSettingsAction({
        name,
        currency,
        currencySymbol,
        startingBalance: parseFloat(startingBalance) || 0,
      });
      success("General household settings updated successfully!");
    } catch {
      error("Failed to update settings.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      error("Please enter a category name.");
      return;
    }
    setIsAddingCat(true);
    try {
      await saveHomeCategoryAction({
        name: newCatName.trim(),
        expectedMonthlyAmount: parseFloat(newCatBudget) || 0,
      });
      success(`Added category "${newCatName.trim()}"!`);
      setNewCatName("");
      setNewCatBudget("");
    } catch {
      error("Failed to add category.");
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;
    try {
      await deleteHomeCategoryAction(id);
      success("Category deleted.");
    } catch {
      error("Failed to delete category.");
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      error("Please enter a member name.");
      return;
    }
    setIsAddingMember(true);
    try {
      await saveShoppingMemberAction({
        name: newMemberName.trim(),
        yearlyBudget: parseFloat(newMemberBudget) || 0,
        year: selectedYear,
      });
      success(`Added member "${newMemberName.trim()}" for ${selectedYear}!`);
      setNewMemberName("");
      setNewMemberBudget("35000");
    } catch {
      error("Failed to add member.");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleDeleteMember = async (id: string, memName: string) => {
    if (!confirm(`Are you sure you want to delete member "${memName}"?`)) return;
    try {
      await deleteShoppingMemberAction(id);
      success("Member deleted.");
    } catch {
      error("Failed to delete member.");
    }
  };

  const handleResetData = async () => {
    if (!confirm("This will reload sample Pakistani household demo records and budgets into Neon PostgreSQL. Continue?")) return;
    setIsResetting(true);
    try {
      await resetDatabaseWithSeedAction();
      success("Sample database re-seeded successfully!");
      window.location.reload();
    } catch {
      error("Failed to reset database.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "general"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>General</span>
        </button>

        <button
          onClick={() => setActiveTab("home-categories")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "home-categories"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Home Categories</span>
        </button>

        <button
          onClick={() => setActiveTab("shopping-members")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "shopping-members"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Shopping Members</span>
        </button>

        <button
          onClick={() => setActiveTab("data")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "data"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data Management</span>
        </button>
      </div>

      {/* 1. General Settings Tab */}
      {activeTab === "general" && (
        <form
          onSubmit={handleSaveGeneral}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-2xl space-y-4"
        >
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            General Household Configuration
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Household Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Currency Code
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="PKR"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="Rs."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Starting Balance ({currencySymbol})
            </label>
            <input
              type="number"
              step="any"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Base funds when you started tracking in HomeLedger.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingGeneral}
              className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 flex items-center gap-2"
            >
              {isSavingGeneral ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. Home Categories Tab */}
      {activeTab === "home-categories" && (
        <div className="space-y-4 max-w-4xl">
          {/* Add Category Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
              Add New Home Expense Category
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category Name (e.g. Electricity, School Fee)"
                className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              />
              <input
                type="number"
                value={newCatBudget}
                onChange={(e) => setNewCatBudget(e.target.value)}
                placeholder="Expected Monthly (Rs.)"
                className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={isAddingCat}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isAddingCat && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {/* Existing Categories List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
              Configured Categories ({categories.length})
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">{c.name}</span>
                    <span className="text-xs text-slate-400 block">
                      Expected Monthly: {household.currencySymbol} {c.expectedMonthlyAmount.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(c.id, c.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Shopping Members & Yearly Budgets Tab */}
      {activeTab === "shopping-members" && (
        <div className="space-y-4 max-w-4xl">
          {/* Add Member Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
              Add Family Member & Yearly Limit
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Member Name (e.g. Sarah, Qumail)"
                className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              />
              <input
                type="number"
                value={newMemberBudget}
                onChange={(e) => setNewMemberBudget(e.target.value)}
                placeholder="Yearly Budget (Rs.)"
                className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={isAddingMember}
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isAddingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            </div>
          </div>

          {/* Members List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
              Shopping Members & Budgets ({members.length})
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m) => {
                const budgetObj = m.budgets?.find((b) => b.year === 2026) || m.budgets?.[0];
                return (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">{m.name}</span>
                      <span className="text-xs text-slate-400 block">
                        Yearly Budget: {household.currencySymbol} {(budgetObj?.budgetAmount || 0).toLocaleString()} (2026)
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteMember(m.id, m.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Data Management Tab */}
      {activeTab === "data" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-2xl space-y-5">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Database & Demo Management
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connected directly to Neon PostgreSQL with Prisma ORM.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Database Provider
            </span>
            <div className="text-xs text-slate-500 font-mono">
              PostgreSQL (Neon Cloud Serverless)
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                Re-seed Realistic Demo Records
              </h4>
              <p className="text-xs text-slate-400">
                Populates the categories, shopping limits, and October transactions.
              </p>
            </div>
            <button
              onClick={handleResetData}
              disabled={isResetting}
              className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Reset & Seed Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
