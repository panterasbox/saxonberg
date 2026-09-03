# TPA reform — teleportation becomes magic, and magic gets a wall socket

The Teleport Authority ships as an unexplained utility: terminals hop you
across a directed graph, a fare settles, and nothing says *how*. Meanwhile
[arcane-science.md](../arcane-science.md) has — since the 2026-08-11
locality revision — carried a complete physics of teleportation that
nothing implements, and
[mana-economy-design-pack § 5c](../slates/builds/mana-economy-design-pack.md)
carries an owner's instruction to retrofit the network onto it.

This build closes that gap in both directions. **Teleportation becomes a
real spell with a computed mana cost**, the TPA becomes its first
*consumer* rather than a special case, and the general category the spell
needs — **a device that runs on mana it did not make** — lands in arcana
where a front door and a wall lamp can use it too. The TPA's own code
leaves the kernel for a deliberately thin `/system/tpa` pack; the Authority
itself becomes realm content.

Seeded by
[mana-economy-design-pack](../slates/builds/mana-economy-design-pack.md)
(Part 5c, and the owner note that opens it) ·
[fast-travel-slate](../slates/tails/fast-travel-slate.md) ·
[supply-design-pack](../slates/builds/supply-design-pack.md) (the six-word
failure vocabulary, shipped by the water build).

---

## Goals

- **Teleportation is a cast spell.** A `teleport` spell row exists, obeys
  the shipped cast pipeline (band gate on both grid axes, cast time,
  interruption), and its cost is **computed** rather than authored.
- **The cost is `mgh` and nothing else.** Altitude and mass are real;
  **distance is free**. A traveller can read why on the departures board.
- **A `ManaPowered` device category exists in arcana**, general to any
  fixture, with the Kell partition (`impulse` / `binding`) as a field that
  decides which supply shape it needs.
- **Three supply sources, one report.** A slotted cell, a mana line, or a
  person in contact — the device asks for a `SupplyState` and does not
  care which answered.
- **A mana cell is a real good.** Crafted, charged, bought, carried,
  slotted, swapped — with an everyday use beyond terminal maintenance.
- **The terminal's inert `status` seam gains a cause.** A dry terminal
  goes grey and refuses rides with no TPA-specific breakdown logic.
- **The fare splits along the physics.** A service fee for the survey
  (always) plus a mana charge for the energy (only if drawn from the
  terminal). Supplying your own mana — from your body or a cell you feed
  it — pays only the service fee.
- **`register` is free, everywhere, always.**
- **Ad-hoc teleport is the same rule with the terminal removed**, targeted
  by MQL instead of a route keyword.
- **Free movement inside extents you hold authorial authority over**,
  re-grounded on the authority to edit content rather than on bare title.
- **The TPA leaves the kernel.** `/system/tpa` holds the network model;
  arcana holds the device category; the Authority is realm content;
  terminals stay with their localities.

## Non-goals

- **The mana economy proper.** Deposits, prospecting, refining, mana as
  the supply pack's third traded commodity — all remain
  [mana-economy-design-pack](../slates/builds/mana-economy-design-pack.md)'s
  own build. Here, where a charged cell *comes from* is a recipe and a
  price; where the city's line mana comes from is off-stage.
- **Player-created surveys / personal waypoints.** A caster specifies at
  cast time through MQL; there is no recorded, reusable, tradeable
  waypoint object. (D10 explains how a caster specifies without one.)
- **Teleporting anything but yourself.** Closed by the postulate — the
  caster is always one endpoint. The existing `--target` object-relocation
  path is authorial tooling and stays exactly as authorial tooling.
- **Dynamic terminal breakdown.** `dry` is the only new cause of
  out-of-service. Wear, sabotage and disruption events stay in
  [fast-travel-slate](../slates/tails/fast-travel-slate.md).
- **Binding devices.** The category admits `binding`, but this build ships
  no ward, no held glowlight, no climate vault. Impulse only.
- **A governed TPA with staff and elections.** The Authority gets its
  charter, its board positions and its appointing authority as data; who
  actually sits on the board and how they are elected is civics' build.
- **Cross-restart credential durability.** Registration is still
  session-durable (fasttravel.md's v1 caveat); this build does not fix it.
- **A mana market with dynamic pricing.** A terminal's mana rate is
  authored. D8 shapes it so it *can* later track real supply cost.

---

## Surface decisions

### D1 — The Teleport Authority is a special-purpose authority, not a corpo

**Q.** What kind of organization is a body that spans localities to enable
travel, owns infrastructure, and has no capital and no owner?

**A.** A **special-purpose authority** — the special-district form:
*functional* rather than territorial, overlapping rather than nested,
funded by user fees rather than taxes, governed by a board its member
governments appoint. A corpo is integrated because it is pursuing
something; an authority does one job across bodies that each stay
sovereign.

It needs **no new primitive**. `OrganizationMixin`'s appointing authority
is a four-kind `PrincipalRef` union, and one kind is `seat`, resolving
through `GovernmentApi.holdsSeat`. So the Authority is an `Organization`
whose board positions are appointed by `{kind: 'seat'}` refs naming seats
in its member localities' governments. A locality joins by its
seat-holder appointing; it leaves by not appointing.

⭐ That preserves civics' load-bearing consent rule —
*"the government carries no claims list; declaring jurisdiction is
authoring the Locality"* — with no `Locality` field and no kernel change.
**The authority can never claim a locality that did not consent, because
consent *is* the appointment.**

Its `Business` face is unchanged and stays the economy half (fares, the
network fee, wages). `BusinessMixin` already requires `OrganizationMixin`
on its base, so this is one object with two faces.

### D2 — It is named "the Teleport Authority", full stop

**Q.** `fasttravel.md` calls it the *Eternal City Teleport Authority*.
Eternal City is not a place in this game.

**A.** The name is **"the Teleport Authority"** — which is what the shipped
content row already says. "Eternal City" appears nowhere in content except
a comment on Tootie's row calling it *"a nod to the original Eternal City
TPA"*, a wink at a predecessor game. The doc invented the prefix.

⭐ And the bare name is *correct*, not merely shorter: **a functional
jurisdiction cannot take a territorial name without misrepresenting
itself.** Naming it for any member locality would read as that locality's
agency, which is exactly what it is not. Name the job — the job is the only
thing every member shares.

### D3 — The device category is arcana's; the network is `/system/tpa`'s

**Q.** Where does the code live?

**A.** By the water build's rule — *a system's classes are the pack's, its
instances are the realm's*:

| what | where |
|---|---|
| `ManaPoweredMixin`, the mana cell, the mana line, impulse-vs-binding | **arcana** (`/system/arcana`) |
| the `teleport` spell row | **arcane-library** (it ships the twelve spells) |
| the computed-cost seam on the cast pipeline | **kernel** |
| `FastTravelMixin`, the terminal, the survey/registration model, the two verbs | **`/system/tpa`** (new, deliberately thin) |
| the Teleport Authority — Organization + Business + charter | **realm content** |
| the terminals themselves | **their own localities** |

⚠ **`/system/tpa` must stay thin by construction, not by intention.**
A terminal is `ManaPowered + FastTravel + Slotted(bay)` — a composition
list, not a class with behaviour. Anything a terminal wants that a front
door might also want belongs in arcana.

`/system/tpa` is *not* `/system/transit`. A terminal is not a vehicle and
nothing is in transit: it is a **registered destination**, and the whole
cost story is about information rather than transport. Its nearest shipped
cousin is the address namespace, not locomotion.

### D4 — `ManaPoweredMixin` owns the Kell partition as a field

**Q.** Impulse devices and binding devices need different supplies. Two
mixins, or one?

**A.** One mixin, `drawMode: 'impulse' | 'binding'` as a field.
[arcane-science.md](../arcane-science.md) is explicit that the partition
already decides the supply with no further judgement — *"an impulse device
draws per use and runs off a stored charge, while a binding device draws
per second and needs a standing supply. A teleport terminal is an impulse
device; a ward is a binding one. Nothing else has to be decided."* A field
that decides a policy is not a class split.

Surface: `canDraw(τ)` / `draw(τ)` / `supplyReport()`.

### D5 — Three supply sources, one `SupplyState` report

**Q.** Battery, wire, or person — how does the device know which it has?

**A.** It does not. It asks its supply for a `SupplyReport` and gets one of
the six words or `null`, reusing the water build's `lib/supply/SupplyState.ts`
verbatim — the second consumer, and the reason the vocabulary is in the
kernel rather than in a pack.

| source | is | serves |
|---|---|---|
| a **slotted cell** | `Slottable` + `Charged` in a `SlotSpec` bay | the frontier terminal; the swap *is* the maintenance loop |
| a **mana line** | continuous supply, `cut` when severed | the city terminal, chosen on throughput |
| **a person in contact** | `ConduitMixin` from their own pool | a front door, a lamp — *"a resident is a sufficient battery"* |

`dry` when the reservoir is empty. **This is what gives the terminal's
inert `status` seam a cause**: `getStatus()` reads the report, `dry` → grey
→ the ride refuses, with no breakdown model and no TPA-specific code.

### D6 — The cell is a composition, not a new mixin

**Q.** Does a mana cell need its own mixin?

**A.** No. It is `ChargedMixin + Slottable` and a concrete `ManaCell`
Thing. `ChargedMixin` already ships `getStoredKJ` / `getCapacityKJ` /
`getChargeFraction` / `isDepleted` / `spendCharge`; `SlotSpec.accepts`
already gates what fits a bay; the shipped **`device`-category verbs**
already drive slots. Compose, do not invent.

### D7 — `ChargedMixin` is renominated from kJ to mana

**Q.** `ChargedMixin` measures charge in kJ. Post-mana-slate, a charge is
mana (τ).

**A.** Rename the surface to τ. Since **k = 1 kJ/τ**, *no shipped number
changes* — precisely the mana pack's *"the change is semantic, not
numeric"*. Leaving a kJ face on a quantity that is no longer energy is the
kind of thing
[nothing-is-legacy](../antipatterns.md) exists to prevent, and this build
is already inside the file.

### D8 — The fare splits into survey and energy

**Q.** How does bring-your-own-mana price?

**A.** The fare stops being one number:

```
total = serviceFee + arrivalSurcharge + (manaCharge, iff drawn from the terminal)
```

| component | pays for | who |
|---|---|---|
| **service fee** (the existing route `fee`) | the **survey** — specification paid once by whoever built the terminal, amortised | everyone, always |
| **arrival surcharge** (existing) | the destination terminal's own operator | as today |
| **mana charge** (new) | the **energy** — the `mgh` in τ that actually moved you | only if the terminal supplied it |

⭐ This is not a pricing gimmick; it is the specification problem on a
receipt. The thing you cannot self-supply is the survey. The thing you can
is the mana — **so the "discount" is simply not being billed for what you
did not consume.**

⚠ **Powering a terminal is not casting.** The terminal is the caster; the
traveller supplies **fuel**. No faculty, band or spell knowledge is needed
to feed one — which is the whole reason the network can serve people who
cannot cast at all.

**Two ways to supply your own**, and they are deliberately different acts:

- **A charged cell**, which anyone may feed the terminal. `ManaCell` is a
  consumer good; buying well is cheaper per τ than the meter.
- **Your own pool**, if you can cast. ⚠ `installArcaneReserve()` returns
  early on `!isCastingCapable()`, so a **non-caster holds no mana at all** —
  not a small reserve, none. Paying from the body is a caster's move, and
  that asymmetry is kept on purpose (D8a).

### D8a — The mana rate is DERIVED from supply mode, and that is where the interest lives

**Q.** Should the mana charge be a flat authored number per terminal?

**A.** No — **derive it from how that terminal is supplied.** Mains-fed
mana is abundant and cheap; cell-fed mana is scarce and dear. The terminal
resells what it bought, so its rate is its cost basis, and the fare stops
being a designer's number.

| | supply | mana charge | what a traveller does |
|---|---|---|---|
| **city terminal** | `ManaMain` | low | shrug, pay it, keep your pool |
| **frontier terminal** | cells | high | real pressure to bring your own |

⭐⭐ **For a caster the decision is three-sided, and the substrate already
makes it bite.** Mana recovery is *not* on its own clock: it is a consumer
of **metabolism's coupled-recovery keystone**, at a **serenity-banded
rate**, spending satiation and hydration per point recovered — the code's
own comment puts full recovery at *"roughly one substantial meal's worth of
work"*, and **a starved caster stops refilling**. So the choice is:

> **pay coin · arrive depleted · or eat and drink your way back**

⭐⭐⭐ **And the pressure is highest exactly where it hurts most.** The
frontier is where mana is dearest *and* where a traveller is likeliest to
be arriving into danger wanting a full pool. Two independently-motivated
facts — cell-mana costs more per τ, frontiers are dangerous — point the
same way, so the dilemma sharpens with the stakes **with nothing tuned**.
In the safe city it correctly does not matter.

For a **non-caster** the same choice is money against money — the meter
versus a cell they bought — an optimization rather than a dilemma. That is
honest rather than a shortfall: a non-caster's mana has no other use, so
there is nothing for the decision to trade *against*. It also gives casters
a distinctive relationship with the network, which is the right shape for a
utility whose whole business is selling a capability its customers lack.

The existing money model — route `fee`, destination `surcharge`, the
base+rate network fee, the two-budget split, tender-agnostic settlement —
is **untouched**.

### D9 — `register` is free, and the board is public

**Q.** If `register` is "the traveller being specified into the system",
why does it not cost?

**A.** Because **establishing a specification is expensive and copying one
is not** — Landauer, already cited in the science doc's Real column. The
survey was paid for once by whoever built the terminal; registering copies
it into your credential.

⭐ **The price of a destination is legwork, paid once, forever.** You had to
physically get there. *Reach-before-travel is the fee.*

**Consequence, and it settles a question the doc leaves open.**
`fasttravel.md` asks whether an unregistered traveller should see routes
they cannot yet take — *"a timetable is public; a ticket is not."* If
registration is free and the real cost is the journey, the board is **a map
of where you could get to if you walked there first**: an invitation, not a
leak. **The departures board renders for everyone.**

That also fixes the live defect recorded immediately below it — *"nobody
actually sees a departures board"*, because a wizard self-powers past the
fork and an unregistered traveller is stopped by the gate before the board
renders. The audience most in need of it finally gets it.

### D10 — Ad-hoc teleport is the same rule, targeted by MQL

**Q.** What is off-network teleportation?

**A.** The same spell with the terminal removed. Every rule holds — self
only, `mgh` in mana, the band gate, the cast time, interruption. Two things
differ:

- **Targeting grammar.** On-network, a keyword matched locally against
  *this node's* routes. Off-network, an **MQL query** — but an
  **anchored** one (below), never a world scan.
- **Who pays.** There is no terminal, so **you supply the mana or you do
  not go.** The BYO case becomes the only case.

⚠ **Resolving is not permission, and this build must not blur that.**
mql.md is explicit that every seed resolves for every giver — a guest may
type `world:[mixin.Door]` and get an honest, perception-fogged answer — and
it already names our verb: *"`teleport` [fails] on title over the
destination's extent."* MQL hands you a target; the gate lives in the verb.

⭐ **Specification is what the caster does at cast time**, and MQL *is* the
in-fiction expression of describing a place precisely. Which yields a
mechanic rather than a parser error: **an ambiguous query is a failed
specification**, refused as *you could not hold the place clearly enough*,
never as "which one did you mean?".

⭐⭐⭐ **The destination must be ANCHORED, and the fiction and the
performance budget agree on that.** A destination resolves from exactly
three anchors, none of which needs a full-registry scan:

| anchor | is | why you may specify it |
|---|---|---|
| an extent you hold **authorial authority** over | path-anchored, walks the parcel trie | you know your own ground |
| a node you have **registered** | a small enumerated set on your credential | somebody surveyed it and you copied it |
| your **current scope** (`here` / `reachable` / `peers`) | the scope-walk pools | you can see it |

⚠ **`world:` is out of bounds on this path** — see
[world-scan-perf-slate](../slates/tails/world-scan-perf-slate.md), which
inventories every `world:` consumer as an O(n) registry scan and is
currently deciding what replaces the worst of them. This build must not
add a new one, and does not need to.

⭐ The two constraints turn out to be the same constraint: *"scan the whole
universe for somewhere to appear"* is precisely what the physics forbids,
because **nobody surveyed it**. A performance ceiling and a postulate
agreeing is the best kind of constraint — the fast implementation is the
honest one. It also means this build carries **no dependency on whatever
replaces `world:`**, because it never reaches for it.

⭐⭐ **And this is what the Authority actually sells.** A caster with a full
pool does not need the TPA — but casting is gated on both grid axes at a
real band, so **most people cannot teleport at all**. The TPA is a utility
selling a capability its customers do not have, exactly as a water main
sells to people without a well. That is the business, and it is the same
lesson the standpipe teaches.

### D11 — Free movement follows authorial authority, because the gate would be theatre

**Q.** How wide is free teleportation inside your own holdings?

**A.** **Any extent you hold authorial authority over** — your sandbox
circle, and any parcel (with its subdivisions) whose content you may edit,
including as a member of the committee that holds it.

⭐⭐ **The justification is security, not magic.** Authority to edit content
— above all TypeScript — already *is* the ability to put yourself anywhere:
an `eval` with a `move()` call needs no spell. A mana gate over that
territory would constrain good-faith actors and nobody else, which is
[the resilience posture](../slates/builds/wizard-duty-slate.md)'s
standing rule that **guards constrain good faith only**. So the privilege
is not a perk; it is an honest acknowledgement that the door is already
open.

Resolution rides `AccessApi` — `heldExtents` / `canAtPath` — never a
bespoke check. ⓘ **`TeleportController` already calls
`AccessApi.heldExtents(giver)`**, and access.md already documents the
pattern (*"`teleport` moves you between two points inside ONE held
extent"*). This build **re-grounds** that rule on authorial authority and
makes everything *outside* it cost mana; it does not invent it.

⚠ A **use-grant is not authorial authority.** A tenant with a lease may
occupy but not edit, and does not get free movement.

### D12 — The kernel keeps no list of content teleport nodes

**Q.** `BORN_WITH_TRAVEL_NODES` in `lib/credential/Credential.ts` hardcodes
three content paths.

**A.** It moves out. A kernel list that a content pack must edit is exactly
what the capability-pack rung exists to prevent — *a pack must never need a
kernel list edit*. The born-with floor becomes authored data (a settings
key or the Authority's own row), and the kernel keeps the *mechanism* of a
floor without naming anybody's terminals.

`TpaTerminal` likewise leaves `packages/server/src/mud/world/common/tpa/`,
where it has been parked since before content packs existed.

---

## Constraints

- **No new Mongo collection.** Terminal reservoir level, cell charge and
  the Authority's charter all ride existing substrates (`Reserve` state,
  the persistence spine, the document tree). `pnpm lint:schema` must still
  report 48.
- **⚠ No `world:` seed on the teleport path.** Destination resolution is
  anchored (D10) — held extents, registered nodes, current scope. Adding
  an O(n) registry scan to a verb a player types is a regression against
  [world-scan-perf-slate](../slates/tails/world-scan-perf-slate.md), and
  the fiction does not want one either.
- **Reuse `SupplyState` verbatim.** Do not fork or extend the six words.
  A new failure mode is a design conversation, not a list edit.
- **The mana line is `ManaMain` — "the mains".** ⚠ `Conduit` is already
  taken twice (arcana's is a *coupling apparatus*, the charging bench being
  one; the water build's is a *pipe from a source to an extent*), and two
  Conduits meaning opposite things one root apart is a trap for every
  future author. `ManaMain` names the **relationship** rather than the
  object — you are on the network or you are not — so it cannot be confused
  with either. ⭐ And it puts the whole supply decision in one sentence a
  player can say: *"is it on the mains, or running off a cell?"*

  ⚠⚠ **Electrical nouns are banned here even though they are free.**
  `Wire`, `Cable` and `Circuit` are all unclaimed and all wrong: the game
  ships a real electrical system ([electricity.md](../subsystems/electricity.md)
  — the shock channel, Ohm's law, conduction spread), and mana is a
  **separate conserved quantity** that merely relates to energy the way
  charge does. An electrical noun would be wrong in the fiction, not merely
  confusing in the code.
- **⚠⚠ `lint:object-verbs` is CI-gating at a ZERO census** (the Api OO
  sweep, merged to master 2026-09-02). Any public static on an `*Api`
  whose **first parameter is a typed world object** is a build failure —
  a verb whose subject is an object lives ON the object. This build must
  add **no** `XApi.verb(host, …)`: the whole mana surface (`canDraw`,
  `draw`, `supplyReport`) is mixin methods, and the terminal's reads are
  the terminal's. What was already doctrine
  ([oo calling conventions](../antipatterns.md)) is now a gate.
- **⚠ `ThermalApi` and `SlotApi` were retired by that sweep.** The slot
  surface a battery bay needs — `getSlotSpec`, `canOccupy`, `getOccupant`,
  `isSlotFull` — is on **`Slotted` / `Slottable`** now. Reaching for a
  slot Api will not compile, and comments in `lib/slot/**` still *name*
  the retired methods as history; they are not a live surface.
- **⚠ Fixtures sit in no container.** The residences build was burned by
  exactly this: scope, reach and validators all missed fixtures. A battery
  bay on a terminal is a fixture slot, and `swap cell` will hit it. Plan
  for it; do not rediscover it.
- **⚠ A verb affordance is a static on a class.** A row's
  `commandContributions:` is dead silently. Whatever affords the cell-swap
  must be a class static.
- **Spell cost is computed for the first time.** Every shipped spell has a
  flat authored `cost:` (dispel is `20`). The cast pipeline must admit a
  derived cost without making the flat case more complex.
- **`mgh` reads shipped substrate.** Height from `ZoneApi.elevationFor`
  (the water build); mass from the traveller plus what they carry
  (`LoadBearing`). No new geometry.
- **Every AppSettings key needs a seeded literal at its call site**, so the
  kernel behaves correctly with the pack absent — the water build's rule.
- **Go through `AccessApi`.** No bespoke "is this person staff/an author?"
  check anywhere in this build.
- **The pack must hold a namespace root**, or `classFileOf` resolves its
  classes into the kernel tree.

---

## Acceptance criteria

1. A `teleport` **spell row** exists in arcane-library, runs the shipped
   cast pipeline, and is gated on both grid axes.
2. The spell's mana cost is **computed** from `mgh`, and the cast pipeline
   supports a derived cost without disturbing flat-cost spells.
3. **Distance costs nothing**: two rides of different lengths at equal
   altitude and mass cost the same, asserted directly.
4. **Altitude and mass are real**: arriving higher costs more; a loaded
   traveller costs more.
5. A caster **cannot teleport a third party** — asserted, with the
   authorial `--target` path unaffected.
6. `ManaPoweredMixin` exists in arcana, carries `drawMode`, and is composed
   by at least **two unrelated things** — a terminal and one domestic
   device — proving the abstraction is not a terminal in disguise.
7. A `ManaCell` is `Charged + Slottable`, fits a declared bay, and can be
   swapped through the shipped `device` verbs.
8. A device supplied by a **cell**, a **line**, and a **person in contact**
   all report through one `supplyReport()`, and the device holds no branch
   on which answered.
9. An exhausted terminal reports **`dry`**, shows grey, and refuses the
   ride — with no TPA-specific breakdown code in the path.
10. A **cut line** reports `cut`, distinctly from `dry`.
11. A traveller who **feeds the terminal a cell** pays the service fee and
    **no mana charge**; the same ride without one pays both.
12. A **casting** traveller may supply from their own pool with the same
    result, and a **non-caster cannot** — asserted, since they hold no
    reserve.
13. A terminal's mana rate is **derived from its supply mode**: an
    otherwise-identical mains-fed and cell-fed terminal quote **different**
    mana charges for the same ride.
14. `register` **costs nothing**, at every node, asserted.
15. The **departures board renders for an unregistered traveller**, showing
    destinations they have not unlocked — closing the "nobody sees the
    board" defect.
16. Off-network `teleport` resolves its destination **through MQL**, and an
    **ambiguous query is refused as a failed specification**, not as a
    disambiguation prompt.
17. Destination resolution is **anchored** — held extents, registered
    nodes, or current scope — and the teleport path issues **no `world:`
    query**, asserted against the resolver.
18. Off-network teleport **charges the caster's own mana** and refuses when
    the pool is short.
19. Movement inside an extent the actor holds **authorial authority** over
    is **free** and needs no registration — resolved through `AccessApi`.
20. A **use-grant holder does not** get free movement in the extent they
    lease.
21. The Teleport Authority is an **`Organization`** whose board positions
    name `{kind: 'seat'}` appointing authorities in member localities'
    governments, and `holdsSeat` resolves them.
22. No content path for a teleport node appears anywhere in
    `packages/server/src/mud/lib/` — `BORN_WITH_TRAVEL_NODES` is authored
    data.
23. `TpaTerminal` no longer lives under `packages/server/src/mud/world/`.
24. `/system/tpa` ships **no class that a non-teleport device would want** —
    reviewed against arcana's category, and stated in the pack README.
25. `ChargedMixin`'s surface is denominated in **τ**, with no shipped
    number changed.
26. **`pnpm lint:schema` reports no new collection** (48).
27. A subsystem doc exists at `docs/subsystems/fasttravel.md`, rewritten
    for the reform, and `magic-items.md` / `magic.md` are updated where the
    build changed their truth.
28. `fasttravel.md` no longer says *"Eternal City"*.
29. Every new topic key resolves under an existing root
    (`pnpm lint:topics`), and the whole lint family passes.

---

## Cross-references

**Seeding slates** —
[mana-economy-design-pack](../slates/builds/mana-economy-design-pack.md)
(Part 5c is this build's design; Part 5's tiering sets the supply shapes) ·
[fast-travel-slate](../slates/tails/fast-travel-slate.md) (the `status`
seam, the deferred dynamism) ·
[supply-design-pack](../slates/builds/supply-design-pack.md) (the six-word
vocabulary, now on its second consumer) ·
[wizard-duty-slate](../slates/builds/wizard-duty-slate.md) (guards
constrain good faith only — D11's argument).

**Subsystem docs the build reads or changes** —
[arcane-science](../arcane-science.md) (**the physics this implements**) ·
[magic](../subsystems/magic.md) (the cast pipeline, the faculty, the cost) ·
[magic-items](../subsystems/magic-items.md) (`ChargedMixin`, `S* = inflow/d`) ·
[fasttravel](../subsystems/fasttravel.md) (**rewritten**) ·
[watershed](../subsystems/watershed.md) (`SupplyState`, the `Conduit` ladder
this reuses the shape of) ·
[zone](../subsystems/zone.md) (`elevationFor` — the `h` in `mgh`) ·
[encumbrance](../subsystems/encumbrance.md) (the `m`) ·
[access](../subsystems/access.md) (`heldExtents`, the code-trust axis) ·
[parcel](../subsystems/parcel.md) (extents and subdivisions) ·
[sandbox](../subsystems/sandbox.md) (the circle as an authored extent) ·
[employment](../subsystems/employment.md) (`OrganizationMixin`,
`PrincipalRef`) · [civics](../subsystems/civics.md) (`holdsSeat`, the
consent rule D1 preserves) · [slot](../subsystems/slot.md) (the battery
bay) · [mql](../subsystems/mql.md) (**resolving is not permission**) ·
[world-scan-perf-slate](../slates/tails/world-scan-perf-slate.md) (why the
teleport path stays anchored) ·
[credential](../subsystems/credential.md) (the travel record) ·
[content-packs](../subsystems/content-packs.md) (the capability rung,
`/system/tpa` as pack thirty-two) ·
[banking](../subsystems/banking.md) (the fare split, untouched).
