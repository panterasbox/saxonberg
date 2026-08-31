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

Corollary that collapses the build's geography: **Hinkley's lots are
already zoned `residential`** (`plat-book.yaml`: *"Residential: admits a
garden bed, refuses a field"*), and the lane's `house` detail prose is a
described house waiting to be built. The slate's "frontier smallholding
before apartment→townhome" ordering is therefore moot — the frontier rung
and the SFH suburb rung are the *same shipped content*, half-built. This
build has **two sites**: Hinkley houses and a Terminus apartment building.
No new locality.

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
- **A Terminus apartment building exists and leases units.** An elastic
  building (the `DormWarren` precedent one cardinality up: a Warren whose
  member is a multi-room *unit*, not a single room), owned by a **private
  landlord organization**, leasing fronted by an NPC property manager
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
- **A second residential locality** — the suburb is Hinkley Lane.
- **Cultivation anything** — beds, plants, harvest, the bed-reset
  question behind the red Hinkley e2e are build-3's. This build's
  drives buy *fresh* lots (Governor-funded, the shipped e2e pattern)
  rather than touching the pre-sold lot's bed. (The stale "lot 2"
  comment in `yard.yaml` gets fixed in passing — the manifest pre-sells
  lot-1.)

## Surface decisions

### D1 — The ladder's three rungs are dorm → apartment → Hinkley house

Dorm (granted lease, shipped) → apartment (rented, Terminus) → single-
family home (owned, Hinkley Lane). The slate's frontier-vs-city ordering
question dissolved: Hinkley is zoned residential and half-built, so the
frontier rung *is* the SFH rung. Smallholding-at-scale (fields, herds)
remains the rung above, owned by future farming/ranching cycles.

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
  furniture at the general store → place it → restart → it persists →
  unlease → chattel lands in storage intact and titled → the unit
  re-leases empty and re-keyed.
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
  parts flagged in D8)
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
