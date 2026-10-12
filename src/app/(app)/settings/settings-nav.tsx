"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/home-categories", label: "Home Categories" },
  { href: "/settings/shopping-members", label: "Shopping Members" },
  { href: "/settings/budgets", label: "Shopping Budgets" },
  { href: "/settings/data", label: "Data Management" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.map((i) => {
          const active = pathname === i.href;
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-card text-foreground shadow-sm ring-1 ring-border/70" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
