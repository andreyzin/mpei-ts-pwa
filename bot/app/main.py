"""Starts the bot: long polling locally, a webhook when WEBHOOK_BASE_URL is https."""

import asyncio
import logging

import asyncpg
import httpx
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from aiogram.enums import ParseMode
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web

from app.config import Settings, get_settings
from app.handlers import router
from app.schedule_api import ScheduleApi
from app.storage import PostgresGroupRepository

logger = logging.getLogger(__name__)
ALLOWED_UPDATES = ["message", "callback_query", "inline_query"]


def create_bot(settings: Settings) -> Bot:
    session = (
        AiohttpSession(api=TelegramAPIServer.from_base(settings.telegram_api_base))
        if settings.telegram_api_base
        else None
    )
    return Bot(
        settings.telegram_bot_token.get_secret_value(),
        session=session,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )


async def serve_webhook(bot: Bot, dispatcher: Dispatcher, settings: Settings) -> None:
    secret = settings.webhook_secret.get_secret_value() if settings.webhook_secret else None
    await bot.set_webhook(
        settings.webhook_url, secret_token=secret, allowed_updates=ALLOWED_UPDATES
    )
    app = web.Application()
    SimpleRequestHandler(dispatcher=dispatcher, bot=bot, secret_token=secret).register(
        app, path=settings.webhook_path
    )
    setup_application(app, dispatcher, bot=bot)
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", settings.webhook_port).start()
    logger.info("Webhook mode on port %s", settings.webhook_port)
    try:
        await asyncio.Event().wait()
    finally:
        await runner.cleanup()


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    headers = (
        {"X-Internal-Token": settings.internal_api_token.get_secret_value()}
        if settings.internal_api_token
        else {}
    )
    pool = await asyncpg.create_pool(settings.database_url)
    repository = PostgresGroupRepository(pool)
    await repository.create_schema()
    async with httpx.AsyncClient(
        base_url=settings.schedule_api_url, headers=headers, timeout=10
    ) as client:
        dispatcher = Dispatcher(repository=repository, api=ScheduleApi(client), settings=settings)
        dispatcher.include_router(router)
        bot = create_bot(settings)
        try:
            if settings.use_webhook:
                await serve_webhook(bot, dispatcher, settings)
            else:
                # A webhook left from a previous deployment would swallow the updates.
                await bot.delete_webhook()
                logger.info("Long polling mode")
                await dispatcher.start_polling(bot, allowed_updates=ALLOWED_UPDATES)
        finally:
            await bot.session.close()
            await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
