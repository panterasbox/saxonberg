# Bulkable slate (working doc)

> **Status: PARTIAL** — the thermos slice shipped (slots, `transfer`, the
> closure scale, the MQL surface, the verb roster), then the libations,
> arcana and metabolism builds took `Container`+`Bulkable` (`CraftVessel`),
> the per-viewer contents augmenter and a real `ingest` seam →
> [bulk.md](../../subsystems/bulk.md)
> **Left:** mixing/solutions · the `sealed` gas level + the phase→closure
> map (granular → `open`) · universal reception on surfaces + the
> auto-compose wiring · regenerating sources · capacity↔collision
> unification (volume+density, displacement) · atmosphere-as-reservoir ·
> amount-aware `appearance` · `scoop` + durative bulk verbs · the poison
> `coat` / lamp-oil / potion-craft content · the containment inversion
> **Size:** a wave

Working slate for **bulk** — continuous, formless, measured matter
(water, flour, sand, oil, gas). Sibling to the shipped stackable
substrate (discrete fungible counts), but built on a fundamentally
different premise.

> *The 2026-06-11 reframe (holds-as-attribute, not fluid-as-Stuff) shipped as written — [bulk.md](../../subsystems/bulk.md) intro.*

See also:

- [docs/subsystems/stacks.md](../../subsystems/stacks.md) — the discrete-count
  sibling, shipped. Bulk reuses its response-envelope notes and its
  `via`/`quantity` result-slot patterns; it does **not** reuse the
  split/merge/`placeDirect` machinery (no fluid Stuffs to split).
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) —
  `Quantity<U>` substrate that backs bulk's `amount`. Read first.
- [docs/subsystems/race.md](../../subsystems/race.md) — `Material`
  substance singletons, which bulk references for identity + physics.
- [docs/subsystems/mql.md](../../subsystems/mql.md) — `MqlMatchVia`,
  `via.detailPath` (the precedent the bulk facet follows), the
  resolver scope-walk.
- [docs/subsystems/response-envelope.md](../../subsystems/response-envelope.md)
  — the clamp/empty notes the transfer primitive emits.
- [docs/slates/thermal-slate.md](./thermal-slate.md) — temperature
  composes alongside bulk (hot coffee, iced water); the phase-
  transition hook lives at the bulk↔Thermal seam.
- [docs/slates/collision-slate.md](./collision-slate.md) — capacity in
  mass/volume terms; displacement physics (Archimedes) lives here.

---

## Principle

*Shipped as designed — [bulk.md](../../subsystems/bulk.md) intro (bulk is not a Stuff; the holder attribute; the discrete/continuous split); the ice cube in a glass shipped as `CraftVessel` — bulk.md § `Container` + `Bulkable`.*

---

## `Bulkable` — cohesive machinery, pulled in per affordance

`Bulkable` is a single cohesive mixin (like `Detailed`): it owns the
**slot type**, the **`transfer` primitive**, the **`Material` identity**
wiring, and the response notes. What separates it from `Detailed` is
*reach*, not cohesion — it isn't composed selectively object-by-object;
it's **pulled in by the spatial affordances**, because the affordance it
backs (can be spilled on / poured into) is universal for those hosts
(see *Universal reception* below).

A **bulk slot** is `{ material, amount: Quantity<U> }`:

- `material` — a **path-string ref** to a `Material` singleton
  (an identity ref), resolved on read (HMR-safe).
- `amount` — `Quantity<U>`, persisted via `QuantityMarshaller`. `U` is
  the material's **natural measure** (liquids volume-or-mass, granular
  mass, gas mass-or-moles — *not* always volume, because gas is
  compressible).
- One material per slot in v1 (mixing / solutions / dilution deferred).

### The slot is per-affordance, not per-Stuff

*Shipped — [bulk.md § The model](../../subsystems/bulk.md) (two slots, independent of `Container`/`Surfaced`). Two clauses shipped in a different shape: a both-host declares its slots by authored flags (`interiorBulk`/`surfaceBulk`), not automatically; the method surface is `getBulk(affordance?)` and the affordance rides `via.bulk` (`BulkableApi.slotFor`), not the preposition.*

---

## Universal reception, gated retention

The affordance to *receive* bulk is universal; whether the bulk is
*retained* is the gated part. The two sides reach "universal"
differently:

**Surfaces — universal, no opt-out.** It would be incoherent for
`spill water on X` to work on the floor but fail on the desk — pooling
is intrinsic to being a surface. So surface-bulk is its own capability
composed on poolable surfaces — the **floor** (the Location's surface
handle), desks, counters — **independent of the `Surfaced` mixin**
(mirroring interior-bulk's independence from `Container`; the floor
carries it without being `Surfaced`). A dry surface just has a zero
surface-bulk: the empty state of a real capability, not dead weight.
(Porous absorption, edge run-off, spreading are deferred v2 skins.)

*The `liquidTight` boolean + drain cascade shipped as the ordered closure scale (`open < liquidTight < sealed`) with one-level drain-through — superseded by [bulk.md § Closure scale](../../subsystems/bulk.md) and § `BulkableApi.transfer` step 3.*

**Atmosphere — the third flavor (deferred).** Released gas disperses
into a room's air as a concentration (ppm). The natural host is
`AtmosphericMixin` (`lib/biome/Atmospheric.ts`) — **but today that's an
outward-walking resolver with no contents state.** Making it a bulk
holder is real new work, the bridge between this substrate and biome;
deferred until gas-release content drives it.

### Wiring — auto-compose vs require-companion (open)

Bulkable stays its own mixin, but the affordances need to pull it in
universally. Two patterns, same precedent as `Surfaced requires
Containable`:

- **auto-compose** — `Surfaced` / `Container` factories wrap Bulkable
  in, zero author ceremony (leaning here, especially for `Surfaced` —
  no author should be able to refuse to make a surface spillable).
- **require-companion** — the affordance *asserts* Bulkable is present
  via `__validateComposition__`; authors compose it. Less magic, but
  for a universal affordance that's pure tax.

---

## Source and sink — the unbounded ends

A holder has a **supply policy** and an **acceptance policy**, each
bounded or unbounded. The well and the drain are the degenerate ends of
the same dial, not new abstractions:

- **Source** (well, spring, tap, sea) — unbounded *supply*. `available()`
  returns ∞ (or a scheduled refill). Transfer math
  `min(requested, ∞, dest.remaining)` cleanly reduces to "the
  destination is the limit" — you fill the bucket, the tap keeps
  running. No special-casing in the primitive.
  - **Regenerating** wells use `ScheduleApi.recurring(ms, …)` to do
    `amount = min(capacity, amount + rate·dt)`. Orthogonal to transfer.

*The sink (`to: null`) and the floor-as-default-target shipped — [bulk.md § `BulkableApi.transfer`](../../subsystems/bulk.md), § The Floor.*

---

## The transfer primitive

*Shipped — [bulk.md § `BulkableApi.transfer`](../../subsystems/bulk.md) (over `BulkSlot` handles, not `Stuff & Bulkable`). The unshipped rows of the verb table (`scoop`, `draw from well`) are carried by the Verb roster and Source-and-sink sections below.*

---

## Capacity — a holder property, not a bulk property

Capacity is the holder's **geometry**, not the matter's, so it lives on
the spatial affordance and never on `Bulkable`. The codebase already
points this way: there's no capacity field on `Container` today, and the
[collision slate](./collision-slate.md) owns capacity as per-kind
`checkCapacity` functions (volume / mass / count) at the
containment-scope. Bulk's relevant kind is **volume**.

The separation of concerns:

- the **holder** owns capacity — `getSurfaceCapacity()` /
  `getInteriorCapacity()`, **per affordance**, matching the two bulk
  slots;
- the **bulk slot** owns `amount` (the current fill);
- `remaining = capacity − amount` is **derived**, and `transfer` reads
  it to clamp ("pour until full"). `Bulkable` never stores capacity.

So a desk's drawer (interior) capacity and desktop (surface) pooling
capacity are separate fields, parallel to its two bulk slots.

**Unit reconciliation.** Capacity is fundamentally a volume; a bulk
`amount` in mass or moles converts via `Material.density`
(`Quantity<'kg/m³'>`, already on Material). v1 dodges the conversion by
authoring capacity in the bulk's *own* measure (a liquid jar's capacity
in L, a flour bin's in kg) for a direct `capacity − amount` clamp. The
principled volume-plus-density model — and the **shared budget** where
discrete contents and bulk compete for the same interior volume
(displacement: an ice cube raising the water line) — belongs to the
collision slate. **v1 tracks discrete and bulk capacity independently.**

---

## Composition with Container / Surfaced — orthogonal slots

*Shipped — `CraftVessel` (garnish in `contents`, the drink in the interior slot), `Feeder`, `PlantPot`, `GardenBed`; [bulk.md § `Container` + `Bulkable`](../../subsystems/bulk.md), [crafting.md § The glass pool](../../subsystems/crafting.md).*

### Phase-transition hook (future, Thermal)

*Superseded by the code: ice in a glass is bulk (moved from an ice bin) melting as a bulk credit on the same slot (`CraftVessel.setIce`, crafting.md § The glass pool); a `Meltable` Thing destructs into a molten floor pool and a vessel's liquid solidifies to a cast Thing — [thermal.md](../../subsystems/thermal.md) ("ice → water → steam falls out of the shipped water material"), [fire.md](../../subsystems/fire.md).*

---

## Surfacing vs containment — the floor, and where bulk sits

*Shipped — [bulk.md § The Floor](../../subsystems/bulk.md) (an `Adornment` fixture, not `Surfaced`; containment flat; the puddle an attribute).*

> **Adjacent future work (its own slate).** Making surface-resting the
> *primary* discrete relation game-wide — every drop lands `restingOn`
> the floor, the floor elided to "here" in presentation, MQL bare
> addressing transparent across surfaces — is the honest "everything is
> on a surface" model. It's a real spatial refactor (resolver
> scope-walk, `:i` aggregation, drop, describe), and **bulk is
> orthogonal to it**: surface-bulk on the floor works whether discrete
> items are "in the room" (today) or "on the floor surface" (the
> inversion). This slate neither depends on nor blocks that refactor.

---

## Material gains identity — `PerceptibleMixin` + appearance

*Shipped — [bulk.md § Material identity](../../subsystems/bulk.md) (`PerceptibleMixin` + `appearance`; no `Visible`; keywords never leak into room scope). Still open:*

- Open: should `appearance` be **amount-aware** ("a splash" / "a glass"
  / "a pool" of water by quantity band)? Probably yes, via a small
  band table on the Material, but deferred until rendering content
  surfaces it.

---

## Naming & presentation — vessels, contents, and gestalt items

*Shipped — the short is authored per row and never composed from vessel + contents; the long gets one per-viewer contents sentence — [bulk.md § `getContentsDescriptionFor`](../../subsystems/bulk.md).*

### Three naming registers

*Superseded by the code: register 2's identified/unidentified flip is `describeFor` over an `Identifiable` material ([magic-items.md § Potions ride the MATERIAL](../../subsystems/magic-items.md)); registers 1 and 3 are authored shorts. The half-empty-mug quantity rendering is the amount-aware `appearance` tail (open question below).*

### The potion, worked

*Shipped — [magic-items.md § Potions ride the MATERIAL](../../subsystems/magic-items.md) (identification reaches past the glass; decant still heals; `PotableMixin` fires from the `ingest` bridge; dose falls out of the measure).*

### Variations, each surfacing a wrinkle

- **Poison** — delivered by `coat`/`apply`, not `drink`: a
  **surface-bulk** transfer onto a blade's film (ties to the surface
  affordance), with an on-hit effect. Effect-Material, different verb,
  different affordance.
- **Oil / lamp fuel** — register 1, reads great; `fill lamp from flask`.
  Pure win for the decomposition.
- **Wine / ale / spirits** — register 1; Dave's bar; quantity-aware
  "half-empty mug".
- **Holy water** — register 1 inverted: the *substance* is the famous
  named thing, the vial incidental.
- **Thrown / shattered vial** — releases its bulk as a splash / puddle /
  AoE (thrown-vessel + bulk-release). Future content, enabled.
- **Crafted potion** — pour tonic into a vial and seal it → you *made* a
  potion. Mixing + sealing + bottling = potion-craft, emergent.

---

## Material fidelity — demand-driven, not aspirational

> **Forward-looking principle.** Not a thermos-slice deliverable, but it
> governs how `Material` gets *used* the moment content arrives. Banked
> so future-us doesn't over-model a cup of coffee.

The `Material` substrate carries real chemistry (formula, molar mass,
atomic number, `composition` weight-fractions for mixtures/alloys,
edibility/toxicity). That depth is a **capacity, not a mandate.** The
governing rule:

> **Model a substance at the granularity its interactions actually read.**

Coffee's interactions need: a liquid, an appearance, a caffeine effect
(via `ingest`), and "hot" (when Thermal lands). All flat. None read a
water-fraction — so **coffee is a flat Material; the water in it is
*presumed*.** Decompose into constituents (water + solubles) **only**
when some interaction needs to see them, which for a drink is ~never.
The capacity to model a solution exists; the default never uses it.

Two distinctions this clears up:

- **Different substance vs. different phase.** Bean → brewed coffee is
  *two Materials* related by a process (extraction), not one Material in
  two states — the bean isn't coffee-frozen. Ice ↔ water *is* one
  Material (H₂O) in two phases (the phase-transition hook). Don't conflate
  a chemical transformation with a phase change.
- **Capacity ≠ mandate.** The danger is letting the substrate's *ability*
  to model deep chemistry leak into *forced* fidelity. It mustn't.

The three-layer stack that keeps it honest:

1. **Substrate** — Materials, bulk, surfaces, `transfer`, effects. The
   chemistry-set's *elements*. Built here. Can go deep; defaults shallow.
2. **The game** — a *curated, legible rule layer* on top (oil pool +
   flame → fire spreads; poison coats a blade; water conducts). This is
   where the fun lives, and it's **authored, not simulated** — emergence
   from a small learnable rule set, not from physics fidelity.
3. **The education dial** — because a vertical could *be* chemistry, the
   real fidelity (H₂O, molar mass, composition) is an **opt-in dial** the
   teaching content turns up. Same substrate, vertical-agnostic; Gus's
   coffee stays "coffee," a chemistry lesson models the solution.

### Influences (the design DNA)

- **Zork / MUDs** — the parser and the prose; rooms as stagecraft.
  The command pipeline + MQL are the heir. The skeleton.
- **NetHack** — the "everything interacts" density. But NetHack
  hand-authored thousands of special cases; Saxonberg's bet is to get
  that density through **composition** (capabilities + materials +
  effects compose; interactions *fall out*) rather than per-case code.
- **Larian / D:OS** — the *legible* chemistry set: small element set,
  memorable combinable rules, emergent tactics. And its signature
  mechanic — **surfaces and clouds** (oil puddles, poison clouds,
  electrified water, spreading fire) — *is* this slate's surface-bulk /
  spill / coat / drain machinery. Proof that the substrate we're building
  is fun **when the rule layer on top stays legible.**

The through-line: MUD bones, NetHack interaction-density via composition,
Larian's emergent-but-legible chemistry through surfaces and materials,
plus the educational fidelity dial none of the three had — all on one
substrate.

---

## MQL resolution & dispatch

*Shipped end to end — [bulk.md § MQL surface](../../subsystems/bulk.md) (`via.bulk`, `:b`, material keyword, the `measure` quantity variant, `:{N unit}`, the natural-language desugar on `QuantityApi`).*

---

## Verb roster

- `pour` — transfer between two holders
- `fill` — pour until the target holder is full
- `spill` — transfer to the environment surface (default sink)
- `scoop` — transfer from a surface/source into a carried holder
- `drink` / `sip` — drain a holder into the drinker's ingestion seam
- `eat` — drain granular/edible bulk into the ingestion seam

Most are **durative** (pouring/drinking take time) → the
[activity framework](../../subsystems/activity.md) wraps `transfer` as the
discrete underlying operation.

---

## The ingestion seam — designed for, not built

*Shipped, and no longer a no-op — `MetabolicMixin.ingest` on `Creature`, one seam for `drink`/`sip`/`eat` ([metabolism.md § The digestion buffer](../../subsystems/metabolism.md)); `PotableMixin` duck-types the same bridge ([magic-items.md](../../subsystems/magic-items.md)). Pointer: [bulk.md § The ingest seam](../../subsystems/bulk.md).*

---

## Authoring guidance — discrete `Thing` vs `bulk`

This is a **content-developer best practice**, not an engine decision —
the engine supports both; the author picks per object:

- **Discrete `Stuff`** when a unit has *shape and identity* and players
  treat it as countable — a loaf, an apple, a wheel of cheese, a coin.
  (Fungible + countable → also `Stackable`.)
- **`bulk`** when it's a *formless measured amount that conforms to its
  holder* — water, flour, sand, oil. The linguistic tell: "three Xs"
  (discrete) vs "some X" / "200 g of X" (bulk).

The same substance can be **both**, and the verbs that *cross the line*
are the interesting ones. Cheese is a wheel (`Thing`) you `cut`, or
grated (`bulk`) you `scoop`. So `cut` / `grate` / `grind` (Thing→bulk)
and `freeze` (bulk→Thing) are the **same machinery as the melt/freeze
phase-transition hook** — matter crossing the discrete↔bulk boundary
(a `Thing` destructs, its mass joins a `bulk` slot, or vice versa). The
engine only has to support the crossing; the author decides where each
material sits and which conversions exist. (`cut` and friends are
therefore *conversion* verbs, parked outside the bulk core until
food-prep content drives them.)

---

## Resolved decisions (settled this cycle)

*Every decision here is stated in [bulk.md](../../subsystems/bulk.md). Three shipped in a different shape: capacity is interim-authored ON the `Bulkable` slot (`interiorCapacity`/`surfaceCapacity`) pending collision; both-host slots are authored flags, not preposition-selected; `liquidTight` is a rung of the closure scale, not a boolean.*

---

## Open questions

- **Wiring — auto-compose vs require-companion** — how `Surfaced` /
  `Container` pull Bulkable in universally (lean auto-compose, esp. for
  `Surfaced`). See *Universal reception § Wiring*.
- *Resolved:* `liquidTight` defaults + drain cascade — default `liquidTight`, one-level drain-through to the floor ([bulk.md § Closure scale](../../subsystems/bulk.md), § transfer step 3).
- *Resolved:* `desk:b` on a both-host — `:b` stamps `affordance: 'interior'`; bare `getBulk()` throws on a both-host ([bulk.md § MQL surface](../../subsystems/bulk.md), § `BulkSlot`).
- **Capacity unification with collision** — folding the interim
  per-affordance capacity field into collision's volume-kind
  `checkCapacity`, plus the volume+density conversion and the shared
  discrete/bulk budget (displacement).
- **Atmosphere-as-reservoir** — extending `AtmosphericMixin` from a
  resolver into a bulk holder (concentration/ppm state) for gas
  release. The one genuinely new subsystem-touch; defer until gas
  content drives it.
- **`Material.appearance` amount-awareness** — band table for
  "splash/glass/pool" by quantity.
- **Mixing / solutions** — two materials in one holder (coffee +
  cream, salt + water). v1 forbids; design when alchemy/recipes drive.
- **Displacement physics** — dropping an ice cube into a brim-full
  glass overflows (Archimedes). v1 tracks bulk-volume and
  discrete-capacity independently; coupling lives in the collision
  slate.
- **Gas pressure** — a derived readout (from amount/volume/temp on the
  gas Material), not core state; deferred like Thermal's temperature.
- **Concurrent activities on one holder** — two actors drinking from
  one well; the activity slate's engagement slots probably cover it.

---

## Cross-references

- [stacks.md](../../subsystems/stacks.md) — discrete sibling; note reuse.
- [quantities.md](../../subsystems/quantities.md) — `Quantity<U>` backing.
- [race.md](../../subsystems/race.md) — `Material` identity + physics.
- [mql.md](../../subsystems/mql.md) — `MqlMatchVia`, `via.detailPath`
  precedent, resolver.
- [response-envelope.md](../../subsystems/response-envelope.md) — note
  kinds.
- [thermal-slate.md](./thermal-slate.md) — temperature + the
  phase-transition seam.
- [collision-slate.md](./collision-slate.md) — mass/volume capacity,
  displacement.
- [activity.md](../../subsystems/activity.md) — durative bulk verbs.
