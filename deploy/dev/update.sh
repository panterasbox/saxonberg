#!/usr/bin/env bash
# On-box updater for the dev/native instance. Pull the latest code,
# refresh deps + the client build, and cold-restart the service.
#
# Run as the `saxonberg` user (the service owner). The systemctl restart
# needs a sudoers rule allowing it without a password, e.g.:
#   saxonberg ALL=(root) NOPASSWD: /usr/bin/systemctl restart saxonberg
#
# `--ff-only` is deliberate: once authoring edits the tree live (GitApi),
# this refuses to clobber local work and surfaces the conflict instead.
# A cold restart drops the in-memory world + live connections; in-game
# `reload` is the warm path for individual blueprints (no restart).
set -euo pipefail
ROOT="${SAXONBERG_ROOT:-/srv/saxonberg}"
cd "$ROOT"

echo "==> git pull --ff-only"
git pull --ff-only

echo "==> pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

echo "==> build types + client"
pnpm --filter @saxonberg/types build
pnpm --filter @saxonberg/client build

echo "==> restart saxonberg"
sudo systemctl restart saxonberg

echo "==> done"
