"use client"

import { useState } from "react"
import type { DragEvent } from "react"

import type { ParsedContract } from "@/lib/api"
import type { DocumentRecord } from "@/lib/session"
import { RISK_CHIP, fileSize, whenLabel } from "@/lib/format"
import { DotsIcon, FileIcon, FolderIcon, SearchIcon, UploadIcon } from "./Icons"

const GROUPS: Array<{
  label: string
  types: string[]
  fill: string
  tint: string
}> = [
  {
    label: "Commercial Terms",
    types: ["payment_terms", "renewal", "termination"],
    fill: "text-folder-amber",
    tint: "bg-folder-amber-soft",
  },
  {
    label: "Liability & Indemnity",
    types: ["limitation_of_liability", "indemnity", "warranty"],
    fill: "text-folder-blue",
    tint: "bg-folder-blue-soft",
  },
  {
    label: "Data & Confidentiality",
    types: ["data_protection", "confidentiality", "intellectual_property"],
    fill: "text-folder-green",
    tint: "bg-folder-green-soft",
  },
  {
    label: "Governance",
    types: [
      "governing_law",
      "dispute_resolution",
      "force_majeure",
      "audit_rights",
      "assignment",
    ],
    fill: "text-folder-violet",
    tint: "bg-folder-violet-soft",
  },
]

function TrashMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export default function Documents({
  documents,
  contract,
  activeId,
  openingId,
  busy,
  uploadError,
  storeError,
  onUpload,
  onDrop,
  onOpen,
  onDelete,
}: {
  documents: DocumentRecord[]
  contract: ParsedContract | null
  activeId: string | null
  openingId: string | null
  busy: boolean
  uploadError: string | null
  storeError: string | null
  onUpload: () => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onOpen: (doc: DocumentRecord) => void
  onDelete: (doc: DocumentRecord) => void
}) {
  const [query, setQuery] = useState("")

  // The clause breakdown describes the document that is currently open, so it
  // stays empty until one is selected rather than showing another file's shape.
  const clauses = contract?.clauses ?? []
  const findings = contract?.findings ?? []

  const term = query.trim().toLowerCase()
  const visible = term
    ? documents.filter((doc) => doc.name.toLowerCase().includes(term))
    : documents

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="h-full overflow-y-auto px-8 py-7"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Saved to your account. Select one to load its analysis.
          </p>
        </div>
        <button
          type="button"
          onClick={onUpload}
          disabled={busy}
          className="flex items-center gap-2 rounded-full bg-strong px-4 py-2.5 text-[13px] font-medium text-onstrong transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <UploadIcon className="h-4 w-4" />
          {busy ? "Analysing..." : "Upload"}
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-ink-4">
          <SearchIcon className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for documents..."
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-4"
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] text-ink-2"
        >
          Filter by
          <span className="text-ink-4">
            <DotsIcon className="h-4 w-4" />
          </span>
        </button>
      </div>

      {uploadError ? (
        <p className="mt-4 rounded-lg border border-risk-high bg-risk-high-soft px-4 py-2.5 text-[13px] text-risk-high">
          {uploadError}
        </p>
      ) : null}

      {storeError ? (
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-2">
          {storeError}
        </p>
      ) : null}

      <h2 className="mt-7 text-[15px] font-semibold">Clause categories</h2>
      <p className="mt-1 text-[12px] text-ink-4">
        {contract
          ? contract.filename
          : "Open a document to see how its clauses break down."}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-4">
        {GROUPS.map((group) => {
          const inGroup = clauses.filter((clause) =>
            group.types.includes(clause.type ?? "other"),
          )
          const flagged = findings.filter((finding) =>
            group.types.includes(finding.clauseType),
          )
          return (
            <div
              key={group.label}
              className="rounded-xl border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <span
                  className={
                    "flex h-9 w-9 items-center justify-center rounded-lg " +
                    group.tint +
                    " " +
                    group.fill
                  }
                >
                  <FolderIcon className="h-[18px] w-[18px]" />
                </span>
                <DotsIcon className="h-4 w-4 text-ink-4" />
              </div>
              <p className="mt-3 text-[13px] font-medium">{group.label}</p>
              <p className="mt-1 text-[12px] text-ink-4">
                {inGroup.length +
                  " clauses" +
                  (flagged.length ? " \u00b7 " + flagged.length + " flagged" : "")}
              </p>
            </div>
          )
        })}
      </div>

      <h2 className="mt-7 text-[15px] font-semibold">Recent documents</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="grid grid-cols-[minmax(0,1fr)_100px_150px_130px_90px] gap-4 border-b border-line px-5 py-3 text-[11px] font-semibold tracking-[0.04em] text-ink-4">
          <span>NAME</span>
          <span>SIZE</span>
          <span>ANALYSED</span>
          <span>RISK</span>
          <span className="text-right">ACTION</span>
        </div>

        {visible.length ? (
          visible.map((doc) => {
            const active = doc.id === activeId
            const opening = doc.id === openingId
            return (
              <div
                key={doc.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(doc)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onOpen(doc)
                  }
                }}
                className={
                  "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_100px_150px_130px_90px] items-center gap-4 border-b border-line px-5 py-3.5 text-left outline-none transition-colors last:border-0 hover:bg-canvas focus-visible:bg-canvas " +
                  (active ? "bg-canvas" : "")
                }
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-risk-high-soft text-risk-high">
                    <FileIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">
                      {doc.name}
                    </span>
                    <span className="block text-[12px] text-ink-4">
                      {doc.clauseCount +
                        " clauses \u00b7 " +
                        doc.findingCount +
                        " findings"}
                    </span>
                  </span>
                </span>
                <span className="text-[13px] text-ink-3">
                  {fileSize(doc.bytes)}
                </span>
                <span className="text-[13px] text-ink-3">
                  {whenLabel(doc.uploadedAt)}
                </span>
                <span>
                  <span
                    className={
                      "rounded-md px-2 py-[3px] text-[11px] font-medium capitalize " +
                      (RISK_CHIP[doc.riskBand] ?? "")
                    }
                  >
                    {doc.riskBand + " " + doc.riskScore}
                  </span>
                </span>
                <span className="flex items-center justify-end gap-2">
                  {opening ? (
                    <span className="text-[12px] text-ink-4">Opening...</span>
                  ) : (
                    <span
                      className={
                        "text-[12px] " +
                        (active ? "font-medium text-ink-2" : "text-ink-4")
                      }
                    >
                      {active ? "Open" : "View"}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={"Delete " + doc.name}
                    onClick={(event) => {
                      event.stopPropagation()
                      const ok = window.confirm(
                        "Delete " + doc.name + " from your saved documents?",
                      )
                      if (ok) {
                        onDelete(doc)
                      }
                    }}
                    className="rounded-md p-1 text-ink-4 transition-colors hover:bg-risk-high-soft hover:text-risk-high"
                  >
                    <TrashMark className="h-4 w-4" />
                  </button>
                </span>
              </div>
            )
          })
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-[14px] font-medium text-ink-2">
              {busy
                ? "Analysing document..."
                : documents.length
                  ? "No documents match that search"
                  : "No documents yet"}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-6 text-ink-3">
              {busy
                ? "The first request can take up to a minute if the API was idle."
                : documents.length
                  ? "Clear the search box to see everything saved to your account."
                  : "Drop a contract anywhere on this page, or use Upload. The file needs selectable text, so scans will not work."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
