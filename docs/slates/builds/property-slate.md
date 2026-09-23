# Property slate (working doc) — possession, real estate, and the two scarcities

> **Status: PARTIAL** — the title substrate, chattel, the use-grant, the
> wardrobe and the first land market (`title` / `PlatBook` / `LotHolder`)
> all ship → [parcel.md](../../subsystems/parcel.md)
> **Left:** the compute economy (Phase 1 — predicted heartbeat budget,
> measured degradation, cost-owner attribution; `allowance` is inert) ·
> dormancy-as-reclamation for insolvency / over-deficit · governance
> allocation (Phase 2 — fiscal cycle, commons subsidy, frontier/center
> curve, over-subscription) · tenancy economics (Phase 3 — rent as a
> recurring charge, sublet, valuation + resale) · the general
> `give`/`sell`/`claim` surface + lease-on-chattel · the release gate for
> unreleased power + home-personalization Tier 2 · coord-region parcels +
> zone-proliferation perf · prestige-as-allowance + the safer-neighbourhood
> policy attribute · credit routing on a furnished sale
> **Size:** a build

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

> ✅ SHIPPED — the titled parcel (`ParcelRecord`), the coverage trie,
> `subdivide` / `transfer` under bilateral consent:
> [parcel.md](../../subsystems/parcel.md).

## Author ≠ owner — brick zero

> ✅ SHIPPED — there is no author rung: authoring confers credit
> (`authoring_events`), title is held or absent
> ([parcel.md § `ownerOf`](../../subsystems/parcel.md)); the tenancy half is `grants[]`.

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

> superseded by the code — eviction shipped as the residency sweep: an
> abandoned `Stuff` evicts itself and reclaims the cold tail
> ([residency.md](../../subsystems/residency.md)); freeze is the reconcile-on-read
> pattern. What remains is the TRIGGER below.

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

> superseded by *§ Phase re-slice & readiness* below — five of these eight
> rows have since shipped.

## Build waves (the four-phase spine)

- **Phase 0 — Possession core.** ✅ SHIPPED — [parcel.md](../../subsystems/parcel.md)
  (0a) + [chattel.md](../../subsystems/chattel.md) (0b).
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

> ✅ SHIPPED · DOCUMENTED — a parcel is a Zone + a title record; the sparse
> overlay + `parentParcel` carve-outs:
> [parcel.md § The sparse hierarchy](../../subsystems/parcel.md).

### B. Ownership + authorship + allowance live in a *separate* collection

> ✅ SHIPPED · DOCUMENTED — the gated `parcels` collection is the governing
> security invariant, `AccessApi.can` reads `ParcelApi.ownerOf`, author≠owner
> via `authoring_events` ⊕ `parcels` ([parcel.md](../../subsystems/parcel.md),
> [access.md § Ownership: the parcel layer](../../subsystems/access.md)).
> ⚠ `ownerOf = title ?? authorOf` did NOT ship — there is no author rung (R2a).

### C. Compute attribution = spawn-provenance ("cost-owner"), not backing class

Closes the body's open "cause vs receiver" fork. You never attribute running
compute by the *class/module*; you attribute by the parcel that **caused the
instance to exist**:

- `costOwnerOf(instance)`: **(1)** if its `templatePath` resolves (longest-prefix)
  to a parcel extent → that parcel (the common case — authoring your own
  template — free, no stamp). **(2)** else a generic/commons template
  (`/platform/thing/Flask`, `/lib/Flask` cloned directly) → a **sparse birth-stamp** = the
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

> ✅ shipped as the holodeck's circle-scope taint + the merge allowlist
> (`Contacts` is the one epistemic entry) —
> [sandbox.md § The scope taint](../../subsystems/sandbox.md).

- **The gamified home is canonical, NOT a sandbox.** Pet care (real `regard`
  substrate), electricity/upkeep (real compute + money economy) are *playing*
  with published mechanisms → real and game-affecting everywhere, dwelling
  included. The **anti-cheat is the released gate**: unreleased authored power
  is **inert in canon** (point-of-effect, via the augment `isActive` seam) — you
  can't wield an unreviewed +5 sword in the real game, but you *can* raise a real
  pet. The rollback magic-circle shrinks to a **testbed** for unreleased builds —
  a granular **sandbox sub-zone** (workshop) nested inside the canonical dwelling
  (the parcel hierarchy from §A carries it).

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

### F. Sub-zone granularity — "parcel = zone" and the second ownership axis

> ✅ SHIPPED — graduated to
> [parcel.md § What is a parcel, and what is not](../../subsystems/parcel.md); the two
> registries are [parcel.md](../../subsystems/parcel.md) + [chattel.md](../../subsystems/chattel.md).

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

> ✅ SHIPPED — `SandboxCrossing` (Thing-tier, chattel-identified,
> `linkedSandboxPath`; the wardrobe is a skin ROW), the public-booth rule,
> guest access over `grants[]`, `isWizard` untouched by the circle:
> [sandbox.md § The door, the aperture, the harness](../../subsystems/sandbox.md).

**Two exits (why "build it in the wardrobe and publish" isn't a cheat):**
1. **Walk out** → material rollback (keep nothing — symmetric, applies to you too).
2. **Publish** → CMS/forums review gate → your *design* enters canon, balanced,
   for everyone.

Neither smuggles power out. The wardrobe cleanly separates *playing with
unreleased toys* (rollback) from *contributing a reviewed primitive* (publish).

**Edges (resolve cleanly):** allowance-gated size (bigger holodeck costs budget;
empty → freeze; rollback reclaims memory on exit) · invite guests = the
shared-holodeck case, symmetric rollback, access-controlled by your parcel · even
wizards prototype here (their unreleased class is still quarantined until
published — the release gate applies regardless of author) · lazy/dormant zone
(`HomeZone` precedent).

### H. Wardrobe ↔ zone lifecycle — decouple *access* (chattel) from *asset* (parcel)

> ✅ SHIPPED — the door re-seats wherever the fixture is (`onMoved`), an
> owned door links its OWNER's circle on first entry (sell-empty works),
> destroy reaps occupants via `closeSession` and orphans the re-bindable
> zone, doors are concurrent: [sandbox.md § The door](../../subsystems/sandbox.md).

**Interactions carried forward:**
- **Authorship vs. ownership on a furnished sale.** Buyer gets the *parcel title*
  (possession); *authoring credit* stays with the seller (`authoring_events` is
  immutable). So if the buyer later **publishes** something the seller built,
  credit-routing (`CreditRouting.resolve`) must rule author vs. owner vs. a
  `CreditShare` split (if the buyer modified it) — the producer-influence seam.
- **Allowance-liability** follows the parcel on a furnished transfer; stays with
  the seller on an empty sale.

### I. Chattel, persistence, and the capability-vs-relation correction (supersedes §F's chattel half)

> ✅ SHIPPED · DOCUMENTED — chattel is a stamp + a rebuildable index, never a
> mixin ([chattel.md](../../subsystems/chattel.md)); the holder is `PersistableMixin`
> over `holder_snapshots` ([persistence.md § The self-persistence spine](../../subsystems/persistence.md));
> `ownerOf = stamp ?? parcel-extent ?? authorOf` and seed-then-persist
> ([furnishing.md](../../subsystems/furnishing.md)); ownership bottoms out at `Creature`
> ([ranching.md](../../subsystems/ranching.md)). ⚠ The boundary contract shipped wider
> than v1 here (worn gear round-trips). The capability-vs-relation mixin
> test is handed off to mixins.md (compaction ledger).

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

> ✅ SHIPPED — `ChattelApi.transfer` + banking `settle` are the primitives,
> verbs are thin controllers, and the SALE is what promotes a stock good to
> titled chattel (`buy` stamps the buyer) — [chattel.md](../../subsystems/chattel.md),
> [retail.md § The buy loop](../../subsystems/retail.md). Unowned litter has no row.
> Still deferred: the general `give`/`sell`/`claim` player surface
> (chattel.md § Deferred).

owners:**

| Layer | Is | Owned by |
|---|---|---|
| **Premises** | the rooms/zone | a **parcel** title-holder (landlord, proprietor, or *leased*) |
| **Business** (brand / account / roster) | a **`Business` Idea** (`/world/lounge/business`) | its **proprietor** (a principal, via the replaceable `proprietorPath`; outlives the proprietor) |
| **Stock** | wares | the **business** (by extent-derivation), until sold |

Dave's Bar collapses these today (one team owns premises + business), but the
model **separates** them — a proprietor can rent premises from a landlord and run
a business that owns its stock. **Compute** follows the same layering: the
premises parcel carries the allowance (landlord funds), the business pays rent,
and its operating compute (bartender NPC, ambient brains) attributes via
cost-owner/residency to the premises parcel. The `Business`-as-its-own-Idea
decision (not a venue mixin) is exactly what makes this three-way split work.

### K. Dorms — the proto-parcel; Warren ownership; and rent vs. own

> ✅ SHIPPED — the implicit default parcel (`selfHomeOwnerOf`), `grants[]` as
> the use-grant/lease with `hasUseGrant` / `heldUnitsOf`, and the
> Granted / Let / Owned ladder: [parcel.md § `grants[]`](../../subsystems/parcel.md),
> [holding.md](../../subsystems/holding.md), [residence.md](../../subsystems/residence.md).
> ⚠ Two leans did NOT ship as written: dorms stayed Warrens, keyed on the
> unit parcel (resolution B, not A); rooms persist through the
> `(scope, key)` spine into `holder_snapshots`, not a document-store
> customization doc. Rent economics remain deferred (holding.md § deferred).

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

1. ✅ **Chain-of-title** — shipped: `parcel_events` is append-only and
   `transfer` never overwrites
   ([parcel.md § Chain of title](../../subsystems/parcel.md)); the lineage readout is
   still deferred.
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
