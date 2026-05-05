# Connection Lifecycle

How a user becomes a connection becomes an avatar — and back out
again. Covers auth, WebSocket bootstrap, the `Login` handoff,
multiplexing, message routing, and disconnect/logout.

This doc is the **plumbing** map. Sibling docs cover related ground
without overlap:

- [state-model.md](./state-model.md) — what `User`/`Avatar` carry as
  data, why there is no `Player` class, the persistent-vs-runtime
  field split.
- [lifecycle.md](./lifecycle.md) — the generic Stuff create/destroy
  choreography (`postRegister`, `prepareDestroy`).
- [messaging.md](./messaging.md) — Scene composer, Sensor routing,
  MML rendering. This doc points at the boundary; the inside lives
  there.

## The Cast

Five distinct objects participate. Confusing them is the most common
mistake. The dichotomy is laid out in
[state-model.md § The Data Model](./state-model.md#the-data-model);
this is the operational summary.

| Class | Layer | Persisted? | Lifetime |
|---|---|---|---|
| `User` | auth identity | yes (`users` collection) | account |
| `GoogleProfile` | OAuth cache | yes (`google_profiles`) | account |
| `Avatar` | game-world character | template (`/obj/Avatar/<playerId>`) | from first connection until explicit destruct |
| `Interactive` | live connection | **no** | one WebSocket session |
| `Login` | entry-procedure scratch object | **no** | one entry — destructed when `enter()` finishes |

**`User`** owns a `playerIds: string[]` — the authoritative "which
characters does this user own?" list (`User.ts:23,37`). Each id is a
character slot; the matching template lives at `/obj/Avatar/<playerId>`.

**`Avatar`** is what walks around the world. Composes
`HasInteractiveMixin` so it can carry zero, one, or many connected
`Interactive`s. `user` and `playerId` are runtime-only pointers
stamped from the clone context (`Avatar.ts:83,91,105-112`).

**`Interactive`** is a connection. Holds `socketId`, `sessionId`,
the authenticated `User`, and a `holder: HasInteractive & Stuff` that
points at whoever currently owns the connection — `Login` during
entry, `Avatar` during play (`Interactive.ts:31-44`). Knows nothing
about avatars; routing goes through `ConnectionApi`.

**`Login`** is a one-shot orchestrator. Composes `HasInteractiveMixin`
too, so the handoff from Login → Avatar uses the same
`ConnectionApi.transfer` mechanism that any future re-handoff would.
Lives only as long as `enter()` takes; `StuffApi.destruct(this)` is
the last line of its body (`Login.ts:115`).

There is no `Player` class. The id is "still called `playerId`" — see
[state-model.md § No Player class](./state-model.md#no-player-class).

## Login Flow at a Glance

```
HTTP /auth/google
       │
       ▼
Google OAuth ──▶ /auth/google/callback
                          │
                          ▼
              Backend.handleAuthenticationSuccess
                          │   (runRoot frame)
                          ▼
              Application.findOrCreateUserFromGoogle
                  ├─ findOrCreateGoogleProfile  (google_profiles)
                  └─ findOrCreateUser           (users)
                       └─ first time? → createDefaultAvatarTemplate
                                         (forks /obj/Avatar/seed →
                                          /obj/Avatar/<new playerId>)
                          │
                          ▼
                  Passport serializes { id: userId } into session
                          │
                          ▼
                Client redirected to ${CLIENT_URL}/?auth=success
                          │
        ── client opens WebSocket ──
                          ▼
       httpServer 'upgrade' → sessionMiddleware → userId from session
                          │   (401 if missing)
                          ▼
              Backend.handleWebSocketConnect
                          │   (runRoot frame)
                          ▼
              Application.handleUserConnect
                  ├─ User.findById(userId)
                  ├─ ConnectionManager.createInteractive(...)
                  └─ StuffApi.create(() => new Login(interactive))
                          │
                          ▼
                       login.enter()
                  ├─ ConnectionApi.transfer(interactive, login)
                  ├─ PlayerApi.loadAvatarsForUser(user)
                  ├─ ConnectionApi.transfer(interactive, avatar)
                  ├─ avatar.teleport(startingRoom, { silent: true })
                  ├─ MessageApi.scene(avatar)…system.connection.established
                  ├─ EventApi.emit(Events.PlayerLoggedIn, …)
                  └─ StuffApi.destruct(this)
```

## Phase 1: HTTP Auth → `User` Creation

`Server.setupMiddleware()` (`Server.ts:59-110`) wires the middleware
stack: CORS with credentials, JSON/URL parsers, cookie parser,
**`express-session` with `SESSION_SECRET`**, then `passport.initialize()`
and `passport.session()`.

The session middleware instance is **stashed onto the Express app
itself** so the WebSocket upgrade handler can run the same instance
later (`Server.ts:109`). One source of session truth.

```typescript
// Server.ts:81-91
const sessionMiddleware = session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,    // 24 hours
  },
});
```

`PassportConfig` registers a `GoogleStrategy` whose verify callback
hands off to `Backend.handleAuthenticationSuccess(profile, done)`.
Routes (`AuthRoutes.ts`):

- `GET /auth/google` — kicks off OAuth (scope `profile`, `email`).
- `GET /auth/google/callback` — Passport runs verify, then redirects
  to `${CLIENT_URL}/?auth=success` (or `?auth=failure`).
- `GET /auth/status` — `{ isAuthenticated, user? }`.
- `POST /auth/logout` — `req.logout()` + `req.session.destroy()`.

`Backend.handleAuthenticationSuccess` (`Backend.ts:207-232`) wraps
the User creation call in a security root frame:

```typescript
// Backend.ts:220-224
const userId = await ExecutionContextApi.runRoot(
  Backend,
  'findOrCreateUserFromGoogle',
  () => app.findOrCreateUserFromGoogle(profile)
);
done(null, { id: userId });
```

`Application.findOrCreateUserFromGoogle` (`Application.ts:262-273`)
runs two upserts:

1. **`findOrCreateGoogleProfile`** (lines 275-311) — keyed on
   `googleId`. Stores email, displayName, names, photo, raw profile,
   timestamps. Either creates or updates.

2. **`findOrCreateUser`** (lines 313-338) — keyed on
   `googleProfileId`. If new, constructs a `User` via
   `await StuffApi.create(() => new User())`, saves it, then calls
   `createDefaultAvatarTemplate` and pushes the new `playerId` onto
   `user.playerIds`. **Avatar templates are seeded at account
   creation; they are NOT lazy.**

`createDefaultAvatarTemplate` (`Application.ts:352-380`) forks from
the seed avatar at `Avatar.SEED_TEMPLATE_PATH` (`/obj/Avatar/seed`),
generates a fresh `playerId` via `nanoid()`, overlays the user's
`name`/`surname`, and persists the new template via
`TemplateApi.saveTemplate`. **If the seed is missing it throws** —
`SeederManager` must have run at boot (`Application.ts:357-362`).

Passport serializes `{ id: userId }` into the session
(`PassportConfig.ts:37-39`). At this point the persistent state is
done: `users`, `google_profiles`, `domain` (template) all written.
**No runtime objects exist yet.**

## Phase 2: WebSocket Upgrade

`Server.start()` passes the saved `sessionMiddleware` into
`WebSocketService.initialize` (`Server.ts:157-158`).
`WebSocketService` attaches its own handler to the HTTP server's
`upgrade` event:

```typescript
// WebSocketService.ts:51-56
httpServer.on('upgrade', (request, socket, head) => {
  sessionMiddleware(request as any, {} as any, () => {
    this.handleUpgrade(request, socket, head);
  });
});
```

The session middleware runs against the upgrade request **before**
`handleUpgrade` decides whether to accept. `handleUpgrade` reads
`req.session.passport.user.id`; if absent, writes `401` and destroys
the socket (`WebSocketService.ts:78-85`). Otherwise, it calls
`wss.handleUpgrade` and on success delegates to
`Backend.handleWebSocketConnect(ws, userId, sessionId)`.

The `WebSocketServer` is configured with `noServer: true` and
`maxPayload: 50MB` (`WebSocketService.ts:44-48`). `ws` does not bind
its own listener; the manual `upgrade` interception is what lets
sessions be checked first.

## Phase 3: `Interactive` and `Login` Bootstrap

`Backend.handleWebSocketConnect` (`Backend.ts:99-134`):

1. Mints `socketId = socket_<timestamp>_<rand>`.
2. Stores the raw `WebSocket` in `socketsBySocketId`.
3. Wires `message`/`close`/`error` handlers.
4. Plants the network → Application root frame and calls
   `Application.handleUserConnect(userId, sessionId, socketId)`.

```typescript
// Backend.ts:130-132
ExecutionContextApi.runRoot(Backend, 'handleUserConnect', () =>
  app.handleUserConnect(userId, sessionId, socketId)
);
```

`Application.handleUserConnect` (`Application.ts:90-129`):

1. `User.findById(userId)` — load the persistent record.
2. `ConnectionManager.get().createInteractive(socketId, sessionId, user)` —
   constructs an `Interactive` via `StuffApi.create` and registers it
   in the `interactivesBySocketId` map (`ConnectionManager.ts:54-77`).
3. `await StuffApi.create(() => new Login(interactive))`.
4. `await login.enter()`.

`Interactive` is created via `StuffApi.create` rather than `clone` —
it's a runtime-only object built from constructor args, not from a
template (closes over `socketId`/`sessionId`/`user` directly).

The `Login` constructor seeds itself with the Interactive
(`Login.ts:35-42`):

```typescript
constructor(interactive: Interactive) {
  super();
  this.interactive = interactive;
  // Login multiplexing never actually happens — it's just consistency
  // with the mixin so MixinApi.isHasInteractive(login) works.
  this.addInteractive(interactive);
}
```

The seed is `addInteractive`, NOT `ConnectionApi.transfer`. The
Interactive's `holder` is still `null` at this point. The first
proper `transfer` happens inside `enter()` (next phase).

## Phase 4: Avatar Materialization and Handoff

`Login.enter()` (`Login.ts:51-116`) is the body of the entry
procedure. Verbatim sequence:

1. **`ConnectionApi.transfer(interactive, this)`** — formal handoff
   to Login. Sets `interactive.holder = login`, fires
   `onConnectionAttached` on Login.

2. **`PlayerApi.loadAvatarsForUser(interactive.user)`** — for each
   `playerId` on the user, returns the existing in-memory Avatar if
   one is registered; otherwise clones from the per-user template
   with context `{ user, playerId }` so `Avatar.postRegister` can
   stamp the runtime fields synchronously
   (`PlayerApi.ts:98-112`).

   ```typescript
   avatar = await StuffApi.clone<Avatar>(
     AvatarClass.getTemplatePath(playerId),
     { user, playerId }
   );
   ```

   **`Avatar.postRegister` registers the avatar with `PlayerApi`
   keyed on `playerId`** (`Avatar.ts:105-112`) — that's what makes
   "second connection finds the same avatar" possible.

3. **`if (avatars.length !== 1) throw`** — multi-character is not
   yet supported (`Login.ts:60-65`). See
   [§ Not Yet Implemented](#not-yet-implemented).

4. **`ConnectionApi.transfer(interactive, avatar)`** — moves the
   holder slot from Login to Avatar. Witness hooks fire (see
   [§ Multiplexing](#multiplexing)).

5. **Clone the starting room** (`DEFAULT_STARTING_ROOM_PATH`) and
   silently teleport the avatar into it.

6. **Welcome scene** at topic
   `system.connection.established`, audience `toSelf`, body
   `"Welcome back, <fullName>!"`, with a **payload** the client
   needs for bootstrap:

   ```typescript
   // Login.ts:89-102
   .payload({
     userId: interactive.userId,
     socketId: interactive.socketId,
     sessionId: interactive.sessionId,
     player: {
       _id: avatar.playerId,
       honorific, name, surname, nameSuffix,
       alternateNames, pronouns,
     },
   })
   ```

7. **`sendLookDescription(avatar)`** (`Login.ts:118-142`) — frames
   the room name + long description as a `world.perception.look`
   scene to the actor.

8. **`EventApi.emit(Events.PlayerLoggedIn, { playerId, userId })`** —
   engine event for any observer (audit, achievements).

9. **`StuffApi.destruct(this)`** — Login is gone. The connection
   has been handed off; nothing depends on Login any more.

After `enter()` returns, the user is in-world.
`interactive.holder === avatar`; `Login` is destructed and
unregistered.

## Multiplexing

> Multiplexing was an explicit MUST-NOT-regress requirement
> (`state-model.md:243-249`). It works as follows.

`HasInteractiveMixin` (`HasInteractive.ts:59-91`) gives any composing
class:

```typescript
interactives: Set<Interactive>          // mutable storage
addInteractive(i)                       // primitive
removeInteractive(i)                    // primitive
getInteractives(): ReadonlySet<...>     // safe read
isConnected() / isLinkdead()            // count-based predicates
```

External code does NOT call `addInteractive`/`removeInteractive`
directly; `ConnectionApi.transfer` and `ConnectionApi.detach` are
the only sanctioned mutators (`connection.ts:80-150`).

### A second connection for the same user

`PlayerApi.loadAvatarsForUser` checks the registry first
(`PlayerApi.ts:102`). If the Avatar is already registered (because
a previous connection cloned it), the new Login receives the
**existing** Avatar object. `ConnectionApi.transfer(newInteractive,
existingAvatar)` then adds the new connection to the same Set.

The Avatar now has two Interactives. `Avatar.handleMessage` iterates
the whole Set:

```typescript
// Avatar.ts:128-133
protected override handleMessage(frame: MessageFrame): void {
  const app = Avatar.getApplicationInstance();
  for (const interactive of this.interactives) {
    app.sendMessageToInteractive(interactive, frame);
  }
}
```

Every message the avatar perceives is sent to **every** connected
client. Multiplexed sessions share a single in-world identity but
each get their own outbound stream.

### Witness Hooks

`ConnectionApi.transfer` fires per-connection AND presence-transition
hooks (`connection.ts:109-129`):

| Hook | When | Why |
|---|---|---|
| `onConnectionAttached(conn)` | every transfer | per-device events |
| `onConnectionDetached()` | every detach | per-device events |
| `onLinkdead()` | count crosses 1 → 0 | last connection dropped |
| `onLinkRestored()` | count crosses 0 → 1 | first connection back |

All four are **optional**. `Avatar` overrides `onLinkdead` to emit
the global `Events.PlayerLoggedOut` (`Avatar.ts:150-152`). Per-device
hooks aren't currently used.

The transition fire-once-per-edge semantics matter: a user with two
devices who closes one tab does NOT trigger `onLinkdead`. Only the
last close does.

### Inbound from a multiplexed session

A multiplexed pair is symmetric for OUTBOUND but asymmetric for
INBOUND: each socket sends commands independently and the dispatcher
treats them as if the same avatar typed both. There is no input
arbitration today. (Two devices typing `attack` simultaneously will
each enqueue a command.)

## Inbound Messages (Client → Game)

```
ws 'message' → Backend.handleWebSocketMessage(socketId, data)
                      │   (runRoot frame)
                      ▼
              Application.processUserMessage(socketId, message)
                      │
                      ▼ switch on message.type
              ┌───────┼───────┐
            echo    ping    command
              │       │       │
              ▼       ▼       ▼
            echo    pong   handleCommandMessage
                              │
                              ▼
                  avatar.executeCommand(text, ctx)
```

`Backend.handleWebSocketMessage` (`Backend.ts:142-165`) parses JSON
and dispatches under another root frame. Bad JSON sends back an
`error` frame.

`Application.processUserMessage` (`Application.ts:143-186`) looks up
the Interactive by socketId, then switches on `message.type`:

- `echo` — round-trip the payload (debug).
- `ping` — reply `pong` with timestamp.
- `command` — `handleCommandMessage`.

`handleCommandMessage` (`Application.ts:208-255`) requires
`interactive.holder instanceof Avatar` — anything else gets a
`No active character` error. **Login does not yet accept commands**;
when it does, that will be a separate dispatch path with its own
`CommandContext` (no `location`). Builds the `CommandContext` with
avatar/interactive/location/text/executionId and calls
`avatar.executeCommand(text, context)`. The result is discarded —
prose is fired via `Scene` inside the controller; success/failure
reaches the client via auto-emitted `MudlogApi` command-outcome
entries (see [commands.md](./commands.md)).

## Outbound Messages (Game → Client)

The full pipeline (Scene composer, audience routing, MML, sensors)
lives in [messaging.md](./messaging.md). The connection-relevant
boundary:

```
MessageApi.scene(actor)…send()
              │
              ▼
recipient.onMessage(frame)         (SensorMixin chokepoint)
              │
              ▼
recipient.handleMessage(frame)     (after filterMessage)
              │
              ▼ (Avatar override)
for (const i of this.interactives):
    Application.sendMessageToInteractive(i, frame)
              │
              ▼
Backend.sendMessageToSocket(socketId, frame)
              │
              ▼
ws.send(JSON.stringify(frame))     (only if ws.readyState === OPEN)
```

`Application.sendMessageToInteractive` (`Application.ts:80-84`) is
the **sole gateway** from game objects to the network — Application
owns the Backend reference, no other game code holds it. Avatar's
override at `handleMessage` is what implements multiplexing.
`Backend.sendMessageToSocket` (`Backend.ts:70-89`) is the final
network call; logs and skips if the socket is missing or closed.

## Disconnect

WebSocket close is the canonical disconnect. The browser navigating
away, the user closing the tab, network failure, and explicit client
close all converge on `ws.on('close', ...)`.

```
ws 'close' → Backend.handleWebSocketClose(socketId)
                       │
                       ├─ socketsBySocketId.delete(socketId)
                       │   (runRoot frame)
                       ▼
              Application.handleUserDisconnect(socketId)
                       │
                       ▼
              ConnectionManager.removeInteractive(socketId)
                       │
                       ├─ StuffApi.destruct(interactive)
                       │     │
                       │     ├─ interactive.prepareDestroy()
                       │     │     └─ ConnectionApi.detach(this)
                       │     │            ├─ avatar.removeInteractive(this)
                       │     │            ├─ interactive.holder = null
                       │     │            ├─ avatar.onConnectionDetached?()
                       │     │            └─ avatar.onLinkdead?()  ← if last
                       │     ├─ shadow detach
                       │     └─ destroy() → unregister
                       │
                       └─ interactivesBySocketId.delete(socketId)
```

### What survives the disconnect

The Interactive is destructed and gone. **The Avatar is not.**

Nothing in the disconnect path destructs the Avatar. It stays
registered with `PlayerApi` (and in `StuffApi.objectsById`)
indefinitely, its location intact, ready for the user to reconnect
and have `loadAvatarsForUser` find the same in-memory instance.

That's load-bearing — it preserves world state across reconnects and
is the foundation of multiplexing — but it also means the registry
**grows monotonically** until something explicit destructs the
Avatar. There is currently no idle eviction (see
[lifecycle.md § Open Design — Idle Eviction](./lifecycle.md#open-design--idle-eviction)).

`Avatar.onLinkdead` (`Avatar.ts:150-152`) emits
`Events.PlayerLoggedOut`. Listeners can react (audit, "the
adventurer fades from view" perception broadcasts in the future,
etc.).

### Avatar.prepareDestroy

When something DOES destruct an Avatar (test cleanup, future
character-deletion flow), `Avatar.prepareDestroy` (`Avatar.ts:140-143`)
unregisters from `PlayerApi` and clears `interactives`. It does NOT
detach those Interactives — they would still point at the destroyed
Avatar via `holder`. **Don't destruct an Avatar that has live
Interactives.** The current call sites don't, and nothing enforces
the invariant; if a future caller does, it should detach first.

## Logout (HTTP)

`POST /auth/logout` (`AuthRoutes.ts:67-84`) calls `req.logout()` then
`req.session.destroy()`. The session cookie is invalidated; any
subsequent attempt to upgrade a WebSocket on it will fail at
`WebSocketService.ts:80` with 401.

**Logout does NOT close existing WebSockets.** The route is
HTTP-only. If the client wants to drop in-flight game sessions on
logout, the client must close the socket. If it doesn't, the socket
stays open until the network or browser closes it; on close, the
disconnect path runs as normal. The session being destroyed doesn't
break the live socket because the socket no longer goes through the
session middleware after upgrade — only re-upgrades do.

There is no broadcast "the user has logged out" frame from the
server. (Disconnect doesn't send one either; the WebSocket close is
the signal.)

## Security Frames at the Network Boundary

Every entry from the network into Application is wrapped in
`ExecutionContextApi.runRoot(Backend, '<method>', () => …)`:

| Site | Backend method | Application method |
|---|---|---|
| WebSocket connect | `handleWebSocketConnect` | `handleUserConnect` |
| WebSocket message | `handleWebSocketMessage` | `processUserMessage` |
| WebSocket close | `handleWebSocketClose` | `handleUserDisconnect` |
| OAuth callback | `handleAuthenticationSuccess` | `findOrCreateUserFromGoogle` |

These root frames give the call-stack a well-defined bottom: when a
mudlib method later checks `ExecutionContext`, it sees `Backend` as
the caller at the network boundary, not `null`. Application itself
is annotated `@CallSecurity(SecurityPolicies.Public)`
(`Application.ts:56`); the comment there spells out that the
decorator is forward-compatible declaration of intent — instance
methods on Application aren't proxy-mediated. The runtime gate
lives further down, on the Apis Application calls into.

See [call-security.md](./call-security.md) for the broader policy
taxonomy and how `FrameKind`/`runRoot` plant frames.

## Things This Subsystem MUST NOT Regress

- **Multiplexing.** Multiple Interactives → one Avatar; same
  in-memory instance across reconnects (`PlayerApi.loadAvatarsForUser`
  reuses); messages broadcast to every connected device
  (`Avatar.handleMessage`).
- **Session-validated WebSocket upgrade.** No userId in session →
  401 + destroy. The same `sessionMiddleware` instance is shared
  with HTTP; do not duplicate session config in two places.
- **Login destructs itself.** It exists for the entry procedure
  only. Don't keep references to it past `enter()`. Don't subclass
  it for "kept-alive entry contexts" — that's the Avatar's job.
- **`ConnectionApi.transfer` / `detach` are the only mutators of
  `interactive.holder`.** Direct assignment skips witness hooks and
  the cross-cutting `Events.ConnectionAttached` event. Don't call
  `addInteractive`/`removeInteractive` directly from outside the
  Api/mixin layer.
- **Network → Application root frames.** Every entry from Backend
  goes through `ExecutionContextApi.runRoot(Backend, ...)`. Adding a
  fifth entry path (e.g. a REST command endpoint) requires planting
  the same frame.
- **Avatar registration via `postRegister`, not constructor.** The
  context bag (`{ user, playerId }`) reaches the Avatar there, and
  registration must happen after the Stuff is in `objectsById` —
  see [lifecycle.md](./lifecycle.md).
- **Avatar persists across disconnect.** The current behavior
  (Avatar stays registered after the last Interactive drops) is
  load-bearing for reconnection. Eviction must run the same cleanup
  path as explicit `StuffApi.destruct` — see
  [lifecycle.md § Open Design — Idle Eviction](./lifecycle.md#open-design--idle-eviction).

## Not Yet Implemented

- **Multi-character selection.** `Login.enter` throws if the user has
  zero or more than one playerId (`Login.ts:60-65`). The character
  list / pick-a-character UI is the missing piece. When it lands,
  the `Login` body splits into "load avatars → present picker" then
  "transfer to chosen avatar" — the `ConnectionApi.transfer` machinery
  is already general enough to support it.
- **WebSocket close on logout.** `POST /auth/logout` invalidates the
  session but leaves the WebSocket open. Either the route should
  enumerate the user's live sockets and close them, or the client
  should close before calling logout.
- **Avatar idle eviction.** Avatars stay registered indefinitely
  after the last disconnect. See
  [lifecycle.md § Open Design — Idle Eviction](./lifecycle.md#open-design--idle-eviction).
- **Persist-back of Avatar runtime state.** Avatar mutations are
  in-memory only; the avatar template is read on first clone and
  never written back. Comment in `Avatar.ts:138`. Tracked under the
  unified-model "persist direction" in
  [state-model.md § Not Yet Implemented](./state-model.md#not-yet-implemented).
- **Distributed / multi-process Interactive tracking.** `ConnectionManager`
  and `Backend` are single-process singletons. There is no shared
  state for cross-instance routing.
- **Disconnect / system frames to the client.** No
  `system.connection.lost` or "you have been disconnected" frame is
  sent on close — the client only sees the WebSocket close event.
  No `system.session.expired` either; an upgrade attempt on a
  destroyed session just gets 401.
- **Inbound arbitration for multiplexed sessions.** Two devices typing
  simultaneously each enqueue a command. No single-active-input
  policy.

## Cross-References

- [state-model.md](./state-model.md) — `User`/`Avatar` data model,
  no `Player` class, what's persistent vs runtime
- [lifecycle.md](./lifecycle.md) — generic Stuff create/destroy,
  `postRegister`, `prepareDestroy`, idle eviction (open design)
- [messaging.md](./messaging.md) — Scene composer, Sensor routing,
  audiences, MML rendering (the "inside" of outbound delivery)
- [commands.md](./commands.md) — command pipeline reached via
  `avatar.executeCommand` from `processUserMessage`
- [call-security.md](./call-security.md) — `ExecutionContextApi.runRoot`,
  `FrameKind`, policy taxonomy
- [persistence.md](./persistence.md) — `Persistable` track that
  `User` and `GoogleProfile` ride on
