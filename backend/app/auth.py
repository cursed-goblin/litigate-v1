"""Supabase token verification.

The alert recipient is resolved from a verified access token rather than
from the request body. A caller therefore cannot make this service email
an address they do not control, which matters because the send endpoint is
otherwise a usable open relay.

Verification is a call to Supabase rather than local signature checking.
That costs one round trip but needs no JWT secret and no extra dependency,
and it honours revoked sessions immediately.
"""

import time

import httpx

from .config import settings

USER_PATH = "/auth/v1/user"

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# Short lived, so a signed out user stops receiving mail quickly, but long
# enough that an upload and its follow up calls do not each pay a round trip.
_TTL_SECONDS = 120

_cache: dict[str, tuple[float, str]] = {}


def configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_anon_key)


def _token_of(authorization: str | None) -> str:
    if not authorization:
        return ""
    value = authorization.strip()
    if value.lower().startswith("bearer "):
        value = value[7:]
    return value.strip()


def _cached(token: str) -> str | None:
    entry = _cache.get(token)
    if not entry:
        return None
    expires, email = entry
    if expires < time.time():
        _cache.pop(token, None)
        return None
    return email


async def current_email(authorization: str | None) -> str | None:
    """Return the signed in address, or None when the token is absent or bad."""
    if not configured():
        return None

    token = _token_of(authorization)
    if not token:
        return None

    hit = _cached(token)
    if hit:
        return hit

    url = settings.supabase_url.rstrip("/") + USER_PATH

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.get(
                url,
                headers={
                    "apikey": settings.supabase_anon_key,
                    "Authorization": "Bearer " + token,
                },
            )
    except httpx.HTTPError:
        return None

    if response.status_code != 200:
        return None

    try:
        data = response.json()
    except ValueError:
        return None

    email = data.get("email") if isinstance(data, dict) else None
    if not isinstance(email, str) or "@" not in email:
        return None

    _cache[token] = (time.time() + _TTL_SECONDS, email)
    return email
