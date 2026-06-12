# Client shell — frame, start screen & anonymous guest — requirements

This cycle builds the **front door** of the game client: it replaces
the debug `ConnectionStatus` block with a thin composed frame, turns
the bare `unauthenticated` login-takeover into a real **plain-UI start
screen**, and adds an **anonymous guest** path into the world. It is the
lead slice of Track A in
[client-shell-slate.md](../slates/client-shell-slate.md) — the smallest
coherent unit that makes `mud.panterasbox.com` presentable instead of
showing debug instrumentation.

The pieces ship together because they are coupled: the logged-out
`AccountMenu` *is* the start screen's provider list, and the guest
button is a start-screen affordance. Splitting them would ship fake
props (a guest button that does nothing).

**No client-side persistence.** Everything this build needs to remember
lives behind the **session cookie** (auth/session) or in
**server-authoritative state** reached over the bus once authed —
consistent with "anything that matters lives on the server." There is
**no localStorage / device-local tier** in this cycle: nothing in scope
needs persistence the session cookie doesn't already provide. The
pre-auth client-state *category* remains a real future concept (it gains
content when something genuinely device-pinned exists — per-device
performance toggles, a pre-auth theme cache) but is **deferred** to the
slate, not built here. See non-goals.

## Goals

- **The debug `ConnectionStatus` block is gone.** Its keep-worthy bits
  (identity, logout, connection-when-degraded) survive as composed
  frame primitives; the rest (auth label, socket id, WS-state row, raw
  hex styling) is deleted.
- **`ConnectionIndicator` exists** — a quiet, design-token-styled
  connection primitive that is silent when the bus is healthy and
  speaks up only on reconnecting/dropped. Driven by a **three-state**
  `connection.link` (`connected` / `reconnecting` / `dropped`) added to
  the store. Shared component, composed by both the in-world frame and
  the start screen.
- **Connection loss is a defined experience, not undefined behavior.**
  When the socket drops: the client **auto-reconnects with exponential
  backoff (~60s window)** — riding through a server restart since the
  server doesn't reap a real avatar; **command send is disabled** while
  down (no queue); and on give-up a **persistent "Reconnect" affordance**
  appears that resets attempts and resumes, **preserving cockpit
  context** (never a silent bounce to a dead page). A successful
  reconnect is seamless (subscriptions already re-issue; no welcome
  replay). Routing exceptions: a reconnect that comes back
  **unauthenticated** → start screen (re-auth); a **dropped guest** →
  start screen (their reaped avatar can't resume).
- **`AccountMenu` exists** — a dropdown/popover off the identity label,
  **state-polymorphic** across logged-out / guest / signed-in, with the
  two account exits (**leave world / switch character** vs **sign out**)
  as distinct items. Shared component.
- **The in-world top frame is a thin composition** of
  `ConnectionIndicator` + `AccountMenu`, design-token styled, replacing
  the `ConnectionStatus` render at the `in-world` phase. No mode
  indicator, no search box, no per-mode status content (all reserved
  seams, see non-goals).
- **A portrait shows in the frame from the moment of connection**,
  making login state and identity visible. The **account photo**
  (`GoogleProfile.photoUrl`) is available as soon as the session
  connects — it paints on the start screen / character-select, not only
  in-world — because the resolution lives on the **connection layer**
  (`HasInteractiveMixin`, present on both pre-world `Login` and in-world
  `Avatar`), not on the Avatar alone. In-world, a **per-character
  override** layers on top: an `identity.portrait` **setting** (the
  existing `settings` keyspace) that, when **unset, resolves on read to
  the account photo**, then to a generated placeholder; players override
  it via the `settings` command. The resolved URL is plumbed to the
  client alongside the existing `displayName`; a broken URL falls back
  gracefully to the placeholder (no broken-image icon). Guests get the
  placeholder (no profile, no saved settings).
- **A real plain-UI start screen** replaces the `unauthenticated`
  login-takeover: a **provider-button list** (Google live; a Twitch
  slot rendered but not wired), a co-equal **guest** button, and the
  dev-login affordance folded in (dev builds only). It composes the
  shared frame primitives into its own full-screen layout rather than a
  top bar.
- **Logout lands on the start screen** — a real logged-out state, never
  a `window.location.reload()` to a dead page.
- **Anonymous guest works end to end:** the guest button mints an
  ephemeral guest session principal, the existing WS upgrade gate
  accepts it unchanged, a throwaway avatar is minted **on Enter** (not
  page-load), it is destroyed on disconnect, and its `clientState` is
  **never flushed** to storage.
- **Guests are unmistakably recognizable as guests.** Two reinforcing
  mechanisms: (a) an explicit **`isGuest` marker** on the guest avatar
  (machine-readable — drives the don't-flush, mint-on-Enter, and any
  guest UI/scene treatment); and (b) a **distinguishable guest name**
  built from a **reserved word** (e.g. a `Guest` title + a NameBank-
  drawn distinguisher → "Guest Mallow") so guest-ness shows in plain
  text wherever the name appears — speech/emote attribution, look,
  logs — not just a UI badge. The reserved word is **withheld from real
  character naming** so a real player cannot impersonate a guest.
- **Guest minting is a single policy gate** — one server-side decision
  point ("may this connection mint a guest avatar?") so the path can be
  demoted to post-sign-in if abused, as a config change rather than a
  rearchitecture.
- **No client-side persistence is added.** The session cookie plus
  server-authoritative state are the complete persistence story for this
  build; no localStorage / device-local tier ships (see the framing
  above and non-goals).
- **A subsystem doc** captures the shell frame (primitives + start
  screen + guest lifecycle) so later Track A/B work (search, modes, the
  public surface) extends a documented substrate.

## Non-goals

Each names where it lands.

- **Search primitive / command palette** — the next Track A step after
  this one (client-shell-slate Track A sequencing). Not in this cycle.
- **`ModeIndicator` / mode switcher** — the slate forbids a switcher
  before there are ≥2 live modes; there is only RPG mode now. Reserved
  seam, not built.
- **Per-mode status region content** — the frame's layered-status slot
  beside `ConnectionIndicator` stays empty: RPG mode's natural status is
  vitals, and vitals is deliberately substrate-only with no widget
  (vitals-slate). We do not paint a fake gauge (props-real-or-cut).
- **Twitch auth mechanics** — token/scope/account-linking flow is
  [auth-providers-slate](../slates/auth-providers-slate.md). This cycle
  renders the provider *list* with a Twitch slot but wires only Google.
- **Declarative mode/manifest model** — extracted at mode #2 per the
  slate; this cycle is plain composition.
- **Author mode / CMS surface** — [cms-slate](../slates/cms-slate.md);
  only noted as a future frame seam, not built.
- **Public read-only surface / gamestate projector** — Track B.
- **Char-gen internals** — the start screen hands off to the existing
  `CharGenStage` / `enroll` flow unchanged (char-gen-wave1). No
  redesign of character creation.
- **Pre-auth client-state tier / localStorage of any kind** — deferred
  entirely. Nothing in this build needs persistence beyond the session
  cookie + server-authoritative state. The device-local tier (per-device
  performance toggles, pre-auth theme/a11y caches, identity-scoped key
  sync) is a real future concept kept in the slate; it is built when it
  has actual content, not now. `last-used-provider` in particular is
  inert with a single live provider, and `dev-login-name` is dev trivia
  the existing `useState` default already covers.
- **Persisted guest state of any kind** — guests persist nothing tied
  to identity, by decision.
- **Server-side portrait URL validation** — reachability / content-type
  / SSRF guarding is deferred; v1 relies on the client image-load
  fallback. Add when there's a reason to.
- **Roster / character-select portraits** — this cycle renders the
  portrait for the *current* character in the frame; showing each
  character's portrait in the `CharacterSelect` roster is a natural
  extension, out of scope unless it falls out for free.
- **Fuzzy / homoglyph guest-name impersonation** — only exact-word
  reservation ships; near-misses ("Gueest", leetspeak, lookalike
  Unicode) are a deeper name-sanitization problem deferred to whenever
  name moderation is taken up generally.

## Surface decisions

### Frame reuse: shared primitives, not a shared Frame component

**Question** (slate Q6): does the start screen and the in-world view
share one `Frame` wrapper component, or just share the primitives?

**Decision:** Shared **primitives** (`ConnectionIndicator`,
`AccountMenu`), composed differently per phase. The start screen
arranges them in its own full-screen layout (the account area *is* its
content); the in-world view arranges them in a thin top bar. **No
single `Frame` wrapper is built this cycle** — extracting one is N=2
speculation the slate explicitly defers; it gets extracted later when a
third surface (CMS, public) makes the real commonality visible.

### Guest identity: reserved-word name, no char-gen, recognizable

**Question:** what identity does an anonymous guest get, and how is it
kept recognizable / non-impersonable?

**Decision:** a generated proper name combining a **reserved guest word**
(e.g. the title `Guest`) with a `NameBank`-drawn distinguisher
(`lib/species/NameBank.ts`) — "Guest Mallow" — and **no char-gen**. The
guest goes logged-out → guest button → straight into the lounge with
zero identity choices. This keeps guest the fastest path in, keeps
char-gen as the saved-character flow only, and makes guest-ness legible.

Recognizability rests on two reinforcing mechanisms, deliberately not
one:

- **`isGuest` marker** on the avatar — the machine-readable truth.
  Already needed for don't-flush and mint-on-Enter; reused to drive any
  guest-specific display (a client badge in the frame, a marker in
  look/scene rendering). A marker alone is insufficient because it
  doesn't travel into relayed/attributed text.
- **Reserved word in the name** — the *text* signal. Because speech and
  emote attribution carry the Named name (per the "no name-gating for
  talkative NPCs" rule, a name shows the moment someone speaks), the
  guest word rides along into every attributed line and log, where a
  badge can't reach.

**Impersonation guard:** the reserved word is added to the char-gen /
`enroll` name-validation denylist, so a real character cannot take a
name that reads as a guest. Exact-word reservation only; fuzzy/homoglyph
near-misses ("Gueest") are out of scope (see non-goals).

The exact reserved word and name shape (title vs surname, one word vs a
small set) are the planner's call; the requirement is that the word is
reserved and the name is unmistakable in plain text.

### Guest reaches the bus via an anonymous principal

**Question:** the WS upgrade gate rejects any connection without
`session.passport.user.id` (`WebSocketService.ts`). How does an
anonymous guest get on the bus without loosening that gate?

**Decision:** a `/auth/guest` route mints an **anonymous (ephemeral)
session principal** and logs it into the session — the same mechanism
the existing dev-login path already uses to mint a non-OAuth session.
The WS upgrade gate is **unchanged**: it sees a valid `passport.user.id`
and proceeds.

**Two orthogonal axes — do not conflate them.** What travels on the
principal is **authentication state** (anonymous / ephemeral, no
persisted account) — a legitimate session/account concern. **Guest-ness
is not that.** `isGuest` is a **character-level (Avatar) attribute**:
"this avatar is a throwaway persona." The two are independent — an
anonymous session driving a real character, or an authed user a
throwaway one, are both coherent in the model; today's UX simply maps
anonymous→guest. That mapping lives in **one policy spot** (`Login`'s
mint-on-Enter branch), never welded into a flag's home. Concretely:

- The **session/account** carries only the auth distinction (real
  persisted `User` vs ephemeral anonymous principal).
- The **Avatar** carries `isGuest`, set when the guest avatar is minted.
- Every guest *behavior* — don't-flush, destroy-on-disconnect, reserved
  name, client badge — reads the **Avatar's** `isGuest`, never the
  session's auth state.

### Guest lifecycle: mint on Enter, destroy on disconnect, never flush

**Decision:** the guest avatar is minted at the moment of crossing into
the lounge (Enter), not on page-load or on guest-session creation —
honoring the slate's anti-churn rule (no bodies for people who didn't
choose to enter). It is destroyed on disconnect. Its `clientState`
writes still ride the bus and call `setClientState()` in memory, but
the **`holder.save()` step in `inbound/clientState.ts` is skipped when
the holder avatar's `isGuest` is set** — the single, precise don't-flush
seam, keyed on the character attribute, not the session. (Guest avatars
are unsaveable anyway; this makes the skip explicit and intentional
rather than incidental.)

### Abuse seam: one mint-a-guest policy gate

**Decision:** whether an unauthenticated connection may mint a guest
avatar is a **single server-side policy point** — the `/auth/guest`
route's admission check. Today it admits anonymously. If abused, it is
changed to require an existing authed session, and the guest button
relocates from the logged-out screen to character-select — a config/
policy change, not a rearchitecture. Rate-limit / one-guest-per-IP /
captcha-before-mint all hang off this same gate and are **not built
now**; the gate is the only thing that must exist.

### Character portrait: a per-character setting, account-photo fallback

**Question:** is the topbar avatar account-level (the logged-in human)
or per-character?

**Decision:** **per-character portrait** — each character carries its
own face, set through the existing per-character `settings` keyspace
(`EnvironmentMixin` on Avatar). This reuses the settings infrastructure
and gives characters identity, at the cost of the topbar avatar tracking
the *character* rather than the login account (an accepted trade — the
account actions still live in the `AccountMenu`).

**Default resolution (resolve-on-read, not baked):** the portrait
setting is *unset* by default. The effective portrait resolves at read
time: `setting value` → account `GoogleProfile.photoUrl` → generated
placeholder. The Google URL is **never written into the setting** —
baking it would freeze it stale (Google photo changes wouldn't
propagate) and duplicate account data; leaving the setting unset keeps
"default" legible and always reflects the current account photo until
the player explicitly overrides. All of an account's characters fall
back to the same account photo until each is individually overridden.

**Resolution home is the connection layer, available from connect.** It's
**one method** (`getPortraitUrl()`) on `HasInteractiveMixin` — the layer
present from the moment a session connects, on **both** the pre-world
`Login` and the in-world `Avatar` — so the **account photo paints at the
start screen / character-select**, not only in-world ("show it as soon as
they connect"). The method just reads the `identity.portrait` setting
(which is simply empty on a `Login`, so no per-layer override is needed),
then falls back to the account photo, then the placeholder. It is
explicitly **not** a new Api method (no `DescribeApi` addition — that Api
is being end-of-lifed; presentation resolves as a method on the host,
like the other `player.*` fields). The same account-photo fallback is
reused by HTTP `/auth/status` for the earliest pre-WS paint.

**Validation:** v1 validation is **client-side only** — a failed image
load falls back to the placeholder (free, robust, no broken-image icon).
Server-side URL validation (reachability, content-type, SSRF guarding)
is **deferred** — it's the "ugly" part and not needed for a graceful
experience.

### No client-side persistence in this build

**Question:** the slate frames a client-authoritative, off-bus pre-auth
state tier. What of it does this build need?

**Decision:** **none of it.** Nothing in scope requires persistence the
**session cookie** doesn't already provide: auth/session lives in the
cookie, and everything that matters lives in **server-authoritative
state** reached over the bus once authed. The two keys this was going to
hold both evaporate on inspection — `last-used-provider` is inert with a
single live provider (Google; Twitch is an inert slot), and
`dev-login-name` is dev trivia the current `useState('dev')` default
already covers. Building a typed localStorage slice for them is exactly
the premature abstraction the codebase pushes back on.

The pre-auth client-state *category* stays real as a future concept (it
gains content when something genuinely device-pinned exists — per-device
performance/capability toggles, a pre-auth theme cache that paints
before the bus delivers the real snapshot) and is documented in the
slate. It is **deferred there, not built here.** This build adds no
localStorage and no device-local store slice.

### Connection loss (linkdead) on the client

**Question:** the server already handles linkdead (`Avatar.onLinkdead`
emits an event and **does not reap** a real avatar; the guest path
reaps). What should the *client* do when the WebSocket drops? Today
everything collapses to `setDisconnected()` — no retry/give-up
distinction, no input gating, and the only surface was the
`ConnectionStatus` block being deleted.

**Spine:** the real-avatar-persists vs guest-is-reaped asymmetry. A real
user can reconnect *any time* and resume the same body, so the client
should be generous and preserve context; a guest has nothing to resume.

**Decisions:**

- **Three link states** — `connected` / `reconnecting` / `dropped` on a
  new `connection.link` store field, replacing the binary
  connected/disconnected. The `ConnectionIndicator` renders off it
  (quiet → amber "reconnecting…" → red persistent "dropped").
- **Auto-reconnect with exponential backoff over ~60s** (replacing the
  fixed 5×2s). Because the server doesn't reap a real avatar, a longer
  window lets users ride straight through a server restart (standup
  deploy) without acting.
- **Disable command send while down; never queue.** A buffered command
  replayed into a resumed world is a MUD foot-gun. The command bar
  refuses submits and shows a subtle disconnected hint; the player
  re-types after reconnect.
- **On give-up (real user): a persistent "Reconnect" affordance, context
  preserved.** A small banner whose button resets attempts and retries;
  the cockpit/scrollback stay. **Never** a silent bounce to a dead page —
  the avatar is still there to resume.
- **Successful reconnect is seamless** — subscriptions already re-issue
  on `connection-established` and welcome-scene-on-reconnect is already
  suppressed; the client just re-enables input and clears the banner.
- **Routing exceptions to the start screen** (the two cases where there's
  nothing to resume): a reconnect that returns **unauthenticated**
  (session cookie dead → re-auth needed), and a **dropped guest** (their
  avatar was reaped). Both land on the start screen, not the cockpit.

## Constraints

- **Design tokens, not raw values.** The new frame primitives and start
  screen use the `components/ui` token set. The current
  `ConnectionStatus` raw-hex styling (`#f9f9f9`, `#22c55e`, …) is part
  of what gets deleted, not ported.
- **Don't special-case guests on the client.** Guest-ness is entirely a
  server-side concern (anonymous principal + avatar `isGuest` +
  don't-flush + reserved name). The start screen's guest button is just
  another session-minting action; any guest UI treatment is driven by
  the `isGuest`/name the server sends, not a client-side guess.
- **Guest recognizability is text-first, not badge-only.** The reserved
  word must live in the Named name itself so it survives speech/emote
  attribution and logs; a client badge is an addition, not the
  mechanism. The reserved-word denylist lives in char-gen name
  validation as a simple constant (no registry — per the no-premature-
  registries posture).
- **The WS upgrade gate is not loosened.** Guest reaches the bus by
  having a real `passport.user.id` (ephemeral principal), not by
  weakening `WebSocketService`'s admission check.
- **The phase machine stays the driver.** The start screen, guest, and
  logged-out states are expressed through the existing
  `connectionPhase` store machinery (`unauthenticated` /
  `character-select` / `char-gen` / `in-world`), not a parallel routing
  layer. Logout drives the phase back to `unauthenticated`, which now
  renders the real start screen.
- **Provider list is data-shaped.** The logged-out button set is a list
  the start screen renders, not hardcoded anchors (the current
  `App.tsx` Google `<a href>` is what this replaces). Adding Twitch
  later is adding a list entry + wiring, not editing JSX structure.
- **Reserved seams stay empty, not faked.** The mode-status slot, mode
  indicator, search box, and author-mode seam are named in the layout's
  structure but render nothing until their own cycles — no placeholder
  gauges or dead buttons.
- **The portrait default is resolve-on-read, not a stored value.** The
  account `GoogleProfile.photoUrl` is a fallback in the resolution
  chain, never copied into the per-character setting. The setting holds
  only an explicit override. Follows the schema-declared-default
  convention of `EnvironmentMixin` (an unset setting is observably
  unset; see [shell-environment.md](../subsystems/shell-environment.md)).
- **Presentation resolves on the host, not via a new Api.** Portrait
  resolution is one instance method on `HasInteractiveMixin`
  (setting → account photo → placeholder), sourced the same way the
  other `player.*` fields are. **No `DescribeApi` addition** — that Api
  is being end-of-lifed; nothing new is added to it, and
  presentation/display attributes resolve as methods on the entity.

## Acceptance criteria

- `ConnectionStatus.tsx` is deleted (or reduced to nothing the app
  renders); the `in-world` phase renders the new thin frame instead.
- `ConnectionIndicator` is a standalone component, token-styled, that
  visibly changes only on non-healthy connection states; covered by a
  client test over the three-state `connection.link` slice
  (connected → invisible; reconnecting → amber; dropped → red).
- On socket close the client auto-reconnects with **exponential backoff
  (~60s window)**, sets `connection.link` to `reconnecting` during and
  `dropped` on give-up, and **disables command send** (no queue) while
  not `connected`; covered by client tests over the websocket
  client/store and the command bar.
- On give-up for an authenticated non-guest, a **persistent Reconnect
  affordance** is shown and the cockpit context is preserved (no
  navigation away); its button resets attempts and retries. A reconnect
  returning **unauthenticated**, and a **dropped guest**, both route to
  the start screen. Covered by client tests over each branch.
- `AccountMenu` is a standalone dropdown component whose contents differ
  across logged-out / guest / signed-in, with distinct leave-world and
  sign-out items; covered by a client test per state.
- The `unauthenticated` phase renders the start screen: a provider list
  (Google + an inert Twitch slot), a guest button, and (DEV only) the
  dev-login affordance. No raw `ConnectionStatus`-era styling remains.
- Portrait resolution is **one** method on `HasInteractiveMixin` —
  `identity.portrait` setting → account photo → placeholder; **no new
  Api / no `DescribeApi` addition, no override hook**. Covered by a
  server test over the chain (unset → account photo → placeholder;
  set → the set value). The resolved URL reaches the client in the
  identity payload.
- The account photo is available **from connection** (the resolution is
  on the connection layer): the pre-world frame / `/auth/status` carries
  it so the start screen / character-select can paint the portrait
  before in-world.
- The frame renders the portrait next to the identity label and falls
  back to a placeholder on image-load failure; a guest renders the
  placeholder. (No server-side URL validation in v1.)
- Logout returns the app to the start screen without a full-page reload
  to a dead page.
- A `/auth/guest` route mints an anonymous (ephemeral) session
  principal; a guest can go start-screen → Enter → lounge, with the
  avatar minted on Enter and destroyed on disconnect. Covered by a
  server test.
- A minted guest avatar carries an `isGuest` attribute and a Named name
  containing
  the reserved guest word (e.g. "Guest Mallow"); the marker is
  observable to the system and the name appears in speech/emote
  attribution. Covered by a server test.
- Char-gen / `enroll` rejects a real character name that uses the
  reserved guest word; covered by a server test (a non-guest cannot
  claim a guest-reading name).
- A guest's `clientState` write does **not** persist: the `save()` in
  `inbound/clientState.ts` is skipped when the holder avatar's `isGuest`
  is set; covered by a server test asserting no storage write for a
  guest holder.
- The mint-a-guest admission decision is a single, identifiable policy
  point a test can exercise (admits anonymously today; a flipped policy
  rejects).
- No localStorage / device-local store is added; the build relies only
  on the session cookie + server-authoritative state. (A reviewer
  grepping the client diff finds no new `localStorage` use.)
- A subsystem doc (e.g. `docs/subsystems/client-shell.md`) documents the
  frame primitives, the start screen, and the guest lifecycle (anonymous
  principal + avatar `isGuest` + don't-flush + reserved name).
- The client-shell slate's resolved open questions (guest anonymity,
  frame reuse) are reflected as settled; the pre-auth/device-local tier
  is recorded as deferred (no v1 content).

## Cross-references

- **Seeding slate:** [client-shell-slate.md](../slates/client-shell-slate.md)
  (frame/body decomposition; the pre-auth client-state section, the
  public surface, and modes are out of scope here — the pre-auth tier in
  particular is deferred there with no v1 content).
- **[auth-providers-slate.md](../slates/auth-providers-slate.md)** — the
  provider-list mechanics, Twitch, guest-vs-account posture. This cycle
  consumes "render a list" + the anonymous-guest decision; Twitch wiring
  is deferred there.
- **char-gen-wave1** (`CharGenStage`, `enroll` / `EnrollController`,
  `NameBank`) — the saved-character flow the start screen hands off to,
  the guest name source, and the home of the name-validation step that
  gains the reserved-guest-word denylist. Otherwise not modified here.
- **[shell-environment.md](../subsystems/shell-environment.md)** — the
  per-character `settings` keyspace + schema-on-mixin the portrait
  setting rides; the `settings` command is the override surface.
- **Client code seams:** `App.tsx` phase switch + `ConnectionStatus.tsx`
  (replaced), `store/index.ts` `connectionPhase` + `clientState` +
  `displayName` (the identity payload the portrait URL rides alongside),
  `services/websocket.ts` (`sendClientStateWrite`), `components/ui`
  tokens.
- **Server seams:** `services/websocket/WebSocketService.ts` (upgrade
  gate, unchanged), `services/auth/AuthRoutes.ts` +
  `services/auth/PassportConfig.ts` + the dev-login route (guest
  principal precedent), `backend/inbound/clientState.ts` (the
  don't-flush seam), `mud/obj/Avatar.ts` (guest avatar lifecycle),
  `mud/lib/identity/GoogleProfile.ts` (`photoUrl`, already captured at
  signup — the portrait fallback source).
- **vitals-slate** — why the per-mode status slot ships empty.
