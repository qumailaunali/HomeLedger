import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  budgetLine,
  budgetStatus,
  buildWarnings,
  computeBalance,
  homeProgress,
  monthlySeries,
  percentChange,
  periodTotals,
  shoppingProgress,
  totalsOf,
} from "../src/lib/calculations";
import { centsToDecimalString, formatMoney, parseAmountToCents, percentUsed, toCents } from "../src/lib/money";
import {
  formatDate,
  isoRange,
  monthRange,
  parseFlexibleDate,
  parseIsoDate,
  shiftMonth,
  toIsoDate,
  yearRange,
} from "../src/lib/dates";
import { expenseSchema } from "../src/lib/validation";

const rs = (n: number) => n * 100; // rupees -> cents

/**
 * A tiny in-memory ledger mirroring how the app derives everything from
 * transactions: balance and budgets are recomputed, never stored.
 */
type Tx = { id: string; kind: "in" | "out"; type?: "HOME" | "SHOPPING" | "OUTING"; cents: number; date: string; member?: string; category?: string };
function balanceOf(starting: number, txs: Tx[]) {
  const received = txs.filter((t) => t.kind === "in").reduce((s, t) => s + t.cents, 0);
  const spent = txs.filter((t) => t.kind === "out").reduce((s, t) => s + t.cents, 0);
  return computeBalance(starting, received, spent);
}
function inRange(date: string, range: { gte: Date; lt: Date }) {
  const d = parseIsoDate(date)!;
  return d >= range.gte && d < range.lt;
}
function memberSpent(txs: Tx[], member: string, year: number) {
  return txs
    .filter((t) => t.type === "SHOPPING" && t.member === member && inRange(t.date, yearRange(year)))
    .reduce((s, t) => s + t.cents, 0);
}

describe("money", () => {
  test("parses amounts into exact cents", () => {
    assert.equal(parseAmountToCents("1400"), 140000);
    assert.equal(parseAmountToCents("1,400.5"), 140050);
    assert.equal(parseAmountToCents("Rs. 170,000"), 17000000);
    assert.equal(parseAmountToCents("0.1"), 10);
    assert.equal(parseAmountToCents("abc"), null);
    assert.equal(parseAmountToCents("12.345.6"), null);
  });

  test("never suffers from floating point (0.1 + 0.2)", () => {
    assert.equal(toCents("0.1") + toCents("0.2"), toCents("0.3"));
    assert.equal(centsToDecimalString(toCents("0.1") + toCents("0.2")), "0.30");
  });

  test("decimal strings round-trip", () => {
    assert.equal(centsToDecimalString(140050), "1400.50");
    assert.equal(centsToDecimalString(-5), "-0.05");
    assert.equal(toCents({ toString: () => "15700.00" }), 1570000);
  });

  test("formats PKR the readable way", () => {
    assert.equal(formatMoney(rs(170000)), "Rs. 170,000");
    assert.equal(formatMoney(140050), "Rs. 1,400.50");
    assert.equal(formatMoney(-rs(2300)), "-Rs. 2,300");
    assert.equal(formatMoney(rs(10000), "Rs.", { signed: true }), "+Rs. 10,000");
  });

  test("percentage used", () => {
    assert.equal(percentUsed(rs(20000), rs(35000)), 57);
    assert.equal(percentUsed(rs(5), 0), 0);
  });
});

describe("current balance", () => {
  test("follows the spreadsheet example: 60,950 + 170,000 − 15,000 − 10,000", () => {
    const txs: Tx[] = [
      { id: "r", kind: "in", cents: rs(170000), date: "2026-10-01" },
      { id: "masi", kind: "out", type: "HOME", cents: rs(15000), date: "2026-10-02" },
    ];
    assert.equal(balanceOf(rs(60950), txs.slice(0, 1)), rs(230950));
    assert.equal(balanceOf(rs(60950), txs), rs(215950));
    txs.push({ id: "taha", kind: "out", type: "HOME", cents: rs(10000), date: "2026-10-03" });
    assert.equal(balanceOf(rs(60950), txs), rs(205950));
  });

  test("editing an expense recalculates the balance", () => {
    const txs: Tx[] = [
      { id: "r", kind: "in", cents: rs(170000), date: "2026-10-01" },
      { id: "e", kind: "out", type: "HOME", cents: rs(15000), date: "2026-10-02" },
    ];
    const edited = txs.map((t) => (t.id === "e" ? { ...t, cents: rs(12000) } : t));
    assert.equal(balanceOf(0, edited), rs(158000));
  });

  test("deleting an expense restores the balance", () => {
    const txs: Tx[] = [
      { id: "r", kind: "in", cents: rs(170000), date: "2026-10-01" },
      { id: "e", kind: "out", type: "HOME", cents: rs(15000), date: "2026-10-02" },
    ];
    assert.equal(balanceOf(0, txs.filter((t) => t.id !== "e")), rs(170000));
  });

  test("can go negative and stays exact", () => {
    assert.equal(computeBalance(0, rs(100), rs(250.75)), -15075);
  });
});

describe("shopping yearly budget", () => {
  const members = [{ id: "qumail", name: "Qumail" }];

  test("remaining = yearly budget − that year's shopping", () => {
    const [line] = shoppingProgress(members, new Map([["qumail", rs(35000)]]), new Map([["qumail", rs(20000)]]));
    assert.equal(line.remainingCents, rs(15000));
    assert.equal(line.percent, 57);
    assert.equal(line.status, "within");
  });

  test("a new purchase reduces remaining; deleting it restores", () => {
    const txs: Tx[] = [{ id: "a", kind: "out", type: "SHOPPING", member: "qumail", cents: rs(15000), date: "2026-01-12" }];
    const remaining = (list: Tx[]) => budgetLine("q", "Qumail", rs(35000), memberSpent(list, "qumail", 2026)).remainingCents;
    assert.equal(remaining(txs), rs(20000));
    const after = [...txs, { id: "b", kind: "out" as const, type: "SHOPPING" as const, member: "qumail", cents: rs(5000), date: "2026-01-20" }];
    assert.equal(remaining(after), rs(15000));
    assert.equal(remaining(after.filter((t) => t.id !== "b")), rs(20000));
  });

  test("over budget shows the overspend", () => {
    const line = budgetLine("q", "Qumail", rs(35000), rs(41300));
    assert.equal(line.status, "over");
    assert.equal(line.overCents, rs(6300));
    assert.equal(line.remainingCents, -rs(6300));
  });

  test("each year uses its own budget and its own spending", () => {
    const txs: Tx[] = [
      { id: "1", kind: "out", type: "SHOPPING", member: "qumail", cents: rs(30000), date: "2025-12-31" },
      { id: "2", kind: "out", type: "SHOPPING", member: "qumail", cents: rs(5000), date: "2026-01-01" },
    ];
    const budgets = { 2025: rs(35000), 2026: rs(40000) };
    assert.equal(budgetLine("q", "Q", budgets[2025], memberSpent(txs, "qumail", 2025)).remainingCents, rs(5000));
    assert.equal(budgetLine("q", "Q", budgets[2026], memberSpent(txs, "qumail", 2026)).remainingCents, rs(35000));
  });

  test("near budget at 85% and above", () => {
    assert.equal(budgetStatus(rs(29750), rs(35000)), "near");
    assert.equal(budgetStatus(rs(29000), rs(35000)), "within");
    assert.equal(budgetStatus(rs(35000), rs(35000)), "near");
    assert.equal(budgetStatus(0, 0), "none");
    assert.equal(budgetStatus(rs(100), 0), "over");
  });
});

describe("home monthly budget", () => {
  const categories = [
    { id: "food", name: "Food", expectedCents: rs(17000) },
    { id: "net", name: "Internet", expectedCents: rs(1400) },
    { id: "petrol", name: "Petrol", expectedCents: rs(15700) },
  ];

  test("expected vs actual per category", () => {
    const lines = homeProgress(categories, new Map([["food", rs(14200)], ["net", rs(1400)], ["petrol", rs(18000)]]));
    assert.deepEqual(
      lines.map((l) => [l.name, l.remainingCents, l.status]),
      [
        ["Food", rs(2800), "within"],
        ["Internet", 0, "near"],
        ["Petrol", -rs(2300), "over"],
      ],
    );
    assert.equal(lines[2].overCents, rs(2300));
    assert.deepEqual(totalsOf(lines), { budgetCents: rs(34100), spentCents: rs(33600), remainingCents: rs(500) });
  });

  test("only that month's expenses count", () => {
    const txs: Tx[] = [
      { id: "a", kind: "out", type: "HOME", category: "food", cents: rs(10000), date: "2026-09-30" },
      { id: "b", kind: "out", type: "HOME", category: "food", cents: rs(4000), date: "2026-10-01" },
      { id: "c", kind: "out", type: "HOME", category: "food", cents: rs(3000), date: "2026-10-31" },
      { id: "d", kind: "out", type: "HOME", category: "food", cents: rs(2000), date: "2026-11-01" },
    ];
    const oct = monthRange(2026, 10);
    const spent = txs.filter((t) => inRange(t.date, oct)).reduce((s, t) => s + t.cents, 0);
    assert.equal(spent, rs(7000));
  });
});

describe("month filtering & dates", () => {
  test("month ranges are half-open and cover the whole month", () => {
    const r = monthRange(2026, 12);
    assert.equal(toIsoDate(r.gte), "2026-12-01");
    assert.equal(toIsoDate(r.lt), "2027-01-01");
    assert.equal(toIsoDate(monthRange(2028, 2).lt), "2028-03-01");
  });

  test("shiftMonth crosses years", () => {
    assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
    assert.deepEqual(shiftMonth(2026, 11, 3), { year: 2027, month: 2 });
  });

  test("October 1 stays October 1 (no timezone shift)", () => {
    const d = parseIsoDate("2026-10-01")!;
    assert.equal(toIsoDate(d), "2026-10-01");
    assert.equal(formatDate("2026-10-01"), "Oct 1, 2026");
    assert.ok(inRange("2026-10-01", monthRange(2026, 10)));
    assert.ok(!inRange("2026-10-01", monthRange(2026, 9)));
  });

  test("rejects impossible dates", () => {
    assert.equal(parseIsoDate("2026-02-30"), null);
    assert.equal(parseIsoDate("2026-13-01"), null);
  });

  test("inclusive custom ranges", () => {
    const r = isoRange("2026-10-01", "2026-10-31")!;
    assert.ok(inRange("2026-10-31", r));
    assert.ok(!inRange("2026-11-01", r));
    assert.equal(isoRange("2026-10-05", "2026-10-01"), null);
  });

  test("import accepts common spreadsheet date formats", () => {
    assert.equal(parseFlexibleDate("05/10/2026"), "2026-10-05"); // DD/MM/YYYY
    assert.equal(parseFlexibleDate("2026-10-05"), "2026-10-05");
    assert.equal(parseFlexibleDate("5 Oct 2026"), "2026-10-05");
    assert.equal(parseFlexibleDate("Oct 5, 2026"), "2026-10-05");
    assert.equal(parseFlexibleDate(46300), "2026-10-05"); // Excel serial
    assert.equal(parseFlexibleDate("31/02/2026"), null);
    assert.equal(parseFlexibleDate(""), null);
  });
});

describe("summaries", () => {
  test("monthly totals and net change", () => {
    const t = periodTotals({ RECEIVED: rs(170000), HOME: rs(110000), SHOPPING: rs(35000), OUTING: rs(15000) });
    assert.equal(t.spentCents, rs(160000));
    assert.equal(t.netCents, rs(10000));
  });

  test("monthly series is zero-filled and grouped by type", () => {
    const s = monthlySeries(
      [
        { year: 2026, month: 9, kind: "HOME", cents: rs(100), count: 2 },
        { year: 2026, month: 9, kind: "OUTING", cents: rs(50), count: 1 },
        { year: 2026, month: 9, kind: "RECEIVED", cents: rs(500), count: 1 },
        { year: 2026, month: 11, kind: "SHOPPING", cents: rs(70), count: 1 },
      ],
      { year: 2026, month: 9 },
      3,
    );
    assert.deepEqual(
      s.map((m) => [m.label, m.spentCents, m.receivedCents, m.count, m.outingCount]),
      [
        ["Sep", rs(150), rs(500), 3, 1],
        ["Oct", 0, 0, 0, 0],
        ["Nov", rs(70), 0, 1, 0],
      ],
    );
  });

  test("series spanning years labels the year", () => {
    const s = monthlySeries([], { year: 2025, month: 12 }, 2);
    assert.deepEqual(s.map((m) => m.label), ["Dec '25", "Jan '26"]);
  });

  test("percent change vs last month", () => {
    assert.equal(percentChange(rs(110), rs(100)), 10);
    assert.equal(percentChange(rs(50), 0), null);
  });
});

describe("warnings", () => {
  const fmt = (c: number) => formatMoney(c);
  test("only useful warnings, most severe first", () => {
    const w = buildWarnings({
      shopping: [budgetLine("q", "Qumail", rs(35000), rs(29750)), budgetLine("s", "Sarah", rs(35000), rs(1000)), budgetLine("o", "Others", rs(100000), rs(120000))],
      home: [budgetLine("f", "Food", rs(17000), rs(18700)), budgetLine("n", "Internet", rs(1400), rs(1400))],
      monthName: "October",
      outingThisMonthCents: rs(20000),
      outingLastMonthCents: rs(15000),
      formatMoney: fmt,
    });
    assert.deepEqual(
      w.map((x) => x.message),
      [
        "Others is Rs. 20,000 over the yearly shopping budget.",
        "Food spending is 10% above October's expected amount.",
        "Qumail has used 85% of the yearly shopping budget.",
        "Outing spending is higher than last month (Rs. 20,000 vs Rs. 15,000).",
      ],
    );
  });
});

describe("validation", () => {
  const base = { amount: "5000", date: "2026-01-12", description: "Shirts" };
  test("shopping needs a member", () => {
    assert.equal(expenseSchema.safeParse({ ...base, type: "SHOPPING" }).success, false);
    assert.equal(expenseSchema.safeParse({ ...base, type: "SHOPPING", shoppingMemberId: "m1" }).success, true);
  });
  test("home needs a category; outing needs a place", () => {
    assert.equal(expenseSchema.safeParse({ ...base, type: "HOME" }).success, false);
    assert.equal(expenseSchema.safeParse({ ...base, type: "OUTING" }).success, false);
    assert.equal(expenseSchema.safeParse({ ...base, type: "OUTING", place: "KFC" }).success, true);
  });
  test("amount must be a positive money value", () => {
    for (const amount of ["0", "-5", "abc", ""]) {
      assert.equal(expenseSchema.safeParse({ ...base, type: "HOME", homeCategoryId: "c", amount }).success, false, amount);
    }
  });
  test("date must be a real date", () => {
    assert.equal(expenseSchema.safeParse({ ...base, type: "HOME", homeCategoryId: "c", date: "2026-02-31" }).success, false);
  });
});

describe("usernames", () => {
  test("lowercased, 3–30 chars, letters/numbers/dots/underscores", async () => {
    const { usernameField } = await import("../src/lib/validation");
    assert.equal(usernameField.parse("  Qumail.Ali "), "qumail.ali");
    for (const bad of ["ab", "has space", "bad!", "x".repeat(31)]) assert.equal(usernameField.safeParse(bad).success, false, bad);
  });
});
