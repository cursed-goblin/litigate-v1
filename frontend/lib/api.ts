import { accessToken } from "./supabase"

// The API is a public endpoint rather than a secret, so the deployed backend
// is a safe default. An env var still wins when one is supplied, which keeps
// local development pointing at localhost.
const FALLBACK_BASE = "https://litigate-v1.onrender.com"
const RAW_BASE = process.env.NEXT_PUBLIC_API_URL || FALLBACK_BASE

// A trailing slash produces a double slash in every request path, which the
// API answers with a bare 404. Strip it once, here.
export const API_BASE = RAW_BASE.trim().replace(/\/+$/, "")

export type Severity = "high" | "medium" | "low"

export type MailStatus = {
  configured: boolean
  auto: boolean
  recipients: number
}

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
  features?: string[]
  mail?: MailStatus
  auth?: { configured: boolean }
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

export type ChatAnswer = {
  answer: string
  clauses: string[]
  grounded: boolean
}

export type NotifyResult = {
  sent: boolean
  id?: string
  recipients: string[]
}

export type PlaybookRule = {
  id: string
  clauseType: string
  severity: Severity
  title: string
  policy: string
}

export type PlaybookInfo = {
  name: string
  version: string
  owner: string
  ruleCount: number
  requiredClauseCount: number
  rules: PlaybookRule[]
}

function endpoint(path: string) {
  return API_BASE + (path.startsWith("/") ? path : "/" + path)
}

// The backend resolves the alert recipient from this token rather than from
// anything in the request body, so it must ride along with every call that
// can result in mail being sent.
async function authHeaders(): Promise<Record<string, string>> {
  const token = await accessToken()
  return token ? { Authorization: "Bearer " + token } : {}
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(endpoint(path), {
    cache: "no-store",
    headers: await authHeaders(),
  })
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

async function postJson<T>(path: string, body: unknown, label: string): Promise<T> {
  const response = await fetch(endpoint(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(
      await detailOf(response, label + " failed with status " + response.status),
    )
  }

  return response.json() as Promise<T>
}

export function getHealth(): Promise<Health> {
  return request<Health>("/api/health")
}

export function getPlaybook(): Promise<PlaybookInfo> {
  return request<PlaybookInfo>("/api/playbook")
}

export async function uploadContract(file: File): Promise<ParsedContract> {
  const body = new FormData()
  body.append("file", file)

  const response = await fetch(endpoint("/api/contracts/upload"), {
    method: "POST",
    headers: await authHeaders(),
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
export function explainFindings(findings: Finding[]): Promise<ExplainResult> {
  return postJson<ExplainResult>(
    "/api/contracts/explain",
    { findings },
    "briefing",
  )
}

/**
 * Question answering restricted to the clauses supplied here. The backend is
 * given no other source, so an answer can always be traced to visible text.
 */
export function askQuestion(
  question: string,
  clauses: Clause[],
  findings: Finding[],
): Promise<ChatAnswer> {
  return postJson<ChatAnswer>(
    "/api/chat",
    { question, clauses, findings },
    "assistant",
  )
}

/**
 * Email the risk report for a contract. The recipient is taken from the
 * signed in session on the server side, so the address sent here is only a
 * hint used when authentication is switched off.
 */
export function sendRiskAlert(
  to: string,
  contract: ParsedContract,
): Promise<NotifyResult> {
  return postJson<NotifyResult>(
    "/api/notify",
    {
      to: to ? [to] : [],
      filename: contract.filename,
      summary: contract.summary ?? {},
      findings: contract.findings ?? [],
    },
    "email",
  )
}
