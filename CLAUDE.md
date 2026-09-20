# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Проектные правила кода, архитектуры и визуального стиля — в `AGENTS.md` (корень), `frontend/AGENTS.md`, `backend/AGENTS.md`. Читай их перед изменениями в соответствующей части.

## Команды

```sh
# Всё окружение (frontend :5173 + backend :8000, healthcheck на /health)
docker compose up --build

# Frontend
cd frontend && npm install && npm run dev      # Vite, host 0.0.0.0
npm run lint && npm run build                  # build = tsc -b && vite build
npm run format:check                           # prettier

# Backend
cd backend && pip install -r requirements-dev.txt
uvicorn app.main:app --reload
pytest && ruff check .
pytest tests/test_main.py::test_health         # один тест
```

Фронтенд использует **npm** (`package-lock.json`, `npm install` в `frontend/Dockerfile`) — не переключай на pnpm без явной просьбы. У фронтенда сейчас нет тест-раннера; если задача требует тестов на клиенте, сначала согласуй добавление vitest.

## Архитектура

Монорепозиторий из двух независимых приложений, связанных только HTTP: Vite-dev-server проксирует `/api/*` на backend (`VITE_API_PROXY_TARGET`, по умолчанию `http://127.0.0.1:8000`).

### Backend: обёртка над МЭИ РУЗ

Единственная задача бэкенда — скрыть upstream `ts.mpei.ru` (RUZ) за стабильным нормализованным контрактом. Клиент **никогда** не ходит в РУЗ напрямую. Поток запроса:

`api/v1/public.py` (роутер, rate limit, валидация дат) → `services/public_service.py` (кэш-ключи, пагинация) → `providers/mpei_ruz/client.py` (HTTP к РУЗ, `RuzUpstreamError`) → `providers/mpei_ruz/mapper.py` (сырой JSON → схемы) → `schemas/common.py`.

Ключевые свойства, которые легко сломать:

- **Мэппер толерантен к хаосу upstream.** `_value(row, *keys)` перебирает варианты имён полей (`beginLesson`/`start`/`start_time`, `lecturerOid`/`oid`/`id` и т.п.), потому что РУЗ отдаёт разные формы. Добавляя поле, добавляй все известные алиасы, а не один.
- **`map_schedule` возвращает плотный диапазон дат**: день без пар присутствует с пустым `lessons`. Фронтенд на это рассчитывает.
- **Типы и статусы пар нормализуются** в `LessonType`/`LessonStatus` по вхождению подстроки (русские названия РУЗ), исходная строка сохраняется в `raw_type`.
- `MemoryCache` и `RateLimiter` — процессные синглтоны на уровне модуля `public.py`. Это осознанно (одна реплика); при масштабировании нужен внешний стор.
- Ошибки upstream превращаются в `502 Schedule provider unavailable`; наружу не уходят детали РУЗ. Диапазон дат ограничен 0..31 днём.
- Настройки — только через `Settings` (`app/config.py`, `get_settings()` с `lru_cache`), не через `os.environ` по коду.
- `SchedulePeriod` сериализуется с алиасом `from` (`by_alias=True` в сервисе) — ключ в JSON именно `from`, не `from_`.

### Frontend: offline-first PWA

Приложение обязано быть полезным без сети. Три слоя кэша работают вместе:

1. `PersistQueryClientProvider` + `createAsyncStoragePersister` (localStorage) в `src/main.tsx` — кэш React Query переживает перезагрузку; `networkMode: 'offlineFirst'`, `gcTime` 14 дней.
2. `vite-plugin-pwa` / Workbox в `vite.config.ts` — `NetworkFirst` для `/api/v1/*/schedule`, `navigateFallback` на `index.html`.
3. `useScheduleWeeks` грузит видимую неделю **вместе с обеими соседними** — навигация по дням не ходит в сеть, переход через границу недели уже в кэше.

Меняя ключи запросов, URL расписания или стратегию кэширования, проверяй все три слоя разом.

**Неделя — единица загрузки.** `useScheduleWeeks(target, mondayIso)` (`src/hooks/useScheduleWeeks.ts`) — основной хук экрана расписания: ключ `['schedule', type, id, mondayIso]`, `placeholderData` возвращает предыдущие данные, поэтому при смене недели экран не схлопывается в загрузку. Десктоп и мобилка используют один и тот же запрос, мобилка лишь выбирает из него день. `useSchedule` (произвольный диапазон) остался только для `Highlights`, которому нужен горизонт в 31 день.

Остальная структура:

- `src/domain/localDataStore.ts` — единственная точка доступа к пользовательским данным (выбранная группа, скрытые предметы, заметки, тема). Интерфейс намеренно асинхронный, чтобы позже заменить localStorage на серверный репозиторий; ключ версионирован (`mpei-schedule:local-data:v1`) — при смене формы данных меняй версию и поддержи миграцию в `read()`.
- `src/domain/weekMath.ts` — вся арифметика дат. Считает по **локальному** календарю; `toISOString().slice(0,10)` в этом проекте баг, он сдвигает дату вечером по Москве. `src/domain/dateFormat.ts` — только строки для UI.
- `src/domain/lessonVisibility.ts` — единственная реализация правил «скрытый предмет / предмет в аудитории». Не дублируй фильтрацию в компонентах.
- `src/domain/scheduleUrl.ts` — чтение и запись URL-контракта. **Параметры `?group=|person=|aud=` и `?date=DD-MM-YYYY` совместимы со ссылками РУЗ, не переименовывай их.**
- `src/api/*` — только fetch и типы ответов; никакой бизнес-логики.
- `src/App.tsx` — владелец состояния: выбранная цель (`ScheduleTarget`), `selectedDate`, исключённые предметы, активный экран, выбранная пара. Мобилка (`max-width: 700px`) показывает один день, десктоп — неделю от `mondayOf(selectedDate)`.
- Тема применяется как `document.documentElement.dataset.theme` (`system|light|dark`); все цвета — CSS-переменные в `src/index.css` (`--surface`, `--line`, `--muted`, `--accent`, `--danger`, `--warning`). Не хардкодь цвета в компонентах.

### Движение

Параметры анимаций живут в `src/lib/motion.ts` (`snapSpring`, `sheetSpring`, `fadeTransition`, варианты экранов и списка пар), длительности/easing для CSS — токенами в `:root`. Не разбрасывай магические числа пружин по компонентам.

`DayTrack` (`src/components/schedule/DayTrack.tsx`) — мобильная лента дней: предыдущий/текущий/следующий день лежат в DOM рядом, `drag="x"` тянет полотно, отпускание снапит по расстоянию или скорости. Смена даты извне (стрелки, полоса дат, date picker) проходит через тот же трек, поэтому едет так же, как свайп. Ключевой момент: смещение `x` и новая дата должны применяться в одном кадре — за это отвечает `moveTrackTo` с `flushSync`, иначе панели один раз отрисуются не на своём месте.

Всё движение обязано уважать `useReducedMotion`; глобальный `@media (prefers-reduced-motion: reduce)` в `index.css` гасит CSS-переходы, но JS-анимации motion нужно отключать явно.

## Текущая работа

`TASKS.md` содержит бэклог локальных уведомлений о парах (планировщик, разрешения, часовые пояса, iOS). Сверяйся с ним, прежде чем проектировать смежную функциональность.
