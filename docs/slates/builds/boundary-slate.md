# Boundaries — one shared edge, each side is the exit

> **Status:** PARTIAL — opened 2026-11-03 (user, during the harbors MR review !511); its
> compatible first step shipped in !511 — an exit is an MQL candidate in its own right (§ 4).
> **Left:** the `Boundary` edge object every way between two places shares · the exit as that
> edge's SIDE · door↔exit references retired · the four overlapping models of today folded into
> it · the per-side `BoundaryAnchor` fixture retired · a window as a side that passes no movement ·
> the migration of the keyed exit classes · the named list of every derivation (§ 5).
> **Size:** a build.

## ⭐⭐⭐ The model (user, 2026-11-03)

> *An edge is ONE shared boundary object — a door, a window, a gate, a hatch, a gangway, a trapdoor,
> a portcullis, a curtain, a grating, an ice hole, a companionway — carrying its material, its
> keywords, open/shut, its lock and the channels it passes. Each room's SIDE of that edge IS the
> exit: its direction, its destination, and a description that is its boundary seen from here.
> `look door`, `look north`, `go north` and `open door` all bind the side, by plain keywords — the
> direction is stored keyword data on the side, the boundary's keywords are the side's too. The
> door↔exit references vanish. A window is a side whose boundary passes no movement.*

**What is NOT a boundary.** Walls and fences are a place's ENCLOSURE (`construction.md` —
`enclosure:` / `roof:` on the place, one face rule computed as `Exposure`). A boundary is an
*opening* in an enclosure or between two places; a wall has no other side you can be on.

**What it buys (lens 1, pedagogy; lens 2, expression).** One thing, one set of words: a player who
learns `open door` has learned `open north`, `lock gate`, `look hatch` — every way between places
is the same object answering the same verbs. An author writes a gate as ONE row (material,
keywords, lock) and places it between two rooms; today the same gate is a `Door` Thing, two
anchors, a shared reference on two exits, or a lock on an exit class, depending on who wrote it.

## 1. Today: four overlapping models

| # | Model | Where | What it carries | How a verb reaches it |
|---|---|---|---|---|
| 1 | **`Door` Thing + `Exit.door` + `attachedTo`** | `platform/thing/Door.ts` (`LockableMixin(SealableMixin(Boundary))`), `lib/boundary/Exit.ts` (`door` field; the setter registers into `Door.attachedTo: Set<Exit>`) | open/shut, lock + keyway, keywords (`Door.getKeywords()` folds in its description's tokens), conduits (light, sight, movement, smell, sound), `closesBehind` | by keyword on the door (`open oak`), or by direction — the exit is bound and `MqlApi.effectiveTarget` takes `exit.getDoor()` |
| 2 | **Per-side `BoundaryAnchor` fixtures** | `lib/boundary/Boundary.ts`, `lib/boundary/BoundaryAnchor.ts`, `api/boundary.ts` (`attachExistingBoundary`) | one `AdornmentMixin(Thing)` anchor per host in `getFixtures()`, knowing its boundary and side `'A'`/`'B'` | the light/sight walks (`VisionModality.lightAt`) cross a boundary through its anchors; MQL sees the door twice (exit-doors + fixtures) and dedupes by `stuffId` |
| 3 | **Lockable exit classes** | `residence/src/idea/KeyedDoorExit.ts`, `residence/src/idea/FrontDoorExit.ts`, `eternal-university/src/duncan-hall/idea/DormDoor.ts`, `platform/idea/BerthExit.ts`, `platform/idea/AshoreExit.ts` (all `LockableMixin(…Exit)`); `residence/src/idea/LotGateExit.ts` | the lock lives ON the exit, with no `Door` Thing at all; each side is a separate lock (the berth way and her deck's `ashore` read the SHIP's gangway lock to stay agreed) | `lock north` binds the exit, which satisfies `LockableMixin` itself (`effectiveTarget`'s first rung) |
| 4 | **`Window`** | `platform/thing/Window.ts` (`SealableMixin(Boundary)`, `attachedHosts: [pathA, pathB]`) | partial + directional transmissivity, tint; no movement conduit | as a fixture by keyword. ⚠ `boundary.md` says no row ever named it; three now do (`rejection/…/hut-window-west`, `…-south`, `generic-objects/…/fixture/window`) — the doc is stale |

Plus two shapes at the edges: **`DoorBearingMixin`** (an `ExitableVessel` holds one `door` for its
synthesized `out` exit) and **`KeptDoor`** (an exit with somebody on it — an attendant's veto on the
crossing, `cleanliness.md` D29).

**The cost of four.** The same fact — *this way is locked* — is answered four ways: `door.isLocked()`,
`exit.isLocked()` on a keyed class, the ship's gangway lock read by two exits, and nothing for a
window. `Exit.canTraverse` reads `this.door`; the keyed classes override `canTraverse`; the light
walk reads anchors; `look`'s exit line reads `door.stateWord()` and knows nothing of a keyed exit's
lock. A gangway is an exit class; a hatch is a `Door`; a gate is either.

## 2. The target shape

- **`Boundary`** — ONE object per edge, between two places. Material, keywords, description,
  `Sealable` (open/shut), `Lockable` (bolt + keyway), conduits per channel (movement, light, sight,
  sound, smell, water). A window is a boundary whose movement conduit is closed for good; a curtain
  passes movement and blocks sight; an ice hole's movement conduit is the ice's thickness.
- **`Exit` = a side.** Direction, destination (identity ref, lazy as today), the media it admits, the
  edge minutes, its own messages — and a reference to its boundary (or none: an open way with
  nothing in it). It describes itself as *its boundary seen from here* (the boundary's description,
  with its state), or the plain way when it has none.
- **Words.** The side's keywords are its direction (stored, see § 5) ∪ its boundary's keywords. So
  `look door` and `look north` bind the SAME candidate — the side — and `open door` / `open north`
  act on its boundary through one rule (`effectiveTarget`: the bound thing, else its boundary).
  The door is never a separate candidate, so the `stuffId` dedupe of door-via-exit and
  door-via-fixture disappears with the fixture.
- **Gone:** `Exit.door`, `Door.attachedTo` + `attachExit`/`detachExit`, `BoundaryAnchor` (the light
  walk asks each side's boundary instead of a fixture), `DoorBearingMixin` (a vessel's `out` is a
  side like any other), the keyed exit classes' private locks (their lock is their boundary's; a
  holding's keyway re-keys the boundary), `effectiveTarget`'s `getDoor()` rung (renamed to the
  boundary).
- **Kept:** `KeptDoor`'s veto (an attendant at a side is a side behavior), `DeferredDestinationExit`
  (a side whose far place is stood up on use), the conditional/edge-minute fields.

## 3. Migration shape

1. **The side owns its words.** `Exit.getKeywords()` already returns authored ∪ direction (§ 5);
   add the boundary's keywords to the union. `look door` now binds the side when a door hangs in it.
2. **`Door` becomes `Boundary` content.** The `door:` instruction on an exit (`applyExits`) builds
   a boundary and hands it to BOTH sides; `attachedTo` and the anchor pair go. Light/sight walks
   move from fixtures to `exit.getBoundary()`.
3. **Keyed exits.** `KeyedDoorExit`, `FrontDoorExit`, `DormDoor`: their lock moves to a boundary row
   (`pin-tumbler`, the holding's keyway); `BerthExit` + `AshoreExit` share the ship's gangway as ONE
   boundary instead of reading one lock from two exits. `LotGateExit` gets a gate boundary.
4. **Windows** become sides with a no-movement boundary, authored on the place's exits map like a
   door (no `attachedHosts:` second wiring path).
5. **Content.** Every `door:` in an exits map, every Window row, every keyed-exit row. No migration
   of data (drop the DB — `no-migrations-ever`).
6. **Docs.** `boundary.md` § Doors / Boundary Substrate / Window rewritten; `light.md`'s fixture walk;
   `mql.md`'s doors-and-exits section.

**Size:** a build — the kernel's boundary + light walks, five exit classes across three packs, every
authored door. Lens 5 (continuity): the boundary answers the same commands across epochs — a hatch,
an airlock and a portcullis are one object with different conduits.

## 4. The compatible first step — shipped in !511 (harbors review 3)

An exit is an MQL candidate in its own right: `stuff` IS the exit, scored over its name (its
direction) and its keywords; there is no `via: { exit }`. `Exit` composes `Visible` + `Perceptible`
and describes itself (`look north` → *a way north; the oak door is closed*, never where it leads);
`MqlApi.effectiveTarget` is *the bound thing, else the door hung in a bound way*; movement verbs
scope to ways (`here:exits`), so `go hesper` can only mean the way. Everything in § 2 keeps that
shape — the side IS the candidate — so the build changes what a side carries, not how it is found.

## 5. ⚠ Derived (magic), named

The user's rule: *authored is plain data; anything derived is magic, and must be named as such where
it lives.* Every derivation MQL's words depend on today:

| Derivation | Home | What it derives |
|---|---|---|
| An exit's NAME is its direction | `Exit.presentationPhrase()` (`lib/boundary/Exit.ts`) | the scorer's name for a way, and `look`'s heading |
| An exit's direction and its SHORT FORMS are its KEYWORDS | `Exit.getKeywords()` (`lib/boundary/Exit.ts`), reading `NavigationApi.shortFormsOf` | authored keywords ∪ direction ∪ `n`/`u`/`ne`… — so `go n` binds the north exit with no query-side rewrite |
| The direction TABLE (`n` ↔ north, `u` ↔ up, …) | `DIRECTION_ALIASES` in `platform/idea/api/NavigationLogic.ts` | data only; MQL never rewrites a word with it (the bare-verb aliases are `n` → `go n`, `Mobile.defaultAliases`) |
| A berth way's DIRECTION from her name | `Ship.berthWord()` / `Ship.installBerth()` (`platform/idea/Ship.ts`) | `the Hesper` → a way named `hesper` (`hesper-berth` when the word is taken) |
| A ship's KEYWORDS from her name | `Ship.commission()` (`platform/idea/Ship.ts`) | her name and each of its words |
| A rope end's KEYWORDS from the ship it came from | `Rope` — the end minted ashore (`platform/thing/Rope.ts`) | *line from the Hesper* answers to `hesper` |
| A wreck's WORD from her name | `WreckSiteMixin` (`water/src/lib/WreckSite.ts`) | the way named for a ship that went down |
| A door's KEYWORDS from its description | `Door.getKeywords()` (`platform/thing/Door.ts`) | `heavy oak door` answers to `oak`, `door` |

⚠ Two of these collide by construction on the quay: a berth way is NAMED `hesper` and the line from
her answers to the KEYWORD `hesper` — the scorer's name tier (100) over its keyword tier (70) is what
picks the way, and `go`'s ways-only scope is what makes the line unreachable to `go`. Whether the
name should simply be another keyword is the scorer question in
[one-resolution-rule](./one-resolution-rule-slate.md) § 4.

## 6. Reuse ledger for the plan (requirements, 2026-11-09)

Every concept the build needs, what already does it, and whether the build reuses or generalizes it.
Census on master at b06d790b8: 8 authored `door:` ways (all `platform/thing/Door`), 3 `Window` rows (2 with
`attachedHosts:`), keyed exits mostly code-built (`HoldingWarren`, `BuildingWarren`, `DormWarren`,
`PlatWarren`, `Ship`), 3 `keyed-door` rows, 5 `ashore` rows, 1 `kept-door` row, 1 `DoorBearingMixin` row.

| concept | already does it | this build |
|---|---|---|
| the edge object | `lib/boundary/Boundary` (two-anchor) · `platform/thing/Door` · `platform/thing/Window` | **generalize**: one `Boundary` per edge, Door and Window become its content (rows), the anchor pair retires |
| open / shut | `SealableMixin` (on Door, Window) | **reuse** on the boundary |
| lock + keyway | `LockableMixin` — ⚠ rewritten by build-2 (D9: `lock(by)`/`unlock(by)` → `LockAnswer`) | **reuse build-2's contract**; the five keyed exit classes' private locks move to their boundary |
| channels (movement, light, sight, sound, smell) | Door/Window conduits; `Exit` media | **reuse**, held by the boundary; water added as a channel only where a reader exists (plan decides) |
| the side | `lib/boundary/Exit` (`Visible` + `Perceptible`, an MQL candidate since !511) | **reuse**; it gains a boundary ref and loses `door` / `attachedTo` |
| target resolution | `MqlApi.effectiveTarget` (`getDoor()` rung) | **generalize** the rung to "else its boundary" — ⚠ build-2 W2 touches the resolver |
| keyed ways made by code | `KeyedDoorExit` · `FrontDoorExit` · `DormDoor` · `LotGateExit` · `BerthExit`/`AshoreExit` | **fold**: the warrens and `Ship` hand a keyed boundary to both sides |
| a vessel's way out | `DoorBearingMixin` (coach) | **fold** into a side |
| attendant veto | `KeptDoor` | **reuse** as a side behavior |
| deferred far side | `DeferredDestinationExit` | **reuse** unchanged |
| zone invariant | `Location.addExit` (cardinal-only intra-zone), `lint:locations` (coords + named doors) | **generalize** to the edge: adjacency, opposite sides, opening ≤ face; threshold across zones |
| crossing a zone | `crossesZone` on `WhereaboutsExit`, the location graph | **reuse** (derived) |
| a way's state on the wire | `StuffExitRecord.door {open}` · `WhereaboutsExit.door {name, open}` | **generalize** to one state (open · shut · locked · window · threshold) every screen reads |
| light through a way | the light walk via `BoundaryAnchor` fixtures | **re-point** to the side's boundary, one hop |
| window to the sky | enclosure glass (`construction.md` Exposure, Beer–Lambert) | **reuse** — not a boundary |

Genuinely new: the edge-level zone invariants as a gate rule, and the one way-state shape on the wire.
