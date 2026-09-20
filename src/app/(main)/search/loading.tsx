export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-4 md:px-6">
      <div className="h-11 animate-pulse rounded-full bg-ink-100" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/5] rounded-card bg-ink-100" />
            <div className="mt-2 space-y-1.5">
              <div className="h-3.5 w-4/5 rounded bg-ink-100" />
              <div className="h-3.5 w-1/2 rounded bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
