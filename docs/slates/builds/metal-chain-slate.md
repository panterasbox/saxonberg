# Metal-chain slate — the three trades that make metal

> **Status: PARTIAL** — Stage A shipped 2026-09-01 (the `Deposit` field,
> `MineWarren`, the five acts, the survey channels, Rejection) →
> [mining.md](../../subsystems/mining.md)
> **Left:** Stage B, below the water table — shaft/hoist/pump · the drainage
> commons, the district as an Organization + the hoist toll · sulfides, roasting
> and flux · beneficiation (the dressing floor + tailings) · the survey address
> for a working · tutwork/tribute pitches and setting-day · the tin rung + the
> alloy regime (Stage C) · coal → coke (the arc payload) · placer + the Weeping
> Moor stream-tin district · domestic + building metal (locks, lamps, nails) ·
> stock forms · the `chars` producer brain · who owns the shaft (the buyout arc) ·
> ⚠ **`SmeltingFurnace = ContainerMixin(Forge)` (noted 2026-09-23, extraction
> build)** — a smelting furnace is a chamber you CHARGE, so it sits on the
> *oven* side of `Oven`'s own distinction (*a chamber you load* vs *a fire you
> bring work to*), and the subclass exists only to add the container its parent
> lacks. The extraction build hit the identical fact for the kiln and resolved it
> by deleting the `Kiln` class and making a kiln a ROW on `/platform/thing/Oven`;
> the same collapse is available here and is this slate's to take.
> **Size:** a build

> This slate owns **the supply chain**: extraction, fuel, and smelting as
> three trades, and the chemistry that makes them real.
> [mining-slate](./mining-slate.md) owns mining-as-play (the four play
> layers, the dangers, the deep ecology, the Delving 9 mirror).
> [rejection-slate](./rejection-slate.md) owns the venue and the cast.
> Read all three; they do not overlap, and where this one **supersedes**
> the mining slate it says so explicitly (§ *What this supersedes*).

Substrate: [crafting](../../subsystems/crafting.md) ·
[fire](../../subsystems/fire.md) ·
[materials-response](../../subsystems/materials-response.md) ·
[smallholding](../../subsystems/smallholding.md) ·
[husbandry](../../subsystems/husbandry.md) ·
[parcel](../../subsystems/parcel.md) ·
[employment](../../subsystems/employment.md) ·
[contract](../../subsystems/contract.md) ·
[boundary](../../subsystems/boundary.md) ·
[zone](../../subsystems/zone.md) ·
[uncertainty](../../uncertainty.md) ·
[content-packs](../../subsystems/content-packs.md).

---

## The governing rule this session ran on **[DECIDED]**

> **The pedagogically richest option that teaches real science wins.
> Tie-break on content-author expressiveness.**

Stated by the user as permanent. Cheapness, build size and elegance are
not tiebreakers against real mechanism. Every `[DECIDED]` below that
isn't a scope call was decided by this rule; the scope calls (what ships
in v1 vs. what is staged) were the user's.

---

## ⭐⭐ Fuel is the trade; charcoal is a product **[DECIDED]**

*(SHIPPED → mining.md § *Fuel — pyrolysis, and the clamp*.)*

### ⚠ What the metallurgy build left here (2026-09-16)

Salvaged from the retired metallurgy plan — two concrete things this
trade owes, both found by driving rather than by testing:

- **Nobody makes charcoal while you sleep — and the reason was not the
  missing brain.** ⚠⚠ Diagnosed 2026-09-16 by charring in a browser: the
  fuel yard's coppice **afforded nothing**, because `harvest` comes from
  `CultivableMixin` and the `hazel-stool` was propped loose on the floor.
  So cordwood was unreachable by any route and the four authored baskets
  were the realm's whole fuel economy — one player ended iron-making for
  that world, permanently, in ten minutes. The affordance is fixed
  (`trade/fuel/thing/coppice-panel`); the **yield** waits on forestry's
  rotation compression, since `daysToStage.mature: 2500` is ≈208 real
  days. See `forestry-slate.md § What the metallurgy drive handed over`.
  ⭐ A `chars` producer brain on the collier is still wanted — the
  `delves` shape — but it was never the blocker, and a brain would have
  starved exactly as a player did.
  ⭐⭐ **And scarcity itself is not the bug.** The lens pass settled it:
  fuel, not ore, was the rate-limiting step of pre-industrial ironmaking,
  and `forestry-slate.md` requires that demand be able to outrun growth.
  The realm's charcoal rate IS its iron ceiling, and that chain —
  rotation → panel density → baskets per burn → smelts — is one piece of
  arithmetic somebody gets to set deliberately.

### The coppice is the fuel trade's own capital **[DECIDED]**

*(SUPERSEDED by the code: forestry IS a fourth pack, `trade-forestry`, and the
fuel yard's coppice is its `Panel` → [forestry.md](../../subsystems/forestry.md)
§ *The panel*.)*

### Coal is parked as the arc payload **[SCOPE — user's call]**

v1 ships **wood and charcoal only**. Coal→coke is the industrial
revolution step and belongs to the temporal mirror: the medieval mine
burns charcoal off a coppice it has to tend; the industrialised mine
burns coal it digs itself and **stops needing the forest at all**. That
is Delving 9 told as an energy transition, which is what actually
happened historically, and it is a better use of coal than one more seam
on day one.

---

## ⭐⭐ The smelt is physics, not a recipe **[DECIDED]**

*(SHIPPED → mining.md § *Ore, grade and the smelt*; crafting.md § consolidation
and quench. Flux remains, below.)*

### ⭐⭐ Carbon is the one number

Two consequences:

- ⭐ **The shipped smithing verbs become real.** A bloom *must* be
  hammered hot to consolidate it and squeeze the slag out — that is what
  wrought iron is, and why the smith is a separate trade. And `quench`
  becomes a lesson learned by failing: quench wrought iron and nothing
  happens, quench cast iron and it cracks, quench steel and it hardens.
  **`trade-smithing` gets scientifically grounded retroactively, without
  being touched.**
- **Flux stops being a recipe ingredient.** Limestone is there to lower
  the melting point of the gangue — the quartz half of the ore — so it
  runs off as slag. Which makes grade matter twice: lean ore is less
  metal *and* more slag to flux away.

---

## ⭐⭐ The ladder: start at copper **[DECIDED + SCOPE]**

The shipped material sheets are *already* thermodynamically ordered —
copper melts at 1358 K, iron at 1811 K. **The Bronze Age came first
because it is colder**, and a player could derive that from the data.

| Rung | Gated by | The lesson |
|---|---|---|
| **copper** | your eyes — malachite (Cu₂CO₃(OH)₂) is *visibly green* | the first metal is the one you can see |
| **bronze** | **depth** — tin (cassiterite, SnO₂) lies at the bottom of the zoned deposit | superior alloys can be a supply problem, not a skill problem |
| **iron** | **fuel technology** — 1811 K needs charcoal and a bellows | the barrier is energy |
| **steel** | carbon control | the barrier is knowledge |

⭐ **Four rungs, four different *kinds* of barrier** — observation, depth,
technology, knowledge. And the copper rung is itself **two-stage**: the
weathered oxide cap is gated by your eyes, the rich sulfide beneath it by
a *process* (roasting). See § *The deposit is zoned* — that second gate is
what the great house could never pass.

⚠ **A correction to an earlier draft of this slate**, recorded because it
was load-bearing: it claimed cassiterite "almost never occurs with
copper," and therefore that bronze cannot be made locally anywhere. Too
strong. The accurate version: the Bronze Age *civilizations* —
Mesopotamia, Egypt, Anatolia, the Aegean — had copper and essentially no
tin, so tin travelled thousands of kilometres (the Uluburun wreck carried
~1 ton of tin to ~10 tons of copper, which is bronze's ratio). **But
Cornwall had both**, zoned around its granite, and that is exactly why it
spent two thousand years as the exporter. So the lesson is not "nobody
has both" —

> ***Almost nobody has both, and whoever does, rules the trade.***

— which is what makes § *The deposit is zoned* legitimate rather than a
convenience. Iron ore, by contrast, genuinely is everywhere, which is why
iron ended the palace economies and armed everyone.

---

## Prospecting: real geology over a fixed truth **[DECIDED]**

*(Staining · float · gossan · assay SHIPPED → mining.md § *Surveying*. Placer,
below, remains parked.)*

**Placer / panning is parked** (scope, user's call). It is real physics
(density separation; water sorts heavy minerals into stream beds) and it
is the low-barrier newbie path the mining slate wants — but it is a
second extraction venue with its own geography, and the lode mine is
already the build.

---

## ⭐⭐⭐ The mine's geometry — a 3D grid, and the vein is a field beneath it

*(The retraction and the grid model SHIPPED → mining.md § *The geology field*,
§ *The governing split*.)*

### What survives the retraction, unchanged

- **The geometry is the mass accounting** — carve a cell and you moved
  that cell's rock; whether it was ore or spoil is what the geology field
  says. **The spoil is the loose ground** dirt dragons need: *the mine
  manufactures its own threat.*

*(The farming contrast is stale — fields shipped as `plot [<name>]` on a grid,
[soil.md](../../subsystems/soil.md).)*

---

## The trade is collective, and that is the lesson **[DECIDED]**

Farming laddered houseplant → bed → field → holding, private at every
rung. Mining has no backyard shaft — but the solo end of the ladder is
real, and it is what makes the venue onboardable:

| Rung | Who | Capital |
|---|---|---|
| **prospect** — walk ground, read staining and float | one person | a hammer |
| **stake a claim** — the property lesson | one person | a filing fee |
| **costean / test pit** — a shallow trench to prove grade | one person, days | none |
| **adit + drift** — face, tramming, surface | 2–3 | timber |
| **shaft + hoist + pump** | a crew | a company |

> ⭐⭐ **The jump from rung 3 to rung 4 is the lesson, not the obstacle.**

The player discovers that mining goes collective because one body cannot
hold the roof up, run the tram and cut the face — which is why mining
companies exist historically. **Collectivity is derived, not imposed.**

(The true backyard rung is free: Heart's Delight ships titled rural
ground, so a copper stain in a creek bank on land you already hold is
prospecting with zero new anything.)

### The structure: private workings in a shared deposit

Not a foreman deciding everything, and not event-soup. The historical
answer is better than both, and the deep-law already wrote it —
***"work your bounds or lose them."***

- **The working is private.** A claim is title over ground, the same
  shape as a farm holding, and its holder decides its headings.
- **The deposit is shared.** One zone, many independently-decided
  workings. **Geology makes them collective before any social rule
  does.**
- **The infrastructure is a commons.** The shaft, the pump, the
  ventilation, the main haulage — non-excludable within the mine,
  expensive, and everyone would rather the other party paid. **The pump
  keeps everyone's workings dry.** That is the free-rider problem
  arriving as groundwater.

**The commons ships in v1 — "that's the whole point"** (user's call). It
is the political-economy payload and the reason the venue is worth
building. It generalises the Rejection slate's seismic-network commons
from optional to load-bearing.

### ⭐ Geometry is state; contribution is events

The answer to *foreman vs. shared event substrate* is **both, split by
what they model**:

| Concern | Mechanism | Why |
|---|---|---|
| **Voids, veins, connectivity** | authoritative **ledger state** (build-3's shape) | voids must not overlap; derive-on-read over an append log makes that ugly |
| **Who cut what, who paid for the pump, whose timbering failed** | append-only **`*_events`**, derive-on-read | it is what makes a commons dispute adjudicable |

**The foreman is not an architecture — he is an employment `Position`
with a hiring right**, which ships. NPC hands and player hands are
interchangeable in it, exactly as `farm-hand.yaml` and the distillery
hands already are.

### Development, production, dead work

- **Development** — driving headings through waste to reach ore. Costs
  money, produces nothing, must be done first. Every mine is a bet on it.
- **Production** — stoping the ore out. The only part that pays.
- **Dead work** — timbering, tramming, pumping. Necessary, unpaid, and
  why *"sap not the props"* is the deep-law's gravest clause: a miner who
  skips dead work is stealing from everyone in the drift.

Entry is a capital decision: an **adit** is driven horizontally into a
hillside, **drains itself by gravity**, and is cheap — which is why real
mines are on slopes. A **shaft** needs hoisting and pumping forever.
`LiftMixin` earns its place from geology instead of from a wish list.

---

## ⭐⭐ Exit naming in a spherical zone **[DECIDED]**

*(The spherical framing is SUPERSEDED — the mine is a grid; the ruling below
stands on either substrate.)*

### ⭐⭐ You name what you make; you number what you find

Farm fields take **player-given names** because a farmer *chooses* the
crop — the choice is the identity, and `break ground <name>` already
banks it. **That does not transfer to mines**, and not merely
awkwardly: a farm has three to twelve fields, a working mine has
hundreds of voids. Naming scales with patience; mines exhaust it.

Real mines solved this by **surveying, not naming** — and the address
falls out of geometry that is already stored:

```
the 400 level, north drift          ← depth + bearing
no. 3 stope off the 400 north       ← + ordinal, only on genuine ambiguity
```

**The mine addresses itself**, which is the payoff of having gone
spherical — the coordinates were already there, so the naming problem was
self-inflicted. The player types what they would type in any mud —
`north`, `down`, `up`, `out` — because inside a drift you are in a linear
passage; the only real fan-out is a shaft station, where exits are levels
and you say the depth.

Mining's vertical vocabulary is precise and worth learning: a **winze**
sinks, a **raise** climbs, an **adit** goes out to daylight, a
**crosscut** cuts across the vein, a **drift** runs along it, a **stope**
is the void left by extraction.

### What distinguishes one void from another is geology

A field's name works because it names its *content*. A working has
content too — it is just geological: in ore or in barren country rock,
good grade or lean, wet or dry, timbered or raw, on the vein or chasing a
lost one. That is how a miner tells two drifts apart, it is the only
thing a player cares about, and **all of it derives from the vein
geometry we already need**. The room reads as what it is; the address
stays a coordinate.

Nicknames become **earned** rather than required — the pump chamber, the
bad ground, the Blue Drift. Places accrue names by mattering, which is
how mines really get them, and an optional alias on an exit is nothing to
support.

| | Address | Why |
|---|---|---|
| **Fields** (build-3) | player-given name | a farmer chooses the crop; the choice *is* the identity |
| **Workings** (this slate) | derived survey coordinate | a miner finds what is there; the ground decides |

One mechanism — a semantic label plus keywords — with the label sourced
differently per trade. **Build-3's naming act stands unchanged.**


---

## Beneficiation: the line is the furnace **[DECIDED — closes Open 7]**

Between the face and the smelter you throw rock away. Three mechanical
steps, all pre-industrial:

- **Cobbing / sorting** — break the lump, hand-pick the barren rock out.
  No capital at all.
- **Crushing** — reduce until the mineral is liberated from the gangue.
- **Washing / jigging** — density separation in water; the dense ore
  sinks, the light rock washes off.

⭐ That last one is **the same physics as panning**, so parking placer as
a venue did not cost us its lesson — it returns as the dressing floor.

**Where it lives is decided by whether it needs a furnace.** Mechanical
dressing (sort · crush · wash) is **`trade-mining`** — a hammer and
water, at the pithead. **Roasting** — heating ore in air to drive off
sulphur or carbonate before reduction — is a furnace act and belongs to
**`trade-smelting`**. A principled line, and it matches where the work
physically happened.

### It is mass balance, so it is the same arithmetic

Beneficiation creates no metal. It **raises grade by discarding mass**:
10 kg at 0.30 becomes 4 kg at 0.70 plus 6 kg of tailings at 0.03. Metal
in equals metal out, minus losses — the `composition` arithmetic already
doing all the other work in this chain.

### ⭐⭐ Why it exists is location theory

**Ore is heavy and mostly worthless, and haulage is priced by mass.** You
dress at the mine because it is cheaper to throw rock away where it lies
than to carry it. [encumbrance](../../subsystems/encumbrance.md) already
ships the haulage draft term to price it. And the consequence:

> The mine sits on the ore. But **the smelter sits near the fuel** —
> you burn more mass of charcoal than you smelt of ore, and charcoal is
> bulky and fragile. Historically smelters were in the woods, not at the
> pithead.

That is Weber's least-cost location — *industry locates at its heaviest
input* — derived by the player from freight costs rather than asserted.
⭐ **It is also why the three trades want to be in three different
places**, which is what makes them a supply chain instead of a diorama.

### Two things it hands the venue for free

- ⭐ **The dressing floor is the onboarding ramp.** Surface work, indoors,
  safe, low-skill, and it pays — historically done by women and children
  while the men were underground. A new player earns on the dressing
  floor of a lethal industry, learning ore from rock by handling a
  hundred lumps, without going down the shaft. **A dangerous vertical
  badly needs a safe rung**, and this one is not invented.
- **Tailings are terrain and inventory.** Crushed rock in piles — loose
  ground, which is what dirt dragons swim through, so the dressing floor
  manufactures the threat too. And real mines rework their own tailings
  when prices rise or dressing improves: a permanent low-grade fallback
  that rewards better technique later.

---

## ⭐⭐⭐ The commons: excludability is physics, not policy **[DECIDED — closes Open 2]**

### The four goods split themselves

| Infrastructure | Can you gate it? | So it is |
|---|---|---|
| **Hoist / shaft** | **yes** — meter who rides and what comes up | a **toll good**. Whoever owns the shaft owns the mine's throat — a natural monopoly. |
| **Haulage / tramway** | **yes** | toll |
| **Pump / drainage** | **no** — water finds its level; draining my working drains yours | **true public good** |
| **Ventilation** | **no** — air moves through connected workings | **true public good** |

> ⭐⭐ **You can put a gate on a shaft. You cannot put a gate on
> groundwater.** That is why the pump is the political problem and the
> hoist is not — and it is a physical fact the player can verify, not a
> rule they are handed.

### The problem arrives with depth, never on day one

An **adit drains by gravity, free, forever**. Only workings *below adit
level* flood. So the mine begins with no commons problem at all, and the
moment someone sinks below the adit, everyone's dry workings become
contingent on somebody's pump. ⭐ **The free-rider problem arrives as a
consequence of success** — real, and a far better teaching curve than
starting there.

### ⚠ The layer correction: this is NOT an Office

A first pass reached for the `Office` substrate. That is the wrong layer
and the distinction is load-bearing:

- **`Office`** ([governance.md](../../subsystems/governance.md)) — *"a
  named single-holder seat with a branch and an origin, **authored in
  code**. Not user-minted."* This is the **Compact's** apparatus — the
  meta-institution that determines how systems work by nature. The
  Governor of the Central Bank is one.
- **`Government`** ([civics.md](../../subsystems/civics.md)) — diegetic,
  plural, **content**; *"jurisdiction is declared on the `Locality`"*,
  seats are **employment positions** on an organization's chart.
- The line, from governance.md: ***"whether a constitutional document
  points at the position."***

A Barmaster is not an Office. **And it cannot be a `Government` seat
either — jurisdiction is declared on a Locality, and there is no
Locality.**

### ⭐⭐ So the district is an Organization — a voluntary association

Which is what the history actually is. **The surface was granted; the
minerals were claimed.** Surface land went by survey and patent (the
Homestead Act — Hinkley Hills' `PlatBook`/`LotHolder` exactly). Mineral
land on the public domain was **free entry**: find it, post a notice,
record it with your district, hold it by working it. Miners in California
from 1848 were legally **trespassers on federal land** — there was no
federal mining law until 1866.

What they did instead is the thing worth building: each district held a
meeting, **wrote its own code** (claim size, staking, how much work per
year holds it, how disputes settle) and elected a recorder. Hundreds of
them. Then Congress ratified them after the fact — the General Mining Act
of 1872 defers to *"the local customs or rules of miners in the several
mining districts,"* and is still in force. **The state adopted the
miners' law rather than imposing its own.**

⭐ This is the deliberate **yes** that rejection-slate Open 1b asked for:
Hinkley teaches the grant, Rejection teaches the claim, and **split
estate is the real distinction between them**, not a contrivance to
justify a second property venue.

Build-3 already laid the track: ***"Unincorporated is modelled by
absence"*** — Heart's Delight ships no `Government` row — and decisively,
***"title works without government (property is Compact-level)."*** A
claim can exist with no polity at all.

So the district is an **`Organization`** with a **register** and a **code
that is a contract among its members**. It has no sovereignty and must
not pretend to: its authority comes entirely from the fact that *a claim
nobody recognizes is just a hole you are standing in.*

**Enforcement follows, and is cheap.** The association cannot fine
anyone. What it can do to a member who will not pay is **strike their
claim from the register and stop recognizing it** — expulsion from the
property system, the actual historical sanction. That is already the
deep-law's middle rung (*restitution → claim-forfeiture → exile*), and it
satisfies civics's own constraint that there be **no legal machinery**.

### ⭐⭐ The funding: you tax what you can observe

You cannot charge for drainage. But the hoist is the **excludable** good,
and every ounce anyone raises has to come up the shaft.

> **Toll the thing you can meter, to fund the thing you cannot.**

No assessment institution, no honest-weight audit, no measuring what each
working produced — the levy sits on the one chokepoint the physics
already gives you. That is real public finance (states tax what is
observable, which is why tariffs and salt taxes precede income tax by
millennia), and it explains why owning the shaft is owning the mine's
throat: **the toll is both the mine's funding mechanism and its principal
instrument of power.**

⭐ It also means **the commons can be funded in v1 without building a
state.**

### The labor half: tutwork and tribute

The content bible already says Ferrow runs "on tutwork and tribute," and
those are precisely the two work-types this slate split:

- **Tutwork** — paid by the fathom driven. **Development**: paid for
  progress through rock, ore or not.
- **Tribute** — paid a share of the value of what you raise.
  **Production**: paid for results.

⭐ And tributers **bid**. On setting day a pitch is auctioned, miners
bidding down the fraction they will accept, on their own read of the
ground. **The auction price is a public reading of what experienced
miners believe about that vein** — the prospecting skill made liquid,
over the shipped [contract](../../subsystems/contract.md) substrate and
nothing else.

### ⭐⭐ Formed, not forming **[DECIDED — closes Open 8]**

The district exists and works on day one: claims recorded, a code
adopted, a hoist charging its toll, a pump running. **Decided on the
economic axis, and the pedagogy axis agrees once the lesson is looked at
properly.**

**Forming is a one-shot.** The first cohort founds the district; player
fifty arrives at a formed one regardless. So *formed* ships eventually
either way — the only question is whether the economy waits on a
handful of early players to get there.

**And it would wait on a collective-action problem being solved by a
population that does not exist yet.** Forming means no recorded claims, a
flooding level, and no ore until players coordinate. If they do not — and
a thin population is exactly the condition under which they do not — the
mine drowns, no ingots reach the smith, and the metal chain ships with
its faucet shut. That is the failure this build exists to fix,
reintroduced as a feature.

**The lesson is not lost; it is upgraded.** Two recoveries:

- **The founding lives in the record, not in prose.** The register is an
  artifact you can *read* — claims in order, with dates, including the
  ones that lapsed; the code with its amendments; the drainage levy with
  an adoption date and a fight behind it. Append-only history is what
  [chronicle](../../subsystems/chronicle.md) and
  [provenance](../../subsystems/provenance.md) already do. The player
  **reconstructs the founding from evidence** — the venue's own deduction
  skill, pointed at institutions instead of rock.
- ⭐⭐ **The commons problem is a maintenance burden, not an event.**
  Free-riding does not end when the pump is built. It recurs: the
  workings deepen and the pump needs a bigger engine; a claimholder
  refuses the levy and must be struck off; someone sinks below the
  current pump's reach and asks everyone to fund the next stage; a new
  adit would drain a whole side cheaper but crosses three people's
  claims.

> **A formed district under live stress teaches the free-rider problem to
> every player, continuously. A founding teaches it once, to whoever was
> there.**

It also gives the arc its grip: Veshko's offer is to buy the shaft and
take the pump private — **solving the commons by abolishing it.** A
buyout can only threaten something that exists.

### The arc

Terminus later declares jurisdiction over the claim field and either
**adopts the district's register** — the 1866/1872 move — or **replaces
it**. That is *recognition vs absorption*, the political tension the
mining slate already names as the deep-law's central question, arriving
as a specific legislative act with a specific artifact at stake.

---

## ⭐⭐⭐ Who owns what — the three layers and the throat **[DECIDED — closes Opens 1 + 10]**

*(The reconciliation SHIPPED: the co-op holds the developed mine, independents
the claim field, and tutwork keeps the ore → mining.md § *Whose ore it is*.)*

### The three layers

| | Held by | The path it offers |
|---|---|---|
| **The developed mine** — shaft, cage, pump, main levels | the **co-op** (a `Business`) | tutwork or tribute: zero capital, steady income, **no title** |
| **The claim field** around it | independents, by **parcel title** | ownership and upside, **all** the risk |
| **The way up** | the **co-op** | everyone's, eventually |

The bible resolved the physical fact independently: ***"vertical transit
= a called lift"*** — capacity-limited, time-scaling with depth,
signalled, **"the only way up for people."** Bulk ore is decoupled
(ore-pass → skip → surface tipple), which is why the cage is about
*people and control*, not throughput.

### ⭐⭐ Who owns the shaft is the entire arc

> **Veshko does not need to buy the claim field. It only needs to buy the
> throat.**

Every independent's title becomes worthless the moment the corpo owns the
only way ore and people come up. **You do not need to own production —
you need to own the bottleneck.** Railroads, pipelines, ports, app
stores; here it is a physical fact a player verifies by climbing.

It is also the same chokepoint § *The commons* levies to fund the pump —
so the co-op's toll is simultaneously its public-finance instrument and
its instrument of power over independents. ⭐ **One object, two
politics**, and a buyout captures both at once.

**Three legible counters**, which is what makes this play rather than
doom:

1. **Sink their own shaft** — huge capital, and the commons problem again
   at a smaller scale.
2. **Join the co-op** — trade autonomy for reliability. The bible's
   risk/autonomy dial, now with teeth.
3. ⭐ **Get the district to declare the cage a common carrier** — the
   actual legal invention for exactly this situation, and the perfect
   thing for a voluntary `Organization` with no sovereignty to try to
   enforce. It is the *recognition-vs-absorption* question in miniature:
   the district can only make it stick if somebody bigger backs it.

---

## ⭐⭐⭐ The deposit is zoned — where tin lives **[DECIDED — closes Open 6]**

> ⚠ **What Stage C concretely needs, now that the iron rung has shipped**
> (salvaged from the retired metallurgy plan): a deeper `toZ` band on the
> Ferrow row (`alongTo` for the heart, the existing depth axis for the
> granite contact); a `cassiterite.yaml` mineral row and a
> `tin-ingot.yaml` product — the latter discovered by `smelt`'s existing
> product scan, so no code; and an **alloy regime** in `smelt` (two
> metals in one liquid charge → `AlloyedMixin.setFractionOf(tin, …)` on a
> bronze ingot). The carbon machinery the iron rung built is the same
> machinery bronze needs — a second dissolved constituent, one threshold
> fewer. **The bronze breastplate is already authored and unmakeable**,
> like the nine arms were.


**Tin's home is the bottom of the Ferrow.** Nothing needs a second
locality: the deposit already has a vertical structure, and this adds one
axis beneath it.

*(The iron-shallow correction — the shipped shape is mining.md § *Zonation has*
*TWO axes*.)*

### The corrected stack

| Depth | What is there | Who worked it |
|---|---|---|
| **oxide cap** — soft, lean, green and rust | weathered copper carbonates (malachite) | **House Ferrow**, and it is **played out** — the leavings |
| **primary sulfide** — hard, rich, **+silver**, sour air and water | chalcopyrite and its silver | **the co-op**, now, chasing silver down-dip |
| **against the granite** — deepest, hottest | **tin** (cassiterite) | **nobody yet** — the revelation |


### ⭐⭐ The technology gate is a PROCESS, not a temperature

The beat this section was reaching for — *the resource never changed, you
did* — survives in a better form, and the bible's chemistry supplies it
free:

> **Oxide copper smelts directly. Sulfide copper does not — you must
> roast the sulfur off first.** The house worked the oxide cap because
> oxide was all it could process. The sulfides beneath were always there,
> always richer, and useless to them.

So the gate is **roasting** — the step this slate already assigned to
`trade-smelting` (§ *Beneficiation*: the line between the trades is the
furnace). The chain closes on itself, and the bible's *"sour air and
water"* stops being flavour: it is the sulfur you are about to drive off.

### It explains the lapse, and gives prospecting something to find

House Ferrow worked the oxide and left; **nobody ever went deeper than
the sulfides.** So the silver is the co-op's living, and the tin is a
*revelation* — the deduction layer has a real object to find rather than
more of the same seam. The venue's central secret is geological rather
than authored.

### What it costs, and where the lesson moves

Bronze becomes locally makeable, so the *"you must import"* lesson
relocates to the demand side, where it is stronger: **Terminus depends on
one tin source and the players are standing on it.** A chokepoint the
miners hold is better play than a dependency they suffer, and it hands
the arc a second motive — **Veshko's buyout is not for "a mine," it is
for the only tin**, alongside the throat (§ *Who owns what*).

### The two rejected homes

- **The Weeping Moor** — granite moorland under permanent storm, almost
  too apt (stream tin is Dartmoor). But it is a **two-room weather
  demonstrator** whose own docstring says it deliberately has no inbound
  exit "keeps content-area standup clean," and alluvial tin needs
  **placer**, which is parked.
- **An off-map importer with a price** — ruled out on this slate's own
  doctrine. *Every finished good is a faucet too*; closing the ingot
  faucet while opening a tin faucet is the same anti-pattern one layer
  sideways.

### ⭐ But bank the moor as the monopoly-breaker

Cornwall's tin monopoly ended when Malayan and Bolivian tin undercut it —
what happens to resource chokepoints. So when placer ships, the moor
becomes a **stream-tin district that breaks Rejection's grip**: a second
venue that matters for what it does to the first one's *prices*, not
because it is more mine, and the natural home for the parked placer
mechanic.

---

## ⭐⭐⭐ The demand side — what the metal is FOR **[DECIDED]**

*(The 2026-08-31 audit is stale and classes A and B SHIPPED — 10 mining tools,
2 forestry, 1 fuel, 5 smelting, 14 smithing recipes; crafting.md. Class C
remains.)*

### Three demand classes, in build order **[SCOPE — user's call: A then B]**


**C. Domestic and building metal — the cross-build demand.** Locks and
keys (the [credential](../../subsystems/credential.md) substrate ships
lock/key + `presentsKey`), lamps, pots, hinges, nails, bar and sheet
stock. Residences is landing homes with nothing to fit out and
[furnishing](../../subsystems/furnishing.md) ships `place`. **A lock is
the most demanded metal object in any settlement and is currently
unmakeable.** Rides along wherever it touches residences.


---

### ⭐⭐⭐ Recipe scope — the ladder is the constraint, not the count **[DECIDED — closes Open 9]**

*(Gating and waves A/B SHIPPED — the deed gate is the only gate, crafting.md
§ *The knowledge ladder*; 18 recipes across mining/forestry/fuel/smelting and 14
in `trade-smithing`.)*

#### Two things ruled OUT of v1

- **Stock forms** — bar, rod, sheet, wire, nails. Real smithing
  intermediates that would let recipes compose, but under *every recipe is
  a rung* they multiply the count **without adding rungs**. Defer until
  something needs sheet specifically.

---

## ⭐⭐⭐ The build's shape — what must ship together **[DECIDED]**

*(SHIPPED, including the NPC crew — the `delves` producer brain → mining.md
§ *The producer beat*.)*

---

## Open

*(All ten closed 2026-08-31; the record is in git.)*

*(Retire when: this promotes to formal requirements for a metal-chain
build, or folds into the Rejection venue build that adopts it.)*
