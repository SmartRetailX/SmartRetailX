FROM python:3.11-slim

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl ffmpeg libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY apps/segmentation-service/src/requirements.txt /tmp/requirements.txt
RUN python -c "from pathlib import Path; p=Path('/tmp/requirements.txt'); b=p.read_bytes(); p.write_text((b.decode('utf-16') if b[:2] in (b'\\xff\\xfe', b'\\xfe\\xff') or b'\\x00' in b[:100] else b.decode('utf-8')), encoding='utf-8')" \
    && python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY apps/segmentation-service/ /app/

RUN addgroup --system app && adduser --system --ingroup app app \
    && chown -R app:app /app

USER app

WORKDIR /app/src

EXPOSE 8002

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8002"]
