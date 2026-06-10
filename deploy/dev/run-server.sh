#!/usr/bin/env bash
# systemd ExecStart wrapper for the dev/native instance. Runs the server
# from the live git checkout via tsx (the designed production entry —
# `tsx src/preload.js`; see docs/deployment.md). A wrapper rather than an
# inline ExecStart so pnpm resolves through a normal PATH.
set -euo pipefail
cd "${SAXONBERG_ROOT:-/srv/saxonberg}"
exec pnpm --filter @saxonberg/server start
