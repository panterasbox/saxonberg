# Declarative content slate (working doc)

Working slate for the **substrate that lets game content live as data, not code**. Covers how content comes into existence (spawn shape: `container:` references, `PopulatesMixin`, `PostRegistrationMixin` escape hatch), how the world's structure is described declaratively (room coordinates, exit graph, boundary attachments), how it all comes together at runtime (lazy resolution via existing `StuffApi.singleton`/`clone`; the bootstrap manifest is for engine services only), where new players land (the Avatar starting-location adjunct, which consults the avatar's existing `container` field), and the consumer-side `clone` verb that uses the substrate. **Consolidates and replaces `spawn-shape-slate.md` and `declarative-content-topology-slate.md`**, which were attacking different facets of the same problem. The hard architectural rule this slate defends: **content (zones, areas, rooms, items, NPCs) never lives in the API layer.** When content "needs code," that is a subsystem gap to surface — never a license to write per-content Api classes, registries, or hooks.

**Status**: **structural field shapes shipped** (substrate side of the slate). The
`coords` + `setCoords`, `focus` + `setFocus`, `exits` + `applyExits`
(instruction field carrying `Record<string, ExitInstruction>`), and
`attachedHosts` + `setAttachedHosts` landed in the spatial+boundary
substrate build. The Hydrator's two-phase dispatch (Phase 1 `setX`
property fields; Phase 2 `applyX` instruction fields) and Sealable
boolean rename rode along. Live references:
[docs/subsystems/spatial.md](../subsystems/spatial.md),
[docs/subsystems/boundary.md](../subsystems/boundary.md),
[docs/subsystems/templates.md](../subsystems/templates.md).

**Still pending**: the spawn-shape side — `container:` top-level
template field, `PopulatesMixin` + `populates:`, and the Avatar
starting-location adjunct (`Login.enter` consulting `avatar.container`).
These ship as separate builds (the spawn build needs its own
requirements / plan).

Historical context (below) preserved as design record for the
spawn-shape side. The earlier consolidation notes (vs.
`spawn-shape-slate.md` / `declarative-content-topology-slate.md`,
pushback on `wiring:` vs `data:`, `WiringSynthesizer`,
`seedOnlyFields`, `initialContents`, dep extractor / boot-manifest
cascade) remain accurate.

**See also**:

- [docs/slates/zone-architecture-slate.md](./zone-architecture-slate.md) — sibling slate covering the generic FolderZone class and the cardinal-only-intra-zone exit invariant. This slate assumes both ship; the field shapes here resolve through FolderZones, and the exits setter respects the cardinal rule.
- [docs/slates/biome-slate.md](./biome-slate.md) — slate-format exemplar; the layered escalation framing here borrows from biome's structure.
- [docs/subsystems/templates.md](../subsystems/templates.md) — clone pipeline, Hydrator contract, the folder/leaf invariant. Templates carry one `data:` block, period (modulo the `container:` top-level field per spawn-shape). The Hydrator's existing "call setter where defined" behavior is what makes setters with side effects work for the structural field shapes here.
- [docs/subsystems/spatial.md](../subsystems/spatial.md) — `CartesianZone.addLocation`, `ExitableMixin.addExit` / `addBidirectionalExit`. The setters here wrap these.
- [docs/subsystems/boundary.md](../subsystems/boundary.md) — `BoundaryApi.attachExistingBoundary`, `Window` and `Door` templates.
- [docs/subsystems/containment.md](../subsystems/spatial.md#containment) — `ContainmentApi.move`, the chokepoint for placement. `PopulatesMixin` calls `move` because the populate is a programmatic-but-explicit caller and goes through the standard chokepoint.
- [docs/subsystems/persistence.md](../subsystems/persistence.md) — `persistentFields`, `Hydrator`, the `Persistable` boundary. No extensions here; fields with side-effecty setters are an existing pattern.
- [docs/subsystems/lifecycle.md](../subsystems/lifecycle.md) — construction sentinel, `prepareDestroy`, `postRegister`. `PostRegistrationMixin` is the existing escape hatch.
- [docs/subsystems/hot-reload.md](../subsystems/hot-reload.md) — `HotReloadApi`, in-flight-clone guards. Setters are idempotent against existing-state checks; HMR composes naturally.
- [docs/subsystems/bootstrap.md](../subsystems/bootstrap.md) — `BootstrapManager`, `BootstrapEntry`, `dependsOn`/`awaitInit`. **Unchanged by this slate.** The static manifest is for engine services (registries, `EventRegistry`, future scheduler); content templates are not listed there. Content is lazy-loaded via `StuffApi.singleton`/`clone`.
- **[§ Adjacent: Avatar starting location](#adjacent-avatar-starting-location)** (below) — login flow consults the avatar's existing `container` field. Originally a separate slate; folded in here because the architectural principle is shared.
- **Eternal University Phase 1 (Duncan Hall)** — first content consumer that surfaced these gaps. Cross-link only.

---

## Principle

Five claims this slate makes:

1. **Content is data.** A template's `data:` block (plus the top-level `container:` field per spawn-shape) carries every value an instance starts with — descriptions, flags, coordinates, exits, attached host pairs, populate lists, container ref. There is no second category of "wiring metadata" living in a separate field. The Hydrator copies `data` field-by-field; setters with invariants do whatever side effects are needed.
2. **Three layers of declarative escalation**, lifted from spawn-shape's framing — each layer escalates only when the previous isn't expressive enough:
   - **YAML field**: direct declaration on the Template (`container:`, `coords:`, `exits:`, `attachedHosts:`, `populates:`).
   - **Mixin**: class-side capability consuming a YAML list (`PopulatesMixin` is the canonical example).
   - **Class scripting**: `PostRegistrationMixin.postRegister` is the escape hatch for everything declaratives can't express.
3. **Existing Hydrator + lazy resolution do the assembly work.** Setters with side effects drive the imperative APIs (`addLocation`, `addBidirectionalExit`, `attachExistingBoundary`, `ContainmentApi.move`); the APIs are unchanged. Ordering — "the zone must exist before the room registers, both rooms must exist before the window attaches" — is handled by lazy resolution: each setter that needs another template calls `StuffApi.singleton(path)`, which lazy-clones the target if it isn't already there. The existing `#inFlightClonePaths` cycle guard catches loops (bidirectional exits where both rooms reference each other, etc.).
4. **Content is lazy-loaded.** The bootstrap manifest is for engine-level services (registries, `EventRegistry`, future scheduler) — content templates are NOT listed there. First access (a player command walking into a zone, a setter calling `StuffApi.singleton()` for a referenced template, a `populates:` parent firing during its own hydration) triggers the lazy clone. Cascades unfold on demand: `dorm-101.applyExits` calling `singleton('/.../hallway')` lazy-clones the hallway, whose own setters lazy-clone its neighbors, with the existing `#inFlightClonePaths` cycle guard catching loops.
5. **Primary spawn paths are lazy `StuffApi.singleton()` + `populates:` chains, driven by client commands.** "Go north" forces the destination room to clone if not already loaded; the room's setters drag in its references via lazy resolution; PopulatesMixin's postRegister cascades child content. The `clone` verb is a developer/admin tool for magicking things into existence outside the natural flow — substrate consumer, not architectural pillar.
6. **No new substrate beyond the four field shapes and PopulatesMixin.** No `WiringSynthesizer` class. No dep extractor. No central `collectRefs`. No `BootstrapAction` interface. No `seedOnlyFields` flag. No topo-sort of content templates. All setters are ordinary; persistence is unchanged; spawn-shape's `container:` is the only top-level template-doc addition.

The hard constraint pulling against expansion: **no content-shaped Apis.** No `EternalUApi`, no `DuncanHallApi`, no per-domain "this is how my campus wires itself." If a piece of content needs something the substrate can't express, the answer is to extend the existing substrate (a new field shape, a new mixin, a new escape-hatch pattern) — never to ship per-domain code. The folder/leaf invariant from [zone-architecture-slate.md](./zone-architecture-slate.md) carries this principle for tree shape; this slate carries it for content assembly.

### What the prior iterations got wrong

- **First topology draft** proposed a separate `wiring:` field plus a `WiringSynthesizer` class. Rejected: two fields and two mechanisms for "what a template's instance starts with" is over-engineering. Setters with side effects are an existing pattern; once you accept them, the split collapses.
- **Second topology draft** introduced a `seedOnlyFields` flag for fields that hydrate but shouldn't round-trip on persist-back. Rejected: the Seeder is insert-only, the doc IS the source of truth at all times, and the supposed cases either (a) work fine as ordinary persistent fields with idempotent setters or (b) belong in `populates`/spawn-shape rather than topology. No flag needed.
- **Routing slate** (briefly drafted, scrapped) proposed a `LoginRoutingRegistry` singleton for "where do new players land." Rejected: login is configuration; content has no business participating in the login flow. Mechanism collapses to "login consults the avatar's existing `container` field" plus a content-side character-creation hook.
- **A proposed `savedLocation` field on Avatar** (an earlier draft of the Adjacent section). Designed as a Pattern A path for "where the avatar logged out from / lands on next login," with `PropertiedMixin.savedProps` as the carrier and `Avatar.onLinkdead` capturing the current container. Rejected: Avatar is a Containable; it already has a `container` field tracking its current Location at runtime. A `savedLocation` field would be duplicate substrate. Login consults the existing container; no new field needed; no capture step needed (container is always current via normal containment ops).
- **Original topology slate's `initialContents` field** duplicated `PopulatesMixin` + `populates:` from spawn-shape. Removed; spawn-shape's mechanism is the right one.
- **A proposed dep extractor + boot-manifest cascade** (an earlier draft of this slate). Walked the template collection, computed `dependsOn` chains from refs in `exits`/`attachedHosts`/`populates`/`container`, emitted synthetic `BootstrapEntry`s so referenced templates would clone in topo order. Rejected: content is lazy-loaded; `StuffApi.singleton`/`clone` resolves refs on demand; the existing `#inFlightClonePaths` cycle guard handles loops. The whole orchestration was doing work that lazy resolution already does. The bootstrap manifest goes back to being engine-services-only.

---

## Layered design

Three escalation layers covering substrate-by-YAML through code-as-escape-hatch:

| Layer | Mechanism | Use case |
|---|---|---|
| **YAML field** | Direct declaration on Template | "I am here" (`container:`), "I have this position" (`coords:`), "I have these exits" (`exits:`), "I'm attached between these hosts" (`attachedHosts:`). |
| **Mixin** | Class-side capability composed onto base class, consumes a YAML list | `PopulatesMixin` + `populates:` — "I spawn with these inside me." Future mixins follow the same shape. |
| **Class scripting** | `PostRegistrationMixin.postRegister` | Multi-clone targeting, computed placement, conditional spawning, state-aware behavior. The catch-all for everything declarative can't express. |

Content templates are lazy-loaded — none of these layers fire until something resolves the template (a player command walking into the area, a `populates:` parent firing during its own hydration, a setter calling `StuffApi.singleton()` on a referenced template). The bootstrap manifest stays content-free; it's for engine-level services (registries, `EventRegistry`). Content hydration cascades happen on demand, with the existing `#inFlightClonePaths` cycle guard preventing infinite recursion.

---

## Spawn substrate

From `spawn-shape-slate.md` with locked decisions and a renamed `container:` field (was `environment:` — the name overloaded with env vars in `shell-environment.md` and with "the avatar's current Location" in spatial vocabulary). The three layers: a container ref for "where do clones land by default," a populate mixin for "what do I bring with me," and `postRegister` for everything else.

### `container:` on Template

A top-level field on the Template doc, alongside `path`, `class`, `hydratorClass`, `data`:

```yaml
# /obj/sword-of-eternity/seed.yaml
path:  /obj/sword-of-eternity
class: /obj/weapons/Sword
container: /domain/eternal-u/treasury/display-case
data:
  shortDescription: the Sword of Eternity
  attack: 999
```

**Semantics**: "instances of me get placed in this Container when no caller specifies otherwise." It's a default for the clone verb's destination resolution — a hint, never an override. Read by callers who'd otherwise be guessing where to put the result; ignored by callers who've already decided. The field is meaningful only for **Containable** templates (items, NPCs, vessels); Locations aren't Containables (they belong to zones via `coords:`), so they don't declare `container:`.

**Singleton constraint is on the target value, not on the source.** The clone source can be any template — multi-instance or singleton, item or NPC or vessel. The constraint applies to where the field *points*: the value must resolve to a singleton-shaped Container (typically a specific Location, but in principle anything Container-shaped that has a canonical instance — an NPC body, a specific vessel's interior). Resolution goes through `StuffApi.singleton(path)`, which lazily creates the unique instance if needed and throws on multi-instance state. You can't write `container: /obj/npc/wizard` because "which wizard?" is unanswerable; you CAN write `container: /domain/eternal-u/armory` because there's one armory.

**For multi-instance source templates (NPCs, vessels, fungible items), `container:` is fallback-only.** The primary spawning path is from a parent's `populates:` — an NPC declares its inventory loadout; a zone declares its furniture. The sword doesn't need to know about the wizard; the wizard's `populates:` brings the sword in. The sword's `container:` matters only when something clones a sword *standalone* — no `--into`, no `--here`, no `populates:` parent. In that case the natural target is a singleton institutional home (the armory, the smithy), and if there isn't a natural home, the template just doesn't declare `container:` and falls through to the clone verb's inventory last-resort.

**Top-level on the doc, not inside `data:`**: the field has to be readable BEFORE the instance exists (the caller wants to know "where do I put what I'm about to clone?"). Putting it in `data` would mean only post-hydrate code could read it — too late for placement decisions. This is the **one** exception to "everything in `data:`"; it earns its top-level slot by being needed pre-clone.

### `PopulatesMixin` + `populates:`

**Instruction field** (per "Property vs instruction fields" below). The YAML data is a declaration consumed to spawn entries into the container's runtime contents collection; the spec itself doesn't have a paired getter.

A class-side mixin in `lib/stuff/Populates.ts`. Composes on `Container` (you can only populate things you can hold things in). Declares `static instructionFields = ['populates']` and exposes `applyPopulates(specs: string[])`. Hydrator's Phase 2 (instruction-field dispatch) calls `applyPopulates` during hydration; for each entry, the applier dispatches on whether the source template is singleton-shaped and moves the resulting instance into self via `ContainmentApi.move`.

```yaml
# /obj/library/seed.yaml
class: /lib/spatial/CartesianLocation  # composes PopulatesMixin
data:
  populates:
    - /obj/decor/bookcase
    - /obj/decor/bookcase
    - /obj/decor/table
```

Same shape works for NPC inventory loadouts:

```yaml
# /obj/npc/Wizard/seed.yaml
class: /obj/npc/Wizard  # composes PopulatesMixin
data:
  populates: [/obj/staff, /obj/robe]
```

**Singleton vs non-singleton dispatch.** The author writes `populates: [path]` without caring about the source's shape; `applyPopulates` checks `MixinApi.hasMixin(templateClass, Mixins.Singleton)` and dispatches:

```ts
async applyPopulates(specs: string[]): Promise<void> {
  for (const path of specs) {
    const templateClass = await TemplateApi.getClassFor(path);
    let instance;
    if (MixinApi.hasMixin(templateClass, Mixins.Singleton)) {
      instance = await StuffApi.singleton(path);
      // singleton() returned the canonical instance — may already live
      // elsewhere (another populates parent, its own container: ref, player
      // movement). Respect that.
      if (instance.getContainer() !== null) continue;
    } else {
      instance = await StuffApi.clone(path);
    }
    await ContainmentApi.move(instance, this);
  }
}
```

The dispatch handles the common error case where a non-singleton call (`clone`) on an already-instantiated singleton would throw. Devs are responsible for putting `SingletonMixin` on classes that should be singletons; the applier trusts that and dispatches accordingly.

**Cycle protection** inherited from `StuffApi.clone`'s `#inFlightClonePaths` set — a populates loop (X populates Y, Y populates X) trips the same guard hydrator cycles do.

**v1 entries are paths only** — keeps the YAML simple. Richer shapes (`{ template, name, count }`) can layer on later if a real use case wants them.

**Re-applicable.** `applyPopulates` can be called again later with different data (e.g., to respawn contents after a reset). Each call's dispatch respects existing-container state (singletons not moved if already placed; clones still fresh).

**No restart-idempotency concern under the current persistence model.** The applier fires once per Stuff lifecycle — during hydration. A server restart produces a fresh Stuff with a fresh hydration; there is no "did I populate already?" question because each lifecycle is independent. When Stuff persist-back ships (currently only `state-model.md` notes Avatar persist-back as not-yet-implemented; the broader persist-back picture may evolve), the question reopens — `applyPopulates` may need to coordinate with restored runtime state. That's a future concern, not a v1 substrate problem.

### `PostRegistrationMixin.postRegister` — the escape hatch

Already exists. A class overrides `postRegister(context)` and can do anything — talk to APIs, schedule callbacks, place itself somewhere computed. `PopulatesMixin` is itself built on `PostRegistrationMixin`; it's the most-common pattern given a declarative front.

This is the escape hatch for everything the YAML can't express:

- "When this is the third Wizard cloned, put it in the third Wagon." Multi-clone targeting via stuffId.
- "Spawn at sunset." Time-conditional placement.
- "If the player's reputation is below 0, spawn the bouncer NPC too." State-conditional spawning.
- "Pick a random spawn point from these three." Computed placement.

---

## Structural field shapes

Three field shapes for the static structure of the world, each declared in the template's `data:` block, hydrated by the standard Hydrator, with side effects via setter.

### `coords` on `CartesianLocation`

**Field**: `coords: { x: number, y: number, z: number }` — a normal persistent field. Round-trips through persistence (a room *has* coordinates; that's per-instance state).

**Setter side effect**: `setCoords(c)` stores the value AND calls `this.getZone().addLocation(this, c.x, c.y, c.z)` to register with the derived zone. Zone resolution walks templatePath ancestry per `ZoneApi.resolveZoneForPath`, so the room knows its zone before this fires.

**Template YAML**:

```yaml
class: /lib/spatial/CartesianLocation
hydratorClass: /lib/persistence/PersistentHydrator
data:
  shortDescription: a freshman dorm room (101)
  coords: { x: 0, y: 0, z: 0 }
```

**Idempotency**: setter first calls `this.getZone().hasRoomAt(c.x, c.y, c.z, this)`; if true, no-op. New `CartesianZone.hasRoomAt(x, y, z, room?)` helper for the check.

**Spherical**: `SphericalLocation` uses `focus: { rho, theta, phi, radius }` as a sibling field with parallel setter calling `SphericalZone.addLocation`. Same pattern.

### `exits` on `ExitableMixin`

**Instruction field** (not a property field — see "Property vs instruction fields" below). The YAML data is a declaration consumed to install entries into the runtime `exits: Map<string, Exit>` (existing collection at `Exitable.ts:130`); the spec itself doesn't have a paired getter.

**Field shape**: `exits: { [direction: string]: ExitSpec }` where `ExitSpec = { destination: string, door?: string, bidirectional?: boolean, opposite?: string }`. Declared in `static instructionFields = ['exits']`.

**Apply method**: `applyExits(map)` iterates entries and calls `this.addBidirectionalExit(destination, direction, { door, opposite })` for `bidirectional: true` entries (default for cardinal directions), or `this.addExit(new Exit({...}))` for one-way. The existing `addBidirectionalExit` handles door-anchor attachment as part of its existing contract. No paired getter — the runtime collection is read via the existing `getExit(direction)` / `getExits(): Map<string, Exit>` / `addExit(exit)` API on `ExitableMixin`, which stays unchanged.

**Template YAML** (no change from the prior framing):

```yaml
class: /lib/spatial/CartesianLocation
data:
  coords: { x: 0, y: 0, z: 0 }
  exits:
    south:
      destination: /domain/eternal-u/duncan-hall/hallway
      door: /domain/eternal-u/duncan-hall/dorm-101/door
```

**Idempotency**: applier checks `this.hasExit(direction)` before each call. If the existing exit matches the spec (same destination, same door), no-op. If it mismatches, throw with both seed paths in the message.

**Cardinal rule**: `CartesianLocation.addExit` already rejects non-cardinal intra-zone exits (per [zone-architecture-slate](./zone-architecture-slate.md)). A bad YAML produces a hydration-time failure at the offending template.

**Re-applicable.** `applyExits` can be called again later with different data (e.g., an admin tool resynthesizing exits after a content edit). Each call processes the spec into the runtime Map idempotently; existing matching entries no-op, conflicts throw.

**Bidirectional back-edge**: when `dorm-101` declares a south exit to `hallway` with `bidirectional: true`, the setter wires both sides. When `hallway` is later hydrated and its exits map includes a north entry back, the setter sees the exit already exists and no-ops. **Authors can declare either side or both; the symmetric setter and idempotency handle the redundancy.** Most will declare on the leaf rooms.

### `attachedHosts` on `Boundary` templates (`Window`, future `SoundConduit`)

**Field**: `attachedHosts: [string, string]` — pair of template paths for the two hosts. Normal persistent field. The runtime fields populated by the setter are `anchorA: BoundaryAnchor` and `anchorB: BoundaryAnchor` (live refs; not persisted, derived on each hydration).

**Setter side effect**: `setAttachedHosts([a, b])` looks up the two hosts via `StuffApi.singleton`, calls `BoundaryApi.attachExistingBoundary({ boundary: this, hostA, hostB })`. The Api constructs the anchor pair and installs them on the hosts; the boundary's `anchorA`/`anchorB` refs are populated.

**Template YAML**:

```yaml
class: /lib/boundary/Window
hydratorClass: /lib/persistence/PersistentHydrator
data:
  baseTransmissivity: 0.85
  open: false
  attachedHosts:
    - /domain/eternal-u/duncan-hall/dorm-101
    - /domain/eternal-u/outside/old-road/section-1
```

**Idempotency**: setter checks `this.getAnchorA() && this.getAnchorB()`; if both anchors exist AND their `getAdornedTo()` matches the declared host paths, no-op. If mismatch, throw with diagnostics.

**Backing storage**: `attachedHosts` is stored on the runtime instance as the original string array (cost: two strings per boundary). Persist-back writes it back unchanged. The alternative — runtime-only `anchorA`/`anchorB`, with persist-back deriving paths via `anchorA.getAdornedTo().getTemplatePath()` — would require a one-off custom marshaller for this field. Not worth the complexity for two strings of memory.

**Doors are NOT declared this way.** Doors are also Boundaries, but they're wired transitively by the `exits` field shape (when an exit declares `door:`, `addBidirectionalExit` calls `attachExistingBoundary` for the door's anchor pair as a side effect). A Door template should NOT declare `attachedHosts`. The boundary attachment field is for **non-exit Boundaries**: Windows today, future SoundConduits, observation portals, magical scrying surfaces.

---

## Content loads lazily; boot manifest is for services

Content templates are not pre-cloned at boot. The bootstrap manifest is for engine-level singletons — registries, `EventRegistry`, future scheduler/clock services. Content templates enter runtime on first access:

- A **player command** walking into a zone (`go north`) triggers `StuffApi.singleton(destinationPath)`, which lazy-clones the destination room.
- A **setter** like `applyExits` calling `StuffApi.singleton(refPath)` on a referenced template lazy-clones it.
- A **`populates:` parent** firing its own `postRegister` clones each entry (per the dispatch in `PopulatesMixin` above), triggering their hydration in turn.

The cascade unfolds on demand. The existing `#inFlightClonePaths` cycle guard in `StuffApi.clone`/`singleton` prevents loops (window A and window B referencing each other; bidirectional exits where both rooms reference each other in `exits:`).

There is no dep extractor, no central `collectRefs`, no synthetic `BootstrapEntry`s, no topological sort of content. The substrate trusts lazy resolution. If a referenced template doesn't exist, the first lazy lookup throws at the call site — a clear error pointing at the bad ref. Boot-time validation is not provided here; if we want it later, a separate "walk the template collection and check every ref resolves" tool can ship as a CI / dev affordance, but it's not required for runtime correctness.

The "first content consumer" question (Eternal U Phase 1 / Duncan Hall) reduces to: when a freshman avatar logs in, `Login.enter()` reads the avatar's container path (set by the character-creation hook to `/.../dorm-101`), calls `StuffApi.singleton` on it, and the lazy cascade unfolds from there.

---

## Precedence — destination resolution

Adopted from `spawn-shape-slate.md`, generalized. Any spawn caller — a lazy `StuffApi.singleton()` resolution, a `populates:` parent firing, the clone verb, a programmatic Api caller — resolves the new instance's destination through the same precedence:

1. **Explicit caller-provided destination** wins. A `populates:` parent IS this caller (parent provides destination); the clone verb's `--into` / `--here` are this caller; any Api that clones with a destination arg is this caller.
2. **`template.container:`** — the template default for Containables with a singleton home.
3. **Caller-specific fallback.** Lazy `singleton()` for a Containable with no `container:` is an error (where would it land?). The clone verb falls through to the giver's inventory. Programmatic Apis may throw or prompt.

The conflict case — "library populates with bookcase, bookcase has `container: /treasury`" — resolves cleanly: PopulatesMixin doesn't read `container` at all. It just calls `ContainmentApi.move(child, this)`. The child's `container:` is irrelevant when somebody else is doing the moving.

When `populates` and `container` happen to **agree** (both point the same way), no conflict — populates does the placement, the container's intent is incidentally satisfied. Conflicts only arise when an author expresses contradictory intent.

### The `clone` verb — debug / admin consumer

Not a primary spawn path. Lazy `StuffApi.singleton()` and `populates:` chains (driven by client commands) handle ~all production spawning. The clone verb is a developer/admin tool for "magic this into existence right now" outside the natural flow.

It uses the precedence stack above with verb-specific shorthand: `--into <dest>` is layer-1 explicit; `--here` is sugar for `giver.getContainer()`, also layer-1; no verb options falls through to `template.container:` (layer 2) and then giver's inventory (the verb's layer-3 fallback).

No `-f` / `forceClone`. Clone is "willing something new into existence" — there's no per-target witness to bypass; permissions are the only gate. See `call-security.md § AdminOnly and the force-bypass shape`.

Full verb spec (YAML, controller, MQL alternation) lives in its own MR / verb-spec doc; this slate names the verb only to acknowledge the consumer.

---

## Worked scenarios

### Scenario A — Duncan Hall freshman dorm

Content shape: a CartesianZone `/domain/eternal-u/duncan-hall/` containing 5 cloned dorm rooms (101 through 105), a hallway connecting them, a front door from the hallway to `/domain/eternal-u/outside/old-road/section-1`. Each dorm room has a window onto the road outside. Each dorm room has a desk; each desk has a welcome packet sitting on it at first boot.

**Files** (under `packages/server/src/mud/seeds/domain/eternal-u/`):

```
eternal-u/                                                  Zone seed (FolderZone)
  duncan-hall/                                              Zone seed (CartesianZone)
    duncan-hall.yaml          (zone def)
    dorm-101.yaml             (CartesianLocation)
    dorm-102.yaml             (...)
    dorm-103.yaml
    dorm-104.yaml
    dorm-105.yaml
    hallway.yaml              (CartesianLocation)
    dorm-101/
      door.yaml               (Door)
      window.yaml             (Window — attachedHosts)
      desk.yaml               (Desk — populates)
      welcome-packet.yaml     (Paperwork)
    # ... and similar trees under dorm-102 through dorm-105
  outside/
    outside.yaml              (FolderZone)
    old-road/
      old-road.yaml           (CartesianZone)
      section-1.yaml          (CartesianLocation — road outside dorm windows)
```

**`dorm-101.yaml`**:

```yaml
class: /lib/spatial/CartesianLocation
hydratorClass: /lib/persistence/PersistentHydrator
data:
  shortDescription: a freshman dorm room (101)
  longDescription: |
    A small dorm room with a single bed, a wooden desk, and a window
    looking out on Old Road.
  coords: { x: 0, y: 0, z: 0 }
  exits:
    south:
      destination: /domain/eternal-u/duncan-hall/hallway
      door: /domain/eternal-u/duncan-hall/dorm-101/door
  populates:
    - /domain/eternal-u/duncan-hall/dorm-101/desk
```

**`dorm-101/window.yaml`**:

```yaml
class: /lib/boundary/Window
hydratorClass: /lib/persistence/PersistentHydrator
data:
  baseTransmissivity: 0.9
  attachedHosts:
    - /domain/eternal-u/duncan-hall/dorm-101
    - /domain/eternal-u/outside/old-road/section-1
```

**`dorm-101/desk.yaml`**:

```yaml
class: /obj/furniture/Desk
hydratorClass: /lib/persistence/PersistentHydrator
data:
  shortDescription: a wooden desk
  populates:
    - /domain/eternal-u/duncan-hall/dorm-101/welcome-packet
```

**`hallway.yaml`** (declares only the front door — dorm-room exits wire back to the hallway via bidirectional default):

```yaml
class: /lib/spatial/CartesianLocation
data:
  shortDescription: a long hallway
  coords: { x: 0, y: 1, z: 0 }
  exits:
    south:
      destination: /domain/eternal-u/outside/old-road/section-1
      door: /domain/eternal-u/duncan-hall/hallway/front-door
```

**First-access walkthrough** (no boot-time work — content loads lazily):

1. Seeder loads YAML into `domain` collection on first server start.
2. Server boots. Engine services start (registries, etc.). **No content is cloned.**
3. First freshman avatar logs in. `Login.enter()` reads the avatar's container path (set to `/domain/eternal-u/duncan-hall/dorm-101` by the character-creation hook), calls `StuffApi.singleton(/.../dorm-101)`.
4. `dorm-101` lazy-clones from its template. Hydrator runs:
   - `setCoords({x:0,y:0,z:0})` calls `getZone().addLocation(this, 0, 0, 0)`. The CartesianZone for Duncan Hall lazy-clones (via zone-derivation from templatePath) if not already there.
   - `applyExits(map)` — for each entry, calls `addBidirectionalExit`. For the `south` exit pointing at `/.../hallway`: `singleton(hallway)` lazy-clones the hallway; same for the door template. The hallway's own setters fire, lazy-cloning the front-door template and the outside road stub.
   - `PopulatesMixin.postRegister` iterates `populates: [desk]`. Dispatch: desk is non-singleton, so `StuffApi.clone(desk)`. Desk hydrates; its own `postRegister` fires `populates: [welcome-packet]`. Welcome packet hydrates. Desk's setter moves the packet into the desk via `ContainmentApi.move`.
5. Avatar is teleported into `dorm-101`. The window template isn't lazy-cloned yet — it gets pulled in when (a) someone references it via adornments resolution, or (b) the Light subsystem traverses it on a `look` from either side. Either way, lazy and on-demand.
6. When the freshman looks out the window, the Window template lazy-clones; `setAttachedHosts([dorm-101, old-road/section-1])` fires; `dorm-101` is already cloned (the avatar is in it); `old-road/section-1` is already cloned (from step 4's exits cascade); the boundary attaches.

**Zero content code in `bootstrap.ts`.** The whole content is YAML; lazy resolution handles all assembly through existing setters, `PopulatesMixin`, and the existing `#inFlightClonePaths` cycle guard.

### Scenario B — Player drift across restart (depends on persist-back)

Player takes the welcome packet from the desk into their inventory, logs out. Server restarts.

Behavior depends on Stuff persist-back, which is still being designed. Two plausible outcomes:

- **If welcome-packet's runtime state persists** (container ref round-trips): on next freshman login, the dorm/desk lazy-clone via the populates cascade; populate dispatches on welcome-packet; if it's a singleton, `singleton()` returns the existing instance (with `container: player-inventory`); dispatch sees non-null container and skips. Welcome packet stays with the player. If non-singleton: same outcome via the dispatch's existing-container check, assuming the persisted instance is discoverable.
- **If state doesn't persist**: every restart starts fresh; populate spawns a new welcome-packet on a fresh desk; the previous run's player-held packet is gone.

Either way, lazy resolution + PopulatesMixin's dispatch handles the substrate side correctly. The actual drift outcome is a persist-back design call, not a populate-design call.

### Scenario C — Hot reload of the welcome packet's class

A developer edits `/obj/Paperwork.ts` to add a new method. They reload via `HotReloadApi.reload(...)`.

- Existing packet instances still have the old class; new clones get the new class. Wiring unaffected.

A developer who edits `dorm-101.yaml` to change `coords: { x: 1, y: 0, z: 0 }` resets the doc (Seeder is insert-only) and restarts. On next boot:

- Seeder re-inserts the doc.
- Setter fires: `room.getZone().hasRoomAt(1, 0, 0, room)` returns false. `addLocation(room, 1, 0, 0)` runs.
- If the room had previous coords (0, 0, 0), the zone's grid still has a stale entry — wiring conflict surfaces. Throw at boot; dev fixes the world state or the YAML.

### Scenario D — Vessel with internal rooms

A small ship has deck, cabin, hold, connected by hatches:

```yaml
# /domain/eternal-u/harbor/skiff/deck
class: /lib/spatial/CartesianLocation
data:
  coords: { x: 0, y: 0, z: 0 }
  exits:
    down:
      destination: /domain/eternal-u/harbor/skiff/cabin
      door: /domain/eternal-u/harbor/skiff/hatch
```

The ship's initial dockside placement uses `populates` on the harbor location:

```yaml
# /domain/eternal-u/harbor/dockside
class: /lib/spatial/CartesianLocation
data:
  coords: { x: 0, y: 0, z: 0 }
  populates:
    - /domain/eternal-u/harbor/skiff
```

When a player goes "in the skiff," they enter via the synthesized `'in'` exit from `ExitableVessel`. No new substrate needed for vessels.

---

## What this stresses for existing subsystems

### Templates subsystem
- **`Template.persistentFields` gains `'container'`** at the top level (per spawn-shape; not in `data`).
- **No other top-level fields added.** All structural fields live in `data:`.
- The Hydrator extension to support setter-with-side-effects on existing fields is — nil; that pattern is already supported. The Hydrator already calls setters where defined.

### Spatial subsystem
- **`CartesianLocation.coords`** gains a setter calling `this.getZone().addLocation(this, x, y, z)`. Adds `coords` to `persistentFields`. New `CartesianZone.hasRoomAt(x, y, z, room?)` helper for the idempotency check.
- **`ExitableMixin.applyExits(map)`** new applier method (instruction field, not persistent — declared in `static instructionFields = ['exits']`). Iterates and calls `addBidirectionalExit`/`addExit` per entry, with per-direction idempotency via existing `hasExit`. The runtime `exits: Map<string, Exit>` field stays as the runtime collection (separate from the spec).
- **`SphericalLocation`** parallel `focus` field + setter.

### Boundary subsystem
- **`Window` (and other non-Door Boundary subclasses)** add `attachedHosts` to `persistentFields`, with setter calling `BoundaryApi.attachExistingBoundary`. Idempotency via `getAnchorA`/`getAnchorB`/`getAdornedTo`.
- **`Door` does NOT** declare `attachedHosts` (wired transitively via the `exits` field shape).

### Containment / Stuff subsystem
- **`PopulatesMixin`** new class in `lib/stuff/Populates.ts`. Composes on `Container`. Reads `data.populates: string[]` in `postRegister`; for each entry, dispatches via `MixinApi.hasMixin(templateClass, Mixins.Singleton)` to either `StuffApi.singleton(path)` (singleton-shaped sources; skips if already in another container) or `StuffApi.clone(path)` (non-singleton sources). Moves the resulting instance into self via `ContainmentApi.move`. Cycle protection via `#inFlightClonePaths`.
- **No new `ContainmentApi` surface.** `move` is the chokepoint; `PopulatesMixin` uses it directly.

### Stuff / lifecycle subsystem
- **`PostRegistrationMixin`** documented as the escape-hatch layer in the spawn escalation. Existing class, no code change.

### Bootstrap subsystem
- **No code change.** Static manifest is for engine services (registries, etc.); content is lazy-loaded. The manifest neither knows nor cares about content templates.

### Persistence subsystem
- **No code change.** No new flag, no new field shape, no extension. Setters with side effects are an existing pattern; persist-back round-trips ordinary fields.

### Hot-reload subsystem
- **No code change.** Setters idempotent against existing-state checks; re-hydration during HMR no-ops cleanly.

### MQL / query subsystem
- **No change.** Queries operate on runtime Stuff; substrate is boot-time.

### Login / connection subsystem
- **Per § Adjacent below**: `Login.enter()` consults the Avatar's existing `container` field (Pattern A path) and falls back to `DEFAULT_STARTING_LOCATION_PATH`. No new field; no capture step.

---

## Adjacent: Avatar starting location

A separate slate (`new-player-routing-slate.md`) was drafted alongside this work, originally proposing a registry-of-content-claims for "where do new players land." It was scrapped after multiple rounds of pushback — the design kept finding sneakier shapes for the same mistake (registry, then setting that content writes, then a dedicated `savedLocation` field) of either making content an active participant in login routing or duplicating substrate already on the entity. The resolved design is small enough to not need a slate of its own, but it's recorded here because it shares this slate's principle: **substrate handles configuration; content provides values, never participates in subsystem logic.**

### Principle

Login does not know about content subdivisions. Login knows about avatars and where they are. The fact that an avatar's container *happens* to be a Duncan Hall room is invisible to login. There is no "Eternal U claims new players" concept anywhere in the login flow. Subdivisions of the game advertise their entry points internally — via doors, signs, bus routes, hyperlinked exit prose, whatever content authors invent. They do NOT advertise to login.

### Mechanism

Avatar is a Containable. It already has a `container` field tracking its current Location at runtime — that's existing substrate. Login just consults the existing field; no new per-Avatar state is added.

- **Login**: read the avatar's container path (via the existing `getContainer()` / Pattern A accessor), resolve via `StuffApi.singleton`, teleport. Fall back to `DEFAULT_STARTING_LOCATION_PATH` only if the path is empty or doesn't resolve.
- **Logout / linkdead**: nothing to capture. The container field is always current; the avatar's "last known location" IS its container at the moment the session ends.
- **Initial population for new characters**: the character-creation flow places the freshly-forked avatar in the initial location via normal `teleport` / `ContainmentApi.move`. Container updates as a side effect. For Eternal U, that flow's content-side hook picks a Duncan Hall room and moves the avatar there. Picking logic is content-authored (lives wherever the Eternal U character-creation hook lives); the move uses substrate. Login never sees the picking happen.

Login pseudocode (replaces the current hardcoded constant lookup at `packages/server/src/mud/obj/Login.ts:73-79`):

```ts
const containerPath = avatar.getContainerPath();
const startingLocation =
  (containerPath && await StuffApi.singleton<Location>(containerPath).catch(() => null))
  ?? await StuffApi.singleton<Location>(DEFAULT_STARTING_LOCATION_PATH);
avatar.teleport(startingLocation, { silent: true });
```

No registry, no claim, no chain, no new field.

### Persist-back dependency

Avatar persist-back is explicitly Not Yet Implemented (`docs/subsystems/connection.md` "Not Yet Implemented" section; `docs/subsystems/state-model.md` "Persist direction"). For the avatar's container to survive a server restart, the container ref needs to round-trip through Avatar's persistent fields. This is the same persist-back work that other Avatar state depends on; not specific to login routing.

- **Same-session reconnect**: works (in-memory Avatar survives disconnect; container is intact).
- **Across-restart return**: degraded until persist-back ships (avatar re-clones from template; container may not be restored; login falls through to `DEFAULT_STARTING_LOCATION_PATH`).

Degradation is acceptable for Phase 1 and goes away when persist-back lands. No login-side workaround.

### Substrate work

1. Modify `Login.enter()` to read the avatar's container path and fall back to `DEFAULT_STARTING_LOCATION_PATH`.

That's the full scope. One file, one change.

---

## Open questions

1. **Bidirectional exit default.** Cardinals have a derivable inverse via `NavigationApi.invertDirection`; semantic labels don't. Lean: `bidirectional: true` is default for cardinals (`opposite:` inferred); for semantic labels `opposite:` is required when bidirectional. Matches `addBidirectionalExit`'s existing signature.
2. **Player-drift policy for `coords` / `exits` / `attachedHosts`.** If a seed declares one value but the runtime has another (admin tools edited; corrupted state), throw with both seed paths in diagnostics. Strict-by-default; a warn-mode flag could ship later for dev iteration.
3. **Idempotency on `attachedHosts` mismatch.** Throw with diagnostics. Half-attached boundaries are bugs; loud is right.
4. **Recursive `populates` depth.** A pencil case containing pencils sitting on a desk in a dorm: three levels. Lazy cascade handles it; depth bounded by world's natural containment tree. The `#inFlightClonePaths` guard catches accidental cycles. No special handling needed.
5. **`container:` vs `populates:` — which side declares?** Both declare the same relationship (this Containable belongs in that Container) from opposite sides. Both work for singletons and non-singletons (PopulatesMixin's dispatch handles either). The distinction is **who's the active declarer**: `container:` on the Containable says "I belong in X" (declarer-as-occupant); `populates:` on the Container says "I should contain these" (declarer-as-host). Lean: `populates:` is the more common shape (a desk listing what's on it reads better than every paperclip listing its desk); `container:` is for cases where the Containable has a clear singular home and many potential containers don't (the Sword of Eternity belongs in the treasury display-case; the display-case shouldn't be listing every artifact). Both consistent declarations coexist cleanly (first to fire moves the singleton, second no-ops via the existing-container check). Conflicting declarations (X says "I belong in A", A's `populates:` omits X, B's `populates:` includes X) need linter-level detection.
6. **Non-Cartesian content.** Spherical via `focus:` instead of `coords:`. Vessels work transparently (their interior is a CartesianZone). Lean: ship Cartesian v1; Spherical extension is one-method.
7. **Zone templates carrying `populates:`.** A CartesianZone might want "default content for the zone" (graffiti, mob spawners). Lean: not in v1. Per-room populates handles it on the leaf side; cross-cutting "every room in this zone gets X" is a future inheritance affordance.
8. **The clone verb's tooling exposure of `container:`.** Should `clone --template foo` print "landing in X (from foo.container)" for visibility? Tiny UX polish; not blocking.
9. **`PopulatesMixin` richer entry shapes.** v1 entries are template-path strings. Future shapes (`{ template, name, count }` for stacks, conditional spawns) compose on top. Out of scope here.
10. **Reset / respawn — shared requirements with `populates:`, deferred to its own slate.** A future "reset this game item — destroy the current one, respawn fresh" feature shares substrate with `populates:`. Both need (a) a runtime ref from the Container to the populated children, so the Container knows what it spawned and can destroy-and-respawn later; the ref evaporates on the child's destruct so a child that's already gone doesn't haunt the list. (b) A way to distinguish "I spawned this and own it for reset purposes" from "a player put this here and reset should leave it alone." (c) A declarative shape on the entry — likely a richer entry form (`{ path, resetCadence: 5m }` or similar) — for reset behavior. Out of v1 scope; PopulatesMixin v1 is fire-and-forget. When reset lands as its own feature, PopulatesMixin extends to track the ref and respect the policy. Flag now so the substrate doesn't get locked into a shape that fights reset later.
11. **MultiRoom / facade targets for `container:` (the Lounge case).** The Lounge is conceptually singular (one Lounge) but implemented as a dynamic multi-room assembly that grows/shrinks with occupancy — not a single Stuff. Today's singleton constraint on `container:` targets can't express "land in the Lounge" because there's no canonical Lounge Stuff to point at. Three plausible futures: (a) **facade-as-singleton** — a Lounge Stuff that IS a Container; internally routes `add` calls to whichever sub-room. Singleton constraint satisfied; routing hidden behind the Container interface. (b) **master/slave** — one room is master, master decides which slave receives new arrivals. (c) **Pattern C-style lazy resolution** — `container: /world/lounge` resolves at clone time via a registered resolver that picks among current sub-rooms. All three are Phase 2 problems (Lounge is Phase 2 of Eternal U). Lean: don't pre-bake; cross this bridge when the Lounge ships. Flag the constraint as a known limitation in the meantime.
12. **Boot-time content validation (CI affordance, not substrate).** Should a separate tool walk the template collection at boot (or as a CI check) and verify every ref resolves? Without it, broken refs surface at first lazy lookup (still a clear error, but later). With it, broken refs caught earlier. Lean: ship without; add a CI / dev-tool script if broken-ref-at-runtime turns out to be an operational pain point.

---

## What this slate does NOT cover

- **Permissions on edits to content templates.** Per [zone-architecture-slate § Permissions](./zone-architecture-slate.md#permissions-are-independent-of-zones), permissions are templatePath-prefix concerns at the persistence-write layer; this slate doesn't change that.
- **Locks, keys, and exit gating.** A door with a `lockedBy: /path/key` field would be a natural extension, but the lock/key substrate isn't shaped yet. Sibling slate territory.
- **Procedural / generated content.** A "random dungeon" generator that builds rooms at runtime can't predeclare in templates. Escape hatch: `PostRegistrationMixin.postRegister` — write a `postRegister` that does the imperative work. Field shapes here cover authored content; procedural is its own concern.
- **In-game runtime editor for content shape.** No "edit this room's exits via verb" affordance. Edits are seed-YAML or direct-Mongo today.
- **Topology / spawn migrations.** When a field shape changes (a new attribute, a meaning shift), there's no migration story. Dev workflow is reset-the-doc-and-restart, same as the seeder's pattern.
- **Hot reload of content shape.** A YAML edit doesn't propagate to a running server. Restart-scoped.
- **Cross-cutting defaults** (e.g., "every Faculty Office gets a default desk"). Per-template field shapes; cross-cutting would be a sibling concern (inheritance via FolderZone defaults).
- **Avatar persist-back implementation.** The Adjacent section consumes the assumption that the avatar's `container` ref will eventually round-trip; it doesn't design the persist direction. That's a separate item on `state-model.md`'s not-yet-implemented list.
- **Replacement of `awaitInit`.** The substrate supplements; the imperative escape hatch stays in `bootstrap.ts` for engine-level entries that need bespoke initialization.

---

## Once shaped into formal requirements

- **`container:`** field on `Template`. Top-level (not in `data`). Validated against singleton constraint at template-save time.
- **`PopulatesMixin`** at `lib/stuff/Populates.ts`. Composes on `Container`. Reads `data.populates: string[]` in `postRegister`; for each entry, dispatches via `MixinApi.hasMixin(templateClass, Mixins.Singleton)` to either `StuffApi.singleton(path)` (singleton sources, skips if already in another container) or `StuffApi.clone(path)` (non-singleton). Moves into self via `ContainmentApi.move`. Cycle protection inherited.
- **`CartesianLocation.coords`**: add to `persistentFields`; add `setCoords(c)` calling `this.getZone().addLocation(this, c.x, c.y, c.z)` after idempotency check via new `CartesianZone.hasRoomAt(x, y, z, room?)` helper.
- **`ExitableMixin.applyExits(map)`**: new setter dispatching to `addBidirectionalExit`/`addExit` per entry, with per-direction idempotency via existing `hasExit`.
- **`Window` (and non-Door Boundary subclasses)**: add `attachedHosts` to `persistentFields`; `setAttachedHosts([a, b])` calling `BoundaryApi.attachExistingBoundary` after idempotency check via existing `getAnchorA`/`getAnchorB`/`getAdornedTo`.
- **`SphericalLocation`**: parallel `focus` field + setter calling `SphericalZone.addLocation`.
- **No new bootstrap-side helper.** Content loads lazily via existing `StuffApi.singleton`/`clone`. No dep extractor; no central `collectRefs`; no `BootstrapAction` interface; no flag on Persistable; no `main.ts` boot-sequence change. The bootstrap manifest stays engine-services-only.
- **`clone` verb** (consumer; verb spec lives in its own MR — not a substrate deliverable): consumes `template.container` as layer 2 of the precedence stack once the field lands.
- **Login starting-location lookup** (per § Adjacent): `Login.enter()` reads the avatar's existing `container` (Pattern A path) and falls back to `DEFAULT_STARTING_LOCATION_PATH`. No new field on Avatar; container is normal Containable state. Character-creation hooks place the avatar via normal `teleport` / `ContainmentApi.move`.
- **Tests gating**: setter idempotency (re-set with same value is no-op); setter conflict detection (re-set with different value throws or skips per policy); PopulatesMixin singleton-vs-clone dispatch; PopulatesMixin existing-container check skips correctly; lazy cascade walkthrough (look up dorm-101 → hallway and door lazy-clone; populates → desk and welcome-packet lazy-clone); cycle protection on populates (X populates Y populates X) and on bidirectional exits (room-A.exits ↔ room-B.exits) via the existing `#inFlightClonePaths` guard; HMR composition (a class swap doesn't disturb existing wiring).
- **Worked-scenario integration test**: full Duncan Hall (5 dorms + hallway + outside stub + windows + desks + packets) lazy-loads from YAML seeds when a freshman logs in. **Zero content code in `bootstrap.ts`**. Test asserts the lazy cascade reaches every referenced template; setters wire correctly; cycle guards hold; the avatar lands in dorm-101 with the desk and packet present.
- **Documentation updates**:
  - `docs/subsystems/templates.md` — `container:` field; clarify that all other wiring metadata lives in `data:`.
  - `docs/subsystems/spatial.md` — new `setCoords` / `applyExits` setters; `CartesianZone.hasRoomAt`.
  - `docs/subsystems/boundary.md` — `setAttachedHosts` on Window; Door-via-exit transitive path.
  - `docs/subsystems/containment.md` — `PopulatesMixin`; singleton-vs-clone dispatch; drift behavior dependency on persist-back.
  - `docs/subsystems/bootstrap.md` — clarify that the static manifest is engine-services-only; content is lazy-loaded.

### Decisions log (consolidated)

| Item | Decision |
|---|---|
| Field name for clone destination default | `container` (top-level on Template doc). Renamed from `environment:` — that name overloaded with env vars (`shell-environment.md`) and "the avatar's current Location." |
| Constraint on `container:` **target** | Value must point to a singleton-shaped Container (typically a Location). Source template can be any shape — multi-instance sources are fine. |
| `container:` for multi-instance source templates | Fallback-only. Primary spawning for NPCs/vessels is `populates:` from the parent side; `container:` matters only for standalone clones. |
| Restart idempotency for `populates:` | Not a v1 concern. Hydration is one-time per instance lifecycle; `postRegister` fires once per hydration; populate fires once per `postRegister`. Re-evaluates when Stuff persist-back ships and restored runtime state needs to coordinate with declared `populates:`. |
| Reset / respawn substrate | Open, deferred to its own slate. Shares requirements with `populates:` (runtime ref to spawned children, ownership-vs-drift distinction, declarative reset cadence). v1 PopulatesMixin is fire-and-forget; extends when reset substrate lands. See Open Question §10. |
| MultiRoom / facade targets (Lounge case) | Open. Singleton constraint doesn't cover dynamic multi-room assemblies. Phase 2 problem; defer (see Open Question §11). |
| Boot-time content cascade / dep extractor | Rejected. Content is lazy-loaded via existing `StuffApi.singleton`/`clone`; `#inFlightClonePaths` cycle guard handles loops. Bootstrap manifest stays engine-services-only. |
| Populate mixin name | `PopulatesMixin` |
| Mixin home | `lib/stuff/` |
| Populates entries (v1) | Paths only |
| Precedence on conflict | Caller intent > template default; populates is a caller |
| Clone verb status | Debug / admin tool, not a primary spawn path. Lazy `singleton()` + `populates:` chains driven by client commands handle production spawning. |
| Clone verb fallback (verb-specific) | Inventory (the giver) |
| `--here` shorthand (verb-specific) | In |
| `--into` shape (verb-specific) | `type: object`, scope `[reachable]` |
| `wiring:` vs `data:` split | Rejected. One `data:` field carries everything (plus `container:` top-level). |
| `seedOnlyFields` flag | Rejected. Doc is source of truth at all times. |
| `WiringSynthesizer` class | Rejected. Setters + Hydrator + lazy resolution do the work. |
| `BootstrapAction` interface | Rejected. Standard `BootstrapEntry` is enough. |
| `initialContents` field | Rejected. `populates:` from spawn-shape covers it. |
| Login routing registry | Rejected. Login consults the avatar's existing `container` field + character-creation hooks. |
| Per-Avatar `savedLocation` field | Rejected. Duplicates the existing Containable `container` field. Login reads container directly. |
| Content participation in login | Rejected. Substrate handles configuration; content provides values. |

Future-wave items (locks; cross-cutting defaults via FolderZone inheritance; in-game topology-edit verbs; topology / spawn migration tooling; Avatar persist-back — which makes the container-on-login mechanism survive restart) wait for their own slates.
