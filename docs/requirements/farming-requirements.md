# Farming — requirements

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
become **grown, harvested, packed and consigned** production, and the
census faucet for them is deleted. The core new substrate is the
**perennial** — seven of the eight are tree or shrub fruit, so "a
harvest ends the plant" (the shipped annual rule) cannot carry this
trade, and the family conventions already name the answer: the
**standing tap** yield shape (ranching-slate § the five conventions,
convention 4; farming-slate § Orchards).

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

- **A perennial exists.** A mature, well-kept fruiting plant yields
  repeatedly over game-time without being destroyed by harvest — the
  standing-tap yield shape, on the shipped reconcile-on-read engine.
- **All eight bar produce materials are grown.** Each has a plant + seed
  row in `trade-farming` riding the perennial mechanic (citrus ×4,
  cherry, olive as trees; cranberry as a shrub; mint as a cut-and-
  come-again herb). Carrot stays the annual exemplar, untouched.
- **The census faucet for produce is closed.** No produce item or
  produce crate enters the world through the spawn sweep. A lime exists
  because somebody harvested it.
- **The farm is a real venue.** Growing ground (grove + beds) on
  agriculturally-zoned, pack-titled land, with water and compost
  sources, reachable and workable by a player.
- **The chain runs unattended.** A grower NPC tends, harvests, packs
  and stocks through literal verbs (the `consigns` / `restocks`
  precedent); Wen's consigns beat carries packed crates to the
  cash-and-carry exactly as today; the lounge keeper's `restocks` buy
  is untouched. Steady state sustains the lounge's par draw.
- **Quality is honest.** A harvest's grade derives from the plant's
  worst limiting stretch over the window since the last harvest; a
  neglected window grades poor; nitrogen exports with the take.
- **Everything the NPC does, a player can do** — plant, water, feed,
  harvest, pack, consign — with purchasable planting stock.

## Non-goals

- **Seasons / winter in the growth model** — the ∫weather integral and
  the sun→light driver are phase 4's (living-world-roadmap). The grove
  uses authored ambient light, the Hinkley-yard precedent.
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
  discrete `Provision`s in crates; consignment stays chattel-shaped.
- **The distillery consuming grapes/juniper** — a future distilling
  build (fermentation is its one new mechanic). This build only ships
  the crops (see D8).
- **Farm geography** — no road network to the farm; reachability rides
  an existing travel mechanism (D5), and placing the farm on a drawn
  map is deferred with the locomotion/freight slates.

## Surface decisions

### D1 — The perennial is the mechanic; one shape covers all eight

Seven of the eight produce materials are botanically perennial, and mint
regrows from cutting; forcing them through the annual
harvest-destructs-the-plant rule would be dishonest and would make the
supply cadence absurd (replant an orchard per crate). The **fruiting
window** on `GrowingMixin` is the one new mechanic; every grown species
in this build (and the two D8 crops) rides it. The carrot demonstrates
the annual path is unchanged.

### D2 — The fruiting window: accrue under the limiting factor, harvest takes the window

A mature perennial **accrues yield** (a fruit/sprig count) during
reconcile, at an authored per-game-day rate scaled by the same
limiting-factor minimum that drives growth, capped at an authored load
(*"the tree is full"*). `harvest` on a perennial:

1. mints the accrued count of yield items,
2. grades them off the **worst limiting satisfaction over the window
   since the last harvest** (see below),
3. exports nitrogen scaled by the take (`nutrientDraw` per full load,
   pro-rated),
4. resets the window (accrual to zero, worst-tracker re-seeded),
5. **does not destruct the plant.**

The grade semantics **unify** rather than fork: `_worstLimiting`
becomes *worst since last harvest (or since planting)* for every
growing thing — an annual's window is simply its whole life, so the
carrot's behavior and phase 2's suite are unchanged by construction.
Reward-your-worst-moment is preserved per window: a drought between
harvests marks that harvest, and the tree carries no permanent scar
(vigor already models the lasting damage).

Flowering/seed-set (`onFloweringLatched`, one seed per episode) is
untouched — propagation stays the houseplant's loop. Neglect still
kills: the death floor applies to perennials exactly as to annuals; a
dead orchard is a replant.

No tick, no scheduler: accrual is computed in the same read-triggered
reconcile steps. Whether perennial-ness is a flag or the presence of
the fruiting profile fields is the planner's call.

### D3 — Harvest mints the real item, graded and marked

A lime tree's `harvestTemplatePath` is `/trade/farming/thing/lime` —
the very `Provision` the bar's recipes consume. Harvest stamps each
minted item with the window's grade band (`GradedMixin` already rides
`Provision`) and the grower's mark (the maker derives from execution
context, crafting's rule — compose `CraftedMixin` where needed). The
authored `gradeBand: fair` on the produce rows becomes the derive
default for an ungraded scrap, not the band every lime carries.

### D4 — Packing is a real act; the crate rows leave the spawn table

Fruit reaches the floor in crates via the shipped verbs (`get`,
`put … in crate`); the empty-crate template ships already. The
crate-of-X rows keep their census identity (`censusKey` keys the
consigns brain's ask table) but **stop being spawn candidates and stop
minting fruit**: their `populates:` fruit lines and region-targeted
placement go. The exact field surgery (vs. a candidate predicate) is
the planner's; the outcome is checkable — a produce crate is packed by
hand, never stood up by the sweep, and *"an empty holder is not
product"* already keeps a freshly-packed-empty crate out of the census.

Minting the empty crate at packing time is an **accepted packaging
abstraction**, at parity with bottles: the growing now costs somebody
the activity; the box does not (uncertainty.md's abstraction law).

### D5 — The farm becomes ground

The venue grows from a packing shed into a smallholding, all inside
`/trade/farming`:

- **A grove room** (and garden ground for the herb/shrub rows) —
  `FurnishableRoom`, authored ambient daylight bright enough for the
  citrus profiles (the Hinkley-yard precedent: `Location`'s flat light
  denominator + authored ambient; no sun driver).
- **Orchard rows and beds** as `GardenBed`-class **rows** at tree
  scale — bigger soil volume, tree-sized slot counts, authored
  `landRequirementM2`. No new class unless the planner finds one is
  forced; *a pot is a bed with one slot* generalizes upward.
- **Zoning by manifest**: the pack's `requires.title` entry for the
  farm's ground declares `landUse: agricultural` (+ `areaM2`) — the
  shipped world-seed mechanism, no kernel edit. The `fixedGround` gate
  then admits the beds honestly.
- **Water and compost sources** on the ground (standpipe
  `UnboundedSource`; a compost crib at the same tap-parity deferral —
  the finite-regenerating source stays the named deferred seam).
- **Reachability**: a player can get to the farm without wizardry,
  through whatever mechanism today reaches the cash-and-carry side of
  the trade venues (lean: a fast-travel node; planner mirrors the
  shipped precedent). The hand's teleport beat is unchanged.

### D6 — The grower: the family's first production brain

The farm outfit gains a **grower position** and NPC running a new
kernel `tends` brain — the production brain the living-world roadmap
lists as phase 8's enabler, arriving at its first real consumer. Like
`consigns` / `restocks` it drives **literal verbs** through
`CommandApi.forceCommand`: read the ground, `water` / `feed` what needs
it, `harvest` loaded plants, pack crates, `put` them in the farm's
Stock. Not presence-gated; cadence-triggered; nothing it does is
unavailable to a player. Wen Hartley's `consigns` beat is untouched.

### D7 — The grove ships established; a new tree is a real commitment

The farm's plants are authored at maturity with loaded fruiting windows,
so the chain is live from first boot with no authored crates. A
player-planted tree runs the real clock — on the order of a game year
(~a real month) to maturity — which is deliberate: the orchard is the
mechanic that makes land tenure real (farming-slate § Orchards). Seed
packets for every grown species are purchasable at the farm's own
counter (a `Stock` with `stockLines`, retail parity — the shop faucet
for *planting stock* is the accepted retail pattern; the deletion
doctrine targets the bar's *input* faucet).

### D8 — Grapes and juniper ship; grain does not

Two more perennials — the grapevine and the juniper shrub — ship on the
same mechanic as crops with no current consumer. They are distilling's
two hardest future inputs (supply-chain § the martini), they fit the
fruiting window exactly, and their marginal cost is a handful of rows.
Grain and cane are annual field crops at the aggregate density and wait
for phase 4. *(Cuttable if review wants the set minimal.)*

### D9 — Throughput is tuned against the lounge's par

Accrual rates, fruit caps, and beat cadences are dials
(`AppSetting`-backed where the husbandry precedent has dials) tuned so
the shipped grove sustains the lounge's steady-state draw with all
three beats running (tends → consigns → restocks). Numbers are
placeholders for a running game, per the husbandry calibration stance.

## Constraints

- **Phase-2 behavior is invariant.** The annual path (carrot,
  houseplants, beds, pots, the five verbs) must pass its shipped suite
  untouched; the perennial arrives additively.
- **Reconcile-on-read only.** No per-plant tick or scheduler; the
  family clock (no far-past guard, step-cap-not-time-cap) governs the
  fruiting window like everything else.
- **Mutating acts capture their host** (`PersistableApi.captureHostOf`)
  — harvest on a perennial now mutates a *surviving* plant and its
  ground; both must capture.
- **The land-use gate is honored, not bypassed** — the farm's beds are
  `fixedGround` on ground the manifest zones agricultural. No
  hard-coded venue exemption.
- **Template rows follow `/trade/farming/<branch>/…`**; nothing
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

- A perennial test plant, kept well, yields on two successive harvests
  without replanting; the second window's grade reflects only the
  second window's worst stretch; the plant dies under sustained neglect.
- Harvesting the carrot still ends the plant; the phase-1/2 husbandry
  and smallholding suites pass unmodified.
- Harvested produce carries the derived grade band and maker's mark;
  a well-kept window yields ≥ `fair` (the bar's recipe floor).
- Grepping the content tree shows no produce crate with region-targeted
  spawn placement; a booted world contains no produce that was not
  harvested (grove-authored plants aside); the spawn-sweep suite for
  the removed rows is updated, not deleted.
- Nitrogen: a harvest debits the ground pro-rata; `feed` restores it;
  an unfed orchard's grade sags via the nutrient factor.
- Live drive: from a fresh boot — the grower harvests and packs; the
  hand consigns crates at the cash-and-carry; the lounge keeper buys;
  a drink whose recipe takes a lime is ordered and made with a grown,
  graded lime. (One full-suite run at finalize; `test:near` + pack
  suites + lints gate the iteration loop.)
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
  [retail](../subsystems/retail.md) ·
  [employment](../subsystems/employment.md) ·
  [residency](../subsystems/residency.md) ·
  [crafting](../subsystems/crafting.md) ·
  [parcel](../subsystems/parcel.md) ·
  [content-packs](../subsystems/content-packs.md)
