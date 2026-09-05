import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        neutral: "bg-surface-sunken text-ink-soft",
        signal: "bg-signal-soft text-signal-ink",
        clean: "bg-clean-soft text-clean",
        dirty: "bg-dirty-soft text-dirty",
        danger: "bg-danger-soft text-danger",
        ok: "bg-ok-soft text-ok",
        outline: "border border-steel-line text-ink-soft",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function shiftBadgeVariant(shift: string): BadgeProps["variant"] {
  if (shift === "Morning") return "ok";
  if (shift === "Evening") return "signal";
  return "neutral";
}
