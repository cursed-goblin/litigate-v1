import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

// The anon key is meant to be shipped to the browser. It identifies the
// project and grants nothing on its own, so treating it as a secret would
// be theatre. Real authority comes from the signed session it issues.
const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const authConfigured = Boolean(PROJECT_URL && ANON_KEY)

// Null rather than a broken client when the project is not wired up yet, so
// the build still succeeds and the app degrades to its unauthenticated mode.
export const supabase: SupabaseClient | null = authConfigured
  ? createClient(PROJECT_URL, ANON_KEY)
  : null

/** Current access token, or an empty string when signed out. */
export async function accessToken(): Promise<string> {
  if (!supabase) {
    return ""
  }
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? ""
  } catch {
    return ""
  }
}
