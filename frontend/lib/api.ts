export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7860"

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

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function getHealth(): Promise<Health> {
  return request<Health>("/api/health")
}

export async function uploadContract(file: File): Promise<ParsedContract> {
  const body = new FormData()
  body.append("file", file)

  const response = await fetch(`${API_BASE}/api/contracts/upload`, {
    method: "POST",
    body,
  })

  if (!response.ok) {
    let detail = `upload failed with status ${response.status}`
    try {
      const payload = (await response.json()) as { detail?: string }
      if (payload?.detail) {
        detail = String(payload.detail)
      }
    } catch {
      // the error body was not json
    }
    throw new Error(detail)
  }

  return response.json() as Promise<ParsedContract>
}
