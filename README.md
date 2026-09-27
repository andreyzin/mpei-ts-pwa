# Vite + FastAPI monorepo

The repository contains independent applications connected by Docker Compose:

- `frontend/` — React, TypeScript, and Vite
- `backend/` — Python and FastAPI
- `bot/` — Telegram bot on aiogram, a client of the backend API

## Run with Docker

```sh
docker compose up --build
```

Open <http://localhost:5173>. Optional services start with a profile; copy `.env.example`
to `.env` first:

```sh
docker compose --profile bot up --build        # + Telegram bot and Postgres
docker compose --profile analytics up --build  # + Umami on :3000 and Postgres
```

The frontend proxies `/api/*` requests to the backend. Backend API docs are available at <http://localhost:8000/docs>.

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

Send a feature suggestion to the maintainers' Telegram chat with
`POST /api/v1/suggestions` and a body `{"text": "3..2000 chars", "contact": "optional"}`.
It answers `202`, or `422` for an invalid body, `429` after `SUGGESTIONS_PER_HOUR` (5) from
one address, `503` when `TELEGRAM_BOT_TOKEN` or `SUGGESTIONS_CHAT_ID` is not set and `502`
when Telegram does not accept the message.

The backend reads its settings from environment variables named like the fields of
`app/config.py` (`RUZ_BASE_URL`, `CACHE_TTL_SECONDS`, `RATE_LIMIT_PER_MINUTE`, ...).
Requests with `X-Internal-Token: $INTERNAL_API_TOKEN` skip the per-address rate limit; the
Telegram bot uses it, because one bot address stands for all of its users.

The backend owns the upstream RUZ integration, normalization, caching, and rate limiting;
clients should not call `ts.mpei.ru` directly.

## Share links

`/<group>` and `/<group>/<date>` open a group's schedule on a day, e.g. `/А-06м-26/2-9`.
The group may be spelled in Latin (`/A-06m-26`). The date is `d-m`, `d-m-yy` or `d-m-yyyy`
(`2-9`, `02-09-26` and `02-09-2026` are all 2 September); without a year it is the current
one, without a date it is today in Moscow.

Messengers do not run the app, so these paths go to the backend as `/share/<group>/<date>`.
It answers with an HTML page whose Open Graph title is the group and the day, whose
description lists that day's lessons and whose image is
`GET /api/v1/share/<group>/<dd-mm-yyyy>.png`, a 1200×630 picture of the day. Then it sends
people on to `/?group=<id>&date=<dd-mm-yyyy>`. An unknown group or an invalid date is `404`,
an unavailable RUZ is `502`.

`og:image` must be an absolute URL, so the backend takes the host from `X-Forwarded-Host`
(or `Host`) and the scheme from `X-Forwarded-Proto`. The picture uses Golos Text, bundled in
`backend/app/assets/fonts` under the SIL Open Font License.

The Vite dev server proxies them already. In production the proxy in front of the frontend
needs the same rule; with nginx:

```nginx
location ~ "^/[^/.@_]*[0-9][^/.]*(/[^/.]+)?$" {
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://backend:8000/share$request_uri;
}
```

The installed PWA opens these links itself: its service worker serves the app, which reads
the path and resolves the group with `/api/v1/groups/lookup`.

## Telegram bot

In a private chat the bot asks for a group (Latin spelling works; near misses offer buttons)
and keeps it in Postgres. Then `@<bot>` in any chat lists the coming seven days of that group;
choosing one posts its lessons with a link to the share page. `@<bot> Э-01-24` shows another
group without changing the saved one.

The bot calls only our backend (`SCHEDULE_API_URL`) and sends `INTERNAL_API_TOKEN` to skip its
rate limit. It uses long polling unless `WEBHOOK_BASE_URL` is `https://...`; then it registers a
webhook at `$WEBHOOK_BASE_URL/telegram/webhook`, checks `WEBHOOK_SECRET` and listens on `:8080`.
`TELEGRAM_API_BASE` points it, and the backend, at a local Bot API server. Inline mode has to be
enabled for the bot in @BotFather (`/setinline`).

## Analytics

Umami is self-hosted (`--profile analytics`, <http://localhost:3000>; sign in with Umami's
default admin account from its documentation and change the password). Add the site in its dashboard and put the website id into
`VITE_UMAMI_WEBSITE_ID`. The app loads the tracker only after the person allows it in the
consent banner; the choice can be changed in settings. Without `VITE_UMAMI_SCRIPT_URL` and
`VITE_UMAMI_WEBSITE_ID` there is no banner and no tracker. For the production image pass
them as build arguments; CI takes them from the `UMAMI_SCRIPT_URL` and `UMAMI_WEBSITE_ID`
repository variables.

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
cd bot && pytest && ruff check .   # TEST_DATABASE_URL=postgresql://... adds the Postgres test
```
