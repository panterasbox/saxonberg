# Grid slate — service, streets, and how a parcel answers for its power

> **Status: PARTIAL** — the network is unbuilt (verified 2026-09-19:
> `ParcelRecord` has no service field — `extent · zonePath · owner ·
> parentParcel · grants · allowance · landUse · area · storeys · reach`;
> exits carry no service attribute; no `Street.ts`; no lint). The two
> ENDS shipped: generation — `ControlStructure.generationW` computes real
> watts and `analyze power` reads it, a `GristMill` draws
> `availablePowerW` from the reach it stands on
> ([watershed.md](../../subsystems/watershed.md)); and the frontier tier
> — the τ charge economy ([magic-items.md](../../subsystems/magic-items.md))
> with TPA terminals drawing off `ManaPowered`
> ([fasttravel.md](../../subsystems/fasttravel.md)). Between them,
> nothing: power reaches a consumer by standing on the water, never by a
> wire.
> **Left:** the service declaration on `ParcelRecord` (default connected,
> author disconnection; a band, not a number) · service as an exit
> attribute + the three-edge walk (generation → street → connected) ·
> transmission from the falls to the city · connection-not-consumption
> metering · street dedication + municipal title acceptance · the
> every-declared-consumer-resolves-to-a-source lint · underground as an
> access point · the newbie wilds' declared posture
> **Size:** a build

**Captured 2026-08-04/05**, out of the mana-economy thread, when *"we've
been minting new content and just sorta assuming it's powered"* turned into
a topology question, a land-development question, and a review question.

> **User: "eventually we need process around this. Parcels attach at an
> exit, so that exit needs to be powered… streets and connective are where
> the grid lives… we have to decide what's mandatory for the purposes of
> zoning and land development and how it's all authored, organized and
> managed. This is an area where I'd hope a lot of the processes are
> emergent and we just provide the tools."**

Related: [delivery-slate](./delivery-slate.md) (⭐⭐ **the topology — read §
Distribution first**), [power-utility-slate](./power-utility-slate.md) (the
supply ref; the middle tier),
[mana-economy-design-pack](./mana-economy-design-pack.md) (sources, nodes,
capacitors — `mana-economy-slate.md` retired into it 2026-09-21),
[parcel.md](../../subsystems/parcel.md)
(`subdivide` / `transfer` — the dedication primitives),
[address.md](../../subsystems/address.md),
[boundary.md](../../subsystems/boundary.md) (exits carry the service),
[zoning-slate](./zoning-slate.md), [balance-slate](./balance-slate.md) (⭐
*a statute is a constraint on a meter*),
[attestation-slate](./attestation-slate.md) (the review tool this needs),
[story-bible.md](../../story-bible.md) (⭐⭐ **the watershed — it already
answers where the power comes from**), [freight-slate](./freight-slate.md).

---

# Part 1 — The topology was already solved

`delivery-slate § Distribution`, as cited by
[power-utility-slate](./power-utility-slate.md):

> ⭐⭐⭐ **"Coverage is legal, connection is physical."** The prefix claim
> stays the **franchise area**; the **distribution network is edge
> attributes on exits** (which exits carry which service), so connectivity
> derives from **a walk** — the same trick as freight's emergent road
> network, with **zero new topology.**

So *"a parcel attaches at an exit, so that exit needs to be powered"* is not
a new requirement — **it is the model.** And the payoff is already named:
*"a network fails locally and directionally — the line to Wharfside is cut
and only Wharfside goes dark,"* which is what gives outage work orders
somewhere to be, and linemen somewhere to go.

⭐ It also already carries the politics: *"utilities follow the road because
of **rights-of-way**, which makes the easement — and the **holdout
problem** — a live political object."*

## ⚠ But the full walk is overbuilt — the meter is the boundary

> **User: "the exit walk all the way back to the power source is excessive.
> Really you just need a parcel to generate power, a parcel for the
> streets, and a parcel to connect to the street. Everything after that is
> totally internal to that parcel and its subparcels, however they carve
> things up in quotas and content."**

> ⭐⭐⭐ **THE METER IS THE BOUNDARY.** The public network is **three
> edges** — *generation parcel → street parcel → connected parcel*. Past
> the connection it is the holder's own wiring, subdivided by their own
> quotas.

⭐ That is **the compute-allowance cascade, second consumer** — Appendix B:
*"the commons assigns a block to a top-level holder; that holder subdivides
and allocates within the block by its own policy; holders beneath do the
same. The central formula operates only at the boundary between the commons
and a top-level holder — below that boundary, internal division is the
holder's own affair."*

**And it is how utilities are actually regulated:** the utility answers to
the meter, never to your lamp.

## ⭐⭐ The meter is a triple boundary — and consumption is scale-free (2026-09-24)

The three public edges are the three real stages: **generation →
transmission/distribution (the street parcel) → consumption (the connected
premises).** Real infrastructure steps voltage *down* at the meter (shared
high-voltage infra on the street side, private low-voltage on the premises
side), so **the meter is one line doing three jobs at once**: the voltage
step-down, the economic boundary (the utility bills the meter, never your
lamp), and the physics-model boundary ([electricity.md](../../subsystems/electricity.md)'s
*"one law, two scales"* — the two scales are the two voltages). Collapsing
transmission and distribution into "the street" is deliberate: a player never
acts on that distinction.

> ⭐⭐⭐ **The consistency invariant: a consuming fixture resolves its supply
> to its COVERING PARCEL's meter, by longest-prefix — never by walking the
> interior.** The fridge's question is identical everywhere: *"is the parcel I
> sit on connected, and is that connection live?"* — a three-edge walk (my
> parcel's meter → the street → generation) that stops at the meter. It never
> asks about the room, the building type, or how many locations the premises
> has.

Because parcel coverage is longest-prefix (like `ownerOf` /
`coveringParcelOf` already), the story is **the same for a detailed home (a
fridge deep in a nested kitchen), a single-room shop (the range in the one
room that IS the business), and an industrial works (a furnace in a smelting
hall)** — residential, commercial, industrial, one room or fifty, all resolve
to the covering parcel. This is why the meter attaches to the **parcel**, not
to a (still-unbuilt) structure object: the parcel already spans every building
type and every level of interior detail.

## Deferred: the low-voltage INTERIOR (past the meter)

⭐ **Modelling both sides of the meter teaches different things, and the
interior side is real richness** — circuits, breakers, sub-metering, a room
you can individually cut, load-balancing (ONI spends half its game here). That
is a whole pedagogy on the LV side. **It is explicitly NOT needed for "the
fridge comes online,"** which is the cold-chain → blood chain's actual demand.

So v1 models the interior as **premises-as-a-unit** (a connected+live parcel
powers everything inside it, zero internal modelling — what lets a single-room
business express broadly), and leaves a clean seam: a detailed premises MAY
later **opt in** to internal distribution via the cascade (a sub-parcel with
its own quota under the premises parcel — the same `subdivide` mechanism), and
a fixture that finds no sub-circuit just resolves to the premises meter. The
invariant lives at the meter, so the interior can be unmodelled or richly
modelled without changing the fridge's question. ⇒ **its own deferred build.**

---

# Part 2 — ⭐⭐⭐ Streets: subdivision and DEDICATION

> **User: "the streets is kind of a tough one… /terminus/ I think wants to
> be subdivided by neighborhoods. So do the streets belong to the
> neighborhood or just the buildings? Are the streets something top-level
> because they're managed by the municipality itself?"**

**Neither — because it is an act, not a schema.**

In real land development a developer subdivides a block into lots and
**dedicates** the streets to the municipality. Dedication is the actual
legal mechanism, and **both halves already ship**: `subdivide` carves the
child, `transfer` re-titles it.

> ⭐⭐⭐ **A street is a subparcel carved out of the neighborhood and
> dedicated to the municipality.**

So `/world/terminus/foundry-row/main-street` can sit **inside** the
neighborhood path while being **titled to the city**.

> **Path is location. Title is ownership. They were never the same
> question** — [parcel.md](../../subsystems/parcel.md) already holds title
> as an extent over the path tree, and
> [address.md](../../subsystems/address.md) already runs its own resolve
> walk.

Three things fall out:

- ⭐ **The municipal estate grows by development, not by decree.** Nobody
  plans the street grid centrally; it accumulates as ground is carved.
- **It creates the holdout problem** `delivery-slate` already wants — an
  undedicated strip between two blocks is a live political object.
- **A locality that never gets streets dedicated has no rights-of-way**, so
  it has no grid. Consequence, not rule.

## ⚠ No `Street.ts`

With the grid argument gone (Part 1 — service is an exit attribute, not a
property of streets), check what is left of "street":

| | already expressed by |
|---|---|
| title | a parcel owned by the locality |
| address | an address-tree segment |
| service | an **exit** attribute |
| footfall | derived demand (the compute entitlement function) |

> **Everything a street "is" is already a capability of something else. A
> class with no unique state is decoration.**

If zoning needs a predicate (*"does this lot front a public way?"*), it is
`isThoroughfare` **derived** from *locality-titled + declared-public + an
address segment* — not a stored type. ⭐ **Recommendation: do not mint
`Street.ts`.**

## Underground is an ACCESS POINT, not a layer

Under the edge-attribute model, "the line is buried" is cosmetic **unless
somebody has to physically reach it** — and they do, because outage work
needs a location.

> ⭐ **So the underground is a manhole, not a world.** The access point is an
> ordinary **exit**; the space behind it exists only where it is
> interesting. No parallel graph, no mandatory subsurface content, and a
> repair gig gets somewhere to happen.

*(`smallholding.md`'s acreage already splits ground from floors, so
subsurface title as a separate estate is available later — that is where
mineral rights live, and it is real law.)*

---

# Part 3 — Where Terminus gets its power: the story bible already answered

*Hydro — decided and shipped:* the water pack's `ControlStructure`
answers `generationW` (`ρ·g·Δh·Q·η`, real watts), `analyze power` reads
it, and the Wharfside aqueduct house generates — see
[watershed.md](../../subsystems/watershed.md).

And the geography does the design work:

- ⭐ **The falls are upstream in the highlands; the city is downstream at
  the confluence.** Generation and consumption are **in different places**,
  which makes **transmission the political object** — the thing localities
  invest in and fight over.
- ⭐⭐ **One watershed means upstream/downstream is a REALM-WIDE
  relationship.** Water rights stop being a local ordinance and become the
  structural conflict: **riparian vs. prior appropriation**, damming,
  diversion, pollution — all live, all between named places, and all an
  amendment-library module.
- **A river has a limited number of good fall sites.** Best taken first —
  the Ricardian supply curve, free, from geography.
- Historically correct (mills long preceded steam) and **rate-capped**,
  which is what eventually *creates* the demand for coal. **The transition
  builds itself.**

*One river, water and power, one set of rights* — shipped:
`watershed.md § rights` (`WaterRightRegistry`, prior appropriation records
· riparian derives) sits on the same `Watercourse` the generator draws
from.

## ⭐⭐⭐ And this is what magic is FOR — the frontier tier

> **User: "I just wanted to make sure we understood magic as a power source
> because we're going to need it out in the frontier for certain kinds of
> editorial decisions. Sometimes you just need to put something down
> somewhere, and in our world you can't just lie about it being powered if
> it needs to be powered."**

| | availability | cost per unit | needs |
|---|---|---|---|
| **cells + nodes** | ⭐ **anywhere, day one** | expensive | nothing |
| **the grid** | only where built | cheap | capital, rights-of-way, politics |

*The "expensive" column is mechanical* — shipped:
[magic-items.md](../../subsystems/magic-items.md) § the charge economy
(`S* = inflow/d`, denominated in τ; caster-sourced, metabolism-capped).

> ⭐⭐⭐⭐ **A community's development arc IS the replacement of magic by
> infrastructure.** Portable-and-expensive → networked-and-cheap. It is what
> actually happened (artisanal power → reticulated power), it is
> **measurable**, and it means magic gives a new settlement what it needs on
> day one **without being the permanent answer.**

⭐ So Terminus can be wood-and-water today without cutting anyone off: **magic
covers the gap at a premium, and the visible sign of a place developing is
that the premium goes away.**

⚠ **The TPA is already exactly this and nobody noticed** — *"right now
everywhere it goes is developed."* Once terminals draw power, **the network's
reach becomes a statement about which places are developed**, which is a far
better map than a list.

---

# Part 4 — The declaration, and what is mandatory

> **User: "probably every single parcel needs to answer what its power needs
> are, or do a best guess."**

> ⭐⭐ **Make the field MANDATORY and the value FALLIBLE.** An *undeclared*
> parcel is a bug the lint catches. A *wrong* declaration is a
> disagreement — which is what review is for
> ([attestation-slate](./attestation-slate.md)).

## ⭐⭐⭐ Build the METER, never the RULE

[balance-slate](./balance-slate.md)'s doctrine applies directly: *a statute
is a constraint on a meter.*

> **The engine models service and access as FACTS. It never models
> requirements.** A zoning statute then says *"a dwelling must have water"*;
> the engine answers *"does it?"*; the locality decides the consequence.

⭐ That is what makes an unpowered shack legal in Hinkley Hills and illegal
in downtown Terminus — **a difference that emerges from law rather than from
code**, which is the emergent process the brief asks for.

## Authoring: default connected, and the tool is a lint

- ⭐ **Default to connected; author DISCONNECTION.** Preserves every room
  already minted, and the interesting state is the one worth declaring.
  Same present-but-inert pattern as `grants[]` / `allowance` in parcel 0a.
- ⭐⭐ **The process is not a document — it is a lint.** *Every declared
  consumer must resolve to a source.* Same shape as `lint:instanceable`: **a
  failing build, not a checklist.**
- **Ownership follows the pack seam already decided**: the **locality pack
  owns the premises**, so mains are locality content; a **trade pack
  declares that its kit requires service** and the locality supplies it.
  Annex knows host, never the reverse.

⚠ **The newbie wilds** are the open example — industrialized or not is
undecided. It does not block anything: **whoever holds that ground declares
its posture, and whoever reviews their branch signs it.** The point is that
it becomes a *recorded decision* rather than an assumption nobody wrote
down.

---

# Open questions

1. ⭐ **Is the declared power need a quantity or a band?** *Leans band* —
   "no number is an authority," and a band survives re-tuning. The lint only
   needs *declared vs. undeclared*.
2. **Who may dedicate?** Dedication transfers title to the municipality, so
   it needs the municipality's acceptance — ⚠ **a locality that refuses
   dedication refuses maintenance liability**, which is a real and
   interesting municipal decision.
3. ⚠ **Does a street's title carry an implied public easement**, or is
   passage a separate grant? *Leans implied* — otherwise every dedication
   needs a second act, and a street nobody may walk is nonsense.
4. **Metering: is consumption measured, or only connection?** *Leans
   connection for v1* — measured consumption means a meter reading, a
   billing cycle, and arrears, which is a whole build. ⭐ When it comes, a
   utility bill is an ordinary `payment` leg; no new banking substrate is
   needed.

   > ⭐⭐ **Added 2026-08-05, from the merged currency build: a locality
   > CANNOT bill in its own scrip.** Currency records are *code* —
   > *"adding a currency is a code edit at the wizard tier… a mint is
   > Compact-level, never a locality's own call"* — and a ledger leg may
   > never cross currencies. ⇒ **utility billing is denominated in the
   > Compact's currency by construction**, which forecloses the grid
   > becoming a private monetary system. That is the **truck-system** worry
   > [currency-slate](./currency-slate.md) raised (*wages in company scrip,
   > redeemable at the company store*), answered structurally: **a utility
   > can overcharge, but it cannot pay or bill you in something only it
   > issues.**
5. ⚠ **Do the newbie wilds have a grid?** Deliberately open; it is the first
   real consumer of the declaration process.

---

# Part 5 — the end-to-end design (2026-09-24 scoping pass)

Scoped in conversation while `design/envelope` and `design/instrumentation`
are in flight; **the energy build starts after they merge** (envelope owns
the premises/atmosphere boundary + the `Street` class + the public-lighting
funding pattern energy reuses; instrumentation owns the `Reading` substrate
the power meter registers on). This part records the whole chain, the lens
pass, the shippable tiers, and the integration with envelope's shipped work.

## The chain — seven phases

```
0 PRIMARY SOURCE → 1 GENERATION → 2 TRANSMISSION → 3 DISTRIBUTION
   → 4 [THE METER] → 5 INTERIOR CIRCUITS → 6 CONSUMPTION
                              ( 7 FAILURE & MAINTENANCE cross-cuts 2–5 )
```

The whole chain is **one physics** end to end; the meter is the only
discontinuity (voltage step-down + economic boundary + physics-model boundary
+ the contiguous↔abstract boundary, all one line).

## Lens pass — the whole chain

1. **Pedagogy** — physics (Ohm's law, `P=VI`, `I²R` line loss, the
   transformer ratio), electrical engineering (circuit capacity,
   load-balancing, breakers), thermodynamics (generation), economics (natural
   monopoly, marginal cost), civil/law (rights-of-way, dedication,
   easement/holdout). Derivable end to end: watts sum, an overloaded circuit
   trips, the fault is the dark segment. ⭐ Interior circuits (Phase 5) are the
   single richest cell.
2. **Expression** — generation, consumer and circuit are all **rows that
   answer a method** (`generationW`, `availablePowerW`, a draw); a second
   plant / neighborhood / appliance needs **zero pack code**; the bespoke
   circuit layout is where players play.
3. **Immersion** — *coverage is legal, connection is physical*; the cut
   darkens only what's downstream; unlit interiors are pitch black; the fridge
   warms and the blood spoils. No gauge — you read power by what works.
4. **Values** — overload-to-save vs wire-it-right; redlining the poor ward;
   autarky (hearth) vs dependence (the main); standing = the electrician /
   lineman competence you can *see*.
5. **Epochs** — ⭐⭐ the triumph: **only Phase 0 changes** across
   prehistory→future (waterwheel → coal → hydro → fusion → mana); everything
   downstream is invariant. Magic is the frontier generation tier
   (anywhere-expensive), and *a community's development arc is the replacement
   of magic by infrastructure* — measurable.
6. **Economy & governance** — natural monopoly, rate-regulated; **meter on
   USE, never connection** (Law 2); billing is a `payment`/`appropriate` leg
   in Compact currency (no scrip → no truck system); connect/disconnect judges
   a person → the **seniority quota** (recorded in advance) is the criterion,
   and it is arithmetic not a judgement at the moment of refusal.

## Per-phase highlights (full per-phase lens pass done in the scoping conversation)

| phase | teaches / does | standout lens |
|---|---|---|
| 0 primary source | energy provenance; `ρgΔhQη`, heat of combustion, τ | 5 — the only phase that changes across epochs |
| 1 generation | source → watts; `generationW` shipped (hydro) | 6 — cheap hydro = the city's industrial identity |
| 2 transmission | `I²R` loss ⇒ high voltage; falls → city | 1 (why HV exists) · 6 (the holdout problem) |
| 3 distribution | the street graph, follows the road (RoW) | 3 (directional outage) · 6 (natural monopoly) |
| 4 the meter | step-down + billing + physics boundary | 6 (meter on use) · 4 (it judges a person) |
| 5 interior circuits | capacity, load-balance, breaker, transformer | 1 (highest pedagogy) · 4 (a daily choice) |
| 6 consumption | `P×t`; the fridge maintains ΔT vs leak | 3 (the felt payoff — cold blood, banished dark) |
| 7 failure & maintenance | trace the dark segment; mint work orders | 3 (storm contract gets real) · 6 (the lineman gig) |

## ⭐⭐ Shippable tiers — build the whole chain, but meter-first and independently landable

- **Tier A — "the fridge comes online."** Phases 1–4 + 6 at
  **premises-as-a-unit**: the public network + parcel meter + a powered
  consumer. This is what blood / cold-chain needs, and it stands alone.
- **Tier B — the ONI tier.** Phase 5: interior circuits, breakers,
  load-balancing, the transformer. **Highest lens-1 value**; rides Tier A's
  meter as the cascade boundary; its own build. In scope for the *design*, not
  for the first shippable slice.
- **Tier C — the metered economy.** Phase 4's use-metering + billing + Phase 7
  in full: draw, cycle, the invoice loop, the lineman market.

## Contiguity — public contiguous, private abstract; the meter is the boundary

**Yes, power is traceable on the public side; abstract past the meter.** This
resolves the "three edges vs full walk" tension (Part 1):

- **Public side (generation→transmission→distribution): contiguous.** Service
  is an attribute on the **street graph's exit edges**, so you can walk from
  your street back through connected streets to the substation to the
  generation parcel. **That walk IS the fault-finding gameplay** — an outage
  is a cut edge; you diagnose it by tracing to the dark segment. This is what
  makes failure local and directional.
- **Private side (past the meter): abstract.** You do NOT trace wires to your
  fridge; the premises is the cascade (unit, or opt-in circuits).
- **Three edges = the economic/title view** (who generates, who owns the
  street, who connects); **the walk = the physical view**; the meter is where
  they meet (the last physical node + the billing boundary).
- **Performance = the watercourse pattern**: compile a reachability SET per
  source once (`WatercourseCatalogue` precedent — `compare` is one `Set.has`),
  so a premises' live-check is Set-membership + the cut flags on the path; the
  explicit trace is the rarer diagnosis act.

## Overhead vs underground — a cosmetic + failure-profile attribute, not a layer

Generalizes the shipped ruling (*"underground is a manhole, not a world"*):
overhead-vs-buried is an **attribute on the service edge**, expressed in
exactly two places and only there:

1. **The repair-access point** — a buried fault is reached through a manhole
   (an ordinary exit); an overhead fault is at the pole. Where the lineman goes.
2. **Storm vulnerability** — overhead lines go down in a storm (feeds the
   storm contract); buried lines are storm-safe but dig-to-reach.

⭐ Lens-5 ladder: overhead (cheap/fast/vulnerable, industrial) → buried
(dear/robust, modern). Default overhead; burying is an upgrade. Same edge, no
new topology.

## Epoch by locality — Terminus electric, Heart's Delight gaslamp, Hinkley off-grid

The map supports this natively and **the epoch is DERIVED, not flagged**. A
locality is *electric* iff a connected parcel → street → generation source
traces; *gaslamp* iff its streets run envelope's public-lighting fuel service
with no electric distribution; *off-grid* iff neither.

- **Terminus** — electric grid (traces to the highland hydro; the developed core).
- **Heart's Delight** — gaslamp + hearth (envelope's `Street` /
  `PublicLightingMixin` fuel service; no electric distribution reaches it).
- **Hinkley** — off-grid, hearth + the magic frontier tier (the slate's own
  canonical "an unpowered shack, legal in Hinkley Hills").

Same code everywhere; only content differs per locality (which streets carry
which service, which parcels connect). **No "tech level" flag** — the epoch is
what the ground's infrastructure can trace to. (Generation is upstream at the
falls, so *being electric means a transmission line reached you* — which is
why the rural localities aren't, and extending the line to them is a future
political act.)

## ⭐⭐ Integration with envelope's `Street` + public lighting (shipping ahead of us)

Envelope minted `platform/location/Street.ts` (`SingletonCartesianLocation` +
`PublicLightingMixin`) — a **location subtype for outdoor public ways**, NOT a
grid-topology object (the "no `Street.ts`" doctrine was about grid *topology*;
service stays an exit attribute). Its lamps run a **civic FUEL service billed
to a treasury** — lit-now is derived from (service declared + dark enough +
*the extent paid for this street tonight*), and `Locality.settleStreetLighting`
lights streets in **seniority order** for `n × fuel` via the shipped
`BankingApi.appropriate`. It hands energy four reusable patterns:

1. **Property-over-object** — a utility the town runs is a property of the
   place; an object is minted only where someone acts on it (the object-vs-
   property test: *is it the target of a verb?*).
2. **Appropriation billing** — a civic service is paid by a `BankingApi.
   appropriate` leg. That's Tier-C billing, already shipped.
3. **Seniority-quota rationing** — going short is arithmetic decided in
   advance (the watershed quota rule) → the lens-6 "name the criterion, name
   the appeal", already solved.
4. **The object-vs-property test** — decides whether a fixture is a thing or a
   detail.

⭐ And the **lens-5 gift**: public street lighting is *utility #1*; when the
grid lands it becomes a **consumer** of utility #2 — **gaslight → electric
streetlight is the same civic service with the source migrated from a fuel
appropriation to an electricity draw.** That is the development arc made
literal, and the cleanest first proof the meter/consumer model works. Energy's
distribution rides envelope's `Street` locations as the host.

## ⭐⭐ The overhead question — resolved: detail = optional subdivision depth

The abstraction supports both "just keep the lights on" content and the ONI
household because **the circuit layer is invisible unless authored, and detail
is depth in one cascade**:

- **Zero-depth (broad)** — the parcel is one implicit circuit at its declared
  service band; power is on/off with the street; **a fixture that finds no
  circuit resolves straight to the premises meter.** Resident, author and
  parcel-manager pay ZERO cognitive overhead (default connected; the author
  does nothing; the resident never thinks about it).
- **N-depth (the ONI household)** — the author opts in by subdividing the
  premises into circuits with quotas; load-balancing, breakers and trips go
  live. Only for content that wants it.

Same cascade, two resolutions: **the parcel's declared power band = the
premises' total capacity = the implicit-circuit ceiling; subdivision
partitions it.** Stays honest (lens 1): the broad case still has a real
ceiling (a frontier shack's small band can be exceeded), set high enough that
ordinary use never trips — an abstraction, not a lie (lens-6 abstraction law).
⭐ Envelope's lamps validated the identical principle: *the town runs a service
broadly (property); a lamp becomes an object only where the fiction acts on
it.* "Some buildings just need lights, some are ONI" IS "property vs object."

## Open questions — updated 2026-09-24

Closed this pass: **contiguity** (public contiguous / private abstract);
**poles vs underground** (edge attribute, expressed at repair-access + storm
only); **epoch by locality** (derived from traceable infrastructure, not a
flag); **the overhead/two-content-types question** (optional subdivision
depth); **metering unit** (the parcel, not a structure object).

Still open for requirements:
1. Q1 (band vs quantity) — leans band, unchanged.
2. What an energy source *composes* — reconcile with `electricity.md`'s
   deferred-seam claim ("Ohm's-law scaled up, never a second abstraction"):
   is a generator an `EnergizedMixin` node, a `Conduit`-shaped delivery
   object, or both at different scales? (Physics inside the meter, economic
   conduit outside — but the source object's mixin needs deciding.)
3. Does public street lighting migrate to an electricity draw in Tier A or
   Tier C? (It's the ideal first consumer, but the migration touches
   envelope's shipped `settleStreetLighting`.)
4. Locality treasury — envelope's lighting bill is on `/compact/treasury`
   pending a locality treasury; energy billing inherits the same deferred seam.
