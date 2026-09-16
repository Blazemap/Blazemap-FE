import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full text-sm font-medium transition-colors motion-safe:active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-forest",
        outline: "border border-primary/25 bg-transparent text-primary hover:bg-secondary",
        ghost: "text-foreground hover:bg-secondary",
      },
      size: {
        default: "min-h-11 px-5 py-2.5",
        lg: "min-h-13 px-6 py-3.5 text-[15px]",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({ className, variant, size, asChild = false, ...props }: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : "button";
  return <Component data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
