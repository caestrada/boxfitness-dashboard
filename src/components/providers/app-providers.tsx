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
        theme="dark"
        toastOptions={{
          classNames: {
            toast:
              "border border-white/10 bg-zinc-950 text-zinc-50 shadow-2xl shadow-black/30",
          },
        }}
      />
    </QueryProvider>
  )
}
