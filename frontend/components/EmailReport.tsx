"use client"

import { useState } from "react"

import { sendRiskAlert } from "@/lib/api"
import type { ParsedContract } from "@/lib/api"
import { SendIcon } from "./Icons"

/**
 * Sends the current contract's risk report to the account owner.
 *
 * When someone is signed in the destination is fixed to their verified
 * address and the server ignores anything this component sends, so the
 * address is shown rather than typed. The input only appears in the
 * unauthenticated development mode.
 */
export default function EmailReport({
  contract,
  email,
}: {
  contract: ParsedContract | null
  email: string
}) {
  const [to, setTo] = useState("")
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const summary = contract?.summary
  const ready = Boolean(contract && summary)

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ready || busy || !contract) {
      return
    }

    setBusy(true)
    setNote(null)
    setFailed(false)

    try {
      const result = await sendRiskAlert(email ? "" : to.trim(), contract)
      setNote("Report sent to " + result.recipients.join(", "))
      setTo("")
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : "the report could not be sent")
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-[14px] font-semibold">Escalate to owner</h2>
          <p className="mt-1 text-[12.5px] leading-5 text-ink-3">
            {ready
              ? "Emails the findings above, each one quoted from the contract. High risk contracts are also sent automatically as soon as they are analysed."
              : "Upload a contract to enable escalation."}
          </p>
        </div>

        {summary ? (
          <span className="shrink-0 rounded-md bg-canvas px-2.5 py-1 text-[11px] text-ink-3">
            {summary.total + " issues queued"}
          </span>
        ) : null}
      </div>

      <form onSubmit={send} className="mt-4 flex items-center gap-2">
        {email ? (
          <span className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-[13px] text-ink-2">
            <span className="text-ink-4">Sending to</span>
            <span className="truncate font-medium">{email}</span>
          </span>
        ) : (
          <input
            type="email"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            disabled={!ready || busy}
            placeholder="owner@company.com"
            className="h-9 w-full rounded-lg border border-line bg-canvas px-3 text-[13px] outline-none placeholder:text-ink-4 focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          />
        )}

        <button
          type="submit"
          disabled={!ready || busy}
          className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-strong px-4 text-[13px] font-medium text-onstrong transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <SendIcon className="h-3.5 w-3.5" />
          {busy ? "Sending..." : "Send report"}
        </button>
      </form>

      {note ? (
        <p
          className={
            "mt-3 rounded-lg px-3 py-2 text-[12px] " +
            (failed
              ? "bg-risk-high-soft text-risk-high"
              : "bg-accent-soft text-accent")
          }
        >
          {note}
        </p>
      ) : null}
    </div>
  )
}
