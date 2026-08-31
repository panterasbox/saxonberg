# Residences — requirements

**The parity claim, in one line:** a dorm room is a fully-modelled home —
walkable, keyed, persistent, personalizable — and every other rung of the
residence ladder is prose. This build fixes the parity and builds the two
rungs above the dorm: **leased apartments in Terminus** and **owned
single-family homes on Hinkley Lane**, plus the minimum of **stewardship**
(shell condition + one obligation + the ascent gate's read) that makes the
ladder mean something.

Seeded by [stewardship-slate](../slates/builds/stewardship-slate.md) (the
ladder, condition, obligations), [property-slate](../slates/builds/property-slate.md)
§K/§L (rent-vs-own, the real-estate metagame), and the deferred seams of
[residence.md](../subsystems/residence.md) and
[furnishing.md](../subsystems/furnishing.md). It **supersedes**
[apartment-requirements.md](./apartment-requirements.md) (see D8).

**Scope boundary with build-3 (farming):** this build owns the HOLDER —
title becoming a place: PlatBook/LotHolder/DormWarren descendants,
interiors, keys, condition, obligations — and all Hinkley Hills content.
Build-3 owns the ground's PRODUCTION (GrowingMixin / CultivableMixin,
plants, harvest). This build does not touch husbandry.md or the
cultivation half of smallholding.md.

## The stale-blocker correction (verified 2026-08-31)

The stewardship slate's headline blocker — *"dense suburbia is structurally
impossible today; it needs the deferred region parcel"* — was committed
2026-07-30 (`c130fa370`) and went stale two days later: Hinkley Hills
merged 2026-08-02 (`d332620c2`) with `PlatBook` + `LotHolder` +
`LotGateExit` + `lib/parcel/LandUse.ts`, all on master. The region parcel
(property §F tension 2) was for *coordinate-region ownership inside one
grid zone*; Hinkley sidestepped it — lots live in their own zone, each
lot's room is a **minted identity** (`FurnishableRoom` at
`<lotExtent>/<leaf>`, deliberately off-grid), reached by a `LotGateExit`
off the lane. A suburb of N single-family lots is one lane + N gates + N
minted rooms. The region parcel stays deferred for the genuinely
*seamless* open-coordinate case, but suburbia — named in §L as its
motivating consumer — no longer needs it.

Corollary that settles the build's geography: **Hinkley Hills is the
suburbs** — the name is a reference to *The 'Burbs* — and its lots are
already zoned `residential` (`plat-book.yaml`), with the lane's `house`
detail prose a described house waiting to be built. The smallholding
build's "frontier rung" framing leaves Hinkley with this build: farmland
is a **separate locality**, coordinated with build-3 (whether the shipped
yard keeps its garden bed is their call; nothing here depends on it). The
slate's "frontier smallholding before apartment→townhome" ordering is
therefore moot. This build has **two sites**: Hinkley houses and a
Terminus apartment building on a new residential side street off
University Avenue (D9).

## Goals

- **The stewardship slate is corrected.** The blocker section records the
  verification above; the "where to start" ordering is updated to match
  what shipped. The smallholding doc's "the house is prose because the
  residence build is furnishing real interiors in parallel" note is
  closed out by this build (the holder half of that doc; the cultivation
  half is untouched).
- **A Hinkley lot's house is real.** Behind the oiled gate: a multi-room
  interior (drawing on the shipped archetype rows — bedroom, kitchen,
  living — plus the yard the lot already has), each room a minted
  identity under the lot's extent, provisioned by the lot's holder,
  persisted keyed on the parcel extent so title and durable state share
  one identity. The four furnishing archetypes stop being content nothing
  instantiates.
- **The house has a locked front door and the buyer gets the key.**
  `title buy` mints a keyway on the lot and issues the buyer a key
  (physical + implant keychain), the dorm-lease pattern applied at the
  sale chokepoint. The *yard gate stays ungated* (smallholding's
  deliberate call — the fence is fiction, the house is locked); the
  house door checks key presentation exactly as `DormDoor` does.
- **A Terminus apartment building exists and leases units**, fronting
  its own **residential side street** one block off University Avenue
  (D9). An elastic building (the `DormWarren` precedent one cardinality
  up: a Warren whose member is a multi-room *unit*, not a single room),
  owned by a **private landlord organization**, leasing fronted by an NPC property manager
  (the Katie / owner-conferred-agency pattern; never a raw player verb,
  never a wizard stand-in). A unit is a floorplan of rooms behind one
  key-gated front door; the lease is the dorm's use-grant reused.
- **An apartment is empty at move-in and furnished with owned goods.**
  Move-in materializes built-in fixtures only; the tenant places chattel
  they bought or crafted; placements persist across dormancy and restart
  via the shipped owner-based persistence (`place`, the estate slice, the
  room overlay). Lease end evicts owned chattel to storage
  (`evictToStorage` — intact, titled, never destructed) and reverts the
  shell.
- **Every rung grows on demand.** No authored rosters of empty stock:
  lots and units mint when a resident needs them; capacity is a runtime
  operator dial with a shipped default (D10). The plat book's authored
  40-lot roster retires.
- **The three rungs run on one substrate.** The four-role model
  (catalogue / front / provisioner / circulation) holds at every rung;
  the two-tier holdings+circulation machinery is lifted from
  `DormWarren` into a shared base all three institutions consume, the
  dorm converging onto it with behavior pinned by its suite (D12).
  Layout is a **plat plan** — authored data mapping slot → circulation
  node — shipping static, linear, and branched shapes (D13), so roads
  grow (and branch) the way floors already stack.
- **A realty office opens in Terminus.** One office + realtor NPC
  fronting every plat book in the world (D14) — land purchase gets a
  diegetic front the way the dorm has Katie; rentals go through the
  landlord's own manager instead.
- **Home-making is structured and legible.** Archetype satisfaction
  (D15) derives on read over a room or holding from capability-shaped
  needs, and a dedicated legible read reports it; the dorm bedsit reads
  as all four archetypes, a bare room reads as none, and nothing is
  ever enforced.
- **Every holding is a floorplan.** At every rung the holding
  materializes as an authored room-graph minted under its extent, and
  title / provisioning / persistence / dormancy align on that extent
  (D16) — the parity claim across all residential parcels.
- **Owned goods can be mounted, not just set down.** Wall/finer
  placement lands as a small verb over the shipped `Adornable` fixture
  surface (D11) — hang a lamp, take it back down; a mounted good
  persists like any placed good and stays titled to its owner.
- **Furniture is purchasable.** The Terminus general store gains a
  furniture line (bed, table, chairs, wardrobe/chest, lamp — the
  ladder-visible bed at `restQuality` above the dorm's 1.5) on the
  shipped retail substrate. Crafting remains the quality path above the
  store's stock.
- **A dwelling's shell has condition, and neglect costs.** Shell
  condition is derive-on-read state on the dwelling (reconcile-on-read,
  the husbandry/thermal clock pattern): it **weathers on a slow clock**
  — an environmental process, scoped to structures; economy Law 2
  (goods wear with use, not the clock) is untouched for goods, and
  interior fixtures keep their shipped use-wear. A maintenance act
  restores it. Condition is **visible** (banded prose per the no-gauge
  reading rules), never hidden.
- **Upkeep responsibility is a term of tenure.** Who owes the shell's
  upkeep is declared by the property model, not hardcoded per rung:
  the dorm's institution owes everything (the shipped status quo); an
  apartment's **landlord owes the shell** and the tenant owes walls-in;
  a Hinkley owner owes it all. The term rides the lease/title layer so
  future models (an HOA you pay for shell upkeep on an owned home) are
  expressible without new mechanism.
- **The ascent gate reads condition.** Acquiring the next rung (leasing
  a unit while holding a dorm; `title buy` while holding a lease) reads
  the condition of what the actor already holds and refuses below an
  authored default threshold — money necessary, condition binding.
  Thresholds are shipped defaults, not kernel dials.
- **Docs land.** residence.md grows the ladder (or a sibling subsystem
  doc for stewardship/condition — planner's call); furnishing.md's
  "archetypes need a provisioner" warning is closed; the map entries
  stay one-line.

## Non-goals

- **Rent as a charge.** The lease *relationship* ships; payment
  schedules, arrears, eviction-for-nonpayment defer to the economy layer
  (property §K "rent economics stay Phase 3"). The landlord-owes-shell
  term is what rent will later pay for; the term ships, the invoice
  doesn't.
- **Utilities and tax** — [power-utility-slate](../slates/builds/power-utility-slate.md)'s
  premises obligations; unbuilt dependencies.
- **The allowance meter and cascade** — property Phase 1; stays inert.
- **Zoning as an act of governance** — land use stays a fact on parcel
  rows written at subdivide; the rezoning verb and the apportionment
  politics stay in the stewardship slate.
- **Townhome / manor rungs** — "content + a prestige attribute, not
  substrate" (property §L); nothing above SFH has a consumer yet.
- **Resale.** A Hinkley sale is permanent (the plat book says so);
  a secondary land market is the property slate's, not this build's.
- **Roommate / co-lease** — one leaseholder per unit (apartment reqs'
  deferral stands; the dorm-warren slate's roommate half likewise).
- **Custom prose personalization** on rooms or owned goods — the
  residence.md deferred seam stays deferred; apartment personalization
  v1 is *placement*, exactly as the superseded doc ruled (D5 there).
- **Manual `lock`/`unlock` verbs** — doors stay auto-locked,
  key-presence gated (the shipped dorm model); leaving your door open
  for a friend is still the follow-on.
- **An HOA as shipped content** — the tenure term makes it expressible;
  no HOA organization or venue ships.
- **The general-store split / commercial units** — breaking the store
  into smaller businesses is a future commercial build riding this
  substrate unchanged (a shop unit is the same holding machinery under
  a `commercial` land use; a trade bundle is its archetype). This
  build's obligation is the genericity constraint below, no shop
  content.
- **Remodel / floorplan expansion** — adding rooms to a holding is
  editing its floorplan (D16), a development-slate seam.
- **Valuation** — the assessed read (archetypes + condition priced for
  a market) waits for the Landwrights/resale build; only the
  satisfaction predicate and its legible read ship (D15).
- **A second residential locality** — the suburb is Hinkley Lane; the
  apartment street is a district *within* Terminus.
- **The farmland locality** — frontier smallholding and farm tenure
  move out of Hinkley to their own locality; build-3's coordination,
  not this build's content.
- **Cultivation anything** — beds, plants, harvest, the bed-reset
  question behind the red Hinkley e2e are build-3's (including whether
  the shipped yard keeps its bed at all, now that Hinkley is squarely
  the suburbs). This build's drives buy *fresh* lots (Governor-funded,
  the shipped e2e pattern) rather than touching the pre-sold lot's bed. (The stale "lot 2"
  comment in `yard.yaml` gets fixed in passing — the manifest pre-sells
  lot-1.)

## Surface decisions

### D1 — The ladder's three rungs are dorm → apartment → Hinkley house

Dorm (granted lease, shipped) → apartment (rented, Terminus) →
single-family home (owned, Hinkley Lane — the suburbs, *The 'Burbs* by
name). The slate's frontier-vs-city ordering question dissolved: the
suburb rung is half-built and this build finishes it. Frontier
smallholding and farm-scale tenure move to a **separate farmland
locality** owned by the farming cycles (build-3 coordination); they are
not Hinkley and not this build.

### D2 — The house is minted rooms behind a locked door

The `LotHolder` provisioning flow grows from one room (the yard) to a
small graph of minted `FurnishableRoom` identities under the lot extent
(house rooms + yard), instantiating the shipped archetype rows as
`populates:` sources. The house's front door is the lock; the yard gate
stays open. `LotHolder.provision` is already the `@hook` designed for
this swap — the "minted template per residence" successor the
smallholding doc predicted, arriving as designed rather than by
replacement.

### D3 — The apartment building is a Warren of units, landlord-owned

A private landlord organization holds the building parcel (groups +
title claims in the pack manifest, the duncan-hall shape); an NPC
property manager fronts `lease`/`unlease` as the owner's conferred agent
(authored group membership, never self-enrolled). The building is
elastic: units provision on demand, empty units go dormant, the durable
slot set reconstitutes the shape. A unit = several rooms + one key-gated
front door; intra-unit connectivity is the planner's problem, with the
Hinkley lesson in hand (minted rooms are off-grid; gates/doors carry
non-cardinal edges).

### D4 — Condition is shell-weathering, reconciled on read

The question was what drives condition when economy Law 2 says goods
wear with use, not the clock. The answer: **Law 2 governs goods; a
dwelling shell weathers** — an environmental process (rain, sun, entropy
on a structure), modelled like every other clock in the family:
derive-on-read with a stored stamp, no scheduler, no far-future writes.
Fixtures inside keep use-wear untouched. The alternative (condition =
aggregate fixture wear) was rejected because an empty locked house would
never degrade — neglect would cost nothing, which guts the slate's
claim. Slope, not cliff; visible, banded prose, no gauge.

### D5 — The obligation is shell upkeep, and WHO owes it is a tenure term

One obligation ships: keep the shell maintained (a maintenance act
restores condition; materials/cost calibration is the planner's).
The load-bearing part is the **responsibility term** on the lease/title:
`institution-all` (dorm), `landlord-shell / tenant-walls-in`
(apartment), `owner-all` (Hinkley). This is the seam the user named
directly — different property models (landlord, HOA, freehold) are
different values of one term, not different mechanisms. A landlord's
shell upkeep is performed by the owning organization's agency (the NPC
staff), which is also the seam rent will later fund.

### D6 — The ascent gate is a read at the acquisition chokepoints

`title buy` and the apartment lease grant each read the actor's current
holding's condition and refuse below a threshold shipped as an authored
default (per the dont-escalate-dials rule: a default, amendable by
content, not kernel). Holding nothing passes — the gate compares you to
your record, not to a means test. The dorm rung has no gate (the
tutorial rung, per the slate).

### D7 — Furniture retail at the general store; keys at the chokepoints

The shipped Terminus general store stocks a furniture line (retail
`Stock` counter, chattel-stamped at `buy`). Crafted furniture grades
above it. Keys: the lease grant and `title buy` each mint a keyway on
the unit/lot parcel and issue the holder a key — `Lock.mintKeyway` →
`ParcelApi.setKeyway` → `CredentialApi.issueKey`, the dorm provision
sequence relocated to the two chokepoints. Move-out/resale-less
unprovision re-keys exactly as the dorm does.

### D8 — apartment-requirements.md is superseded and retires at sweep

Its engine half (chattel-title, owner-based persistence) shipped in the
chattel + furnishing builds; its content half (the building Warren,
floorplans, door, revert) is absorbed here, updated by what furnishing
actually shipped (`FurnishableRoom`, the estate slice, the skip rule).
Its D1–D7 decisions carry forward except where noted (D5 personalization
stays deferred; D3's floorplan-zone shape is re-decided by the planner
against the Hinkley minted-identity lesson). The dorm-warren slate's
customization scheme (field-bundle themes, tier filters, document-tree
diffs) was superseded by the shipped theme overlay + owned-goods model;
its retirement is a sweep decision, flagged here.

### D9 — The apartment building fronts its own residential side street

A new small district one block off University Avenue
(`/world/terminus/<street>/` — the street's name is content), completing
a legible density gradient the town already implies: commercial core
(Counting-House Row) → apartments a block off the avenue → dorms by the
university → suburbs at the edge (Hinkley) → farmland beyond (a
separate locality, build-3's). The side street gives the leased rung a
neighborhood, room for a second building when the first fills, and real
addresses (`terminus/<street>/<building>` + unit). Over-the-shop flats
above the avenue remain a clean later stock on the same substrate
(`storeys` already accommodates them); they were considered and set
aside, not rejected.

### D10 — Elasticity: singleton institution, on-demand stock, runtime caps

**Singleton for the institution, elastic for the inventory; capacity is
a runtime dial, never an authored roster.** The institution — plat book,
lot holder, front desk, lobby, the lane — is authored singleton content.
The stock — lots, units, floors — is minted on demand, keyed by parcel
extent, dormant when empty. Concretely: the **plat book goes
generative** (`lot-<n>` minted at sale; the authored 40-entry `lots:`
roster retires — the "surveyed for a hundred families" survey becomes
prose, where it always belonged); **`ROOMS_PER_FLOOR` graduates** from
`static readonly` to the operator's dial (its own deferred-seam note
already points here); the **apartment building is born elastic** on the
dorm's pattern. The cap is two-layered and only the lower layer ships:
the **operator's capacity** — the owner's runtime-adjustable limit,
read at provision, shipped with a default — sits under a future
**zoning density ceiling** on the parcel (the stewardship slate's
"density is the quantitative half of land use", deferred with
zoning-as-governance). Whether the lane physically extends as lots sell
is the planner's question; the shape is lane-authored, lots-minted.

### D11 — Furnishing is the domestic face of the economy

Neither the Sims nor Animal Crossing. **Function is real** and comes
from mixin composition + physics, never advertised stats: a bed confers
`lie` and a `restQuality` metabolism actually integrates, a range is
real heat, a lamp is real lux. There is no buy-mode/decorate-mode UI —
placing furniture is embodied verbs, encumbrance-honest (you carry the
bed home or hire haulage). **Attachment comes from provenance**, not
catalog sets — maker's mark, grade, chain of custody; a graded
masterwork by a named crafter *is* the collectible (matched sets, if
ever, are brand/material coherence — the cosmetics/textiles chain, not
this build). **The market is the actual economy**: the store line is
the floor, crafted goods grade above it.

**Placement grammar:** containment + surfaces (`put lamp on table`,
shipped) **plus wall placement** — a player can mount an owned,
adornment-capable good on a room's `Adornable` surface (the shipped
fixture substrate every Location already composes; wall sconces are its
own doc example) via a new verb (`hang`/`mount`; category the
planner's call), and take it back down; a mounted good persists like
any placed good and stays titled to its owner. No grid, no rotation.
Room capacity is **read, never enforced** — `spaceOf` may make a
crowded room read crowded; a hard furniture cap is the
administered-multiplier sin (the land-draw rule applied indoors).

### D12 — The four-role uniform model; one institution, two tiers

Every rung is the same machine wearing different clothes, and the doc
demands the uniformity as structure:

| role | dorm | apartment | Hinkley SFH |
|---|---|---|---|
| **catalogue** | implicit (always a room) | the vacancy list | `PlatBook` |
| **front** | Katie | the property manager | the realtor (D14) |
| **provisioner** | `DormWarren.admit` | the unit provisioner | `LotHolder` |
| **circulation** | corridors + stairs | corridors + lobby | road segments |

Tenure (lease vs sale) changes only whose agent the front is and which
chokepoint fires (`grantUse` vs `subdivide`+`transfer`); nothing else.

**One institution, two tiers — never two warrens.** A road segment is a
corridor lying down: circulation is cloned on demand to reach the
stock, reaped outside-in under the shipped contiguity invariant (a
corridor never reaps under a live room; the road stays connected back
to the authored entrance), and its whole lifecycle is *derived from*
the holdings it serves — a separate roads-warren would carry a policy
that only mirrors the holdings anyway. **The planner lifts
`DormWarren`'s two-tier machinery (holdings + circulation + the reap
invariant) into a shared base consumed by all three institutions; the
dorm converges onto it**, with its observable behavior pinned by its
existing suite.

### D13 — The plat plan: layout is authored data, and branching ships

The "intelligence about how a map grows" is a **plat plan** — authored
data on the institution, never code — mapping slot → circulation node
(the extent already encodes the slot: `f<floor>-r<pos>`, built for the
dorm). Three plan shapes ship:

- **static** — authored circulation, minted holdings (today's Hinkley
  stays valid as the degenerate plan; a bespoke hand-made neighborhood
  keeps its streets and only mints homes);
- **linear** — nodes extend on demand (the dorm's floor math; a road
  is the same math rotated — node = road segment, N frontages per
  segment);
- **branched** — node = (road, segment): multiple roads, courts,
  culs-de-sac, so a real neighborhood shape is expressible in v1.

The operator cap (D10) is the plan's *how much*; the plan is the
*how*. Unsold reaches of a planned road read honestly as unbuilt ("the
road peters out into stakes and grass") until their frontage sells —
the dorm's impassable-empty-floor rule, horizontal.

### D14 — The realtor: one Terminus realty office fronts every plat book

**A realtor is the human face of a plat book** (the catalogue the
smallholding doc already says "grows outward — terms, demand pricing,
auctions, as land becomes a market"). One realty office in Terminus,
with a realtor NPC, fronts **all** books — `title` already enumerates
`world:[class.PlatBook]` and knows no locality, so a second subdivision
anywhere simply appears in the window. This seeds the Landwrights
(guild-slate: survey, valuation, conveyancing). The doctrine holds
(NPCs do their jobs; no cold-OS surface): the realtor's dialogue *is*
the menu, and the actual `title buy` fires **as the buyer** — their
money moves through settle; unlike Katie's `provision`, the agent
cannot act for them. Raw verbs stay the operator surface. **Rentals
bypass the realtor** and go through the landlord's own manager —
through a realtor unless you're renting. Named seams, not scope: a
*previous owner* is a future listing in a book grown into a market
(resale — when it lands, "a sale is permanent" stops being true); a
*developer* is a player selling a subdivision's book over land they
hold (the development slate's vocation).

### D15 — An archetype is a satisfiable checklist, never a room class

The castle-freedom vs structure tension resolves the way libations'
venue checklist already did (`coldStorage` satisfied by any space or
object holding the capability, *"reported, never enforced"*):

- **A need is a capability predicate** — heat to cook on, a work
  surface, cold storage, running water, a rest surface, a wash place —
  satisfied by *whatever carries the capability*, never `instanceof`.
- **An archetype is a named bundle of needs** (kitchen, bedroom,
  bathroom, living, workshop…) — authored data with an **open
  vocabulary** (packs can add; archetypes invent recognition, not
  mechanics, so closure buys nothing).
- **Satisfaction derives on read over a *space*** — a room or the whole
  holding — and is never enforced. Forced by shipped content: the dorm
  room is *"the four archetypes collapsed into one room; archetypes
  compose rather than partition"* (furnishing.md). A studio's kitchen
  corner is a kitchen.
- **Payoffs are the mechanics the satisfied needs unlock at home**
  (cook → meal chemistry; a good bed → sleep-as-logout quality;
  living → hosting) — the needs are capability predicates, so the
  mechanics consume the objects directly; the archetype read adds
  **legibility**, never a multiplier or a happiness stat.
- **There is no Kitchen class at any tier.** Template inheritance does
  not exist; every kitchen everywhere is a `FurnishableRoom` row.
  Tiers differ on two data axes only: **floorplan** (which rooms a
  holding has and how they collapse) and **grade** (fixture quality,
  the shipped crafting axis). The shipped archetype rows are exemplar
  bundles a floorplan cites, not classes anything narrows on.
- **The read ships and is its own surface**: a dedicated, legible
  player-facing read of a holding's satisfied archetypes (its own verb
  or a subcommand on an existing one — the planner picks whatever is
  most legible; not necessarily `look`). The realtor/Landwrights
  *valuation* — an assessed read feeding a future resale market — is a
  named seam on top of this predicate, not this build.

Outside the vocabulary: everything. A room satisfying no archetype is
just a room full of your stuff; freedom is the default, recognition is
laid over it.

### D16 — The warren bottoms out at the holding; a holding is a floorplan

No warren-of-warrens. A warren earns its machinery through **dynamic
membership**; a holding's interior has none — its rooms are a fixed set
that materializes and sleeps together. So the warren's member is the
**holding** (unit, lot), and the holding materializes as its
**floorplan**: a small authored graph of rooms minted under the
holding's extent (`<extent>/<leaf>`, the shipped Hinkley channel — the
yard is an outdoor leaf of the lot's floorplan). **The four lifecycles
align on the extent**: title, provisioning, persistence keying, and
dormancy all operate on the holding as one thing — an apartment goes
dormant as a unit, never room-by-room. The symmetry with D13 is the
abstraction: **the plat plan is to the institution what the floorplan
is to the holding** — authored data a provisioner consumes to mint a
graph — with different lifecycles (stock grows member-at-a-time; a
floorplan stands up whole). Remodel/expansion — adding a room to your
house — is *editing the floorplan*, a named seam (development-slate
territory), not warren mechanics and not this build.

## Constraints

- **No residence subsystem, no per-feature Api.** Apartments and houses
  are content over general substrates, exactly like the dorm. Condition/
  obligation machinery goes wherever the planner homes it (a mixin +
  existing facades) — a new Api is an explicit ask first.
- **Title and access data live in `parcels`, never on zone templates**
  (the parcel.md governing invariant); keyways ride the parcel row as
  shipped.
- **Authority is owner-conferred, never self-claimed** — the landlord
  NPC's agency is authored group membership in the pack manifest;
  `requiresWizard` remains TypeScript-only and is never a stand-in for
  the landlord path.
- **The lease is authority; the key is access** (bearer possession) —
  hold the dorm's split at both new rungs.
- **No migrations.** Seed/pack edits + drop the DB. No compat shims, no
  adopt paths.
- **Conserved money.** Furniture purchases ride the settle chokepoint;
  nothing mints. Drives that need funds use the Governor's conserved
  faucet, per the shipped e2e pattern.
- **Economy Law 2 stays scoped to goods** — no clock-wear lands on any
  `DurableMixin` good; weathering is structure-only (D4).
- **Nothing instances `/lib/`**; minted identities follow the Hinkley
  channel (`asTemplatePath`); pack contributions ride manifests
  (`requires.groups` / `requires.title` / `boot`) with **no kernel list
  edits** (the capability-packs rule).
- **Content verbs are afforded by content** (the NPC / fixture carries
  the affordance), and every verb passes the affordance chain —
  contributed, in scope, parseable, conferred by something present. The
  furnishing build's lesson is a checklist item here, twice paid for.
- **Nothing keys on `residential`.** The holding/warren/floorplan/
  tenure machinery is land-use-agnostic; gates read `landUse` where
  they must, and the future commercial build (shop units, the store
  split) must ride this substrate with zero rework.
- **No happiness stat, no archetype multiplier.** Archetype
  satisfaction is recognition over capabilities the mechanics already
  consume; it never feeds a bonus, a score, or an enforcement gate
  (D15).
- **Verify by driving.** A green controller test is not a reachable
  feature; each rung's loop gets a live drive before "done".

## Acceptance criteria

- **The Hinkley loop drives end-to-end:** fund (Governor) → `title buy`
  a fresh lot → key in hand → walk the gate → enter the locked house
  (a stranger is refused at the door, not the gate) → rooms are
  furnished from archetypes → place a bought good → restart → the house,
  its fixtures, and the placed good persist keyed on the lot.
- **The apartment loop drives end-to-end:** talk to the property manager
  → lease → key → walk in to an empty unit (built-ins only) → buy
  furniture at the general store → place it (one good on a surface, one
  mounted on the wall) → restart → all of it persists → unlease →
  chattel lands in storage intact and titled → the unit re-leases empty
  and re-keyed.
- **Stock is minted, not rostered:** buying a lot beyond the retired
  roster's range works with no authored row; the operator cap refuses
  at its limit and admits after the owner raises the dial at runtime;
  an empty unit goes dormant and reconstitutes from the durable slot
  set.
- **The substrate is shared and the dorm didn't move:** the two-tier
  base is consumed by all three institutions; the dorm's existing suite
  passes unchanged after its convergence. At least one **branched**
  plat plan is exercised (a road that grows a branch as its frontage
  fills), and a static-plan institution (authored streets, minted
  homes) still provisions correctly.
- **The realtor loop drives:** at the realty office, the realtor's
  dialogue lists what's for sale across books, walks the buyer to the
  confirm, and the purchase fires as the buyer through settle; the raw
  `title` verb still works as the operator surface.
- **Archetype recognition works:** the legible read reports the dorm
  bedsit as satisfying all four archetypes and a bare room as none;
  furnishing a studio corner with a heat source, work surface, and
  cold storage makes it read as a kitchen — whatever objects satisfied
  the needs; nothing anywhere enforces an archetype (tested: an
  unrecognized room provisions, persists, and functions identically).
- **Condition works:** a neglected shell's condition declines on read
  over elapsed game time (slope, with cause legible); maintenance
  restores it; a well-kept dorm/lease passes the ascent gate and a
  dilapidated one is refused with the reason named; interior goods show
  zero clock-wear (tested).
- **Terms resolve:** each rung's upkeep-responsibility term is readable
  where the planner homes it, and the landlord's shell upkeep is
  performed by the owning organization's agency, not the tenant.
- **The stewardship slate carries the correction** and smallholding.md's
  house-prose note is closed (holder half only); residence.md (or a
  sibling) documents the ladder, condition, terms, and the deferred
  seams; apartment-requirements.md is marked superseded (retired at
  sweep).
- **Suite + lints green** (one full run at finalize; `test:near` +
  pack suites per iteration); the affordance chain checked for every
  new verb; both loops driven live.

## Cross-references

- Seeding slates: [stewardship-slate](../slates/builds/stewardship-slate.md) ·
  [property-slate](../slates/builds/property-slate.md) §K/§L ·
  [dorm-warren-slate](../slates/builds/dorm-warren-slate.md) (superseded
  parts flagged in D8) ·
  [guild-slate](../slates/builds/guild-slate.md) (the Landwrights — the
  realty office seeds them, D14) ·
  [development-slate](../slates/builds/development-slate.md) (the
  player-developer vocation the plat-book/plan split accommodates)
- Superseded: [apartment-requirements.md](./apartment-requirements.md)
- Subsystem docs: [residence.md](../subsystems/residence.md) ·
  [furnishing.md](../subsystems/furnishing.md) ·
  [smallholding.md](../subsystems/smallholding.md) (holder half) ·
  [chattel.md](../subsystems/chattel.md) ·
  [parcel.md](../subsystems/parcel.md) ·
  [credential.md](../subsystems/credential.md) ·
  [persistence.md](../subsystems/persistence.md) ·
  [retail.md](../subsystems/retail.md) ·
  [banking.md](../subsystems/banking.md) ·
  [residency.md](../subsystems/residency.md)
- Parallel build: build-3 owns cultivation (husbandry.md + the
  cultivation half of smallholding.md); the seam is the yard's contents,
  which this build does not touch.
