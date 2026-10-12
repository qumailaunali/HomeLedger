import { CardsSkeleton, ChartSkeleton, HeaderSkeleton, ListSkeleton } from "@/components/app/skeletons";

export default function Loading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <HeaderSkeleton />
      <CardsSkeleton />
      <div className="grid gap-4 lg:grid-cols-5">
        <ChartSkeleton className="lg:col-span-3" />
        <ChartSkeleton className="lg:col-span-2" />
      </div>
      <ListSkeleton />
    </div>
  );
}
