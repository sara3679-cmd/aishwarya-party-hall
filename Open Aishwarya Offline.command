#!/bin/zsh

set -u

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SITE_URL="http://localhost:3010/admin"
HEALTH_URL="http://localhost:3010/"
RUNTIME_DIR="$PROJECT_DIR/.offline-runtime"
LOG_FILE="$RUNTIME_DIR/server.log"
PID_FILE="$RUNTIME_DIR/server.pid"

mkdir -p "$RUNTIME_DIR"
cd "$PROJECT_DIR" || exit 1

if ! command -v npm >/dev/null 2>&1; then
  osascript -e 'display alert "Aishwarya Offline" message "Node.js is not available. Please contact the website administrator." as critical'
  exit 1
fi

if ! curl --silent --fail "$HEALTH_URL" >/dev/null 2>&1; then
  nohup npm run dev -- --host 127.0.0.1 --port 3010 >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"

  ready=0
  for attempt in {1..90}; do
    if curl --silent --fail "$HEALTH_URL" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done

  if [[ "$ready" -ne 1 ]]; then
    osascript -e 'display alert "Aishwarya Offline" message "The offline website could not start. Please share the server log with the website administrator." as critical'
    open "$LOG_FILE"
    exit 1
  fi
fi

open -a "Google Chrome" "$SITE_URL" || open "$SITE_URL"
