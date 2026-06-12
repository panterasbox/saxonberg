# Implementation Plan: Client Shell — Frame, Start Screen & Pre-Auth State

> Plan for `docs/requirements/client-shell-frame-requirements.md`. Scope
> is closed per that doc; this plan is *how*, not *what*.

## Verified seams (corrections / confirmations to the requirements' map)

- **Client phase switch** is `App.tsx` `switch (connectionPhase)` (lines 636–709). The `unauthenticated` arm (637–656) is the inline `LoginContainer`/`DevLogin` to replace; the `in-world` arm renders `<ConnectionStatus />` at line 681.
- **`ConnectionState`** (`packages/types/src/index.ts:1182`) is `{ isConnected, socketId, sessionId, error }` — **there is no `reconnecting` state today**. The websocket client (`services/websocket.ts`) tracks `reconnectAttempts` internally (`maxReconnectAttempts = 5`, fixed `reconnectDelay = 2000`) but only ever calls `setDisconnected()` / `setConnected()`. The three-state `connection.link` + exponential backoff + input gating is designed in Phase 1 → Connection-loss behavior.
- **Guest principal**: the WS gate (`WebSocketService.ts:88`) reads `session.passport.user.id` and hands `userId` to `Backend.handleWebSocketConnect` → `Application.handleUserConnect` → `User.findById(userId)` (line 167). A guest has **no persisted `User`**. This is the central architecture decision (below): the guest path must produce a `User`-shaped principal `handleUserConnect`/`Interactive`/`Login.enter` can consume without a Mongo round-trip, and `Login.enter` must branch to mint-on-Enter rather than `loadAvatarsForUser` (which iterates `user.playerIds` and clones `/obj/Avatar/<playerId>` templates — a guest has neither).
- **Don't-flush seam**: confirmed `backend/inbound/clientState.ts:32` `await holder.save()` is the single line to gate.
- **Dev-login precedent**: `TestAuthRoutes.ts` + `Backend.handleTestAuthentication` + `syntheticTestProfile` (`Backend.ts:30`) is the exact template for a guest principal route, but note dev-login still goes through `findOrCreateUserFromGoogle` (it persists a real User). Guest must **not** persist.
- **Portrait — it's just a setting with a fallback**: the `identity.portrait` *setting schema* lives on `PersonaMixin` (`lib/character/Persona.ts`, schema-on-owner; declares no `static settings` today). The *resolution* (`getPortraitUrl()`) lives on **`HasInteractiveMixin`** (`lib/connection/HasInteractive.ts`) — the layer present from the moment of connection, on **both `Login` (pre-world) and `Avatar` (in-world)** — so the account photo can paint at the start screen, not only in-world. The single method reads the setting via `resolveSetting(this, 'identity.portrait')` (which returns empty on a `Login`, value-or-unset on an `Avatar` — no per-layer override needed), then falls back to the account photo (`getInteractives()` → `Interactive.getUser()` → `googleProfileId` → `GoogleProfile.photoUrl`), then a placeholder.
- **Identity payload**: `ConnectionEstablishedPayload.player` (`types/index.ts:898`) is built in `Avatar.enter` (`Avatar.ts:313–330`). This is where the resolved portrait URL rides alongside `displayName`. `AuthState.player` (`types:1168`) and `AuthStatusResponse.player` mirror it on the client.
- **Name denylist**: `EnrollController.ts:98` `const NAME_DENYLIST = [...]` + `validateNameToken` (checks `NAME_DENYLIST.includes(t.toLowerCase())` at line 109). This is the exact guard to extend with the reserved guest word.
- **NameBank** (`lib/species/NameBank.ts`) exposes `static resolve(keys)` → `NamePools` and `byKey`. Guest-name generation draws a distinguisher here.

---

## Architectural decisions left to the planner

### (a) Guest clientState: ride-the-bus-then-skip-`save()` — **confirmed, do not invent a never-leaves-client path**

The requirements and slate both fix this, and the code agrees: keep guest `clientState` on the **existing bus-mirrored path** and skip only `holder.save()`. Rationale grounded in the code:
- `inbound/clientState.ts` already calls `holder.setClientState()` (in-memory, schema-checked) **then** `holder.save()`. Gating the second line is a one-branch change; a "never leaves client" design would fork the whole `client-state-write` wire path and the `snapshotClientState()` welcome payload — far more surface, and it would break the slate's "client never special-cases a guest" constraint.
- The guest avatar is a real `Avatar` instance with `HasInteractiveMixin._clientState`; in-memory writes are free and die with the instance on disconnect. So: **bus-then-skip-save**, gated on an `isGuest` predicate read from the holder.

### (b) Client subsystem doc home — **new `docs/subsystems/client-shell.md`**, with a one-line scope note

`docs/subsystems/` is server-engine-focused today (every existing doc is a server subsystem; CLAUDE.md frames the tree as "architecture and subsystem behavior" and TypeDoc is "server-only for now"). But the acceptance criteria explicitly name `docs/subsystems/client-shell.md`, the workflow doc's taxonomy has only one "Subsystem" bucket (permanent, `docs/subsystems/<name>.md`), and there is no `docs/subsystems/client-*` precedent to extend. **Decision: create `docs/subsystems/client-shell.md`** as the first client-side subsystem doc, opening with a one-sentence note that it documents a *client* subsystem (frame primitives + start screen + guest lifecycle), distinct from the server-engine docs around it. This avoids inventing a new top-level docs category (which the taxonomy forbids) while flagging the cross-cutting nature. Flag for the user at build time; it's the lowest-friction choice consistent with the stated acceptance criterion.

### (c) Guest principal shape — **anonymous in-memory `User` (auth axis); `isGuest` lives on the Avatar (character axis)**

**Two orthogonal axes, not one flag.** The plan must not conflate them (corrected after review):

- **Session/account axis = authentication.** Is this session backed by a real persisted account, or an anonymous/ephemeral principal? Legitimately a User/session concern. This is what the principal carries.
- **Character axis = `isGuest`.** "This avatar is a throwaway persona." A **player-level (Avatar) attribute** — it is *not* `User.isGuest` and *not* an auth flag. Every guest *behavior* (don't-flush, destroy-on-disconnect, reserved name, client badge) reads the **Avatar's** `isGuest`.

They are independent: an anonymous session driving a real character, or an authed user a throwaway one, are both coherent in the model. Today's UX maps anonymous→guest, but that mapping lives in **one policy spot** (`Login.enter`'s mint branch), never welded into a flag's home.

Implementation:
- `/auth/guest` mints an **anonymous session principal** (e.g. `{ id: 'anon:<nanoid>' }`, no real account), `req.login`'d so `session.passport.user` exists and the WS gate passes.
- `Application.handleUserConnect` detects the anonymous principal (no persisted `User` for an `anon:` id) and constructs an **ephemeral in-memory `User`** directly instead of `User.findById` — never `.save()`d, `playerIds: []`. `Interactive` already holds a `User` object (`Interactive.ts:34`), so downstream is unaffected. (Alternative rejected: persist + reap a throwaway `User` — violates "guests persist nothing.")
- The ephemeral `User` carries **only** the auth distinction (it is anonymous — inferable from the absence of `googleProfileId`/`_id`, or an explicit runtime `authenticated: boolean` if a consumer needs it; **do not** name it `isGuest`).
- `Login.enter` is the single policy point that maps "anonymous session → mint a **guest Avatar**." The `isGuest` attribute is stamped on that **Avatar** at mint (new `isGuest` field + `getIsGuest()` predicate on Avatar; runtime-only, not persisted).

---

## Phase ordering & dependencies

The pieces are coupled but have a clean build order. Server-side identity/guest pieces (3, 5) unblock the client pieces (1, 2) by defining the payloads they consume. **There is no client-persistence/localStorage phase** — nothing in scope needs persistence beyond the session cookie + server-authoritative state (see requirements; the pre-auth device-local tier is deferred to the slate with no v1 content).

```
Phase 0  Shared types (@saxonberg/types)        ── unblocks everything
Phase 5  Per-character portrait setting (server)  ── feeds payload for Phase 1
Phase 3  Anonymous guest end-to-end (server)      ── feeds isGuest for Phases 1,2
Phase 1  Frame primitives + in-world frame        ── consumes 3,5
Phase 2  Plain-UI start screen                    ── consumes 1,3
Phase 6  Subsystem doc + slate-question closeout
```

Tests for each phase map to acceptance criteria and land with that phase.

---

## Phase 0 — Shared types

**Modified:** `packages/types/src/index.ts`

- Add `portraitUrl: string` (resolved, non-optional — server always resolves to at least the placeholder) to the `player` shape in **three places**: `ConnectionEstablishedPayload.player` (:898), `AuthStatusResponse.player` (:1143), `AuthState.player` (:1168). Keep it a plain string; client does image-fallback.
- Add to `ConnectionState` a `link: 'connected' | 'reconnecting' | 'dropped'` field so `ConnectionIndicator`, the command-bar gate, and the Reconnect banner can all read one source of truth (see Phase 1 → Connection-loss behavior). Keep `isConnected` derived from it for any existing callers.
- No guest-specific client type (constraint: client doesn't special-case guests). `isGuest` and the guest name arrive through existing `player` fields + marker the server already sends; the frame reads them generically. (If a badge needs an explicit signal, add an optional `isGuest?: boolean` to the `player` payload shape — server-driven, not a client guess.)

---

## Phase 4 — (removed: no client-side persistence)

Cut. The earlier draft built a `localStorage` device-local slice for
`last-used-provider` + `dev-login-name`; both evaporated on inspection
(`last-used-provider` is inert with a single live provider;
`dev-login-name` is dev trivia the existing `useState('dev')` default
already covers). The session cookie + server-authoritative state are the
complete persistence story for this build. The pre-auth device-local
tier is deferred to the slate (built when it has real content — per-
device perf toggles, a pre-auth theme cache). No localStorage is added.

---

## Phase 5 — Per-character portrait setting (server)

**Modified:** `packages/server/src/mud/lib/character/Persona.ts`
- Add `static settings: SettingsSchemaEntry[]` declaring one entry, e.g. `identity.portrait` (`type: SettingTypes.String`, `default: ''` meaning unset, `description`, `private: false`). Declaring it here (not `EnvironmentMixin`) honors schema-on-mixin; Avatar composes Persona via `Character`, so the schema walk picks it up and the `settings` command can override it for free. Add a `validator` only if you want a basic URL-shape check (optional; v1 validation is client-side per non-goals).

**Resolution is one instance method on the connection layer, NOT an Api.** Every other `player.*` field is sourced from a method on the host (`this.getName()`, `this.getPronouns()`); the portrait is the same shape. Do **not** add a `DescribeApi` (or any new-Api) helper — `DescribeApi` is being end-of-lifed; nothing new goes on it. The home is **`HasInteractiveMixin`**, so the portrait is available the moment a session connects (`Login` pre-world, `Avatar` in-world).

**Modified:** `packages/server/src/mud/lib/connection/HasInteractive.ts` — add **one** method:
```
getPortraitUrl(): Promise<string>
  const set = resolveSetting<string>(this, 'identity.portrait'); // empty on Login; value-or-unset on Avatar
  if (set) return set;
  const photo = await <account photo>;                            // getInteractives() → Interactive.getUser()
  return photo || HasInteractive.DEFAULT_PORTRAIT;                //   → googleProfileId → GoogleProfile.photoUrl
```
- `resolveSetting(host, key)` tolerates hosts without the setting (a `Login` has no `identity.portrait`), so **no override hook / no per-layer split** — the same method is correct on `Login` (→ account photo) and `Avatar` (→ setting, else account photo).
- account photo: pick any of `getInteractives()` → `Interactive.getUser()` → `user.googleProfileId` → `GoogleProfile.findById(...)` → `.photoUrl`. No interactive / no profile (e.g. guest) → empty.
- `DEFAULT_PORTRAIT` — a placeholder constant (static asset URL or data-URI; the client also image-falls-back, but a server-resolved value keeps the payload self-describing).
- **Never write the Google URL into the setting** (requirement) — the account photo is a read-time fallback only.

**Modified:** `packages/server/src/mud/obj/Avatar.ts` (`enter`, ~:313–330)
- In the `ConnectionEstablishedPayload.player` block, add `portraitUrl: await this.getPortraitUrl()` (inherited from `HasInteractive`). `enter` is already async. No Avatar-specific portrait code — the inherited method already reads the Persona setting via `resolveSetting`.

**Pre-world delivery (show it at connect):** because `getPortraitUrl()` is on `HasInteractive`, the **`Login`** holder resolves it too — to the account photo (no character override yet). Surface it at the start-screen / character-select stage so the portrait paints before in-world: it rides the existing pre-world identity path (the `system.connection.*` / roster frames the `Login`/connection emits). Earliest-possible paint can also come from HTTP `/auth/status` resolving the session's `googleProfile.photoUrl` directly (see below) — the canonical method stays on `HasInteractive` for the connected-holder path.

**Modified:** `packages/server/src/services/auth/AuthRoutes.ts` (`/auth/status`, :49–64)
- This is the **earliest** paint point — pre-WS, the session already resolves to the account photo (`req.user` → `googleProfileId` → `GoogleProfile.photoUrl`). To honor "show it as soon as they connect," `/auth/status` should carry the **account** `portraitUrl` so the start screen / pre-world frame paints the avatar immediately, before any WS frame. (This is the account-photo base; the in-world payload upgrades it to the character override.) It's the same resolution `HasInteractive.accountPhotoUrl()` performs, just reached from the HTTP session instead of a connected holder — keep the placeholder/default logic identical so the two paths agree.

**Tests** → a `getPortraitUrl()` test over the chain: setting unset + account photo present → account photo; setting unset + no photo (e.g. guest) → `DEFAULT_PORTRAIT`; `settings set identity.portrait <url>` → that value wins. (One method; exercise it on an `Avatar` for the setting cases and on a `Login`/account-only holder for the connect-time account-photo case.) **Maps to AC**: "a server test over the resolution chain (unset → account photo → placeholder; overridden → override)."

---

## Phase 3 — Anonymous guest end-to-end (server)

This is the largest server piece. Build order within the phase: principal → connect branch → mint-on-Enter → don't-flush → marker+name → denylist.

**3a. `/auth/guest` route + policy gate**
**New:** `packages/server/src/services/auth/GuestAuthRoutes.ts` (sibling to `TestAuthRoutes.ts`, mounted from `Server.ts` next to `AuthRoutes.setup` at :119, **unconditionally** — guest is a production path, unlike test-auth).
- `POST /auth/guest`: the **single mint-a-guest policy gate** — one admission check (`mayMintGuest(req)`), today returns `true` unconditionally. It establishes an **anonymous session principal** `{ id: 'anon:<nanoid>' }` (no `isGuest` on the principal — that's a character attribute set later in `Login.enter`), `req.login(principal, ...)` so `session.passport.user` exists, respond that the (anonymous) session is established so the client proceeds to connect. The route *name* and gate are the UX "play as guest" door; the session *artifact* is anonymity. The gate is the only thing that must exist; rate-limit/per-IP/captcha hang off it later (non-goal now).
- Keep the admission decision in **one identifiable function** a test can flip. (AC: "a single, identifiable policy point a test can exercise.")

**3b. Connect path recognizes the anonymous principal**
**Modified:** `WebSocketService.ts` (:83–95) — widen the session-shape read to recognize the **anonymous** principal (e.g. the `anon:` id scheme, or an `authenticated: false` marker on `session.passport.user`), pass it (or the whole principal) to `handleWebSocketConnect`. **The gate stays unchanged in spirit** — it still requires a `user.id`; the anonymous principal simply *has* one. (Constraint: "WS upgrade gate is not loosened.")
**Modified:** `Backend.ts` `handleWebSocketConnect` (:188) and `Application.handleUserConnect` (:154–179) — when the principal is anonymous, construct an **ephemeral in-memory `User`** (`new User()` with `playerIds: []`, **not saved**) instead of `User.findById`. Thread it into `ConnectionManager.createInteractive` unchanged (`Interactive` already holds a `User`).
**Modified:** `packages/server/src/mud/lib/identity/User.ts` — **no `isGuest` here** (that's a character attribute, see 3c). If a downstream consumer needs to know the session is anonymous, add a runtime `authenticated: boolean = true` (set `false` for the ephemeral construct; runtime-only, **not** in `persistentFields`) — an auth-axis flag, distinct from guest-ness. Prefer inferring anonymity from the absence of `googleProfileId` if no consumer needs the explicit flag.

**3c. Mint-on-Enter (not page-load, not template-clone) — the one anonymous→guest policy spot**
**Modified:** `packages/server/src/mud/obj/Login.ts` (`enter`, :118–133) — branch on **session anonymity** (`interactive.getUser()` is the ephemeral/anonymous construct — no `playerIds`/`googleProfileId`, or the `authenticated === false` flag from 3b). This is the **single place** the anonymous→guest mapping lives:
- Anonymous → **mint a throwaway guest Avatar directly** (not `loadAvatarsForUser`, which needs `playerIds` + per-player templates). Clone from `Avatar.SEED_TEMPLATE_PATH` (`/obj/Avatar/seed`) with a guest context `{ user, isGuest: true, guestName }`, transfer the Interactive, `await avatar.enter(interactive, { firstArrival: true })`, then `StuffApi.destruct(this)` — same handoff shape as `playCharacter`. The `isGuest: true` is stamped on the **Avatar** here. This is "minted on Enter," since `Login.enter` is the Enter moment.
- Authenticated path unchanged. (The model permits other mappings — anonymous→real, authed→guest — without touching flag homes; only this branch would change.)
**Modified:** `Avatar.ts` `AvatarInitContext` (:62) + `postRegister` (:217) — accept `isGuest` and `guestName`; stamp `this.isGuest = true`; **skip `PlayerApi.registerAvatar`** for guests (no `playerId`), apply the guest Named name. Add `isGuest` field + `getIsGuest()` predicate (runtime-only, not persisted).

**Destroy-on-disconnect**: the existing disconnect path (`Application.handleUserDisconnect` → `ConnectionManager.removeInteractive` → `Interactive.onDestruct` → `ConnectionApi.detach` → `onLinkdead`) leaves the Avatar alive for real users (reconnect). For guests, the Avatar must be **destructed on last-disconnect**. Add to `Avatar.onLinkdead` (already overridden to emit `PlayerLoggedOut`) a guest branch: `if (this.getIsGuest()) StuffApi.destruct(this)`. This reuses the documented `onLinkdead` 1→0 edge and the existing `Avatar.onDestruct` cleanup (which fires `save()` — guard that save for guests too, see 3d).

**3d. Don't-flush**
**Modified:** `packages/server/src/backend/inbound/clientState.ts` (:32) — before `await holder.save()`, `if (holder.getIsGuest?.()) return;` (after the in-memory `setClientState`). One precise skip.
**Modified:** `Avatar.onDestruct` (the fire-and-forget `save()`) — skip the save for guests so destroy-on-disconnect doesn't write a guest template. (`Avatar.startAutoSave` also installs a periodic `save()`; either don't start it for guests in `enter`, or have `save()` no-op for guests — **recommend not starting autosave for guests** in `enter`, cleaner.)

**3e. Recognizable guest identity (marker + reserved-word name)**
- **Name generation**: a guest name built from a **reserved word** + a `NameBank`-drawn distinguisher ("Guest Mallow"). The reserved word as a `title` AlternateName (`NameKind: 'title'`) or as the given name — recommend the **given name = reserved word, surname = NameBank distinguisher**, so it reads in plain text everywhere speech/emote attribution carries the Named name. Generate in the `/auth/guest` route or at mint time in `Login.enter`; draw the distinguisher via `NameBank.resolve([...])`.
- **Reserved word**: a single exported constant (e.g. `GUEST_RESERVED_WORD = 'Guest'`) — **no registry** (constraint). Home it where both the guest-name generator and the denylist guard import it. Candidate: a small constant in the identity lib (e.g. `lib/identity/guest.ts` as a constants module) — but per "no free-floating helper modules," if it grows beyond a constant, fold into an Api. A bare exported const is acceptable; flag placement at build.
- **`isGuest` marker**: the field stamped in 3c, observable to the system; drives don't-flush, mint-on-Enter, destroy-on-disconnect, and any future guest UI/scene treatment.

**3f. Impersonation guard**
**Modified:** `EnrollController.ts` (:98) — add the reserved word to `NAME_DENYLIST` (import the shared constant so the two stay in lock-step). The existing `validateNameToken` lowercase-compare already rejects it. Exact-word only (fuzzy/homoglyph is a non-goal).

**Tests** (server):
- `services/auth/__tests__/GuestAuthRoutes.test.ts`: `/auth/guest` establishes an anonymous session principal (session has a `passport.user` with an `anon:` id, no persisted account). **AC**: "A `/auth/guest` route mints an anonymous (ephemeral) session principal."
- Guest lifecycle test (Application/Login level): start-screen → Enter → lounge; avatar minted on Enter (not before), destroyed on disconnect. **AC**: matching bullet.
- Guest identity test: minted guest carries `isGuest` and a Named name containing the reserved word; name appears in speech/emote attribution (assert via a say/emote scene). **AC**: matching bullet.
- Don't-flush test: a guest `client-state-write` calls `setClientState` but **no** storage write (`save()` not called) — spy/mock the holder's `save`. **AC**: "asserting no storage write for a guest holder."
- Policy-gate test: gate admits anonymously today; flipping the gate's predicate rejects. **AC**: matching bullet.
- Denylist test: `enroll name Guest` (or the reserved word) is rejected for a real character. **AC**: "a non-guest cannot claim a guest-reading name."

---

## Phase 1 — Frame primitives + in-world frame (client)

**New:** `packages/client/src/components/frame/ConnectionIndicator.tsx`
- Quiet dot, **token-styled** (`tokens.color.accent` healthy, warning/error tokens for reconnecting/dropped — add tokens if missing rather than inline hex). Reads the `connection` slice; **silent when healthy**, visible only on `reconnecting`/`dropped`. Depends on Phase 0's `link` field (see risk).

**New:** `packages/client/src/components/frame/AccountMenu.tsx`
- Dropdown/popover off the identity label, **state-polymorphic** across logged-out / guest / signed-in (reads `auth.isAuthenticated` + the server-sent guest marker). Three content sets:
  - logged-out → the provider list + guest button (shared with the start screen — see Phase 2; the provider-list rendering should be a shared sub-component so the menu and the start screen compose the same thing, not duplicate).
  - guest → "sign in to save" + **leave world / switch character**.
  - signed-in → switch-character / **leave world** + **sign out** (the two distinct exits, slate Q4).
- **Logout** here calls `POST /auth/logout` then drives `connectionPhase` back to `unauthenticated` and closes the socket — **no `window.location.reload()`** (AC). This replaces `ConnectionStatus.handleLogout`'s reload (`ConnectionStatus.tsx:118`).
- Portrait next to the identity label: render `auth.player.portraitUrl` with an `onError` → placeholder fallback (client-side only; no broken-image icon). **AC**: "frame renders the portrait next to the identity label and falls back to a placeholder on image-load failure; a guest renders the placeholder."

**New:** `packages/client/src/components/frame/Frame.tsx` (or inline in `App.tsx`) — the **thin top-bar composition** of `ConnectionIndicator` + `AccountMenu`, token-styled. **No shared `Frame` wrapper across surfaces** (surface decision: shared primitives only). Reserved seams (mode-status slot, mode indicator, search) are named in the layout structure but render nothing (constraint: empty, not faked).

**Modified:** `packages/client/src/App.tsx`
- Replace `<ConnectionStatus />` at the `in-world` arm (:681) with the composed frame.
- Remove the `ConnectionStatus` import (:15).

**Deleted:** `packages/client/src/components/ConnectionStatus.tsx` (and its references). **AC**: "ConnectionStatus.tsx is deleted."

### Connection-loss (linkdead) behavior — in-scope for Phase 1

The server doesn't reap a real avatar (`Avatar.onLinkdead` just emits an
event), so a real user can reconnect any time and resume; guests are
reaped. The client encodes that asymmetry:

**Modified:** `store/index.ts` — replace the binary connected/disconnected
with the three-state `connection.link` (`connected` / `reconnecting` /
`dropped`). `setConnected` → `connected`; the reconnect loop sets
`reconnecting`; give-up sets `dropped`.

**Modified:** `services/websocket.ts` (`attemptReconnect`, :687; `onclose`, :180):
- **Exponential backoff over ~60s** replacing the fixed `reconnectDelay = 2000` × `maxReconnectAttempts = 5`. e.g. delays 1·2·4·8·16·30s; sets `link: 'reconnecting'` on each attempt, `link: 'dropped'` when exhausted. Reset on success (the existing `reconnectAttempts = 0`).
- **Routing on outcome**: a reconnect handshake that comes back **unauthenticated** (the `/auth/status` or upgrade rejects) → drive `connectionPhase` to `unauthenticated` (start screen). A **dropped guest** (the store knows `auth.player.isGuest`) → also start screen. An authed non-guest that gives up → stays `in-world` with `link: 'dropped'` (the Reconnect banner handles it).

**Modified:** `components/CommandBar.tsx` — **disable command send when `connection.link !== 'connected'`** (no queue): submit is a no-op with a subtle "disconnected — reconnecting…" hint. The player re-types after reconnect.

**New:** `components/frame/ReconnectBanner.tsx` — shown only when `link === 'dropped'` **and** authed-non-guest. A small persistent banner ("Connection lost") with a **Reconnect** button that resets `reconnectAttempts` and re-runs `connect()`; the cockpit/scrollback stay mounted underneath (context preserved). Not a modal, not a navigation.

**Tests** (client, `components/__tests__/` + `store/__tests__/`):
- `ConnectionIndicator.test.tsx`: invisible on `connected`, amber on `reconnecting`, red on `dropped`. **AC**: matching bullet.
- websocket/store test: `onclose` → `reconnecting` with backoff delays; exhaustion → `dropped`; unauthenticated reconnect → `unauthenticated` phase; dropped guest → start screen. **AC**: matching bullets.
- CommandBar test: submit is a no-op while `link !== 'connected'`; re-enabled on `connected`. **AC**: matching bullet.
- `ReconnectBanner.test.tsx`: renders only on `dropped` + authed-non-guest; button resets attempts and calls `connect()`; cockpit stays mounted.
- `AccountMenu.test.tsx`: contents differ per state (logged-out / guest / signed-in), distinct leave-world and sign-out items present. **AC**: matching bullet.
- Portrait fallback test (in AccountMenu or a dedicated test): `onError` swaps to placeholder; guest renders placeholder.

---

## Phase 2 — Plain-UI start screen (client)

**New:** `packages/client/src/components/StartScreen.tsx` (or `frame/StartScreen.tsx`)
- Replaces the inline `LoginContainer`/`LoginMessage`/`DevLogin` block in `App.tsx` (:637–656 and the styled-components :118–248) and the raw-hex styling (deleted, not ported — constraint).
- **Provider-button list** — data-shaped (an array the screen maps, not hardcoded anchors; constraint). Entries: Google (live `<a href>`/redirect to `/auth/google`), a Twitch slot **rendered but inert** (disabled/"coming soon"). No `last-used-provider` persistence (cut — inert with one live provider); the list just renders. **AC**: "provider list (Google + an inert Twitch slot)."
- **Guest button** — co-equal; calls `POST /auth/guest`, then connects (same session-minting flow as a provider button; client doesn't special-case it beyond the endpoint).
- **Dev-login folded in** — keep the existing `DevLogin` component's behavior but DEV-only (`import.meta.env.DEV`), with its current `useState('dev')` default (no persistence). **AC**: "(DEV only) the dev-login affordance."
- Composes the shared frame primitives (`ConnectionIndicator`, and the shared provider-list sub-component reused by `AccountMenu`) into a **full-screen layout** (not a top bar — surface decision).

**Modified:** `App.tsx` — the `unauthenticated` arm renders `<StartScreen />`. The styled-component login blocks and `DevLogin` move out.

**Logout-lands-here**: with `AccountMenu` driving `connectionPhase` → `unauthenticated` (Phase 1), the start screen is the logged-out state. **AC**: "Logout returns the app to the start screen without a full-page reload."

**Tests** (client): `StartScreen.test.tsx` — renders provider list (Google + inert Twitch) + guest + DEV dev-login. **AC**: matching bullets. Raw-`ConnectionStatus`-era styling absent (assert no legacy class/hex).

---

## Phase 6 — Subsystem doc + slate closeout

**New:** `docs/subsystems/client-shell.md` (decision (b)) — documents: the frame primitives (composition-not-inheritance, shared primitives not a shared Frame), the start screen + provider list, and the guest lifecycle (anonymous principal + avatar `isGuest` + mint-on-Enter/destroy-on-disconnect + don't-flush seam + reserved-word recognizability). Open with the one-line "this is a *client* subsystem doc" scope note. **AC**: "A subsystem doc … documents the frame primitives, the start screen, and the guest lifecycle." (No pre-auth tier to document — deferred to the slate.)

**Modified:** `docs/slates/client-shell-slate.md` — mark resolved open questions settled (guest anonymity already noted resolved; Q4 account-menu exits, Q6 start-screen-carries-frame) and record the pre-auth/device-local tier (Q9 + the pre-auth section) as **deferred — no v1 content**, with the reasoning (session cookie + server state cover this build; the tier waits for genuinely device-pinned content). **AC**: "the client-shell slate's resolved open questions … reflected as settled." (Slate is permanent/retired-only-when-absorbed; update in place per workflow doc.)

The requirements + plan docs themselves are retired at the pre-merge sweep (workflow doc), not in this cycle.

---

## Cross-cutting test/AC coverage summary

| Acceptance criterion | Test location | Phase |
|---|---|---|
| `ConnectionStatus.tsx` deleted; in-world renders new frame | delete + App render | 1 |
| `ConnectionIndicator` token-styled, 3 states (connected/reconnecting/dropped) | `ConnectionIndicator.test.tsx` | 1 |
| Backoff reconnect; link states; send disabled while down (no queue) | websocket/store + CommandBar tests | 1 |
| Dropped: Reconnect banner (authed non-guest, context kept); unauth/guest → start screen | `ReconnectBanner.test.tsx` + store tests | 1 |
| `AccountMenu` state-polymorphic, distinct exits | `AccountMenu.test.tsx` | 1 |
| Start screen: provider list + inert Twitch + guest + DEV dev-login | `StartScreen.test.tsx` | 2 |
| Portrait resolution (`getPortraitUrl()`: setting → account photo → placeholder) reaches payload | `getPortraitUrl` test / Avatar.enter | 5 |
| Frame renders portrait, image-fallback, guest placeholder | AccountMenu/frame test | 1 |
| Logout → start screen, no reload | AccountMenu logout | 1/2 |
| `/auth/guest` mint; start→Enter→lounge; mint-on-Enter; destroy-on-disconnect | `GuestAuthRoutes.test.ts` + lifecycle | 3 |
| `isGuest` marker + reserved-word name in attribution | guest identity test | 3 |
| denylist rejects guest-word for real char | EnrollController test | 3 |
| guest clientState not persisted (no `save()`) | clientState handler test | 3 |
| single policy gate (admits/rejects on flip) | gate test | 3 |
| no new localStorage in client diff | grep / review | — |
| subsystem doc | `client-shell.md` | 6 |
| slate questions settled | slate edit | 6 |

---

## Critical files

- `packages/client/src/App.tsx` (phase switch; delete `ConnectionStatus` render, mount frame + start screen)
- `packages/client/src/services/websocket.ts` (`onclose`/`attemptReconnect`: exponential backoff ~60s, `connection.link` states, unauth/guest → start-screen routing)
- `packages/client/src/components/CommandBar.tsx` (disable send while `link !== 'connected'`, no queue) + new `components/frame/ReconnectBanner.tsx`
- `packages/server/src/mud/obj/Login.ts` (guest mint-on-Enter branch in `enter()`)
- `packages/server/src/mud/lib/connection/HasInteractive.ts` (`getPortraitUrl()` — one method: setting via `resolveSetting` → account photo → placeholder; the connect-time portrait, on both Login and Avatar)
- `packages/server/src/mud/obj/Avatar.ts` (`isGuest` marker, guest postRegister/onLinkdead/save guards, `portraitUrl` in the `enter` payload)
- `packages/server/src/backend/inbound/clientState.ts` (the single don't-flush `save()` skip)
- `packages/server/src/services/auth/AuthRoutes.ts` (sibling for the new `GuestAuthRoutes` + the `/auth/status` portrait surface)
- `packages/server/src/mud/obj/command/charactergen/EnrollController.ts` (reserved-word denylist guard at the `NAME_DENYLIST` constant)
