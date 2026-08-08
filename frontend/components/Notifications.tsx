"use client"

import type { Alert } from "@/lib/alerts"
import { RISK_CHIP, whenLabel } from "@/lib/format"
import { AlertIcon, BellIcon, FileIcon, ShieldIcon } from "./Icons"

function iconFor(kind: Alert["kind"]) {
  if (kind === "document") {
    return FileIcon
  }
  if (kind === "missing") {
    return ShieldIcon
  }
  return AlertIcon
}

export default function Notifications({
  alerts,
  read,
  email,
  onOpen,
  onMarkAll,
}: {
  alerts: Alert[]
  read: string[]
  email: string
  onOpen: (alert: Alert) => void
  onMarkAll: () => void
}) {
  const unread = alerts.filter((alert) => !read.includes(alert.id)).length

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-ink-3">
            Raised from analyses that actually ran on this account. High severity
            contracts also email{" "}
            {email ? email : "the signed in account"} automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={onMarkAll}
          disabled={unread === 0}
          className="shrink-0 rounded-full border border-line bg-surface px-4 py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-canvas disabled:opacity-50"
        >
          Mark all as read
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 text-[12px] text-ink-4">
        <BellIcon className="h-4 w-4" />
        {alerts.length
          ? unread + " unread of " + alerts.length
          : "Nothing raised yet"}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {alerts.length ? (
          alerts.map((alert) => {
            const Icon = iconFor(alert.kind)
            const fresh = !read.includes(alert.id)
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => onOpen(alert)}
                className={
                  "flex w-full items-start gap-4 border-b border-line px-5 py-4 text-left transition-colors last:border-0 hover:bg-canvas " +
                  (fresh ? "" : "opacity-70")
                }
              >
                <span
                  className={
                    "mt-[2px] flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
                    (alert.severity === "high"
                      ? "bg-risk-high-soft text-risk-high"
                      : alert.severity === "medium"
                        ? "bg-risk-medium-soft text-risk-medium"
                        : "bg-accent-soft text-accent")
                  }
                >
                  <Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium">
                      {alert.title}
                    </span>
                    {fresh ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-risk-high" />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[12px] leading-5 text-ink-3">
                    {alert.detail}
                  </span>
                </span>

                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={
                      "rounded-md px-2 py-[3px] text-[11px] font-medium capitalize " +
                      (RISK_CHIP[alert.severity] ?? "")
                    }
                  >
                    {alert.severity}
                  </span>
                  <span className="text-[11px] text-ink-4">
                    {alert.at ? whenLabel(alert.at) : "This session"}
                  </span>
                </span>
              </button>
            )
          })
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-[14px] font-medium text-ink-2">
              No notifications yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-6 text-ink-3">
              Analyse a contract and every high severity breach it contains will
              be listed here, alongside the clause it was measured from.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
