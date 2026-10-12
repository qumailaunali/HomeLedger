"use client";

import * as React from "react";
import { Database, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { downloadExport } from "../../export/download";

const EXPORTS = [
  { format: "xlsx", label: "Export Excel", icon: FileSpreadsheet, query: "format=xlsx&scope=all" },
  { format: "csv", label: "Export CSV", icon: FileText, query: "format=csv&scope=all" },
  { format: "json", label: "JSON backup", icon: Database, query: "format=json" },
];

export function QuickExports() {
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {EXPORTS.map((e) => (
        <Button
          key={e.format}
          variant="outline"
          disabled={!!busy}
          onClick={async () => {
            setBusy(e.format);
            const res = await downloadExport(e.query);
            setBusy(null);
            if (res.ok) toast.success("Export ready");
            else toast.error(res.error);
          }}
        >
          {busy === e.format ? <Loader2 className="animate-spin" /> : <e.icon />} {e.label}
        </Button>
      ))}
    </div>
  );
}
