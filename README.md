# Litigate

Contract risk and policy governance platform.

## Stack

- **Backend** — FastAPI (Python 3.11), Docker
- **Frontend** — Next.js 14, TypeScript, Tailwind CSS

## Layout

```
backend/    API service
frontend/   Web client
```

## Running locally

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 7860
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Environment

Configuration is read from environment variables. See `backend/.env.example`
and `frontend/.env.example`. Secrets are not committed — set them in the
deployment platform's secret store.

## Build

The frontend produces a static export:

```bash
cd frontend
npm run build
```

Output is written to `frontend/out`.
