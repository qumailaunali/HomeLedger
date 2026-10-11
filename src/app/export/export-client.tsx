"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, FileSpreadsheet, FileText, Database, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { TransactionItem, DashboardSummary } from "@/types";
import { formatDisplayDate } from "@/lib/date";
import { useToast } from "@/components/ui/toast";
import { createExpenseAction } from "@/app/actions";

interface ExportClientProps {
  summary: DashboardSummary;
  allTransactions: TransactionItem[];
  categories: { id: string; name: string; expected: number }[];
  members: { id: string; name: string; yearlyBudget: number }[];
}

export function ExportClient({
  summary,
  allTransactions,
  categories,
  members,
}: ExportClientProps) {
  const { success, error, info } = useToast();
  const currencySymbol = summary.household.currencySymbol;

  // Import state
  const [importType, setImportType] = useState<"HOME" | "SHOPPING" | "OUTING">("HOME");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // 1. Export Excel (.xlsx) with multi-sheets (Section 23)
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryRows = [
        ["Household Name", summary.household.name],
        ["Currency", summary.household.currency],
        ["Starting Balance", summary.household.startingBalance],
        ["Current Balance", summary.currentBalance],
        ["Month Received", summary.monthReceived],
        ["Month Total Spent", summary.monthSpent],
        ["Net Month Change", summary.netMonthChange],
        [],
        ["Category", "Spent This Month", "Budget"],
        ["Home Expenses", summary.homeSpent, summary.homeBudgetTotal],
        ["Shopping Expenses", summary.shoppingSpent, "—"],
        ["Outing Expenses", summary.outingSpent, "—"],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Sheet 2: Home Expenses
      const homeRows = [["Date", "Category", "Description", "Amount", "Notes"]];
      allTransactions
        .filter((t) => t.type === "HOME")
        .forEach((t) => {
          homeRows.push([
            formatDisplayDate(t.date),
            t.homeCategory?.name || "General",
            t.description,
            String(t.amount),
            t.notes || "",
          ]);
        });
      const homeWs = XLSX.utils.aoa_to_sheet(homeRows);
      XLSX.utils.book_append_sheet(wb, homeWs, "Home");

      // Sheet 3: Shopping Expenses
      const shoppingRows = [["Date", "Person", "Description", "Amount", "Notes"]];
      allTransactions
        .filter((t) => t.type === "SHOPPING")
        .forEach((t) => {
          shoppingRows.push([
            formatDisplayDate(t.date),
            t.shoppingMember?.name || "Other",
            t.description,
            String(t.amount),
            t.notes || "",
          ]);
        });
      const shoppingWs = XLSX.utils.aoa_to_sheet(shoppingRows);
      XLSX.utils.book_append_sheet(wb, shoppingWs, "Shopping");

      // Sheet 4: Outing Expenses
      const outingRows = [["Date", "Restaurant / Place", "Description", "Amount", "People", "Payment Method"]];
      allTransactions
        .filter((t) => t.type === "OUTING")
        .forEach((t) => {
          outingRows.push([
            formatDisplayDate(t.date),
            t.place || "",
            t.description,
            String(t.amount),
            t.numberOfPeople ? String(t.numberOfPeople) : "",
            t.paymentMethod || "",
          ]);
        });
      const outingWs = XLSX.utils.aoa_to_sheet(outingRows);
      XLSX.utils.book_append_sheet(wb, outingWs, "Outing");

      // Sheet 5: Received Money
      const incomeRows = [["Date", "Source", "Description", "Amount"]];
      allTransactions
        .filter((t) => t.type === "RECEIVED")
        .forEach((t) => {
          incomeRows.push([
            formatDisplayDate(t.date),
            t.source || "Income",
            t.description,
            String(t.amount),
          ]);
        });
      const incomeWs = XLSX.utils.aoa_to_sheet(incomeRows);
      XLSX.utils.book_append_sheet(wb, incomeWs, "Received Money");

      // Generate file and trigger download
      XLSX.writeFile(wb, `HomeLedger_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
      success("Excel workbook exported successfully!");
    } catch (err: unknown) {
      error("Failed to generate Excel export.");
    }
  };

  // 2. Export CSV
  const handleExportCSV = () => {
    try {
      const rows = [["Date", "Type", "Category/Person/Place", "Description", "Amount", "Balance"]];
      allTransactions.forEach((t) => {
        const cat =
          t.type === "HOME"
            ? t.homeCategory?.name
            : t.type === "SHOPPING"
            ? t.shoppingMember?.name
            : t.type === "OUTING"
            ? t.place
            : t.source;

        rows.push([
          formatDisplayDate(t.date),
          t.type,
          cat || "",
          `"${(t.description || "").replace(/"/g, '""')}"`,
          String(t.amount),
          String(t.balanceAfter || ""),
        ]);
      });

      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `HomeLedger_Records_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      success("CSV file exported successfully!");
    } catch {
      error("Failed to export CSV.");
    }
  };

  // 3. Export JSON Backup
  const handleExportJSON = () => {
    const backupData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      household: summary.household,
      categories,
      members,
      transactions: allTransactions,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HomeLedger_Backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success("Complete JSON backup downloaded!");
  };

  // 4. Handle CSV Import file selection & preview (Section 24)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length <= 1) {
          error("File does not contain valid transaction data rows.");
          return;
        }

        // Parse rows
        const parsed: any[] = [];
        const header = json[0].map((h: any) => String(h).toLowerCase().trim());
        const dateIdx = header.findIndex((h: string) => h.includes("date"));
        const descIdx = header.findIndex((h: string) => h.includes("desc") || h.includes("item") || h.includes("place"));
        const amtIdx = header.findIndex((h: string) => h.includes("amount") || h.includes("price") || h.includes("bill"));

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const rawDate = dateIdx >= 0 ? row[dateIdx] : new Date().toISOString().split("T")[0];
          const rawDesc = descIdx >= 0 ? row[descIdx] : "Imported Record";
          const rawAmt = amtIdx >= 0 ? parseFloat(String(row[amtIdx]).replace(/[^0-9.-]+/g, "")) : 0;

          if (rawAmt > 0) {
            parsed.push({
              date: rawDate,
              description: String(rawDesc || "Imported Record"),
              amount: rawAmt,
              valid: true,
            });
          }
        }

        setPreviewRows(parsed);
        info(`Found ${parsed.length} valid rows to preview.`);
      } catch (err) {
        error("Failed to parse uploaded file. Please ensure it is a valid CSV or Excel file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // 5. Confirm Import
  const handleConfirmImport = async () => {
    if (previewRows.length === 0) return;
    setIsImporting(true);
    let successCount = 0;

    try {
      for (const row of previewRows) {
        await createExpenseAction({
          type: importType,
          amount: row.amount,
          date: new Date().toISOString().split("T")[0],
          description: row.description,
          homeCategoryId: importType === "HOME" ? categories[0]?.id : undefined,
          shoppingMemberId: importType === "SHOPPING" ? members[0]?.id : undefined,
          place: importType === "OUTING" ? row.description : undefined,
        });
        successCount++;
      }
      success(`Successfully imported ${successCount} records!`);
      setPreviewRows([]);
    } catch (err: unknown) {
      error("Some records failed during import.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Excel Workbook */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              Excel (.XLSX) Export
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Multi-sheet formatted spreadsheet with Summary, Home, Shopping, Outing & Inflow tabs.
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel</span>
          </button>
        </div>

        {/* 2. CSV Export */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              CSV Export
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Universal comma-separated records for importing into Google Sheets or other tools.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>

        {/* 3. Full JSON Backup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">
              JSON Full Backup
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Complete archive containing household settings, categories, members, budgets & transactions.
            </p>
          </div>
          <button
            onClick={handleExportJSON}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Backup</span>
          </button>
        </div>
      </div>

      {/* Import Records Section (Section 24) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">
            Import Records
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upload CSV/Excel spreadsheet to preview, validate, and import expenses.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Target Record Type
            </label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
            >
              <option value="HOME">Home Expenses</option>
              <option value="SHOPPING">Shopping Expenses</option>
              <option value="OUTING">Outing Expenses</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Select CSV / Excel File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-slate-300 cursor-pointer"
            />
          </div>
        </div>

        {/* Import Preview Table */}
        {previewRows.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                Validation Preview ({previewRows.length} records ready)
              </h4>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="py-1.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm flex items-center gap-1.5"
              >
                {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Import Records</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono">{row.date}</td>
                      <td className="p-2.5 font-medium">{row.description}</td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {currencySymbol} {row.amount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-semibold">
                        Ready
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
