"use client"

import { useRef, useState } from "react"

import { askQuestion } from "@/lib/api"
import type { ParsedContract } from "@/lib/api"
import { ChatIcon, SendIcon, ShieldIcon } from "./Icons"

type Message = {
  id: string
  role: "user" | "assistant"
  text: string
  clauses?: string[]
  grounded?: boolean
}

const SUGGESTIONS = [
  "What is our maximum financial exposure under this contract?",
  "Can we exit this agreement early, and what would it cost?",
  "What happens to our data if the supplier suffers a breach?",
  "Which clauses give the supplier rights we do not have?",
]

export default function Assistant({
  contract,
}: {
  contract: ParsedContract | null
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const counter = useRef(0)

  const nextId = () => {
    counter.current += 1
    return "m" + counter.current
  }

  const send = async (question: string) => {
    const asked = question.trim()
    if (!asked || busy || !contract) {
      return
    }

    setDraft("")
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", text: asked },
    ])
    setBusy(true)

    try {
      const reply = await askQuestion(
        asked,
        contract.clauses ?? [],
        contract.findings ?? [],
      )
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: reply.answer,
          clauses: reply.clauses,
          grounded: reply.grounded,
        },
      ])
    } catch (cause) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text:
            cause instanceof Error
              ? cause.message
              : "The assistant could not be reached.",
          grounded: false,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line bg-surface px-8 py-4">
        <h1 className="text-[17px] font-semibold tracking-tight">Assistant</h1>
        <p className="mt-0.5 text-[12px] text-ink-3">
          {contract
            ? "Answers are restricted to the " +
              contract.clauseCount +
              " clauses in " +
              contract.filename +
              ". Nothing else is consulted."
            : "Load a contract first. The assistant only reads the document you upload."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-card">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                <ChatIcon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[14px] font-semibold">
                Ask about this contract
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-6 text-ink-3">
                The assistant is given the clause text and the proven findings,
                and nothing else. If the contract does not answer a question, it
                says so rather than guessing.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={!contract || busy}
                  onClick={() => send(item)}
                  className="rounded-xl border border-line bg-surface p-3.5 text-left text-[12.5px] leading-5 text-ink-2 shadow-card transition-shadow hover:shadow-pop disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-[13px] leading-6 text-white">
                    {message.text}
                  </p>
                </div>
              ) : (
                <div key={message.id} className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3 shadow-card">
                    <p className="text-[13px] leading-6 text-ink-2">
                      {message.text}
                    </p>

                    {message.clauses && message.clauses.length ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {message.clauses.map((number) => (
                          <span
                            key={number}
                            className="rounded-md bg-canvas px-2 py-[3px] font-mono text-[11px] text-ink-3"
                          >
                            Clause {number}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-2.5 flex items-center gap-1.5">
                      <ShieldIcon
                        className={
                          "h-3.5 w-3.5 " +
                          (message.grounded ? "text-accent" : "text-risk-medium")
                        }
                      />
                      <span
                        className={
                          "text-[10px] font-semibold tracking-[0.06em] " +
                          (message.grounded ? "text-accent" : "text-risk-medium")
                        }
                      >
                        {message.grounded
                          ? "ANSWERED FROM THE CONTRACT"
                          : "NOT COVERED BY THE CONTRACT"}
                      </span>
                    </div>
                  </div>
                </div>
              ),
            )}

            {busy ? (
              <p className="text-[12px] text-ink-4">Reading the contract...</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-surface px-8 py-4">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            send(draft)
          }}
          className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!contract || busy}
            placeholder={
              contract ? "Ask about a clause, a risk, or an obligation..." : "Upload a contract to begin"
            }
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-ink-4 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!contract || busy || !draft.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-opacity disabled:opacity-30"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
