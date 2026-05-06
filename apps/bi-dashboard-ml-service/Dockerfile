FROM python:3.11-slim

WORKDIR /app

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories
RUN mkdir -p models data

RUN addgroup --system app && adduser --system --ingroup app app \
    && chown -R app:app /app

USER app

# Expose port
EXPOSE 8000

# Run the application without dev reload in production.
CMD ["sh", "-c", "uvicorn main:app --host ${ML_SERVICE_HOST:-0.0.0.0} --port ${ML_SERVICE_PORT:-8000}"]
