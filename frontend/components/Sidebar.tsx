"use client"

import {
  AlertIcon,
  BellIcon,
  BookIcon,
  ChatIcon,
  ChevronIcon,
  FolderIcon,
  GearIcon,
  GridIcon,
  ScaleIcon,
  SearchIcon,
} from "./Icons"
import ThemeToggle from "./ThemeToggle"

export type View =
  | "dashboard"
  | "documents"
  | "review"
  | "risk"
  | "assistant"
  | "playbook"
  | "notifications"
  | "settings"

type Item = {
  id: View
  label: string
  icon: (props: { className?: string }) => JSX.Element
}

const PRIMARY: Item[] = [
  { id: "dashboard", label: "Dashboard", icon: GridIcon },
  { id: "documents", label: "Documents", icon: FolderIcon },
]

const ANALYSIS: Item[] = [
  { id: "review", label: "Contract Review", icon: ScaleIcon },
  { id: "risk", label: "Risk Register", icon: AlertIcon },
  { id: "assistant", label: "Assistant", icon: ChatIcon },
]

const GOVERNANCE: Item[] = [
  { id: "playbook", label: "Playbook", icon: BookIcon },
]

const NOTIFICATIONS: Item = {
  id: "notifications",
  label: "Notifications",
  icon: BellIcon,
}

// Settings owns the account controls, including sign out, so the footer keeps
// one route into them rather than two.
const SYSTEM: Item[] = [{ id: "settings", label: "Settings", icon: GearIcon }]

export default function Sidebar({
  view,
  onSelect,
  online,
  alerts,
  email,
}: {
  view: View
  onSelect: (next: View) => void
  online: boolean
  alerts: number
  email: string
}) {
  // The badge is passed explicitly rather than read from a map, so the array
  // maps below must not hand their index in as a second argument.
  const renderItem = (item: Item, badge?: number) => {
    const Icon = item.icon
    const active = view === item.id
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}
        className={
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors " +
          (active
            ? "bg-accent font-medium text-onaccent"
            : "text-ink-2 hover:bg-canvas")
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
        {badge ? (
          <span
            className={
              "ml-auto rounded-full px-2 py-[1px] text-[11px] font-medium " +
              (active ? "bg-surface text-risk-high" : "bg-risk-high-soft text-risk-high")
            }
          >
            {badge}
          </span>
        ) : null}
      </button>
    )
  }

  const label = email || "Signed out"
  const initial = email ? email.charAt(0).toUpperCase() : "L"

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-strong text-[13px] font-semibold text-onstrong">
          L
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Litigate</span>
        <ChevronIcon className="ml-auto h-4 w-4 text-ink-4" />
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-ink-4">
          <SearchIcon className="h-4 w-4" />
          <input
            placeholder="Global search"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-4"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          {PRIMARY.map((item) => renderItem(item))}
        </div>

        <p className="px-3 pb-2 pt-5 text-[10px] font-semibold tracking-[0.08em] text-ink-4">
          ANALYSIS
        </p>
        <div className="space-y-1">
          {ANALYSIS.map((item) => renderItem(item))}
        </div>

        <p className="px-3 pb-2 pt-5 text-[10px] font-semibold tracking-[0.08em] text-ink-4">
          GOVERNANCE
        </p>
        <div className="space-y-1">
          {GOVERNANCE.map((item) => renderItem(item))}
        </div>
      </nav>

      <div className="border-t border-line px-3 py-3">
        <div className="space-y-1">
          {SYSTEM.map((item) => renderItem(item))}
          {renderItem(NOTIFICATIONS, alerts)}
        </div>

        <ThemeToggle />

        <button
          type="button"
          onClick={() => onSelect("settings")}
          className="mt-2 flex w-full items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-left transition-colors hover:bg-surface"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-onaccent">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium" title={label}>
              {label}
            </span>
            <span className="block text-[11px] text-ink-4">
              {email ? "Alerts sent here" : "Not signed in"}
            </span>
          </span>
          <span
            title={online ? "API online" : "API offline"}
            className={
              "h-2 w-2 shrink-0 rounded-full " +
              (online ? "bg-accent" : "bg-risk-high")
            }
          />
        </button>
      </div>
    </aside>
  )
}
