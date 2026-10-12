"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { TYPE_META } from "./type-meta";
import type { ExpenseType } from "@/types";

const TABS: { type: ExpenseType; path: string }[] = [
  { type: "HOME", path: "/home" },
  { type: "OUTING", path: "/outing" },
  { type: "SHOPPING", path: "/shopping" },
];

/**
 * Floating header with Home · Outing · Shopping buttons. Keeps the selected
 * month/year when switching, and highlights the current page.
 */
export function TypeTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const year = params.get("year");
  const month = params.get("month");

  const hrefFor = (path: string) => {
    const q = new URLSearchParams();
    if (year) q.set("year", year);
    if (month && path !== "/shopping") q.set("month", month);
    const qs = q.toString();
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <nav
      aria-label="Expense types"
      className="sticky top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] z-10 rounded-[1.25rem] border border-border/70 bg-card/85 p-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.08)] backdrop-blur-xl"
    >
      <ul className="grid grid-cols-3 gap-1.5">
        {TABS.map((t) => {
          const meta = TYPE_META[t.type];
          const Icon = meta.icon;
          const active = pathname === t.path;
          return (
            <li key={t.type}>
              <Link
                href={hrefFor(t.path)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-all duration-200 sm:h-14 sm:flex-row sm:gap-3",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]",
                  active ? cn(meta.soft, "shadow-sm") : "hover:bg-accent/70",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 sm:size-10",
                    active ? "bg-card shadow-sm" : meta.soft,
                  )}
                >
                  <Icon className={cn("size-5", meta.text)} strokeWidth={2.2} />
                </span>
                <span
                  className={cn(
                    "text-[13px] font-semibold tracking-tight sm:text-base",
                    active ? "text-foreground" : "text-foreground/75 group-hover:text-foreground",
                  )}
                >
                  {meta.label}
                </span>
                {active && <span aria-hidden className={cn("absolute bottom-1 h-1 w-6 rounded-full sm:hidden", meta.bar)} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
