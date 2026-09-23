# Client shell slate (working doc)

> **Status: PARTIAL** — Track A (frame, start screen, guest, reconnect)
> shipped → [client-shell.md](../../subsystems/client-shell.md)
> **Left:** search as a frame primitive (Q3 — the CLI half shipped as
> `recall`; help is not yet a scope) · the public read-only surface
> (metrics · overlays · public docs) + a read-only session · the
> declarative mode model (extract at mode #3 — `play` and `build` exist) ·
> mode determination (Q1) · the device-local pre-auth tier (Q9) +
> merge-on-login (Q8)
> **Size:** a wave

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
- [cms-slate.md](../builds/cms-slate.md) — the **CMS surface**. Same session,
  separate tab, client-heavy over the same backend; the author↔test
  dev loop is the live coupling between the game and CMS surfaces.
- [auth-providers-slate.md](./auth-providers-slate.md) — sign-in gates
  every surface except the public read-only one. Google + Twitch
  co-equal; the keystone under streamer use-cases.
- [docs/subsystems/twitch-relay.md](../../subsystems/twitch-relay.md) —
  Twitch chat ↔ game channel. The *chat* half of streaming; this
  slate's public surface is the *gamestate-rendering* half (overlays).
- [mql-subscription-slate.md](./mql-subscription-slate.md) *(supersedes
  the retired state-sync-slate)* — perception-scoped
  world deltas to **authed** clients. The public surface's projector is
  a sibling: it consumes gamestate internally with full trust and
  emits a *narrower, unauthed* projection.
- [char-gen.md](../../subsystems/char-gen.md) *(shipped; slate retired)* + the `feature/char-gen-wave1`
  implementation (`CharGenStage`, `embody`/`EmbodyController`) — the
  pre-world char-gen flow the start screen hands off to. (Supersedes
  the cockpit slate's modal Track 3.)
- [lounge-slate.md](../builds/lounge-slate.md) — the **first room**, locked in
  its own slate. Not redesigned here; it's the boundary where plain UI
  ends and the world begins.
- [onboarding-slate.md](../builds/onboarding-slate.md) — starts at campus
  arrival, downstream of the lounge. Not touched here.
- [mql-subscription-slate.md](./mql-subscription-slate.md) +
  [card-surface.md](../../subsystems/card-surface.md) *(shipped;
  slate retired)* — the
  live-state substrate the game body's regions consume.
- [docs/deployment.md](../../deployment.md) — `mud.panterasbox.com`, the
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

The CMS is no longer a separate surface: it is the `build` **mode** of the game surface, its standalone `?surface=cms` takeover retired and its editor, git panel and Studio three cards in one feed → [cockpit.md § Builder = the CMS re-homed](../../subsystems/cockpit.md), [cms.md § The CMS is a CARD now](../../subsystems/cms.md). The author-mode seam this paragraph reserved shipped as that mode.

---

## Shared primitives (composition, not inheritance)

`ConnectionIndicator` (composed into `ConnectionChip`), `AccountMenu` (a state-polymorphic dropdown with the two exits distinct) and the mode switcher (`ViewsMenu`, current mode marked) shipped as **shared primitives composed, not subclassed** → [client-shell.md § The top bar](../../subsystems/client-shell.md), [cockpit.md § Client registry](../../subsystems/cockpit.md). Still open:

- `SearchInput` — see [Search](#search-as-a-frame-primitive).

---

## Modes generalize the cockpit's mode axis

The mode catalogue shipped as `COCKPIT_MODES` = `chat` · `play` · `watch` · `build` · `govern` → [cockpit.md § The mode axis](../../subsystems/cockpit.md): *RPG play* is `play`, *Author* is `build`, *Viewer* and *Streamer* are the two **arrangements** of `watch` (which is why the axes are two), and *Educational* has no mode yet — its design (`study` · `classroom` · tutor, the content surface, the diegetic trigger) is [client-cockpit-slate § Modes + § Content surface](./client-cockpit-slate.md) and is tracked only there since the cluster pass. ⚠ *A mode is a view, never a gate* — role-gating a mode is the wrong layer.

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
  exists — the command line runs MQL, the inspection card is MQL-driven.
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
  [help-slate.md](../builds/help-slate.md).
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

## Pre-world is plain UI — shipped → [client-shell.md § The front door](../../subsystems/client-shell.md) (no metaphor; the lounge is the first room; logout returns to the start screen; the provider list is data-shaped) and § Anonymous guest (anonymous, minted on Enter, persists nothing, reaped on disconnect).

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

### Guest = anonymous, zero identity persistence — shipped → [client-shell.md § Anonymous guest](../../subsystems/client-shell.md): `POST /auth/guest` mints `anon:<nanoid>`, `GuestAuthRoutes.mayMintGuest` is the single abuse gate, `Avatar.save()` short-circuits for guests (the don't-flush seam), device chrome is orthogonal.

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

> ⚠ **Related, and still open: a read-only SESSION.** Wave 1 Build B
> (honest chrome) was slated to ship a read-only mode indicator and
> **cut it, because there is nothing for it to indicate.** The only
> read-only principal today is the livestream broadcast feed, which has
> no `Interactive` at all and never reaches the React client — so the
> indicator would have meant inventing a session state to justify a
> chip. If a read-only React session is wanted (a spectator link, a
> shared-screen mode, a suspended account that can read but not act),
> it is a real feature with server work and belongs here, in this
> slate's design space, with its own requirements. See
> [client-shell.md § The read-only mode indicator](../../subsystems/client-shell.md).

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
  [help-slate.md](../builds/help-slate.md).

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
  **[mql-subscription-slate](./mql-subscription-slate.md)** — the live-state
  substrates the game body consumes and the projector mirrors.
- **[char-gen.md](../../subsystems/char-gen.md)** + `feature/char-gen-wave1`
  — the pre-world flow the start screen hands off to.
- **Help system / api-model** (TypeDoc `api-model.json`, `HelpController`
  scaffold) — the first search corpus.
- **[docs/deployment.md](../../deployment.md)** — `mud.panterasbox.com`,
  the deploy this makes presentable and the health the metrics view
  reports.
