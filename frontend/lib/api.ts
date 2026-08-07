const RAW_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7860"

// A trailing slash on the env var produces a double slash in every request
// path, which the API answers with a bare 404. Strip it once, here.
export const API_BASE = RAW_BASE.trim().replace(/\/+$/, "")

export type Severity = "high" | "medium" | "low"

export type Health = {
  status: string
  version: string
  provider: string
  providers: {
    groq: boolean
    gemini: boolean
  }
  cache: boolean
  playbook?: string
}

export type Clause = {
  id: string
  number: string
  title: string
  text: string
  words: number
  type?: string
}

export type Finding = {
  id: string
  ruleId: string
  clauseId: string
  clauseNumber: string
  clauseTitle: string
  clauseType: string
  severity: Severity
  title: string
  detail: string
  observed: string
  evidence: string
  policy: string
  grounded: boolean
}

export type Summary = {
  total: number
  high: number
  medium: number
  low: number
  riskScore: number
  riskBand: Severity
  grounded: number
  clausesAnalysed: number
  contractValue: number
  liabilityCap: number
  playbook: string
  rulesEvaluated: number
}

export type ParsedContract = {
  filename: string
  bytes: number
  characters: number
  clauseCount: number
  clauses: Clause[]
  findings?: Finding[]
  summary?: Summary
}

export type Explanation = {
  plain: string
  impact: string
  ask: string
}

export type ExplainResult = {
  explanations: Record<string, Explanation>
  requested: number
  returned: number
}

function endpoint(path: string) {
  return API_BASE + (path.startsWith("/") ? path : "/" + path)
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(endpoint(path), { cache: "no-store" })
  if (!response.ok) {
    throw new Error(path + " responded " + response.status)
  }
  return response.json() as Promise<T>
}

async function detailOf(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { detail?: string }
    if (payload?.detail) {
      return String(payload.detail)
    }
  } catch {
    // the error body was not json
  }
  return fallback
}

export function getHealth(): Promise<Health> {
  return request<Health>("/api/health")
}

export async function uploadContract(file: File): Promise<ParsedContract> {
  const body = new FormData()
  body.append("file", file)

  const response = await fetch(endpoint("/api/contracts/upload"), {
    method: "POST",
    body,
  })

  if (!response.ok) {
    throw new Error(
      await detailOf(response, "upload failed with status " + response.status),
    )
  }

  return response.json() as Promise<ParsedContract>
}

/**
 * Ask the API to reword proven findings for a non-lawyer reader.
 * Deliberately a second request: the findings are already on screen by the
 * time this runs, so a model outage costs prose and nothing else.
 */
export async function explainFindings(
  findings: Finding[],
): Promise<ExplainResult> {
  const response = await fetch(endpoint("/api/contracts/explain"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ findings }),
  })

  if (!response.ok) {
    throw new Error(
      await detailOf(response, "briefing failed with status " + response.status),
    )
  }

  return response.json() as Promise<ExplainResult>
}
