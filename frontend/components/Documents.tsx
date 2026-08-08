"use client"

import { useState } from "react"
import type { DragEvent } from "react"

import type { ParsedContract } from "@/lib/api"
import type { Category } from "@/lib/categories"
import { CATEGORIES } from "@/lib/categories"
import type { DocumentRecord } from "@/lib/session"
import { RISK_CHIP, fileSize, titleCase, whenLabel } from "@/lib/format"
import { DotsIcon, FileIcon, FolderIcon, SearchIcon, UploadIcon } from "./Icons"

const BANDS = ["all", "high", "medium", "low"] as const

type Band = (typeof BANDS)[number]

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
  driveReady,
  driveBusy,
  driveStatus,
  driveError,
  onUpload,
  onDrop,
  onOpen,
  onDelete,
  onOpenCategory,
  onDriveImport,
  onDriveConnect,
}: {
  documents: DocumentRecord[]
  contract: ParsedContract | null
  activeId: string | null
  openingId: string | null
  busy: boolean
  uploadError: string | null
  storeError: string | null
  driveReady: boolean
  driveBusy: boolean
  driveStatus: string | null
  driveError: string | null
  onUpload: () => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onOpen: (doc: DocumentRecord) => void
  onDelete: (doc: DocumentRecord) => void
  onOpenCategory: (category: Category) => void
  onDriveImport: () => void
  onDriveConnect: () => void
}) {
  const [query, setQuery] = useState("")
  const [band, setBand] = useState<Band>("all")
  const [bandOpen, setBandOpen] = useState(false)

  // The clause breakdown describes the document that is currently open, so it
  // stays empty until one is selected rather than showing another file's shape.
  const clauses = contract?.clauses ?? []
  const findings = contract?.findings ?? []

  const term = query.trim().toLowerCase()
  const visible = documents.filter((doc) => {
    const matchesName = term ? doc.name.toLowerCase().includes(term) : true
    const matchesBand = band === "all" ? true : doc.riskBand === band
    return matchesName && matchesBand
  })

  const countInBand = (value: Band) =>
    value === "all"
      ? documents.length
      : documents.filter((doc) => doc.riskBand === value).length

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
        <div className="flex shrink-0 items-center gap-2">
          {driveReady ? (
            <button
              type="button"
              onClick={onDriveImport}
              disabled={busy || driveBusy}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-canvas disabled:opacity-50"
            >
              <FolderIcon className="h-4 w-4" />
              {driveBusy ? "Importing..." : "Import from Drive"}
            </button>
          ) : null}
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

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setBandOpen((open) => !open)}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] text-ink-2 transition-colors hover:bg-canvas"
          >
            {band === "all" ? "Filter by" : titleCase(band) + " risk"}
            <span className="text-ink-4">
              <DotsIcon className="h-4 w-4" />
            </span>
          </button>

          {bandOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-pop">
              {BANDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setBand(value)
                    setBandOpen(false)
                  }}
                  className={
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition-colors hover:bg-canvas " +
                    (band === value ? "font-medium text-ink" : "text-ink-2")
                  }
                >
                  {value === "all" ? "All documents" : titleCase(value) + " risk"}
                  <span className="text-[12px] text-ink-4">
                    {countInBand(value)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
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

      {driveStatus ? (
        <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-2">
          {driveStatus}
        </p>
      ) : null}

      {driveError ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <p className="text-[13px] text-ink-2">{driveError}</p>
          <button
            type="button"
            onClick={onDriveConnect}
            className="shrink-0 rounded-full bg-strong px-3.5 py-2 text-[12px] font-medium text-onstrong transition-opacity hover:opacity-90"
          >
            Connect Google Drive
          </button>
        </div>
      ) : null}

      <h2 className="mt-7 text-[15px] font-semibold">Clause categories</h2>
      <p className="mt-1 text-[12px] text-ink-4">
        {contract
          ? contract.filename +
            " \u00b7 select a category to open its findings in the Risk Register"
          : "Open a document to see how its clauses break down."}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-4">
        {CATEGORIES.map((group) => {
          const inGroup = clauses.filter((clause) =>
            group.types.includes(clause.type ?? "other"),
          )
          const flagged = findings.filter((finding) =>
            group.types.includes(finding.clauseType),
          )
          return (
            <button
              key={group.label}
              type="button"
              disabled={!contract}
              onClick={() => onOpenCategory(group)}
              className={
                "rounded-xl border border-line bg-surface p-4 text-left shadow-card transition-colors " +
                (contract ? "hover:bg-canvas" : "cursor-not-allowed opacity-60")
              }
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
                {flagged.length ? (
                  <span className="rounded-md bg-risk-high-soft px-2 py-[3px] text-[11px] font-medium text-risk-high">
                    {flagged.length + " flagged"}
                  </span>
                ) : (
                  <DotsIcon className="h-4 w-4 text-ink-4" />
                )}
              </div>
              <p className="mt-3 text-[13px] font-medium">{group.label}</p>
              <p className="mt-1 text-[12px] text-ink-4">
                {contract
                  ? inGroup.length + " clauses in this contract"
                  : "No document open"}
              </p>
            </button>
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
                  ? "No documents match those filters"
                  : "No documents yet"}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-6 text-ink-3">
              {busy
                ? "The first request can take up to a minute if the API was idle."
                : documents.length
                  ? "Clear the search box and the risk filter to see everything saved to your account."
                  : "Drop a contract anywhere on this page, or import from Drive. The file needs selectable text, so scans will not work."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
