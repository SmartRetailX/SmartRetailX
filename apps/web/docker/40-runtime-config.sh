#!/bin/sh
set -eu

TARGET_FILE="/usr/share/nginx/html/runtime-config.js"

escape_js() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

PUBLIC_BASE_URL_VALUE="$(escape_js "${PUBLIC_BASE_URL:-}")"
PUBLIC_WEBSOCKET_URL_VALUE="$(escape_js "${PUBLIC_WEBSOCKET_URL:-}")"

cat > "$TARGET_FILE" <<EOF
window.__SMART_RETAILX_CONFIG__ = {
  PUBLIC_BASE_URL: "$PUBLIC_BASE_URL_VALUE",
  PUBLIC_WEBSOCKET_URL: "$PUBLIC_WEBSOCKET_URL_VALUE"
};
EOF
