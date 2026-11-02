#!/usr/bin/env bash
# On-box updater for the dev/native instance. Fast-forward to the deployed
# commit, refresh deps, swap in the client bundle CI built, and
# cold-restart the service.
#
# Run as the `saxonberg` user (the service owner). The systemctl restart
# needs a sudoers rule allowing it without a password, e.g.:
#   saxonberg ALL=(root) NOPASSWD: /usr/bin/systemctl restart saxonberg
#
# `--ff-only` is deliberate: once authoring edits the tree live (GitApi),
# this refuses to clobber local work and surfaces the conflict instead.
# A cold restart drops the in-memory world + live connections; in-game
# `reload` is the warm path for individual blueprints (no restart).
#
# ⛔ This box never builds the client. It has ~2 GiB RAM and the game is
# running beside the build: on 2026-11-01 `vite build` with a 2 GB heap
# spilled into swap, thrashed for two hours, and wedged the instance until
# a reboot ~22 hours later. CI builds the bundle (the runner has the
# memory) and ships it to packages/client/dist.incoming before running
# this script; a missing bundle stops the deploy rather than building here.
set -euo pipefail
ROOT="${SAXONBERG_ROOT:-/srv/saxonberg}"
cd "$ROOT"

# The commit CI built the bundle from; a hand run with no DEPLOY_SHA takes
# whatever origin has for the checked-out branch.
UPSTREAM='@{upstream}'
TARGET="${DEPLOY_SHA:-$UPSTREAM}"
echo "==> fast-forward to $TARGET"
git fetch --quiet origin
git merge --ff-only "$TARGET"

echo "==> pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

echo "==> build types"
pnpm --filter @saxonberg/types build

echo "==> client bundle (built in CI)"
CLIENT="packages/client"
if [ ! -f "$CLIENT/dist.incoming/index.html" ]; then
  echo "!! no client bundle at $CLIENT/dist.incoming — CI ships it;" >&2
  echo "!! this box never builds the client (see the header)." >&2
  exit 1
fi
rm -rf "$CLIENT/dist.previous"
if [ -d "$CLIENT/dist" ]; then mv "$CLIENT/dist" "$CLIENT/dist.previous"; fi
mv "$CLIENT/dist.incoming" "$CLIENT/dist"

echo "==> restart saxonberg"
sudo systemctl restart saxonberg

echo "==> done"
