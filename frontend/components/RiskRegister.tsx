"use client"

import { useState } from "react"

import type { Explanation, Finding, Summary } from "@/lib/api"
import { RISK_CHIP, titleCase } from "@/lib/format"
import { ShieldIcon } from "./Icons"

const FILTERS = ["all", "high", "medium", "low"] as const

type Filter = (typeof FILTERS)[number]

export default function RiskRegister({
  findings,
  briefing,
  summary,
  onOpenClause,
}: {
  findings: Finding[]
  briefing: Record<string, Explanation>
  summary?: Summary
  onOpenClause: (clauseId: string) => void
}) {
  const [filter, setFilter] = useState<Filter>("all")

  const rows =
    filter === "all"
      ? findings
      : findings.filter((finding) => finding.severity === filter)

  const countFor = (value: Filter) =>
    value === "all"
      ? findings.length
      : findings.filter((finding) => finding.severity === value).length

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <h1 className="text-[22px] font-semibold tracking-tight">Risk Register</h1>
      <p className="mt-1 text-[13px] text-ink-3">
        Every breach the rule engine proved against{" "}
        {summary?.playbook ?? "the playbook"}. Each row cites the clause wording
        it was measured from.
      </p>

      <div className="mt-5 flex items-center gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={
              "rounded-full border px-3.5 py-1.5 text-[12px] font-medium capitalize transition-colors " +
              (filter === value
                ? "border-strong bg-strong text-onstrong"
                : "border-line bg-surface text-ink-2 hover:bg-canvas")
            }
          >
            {value + " (" + countFor(value) + ")"}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="grid grid-cols-[90px_110px_minmax(0,1.1fr)_minmax(0,1fr)_110px] gap-4 border-b border-line px-5 py-3 text-[11px] font-semibold tracking-[0.04em] text-ink-4">
          <span>SEVERITY</span>
          <span>CLAUSE</span>
          <span>ISSUE</span>
          <span>MEASURED</span>
          <span>EVIDENCE</span>
        </div>

        {rows.length ? (
          rows.map((finding) => (
            <button
              key={finding.id}
              type="button"
              onClick={() => onOpenClause(finding.clauseId)}
              className="grid w-full grid-cols-[90px_110px_minmax(0,1.1fr)_minmax(0,1fr)_110px] items-start gap-4 border-b border-line px-5 py-3.5 text-left transition-colors last:border-0 hover:bg-canvas"
            >
              <span>
                <span
                  className={
                    "rounded-md px-2 py-[3px] text-[11px] font-medium capitalize " +
                    (RISK_CHIP[finding.severity] ?? "")
                  }
                >
                  {finding.severity}
                </span>
              </span>

              <span className="font-mono text-[12px] text-ink-2">
                {finding.clauseNumber || "Missing"}
              </span>

              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-5">
                  {finding.title}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-ink-4">
                  {finding.ruleId + " \u00b7 " + titleCase(finding.clauseType)}
                </span>
                {briefing[finding.id] ? (
                  <span className="mt-1.5 block text-[12px] leading-5 text-ink-3">
                    {briefing[finding.id].impact}
                  </span>
                ) : null}
              </span>

              <span className="text-[12px] leading-5 text-ink-2">
                {finding.observed}
              </span>

              <span className="flex items-center gap-1.5">
                <ShieldIcon
                  className={
                    "h-3.5 w-3.5 shrink-0 " +
                    (finding.grounded ? "text-accent" : "text-risk-medium")
                  }
                />
                <span
                  className={
                    "text-[11px] font-medium " +
                    (finding.grounded ? "text-accent" : "text-risk-medium")
                  }
                >
                  {finding.grounded ? "Verified" : "Check"}
                </span>
              </span>
            </button>
          ))
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-[14px] font-medium text-ink-2">Nothing to show</p>
            <p className="mt-1.5 text-[13px] text-ink-3">
              {findings.length
                ? "No findings at this severity."
                : "Upload a contract to populate the register."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
