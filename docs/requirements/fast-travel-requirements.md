# Fast travel — requirements

A directed network of public **terminals** you teleport between. A
terminal is a fixture in a public room; it holds a **currently-selected
destination** (advanced either by a clock-driven schedule or by a player
operating it); the `teleport` verb sends you to wherever the terminal is
pointed right now. You may only travel to a terminal you have already
**registered** — reached by other means and recorded on a travel
**credential** you carry (a transferable card) or wear in your head (a
cranial implant). The network is the world's transit spine: it stitches
together zones that share no physical ground, and it is the way *out* of
the login lounge.

The capability is framed in `lib/` as **fast travel**; in content
(`/domain/` + all player-facing text) it is the **Teleport Authority**
(TPA) and is never called "fast travel." This is a port of the Eternal
City TPA (legacy source in `docs/eternal/tpa/`): departure gates with
timetables and prices, an arrival rally point, scan-to-register
credentials.

Seeding slates: [fast-travel-slate](../slates/builds/fast-travel-slate.md)
(the network, the credential, the lounge-exit), with the addressing seam
from [delivery-slate](../slates/builds/delivery-slate.md) (TPA is named
there as a sibling overlay; terminals are anchor-shaped). Load-bearing
subsystems: [location](../subsystems/location.md) (Locations, Zones, the
Warren coordinator) and [spatial](../subsystems/spatial.md) (the
`Mobile.teleport` exit-less relocation primitive this verb rides),
[augmentation](../subsystems/augmentation.md)
(the cranial slot + `AugmentMixin`/`SlottableMixin` the implant composes),
and the command/validator pipeline (`lib/command/`) that grants verbs.

---

## Goals

- **A terminal node type.** A public-room fixture that participates in the
  fast-travel network: it carries a set of outbound **routes**, a
  **directionality** (`arrival` / `departure` / `both`), and — when
  departure-capable — a **currently-selected destination** drawn from its
  routes.
- **Directed, per-terminal authored routes.** A terminal's outbound routes
  are authored on the terminal (like authoring an exit); the network is the
  sum of those choices, with no central planner. Routes are directed: a
  terminal routing A→B implies nothing about B→A.
- **Destination is terminal state, advanced by world-clock timetable or by
  hand.** A departure-capable terminal has one selected destination at a time,
  advanced by **either** a **per-route timetable** bound to the world clock
  (each destination has its own list of game time-of-day departures — Citadel
  at 11:00/14:30, the Lounge at 11:15 — *not* a uniform round-robin; the
  legacy `set_timetable`) **or** a player **verb** that manually changes the
  selection. A degenerate **cycle** mode (one game-time interval round-robin)
  is also available. All ship in this build; which a given terminal uses is
  per-terminal content. The advance is bound to game time-of-day (paused/
  scaled with the world clock), not real-time intervals.
- **The `teleport` verb is dual-mode (one verb, two forks).** It is **not**
  TPA-only, and its subject **defaults to self**. A **privileged** actor
  self-teleports anywhere, targeting the destination via **MQL**, with an
  `--target <obj>` option to move *another* (`AccessApi`-gated). This reworks
  the existing verb: `teleport` now does what `goto` does (retiring/aliasing
  `goto`) and folds the old object-relocation `teleport` into `--target`. An
  **unprivileged** actor rides the **TPA** (self only):
  at a departure-capable node, the verb sends them to the node's
  currently-selected destination, gated on that destination being in their
  registered set. The **TPA path is its own fork in the controller, separate
  from self-powered teleportation**; the TPA-specific gating (credential, at a
  node) lives in that fork, **never as a verb-level validator** (which would
  block the privileged path). This unifies with the existing author `teleport`
  rather than minting a second verb.
- **Routes target nodes; arrival reads the live node.** A route's target is
  another **node** (terminal) — a live Stuff identified by its own singleton
  path, not a room or Warren ref. The arrival room is read off the live
  destination node: `node.getArrivalRoom()` (default = the room the node sits
  in; the lounge node overrides to its Warren host). Teleport relocates the
  actor with the general mobility primitive
  `Mobile.teleport(node.getArrivalRoom(), opts)` — the exit-less move plus its
  arrival/departure narration. **No ref→container resolver and no change to
  `applyStartLocation`** (spawn keeps its own Warren branch; there is nothing
  to share). No global destination index.
- **Targeting by the destination node's own keywords (read live).** A player
  names a destination by a keyword carried on the destination **node**
  (`Perceptible.keywords`, read from the **live node instance** — never from
  template data), matched **locally against the operating terminal's own route
  set** — never a global lookup.
- **A travel credential.** A `TravelCredentialMixin` holding the
  **registered-terminals set** plus the register/authorize surface, composed
  by **both** a carryable **card** Thing (transferable, loseable, lendable)
  and a cranial-slot **travel implant** augment. The registered set lives on
  the credential Stuff, so lending the card lends its routes.
- **The `register` verb (scan-to-register).** A uniform verb issued at a
  terminal that adds it to the actor's active credential's registered set.
  Same gesture whether the actor carries a card or an implant.
- **Registration gates travel.** `teleport` to a destination the actor has
  not registered is refused; reaching a terminal by other means and
  `register`-ing it is the unlock.
- **A useful local departures board (the primary v1 wayfinding surface).** A
  terminal presents, **viewer-aware**: its routes (each labeled by the **live
  destination node's display name**, identical network-wide, no per-terminal
  override); a **registered-status marker** per destination (text, not color;
  unregistered destinations still shown — they feed the discovery loop); for
  scheduled terminals the **next departure time(s)** per destination; and the
  **currently-boarding/active** destination, marked. Because the network-wide
  views are deferred, this board carries the wayfinding weight and must be
  genuinely useful. The board renders on a bare `teleport` (no destination), so
  the terminal's **long description must communicate that affordance**
  (diegetically: a destination board is here; bare `teleport` reads it,
  `teleport <place>` travels) — provided by the generic node class so every
  terminal surfaces it uniformly, with per-area flavor layered on top.
  Otherwise the board is undiscoverable. The terminal's **short description**
  surfaces its directionality (and status) via a diegetic **status light** —
  blue arrival / red departure / purple both / dark offline (the additive
  red+blue=purple is self-teaching; dark is the `status` seam, dormant in v1).
  Per color-conservatism: the **word carries the meaning, color only
  reinforces** (never color-alone; steady, never blinking) — a colorblind
  player reads it fine.
- **The lounge terminal + the pre-seeded campus stop.** The lounge gets the
  first terminal (`both`-direction, comped). Every fresh credential is
  pre-seeded with the **University Avenue bus stop** registered, so a new
  player can leave the lounge for campus before having registered anything.
- **The subsystem doc.** A `docs/subsystems/fast-travel.md` documenting the
  network, the credential, the verbs, and the naming split.

---

## Non-goals

- **Fees / economy.** Travel is **free / comped** in this build. No price is
  authored on routes at all — not even inert legacy-parity data; the price
  concept arrives whole with the economy subsystem
  ([economy-slate](../slates/builds/economy-slate.md)), which owns where it
  lives.
- **The portable whole-network schedule (any form).** Seeing the *entire* TPA
  map + schedule — whether as a **Readable**, a **narrow-search verb**
  (`schedule <query>`), or a **client widget/pane** — is a **route-topology**
  view, distinct from the coordinate map. All three are deferred wayfinding:
  they're unvalidatable at v1's 2-node network (nothing to navigate), and the
  client widget especially waits for a real network. The data is ready (an MQL
  query over the resident `FastTravelMixin` nodes); the views land in the
  wayfinding wave ([map-slate](../slates/builds/map-slate.md) node-graph mode
  over the route network). The **local** terminal board (above) is in scope and
  is the v1 wayfinding surface.
- **Living-infrastructure dynamism.** Breakdowns, maintenance, delays,
  congestion, sabotage, rerouting — the disruption *loop*. This build leaves
  terminals/routes **stateful** (so the seam exists) but ships no loop.
- **The address as a routing handle.** A destination is targeted by room
  keyword and routed by templatePath; the delivery-slate **address** is a
  later *additional* presentation handle (the human-meaningful label over an
  opaque path), lit up if/when addressing is built. This build neither
  depends on nor builds any address namespace, index, or anchor reification.
- **The augment install/remove procedure.** The travel implant is installed
  via the existing clone-time loadout path (as `AetherImplant` is); the
  medical install/remove procedure is augmentation Wave 2.
- **Premium aug auto-registration.** "A smart implant silently logs every
  terminal you enter" is a later enhancement; this build's unlock is the
  uniform explicit `register` verb for both credential kinds.
- **Onboarding / char-gen / housing content.** Those *consume* the lounge and
  campus terminals; they are defined in their own slates. This build places
  terminals in public nodes and wires the lounge exit; it does not build the
  dorm, the campus, or the onboarding flow.
- **Last-mile and the exit graph.** Physical room-to-room movement is
  locomotion, unchanged. Fast travel deposits you at a public arrival
  terminal; walking the last mile to private space is locomotion's job.

---

## Surface decisions

### Naming split: `lib/fasttravel` capability; TPA content by domain

The reusable mechanism lives under `lib/fasttravel/` and is named for the
**capability** — "fast travel." Content is **Teleport Authority / TPA**
fiction and the string "fast travel" never appears in it. Content placement
follows ownership: the **generic, area-agnostic** TPA content (the node
class, the travel card, the implant) lives under `/domain/common/tpa/`; an
**individual terminal** is content of the area it stands in and lives in
*that* area's domain (`/domain/lounge/`, `/domain/eternal/`, …), authored from the
generic node class. (The class-path validator already admits `/domain/`.)
This mirrors the "no brand in `lib/`" rule (neutral engine names; fiction in
content) — here inverted: the *content* brand stays out of `lib/`.

### Destination is terminal state, not a per-act prompt

A departure-capable terminal holds **one selected destination at a time**.
This unifies the slate's "on-demand vs scheduled" split into a single state
machine: the selection is a field; *how it advances* is per-terminal policy
— a **per-route world-clock timetable** (`WorldClockApi.cron`, each
destination on its own game time-of-day schedule, the bus-timetable mode), a
**player verb** (operate the console to change it), or a degenerate **cycle**
interval (`WorldClockApi.every`). `teleport` always acts on the current
selection. All ship now; scheduled is no longer deferred, because once the
selection is state, a departure is just a clock-bound writer of it — cheap,
on the shipped world-clock infrastructure. **Real-time intervals are
explicitly rejected**: departures are game time-of-day, so they pause and
scale with the world clock (a 30-second real cycle is not the feel; "11:00am,
the Lounge train" is).

### Routes target nodes; arrival is read off the live node

A route stores its destination as another **node** (terminal) — a live
Stuff identified by its own **singleton path**, not a room or a Warren ref.
Each node is its own source of truth: its keywords, display name, and
**arrival room** are read from the **live instance**, never from template
data. The arrival room comes from `node.getArrivalRoom()` — default the
room the node sits in (`getContainer()`); the lounge node overrides it to
its Warren host (the elastic case). The teleport act is the mobility mixin's
**`Mobile.teleport(room, opts)`** — the polished exit-less relocation (move
+ teleport-out/in narration); raw `ContainmentApi.move` is the silent
fallback beneath it.

**No ref→container resolver, and `applyStartLocation` is untouched.** Spawn
(`applyStartLocation`) places an avatar into the world at login and keeps
its own Warren branch; teleport moves an already-embodied actor and reads
the live node's arrival room. The two share nothing — there is no resolver
to factor out. A node's network identity is simply its singleton path:
routes reference it, `register` writes it, `teleport` checks it — no
separate identity field, no global index. The delivery-slate **address** is
not the routing key (that would force a global address→target index); it
remains a later, additional *presentation* handle.

### Targeting handle = the node's own keyword (now), address (later), local

The player names a destination by a **keyword carried on the destination
node** (`Perceptible.keywords`, read from the **live node instance**),
resolved **against the operating terminal's own route set** — a handful of
targets, never a global index. When the delivery addressing substrate lands,
the destination's **address** becomes a *second* handle (the meaningful label
over the opaque path) for free, because matching stays local. Node keywords
carry the whole feature until then; addressing is an enhancement seam, not a
dependency.

### Departures label: the destination node's own display name, uniform

A destination's label on any departures board is the **live destination
node's own display name** (`DescribeApi.getDisplayName`), so it is **uniform
across the entire network** — the same node reads the same everywhere. There
is no per-terminal override to even express: the label is the node's, read
off the node. (This is *why* nodes-carry-their-own-identity beats deriving a
label from a room or Warren — the node is the one source of truth.)

### Credential: one mixin, two hosts, state on the credential

`TravelCredentialMixin` carries the **registered-terminals set** and the
register/authorize surface, and is composed by **both** a carryable **card**
Thing and a cranial-slot **travel implant** (`AugmentMixin` +
`SlottableMixin`). State lives **on the credential Stuff**, which is what
makes the card transferable — lend the card, lend its registered routes; the
implant is personal because it is in your head. The card needs no augment
slot (it is held, not installed); the two share only the mixin. This makes
fast travel an early adopter of augmentation's stated "capability lives on
the augment Stuff, not the Avatar" direction — which the transferable card
forces regardless.

**Persistence is session-durable in v1 — durable later, by host.** The
registered set is declared persistent on the credential Stuff, but it does
**not** survive a restart today: `Avatar.save()` persists only the avatar's
own fields (no inventory persist-back per `state-model.md`), and the implant is
re-cloned each session, not restored. So v1 is session-durable; on restart a
fresh credential is re-created (born-with University Avenue, re-register the
rest) — consistent with the "wipe DB between runs" posture. This build does
**not** build persistence; cross-restart durability rides unbuilt subsystems,
forking by host: **aug → colocated with the avatar's self-contained save**;
**card → inventory persist-back, then long-term storage** (durable non-player
Stuff that survives restart and isn't GC'd from isolation — e.g. a card in a
chest). Fast travel is the first real consumer of both — a forcing function,
not their builder.

### Unlock: one uniform `register` verb for both credential kinds

`register` is a **verb**, not a physical card-swipe: the same gesture writes
the node's own singleton path into the actor's active credential whether they
carry a card or an implant. The implant removes the *carry* requirement, not
the *act*. If the actor controls both a card and an implant, the implant wins
(not load-bearing). Reaching a node by other means is the prerequisite the
verb records.

**`register` requires an arrival-capable node.** A departure-only node is
one-way *out* — you can never arrive there, so there is nothing to register;
`register` is refused at departure-only nodes and allowed at `arrival`/`both`.
(`teleport`, conversely, requires `departure`/`both`.)

### The pre-seeded University Avenue bus stop

A fresh credential is **born with one terminal registered** — the University
Avenue bus stop, the lounge's campus-entry destination — so a new player can
take the lounge exit before they have registered anything. It is the single
documented exception to "you must reach a terminal before you can travel to
it."

### Fees deferred; comped v1

No currency is charged and **no price field is authored** on routes or
terminals. The price concept lands with the economy subsystem, which owns
its shape and home; this build does not pre-stub it. All travel, including
the lounge terminal, is comped.

---

## Constraints

- **Verbs are global commands, gated per-fork — not mixin methods.**
  `teleport` and `register` are `CommandDefinition`s. **`register`** is
  TPA-only: validators check the actor holds a credential and is at an
  arrival-capable node. **`teleport`** is dual-mode and carries **only**
  `requiresAnimate` at the verb level; its controller forks on privilege
  (self-powered MQL vs TPA), and the TPA-specific checks (credential, at a
  node) live **inside the TPA fork** so they never block the privileged
  self-powered path. A node supplies shared state/behavior via its mixin; it
  does not "grant a verb." (Per the *verbs-not-from-mixins* rule.)
- **Teleport is `Mobile.teleport`, not the spawn path, and reads the live
  node.** Relocation rides the mobility mixin's exit-less `teleport(room, opts)`
  (`subsystems/spatial.md`) — the move plus its narration — not raw
  `ContainmentApi.move` (the silent fallback under it). The arrival room comes
  from the **live destination node** (`node.getArrivalRoom()`); there is **no
  ref→container resolver** and **`applyStartLocation` is untouched** (spawn is a
  separate operation that keeps its own Warren branch). `container` stays honest
  (a node is not a container; arrival is a deposit at the destination room/host,
  not a containment tier).
- **Live instances are the source of truth; the network cascade-loads from one
  seed.** Every read of a destination's keywords / name / arrival room is off
  the **live node Stuff**, never off template data. The network's nodes are
  resident singletons loaded by a **single boot-manifest root** that cascades
  to the whole connected component via routes (+ co-located sibling nodes);
  there is **no registry or list of terminals** anywhere. (Per
  *no-premature-registries*; the cascade replaces the list.)
- **No global index of any kind.** No registry of all terminals, all
  destinations, all keywords, or all addresses. Terminals name their own
  routes; targeting matches locally; the registered set lives per-credential.
  (Per the *no-premature-registries* feedback rule.)
- **No new Api by default.** Prefer terminal/credential mixin methods, the
  the existing world-clock scheduling primitives, and command validators over
  a new `FastTravelApi`.
  Introduce one only if a genuine cross-cutting need appears in planning.
  (Per the *no-new-apis-default* feedback rule.)
- **Content is real, built on shipped mixins.** Terminals, the card, the
  implant, and the lounge/University-Ave nodes are real Stuff composing real
  mixins making honest claims — no flavor-only fixtures. (Per the
  *props-real-or-cut* feedback rule.)
- **`lib/fasttravel/` is a real subsystem dir** even if it starts as a few
  files; the generic mechanism does not leak into content, and content does
  not leak into `lib/`. (Per the *respect-lib-subsystem-categorization* rule.)
- **The credential concern is Avatar/credential-local.** Do not widen a
  whole-Stuff mixin (e.g. `Propertied`) to carry travel state; the registered
  set belongs on the focused credential mixin composed only where the concern
  is real. (Per the *dont-widen-substrate-for-narrow-concerns* rule.)
- **Terminals/routes stay stateful** (the living-infrastructure seam) but
  ship no disruption loop; a terminal must be able to carry a future
  `status` without a schema change forcing the loop in now.
- **Scheduled/cycle modes use the world clock** (`WorldClockApi.cron` /
  `.every`, `api/worldclock.ts`) — game-time-bound, paused/scaled with the
  clock; **not** real-time timers and **not** `ScheduleApi.recurring` (which is
  the clock's own real-time backstop). Timetables are authored data re-armed
  in `postRegister` (the clock's "persist state, not schedules" rule); no
  bespoke timer loop.
- **Boolean / field-naming conventions hold.** Directionality and any flags
  follow the repo's field-naming rules (noun setters, `is`-prefixed
  predicates; property vs instruction field distinction).

---

## Acceptance criteria

- A **node** (terminal) can be authored in a public room with a directionality
  (`arrival` / `departure` / `both`) and a set of directed routes, each route
  targeting another **node** by its singleton path.
- A **departure-capable terminal** exposes exactly one selected destination
  at a time. A **scheduled** terminal advances its selection via per-route
  `WorldClockApi.cron` departures (independent per-destination game time-of-day
  timetables — verified that advancing the world clock past two different
  routes' times selects each in turn); a **cycle** terminal round-robins on a
  game-time interval; a **manual** terminal exposes a verb to change it. Tests
  (driving the world-clock test seams) cover all advance paths and that
  `teleport` acts on the current selection.
- **`teleport` forks correctly by privilege.** A **privileged** actor
  self-teleports to an MQL-targeted destination anywhere, with no node or
  credential required. An **unprivileged** actor uses the TPA fork; an
  unprivileged actor **not at a node** is told there's no terminal (never
  silently self-teleported). The TPA gating lives in the fork, not as a
  verb-level validator.
- `teleport` (TPA fork) at a departure-capable node relocates the actor to the
  selected destination **via `Mobile.teleport`** (not the spawn path) — the
  arrival room is read from the **live destination node**
  (`node.getArrivalRoom()`); a static-room destination and the lounge
  (Warren-host) destination both work, the teleport-out/in narration fires,
  and the actor's `container` after arrival is the destination room/host,
  never the node. `applyStartLocation` is unchanged.
- The **network cascade-loads from a single boot-manifest root** — booting one
  node brings up the whole connected component (via routes + co-located
  siblings) and their rooms, with no registry/list anywhere; cycles in the
  route graph load safely (singleton cache).
- `teleport` to a destination **not in the actor's registered set is
  refused** with a diegetic message; `register` at a node adds it, after which
  `teleport` succeeds. Covered for both card and implant credentials.
- `register` is **refused at a departure-only node** (one-way out — nothing to
  register); it succeeds at `arrival`/`both` nodes and writes the node's own
  singleton path into the credential.
- A destination is **targetable by a keyword read from the live destination
  node** matched against the operating node's route set; an ambiguous or
  non-routed keyword is rejected with a diagnostic. No global keyword lookup,
  no template-data read.
- The **local departures board** is viewer-aware and useful: each routed
  destination shows its **live node display name** (same destination → same
  label at two different nodes — uniformity test), a **registered-status
  marker** that differs by viewer (registered vs not), next-departure time(s)
  for scheduled nodes, and the **active/boarding** destination marked.
- `TravelCredentialMixin` is composed by **both** the card Thing and the
  travel implant; the registered set is stored on the credential Stuff, and
  **transferring the card transfers its registered routes** (test: hand the
  card to another actor, they can travel its routes; the implant's set is
  unaffected).
- A **fresh credential is pre-seeded** with the University Avenue bus stop
  registered; a brand-new avatar can `teleport` out of the lounge to campus
  with no prior registration. The lounge terminal is `both` and comped.
- **No currency is charged** by any travel, and no price field is authored on
  any route or terminal seed.
- `docs/subsystems/fast-travel.md` exists, documents the network / credential
  / verbs / naming split, and the slate is updated or retired per the
  finalize phase.
- The string **"fast travel" appears in no content or player-facing output**;
  all such surfaces say Teleport Authority / TPA. Conversely no content brand
  leaks into `lib/fasttravel/`.

---

## Cross-references

- **Seeding slates:** [fast-travel-slate](../slates/builds/fast-travel-slate.md),
  [delivery-slate](../slates/builds/delivery-slate.md) (the addressing seam —
  TPA as a sibling overlay, terminals as anchors).
- **Load-bearing subsystems:** [location](../subsystems/location.md)
  (Locations / Zones / Warren / `Warren.getHost`), [spatial](../subsystems/spatial.md)
  (`Mobile.teleport` exit-less relocation + its narration hooks),
  `StuffApi.singleton` + the boot manifest (the cascade-load substrate),
  [augmentation](../subsystems/augmentation.md) (cranial slot, `AugmentMixin`,
  `SlottableMixin`, clone-time loadout), command/validator pipeline
  (`lib/command/`), `Perceptible` keywords (read live) + MQL targeting, the world clock
  ([time](../subsystems/time.md): `WorldClockApi.cron`/`.every`/`.at`,
  `CronPattern`, the game-time-bound scheduling that drives departures).
- **Legacy prior art:** `docs/eternal/tpa/` — `station.c`, `depart{1,2,3}.c`,
  `d{1,2,3}console.c`, `arrive.c`, `office.c` (gates, timetables, prices,
  arrival rally point).
- **Deferred destinations:** [economy-slate](../slates/builds/economy-slate.md)
  (fees), [map-slate](../slates/builds/map-slate.md) (the transit-map pane),
  onboarding / char-gen / Eternal University slates (the consumers of the
  lounge and campus terminals).
- **Constraining feedback rules:** verbs-not-from-mixins,
  no-premature-registries, no-new-apis-default,
  dont-widen-substrate-for-narrow-concerns, props-real-or-cut,
  respect-lib-subsystem-categorization.
