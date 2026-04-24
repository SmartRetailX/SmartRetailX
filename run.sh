#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

declare -a PIDS=()
declare -A BUILDER_PIDS=()
LAST_STARTED_PID=""
DB_INITIALIZED=false

usage() {
  cat <<'EOF'
Usage:
  ./run.sh <service> [service...]

Supported services:
  api-gateway
  core-service
  websocket-service
  websocket
  web
  all

Examples:
  ./run.sh api-gateway core-service websocket
  ./run.sh web api-gateway
  ./run.sh all
EOF
}

normalize_service() {
  case "$1" in
    api-gateway|core-service|websocket-service|web)
      printf '%s\n' "$1"
      ;;
    websocket)
      printf 'websocket-service\n'
      ;;
    all)
      printf 'api-gateway\ncore-service\nwebsocket-service\nweb\n'
      ;;
    *)
      return 1
      ;;
  esac
}

cleanup() {
  local exit_code=$?

  if [[ ${#PIDS[@]} -gt 0 ]]; then
    printf '\nStopping services...\n'
    for pid in "${PIDS[@]}"; do
      kill "$pid" >/dev/null 2>&1 || true
    done
    wait "${PIDS[@]}" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}

start_prefixed_process() {
  local label="$1"
  shift

  (
    export FORCE_COLOR=1
    export CLICOLOR_FORCE=1
    export NX_NO_CLOUD=true
    export NX_CLOUD=false
    unset NO_COLOR

    if command -v script >/dev/null 2>&1; then
      exec script -qefc "$*" /dev/null
    else
      exec bash -lc "$*"
    fi
  ) \
    > >(perl -pe 'BEGIN { $| = 1 } s/\r\n/\n/g; s/\r/\n/g;' | sed -u "s/^/[$label] /") \
    2> >(perl -pe 'BEGIN { $| = 1 } s/\r\n/\n/g; s/\r/\n/g;' | sed -u "s/^/[$label] /" >&2) &

  PIDS+=("$!")
  LAST_STARTED_PID="$!"
}

wait_for_file() {
  local service="$1"
  local file_path="$2"
  local timeout_seconds="${3:-60}"
  local waited=0

  while [[ ! -f "$file_path" ]]; do
    sleep 1
    waited=$((waited + 1))

    if [[ -n "${BUILDER_PIDS[$service]:-}" ]] && ! kill -0 "${BUILDER_PIDS[$service]}" >/dev/null 2>&1; then
      printf '[%s] build process exited before %s was created\n' "$service" "$file_path" >&2
      return 1
    fi

    if (( waited >= timeout_seconds )); then
      printf '[%s] timed out waiting for %s\n' "$service" "$file_path" >&2
      return 1
    fi
  done
}

start_backend_service() {
  local service="$1"
  local app_dir="$2"
  local output_file="$3"

  rm -f "$ROOT_DIR/$output_file"

  printf 'Starting %s build watcher\n' "$service"
  start_prefixed_process \
    "$service" \
    "cd '$ROOT_DIR' && exec pnpm nx run $service:build:development --watch"
  BUILDER_PIDS["$service"]="$LAST_STARTED_PID"

  wait_for_file "$service" "$ROOT_DIR/$output_file"

  printf 'Starting %s runtime watcher\n' "$service"
  start_prefixed_process \
    "$service" \
    "cd '$ROOT_DIR' && exec node --watch '$ROOT_DIR/$output_file'"
}

start_service() {
  case "$1" in
    api-gateway)
      start_backend_service "api-gateway" "apps/api-gateway" "dist/apps/api-gateway/main.js"
      ;;
    core-service)
      start_backend_service "core-service" "apps/core-service" "dist/apps/core-service/main.js"
      ;;
    websocket-service)
      start_backend_service "websocket-service" "apps/websocket-service" "dist/apps/websocket-service/main.js"
      ;;
    web)
      printf 'Starting web dev server\n'
      start_prefixed_process "web" "cd '$ROOT_DIR/apps/web' && exec pnpm exec rsbuild dev"
      ;;
  esac
}

ensure_database_is_ready() {
  if [[ "$DB_INITIALIZED" == true ]]; then
    return
  fi

  printf 'Bootstrapping database schemas from Prisma definitions\n'
  pnpm db:init
  DB_INITIALIZED=true
}

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

case "${1:-}" in
  -h|--help|help)
    usage
    exit 0
    ;;
esac

declare -A seen=()
declare -a services=()

for raw_service in "$@"; do
  matched=false

  while IFS= read -r normalized; do
    if [[ -z "$normalized" ]]; then
      continue
    fi

    matched=true

    if [[ -z "${seen[$normalized]:-}" ]]; then
      services+=("$normalized")
      seen["$normalized"]=1
    fi
  done < <(normalize_service "$raw_service" || true)

  if [[ "$matched" == false ]]; then
    printf 'Unknown service: %s\n\n' "$raw_service" >&2
    usage >&2
    exit 1
  fi
done

trap cleanup INT TERM EXIT

printf 'Launching services: %s\n' "${services[*]}"

for service in "${services[@]}"; do
  case "$service" in
    api-gateway|core-service)
      ensure_database_is_ready
      break
      ;;
  esac
done

for service in "${services[@]}"; do
  start_service "$service"
done

printf 'Hot reload is enabled. Press Ctrl+C to stop all services.\n'

wait "${PIDS[@]}"
