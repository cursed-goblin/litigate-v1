"use client"

import { useState } from "react"

import { supabase } from "@/lib/supabase"
import { ScaleIcon } from "./Icons"

/**
 * Password sign in rather than a magic link. A link needs the user to leave
 * the page, wait for mail, and come back, which is a poor demo and a poor
 * first run. The address collected here is also where risk alerts are sent.
 */
export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase || busy) {
      return
    }

    setBusy(true)
    setNote(null)
    setFailed(false)

    const credentials = { email: email.trim(), password }

    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp(credentials)
        if (error) {
          throw new Error(error.message)
        }
        setNote(
          "Account created. If your project requires email confirmation, open the link we sent before signing in.",
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword(credentials)
        if (error) {
          throw new Error(error.message)
        }
      }
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : "sign in failed")
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-strong text-onstrong">
            <ScaleIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[17px] font-semibold tracking-tight">Litigate</p>
            <p className="text-[12px] text-ink-3">Contract risk and policy governance</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          <h1 className="text-[16px] font-semibold">
            {mode === "in" ? "Sign in" : "Create an account"}
          </h1>
          <p className="mt-1 text-[12.5px] leading-5 text-ink-3">
            Risk alerts are sent to this address.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="text-[12px] font-medium text-ink-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
                placeholder="you@company.com"
                className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-[13px] outline-none placeholder:text-ink-4 focus:border-accent"
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-ink-2">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
                placeholder="At least 6 characters"
                className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-[13px] outline-none placeholder:text-ink-4 focus:border-accent"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="h-10 w-full rounded-lg bg-strong text-[13px] font-medium text-onstrong transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? "Working..."
                : mode === "in"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {note ? (
            <p
              className={
                "mt-4 rounded-lg px-3 py-2 text-[12px] leading-5 " +
                (failed
                  ? "bg-risk-high-soft text-risk-high"
                  : "bg-accent-soft text-accent")
              }
            >
              {note}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in")
              setNote(null)
              setFailed(false)
            }}
            className="mt-4 w-full text-[12.5px] text-ink-3 hover:text-ink-2"
          >
            {mode === "in"
              ? "No account yet? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  )
}
