import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-50 aria-expanded:bg-slate-800 aria-expanded:text-slate-50",
        secondary:
          "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-50 aria-expanded:bg-slate-800 aria-expanded:text-slate-50",
        ghost:
          "hover:bg-slate-800 hover:text-slate-50 text-slate-400 aria-expanded:bg-slate-800 aria-expanded:text-slate-50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        // --- Game UI variants ---
        // Pill-shaped button used for navigation tabs and save/export actions.
        // Active/selected state is driven by aria-pressed.
        nav:
          "rounded-full border-slate-600 bg-slate-900/70 text-slate-100 font-bold uppercase tracking-[0.2em] " +
          "hover:bg-slate-800 hover:text-slate-50 " +
          "aria-pressed:bg-indigo-600 aria-pressed:border-indigo-500 aria-pressed:text-white aria-pressed:hover:bg-indigo-500",
        // Amber primary call-to-action (e.g. "Start Journey").
        cta:
          "bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold tracking-widest uppercase " +
          "shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:shadow-[0_0_20px_rgba(245,158,11,0.6)]",
        // Thick-bordered vertical card for hero class selection.
        // Selected state is driven by aria-pressed.
        "hero-card":
          "border-2 border-slate-700 bg-slate-800/50 hover:bg-slate-800 aria-pressed:border-amber-400 aria-pressed:bg-amber-400/10",
        // Fuchsia-themed button for soul/prestige upgrade actions.
        prestige:
          "border-fuchsia-800 bg-transparent text-fuchsia-300 hover:bg-fuchsia-950 hover:border-fuchsia-700 uppercase font-black tracking-wider text-xs",
        // Primary upgrade action button (gold-spending, e.g. Battle Drills, Recruit).
        upgrade:
          "bg-slate-700 text-slate-50 border-slate-600 hover:bg-slate-600 hover:text-white font-bold uppercase tracking-wider",
        // Secondary upgrade action button (e.g. Fortification, Party Slots).
        "upgrade-secondary":
          "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-slate-50 font-bold uppercase tracking-wider",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
