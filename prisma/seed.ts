import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting HomeLedger database seeding on Neon PostgreSQL...");

  // 1. Clean existing records for fresh seed
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.shoppingBudget.deleteMany();
  await prisma.shoppingMember.deleteMany();
  await prisma.homeCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.household.deleteMany();

  // 2. Create Household
  const household = await prisma.household.create({
    data: {
      name: "Ali Household",
      currency: "PKR",
      currencySymbol: "Rs.",
      startingBalance: 60950,
      dateFormat: "DD MMM YYYY",
    },
  });

  // 3. Create Default User
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.create({
    data: {
      email: "demo@homeledger.com",
      name: "Qumail Ali",
      passwordHash,
      householdId: household.id,
    },
  });

  // 4. Create Home Expense Categories
  const homeCategoriesData = [
    { name: "Food", expected: 17000, icon: "utensils", order: 1 },
    { name: "Internet", expected: 1400, icon: "wifi", order: 2 },
    { name: "Cable", expected: 400, icon: "tv", order: 3 },
    { name: "KC", expected: 3000, icon: "home", order: 4 },
    { name: "Masi", expected: 15000, icon: "user-check", order: 5 },
    { name: "Madrasa", expected: 1200, icon: "book-open", order: 6 },
    { name: "Madrasa Van", expected: 1300, icon: "bus", order: 7 },
    { name: "Quran", expected: 4500, icon: "book", order: 8 },
    { name: "Qumail Van", expected: 5000, icon: "bus", order: 9 },
    { name: "Taha Van", expected: 5500, icon: "bus", order: 10 },
    { name: "Mehran Petrol", expected: 10000, icon: "fuel", order: 11 },
    { name: "Petrol Freed", expected: 15700, icon: "fuel", order: 12 },
    { name: "Chokidar", expected: 3000, icon: "shield", order: 13 },
    { name: "Qumail", expected: 7000, icon: "user", order: 14 },
    { name: "Sarah", expected: 7000, icon: "user", order: 15 },
    { name: "Taha", expected: 3000, icon: "user", order: 16 },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of homeCategoriesData) {
    const created = await prisma.homeCategory.create({
      data: {
        householdId: household.id,
        name: cat.name,
        expectedMonthlyAmount: cat.expected,
        icon: cat.icon,
        sortOrder: cat.order,
      },
    });
    categoryMap.set(cat.name, created.id);
  }

  // 5. Create Shopping Members & Yearly Budgets (2025, 2026, 2027)
  const shoppingMembersData = [
    { name: "Sarah", budgets: { 2025: 35000, 2026: 35000, 2027: 40000 }, order: 1 },
    { name: "Qumail", budgets: { 2025: 35000, 2026: 35000, 2027: 40000 }, order: 2 },
    { name: "Taha", budgets: { 2025: 35000, 2026: 35000, 2027: 40000 }, order: 3 },
    { name: "Farida", budgets: { 2025: 35000, 2026: 35000, 2027: 40000 }, order: 4 },
    { name: "Others", budgets: { 2025: 100000, 2026: 100000, 2027: 120000 }, order: 5 },
  ];

  const memberMap = new Map<string, string>();
  for (const member of shoppingMembersData) {
    const createdMember = await prisma.shoppingMember.create({
      data: {
        householdId: household.id,
        name: member.name,
        sortOrder: member.order,
      },
    });
    memberMap.set(member.name, createdMember.id);

    for (const [yearStr, amount] of Object.entries(member.budgets)) {
      await prisma.shoppingBudget.create({
        data: {
          memberId: createdMember.id,
          year: parseInt(yearStr, 10),
          budgetAmount: amount,
        },
      });
    }
  }

  // 6. Income Records
  // Oct 1, 2026: Rs. 170,000
  await prisma.income.create({
    data: {
      householdId: household.id,
      amount: 170000,
      date: new Date(Date.UTC(2026, 9, 1, 12, 0, 0)),
      description: "House money / Monthly salary",
      source: "Salary / House money",
    },
  });

  // 7. Home Expenses for October 2026
  const homeExpenses = [
    { cat: "Masi", amount: 15000, day: 2, desc: "Monthly salary" },
    { cat: "Taha", amount: 10000, day: 3, desc: "Pocket money & van fee" },
    { cat: "Internet", amount: 1400, day: 5, desc: "October internet bill" },
    { cat: "Petrol Freed", amount: 15700, day: 8, desc: "Freed fuel refuel" },
    { cat: "Food", amount: 14200, day: 10, desc: "Monthly grocery from Imtiaz" },
    { cat: "Quran", amount: 4500, day: 11, desc: "Quran teacher monthly fee" },
  ];

  for (const exp of homeExpenses) {
    await prisma.expense.create({
      data: {
        householdId: household.id,
        type: "HOME",
        amount: exp.amount,
        date: new Date(Date.UTC(2026, 9, exp.day, 12, 0, 0)),
        description: exp.desc,
        homeCategoryId: categoryMap.get(exp.cat),
      },
    });
  }

  // 8. Shopping Expenses for October 2026
  const shoppingExpenses = [
    { member: "Qumail", amount: 5000, day: 4, desc: "Shopping shirts" },
    { member: "Sarah", amount: 12000, day: 7, desc: "Winter dresses" },
    { member: "Others", amount: 8500, day: 9, desc: "Eye glasses & medicines" },
    { member: "Farida", amount: 6000, day: 11, desc: "Shoes & handbag" },
  ];

  for (const exp of shoppingExpenses) {
    await prisma.expense.create({
      data: {
        householdId: household.id,
        type: "SHOPPING",
        amount: exp.amount,
        date: new Date(Date.UTC(2026, 9, exp.day, 12, 0, 0)),
        description: exp.desc,
        shoppingMemberId: memberMap.get(exp.member),
      },
    });
  }

  // 9. Outing Expenses for October 2026
  const outingExpenses = [
    { place: "Kolachi", amount: 12500, day: 6, desc: "Family dinner at Do Darya", people: 5, method: "Card" },
    { place: "KFC", amount: 4500, day: 9, desc: "Weekend family meal", people: 3, method: "Cash" },
  ];

  for (const exp of outingExpenses) {
    await prisma.expense.create({
      data: {
        householdId: household.id,
        type: "OUTING",
        amount: exp.amount,
        date: new Date(Date.UTC(2026, 9, exp.day, 12, 0, 0)),
        description: exp.desc,
        place: exp.place,
        numberOfPeople: exp.people,
        paymentMethod: exp.method,
      },
    });
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
