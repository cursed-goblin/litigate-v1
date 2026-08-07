import os
from dataclasses import dataclass, field

DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
DEFAULT_GROQ_FAST_MODEL = "llama-3.1-8b-instant"

# Tried in order when the preferred model is unavailable to the key.
DEFAULT_GROQ_FALLBACKS = ",".join(
    (
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.1-8b-instant",
        "moonshotai/kimi-k2-instruct",
        "meta-llama/llama-4-scout-17b-16e-instruct",
    )
)

# Resend allows this sender without a verified domain, but it will only
# deliver to the address that owns the Resend account. Point ALERT_FROM at a
# verified domain before sending to anyone else.
DEFAULT_ALERT_FROM = "Litigate <onboarding@resend.dev>"


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    llm_provider: str = os.getenv("LLM_PROVIDER", "groq")

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    groq_model: str = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
    groq_fast_model: str = os.getenv("GROQ_FAST_MODEL", DEFAULT_GROQ_FAST_MODEL)
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    cache_dir: str = os.getenv("CACHE_DIR", "/tmp/litigate-cache")
    use_cache: bool = os.getenv("USE_CACHE", "true").lower() == "true"

    # There is deliberately no fallback recipient. Reports go to the address
    # on the verified session and nowhere else, so a stale environment
    # variable can never quietly redirect someone's contract review.
    resend_api_key: str = os.getenv("RESEND_API_KEY", "")
    alert_from: str = os.getenv("ALERT_FROM", DEFAULT_ALERT_FROM)
    auto_alert: bool = os.getenv("AUTO_ALERT", "true").lower() == "true"

    # The anon key is a public value by design. It identifies the project to
    # the auth API and grants nothing on its own.
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")

    groq_fallbacks: list[str] = field(
        default_factory=lambda: _split(
            os.getenv("GROQ_MODEL_FALLBACKS", DEFAULT_GROQ_FALLBACKS)
        )
    )

    cors_origins: list[str] = field(
        default_factory=lambda: _split(
            os.getenv(
                "CORS_ORIGINS",
                "http://localhost:3000,https://litigate.zenvx.in",
            )
        )
    )


settings = Settings()
