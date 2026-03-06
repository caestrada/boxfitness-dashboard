"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-card/80 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary/80">
          Application error
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Something broke in the new workspace.
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Reset the current route and try again. If the issue persists, inspect
          the server logs before building more product surface area on top of it.
        </p>
        <div className="mt-8">
          <Button onClick={reset} size="lg" className="rounded-full px-7">
            <RefreshCw className="size-4" />
            Reset route
          </Button>
        </div>
      </div>
    </main>
  )
}
