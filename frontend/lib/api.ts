export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7860"

export type Health = {
  status: string
  version: string
  provider: string
  providers: {
    groq: boolean
    gemini: boolean
  }
  cache: boolean
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
