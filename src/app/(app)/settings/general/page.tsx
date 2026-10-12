import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { centsToInput } from "@/lib/money";
import { GeneralForm } from "./general-form";

export const metadata: Metadata = { title: "General settings" };

export default async function GeneralSettingsPage() {
  const { household } = await requireHousehold();
  return (
    <GeneralForm
      defaults={{
        name: household.name,
        currency: household.currency,
        currencySymbol: household.currencySymbol,
        startingBalance: centsToInput(household.startingBalanceCents),
        dateFormat: household.dateFormat as "MMM D, YYYY",
        timezone: household.timezone,
      }}
    />
  );
}
