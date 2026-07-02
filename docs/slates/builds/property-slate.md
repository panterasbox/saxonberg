# Property slate (working doc) — possession, real estate, and the two scarcities

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
The lounge is a **`FolderZone` at `/domain/lounge`** (+ `/lib/lounge`) with
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
  its code root — the lounge already owns `/domain/lounge` **and** `/lib/lounge`.
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
