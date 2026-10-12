"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ledger/display";
import { ExpenseForm } from "@/components/forms/expense-form";
import type { ExpenseType } from "@/types";

export function NewExpense({ type }: { type?: ExpenseType }) {
  const router = useRouter();
  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <PageHeader title="Add Expense" />
      <Card>
        <CardContent>
          <ExpenseForm type={type} onDone={() => router.push("/")} />
        </CardContent>
      </Card>
    </div>
  );
}
