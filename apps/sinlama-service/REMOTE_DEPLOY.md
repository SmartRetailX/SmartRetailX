# sinLama Service Remote Deployment

## 0) Run from repo root (no `cd`)
```bash
docker compose -f docker-compose.sinlama.yml up -d --build
docker compose -f docker-compose.sinlama.yml ps
```

## 1) Build image on target server
```bash
cd apps/sinlama-service
docker build -f Dockerfile.remote -t sinlama-service:latest .
```

## 2) Run container
```bash
docker run -d \
  --name sinlama-service \
  -p 8080:8080 \
  -e SINLAMA_HOST=0.0.0.0 \
  -e SINLAMA_PORT=8080 \
  --restart unless-stopped \
  sinlama-service:latest
```

## 3) Verify service
```bash
curl http://<SERVER_IP>:8080/health
curl -X POST http://<SERVER_IP>:8080/api/v1/intent \
  -H 'content-type: application/json' \
  -d '{
    "text":"මට milk price එක කියන්න",
    "language":"si-LK",
    "sessionId":"s1",
    "allowedIntents":["offers","order_history","buying_suggestions","prices","product_search","general"]
  }'
```

## 4) Point agent-service to remote server
Set in `agent-service` env:
```env
SINLLAMA_BASE_URL=http://<SERVER_IP>:8080
SINLLAMA_INTENT_PATH=/api/v1/intent
SINLLAMA_TIMEOUT_MS=8000
SINLLAMA_RETRY_COUNT=1
SINLLAMA_API_KEY=
```

## About automatic downloads
- Dependencies: yes. `pip install -r requirements.txt` runs during `docker build`.
- Model weights: no in current implementation. This service currently uses rule-based intent scoring + XAI-like feature output, not a downloaded large `sinLlama` model.
- If you want true large-model inference, we need a follow-up change to add model runtime (`transformers`/`vLLM`/GGUF runtime) and model download configuration.
