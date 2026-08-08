// The four groups the Documents view draws as folders. They live here rather
// than inside the component because the Risk Register filters by the same
// clause-type lists, and two copies would drift apart the first time a type
// was added to the playbook.
export type Category = {
  label: string
  types: string[]
  fill: string
  tint: string
}

export const CATEGORIES: Category[] = [
  {
    label: "Commercial Terms",
    types: ["payment_terms", "renewal", "termination"],
    fill: "text-folder-amber",
    tint: "bg-folder-amber-soft",
  },
  {
    label: "Liability & Indemnity",
    types: ["limitation_of_liability", "indemnity", "warranty"],
    fill: "text-folder-blue",
    tint: "bg-folder-blue-soft",
  },
  {
    label: "Data & Confidentiality",
    types: ["data_protection", "confidentiality", "intellectual_property"],
    fill: "text-folder-green",
    tint: "bg-folder-green-soft",
  },
  {
    label: "Governance",
    types: [
      "governing_law",
      "dispute_resolution",
      "force_majeure",
      "audit_rights",
      "assignment",
    ],
    fill: "text-folder-violet",
    tint: "bg-folder-violet-soft",
  },
]
