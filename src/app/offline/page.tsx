import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline" };

/** Served by the service worker when a page that was never visited is opened offline. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <CloudOff className="size-5" aria-hidden />
      </span>
      <h1 className="text-lg font-semibold">You&apos;re offline</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        This page hasn&apos;t been opened on this device before. Pages you&apos;ve visited are still available, and expenses
        you add offline will sync when you&apos;re back online.
      </p>
      <Link href="/" className="mt-5 text-sm font-medium underline underline-offset-2">
        Open the Dashboard
      </Link>
    </main>
  );
}
