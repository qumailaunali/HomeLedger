"use client";

import { useEffect } from "react";
import { CloudOff, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Friendly fallback — never shows stack traces or database errors. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const Icon = offline ? CloudOff : TriangleAlert;
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <h1 className="text-lg font-semibold">{offline ? "You're offline" : "Something went wrong"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {offline
          ? "This page needs a connection. Expenses you add while offline are kept and will sync."
          : "We couldn't load this page. Your data is safe — please try again."}
      </p>
      <Button className="mt-5" onClick={() => retry()}>
        <RotateCcw /> Try again
      </Button>
    </div>
  );
}
