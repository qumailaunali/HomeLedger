import { Skeleton } from "@/components/ui/misc";

/** Skeletons shaped like the real content, so pages don't jump when data arrives. */

export function HeaderSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-border/70 bg-card p-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-border/70 bg-card p-5 ${className ?? ""}`}>
      <Skeleton className="h-4 w-40" />
      <div className="mt-6 flex h-48 items-end gap-3">
        {[45, 70, 55, 85, 60, 75].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <Skeleton className="h-4 w-44" />
      <div className="mt-4 grid gap-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-40 max-w-full" />
              <Skeleton className="mt-1.5 h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="flex gap-6 border-b bg-muted px-4 py-3">
        {[60, 80, 120, 160, 70, 70].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-6 border-b border-border/50 px-4 py-3.5 last:border-0">
          {[60, 80, 120, 160, 70, 70].map((w, j) => (
            <Skeleton key={j} className="h-3.5" style={{ width: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}
