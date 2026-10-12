"use client";

import * as React from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { previewRestore, restoreBackup, type RestorePreview } from "@/server/actions/data";
import { formatTimestamp } from "@/lib/dates";
import { useApp } from "@/components/app/app-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-controls";

/** Restore from a JSON backup: preview what's inside, then type RESTORE to replace everything. */
export function RestorePanel() {
  const { prefs } = useApp();
  const toast = useToast();
  const [json, setJson] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<RestorePreview | null>(null);
  const [confirmText, setConfirmText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setBusy(true);
    const text = await file.text();
    const res = await previewRestore(text).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      toast.error(res && !res.ok ? res.error : "Could not read the backup file.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setJson(text);
    setPreview(res.data);
  }

  async function restore() {
    if (!json) return;
    setBusy(true);
    const res = await restoreBackup(json).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) return toast.error(res && !res.ok ? res.error : "Restore failed — your existing data was not changed.");
    toast.success("Backup restored");
    setJson(null);
    setPreview(null);
    setConfirmText("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Restore from backup</CardTitle>
          <CardDescription>Replaces all current data with a JSON backup. You will see what is inside first.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          aria-label="Choose backup file"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        {preview && (
          <div className="grid gap-4 rounded-xl border border-danger/30 bg-danger-soft/40 p-4">
            <div className="text-sm">
              <p className="font-medium">
                {preview.householdName} · backed up {formatTimestamp(preview.exportedAt, prefs.timezone)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {preview.expenses} expenses, {preview.incomes} money-received records, {preview.categories} Home categories,{" "}
                {preview.members} shopping members, {preview.budgets} yearly budgets.
              </p>
              <p className="mt-2 font-medium text-danger">All current transactions, categories, members and budgets will be replaced. This cannot be undone.</p>
            </div>
            <Field label='Type "RESTORE" to confirm' htmlFor="restore-confirm" className="max-w-xs">
              <Input id="restore-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
            </Field>
            <div className="flex gap-2">
              <Button variant="destructive" disabled={busy || confirmText !== "RESTORE"} onClick={restore}>
                {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} Replace all data
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setPreview(null);
                  setJson(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
