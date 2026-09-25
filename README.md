# Vite + FastAPI monorepo

The repository contains two independent applications connected by Docker Compose:

- `frontend/` — React, TypeScript, and Vite
- `backend/` — Python and FastAPI

## Run with Docker

```sh
docker compose up --build
```

Open <http://localhost:5173>. The frontend proxies `/api/*` requests to the backend. Backend API docs are available at <http://localhost:8000/docs>.

## Public API

Search groups, teachers, and rooms with `GET /api/v1/search?type=group|teacher|room&q=...`.
For groups, Latin letters in `q` are read as Cyrillic: `A-06m-26` finds `А-06м-26`
(`app/services/group_name.py` holds the letter map; `e` is `э`).

Find one group by its exact name with `GET /api/v1/groups/lookup?name=A-06m-26`. It returns
a search item, or `404` when no group has that name.
Fetch a normalized schedule for an inclusive date range with:

```text
GET /api/v1/groups/{id}/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/v1/teachers/{id}/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/v1/rooms/{id}/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD
```

The backend owns the upstream RUZ integration, normalization, caching, and rate limiting;
clients should not call `ts.mpei.ru` directly.

## Run locally

Backend:

```sh
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Frontend (in another terminal):

```sh
cd frontend
npm install
npm run dev
```

## Checks

```sh
cd frontend && npm run lint && npm run build
cd backend && pytest && ruff check .
```
