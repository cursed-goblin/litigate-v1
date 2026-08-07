import os
from dataclasses import dataclass, field


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    llm_provider: str = os.getenv("LLM_PROVIDER", "groq")

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    groq_fast_model: str = os.getenv("GROQ_FAST_MODEL", "llama-3.1-8b-instant")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    cache_dir: str = os.getenv("CACHE_DIR", "/tmp/litigate-cache")
    use_cache: bool = os.getenv("USE_CACHE", "true").lower() == "true"

    cors_origins: list[str] = field(
        default_factory=lambda: _split(
            os.getenv(
                "CORS_ORIGINS",
                "http://localhost:3000,https://litigate.zenvx.in",
            )
        )
    )


settings = Settings()
