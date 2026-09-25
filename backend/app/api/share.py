"""HTML for `/<group>/<date>` links: Open Graph tags for messengers, then the app.

The frontend proxy sends these paths here with a `/share` prefix. Crawlers read
the tags and do not run scripts; people are sent on to the app's `?group=&date=`
URL. An installed PWA never gets here, its service worker opens the app itself.
"""

import json
import re
from html import escape

from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse

from app.api.v1.public import Service, check_limit
from app.providers.mpei_ruz.client import RuzUpstreamError
from app.services.share_image import HEIGHT, WIDTH
from app.services.share_preview import (
    SharePreview,
    SharePreviewNotFound,
    describe_day,
    load_shared_day,
    moscow_today,
)

router = APIRouter(include_in_schema=False)

_SITE_NAME = "Расписание МЭИ"
_HOST = re.compile(r"[A-Za-z0-9.-]+(:\d+)?")


def _public_origin(request: Request) -> str | None:
    """Where the page was opened; Open Graph wants absolute image URLs.

    Behind a proxy that is X-Forwarded-Host/Proto. A host that is not a plain
    name is dropped rather than written into the page.
    """
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    host = host.split(",")[0].strip()
    if not _HOST.fullmatch(host):
        return None
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme).split(",")[0].strip()
    return f"{'https' if scheme == 'https' else 'http'}://{host}"


def _image_tags(preview: SharePreview, origin: str | None) -> str:
    if preview.image_path is None or origin is None:
        return '<meta name="twitter:card" content="summary" />'
    image_url = escape(origin + preview.image_path)
    return f"""<meta property="og:image" content="{image_url}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="{WIDTH}" />
    <meta property="og:image:height" content="{HEIGHT}" />
    <meta property="og:image:alt" content="{escape(preview.title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="{image_url}" />"""


def _page(preview: SharePreview, origin: str | None, status_code: int = 200) -> HTMLResponse:
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
    {_image_tags(preview, origin)}
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
    origin = _public_origin(request)
    today = moscow_today()
    try:
        shared = await load_shared_day(service, group, day, today)
    except SharePreviewNotFound:
        return _page(SharePreview(_SITE_NAME, "Группа или дата не найдены", "/"), origin, 404)
    except RuzUpstreamError:
        return _page(SharePreview(_SITE_NAME, "Расписание временно недоступно", "/"), origin, 502)
    return _page(describe_day(shared, today), origin)


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
