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
