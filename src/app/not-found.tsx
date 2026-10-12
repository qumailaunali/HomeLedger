import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">That page doesn&apos;t exist.</p>
      <Link href="/" className={buttonVariants({ className: "mt-5" })}>
        Go to Dashboard
      </Link>
    </main>
  );
}
