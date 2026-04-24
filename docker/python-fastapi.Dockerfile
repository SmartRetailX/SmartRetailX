ARG PYTHON_VERSION=3.11

FROM python:${PYTHON_VERSION}-slim AS runtime

ARG APP_DIR
ARG APP_MODULE=main:app
ARG APP_PORT=8000
ARG APP_WORKDIR=/app
ARG REQUIREMENTS_FILE=requirements.txt

ENV APP_MODULE=${APP_MODULE} \
    APP_PORT=${APP_PORT} \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl ffmpeg libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY ${APP_DIR}/${REQUIREMENTS_FILE} /tmp/requirements.txt

RUN python -c "from pathlib import Path; p=Path('/tmp/requirements.txt'); b=p.read_bytes(); p.write_text((b.decode('utf-16') if b[:2] in (b'\xff\xfe', b'\xfe\xff') or b'\x00' in b[:100] else b.decode('utf-8')), encoding='utf-8')" \
    && python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY ${APP_DIR}/ /app/

WORKDIR ${APP_WORKDIR}

EXPOSE ${APP_PORT}

CMD ["sh", "-c", "uvicorn ${APP_MODULE} --host 0.0.0.0 --port ${APP_PORT}"]
