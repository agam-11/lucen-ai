import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90",
        info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 [&>svg]:text-blue-600",
        neutral:
          "bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-900/30 dark:border-slate-700 dark:text-slate-300 [&>svg]:text-slate-600",
        warning:
          "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300 [&>svg]:text-amber-600",
        success:
          "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300 [&>svg]:text-green-600",
        ghost:
          "border-none bg-slate-50 dark:bg-slate-800/20 text-slate-700 dark:text-slate-400 [&>svg]:text-slate-500",
        // 5. A clean top-border style
        topBorder:
          "border-t-4 border-l-0 border-r-0 border-b-0 border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 [&>svg]:text-sky-600",

        // 7. A modern gradient style
        gradient:
          "text-foreground border-border bg-gradient-to-r from-background to-muted",

        // 8. A "premium" dark style
        dark: "bg-slate-900 border-slate-800 text-slate-50 dark:bg-slate-900 dark:border-slate-700 [&>svg]:text-slate-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({ className, variant, ...props }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
