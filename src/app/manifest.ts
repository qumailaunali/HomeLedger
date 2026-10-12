import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Home Expense Tracker",
    short_name: "Expenses",
    description: "Simple household expense tracking: balance, budgets, records and exports.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdfcf8",
    theme_color: "#f9fafb",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add Expense", short_name: "Add", url: "/expenses/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "All Records", short_name: "Records", url: "/records", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
