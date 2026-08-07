"use client"

import { useEffect, useState } from "react"

import { getPlaybook } from "@/lib/api"
import type { PlaybookInfo } from "@/lib/api"
import { RISK_CHIP, titleCase } from "@/lib/format"

export default function Playbook() {
  const [book, setBook] = useState<PlaybookInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPlaybook()
      .then(setBook)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "playbook unavailable"),
      )
  }, [])

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <h1 className="text-[22px] font-semibold tracking-tight">Playbook</h1>
      <p className="mt-1 text-[13px] text-ink-3">
        {book
          ? book.name +
            " v" +
            book.version +
            ", owned by " +
            book.owner +
            ". " +
            book.ruleCount +
            " rules and " +
            book.requiredClauseCount +
            " mandatory clauses."
          : "The rule set every contract is measured against."}
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-risk-high bg-risk-high-soft px-4 py-2.5 text-[13px] text-risk-high">
          {error}
        </p>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="grid grid-cols-[90px_150px_minmax(0,1fr)_minmax(0,1.3fr)] gap-4 border-b border-line px-5 py-3 text-[11px] font-semibold tracking-[0.04em] text-ink-4">
          <span>RULE</span>
          <span>CLAUSE TYPE</span>
          <span>REQUIREMENT</span>
          <span>POLICY SOURCE</span>
        </div>

        {book?.rules.length ? (
          book.rules.map((rule) => (
            <div
              key={rule.id}
              className="grid grid-cols-[90px_150px_minmax(0,1fr)_minmax(0,1.3fr)] items-start gap-4 border-b border-line px-5 py-3.5 last:border-0"
            >
              <span className="font-mono text-[12px] text-ink-2">{rule.id}</span>
              <span className="text-[12px] text-ink-3">
                {titleCase(rule.clauseType)}
              </span>
              <span>
                <span className="block text-[13px] leading-5">{rule.title}</span>
                <span
                  className={
                    "mt-1 inline-block rounded-md px-2 py-[2px] text-[11px] font-medium capitalize " +
                    (RISK_CHIP[rule.severity] ?? "")
                  }
                >
                  {rule.severity}
                </span>
              </span>
              <span className="text-[12px] leading-5 text-ink-3">{rule.policy}</span>
            </div>
          ))
        ) : (
          <div className="px-5 py-12 text-center text-[13px] text-ink-3">
            {error ? "Could not reach the API." : "Loading rules..."}
          </div>
        )}
      </div>
    </div>
  )
}
