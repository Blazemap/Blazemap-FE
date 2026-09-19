export function MapSkeleton() {
  return <div role="status" aria-label="Loading situation map" className="relative h-full min-h-0 overflow-hidden bg-secondary motion-safe:animate-pulse"><span className="sr-only">Loading situation map</span><span className="absolute inset-0 bg-[linear-gradient(135deg,#e6eddf_0%,#f7f7ef_48%,#dce2d3_100%)]" /><span className="absolute bottom-28 right-3 flex flex-col gap-2"><span className="size-11 rounded bg-white shadow-sm" /><span className="size-11 rounded bg-white shadow-sm" /><span className="size-11 rounded bg-white shadow-sm" /></span><span className="absolute bottom-3 right-3 h-6 w-28 rounded bg-white shadow-sm" /></div>;
}

export function ObservationListSkeleton() {
  return <div role="status" aria-label="Loading observations" className="space-y-2 motion-safe:animate-pulse"><span className="sr-only">Loading observations</span>{Array.from({ length: 5 }, (_, index) => <div key={index} className="flex gap-3 rounded-xl border border-primary/10 bg-white p-4"><span className="size-10 shrink-0 rounded-sm bg-secondary" /><span className="min-w-0 flex-1"><span className="block h-5 w-3/4 rounded-full bg-secondary" /><span className="mt-2 block h-4 w-32 rounded-full bg-secondary/80" /></span></div>)}</div>;
}

export function GovernmentReportSkeleton() {
  return <div role="status" aria-label="Loading reports" className="space-y-3 motion-safe:animate-pulse">{Array.from({ length: 3 }, (_, index) => <div key={index} aria-hidden="true" className="rounded-xl border bg-white p-4"><span className="block h-3 w-24 rounded bg-secondary" /><span className="mt-2 block h-5 w-3/4 rounded bg-secondary" /><span className="mt-2 block h-10 w-full rounded bg-secondary" /><span className="mt-2 block h-3 w-2/3 rounded bg-secondary" /><span className="mt-1 block h-3 w-1/2 rounded bg-secondary" /><span className="mt-2 block h-3 w-3/4 rounded bg-secondary" /><span className="mt-3 block h-3 w-24 rounded bg-secondary" /></div>)}</div>;
}

export function GovernmentReportDetailSkeleton() {
  return <section role="status" aria-label="Loading report details" className="space-y-4 rounded-sm border border-primary/10 bg-white p-4 motion-safe:animate-pulse">
    <span className="sr-only">Loading report details</span>
    <div aria-hidden="true" className="space-y-3">
      <span className="block h-5 w-32 rounded-full bg-secondary" />
      <span className="block h-4 w-full rounded-full bg-secondary" />
      <span className="block h-4 w-4/5 rounded-full bg-secondary" />
    </div>
    <div aria-hidden="true" className="space-y-4 text-sm">
      <div><span className="block h-4 w-24 rounded-full bg-secondary/80" /><div className="mt-2 flex gap-3"><span className="h-7 w-24 rounded-full bg-secondary" /><span className="h-7 w-20 rounded-full bg-secondary" /></div></div>
      <div><span className="block h-4 w-28 rounded-full bg-secondary/80" /><span className="mt-2 block h-4 w-48 rounded-full bg-secondary" /></div>
      <div><span className="block h-4 w-20 rounded-full bg-secondary/80" /><span className="mt-2 block h-4 w-3/4 rounded-full bg-secondary" /><span className="mt-2 block h-4 w-5/6 rounded-full bg-secondary" /></div>
    </div>
    <div aria-hidden="true" className="space-y-3 border-t pt-3">
      <span className="block h-5 w-52 rounded-full bg-secondary" />
      <span className="block h-4 w-full rounded-full bg-secondary" />
      <span className="block h-4 w-5/6 rounded-full bg-secondary" />
      {Array.from({ length: 3 }, (_, index) => <div key={index}><span className="block h-3 w-32 rounded-full bg-secondary/80" /><span className="mt-2 block h-3 w-4/5 rounded-full bg-secondary" /></div>)}
    </div>
    <div aria-hidden="true" className="border-t pt-4">
      <span className="block h-5 w-24 rounded-full bg-secondary" />
      <div className="mt-4 ml-2 space-y-5 border-l border-primary/10 pl-5">{Array.from({ length: 2 }, (_, index) => <div key={index}><span className="block h-4 w-28 rounded-full bg-secondary" /><span className="mt-2 block h-3 w-48 rounded-full bg-secondary/80" /></div>)}</div>
    </div>
    <div aria-hidden="true" className="space-y-4 border-t pt-4">
      <div><span className="block h-4 w-16 rounded-full bg-secondary/80" /><span className="mt-2 block h-11 w-full rounded-lg bg-secondary" /></div>
      <div><span className="block h-4 w-24 rounded-full bg-secondary/80" /><span className="mt-2 block h-24 w-full rounded-lg bg-secondary" /></div>
      <div><span className="block h-4 w-44 rounded-full bg-secondary/80" /><span className="mt-2 block h-8 w-3/4 rounded bg-secondary" /></div>
      <span className="block h-11 w-24 rounded-full bg-secondary" />
    </div>
  </section>;
}

export function FeedSkeleton({ variant = "staff" }: { variant?: "citizen" | "staff" }) {
  const citizen = variant === "citizen";
  return <div role="status" aria-label="Loading published updates" className="space-y-5 motion-safe:animate-pulse"><span className="sr-only">Loading published updates</span>{Array.from({ length: 3 }, (_, index) => <article key={index} className="overflow-hidden rounded-sm border border-primary/10 bg-white shadow-sm">
    <header className="flex flex-wrap items-center gap-3 border-b border-primary/10 px-5 py-4"><span className={`size-10 shrink-0 bg-secondary ${citizen ? "rounded-sm" : "rounded-xl"}`} /><span className="min-w-0 flex-1"><span className="block h-5 w-36 rounded-full bg-secondary" /><span className="mt-1 block h-4 w-24 rounded-full bg-secondary/70" /></span>{!citizen && <span className="h-7 w-24 rounded-full bg-secondary" />}</header>
    <div className={`px-5 py-6 ${citizen ? "" : "sm:px-7"}`}><span className={`block w-3/4 rounded-full bg-secondary ${citizen ? "h-7" : "h-8"}`} /><div className={`mt-5 divide-y divide-primary/10 border-primary/10 ${citizen ? "border-y" : "rounded-xl border bg-secondary/25 px-4"}`}>{Array.from({ length: 2 }, (_, row) => <div key={row} className="py-4"><span className="block h-4 w-28 rounded-full bg-secondary/70" /><span className="mt-1.5 block h-5 w-3/5 rounded-full bg-secondary" /></div>)}</div></div>
    <footer className={`border-t border-primary/10 px-5 py-3 ${citizen ? "" : "flex flex-wrap items-center justify-between gap-3"}`}><span className={`block rounded bg-secondary/70 ${citizen ? "h-5 w-full" : "h-10 w-64 max-w-xs"}`} />{!citizen && <span className="h-10 w-28 rounded-full bg-secondary" />}</footer>
  </article>)}</div>;
}
