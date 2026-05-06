#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python3}"

declare -a PIDS=()

usage() {
  cat <<'EOF'
Usage:
  bash scripts/python-services.sh <install|dev|prod|list> [service|all]

Services:
  agent
  stt
  sinlama
  biml
  promotion
  segmentation

Examples:
  pnpm py:install
  pnpm py:dev:agent
  PYTHON=python3.11 pnpm py:install:biml
  PYTHON_WEB_CONCURRENCY=2 pnpm py:prod:promotion
EOF
}

service_field() {
  local service="$1"
  local field="$2"

  case "$service:$field" in
    agent:dir) printf 'apps/agent-service' ;;
    agent:req) printf 'apps/agent-service/requirements.txt' ;;
    agent:app) printf 'main:app' ;;
    agent:host_env) printf 'AGENT_HTTP_HOST' ;;
    agent:port_env) printf 'AGENT_HTTP_PORT' ;;
    agent:port) printf '8010' ;;
    agent:reload_dir) printf 'agent_service' ;;

    stt:dir) printf 'apps/stt-agent' ;;
    stt:req) printf 'apps/stt-agent/requirements.txt' ;;
    stt:app) printf 'app.main:app' ;;
    stt:host_env) printf 'STT_AGENT_HOST' ;;
    stt:port_env) printf 'STT_AGENT_PORT' ;;
    stt:port) printf '8003' ;;
    stt:reload_dir) printf 'app' ;;

    sinlama:dir) printf 'apps/sinlama-service' ;;
    sinlama:req) printf 'apps/sinlama-service/requirements.txt' ;;
    sinlama:app) printf 'main:app' ;;
    sinlama:host_env) printf 'SINLAMA_HOST' ;;
    sinlama:port_env) printf 'SINLAMA_PORT' ;;
    sinlama:port) printf '8080' ;;
    sinlama:reload_dir) printf 'app' ;;

    biml:dir) printf 'apps/bi-dashboard-ml-service' ;;
    biml:req) printf 'apps/bi-dashboard-ml-service/requirements.txt' ;;
    biml:app) printf 'main:app' ;;
    biml:host_env) printf 'ML_SERVICE_HOST' ;;
    biml:port_env) printf 'ML_SERVICE_PORT' ;;
    biml:port) printf '8000' ;;
    biml:reload_dir) printf '.' ;;

    promotion:dir) printf 'apps/personalized-promotion-engine-ml-service' ;;
    promotion:req) printf 'apps/personalized-promotion-engine-ml-service/requirements.txt' ;;
    promotion:app) printf 'api.main:app' ;;
    promotion:host_env) printf 'PROMOTION_ENGINE_HOST' ;;
    promotion:port_env) printf 'PROMOTION_ENGINE_PORT' ;;
    promotion:port) printf '8001' ;;
    promotion:reload_dir) printf '.' ;;

    segmentation:dir) printf 'apps/segmentation-service' ;;
    segmentation:req) printf 'apps/segmentation-service/src/requirements.txt' ;;
    segmentation:app) printf 'app.main:app' ;;
    segmentation:host_env) printf 'SEGMENTATION_SERVICE_HOST' ;;
    segmentation:port_env) printf 'SEGMENTATION_SERVICE_PORT' ;;
    segmentation:port) printf '8002' ;;
    segmentation:reload_dir) printf 'src/app' ;;

    *) return 1 ;;
  esac
}

all_services() {
  printf '%s\n' agent stt sinlama biml promotion segmentation
}

expand_services() {
  local requested="${1:-all}"

  if [[ "$requested" == "all" ]]; then
    all_services
    return
  fi

  if service_field "$requested" dir >/dev/null 2>&1; then
    printf '%s\n' "$requested"
    return
  fi

  printf 'Unknown Python service: %s\n\n' "$requested" >&2
  usage >&2
  return 1
}

venv_python() {
  local service="$1"
  local dir
  dir="$(service_field "$service" dir)"
  printf '%s/%s/.venv/bin/python\n' "$ROOT_DIR" "$dir"
}

ensure_venv() {
  local service="$1"
  local dir
  local python_path

  dir="$(service_field "$service" dir)"
  python_path="$(venv_python "$service")"

  if [[ ! -x "$python_path" ]]; then
    printf '[%s] creating virtual environment with %s\n' "$service" "$PYTHON_BIN"
    "$PYTHON_BIN" -m venv "$ROOT_DIR/$dir/.venv"
  fi
}

normalize_requirements_if_needed() {
  local service="$1"
  local requirements_path="$2"
  local python_path="$3"

  if [[ "$service" != "segmentation" ]]; then
    printf '%s\n' "$requirements_path"
    return
  fi

  local normalized_path
  normalized_path="$ROOT_DIR/apps/segmentation-service/.venv/requirements.normalized.txt"

  "$python_path" - "$requirements_path" "$normalized_path" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
data = source.read_bytes()

if data[:2] in (b"\xff\xfe", b"\xfe\xff") or b"\x00" in data[:100]:
    text = data.decode("utf-16")
else:
    text = data.decode("utf-8")

target.write_text(text.replace("\r\n", "\n"), encoding="utf-8")
PY

  printf '%s\n' "$normalized_path"
}

install_service() {
  local service="$1"
  local req
  local python_path
  local pip_req

  ensure_venv "$service"
  req="$ROOT_DIR/$(service_field "$service" req)"
  python_path="$(venv_python "$service")"
  pip_req="$(normalize_requirements_if_needed "$service" "$req" "$python_path")"

  printf '[%s] upgrading packaging tools\n' "$service"
  "$python_path" -m pip install --upgrade pip setuptools wheel

  printf '[%s] installing %s\n' "$service" "${pip_req#$ROOT_DIR/}"
  "$python_path" -m pip install -r "$pip_req"
}

service_host() {
  local service="$1"
  local host_env
  host_env="$(service_field "$service" host_env)"
  printf '%s\n' "${!host_env:-0.0.0.0}"
}

service_port() {
  local service="$1"
  local port_env
  port_env="$(service_field "$service" port_env)"
  printf '%s\n' "${!port_env:-$(service_field "$service" port)}"
}

run_service() {
  local mode="$1"
  local service="$2"
  local dir
  local app
  local reload_dir
  local python_path
  local host
  local port
  local -a command

  ensure_venv "$service"

  if ! "$(venv_python "$service")" -c "import uvicorn" >/dev/null 2>&1; then
    printf '[%s] dependencies are missing; installing requirements first\n' "$service"
    install_service "$service"
  fi

  dir="$(service_field "$service" dir)"
  app="$(service_field "$service" app)"
  reload_dir="$(service_field "$service" reload_dir)"
  python_path="$(venv_python "$service")"
  host="$(service_host "$service")"
  port="$(service_port "$service")"

  command=("$python_path" -u -m uvicorn "$app" --host "$host" --port "$port" --log-level "${LOG_LEVEL:-info}")

  if [[ "$mode" == "dev" ]]; then
    command+=(--reload --reload-dir "$reload_dir")
  elif [[ "${PYTHON_WEB_CONCURRENCY:-1}" != "1" ]]; then
    command+=(--workers "$PYTHON_WEB_CONCURRENCY")
  fi

  printf '[%s] starting %s server on %s:%s\n' "$service" "$mode" "$host" "$port"
  cd "$ROOT_DIR/$dir"

  if [[ "$service" == "segmentation" ]]; then
    export PYTHONPATH="$ROOT_DIR/apps/segmentation-service/src:${PYTHONPATH:-}"
  fi

  exec "${command[@]}"
}

cleanup() {
  local exit_code=$?

  if [[ ${#PIDS[@]} -gt 0 ]]; then
    printf '\nStopping Python services...\n'
    kill "${PIDS[@]}" >/dev/null 2>&1 || true
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

run_many() {
  local mode="$1"
  shift

  trap cleanup INT TERM EXIT

  for service in "$@"; do
    (
      run_service "$mode" "$service"
    ) &
    PIDS+=("$!")
  done

  printf 'Python services are running. Press Ctrl+C to stop.\n'
  wait "${PIDS[@]}"
}

main() {
  local action="${1:-}"
  local requested="${2:-all}"
  local -a services=()

  case "$action" in
    install|dev|prod)
      mapfile -t services < <(expand_services "$requested")
      ;;
    list)
      all_services
      return
      ;;
    -h|--help|help|'')
      usage
      return
      ;;
    *)
      printf 'Unknown action: %s\n\n' "$action" >&2
      usage >&2
      return 1
      ;;
  esac

  case "$action" in
    install)
      for service in "${services[@]}"; do
        install_service "$service"
      done
      ;;
    dev|prod)
      if [[ "$requested" == "all" ]]; then
        run_many "$action" "${services[@]}"
      else
        run_service "$action" "${services[0]}"
      fi
      ;;
  esac
}

main "$@"
