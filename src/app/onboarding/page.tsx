import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { todayIso } from "@/lib/dates";
import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "Set up your household" };

export default async function OnboardingPage() {
  const { user, household } = await requireUser();
  if (household.onboarded) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-8 pt-safe pb-safe sm:py-14">
      <OnboardingWizard
        defaultName={household.name}
        userName={user.name}
        year={Number(todayIso(household.timezone).slice(0, 4))}
      />
    </main>
  );
}
