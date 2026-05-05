#!/bin/sh
set -eu

TARGET_FILE="/usr/share/nginx/html/runtime-config.js"

escape_js() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

sanitize_public_url() {
  # Trim, remove accidental inline comments, and accept only URL-like values.
  value="$(printf '%s' "${1:-}" | sed 's/[[:space:]]#.*$//; s/^[[:space:]]*//; s/[[:space:]]*$//')"

  if [ -z "$value" ]; then
    printf ''
    return 0
  fi

  case "$value" in
    http://*|https://*|ws://*|wss://*)
      printf '%s' "$value"
      ;;
    *)
      printf ''
      ;;
  esac
}

PUBLIC_BASE_URL_SANITIZED="$(sanitize_public_url "${PUBLIC_BASE_URL:-}")"
PUBLIC_WEBSOCKET_URL_SANITIZED="$(sanitize_public_url "${PUBLIC_WEBSOCKET_URL:-}")"

# Default websocket endpoint to the public base URL for same-origin deployments.
if [ -z "$PUBLIC_WEBSOCKET_URL_SANITIZED" ]; then
  PUBLIC_WEBSOCKET_URL_SANITIZED="$PUBLIC_BASE_URL_SANITIZED"
fi

PUBLIC_BASE_URL_VALUE="$(escape_js "$PUBLIC_BASE_URL_SANITIZED")"
PUBLIC_WEBSOCKET_URL_VALUE="$(escape_js "$PUBLIC_WEBSOCKET_URL_SANITIZED")"

cat > "$TARGET_FILE" <<EOF
window.__SMART_RETAILX_CONFIG__ = {
  PUBLIC_BASE_URL: "$PUBLIC_BASE_URL_VALUE",
  PUBLIC_WEBSOCKET_URL: "$PUBLIC_WEBSOCKET_URL_VALUE"
};
EOF
