import { brandLogo } from "@/assets";

export function Brand({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  return <span className={`inline-flex shrink-0 items-center text-[27px] font-bold tracking-[-0.04em] ${iconOnly ? "min-h-9" : "min-h-11 gap-2.5"}`}><img src={brandLogo} alt="" aria-hidden="true" width={40} height={40} className={iconOnly ? "h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9" : "size-10 shrink-0 object-contain"} />{!iconOnly && <span className={compact ? "sr-only sm:not-sr-only" : undefined}>Blazemap</span>}</span>;
}
