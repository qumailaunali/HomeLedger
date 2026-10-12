"use client";

import * as React from "react";
import { Database, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { MONTH_NAMES } from "@/lib/dates";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { downloadExport } from "./download";

type Scope = "all" | "current-month" | "month" | "current-year" | "range";

export function ExportView({ today }: { today: string }) {
  const toast = useToast();
  const [ty, tm] = today.split("-").map(Number);
  const [scope, setScope] = React.useState<Scope>("current-month");
  const [type, setType] = React.useState("ALL");
  const [year, setYear] = React.useState(ty);
  const [month, setMonth] = React.useState(tm);
  const [from, setFrom] = React.useState(`${ty}-01-01`);
  const [to, setTo] = React.useState(today);
  const [busy, setBusy] = React.useState<string | null>(null);

  function query(format: string) {
    const extra: Record<string, string> =
      scope === "current-month"
        ? { scope: "month", year: String(ty), month: String(tm) }
        : scope === "month"
          ? { scope: "month", year: String(year), month: String(month) }
          : scope === "current-year"
            ? { scope: "year", year: String(ty) }
            : scope === "range"
              ? { scope: "range", from, to }
              : { scope: "all" };
    return new URLSearchParams({ format, type, ...extra }).toString();
  }

  async function run(format: string) {
    if (scope === "range" && (!from || !to || to < from)) {
      toast.error("Choose a valid date range.");
      return;
    }
    setBusy(format);
    const res = await downloadExport(format === "json" ? "format=json" : query(format));
    setBusy(null);
    if (res.ok) toast.success("Export ready");
    else toast.error(res.error);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div>
            <CardTitle>Export records</CardTitle>
            <CardDescription>
              Excel has separate sheets for Summary, Home, Shopping, Outing and Received Money, with currency formatting.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Records" htmlFor="ex-scope">
              <NativeSelect id="ex-scope" value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
                <option value="current-month">Current month</option>
                <option value="month">Selected month</option>
                <option value="current-year">Current year</option>
                <option value="range">Custom date range</option>
                <option value="all">All records</option>
              </NativeSelect>
            </Field>
            <Field label="Include" htmlFor="ex-type">
              <NativeSelect id="ex-type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="ALL">Everything</option>
                <option value="HOME">Home expenses only</option>
                <option value="SHOPPING">Shopping only</option>
                <option value="OUTING">Outing only</option>
                <option value="RECEIVED">Received money only</option>
              </NativeSelect>
            </Field>
          </div>

          {scope === "month" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Month" htmlFor="ex-month">
                <NativeSelect id="ex-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Year" htmlFor="ex-year">
                <Input id="ex-year" inputMode="numeric" value={year} onChange={(e) => setYear(Number(e.target.value.replace(/\D/g, "")) || ty)} />
              </Field>
            </div>
          )}
          {scope === "range" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="From" htmlFor="ex-from">
                <Input id="ex-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To" htmlFor="ex-to">
                <Input id="ex-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={() => run("xlsx")} disabled={!!busy}>
              {busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Download Excel (.xlsx)
            </Button>
            <Button size="lg" variant="outline" onClick={() => run("csv")} disabled={!!busy}>
              {busy === "csv" ? <Loader2 className="animate-spin" /> : <FileText />} Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Full backup</CardTitle>
            <CardDescription>
              A JSON file with every transaction, Home category, shopping member, yearly budget and setting — enough to restore everything.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => run("json")} disabled={!!busy}>
            {busy === "json" ? <Loader2 className="animate-spin" /> : <Database />} Download JSON backup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
