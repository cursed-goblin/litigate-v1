from dataclasses import asdict

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .clauses import split_clauses
from .config import settings
from .extract import ExtractionError, extract_text
from .llm import LLMError, complete_json

MAX_UPLOAD_BYTES = 8 * 1024 * 1024

app = FastAPI(title="Litigate API", version="0.2.0")

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


@app.post("/api/contracts/upload")
async def upload_contract(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="the uploaded file is empty")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="the file exceeds the 8 MB limit")

    try:
        text = extract_text(file.filename or "", data)
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    clauses = split_clauses(text)
    return {
        "filename": file.filename,
        "bytes": len(data),
        "characters": len(text),
        "clauseCount": len(clauses),
        "clauses": [asdict(clause) for clause in clauses],
    }
