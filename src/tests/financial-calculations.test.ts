/**
 * Financial Calculations Unit Tests for HomeLedger
 * Validates mathematical precision and business rules.
 */

import { addMoney, subtractMoney, roundMoney, calculatePercentage, formatCurrency } from "../lib/currency";
import { toCalendarDateString, parseCalendarDate, getMonthBounds } from "../lib/date";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

export function runTests() {
  console.log("🔍 Running Financial Calculation Tests...\n");

  // Test 1: Floating-point precision avoidance
  const floatSum = 0.1 + 0.2; // 0.30000000000000004 in JS
  const safeSum = addMoney(0.1, 0.2);
  assert(safeSum === 0.3, `addMoney(0.1, 0.2) must equal exactly 0.3 (got ${safeSum})`);

  // Test 2: Starting balance + Money Received - Expenses (Section 5 example)
  const startingBalance = 60950;
  const salaryReceived = 170000;
  const balanceAfterIncome = addMoney(startingBalance, salaryReceived);
  assert(balanceAfterIncome === 230950, "Available balance after Rs. 170,000 received must equal Rs. 230,950");

  const masiExpense = 15000;
  const balanceAfterMasi = subtractMoney(balanceAfterIncome, masiExpense);
  assert(balanceAfterMasi === 215950, "Balance after Masi expense must equal Rs. 215,950");

  const tahaExpense = 10000;
  const balanceAfterTaha = subtractMoney(balanceAfterMasi, tahaExpense);
  assert(balanceAfterTaha === 205950, "Balance after Taha expense must equal Rs. 205,950");

  // Test 3: Shopping Budget Remaining & Percentage (Section 10 example)
  const qumailBudget = 35000;
  const qumailSpent = 20000;
  const qumailRemaining = subtractMoney(qumailBudget, qumailSpent);
  const qumailPct = calculatePercentage(qumailSpent, qumailBudget);
  assert(qumailRemaining === 15000, "Qumail remaining budget must be Rs. 15,000");
  assert(qumailPct === 57, "Qumail budget used percentage must be 57%");

  // Test 4: Shopping Over Budget Scenario (Section 10 over budget example)
  const overSpent = 41300;
  const overAmount = subtractMoney(overSpent, qumailBudget);
  assert(overAmount === 6300, "Over budget amount must be Rs. 6,300");

  // Test 5: Reversal / Deletion logic (Section 35)
  const remainingBeforeDelete = subtractMoney(qumailBudget, 5000);
  const remainingAfterDelete = addMoney(remainingBeforeDelete, 5000);
  assert(remainingAfterDelete === qumailBudget, "Deleting an expense restores remaining budget back to Rs. 35,000");

  // Test 6: Currency formatting
  const formatted = formatCurrency(170000, "Rs.");
  assert(formatted === "Rs. 170,000", `Formatted currency should be "Rs. 170,000" (got "${formatted}")`);

  // Test 7: Timezone-safe calendar date handling (Section 50)
  const parsedOct1 = parseCalendarDate("2026-10-01");
  const calendarString = toCalendarDateString(parsedOct1);
  assert(calendarString === "2026-10-01", `Date string should remain 2026-10-01 without timezone shift (got ${calendarString})`);

  console.log("\n🎉 All financial calculation tests passed with 100% accuracy!\n");
}

runTests();
