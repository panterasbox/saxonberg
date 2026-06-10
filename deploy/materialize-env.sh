#!/usr/bin/env bash
# Render an env file from SSM Parameter Store: the shared /saxonberg/default
# tree first, then the per-environment overlay (env wins, last write).
# Keys are flat env-var names (MONGODB_URI, SESSION_SECRET, GOOGLE_*, …).
#
# Run where AWS creds exist — CI or a trusted machine — NOT on the box:
# Lightsail has no IAM instance role, so we keep AWS off the box and scp
# the result in (Option A; see docs/deployment.md § Configuration).
#
# Usage:  materialize-env.sh <env-name> [out-file]
#   ./deploy/materialize-env.sh dev        out.env   # dev instance
#   ./deploy/materialize-env.sh production  out.env   # prod instance
# then:  scp out.env <user>@<box>:/srv/saxonberg/.env
set -euo pipefail
ENV_NAME="${1:-${DEPLOY_ENV:-production}}"
OUT="${2:-${ENV_NAME}.env}"

: > "$OUT"
for tree in "/saxonberg/default" "/saxonberg/${ENV_NAME}"; do
  aws ssm get-parameters-by-path --path "$tree" --recursive --with-decryption \
    --query 'Parameters[].[Name,Value]' --output text \
  | while IFS="$(printf '\t')" read -r name value; do
      [ -n "$name" ] && echo "$(basename "$name")=${value}" >> "$OUT"
    done
done

echo "wrote ${OUT} ($(grep -c '=' "$OUT" || true) keys) for env '${ENV_NAME}'"
