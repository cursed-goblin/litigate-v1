from __future__ import annotations

import re
from dataclasses import dataclass

MIN_MERGE_WORDS = 25
MAX_HEADING_LENGTH = 200

_DOTTED = re.compile(r"^(?P<number>\d{1,2}(?:\.\d{1,3}){1,3})\.?\s+(?P<rest>\S.*)$")
_PLAIN = re.compile(r"^(?P<number>\d{1,2})\.\s+(?P<rest>[A-Z\"'\u201c].*)$")
_ARTICLE = re.compile(
    r"^(?:ARTICLE|SECTION|CLAUSE)\s+"
    r"(?P<number>\d{1,2}(?:\.\d{1,3})*|[IVXLC]{1,6})[.:]?\s*(?P<rest>.*)$",
    re.IGNORECASE,
)
_TITLE_SPLIT = re.compile(r"^(?P<title>[^.]{3,80}?)[.:]\s+(?P<body>[A-Z\"'\u201c].*)$")
_BLANK_LINE = re.compile(r"\n\s*\n")


@dataclass(frozen=True)
class Clause:
    id: str
    number: str
    title: str
    text: str
    words: int


def _heading(line: str) -> tuple[str, str] | None:
    stripped = line.strip()
    if not stripped or len(stripped) > MAX_HEADING_LENGTH:
        return None
    for pattern in (_ARTICLE, _DOTTED, _PLAIN):
        match = pattern.match(stripped)
        if match:
            return match.group("number"), match.group("rest").strip()
    return None


def _looks_like_title(value: str) -> bool:
    words = value.split()
    if not 1 <= len(words) <= 10:
        return False
    capitalised = sum(1 for word in words if word[:1].isupper())
    return capitalised >= max(1, len(words) - 2)


def _split_title(rest: str) -> tuple[str, str]:
    rest = rest.strip()
    if not rest:
        return "", ""
    if len(rest) <= 80 and "." not in rest.rstrip("."):
        return rest.rstrip(".:").strip(), ""
    match = _TITLE_SPLIT.match(rest)
    if match and _looks_like_title(match.group("title")):
        return match.group("title").strip(), match.group("body").strip()
    return "", rest


def _derive_title(body: str) -> str:
    words = body.split()
    if not words:
        return "Untitled"
    snippet = " ".join(words[:8])
    return snippet if len(words) <= 8 else snippet + "..."


def _tidy(block: str) -> str:
    return "\n".join(line.rstrip() for line in block.split("\n")).strip()


def _numbered_clauses(text: str) -> list[Clause]:
    lines = text.split("\n")
    marks: list[tuple[int, str, str]] = []
    for index, line in enumerate(lines):
        head = _heading(line)
        if head is not None:
            marks.append((index, head[0], head[1]))

    if len(marks) < 3:
        return []

    clauses: list[Clause] = []
    for position, (index, number, rest) in enumerate(marks):
        end = marks[position + 1][0] if position + 1 < len(marks) else len(lines)
        title, inline = _split_title(rest)
        parts = [inline] if inline else []
        parts.extend(lines[index + 1 : end])
        body = _tidy("\n".join(parts))
        clauses.append(
            Clause(
                id=f"c{position + 1:03d}",
                number=number,
                title=title or _derive_title(body),
                text=body,
                words=len(body.split()),
            )
        )
    return clauses


def _paragraph_clauses(text: str) -> list[Clause]:
    blocks = [block.strip() for block in _BLANK_LINE.split(text) if block.strip()]
    merged: list[str] = []
    for block in blocks:
        if merged and len(merged[-1].split()) < MIN_MERGE_WORDS:
            merged[-1] = merged[-1] + "\n\n" + block
        else:
            merged.append(block)

    return [
        Clause(
            id=f"c{position:03d}",
            number=str(position),
            title=_derive_title(block),
            text=block,
            words=len(block.split()),
        )
        for position, block in enumerate(merged, start=1)
    ]


def split_clauses(text: str) -> list[Clause]:
    return _numbered_clauses(text) or _paragraph_clauses(text)
