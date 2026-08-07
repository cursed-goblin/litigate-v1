"use client"

import { useCallback, useEffect, useState } from "react"

import { API_BASE, getHealth, type Health } from "@/lib/api"

const SHEETS = [
  "Compliance",
  "Obligations",
  "Versions",
  "Outbox",
  "Audit",
  "Composition",
]

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-ink-3 pb-2">
      <dt className="text-parchment/40">{label}</dt>
      <dd className="truncate text-right text-parchment/90">{value}</dd>
    </div>
  )
}

export default function Page() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  const check = useCallback(async () => {
    try {
      setHealth(await getHealth())
      setError(null)
    } catch (cause) {
      setHealth(null)
      setError(cause instanceof Error ? cause.message : "unreachable")
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-ink-3 bg-ink-2 px-5">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-lg tracking-wide">Litigate</span>
          <span className="font-mono text-[11px] text-brass">no document loaded</span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span
            className={
              health ? "text-severity-green-i" : "text-severity-red-i"
            }
          >
            {health ? "API ONLINE" : "API OFFLINE"}
          </span>
          <button
            type="button"
            onClick={() => void check()}
            className="border border-ink-3 px-2 py-1 text-parchment/60 transition-colors hover:text-parchment"
          >
            RECHECK
          </button>
        </div>
      </header>

      <div className="h-[5px] shrink-0 bg-ink-3" />

      <main className="grid min-h-0 flex-1 grid-cols-2">
        <section className="overflow-y-auto bg-parchment px-10 py-8 text-ink">
          <h1 className="font-serif text-2xl">Document</h1>
          <p className="mt-4 max-w-prose font-serif text-sm leading-7 text-ink/70">
            Clause text renders here once the parsing endpoint is connected.
          </p>
        </section>

        <section className="overflow-y-auto bg-ink px-8 py-8">
          <h2 className="font-serif text-lg">Analysis</h2>
          <dl className="mt-6 space-y-3 font-mono text-[12px]">
            <Field label="ENDPOINT" value={API_BASE} />
            <Field label="STATUS" value={health?.status ?? error ?? "checking"} />
            <Field label="VERSION" value={health?.version ?? "\u2014"} />
            <Field label="PROVIDER" value={health?.provider ?? "\u2014"} />
            <Field
              label="GROQ KEY"
              value={health ? (health.providers.groq ? "present" : "missing") : "\u2014"}
            />
            <Field
              label="GEMINI KEY"
              value={health ? (health.providers.gemini ? "present" : "missing") : "\u2014"}
            />
            <Field label="CACHE" value={health ? String(health.cache) : "\u2014"} />
          </dl>
        </section>
      </main>

      <footer className="flex h-[44px] shrink-0 items-center gap-6 border-t border-ink-3 bg-ink-2 px-5 text-[11px] text-parchment/40">
        {SHEETS.map((sheet) => (
          <span key={sheet} className="transition-colors hover:text-parchment">
            {sheet}
          </span>
        ))}
      </footer>
    </div>
  )
}
