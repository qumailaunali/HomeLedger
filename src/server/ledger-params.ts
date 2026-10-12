import "server-only";
import { daysInMonth, makeIsoDate, type IsoDate } from "@/lib/dates";
import { isoParam, monthFromParams, str } from "./params";
import type { LedgerFilters, TransactionType } from "@/types";

export type Period = "month" | "year" | "all" | "range";

export interface LedgerQuery {
  filters: LedgerFilters;
  period: Period;
  year: number;
  month: number;
  from?: IsoDate;
  to?: IsoDate;
}

const TYPES = ["ALL", "HOME", "SHOPPING", "OUTING", "RECEIVED"];

/** Turns URL search params into validated ledger filters. */
export function ledgerQueryFromParams(
  sp: Record<string, string | string[] | undefined>,
  today: IsoDate,
  fixedType?: TransactionType,
  defaultPeriod: Period = "month",
): LedgerQuery {
  const { year, month } = monthFromParams(sp, today);
  const rawPeriod = str(sp, "period");
  // A search with no explicit period looks through everything.
  const period: Period =
    rawPeriod === "year" || rawPeriod === "all" || rawPeriod === "range" || rawPeriod === "month"
      ? rawPeriod
      : str(sp, "search")
        ? "all"
        : defaultPeriod;

  let from: IsoDate | undefined;
  let to: IsoDate | undefined;
  if (period === "month") {
    from = makeIsoDate(year, month, 1);
    to = makeIsoDate(year, month, daysInMonth(year, month));
  } else if (period === "year") {
    from = makeIsoDate(year, 1, 1);
    to = makeIsoDate(year, 12, 31);
  } else if (period === "range") {
    from = isoParam(sp, "from");
    to = isoParam(sp, "to");
  }

  const typeParam = (str(sp, "type") ?? "ALL").toUpperCase();
  const type = fixedType ?? ((TYPES.includes(typeParam) ? typeParam : "ALL") as TransactionType | "ALL");
  const sort = str(sp, "sort") === "amount" ? "amount" : "date";
  const dir = str(sp, "dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(str(sp, "page")) || 1);

  return {
    period,
    year,
    month,
    from,
    to,
    filters: {
      from,
      to,
      type,
      categoryId: str(sp, "category") || undefined,
      memberId: str(sp, "member") || undefined,
      search: str(sp, "search")?.slice(0, 100) || undefined,
      sort,
      dir,
      page,
      pageSize: 50,
    },
  };
}
