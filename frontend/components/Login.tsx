"use client"

import { useState } from "react"

import { supabase } from "@/lib/supabase"
import { ScaleIcon } from "./Icons"

/** Google's brand mark, kept local because it is not part of the UI icon set. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

/**
 * Two ways in, deliberately.
 *
 * Google is the fast path. Password is kept as the fallback because an OAuth
 * misconfiguration would otherwise lock every user out of the application
 * with no alternative route.
 *
 * The address collected here is where risk alerts are sent.
 */
export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const fail = (cause: unknown, fallback: string) => {
    setNote(cause instanceof Error ? cause.message : fallback)
    setFailed(true)
  }

  const withGoogle = async () => {
    if (!supabase || oauthBusy) {
      return
    }

    setOauthBusy(true)
    setNote(null)
    setFailed(false)

    try {
      // Returning to the current origin keeps this working across the custom
      // domain and every preview deployment without hardcoding a host.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      })
      if (error) {
        throw new Error(error.message)
      }
      // A redirect follows, so the spinner is left running on purpose.
    } catch (cause) {
      fail(cause, "google sign in failed")
      setOauthBusy(false)
    }
  }

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
      fail(cause, "sign in failed")
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

          <button
            type="button"
            onClick={withGoogle}
            disabled={oauthBusy || busy}
            className="mt-5 flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface text-[13px] font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50"
          >
            <GoogleMark className="h-[18px] w-[18px]" />
            {oauthBusy ? "Redirecting..." : "Continue with Google"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] uppercase tracking-[0.06em] text-ink-4">
              or
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-[12px] font-medium text-ink-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy || oauthBusy}
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
                disabled={busy || oauthBusy}
                placeholder="At least 6 characters"
                className="mt-1.5 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-[13px] outline-none placeholder:text-ink-4 focus:border-accent"
              />
            </div>

            <button
              type="submit"
              disabled={busy || oauthBusy}
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
