import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[1rem] border border-input bg-white/80 px-4 py-2 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] transition-[background-color,border-color,box-shadow] outline-none selection:bg-primary/20 selection:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/90 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/90 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        "focus-visible:border-foreground/15 focus-visible:ring-[3px] focus-visible:ring-ring/12",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/12",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
