export function Preloader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background" role="status" aria-label="Loading" aria-live="polite" aria-atomic="true">
      <span className="relative grid size-28 place-items-center">
        <span aria-hidden="true" className="absolute inset-1 rounded-full border-2 border-primary/20" />
        <span aria-hidden="true" className="absolute inset-1 rounded-full border-2 border-transparent border-t-primary motion-safe:animate-spin motion-reduce:animate-none" />
        <img src="/logo.png" width="56" height="68" alt="" className="h-[68px] w-14 object-contain" />
      </span>
      <span className="sr-only">Loading Blazemap</span>
    </div>
  );
}
