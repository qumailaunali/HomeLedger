"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Tags } from "lucide-react";
import { categorySchema, type CategoryInput } from "@/lib/validation";
import { centsToInput } from "@/lib/money";
import { deleteCategory, reorderCategories, saveCategory, setCategoryActive } from "@/server/actions/settings";
import type { SettingsCategory } from "@/server/queries/settings";
import { useApp } from "@/components/app/app-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form-controls";
import { AmountInput } from "@/components/ledger/amount-input";
import { ConfirmDeleteDialog } from "@/components/ledger/confirm-delete-dialog";
import { EmptyState } from "@/components/ledger/display";
import { ReorderList, useOptimisticList } from "../list-editor";

export function CategoriesManager({ categories }: { categories: SettingsCategory[] }) {
  const { money } = useApp();
  const toast = useToast();
  const [items, setOrder] = useOptimisticList(categories);
  const [editing, setEditing] = React.useState<SettingsCategory | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<SettingsCategory | null>(null);
  const total = categories.filter((c) => c.isActive).reduce((s, c) => s + c.expectedCents, 0);

  const report = (res: { ok: boolean; error?: string } | null, success: string) => {
    if (res?.ok) toast.success(success);
    else toast.error(res && "error" in res && res.error ? res.error : "Something went wrong. Please try again.");
    return !!res?.ok;
  };

  return (
    <Card>
      <CardHeader className="flex-col sm:flex-row">
        <div>
          <CardTitle>Home categories</CardTitle>
          <CardDescription>
            Add, remove and reorder categories. A monthly budget is optional{total > 0 ? " · budgets total " : ""}{total > 0 && <span className="tabular font-medium text-foreground">{money(total)}</span>}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> Add category
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <EmptyState icon={Tags} title="No categories yet" description="Add categories like Food, Internet, Masi and Petrol." />
        ) : (
          <ReorderList
            items={items}
            renderMeta={(c) =>
              `${c.expectedCents ? `Budget ${money(c.expectedCents)} / month` : "No budget"} · ${c.usedBy} expense${c.usedBy === 1 ? "" : "s"}`
            }
            onReorder={async (ids) => {
              setOrder(ids);
              const res = await reorderCategories(ids).catch(() => null);
              if (!res?.ok) {
                setOrder(null);
                toast.error("Could not save the new order.");
              }
            }}
            onEdit={(c) => setEditing(c)}
            onToggle={async (c) => {
              const res = await setCategoryActive(c.id, !c.isActive).catch(() => null);
              report(res, c.isActive ? `${c.name} disabled` : `${c.name} enabled`);
            }}
            onDelete={(c) => {
              if (c.usedBy > 0) {
                toast.error(`${c.name} is used by ${c.usedBy} expense${c.usedBy === 1 ? "" : "s"}. Disable it instead so past records stay intact.`);
                return;
              }
              setDeleting(c);
            }}
          />
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add Home category" : "Edit category"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            {editing && (
              <CategoryForm
                category={editing === "new" ? null : editing}
                onDone={async (values) => {
                  const res = await saveCategory(editing === "new" ? null : editing.id, values).catch(() => null);
                  if (report(res, editing === "new" ? "Category added" : "Category updated")) setEditing(null);
                }}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete category?"
        details={deleting ? { label: deleting.name, amount: deleting.expectedCents ? `Budget ${money(deleting.expectedCents)}` : undefined } : null}
        onConfirm={async () => (deleting ? report(await deleteCategory(deleting.id).catch(() => null), "Category deleted") : true)}
      />
    </Card>
  );
}

function CategoryForm({ category, onDone }: { category: SettingsCategory | null; onDone: (v: CategoryInput) => Promise<void> }) {
  const { prefs } = useApp();
  const { register, handleSubmit, formState } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "", expectedMonthlyAmount: category ? centsToInput(category.expectedCents) : "" },
  });
  return (
    <form noValidate onSubmit={handleSubmit(onDone)} className="grid gap-4">
      <Field label="Name" htmlFor="cat-name" error={formState.errors.name?.message}>
        <Input id="cat-name" autoFocus placeholder="e.g. Internet" {...register("name")} />
      </Field>
      <Field label="Monthly budget" htmlFor="cat-amount" optional error={formState.errors.expectedMonthlyAmount?.message} hint="Leave empty for no budget.">
        <AmountInput id="cat-amount" size="default" symbol={prefs.currencySymbol} {...register("expectedMonthlyAmount")} />
      </Field>
      <Button type="submit" className="sm:ml-auto" disabled={formState.isSubmitting}>
        {formState.isSubmitting && <Loader2 className="animate-spin" />}
        Save
      </Button>
    </form>
  );
}
