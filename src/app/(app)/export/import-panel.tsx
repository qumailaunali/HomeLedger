"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { commitImport, previewImport, type ImportRowInput, type ImportRowResult } from "@/server/actions/data";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app/app-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Segmented } from "@/components/ui/misc";
import type { CategoryOption, ExpenseType, MemberOption } from "@/types";

type Mapping = { date: number; amount: number; description: number; target: number; notes: number };
const NONE = -1;

const TARGET_LABEL: Record<ExpenseType, string> = { HOME: "Category", SHOPPING: "Person", OUTING: "Restaurant / Place" };

/** Guesses which spreadsheet column holds what, from the header names. */
function guessMapping(header: string[], type: ExpenseType): Mapping {
  const find = (...words: string[]) => header.findIndex((h) => words.some((w) => h.includes(w)));
  const targetWords = type === "HOME" ? ["category", "head", "item"] : type === "SHOPPING" ? ["person", "member", "name", "for"] : ["restaurant", "place", "venue"];
  return {
    date: find("date", "day"),
    amount: find("amount", "amt", "price", "cost", "rs", "spent", "bill"),
    description: find("desc", "detail", "particular", "purpose", "remark"),
    target: find(...targetWords),
    notes: find("note", "comment"),
  };
}

/** Upload → map columns → validate (server) → preview with invalid rows → confirm → import. */
export function ImportPanel({ categories, members }: { categories: CategoryOption[]; members: MemberOption[] }) {
  const { money } = useApp();
  const toast = useToast();
  const [type, setType] = React.useState<ExpenseType>("HOME");
  const [fileName, setFileName] = React.useState("");
  const [header, setHeader] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<unknown[][]>([]);
  const [mapping, setMapping] = React.useState<Mapping | null>(null);
  const [defaultTarget, setDefaultTarget] = React.useState("");
  const [preview, setPreview] = React.useState<ImportRowResult[] | null>(null);
  const [busy, setBusy] = React.useState<"read" | "validate" | "import" | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setFileName("");
    setHeader([]);
    setRows([]);
    setMapping(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  async function onFile(file: File) {
    setBusy("read");
    setPreview(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const all = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false });
      const headerRow = (all[0] ?? []).map((h) => String(h ?? "").trim());
      const data = all.slice(1).filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""));
      if (!headerRow.length || !data.length) {
        toast.error("This file has no rows to import. The first row should contain column headings.");
        reset();
        return;
      }
      setFileName(file.name);
      setHeader(headerRow);
      setRows(data);
      setMapping(guessMapping(headerRow.map((h) => h.toLowerCase()), type));
    } catch {
      toast.error("Could not read this file. Please use a CSV or Excel (.xlsx) file.");
      reset();
    } finally {
      setBusy(null);
    }
  }

  function mappedRows(): ImportRowInput[] {
    if (!mapping) return [];
    const pick = (r: unknown[], i: number) => (i === NONE ? undefined : r[i]);
    return rows.map((r) => ({
      date: pick(r, mapping.date),
      amount: pick(r, mapping.amount),
      description: pick(r, mapping.description),
      target: pick(r, mapping.target),
      notes: pick(r, mapping.notes),
    }));
  }

  async function validate() {
    if (!mapping || mapping.date === NONE || mapping.amount === NONE) {
      toast.error("Choose which columns contain the date and the amount.");
      return;
    }
    setBusy("validate");
    const res = await previewImport(type, mappedRows(), defaultTarget || null).catch(() => null);
    setBusy(null);
    if (!res) return toast.error("Could not check the file. Please try again.");
    if (!res.ok) return toast.error(res.error);
    setPreview(res.data);
  }

  async function confirm() {
    setBusy("import");
    const res = await commitImport(type, mappedRows(), defaultTarget || null).catch(() => null);
    setBusy(null);
    if (!res) return toast.error("Import failed — nothing was saved. Please try again.");
    if (!res.ok) return toast.error(res.error);
    toast.success(`Imported ${res.data.imported} record${res.data.imported === 1 ? "" : "s"}${res.data.skipped ? ` · ${res.data.skipped} invalid skipped` : ""}`);
    reset();
  }

  const valid = preview?.filter((r) => r.valid).length ?? 0;
  const invalid = (preview?.length ?? 0) - valid;
  const targets = type === "HOME" ? categories : type === "SHOPPING" ? members : [];
  const fields: { key: keyof Mapping; label: string; required?: boolean }[] = [
    { key: "date", label: "Date", required: true },
    { key: "amount", label: "Amount", required: true },
    { key: "target", label: TARGET_LABEL[type] },
    { key: "description", label: "Description" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <Card id="import" className="scroll-mt-20">
      <CardHeader>
        <div>
          <CardTitle>Import records</CardTitle>
          <CardDescription>Bring expenses in from your old spreadsheet. Nothing is saved until you confirm.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-1.5">
          <span className="text-[13px] font-medium">1. What are you importing?</span>
          <Segmented
            label="Record type"
            value={type}
            onChange={(t) => {
              setType(t);
              setDefaultTarget("");
              setPreview(null);
              if (header.length) setMapping(guessMapping(header.map((h) => h.toLowerCase()), t));
            }}
            options={[
              { value: "HOME", label: "Home" },
              { value: "SHOPPING", label: "Shopping" },
              { value: "OUTING", label: "Outing" },
            ]}
            className="w-full max-w-sm"
          />
        </div>

        <div className="grid gap-1.5">
          <span className="text-[13px] font-medium">2. Upload a CSV or Excel file</span>
          <label
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-accent/50 focus-within:ring-[3px] focus-within:ring-ring/50",
            )}
          >
            {busy === "read" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" aria-hidden />}
            {fileName ? (
              <span>
                <span className="font-medium text-foreground">{fileName}</span> · {rows.length} rows · choose another file
              </span>
            ) : (
              "Choose a file (.csv, .xlsx)"
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
        </div>

        {mapping && (
          <div className="grid gap-3">
            <span className="text-[13px] font-medium">3. Match your columns</span>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {fields.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={`map-${f.key}`} optional={!f.required}>
                  <NativeSelect
                    id={`map-${f.key}`}
                    value={mapping[f.key]}
                    onChange={(e) => {
                      setMapping({ ...mapping, [f.key]: Number(e.target.value) });
                      setPreview(null);
                    }}
                  >
                    <option value={NONE}>—</option>
                    {header.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              ))}
            </div>
            {type !== "OUTING" && (
              <Field
                label={`Default ${TARGET_LABEL[type].toLowerCase()}`}
                htmlFor="map-default"
                optional
                hint={`Used for rows with a missing or unknown ${TARGET_LABEL[type].toLowerCase()}.`}
                className="max-w-sm"
              >
                <NativeSelect id="map-default" value={defaultTarget} onChange={(e) => { setDefaultTarget(e.target.value); setPreview(null); }}>
                  <option value="">None — mark those rows invalid</option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <div>
              <Button onClick={validate} disabled={!!busy}>
                {busy === "validate" && <Loader2 className="animate-spin" />}
                Check rows
              </Button>
            </div>
          </div>
        )}

        {preview && (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[13px] font-medium">4. Preview</span>
              <span className="inline-flex items-center gap-1 text-positive">
                <CheckCircle2 className="size-4" aria-hidden /> {valid} ready
              </span>
              {invalid > 0 && (
                <span className="inline-flex items-center gap-1 text-danger">
                  <AlertCircle className="size-4" aria-hidden /> {invalid} invalid (will be skipped)
                </span>
              )}
            </div>
            <div className="max-h-96 overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Row</th>
                    <th scope="col" className="px-3 py-2 font-medium">Date</th>
                    <th scope="col" className="px-3 py-2 font-medium">{TARGET_LABEL[type]}</th>
                    <th scope="col" className="px-3 py-2 font-medium">Description</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Amount</th>
                    <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[...preview].sort((a, b) => Number(a.valid) - Number(b.valid)).map((r) => (
                    <tr key={r.index} className={r.valid ? undefined : "bg-danger-soft/50"}>
                      <td className="tabular px-3 py-2 text-muted-foreground">{r.index + 2}</td>
                      <td className="tabular px-3 py-2 whitespace-nowrap">{r.date ?? "—"}</td>
                      <td className="px-3 py-2">{r.targetName || "—"}</td>
                      <td className="max-w-56 truncate px-3 py-2">{r.description || "—"}</td>
                      <td className="tabular px-3 py-2 text-right">{r.amountCents !== null ? money(r.amountCents) : "—"}</td>
                      <td className="px-3 py-2">
                        {r.valid ? (
                          <span className="inline-flex items-center gap-1 text-positive">
                            <CheckCircle2 className="size-3.5" aria-hidden /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-start gap-1 text-danger">
                            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {r.errors.join("; ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={confirm} disabled={!!busy || valid === 0}>
                {busy === "import" && <Loader2 className="animate-spin" />}
                5. Import {valid} record{valid === 1 ? "" : "s"}
              </Button>
              <Button variant="ghost" onClick={reset} disabled={!!busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
