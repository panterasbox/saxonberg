# Farming — requirements

> **Status: requirements CLOSED (2026-08-31).** Every decision D0–D9
> was discussed and **LOCKED** with the user in conversation; D5's
> sub-items were resolved in a closing sweep (leans applied with the
> user's go-ahead — see D5). Next phase: plan.

Make farming an actual production chain. The libations build made the
bar's supply chain real from the cash-and-carry **down**; everything
above it is a spawn sweep — `trade-farming`'s own `farm-stock.yaml` says
so (*"the spawn sweep is the faucet, never a reset"*). Crates of limes
are census-spawned into the farm's Stock at `regionTarget`; a hand
consigns them; the bar buys them; nothing is ever grown. Meanwhile the
growing substrate is **shipped and idle**: `GrowingMixin` /
`CultivableMixin`, beds, soil, the land-use gate and the five
cultivation verbs carry exactly one crop (carrot) and two houseplants.

This build closes that gap: the eight produce materials the bar buys
(lime, lemon, orange, grapefruit, mint, cherry, olive, cranberry)
become **grown, harvested and brought to market** by the people who
grew them, and the census faucet for them is deleted. The core new substrate is the
**fruit cycle** (D1–D2) — seven of the eight are tree or shrub fruit
and mint is cut-and-come-again, so "a harvest ends the plant" (the
shipped rule, i.e. monocarpy) cannot carry this trade; the family
conventions already name the yield shape (the **standing tap**,
ranching-slate convention 4; farming-slate § Orchards), and the cycle
is its honest mechanism.

Seeded by [farming-slate](../slates/builds/farming-slate.md) and
[supply-chain-slate](../slates/builds/supply-chain-slate.md); built on
[husbandry.md](../subsystems/husbandry.md),
[smallholding.md](../subsystems/smallholding.md),
[retail.md](../subsystems/retail.md),
[employment.md](../subsystems/employment.md),
[residency.md](../subsystems/residency.md).

> **Scope boundary with the concurrent residences build (build-2).**
> This build owns the ground's PRODUCTION: `GrowingMixin` /
> `CultivableMixin`, plants, harvest, `trade-farming`, and the pack's
> own farm venue. Build-2 owns the HOLDER (PlatBook / LotHolder /
> DormWarren, interiors) and ALL Hinkley Hills content. Nothing in this
> build touches Hinkley, `residence.md`, or the keyed-holder / Hinkley
> sections of `smallholding.md`.

## Goals

- **The fruit cycle exists.** A mature, well-kept polycarpic plant
  flowers, sets, fills and ripens a crop repeatedly over game-time
  without being destroyed by harvest — the standing-tap yield shape,
  riding the shipped flowering latch on the reconcile-on-read engine.
- **All eight bar produce materials are grown.** Each has a plant + seed
  row in `trade-farming` riding the fruit cycle (citrus ×4,
  cherry, olive as trees; cranberry as a shrub; mint as a cut-and-
  come-again herb). Carrot stays the annual exemplar, untouched.
- **The census faucet for produce is closed.** No produce item or
  produce crate enters the world through the spawn sweep. A lime exists
  because somebody harvested it.
- **Farmland is real, buyable ground.** The Valley of Heart's Delight
  (D5): a rural locality whose plat book sells holdings a player can
  title, live on, and break into fields — a farm is also a residence.
  The NPC exemplar farm is one pre-sold holding, worked, with water
  and compost sources.
- **The chain runs unattended.** The farmer-proprietor tends, picks,
  and brings produce to market through literal verbs (the `consigns` /
  `restocks` precedent); the lounge keeper shops the farmers market
  for produce (D6). Steady state sustains the lounge's par draw (D9).
- **Quality is honest.** A harvest's grade derives from the plant's
  worst limiting stretch over the cycle that made the crop; a
  neglected cycle grades poor; nitrogen exports with the take.
- **Everything the NPC does, a player can do** — plant, water, feed,
  pick, carry to market, sell — with purchasable planting stock.

## Non-goals

- **Seasons / winter in the growth model** — the ∫weather integral and
  the sun→light driver are phase 4's (living-world-roadmap). Fields
  use authored ambient light, the Hinkley-yard precedent.
- **Spoilage / preservation** — the adjacent slate
  ([preservation-slate](../slates/builds/preservation-slate.md),
  phase 3). Harvested produce keeps, for now.
- **Genetics, cultivars, pollination** — farming-slate phase 2.
- **The aggregate field density** (grain, cane, staples) — phase 4's
  field-room. This build is the slotted/bed density only; the
  distiller's grain waits there.
- **Ranching / grazing** — its own slate; nothing here models animals.
- **The lounge's par sheet and the soda/coffee/ice stubs** — the 36
  `supplier:` fields and the four stub trades behind the distributor
  are the lounge/distilling side and unchanged here.
- **Fungible/glob produce** — supply-chain Part 2. Produce stays
  loose, discrete `Provision`s; consignment stays chattel-shaped.
- **The distillery consuming grapes/juniper** — a future distilling
  build (fermentation is its one new mechanic). This build only ships
  the crops (see D8).
- **Roads beyond the district** — Heart's Delight is real geography
  (D5), but the road network linking it to the wider map, and freight
  over it, stay with the locomotion/freight slates. The map *UI*
  (2D/3D) is its own work item; this build owes honest placement data
  (see D5's resolved sub-items).

## Surface decisions

### D0 — The suburban-garden invariant — LOCKED

> **A farm is a garden with more ground, never a different kind of
> thing.** Nothing this build ships may key a *capability* on
> `agricultural` land or on the rural district. What `agricultural`
> buys is quantity — bigger lot bands, more land-draw budget, and
> (phase 4, later) the field density. The mechanics are scale-free.

Same rank as *"a pot is a bed with one slot."* Concretely: a Hinkley
resident plants the same seed in their own yard's bed and gets the
same plant, window, grade; sells surplus at the same counter at their
own ask. The acceptance drive includes a **Hinkley-yard leg**
exercising every new mechanic with zero farm-specific anything — if
any step needs the rural district to work, the design failed. What the
invariant deliberately does NOT flatten is economics: a quarter-acre
yard tops out at a few beds of draw; making a living takes hectares —
area and land price doing their job, not a rule.

### D1 — Monocarpic vs polycarpic: the real split — LOCKED

The mechanical split is not a "perennial flag" — it is botany's own
taxonomy, chosen by the pedagogy test: **monocarpic** plants fruit
once and are done (wheat, agave — and effectively the carrot, a
biennial pulled in year one), **polycarpic** plants fruit repeatedly
(every tree, shrub, vine and herb in the roster). Harvest ends a
monocarp — the shipped rule, now with its true name and no special
path — and a polycarp re-enters the cycle (D2). All ten grown species
(the eight bar materials + grapes and juniper) are polycarps; the
carrot stays the monocarp exemplar, untouched. The houseplant is the
degenerate case for free: its flowering episode setting one seed is a
fruit cycle whose yield is the propagule.

### D2 — The fruit cycle — LOCKED

**Fruit comes from flowers, and a crop is a pulse, not a drip.** An
earlier draft here (continuous yield accrual at `limiting × rate`,
capped — a fruit faucet) was rejected on the honesty test: no bloom,
no season of readiness, fruit accumulating like interest. Instead the
shipped **flowering latch** generalizes into the cycle:

1. **Latch** — mature + thriving latches a flowering episode (the
   shipped rule, unchanged);
2. **Set** — the episode sets a **crop of authored count** (the
   houseplant's one-seed set is the degenerate case);
3. **Fill** — the set fills over authored game-days, scaled by the
   same limiting-factor minimum that drives growth (a starved cycle
   fills less — one mechanism, no second neglect rule);
4. **Ripe** — the crop reads ready; `harvest` mints it, each item
   graded off the **worst limiting stretch over THIS cycle** (the
   fruit on the tree was made during this cycle; last drought marked
   last crop), and pro-rates the nitrogen export to the take;
5. **Re-enter or end** — a polycarp returns to the cycle; a monocarp
   is done (the shipped harvest-ends-it path).

Reconcile-on-read only — the cycle advances in the same read-triggered
steps; no tick. Supply therefore arrives in **pulses**: with no global
season yet, every plant's cycle free-runs, so a many-field farm
desyncs into smooth aggregate supply while a single backyard tree
gives its owner a real harvest day.

**Dials with homes, shipped OFF** — the model reserves places for the
real orchard-keeping phenomena without building them now: thinning
(set count vs final size/grade), alternate bearing (a heavy crop
suppressing the next latch), per-stage stress sensitivities (phase 4),
and the over-ripe/drop window (**the preservation-family seam** — ripe
fruit waits patiently for v1; forgiveness first, per the family
contract).

**Refusals name the state**: a mature polycarp between crops refuses
with *nothing ripe yet* (never "still young"); dead zeroes any set and
stays terminal — the death floor applies to polycarps exactly as ever.

**Harvest accepts the GROUND — locked with this.** A plant seated in a
bed's slot is not keyword-reachable (smallholding's known issue), so
`harvest`'s target admits `GrowingMixin|CultivableMixin` and a
Cultivable target resolves to a ripe occupant — the `water the pot`
convention, closing the harvest half of that gap. `pick` joins as an
alias.

### D3 — Harvest mints the real item, graded AND marked; matter, not mark — LOCKED

**The mint.** A lime tree's `harvestTemplatePath` is
`/trade/farming/thing/lime` — the very `Provision` the bar's recipes
consume; harvest mints one per set-count. The authored
`gradeBand: fair` on the produce rows is demoted to the derive default
for a stocked scrap; a harvested item carries **this cycle's band**
and **the grower's mark** (the maker derives from execution context —
crafting's rule; `CraftedMixin` composed onto produce).

**The healed predicate — "the distinction is the material, not a
flag."** Crafting's gather refuses `Crafted` things as raw item inputs
(*"raw matter, not capital or a made form"* —
`CraftingLogic.isItemCandidate`), which made a marked lime
unconsumable — and the shipped Crafted carrot `Crop` already carried
the same latent tension (it cannot be cooked). But the gather's OWN
bulk branch states the true principle: a crafted pool bottle holding a
real material IS stock — *"the distinction is the material, not a
flag."* Locked: extend that rule to solids — **a marked discrete item
whose material is real edible matter is stock**. The mark records
HISTORY (who, when, how well); the MATERIAL decides candidacy; the
gather's real job — the anvil never feeds the forge — is untouched.

**Marks end at transformation.** The roast's mark is the cook's; the
inputs' marks are consumed, their contribution flowing through the
shipped **grade spread** (input grade shapes output grade) — no input
lineage tree, per the ledger's own rule that value is never traced
through a transform. The mill isn't on the menu; it shows in the
quality. Immediate expressiveness payoff: a famous grower's fine limes
make finer daiquiris today with zero new machinery — the substrate the
named-cultivar future, grower renown and farm brands stand on.

**Named future widening, not this build:** milled lumber as carpentry
stock by the same matter-not-mark rule.

**Regression gate:** the bar + hearthworks crafting suites must pass
untouched, plus targeted tests on the healed predicate (a marked
edible gathers; a marked tool still never does).

### D4 — The faucet closes; produce moves LOOSE to market — LOCKED

**The closure.** The census and the sweep are two things wearing one
mechanism: the census *counts* (observation), the sweep *injects* to
target. The crate rows author **`regionTarget: 0`** — permanently at
target, never drawn — keeping their `censusKey` so the count and the
price vocabulary survive while the pump stops. Their `populates:`
fruit lines and home `container:` go.

**The principle: wild matter may circulate; packed goods are only ever
made.** The spawn sweep remains *nature's* faucet — an authored zone
`stocks:` line for windfall berries in a forest is honest nature, and
it is the foraging seam waiting to happen (a deliberate per-region
authorial act, not a leak). What may never spawn is a packed,
processed good: a stenciled dozen-lime crate is human work, and making
that work real is what this build is for.

**Packing is DEFERRED — produce moves loose.** Farmers (player and
NPC alike) pick their own crops and carry them to market themselves; a
harvest travels as fruit in hand or a basket-load, not a packed case.
Crates and the packing act arrive with the carpentry-era widening D3
already names (lumber as stock → crate-making as a craft); until then
the crate rows sit inert — off the spawn table, dormant as content.

**The farmers market.** The direct-to-market path gets a first-class
venue: a **farmers market in town**, where growers sell their own
harvest at their own ask — the shipped consignment machinery in stall
form. This is supply-chain stage 1 made diegetic and local. Placement
and its exact shape (stall rows, caps, whether the lounge keeper shops
it for the bar's produce line) ripple into D6/D9 and are settled
there; the venue's existence is locked here.

### D5 — The land model: the Valley of Heart's Delight — LOCKED

Farmland is **place**, not a pack island: a farm is also a residence,
and farmland needs a rural locality of its own. (An earlier draft of
this decision put the farm venue inside `/trade/farming` hung off the
long meadow — overturned: that quietly decided farmland wasn't
buyable ground.)

**The locality — `terminus/hearts-delight`.** "The Valley of Heart's
Delight" — the Santa Clara Valley's orchard-era boosters' name, which
is diegetically exact: a land developer's pitch for farmland plats is
what a `PlatBook` *is*. The valley lies past Hinkley Hills (the third
Tiebout rung: city → suburb → rural), arrival at **Murphy's
Station** — the stop keeps the older name, as the real one did.
Unincorporated at first — no government until farmers want one, which
is itself the political-science content. Land gets bigger and cheaper
with distance (von Thünen, on purpose; the freight slate has been
waiting for it). The district is zoned `agricultural` via manifest
title claims (the world-seed Hinkley mechanism, no kernel edit), with
an agricultural lot band in **hectares** against Hinkley's 0.1 ha.

**Holdings.** The plat book sells non-uniform lots — a 1 ha croft
beside a 40 ha spread; price and area are per-lot data. At provision a
holding is **one room, the homestead** — build-2's holder machinery
*as reworked by the residences build* (their D16/D17: a keyed
`HoldingProgramme` admitted through the `LotHolder` seam; every room a
keyed instance of a real row; gate off the lane; farmhouse as prose,
or a floorplan when their interiors land here later). The rest of the
acreage is real in the ledger, prose in the world.

**Breaking ground.** A field exists only once you carve it: the
break-ground act buds a **field room** off the homestead, allocating a
player-chosen area from the holding's remaining acreage. The holding's
area is a budget; every field spends it; the allocation — how much of
your hundred acres goes to citrus vs cherries vs vines — is the
economic decision made mechanical. One crop per field is economics and
convention, never a gate (D0). Capacity derives from allocated area
through the shipped land draw.

**Identity: the farm is a Warren reading its own record.** One
*authored* field-room template; each field is a **keyed instance**
(`(scope, key)`, the `DormWarren.admit` pattern), budded by the
holding's holder from a **field ledger** (`{leaf, name, areaM2}`)
stored on the holding's persistence record. No template rows are
minted at runtime. Land use resolves correctly per holding because the
gate already reads a room's **persistence key over its template path**
(the rule the Hinkley build added). Fields are rooms, not child
parcels — title stays one row; selling the holding sells the fields;
`subdivide` remains the shipped path for actually selling ground.

**Geometry — the hybrid, and every room plots.** No free-floating
rooms: every location participates in a coordinate system.

- **The town fabric is cartesian** — the district is a `CartesianZone`
  (rural cells, larger than Hinkley's 6 m) holding Murphy's Station,
  the lane, and the homestead lots (the Hinkley lots-zone pattern
  verbatim).
- **Only broken ground is spherical** — the first use of the shipped
  `SphericalZone`/`SphericalLocation` model: one authored
  **`<district>/fields` SphericalZone** covers the shared field
  template (forced anyway — keyed instances resolve their zone through
  the one template's ancestry, the same fact behind Hinkley's single
  lots zone). Every field is a sphere: focus + radius, **radius
  derived from allocated area** (`r ≈ √(area/π)`) — the economic
  decision literally draws the map. Exits are explicit named labels
  ("go orchard"), authored by the holder, per the zone's own contract;
  the homestead→field gate is a named non-cardinal cross-zone exit
  (legal by the lot-gate precedent). Each holding's field cluster
  anchors at a focus **projected from its cartesian lot position**, so
  clusters cannot collide and the spherical map mirrors the town map;
  fields ring-pack around their anchor. **No-overlap is enforced by
  the break-ground act** against the ledger (the zone's focus index
  deliberately does not enforce it). The player meets the spherical
  convention only inside their own fields — the gentlest debut — and
  the 2D/3D map work gets honest placement data from every room this
  build mints.

**The NPC exemplar farm** is a pre-sold holding (the Hinkley lot-1
move) with three or four fields already broken — citrus, stone fruit,
vines, herbs — worked by its farmer-proprietor (D6), so the chain runs
from boot and the district's prose is true.

**D5 sub-items — RESOLVED** (the closing sweep; leans applied with
the user's go-ahead):

- **Break-ground is a real engagement** with real game-time; a coin
  fee stays an optional dial.
- **Field retirement** (back to grass, area reclaimed) — deferred, a
  named seam; a young game rarely un-farms.
- **`radius` → size scale**: verify at build time whether
  `SphericalLocation` drives the photometric/air/ranged scale from
  `radius` as cartesian `extent` does; wire it if absent (a small
  principled addition, done once).
- **Foci are auto-packed** v1 (the holder derives placement; the
  player chooses *area*); player-placed fields wait for the map UI.
- **The map is DATA-ONLY this build**: honest placement (focus +
  radius / coords) for every room it mints; the "your holding" card
  rides the map-UI work item, not this cycle.
- **Packaging per residences D18** *(supersedes the earlier
  world-seed lean — build-2's pack cut clarified the model)*: a new
  **`hearts-delight` locality pack** (root
  `/world/terminus/hearts-delight`) homes the district **whole** —
  geography, zone rows, title claims, Murphy's Station, the plat
  book/holder rows and any parked TS — depending on the `residence`
  capability pack (whose machinery its rows name, at the repointed
  `/residence/idea/…` paths) and on `trade-farming`, which stays the
  **trade**: species, plants, seeds, produce, process content, and
  the exemplar farm's cast. The farmers market venue is Terminus
  ground and homes in the `terminus` locality pack (this build adds
  the rows there; the farming tenancy — stall config, the farmer's
  beats — stays trade-farming, the locality-owns-place /
  trade-owns-process split). Where the cultivation-generic pieces
  (the field row, break-ground classes) home — kernel `lib/`,
  `trade-farming` `src/`, or `residence` — is the planner's call
  under D18's membership tests.

### D6 — The farmer-proprietor and the beats — LOCKED

**The exemplar farmer earns the residual, not a wage.** The pre-sold
holding is worked by **one farmer-proprietor NPC** whose income is the
**draw** — the compensation substrate's `residual` basis — teaching
enterprise income vs wage labor at the bottom of the chain, the bar's
P&L lesson inverted. (The waged-hand outfit shape stays available to
authors for larger holdings; both are shipped substrate. This replaces
the earlier appointed-outfit-with-purchasing-hand exemplar.)

**One new kernel brain — the producer loop**, the living-world
roadmap's own named gap ("no NPC produces anything today"), arriving
at its first real consumer. The `consigns`/`restocks` doctrine to the
letter: **literal verbs only** through `CommandApi.forceCommand`, the
same reads a player makes — look at the ground, `water`/`feed` what
needs it, `pick` what's ripe — then carry the harvest to town, sell at
the stall, come home. Bounded per beat; cadence-triggered; not
presence-gated; nothing it does is unavailable to a player. The
selling half is not new machinery at all: a market stall is the
shipped consignment surface, and the farmer listing at their own ask
is what `consign` does.

**The bar's route: the keeper shops the market.** The lounge's produce
par lines re-point their `supplier` from the distributor to the
farmers market venue; the `restocks` brain already goes wherever a par
line points, so she buys limes off a farmer's stall like anybody. The
four stub trades keep the cash-and-carry lane unchanged.

**Market placement: Terminus.** Von Thünen and the supply-chain
slate's Incoterms point ("the venue of the sale IS the delivery term")
both say the producer hauls to demand — the haul is the farmer's cost,
which is what makes distance economics real. A station-side stand at
Murphy's is future expressiveness, not v1.

**Named prerequisite — the commuting-cast persistence fix.** Found
live in the discarded branch, real regardless of design: a cast NPC
moving between two *persistable* rooms is captured into both rooms'
snapshots and restores twice (`expected singleton, found 2` at boot).
Any commuting farmer hits it. The principled fix was prototyped — the
cast is never a room-snapshot's content (rooms already skip live
avatars); it re-establishes from populates/roster on restore — and
lands in this build as spine work with its own tests.

### D7 — One growth model, two first-class entry points — LOCKED

> **The models support both ends: authored content that produces from
> first boot, and player-minted ground planted with whatever its
> holder wants. Neither is a hack around the other.**

**The authoring path** (the bar needs limes *today*). A pack can stand
up a producing farm **entirely in data**: the holding's field ledger
seeded in content (fields pre-broken), rows planted, grown state
authored per plant. Authored maturity is honest because the world
isn't born the day the server boots — authoring a bearing tree asserts
its *past care* — under one constraint: **authored states must be
model-consistent**, a state the reconcile could actually have produced
(plausible maturity, vigor, load; never fruit on a seedling). The
exemplar holding's fields ship established and bearing under this
rule.

**The player path** (the long term). Mint new ground, break fields,
plant anything — **no crop-to-district coupling, no regional
whitelist, ever** (D0 doing its job). Fit is expressed through
profiles — a bog plant sulks on dry ground because of its curves —
never through permission. The clock stands un-softened: ~a game year
to first citrus is the tenure lesson D5 locked, and the bridge income
is real horticulture's own answer — **fast cycles while trees
establish** (mint and the annual tier pay in days; the starter
experience teaches the market gardener's truth).

**The asymmetry is old ground vs new ground, and both are
purchasable.** The plat book prices a standing orchard above raw
acreage — turn-key at a premium, raw land cheap. Anyone buys history
at its price; the exemplar farm just happens to be old ground.

**The equivalence test.** An authored farm and a player farm are
**indistinguishable to every downstream system** — harvest, grades,
the market, persistence, the beats. If any consumer can tell which
path made the ground, the models failed.

**Named seams, not v1:** the nursery (buying a *sapling* — age at the
margin — instead of a seed); planting-stock retail placement is
content (seed packets sell at retail, the general store's gardening
line precedent).

### D8 — Grapes and juniper ship; grain does not — LOCKED

*Stub = downstream of production only* (the libations doctrine), and
the content-packs rule says *seed the economy backwards from shipped
sinks*: the winemaker and distiller stubs exist, their real upstream
inputs don't. The grapevine and the juniper shrub ride the fruit cycle
as two more species — **complete at their tier without the distiller**
(grown, picked, sold at the market, eaten: food and seasoning), which
is what never-half-grown requires — and stand as the first true
upstream matter waiting for the fermentation build. Grain and cane are
aggregate-density field crops and wait for phase 4, as non-goaled.

### D9 — Throughput is dials; the dials assert nothing — LOCKED

Every number is a placeholder for a running game (the husbandry
calibration stance): cycle lengths, set counts, beat cadences — all
profile/`AppSetting` data, freely retunable by authors. What the build
owes is two **observable truths**, not numbers:

1. the exemplar holding sustains the lounge's produce par at steady
   state through the market path — many free-running cycles desyncing
   into smooth aggregate supply (D2's pulse argument doing its job);
2. a single backyard tree gives its keeper a real harvest day.

Tests assert mechanism; the live drive asserts the steady state; **no
test ever pins a tuning number**.

## Dependencies & interfaces — build-2 (residences)

Read alongside build-2's `residences-requirements.md` (D1–D18) and
`residences-plan.md` (branch `design/residences`). Three facts govern
this build's sequencing and seams:

- **The plan splits in two stages.** *Stage A* — independent of
  build-2, buildable now: the fruit cycle, the healed gather,
  harvest-accepts-ground, the ten species, the farmers market, the
  keeper re-point, the faucet closure, the commuting-cast fix.
  *Stage B* — Heart's Delight itself — **depends on residences'
  Waves 0–5 landing** (the pack cut, the D17 identity split +
  `lint:census`, `HoldingWarren`/`PlatPlan`, `HoldingProgramme` +
  keyed placement, the LotHolder rework): building the district before
  the identity split would mint rooms on machinery scheduled for
  deletion (`asTemplatePath` is retired).
- **Break-ground is the programme's first runtime-member consumer**
  *(interface note to residences)*: their D16 defers *remodel* (editing
  a house floorplan); our field-budding is a different, act-driven
  axis — outdoor members added to a holding's set at runtime. Their
  programme's membership already "reconstitutes from durable rows" and
  "manages whatever exists under its extent"; the ask is only that the
  member contract stay open to runtime-added outdoor members, which
  farming's break-ground then consumes on their base rather than
  building beside it.
- **Their machinery this build consumes as-is**: the generative
  `PlatBook` + branched `PlatPlan` (a rural lane that grows as lots
  sell), keys at `title buy`, the ascent gate, `heldUnitsOf`,
  `survey` (condition + archetypes read naturally over a farm
  holding), and D18 packaging (our D5 sub-item).

## Constraints

- **Phase-2 behavior is invariant.** The annual path (carrot,
  houseplants, beds, pots, the five verbs) must pass its shipped suite
  untouched; the perennial arrives additively.
- **Reconcile-on-read only.** No per-plant tick or scheduler; the
  family clock (no far-past guard, step-cap-not-time-cap) governs the
  fruiting window like everything else.
- **Mutating acts capture their host** (`PersistableApi.captureHostOf`)
  — harvest on a polycarp now mutates a *surviving* plant and its
  ground; both must capture.
- **The land-use gate is honored, not bypassed** — the farm's beds are
  `fixedGround` on ground the manifest zones agricultural. No
  hard-coded venue exemption.
- **Template rows follow their pack's root conventions** (world-seed
  for the district, `/trade/farming/<branch>/…` for the trade); nothing
  instances `/lib/`; `lint:instanceable`, `lint:untitled`,
  `lint:topics`, `lint:imports`, `lint:test-content` stay green.
- **No new Api unless subsystem-shaped** — extend the husbandry surface
  (mixin methods + existing controllers); brains are
  `lib/behavior/<verb>.ts` modules (dont-mint-new-apis).
- **NPC beats use literal verbs** via `forceCommand`, with the
  `consigns` brain's hard-won guards respected (`get 1 <kw>` never bare
  `get`; bounded inventory; teleport home in `finally`).
- **No money legs in any sweep or reset path** (residency Law 2);
  consignment pricing and the settle chokepoint are untouched.
- **Reference data warm at boot** — anything the beats read at boot
  rides the pack's `boot:` entries (the reference-Ideas-inert-at-boot
  recurrence).
- **Worktree discipline**: stage by name, push every turn, one MR for
  the whole build.

## Acceptance criteria

- A polycarpic test plant, kept well, completes two successive fruit
  cycles without replanting; the second crop's grade reflects only the
  second cycle's worst stretch; the plant dies under sustained neglect.
- Harvesting the carrot still ends the plant; the phase-1/2 husbandry
  and smallholding suites pass unmodified.
- Harvested produce carries the cycle's grade band and the grower's
  mark; a well-kept cycle yields ≥ `fair` (the bar's recipe floor);
  a marked lime is accepted as a daiquiri input (the healed gather)
  while a marked tool still never gathers.
- Grepping the content tree shows no produce crate with region-targeted
  spawn placement; a booted world contains no produce that was not
  harvested (grove-authored plants aside); the spawn-sweep suite for
  the removed rows is updated, not deleted.
- Nitrogen: a harvest debits the ground pro-rata; `feed` restores it;
  an unfed orchard's grade sags via the nutrient factor.
- Live drive: from a fresh boot — grown produce reaches the bar
  through the market path the beats settle on (D6/D9); a drink whose
  recipe takes a lime is ordered and made with a grown, graded lime;
  a player picks their own crop and sells it at the farmers market.
  (One full-suite run at finalize; `test:near` + pack suites + lints
  gate the iteration loop.)
- Player path drives live: reach the farm, buy a seed packet, plant in
  admitted ground, water/feed, and (clock permitting via a test/dial)
  harvest.
- Docs: `husbandry.md` gains the fruiting-window section (the
  perennial deferred-seam note replaced); `trade-farming`'s README and
  `farm-stock.yaml`'s faucet comment updated; the farming and
  supply-chain slates' overtaken claims annotated;
  `content-packs.md`'s pack list line for trade-farming refreshed.
  Build-2's files untouched.

## Cross-references

- Seeding slates: [farming-slate](../slates/builds/farming-slate.md),
  [supply-chain-slate](../slates/builds/supply-chain-slate.md)
- Conventions: ranching-slate § the five shared conventions;
  [living-world-roadmap](../living-world-roadmap.md) (this build =
  the perennial/orchard tap + the production brain, riding phase 2's
  substrate; it does not open phase 4)
- Subsystems: [husbandry](../subsystems/husbandry.md) ·
  [smallholding](../subsystems/smallholding.md) ·
  [zone](../subsystems/zone.md) ·
  [location](../subsystems/location.md) ·
  [retail](../subsystems/retail.md) ·
  [employment](../subsystems/employment.md) ·
  [residency](../subsystems/residency.md) ·
  [crafting](../subsystems/crafting.md) ·
  [parcel](../subsystems/parcel.md) ·
  [content-packs](../subsystems/content-packs.md)
- Parallel build (residences, branch `design/residences`):
  `docs/requirements/residences-requirements.md` (D16 the programme ·
  D17 identity · D18 packaging) · `docs/plans/residences-plan.md`
  (Waves 0–5 are Stage B's dependency) — see § Dependencies &
  interfaces
