import type { Metadata } from "next";
import { str, type SearchParams } from "@/server/params";
import { NewExpense } from "./new-expense";
import type { ExpenseType } from "@/types";

export const metadata: Metadata = { title: "Add Expense" };

export default async function NewExpensePage({ searchParams }: { searchParams: SearchParams }) {
  const t = str(await searchParams, "type")?.toUpperCase();
  const type = t === "HOME" || t === "SHOPPING" || t === "OUTING" ? (t as ExpenseType) : undefined;
  return <NewExpense type={type} />;
}
