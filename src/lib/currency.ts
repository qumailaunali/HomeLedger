/**
 * Currency and Financial Utilities for HomeLedger
 * Guarantees precise calculations without floating-point inaccuracies.
 */

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function addMoney(a: number, b: number): number {
  const centsA = Math.round(a * 100);
  const centsB = Math.round(b * 100);
  return (centsA + centsB) / 100;
}

export function subtractMoney(a: number, b: number): number {
  const centsA = Math.round(a * 100);
  const centsB = Math.round(b * 100);
  return (centsA - centsB) / 100;
}

export function formatCurrency(amount: number, symbol = "Rs."): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol} 0`;
  }
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format with commas, e.g. 170,000 or 14,250.50
  const parts = absAmount.toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimalPart = parts[1] === "00" ? "" : `.${parts[1]}`;

  const formatted = `${symbol} ${integerPart}${decimalPart}`;
  return isNegative ? `-${formatted}` : formatted;
}

export function formatCompactCurrency(amount: number, symbol = "Rs."): string {
  if (isNaN(amount)) return `${symbol} 0`;
  const abs = Math.abs(amount);
  if (abs >= 10000000) {
    return `${symbol} ${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${symbol} ${(amount / 100000).toFixed(2)} Lac`;
  }
  if (abs >= 1000) {
    return `${symbol} ${(amount / 1000).toFixed(1)}k`;
  }
  return formatCurrency(amount, symbol);
}

export function calculatePercentage(used: number, budget: number): number {
  if (!budget || budget <= 0) return 0;
  return Math.min(Math.round((used / budget) * 100), 999);
}
