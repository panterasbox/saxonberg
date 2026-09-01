# Metal chain, Stage A — the copper rung — requirements

The mine, the fuel yard and the smelter that turn ground into a copper
ingot, and the tools a player makes from it. This build exists to close
the **metal-import era**: today `world-seed`'s
`terminus/general-store/counter.yaml` stocks iron ingots from nowhere, and
`trade-smithing` works from the ingot up with nothing beneath it.

**Stage A is everything above the water table** — the oxide copper cap,
worked from an adit. That boundary is not a project-management line: an
adit drains by gravity, so there is no shaft, no hoist, no pump and
therefore no drainage commons; and the oxide cap is *physically located*
above the water table. Geology, engineering, the tech ladder and the
economics all put the cut in the same place, at the deposit's
`waterTable`.

Seeded by [metal-chain-slate](../slates/builds/metal-chain-slate.md) (the
chain and its chemistry), [mining-slate](../slates/builds/mining-slate.md)
(the machinery), [rejection-slate](../slates/builds/rejection-slate.md)
(the venue) and
[field-substrate-slate](../slates/builds/field-substrate-slate.md) (the
pattern the geology field instantiates).

---

## Goals

- **A player can find copper by inference, not by luck.** The ore body is
  a plane whose parameters exist before anyone looks; surface staining,
  float and three-point measurement narrow it; and a survey that comes
  back barren is a legitimate, informative outcome.
- **The ground is a total, deterministic, unstored function.** Every cell
  in the mine has hardness, mineral and grade whether or not anyone has
  been there; the same cell always answers the same way; nothing is
  persisted but mutation.
- **A carved working persists if and only if it is shored.** Provisional
  ground culls and regenerates identically from the seed; Held ground
  survives logout and redeploy; shoring is the act that writes the record.
- **Charcoal is a judgment craft with a real failure mode.** A burn is
  watched over game time, airflow is the decision, and it can be lost.
- **Copper comes out of the furnace in the quantity the lump actually
  held.** Yield derives from the ore's grade, not from an authored recipe
  constant, so a lean lump honestly makes less metal.
- **A player-made copper tool exists, and the mine's own tools are among
  them** — the chain closes on itself: the pick you swing is forged from
  metal somebody dug.
- **The copper import is closed.** Nothing in the shipped world mints
  copper stock from nowhere once this lands.
- **Title is real and cannot be forged from content.** A claim is a parcel
  record; the mine's estate can be severed from the surface above it; and a
  cut lump carries its owner from the face to the scale.
- **The venue functions as a place of work**: buy tools and lamp oil,
  record a claim, sell ore for money, recover between shifts.
- **The chain is four businesses, and money circulates rather than
  appearing.** A player earns by wage or by working a claim they hold; the
  smelter buys ore out of ingot revenue; no new money is minted anywhere in
  this build.
- **Neglecting ground support costs you access to your ore, not your
  life.** An attentive player cannot be hurt.
- **A heading you drive without through-ventilation goes bad.** Air is a
  function of the workings' own topology, so planning a connection is a
  real decision and not only a convenience.
- **The mine is inhabited.** Ore moves on a pit pony rather than only on
  your back; a canary reads the air by behaving; and the upper workings
  have a resident ambient life whose silence is itself a reading.
- **Surveying is what earns the geology discipline**, at world-derived
  difficulty.

## Non-goals

Each is deferred to a named stage or slate, not dropped.

**Below the water table — all of Stage B.** No shaft, no hoist, no
`LiftMixin`; no pump, drainage, free-rider problem, hoist toll, levy or
district `Organization`; no `JobBoard`/`CrewBoard`. The adit makes every
one of these unnecessary rather than merely postponed.

**The rest of the metal ladder.** No sulfide ore and therefore **no
roasting**; no iron, no bloomery, no steel, no bronze, no tin, no silver.
Stage A ships the *easy* rung of the smelting ladder only.

**Collapse.** Prevention ships; **entrapment, the rescue clock and
"answer the call" do not** — deferred until the player population can
support a collective rescue (user's ruling). No cascade, ever, in this
build.

**The deep and its cast.** No apex (dirt dragon) and no life cycle
(whelps, firedrakes); no **middle or deep ecology band** — no pale
crawler, lattice-spider, olm or lantern-moth; no aether-touched fauna; no
the Hush. *The upper band and the working animals ARE in scope — see
Goals.* No **Val, Earl or Rhonda** and no LLM-driven NPCs — the *Tremors*
cast and its routines are a later build
([llm-content-slate](../slates/builds/llm-content-slate.md)). Stage A's
NPCs are functional only (registrar, buyer, storekeeper), canned.

**Wave B and beyond of the demand side.** No arms or armor recipes (the 14
uncrafted `generic-objects` templates), no domestic metal, no stock forms
(bar, sheet, wire, nails).

**Light.** No burn-time or fuel economy for portable lights —
`PortableLight` defers that to the combustion build and Rejection's glowcap
decays rather than burns. No colour-of-light effect on identification
beyond the shipped band gate.

**Client and UI.** No map, no minimap, no mine plan view. The survey card
is the only client surface this build adds.

**The title tail.** No coordinate-extent parcels; no ore theft, detection
or reckoning (nor **high-grading** as a punishable offence); no title lapse or abandonment adjudication; no `sell`-coupled
parcel payment (property phase 1).

**The economic tail.** No **tribute** pitches and no setting-day auction
(Stage B, with the shaft that makes a grant worth something); no price
discovery — seeded starter prices only; no solvency or wage balancing; no
CB lending tier, which this build removes the need for.

**Adjacent parked mechanics.** No placer/panning, no coal or coke, no
beneficiation past hand cobbing (crushing and washing want water
infrastructure), no `Deposit` reuse across mines, and **no
procedurally-minted chamber zones** (see § *Natural chambers*).

**Not touched.** `packages/content/terminus/` and `lib/location/` are
build-2's until residences merges; `lib/husbandry/`, `lib/retail/` and
`world-seed` are build-3's until farming merges.

---

## Surface decisions

### The stage boundary is the water table

Stage A works the oxide cap from an adit. Everything the deposit places
below `waterTable` — sulfides, silver, tin, and the drainage that makes a
commons — is Stage B or C. *Rationale:* the boundary is a fact about the
ground, so the scope cut needs no defending and the later stages need no
rework.

### The mine is one 3D `CartesianZone`

Coords `(x,y,z)`, z negative going down; atmosphere a continuous function
of depth; "levels" an organizational convention. **A `SphericalZone` was
proposed and retracted**: the vein dips but the *workings do not*, because
level drifts and vertical winzes are what haulage and drainage require.
The honest model is a continuous geology field under discrete orthogonal
workings, and closing the gap between them is the craft. (Build-3's fields
stay spherical; a field is a bounded area whose size you choose, a working
is a cell you cut through rock.)

### Room identity: keyed members, never minted templates

Per residences **D17** — *every `templatePath` resolves to a row* — the
authored spine is **static singletons**, every carved room is a **keyed
member** `(scope = one of four type rows, key = the cell coordinate)`, and
the geology has no identity at all. **The key is the coordinate**, which is
also the survey address and the MQL `address` atom: one fact, three faces.
Build-2's `:members` + `key`/`address` locator is reused as-is; **this
build adds no MQL**.

### Geology is a seeded field on an authored `Deposit`

The **model** is a pure-data `Deposit` `Idea` (the `Biome`/`Material`
shape); the **instantiation** is the mine zone naming it, with the seed
derived from the zone's address rather than authored (the
`WeatherLogic.localitySeed` precedent); the **values** are computed and
never stored. Authored structure — the lode's strike, dip, thickness,
extent, the zone depths, the depletion band, feature pins — over seeded
per-cell detail.

### Ore grade: composition for the kind, a field for the lump

`Material.composition` fixes what a *kind* of ore is; because `Material`
is **singleton-by-templatePath**, the varying per-lump grade is **one new
field on the ore object** — a fraction, and explicitly *not* `GradedMixin`,
which is the quality band `poor…masterful`.

### Surveying contributes channels, not verbs

`measure` already reads one number off a channel where you stand **and
already gates channels on instruments** (*"altitude, shadow need a sextant
or sundial"*); `analyze` already breaks a channel down with provenance. So
Stage A adds `measure strike`, `measure dip` and `analyze ground` as
**subcommands on shipped verbs**, plus the instruments that gate them. No
new verb, no new category, no new affordance surface.

### `survey` is the mirror; the geological read is the measurement

Residences ships **`survey`** as a platform verb — *"take stock of the
place you're standing in"* — and its contract is explicit: *"the survey is
a mirror, not a score."*

⭐ **The mine answers it, for free.** `SurveyController` reads its holding
half duck-typed by shape through the `WarrenMember` back-ref, so
`MineWarren` answering that shape makes `survey` report honestly in a
working — *a stope, shored, on claim 3* — with no kernel change and no
platform edit.

⚠ **But the geological read is not `survey`.** It is instrument-mediated,
competence-banded and load-bearing — the opposite of a read nothing is
gated on — and `survey` takes no target and no channel. Three layers, not
one: **`survey`** the mirror · **`measure <channel>`** the measurement ·
**`analyze ground`** the interpretation.

### Competence buys resolution, never outcome

`assess` is the template — *"a novice reads only the gist… a practised eye
reads the site and severity."* The error bar on a reading **is** the
competence (`040 ± 15°` vs `041 ± 3°`, same lode); competence also decides
whether an inference is available at all (three green rocks vs three points
on a plane); and competence **never touches the ground**. A better
prospector does not get more ore from the same rock — he knows where to
point.

### Recipes: open canon, earned shorthand, and every one a rung

Gating is already decided by `crafting.md` and is not re-opened: recipes
are open information, reading or watching mints the known-of claim, and
only a first faithful **by-hand** performance mints the can-make deed.
**Nothing is secret and nothing is taught-gated.** A recipe ships iff (a)
an act this build introduces demands the object and (b) it fills a
difficulty rung the branch lacks — *the recipe tiers are the ladder a
learner climbs*.

⚠ **Mining's `hew`/`drive`/`sink`/`raise`/`shore` acquire no deed gate.** They are labour,
not craft.

### Ground support: prevention only, and failures land on faces

Shoring is a **placed `Durable` object**, maintained on the shipped repair
economy — not a flag. **Falls happen at faces, not rooms**: a face is
blocked and cleared by an engagement, so nothing cascades and nobody is
buried. Neglect is punished by **refusal** (bad ground stops work, and says
why) plus loose falling (a blocked face, a broken lamp, a bruise).
Stability is derive-on-read `f(span, ground, support, water)` — **a
threshold, never a roll.**

### The venue: as much town as the mine needs to work

The pithead, and it is a settlement's worth of function without being a
settlement: **Pithead Yard** (the hub) · **Claims Office** (record a claim
— teaches title) · **Assay Shed** (sell ore; money enters the venue here)
· **Provisioning** (tools, lamp oil — money leaves, and the light
dependency is taught before descent) · **The Dry** (recover: reserve,
thermal, a social beat). Underground: the adit and the three authored
Upper Gallery rooms, then procedural workings. Separately sited, a short
walk off: the **fuel yard with its coppice** and the **smelter beside it**
— because you burn more mass of charcoal than you smelt of ore, so the
smelter sits near the fuel. NPCs are functional (registrar, buyer,
storekeeper) and canned.

### ⭐⭐⭐ The governing separation: the trade is mechanism, the locality is expression

> **The trade is what makes a mine WORK. The locality is what makes a mine
> THIS mine.**

Rejection is the **first** mining town, not the only one — a reference
implementation other authors copy and diverge from. So the line is drawn
by a falsifiable test:

> ⭐ **A second mining town must need ZERO pack code.** If making a mine
> look, read or feel different requires touching `trade-mining`, the wrong
> thing is in the trade.

And the corollary that makes the exemplar work:

> ⭐⭐ **Code is shared; content is copied.** A second mine *imports* the
> three trade packs and *copies and diverges from* `rejection`'s rows.
> Copying content is the intended path; copying code is the failure.

**The trade states needs; the locality binds them.** The shipped mechanism
is the **venue archetype** (`archetypes/*.yaml`) — *"what a venue NEEDS, as
capability slots… each with the default row `materialize()` binds,"*
**reported, never enforced**. `content-pack-units.md:94` already assigns
mining a *"mine archetype"*. So `trade-mining` ships one naming the slots a
working mine requires — light, haulage, support, assay, survey, a place to
sell — and Rejection binds each with its own rows.

⭐ The demonstration that this is real rather than decorative: the
archetype says *you need light underground*. **Rejection answers with
cultivated glowcap; another mine answers with oil lamps.** Same slot,
different world.

#### Three consequences that move content out of the trade

1. ⭐⭐ **The four procedural room type rows (`Face`/`Junction`/`Stope`/
   `Fall`) are LOCALITY content, not trade content.** If they lived in
   `trade-mining`, every mine's procedural workings would read identically
   — mechanism leaking into aesthetic. `MineWarren.createMember()` takes
   them as **policy**, which is exactly what `Warren`'s abstract hooks
   exist for. A second mine supplies sandstone galleries or ice caves and
   the machinery does not care.
2. **The ecology splits on function vs character.** *Revising the earlier
   all-seven-in-the-trade decision:* the **pit pony and canary are
   functional** — haulage and air-reading are needs of any mine — so they
   ship in `trade-mining`. **The crickets, delve-rats, pale grazer and
   glowcap are the character of this place's ecology** and ship in
   `rejection`. A second mine writes or copies its own fauna.
3. **Prose vocabulary is locality.** How a seam or a back *reads* rides
   **descriptor banks** (the `arcana` precedent), authored per venue. The
   materials it names stay commons; the voice does not.

#### What stays in the trade

The acts (`hew`/`drive`/`sink`/`raise`/`shore`), `MineWarren`'s policy
machinery, the
`Deposit` **class**, the ore lump and its grade field, the instruments,
the tool recipes, the `geology` Discipline, the archetype, and the two
working animals. **Everything that answers "how does mining work" —
nothing that answers "what is it like here."**

### Pack layout: three capability packs and one locality pack

`content-pack-units.md:94` already ruled the split for mining — *"pack =
materials · recipes · tools/stations · mine archetype; **venue = rooms +
warren root + SEED field**, parcel = the mineral claim."*

| Pack | Kind | Holds |
|---|---|---|
| **`trade-mining`** | capability (ships `src/`) | the act controllers (`hew`/`drive`/`sink`/`raise`/`shore`), **`MineWarren`** (the `Warren` subclass supplying mining's policy), the `Deposit` **class**, the ore lump, the survey instruments, tool recipes, the `geology` Discipline, **the mine archetype**, and the two *functional* species (pit pony, canary) |
| **`trade-fuel`** | capability | the coppice, the burn, charcoal |
| **`trade-smelting`** | capability | the furnace acts, the smelt recipes |
| **`rejection`** | locality | the two zones, the pithead's five rooms, the adit + three galleries, **the four procedural room type rows**, **the `Deposit` row**, the claim field, the fuel-yard and smelter sites, the functional NPCs, the cave biome's occurrence table, **its own ecology rows** (crickets, delve-rats, pale grazer, glowcap), and its **descriptor banks** |

**`hearthworks` is the exact precedent** — a venue pack composing
`trade-smithing` + `trade-hearth-cooking`. `rejection` composes the three
new ones the same way, which is what makes a *second* mine a second
locality pack over the same trades rather than a second build.

⚠ **The deposit row is venue content, not trade content.** A deposit is a
place, not a trade; `content-pack-units` assigns the seed field to the
venue. The `Deposit` **class** is kernel; `trade-mining` ships no orebody.

### Species: taxonomy is a commons PATH, ownership is a review unit

Build-3 stated the rule in its own `pack.yaml` — *"a trade's domesticates
ship in that trade's own pack, landing in the same `/stuff/idea/species`
commons… the rows travel with the trade that domesticates them"* — and
its crops sit at full Linnaean paths inside `trade-farming`.

**Species split on function vs character**, per the governing separation
above: the **pit pony and canary ship in `trade-mining`** (any mine needs
haulage and a way to read air); **the crickets, delve-rats, pale grazer and
glowcap ship in `rejection`** (this place's ecology, which a second mine
should be free to replace). All of them land at the `/stuff/idea/species`
commons **path**, and `species-and-names` — a pack whose organizing
principle the user wants to revisit — does not grow.

⭐ **This is safe because pack ownership ≠ path namespace.** Nothing
references a pack; things reference `/stuff/idea/species/…`. Relocating
rows later is a file move plus a title-claim edit, with no path changes
and nothing to migrate. **A mining build must not quietly decide the
content-architecture question**, which is: whether the commons keeps only
the *skeleton* (clades, body plans) while every concrete species ships
with the pack that gives it a reason to exist, and whether that skeleton
belongs beside materials in `base-library`. Deferred, deliberately.

**Occurrence is a biome fact, not a species fact** — *author the biome,
override the exception* ([discovery-slate](../slates/builds/discovery-slate.md)).
A species row says what a thing *is*; the mine's depth-banded biome says
what lives *there*. Species cannot ship with biomes because the same
species occurs in many (rats are in the mine and the city).

### ⭐⭐ The business layer — who owns, who employs, who buys

A chain with no institutions is a set of verbs. Stage A ships **four
`Business` Ideas in a row**, which is what makes *"the seam between packs
is a market"* an observable fact rather than a claim:

| Business | Buys | Sells | Employs |
|---|---|---|---|
| **the Ferrow co-op** | timber, tools | ore | on **tutwork** |
| **the fuel yard** | — (works its own coppice) | charcoal | a burner |
| **the smelter** | ore + charcoal | copper ingots | a smelterman |
| *(shipped)* the Hearthworks smithy | ingots | tools and gear | — |

⭐⭐ **The loop closes inside Stage A**, and the miner is the last customer
as well as the first producer: **mine → smelter → smith → miner**, because
picks wear out. Nothing circular about it — it is a real cycle with a real
sink (`Durable` condition).

#### ⭐ No ore-buyer, no CB lending, no endowment

`ferrow-delving.md` §9 funded the off-take buyer through **CB *lending***
and flagged that it *"needs the deferred banking lending tier."* **That
dependency is gone.** The seam existed only because smelting was the v1
abstraction boundary — and this build removes that boundary by building
the trade. **The smelter buys the ore**, out of revenue from ingots, which
is ordinary circulation through the shipped banking engine.

Conservation is therefore satisfied without argument: **no new money is
minted anywhere in this build.** The mine makes new *matter*; the CB
remains the only mint; wear is the matter sink.

#### Two ways to earn, and the third is deferred

- **Tutwork** — wage or piece-rate for development and cutting, straight
  on the shipped employment engine (the co-op is the Business, you are on
  the roster). Zero capital, steady, no title. Paid in coin; ore sold on
  **consignment** at the assay shed, with payment on assay.
- **Working your own claim** — parcel title through the Claims Office,
  and ⭐ *in Stage A an independent needs the co-op for nothing*: with an
  adit and no shaft there is no throat to pay a toll at, so you walk your
  own ore out. Historically exact for adit-level workings, and it gives
  Stage A a genuine second path without any of the political layer.
- **Tribute** — a granted pitch for a share of ore value, and the
  setting-day auction that prices it — is **Stage B**, with the shaft and
  the commons that make the co-op's grant worth something.

#### Where the rows live

**The four Businesses are `rejection` content**, per the governing
separation: *whose* mine and *whose* smelter is this venue's institutional
fact. `trade-mining` ships no Business of its own.

#### Pricing is parked

Per the bible, *"pricing PARKED — the market onramp (price discovery from
zero) is a platform-economy problem."* Stage A ships **seeded starter
prices** on the offers and does not attempt discovery. Solvency tuning —
whether a co-op can actually pay its wages out of ore revenue — is a
**balance** question against a running game, not a requirement of this
build.

### Title: claims, the split estate, and who owns the ore

**A claim is a `ParcelRecord`** — the shipped real-property layer, written
**only** by the gated `ParcelApi` and **never declared in content**. That
security invariant is not incidental here: ownership lives outside the
editable collection precisely so a content edit cannot forge a title, which
is exactly the attack a claim field invites.

#### ⭐⭐ The split estate needs no new substrate

The venue's property lesson — *the surface was granted, the minerals were
claimed* — falls out of a decision already made for other reasons:
**the surface pithead and the mine are different zones, therefore different
paths.** Parcel ownership resolves by **longest prefix**, so:

- with **no** parcel at the mine's path, the surface holder owns what is
  beneath — which is exactly an **unsevered** estate;
- **severance is `subdivide`** — minting a parcel at the mine's path with a
  different owner.

The whole pedagogical payload is the shipped resolution rule applied to a
zone split we were making anyway. **No coordinate-aware parcels, no new
title concept.**

#### Land use is `industrial` — no vocabulary widening

`LAND_USES` is a **closed six** (residential · agricultural · commercial ·
industrial · civic · wild). A mine is **`industrial`**, which matches
[zoning-slate](../slates/builds/zoning-slate.md)'s own definition —
*industrial is defined by what leaves*. Ore leaves. Nothing to add.

#### The parcel grants the right; the ledger records the fact

Two different questions, two different homes:

- **"May you drive here?"** — the parcel. Title, checked through
  `AccessApi`.
- **"Whose working is this?"** — the **carved-set ledger's `holder`**
  (`{cell, tier, holder}` on `MineWarren`).

#### What a holding is, and why the mine is not one yet

> **A parcel answers *whose is it*. A holding answers *what is on it and
> what use is it held for*.** A holding is **a parcel being put to a use**
> — tenure plus purpose — and `landUse` names the purpose: rooms serve
> residential, fields serve agricultural, workings serve industrial. The
> weathering shell is a *residential* concern that rides the general class,
> not a defining property (a field has no paint).

⭐ **Conceptually the mine IS a holding.** Stage A does not use
`HoldingWarren` for one reason only: it is **residence-pack content**, and
a trade pack must not depend on a residence pack. **Direction of travel:
the abstract holding belongs in core, like parcels — the residence pack
ships *residential* holdings, industries ship *industrial* ones** — and
the graduation is **Stage B**, with mining as the second consumer per the
two-consumers rule. Stage A's keys are chosen so that adoption is a base
swap.

⭐ **A claim is STAKED, not bought** (decided 2026-09-01). `title buy` is
buying from a catalogue; **staking is a first-come registration** — you
find ground, post a notice, and the recorder writes it down. So mining
ships its own **`stake`** verb, afforded by the Claims Office counter,
calling the gated `ParcelApi` to subdivide beneath the mine's extent and
transfer to the staker. No `PlatBook` (it is residence-pack content now),
**no residence-pack dependency**, and the security invariant is untouched.

⚠ **The constraint on the cell↔claim mapping stands.** Parcels are titled
over **paths**; a claim is a **region of coordinate space**. The mapping is
**declared on the warren** rather than derived from geometry, and ⚠ **do
not invent coordinate-extent parcels** — that is a property-substrate
build, not a mining one.

#### ⭐ Who owns the ore once it is cut

The third institutional question, and the one that makes ore theft
meaningful later:

- Ore cut **on tutwork** belongs to the co-op — *"the business keeps the
  ground and the ore."*
- Ore cut **on your own claim** is yours.

It rides [chattel](../subsystems/chattel.md) — per-instance ownership of
movables, `stamp`/`transfer`/`ownerOf` — so a lump carries its owner from
the face to the assay scale. **Stage A ships the stamping and the honest
sale; it does not ship theft, detection or reckoning** (Stage B, with the
co-op's grant and the district that adjudicates).

#### Lapse

*"Work your bounds or lose them"* has two halves. The **working** lapses in
Stage A — Held demotes to Provisional on neglect, already specified. The
**title** lapsing is governance: somebody must adjudicate abandonment, and
that is Stage B's district.

### Winzes ship, so climbing does

The oxide cap runs to `-45`, so **Stage A has real vertical extent even
without a shaft**: `sink` and `raise` ship alongside `hew`/`drive`, and a
winze is climbed rather than walked — **`climb` locomotion is in scope**
(the bible's U3 Winze Head teaches exactly this). What does *not* ship is
the **cage**: a called, capacity-limited lift is Stage B's shaft, and an
adit needs none.

### The matter model: ore is `Globbable`, and grade pools

Ore **stacks fungibly**, and **grade averages when lumps pool** — the
bible's ore-pass ruling (*"grade-mixing pooled + assay-averaged"*), and
literally what happens in a cart. **Assay is per-lot, at the scale.**

⭐ This sharpens *"true weight, true grade"* rather than weakening it:
**the lie moves from physics to declaration.** Ore that pools cannot be
audited lump by lump, so **high-grading** — pocketing the rich pieces
before the lot is weighed — is a real theft that works *because* ore
pools. Stage A ships **the pooling and the honest assay**; high-grading as
an *offence* (detection, reckoning, sanction) is Stage B, which is where
the co-op's grant and an adjudicator exist.

### The safety model, stated once: ground cannot kill, air can

- **Ground is non-lethal.** Refusal to work bad ground, a blocked face, a
  bruise. An attentive player cannot be hurt, and no player can be trapped.
- **Air is lethal**, riding shipped `respiration` and mortality's
  rescuable dying clock.

⭐ Air is the **right** lethal hazard for a build with no population:
it carries a **free continuous warning** (the canary's behaviour, the
crickets going quiet), an **obvious unilateral escape** (walk out), and
**needs no rescue** — so unlike collapse it does not wait for other
players to exist. Stage A's stakes live here and nowhere else.

### Selling ore: consignment, and the delay is the feature

A miner is paid through the shipped **consignment** path
(`consign`/`reclaim` over chattel) at the assay shed — **zero new
mechanism**, and historically exact: **you were paid after the assay, not
on the spot.** The wait is not friction to be smoothed; it is what makes
the assay an event. The co-op's own ore moves business-to-business through
banking.

### Survey knowledge is a per-viewer belief

What `analyze ground` learns lands in the **belief store's DISCOVERY
realm** — per-viewer, so two characters standing on the same outcrop know
different things. ⭐ That is the mechanism behind *"negative knowledge
still sells"*: **a survey record is an asset you can trade**, and it is why
private instrument readings are load-bearing rather than flavour.

### The one piece of client work: a pinned survey card

The three-point problem is played across three measurement points in three
places, so it needs a readable surface or it is trigonometry on scrollback.
Stage A ships **one pinned card** on the shipped card surface, accumulating
a character's readings for a deposit.

⚠ **Explicitly not a map or a minimap.** mining-slate assumed *"client
minimap fills on room-entry (general feature, mine rides it)"* — that
feature does not exist and is **not** in this build. The card is the whole
of the client work.

### Light and the sensorium

**Light follows the tier.** Spine rooms are lit by fixtures the co-op
maintains; a Held working is lit if **you** install and maintain one (a
placed `Durable`, the timber set's sibling); Provisional workings are
**dark**. Lighting a working is part of making it yours.

**Rejection's light is cultivated glowcap** — in the fixtures and jarred
for carry. The archetype's `light` slot ships **with no default**, so this
is the divergence point another mine answers with oil lamps. The consumable
survives biologically: the fungus **dies and must be replaced**, bought
from the mine's own fungus-farmer.

⭐ **The fine/coarse split, from a shipped table.**
`REQUIRED_BAND_FOR_DETAIL` requires `bright` for `fine` detail, and a hand
lamp is not bright. So underground you get the coarse read (*green staining,
a seam here*) and **not** the fine one — **judging grade by eye needs
daylight or an instrument.** That is why samples go up, and why the Assay
Shed is a surface room.

⭐⭐ **Losing your light is disabling, not lethal** — a lamp is a tool, not
life-support. In the dark you can walk, listen, smell and feel your way
out; you cannot hew, read a face, or shore. Consistent with the safety
model: ground cannot kill, air can.

**The other senses carry real routes.** ⭐ **Smell and the canary are
complementary, not redundant** — sour air announces itself, blackdamp and
CO do not, which is the historical reason for the bird. **Heft** is a
near-quantitative ore test with no instrument (`weigh` ships). **Knocking
is localization, not communication** — it says *someone is here, that way*
in a warren with no map. **Touch is the only sense that survives no light
and no sound**, which is what makes a lost lamp disabling rather than
lethal.

⚠⚠ **The aether reaches underground.** Implant comms keep their shipped
distance-free property; a dead room is at most a rare authored exception
with a friction-free step back into coverage. **Isolation is never a
difficulty mechanic** — the mine is hard through environment, economics and
epistemics, never by cutting players off from their peers. ⭐ And this
*strengthens* the deep-law's "answer the call": if you can always be
reached, failing to come is a choice rather than ignorance.

**And the mine is where the sensorium does real work.** The content bible's
*"reading the signs"* list is already multi-modal — a draught is touch,
drummy rock is hearing, foul air is smell before the canary. See
[mining-slate § *Light, and the sensorium underground*](../slates/builds/mining-slate.md)
and [instrumentation-slate](../slates/builds/instrumentation-slate.md)
§ *Perceive vs interpret*.

### Natural chambers are their own zones

The grid is right for **excavation** and wrong for anything nobody cut. A
cavern, a flooded stope, a gas pocket is not orthogonal, because no
haulage or drainage requirement shaped it — so a 10 m cubic grid
misrepresents it.

> ⭐⭐ **The grid represents what labour cut. A cavern was not cut. The zone
> boundary is exactly where the authorship of the space changes.**

So a natural chamber is **its own zone**, which the mine's grid exits into
and out of through an ordinary cross-zone exit pair (both sides explicit —
the counting-houses precedent). Inside it, the chamber may take whatever
geometry suits it: a `SphericalZone` of arbitrarily-placed volumes is the
natural fit, which is what that zone type is for — *"arbitrarily-placed
spheres with semantic exits."*

⭐ This also settles the retracted spherical proposal properly rather than
leaving it merely reversed: **the workings are Cartesian because labour is
orthogonal; the caverns are spherical because water and geology are not.**
The proposal was pointed at the wrong half of the underground.

⚠ **Constraint: a zone is a template row, so a zone minted per
procedurally-discovered chamber would be a rowless mint** — the thing D17
forbids. Therefore **Stage A ships authored chambers only**: one hand-built
cavern, reached by breaking into an authored feature pin, proving the
boundary works end to end. **Procedural chamber zones are out of scope**;
seeded pockets that are not authored stay grid cells with their own prose
until a later build decides whether chamber zones can be keyed instances
the way rooms are.

### Siting: its own locality pack, arrival by TPA

Rejection ships as **`packages/content/rejection/`**, following the
locality-pack precedent residences established. **No inbound exit is
wired** — arrival is by TPA, the moor/substation precedent that *"keeps
content-area standup clean"* — so **no file in `packages/content/terminus/`
is touched** and build-2 is not contended. The walked valley road lands
when residences merges.

### One MR, kernel waves first

Per the standing agreement, this is **one MR reviewed once**, not a kernel
MR followed by a pack MR.

⭐ **The kernel half is far smaller than a first pass assumed.** `Warren`
is *already* an abstract base in `lib/location/` whose subclasses supply
policy hooks, so `MineWarren` is an ordinary pack class; the carved-set
ledger is instance state on it; stability is a derive-on-read over that;
the `Deposit` class and the ore lump are pack classes (the `arcana`
`src/idea/material/` precedent). **Packs may freely *call* kernel Apis —
they simply may not *define* substrate**, and none of this needs to.

That leaves roughly one kernel item: **the survey channels**, since
`measure` and `analyze` are platform verbs whose views live in the
platform pack and whose controllers live in
`mud/platform/idea/cmd/perception/`.

⚠ **Two questions the planner must resolve against the code rather than
assume**, because both move the kernel/pack line:

1. **Can a pack contribute a *subcommand* to a platform verb**, the way
   content contributes whole verbs through `commandContributions`? If it
   can, this build's kernel footprint is **zero**. If it cannot, the three
   survey channels are the one kernel edit.
2. **Does the archetype `needs` vocabulary cover a mine?** It is closed —
   `tool` / `heatK` / `bulkSource` / `surface` / `seating` / `coldStorage`,
   validated by `Archetype.fromData`. A mine's needs (a way down, a place
   to sell) may not express in it, and widening the vocabulary *is* a
   kernel edit. Resolve before sizing the archetype wave.

---

## Constraints

- **`uncertainty.md`'s resolutional ban.** Nothing may roll to decide what
  an action did. The geology is seeded from position; stability is a
  deterministic threshold; a survey's uncertainty is **epistemic** — the
  player cannot see the number, but the number was always there.
- **Residences D17.** Every `templatePath` resolves to a row; no rowless
  mints. Carved rooms are `(scope, key)` keyed members of type rows.
- **Competence never multiplies yield, and nothing gates on a band**
  (farming's ruling, `advancement`). Disciplines change what you *learn*,
  never what the ground *gives*.
- **No migrations, ever.** No compatibility shims, no legacy adapters — a
  rename is a dropped database.
- **Module categories and the import boundary.** `trade-mining` is a
  capability pack shipping `src/`, importing the kernel only by package
  specifier; nothing under `src/mud/` imports outside the tree except the
  Api tier. **A pack must never require a kernel list edit** — group,
  root and title-root derivation must absorb the new pack.
- **Title claims.** `lint:untitled` requires every shipped template path
  to lie under some pack's `requires.title` claim; the new pack claims its
  roots.
- **The carved-set ledger rides `holder_snapshots`** via
  `PersistableApi`, so **no new Mongo collection** is introduced and
  `lint:schema` needs no new doc.
- **`requiresWizard` is TypeScript trust only** — never a stand-in for
  venue or content authority. Claim-office permissions resolve through
  `AccessApi` / parcel title.
- **The one resolved read.** Consumers read the resolved geology value,
  never a raw procedural branch, so an authored feature pin and a computed
  cell are indistinguishable downstream (weather's spine invariant).
- **Rock materials need `hardness`** before carve-cost can be priced;
  `rock/granite` ships without it and `rock/slate` does not exist.
- **`species-and-names` and `base-library` gain no new rows this build**
  beyond the four material additions (slate + three minerals), which are
  world-facts rather than trade facts.
- **Concurrency.** `build/residences` owns `packages/content/terminus/`,
  `lib/location/` and `api/mql/`; `build/farming` owns `lib/husbandry/`,
  `lib/retail/` and `world-seed`. This build touches none of them.

---

## Acceptance criteria

**The chain runs end to end, driven live.** A character walks to the
diggings, surveys, drives a heading, hews ore, dresses it, carries it to
the smelter, burns charcoal, smelts, and forges a copper tool — **in a
running server, not only in tests**. The drive is recorded.

**Determinism.** A cell's hardness, mineral and grade are identical across
two boot cycles and across an eviction/regeneration round-trip; a
Provisional room culled and re-entered regenerates the same tunnel.

**Persistence.** A shored working survives restart with its contents; an
unshored one does not and leaves no record. No template row is minted for
any carved room, and `lint:instanceable` passes.

**Grade is load-bearing end to end.** Two lumps of different grade yield
measurably different metal from the same smelt, and the difference is
visible through `analyze`.

**Surveying is inference.** Three surface measurements narrow strike to a
tighter error band than one does; dip is unobtainable from the surface
alone; a barren survey returns an informative negative.

**Competence changes readings, not the world.** The same cell assayed by
two characters of different competence returns the same underlying value
at different resolutions, verified by a test that asserts the *identity* of
the underlying figure.

**Support.** An unshored heading refuses further driving with a reason
naming the state; shoring clears the refusal; a face fall blocks a face and
never blocks a room, and no character can be trapped or killed by ground.

**Air and inhabitants.** A dead-end heading degrades in air quality and
recovers when connected through; the canary's behaviour tracks that value
and is the only free reading of it; a pit pony hauls a cart at a measurably
lower draft cost than a character carrying the same load.

**The stakes are real and legible.** A character who drives a dead-end
heading and stays experiences a degrading air reading with a free warning
ahead of it, can die if they ignore it, and can always walk out. No
character can be killed or trapped by ground.

**Survey knowledge is personal and portable.** Two characters on the same
outcrop hold different DISCOVERY-realm beliefs; a survey card accumulates
readings across measurement points and is legible enough to solve strike
from three of them.

**Title holds.** A claim is stakeable through the Claims Office and
transferable; the mine's estate can be severed from the surface parcel and
each resolves to its own owner; and **a content edit cannot mint or alter a
title**, asserted by a test. A lump cut on tutwork resolves to the co-op as
owner, one cut on a held claim to the holder.

**The economy circulates.** Ore sold to the smelter, ingots sold to the
smith, tools bought by a miner — with **no net money created**, asserted by
a test that totals the ledger across the loop. A character with no capital
can take tutwork and be paid; a character holding a claim can sell ore
without the co-op's involvement.

**The exemplar test.** A second mining town is demonstrably a locality
pack plus a deposit row plus room rows — `requires` the three trades,
touches no `src/`. Shown at least on paper in the build's docs, and the
archetype's slots are all bound by rows `rejection` owns rather than by
trade defaults.

**The chamber seam.** Breaking into the authored feature pin lands the
character in a separate chamber zone with its own geometry and returns them
to the correct grid cell, with the exit pair explicit on both sides.

**The faucet is closed.** No shipped content sells or spawns copper stock
from nowhere; a test asserts it.

**Lints and suite.** `lint:instanceable`, `lint:untitled`, `lint:imports`,
`lint:topics`, `lint:module-scope`, `lint:schema` and `lint:gates` pass;
the pack's own suite passes; the full suite is run **once**, at finalize.

**Docs.** A subsystem doc for the mining substrate exists under
`docs/subsystems/`, the four seeding slates are updated or retired per the
sweep rules, and `docs/vocations.md`'s miner / collier / smelter rows move
off **GAP**.

---

## Cross-references

**Seeding slates** — [metal-chain](../slates/builds/metal-chain-slate.md) ·
[mining](../slates/builds/mining-slate.md) ·
[rejection](../slates/builds/rejection-slate.md) ·
[field-substrate](../slates/builds/field-substrate-slate.md)

**Load-bearing subsystem docs** —
[crafting](../subsystems/crafting.md) (the knowledge ladder, the repair
economy) · [fire](../subsystems/fire.md) (`CombustibleMixin`,
`FurnaceMixin`, melting and `Casting`) ·
[weather](../subsystems/weather.md) (the field precedent and its seed
derivation) · [zone](../subsystems/zone.md) ·
[persistence](../subsystems/persistence.md) (`restoreOrSeed`, the
`(scope, key)` spine) · [parcel](../subsystems/parcel.md) +
[access](../subsystems/access.md) (claims and title) ·
[advancement](../subsystems/advancement.md) ·
[concealment](../subsystems/concealment.md) ·
[content-packs](../subsystems/content-packs.md) (the capability rung) ·
[uncertainty](../../docs/uncertainty.md)

**In flight elsewhere** — `build/residences` (D17, the MQL keyed-member
locator, the terminus pack) and `build/farming` (the growth model this
build's coppice and glowcap reuse).
