import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getHousehold } from "@/server/auth";
import { buildCsv, buildWorkbook, describePeriod, type ExportRequest } from "@/server/export";
import { buildBackup } from "@/server/queries/backup";
import { daysInMonth, makeIsoDate, parseIsoDate, todayIso, MONTH_NAMES } from "@/lib/dates";
import type { TransactionType } from "@/types";

const TYPES = ["ALL", "HOME", "SHOPPING", "OUTING", "RECEIVED"] as const;

/**
 * GET /api/export?format=xlsx|csv|json&scope=all|month|year|range&year=&month=&from=&to=&type=
 * Files are generated on the server and only ever contain the signed-in user's household.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const household = await getHousehold(user.householdId);

  const p = request.nextUrl.searchParams;
  const format = p.get("format") ?? "xlsx";
  const stamp = todayIso(household.timezone);
  const slug = household.name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "HomeLedger";

  try {
    if (format === "json") {
      const backup = await buildBackup(household.id);
      return new NextResponse(JSON.stringify(backup, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}_Backup_${stamp}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const typeParam = (p.get("type") ?? "ALL").toUpperCase();
    const type = (TYPES as readonly string[]).includes(typeParam) ? (typeParam as TransactionType | "ALL") : "ALL";
    const scope = p.get("scope") ?? "all";
    const year = Number(p.get("year")) || Number(stamp.slice(0, 4));
    const month = Math.min(Math.max(Number(p.get("month")) || Number(stamp.slice(5, 7)), 1), 12);

    let from: string | null = null;
    let to: string | null = null;
    let label = "All records";
    if (scope === "month") {
      from = makeIsoDate(year, month, 1);
      to = makeIsoDate(year, month, daysInMonth(year, month));
      label = `${MONTH_NAMES[month - 1]} ${year}`;
    } else if (scope === "year") {
      from = makeIsoDate(year, 1, 1);
      to = makeIsoDate(year, 12, 31);
      label = String(year);
    } else if (scope === "range") {
      from = p.get("from");
      to = p.get("to");
      if (!from || !to || !parseIsoDate(from) || !parseIsoDate(to) || to < from) {
        return NextResponse.json({ error: "Choose a valid date range." }, { status: 400 });
      }
      label = describePeriod({ from, to }, household.dateFormat);
    }
    if (type !== "ALL") label += ` · ${type === "RECEIVED" ? "Received money" : type.charAt(0) + type.slice(1).toLowerCase()} only`;

    const req: ExportRequest = { from, to, type, label };
    const base = `${slug}_${label.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}_${stamp}`;

    if (format === "csv") {
      const csv = await buildCsv(household, req);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const buffer = await buildWorkbook(household, req);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export]", err);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
