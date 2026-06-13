# Client shell slate (working doc)

> **Status: shape proposed.** The architectural layer *above* the
> cockpit. The client is one core (the command/message bus +
> subscriptions + design system) wrapped by **surfaces** — distinct
> front-ends over that bus — and within an interactive surface the
> chrome decomposes into a thin **frame** (constant, cross-mode) plus a
> **mode body** (the composed regions for what you're doing). The frame
> is a small set of **shared primitives composed, not subclassed**:
> connection indicator, account menu, mode indicator, **search**. Three
> surfaces: the **game client** (the cockpit + its modes), the **CMS**
> (sibling authoring shell), and a new **public read-only gamestate
> surface** (unauthenticated, for OBS overlays + degraded-server
> metrics). Everything signed-in flows through a **plain-UI start
> screen** (no diegetic metaphor — the lounge is the first room, always;
> anything before it is nowhere). The concrete trigger: the live
> deployment at `mud.panterasbox.com` needs a presentable front instead
> of the debug `ConnectionStatus` block.

This slate is about how the client *shell* is organized so that many
functional use-cases — playing, studying, authoring, viewing a stream,
running a stream — ride one bus without each reinventing chrome, and so
that adding a use-case is composing existing parts rather than building
a new app. It deliberately does **not** re-specify the cockpit's
internals (click model, MQL widgets, content surface) — those live in
the cockpit slate. It frames them.

See also:

- [client-cockpit-slate.md](./client-cockpit-slate.md) — the **game
  client's body**. Its `## Modes` (World/Study/Classroom/Tutor), the
  click model, MQL-subscription widgets, the content surface, and
  char-creation Track 3 are all *inside* the game surface this slate
  wraps. This slate generalizes its "always-on minimum" into a
  cross-surface frame and its mode catalogue into the full use-case
  matrix.
- [cms-slate.md](./cms-slate.md) — the **CMS surface**. Same session,
  separate tab, client-heavy over the same backend; the author↔test
  dev loop is the live coupling between the game and CMS surfaces.
- [auth-providers-slate.md](./auth-providers-slate.md) — sign-in gates
  every surface except the public read-only one. Google + Twitch
  co-equal; the keystone under streamer use-cases.
- [external-chat-relay-slate.md](./external-chat-relay-slate.md) —
  Twitch chat ↔ game channel. The *chat* half of streaming; this
  slate's public surface is the *gamestate-rendering* half (overlays).
- [state-sync-slate.md](./state-sync-slate.md) — perception-scoped
  world deltas to **authed** clients. The public surface's projector is
  a sibling: it consumes gamestate internally with full trust and
  emits a *narrower, unauthed* projection.
- [char-gen-slate.md](./char-gen-slate.md) + the `feature/char-gen-wave1`
  implementation (`CharGenStage`, `enroll`/`EnrollController`) — the
  pre-world char-gen flow the start screen hands off to. (Supersedes
  the cockpit slate's modal Track 3.)
- [lounge-slate.md](./lounge-slate.md) — the **first room**, locked in
  its own slate. Not redesigned here; it's the boundary where plain UI
  ends and the world begins.
- [onboarding-slate.md](./onboarding-slate.md) — starts at campus
  arrival, downstream of the lounge. Not touched here.
- [mql-subscription-slate.md](./mql-subscription-slate.md) +
  [inspection-pane-slate.md](./inspection-pane-slate.md) — the
  live-state substrate the game body's regions consume.
- [docs/deployment.md](../deployment.md) — `mud.panterasbox.com`, the
  single-box deploy this is meant to make presentable; metrics surface
  reads the same health concerns.

---

## Principle

**One bus, many surfaces. Shared core, composed chrome.** The command/
message bus, MQL subscriptions, auth/session, MML rendering, and the
design-system tokens are the constant core. Everything a use-case adds
on top is a *composition* of regions over that core — never a new
parallel engine. A new use-case (a vertical, a streaming setup, an
admin tool) is expressed as which regions go where + which capabilities
are present, not as a from-scratch app.

Two corollaries fix the chrome:

1. **No universal status block.** What "status" means is use-case-
   specific; the only genuinely shared status is *the bus itself*
   (connection/session). A one-size status surface is a category error
   — it's exactly why the current `ConnectionStatus` reads as useless
   debug noise. Status is layered: one shared connection primitive + a
   per-mode status region beside it.
2. **No universal nav.** Not every surface even wants a top bar (an OBS
   overlay must have none). The *concern* (connection / identity / mode
   / search awareness) is common; its *placement* is per-surface.
   Decouple the two.

---

## Surfaces over the bus (the three front-ends)

| Surface | Audience | Auth | Transport |
|---|---|---|---|
| **Game client** | players (incl. elevated authors) | required | full bus |
| **CMS** | authors/builders | required | full bus (cms-slate) |
| **Public read-only** | OBS, anyone, status-watchers | **none** (machine/none) | dedicated read-only projection |

They share auth (where present), the design system, and — for the two
authed surfaces — the bus and a set of **shared entity/inspection
components** (the author↔test loop wants "inspect this in the game" /
"edit this in the CMS" to be the same thing). They do **not** share a
layout. The game disappears into the world; the CMS is a workbench;
the public surface is output-only. Forcing one chrome over all three
compromises all three.

The game and CMS are "separate shells coupled at the authoring seam,"
not isolated apps — see [cms-slate.md](./cms-slate.md) for the dev-loop
coupling (one session, two tabs, cross-tab state awareness, gated
`write` ops). This slate only notes that the **game surface needs an
author mode** that surfaces authoring/test status (HMR, eval output,
entity-under-test) and on-the-spot "edit/reload this" affordances —
the in-game half of that loop. Author chrome is a *reserved seam* in
the frame, not built first.

---

## The frame / body decomposition

Within an interactive surface the chrome is two layers:

- **Frame** — the thin, always-true chrome. Carries only what's
  constant across every mode of that surface: identity/account,
  connection awareness, current-mode indicator, search. Small.
- **Body** — the mode-specific composition of regions (terminal,
  command bar, inspection pane, content/lesson surface, dashboard
  widgets, stream embed, …) drawn from a shared region library.

This generalizes the cockpit slate's **"always-on minimum"** (status
header + prompt + input + notification chip): that's the *game
surface's frame*, scoped to in-world. The shell frame is the same idea
lifted across the pre-world ↔ in-world boundary and across surfaces —
and it adds three primitives the always-on-minimum never needed because
it assumed you were already embodied: an **account menu**, a quiet
**connection indicator**, and **search**.

The redesign that started this slate is exactly: **replace the
`ConnectionStatus` block with the frame.** Most of that block is debug
instrumentation (auth label, WS state, socket id) and just gets
deleted; the keep-worthy bits (identity, logout, connection-when-
degraded) become frame primitives.

---

## Shared primitives (composition, not inheritance)

Common look-and-feel comes from a small library of **shared primitive
components** + the design tokens — not from a base layout class that
modes subclass. Modes *drop in* the primitives they want and arrange
them. (Inheritance would couple every mode to a base layout's
assumptions; the OBS overlay needs to take `ConnectionIndicator` and
nothing else.)

Frame primitives (initial set):

- `ConnectionIndicator` — quiet dot; speaks up only on reconnecting/
  dropped. The one genuinely **unified** status (it's about the bus,
  which every authed surface literally shares).
- `AccountMenu` — identity + account actions. **A dropdown/popover off
  the identity label from day one** (not inline buttons): the state-
  polymorphism below shows up immediately once the start screen + guest
  exist, so the menu container earns its place rather than being N=1
  speculation. Reserve a **drawer** as the growth path when contents
  accrete past what a dropdown holds comfortably. Contents vary by
  state: logged-out → the provider buttons (Google now, Twitch later) +
  guest; guest → "sign in to save" + leave-world; signed-in → roster /
  switch-character / settings / leave-world / sign-out. Note two
  distinct actions worth not conflating: **leave world / switch
  character** vs **sign out of the account**.
- `ModeIndicator` — current mode; a switcher only when there are modes
  to switch (don't build a switcher before there are ≥2 live modes for
  a user).
- `SearchInput` — see [Search](#search-as-a-frame-primitive).

**Decouple concern from placement.** "Connection/identity/mode/search
awareness" is the shared *concern*. Whether it sits in a top bar is a
per-surface layout decision: the game puts it top; the public overlay
puts it nowhere; a streamer dashboard might put it in a sidebar. So
"is it always a top nav?" — no. The primitives are common; their
arrangement is the mode's call.

**Layered status.** Connection/session = one shared primitive,
identical everywhere. Mode status (game vitals, HMR/eval state, on-air
state) = each mode's own region, composed next to the shared one. Not
"unified vs each-their-own" — both, layered.

---

## Modes generalize the cockpit's mode axis

The cockpit slate's modes (World/Study/Classroom/Tutor) are *in-game,
server-driven, cognitive-load layout reshapes*. This slate keeps that
mechanism and **widens the catalogue** to the full use-case matrix.
"Mode" = a *functional capability-set* (not cosmetic — avoid "skin"),
expressed as a body composition + its own status + its own chrome:

| Mode | Foregrounds | Status it cares about | Source |
|---|---|---|---|
| **RPG play** (= cockpit World) | terminal + command bar + inspection pane | game/character | base game |
| **Educational** (≈ Study/Classroom) | cockpit + lesson/content surface | progress, current lesson | education vertical |
| **Author** | live-edit affordances over the player client | HMR, eval, entity-under-test | builders (cross-cutting) |
| **Viewer** | stream embed + companion game, lean-back | what's live | livestream vertical |
| **Streamer** | control dashboard; *drives* the public overlay | what's on-air, what I'm pushing | livestream vertical |

Held as a map of the design space, not a build list. The point is the
*shell* must host this matrix without each mode being a bespoke layout
component — modes are how a vertical/use-case specializes the
vertical-agnostic platform at the UI layer ("swap the body, not the
bus"). Mode-switching stays **server-driven** per the cockpit slate
(`mode-changed` push); how a given mode is *determined* spans:
role-gating (author/streamer), vertical config (an education deploy
defaults to educational), context/event (viewer when a stream is live),
and user-toggle (RPG ↔ educational). Which of those are real vs.
speculative is an open question below.

---

## Search as a frame primitive

A search affordance in the frame, present on every interactive surface
(including the start screen — a newcomer wants to learn what this *is*
before committing). UI pattern: **input in the frame, results in a
floating palette/overlay** (Spotlight / command-palette style). It
needs no layout of its own and degrades cleanly to mobile.

The load-bearing intent is **document discovery for newcomers to MUDs**
— making the help system searchable right at the top of the page. Two
genuinely different intents, and only the first drives the design:

- **Document discovery** (help now; wiki later): keyword lookup,
  returns docs/sections. The reason search exists.
- **Gamestate query** (MQL): returns live Stuff. Overlaps what already
  exists — the command line runs MQL, the inspection pane is MQL-driven.
  So this is a **deferred result facet**, not a co-equal driver.

Shape: **one box, results grouped by kind** (Docs now · Wiki later ·
World later), *not* separate scoped boxes per surface.

**Help vs wiki** — a **systems↔content** pair, not a wall (the split is
center of gravity, and they overlap heavily):

- **Help** leans **systems** — commands, taxonomies, mechanics; the
  engine surface, generated from code + data (TSDoc → the api-model the
  in-game `help` browser already scaffolds against). Exists now;
  searchable first. It's outgrowing that scaffold (taxonomies, its own
  spoiler controls, the unified topic index) — see
  [help-slate.md](./help-slate.md).
- **Wiki** leans **content** — specific NPCs, areas, lore, quests,
  guides; community-authored. Empty until there's a community, so later
  by nature. Own, not external: the "built into the client" value (live
  transclusion, spoiler tiers, source-at-L3) can't survive on Fandom.
  See [wiki-slate.md](./wiki-slate.md).

They **cross-transclude**; the difference is what each is *about*, not a
separate engine.

Help and wiki are both consumers of **one shared reading substrate** the
shell owns: the **content-surface viewer** (a doc viewer region any
surface can summon), **search** (the discovery front-end; results open
the viewer), **spoiler gating**, and the **transclusion/embed palette**.

**Spoiler is shell-level, not a wiki feature.** The reader's appetite
dial + capability ceiling (see [spoiler-slate.md](./spoiler-slate.md))
are a property of the *session*; the shared viewer applies them to
*whatever it renders* — a help page, a wiki page, or a transcluded embed
inside either. Same for the **transclusion palette**: `{{help:…}}`,
`{{entity:…}}` (spoiler-gated template data), `<mql>`/taxonomy, and the
source viewer are render-time references to a single canonical source,
never copies — usable from either surface.

---

## Pre-world is plain UI (start screen, guest, no metaphors)

**The line:** everything before the lounge is plain UI — envless,
non-diegetic, no spatial names. The **lounge is the first room of the
game, always**; anything before it is diegetically nowhere; Login has
no env. No "foyer" or other room-metaphor for a login/select screen —
metaphors only confuse someone who's never seen the real thing.

So the pre-world screens (sign-in, character select, char-gen) are
literally *the app's UI* — a start screen, not a place. What survives
from the design without the metaphor:

- **Connected ≠ present.** The start screen is "connected, not yet in
  the world." Land → plain start screen → *Enter / Play as guest* →
  arrive in the lounge. **Logout → back to the start screen**, never a
  dead page.
- **Sign-in gates everything** (the one exception is the public
  read-only surface — OBS can't authenticate). Google sign-in is the
  gate; see [auth-providers-slate.md](./auth-providers-slate.md).
- **Guest = post-sign-in quick-play.** A session-only, unsaveable
  throwaway character for a signed-in user who wants in immediately —
  *not* an anonymous path. To persist, you pick/create a real
  character.
- **Mint the guest avatar on Enter, not on page-load.** The start
  screen has no env, so there's no body to instantiate there; the
  avatar comes into being at the moment of crossing into the lounge.
  This respects the don't-over-mint-Stuff rule and keeps churn-bodies
  out of the lounge — only people who *chose* to enter appear.

The start screen is the highest-leverage piece for "presentable now
that it's deployed" — it's the front door at `mud.panterasbox.com`.
(Char-gen itself stays its own full-screen flow per char-gen-wave1; the
start screen is the container that offers sign-in / guest / character-
select and hands off to it.)

---

## Pre-auth client state — the one tier that doesn't ride the bus

The start screen needs UI state (search history, theme, which sign-in
button you used last) at a point where there is **no authed bus to
carry it**. This forces a state category the cockpit never needed, and
naming it cleanly is load-bearing because it splits on *who owns the
truth*, not *where the bytes sit*.

**The distinction.** Everything in today's `clientState` bag is
**server-authoritative, bus-mirrored**: the server owns the truth, the
client caches a snapshot pushed on session-establish, and writes go up
via `sendClientStateWrite`. That model *structurally requires a
session* — no authed WebSocket, no bus, no `clientState`. Pre-auth
state is the inverse: **client-authoritative, `localStorage`-backed,
the server never sees it.** There is no upstream to write to. It can't
ride the bus precisely because the bus *is* the server asserting
authority, and pre-auth there is no authority to assert.

So the client-state taxonomy gains a fourth entry, and the cut is by
ownership:

| Category | Owner | Backing | Needs a session? |
|---|---|---|---|
| `settings` | server | avatar | yes |
| `PropertiedMixin` | server | per-Stuff | yes |
| `clientState` bag | server | bus-mirrored, Mongo | yes |
| **pre-auth client state** | **client** | **`localStorage`, off-bus** | **no** |

(This is the "third category needing its own substrate" the broader
notes flag — pre-auth adds the wrinkle that there's no identity to key
it to at all.)

### Two axes → two client tiers

Within the new category, two orthogonal axes decide where a key lives:

- **Authority** — client-auth (always, pre-auth) vs server-auth (once
  there's an identity).
- **Scope** — device-local (this browser) vs identity-scoped (follows
  you across devices).

The cross-product collapses to **two client-side stores**, with *no
guest branch on the client*:

1. **Device-local tier** (`localStorage`, off-bus, client-authoritative)
   — browser chrome that belongs to the *machine*, not to any identity:
   theme, font size, reduced-motion / a11y prefs, window geometry,
   last-used sign-in provider, the dev-login name. Identity-agnostic —
   the logged-out screen, a guest session, and a signed-in user all
   read and write the same tier.
2. **Bus-mirrored `clientState`** (existing) — in-world UI state. The
   *server* decides durability: Mongo for real accounts, session-RAM-
   then-gone for guests (see below). The client path is identical
   either way.

### Guest = anonymous, zero identity persistence

Decisions settled in design:

- **Anonymous guest.** "Play as guest" is a co-equal button **on the
  logged-out screen**, not a post-sign-in path. It mints an anonymous
  *session principal* the WebSocket upgrade accepts (today the upgrade
  only validates `passport.user.id`; anonymous guest widens that to
  accept a guest principal). The avatar is minted **on Enter**, not on
  page-load (per the start-screen rules above — also the anti-churn
  defense).
- **Zero identity persistence.** A guest persists *nothing* tied to
  their identity: no saved avatar, and their in-world `clientState`
  rides the bus exactly like a real user's but the server **holds it in
  session memory and never flushes**. Guest-ness is therefore a
  purely server-side "don't-flush" policy — the client never special-
  cases a guest, and there is no third "guest tier."
- **Device chrome persists; identity doesn't.** The two are
  orthogonal. A guest who bumps the font size and returns tomorrow —
  as a different guest, or signed in — is the same person at the same
  machine; that pref lives in the device-local tier and survives. "No
  persistence" governs the *guest identity*, never the *browser*.

> **Abuse seam.** Anonymous-vs-authed guest is a **single policy gate**:
> *may this connection mint a guest avatar?* Today → yes (anonymous).
> If abused → require an authed session and the guest button relocates
> to character-select; a config flip, not a rearchitecture. The real
> abuse levers (rate-limit, one-guest-per-IP, captcha-before-mint) all
> hang off that same gate and none need building now — just leave the
> seam.

### Merge on login

When a client-auth identity-scoped key (theme, spoiler appetite) meets
the server's value on sign-in, **server wins** — `localStorage` was only
the no-identity *bootstrap default*, and the server is the truth for
that identity across devices. The one nuance worth a requirements
decision: whether a value the user *deliberately changed this session*
while logged out should push *up* on login rather than be overwritten.
Default to server-wins; revisit only if it bites.

### Why this section lives here

Pre-auth state is the data half of the **start screen + `AccountMenu`**:
the logged-out screen renders **N provider buttons (Google now, Twitch
later — a list, never a hardcoded Google anchor) + a co-equal guest
button**, and "last-used provider" (a device-local key) decides which
button leads. Provider *mechanics* are the
[auth-providers slate](./auth-providers-slate.md); this slate only
consumes "render a list" and owns the off-bus tier that remembers the
choice.

---

## The public read-only surface (metrics · overlays · public docs)

A third front-end forced by the OBS constraint (a browser source can't
sign in, and gamestate is unreachable without the bus). One surface,
now **three consumers**:

- **Metrics view** — aggregate/health state for a public status page,
  useful when the live box is degraded.
- **Overlay view(s)** — diegetic state styled for broadcast
  (transparent bg, no chrome, OBS-capturable).
- **Public docs/help** — the **anonymous-floor** projection of the help
  index + `api-model`, served pre-auth (the eventual pre-auth web view).
  Unlike the other two, its content isn't live gamestate — it's the help
  index, so it rides that pipeline rather than the gamestate projector
  below; the spoiler capability ceiling does the gating (anonymous = the
  floor, so most of help is public, spoiler-gated content withheld). See
  [help-slate.md](./help-slate.md).

> With three distinct consumers, this surface probably wants to graduate
> from a section here into its own slate.

### Architecture: gather on the bus, project off it

The decision (settled in discussion): **do not** auth a limited-
capability avatar onto the command bus for this. The perception model
is viewer-from-one-body and would fight an overlay that wants arbitrary
gamestate; and a bus participant is **default-allow** (you start with
everything reaching it and subtract), the wrong posture for a public
wire where every future feature that routes to Sensors is a new leak.

Instead:

- A trusted **server-side projector** that is, internally, a fully-
  trusted consumer of gamestate (it may use MQL/perception with full
  trust to *gather*).
- It emits a **narrow, curated public projection** — a **default-deny
  allowlist**: the feed contains exactly the fields put in it, nothing
  leaks by default.

Reuse the infrastructure for **gathering**, not for **exposing**. The
projection step is the single auditable boundary. The risk in *any*
approach is the projection (leaking hidden/private data); a REST/SSE
projector with an allowlist is the *safer* expression of the read-API
we already knew we'd need, because it starts default-deny.

### Render half vs control half

- **Render (near-term):** the overlay *displays* by pulling from the
  public projection. Dumb display, no auth, no command bus. Buildable
  now, with a sensible default of what's shown.
- **Control (later, = streamer mode):** *you* steering what's shown
  from your commandline. That's a game-surface mode → waits for the
  mode work. Control rides the **authed bus**; output stays on the
  **public projection**. Two wires, two trust levels, no crossover.
  (`external-chat-relay` is the chat sibling of this output story.)

### Auth knob

Orthogonal to transport. Default split: **open** for genuinely-public
metrics; **optional API key** for overlay-specific or higher-fidelity
views.

Caveat: build the metrics view only against **honest** signals. Real
candidates: players online, uptime, *is the game clock actually
ticking* (world-clock liveness), WS connection health, Mongo reachable
— no fabricated gauges. What's already instrumented vs. needs adding is
an inventory step before this track starts.

---

## Declarative mode model — extract, don't pre-build

The end-state is declarative and fits the engine's grain (YAML command
views, template data, MQL — the server is data-driven; `App.tsx`'s
imperative phase-switch is the odd one out): a small set of **layout
slots** + a **region library** + each mode described as a **manifest**
(which regions fill which slots + capability flags), read by one shell
renderer. A mode becomes data; a new vertical is a new manifest reusing
regions.

But **don't spec the manifest before building one good mode.**
Sequencing:

1. Build **RPG mode + the shared frame primitives** as plain
   composition (no manifest) — this *is* the `ConnectionStatus`-
   replacement work.
2. Build **mode #2** (likely author) the same way.
3. **Extract** the slot/manifest model from those two concretes, where
   the real commonality (and the cases that break a naïve slot system,
   e.g. the output-only overlay) are visible.

The principle now; the framework grown from two concretes. This is
genuinely justified (a real ≥5 mode matrix that grows with verticals),
not N=2 speculation — but the abstraction is still *extracted*, not
designed up front.

---

## Build order / sequencing (two parallel tracks)

No hard dependency between them; sequential in practice (one builder).

- **Track A — game shell:** start screen (sign-in + guest quick-play +
  character-select, handoff to char-gen) → RPG mode + shared frame
  primitives (the top-bar replacement, kills `ConnectionStatus`) →
  search primitive (help corpus) → extract the declarative mode model
  at mode #2 (author).
- **Track B — public read-only surface:** the gamestate projection
  (default-deny) → metrics view (after a measurable-signals inventory)
  + overlay render-half.

**Lead:** Track A's start screen + RPG frame, since it's the front door
everything signed-in flows through. Track B is high personal value and
standalone; it jumps if the "start livestreaming again *soon*" timeline
is real.

---

## Relationship to existing slates / what this does NOT cover

To stay a good citizen of the docs (extend, don't duplicate):

- **Cockpit internals** — click model, MML semantic tags, MQL-widget
  catalogue, content surface, prompt line, envelope rendering, the
  in-game mode *triggers/layouts*: all **cockpit slate**. This slate
  only frames them (frame vs body; the mode catalogue's widening).
- **CMS internals** — code editor, content editors, lease-scoped
  trees, drafts/staging/publish, the dev-loop transport: all **cms
  slate**. This slate only asserts the game surface needs an author-
  mode seam.
- **Auth/account-linking, Twitch tokens/scopes** — **auth-providers
  slate**. This slate consumes "sign-in gates everything" + "guest is
  post-sign-in."
- **Twitch chat bridging** — **external-chat-relay slate**. This
  slate's overlays are the *gamestate-rendering* half, not chat.
- **Perception-scoped authed deltas** — **state-sync slate**. The
  projector is its unauthed sibling, not a replacement.
- **The lounge, onboarding, char-gen flow** — their own slates /
  the wave1 implementation. Not redesigned here.
- **Mobile layout shapes, 3D map, AI illustrations** — own slates /
  cockpit non-goals. This slate only insists chrome decisions stay
  placement-agnostic so mobile/overlay aren't precluded.

---

## Open questions

1. **Mode determination.** Which of {role-gate, vertical-config,
   context/event, user-toggle} are real now vs. speculative? Determines
   whether the frame needs a visible mode switcher yet at all.
2. **Mode vs surface axis.** Is "mode" (within a surface, server-
   driven, cockpit-style) cleanly distinct from "surface" (separate
   front-end)? Streamer straddles (control = game-surface mode; output
   = public surface) and viewer might be either. Pin the vocabulary
   before requirements so it doesn't collide with the cockpit's
   "modes."
3. **Search backend.** Client-side fuzzy over a shipped help index
   (snappy, offline-ish, fine while the corpus is small) vs. a server
   query endpoint. Per the client/server split, lean client until the
   corpus is large.
4. **Account menu's two exits.** Surface "leave world / switch
   character" and "sign out" as distinct actions — wording + placement.
5. **Measurable-signals inventory.** What health/metrics are *already*
   instrumented and exposable vs. need adding, before the metrics view
   is scoped.
6. **Does the start screen carry the frame?** It's plain UI — but it
   wants search, account, and a connection indicator. Likely yes (the
   frame spans the pre-world boundary), confirm at requirements.
7. **Wiki own-vs-external** — deferred until there's a community; the
   shared-viewer/search shape is the hedge that keeps the decision
   cheap.
8. **Merge-on-login push-up.** Server-wins is the default for identity-
   scoped pre-auth keys; the open nuance is whether a value
   *deliberately changed while logged out* should push up instead of
   being overwritten. (See [Pre-auth client state →
   Merge on login](#merge-on-login).)
9. **Device-local tier substrate.** A typed `localStorage`-backed store
   slice (key namespace, schema/versioning, migration when a key's
   shape changes) vs. ad-hoc `localStorage` reads. Lean typed-slice,
   parallel to the existing Zustand `clientState` shape; pin at
   requirements.

> **Resolved in design (was open):** guest is **anonymous** (button on
> the logged-out screen), **session-only with zero identity
> persistence**, gated by a single mint-a-guest policy point so it can
> be demoted to post-sign-in if abused. See [Pre-auth client
> state](#pre-auth-client-state--the-one-tier-that-doesnt-ride-the-bus).

---

## Dependencies

- **[client-cockpit-slate](./client-cockpit-slate.md)** — the game
  body this shell wraps; its always-on minimum + mode mechanism are the
  things generalized here.
- **[auth-providers-slate](./auth-providers-slate.md)** — sign-in gate,
  guest, the streamer keystone.
- **[mql-subscription-slate](./mql-subscription-slate.md)** +
  **[state-sync-slate](./state-sync-slate.md)** — the live-state
  substrates the game body consumes and the projector mirrors.
- **[char-gen-slate](./char-gen-slate.md)** + `feature/char-gen-wave1`
  — the pre-world flow the start screen hands off to.
- **Help system / api-model** (TypeDoc `api-model.json`, `HelpController`
  scaffold) — the first search corpus.
- **[docs/deployment.md](../deployment.md)** — `mud.panterasbox.com`,
  the deploy this makes presentable and the health the metrics view
  reports.
