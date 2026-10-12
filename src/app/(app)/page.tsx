import { requireHousehold } from "@/server/auth";
import { getDashboard } from "@/server/queries/summary";
import { monthFromParams, type SearchParams } from "@/server/params";
import { todayIso } from "@/lib/dates";
import { Dashboard } from "./dashboard";

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, household } = await requireHousehold();
  const { year, month } = monthFromParams(await searchParams, todayIso(household.timezone));
  const data = await getDashboard(household, year, month);
  return <Dashboard data={data} userName={user.name} />;
}
