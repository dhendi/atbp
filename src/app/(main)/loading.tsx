function CardSkeleton() {
  return (
    <div className="w-[168px] shrink-0 animate-pulse md:w-[200px]">
      <div className="aspect-[4/5] rounded-card bg-ink-100" />
      <div className="mt-2 space-y-1.5">
        <div className="h-3.5 w-4/5 rounded bg-ink-100" />
        <div className="h-3.5 w-1/2 rounded bg-ink-100" />
        <div className="h-3 w-2/3 rounded bg-ink-100" />
      </div>
    </div>
  );
}

function CardRow() {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function HomeLoading() {
  return (
    <div className="space-y-16 pb-6 pt-4 md:space-y-24 md:pt-8">
      <section className="px-4 md:px-6">
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-7 w-64 rounded-full bg-ink-100" />
          <div className="h-16 w-full max-w-lg rounded-2xl bg-ink-100" />
          <div className="h-5 w-full max-w-md rounded bg-ink-100" />
          <div className="h-13 w-full max-w-md rounded-full bg-ink-100" />
        </div>
      </section>
      <CardRow />
      <CardRow />
      <CardRow />
    </div>
  );
}
