"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { DragEvent } from "react"

import {
  API_BASE,
  getHealth,
  uploadContract,
  type Health,
  type ParsedContract,
} from "@/lib/api"

const SHEETS = [
  "Compliance",
  "Obligations",
  "Versions",
  "Outbox",
  "Audit",
  "Composition",
]

const ACCEPT = ".pdf,.docx,.txt,.md"
const DASH = "\u2014"

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
  const [contract, setContract] = useState<ParsedContract | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const ingest = useCallback(async (file: File) => {
    setBusy(true)
    setUploadError(null)
    try {
      const parsed = await uploadContract(file)
      setContract(parsed)
      setSelected(parsed.clauses[0]?.id ?? null)
    } catch (cause) {
      setContract(null)
      setSelected(null)
      setUploadError(cause instanceof Error ? cause.message : "upload failed")
    } finally {
      setBusy(false)
    }
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files?.[0]
      if (file) {
        void ingest(file)
      }
    },
    [ingest],
  )

  const active = contract?.clauses.find((item) => item.id === selected) ?? null
  const words = contract
    ? contract.clauses.reduce((total, item) => total + item.words, 0)
    : 0

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-ink-3 bg-ink-2 px-5">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-lg tracking-wide">Litigate</span>
          <span className="font-mono text-[11px] text-brass">
            {contract
              ? `${contract.filename} ${DASH} ${contract.clauseCount} clauses`
              : "no document loaded"}
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void ingest(file)
              }
              event.target.value = ""
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="border border-brass/50 px-2 py-1 text-brass transition-colors hover:bg-brass/10 disabled:opacity-40"
          >
            {busy ? "PARSING..." : "OPEN DOCUMENT"}
          </button>
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
        <section
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="overflow-y-auto bg-parchment px-10 py-8 text-ink"
        >
          {contract ? (
            <div className="space-y-6">
              {contract.clauses.map((clause) => (
                <article
                  key={clause.id}
                  onClick={() => setSelected(clause.id)}
                  className={`cursor-pointer border-l-2 pl-4 transition-colors ${
                    clause.id === selected
                      ? "border-brass"
                      : "border-transparent hover:border-brass/40"
                  }`}
                >
                  <h3 className="font-serif text-base text-ink">
                    <span className="font-mono text-[11px] text-ink/40">
                      {clause.number}
                    </span>{" "}
                    {clause.title}
                  </h3>
                  {clause.text ? (
                    <p className="mt-2 whitespace-pre-wrap font-serif text-sm leading-7 text-ink/75">
                      {clause.text}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-serif text-2xl text-ink/80">Open a contract</p>
              <p className="mt-3 max-w-sm font-sans text-sm leading-6 text-ink/50">
                Drop a PDF, DOCX, or TXT file here, or use the button above.
                Scanned pages without selectable text are not supported.
              </p>
              {busy ? (
                <p className="mt-6 font-mono text-[11px] text-ink/50">
                  Parsing. The first request can take a minute if the API was
                  idle.
                </p>
              ) : null}
              {uploadError ? (
                <p className="mt-6 max-w-sm font-mono text-[11px] text-severity-red-p">
                  {uploadError}
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section className="overflow-y-auto bg-ink px-8 py-8">
          <h2 className="font-serif text-lg">Analysis</h2>

          {active ? (
            <div className="mt-6 border border-ink-3 bg-ink-2 p-4">
              <p className="font-mono text-[11px] text-brass">
                CLAUSE {active.number} {DASH} {active.words} words
              </p>
              <p className="mt-2 font-serif text-sm text-parchment/90">
                {active.title}
              </p>
              <p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-6 text-parchment/60">
                {active.text || "This heading has no body text."}
              </p>
            </div>
          ) : (
            <p className="mt-4 font-sans text-sm text-parchment/50">
              Load a document and select a clause to inspect it.
            </p>
          )}

          <dl className="mt-8 space-y-3 font-mono text-[12px]">
            <Field label="DOCUMENT" value={contract?.filename ?? DASH} />
            <Field
              label="CLAUSES"
              value={contract ? String(contract.clauseCount) : DASH}
            />
            <Field label="WORDS" value={contract ? String(words) : DASH} />
            <Field
              label="CHARACTERS"
              value={contract ? String(contract.characters) : DASH}
            />
          </dl>

          <dl className="mt-6 space-y-3 font-mono text-[12px]">
            <Field label="ENDPOINT" value={API_BASE} />
            <Field label="STATUS" value={health?.status ?? error ?? "checking"} />
            <Field label="VERSION" value={health?.version ?? DASH} />
            <Field label="PROVIDER" value={health?.provider ?? DASH} />
            <Field
              label="GROQ KEY"
              value={
                health ? (health.providers.groq ? "present" : "missing") : DASH
              }
            />
            <Field label="CACHE" value={health ? String(health.cache) : DASH} />
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
