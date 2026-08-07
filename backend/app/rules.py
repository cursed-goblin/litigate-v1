from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

from .clauses import Clause

PLAYBOOK_PATH = Path(__file__).with_name("playbook.json")

MIN_RULE_WORDS = 25
SEVERITY_WEIGHT = {"high": 18, "medium": 9, "low": 4}

# The weighted severity total is unbounded, so clamping it at 100 made every
# seriously bad contract report the same number. Below the high threshold the
# score is the weighted total itself, which keeps the old behaviour for mild
# documents. Above it, additional weight is compressed towards a ceiling just
# short of 100, so a bad contract and a catastrophic one still rank against
# each other and nothing ever reads as a perfect 100.
BAND_HIGH = 60
BAND_MEDIUM = 30
SCORE_CEILING = 99
COMPRESSION = 70.0

_DAYS = re.compile(r"(\d{1,4})\s*\)?\s*(?:calendar |business |working )?days", re.IGNORECASE)
_MONTHS = re.compile(r"(\d{1,3})\s*\)?\s*months", re.IGNORECASE)
_AMOUNT = re.compile(r"INR\s*([\d,]{3,})", re.IGNORECASE)

CLAUSE_TYPES: dict[str, list[str]] = {
    "payment_terms": ["payment", "invoice", "charges", "late payment", "interest", "overdue"],
    "termination": ["terminate", "termination", "notice to the customer", "material breach"],
    "confidentiality": ["confidential", "confidentiality", "receiving party", "non disclosure"],
    "limitation_of_liability": [
        "limitation of liability", "aggregate liability", "shall not exceed",
        "liability cap", "consequential", "indirect",
    ],
    "indemnity": ["indemnify", "indemnity", "hold harmless", "defend"],
    "governing_law": ["governing law", "governed by", "laws of", "construed in accordance"],
    "data_protection": [
        "personal data", "data protection", "customer data", "sub processor",
        "security", "breach of security", "processing",
    ],
    "dispute_resolution": ["arbitration", "dispute", "tribunal", "seat of arbitration", "mediation"],
    "intellectual_property": [
        "intellectual property", "copyright", "licence", "ownership of deliverables", "vest in",
    ],
    "force_majeure": ["force majeure", "beyond its reasonable control", "acts of god"],
    "warranty": ["warrant", "warranty", "warranties", "as is", "disclaim"],
    "audit_rights": ["audit", "inspect", "books and records", "right to audit"],
    "assignment": ["assign", "novate", "subcontract any", "transfer any of its rights"],
    "renewal": ["renew", "renewal", "successive periods", "then current term"],
}


@dataclass(frozen=True)
class Finding:
    id: str
    ruleId: str
    clauseId: str
    clauseNumber: str
    clauseTitle: str
    clauseType: str
    severity: str
    title: str
    detail: str
    observed: str
    evidence: str
    policy: str
    grounded: bool


@lru_cache(maxsize=1)
def load_playbook() -> dict[str, Any]:
    with open(PLAYBOOK_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def playbook_name() -> str:
    book = load_playbook()
    return str(book.get("name", "playbook")) + " v" + str(book.get("version", "1"))


def score_from_weight(weighted: int) -> int:
    """Turn an unbounded weighted severity total into a 0 to 99 score.

    Linear up to the high threshold, then asymptotic. The curve is strictly
    increasing, so two documents with different findings almost never share a
    score, and the number can be explained in one sentence when asked.
    """
    if weighted <= 0:
        return 0
    if weighted <= BAND_HIGH:
        return int(weighted)
    headroom = SCORE_CEILING - BAND_HIGH
    excess = float(weighted - BAND_HIGH)
    return int(round(BAND_HIGH + headroom * (1.0 - math.exp(-excess / COMPRESSION))))


def band_for(score: int) -> str:
    if score >= BAND_HIGH:
        return "high"
    if score >= BAND_MEDIUM:
        return "medium"
    return "low"


def score_model() -> dict[str, Any]:
    """Describe the scoring method so it can be shown and defended."""
    return {
        "weights": dict(SEVERITY_WEIGHT),
        "ceiling": SCORE_CEILING,
        "highBand": BAND_HIGH,
        "mediumBand": BAND_MEDIUM,
        "curve": "linear to " + str(BAND_HIGH) + ", then asymptotic to " + str(SCORE_CEILING),
    }


def classify(clause: Clause) -> str:
    haystack_title = clause.title.lower()
    haystack_body = clause.text.lower()
    best = "other"
    best_score = 0
    for name, keywords in CLAUSE_TYPES.items():
        score = 0
        for keyword in keywords:
            if keyword in haystack_title:
                score += 4
            if keyword in haystack_body:
                score += 1
        if score > best_score:
            best = name
            best_score = score
    return best if best_score > 0 else "other"


def _sentence_at(text: str, position: int) -> str:
    start = text.rfind(".", 0, position)
    start = 0 if start < 0 else start + 1
    end = text.find(".", position)
    end = len(text) if end < 0 else end + 1
    return " ".join(text[start:end].split())


def _locate(text: str, needle: str) -> int:
    return text.lower().find(needle.lower())


def _to_int(raw: str) -> int:
    return int(raw.replace(",", ""))


def _largest(pattern: re.Pattern[str], text: str) -> tuple[int, int] | None:
    best: tuple[int, int] | None = None
    for match in pattern.finditer(text):
        value = _to_int(match.group(1))
        if best is None or value > best[0]:
            best = (value, match.start())
    return best


def _smallest(pattern: re.Pattern[str], text: str) -> tuple[int, int] | None:
    best: tuple[int, int] | None = None
    for match in pattern.finditer(text):
        value = _to_int(match.group(1))
        if best is None or value < best[0]:
            best = (value, match.start())
    return best


def _format_inr(value: int) -> str:
    return "INR " + format(value, ",")


def _apply(rule: dict[str, Any], clause: Clause, contract_value: int) -> tuple[str, str] | None:
    check = rule.get("check")
    body = clause.text

    if check == "max_days":
        found = _largest(_DAYS, body)
        if found and found[0] > int(rule["limit"]):
            observed = str(found[0]) + " days against a limit of " + str(rule["limit"]) + " days"
            return observed, _sentence_at(body, found[1])
        return None

    if check == "min_months":
        found = _smallest(_MONTHS, body)
        if found and found[0] < int(rule["limit"]):
            observed = str(found[0]) + " months against a minimum of " + str(rule["limit"]) + " months"
            return observed, _sentence_at(body, found[1])
        return None

    if check == "min_cap_ratio":
        found = _smallest(_AMOUNT, body)
        if not found or contract_value <= 0:
            return None
        cap, position = found
        if cap >= contract_value:
            return None
        ratio = cap / contract_value
        if ratio >= float(rule["limit"]):
            return None
        percent = format(ratio * 100, ".2f")
        observed = (
            _format_inr(cap)
            + " cap against "
            + _format_inr(contract_value)
            + " contract value, which is "
            + percent
            + " percent"
        )
        return observed, _sentence_at(body, position)

    if check == "forbidden_phrase":
        for phrase in rule.get("phrases", []):
            position = _locate(body, phrase)
            if position >= 0:
                return "contains the wording " + phrase, _sentence_at(body, position)
        return None

    if check == "required_phrase":
        for phrase in rule.get("phrases", []):
            if _locate(body, phrase) >= 0:
                return None
        return "none of the required wording is present", _sentence_at(body, 0)

    return None


def evaluate(
    text: str, clauses: Iterable[Clause]
) -> tuple[list[Finding], dict[str, Any], dict[str, str]]:
    book = load_playbook()
    clauses = list(clauses)

    types = {clause.id: classify(clause) for clause in clauses}
    present = {value for value in types.values()}

    value_hit = _largest(_AMOUNT, text)
    contract_value = value_hit[0] if value_hit else 0

    findings: list[Finding] = []
    counter = 0

    for rule in book.get("rules", []):
        for clause in clauses:
            if types[clause.id] != rule.get("clauseType"):
                continue
            if clause.words < MIN_RULE_WORDS:
                continue
            outcome = _apply(rule, clause, contract_value)
            if outcome is None:
                continue
            observed, evidence = outcome
            counter += 1
            findings.append(
                Finding(
                    id="F" + format(counter, "03d"),
                    ruleId=str(rule["id"]),
                    clauseId=clause.id,
                    clauseNumber=clause.number,
                    clauseTitle=clause.title,
                    clauseType=types[clause.id],
                    severity=str(rule.get("severity", "low")),
                    title=str(rule.get("title", "")),
                    detail=str(rule.get("detail", "")),
                    observed=observed,
                    evidence=evidence,
                    policy=str(rule.get("policy", "")),
                    grounded=bool(evidence) and evidence in " ".join(clause.text.split()),
                )
            )

    for requirement in book.get("requiredClauses", []):
        wanted = str(requirement.get("type"))
        if wanted in present:
            continue
        counter += 1
        findings.append(
            Finding(
                id="F" + format(counter, "03d"),
                ruleId="MISSING-" + wanted.upper().replace("_", "-"),
                clauseId="",
                clauseNumber="",
                clauseTitle="",
                clauseType=wanted,
                severity=str(requirement.get("severity", "medium")),
                title=str(requirement.get("title", "")),
                detail=str(requirement.get("detail", "")),
                observed="no clause of this type was found in the document",
                evidence="",
                policy=str(requirement.get("policy", "")),
                grounded=True,
            )
        )

    high = sum(1 for item in findings if item.severity == "high")
    medium = sum(1 for item in findings if item.severity == "medium")
    low = sum(1 for item in findings if item.severity == "low")

    weighted = sum(SEVERITY_WEIGHT.get(item.severity, 0) for item in findings)
    score = score_from_weight(weighted)
    band = band_for(score)

    cap_clause = next(
        (c for c in clauses if types[c.id] == "limitation_of_liability" and _AMOUNT.search(c.text)),
        None,
    )
    cap_hit = _smallest(_AMOUNT, cap_clause.text) if cap_clause else None

    summary: dict[str, Any] = {
        "total": len(findings),
        "high": high,
        "medium": medium,
        "low": low,
        "riskScore": score,
        "riskBand": band,
        "riskWeighted": weighted,
        "riskCeiling": SCORE_CEILING,
        "grounded": sum(1 for item in findings if item.grounded),
        "clausesAnalysed": sum(1 for c in clauses if c.words >= MIN_RULE_WORDS),
        "contractValue": contract_value,
        "liabilityCap": cap_hit[0] if cap_hit else 0,
        "playbook": playbook_name(),
        "rulesEvaluated": len(book.get("rules", [])),
    }

    return findings, summary, types
