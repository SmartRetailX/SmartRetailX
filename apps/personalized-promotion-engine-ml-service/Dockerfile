FROM python:3.11-slim

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl ffmpeg libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY apps/personalized-promotion-engine-ml-service/requirements.txt /tmp/requirements.txt
RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY apps/personalized-promotion-engine-ml-service/ /app/

RUN addgroup --system app && adduser --system --ingroup app app \
    && chown -R app:app /app

USER app

EXPOSE 8001

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port 8001"]
