# Bulkable slate (working doc)

> **Shipped (thermos slice).** The interior + surface substrate, the
> `transfer` primitive, the closure scale, the full MQL surface
> (`:b`, material keyword, `:{N unit}` formal + natural language), the
> verb roster, and the demo content are **built** — operational
> reference: [bulk.md](../../subsystems/bulk.md). This slate remains the
> design of record for the deferred tails (mixing, gas/`sealed`,
> `Container`+`Bulkable`, auto-compose, amount-aware appearance).

Working slate for **bulk** — continuous, formless, measured matter
(water, flour, sand, oil, gas). Sibling to the shipped globbable
substrate (discrete fungible counts), but built on a fundamentally
different premise.

> **Reframe (2026-06-11).** This slate previously modelled bulk as
> *fluid-as-Stuff*: "2.3 kg of flour" was its own Stuff with a
> `Quantity<U>` count, split into sibling Stuffs via `placeDirect`,
> merged via a merge-on-arrival ripple — the structural mirror of
> Globbable. **That model is retired.** Continuous matter is never an
> independent object, because it physically can't exist un-held — it's
> always *in* a container or *on* a surface. So bulk is now modelled as
> an **attribute of its holder**, not a Stuff. `Bulkable` is redefined
> from "a Stuff that **is** bulk" to "a host that **holds** bulk." The
> word stays; the architecture flips. Everything below is the current
> design.

See also:

- [docs/subsystems/glob.md](../../subsystems/glob.md) — the discrete-count
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
- [docs/slates/collision-slate.md](../deferred-rpg/collision-slate.md) — capacity in
  mass/volume terms; displacement physics (Archimedes) lives here.

---

## Principle

A **bulk** is a measured amount of continuous matter, stored as an
**attribute on a holder Stuff** — not as a Stuff of its own:

```ts
// BulkableMixin's persistent field
bulk: { material: MaterialRef; amount: Quantity<U> };
```

A thermos doesn't *contain a water Stuff* — the thermos **is a holder**
that carries `bulk = { material: water, amount: 0.5 L }`. Drinking
decrements `amount`; filling increments it; pouring moves measure from
one holder's `bulk` to another's. No fluid object is ever instantiated,
moved, split, or destructed.

The justifying observation: **you cannot hold water without something to
hold it in.** Walk every case — water in a thermos (container), water
spilled on a floor (surface), water in a well (surface/feature), flour
in a sack (container), flour heaped on a counter (surface), gas in a
cylinder (container), gas released into a room (atmosphere). Continuous
matter is *always* an attribute of its holder. There is no "naked fluid
floating in the room" to reify. So Bulkable-the-Stuff was solving a
problem that doesn't exist.

### The discrete / continuous split

This is the line between Globbable and Bulkable, and it's the cleanest
way to decide which a thing wants:

| | **Globbable** (shipped) | **Bulkable** (this slate) |
|---|---|---|
| Models | discrete, countable, individually graspable units | continuous, formless, measured matter |
| Examples | coins, arrows, gems | water, flour, sand, oil, gas |
| Representation | a **Stuff** with `quantity: number` | an **attribute** on a holder |
| Identity | the Stuff itself | the referenced `Material` |
| "Add two together" | merge (identity reconcile + destruct) | `amount += amount` (plain arithmetic) |

The **ice cube in a glass of water** is the canonical illustration:
the ice cube is shaped, discrete, individually graspable → a real
**Stuff** (a `Containable` in the glass's contents). The water is
formless and measured → the glass's **bulk attribute**. Same H₂O, two
representations chosen by *state* — and (future) melting is literally
"a Containable becomes bulk" (see the phase-transition hook below).

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

A single `bulk` slot is **insufficient** — a desk that is both
`Surfaced` (desktop) and `Container` (drawer) can hold water *on top*
**and** water *inside* at once, and one slot can't carry both. So bulk
mirrors how discrete contents already split — `restingOn` (surface) vs
`contents` (interior):

| affordance | bulk slot | example |
|---|---|---|
| **surface** (floor, desk, counter) | **surface-bulk** | a puddle on the floor / desktop |
| **interior** (vessel, drawer) | **interior-bulk** | water in a thermos / a drawer |

The bulk slot is its **own capability, independent of the spatial
mixins**: surface-bulk does **not** require `Surfaced`, and interior-bulk
does **not** require `Container` (same call both ways). A fluid vessel
composes interior-bulk without being a discrete `Container`; the
**floor** composes surface-bulk without being `Surfaced` (it stays a
fixture handle — see *Surfacing vs containment* below).

A both-affordance host (a desk) carries **both slots automatically** —
no declaration, no keying; each affordance contributes its own slot.
They're selected by the same on/in preposition that already routes
discrete placement (`spill on desk` → surface-bulk; `pour in desk` →
interior-bulk). The method surface takes an affordance discriminator on
both-hosts and is bare on single-affordance ones:

```ts
holder.getSurfaceBulk()    // Surfaced hosts
holder.getInteriorBulk()   // Container hosts
holder.getBulk()           // convenience on single-affordance hosts
```

Mutation always goes through `BulkableApi.transfer`, never raw setters.

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

**Containers — universal reception, retention gated by tightness.**
Every enclosed volume holds **gas** (dispersal unmodelled in v1), so
*reception* is universal at the physics level — you can always pour into
any container. What's selective is **liquid retention**, a `liquidTight`
property, **not** a composition choice:

- liquid-tight (thermos, bottle, sealed jar) → retains liquid.
- not liquid-tight (bookshelf, basket, open crate) → liquid isn't
  retained; it drains onward to the container's environment (the surface
  or container below). v1 may simply reject/clamp; the
  drain-to-environment cascade is a v2 refinement.

So "not all vessels should hold liquids" becomes "not all vessels are
liquid-tight" — they all have the slot (gas, conceptually); the property
decides whether liquid stays. **The gate moved from composition to a
property**, which is what makes every surface and container uniformly
addressable while still behaving correctly.

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
- **Sink** (drain, the ground absorbing, **drinking**) — unbounded
  *acceptance* + discard. Modelled as `transfer(from, null, amount)`,
  where `to: null` means "matter leaves the world" (no stomach modelled
  in v1). Keeps the single primitive rather than a one-sided
  `consume`/`withdraw` op.

A nice fallout: **the environment surface (floor/ground) is always a
holder**, so `pour out X` / `spill X` with no explicit target always
has somewhere to go — `transfer(holder, floor, all)`. `spill` is a
verb, not a capability.

---

## The transfer primitive

One operation underlies every bulk verb:

```ts
class BulkableApi {
  static transfer(
    from: (Stuff & Bulkable) | null,   // null = an unbounded source
    to:   (Stuff & Bulkable) | null,   // null = a discard sink
    amount: Quantity<U> | 'all',
  ): TransferResult;   // { applied, status?, notes: Note[] }
}
```

Behavior:

- `applied = min(requested, from.available(), to.remaining())`.
- **Material compatibility**: reject unless `to` is empty or
  `to.material === from.material` (v1; mixing deferred).
- Strict shortfall (formal `:{N unit}`) → decline with
  `quantity-clamped-rejected`. Lenient overflow (natural language) →
  `quantity-clamped`, status `partial`. **These are the exact
  response-envelope notes glob already ships**, measure-typed.

Every verb is a *direction* over `transfer`:

| Verb | Transfer |
|---|---|
| `fill mug from thermos` | `transfer(thermos, mug, mug.remaining)` |
| `pour thermos into mug` | `transfer(thermos, mug, amount)` |
| `spill thermos` | `transfer(thermos, floor, 'all')` |
| `scoop puddle into bucket` | `transfer(floor, bucket, amount)` |
| `drink from thermos` / `sip` | `transfer(thermos, null, sip)` |
| `draw from well` | `transfer(well, bucket, amount)` — `well.available()` is ∞/regen |

Same-material pour is just `to.amount += applied` — **the case that was
glob's hairiest machinery (merge + identity reconcile + destruct)
becomes plain addition.** That collapse is the strongest evidence the
attribute model beats fluid-as-Stuff.

---

## Capacity — a holder property, not a bulk property

Capacity is the holder's **geometry**, not the matter's, so it lives on
the spatial affordance and never on `Bulkable`. The codebase already
points this way: there's no capacity field on `Container` today, and the
[collision slate](../deferred-rpg/collision-slate.md) owns capacity as per-kind
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

Unbounded holders (a spring's source, a drain's sink) express their end
as `remaining() === ∞`, which the transfer math already absorbs.

---

## Composition with Container / Surfaced — orthogonal slots

Within one affordance, **bulk and discrete contents are independent**.
A `Container` holds both its discrete `contents` (a `Set<Containable>`)
and its interior-bulk; they don't touch. (Across affordances, a desk
adds a second, surface bulk slot — see *per-affordance* above.)

The glass is the single-affordance case: a `Container` holding an ice
cube (discrete `Thing`) and interior-bulk water at once:

- `take ice from glass` → ordinary containment move; ice is a
  `Containable`.
- `drink water` / `pour water out` → drains `bulk`; **the ice cube
  stays behind**, because the slots are independent.
- `look glass` → description composes both ("a glass of clear water, an
  ice cube floating in it").

Note the **inversion from glob**: Globbable carries a hard
`Globbable ⊥ Container` constraint (a coin-pile can't contain things).
Bulkable is the opposite — bulk-holders are *usually* containers
(vessels exist to hold formless matter). No constraint to police;
composition is the expected case. The surface variant is identical (a
counter that's `Surfaced` + `Bulkable`: a measuring cup resting on it
*and* spilled flour on it).

### Phase-transition hook (future, Thermal)

Because the two slots are orthogonal, phase change falls out as matter
moving between them, with no new concept:

- **Melt**: the ice-cube `Thing` destructs; its mass is added to the
  holder's `bulk`. (`StuffApi.destruct(ice)` + `bulk.amount += …`.)
- **Freeze**: the reverse — a portion of `bulk` reifies into an ice
  `Thing` placed in `contents`.

This is a `Thermal`-driven interaction (deferred), noted here because
the architecture must keep the slots orthogonal to support it.

---

## Surfacing vs containment — the floor, and where bulk sits

Discrete Stuff lives under **two orthogonal relations** — this is the
engine's existing model (`Surfaced.ts`: an apple on a desk has
`container = the room` and `restingOn = the desk`):

- **Containment (flat).** A thing's `container` is the room — apple,
  desk, cup are all **siblings** in the room. This is "what's in the
  room"; `Container` is unchanged by anything here.
- **Surfacing (a tree).** `restingOn` records *what a thing rests on* —
  apple → desk, cup → floor, desk → floor. A separate axis. "Everything
  is on a surface" just means every discrete thing has a `restingOn`
  (defaulting to the floor); free-container contents (a bag) are the
  exception, with `restingOn = null`.

**The floor** is the Location-provided handle for the things that need a
floor *referent* but are **not** discrete containment: posture (sit on
the floor) and **surface-bulk** (spill on the floor). It's an
`Adornment` **fixture** (lives in `getFixtures()`, excluded from the
enumerated contents — so it reads as a feature of the room, not a loose
object) and it is **not** `Surfaced`. Containment stays flat; the floor
never takes over `container`.

**Where bulk sits.** A puddle is **not a Stuff**, so it has no
containment node — no sibling slot. It is the **surface-bulk attribute**
of whatever surface it pools on (the floor's slot, the desk's slot). It
has only the *surfacing* side, never the *containment* side. It still
*reads* as "in the room" because it rides its surface (the floor) and
the floor is in the room — but in the Stuff tree only the floor is
there; the water hangs off it as an attribute. (Granting the puddle a
sibling node would be fluid-as-Stuff, which this slate retired.)

So: **discrete things = a flat containment sibling _plus_ a surfacing
edge; bulk = a surfacing-side attribute of its surface, with no
containment node of its own.**

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

For `drink water` to resolve, "water" must be addressable. The keyword
lives on the **`Material`**, not on each holder (author-once; follows
the `bulk.material` ref automatically; no container/contents
conflation; sits with Material's existing tags/chemistry/edibility).

`Material` is currently `SingletonMixin(PropertiedMixin(Idea))` with no
keywords and no description. Two additions:

1. **`PerceptibleMixin`** → a keyword pool (`keywords: [water, h2o]`).
   This is the *thin identity layer*, **not** the perception-behavior
   layer — `PerceptibleMixin` provides only `getKeywords` / `hasKeyword`
   / `primaryKeyword` for MQL matching. It drags in **no** Sensor
   awareness, scene participation, or light-gating (those live in
   `VisibleMixin` / `Perceiver`, which Material does **not** compose).
   So Material becomes nameable without pretending to be a thing
   standing in a room.
2. **An `appearance` description string** (a plain `Material` field /
   property — *not* `VisibleMixin`). Bulk is rendered **through its
   holder's** description, never as a standalone scene target, so it
   needs description *data*, not perception *behavior*.

Scoping notes:

- This is a deliberate, minor widening of `Material` from pure-physics
  to addressable-identity. It's **inert opt-in** — a Material nobody
  types at (the iron inside a sword) authors no keywords and the pool
  stays empty at zero cost. Available everywhere, forced nowhere.
- **No scene leak**: Material singletons aren't in any room's
  scope-walk, so adding keywords does *not* make `get water` match a
  substance floating in the void. The keywords are reachable *only*
  through the bulk-resolver's explicit `material.hasKeyword()` check.
- Open: should `appearance` be **amount-aware** ("a splash" / "a glass"
  / "a pool" of water by quantity band)? Probably yes, via a small
  band table on the Material, but deferred until rendering content
  surfaces it.

---

## Naming & presentation — vessels, contents, and gestalt items

> **Forward-looking.** Not in the thermos slice. This is the design for
> how a bulk-bearing vessel *names itself* once content (drinks,
> potions, oils) arrives — captured because it's where the decomposition
> either pays off or reads awkwardly, and the answer is load-bearing for
> Dave's bar, alchemy, and the recognition substrate.

The worry: if a potion is decomposed into a **vial** (vessel) plus a
**`healing tonic`** (`Material`), does its short become the awkward "a
vial of healing tonic" — when every player just wants "a healing potion"?

**No — because mechanism and presentation are separate layers.** The
vessel+contents split is how the thing *works* (drink, pour, deplete,
decant); the **short is its own presentation layer** and need not expose
that structure. "a vial of X" is never forced.

### Three naming registers

Identical model underneath (`Bulkable` vessel + `Material` bulk); the
short picks a **register** — a *literary* choice, not a structural one —
authored per object:

1. **Substance-in-vessel** — "a flask of oil", "a mug of ale", "a vial
   of poison". Composed from vessel + `Material.appearance`. The
   default; reads naturally for *a quantity of stuff in a container*.
   **Dave's bar drinks live here** ("a half-empty mug of ale" — quantity
   rendering free from the bulk measure).
2. **Gestalt item** — "a healing potion", "a love philtre", "an elixir".
   An authored short that foregrounds the *item*, hiding vessel and
   substance. Reads right for *a discrete (often magical) thing*.
   **Identification-gated** (see below).
3. **Vessel-named, contents-implied** — "a waterskin", "an oilcan". The
   vessel name carries the expected contents; no "of X".

### The potion, worked

- **Underneath:** a sealed vial (`Bulkable` vessel) holding `healing
  tonic` (a `Material` whose `ingest`-seam effect is "heal"). `drink`
  runs the bulk into the drinker's `ingest`, which reads the Material
  and applies the effect.
- **Identified short:** `a healing potion` (authored gestalt).
- **Unidentified short:** `a vial of crimson liquid` (vessel +
  `Material.appearance`, no gestalt) — the classic "blue potion" identify
  mechanic, now *real* because the liquid is a modeled Material. The
  identified/unidentified flip is the **recognition/identification
  substrate's** job, not bulk's; potions are its canonical case.
- **Effect in the Material, name in the gestalt:** decant the tonic into
  a tin cup and it still heals (effect rides the `Material`) but now
  reads "a cup of healing tonic" — the *gestalt breaks while the effect
  survives*. Decanting is a feature, not a bug; a classic MUD can't
  express the distinction.
- **Multi-dose:** the vial holds a *measure*, so a potion can be N
  draughts — `drink` once, two left. Partial potions fall out of the
  bulk quantity.

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

### The payoff

A "healing potion" is a **pure composition of already-specced
substrate** — `Bulkable` vessel + `Material`-with-an-effect + the
`ingest` seam + the recognition/identification axis + `Material.appearance`.
No "potion" type, no vessel+contents registry. Author a vial-of-tonic
with a gestalt short and you get the clean literary surface, the
unidentified state, multi-dose draughts, decant-still-heals, coat-a-blade
poison, and craftable/throwable potions from the same parts. **Potions
are exactly where the recognition work and the bulkable work converge** —
the decomposition gives the expressiveness, identification gives back the
clean name. See [belief.md](../../subsystems/belief.md).

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

The bulk is a **non-Stuff facet of a holder Stuff** — structurally
identical to a `Detail`, and it follows the detail precedent exactly.

### What reaches the controller

Three existing result slots, one new facet:

- **Target field** carries the **holder Stuff** (the only Stuff in
  play).
- **`via.bulk`** — a facet marker augmented onto `MqlMatchVia` by
  **declaration merging**, the same mechanism `via.detailPath` /
  `via.exit` already use (`MqlMatchVia` is an open
  `export interface MqlMatchVia {}` in `mud/api/mql/types.ts`). It
  signals "you reached this holder through its bulk."
- **`quantity`** — the existing glob result slot, extended to a
  `value.kind: 'measure'` variant carrying `Quantity<U>` for the
  amount.

The detail precedent is load-bearing: a detail isn't a Stuff either;
`examine carving` puts the *door* on the target field and sets
`via.detailPath`, and `LookController` / `FeelController` /
`SenseController` branch on `target.via?.detailPath`. Bulk adds
`target.via?.bulk` and controllers branch identically:

- A bulk-only controller (`DrinkController`) reads
  `target.stuff.getBulk()` and ignores the facet — the verb already
  implies bulk.
- A polymorphic controller (`LookController`) checks `target.via?.bulk`
  to render the bulk vs the object.

### The two surface syntaxes

| | structural (composer) | named (player) |
|---|---|---|
| discrete contents | `glass:i` | `ice` |
| **continuous contents** | **`glass:b`** | `water` (material keyword) |

- **`drink water`** (player) — bare keyword; the resolver scope-walk
  matches each in-range holder's `bulk.material.hasKeyword("water")`,
  producing `{ stuff: glass, via: { bulk: … } }`.
- **`glass:b`** (composer) — the **new `:b` chain transform**, the
  continuous-contents analog of `:i`. It sets the *same* `via.bulk`
  facet structurally, giving composers/scripts a **substance-agnostic**
  reach ("drain whatever's in this vessel") that the named form can't
  express. Capability-gated: `:b` on a non-holder yields empty, like
  `:i` on a non-Container.
- **`:B`** (uppercase) is left **unallocated** — `:I`/`:E` recurse
  because containment nests; bulk doesn't nest, so there's no deep
  variant.

Quantity composes on both: `glass:b:{2 cups}` and `water:{2 cups}` —
the `:{N unit}` measure body (the grammar lift below) rides the bulk
referent exactly as `coin:{5}` rides a glob.

### Grammar lift — `:{N unit}`

The `{…}` formal-quantity body extends from glob's `:{N}` to `:{N unit}`:

```
water:{2 cups}        2 cups (strict — composer)
flour:{500 g}         500 grams (strict)
water:{*}             all of it (strict)
```

Unit tokens parse via the Quantities tag-table registry. The
natural-language path (`pour 2 cups water`) needs a richer desugar
than glob's integer-prefix — a multi-token unit capture, likely
consulting `GrammarApi` for unit recognition. **This is the single
biggest implementation cost** (parser work, not mixin work) and wants
a dedicated section at requirements time.

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

> **Thermal note.** A fluid's *temperature* (hot coffee, iced water) is
> the orthogonal **`Thermal`** capability
> ([thermal-slate.md](./thermal-slate.md)), composed on holders that
> care (a thermos = `Bulkable` + `Thermal`; a paper cup = `Bulkable`
> only). Keep temperature off `Bulkable`.

---

## The ingestion seam — designed for, not built

`drink` / `eat` don't send consumed matter to a literal void — they
hand the `{ material, amount }` to a **per-actor ingestion seam**,
`actor.ingest(material, amount)`. **v1 ships this as a no-op**: drinking
works, flavor text fires, the matter leaves the world, and nothing
physiological happens. The socket is installed; the wire is left
unplugged. This is the "design for nutrition without building it" cut
(per the user, 2026-06-11) — no hydration/satiety/nutrition system in
v1, but the seam is shaped so one drops in with zero rework.

Three properties make that true:

1. **The payload is already rich enough.** It carries `{ material,
   amount: Quantity<U> }`, and `Material` *already* holds
   `edibility` / `nutrients` / `toxicity` (authored today; `DietApi`
   deferred). A future handler reads the material it was handed —
   water hydrates, broth nourishes, nightshade poisons, whiskey
   intoxicates — without the bulk substrate changing.
2. **The consequence lives on the actor, not in a registry.** Per
   "substrate has no content hooks — per-entity concerns belong on the
   entity," the future handler is a capability composed on Characters
   (a `Metabolic` / `Digestive` mixin) that overrides the no-op
   `ingest`. No global subscription, no content-registers-itself.
3. **One seam, shared by `drink` and `eat`** (and, later, "eat the
   apple" — a discrete food converts to `{ material, mass }` and hits
   the same seam). The handler branches on the material; the verbs
   don't.

**Deliberately agnostic.** v1 `ingest` knows nothing about who consumes
its signal — it doesn't target the [vitals](../builds/vitals-slate.md)
Reserve substrate or anything else. That keeps bulk and vitals from
coupling before both are built; the actor's future `Metabolic`
capability is what bridges them. The first *real* consequence
(intoxication) arrives with **Dave's bar** — not built now, but coming
soon as game content — which is the natural place to plug the wire in.

---

## Authoring guidance — discrete `Thing` vs `bulk`

This is a **content-developer best practice**, not an engine decision —
the engine supports both; the author picks per object:

- **Discrete `Stuff`** when a unit has *shape and identity* and players
  treat it as countable — a loaf, an apple, a wheel of cheese, a coin.
  (Fungible + countable → also `Globbable`.)
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

## What carries over from glob (substrate reuse)

- **Response-envelope notes** — `quantity-clamped`,
  `quantity-clamped-rejected`, `empty-result` carry over, measure-typed.
- **Result-slot patterns** — `via` facet (detail precedent) and the
  `quantity` slot (glob precedent); no new MQL payload type.
- **`MqlQuantity` discriminated union** — the `value.kind: 'measure'`
  slot and `mode: 'strict' | 'lenient'` discriminator apply identically.
- **`Quantity<U>` substrate + `QuantityMarshaller`** — `amount`
  storage, arithmetic, unit handling.

**Not** reused: `placeDirect`, `split`, `merge`, the merge-on-arrival
ripple, `globIdentityFields` — all of that existed to reconcile fluid
Stuffs, which no longer exist.

---

## Resolved decisions (settled this cycle)

- **Architecture**: holds-as-attribute, not fluid-as-Stuff. Bulkable =
  a holder, not the matter.
- **Name**: `Bulkable` (redefined) for the mixin; `bulk` for the matter.
- **Old Option A/B fork (single `Bulkable` vs `Bulkable` +
  `Subdivisible`)**: **moot.** There are no fluid Stuffs to split;
  "divisibility" is just `transfer` between holders. The fork dissolved.
- **Old `canSplit` / `applyMeasure` design**: superseded by `transfer`.
- **`drink` semantics**: transfer to a `null` discard sink (no stomach).
- **Bulk addressability**: material keyword (`PerceptibleMixin` on
  Material) + `:b` transform; both set `via.bulk`.
- **`:b` is in v1 scope** (composer-tier substance-agnostic reach).
- **Material + Container compose freely**; ice-cube-in-water works.
- **Bulk is per-affordance, not per-Stuff**: surface-bulk on `Surfaced`,
  interior-bulk on `Container`; a both-host (desk) carries both,
  selected by the on/in preposition. Supersedes the single-slot framing.
- **Reception is universal; retention is property-gated.** Surfaces
  always spillable (no opt-out). Containers always receive (gas);
  liquid retention gated by a `liquidTight` property — the gate is a
  property, never composition. So every surface/container is uniformly
  addressable.
- **Capacity is a holder property, not a bulk property** — per
  affordance, read by `transfer` as `remaining = capacity − amount`;
  long-term it's collision's volume-kind `checkCapacity`. Bulkable
  never stores it.
- **Ingestion seam**: `drink`/`eat` hand `{ material, amount }` to a
  per-actor `ingest()` seam, **no-op in v1**, deliberately agnostic
  (no vitals coupling). Real consequence (intoxication) lands with
  Dave's bar content, soon. Material already carries
  edibility/nutrients/toxicity.
- **Discrete-`Thing`-vs-`bulk` is authoring guidance**, not an engine
  decision. Cross-the-line verbs (`cut`/`grate`/`freeze`) reuse the
  phase-transition machinery; parked until food-prep content.
- **First content driver**: Gus's thermos (liquid-tight Container +
  Thermal). Gas fully deferred — v1 is liquid + granular only.

---

## Open questions

- **Wiring — auto-compose vs require-companion** — how `Surfaced` /
  `Container` pull Bulkable in universally (lean auto-compose, esp. for
  `Surfaced`). See *Universal reception § Wiring*.
- **`liquidTight` defaults + drain cascade** — default value, and
  whether v1 rejects/clamps non-tight liquid or implements the
  drain-to-environment cascade (v2).
- **`desk:b` on a both-host** — which bulk does the structural `:b`
  transform mean when a host has both slots? (default to interior, or
  return both and disambiguate, or require an affordance-qualified form).
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

## v1 acceptance roster (for shape)

```
> fill mug from thermos          # thermos: 0.5 L coffee, mug: empty
You fill the mug with coffee.                      (ok)

> drink mug                      # mug now holds coffee
You drink the coffee.                              (ok; mug -> empty)

> pour thermos into mug          # thermos: 0.5 L, mug: 0.3 L capacity
You pour coffee into the mug                       (partial,
  until it is full.                                 quantity-clamped)

> drink water                    # a glass of water with an ice cube
You sip the water.                                 (ok — bulk only;
                                                    ice cube untouched)

> take ice from glass            # same glass
You take the ice cube.                             (ok — discrete Stuff)

> pour water:{99 cups} from well into bucket   # bucket holds 4 cups
(no action)                                        (declined,
                                                    quantity-clamped-
                                                    rejected)

> drain glass:b into sink        # composer/script — substance-agnostic
You pour the glass out into the sink.              (ok — :b facet)
```

---

## Cross-references

- [glob.md](../../subsystems/glob.md) — discrete sibling; note reuse.
- [quantities.md](../../subsystems/quantities.md) — `Quantity<U>` backing.
- [race.md](../../subsystems/race.md) — `Material` identity + physics.
- [mql.md](../../subsystems/mql.md) — `MqlMatchVia`, `via.detailPath`
  precedent, resolver.
- [response-envelope.md](../../subsystems/response-envelope.md) — note
  kinds.
- [thermal-slate.md](./thermal-slate.md) — temperature + the
  phase-transition seam.
- [collision-slate.md](../deferred-rpg/collision-slate.md) — mass/volume capacity,
  displacement.
- [activity.md](../../subsystems/activity.md) — durative bulk verbs.
</content>
</invoke>
