"""HTML for `/<group>/<date>` links: Open Graph tags for messengers, then the app.

The frontend proxy sends these paths here with a `/share` prefix. Crawlers read
the tags and do not run scripts; people are sent on to the app's `?group=&date=`
URL. An installed PWA never gets here, its service worker opens the app itself.
"""

import json
from html import escape

from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse

from app.api.v1.public import Service, check_limit
from app.providers.mpei_ruz.client import RuzUpstreamError
from app.services.share_preview import (
    SharePreview,
    SharePreviewNotFound,
    build_share_preview,
    moscow_today,
)

router = APIRouter(include_in_schema=False)

_SITE_NAME = "Расписание МЭИ"


def _page(preview: SharePreview, status_code: int = 200) -> HTMLResponse:
    title = escape(preview.title)
    description = escape(preview.description).replace("\n", "&#10;")
    app_url = escape(preview.app_url)
    # json.dumps makes a JS string; the escape keeps `</script>` out of it.
    redirect = json.dumps(preview.app_url).replace("<", "\\u003c")
    body = f"""<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content="{description}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:site_name" content="{_SITE_NAME}" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{description}" />
    <meta name="twitter:card" content="summary" />
    <script>location.replace({redirect})</script>
  </head>
  <body>
    <p><a href="{app_url}">Открыть расписание</a></p>
  </body>
</html>
"""
    return HTMLResponse(body, status_code=status_code)


async def _share(
    group: str, day: str | None, request: Request, response: Response, service: Service
) -> HTMLResponse:
    check_limit(request, response)
    try:
        preview = await build_share_preview(service, group, day, moscow_today())
    except SharePreviewNotFound:
        return _page(SharePreview(_SITE_NAME, "Группа или дата не найдены", "/"), 404)
    except RuzUpstreamError:
        return _page(SharePreview(_SITE_NAME, "Расписание временно недоступно", "/"), 502)
    return _page(preview)


@router.get("/share/{group}", response_class=HTMLResponse)
async def share_today(
    group: str, request: Request, response: Response, service: Service
) -> HTMLResponse:
    return await _share(group, None, request, response, service)


@router.get("/share/{group}/{day}", response_class=HTMLResponse)
async def share_day(
    group: str, day: str, request: Request, response: Response, service: Service
) -> HTMLResponse:
    return await _share(group, day, request, response, service)
