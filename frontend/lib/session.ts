/** A document analysed during this browser session. */
export type DocumentRecord = {
  id: string
  name: string
  bytes: number
  uploadedAt: string
  clauseCount: number
  findingCount: number
  high: number
  riskScore: number
  riskBand: string
}
