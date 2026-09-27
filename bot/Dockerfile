FROM python:3.12-slim AS development

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements-dev.txt requirements.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .

CMD ["python", "-m", "app.main"]

FROM python:3.12-slim AS production

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app

# Only listened on in webhook mode (WEBHOOK_BASE_URL=https://...).
EXPOSE 8080
CMD ["python", "-m", "app.main"]
