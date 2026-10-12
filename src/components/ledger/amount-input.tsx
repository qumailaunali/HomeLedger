"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Large amount field. Uses a text input with inputMode="decimal" so phones show
 * the numeric keypad, and strips anything that is not a digit, comma or point.
 */
export const AmountInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type" | "size"> & { symbol: string; size?: "lg" | "default" }
>(function AmountInput({ symbol, size = "lg", className, onChange, ...props }, ref) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-medium text-muted-foreground",
          size === "lg" ? "text-lg" : "text-sm",
        )}
      >
        {symbol}
      </span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="next"
        placeholder="0"
        className={cn(
          "tabular w-full rounded-2xl border bg-card pr-4 font-semibold tracking-tight shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-danger",
          size === "lg" ? "h-16 pl-14 text-3xl" : "h-11 pl-12 text-base",
          className,
        )}
        onChange={(e) => {
          e.target.value = e.target.value.replace(/[^\d.,]/g, "");
          onChange?.(e);
        }}
        {...props}
      />
    </div>
  );
});
