from dataclasses import asdict

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .chat import answer as chat_answer
from .clauses import split_clauses
from .config import settings
from .explain import explain
from .extract import ExtractionError, extract_text
from .llm import LLMError, complete_json
from .mailer import MailError
from .mailer import configured as mail_configured
from .mailer import send_quietly, send_report
from .rules import evaluate, load_playbook, playbook_name

MAX_UPLOAD_BYTES = 8 * 1024 * 1024

# Static hosts hand out a new hostname per deploy, so an exact allowlist goes
# stale every time the frontend is redeployed. Match the deploy domains by
# shape instead. Credentials are never sent, so this exposes nothing.
CORS_ORIGIN_REGEX = r"https://([a-z0-9-]+\.)*(zenvx\.in|pages\.dev|workers\.dev)"

FEATURES = ["upload", "rules", "explain", "chat", "email"]

app = FastAPI(title="Litigate API", version="0.6.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExplainRequest(BaseModel):
    findings: list[dict] = Field(default_factory=list)


class ChatRequest(BaseModel):
    question: str = ""
    clauses: list[dict] = Field(default_factory=list)
    findings: list[dict] = Field(default_factory=list)


class NotifyRequest(BaseModel):
    to: list[str] = Field(default_factory=list)
    filename: str = "contract"
    summary: dict = Field(default_factory=dict)
    findings: list[dict] = Field(default_factory=list)


@app.get("/")
def root() -> dict:
    return {"service": "litigate-api", "version": app.version}


@app.head("/")
def root_head() -> dict:
    return {}


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
        "playbook": playbook_name(),
        "features": FEATURES,
        "mail": {
            "configured": mail_configured(),
            "auto": settings.auto_alert,
            "recipients": len(settings.alert_to),
        },
        "corsOrigins": settings.cors_origins,
        "corsOriginRegex": CORS_ORIGIN_REGEX,
    }


@app.get("/api/playbook")
def playbook() -> dict:
    book = load_playbook()
    return {
        "name": book.get("name"),
        "version": book.get("version"),
        "owner": book.get("owner"),
        "ruleCount": len(book.get("rules", [])),
        "requiredClauseCount": len(book.get("requiredClauses", [])),
        "rules": [
            {
                "id": rule.get("id"),
                "clauseType": rule.get("clauseType"),
                "severity": rule.get("severity"),
                "title": rule.get("title"),
                "policy": rule.get("policy"),
            }
            for rule in book.get("rules", [])
        ],
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
async def upload_contract(
    background: BackgroundTasks,
    file: UploadFile = File(...),
) -> dict:
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
    findings, summary, types = evaluate(text, clauses)
    payload = [asdict(finding) for finding in findings]

    # A high-risk contract notifies its owners without anyone asking. The send
    # is queued after the response so a mail outage cannot delay or fail the
    # analysis the user is waiting for.
    if (
        settings.auto_alert
        and settings.alert_to
        and mail_configured()
        and summary.get("riskBand") == "high"
    ):
        background.add_task(
            send_quietly,
            list(settings.alert_to),
            file.filename or "contract",
            summary,
            payload,
        )

    return {
        "filename": file.filename,
        "bytes": len(data),
        "characters": len(text),
        "clauseCount": len(clauses),
        "clauses": [
            dict(asdict(clause), type=types.get(clause.id, "other")) for clause in clauses
        ],
        "findings": payload,
        "summary": summary,
    }


@app.post("/api/contracts/explain")
async def explain_contract(payload: ExplainRequest) -> dict:
    """Reword proven findings for a non-lawyer reader.

    Kept separate from upload so that a model outage costs the narrative
    layer only. The findings themselves never depend on this call.
    """
    if not payload.findings:
        raise HTTPException(status_code=400, detail="no findings were supplied")

    try:
        explanations = await explain(payload.findings)
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "explanations": explanations,
        "requested": len(payload.findings),
        "returned": len(explanations),
    }


@app.post("/api/chat")
async def chat(payload: ChatRequest) -> dict:
    """Answer a question using only the clauses supplied by the caller."""
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="ask a question first")

    try:
        return await chat_answer(payload.question, payload.clauses, payload.findings)
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/notify")
async def notify(payload: NotifyRequest) -> dict:
    """Email a risk report on demand.

    Falls back to the configured owners when the caller names no recipient,
    so the browser never has to know who the escalation contacts are.
    """
    recipients = [item.strip() for item in payload.to if item.strip()]
    if not recipients:
        recipients = list(settings.alert_to)

    if not recipients:
        raise HTTPException(status_code=400, detail="no recipient was supplied")
    if not payload.summary:
        raise HTTPException(status_code=400, detail="analyse a contract first")

    try:
        return await send_report(
            recipients,
            payload.filename,
            payload.summary,
            payload.findings,
        )
    except MailError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
