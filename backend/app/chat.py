"""Grounded question answering over one analysed contract.

The model may only use the clause text and findings supplied with the
request. Nothing is retrieved from anywhere else, so every answer can be
traced back to wording the reader already has on screen.
"""

from __future__ import annotations

from typing import Any

from .llm import complete_json

MAX_CLAUSES = 60
MAX_CLAUSE_CHARS = 600
MAX_FINDINGS = 20
MAX_QUESTION_CHARS = 400

SYSTEM = (
    "You are a commercial contracts adviser answering questions about one "
    "specific contract. You may only use the clause text and the findings "
    "supplied in this message. If the answer is not present in that material, "
    "say so plainly instead of guessing. Never cite a clause number, statute, "
    "or policy that does not appear in the supplied material. Answer in at "
    "most six sentences of plain English, for a reader who is not a lawyer."
)

INSTRUCTIONS = (
    "Return an object with exactly these keys:\n"
    "answer: your reply in plain English.\n"
    "clauses: a list of the clause numbers you relied on, copied exactly as "
    "they appear above. Use an empty list if you relied on none.\n"
    "grounded: true when the supplied material answers the question, false "
    "when it does not cover it."
)


def _clip(value: Any, limit: int) -> str:
    text = " ".join(str(value or "").split())
    return text if len(text) <= limit else text[:limit] + "..."


def _context(clauses: list[dict], findings: list[dict]) -> str:
    lines: list[str] = ["Clauses in this contract:"]

    for clause in clauses[:MAX_CLAUSES]:
        number = _clip(clause.get("number"), 24)
        title = _clip(clause.get("title"), 90)
        body = _clip(clause.get("text"), MAX_CLAUSE_CHARS)
        if not body:
            continue
        lines.append("")
        lines.append(number + " " + title)
        lines.append(body)

    if findings:
        lines.append("")
        lines.append("Policy breaches already proven by the rule engine:")
        for finding in findings[:MAX_FINDINGS]:
            lines.append(
                "- clause "
                + _clip(finding.get("clauseNumber"), 24)
                + " ["
                + _clip(finding.get("severity"), 12)
                + "] "
                + _clip(finding.get("title"), 140)
                + " -- "
                + _clip(finding.get("observed"), 160)
            )

    return "\n".join(lines)


async def answer(
    question: str,
    clauses: list[dict],
    findings: list[dict],
) -> dict[str, Any]:
    """Answer a question using only the supplied contract material."""
    asked = _clip(question, MAX_QUESTION_CHARS)
    if not asked:
        return {"answer": "Ask a question about the loaded contract.", "clauses": [], "grounded": False}

    safe_clauses = [item for item in clauses if isinstance(item, dict)]
    safe_findings = [item for item in findings if isinstance(item, dict)]

    if not safe_clauses:
        return {
            "answer": "No contract is loaded yet, so there is nothing to read.",
            "clauses": [],
            "grounded": False,
        }

    prompt = "\n\n".join(
        (
            _context(safe_clauses, safe_findings),
            "Question: " + asked,
            INSTRUCTIONS,
        )
    )

    payload = await complete_json(SYSTEM, prompt)

    known = {
        _clip(item.get("number"), 24)
        for item in safe_clauses
        if _clip(item.get("number"), 24)
    }

    cited: list[str] = []
    raw = payload.get("clauses") if isinstance(payload, dict) else None
    if isinstance(raw, list):
        for entry in raw:
            number = _clip(entry, 24)
            if number in known and number not in cited:
                cited.append(number)

    text = _clip(payload.get("answer"), 1200) if isinstance(payload, dict) else ""
    if not text:
        text = "The model did not return a usable answer. Try rephrasing the question."

    return {
        "answer": text,
        "clauses": cited,
        "grounded": bool(payload.get("grounded")) if isinstance(payload, dict) else False,
    }
