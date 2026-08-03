# Property slate (working doc) — possession, real estate, and the two scarcities

> **⭐ PARTLY SHIPPED.** The title substrate this slate called for is
> built ([parcel.md](../../subsystems/parcel.md)), and Hinkley Hills gave
> it the **verb it lacked** plus the first market for it: `title` /
> `title list` / `title buy` over a `PlatBook` catalogue and a
> `LotHolder` provisioner, with the sale riding banking's settle
> chokepoint — see
> [smallholding.md](../../subsystems/smallholding.md). Chattel shipped
> too ([chattel.md](../../subsystems/chattel.md)). Still unbuilt and the
> reason this slate stays: the **compute-allowance** scarcity (the field
> is inert), **dormancy-as-reclamation**, the author↔owner un-fusing, and
> real-estate mechanics above a single lot (resale, leases, valuation).

> **Status: design explored deep across a full session; not yet requirements.**
> The foundational substrate under pets, ranching, farming, and the economy +
> governance tiers: **who owns what, where the boundaries are, and what it costs
> to run a piece of the world.** Surfaced by the pets/ranching design (custody is
> a degenerate case of possession) and stress-tested against the live subsystems
> by three probes. The governing insight: **there are two separate conserved
> scarcities — money (prices *land*) and compute-allowance (prices *liveness*) —
> and they must not be collapsed.** Boundaries and the freeze pattern are already
> the right shape; what's net-new is the connective tissue: a titled parcel, an
> author↔owner un-fusing, a compute cost model, and dormancy-as-reclamation. A
> four-phase spine is scoped below. Parent of
> [pets-slate](./pets-slate.md) · [ranching-slate](./ranching-slate.md) · the
> farming work (separate session).
>
> **Child spun out 2026-07-31 → [stewardship-slate](./stewardship-slate.md).**
> Three things this slate names but never designs now live there: **land use**
> (a closed vocabulary typing what a parcel admits — genuinely absent from this
> corpus; a parcel is structurally typed and categorically untyped), the
> **residence ladder's actual gating mechanism** (§L sketches the rungs but no
> ascent rule exists), and **stewardship** (property condition + a Discipline —
> no decay-through-neglect exists today, only the economic
> insolvency→freeze→evict path). It also carries the **allowance cascade**
> decision: the Compact grants a locality a bundle, the locality apportions it
> to parcels on its own terms, while the *sandbox* draws Compact-direct — so a
> hostile local government can never squeeze a player's creative channel. That
> makes §L's "prestige = a bigger allowance" concrete, and turns Phase 2's
> "are Offices real allocators?" from a question into a mechanism. **It depends
> on Phase 1's meter, which is still un-designed.**

See also — substrates this stands on / consolidates:
[zone.md](../../subsystems/zone.md) (`ownerGroup`/`accessGroups`, the slice-walk,
the boundary invariant) ·
[access.md](../../subsystems/access.md) (`AccessApi`, `canMutateZone`, the six axes) ·
[address.md](../../subsystems/address.md) (Locality claims-a-prefix, longest-prefix resolve) ·
[boundary.md](../../subsystems/boundary.md) (exits/doors/windows) ·
[location.md](../../subsystems/location.md) (Warren, HomeZone) ·
[document-store.md](../../subsystems/document-store.md) (self-home ownership; the dorm hook) ·
[provenance.md](../../subsystems/provenance.md) (authorship — the deferred **"ownership hierarchy"** lives here) ·
[cms.md](../../subsystems/cms.md) (the deferred **"lease model"**) ·
[banking.md](../../subsystems/banking.md) (conserved money, CB mint, P&L, the parcel-tax home) ·
[governance.md](../../subsystems/governance.md) (Offices — the allocation authority) ·
[scripting.md](../../subsystems/scripting.md) (author-tiered per-execution compute limits — the precedent) ·
[call-security.md](../../subsystems/call-security.md) (the Proxy — the CPU-instrumentation seam) ·
[lifecycle.md](../../subsystems/lifecycle.md) (idle eviction — explicitly deferred) ·
metabolism/thermal/respiration/weather (the presence-freeze pattern).
Related decisions: `docs/polity-decision-register.md` (territory = protected
resource-tenure; Frontier default; compute = the only real scarcity,
presence-never-the-meter); [cooperative-slate](./cooperative-slate.md) (the polity
north star).

---

## The frame — property is the right to *run* a subdivision

Land in a virtual world isn't naturally scarce; you can spin up infinite rooms.
What's scarce is **persistent simulation** — a room only costs when something
*runs* in it. So a "plot" isn't dirt. It's a bundle of four things the engine
holds separately today, welded into one alienable, costed unit:

> **a compute allocation + an authoring namespace + a spatial subdivision +
> access rights.**

Two consequences frame everything below:

- **You pay to *run* a world, not to *visit* one.** The meter sits on the supply
  side (the persistent thing you host), never the demand side (playing). This is
  what makes the standing *presence-never-the-meter* rule actually hold: a
  visitor is free; the owner carries the cost of what they chose to keep alive.
- **The dorm room is the atom; real estate is the same capability scaled up.**
  Today's dorm is *a shell* — `HomeZone` establishes `/home/<playerId>/` as a real
  Zone but it's empty ("no fields, no methods, per-player gating deliberately not
  implemented"). Real estate is `HomeZone` **grown up**: gated, customizable,
  extensible — and titled, costed, transferable. Everyone starts with their own
  **sandbox home** (a starter parcel with a free-tier allowance); the progression
  is dorm → plot → estate → district.

## The two scarcities — do NOT collapse them

The load-bearing decision. Money and compute are different *kinds* of thing and
need different laws:

| | **Money** | **Compute-allowance** |
|---|---|---|
| Kind | medium of exchange | physical capacity ceiling |
| Prices | **land** (parcel tax, market, rent between players) | **liveness** (runtime complexity you run) |
| Fungible / transferable | yes — velocity, trade, speculation | **no** — a capacity grant, not a currency |
| Minted / allocated by | central bank (monetary policy) | governance (capacity policy) |
| Conserved total | the money supply | **= the real capacity of the box** |

If money *were* the compute proxy, a whale would buy unlimited compute and melt
the server, and monetary inflation would nonsensically inflate capacity. So they
are **orthogonal axes**, coupled only at the parcel: **land is the container of a
compute allowance** — a prime parcel's real value isn't the dirt, it's *how much
liveness it's permitted to sustain.*

The key reframe this yields: **compute maps onto the game not as money but as a
second conserved quantity.** Governance allocates allowance the way the CB mints
money; the sum of all allowances = the box's physical budget. That is the honest
answer to "map the real scarcity onto our fictional markets" — a parallel
capacity-credit, distinct from the currency, whose total *is* the hardware.

## The parcel — the missing noun (the join of two trees)

The stress-test's key structural finding: **boundaries and holdings are
*unrelated trees* today.** The model can already answer "where does subdivision A
end and B begin" *three* ways — the zone-break invariant (`zone.md`), the address
longest-prefix coverage walk (`address.md`), and physical door/window conduits
(`boundary.md`) — but **no boundary edge coincides with an ownable extent.**

So the net-new primitive is the **parcel**: an ownable extent whose edge aligns
with one of the existing boundary trees **and carries a title.** It's a *join*,
not an invention — the noun that makes one boundary coincide with one holding.

- **Title, not group-ACL.** Ownership today is `Zone.ownerGroup` (a group holding
  the `'owner'` role) — an access-control stamp, not a per-holding deed. The
  parcel needs a real title (a registry of who-owns-which-extent), on top of the
  ACL that already enforces access.
- **Author holds *rights* to the parcel.** The title is the *right to the parcel*,
  cleanly distinct from *authorship* of what's on it — which forces the un-fusing
  below.
- **Transfer as a transaction.** Alienation today is degenerate — you can hand-edit
  a zone's `ownerGroup` via the `write` verb (gated by `canMutateZone`), but
  there's no first-class transfer verb and **no market/rent/consideration path at
  all**. First-class, economic transfer is net-new.

## Author ≠ owner — brick zero

Probe finding: **author and owner are fused today.** For any content path, "owner"
= `authorOf` = the *immutable earliest `AuthoringEvent`*. There is no distinct,
transferable owner field anywhere; the only other axis (Zone `ownerGroup`) is
orthogonal to authorship and never reconciled with it.

**Un-fusing them is the first brick.** "I built a shop on your land — you own the
plot, I own the shop, you charge me rent" is *unrepresentable* today. And the
seams already exist for exactly this:

- provenance's deferred **"ownership hierarchy"** (nested / multi-author ownership
  + the `CreditShare[]` team-split) — the *ownership* half;
- the CMS's deferred **"lease model"** (lease-scoped trees + group-managed content
  + op-log versioning + a forums-review publish gate) — the *tenancy* half.

Those two deferrals are the two halves of tenancy. Building property *cashes
checks the architecture already wrote.*

## The compute model — two layers, plan vs. actual

The runtime scarcity. Two layers, and the pairing is the point: **prediction sets
a budget (a plan); runtime handles reality.** The design is built to *tolerate bad
prediction* — so we never need an accurate cost oracle, only a proportional,
monotonic heuristic wrapped in a reconciliation loop.

### Layer B — the predicted budget (authoring time)

At the CMS save chokepoint (the same pass that already validates brain paths /
tree schemas), attaching a capability has a **predicted cost** that depletes the
parcel's allowance. Deficit is allowed (soft).

- **Count heartbeats, not instructions.** Content is *declarative* — a composition
  of mixins + a `behaviors:` list + drivers. The expensive things are the
  *recurring* things (cadenced brains, unconditional recomputes, re-resolving
  subscriptions); a static prop costs ~residency. So the model is: **sum the
  clocked work you declared, weight by cadence, add a flat residency term per
  instance.** No code analysis; the engine's lazy/reconcile-on-read/freeze
  patterns already make everything else cheap-when-idle.
- **Surfaced as a build-budget gauge** in the CMS ("this NPC: +12; parcel
  64/100") + a per-parcel load report. Legible, a design discipline — *constraint
  breeds craft.*

### Layer A — runtime degradation, ordered by deficit

Prediction *will* diverge from reality (a brain's cost depends on traffic you
can't predict). So the runtime reconciles:

> **When the box is genuinely under pressure, over-budget parcels degrade
> first** — their NPCs go quiescent, ambient sim freezes (we already have the
> freeze pattern), non-essential drivers shed. A visitor to a *well-budgeted*
> popular venue never feels a thing.

This inverts the naive "area is full, no entry" (which punishes visitors for the
owner's overbuild). **Deficit doesn't block you — it sets your degradation
priority.** "Refuse entry" becomes only the last rung, rarely reached. A/B
reinforce: staying in budget = staying live under load.

### Two numbers, allowed to disagree

- **Predicted** (static heartbeat-sum, cheap, at save) — sets the *budget*; about
  **potential** ("if this parcel were full and everything fired").
- **Measured** (runtime telemetry, per-parcel) — drives *degradation +
  calibration*; about **actual**, which the freeze pattern keeps proportional to
  who's present.

They needn't match; the *gap is signal* (measured ≫ predicted = wrong table or
gaming). Precedent already in-engine: the scripting engine's author-tiered
per-execution limits (`sliceSteps`/`maxSteps`/`maxDispatch`/`maxDepth`) — proof
that author-tiered runtime governance is already a concept here.

## Measurement — how we actually get the numbers

The genuinely non-trivial engineering is **per-parcel attribution** — and it's
tractable because of the instrumentation seams the engine already has.

### CPU — ride the Proxy

Every Stuff is wrapped in the call-security **Proxy**; every method dispatch flows
through it. So per-parcel CPU attribution is: **time the dispatch, attribute by
the receiver's parcel, sample to taste** (don't time every call — sample a
fraction). And because `ExecutionContextApi` carries the cause
(`causingCommandId`/`runRoot`), you can *choose* the attribution policy — bill the
parcel where the code ran, or the parcel whose command *caused* the work. The
mechanism for both is already there; the policy is a design choice.

### Memory — a registry sweep, counting shallow-once

The Proxy sees *calls*, not *allocations* — so memory uses a different mechanism:
a **periodic registry sweep**, keying each Stuff to its locality and summing an
estimate. The trap to avoid is retained-size double-counting (a Stuff belongs to
many collections). The rule that dodges it:

> **Each instance counts only its own *shallow* footprint, exactly once; a
> reference to another Stuff is just a pointer (~8 bytes), not the referent's
> payload.** You're *partitioning instances* across parcels, not summing
> overlapping retained graphs. Membership-in-many-collections becomes cheap
> scattered pointers, never repeated payload.

The ladder (same crude→calibrate shape as CPU):

1. **Weighted instance-count** per parcel (room ≈ X, NPC ≈ Y, item ≈ Z) — a
   periodic O(n) sweep. Probably enough for a budget.
2. **Shallow-byte estimate** (walk own fields + collection sizes) — catches the
   state-heavy instances a flat count misses.
3. **Heap-snapshot calibration** (`v8.getHeapSnapshot()`, expensive, *offline*) —
   validate/re-tune the weights against ground-truth shallow+retained sizes. The
   memory analog of microbenchmarking CPU primitives.
4. **`process.memoryUsage().heapUsed`** = the box's real pressure — the aggregate
   signal that *triggers* shedding. You don't need accurate per-parcel numbers to
   *enforce*, only to *attribute/order*.

### Attribution buckets

*Static content* → its home parcel · *mobile agents + their gear* → the owner's
home parcel or the commons, **not** their current location (else a parcel spikes
when a crowd walks in — presence-never-the-meter) · *singletons / catalogues /
platform* → the commons (unattributable overhead governance funds). Memory cost is
only the **hydrated** footprint — and **eviction (dormancy) is how you free it**;
residency and reclamation are the same lever.

## Enforcement is dormancy — freeze, then evict

The teeth of property and the compute reclamation are the *same act*. We already
have half of it:

- **Freeze (built).** Driver presence-freeze (metabolism/thermal/respiration/
  weather are reconcile-on-read on game-time — "zero work when empty") + lazy
  first-use instantiation. This is the CPU-reclamation primitive.
- **Evict (net-new).** The world is **resident once materialized** — nothing is
  ever unloaded (`lifecycle.md` defers idle eviction outright; `unregister` fires
  only via explicit destruct). Full reclamation needs idle-eviction / dormant-zone
  unload. **"Freeze" ≠ "unload"** — freeze stops driver ticks; eviction frees
  memory.

Property enforcement = extend the freeze trigger from "no one present" to "owner
insolvent / over-deficit," then evict. A fallow parcel *goes to seed* diegetically
and *is reclaimed* physically — one act.

## Governance — scarcity is an invented, tuned policy

No natural scarcity means the polity *chooses* it, continuously — the governance
tier's actual job here:

- **Frontier** (default): infinite, ~free, near-zero compute (dormant edge) —
  homestead cheap.
- **Center**: a genuine positional good (one University Avenue), high compute,
  high parcel tax, high income potential — scarce because compute is scarce *and*
  centrality is rivalrous.
- **The commons**: public goods (the Avenue, newbie zones) have no rent-paying
  owner → the treasury **subsidizes** their compute (the deficit-mint / Dave's-Bar
  precedent, `reserve mint` now governor-gated). The public/private compute split
  is *the* recurring governance call.
- **The over-subscription ratio** (see forks) is a governance knob; so is the
  parcel-tax curve, the centrality rules, and the total allowance (= how much of
  the box is committed).

The governance tier here is effectively the **land office ⊕ the central bank**,
unified as a capacity-allocation authority — stress-testing whether Offices are
*real allocators* or just founder-default seats.

## The gap map (from three probes)

| Area | Exists | Net-new |
|---|---|---|
| **Boundaries** | ✅ three mechanisms (zone-break / address longest-prefix / doors) | — (more than enough) |
| **Ownership** | group-ACL (`ownerGroup` + `owner` role, walked) | per-holding **title** + a **registry** + the **parcel** join |
| **Transfer** | degenerate (hand-edit `ownerGroup` via `write`) | first-class economic **transfer/market** |
| **Author vs owner** | **fused** (owner = immutable earliest author) | **un-fuse** (transferable owner ≠ author) |
| **Authoring namespace** | `HomeZone` root + document-store self-home + Warren budding | the **dorm/parcel** as an owned unit (all *unwired*) |
| **Money economy** | conserved, CB mint, P&L, governor-gated mint | **parcel tax**; a fiscal-cycle **budget allocation** (manual mint only) |
| **Compute metering** | scripting per-execution limits; the Proxy + ExecutionContext seams | a **content cost model** + per-parcel **attribution** (nothing charges for existence today — Law 2) |
| **Dormancy** | driver **freeze** + lazy instantiation | **idle eviction / dormant-zone** unload |

## Build waves (the four-phase spine)

- **Phase 0 — Possession core.** Un-fuse author from owner · the parcel primitive ·
  per-holding title + registry · first-class transfer. **Pure property, no economy
  yet.** Unblocks pets/ranching/goods immediately (custody = a degenerate parcel);
  mostly the join of existing trees + the title. The starter sandbox-home
  (`HomeZone` realized) is the first parcel.
- **Phase 1 — The compute economy.** The predicted heartbeat-budget (CMS gauge) +
  the parcel tax + dormancy (freeze → **evict**). Start with the crudest cost model
  (flat per-brain/driver, generous limits); calibrate later; defer the sophisticated
  runtime attribution until there's real load. Depends on Phase 0 + banking (built).
- **Phase 2 — Governance allocation.** The fiscal cycle, the commons subsidy, the
  frontier/center rent-curve + over-subscription policy — the levers the polity
  tunes. Depends on the Office substrate maturing into a real allocator.
- **Phase 3 — Tenancy.** Author-on-rented-land, improvements, nested ownership —
  the CMS lease model + provenance ownership-hierarchy realized. The full
  author-vs-landlord.

## Open forks / questions

- **Should money relieve compute-deficit *at all*?** "Overspend → higher parcel
  tax" lets the rich run heavier content (market allocates slack) — feature or
  corruption? The governance ceiling caps the *total*; within it, do we let money
  bid for slack, or is allowance strictly non-monetary?
- **Reserved vs over-subscribed billing.** Reserved (charge on predicted
  potential) = safe, no over-subscription, but idle-heavy builds waste reserved
  capacity. Over-subscribed (ceilings sum > capacity; measured load + degradation
  handles contention) = efficient, rewards the freeze pattern, risks a
  thundering-herd. *Lean: over-subscribed with measured degradation; the ratio is
  a governance knob* (how real clouds work). "Whatever's fine" for now — the Proxy
  lets us measure and decide empirically.
- **CPU attribution policy** — cause (`causingCommandId`) vs receiver (where the
  code ran). Mechanism for both exists; pick the fair one.
- **How the sandbox attaches to the shared world** — the frontier/federation
  thread: the exit/address graph, adjacency to the commons, how a private parcel
  connects. Genuinely open.
- **Diegetic skin.** Keep the compute gauge **honest** (it's about the real box;
  dressing a cloud bill as a fantasy resource is the failure mode). An optional
  *thin* lore reason ("the weave holds only so much liveness in one place") is fine
  as flavor, never as obfuscation. Money keeps its full fiction; compute stays
  legible.

## Scope guardrails

- **Two scarcities, never one.** Money prices land; allowance prices liveness.
  Resist collapsing them; couple them only at the parcel + the deficit boundary.
- **Tolerate bad prediction by design.** The two-layer plan-vs-actual is the whole
  robustness story — don't chase a precise cost oracle; ship crude + calibrate +
  backstop.
- **Reuse the seams.** Boundaries (zone/address/boundary), access (`AccessApi`),
  the freeze pattern, the Proxy (CPU), the registry (memory), the money system,
  the governor gate. This is orchestration; the *primitive* additions are small
  (the parcel/title, the cost model, eviction).
- **Consolidate, don't fork.** This slate is the home of the possession/property
  substrate its consumers (pets/ranching/farming) point up to — and it absorbs the
  scattered deferrals (provenance ownership-hierarchy, CMS lease model, the
  tenure/territory decisions). Build it once.
- **No new module categories.** The parcel is a Zone/Location + a title record;
  the cost model is a save-time validator + a table; attribution rides the Proxy +
  a registry sweep; verbs are ordinary YAML+controller pairs.

---

## Design-session addendum — 2026-07-02 (parcel data model, sandboxing, home personalization)

> A long working session, grounded by reading the **live lounge content**,
> refined and in places **corrected** the slate body above. Where this
> addendum disagrees with the body, the addendum is newer. Five clusters.

### A. The zone tree *is* the ownership tree (corrects "two unrelated trees")

The body claims "boundaries and holdings are unrelated trees; no boundary edge
coincides with an ownable extent." **Reading the code, that's wrong.** There is
no zone-less content: every path belongs to the Zone hierarchy (`FolderZone`
for organizational areas, `CartesianZone`/`SphericalZone` for coordinate rooms).
The lounge is a **`FolderZone` at `/domain/lounge`** (+ `/obj/lounge`) with
`ownerGroup = managed:<lounge>`, stamped by `AccessRegistry.seedLoungeSlice`;
`'core'` owns the root. ("Zone-less" in the lounge comments means only "no
`Stuff.zone` *spatial* stamp" — the non-coordinate social pockets still belong
to the `/domain/lounge` FolderZone for ownership/access/inheritance.)

So the FolderZone edge **already coincides with an ownable extent** (`ownerGroup`,
walked closest-first by `AccessApi.can`, filesystem-ACL semantics), and
"managed independently" is **already true** (the lounge group owns its subtree;
EU/Terminus each get their own owning group). Consequences:

- **A parcel is always a Zone** (a FolderZone for an area, a spatial zone for a
  grid). The "namespace vs zone" question is a false dichotomy — the zone
  hierarchy *is* path-addressed.
- **Parcels form their own hierarchy — a *sparse overlay* on the zone tree.**
  Not every zone is a parcel; a zone with no parcel record inherits its
  governing parcel from the nearest parcel-bearing ancestor (longest-prefix). A
  finer zone nested inside a parcel can carry its **own** parcel record → a
  carve-out sub-parcel (`parentParcel` edge). This makes **nested ownership /
  tenancy a Phase-0 structural property**, not a Phase-3 deferral.

### B. Ownership + authorship + allowance live in a *separate* collection

Privilege separation: `ownerGroup`/`accessGroups` are currently stored on the
Zone **template** — a row in the `domain` collection, the very collection whose
access they gate. Whoever can edit the zone template can rewrite its own owner
and seize the subtree. **These must live apart from the content they govern.**

- New **`parcels`** registry collection:
  `{ parcelId, extents: string[], parentParcel, owner, accessGrants, allowance }`
  + a prefix→parcel coverage index (the `AddressRegistry` pattern) for
  longest-prefix resolution.
- **`parcelId` + `extents[]`** (not a bare domain-path key) is justified by
  "own the whole operation end to end": a parcel spans its content root **and**
  its code root — the lounge already owns `/domain/lounge` **and** `/obj/lounge`.
- **Full migration:** the Zone becomes pure content/geometry (extent, coordinate
  frame, inheritance defaults) with **zero** access info. `AccessApi.can`
  repoints its read from `zone.data` → the `parcels` registry;
  `seedLoungeSlice` writes a parcel row instead of mutating `domain.data`.
- **Author ≠ owner via two collections** (resolves brick zero, no migration):
  `authoring_events` (immutable **credit**, already ships) + `parcels` (mutable
  **possession**). `ownerOf(path) = parcels-title (longest-prefix) ?? authorOf`.
  Owner *defaults* to author; a transfer writes a title row that overrides. The
  body slightly overstated the fusion — `ownerGroup` already exists and is
  mutable; the real fusion was provenance treating earliest-author as owner.

### C. Compute attribution = spawn-provenance ("cost-owner"), not backing class

Closes the body's open "cause vs receiver" fork. You never attribute running
compute by the *class/module*; you attribute by the parcel that **caused the
instance to exist**:

- `costOwnerOf(instance)`: **(1)** if its `templatePath` resolves (longest-prefix)
  to a parcel extent → that parcel (the common case — authoring your own
  template — free, no stamp). **(2)** else a generic/commons template
  (`/obj/Flask`, `/lib/Flask` cloned directly) → a **sparse birth-stamp** = the
  spawning parcel, derived from the spawn's `ExecutionContext` root.
- The coin/flask distinction falls out with **no special-casing**: the mint
  spawns the coin (no parcel → commons overhead); ME's tavern populates the
  flask (→ ME pays), *despite* `Flask` being a commons class. Cost follows the
  **authorial choice**, not the class's location.
- **CPU** = cause (`ExecutionContext` root → actor's parcel — shared library
  code costs its *user*, not its commons author). **Memory** = residency, with
  **owned gear → owner's parcel** (presence-never-the-meter; a crowd walking in
  doesn't spike a parcel). Autonomous drivers with no command cause → residency.
- Cost-owner **re-stamps on a possession transfer** — the compute-cost axis
  rides the same title machinery as ownership (possession and operating-cost
  move together).

### D. Anti-cheat is a *content-release gate*, not place-sandboxing the home

The real seam is **author-vs-play**, not **home-vs-sandbox**:

- **One invariant:** *material* state is domain-local; *epistemic/social* state
  is global. The **published world** is the maximal material-canonical domain
  (portable within — both ends passed the publish/review gate). A private
  parcel/clique is a **magic circle**: material state is real inside but **does
  not cross out** — and the boundary is **symmetric** (binds the owner too, so
  the owner can't be the cheater).
- **Mechanism = scoped ledger quarantine, not world-instancing.** Because
  character power is ledger-derived + timestamped (Transcript/renown/bank/…),
  "rollback" = discard the circle-scoped ledger appends on exit. Everyone stays
  in the same room; only their *writes* are scoped — cheaper than per-visitor
  instances (preserves presence-never-the-meter).
- **Allowlist principle:** epistemic persists (chronicle / contacts /
  recognition — *what you learned, whom you met*); material reverts (loot /
  levels / money / buffs / vitals — *what you gained*).
- **The gamified home is canonical, NOT a sandbox.** Pet care (real `regard`
  substrate), electricity/upkeep (real compute + money economy) are *playing*
  with published mechanisms → real and game-affecting everywhere, dwelling
  included. The **anti-cheat is the released gate**: unreleased authored power
  is **inert in canon** (point-of-effect, via the augment `isActive` seam) — you
  can't wield an unreviewed +5 sword in the real game, but you *can* raise a real
  pet. The rollback magic-circle shrinks to a **testbed** for unreleased builds —
  a granular **sandbox sub-zone** (workshop) nested inside the canonical dwelling
  (the parcel hierarchy from §A carries it).
- **Consistency note (checked):** gamified-home mechanics that "happen while
  you're away" (pet drifts feral, plants grow, meter ticks) use
  **reconcile-on-read** (the metabolism/farming pattern), *not* a live tick — so
  they affect durable state **without** violating presence-freeze.

### E. Home personalization = capability tiers, not a governance permit

A permit pipeline (legislature/executive/courts per change) is the wrong
altitude and doesn't scale. **Personal customization is not a governance act.**
Governing principle: **review the vocabulary (primitives), not the sentence
(compositions)** — review cost is O(new primitives), not O(homes).

- **Tier 0 — arrange & decorate:** clone published templates, set *data fields*,
  arrange rooms (the dorm-warren mixin-field editor). Data, not code → nothing
  new enters canon → **no review**. Rides the wizard/protowizard lockdown
  (players set data fields, never the `class`/`brain`/`hydratorClass` code fields
  at `saveTemplate`).
- **Tier 1 — automate with scripts:** scripts over the **published command bus**
  — **safe by construction** (run as you, can't exceed your own command
  authority), throttled by the scripting engine's resource limits + the compute
  allowance. **No review.**
- **Tier 2 — author new primitives:** new code → unreleased → test in the
  workshop sub-zone → **publish via CMS/forums review** → becomes a shared
  primitive anyone composes in Tier 0. Review is **per-primitive, once**,
  amortized across every home that uses it.
- **Two throttles replace the permit:** the **release gate** (unreviewed power
  inert — cheating is structurally impossible, not administratively forbidden)
  + the **compute allowance** (overbuilding self-limited by budget). Governance
  is reserved for the **commons + shared rules** only — never your couch. The
  tiers *are* the player→author ladder (personalizing teaches authoring).

### Open threads carried forward

- **Sublet rollup** (sub-parcel allowance carved-from-parent vs. direct
  governance grant) = a **producer-house allocation policy**, not substrate.
- **Trust-domain topology:** lattice (published ⊃ custom ⊃ singleton) vs.
  arbitrary graph. Lean lattice (asymmetric trust invites exploits).
- **What counts as "power"** for the release/activation gate — augments clearly;
  do crafted `Grade`, conferred verbs, standing need it, or do they route
  through augments/ledgers and get it free?
- **Material-vs-epistemic ledger enumeration** — the exact list, and the edges
  (does reputation *earned inside* persist? — no; does *having met* persist? — yes).
- **Cost-owner re-stamp on transfer:** automatic, or a consented step (can
  ownership and compute-liability be split — the seller keeps hosting)?
- **Combination exploits** (two individually-safe primitives that break
  together) = a governance **backstop** (notice-and-patch / catch at
  publish-review), not a gate.
- **The Tier 0 / Tier 2 line:** how much novel behavior can come from pure data
  config over rich published primitives before an author is forced into code?
- **Instancing** (only if used beyond ledger-quarantine): the snapshot split +
  who pays the per-visitor compute.

### Net (phase-sequencing impact)

Core theses **survive intact** (two scarcities, pay-to-run, presence-never-the-
meter, author≠owner, dormancy enforcement, governance-allocates). Three things
change how Phase 0 is scoped: **(1)** the parcel is "a Zone + title + allowance,"
not a net-new join — reuse the zone tree; **(2)** ownership/allowance data moves
to a **separate `parcels` collection** (a refactor of the shipped access
substrate — repoint `AccessApi.can`); **(3)** the **parcel hierarchy** (nested
sub-parcels) is foundational, pulling structural tenancy forward from Phase 3.
The sandbox/anti-cheat resolves to the **released gate + trust domains** (largely
reusing the augment `isActive` seam), and home personalization to **capability
tiers**, neither of which needs new governance machinery.

### F. Sub-zone granularity — "parcel = zone" and the second ownership axis

Does "parcel = zone" hold at *player scale* (own a shop / a room / an object),
where the lounge exemplar (a whole team subtree) gives no guidance? **It holds
for real property — and reaches further down than expected — but only by handing
everything below the zone to a second ownership axis.**

- The **cardinal-only-intra-zone invariant already makes every interior its own
  zone** (you `enter` a door → non-cardinal exit → zone break). So the things a
  player owns as real property are *already* zones: a house, a shop-in-a-district
  (a sub-parcel nested at its `enter` door), an apartment (each unit `enter`-ed),
  a dorm (`HomeZone`), a farm (beds are **slots**, not sub-parcels). Parcel =
  zone. ✓
- **Coarser than a zone** is covered by `extents[]` (one parcel spans several
  zones — the lounge's `/domain/lounge` + `/obj/lounge`). **Finer than a zone is
  NOT a parcel:**
  - **Chattel** — movable/placeable objects (sword, pet, market stall, a
    supplier's counter dropped in your shop). Owned per-instance (an owner-stamp),
    *not* titled as real property, *not* allowance-bearing; compute billed to a
    parcel via **cost-owner**. ("Rent a stall" = place your owned stall-fixture in
    the hall's zone — chattel, no sub-zone.)
  - **Slots** — internal structure of a zone you already own (farm beds,
    workbenches). Part of the host parcel, not separate ownership.
- **Bright line:** *real property bottoms out at the zone; everything finer is
  chattel or slots.*

**Key output — Phase 0 possession core is TWO registries, not one:**

| | Parcel title (real property) | Chattel possession (goods) |
|---|---|---|
| Unit | a Zone (extent) | a Stuff instance |
| Keyed on | zone path / `parcelId` + `extents[]` | a durable instance id |
| Allowance | yes | no (billed to a parcel via cost-owner) |
| Un-fuse from author | `ownerOf(path) = title ?? authorOf` | `ownerOf(item) = stamp ?? authorOf` |

The pets-slate gap ("no owner-stamp on goods; `Charge` has no debtor") **is the
chattel half** — and it belongs here, since the slate already claims to be the
general possession substrate ("custody is a degenerate case of possession").
Both halves un-fuse owner from author, meet compute at cost-owner, and go inert
in canon if unreleased.

**Two tensions:**
1. **Zone proliferation** for fine ownership (a city of 10k homes = 10k zones +
   parcel rows). `HomeZone` proves per-player-zone at some scale; city-scale
   wants lazy instantiation + coverage-index perf, and a first-class **runtime
   "subdivide/claim" primitive** (mint zone + parcel record + wire exits + set
   allowance — the concrete shape of the slate's "first-class transfer";
   `HomeZone`/`mkdir` precedent).
2. **Seamless open-world coordinate-region ownership** — the *one* case parcel =
   zone can't express (a prairie subdivided into plots without fragmenting into
   100 grids). v1: plot-zones stitched by cardinal exits (cardinal exits *can*
   cross zones — farming does this). Later, **additive not contradictory**: a
   *region parcel* claiming a coord bounding-box within a host zone, with a
   point-in-region resolver layered *under* the path-prefix one (only opt-in
   zones pay the point-test). Single-leaf-room ownership is the same gap/answer.

### G. The wardrobe — the sandbox is a placeable portal fixture, not a parcel mode

The keystone reframe that collapses §D + §E into one diegetic, **composable**
thing: **the sandbox is a placeable portal fixture (chattel) that mints a linked
magic-circle zone (a parcel) you author freely and publish from.** (Narnia
wardrobe / holodeck gate / summoning circle — skinnable.)

- **`SandboxPortalMixin` + a content skin** = a Tier-0 composable primitive you
  place in your canonical, data-driven home (same act as hanging a painting; the
  skin is pure `Visible`/`Detailed` data — no new module category).
- **Placing / first-entering mints the linked sandbox zone** (the runtime
  subdivide/claim primitive from §F): a parcel you own, a magic-circle domain, an
  unreleased namespace (`/home` → already "unreleased" per the released gate), its
  own allowance. **Both ownership axes in one object:** you own the *wardrobe*
  (chattel) + the *linked sandbox zone* (parcel + authoring authority).
- **Portal-crossing invariant** (corrected in §H): a sandbox wires *no*
  **non-portal** exit back to canon, and **every** canon↔sandbox crossing is a
  reconcile checkpoint — which is what makes the "every exit must reconcile" hard
  part tractable (multiple portals to one zone are allowed; see §H).

**Two orthogonal gates; the wardrobe opens only one:**

| Gate | Protects | Wardrobe opens it? |
|---|---|---|
| **Release / balance** | game balance (unreviewed content power in canon) | **Yes** — unreleased content *works* inside; rollback contains balance leaks. |
| **Code-trust (`isWizard`)** | server security (executing arbitrary TypeScript) | **No** — TS stays wizard-gated everywhere. |

Rollback contains *game state*, not *code execution* — a malicious TS class could
exfiltrate/melt the box before any exit-rollback (that's `isolated-vm`'s job, a
different mechanism). So **"absolute authoring authority" = absolute over
*content*** (compose/configure/script/author unreleased templates), **not over
*code*.** A non-wizard gets a full creative sandbox; new TypeScript is still the
wizard axis, unchanged.

**Two exits (why "build it in the wardrobe and publish" isn't a cheat):**
1. **Walk out** → material rollback (keep nothing — symmetric, applies to you too).
2. **Publish** → CMS/forums review gate → your *design* enters canon, balanced,
   for everyone.

Neither smuggles power out. The wardrobe cleanly separates *playing with
unreleased toys* (rollback) from *contributing a reviewed primitive* (publish).

**Architectural payoff:** the wardrobe is **what makes the compose-only canonical
home acceptable.** Unbounded authoring isn't forbidden — it's *routed* into a
sandbox where it can't hurt anyone, with a reviewed path to canon. The valve, not
the wall; the dorm-warren player→author ladder made physical (decorate → step
into the wardrobe to author → publish → your word joins everyone's dictionary).

**Edges (resolve cleanly):** allowance-gated size (bigger holodeck costs budget;
empty → freeze; rollback reclaims memory on exit) · invite guests = the
shared-holodeck case, symmetric rollback, access-controlled by your parcel · even
wizards prototype here (their unreleased class is still quarantined until
published — the release gate applies regardless of author) · lazy/dormant zone
(`HomeZone` precedent).

### H. Wardrobe ↔ zone lifecycle — decouple *access* (chattel) from *asset* (parcel)

Binding the movable wardrobe 1:1-rigidly to its durable zone makes both fragile.
Split them — the **storage-unit-and-key** model:

- **Wardrobe (chattel) = the access.** Carries a `linkedSandboxPath` ref.
- **Sandbox zone (parcel) = the asset** (authored work + allowance).
- **The zone's exit-to-canon resolves *live* to the wardrobe's current location**
  (resolve-on-read) — the portal is wherever the wardrobe is.

Lifecycle then falls out:

- **Move** (rearrange / carry to a friend's house) → the portal relocates, the
  zone travels with its door — a **portable pocket dimension**. Compute stays
  billed to the owner via cost-owner regardless of physical location (carrying it
  into a friend's house doesn't bill their parcel).
- **Sell** → **two separable transfers**: *empty* (chattel only; buyer's portal
  mints a fresh zone on first entry — blank wardrobes as a durable good) vs
  *furnished* (chattel **+ a parcel transfer**: title + allowance-liability move
  to the buyer — a curated holodeck as premium content). The empty/furnished
  prompt is where the "cost-owner re-stamp: automatic vs consented" thread is
  answered.
- **Destroy** → **evacuate occupants first** (force reconcile-exit to the shipped
  `evacuationFallback` AppSetting — else they're trapped, since the exit resolved
  through the now-gone wardrobe), then **orphan, don't destroy** (the asset
  outlives its access; re-bind a new wardrobe to reclaim it). Truly-abandoned
  zones follow the normal parcel **dormancy → eviction** path — no wardrobe
  special case.

**Invariant correction to §G:** not "exactly one portal" but "**every**
canon↔sandbox crossing is a reconcile checkpoint, and no *non-portal* exit
reaches canon." **Multiple wardrobes → one zone is allowed**, because the
reconcile keys on the *visitor's entry snapshot*, not the door (enter via A, exit
via B → reconcile against the A-entry snapshot). Airtight regardless of door
count.

**Interactions carried forward:**
- **Authorship vs. ownership on a furnished sale.** Buyer gets the *parcel title*
  (possession); *authoring credit* stays with the seller (`authoring_events` is
  immutable). So if the buyer later **publishes** something the seller built,
  credit-routing (`CreditRouting.resolve`) must rule author vs. owner vs. a
  `CreditShare` split (if the buyer modified it) — the producer-influence seam.
- **Allowance-liability** follows the parcel on a furnished transfer; stays with
  the seller on an empty sale.

**Payoff:** decoupling access from asset yields a **durable-good + content
market** (blank wardrobes manufactured as product; furnished pocket-dimensions
sold as premium authored content) *and* protects authored work from accidental
loss (the key is not the vault). No new module category — a ref field on the
wardrobe, a live-resolved exit on the zone, and the existing transfer + dormancy
+ evacuation machinery.

### I. Chattel, persistence, and the capability-vs-relation correction (supersedes §F's chattel half)

§F proposed a `PossessableMixin` + a `possessions` registry-as-store. Both were
mis-scoped. The corrected model is smaller and reuses more.

**The guardrail — a mixin test (adopt this project-wide).** Before proposing any
mixin, ask:
1. **Capability or relation?** A *capability* is intrinsic ("this KIND of thing
   can be worn / contains / is a portal") → a mixin on the templates that have it
   (`Wearable`, `Container`, `SandboxPortal`). A *relation* is runtime ("this
   instance is owned-by / regarded-by / authored-by that one") → a **registry
   keyed on identity, never a mixin** (`belief`, `regard`, `renown`,
   `authoring_events` — none is a `RegardableMixin` on its target).
2. **If a mixin: does *every* instance of the base have it?** If yes it's
   base-class, not a mixin; if only some, it's opt-in.
3. **Where does the concept bottom out** in the hierarchy?

Possession fails #1 — **being owned is a relation, not a capability** → **there is
no `PossessableMixin`.** (Contrast: the wardrobe's `SandboxPortalMixin` confers
*behavior* → a legit mixin. The test discriminates.)

**The real substrate is `PersistableHolder`** — a *capability* (passes #1): a
container that snapshots/restores a **bounded set of contained state across a
boundary**. Three consumers, one mechanism:

- **Avatar** (carried inventory across logout — the shipped instance),
- **Container / chest** (stashed contents across restart),
- **Owned-parcel room** (placed fixtures — the fridge that won't fit in a chest).

And crucially, the **sandbox rollback is the same capability** (restore the
pre-entry snapshot). Unowned/ephemeral rooms are *not* holders — they only
populate (see below), which is why dropping a valuable in the street loses it.
"Your stuff persists where you have a persistent claim" is a *consequence* of
this, not an authored rule.

**One shared serialization boundary contract** (identical for logout / stash /
sandbox-exit — design once):

- ✅ **Contained items that fit** — *bulk-limited* (the fridge-in-chest constraint
  is just container capacity).
- ⚠️ **Equipped/worn → unequip.** Slot bindings are body-plan-dependent and
  shadow-carrying; v1 round-trips only un-equipped inventory (best-effort re-equip
  later).
- ❌ **Shadows** (buffs / augment effects / disguises / polymorph / per-viewer
  overrides) — runtime-only, dropped.
- ❌ **Live-refs to session instances** — nulled on restore (the R2 rules).

This is the **same allowlist as the sandbox material-vs-epistemic split**,
generalized.

**Possession is one field, not a store.** Each item's snapshot carries
`{ templatePath, stateDelta, owner, id }`; `owner` rides wherever the item is held
(Avatar / chest / owned room). The `possessions` collection demotes to a
**rebuildable owner-*index*** over holders (the banking ledger→cache shape) — for
"what/where do I own," not for storage. **Persistence ≠ ownership:** carrying a
generic item into your persistent room makes it *persist*, not become *yours*;
ownership changes only by `claim`/transfer (a stamp) or by authored-under-extent.

**Ownership resolution — the same rule as §C cost-owner:**

```
ownerOf(item) =
  explicit owner stamp                                   // titled chattel — travels with it
  ?? (templatePath under a parcel extent → that parcel)  // authored parcel-content (fixtures)
  ?? unowned                                             // generic, unclaimed
```

Because the derivation keys on **templatePath, not location**, an authored fixture
stays titled to its parcel even when displaced → displacing it is **theft**
(custody ≠ owner), recoverable; only an explicit stamp transfers it.

**Ownership bottoms out at `Creature`** (the vitals.md `Creature → Character`
split *is* the chattel↔person line): `Thing`/`Creature` are ownable chattel;
`Character`/`NPC`/`Avatar` are self-owned persons; `Location`/`Zone` are the
real-property axis; `Stuff` owns nothing. Avatars already have durable identity +
persist-back *because* they're self-owned individuated persons — the same
capability owned chattel needs, triggered by personhood instead of ownership.

**Three mechanisms, cleanly layered (not one tangled thing):**

| Mechanism | Job | Source of truth |
|---|---|---|
| **Populates** | *seed* a room's initial contents | the template (`container:`/`PopulatesMixin`) |
| **Persistence** | *maintain* ongoing contents | a snapshot — **only for persistable holders** |
| **Ownership** | *attribute* who owns each item | the `owner` field (`stamp ?? extent ?? unowned`) |

- **Seed-then-persist handoff**, gated by "is this a persistable holder": a holder
  runs populates **once** to seed its first snapshot, then persistence is
  authoritative (no respawn); an ephemeral room has **no snapshot**, so populates
  re-runs every materialization (restocking) and runtime additions are wiped. This
  is the mechanistic reason the street loses your dropped sword.
- **One-shot vs. restocking populates** is a per-declaration knob: one-shot
  (fixtures — seeded then persisted, no duplicate on displacement) vs. restocking
  (shop wares / ambient — always respawned, typically ephemeral & unowned). Titled
  chattel is always the one-shot kind. (The shipped `Avatar.enter` live-ref
  consultation already leans one-shot/idempotent.)

**Net scope (replaces §F's chattel-registry-as-store):** **no new persistence
system.** Generalize the shipped holder-snapshot to **chests + owned rooms**
(room persistence **corrected in §K** — it uses the dorm's *document-store
customization-doc*, base-template + delta, **not** the legacy Avatar-snapshot)
under **one serialization boundary contract**; possession is a **field** on each
item's snapshot plus a **rebuildable owner-index**; a **durable per-item id** is
conferred by ownership (for the index + cross-move/theft tracking), a small field,
not a mechanism. `PossessableMixin` is deleted; `PersistableHolder` is the one new
capability.

> **Today's state (honest scope):** no room persists runtime additions —
> persistence is Avatar-only, rooms only populate. The build's actual new work is
> making **owned parcel-rooms + chests** persistable holders, which is what
> *creates* the seed-then-persist handoff.

### J. Verb generality (custody vs. title) + what a shop belongs to

**The verbs aren't a new parallel set.** They split on the custody/title axis:

- **Custody = the *existing* containment verbs** (`get`/`drop`/`put`/`give` →
  `ContainmentApi.move`). Unchanged.
- **Title = a new concern *layered onto* those verbs**, not new parallel ones:
  `drop`/`put` your owned item → custody moves, title stays; `take` an owned item
  without consent → **theft** (custody without title); `give` → a **combined
  custody + title** transfer (bilateral consent).
- **Genuinely-new verbs only where there's no custody analog:** `claim`
  (title-only stamp), `sell` (title + custody + payment), and the **parcel
  operations** (you can't carry a zone).

Architecturally: the shared things are the **operation primitives**
(`ContainmentApi.move` / the title chokepoint / banking `settle`); **verbs are
thin controllers composing them.** Chattel rides the containment-verb family
(made title-aware); **real property gets its own verb/category** (no custody).
`sell` is polymorphic-on-target or split. Discriminator: *does the target have
custody?*

**"Possessions" is a sparse minority, not most objects** (restating §I): floor
junk, shelf mugs, ambient stuff are unowned ephemeral `populates` clones with no
row. Possessions = *claimed valuables* + *extent-derived fixtures*. Ownership is
opt-in via `claim`, which is what keeps the registry cheap.

**Shops are a primary consumer, but it's invisible until point-of-sale:** stock
is *not* individually titled (restock / bulk); a **sale** is where possession
fires — `sell`/`order` **promotes** the item (stamp title to buyer + `settle`
payment, atomically). **Dave's Bar already does this** (`OrderController` settles
the Menu's `priceFor` as a `Charge`).

**What a shop belongs to — three separable layers, three (possibly different)
owners:**

| Layer | Is | Owned by |
|---|---|---|
| **Premises** | the rooms/zone | a **parcel** title-holder (landlord, proprietor, or *leased*) |
| **Business** (brand / account / roster) | a **`Business` Idea** (`/domain/lounge/business`) | its **proprietor** (a principal, via the replaceable `proprietorPath`; outlives the proprietor) |
| **Stock** | wares | the **business** (by extent-derivation), until sold |

Dave's Bar collapses these today (one team owns premises + business), but the
model **separates** them — a proprietor can rent premises from a landlord and run
a business that owns its stock. **Compute** follows the same layering: the
premises parcel carries the allowance (landlord funds), the business pays rent,
and its operating compute (bartender NPC, ambient brains) attributes via
cost-owner/residency to the premises parcel. The `Business`-as-its-own-Idea
decision (not a venue mixin) is exactly what makes this three-way split work.

### K. Dorms — the proto-parcel; Warren ownership; and rent vs. own

The dorm shipped before this design, so it's the reality-check. **What shipped:**
`HomeZone` (`lib/home/HomeZone.ts`) — a per-player namespace root at
`/home/<playerId>/`, a *non-spatial* Zone — plus the **document-store self-home
ownership base case** (`DocumentLogic`: "an owner always owns their own
`/home/<self>/`"). **What did NOT ship:** the *lived, customizable* dorm — gating
"waits on the permission framework"; `kind:'dorm'` customization is "(future)".
So the dorm's *foundations* predate this; the dorm-as-home is still deferred.

**The dorm is the proto-parcel, and it independently anticipated four decisions:**
§A (per-player runtime zone = `HomeZone`), §B (ownership by **identity** in the
document/access layer, *not* on the `domain` template), §D (`/home/` = unreleased,
so dorm content is already inert in canon), §E/§I (customization = base-template +
per-player customization-doc). Independent convergence — a good sign.

**Two decisions the dorm forces:**

1. **The self-home case is the *implicit default parcel*** (the `office_holders`
   sparse-default precedent): every player owns `/home/<self>/` **by identity, with
   no `parcels` row**; the registry only stores *explicit / transferred /
   real-estate* parcels. 0a generalizes the self-home base case into exactly this.
2. **Room persistence = the document-store customization-doc, NOT the legacy
   Avatar-snapshot** (corrects §I). The dorm was always designed as base-template
   (seed) + `kind:'dorm'` customization-doc (persisted delta) in the **document
   store** — the *intended future* store (`Avatar = legacy per-player-template,
   migrate later`). So **owned-room** persistence adopts the dorm's doc model;
   **carried inventory / chest contents** keep the holder-snapshot (Avatar
   mechanism, legacy, migrate later). Two flavors, dorm points at the better one.

**Thread 1 — ownership on a Warren.** Warren rooms **share one templatePath**
(elastic clones, not singletons), so §I's extent-derivation can't tell one
resident's room from another's. Root cause: the Warren mechanism (elastic,
interchangeable, *ephemeral*) was the **lounge's** choice — a mismatch for a dorm
(persistent, personal). Two resolutions:

- **(A, recommended) Dorms aren't Warrens.** Each resident's room is a
  **per-resident stable extent** under `/home/<resident>/dorm/`, **lazily
  instantiated + dormant-when-empty.** The property model's own **dormancy +
  lazy-first-use** already delivers the Warren's *only* real benefit (only occupied
  rooms cost anything) *without* bud/reap/merge and *without* the shared-templatePath
  ownership problem. Given parcels + dormancy exist, revisit whether dorms need the
  Warren at all.
- **(B) If Warren-dorms stay:** ownership keys on the durable **assignment**
  (resident ↔ room-slot) + the customization-doc, **not** the room instance; the
  instance is a **lazy materialization stamped from the assignment**.

Either way, the principle — **ownership lives on the title/claim in the registry,
never on the instance** — *confirms* §B (the Warren just makes instance ≠ title
visible).

**Thread 2 — rent vs. own** = the custody/title axis, generalized to real property:

| Relationship | Is | Analog of |
|---|---|---|
| **Own** | hold the **title** (registry owner) — customize / transfer / subdivide / collect rent | title |
| **Rent / lease** | a **time-bounded use-right** (occupy + customize + persist your stuff) **without** the title | *custody without title* — the legit, paid sibling of chattel **lending** |
| **Visit** | presence only | — |

The **dorm is a lease**: the university/commons **owns the building**; each
resident **holds a room-lease** (customizes, keeps their stuff *during the lease*,
**reverts on leave/graduation**). Renting threads through: **§J** (shop premises
leased); the **compute allowance** (landlord holds the allowance + liability, tenant
pays rent — *flat-absorb-and-cap* vs. *metered sub-allowance*, which **is** the
sublet-rollup fork made concrete); **sublet** = a use-grant *of* a use-grant.
**Phasing split:** the **lease *relationship*** (use-grant + expiry + revert) is
needed **early, for the dorm** (0b-adjacent, and a dorm may be tuition-covered so it
needs *no* payment); the **rent *economics*** (payment, metered sub-allowance,
sublease markets) stay **Phase 3**.

**The unifying upgrade — the registry becomes a *claims-and-grants* layer.** Thread
1 forces "ownership is on the claim, not the instance"; thread 2 forces "there are
*use-grants* distinct from *titles*." So §B's `parcels` shape grows one notch:

```
parcels: {
  parcelId, extents[], parentParcel,
  owner,                                              // the TITLE
  grants: [ { holder, kind:'lease'|'sublease', expires, terms } ],  // USE-RIGHTS, not title
  accessGrants, allowance
}
```

`ownerOf` resolves the title; a new `useRightOf(parcel, actor)` resolves grants (am
I a tenant here?). **Custody/title (chattel) and title/use-grant (parcels) are the
same axis** on the two registries.

**Phasing impact:** 0a generalizes the self-home base case into the **implicit
default parcel** + adopts the **claims-and-grants** registry shape; **0a directly
unblocks the dorm's long-deferred gating**; the **minimal lease relationship** rides
0a/0b; the **`dorm-warren` slate becomes a named consumer-slice** of property (its
first proof case, per `StoredDocument`'s "dorm = first consumer"); and we should
**revisit Warren-for-dorms** in favor of per-resident dormant parcels.

---

## Phase re-slice & readiness (session close, 2026-07-02)

The addendum settled the design; the discipline now is to **slice thin and build**,
not explore further. "Phase 0 — possession core" grew into two builds; re-sliced:

| Slice | Contains | Readiness |
|---|---|---|
| **0a — Real-property title** | the `parcels` **claims-and-grants** registry + the `AccessApi.can` refactor (move `ownerGroup`/`accessGroups` out of `domain`) + the parcel **hierarchy** + author≠owner (two collections) + the **implicit-default-parcel** (self-home) generalization + the `subdivide`/parcel-transfer verbs | **SHIPPED (MR!125)** → [parcel.md](../../subsystems/parcel.md) |
| **0b — Chattel & persistence** | `PersistableHolder` (holder-snapshot for chests + **document-doc** for owned rooms) + the **serialization boundary contract** + seed-then-persist + possession field/index + title-aware containment verbs (`claim`/`give`/`sell`) + the **minimal lease relationship** (use-grant + revert) | **SHIPPED** — the persistence half (MR!129, [persistence.md](../../subsystems/persistence.md)) + the **chattel possession half** (MR!143, [chattel.md](../../subsystems/chattel.md): the owner-stamp registry + `ownerOf = stamp ?? authorOf` + `transfer`, proven by the general store). Remaining: the general `give`/`sell` player surface + the lease-on-chattel relationship (thin adds over the shipped `transfer` primitive) |
| **1 — Compute economy** | predicted heartbeat-budget + runtime degradation ordering (the two-scarcity headline) | **needs a design pass** — we did *attribution* (cost-owner), never *metering/degradation* |
| **later consumers** | sandbox/wardrobe (design done), governance allocation, tenancy **economics** (rent/sublease markets), coord-region parcels | deferred — downstream of 0a+0b+the release gate |

**Why 0a first:** it's a prerequisite for 0b (chattel's extent-derivation and
owned-room persistence both need titled parcels), it's the lowest-risk slice (no
persistence generalization), it establishes the primitive the whole build-order
list points up to, and it **lights up the half-built dorm** as its first proof case.

**The one risk to scope first in 0a requirements — the `AccessApi.can` blast
radius.** Moving `ownerGroup`/`accessGroups` out of `domain` touches *shipped*
access substrate. Requirements should open by enumerating **what reads
`zone.data.ownerGroup` today** (`resolveSourceFolderZone`, the shell write verbs,
`CmsLogic`, `AccessRegistry.seedLoungeSlice`, …) and confirm the repoint +
lounge-stamp migration is non-breaking.

**Firm (decided, in §A–§K):** parcel = a Zone · sparse parcel hierarchy · ownership
in a separate claims-and-grants registry · author≠owner via two collections · cost-
owner = spawn-provenance · anti-cheat = the released gate (author-vs-play) · home
personalization = capability tiers · chattel = a field + rebuildable index (no
`PossessableMixin`) · `PersistableHolder` the one new capability · one serialization
boundary contract · three layered mechanisms (populates/persistence/ownership) ·
verbs split on custody/title · shops = three-layer composition · dorm = the
implicit-default-parcel + document-doc persistence · rent = a use-grant · the
capability-vs-relation mixin guardrail.

**Still open — non-blocking (deferred):** sublet rollup (producer-house policy) ·
trust-domain topology (lean lattice) · "power" definition for the release gate ·
theft∥lending recovery/adjudication · combination exploits (governance backstop) ·
publish-from-sold-sandbox credit routing · zone-proliferation perf · coord-region
parcels · Warren-for-dorms revisit.

**Still open — blocking for their own slice:** 0b → the serialization
boundary-contract list + the seed-then-persist gate; Phase 1 → the entire
budget/degradation design.

**Next action: `/requirements` on Phase 0a.**

---

## §L. The real-estate metagame (forward-compatibility check)

A lore-session sketch of the long-term vision: players start **renting** (their dorm
room), then climb a **prestige ladder** of owned property — apartment → townhome →
single-family home → unique **manor houses** once held by the gameworld's nobility —
sited across the game's **geography** (city, suburbs, districts). The **sandbox/holodeck**
sits *adjacent* to the home (100%-authored, unpublished, meant-to-be-published), while the
home itself is the *constrained, canonical* space — and **how those constraints are
modelled is (part of) what confers prestige**. Way out of scope; captured here to record
that the substrate **accommodates it** and to name the seams to preserve.

**The mapping — it's the intended consumer, not a stretch:**

| Vision | Carried by |
|---|---|
| Rent → own progression | the custody/title axis (§K): dorm = a **lease** (`grant`); moving up = acquiring a **title** on a better parcel — same claims-and-grants registry |
| Property *types* (apt/townhome/SFH/manor) | content + a `prestige`/`class` attribute; not substrate |
| Geography (city/suburbs/districts) | the shipped **address/Locality** substrate + spatial zones; a parcel's location = its address/zone position (`parentParcel` for district→lot) |
| **Prestige = allowance** | the slate's founding thesis — "value isn't the dirt, it's how much **liveness** it's permitted"; a manor = a bigger governance-allocated compute allowance |
| Unique named manors + "once owned by nobility" | `NamedMixin` + lore + **chain-of-title** (the ownership lineage *is* the prestige) |
| Sandbox adjacent, unpublished, publish-intended | §G/§H — the **wardrobe** portal in the home mints the magic-circle zone; the publish path to canon |

**Seams to preserve (so we don't foreclose it):**

1. **Chain-of-title — `transfer` leaves a trail, never a destructive overwrite.** The
   "once owned by nobility" prestige *is* the lineage. So the parcels registry is
   **log-backed** (the `bank_ledger→bank_accounts` / `renown_events→renown` pattern): an
   append-only `parcel_events` trail + a rebuildable current-owner. **This is the one seam
   that touches 0a** — cheap now, needs a migration to retrofit — so it's in the 0a plan
   (write the trail; rebuild + lineage readout deferred).
2. **The membrane — prestige buys *resources*, never *security relaxation*.** Prestige =
   more allowance, better location, more slots, safety, lineage — all *within* the rules.
   It must **never** mean a fancier home relaxes the release gate / lets home-forged power
   work in canon (that's pay-to-cheat, breaking the cooperative's no-pay-to-win membrane).
   Canonical-authoring freedom is equal for everyone and lives in the **sandbox** (free for
   all); the home's anti-cheat constraints are non-purchasable security invariants. So
   "constraints confer prestige" = the **resource envelope + location + safety**, not a
   weaker gate. Hold this line.
3. **"Safer neighborhoods" = a per-zone *policy* attribute** (no theft/combat/griefing in a
   district) riding `Zone.lookupField` inheritance (district sets it, lots inherit) — a
   future consumer of the rules/access layer, natively carried, not yet built.

**Already-scoped deferral this motivates:** dense residential subdivision (a suburb of many
single-family lots without grid-fragmentation) is exactly the **coordinate-region ("region
parcel")** case §F deferred — an *additive* point-in-region resolver under the path-prefix
one. Accommodated, not precluded; suburbs are its motivating consumer.

**Net:** the vision needs no redesign and doesn't change 0a's scope — only the
chain-of-title seam (now in the plan) and the non-purchasable-security membrane (an
invariant to hold forever).
