export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] rounded-card bg-ink-100" />
          <div className="mt-2 space-y-1.5">
            <div className="h-3.5 w-4/5 rounded bg-ink-100" />
            <div className="h-3.5 w-1/2 rounded bg-ink-100" />
            <div className="h-3 w-2/3 rounded bg-ink-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
