/**
 * Timezone-safe calendar date handling
 * Prevents off-by-one day bugs when converting between UTC and local time.
 */

export function toCalendarDateString(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseCalendarDate(dateStr: string): Date {
  // If YYYY-MM-DD, parse as UTC noon to prevent date shift in any timezone (+- 12h)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  return new Date(dateStr);
}

export function formatDisplayDate(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  
  // Use UTC getters if stored as UTC noon, or local
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // If it was stored as UTC noon:
  const day = d.getUTCDate();
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

export function formatMonthYear(year: number, month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[month - 1]} ${year}`;
}

export function getMonthBounds(year: number, month: number) {
  // Month is 1-indexed (1 = Jan, 12 = Dec)
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  // Last day of month
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { startDate, endDate };
}

export function getYearBounds(year: number) {
  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return { startDate, endDate };
}
