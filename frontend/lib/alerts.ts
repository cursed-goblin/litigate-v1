import type { Finding, ParsedContract } from "@/lib/api"
import type { DocumentRecord } from "@/lib/session"

// Every notification is derived from an analysis that actually ran. There is no
// feed, no polling and no synthetic activity, so the panel can never show an
// event the rule engine did not produce.
export type Alert = {
  id: string
  kind: "document" | "finding" | "missing"
  severity: "high" | "medium" | "low"
  title: string
  detail: string
  at: string
  clauseId?: string
  documentId?: string
}

const MISSING_PREFIX = "MISSING-"

const WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 }

function bandOf(value: string): "high" | "medium" | "low" {
  if (value === "high") {
    return "high"
  }
  if (value === "medium") {
    return "medium"
  }
  return "low"
}

function forDocument(doc: DocumentRecord): Alert {
  const band = bandOf(doc.riskBand)
  const detail = doc.findingCount
    ? doc.findingCount +
      " findings, " +
      doc.high +
      " of them high severity. Risk score " +
      doc.riskScore +
      "."
    : "No breaches were proved against the playbook."

  return {
    id: "doc:" + doc.id,
    kind: "document",
    severity: band,
    title:
      band === "high"
        ? doc.name + " needs review before signature"
        : doc.name + " was analysed",
    detail,
    at: doc.uploadedAt,
    documentId: doc.id,
  }
}

// Only high severity findings are raised individually. Listing all sixteen of a
// contract's breaches here would bury the ones that matter, and the Risk
// Register already shows the full set.
export function buildAlerts(
  documents: DocumentRecord[],
  contract: ParsedContract | null,
  activeId: string | null,
): Alert[] {
  const list: Alert[] = documents.map(forDocument)

  const active = documents.find((doc) => doc.id === activeId)
  const when = active ? active.uploadedAt : ""

  const findings: Finding[] = contract?.findings ?? []

  findings.forEach((finding) => {
    if (bandOf(finding.severity) !== "high") {
      return
    }

    const absent = finding.ruleId.startsWith(MISSING_PREFIX)

    list.push({
      id: "find:" + (activeId ?? "session") + ":" + finding.id,
      kind: absent ? "missing" : "finding",
      severity: "high",
      title: finding.title,
      detail: absent
        ? "This contract contains no such clause. " + finding.policy
        : (finding.clauseNumber ? "Clause " + finding.clauseNumber + ". " : "") +
          finding.observed,
      at: when,
      clauseId: finding.clauseId ? finding.clauseId : undefined,
    })
  })

  return list.sort((a, b) => {
    if (a.at !== b.at) {
      return a.at < b.at ? 1 : -1
    }
    return (WEIGHT[b.severity] ?? 0) - (WEIGHT[a.severity] ?? 0)
  })
}
