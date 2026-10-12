import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getAllMembers } from "@/server/queries/settings";
import { todayIso } from "@/lib/dates";
import { MembersManager } from "./members-manager";

export const metadata: Metadata = { title: "Shopping members" };

export default async function ShoppingMembersPage() {
  const { household } = await requireHousehold();
  const members = await getAllMembers(household.id);
  return <MembersManager members={members} year={Number(todayIso(household.timezone).slice(0, 4))} />;
}
