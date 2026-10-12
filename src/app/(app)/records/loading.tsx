import { HeaderSkeleton, TableSkeleton } from "@/components/app/skeletons";
import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading records">
      <HeaderSkeleton />
      <Skeleton className="h-24 rounded-2xl" />
      <TableSkeleton />
    </div>
  );
}
