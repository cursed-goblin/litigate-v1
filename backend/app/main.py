from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .llm import LLMError, complete_json

app = FastAPI(title="Litigate API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"service": "litigate-api", "version": app.version}


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": app.version,
        "provider": settings.llm_provider,
        "providers": {
            "groq": bool(settings.groq_api_key),
            "gemini": bool(settings.gemini_api_key),
        },
        "cache": settings.use_cache,
    }


@app.get("/api/llm/ping")
async def llm_ping() -> dict:
    try:
        result = await complete_json(
            "You are a connectivity probe.",
            'Reply with {"ok": true}.',
            fast=True,
        )
    except LLMError as exc:
        return {"ok": False, "error": str(exc)}
    return {"ok": True, "result": result}
