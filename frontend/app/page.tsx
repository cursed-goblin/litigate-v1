"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"

import {
  API_BASE,
  explainFindings,
  getHealth,
  uploadContract,
  type Explanation,
  type Finding,
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
const RANK: Record<string, number> = { high: 3, medium: 2, low: 1 }

const TEXT_TONE: Record<string, string> = {
  high: "text-severity-red-i",
  medium: "text-severity-amber-i",
  low: "text-severity-green-i",
}

const FILL_TONE: Record<string, string> = {
  high: "bg-severity-red-p",
  medium: "bg-severity-amber-p",
  low: "bg-severity-green-p",
}

const EDGE_TONE: Record<string, string> = {
  high: "border-severity-red-p",
  medium: "border-severity-amber-p",
  low: "border-severity-green-p",
}

function rupees(value: number | undefined) {
  if (!value || value <= 0) {
    return DASH
  }
  return "INR " + value.toLocaleString("en-IN")
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-ink-3 pb-2">
      <dt className="text-parchment/40">{label}</dt>
      <dd className="truncate text-right text-parchment/90">{value}</dd>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value) {
    return null
  }
  return (
    <p className="mt-1 font-sans text-[12px] leading-6 text-parchment/60">
      <span className="text-parchment/35">{label} </span>
      {value}
    </p>
  )
}

function FindingCard({
  finding,
  explanation,
  pending,
  onSelect,
}: {
  finding: Finding
  explanation?: Explanation
  pending: boolean
  onSelect: (clauseId: string) => void
}) {
  const tone = TEXT_TONE[finding.severity] ?? "text-parchment"
  const edge = EDGE_TONE[finding.severity] ?? "border-ink-3"

  return (
    <article
      onClick={() => finding.clauseId && onSelect(finding.clauseId)}
      className={`cursor-pointer border border-ink-3 border-l-2 bg-ink-2 p-4 transition-colors hover:border-brass/40 ${edge}`}
    >
      <div className="flex items-baseline justify-between gap-4 font-mono text-[10px]">
        <span className={tone}>
          {finding.severity.toUpperCase()} {DASH} {finding.ruleId}
        </span>
        <span className="text-parchment/40">
          {finding.clauseNumber ? "CLAUSE " + finding.clauseNumber : "NOT PRESENT"}
        </span>
      </div>

      <p className="mt-2 font-serif text-sm text-parchment/90">{finding.title}</p>

      <p className="mt-1 font-mono text-[11px] text-brass">{finding.observed}</p>

      <p className="mt-3 font-sans text-[12px] leading-6 text-parchment/60">
        {finding.detail}
      </p>

      {finding.evidence ? (
        <blockquote className="mt-3 border-l-2 border-brass pl-3 font-serif text-[12px] leading-6 text-parchment/75">
          {finding.evidence}
        </blockquote>
      ) : null}

      {explanation ? (
        <div className="mt-4 border-t border-ink-3 pt-3">
          <p className="font-mono text-[10px] text-brass">PLAIN ENGLISH</p>
          <p className="mt-1 font-sans text-[12px] leading-6 text-parchment/85">
            {explanation.plain}
          </p>
          <Line label="Impact:" value={explanation.impact} />
          <Line label="Ask for:" value={explanation.ask} />
        </div>
      ) : pending ? (
        <p className="mt-4 border-t border-ink-3 pt-3 font-mono text-[10px] text-parchment/30">
          DRAFTING BRIEFING...
        </p>
      ) : null}

      <div className="mt-3 border-t border-ink-3 pt-2 font-mono text-[10px] text-parchment/40">
        <p>{finding.policy}</p>
        <p className="mt-1">
          <span
            className={
              finding.grounded
                ? "text-severity-green-i"
                : "text-severity-amber-i"
            }
          >
            {finding.grounded ? "GROUNDED" : "NEEDS VERIFICATION"}
          </span>
          <span className="text-parchment/30">
            {" "}
            {DASH} quoted text verified against the source clause
          </span>
        </p>
      </div>
    </article>
  )
}

export default function Page() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contract, setContract] = useState<ParsedContract | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [briefing, setBriefing] = useState<Record<string, Explanation>>({})
  const [briefingBusy, setBriefingBusy] = useState(false)
  const [briefingError, setBriefingError] = useState<string | null>(null)
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
    setBriefing({})
    setBriefingError(null)

    let parsed: ParsedContract | null = null
    try {
      parsed = await uploadContract(file)
      setContract(parsed)
      setSelected(parsed.clauses[0]?.id ?? null)
    } catch (cause) {
      setContract(null)
      setSelected(null)
      setUploadError(cause instanceof Error ? cause.message : "upload failed")
    } finally {
      setBusy(false)
    }

    // Second pass. The findings are already rendered, so this only ever
    // adds prose on top of evidence the rule engine has already proven.
    const list = parsed?.findings ?? []
    if (!list.length) {
      return
    }

    setBriefingBusy(true)
    try {
      const result = await explainFindings(list)
      setBriefing(result.explanations)
    } catch (cause) {
      setBriefingError(
        cause instanceof Error ? cause.message : "briefing unavailable",
      )
    } finally {
      setBriefingBusy(false)
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

  const reveal = useCallback((clauseId: string) => {
    setSelected(clauseId)
    if (typeof document !== "undefined") {
      document
        .getElementById(clauseId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [])

  const findings = useMemo(() => {
    const list = contract?.findings ?? []
    return [...list].sort(
      (a, b) => (RANK[b.severity] ?? 0) - (RANK[a.severity] ?? 0),
    )
  }, [contract])

  const worst = useMemo(() => {
    const map: Record<string, string> = {}
    for (const finding of contract?.findings ?? []) {
      if (!finding.clauseId) {
        continue
      }
      const current = map[finding.clauseId]
      if (!current || (RANK[finding.severity] ?? 0) > (RANK[current] ?? 0)) {
        map[finding.clauseId] = finding.severity
      }
    }
    return map
  }, [contract])

  const summary = contract?.summary
  const active = contract?.clauses.find((item) => item.id === selected) ?? null
  const activeFindings = findings.filter((item) => item.clauseId === selected)
  const briefed = Object.keys(briefing).length

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
          {summary ? (
            <span
              className={`font-mono text-[11px] ${
                TEXT_TONE[summary.riskBand] ?? "text-parchment"
              }`}
            >
              {DASH} RISK {summary.riskScore} {DASH} {summary.total} findings
            </span>
          ) : null}
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
            {busy ? "ANALYSING..." : "OPEN DOCUMENT"}
          </button>
          <span
            className={health ? "text-severity-green-i" : "text-severity-red-i"}
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

      <div className="flex h-[5px] shrink-0 gap-px bg-ink-3">
        {contract?.clauses.map((clause) => (
          <button
            key={clause.id}
            type="button"
            title={`${clause.number} ${clause.title}`}
            onClick={() => reveal(clause.id)}
            className={`h-full flex-1 ${
              FILL_TONE[worst[clause.id]] ?? "bg-ink-3"
            }`}
          />
        ))}
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-2">
        <section
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="overflow-y-auto bg-parchment px-10 py-8 text-ink"
        >
          {contract ? (
            <div className="space-y-6">
              {contract.clauses.map((clause) => {
                const flag = worst[clause.id]
                return (
                  <article
                    key={clause.id}
                    id={clause.id}
                    onClick={() => setSelected(clause.id)}
                    className={`cursor-pointer border-l-2 pl-4 transition-colors ${
                      clause.id === selected
                        ? "border-brass"
                        : flag
                          ? EDGE_TONE[flag]
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
                )
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="font-serif text-2xl text-ink/80">Open a contract</p>
              <p className="mt-3 max-w-sm font-sans text-sm leading-6 text-ink/50">
                Drop a PDF, DOCX, or TXT file here, or use the button above.
                The file needs selectable text, so scans will not work.
              </p>
              {busy ? (
                <p className="mt-6 font-mono text-[11px] text-ink/50">
                  Analysing. The first request can take a minute if the API was
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
          {summary ? (
            <div className="border border-ink-3 bg-ink-2 p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-lg">Risk assessment</h2>
                <span
                  className={`font-mono text-2xl ${
                    TEXT_TONE[summary.riskBand] ?? "text-parchment"
                  }`}
                >
                  {summary.riskScore}
                </span>
              </div>
              <div className="mt-3 flex gap-5 font-mono text-[11px]">
                <span className="text-severity-red-i">{summary.high} high</span>
                <span className="text-severity-amber-i">
                  {summary.medium} medium
                </span>
                <span className="text-severity-green-i">{summary.low} low</span>
              </div>
              <p className="mt-3 font-sans text-[12px] leading-6 text-parchment/50">
                {summary.rulesEvaluated} playbook rules applied to{" "}
                {summary.clausesAnalysed} substantive clauses.{" "}
                {summary.grounded} of {summary.total} findings quote text
                verified against the source document.
              </p>
              <p className="mt-2 font-mono text-[10px] text-parchment/40">
                {briefingBusy
                  ? "BRIEFING " + DASH + " DRAFTING PLAIN ENGLISH..."
                  : briefingError
                    ? "BRIEFING UNAVAILABLE " + DASH + " FINDINGS UNAFFECTED"
                    : briefed
                      ? "BRIEFING " + DASH + " " + briefed + " OF " + summary.total + " EXPLAINED"
                      : "BRIEFING " + DASH + " NOT REQUESTED"}
              </p>
            </div>
          ) : (
            <h2 className="font-serif text-lg">Analysis</h2>
          )}

          {active ? (
            <div className="mt-6 border border-ink-3 bg-ink-2 p-4">
              <p className="font-mono text-[11px] text-brass">
                CLAUSE {active.number} {DASH} {active.words} words
                {active.type ? " " + DASH + " " + active.type : ""}
              </p>
              <p className="mt-2 font-serif text-sm text-parchment/90">
                {active.title}
              </p>
              <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-[13px] leading-6 text-parchment/60">
                {active.text || "This heading has no body text."}
              </p>
              <p className="mt-3 font-mono text-[10px] text-parchment/40">
                {activeFindings.length
                  ? activeFindings.length + " finding(s) on this clause"
                  : "no policy breach detected on this clause"}
              </p>
            </div>
          ) : null}

          {findings.length ? (
            <div className="mt-6 space-y-4">
              <h3 className="font-mono text-[11px] text-parchment/40">
                FINDINGS {DASH} HIGHEST SEVERITY FIRST
              </h3>
              {findings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  explanation={briefing[finding.id]}
                  pending={briefingBusy}
                  onSelect={reveal}
                />
              ))}
            </div>
          ) : contract ? (
            <p className="mt-6 font-sans text-sm text-parchment/50">
              No policy breaches were detected in this document.
            </p>
          ) : (
            <p className="mt-4 font-sans text-sm text-parchment/50">
              Load a document to run the playbook against it.
            </p>
          )}

          <dl className="mt-8 space-y-3 font-mono text-[12px]">
            <Field label="DOCUMENT" value={contract?.filename ?? DASH} />
            <Field
              label="CLAUSES"
              value={contract ? String(contract.clauseCount) : DASH}
            />
            <Field label="CONTRACT VALUE" value={rupees(summary?.contractValue)} />
            <Field label="LIABILITY CAP" value={rupees(summary?.liabilityCap)} />
            <Field label="PLAYBOOK" value={summary?.playbook ?? DASH} />
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
