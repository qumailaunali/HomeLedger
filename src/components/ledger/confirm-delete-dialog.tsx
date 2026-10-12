"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * "Delete transaction? Internet · Rs. 1,400 · October 5, 2026 — This action
 * cannot be undone." Only the Delete button is red.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Delete transaction?",
  details,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  details: { label: string; amount?: string; date?: string } | null;
  confirmLabel?: string;
  onConfirm: () => Promise<boolean>;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {details && (
          <div className="mt-4 rounded-xl bg-muted px-4 py-3">
            <p className="font-medium">{details.label}</p>
            {(details.amount || details.date) && (
              <p className="tabular mt-0.5 text-sm text-muted-foreground">
                {[details.amount, details.date].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        )}
        <AlertDialogDescription className="mt-3">This action cannot be undone.</AlertDialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await onConfirm();
              setBusy(false);
              if (ok) onOpenChange(false);
            }}
          >
            {busy && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
