"use client"

import type { Finding, Summary } from "@/lib/api"
import type { DocumentRecord } from "@/lib/session"
import { DASH, RISK_CHIP, RISK_FILL, RISK_TEXT, rupees, titleCase } from "@/lib/format"
import { AlertIcon, FileIcon, ScaleIcon, ShieldIcon, UploadIcon } from "./Icons"

function Stat({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string
  value: string
  hint: string
  tone?: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ink-3">{label}</span>
        <span className="text-ink-4">{icon}</span>
      </div>
      <p className={"mt-3 text-[26px] font-semibold leading-none " + (tone ?? "")}>
        {value}
      </p>
      <p className="mt-2 text-[12px] text-ink-4">{hint}</p>
    </div>
  )
}

function Bar({
  label,
  count,
  total,
  severity,
}: {
  label: string
  count: number
  total: number
  severity: string
}) {
  const width = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="text-ink-2">{label}</span>
        <span className="text-ink-3">{count}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
        <div
          className={"h-full rounded-full " + (RISK_FILL[severity] ?? "bg-ink-4")}
          style={{ width: width + "%" }}
        />
      </div>
    </div>
  )
}

export default function Dashboard({
  summary,
  findings,
  documents,
  onOpenRisk,
  onUpload,
}: {
  summary?: Summary
  findings: Finding[]
  documents: DocumentRecord[]
  onOpenRisk: () => void
  onUpload: () => void
}) {
  const top = findings.slice(0, 5)

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Contract risk measured against the {summary?.playbook ?? "active"}{" "}
            playbook.
          </p>
        </div>
        <button
          type="button"
          onClick={onUpload}
          className="flex items-center gap-2 rounded-full bg-strong px-4 py-2.5 text-[13px] font-medium text-onstrong transition-opacity hover:opacity-90"
        >
          <UploadIcon className="h-4 w-4" />
          Upload
        </button>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <Stat
          label="Documents analysed"
          value={String(documents.length)}
          hint={documents.length === 1 ? "this session" : "this session"}
          icon={<FileIcon className="h-4 w-4" />}
        />
        <Stat
          label="Open risks"
          value={summary ? String(summary.total) : DASH}
          hint={summary ? summary.high + " high severity" : "no contract loaded"}
          tone={summary && summary.high > 0 ? "text-risk-high" : ""}
          icon={<AlertIcon className="h-4 w-4" />}
        />
        <Stat
          label="Risk score"
          value={summary ? String(summary.riskScore) : DASH}
          hint={summary ? titleCase(summary.riskBand) + " exposure" : "awaiting upload"}
          tone={summary ? RISK_TEXT[summary.riskBand] : ""}
          icon={<ScaleIcon className="h-4 w-4" />}
        />
        <Stat
          label="Evidence grounded"
          value={summary ? summary.grounded + "/" + summary.total : DASH}
          hint="quotes verified in source"
          tone={
            summary && summary.grounded === summary.total ? "text-accent" : ""
          }
          icon={<ShieldIcon className="h-4 w-4" />}
        />
      </div>

      {summary ? (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="col-span-1 rounded-xl border border-line bg-surface p-5 shadow-card">
            <h2 className="text-[14px] font-semibold">Risk distribution</h2>
            <div className="mt-4 space-y-3.5">
              <Bar
                label="High"
                count={summary.high}
                total={summary.total}
                severity="high"
              />
              <Bar
                label="Medium"
                count={summary.medium}
                total={summary.total}
                severity="medium"
              />
              <Bar
                label="Low"
                count={summary.low}
                total={summary.total}
                severity="low"
              />
            </div>
          </div>

          <div className="col-span-2 rounded-xl border border-line bg-surface p-5 shadow-card">
            <h2 className="text-[14px] font-semibold">Commercial exposure</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-ink-3">Contract value</span>
                <span className="font-medium">{rupees(summary.contractValue)}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-ink-3">Liability cap</span>
                <span className="font-medium text-risk-high">
                  {rupees(summary.liabilityCap)}
                </span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-ink-3">Clauses analysed</span>
                <span className="font-medium">{summary.clausesAnalysed}</span>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <span className="text-ink-3">Rules applied</span>
                <span className="font-medium">{summary.rulesEvaluated}</span>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-5 text-ink-3">
              The cap recovers{" "}
              {summary.contractValue > 0
                ? (
                    (summary.liabilityCap / summary.contractValue) *
                    100
                  ).toFixed(2) + "%"
                : DASH}{" "}
              of contract value. Anything under 25% breaches the liability policy.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[14px] font-semibold">Highest severity findings</h2>
          {findings.length ? (
            <button
              type="button"
              onClick={onOpenRisk}
              className="text-[12px] font-medium text-accent hover:underline"
            >
              View all
            </button>
          ) : null}
        </div>

        {top.length ? (
          <ul>
            {top.map((finding) => (
              <li
                key={finding.id}
                className="flex items-center gap-4 border-b border-line px-5 py-3 last:border-0"
              >
                <span
                  className={
                    "rounded-md px-2 py-[3px] text-[11px] font-medium capitalize " +
                    (RISK_CHIP[finding.severity] ?? "")
                  }
                >
                  {finding.severity}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {finding.title}
                  </span>
                  <span className="block truncate text-[12px] text-ink-3">
                    {finding.observed}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-ink-4">
                  {finding.clauseNumber ? "Clause " + finding.clauseNumber : "Missing"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-[14px] font-medium text-ink-2">No contract loaded</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-6 text-ink-3">
              Upload a PDF, DOCX, or TXT contract and the playbook runs against
              every clause automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
