# Phase 1 — Server Spec: Broadcast Auth + StreamState Feed

> **Scope:** make the standby countdown *real* — the smallest end-to-end proof of
> the overlay↔saxonberg integration (auth + feed + StreamState). All changes are
> in `~/play/saxonberg/master` and **require owner approval** before implementation.
> Read `../PLAN.md` first (esp. §4) for the why.

**Goal:** the pbox-stream standby overlay's countdown is driven by saxonberg's
`StreamState.awayUntil` over WebSocket, instead of the `?until=` demo param.

---

## Components

### 1. Broadcast auth (read-only `service:broadcast` principal)

A prod-safe, **separate** path from the `AUTH_MODE=test` bypass (which stays dead
in prod).

- **Config:** `BROADCAST_TOKEN` (prod secret). The broadcast path is enabled iff
  it's set and non-trivial; log a warning on boot when enabled. Refuse empty/weak
  tokens.
- **Hook:** `packages/server/src/services/websocket/WebSocketService.ts` →
  `handleUpgrade`. **Before** the `session.passport.user.id` check, look for a
  token in the **WS URL query** (`/ws?broadcast=<token>`). Browsers (OBS browser
  source) can't set WS headers, so query param (or subprotocol) — not
  `Authorization`. If it matches `BROADCAST_TOKEN`, accept the upgrade as the
  broadcast principal; otherwise fall through to normal session auth.
- **Principal:** propagate a marker through
  `Backend.handleWebSocketConnect(ws, userId, sessionId)` — e.g. a sentinel
  `userId = 'service:broadcast'` plus an `isBroadcast`/`readOnly` flag. Its
  `Interactive` has **no Avatar and no `CommandGiver`** → `executeCommand` is
  auto-rejected; MQL subscribe / feed reads are allowed.
- **Security:** token in query is acceptable here — grants only public read-only
  data, and the OBS source URL is private to the streamer. Rotate via secrets.
  The principal must **never** be routed DMs or private channels (safe by
  construction — see the feed below; we don't tap them).

### 2. `StreamState`

Session-wide singleton holding overlay state. **Phase-1 minimal fields:**

```ts
interface StreamState {
  mode: 'live' | 'standby';
  awayUntil: number | null; // epoch ms; null when live
}
```

(Later: active scene, lower-third text, camera focus, alert queue.)

- **Open:** model as a singleton Idea (engine-native, gets EventApi change
  events for free) vs a lightweight service-level doc. Lean: singleton Idea, so
  the feed can hang off existing change events.

### 3. `BroadcastFeed`

Server projection that serves broadcast connections.

- On connect: send a **snapshot** of `StreamState`.
- On change: push a **delta** (or just re-send state — it's tiny).
- **Wire types** (`packages/types/src/index.ts`): a dedicated lightweight
  envelope, e.g. `{ type: 'stream-state', state: StreamState }`. (Dedicated
  envelope preferred over modeling StreamState as Stuff + MQL — simpler,
  decoupled, and the overlay isn't a normal player.)
- Subscribe to `StreamState` change events (EventApi) → push to all broadcast
  connections. **Only taps `StreamState`** in Phase 1 (no chat yet — that's
  Phase 2, and it'll tap only *public* channels).

### 4. Minimal mutation (to demo the loop)

Phase 1 needs *some* way to set `awayUntil`. Smallest option: a single command
`stream away <duration>` / `stream back` under `mud/cmd/stream/`, gated to the
streamer (a `requiresDeveloper`/new `requiresStreamer` validator), that
sets/clears `StreamState`. (This is a sliver of Phase 3's control plane, pulled
forward only as far as needed to prove Phase 1.)

### 5. pbox-stream client (overlay side — no approval needed)

- A small WS client: connect to `wss://<saxonberg>/ws?broadcast=<token>`, handle
  `stream-state`, feed `awayUntil` into `useAwayTimer` (replace the `?until=`
  fallback when connected; keep it as offline fallback).
- Server URL + token via Vite env (`VITE_SAXONBERG_WS`, `VITE_BROADCAST_TOKEN`).

---

## Files likely touched (saxonberg/master)

- `packages/server/src/services/websocket/WebSocketService.ts` — auth hook
- `packages/server/src/backend/Backend.ts` — broadcast principal / marker
- `packages/server/src/mud/.../StreamState.ts` — **new** singleton
- `packages/server/src/services/.../BroadcastFeed.ts` — **new** projection
- `packages/types/src/index.ts` — new `stream-state` envelope
- `packages/server/src/mud/cmd/stream/away.yaml` + controller — **new** minimal command
- config/env wiring + boot-time enable/warn

## Verify

Local saxonberg with `BROADCAST_TOKEN` set → pbox-stream pointed at it via env →
run `stream away 15m` → standby countdown updates live; `stream back` clears it.
Confirm a broadcast connection **cannot** run a real command (auto-rejected) and
is never delivered DMs/private channels.

---

## Open questions for owner — RESOLVED (2026-06-15)

1. `StreamState` home → **singleton Idea** at `/obj/StreamState` (registered in
   `bootstrap.ts`). Mutations fire `Events.StreamStateChanged` (a new well-known
   event carrying the full snapshot); the feed hangs off that. In-memory only in
   Phase 1 (reboot resets to `live`); durable round-trip deferred.
2. Protocol → **dedicated `stream-state` envelope** (`StreamStateEnvelope` +
   `StreamStateSnapshot` in `@saxonberg/types`, added to the `Envelope` union).
3. Token delivery → **query param** `?broadcast=<token>`, checked in
   `WebSocketService.handleUpgrade` *before* session auth (so a cookieless OBS
   source isn't 401'd). Constant-time compare; `BROADCAST_TOKEN` must be ≥ 16
   chars or the feed stays disabled (fail-loud), with a boot-time warn when
   enabled.
4. Minimal mutation → **built `stream away <dur>` / `stream back`** (one verb,
   two subcommands; `mud/cmd/stream/stream.yaml` + `obj/command/stream/StreamController.ts`).
   Duration is shell-style (`15m`, `1h30m`, `90s`; bare number = minutes).
5. Validator → **new `requiresStreamer`** (+ `AccessApi.isStreamer()` + a
   `streamers` managed group, seeded idempotently in `AccessRegistry`). Mirrors
   the `developers` axis exactly. Membership is seeded from the
   `STREAMER_PLAYER_IDS` env var (comma-separated Avatar playerIds, additive +
   idempotent) so the smoke is runnable without DB poking; drop a member via the
   `group` verb.

### Implementation notes (where reality refined the spec)

- **Broadcast principal has *no* Interactive at all** — stronger than the spec's
  "Interactive with no Avatar/CommandGiver". It's registered straight with the
  `BroadcastFeed` as a pure push target, so it's absent from the connection
  registry: `processUserMessage` finds no holder and commands are rejected by
  construction. Connect/disconnect flow through `Backend.handleWebSocketConnect`
  → `Application.handleUserConnect(..., isBroadcast)` and a matching
  `removeConnection` on disconnect.
- **`BroadcastFeed`** lives in `backend/` (peer to `ConnectionManager`), reaches
  the wire via `Backend.sendEnvelopeToSocket`, owns a per-socket frame counter,
  and installs its `Events.StreamStateChanged` listener lazily on first connect.
- **Affordance vs authorization split**: the `stream` verb rides `AuthorMixin`'s
  self bucket (operator command surface), but authorization is the orthogonal
  `requiresStreamer` gate — an author who isn't a streamer sees the verb but
  can't run it.

### Verify status

Static + unit verification all green: types build, server typecheck, gate lint,
existing access/event/command/author suites (no regressions), the
"every command YAML loads" check (covers `stream.yaml` + `requiresStreamer`),
new `StreamState` + duration-parser tests, overlay typecheck + prod build.
The live end-to-end smoke remains a manual step on a running stack:

1. Server `.env`: `BROADCAST_TOKEN=<≥16-char secret>` and
   `STREAMER_PLAYER_IDS=<your playerId>`; restart the server.
2. Overlay `.env`: `VITE_SAXONBERG_WS=ws://localhost:2010` +
   `VITE_BROADCAST_TOKEN=<same secret>`; run the overlay; open `/standby.html`.
3. In-game as the streamer avatar: `stream away 15m` → standby countdown
   updates live; `stream back` → clears. Confirm a broadcast connection can't
   run a real command and is never delivered DMs/private channels.
