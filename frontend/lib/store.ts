import type { Explanation, ParsedContract } from "./api"
import type { DocumentRecord } from "./session"
import { supabase } from "./supabase"

const TABLE = "documents"

// Only what the list needs. The parsed contract is deliberately excluded: it
// is by far the largest part of every row, so pulling it for every document
// would make the list slow for no benefit. It is fetched when one is opened.
const LIST_COLUMNS =
  "id,name,bytes,clause_count,finding_count,high,risk_score,risk_band,created_at"

type ListRow = {
  id: string
  name: string | null
  bytes: number | null
  clause_count: number | null
  finding_count: number | null
  high: number | null
  risk_score: number | null
  risk_band: string | null
  created_at: string
}

export type StoredDocument = {
  contract: ParsedContract
  briefing: Record<string, Explanation>
}

/** False when Supabase is not wired up, in which case nothing is persisted. */
export const storeConfigured = Boolean(supabase)

function toRecord(row: ListRow): DocumentRecord {
  return {
    id: row.id,
    name: row.name || "contract",
    bytes: row.bytes ?? 0,
    uploadedAt: row.created_at,
    clauseCount: row.clause_count ?? 0,
    findingCount: row.finding_count ?? 0,
    high: row.high ?? 0,
    riskScore: row.risk_score ?? 0,
    riskBand: row.risk_band ?? "low",
  }
}

/**
 * Every document belonging to the signed in account, newest first.
 *
 * No user filter is applied here on purpose. Row level security restricts
 * this to the caller's own rows, so a filter in the browser would be
 * decoration rather than protection.
 */
export async function listDocuments(): Promise<DocumentRecord[]> {
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => toRecord(row as ListRow))
}

/**
 * Persist a completed analysis and return its list entry.
 *
 * user_id is left to the column default of auth.uid() rather than being sent
 * from the browser, so the row is always owned by the caller.
 */
export async function saveDocument(
  contract: ParsedContract,
  fallbackName: string,
): Promise<DocumentRecord | null> {
  if (!supabase) {
    return null
  }

  const summary = contract.summary

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: contract.filename || fallbackName,
      bytes: contract.bytes ?? 0,
      clause_count: contract.clauseCount ?? 0,
      finding_count: summary?.total ?? 0,
      high: summary?.high ?? 0,
      risk_score: summary?.riskScore ?? 0,
      risk_band: summary?.riskBand ?? "low",
      contract,
    })
    .select(LIST_COLUMNS)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toRecord(data as ListRow)
}

/** Attach the plain-English briefing once it arrives. */
export async function saveBriefing(
  id: string,
  briefing: Record<string, Explanation>,
): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.from(TABLE).update({ briefing }).eq("id", id)

  if (error) {
    throw new Error(error.message)
  }
}

/** The full analysis for one document, fetched only when it is opened. */
export async function loadDocument(id: string): Promise<StoredDocument | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("contract,briefing")
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(error.message)
  }
  if (!data?.contract) {
    return null
  }

  return {
    contract: data.contract as ParsedContract,
    briefing: (data.briefing ?? {}) as Record<string, Explanation>,
  }
}

/** Remove a document. Row level security limits this to your own rows. */
export async function deleteDocument(id: string): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", id)

  if (error) {
    throw new Error(error.message)
  }
}
