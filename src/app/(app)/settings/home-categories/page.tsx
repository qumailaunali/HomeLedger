import type { Metadata } from "next";
import { requireHousehold } from "@/server/auth";
import { getAllCategories } from "@/server/queries/settings";
import { CategoriesManager } from "./categories-manager";

export const metadata: Metadata = { title: "Home categories" };

export default async function HomeCategoriesPage() {
  const { household } = await requireHousehold();
  const categories = await getAllCategories(household.id);
  return <CategoriesManager categories={categories} />;
}
