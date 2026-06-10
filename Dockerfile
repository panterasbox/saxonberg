# syntax=docker/dockerfile:1
#
# Saxonberg server image.
#
# The server runs from TypeScript *source* via tsx, not a compiled
# dist: the call-security loader hook stamps every mud/ module at load
# time, and the codebase uses extensionless relative imports that only
# tsx/Vitest resolve (plain Node ESM rejects them). The designed
# production entry is `tsx src/preload.js` — see docs/deployment.md.
#
# The client is built here and baked in; the server serves it from its
# own origin via CLIENT_DIST. One container serves everything, so Caddy
# on the box stays a dumb TLS reverse proxy.

FROM node:22-slim

# The e2e workspace package is part of the install graph, but its
# Playwright browsers are never used at runtime — skip the ~400 MB pull.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10

WORKDIR /app

# Install dependencies first, cached on the lockfile + manifests so a
# source-only change doesn't re-run install.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json packages/types/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY e2e/package.json e2e/
RUN pnpm install --frozen-lockfile

# Copy the rest of the sources, then build the type package and client.
# (The server itself is not compiled — it runs from source via tsx.)
COPY . .
RUN pnpm --filter @saxonberg/types build \
  && pnpm --filter @saxonberg/client build

ENV NODE_ENV=production
ENV PORT=2010
# The server serves the built client bundle from its own origin.
ENV CLIENT_DIST=/app/packages/client/dist

EXPOSE 2010

# Liveness via the dedicated probe route. node:slim ships no curl/wget,
# so use Node's global fetch.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:2010/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "--filter", "@saxonberg/server", "start"]
