"""Plain-language explanation layer sitting on top of proven findings.

The rule engine decides what is wrong. This module only rewords those
findings for a non-lawyer reader. It is never allowed to introduce a
finding, a clause reference, or a policy citation of its own.
"""

from __future__ import annotations

from typing import Any

from .llm import complete_json

MAX_FINDINGS = 20
MAX_EVIDENCE_CHARS = 320

SYSTEM = (
    "You are a senior commercial contracts lawyer advising an Indian company. "
    "Each item you receive has already been proven against the contract text by "
    "a deterministic rule engine, so treat every item as established fact. "
    "Never dispute an item, never invent an additional issue, and never mention "
    "any clause number, statute, or policy that was not given to you. "
    "Write for a busy executive who is not a lawyer."
)

INSTRUCTIONS = (
    "For every item supplied, return one entry with these four keys:\n"
    "id: copy the item id exactly.\n"
    "plain: one short sentence saying what the clause actually does, no jargon.\n"
    "impact: one short sentence on the concrete commercial exposure to us.\n"
    "ask: one short sentence naming the specific change to request.\n"
    "Return an object with a single key 'explanations' holding the list. "
    "Return an entry for every id and no ids that were not supplied."
)


def _clip(value: Any, limit: int = MAX_EVIDENCE_CHARS) -> str:
    text = " ".join(str(value or "").split())
    return text if len(text) <= limit else text[:limit] + "..."


def _prompt(findings: list[dict]) -> str:
    lines: list[str] = [INSTRUCTIONS, "", "Items:"]
    for finding in findings:
        number = _clip(finding.get("clauseNumber"), 24) or "not present"
        lines.append("")
        lines.append("id: " + _clip(finding.get("id"), 12))
        lines.append("severity: " + _clip(finding.get("severity"), 12))
        lines.append("clause: " + number + " " + _clip(finding.get("clauseTitle"), 90))
        lines.append("issue: " + _clip(finding.get("title"), 140))
        lines.append("why it fails: " + _clip(finding.get("detail"), 240))
        lines.append("measured: " + _clip(finding.get("observed"), 160))
        lines.append("contract wording: " + _clip(finding.get("evidence")))
        lines.append("policy breached: " + _clip(finding.get("policy"), 240))
    return "\n".join(lines)


def _coerce(entry: Any, allowed: set[str]) -> tuple[str, dict[str, str]] | None:
    """Keep an entry only when it maps onto a finding we actually sent."""
    if not isinstance(entry, dict):
        return None
    key = str(entry.get("id", "")).strip()
    if key not in allowed:
        return None
    plain = _clip(entry.get("plain"), 400)
    if not plain:
        return None
    return key, {
        "plain": plain,
        "impact": _clip(entry.get("impact"), 400),
        "ask": _clip(entry.get("ask"), 400),
    }


async def explain(findings: list[dict]) -> dict[str, dict[str, str]]:
    """Return an explanation per finding id, batched into a single call.

    Any id the model omits or invents is discarded rather than guessed at,
    so a partial answer degrades to fewer explanations, never to wrong ones.
    """
    batch = [item for item in findings if isinstance(item, dict)][:MAX_FINDINGS]
    if not batch:
        return {}

    allowed = {str(item.get("id", "")).strip() for item in batch}
    allowed.discard("")

    payload = await complete_json(SYSTEM, _prompt(batch))

    entries: Any = []
    if isinstance(payload, dict):
        entries = payload.get("explanations") or payload.get("items") or []
    elif isinstance(payload, list):
        entries = payload

    results: dict[str, dict[str, str]] = {}
    if isinstance(entries, list):
        for entry in entries:
            coerced = _coerce(entry, allowed)
            if coerced is not None:
                results[coerced[0]] = coerced[1]
    return results
