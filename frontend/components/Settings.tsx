"use client"

import type { Health } from "@/lib/api"
import { FolderIcon, ShieldIcon } from "./Icons"

function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 last:border-0">
      <span className="text-[13px] text-ink-3">{label}</span>
      <span className={"text-[13px] font-medium " + (tone ?? "text-ink")}>
        {value}
      </span>
    </div>
  )
}

export default function Settings({
  email,
  health,
  driveConfigured,
  onDriveConnect,
  onSignOut,
}: {
  email: string
  health: Health | null
  driveConfigured: boolean
  onDriveConnect: () => void
  onSignOut?: () => void
}) {
  const initial = email ? email.charAt(0).toUpperCase() : "L"
  const online = health?.status === "ok"
  const mailOn = Boolean(health?.mail?.configured)

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <h1 className="text-[22px] font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-[13px] text-ink-3">
        Your account, connected services and where risk reports are sent.
      </p>

      <h2 className="mt-7 text-[15px] font-semibold">Account</h2>
      <section className="mt-3 max-w-2xl rounded-xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-onaccent">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium" title={email}>
              {email || "Not signed in"}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-4">
              Signed in with Google. Every risk report goes to this address and
              nowhere else.
            </p>
          </div>
          {onSignOut ? (
            <button
              type="button"
              onClick={onSignOut}
              className="shrink-0 rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:border-risk-high hover:text-risk-high"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </section>

      <h2 className="mt-8 text-[15px] font-semibold">Connected services</h2>
      <section className="mt-3 max-w-2xl rounded-xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-folder-blue-soft text-folder-blue">
            <FolderIcon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">Google Drive</p>
            <p className="mt-1 text-[12.5px] leading-6 text-ink-3">
              {driveConfigured
                ? "Import contracts straight from Drive. Google shares only the files you pick, never the whole account, and the link lasts about an hour before you reconnect."
                : "Not switched on for this deployment yet. Add NEXT_PUBLIC_GOOGLE_API_KEY in Cloudflare Pages and redeploy to enable it."}
            </p>
          </div>
          {driveConfigured ? (
            <button
              type="button"
              onClick={onDriveConnect}
              className="shrink-0 rounded-full bg-strong px-4 py-2 text-[13px] font-medium text-onstrong transition-opacity hover:opacity-90"
            >
              Connect
            </button>
          ) : null}
        </div>
      </section>

      <h2 className="mt-8 text-[15px] font-semibold">Service status</h2>
      <section className="mt-3 max-w-2xl overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <Row
          label="Analysis API"
          value={online ? "Online" : "Offline"}
          tone={online ? "text-accent" : "text-risk-high"}
        />
        <Row label="Version" value={health?.version || "unknown"} />
        <Row label="Model provider" value={health?.provider || "unknown"} />
        <Row label="Playbook" value={health?.playbook || "not loaded"} />
        <Row
          label="Email reports"
          value={mailOn ? "On" : "Off"}
          tone={mailOn ? "text-accent" : "text-ink-3"}
        />
      </section>

      <section className="mt-4 max-w-2xl rounded-xl border border-line bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-folder-green-soft text-folder-green">
            <ShieldIcon className="h-[18px] w-[18px]" />
          </span>
          <p className="text-[12.5px] leading-6 text-ink-3">
            Documents are saved against your account only. Row level security in
            the database stops every other signed in user from reading them, and
            emailed reports quote short clause extracts rather than whole
            contracts.
          </p>
        </div>
      </section>
    </div>
  )
}
