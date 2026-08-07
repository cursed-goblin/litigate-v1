"""Model client with on-disk response caching and provider failover."""

from __future__ import annotations

import hashlib
import json
import pathlib
from typing import Any, Awaitable, Callable

import httpx

from .config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

_TIMEOUT = httpx.Timeout(90.0, connect=10.0)


class LLMError(RuntimeError):
    """Raised when no configured provider returns a usable response."""


def _cache_file(system: str, user: str, model: str) -> pathlib.Path:
    digest = hashlib.sha256("\x00".join((model, system, user)).encode()).hexdigest()
    return pathlib.Path(settings.cache_dir) / f"{digest[:32]}.json"


def _load_cached(path: pathlib.Path) -> Any | None:
    if not settings.use_cache or not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _store_cached(path: pathlib.Path, payload: Any) -> None:
    if not settings.use_cache:
        return
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload), encoding="utf-8")
    except OSError:
        pass


async def _call_groq(system: str, user: str, model: str) -> str:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {settings.groq_api_key}"}

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(GROQ_URL, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


async def _call_gemini(system: str, user: str, model: str) -> str:
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    url = GEMINI_BASE + "/" + model + ":generateContent"

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(
            url,
            json=payload,
            params={"key": settings.gemini_api_key},
        )
    response.raise_for_status()
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]


def _providers(
    fast: bool,
) -> list[tuple[str, str, Callable[[str, str, str], Awaitable[str]]]]:
    groq = (
        "groq",
        settings.groq_fast_model if fast else settings.groq_model,
        _call_groq,
    )
    gemini = ("gemini", settings.gemini_model, _call_gemini)

    ordered = [groq, gemini] if settings.llm_provider == "groq" else [gemini, groq]
    keys = {"groq": settings.groq_api_key, "gemini": settings.gemini_api_key}
    return [entry for entry in ordered if keys[entry[0]]]


async def complete_json(system: str, user: str, *, fast: bool = False) -> Any:
    """Return parsed JSON from the first provider that answers successfully."""
    system = f"{system}\n\nRespond with valid JSON only."
    failures: list[str] = []

    for name, model, call in _providers(fast):
        cache_file = _cache_file(system, user, model)

        cached = _load_cached(cache_file)
        if cached is not None:
            return cached

        try:
            parsed = json.loads(await call(system, user, model))
        except (httpx.HTTPError, json.JSONDecodeError, KeyError, IndexError) as exc:
            failures.append(f"{name}: {exc}")
            continue

        _store_cached(cache_file, parsed)
        return parsed

    raise LLMError("; ".join(failures) or "no provider configured")
