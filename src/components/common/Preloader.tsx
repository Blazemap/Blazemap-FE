export function Preloader() {
  return (
    <div className="min-h-dvh bg-background p-5 motion-safe:animate-pulse" role="status" aria-label="Loading Blazemap" aria-live="polite" aria-atomic="true">
      <span className="sr-only">Loading Blazemap</span>
      <div aria-hidden="true" className="mx-auto max-w-6xl"><div className="flex items-center justify-between rounded-xl border bg-white p-4"><span className="h-10 w-36 rounded bg-secondary" /><span className="size-11 rounded-full bg-secondary" /></div><div className="mt-5 grid gap-5 lg:grid-cols-[280px_1fr]"><div className="space-y-3 rounded-xl border bg-white p-4">{Array.from({ length: 6 }, (_, index) => <span key={index} className="block h-11 rounded-lg bg-secondary" />)}</div><div className="space-y-5"><span className="block h-36 rounded-xl bg-secondary" /><div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <span key={index} className="block h-32 rounded-xl bg-secondary" />)}</div></div></div></div>
    </div>
  );
}
