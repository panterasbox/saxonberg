# Energy — requirements

**Kind:** feature
**Leads from:** kernel (kernel-led; first consumers, all already in the world:
the **street lighting** service envelope shipped — completed on a fuel market
everywhere and migrated to electric in Terminus — and a residential **lamp**
that comes on and goes dark with the grid; the grid also readies the power a
later **cold-chain** build's fridge will draw)

Energy is the realm's power economy end to end: turning a primary source into
power, moving it to where people are, and letting a place consume it — with
someone paying for all of it. It ships in two epochs at once. **Combustion**
completes the street-lighting market envelope left half-built (a real fuel
good, a real producer, stock that depletes, and an honest civic bill).
**Electric** builds the public grid — generation, a network that follows the
streets, and a meter at each premises — so that a place is powered because a
line reaches it, not because we assumed it was. The two meet in the fiction the
build is really about: *the same civic service (street lighting) that burns
lamp oil in a frontier town draws grid power in the city, and the visible sign
of a place developing is which one it is.* Seeds:
[grid-slate](../slates/builds/grid-slate.md) (the design spine, Part 5) and
[power-utility-slate](../slates/builds/power-utility-slate.md).

## What already exists

Surveyed across the scoping session (siblings, the geographic graphs, envelope,
instrumentation, the fuel chain):

- **A running, calibrated street-lighting bill (no goods leg).** Envelope
  shipped public street lighting: a town funds the service, its streets light
  after dusk in a seniority order recorded in advance, and a shortfall darkens
  the junior streets. But **the money is paid to a placeholder (Terminus's
  general store, a retailer that produces nothing) and no fuel is actually
  consumed** — there is no lamp-oil good in the game. The demand figure is live
  and calibrated; only the supply side is missing.
- **Both ends of the power chain, already shipped.** Generation exists (the
  Wharfside works computes real watts from the river's head) and is readable
  (`analyze power`). The frontier tier exists (the mana charge economy — power
  anywhere, at a premium). Between them there is nothing: today a thing is
  powered by standing near water or by assumption, never by a wire.
- **A fuel production chain with no customer for this demand.** The collier
  makes charcoal; the ground yields coal and peat. None of it is sold into
  street lighting.
- **The civic and money substrate.** Localities, government seats, a treasury
  any owner can hold, a use-based sales tax that already flows to a treasury,
  the appropriation and payment mechanisms, and a work-contract board — all
  shipped.
- **The places.** Terminus (the developed city, on the river), Heart's Delight
  (the farm valley), Hinkley Hills (the frontier), each already in the world
  with streets and premises.
- **Overlapping slates:** grid + power-utility (this build's), delivery (the
  "coverage is legal, connection is physical" topology), structure (an unbuilt
  building tier — not on this build's path; we meter the parcel).

**Therefore what is genuinely new here is:** a **lamp-oil good and the producer
who sells it into a market that is already asking**; an **electric grid** a
place is connected to (or not) and can be **cut off from downstream**; a
**meter** at every premises that says whether power reaches it; a place's
**power posture declared and honest** (a shack off the grid is off the grid on
purpose); and the **civic economy that pays for public lighting** — a town's
own budget, a public-works seat that runs it, and a private contract that
supplies it — replacing the placeholder. The physics of both epochs and the
readable-watts surface already exist; this build adds the **network, the meter,
the market, and who pays.**

## Goals

- **Street lighting has an honest supply.** A town's lamps burn a real fuel
  bought from a real producer; the town's stock depletes as they burn and a
  short supply darkens streets the same way a short treasury already does.
- **A place is powered because power reaches it.** Every premises answers
  whether it is connected to the grid, and a consuming thing on it (a lamp, and
  later a fridge) works only when its premises is connected and the source
  upstream is up.
- **Power fails locally and directionally.** Cutting a line darkens only what
  is downstream of the cut, not the whole town — and the dark stretch can be
  traced back to the break.
- **A place's power posture is declared, and undeclared is a caught mistake.**
  Every premises answers what its power needs are; leaving it unanswered is a
  build error, while a *wrong* answer is a disagreement for review.
- **The epoch is derived, not flagged.** Terminus reads as electric, Heart's
  Delight as gas-lit, Hinkley as off-grid — because of what each place's
  infrastructure can reach, never because a "tech level" was set.
- **Someone pays, honestly.** Public lighting is funded by a town budget filled
  from use-based tax, run by a government seat, and supplied by a private
  contract — with the criterion for who is served, and who is paid, legible and
  answerable.
- **The development arc is visible.** The same street-lighting service that
  burns lamp oil in a gas-lit town draws grid power in the electric city, and
  moving from one to the other is a change anyone can see.

## Non-goals

- **Interior circuits, breakers, load-balancing, sub-metering** (the "ONI"
  low-voltage interior) — a place is powered as a whole in this build. → its
  own later build (grid-slate Part 5, Tier B); the seam is left clean.
- **Metered consumption billing / arrears** (a bill per unit consumed, a
  billing cycle) — power reaches a premises as connected-or-not here. → a later
  tier (grid-slate Part 5, Tier C); public-lighting billing (already a civic
  appropriation) is the exception in scope.
- **The cold-storage fridge itself** — this build delivers the grid that powers
  it; the appliance is the → [cold-chain](../slates/builds/cold-chain-slate.md)
  build.
- **Gas as a second piped commodity** — the root is built to house it, but no
  gas main ships here. → power-utility-slate.
- **The building/structure tier** — we meter the parcel; a structure object is
  → the structure slate, off this path.
- **AC/DC, electrical fire, the physical conductive interior graph** — the
  shipped local shock physics is untouched; its grid-scale version is → Tier B
  and `electricity.md`'s named seams.
- **Compulsory easements / the holdout & right-of-way conflict** — the network
  follows existing public streets; the political fight over new corridors is →
  delivery-slate / the amendment library.

## Placement

- **A new `/system/energy` root** owns the grid mechanism (generation, the
  network that follows streets, the meter, the powered-consumer contract, the
  supply/failure vocabulary reused from the kernel). It mirrors `/system/water`
  and passes the system test — *the grid obeys its laws whether or not anyone
  is participating.* Electric now, gas later; distinct from `/system/water`.
- **`trade-fuel` stays a trade** (the collier's craft) and gains the lamp-oil
  good and the producer who sells it. Renaming it "trade-energy" was rejected —
  fuel production is *who makes*, the grid is *how the world works*, two
  different axes.
- **The utility that runs the grid, and the public-works function that runs
  street lighting, are government seats / businesses** (who owns), not new
  classes.
- **Instances are the realm's, the mechanism is the pack's:** a second town's
  grid, a second fuel producer, a third gas-lit locality are **content** — rows
  and declarations — needing **zero pack code.** The test passes: a second
  instance needs no code.

## Collisions

- **Envelope's street lighting** — this build completes it. It touches the
  funding record (adds the goods leg, replaces the general-store payee),
  the nightly settlement, and Terminus's street rows (which migrate to electric).
- **The three localities** — Terminus (its streets and premises gain grid
  connection and its streetlights go electric; its generation already exists at
  Wharfside), Heart's Delight (declared gas-lit; its lamps get the fuel market),
  Hinkley Hills (declared off-grid; the canonical unpowered-shack case).
- **The general store** — loses its placeholder role as lighting "supplier";
  it may still *retail* lanterns and oil to players, but the municipal supply
  becomes a producer contract.
- **The fuel chain** (collier, coal, peat) — becomes the lamp-oil supply, a
  producer that was producing into nothing gains a customer.
- **The readable-watts surface** (`analyze power`) — energy's generators and
  consumers must be legible through it (they already answer its contract).
- **The parcel** — the meter attaches here; the service declaration lives on
  the parcel; nothing else claims that ground.
- **Hearth / fuel-burning heat** — a hearth needs no grid; the gas kitchen is
  helpless in an outage and the hearth is not. That tradeoff must survive.

## Surface decisions

### The system root is `/system/energy`
Houses the whole energy economy (combustion + electric now, gas later), distinct
from `/system/water`. Lens 5 chose it — one root, the dynamics change across
epochs. The "commodity-generic supply" ambition is met by reusing the kernel
supply vocabulary and the conduit pattern, not by a shared instance or by
migrating water.

### Both epochs ship, split by locality
Combustion (the fuel market) serves the gas-lit localities; electric (the grid)
serves Terminus, whose streetlights **migrate** from the fuel market to a grid
draw in this build. This proves both epochs and the gaslight→electric migration
on the already-calibrated demand — the fiction the build is about.

### Consumption resolves to the covering parcel's meter, whole-premises
A consuming thing asks "is my covering parcel connected, and is the source
up?" — resolved by longest-prefix, never by walking the interior. The story is
therefore identical for a detailed home, a single-room shop and an industrial
works. The interior (circuits) is a later build; here a premises is powered as
a unit.

### The public network is contiguous and traceable; the meter is the boundary
Power follows the streets as a real, walkable network: a cut darkens only
downstream, and the dark stretch traces back to the break. Past the meter it is
abstract (whole-premises). The meter is the one discontinuity — the step-down,
the billing line, and the edge where the traceable public network becomes the
abstract premises.

### Overhead vs underground is a property of the line, expressed only where it
matters
A line is overhead or buried; it changes nothing about how power flows, only
**where a fault is reached** (a pole vs a manhole access point) and **how it
fails** (overhead goes down in storms; buried is storm-safe but dig-to-reach).
Default overhead; burying is an upgrade.

### The declared power need is a band, not a number
A premises declares its power posture as a band (and *connected* is the
default; disconnection is what an author states). No number is an authority;
the build only needs declared-vs-undeclared to catch the mistake.

### The epoch is derived from reachable infrastructure, never a flag
A place is electric if a connected premises can reach a generation source
through the street network; gas-lit if its streets run the fuel-lighting
service with no electric reach; off-grid if neither. No "tech level" setting.

### Who pays: a town budget, a seat, a private contract
Public lighting is funded from a **locality treasury** filled by a **use-based
local tax** (a transfer from real trade, never minted money); run by a
**government seat** (public works — a seat, never a new org, per the
Ministry-of-Trade precedent); and supplied by a **private contract** with a
real fuel producer. The service is public; the supply is private.

### The ownership of the electric utility is left to the polity
Whether the electric utility is a municipal office, a corporate concession, or
a co-op is the polity's call, made in-world; the build ships it defaulting to
the same municipal shape as lighting and lets the fiction change it. (The one
governance fork deliberately not pre-decided — it is an in-world decision, not
a code one.)

## Lens pass

1. **Pedagogy** — physics (power, line loss and why transmission is
   high-voltage, generation from head), economics (natural monopoly, marginal
   cost, use-based taxation), and civics (a public service funded, run and
   supplied). The world is derivable: a place is dark because the line to it is
   cut, or its town ran short of fuel, or no grid ever reached it — each
   predictable from principles. Disciplines: physical science, economics,
   civics/governance.
2. **Expression** — the ordinary case is all declarations and rows: an author
   makes a place gas-lit, electric or off-grid, adds a fuel producer, or
   connects a new premises, with no code; a second town's grid and a third fuel
   supplier are content. The bespoke case (a novel generation source, an
   isolated micro-grid, a town that refuses the grid) composes from the same
   parts.
3. **Immersion** — power is felt, not shown: the lamp comes on at dusk, the
   line is cut and the lane goes dark, the town runs short and the junior
   streets stand cold. No gauge — you read power by what works and what is
   dark. RP emerges (the lamplighter's round, the storm outage, the frontier
   town proud of its independence) without scripting.
4. **Values** — the choices: a town's budget priorities (which streets first
   when short — decided in advance, so no one is judged at the moment of
   refusal); the autarkist's hearth vs the convenience-and-dependence of the
   main; who is served and who is paid, made legible. Standing is conferred on
   the producer who keeps the town lit and the seat-holder who runs it well.
5. **Continuity** (reframed 2026-09-28 from "Technology & magic": *does the new
   epoch's object answer the same commands?*) — the build's strongest lens. Only
   the *source* changes across prehistory→future (fire → fuel → grid → mana at
   the frontier); the delivery, the meter and the consumer answer the **same
   commands** throughout. ⭐ The gaslight→electric migration of the *same*
   street-lighting service — same `look`, same civic funding, the source swapped
   — is literally the lens's own worked-example shape; and no energy verb leaks
   epoch-specifically onto the common interface (`sever`/`splice` live on the
   grid-specific `LineAccess`, not the shared surface).
6. **Economy** — produces: light, power, a fuel vocation, a public service.
   Consumes: fuel, money, capital. Who pays: the town, from use-based tax, into a
   private supply contract — a transfer, never a mint; money never reaches
   standing. The demand was there first (the calibrated lighting bill is already
   running — a market to price, not to invent).
7. **Governance** (split out of lens 6, 2026-09-28) — when it judges a person,
   name the criterion, the appeal, and the entrenchment tier: *which streets go
   dark* (criterion = seniority recorded in advance; appeal = the budget /
   committee; **tier C** — the polity sets the order); *who wins the supply
   contract* (criterion = price / reliability; appeal = the contract board;
   **tier C**); *the tax rate* (`localTaxShare`, **tier C** — a `config` dial
   the polity moves). ⭐ `lint:power-posture` judges a parcel *declaration*, not a
   person (a build lint), so it raises no governance bar; and no bare-count
   permanent gate exists anywhere in the build.

## The drive

Run in the live game before the MR opens; becomes the wire drive.

1. **Gas-lit town, honest supply.** In Heart's Delight (declared gas-lit), wait
   for dusk. The streets light. Inspect the lamps — they are burning. Confirm
   the town is buying lamp oil from a **producer** (the fuel chain), and that
   the town's fuel **stock draws down** as the lamps burn — not merely money
   moving to a shop.
2. **Run the town short.** Drain the town's lighting budget (or its fuel
   supply). At the next dusk, the **junior streets stand cold** while the senior
   ones still burn — the shortfall darkens by the order recorded in advance, and
   `look` at a cold lamp says so (a lapsed service, not a broken lamp).
3. **The producer gets paid, the general store does not.** Confirm the money
   for lighting now reaches the **fuel producer under contract**, and that the
   general store is no longer the lighting "supplier" (it may still sell you a
   lantern).
4. **Electric city.** In Terminus (declared electric), confirm a premises is
   **connected** to the grid, and that a residential **lamp** on it comes on —
   because the line reaches it and the Wharfside generation is up.
5. **Cut the line.** Cut a distribution line upstream of one Terminus stretch.
   **Only that stretch goes dark**; the rest of the city stays lit. Trace the
   dark stretch back to the **break**. Restore it; the lights return.
6. **The streetlight migrated.** Confirm Terminus's streetlights are now on
   **grid power**, not the fuel market — and that cutting their feeder darkens
   them the way step 5 darkened the lane. (The same civic service, the source
   changed.)
7. **Off-grid frontier.** In Hinkley Hills, confirm a shack is **off the grid**
   — legally and by consequence — with no line reaching it, and that this reads
   as a declared posture, not a bug.
8. **The mistake is caught.** Add a premises with **no declared power posture**;
   confirm the build refuses it (an undeclared consumer is an error), while a
   premises declared connected in a place with no grid is a *disagreement* a
   reviewer can see, not a crash.
9. **The epoch is derived.** Confirm nothing anywhere set a "tech level" — that
   Terminus reads electric, Heart's Delight gas-lit and Hinkley off-grid purely
   from what each place's infrastructure reaches.

## Acceptance criteria

Observable from outside the code:

- A player in a gas-lit town at dusk sees lit streets whose light depends on the
  town having **bought and burned real fuel**; draining the supply darkens the
  junior streets first, visibly.
- The money for public lighting reaches a **fuel producer**, and a producer who
  had no customer for this demand now has one.
- In the electric city, a lamp on a connected premises works; **cutting a line
  darkens only the downstream stretch**, which can be traced to the break, and
  restoring the line brings it back.
- Terminus's streetlights run on grid power and fail with the grid; the gas-lit
  towns' run on the fuel market — **the same service, two sources**, chosen by
  no flag.
- A frontier shack is off the grid on purpose; an **undeclared** premises is a
  caught build error.
- The three localities' epochs are each **derivable** by a player from what
  reaches them, with no "tech level" anywhere.
- The whole power posture of the realm — who is electric, gas-lit, off-grid — is
  **authored as content** (declarations and rows), demonstrable by a second
  instance needing no code.

## Cross-references

- [grid-slate](../slates/builds/grid-slate.md) — the design spine (Part 5: the
  seven-phase chain, tiers, contiguity, epoch-by-locality, the inherited
  streetlight bill, placement, and the economic proposal).
- [power-utility-slate](../slates/builds/power-utility-slate.md) — the municipal
  utility, the residential demand case, the deferred gas commodity.
- [delivery-slate](../slates/builds/delivery-slate.md) — coverage-is-legal /
  connection-is-physical topology; the deferred easement/holdout conflict.
- `docs/subsystems/watershed.md` — the shipped utility-network pattern to mirror
  and the hydro generation this draws on.
- `docs/subsystems/electricity.md` — the shipped local physics and its named
  grid-scale seams (the deferred Tier-B interior).
- `docs/subsystems/parcel.md`, `docs/subsystems/address.md` — the meter's host
  and the epoch-by-locality resolution.
- `docs/subsystems/banking.md`, `docs/subsystems/contract.md`,
  `docs/subsystems/governance.md` — the pay/run/supply substrate.
- [cold-chain-slate](../slates/builds/cold-chain-slate.md) — the downstream
  consumer this grid readies.
