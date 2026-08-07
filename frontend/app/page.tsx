"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"

import Analysis from "@/components/Analysis"
import Assistant from "@/components/Assistant"
import Dashboard from "@/components/Dashboard"
import Documents from "@/components/Documents"
import Playbook from "@/components/Playbook"
import RiskRegister from "@/components/RiskRegister"
import Sidebar from "@/components/Sidebar"
import type { View } from "@/components/Sidebar"
import { explainFindings, getHealth, uploadContract } from "@/lib/api"
import type { Explanation, Health, ParsedContract } from "@/lib/api"
import type { DocumentRecord } from "@/lib/session"
import { RANK } from "@/lib/format"

const ACCEPT = ".pdf,.docx,.txt,.md"

export default function Page() {
  const [view, setView] = useState<View>("dashboard")
  const [health, setHealth] = useState<Health | null>(null)
  const [contract, setContract] = useState<ParsedContract | null>(null)
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [briefing, setBriefing] = useState<Record<string, Explanation>>({})
  const [briefingBusy, setBriefingBusy] = useState(false)
  const [briefingError, setBriefingError] = useState<string | null>(null)

  const picker = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [])

  const ingest = useCallback(async (file: File) => {
    setBusy(true)
    setUploadError(null)
    setBriefing({})
    setBriefingError(null)
    setSelected(null)

    let parsed: ParsedContract | null = null

    try {
      parsed = await uploadContract(file)
      setContract(parsed)

      const summary = parsed.summary
      setDocuments((prev) => [
        {
          id: "d" + Date.now(),
          name: parsed?.filename || file.name,
          bytes: parsed?.bytes ?? file.size,
          uploadedAt: new Date().toISOString(),
          clauseCount: parsed?.clauseCount ?? 0,
          findingCount: summary?.total ?? 0,
          high: summary?.high ?? 0,
          riskScore: summary?.riskScore ?? 0,
          riskBand: summary?.riskBand ?? "low",
        },
        ...prev,
      ])

      setView("review")
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "upload failed")
    } finally {
      setBusy(false)
    }

    // Second pass. The findings are already on screen, so a model outage
    // costs the plain-English layer and nothing else.
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
        cause instanceof Error ? cause.message : "briefing failed",
      )
    } finally {
      setBriefingBusy(false)
    }
  }, [])

  const pick = useCallback(() => picker.current?.click(), [])

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

  const findings = useMemo(() => {
    const list = contract?.findings ?? []
    return [...list].sort(
      (a, b) => (RANK[b.severity] ?? 0) - (RANK[a.severity] ?? 0),
    )
  }, [contract])

  const openClause = useCallback((clauseId: string) => {
    setSelected(clauseId)
    setView("review")
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <input
        ref={picker}
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

      <Sidebar
        view={view}
        onSelect={setView}
        online={health?.status === "ok"}
        alerts={contract?.summary?.high ?? 0}
      />

      <main className="min-w-0 flex-1 overflow-hidden">
        {view === "dashboard" ? (
          <Dashboard
            contract={contract}
            summary={contract?.summary}
            findings={findings}
            documents={documents}
            onOpenRisk={() => setView("risk")}
            onUpload={pick}
          />
        ) : null}

        {view === "documents" ? (
          <Documents
            documents={documents}
            contract={contract}
            busy={busy}
            uploadError={uploadError}
            onUpload={pick}
            onDrop={onDrop}
            onOpen={() => setView("review")}
          />
        ) : null}

        {view === "review" ? (
          <Analysis
            contract={contract}
            findings={findings}
            briefing={briefing}
            briefingBusy={briefingBusy}
            briefingError={briefingError}
            selected={selected}
            onSelect={setSelected}
            busy={busy}
            uploadError={uploadError}
            onUpload={pick}
            onDrop={onDrop}
          />
        ) : null}

        {view === "risk" ? (
          <RiskRegister
            findings={findings}
            briefing={briefing}
            summary={contract?.summary}
            onOpenClause={openClause}
          />
        ) : null}

        {view === "assistant" ? <Assistant contract={contract} /> : null}

        {view === "playbook" ? <Playbook /> : null}
      </main>
    </div>
  )
}
