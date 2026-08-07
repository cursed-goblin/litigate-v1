"use client"

import { useEffect, useState } from "react"

import { MoonIcon, SunIcon } from "./Icons"

type Theme = "light" | "dark"

const STORAGE_KEY = "litigate-theme"

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light")
  const [ready, setReady] = useState(false)

  // Read the class the pre-paint script already applied rather than guessing.
  // Seeding from a default would briefly fight that script and flash.
  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark")
    setTheme(dark ? "dark" : "light")
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) {
      return
    }
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // storage can be blocked; the theme still applies for this session
    }
  }, [theme, ready])

  const option = (value: Theme, label: string, icon: React.ReactNode) => {
    const active = theme === value
    return (
      <button
        type="button"
        onClick={() => setTheme(value)}
        aria-pressed={active}
        className={
          "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] transition-colors " +
          (active
            ? "bg-surface font-medium text-ink shadow-card"
            : "text-ink-3 hover:text-ink-2")
        }
      >
        {icon}
        {label}
      </button>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-1 rounded-lg bg-canvas p-1">
      {option("light", "Light", <SunIcon className="h-4 w-4" />)}
      {option("dark", "Dark", <MoonIcon className="h-4 w-4" />)}
    </div>
  )
}
