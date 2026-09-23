import { useId, type ReactNode } from "react";
import { Popover } from "radix-ui";
import { Button } from "./button";

export function FieldLength({ value, min, max }: { value: string; min: number; max: number }) {
  return <span className="mt-1 block text-xs font-normal text-muted-foreground">{value.length} / {max} characters · minimum {min}</span>;
}

export function FieldHelp({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return <Popover.Root>
    <Popover.Trigger asChild><button type="button" aria-label={`Help: ${title}`} className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs font-bold text-primary underline underline-offset-4 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary">Help</button></Popover.Trigger>
    <Popover.Portal><Popover.Content aria-labelledby={id} sideOffset={6} collisionPadding={12} className="z-[80] w-[min(20rem,calc(100vw-24px))] rounded-xl border bg-white p-4 text-foreground shadow-xl">
      <p id={id} className="text-sm font-bold">{title}</p>
      <div className="mt-2 text-sm leading-6">{children}</div>
      <Popover.Close asChild><Button type="button" variant="outline" className="mt-3">Close help</Button></Popover.Close>
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
