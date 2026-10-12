import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 pt-safe pb-safe">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/icons/icon-192.png" alt="" width={96} height={96} className="mb-3 size-14 rounded-2xl border border-border/60 shadow-sm" loading="eager" />
        <p className="text-lg font-semibold">Home Expense Tracker</p>
        <p className="text-sm text-muted-foreground">Your household money, without the spreadsheet.</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
