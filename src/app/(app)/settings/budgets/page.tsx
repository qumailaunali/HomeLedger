import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getAllMembers } from "@/server/queries/settings";
import { str, type SearchParams } from "@/server/params";
import { todayIso } from "@/lib/dates";
import { BudgetsManager } from "./budgets-manager";

export const metadata: Metadata = { title: "Shopping budgets" };

export default async function BudgetsPage({ searchParams }: { searchParams: SearchParams }) {
  const { household } = await requireHousehold();
  const currentYear = Number(todayIso(household.timezone).slice(0, 4));
  const y = Number(str(await searchParams, "year"));
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : currentYear;
  const members = await getAllMembers(household.id);
  return <BudgetsManager members={members} year={year} currentYear={currentYear} />;
}
