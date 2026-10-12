"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes injects a tiny script that applies the saved theme before paint.
 * It only needs to run from the server HTML; on the client we mark it inert so
 * React 19 doesn't warn about rendering a <script> tag.
 */
const scriptProps = typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange scriptProps={scriptProps}>
      {children}
    </NextThemesProvider>
  );
}
