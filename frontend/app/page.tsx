"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent } from "react"
import type { Session } from "@supabase/supabase-js"

import Analysis from "@/components/Analysis"
import Assistant from "@/components/Assistant"
import ChatLauncher from "@/components/ChatLauncher"
import Dashboard from "@/components/Dashboard"
import Documents from "@/components/Documents"
import Login from "@/components/Login"
import Playbook from "@/components/Playbook"
import RiskRegister from "@/components/RiskRegister"
import Settings from "@/components/Settings"
import Sidebar from "@/components/Sidebar"
import type { View } from "@/components/Sidebar"
import { explainFindings, getHealth, uploadContract } from "@/lib/api"
import type { Explanation, Health, ParsedContract } from "@/lib/api"
import { authConfigured, supabase } from "@/lib/supabase"
import {
  connectDrive,
  downloadFile,
  driveConfigured,
  driveToken,
  pickFiles,
} from "@/lib/drive"
import type { DocumentRecord } from "@/lib/session"
import {
  deleteDocument,
  listDocuments,
  loadDocument,
  saveBriefing,
  saveDocument,
  storeConfigured,
} from "@/lib/store"
import { RANK } from "@/lib/format"

const ACCEPT = ".pdf,.docx,.txt,.md"

// An analysis that could not be saved is still usable for the rest of the
// session under this id prefix. Losing an upload because a table is missing
// would be a worse failure than losing its history.
const LOCAL_PREFIX = "local-"

export default function Page() {
  const [view, setView] = useState<View>("dashboard")
  const [health, setHealth] = useState<Health | null>(null)
  const [contract, setContract] = useState<ParsedContract | null>(null)
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [driveBusy, setDriveBusy] = useState(false)
  const [driveStatus, setDriveStatus] = useState<string | null>(null)
  const [driveError, setDriveError] = useState<string | null>(null)
  const [briefing, setBriefing] = useState<Record<string, Explanation>>({})
  const [briefingBusy, setBriefingBusy] = useState(false)
  const [briefingError, setBriefingError] = useState<string | null>(null)

  const [session, setSession] = useState<Session | null>(null)
  // Blocks the first paint until the stored session has been read, otherwise
  // a returning user is shown the login screen for a moment before being
  // dropped back into the app.
  const [authReady, setAuthReady] = useState(!authConfigured)

  const picker = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setAuthReady(true))

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const signedIn = !authConfigured || Boolean(session)
  const email = session?.user?.email ?? ""
  const userId = session?.user?.id ?? ""

  useEffect(() => {
    if (!signedIn) {
      return
    }
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [signedIn])

  // The document history belongs to the account, so it is reloaded whenever
  // the signed in user changes rather than only on first mount.
  useEffect(() => {
    if (!signedIn || !storeConfigured) {
      return
    }

    let cancelled = false

    listDocuments()
      .then((rows) => {
        if (!cancelled) {
          setDocuments(rows)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setStoreError(
            cause instanceof Error
              ? cause.message
              : "your saved documents could not be loaded",
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [signedIn, userId])

  const ingest = useCallback(
    async (file: File) => {
      setBusy(true)
      setUploadError(null)
      setStoreError(null)
      setBriefing({})
      setBriefingError(null)
      setSelected(null)

      let parsed: ParsedContract | null = null
      let savedId: string | null = null

      try {
        parsed = await uploadContract(file)
        setContract(parsed)

        const summary = parsed.summary
        let record: DocumentRecord = {
          id: LOCAL_PREFIX + Date.now(),
          name: parsed.filename || file.name,
          bytes: parsed.bytes ?? file.size,
          uploadedAt: new Date().toISOString(),
          clauseCount: parsed.clauseCount ?? 0,
          findingCount: summary?.total ?? 0,
          high: summary?.high ?? 0,
          riskScore: summary?.riskScore ?? 0,
          riskBand: summary?.riskBand ?? "low",
        }

        if (storeConfigured) {
          try {
            const stored = await saveDocument(parsed, file.name)
            if (stored) {
              record = stored
              savedId = stored.id
            }
          } catch (cause) {
            setStoreError(
              cause instanceof Error
                ? "analysed, but not saved: " + cause.message
                : "this document was analysed but could not be saved",
            )
          }
        }

        setDocuments((prev) => [
          record,
          ...prev.filter((item) => item.id !== record.id),
        ])
        setActiveId(record.id)
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
        // Stored alongside the contract so reopening it later does not spend
        // another round of model calls.
        if (savedId) {
          void saveBriefing(savedId, result.explanations).catch(() => {})
        }
      } catch (cause) {
        setBriefingError(
          cause instanceof Error ? cause.message : "briefing failed",
        )
      } finally {
        setBriefingBusy(false)
      }
    },
    [],
  )

  // Nothing is shown for a document until it is opened, at which point its
  // full analysis is fetched and every view switches to it.
  const openDocument = useCallback(
    async (doc: DocumentRecord) => {
      if (doc.id === activeId && contract) {
        setView("review")
        return
      }

      if (doc.id.startsWith(LOCAL_PREFIX)) {
        setStoreError(
          "This analysis was never saved, so it cannot be reopened. Upload the file again.",
        )
        return
      }

      setOpeningId(doc.id)
      setStoreError(null)

      try {
        const stored = await loadDocument(doc.id)
        if (!stored) {
          throw new Error("this document is no longer available")
        }
        setContract(stored.contract)
        setBriefing(stored.briefing)
        setBriefingError(null)
        setSelected(null)
        setActiveId(doc.id)
        setView("review")
      } catch (cause) {
        setStoreError(
          cause instanceof Error ? cause.message : "this document could not be opened",
        )
      } finally {
        setOpeningId(null)
      }
    },
    [activeId, contract],
  )

  const removeDocument = useCallback(
    async (doc: DocumentRecord) => {
      setStoreError(null)
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id))

      if (doc.id === activeId) {
        setActiveId(null)
        setContract(null)
        setBriefing({})
      }

      if (doc.id.startsWith(LOCAL_PREFIX)) {
        return
      }

      try {
        await deleteDocument(doc.id)
      } catch (cause) {
        setStoreError(
          cause instanceof Error ? cause.message : "this document could not be deleted",
        )
      }
    },
    [activeId],
  )

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

  // Drive files go through the same pipeline as a file chosen from disk:
  // downloaded in the browser, then handed to ingest. Analysis, saving and
  // briefing therefore behave identically whatever the source was, and the
  // backend needs no knowledge of Google at all.
  const importFromDrive = useCallback(async () => {
    setDriveError(null)
    setDriveStatus(null)

    // The button stays visible even when the browser key is missing, because a
    // silently absent control is far harder to diagnose than a clear message.
    if (!driveConfigured) {
      setDriveError(
        "Google Drive is not switched on for this deployment. Add NEXT_PUBLIC_GOOGLE_API_KEY in Cloudflare Pages, redeploy, then try again.",
      )
      return
    }

    const token = await driveToken()
    if (!token) {
      setDriveError(
        "Google Drive is not connected for this session. Connect it and Google will ask which files to share.",
      )
      return
    }

    setDriveBusy(true)
    try {
      const picked = await pickFiles(token)

      // Sequential on purpose. The API is a single small instance and the
      // model has a rate limit, so a burst of parallel uploads would fail
      // most of them.
      for (let index = 0; index < picked.length; index += 1) {
        const file = picked[index]
        setDriveStatus(
          "Importing " + (index + 1) + " of " + picked.length + ": " + file.name,
        )
        const local = await downloadFile(file, token)
        await ingest(local)
      }
    } catch (cause) {
      setDriveError(
        cause instanceof Error ? cause.message : "the Drive import failed",
      )
    } finally {
      setDriveStatus(null)
      setDriveBusy(false)
    }
  }, [ingest])

  const connectDriveNow = useCallback(() => {
    setDriveError(null)
    void connectDrive().catch((cause: unknown) => {
      setDriveError(
        cause instanceof Error
          ? cause.message
          : "Google Drive could not be connected",
      )
    })
  }, [])

  const signOut = useCallback(() => {
    if (!supabase) {
      return
    }
    void supabase.auth.signOut()
    setContract(null)
    setDocuments([])
    setActiveId(null)
    setBriefing({})
    setStoreError(null)
    setDriveError(null)
    setView("dashboard")
  }, [])

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

  if (!authReady) {
    return <div className="h-screen bg-canvas" />
  }

  if (!signedIn) {
    return <Login />
  }

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
        email={email}
      />

      <main className="min-w-0 flex-1 overflow-hidden">
        {view === "dashboard" ? (
          <Dashboard
            contract={contract}
            summary={contract?.summary}
            findings={findings}
            documents={documents}
            email={email}
            onOpenRisk={() => setView("risk")}
            onUpload={pick}
          />
        ) : null}

        {view === "documents" ? (
          <Documents
            documents={documents}
            contract={contract}
            activeId={activeId}
            openingId={openingId}
            busy={busy}
            uploadError={uploadError}
            storeError={storeError}
            driveReady={authConfigured}
            driveBusy={driveBusy}
            driveStatus={driveStatus}
            driveError={driveError}
            onUpload={pick}
            onDrop={onDrop}
            onOpen={openDocument}
            onDelete={removeDocument}
            onDriveImport={() => void importFromDrive()}
            onDriveConnect={connectDriveNow}
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

        {view === "settings" ? (
          <Settings
            email={email}
            health={health}
            driveConfigured={driveConfigured}
            onDriveConnect={connectDriveNow}
            onSignOut={authConfigured ? signOut : undefined}
          />
        ) : null}
      </main>

      <ChatLauncher
        hidden={view === "assistant"}
        onOpen={() => setView("assistant")}
      />
    </div>
  )
}
