/**
 * Development seed — realistic sample data based on the household's real
 * spreadsheet categories. Never runs in production, and never wipes existing
 * data unless you pass --reset.
 *
 *   npm run seed            # only seeds an empty database
 *   npm run seed -- --reset # wipes ALL data first (development only)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const reset = process.argv.includes("--reset");

const DEMO_EMAIL = process.env.SEED_EMAIL ?? "demo@homeledger.local";
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "demo-password";

const HOME_CATEGORIES: [string, number][] = [
  ["Food", 17000],
  ["Shopping", 15000],
  ["Masi", 15000],
  ["Petrol Freed", 15700],
  ["Mehran Petrol", 10000],
  ["Qumail", 7000],
  ["Sarah", 7000],
  ["Taha Van", 5500],
  ["Qumail Van", 5000],
  ["Quran", 4500],
  ["KC", 3000],
  ["Chokidar", 3000],
  ["Taha", 3000],
  ["Internet", 1400],
  ["Madrasa Van", 1300],
  ["Madrasa", 1200],
  ["Cable", 400],
];

const MEMBERS: [string, Record<number, number>][] = [
  ["Sarah", { 2025: 35000, 2026: 35000 }],
  ["Qumail", { 2025: 35000, 2026: 40000 }],
  ["Taha", { 2025: 35000, 2026: 35000 }],
  ["Farida", { 2025: 35000, 2026: 35000 }],
  ["Others", { 2025: 100000, 2026: 100000 }],
];

const SHOPPING_ITEMS: Record<string, string[]> = {
  Sarah: ["Winter dresses", "Shoes", "Lawn suit", "Handbag"],
  Qumail: ["Shopping shirts", "Jeans", "Sneakers", "Kurta"],
  Taha: ["School shoes", "Uniform", "Toys", "Jacket"],
  Farida: ["Shawl", "Sandals", "Dupatta", "Eid clothes"],
  Others: ["Eye glasses", "Medicine", "Pillow", "Trimmer", "Car headlight", "WD40", "Tyre repair kit", "Bulb", "Car wash", "Books", "Extension"],
};

const OUTINGS: [string, number][] = [
  ["Kolachi", 12500],
  ["KFC", 4500],
  ["Butlers Chocolate Cafe", 3800],
  ["BBQ Tonight", 9200],
  ["Pizza Hut", 6100],
  ["Ice cream at Hob Nob", 1500],
];

// Deterministic pseudo-random so every seed looks the same.
let state = 42;
const rand = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const vary = (amount: number, pct: number) => Math.round((amount * (1 + (rand() * 2 - 1) * pct)) / 50) * 50;
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV is production.");
  }
  const existing = await prisma.household.count();
  if (existing > 0 && !reset) {
    console.log("Database already has data — nothing seeded. Use `npm run seed -- --reset` to wipe and reseed (development only).");
    return;
  }
  if (reset) {
    console.log("Wiping all data…");
    await prisma.expense.deleteMany();
    await prisma.income.deleteMany();
    await prisma.shoppingBudget.deleteMany();
    await prisma.shoppingMember.deleteMany();
    await prisma.homeCategory.deleteMany();
    await prisma.user.deleteMany();
    await prisma.household.deleteMany();
  }

  const household = await prisma.household.create({
    data: {
      name: "Ali Household",
      currency: "PKR",
      currencySymbol: "Rs.",
      startingBalance: "60950.00",
      timezone: "Asia/Karachi",
      onboardedAt: new Date(),
    },
  });
  await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Qumail",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      householdId: household.id,
      role: "OWNER",
    },
  });

  const cat = new Map<string, string>();
  for (const [i, [name, expected]] of HOME_CATEGORIES.entries()) {
    const c = await prisma.homeCategory.create({
      data: { householdId: household.id, name, expectedMonthlyAmount: `${expected}.00`, sortOrder: i + 1 },
    });
    cat.set(name, c.id);
  }
  const mem = new Map<string, string>();
  for (const [i, [name, budgets]] of MEMBERS.entries()) {
    const m = await prisma.shoppingMember.create({
      data: {
        householdId: household.id,
        name,
        sortOrder: i + 1,
        budgets: { create: Object.entries(budgets).map(([year, amount]) => ({ year: Number(year), budgetAmount: `${amount}.00` })) },
      },
    });
    mem.set(name, m.id);
  }

  // January 2026 → October 2026 (up to the 11th for the current month)
  const months: [number, number, number][] = [];
  for (let m = 1; m <= 10; m++) months.push([2026, m, m === 10 ? 11 : 28]);

  const incomes = [];
  const expenses = [];
  for (const [y, m, lastDay] of months) {
    incomes.push({ householdId: household.id, amount: "170000.00", date: day(y, m, 1), description: "House money", source: "House money" });
    if (m % 3 === 0) {
      incomes.push({ householdId: household.id, amount: "25000.00", date: day(y, m, 15), description: "Extra cash", source: "Cash received" });
    }

    for (const [name, expected] of HOME_CATEGORIES) {
      const fixed = ["Internet", "Cable", "Masi", "Madrasa", "Madrasa Van", "Quran", "Chokidar", "KC", "Taha Van", "Qumail Van"].includes(name);
      const d = Math.min(2 + Math.floor(rand() * 8), lastDay);
      const amount = fixed ? expected : vary(expected, 0.25);
      expenses.push({
        householdId: household.id,
        type: "HOME" as const,
        amount: `${amount}.00`,
        date: day(y, m, d),
        description: name === "Internet" ? `${new Date(Date.UTC(y, m - 1)).toLocaleString("en", { month: "long" })} internet bill` : name,
        homeCategoryId: cat.get(name)!,
      });
    }

    const purchases = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < purchases; i++) {
      const who = pick(MEMBERS)[0];
      const base = who === "Others" ? 6000 : 3500;
      expenses.push({
        householdId: household.id,
        type: "SHOPPING" as const,
        amount: `${vary(base, 0.6)}.00`,
        date: day(y, m, 1 + Math.floor(rand() * lastDay)),
        description: pick(SHOPPING_ITEMS[who]),
        shoppingMemberId: mem.get(who)!,
      });
    }

    const outings = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < outings; i++) {
      const [place, amount] = pick(OUTINGS);
      expenses.push({
        householdId: household.id,
        type: "OUTING" as const,
        amount: `${vary(amount, 0.2)}.00`,
        date: day(y, m, 1 + Math.floor(rand() * lastDay)),
        description: place,
        place,
        numberOfPeople: 2 + Math.floor(rand() * 4),
        paymentMethod: pick(["Cash", "Card"]),
      });
    }
  }

  await prisma.income.createMany({ data: incomes });
  await prisma.expense.createMany({ data: expenses });

  console.log(`Seeded ${incomes.length} money-received records and ${expenses.length} expenses.`);
  console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
