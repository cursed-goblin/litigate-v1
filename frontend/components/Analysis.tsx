"use client"

import type { DragEvent } from "react"

import type { Clause, Explanation, Finding, ParsedContract } from "@/lib/api"
import {
  DASH,
  RISK_CHIP,
  RISK_EDGE,
  RISK_FILL,
  RISK_TEXT,
  rupees,
  titleCase,
} from "@/lib/format"
import { ShieldIcon, UploadIcon } from "./Icons"

function Line({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null
  }
  return (
    <p className="mt-2 text-[12px] leading-5">
      <span className="font-semibold text-ink-2">{label} </span>
      <span className="text-ink-3">{value}</span>
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
  return (
    <button
      type="button"
      onClick={() => onSelect(finding.clauseId)}
      className={
        "block w-full rounded-xl border border-l-[3px] border-line bg-surface p-4 text-left shadow-card transition-shadow hover:shadow-pop " +
        (RISK_EDGE[finding.severity] ?? "")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-semibold leading-5">{finding.title}</span>
        <span
          className={
            "shrink-0 rounded-md px-2 py-[3px] text-[11px] font-medium capitalize " +
            (RISK_CHIP[finding.severity] ?? "")
          }
        >
          {finding.severity}
        </span>
      </div>

      <p className="mt-1 font-mono text-[11px] text-ink-4">
        {finding.ruleId}
        {finding.clauseNumber ? "  \u00b7  Clause " + finding.clauseNumber : ""}
      </p>

      <p className="mt-2.5 text-[12px] leading-5 text-ink-2">{finding.observed}</p>

      {finding.evidence ? (
        <p className="mt-2.5 border-l-2 border-line pl-3 text-[12px] italic leading-5 text-ink-3">
          {finding.evidence}
        </p>
      ) : null}

      <Line label="Policy." value={finding.policy} />

      {explanation ? (
        <div className="mt-3 rounded-lg bg-canvas p-3">
          <p className="text-[10px] font-semibold tracking-[0.06em] text-ink-4">
            PLAIN ENGLISH
          </p>
          <p className="mt-1.5 text-[12px] leading-5 text-ink-2">
            {explanation.plain}
          </p>
          <Line label="Impact." value={explanation.impact} />
          <Line label="Ask for." value={explanation.ask} />
        </div>
      ) : pending ? (
        <p className="mt-3 text-[11px] text-ink-4">Drafting briefing...</p>
      ) : null}

      <div className="mt-3 flex items-center gap-1.5">
        <ShieldIcon
          className={
            "h-3.5 w-3.5 " + (finding.grounded ? "text-accent" : "text-risk-medium")
          }
        />
        <span
          className={
            "text-[10px] font-semibold tracking-[0.06em] " +
            (finding.grounded ? "text-accent" : "text-risk-medium")
          }
        >
          {finding.grounded ? "GROUNDED IN SOURCE" : "NEEDS VERIFICATION"}
        </span>
      </div>
    </button>
  )
}

export default function Analysis({
  contract,
  findings,
  briefing,
  briefingBusy,
  briefingError,
  selected,
  onSelect,
  busy,
  uploadError,
  onUpload,
  onDrop,
}: {
  contract: ParsedContract | null
  findings: Finding[]
  briefing: Record<string, Explanation>
  briefingBusy: boolean
  briefingError: string | null
  selected: string | null
  onSelect: (clauseId: string | null) => void
  busy: boolean
  uploadError: string | null
  onUpload: () => void
  onDrop: (event: DragEvent<HTMLElement>) => void
}) {
  const summary = contract?.summary
  const clauses: Clause[] = contract?.clauses ?? []
  const active = clauses.find((clause) => clause.id === selected) ?? null
  const activeFindings = active
    ? findings.filter((finding) => finding.clauseId === active.id)
    : findings
  const worst = new Map<string, string>()

  findings.forEach((finding) => {
    const current = worst.get(finding.clauseId)
    if (!current || (RISK_CHIP[finding.severity] && current === "low")) {
      worst.set(finding.clauseId, finding.severity)
    }
  })

  const briefed = Object.keys(briefing).length

  if (!contract) {
    return (
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className="flex h-full flex-col items-center justify-center px-8"
      >
        <div className="w-full max-w-md rounded-xl border border-dashed border-line bg-surface p-10 text-center shadow-card">
          <p className="text-[15px] font-semibold">
            {busy ? "Analysing contract..." : "Open a contract"}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-ink-3">
            {busy
              ? "The first request can take up to a minute if the API was idle."
              : "Drop a PDF, DOCX, or TXT file here, or use the button below. The file needs selectable text, so scans will not work."}
          </p>
          {uploadError ? (
            <p className="mt-4 rounded-lg bg-risk-high-soft px-3 py-2 text-[12px] text-risk-high">
              {uploadError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onUpload}
            disabled={busy}
            className="mx-auto mt-5 flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            <UploadIcon className="h-4 w-4" />
            Choose file
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="flex h-full flex-col"
    >
      <div className="shrink-0 border-b border-line bg-surface px-8 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-tight">
              {contract.filename}
            </h1>
            <p className="mt-0.5 text-[12px] text-ink-3">
              {contract.clauseCount} clauses \u00b7 {summary?.rulesEvaluated ?? 0} rules
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-6 text-right">
            <div>
              <p className="text-[11px] text-ink-4">Contract value</p>
              <p className="text-[13px] font-medium">
                {rupees(summary?.contractValue)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-4">Liability cap</p>
              <p className="text-[13px] font-medium text-risk-high">
                {rupees(summary?.liabilityCap)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-4">Risk score</p>
              <p
                className={
                  "text-[13px] font-semibold " +
                  (summary ? RISK_TEXT[summary.riskBand] ?? "" : "")
                }
              >
                {summary ? summary.riskScore : DASH}
              </p>
            </div>
            <button
              type="button"
              onClick={onUpload}
              disabled={busy}
              className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
            >
              {busy ? "Analysing..." : "Replace"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex h-[6px] gap-[2px] overflow-hidden rounded-full">
          {clauses.map((clause) => {
            const severity = worst.get(clause.id)
            return (
              <span
                key={clause.id}
                title={clause.number + " " + clause.title}
                className={
                  "h-full flex-1 rounded-full " +
                  (severity ? RISK_FILL[severity] ?? "bg-line" : "bg-line")
                }
              />
            )
          })}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="min-h-0 overflow-y-auto border-r border-line px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold tracking-[0.06em] text-ink-4">
              CLAUSES
            </h2>
            {active ? (
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Clear filter
              </button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            {clauses.map((clause) => {
              const severity = worst.get(clause.id)
              const chosen = clause.id === active?.id
              return (
                <button
                  key={clause.id}
                  type="button"
                  onClick={() => onSelect(chosen ? null : clause.id)}
                  className={
                    "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors " +
                    (chosen
                      ? "border-accent bg-accent-soft"
                      : "border-transparent hover:bg-surface")
                  }
                >
                  <span
                    className={
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                      (severity ? RISK_FILL[severity] ?? "bg-line" : "bg-line")
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">
                      {clause.number} {clause.title}
                    </span>
                    <span className="block text-[11px] text-ink-4">
                      {titleCase(clause.type ?? "other")}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {active ? (
            <div className="mb-4 rounded-xl border border-line bg-surface p-4 shadow-card">
              <p className="text-[11px] font-semibold tracking-[0.06em] text-ink-4">
                CLAUSE {active.number}
              </p>
              <p className="mt-1 text-[14px] font-semibold">{active.title}</p>
              <p className="mt-2.5 whitespace-pre-wrap text-[12.5px] leading-6 text-ink-2">
                {active.text}
              </p>
            </div>
          ) : null}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold tracking-[0.06em] text-ink-4">
              {active ? "FINDINGS ON THIS CLAUSE" : "FINDINGS, HIGHEST SEVERITY FIRST"}
            </h2>
            <span className="text-[11px] text-ink-4">
              {briefingBusy
                ? "Drafting plain English..."
                : briefingError
                  ? "Briefing unavailable"
                  : briefed > 0
                    ? briefed + " of " + findings.length + " explained"
                    : ""}
            </span>
          </div>

          {activeFindings.length ? (
            <div className="space-y-3">
              {activeFindings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  explanation={briefing[finding.id]}
                  pending={briefingBusy}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-card">
              <p className="text-[13px] font-medium text-accent">
                No policy breach on this clause
              </p>
              <p className="mt-1.5 text-[12px] text-ink-3">
                Every rule that applies to this clause type passed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
