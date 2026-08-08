"""Refuse documents that are not contracts before any analysis happens.

The rule engine cannot tell the difference on its own. Hand it an exam paper
and it will split the questions into "clauses", match none of the policy
rules, and report a confident low risk score for a document that has no legal
meaning at all. A wrong answer with a number attached is worse than a
refusal, so every upload is screened first.

Screening is deterministic and deliberately generous. A file is refused only
when the positive evidence for a contract is close to absent, so an unusual
but genuine agreement still gets through. Anything borderline is accepted and
reviewed as normal.
"""

from __future__ import annotations

from dataclasses import dataclass

# A contract has to clear both bars: enough distinct subject areas, and enough
# obligation language. Either one alone is easy to hit by accident.
MIN_WORDS = 120
MIN_SECTIONS = 5
MIN_OBLIGATIONS = 3

# Each family counts once however often it appears, so one repeated boilerplate
# footer cannot carry a document past the gate on its own.
SECTIONS: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "agreement",
        (
            "this agreement",
            "this contract",
            "this deed",
            "agreement is made",
            "agreement is entered",
            "master services agreement",
        ),
    ),
    (
        "parties",
        (
            "the parties",
            "both parties",
            "either party",
            "each party",
            "disclosing party",
            "receiving party",
            "hereinafter referred",
        ),
    ),
    (
        "term",
        (
            "effective date",
            "initial term",
            "renewal term",
            "term and termination",
            "commencement date",
        ),
    ),
    (
        "termination",
        (
            "terminate this",
            "termination for",
            "notice of termination",
            "right to terminate",
        ),
    ),
    (
        "liability",
        (
            "limitation of liability",
            "aggregate liability",
            "liable for",
            "consequential damages",
            "indemnify",
            "indemnification",
        ),
    ),
    (
        "confidentiality",
        (
            "confidential information",
            "non-disclosure",
            "confidentiality obligations",
            "keep confidential",
        ),
    ),
    (
        "payment",
        (
            "payment terms",
            "invoice",
            "fees payable",
            "net 30",
            "net 45",
            "net 60",
            "purchase order",
        ),
    ),
    (
        "governing law",
        (
            "governing law",
            "jurisdiction",
            "dispute resolution",
            "arbitration",
            "courts of",
        ),
    ),
    (
        "intellectual property",
        (
            "intellectual property",
            "work product",
            "ownership of",
            "licence to use",
            "license to use",
        ),
    ),
    (
        "data protection",
        (
            "personal data",
            "data protection",
            "data processor",
            "data controller",
            "sub-processor",
            "subprocessor",
        ),
    ),
    (
        "service levels",
        (
            "service level",
            "uptime",
            "support hours",
            "statement of work",
            "response time",
        ),
    ),
    (
        "warranties",
        (
            "represents and warrants",
            "warrants that",
            "warranty period",
            "no warranty",
        ),
    ),
    (
        "standard clauses",
        (
            "force majeure",
            "severability",
            "entire agreement",
            "assignment",
            "waiver",
        ),
    ),
    (
        "signature",
        (
            "in witness whereof",
            "authorised signatory",
            "authorized signatory",
            "signed on behalf",
        ),
    ),
)

# Deliberately substring counts rather than tokenised matches. The gate only
# needs an order of magnitude, and this cannot fail on odd punctuation.
OBLIGATIONS = (" shall", " must ", " agrees to", " undertakes to", " is required to")

# Used only to name the file in the refusal, never to decide it.
SHAPES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "an exam or question paper",
        (
            "question paper",
            "answer all questions",
            "attempt any",
            "maximum marks",
            "max marks",
            "max. marks",
            "marks each",
            "time allowed",
            "roll no",
            "hall ticket",
            "instructions to candidates",
            "fill in the blanks",
            "choose the correct",
            "write a short note",
            "question no",
            "subject code",
        ),
    ),
    (
        "a CV or resume",
        (
            "curriculum vitae",
            "career objective",
            "work experience",
            "references available",
        ),
    ),
    (
        "an invoice or receipt",
        (
            "invoice no",
            "invoice number",
            "amount due",
            "total payable",
            "bill to",
            "gstin",
        ),
    ),
    (
        "lecture or study notes",
        ("syllabus", "lecture", "chapter ", "textbook", "revision"),
    ),
    (
        "a manual or guide",
        ("getting started", "troubleshooting", "user manual", "step 1"),
    ),
)


@dataclass(frozen=True)
class Verdict:
    accepted: bool
    words: int
    sections: tuple[str, ...]
    obligations: int
    looks_like: str | None
    reason: str

    def summary(self) -> dict:
        """The evidence behind the decision, for display and for the logs."""
        return {
            "accepted": self.accepted,
            "words": self.words,
            "sections": list(self.sections),
            "sectionsFound": len(self.sections),
            "sectionsRequired": MIN_SECTIONS,
            "obligations": self.obligations,
            "looksLike": self.looks_like,
        }


def _sections(lowered: str) -> tuple[str, ...]:
    return tuple(
        name
        for name, phrases in SECTIONS
        if any(phrase in lowered for phrase in phrases)
    )


def _obligations(lowered: str) -> int:
    return sum(lowered.count(term) for term in OBLIGATIONS)


def _shape(lowered: str) -> str | None:
    for label, hints in SHAPES:
        if sum(1 for hint in hints if hint in lowered) >= 2:
            return label
    return None


def _listed(names: tuple[str, ...]) -> str:
    if not names:
        return "none of them"
    if len(names) == 1:
        return names[0]
    return ", ".join(names[:-1]) + " and " + names[-1]


def screen(text: str) -> Verdict:
    """Decide whether this text is worth reviewing as a contract."""
    lowered = text.lower()
    words = len(text.split())
    found = _sections(lowered)
    obligations = _obligations(lowered)
    shape = _shape(lowered)

    if words < MIN_WORDS:
        return Verdict(
            False,
            words,
            found,
            obligations,
            shape,
            "there is too little text to review: "
            + str(words)
            + " words, where a contract needs at least "
            + str(MIN_WORDS)
            + ".",
        )

    if len(found) >= MIN_SECTIONS and obligations >= MIN_OBLIGATIONS:
        return Verdict(True, words, found, obligations, shape, "")

    named = "It reads like " + shape + ". " if shape else ""

    return Verdict(
        False,
        words,
        found,
        obligations,
        shape,
        "this file does not read like a contract or policy document, so nothing "
        "was analysed and nothing was saved. "
        + named
        + "Litigate looks for the subject areas every contract covers and found "
        + str(len(found))
        + " of "
        + str(len(SECTIONS))
        + " ("
        + _listed(found)
        + "), with "
        + str(obligations)
        + " obligation terms such as shall or must. At least "
        + str(MIN_SECTIONS)
        + " subject areas and "
        + str(MIN_OBLIGATIONS)
        + " obligation terms are required. Upload an agreement, policy, or "
        "similar document instead.",
    )


def screen_model() -> dict:
    """The published thresholds, so the interface can explain the refusal."""
    return {
        "minWords": MIN_WORDS,
        "minSections": MIN_SECTIONS,
        "minObligations": MIN_OBLIGATIONS,
        "sections": [name for name, _ in SECTIONS],
    }
