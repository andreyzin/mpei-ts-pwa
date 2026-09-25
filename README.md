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

## Share links

`/<group>` and `/<group>/<date>` open a group's schedule on a day, e.g. `/А-06м-26/2-9`.
The group may be spelled in Latin (`/A-06m-26`). The date is `d-m`, `d-m-yy` or `d-m-yyyy`
(`2-9`, `02-09-26` and `02-09-2026` are all 2 September); without a year it is the current
one, without a date it is today in Moscow.

Messengers do not run the app, so these paths go to the backend as `/share/<group>/<date>`.
It answers with an HTML page whose Open Graph title is the group and the day and whose
description lists that day's lessons, then sends people on to `/?group=<id>&date=<dd-mm-yyyy>`.
An unknown group or an invalid date is `404`, an unavailable RUZ is `502`.

The Vite dev server proxies them already. In production the proxy in front of the frontend
needs the same rule; with nginx:

```nginx
location ~ "^/[^/.@_]*[0-9][^/.]*(/[^/.]+)?$" {
    proxy_pass http://backend:8000/share$request_uri;
}
```

The installed PWA opens these links itself: its service worker serves the app, which reads
the path and resolves the group with `/api/v1/groups/lookup`.

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
