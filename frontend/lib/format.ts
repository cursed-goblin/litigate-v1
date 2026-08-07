export const DASH = "\u2014"

export const RANK: Record<string, number> = { high: 3, medium: 2, low: 1 }

export const RISK_TEXT: Record<string, string> = {
  high: "text-risk-high",
  medium: "text-risk-medium",
  low: "text-risk-low",
}

export const RISK_CHIP: Record<string, string> = {
  high: "bg-risk-high-soft text-risk-high",
  medium: "bg-risk-medium-soft text-risk-medium",
  low: "bg-risk-low-soft text-risk-low",
}

export const RISK_FILL: Record<string, string> = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
}

export const RISK_EDGE: Record<string, string> = {
  high: "border-risk-high",
  medium: "border-risk-medium",
  low: "border-risk-low",
}

/** Indian grouping, e.g. 42000000 becomes INR 4,20,00,000. */
export function rupees(value?: number) {
  if (!value || value <= 0) {
    return DASH
  }
  return "INR " + value.toLocaleString("en-IN")
}

export function fileSize(bytes?: number) {
  if (!bytes || bytes <= 0) {
    return DASH
  }
  if (bytes < 1024) {
    return bytes + " B"
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(0) + " KB"
  }
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

export function clockTime(iso: string) {
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) {
    return DASH
  }
  return when.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  })
}

/** Reads naturally in a table: "Today, 1:47 AM". */
export function whenLabel(iso: string) {
  const when = new Date(iso)
  if (Number.isNaN(when.getTime())) {
    return DASH
  }
  const now = new Date()
  const sameDay = when.toDateString() === now.toDateString()
  if (sameDay) {
    return "Today, " + clockTime(iso)
  }
  return when.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function titleCase(value: string) {
  if (!value) {
    return DASH
  }
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
