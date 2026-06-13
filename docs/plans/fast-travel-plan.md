# Fast travel (Teleport Authority / TPA) — implementation plan

Status: planning artifact. Authoritative scope is [`docs/requirements/fast-travel-requirements.md`](../requirements/fast-travel-requirements.md); design rationale is [`docs/slates/builds/fast-travel-slate.md`](../slates/builds/fast-travel-slate.md) (+ the addressing seam in [`delivery-slate.md`](../slates/builds/delivery-slate.md)). This doc is the *how*. The *what* (surface decisions, non-goals) is settled — do not reopen it.

> **Revision note.** This plan supersedes an earlier draft. Key model decisions, all settled with the user: the mixin is **`FastTravelMixin`** (not "Terminal" — a bad lib identifier); **routes target nodes** (terminals), each of which is its own source of truth; **all reads come from the live node Stuff, never from template data**; the network **cascade-loads from a single boot-manifest root**; `register` requires an **arrival-capable** node. There is **no** shared `resolveDestinationContainer` refactor and `Avatar.applyStartLocation` is **untouched** (see §2).

> **BUILD STATUS — COMPLETE.** Built on `feature/fast-travel`; `tsc --noEmit`
> clean; full suite green (344 files, 3899 tests). Deviations from this plan
> as written, all intentional:
> 1. **Generic TPA content home is `/domain/common/tpa/`** (a shared-content
>    namespace for other domains to employ), not `/domain/tpa/` — it isn't a
>    specific content area. Paths throughout this doc updated to match.
> 2. **EU content home is the existing `/domain/eternal/` campus** (where
>    `duncan-hall` already lives), not a new `/domain/eu/`. The born-with node
>    is `/domain/eternal/university-avenue-terminal`.
> 3. **Seating is "eager on first landing"**, not a literal boot-manifest step:
>    `LoungeWarren.wireHostFixtures` seats the lounge node when the host is first
>    wired (which is first landing), and its `postRegister` cascade brings the
>    whole network live from that one seed. Functionally eager (the lounge is
>    the universal landing); no `AppBootstrap` surgery. The seating is fail-soft
>    (a deployment/test without the seeds still gets a working lounge).
> 4. **`goto` left in place** (not retired/aliased) — deferred minor.
> 5. **The status light renders the descriptive words** ("its arrival light
>    glowing blue", …) but not yet wrapped in MML colour markup — the word
>    carries the meaning (colour-conservatism intact); the colour span is a
>    trivial later polish.
> 6. **Deferred to finalize / follow-up:** the Wave 6 subsystem doc
>    (`docs/subsystems/fast-travel.md`) — graduate at finalize; and the
>    controller-dispatch + card-transfer **integration** tests (the model is
>    unit-tested, the cascade+seating is integration-tested, full regression is
>    green).

---

## 0. Branch / base — read this first

Work in the worktree `/home/bobalu/play/saxonberg/build-2`, branch `feature/fast-travel`, cut from `master`. All substrate this build rides is already present in this tree. No merge dependency on another feature branch.

### Substrate facts (verified against the working tree)

- **`Mobile.teleport(destination: Stuff & Container, opts?: { silent?: boolean })`** (`lib/spatial/Mobile.ts:467`) — synchronous, exit-less relocation: narrates teleport-out/in (`world.narration.teleport` + per-location `getTeleportOut/InMessage` hooks), runs `ContainmentApi.move` underneath, fires `autoSenseOnArrival`. **The primitive `teleport` calls.** Takes a concrete container.
- **`StuffApi.singleton(path)`** (`api/stuff.ts`) — returns the one live instance for a `SingletonMixin` class path, creating+caching it on first call. Idempotent and cache-terminating, which is what makes the cascade (below) cycle-safe.
- **`Warren.getHost()`** (`lib/location/Warren.ts:201`) — the reusable placement kernel; creates the first member / migrates the host. The lounge node's arrival room comes from here.
- **Live-read surfaces (the source of truth — use these, never template data):** `Perceptible.getKeywords()` (`lib/description/Perceptible.ts`) for keyword targeting; `DescribeApi.getDisplayName(obj, viewer?)` (`api/describe.ts:115`) for the board label; `Stuff.getContainer()` for a node's room. **`Template.findByPath().data` is explicitly NOT used to read a destination's presentation** — the live node instance is the record of truth (the same principle as the inter-Stuff "methods only" contract).
- **Augment substrate**: `AugmentMixin.confers()` (`lib/augmentation/Augment.ts`); `AetherImplant` = `AugmentMixin(SlottableMixin(TangibleMixin(Thing)))`; clone-time install via `Avatar.installDefaultLoadout()` (`obj/Avatar.ts:434`) from `postRegister`, occupying the capacity-1 `cranial` slot.
- **Command pipeline**: a verb = YAML view (`mud/cmd/<category>/<verb>.yaml`) + controller (`obj/command/<category>/<Name>Controller.ts`) + controller seed (`seeds/obj/command/<category>/<Name>.yaml`) + `commandContributions` discovery + validators (`lib/command/validators/<name>.ts`). Verb-level validators (`requires*` family) short-circuit before MQL. Controllers return `void`; outcome via `MessageApi.scene(...).send()` + `ctx.note(...)`.
- **`WorldClockApi.cron(pattern, cb, { host })`** (`api/worldclock.ts:262`) — fires at a **game time-of-day** (`CronPattern = { weekday?, monthday?, month?, hour?, minute? }`), paused/scaled with the world clock; `.every(interval, cb, { startAt })` for game-time intervals; `.at(deadline, cb)` one-shot. `{ host }` auto-cancels on destruct; returns a `ClockHandle`. **Schedules are never persisted** — a node re-arms its timetable in `postRegister` from authored data.
- **Boot manifest / `BootstrapManager`** clones the seeded singletons at boot (the Warren, the Bar, AccessRegistry, …). The fast-travel network's **single root node** is added here (§2). The builder confirms the exact manifest entry point.
- **`Mixins` registry** (`lib/mixin.ts`) + `MixinApi.isX` predicates (`api/mixin.ts`).

### Decisions (settled; planned here, justified)

1. **A node is a `Thing`.** A fast-travel node (a terminal) is a `Thing` (Containable — it sits in a room's `getContents()`, like furniture), NOT a `Location` and NOT an `Adornment`. It composes `FastTravelMixin` + `Perceptible` (keywords) + `Visible`/`Detailed` (name + description). `container` stays honest: arrival is a deposit in the destination node's *room*, never in the node.
2. **Find "the node here" locally.** `teleport`/`register` scan the actor's environment `getContents()` for a Stuff with `FastTravelMixin` (`MixinApi.isFastTravel`). 0 → "there is no terminal here"; >1 → disambiguate by keyword / reject. No global index.
3. **Routes target nodes; every read is off the live node.** A route's destination is another **node's singleton path** — not a room, not a Warren. The destination's keywords, display name, and arrival room are read from the **live node instance** (`StuffApi.singleton(route.ref)`). A node *is* its own identity (its singleton path); routes reference it, `register` writes it, `teleport` checks it — **no separate `selfRef` field**. This dissolves the old Warren-label problem entirely (the lounge node simply carries `keywords: [lounge]` like any node).
4. **Arrival room = `node.getArrivalRoom()`** (read off the live destination node). Default returns `getContainer()` (the room the node sits in). The **lounge node overrides** it to `LoungeWarren.getHost()` (the elastic case). `teleport` = `mover.teleport(destNode.getArrivalRoom())`.
5. **`register` requires an arrival-capable node.** A departure-only node is one-way *out* — you can never arrive there, so there is nothing to register. `register` is allowed only at `arrival`/`both` nodes; `teleport` requires `departure`/`both`.
6. **Loading = one-seed cascade; no registry.** A single root node sits in the boot manifest. On hydrate, each node (a) ensures its room and (b) resolves each `route.ref` via `StuffApi.singleton`, loading the destination node, which cascades. Singleton caching terminates cycles. The whole connected network + its locations come live from one seed. **No list/registry of terminals anywhere.** The lounge is **eagerly loaded** at boot (its node forces the Warren host).

---

## 1. Overview

A directed network of public **nodes** (terminals) you teleport between, gated by a **travel credential** you carry (a card) or wear (a cranial implant). Generic mechanism in `lib/fasttravel/` ("fast travel"). Content is **Teleport Authority / TPA** fiction and "fast travel" never appears in it: the **generic** TPA content (the node class, card, implant) lives in `/domain/common/tpa/`; an **individual terminal** is content of the area it stands in and lives in *that* domain (`/domain/lounge/`, `/domain/eternal/`, …).

Delivers:

- **`FastTravelMixin`** (`lib/fasttravel/FastTravel.ts`) — directionality, a directed set of **routes** to other nodes, a **currently-selected destination** (state), the timetable/manual/cycle advance policy, the derived departures board, `getArrivalRoom()`, the cascade-load of route destinations, and the future-`status` seam.
- **`TravelRoute`** — **not a module**; a colocated `interface` (destination **node path** + per-route **timetable** `CronPattern[]`) declared in `FastTravel.ts` alongside the mixin that owns it.
- **`TravelCredentialMixin`** (`lib/fasttravel/TravelCredential.ts`) — the registered-node set + register/authorize surface, composed by **both** a `TravelCard` Thing and a `TravelImplant` augment (both `/domain/common/tpa/`). State on the credential Stuff (card transferable).
- **`teleport`** + **`register`** verbs — global `CommandDefinition`s gated by `requiresTravelCredential` + `mustBeAtFastTravelNode` validators + the directionality check in each controller.
- **The lounge node** (`both`, comped, eagerly loaded, the way out of the lounge) routing to the University Avenue node; the pre-seeded University Avenue registration in every fresh credential.
- **`docs/subsystems/fast-travel.md`**.

---

## 2. Loading, identity & arrival (replaces the old "shared resolver")

There is **no** `resolveDestinationContainer` and **no** change to `Avatar.applyStartLocation`. Teleport does not resolve a ref-to-container; it reads the live destination node's arrival room. Spawn keeps its own Warren branch (`applyStartLocation` unchanged) — there is nothing to share.

**Identity.** A node's network identity is its **singleton class path**. Routes store destination paths; `register` writes the current node's path into the credential; `teleport` checks the destination node's path against the credential. No `selfRef`.

**Arrival.** `FastTravelMixin.getArrivalRoom(): Promise<Stuff & Container>`:
- default → `this.getContainer()` (the room the node sits in; a resident singleton room).
- lounge node override (`LoungeTerminal`, in `domain/lounge/`) → `(await StuffApi.singleton<LoungeWarren>(WARREN_PATH)).getHost()`.

`teleport` = resolve the operating node's selected route → `dest = StuffApi.singleton(route.ref)` → `mover.teleport(await dest.getArrivalRoom())`.

**Cascade load.** One root node in the boot manifest (the lounge node — see Wave 5). In `postRegister` each node:
1. **Ensures its room.** Static node: the Hydrator's `applyContainer` already self-placed it (seed `data.container`). Lounge node: forces `LoungeWarren.getHost()` (eager host at boot).
2. **Cascades.** For each `route.ref`, `await StuffApi.singleton(route.ref)` — loads the destination node if absent. That node runs the same `postRegister`, cascading to the whole connected component (routes) plus co-located sibling nodes (a shared room's `getContents()`).

**Cycle safety (implementation note).** The cascade must run **after** the node is registered in the singleton cache, so a reentrant lookup (B routing back to A while A is mid-`postRegister`) returns the in-flight A rather than re-cloning. This is the existing singleton-reentrancy discipline (`LoungeWarren` self-registration relies on the same ordering). The builder verifies `StuffApi.singleton` caches at registration, pre-`postRegister`; if not, gate the cascade behind a `queueMicrotask`/post-register hook.

**Connectivity (note, not a bug).** The cascade reaches the component connected to the root via routes + co-location. A disconnected island would need a route-link or its own manifest seed — correct behavior (an island unreachable from the lounge is genuinely unreachable). v1's network (lounge ↔ University Avenue) is trivially connected.

**General authoring practice — the terminal knows its location, never the reverse.** A TPA terminal declares *its own* room (static: `data.container`; lounge: resolved via its Warren). **Locations never list terminals in their `contents`.** This is load-bearing, not stylistic: it's what lets the network cascade-load from a single root terminal without enumerating locations or keeping a terminal-bearing-room list (the registry we rejected). Consequence for **bootstrap**: only the **one root terminal** goes in the manifest; every other terminal and every terminal-room comes live by the cascade pulling it in. Future terminals follow this rule.

---

## 3. Build waves

Dependency-ordered; each compiles and tests independently.

### Wave 1 — `FastTravelMixin` + `TravelRoute` + cascade/live-read model

**New files:**

| File | Category | Contents |
|---|---|---|
| `lib/fasttravel/FastTravel.ts` | Mixin (`FastTravelMixin`, marker `_mixinName='FastTravelMixin'`) | The node's state + behavior (§4). Declares the colocated `interface TravelRoute { ref: string; departures: CronPattern[] }` (`ref` = destination node singleton path; `departures` empty for manual/cycle) and parses seed input into it in `applyRoutes` (`{ to: '/path', departures?: ["11:00", { weekday, time }] }`; `"HH:MM"` → `{ hour, minute }`). **No separate `TravelRoute` file** — it's the mixin's own data shape. |

**Edits:**
- `lib/mixin.ts` — add `Mixins.FastTravel = 'FastTravelMixin'` and `Mixins.TravelCredential = 'TravelCredentialMixin'` (latter consumed Wave 3; add both now).
- `api/mixin.ts` — `MixinApi.isFastTravel` and `MixinApi.isTravelCredential` predicates (registry-generated).

**No edit to `api/stuff.ts` or `obj/Avatar.ts` for routing** — the old resolver refactor is dropped.

**Tests (`lib/fasttravel/__tests__/`):**
- `FastTravel.test.ts` — directionality predicates; route collection surface; selection get/set/default; `selectDeparture`/`advanceSelection`; `resolveRouteByKeyword` no-match/ambiguous/hit reading **live** destination nodes' `getKeywords()`; `getArrivalRoom()` default (= `getContainer()`); the cascade resolves a route's destination to a live singleton (two-node fixture network, incl. a cycle, asserting no re-clone).

### Wave 2 — the `teleport` verb + departures board

**New files:**

**New files:**

| File | Category | Path |
|---|---|---|
| `requiresTravelCredential` | validator | `lib/command/validators/requiresTravelCredential.ts` |
| `mustBeAtFastTravelNode` | validator | `lib/command/validators/mustBeAtFastTravelNode.ts` |

**Edited (not new) — the reworked `teleport` verb:** `teleport` already exists at `cmd/author/teleport.yaml` + `obj/command/author/TeleportController.ts` (+ seed). This wave **reworks that verb into the dual-mode fork** (§5), not a second `teleport`: move it out of the author-only category; make it **self-move by default** with `--target <obj>` to move another (subsuming `goto` and the old object-relocation form); keep only `requiresAnimate` at the verb level; split the controller into `selfPoweredTeleport` (privileged; reuses the existing container-resolution + `Mobile.teleport`) and `tpaTeleport` (the new fast-travel fork). The two validators above are **not** verb-level on `teleport` — they gate `register` (Wave 3) and are reused as inline checks inside `tpaTeleport`. `goto` is retired/aliased.

**The TPA fork** — `tpaTeleport`: node-here → selected route → `dest = StuffApi.singleton(route.ref)` → registration gate → `mover.teleport(await dest.getArrivalRoom())`. The raw destination token is reinterpreted as a local route keyword (matched against live destination keywords).

**Departures board (Surface 1 — in scope, the primary v1 wayfinding surface):** rendered by `tpaTeleport` on a bare `teleport` (no destination) — no new verb. `FastTravelMixin.renderDepartures(viewer)` (see §4) is viewer-aware and must be **useful**: destinations, registered-status markers, next-departure times, the active/boarding destination. It carries the wayfinding weight precisely because the network-wide views are deferred.

**Surface 2 — the portable whole-network schedule (DEFERRED wayfinding, not built here).** A view of the *entire* TPA map + schedule, in three forms that are one deferred problem: a **Readable** (text whole-map), a **narrow-search verb** (e.g. `schedule <query>` — filter a large network), and a **client widget** (navigate the graph). All read the **resident-node graph** (an MQL query over `FastTravelMixin` — every node is loaded, so enumeration is free). Deferred because it's **unvalidatable at v1's 2-node network** — there's nothing to navigate yet; the **client widget especially waits for a real network**. Captured here so the data model (enumerable resident nodes) is ready; the build lands in the wayfinding wave with `map-slate`'s node-graph renderer.

**Edit:** `lib/fasttravel/FastTravel.ts` — `static commandContributions` granting `register` (Wave 3) on the `environment` bucket so it surfaces only at a node. (`teleport` is a general verb, discovered normally; the TPA fork self-gates.)

**Tests:** `TeleportController.test.ts` (extended) — **privileged** actor self-teleports to an MQL target anywhere (no node/credential needed); **unprivileged** actor at a node rides the TPA: bare `teleport` renders the board (two nodes → same destination → same label — uniformity); `teleport <keyword>` selects + travels; static-room and lounge (Warren-host) destinations both relocate via `Mobile.teleport` (narration; honest `container`); unregistered refused; keyword no-match/ambiguous; **unprivileged + not at a node** → "there is no terminal here" (not a silent self-teleport). Credential set hand-seeded this wave.

### Wave 3 — the credential (card + implant) + `register`

**New files:**

| File | Category | Path |
|---|---|---|
| `TravelCredential.ts` | Mixin | `lib/fasttravel/TravelCredential.ts` |
| `TravelCard.ts` | Stuff class | `domain/tpa/TravelCard.ts` |
| `TravelImplant.ts` | Stuff class | `domain/tpa/TravelImplant.ts` |
| `register.yaml` | Command YAML | `mud/cmd/movement/register.yaml` |
| `RegisterController.ts` | Controller | `obj/command/movement/RegisterController.ts` |
| `RegisterController.yaml` | Controller seed | `seeds/obj/command/movement/RegisterController.yaml` |
| `travel-card.yaml` | Seed | `seeds/domain/common/tpa/travel-card.yaml` |
| `travel-implant.yaml` | Seed | `seeds/domain/common/tpa/travel-implant.yaml` |

**`TravelCredentialMixin`** (§6): the registered-**node-path** set + register/authorize surface + the pre-seeded University Avenue node path, baked at construction. Composed by both hosts. `TravelCard` = `TravelCredentialMixin(TangibleMixin(Thing))`; `TravelImplant` = `AugmentMixin(TravelCredentialMixin(SlottableMixin(TangibleMixin(Thing))))`, `confers() → []` (capability lives on the implant Stuff itself — augmentation's "capability-on-augment-Stuff" direction). `TravelCredentialMixin.findActive(actor)` — implant-first, card fallback.

**Default loadout (card, not implant):** the cranial slot is capacity-1 and already holds the `AetherImplant`. So `Avatar.installDefaultLoadout` issues a **`TravelCard`** into inventory (idempotent, skip if already carrying a credential); the **`TravelImplant`** is real/composed/seeded/tested content but not the default loadout (no second implant slot in v1). Forward concern logged in `augmentation-slate.md` open-Q5. **Edit:** `obj/Avatar.ts` `installDefaultLoadout`.

**`register`** (§7) — arrival-capable nodes only; writes the current node's singleton path into the active credential.

**Tests:** `TravelCredential.test.ts` (set surface; born-with University Avenue survives hydration; `findActive`); `RegisterController.test.ts` (writes the node's path; card **and** implant; refused at a departure-only node; idempotent); `TravelCard.transfer.test.ts` (full-boot: hand card → recipient travels its routes; giver's implant set unaffected); `TravelImplant.install.test.ts` (install into a free fixture slot → register/teleport).

### Wave 4 — destination advance (timetable / manual / cycle)

World-clock-bound; per-node policy. (Field model in §4.)
- **scheduled** — per-route `departures`; `armTimetable()` arms a `WorldClockApi.cron(pattern, () => this.selectDeparture(route.ref), { host: this })` per `CronPattern` across every route. Independent per-destination timetables (the legacy `set_timetable`). On fire, flips the selection + emits the "now boarding for X" Scene (the legacy loudspeaker).
- **cycle** — one `WorldClockApi.every(cycleInterval, () => this.advanceSelection(), { host: this })` round-robin (degenerate).
- **manual** — no arming; `teleport <keyword>`/bare-`teleport` drive it.

`teleport` always acts on the current selection. `armTimetable()` runs in `postRegister` (re-arms every hydrate from persisted `routes`/`departures` — schedules never persist); `disarmTimetable()` in `onDestruct` (belt-and-suspenders; `{ host }` already auto-cancels).

**Tests:** `FastTravel.advance.test.ts` — via the clock test seams (`WorldClockApi._setNowProviderForTesting`/`_advanceForTesting`): a scheduled node flips its selection at each route's game time-of-day (independent per-route timetables verified — past 11:00 → Citadel, past 11:15 → Lounge; announcement fires); a cycle node round-robins on its interval; a manual node arms nothing; re-arm-on-hydrate from persisted `departures`.

### Wave 5 — content: the network root, the lounge node, University Avenue

**New files:**

| File | Category | Path |
|---|---|---|
| `TpaTerminal.ts` (generic node class) | Stuff class | `domain/tpa/TpaTerminal.ts` — `PostRegistrationMixin(DetailedMixin(VisibleMixin(PerceptibleMixin(FastTravelMixin(TangibleMixin(Thing))))))`. The reusable TPA node; `SingletonMixin` so each instance is network-resident. Lives in `/domain/common/tpa/` because it's **area-agnostic** TPA machinery. "Terminal" is the TPA's **in-world** word (content), not a lib identifier. **Carries a default long description that communicates the affordance** — diegetically that a destination board is here and how to use it: bare `teleport` reads the board, `teleport <place>` travels (otherwise bare-teleport-shows-the-board is undiscoverable). Per-area seeds layer local flavor on top of this default, so every terminal surfaces the affordance uniformly. **Also computes its short description from `directionality` + `status`** — a diegetic status light: **blue** = arrival, **red** = departure, **purple** = both (additive, self-teaching), **dark** = offline (the `status` seam made visible; dormant in v1, lit by the later disruption loop). **The word carries the meaning, color only reinforces** (per color-conservatism — never color-alone, for accessibility; steady, never blinking): e.g. "a Teleport Authority terminal, its arrival light glowing blue." |
| `LoungeTerminal.ts` (lounge's node class) | Stuff class | `domain/lounge/LoungeTerminal.ts` — `TpaTerminal` subclass overriding `getArrivalRoom()` → `LoungeWarren.getHost()`. Lives with the rest of the lounge content (`Lounge`/`LoungeWarren`/`Bar`/`LoungeMixin`) because it's coupled to the lounge Warren. The elastic root node. |
| University Avenue room | Seed | `seeds/domain/eternal/university-avenue.yaml` — the Eternal University campus-entry arrival room (`primaryKeyword: university-avenue`, keywords `[campus, university, avenue]`). **EU content** (the campus front door; the EU build expands from here). |
| University Avenue node | Seed | `seeds/domain/eternal/university-avenue-terminal.yaml` — `class: /domain/common/tpa/TpaTerminal` (the generic class), `data.container: /domain/eternal/university-avenue`, `directionality: both`, `keywords: [university-avenue, campus]`, `routes: [{ to: /domain/lounge/terminal }]`. |
| Lounge node | Seed | `seeds/domain/lounge/terminal.yaml` — `class: /domain/lounge/LoungeTerminal`, `directionality: both`, `keywords: [lounge]`, `routes: [{ to: /domain/eternal/university-avenue-terminal }]`. **No `data.container`** — the Warren seats it. Comped (no price field). Lives with the lounge content. |
| FolderZone anchors | Seed | `seeds/domain/common/tpa/_zone.yaml` (generic TPA namespace) and `seeds/domain/eternal/_zone.yaml` (the new EU namespace) — leaf-invariant anchors. `/domain/lounge` already has its anchor. |

**The boot-manifest root = the lounge node** (`/domain/lounge/terminal`). One manifest entry. Booting it: forces its Warren host (eager lounge), gets seated in the host (below), then cascades its route → the EU University Avenue node (`/domain/eternal/university-avenue-terminal`) → its room → done. The whole network + locations live from this single seed.

**Seating the lounge node + eager host.** `LoungeWarren.wireHostFixtures(host)` seats the lounge node in the host (`StuffApi.singleton('/domain/lounge/terminal')`, `ContainmentApi.move(node, host)`) alongside the Dave's-Bar exit; `unwireHostFixtures`/host-migration re-seat it (it's a `SingletonMixin` fixture — one instance, moved). Eager host: the lounge node's boot (manifest) calls `getArrivalRoom()` → `getHost()`, creating the host at boot. **Edit:** `domain/lounge/LoungeWarren.ts` (`wireHostFixtures`/`unwireHostFixtures` + `LOUNGE_NODE_PATH = '/domain/lounge/terminal'`). **No `data.memberTemplate` on the warren seed** — that hack is gone; the lounge node carries its own `keywords`.

**Pre-seeded registration:** the EU University Avenue **node path** (`/domain/eternal/university-avenue-terminal`) is the born-with entry in `TravelCredentialMixin` (§6), so a fresh card authorizes the lounge→campus hop before any `register`.

**Tests:** `LoungeNode.fullboot.test.ts` (full-boot, mongodb-memory-server) — booting from the single manifest root brings up the lounge host (eager) + the lounge node + (cascade) the University Avenue node + room; a fresh avatar spawns in the lounge, finds the lounge node, `teleport`s to campus with no prior `register` (born-with University Avenue), arriving in the University Avenue room; walking to the University Avenue node and `register`-ing a *new* fixture node then teleporting works. Host-migration test: the lounge node re-seats onto the new host.

### Wave 6 — the subsystem doc

`docs/subsystems/fast-travel.md` — the node network (live nodes, directed routes to nodes, selection state, `getArrivalRoom`), the **one-seed cascade load** (no registry; live reads, never template data), the credential (one mixin, two hosts, state on the credential, implant-first), the verbs (`teleport`/`register` as capability-gated globals + validators + the directionality split: teleport=departure-capable, register=arrival-capable), the advance modes (world-clock timetables), the naming split (`lib/fasttravel` capability / generic TPA content in `/domain/tpa` / individual terminals in their own area domains — `/domain/lounge`, `/domain/eu`, … — never "fast travel" in any of them), and the deferred seams (fees, transit-map pane, disruption loop, address handle, premium auto-registration). Cross-ref location/spatial/augmentation/slot/command/time docs. Add the `docs/subsystems/` table entry in root `CLAUDE.md`.

---

## 4. `FastTravelMixin` — design detail

`lib/fasttravel/FastTravel.ts`. Composes onto a `Stuff` (Thing-based nodes). Marker `_mixinName = 'FastTravelMixin'`.

**Property fields (persistent):**
- `directionality: 'arrival' | 'departure' | 'both'` — `setDirectionality`/`getDirectionality`; predicates `isDeparture()`, `isArrival()`.
- `selectedDestinationRef: string | null` — the current selection (state). `getSelectedDestination()`/`setSelectedDestination(ref)`.
- `status: string` — living-infrastructure seam, default `'operational'`, carried but never gated in v1.
- `advanceMode: 'manual' | 'scheduled' | 'cycle'` (default `'manual'`); `cycleInterval: Quantity<'s'> | string | null` (cycle only).

**Instruction field:** `routes` — seed `data.routes`; `applyRoutes(raw)` normalizes each into a `TravelRoute` (the colocated interface declared in this file — ref + `CronPattern[]`) and populates the runtime collection (authored-once, like `Exitable`).

**Routes collection (keyed Map, key = node path):** `addRoute`/`removeRoute`/`hasRoute`/`getRoute`/`getRoutes`.

**Selection + advance:**
- `selectDeparture(ref)` — `setSelectedDestination(ref)` + emit "now boarding for <displayName>" to the room (legacy loudspeaker). Called by a fired cron departure.
- `advanceSelection()` — cycle to the next route (wrap); `cycle` mode only.
- Default the selection to the first route at hydrate if unset.

**Live-read helpers (source of truth = the live destination node):**
- `resolveRouteByKeyword(keyword)` — for each route, `StuffApi.singleton(route.ref).getKeywords()`; 0 → none, >1 → ambiguous, 1 → the route. Matched only against this node's routes.
- `renderDepartures(viewer)` — **the local board; the primary v1 wayfinding surface, so make it useful, viewer-aware.** Header: this node's display name + directionality. Per outbound route: the **live destination node's** `DescribeApi.getDisplayName`; a **registered marker** (text, not color — "✓" / "— not yet registered") computed against the viewer's `TravelCredentialMixin.findActive(viewer)` (unregistered destinations are still listed — the player learns what's reachable and that they must `register` it first; feeds the discovery loop); for scheduled nodes, the **next departure time(s)** for that destination (from its cron timetable, in game-clock terms); the **currently-boarding/active** destination marked prominently. Footer: the `teleport <keyword>` hint. (NPCs/non-credentialed viewers just omit the registered markers.)
- `getArrivalRoom(): Promise<Stuff & Container>` — default `this.getContainer()`; lounge subclass overrides to `LoungeWarren.getHost()`.

**Cascade:** in `armNetwork()` (called from the concrete node's `postRegister`, after cache-registration), `await StuffApi.singleton(route.ref)` for each route — loads destination nodes, cascading. Cycle-safe via singleton cache (§2).

**Discovery:** `static commandContributions = { environment: ['movement/teleport.yaml', 'movement/register.yaml'], self: [], inventory: [], peers: [] }`.

**Timetable lifecycle:** runtime-only `private _clockHandles: ClockHandle[]`; `armTimetable()` (cron per route-departure for `scheduled`; one `every` for `cycle`; nothing for `manual`) called from `postRegister`; `disarmTimetable()` in `onDestruct`. World-clock-bound; re-armed each hydrate from persisted `departures`.

---

## 5. The `teleport` verb — detail (dual-mode: self-powered **or** TPA)

**`teleport` is not TPA-only, and its subject defaults to *self*.** One verb,
two forks chosen by the actor's **capability/privilege**:
- **Self-powered** (privileged): you teleport **yourself** anywhere; the
  destination is **targeted via MQL**. An `--target <obj>` option moves
  *something else* instead (privileged, `AccessApi`-gated per target). This is
  the verb reframed: it does what **`goto` does today** by default, and folds
  in the old object-relocation `teleport` as the `--target` option.
- **TPA ride** (unprivileged): the same verb rides the fast-travel network from
  the node you're standing at (self only; `--target` not honored).

The **TPA route is its own fork in the controller, structurally separate from
self-powered teleportation** (the explicit requirement). Because the verb must
serve unprivileged players, the TPA-specific checks **cannot be verb-level
validators** (they'd block the self-powered path) — they live inside the TPA
fork only.

> **Verb reconciliation (decided).** This **reworks the existing `teleport`**,
> it does not mint a second one. Today `cmd/author/teleport.yaml` relocates an
> *object* and `goto` self-moves-anywhere. After this build: **`teleport`
> self-moves by default** (subsuming `goto` — retired, or a quiet alias) and
> **`--target <obj>` moves another** (subsuming the old object-relocation,
> keeping its container-vs-next-to destination resolution and `AccessApi`
> gate). The verb leaves the author-only category (unprivileged players need
> it for the TPA). Option name `--target` (vs `--subject`/`--who`) is a minor
> open detail — see §10.

**Syntax** (one `object`-typed positional = the destination, MQL-resolved for
the self-powered fork / reinterpreted as a local route keyword by the TPA fork;
plus the privileged `--target`):
```yaml
verbs: [teleport, tp]
description: "Teleport yourself (or, with --target, something else) — self-powered if able, else via the Teleport Authority."
validators:
  - /lib/command/validators/requiresAnimate   # the only verb-level gate
args:
  - { name: destination, type: object, required: false,
      scope: ["online", "/obj/**", "reachable"],
      description: "Where to go (self-powered: MQL; TPA: the raw token is a route keyword)." }
options:
  target:
    short: t
    type: object
    scope: ["reachable", "online", "/obj/**"]
    description: "Move this object/being instead of yourself (privileged; AccessApi-gated)."
```

**`TeleportController.execute` — the fork:**
```
if (model.target || canSelfTeleport(giver))   // canSelfTeleport v1: AccessApi.isAuthor/isDeveloper; later an in-world capability
   return this.selfPoweredTeleport(model, ctx)
return this.tpaTeleport(model, ctx)
```

**`selfPoweredTeleport`** — subject = `model.target` (if given; `AccessApi.can`
per target) else the giver; resolve the MQL `destination` to a container (the
existing author teleport's container-vs-next-to resolution, default `$focus`
for the `--target` object case); `subject.teleport(dest)` via `Mobile.teleport`.
Relocates anywhere; no credential, no node, no registration. (`--target` by a
non-privileged actor is denied here, not silently dropped to the TPA.)

**`tpaTeleport`** (the TPA fork — the new fast-travel logic):
1. `mustBeAtFastTravelNode` check (inline): scan environment `getContents()` for `isFastTravel`; 0 → "there is no terminal here." (>1 → keyword/sole-departure heuristic.)
2. `requiresTravelCredential` (inline): `cred = TravelCredentialMixin.findActive(giver)`; null → "you have no Teleport Authority credential."
3. `!node.isDeparture()` → "This terminal is for arrivals only." + reject.
4. `model.destination` present → treat its raw token as a keyword → `node.resolveRouteByKeyword(kw)`: none/ambiguous → diagnostic + reject; one → `node.setSelectedDestination(route.ref)`.
5. No keyword + no selection → `node.renderDepartures(giver)` and return.
6. `ref = node.getSelectedDestination()`; `dest = await StuffApi.singleton(ref)`.
7. Registration gate: `!cred.isRegistered(ref)` → "You haven't registered <name> — reach it another way and `register` first." + reject.
8. `room = await dest.getArrivalRoom()`; narrow the mover (`isMobile`+`isContainable`); `mover.teleport(room)` — narration + auto-sense; `container` is the destination room/host, never the node.

(`requiresTravelCredential` / `mustBeAtFastTravelNode` are kept as **validators** for `register` — which *is* TPA-only — and reused as the inline checks in the TPA fork. They are **not** verb-level on `teleport`.)

---

## 6. `TravelCredentialMixin` — detail

`lib/fasttravel/TravelCredential.ts`. Marker `_mixinName = 'TravelCredentialMixin'`. State on this focused mixin, composed only on the card + implant (not widened onto `Propertied`/`Avatar`).

**Registered set (Set of node-path strings):** `register(ref)` / `unregister(ref)` / `isRegistered(ref)` / `getRegistered()`. Backed by `private _registered: Set<string>`, declared in `persistentFields` (setter rebuilds the Set). State lives **on the credential Stuff** (card/aug), which moves with the card via `ContainmentApi.move` — "lend the card, lend its routes."

**Persistence reality (important — session-durable in v1, by design).** State-on-the-credential is forward-correct (transferable card; aug carries its own state), but it does **not survive a restart yet**: `Avatar.save()` persists only the avatar's *own* fields — inventory items don't round-trip (`state-model.md`) and the implant is re-cloned each session by `installDefaultLoadout`, not restored. So in v1 the registered set is **session-durable**; across a restart the credential is re-created fresh (born-with University Avenue, re-register the rest) — consistent with the "wipe DB between runs" posture. This build **does not solve persistence**; it declares the field persistent and rides the future work, which forks by host: **aug → colocated with the avatar's self-contained save** (when augs are explored / the snapshot deepens to capture installed augs); **card → inventory persist-back** (carried card round-trips) and ultimately **long-term storage** (durable non-player Stuff that survives restart and isn't GC'd from isolation — a card left in a chest). Both are out-of-scope seams already named in `state-model.md`; fast-travel is their first real consumer (a forcing function), not their builder.

**Born-with University Avenue:** constructor seeds `_registered` with `UNIVERSITY_AVENUE_NODE = '/domain/eternal/university-avenue-terminal'` as a **floor** — the hydration setter unions saved entries on top without clearing the seed (the "born-with" invariant). The single documented exception to "reach before you travel."

**`authorize(ref)`** = readability alias for `isRegistered`. **`findActive(actor)`** — scan cranial slot occupants for a `TravelImplant`, then inventory for a `TravelCard`; implant wins if both.

**Hosts:** `TravelCard` (`TravelCredentialMixin(TangibleMixin(Thing))`, `TEMPLATE_PATH='/domain/common/tpa/travel-card'`); `TravelImplant` (`AugmentMixin(TravelCredentialMixin(SlottableMixin(TangibleMixin(Thing))))`, `confers()→[]`, `TEMPLATE_PATH='/domain/common/tpa/travel-implant'`).

---

## 7. The `register` verb — detail

**`mud/cmd/movement/register.yaml`:** verbs `[register]`, zero-arg, validators `requiresAnimate` + `requiresTravelCredential` + `mustBeAtFastTravelNode`.

**`RegisterController.execute`:**
1. Resolve the node here (`isFastTravel` in environment).
2. `!node.isArrival()` → "This terminal is departures-only — there's nothing to register here." + `controller-rejected { reason: 'not-arrival' }`. *(A departure-only node is one-way out; you can never arrive there.)*
3. `cred = TravelCredentialMixin.findActive(giver); cred.register(node.getTemplatePath());` — the node's own singleton path is its network identity.
4. "Your credential records the <name> terminal." + note. Idempotent re-register → gentle "already registered."

---

## 8. Seed content

Seeds live in the domain each belongs to (TPA fiction throughout; no "fast travel" string; no price field anywhere):
- **Generic TPA** (`seeds/domain/common/tpa/`): `travel-card.yaml`, `travel-implant.yaml`, `_zone.yaml` (TPA FolderZone anchor). The `TpaTerminal` class is here too.
- **EU** (`seeds/domain/eternal/`): `_zone.yaml` (new EU anchor), `university-avenue.yaml` (room), `university-avenue-terminal.yaml` (`class: /domain/common/tpa/TpaTerminal`; both; `data.container: /domain/eternal/university-avenue`; routes→`/domain/lounge/terminal`; `keywords:[university-avenue, campus]`).
- **Lounge** (`seeds/domain/lounge/`): `terminal.yaml` (`class: /domain/lounge/LoungeTerminal`; both; routes→`/domain/eternal/university-avenue-terminal`; `keywords:[lounge]`; no container; comped).

- **Boot manifest:** add **only** `/domain/lounge/terminal` (the single root). Everything else cascades.
- **`seeds/domain/lounge/warren.yaml`:** no change (the `memberTemplate` hack is gone).
- **Avatar seed:** no change (the default card is issued by `installDefaultLoadout`).

Each node carries its own `keywords` + name/short-description (its presentation, read live) — the source of truth, never duplicated onto a route or read from a template.

---

## 9. Test plan

Vitest, colocated `__tests__/`. Unit for pure surface; full-boot (mongodb-memory-server) for cascade/registration/lounge.

**Unit:**
- `FastTravel.test.ts` — directionality predicates; route collection; selection get/set/default; `selectDeparture`/`advanceSelection`; `resolveRouteByKeyword` (none/ambiguous/hit) reading **live** destination `getKeywords()`; `getArrivalRoom()` default = `getContainer()`; cascade resolves a route's destination to a live singleton with a **cycle** (A↔B) asserting no re-clone.
- `TravelCredential.test.ts` — set surface; born-with University Avenue (survives hydration as a floor); `findActive` implant-first/card/both/none.
- `requiresTravelCredential.test.ts`, `mustBeAtFastTravelNode.test.ts` — pass/fail messages.

**Integration:**
- `TeleportController.test.ts` — bare `teleport` board (uniform label — same destination, same name at two nodes); `teleport <keyword>` selects+travels; static-room and lounge (Warren-host) destinations both relocate via `Mobile.teleport` (narration; honest `container`); unregistered refused; keyword no-match/ambiguous.
- `RegisterController.test.ts` — writes the node's path; card **and** implant; **refused at a departure-only node**; idempotent.
- `FastTravel.advance.test.ts` — world-clock timetables (per-route, independent; announcement fires); cycle interval; manual arms nothing; re-arm-on-hydrate.

**Full-boot:**
- `TravelCard.transfer.test.ts` — hand card → recipient travels its routes; giver's implant set unaffected.
- `LoungeNode.fullboot.test.ts` — boot from the **single manifest root** brings up the eager lounge host + lounge node + (cascade) University Avenue node + room; fresh avatar spawns in the lounge, `teleport`s to campus with no prior `register` (born-with), arrives in the University Avenue room; `register` a new fixture node then teleport works; host-migration re-seats the lounge node.

**Naming guard:** a small Vitest greps that "fast travel" appears in no `/domain/common/tpa/` seed or player-facing prose, and no content brand ("TPA"/"Teleport Authority") leaks into `lib/fasttravel/`.

---

## 10. Risks / decisions deferred to build

- **Cascade reentrancy (§2).** The cascade must run after singleton cache-registration so a cycle (B→A while A mid-`postRegister`) returns the in-flight A. Existing singleton discipline (`LoungeWarren` self-registration) covers it; builder verifies the ordering and gates the cascade post-register if needed.
- **Connectivity (§2).** The cascade reaches the root's connected component (routes + co-location). A disconnected island needs a route-link or its own seed — correct, and a non-issue for v1's 2-node network. `log`/document if a future network adds islands.
- **Eager lounge host at boot.** The root node forces `LoungeWarren.getHost()` at boot (user-approved). This makes the lounge Warren eager where it was lazy; confirm no boot-order issue (the clock + Warren are up before the manifest node hydrates — `WorldClockApi.boot()` runs before `BootstrapManager.run()` per time.md).
- **Implant vs card default loadout.** Card is the v1 default (cranial slot is capacity-1, held by `AetherImplant`); the implant is full content but not auto-installed. A default implant needs a second body-plan slot — out of scope, logged in `augmentation-slate.md` open-Q5.
- **Node-in-room disambiguation.** v1 expects one node per public room; the controller handles >1 by keyword/sole-departure heuristics — flagged, lightly tested.
- **`status` seam.** Carried, never gated; ensure no v1 path branches on it.
- **`teleport` reworked (decided, §5).** The existing `teleport` becomes the dual-mode verb: self-move by default (subsuming `goto` — retired or aliased), `--target <obj>` to move another (subsuming the old object-relocation, `AccessApi`-gated, keeping container-vs-next-to resolution), and the TPA fork for the unprivileged. Leaves the author-only category. Remaining minor open detail: the option **name** (`--target` vs `--subject`/`--who`) and whether `goto` is retired outright or kept as a quiet alias. Reworking an established verb (its tests, discovery, any `goto` callers) is real surface — the builder migrates `cmd/author/teleport.yaml`/`TeleportController`/its seed/tests rather than leaving a duplicate.
- **Credential persistence is session-durable only (§6).** Neither host round-trips its state across a restart today (no inventory persist-back; the implant is re-cloned each session). Keep state-on-the-credential anyway (transferable/forward-correct); v1 is session-durable (re-created born-with University Avenue on restart). Cross-restart durability depends on unbuilt subsystems — **aug-state colocation with the avatar save**, **inventory persist-back**, and **long-term storage for world-resident Stuff** — which fast-travel forces but does not build. Tests assume a single session (or a fresh DB), matching the project posture.
- **`canSelfTeleport` gate.** v1 = `AccessApi.isAuthor`/`isDeveloper` (privilege). Leaves room for a later **in-world** innate-teleport capability (a magic/aug mixin) without changing the fork shape — the gate just widens.
- **EU domain is new and minimal.** This build stands up `/domain/eternal/` with just its FolderZone anchor, the University Avenue arrival room, and its terminal — the campus front door. The Eternal University build expands from here. (Individual terminals live in their area's domain, not `/domain/common/tpa/`; `/domain/common/tpa/` holds only the generic node class + card + implant.)

---

## Critical files for implementation

- `packages/server/src/mud/lib/fasttravel/FastTravel.ts` and `.../TravelCredential.ts` — the two mixins carrying the mechanism.
- `packages/server/src/mud/lib/spatial/Mobile.ts` — the `teleport` primitive (reference, not edited).
- `packages/server/src/mud/domain/lounge/LoungeWarren.ts` — seat/migrate the lounge node; eager host.
- `packages/server/src/mud/domain/common/tpa/TpaTerminal.ts` (generic node class) and `domain/lounge/LoungeTerminal.ts` (lounge's elastic subclass, overrides `getArrivalRoom`).
- `packages/server/src/mud/obj/Avatar.ts` — `installDefaultLoadout` issues the default `TravelCard` (no routing change; `applyStartLocation` untouched).
