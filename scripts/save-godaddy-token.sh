#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
printf 'Paste the NEW GoDaddy token, then press Enter (the token will stay hidden): '
IFS= read -r -s godaddy_private_token
printf '\n'

if [[ "$godaddy_private_token" != gd_pat_* ]] || [[ ${#godaddy_private_token} -lt 30 ]]; then
  printf 'The token format is not valid. Nothing was saved.\n' >&2
  exit 1
fi

umask 077
printf 'GODADDY_PAT=%s\nGODADDY_APP_ID=s9rxiphgty\n' "$godaddy_private_token" > .env.godaddy.local
unset godaddy_private_token
printf 'Token saved privately in .env.godaddy.local.\n'
