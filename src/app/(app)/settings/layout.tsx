import { PageHeader } from "@/components/ledger/display";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" description="Household, categories, shopping budgets and your data." />
      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        <SettingsNav />
        <div className="grid min-w-0 content-start gap-4">{children}</div>
      </div>
    </>
  );
}
