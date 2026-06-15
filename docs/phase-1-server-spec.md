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

## Open questions for owner

1. `StreamState` home: singleton Idea vs service doc? (lean: Idea)
2. Protocol: dedicated `stream-state` envelope vs Stuff+MQL? (lean: dedicated)
3. Token delivery: query param vs WS subprotocol? (lean: query param)
4. Include the minimal `stream away/back` command in Phase 1, or set `awayUntil`
   another way for the first demo?
5. Validator for streamer-gated commands: reuse `requiresDeveloper` or add
   `requiresStreamer`?
