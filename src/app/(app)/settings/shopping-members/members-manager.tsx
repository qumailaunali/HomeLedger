"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Plus, Users } from "lucide-react";
import { deleteMember, reorderMembers, saveMember, setMemberActive } from "@/server/actions/settings";
import type { SettingsMember } from "@/server/queries/settings";
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

export function MembersManager({ members, year }: { members: SettingsMember[]; year: number }) {
  const { money, prefs } = useApp();
  const toast = useToast();
  const [items, setOrder] = useOptimisticList(members);
  const [editing, setEditing] = React.useState<SettingsMember | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<SettingsMember | null>(null);
  const [name, setName] = React.useState("");
  const [budget, setBudget] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const report = (res: { ok: boolean; error?: string } | null, success: string) => {
    if (res?.ok) toast.success(success);
    else toast.error(res && "error" in res && res.error ? res.error : "Something went wrong. Please try again.");
    return !!res?.ok;
  };

  const open = (m: SettingsMember | "new") => {
    setName(m === "new" ? "" : m.name);
    setBudget("");
    setEditing(m);
  };

  return (
    <Card>
      <CardHeader className="flex-col sm:flex-row">
        <div>
          <CardTitle>Shopping members</CardTitle>
          <CardDescription>
            People (or groups like &ldquo;Others&rdquo;) with their own yearly shopping budget. Yearly amounts are set in{" "}
            <Link href="/settings/budgets" className="font-medium text-foreground underline underline-offset-2">
              Shopping Budgets
            </Link>
            .
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => open("new")}>
          <Plus /> Add person
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <EmptyState icon={Users} title="No members yet" description="Add Sarah, Qumail, Taha, Farida and Others." />
        ) : (
          <ReorderList
            items={items}
            renderMeta={(m) => {
              const b = m.budgets.find((x) => x.year === year);
              return `${year} budget: ${b ? money(b.cents) : "not set"} · ${m.usedBy} purchase${m.usedBy === 1 ? "" : "s"}`;
            }}
            onReorder={async (ids) => {
              setOrder(ids);
              const res = await reorderMembers(ids).catch(() => null);
              if (!res?.ok) {
                setOrder(null);
                toast.error("Could not save the new order.");
              }
            }}
            onEdit={open}
            onToggle={async (m) => report(await setMemberActive(m.id, !m.isActive).catch(() => null), m.isActive ? `${m.name} disabled` : `${m.name} enabled`)}
            onDelete={(m) => {
              if (m.usedBy > 0) {
                toast.error(`${m.name} has ${m.usedBy} shopping record${m.usedBy === 1 ? "" : "s"}. Disable instead so past records stay intact.`);
                return;
              }
              setDeleting(m);
            }}
          />
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add person" : "Rename person"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <form
              className="grid gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editing) return;
                setSaving(true);
                const res = await saveMember(editing === "new" ? null : editing.id, {
                  name,
                  ...(editing === "new" && budget ? { year, budget } : {}),
                }).catch(() => null);
                setSaving(false);
                if (report(res, editing === "new" ? "Person added" : "Person updated")) setEditing(null);
              }}
            >
              <Field label="Name" htmlFor="member-name">
                <Input id="member-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah" />
              </Field>
              {editing === "new" && (
                <Field label={`Yearly budget for ${year}`} htmlFor="member-budget" optional>
                  <AmountInput id="member-budget" size="default" symbol={prefs.currencySymbol} value={budget} onChange={(e) => setBudget(e.target.value)} />
                </Field>
              )}
              <Button type="submit" className="sm:ml-auto" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="animate-spin" />}
                Save
              </Button>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove person?"
        confirmLabel="Remove"
        details={deleting ? { label: deleting.name, amount: `${deleting.budgets.length} yearly budget${deleting.budgets.length === 1 ? "" : "s"}` } : null}
        onConfirm={async () => (deleting ? report(await deleteMember(deleting.id).catch(() => null), "Person removed") : true)}
      />
    </Card>
  );
}
