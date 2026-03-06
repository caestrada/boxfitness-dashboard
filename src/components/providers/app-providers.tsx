"use client"

import type { ReactNode } from "react"
import { Toaster } from "sonner"

import { QueryProvider } from "@/components/providers/query-provider"
import {
  ThemeProvider,
  useTheme,
} from "@/components/providers/theme-provider"

function AppToaster() {
  const { theme } = useTheme()

  return (
    <Toaster
      closeButton
      position="top-right"
      richColors
      theme={theme}
      toastOptions={{
        classNames: {
          toast:
            "border border-border/80 bg-white text-foreground shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50",
        },
      }}
    />
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        {children}
        <AppToaster />
      </ThemeProvider>
    </QueryProvider>
  )
}
