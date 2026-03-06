"use client"

import type { ReactNode } from "react"
import { Toaster } from "sonner"

import { QueryProvider } from "@/components/providers/query-provider"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <Toaster
        closeButton
        position="top-right"
        richColors
        theme="light"
        toastOptions={{
          classNames: {
            toast:
              "border border-border/80 bg-white text-foreground shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)]",
          },
        }}
      />
    </QueryProvider>
  )
}
