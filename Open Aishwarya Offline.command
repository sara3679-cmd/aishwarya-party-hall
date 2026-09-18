#!/bin/zsh
set -u

# Resolve the Desktop symlink before locating the project.
PROJECT_DIR="${0:A:h}"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
SITE_URL="http://localhost:3010/"
RUNTIME_DIR="$PROJECT_DIR/.offline-runtime"
LOG_FILE="$RUNTIME_DIR/server.log"
PID_FILE="$RUNTIME_DIR/server.pid"

fail() {
  print -u2 -- "$1"
  print -u2 -- "Server log: $LOG_FILE"
  printf '\nPress Return to close this window. '
  read -r reply
  exit 1
}

cd "$PROJECT_DIR" || exit 1
mkdir -p "$RUNTIME_DIR" || exit 1
command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 || fail 'Node.js is missing. Please reinstall Node.js.'
[[ -x node_modules/.bin/vinext ]] || fail 'The website packages are missing. Run npm ci in the Party Hall folder to restore them.'

healthy() {
  curl --noproxy '*' --silent --fail --connect-timeout 2 --max-time 5 "$SITE_URL" >/dev/null 2>&1
}

if ! healthy; then
  if lsof -nP -iTCP:3010 -sTCP:LISTEN >/dev/null 2>&1; then
    fail 'Port 3010 is already in use, but the website is not responding. Please check the existing server.'
  fi
  print -- 'Starting Aishwarya Party Hall…'
  nohup npm run dev -- --host 127.0.0.1 --port 3010 --strictPort >"$LOG_FILE" 2>&1 < /dev/null &
  server_pid=$!
  print -- "$server_pid" > "$PID_FILE"
  ready=0
  for attempt in {1..90}; do
    if healthy; then
      ready=1
      break
    fi
    kill -0 "$server_pid" 2>/dev/null || break
    sleep 1
  done
  if [[ "$ready" -ne 1 ]]; then
    tail -30 "$LOG_FILE"
    fail 'The website could not start. Please check the server log shown above.'
  fi
fi

open -a 'Google Chrome' "$SITE_URL" || fail 'The website is running, but Google Chrome could not open.'
print -- "Aishwarya Party Hall is ready at $SITE_URL"
