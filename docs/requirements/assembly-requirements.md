# Assembly — requirements

**Kind:** feature
**Leads from:** kernel — **first consumer, and it needs no new content at
all:** `trade-mining`'s **miner's pick**, whose recipe is *already* a
true assembly (`head` + `haft`, both `kind: item`, no heat) and whose two
parts already ship as their own rows with their own recipes. The engine
takes them and throws their identity away at the mint.
**Seeded by:** [assembly-slate](../slates/builds/assembly-slate.md) ·
[fridge-design-pack](../slates/builds/fridge-design-pack.md) §
*`Chamber`* · ⛔ [crafting.md](../subsystems/crafting.md) § *DEFECT* ·
[vocations.md](../vocations.md) § *sawyer · carpenter · cooper*

⭐⭐⭐ **The thesis: transformation destroys identity; assembly preserves
it — and we only have the first.**

Every craft in the game turns one thing into another. Ore becomes metal,
flax becomes cloth, sand becomes glass, grain becomes bread, and **the
inputs lose their identity in the output.** A cask is staves and hoops
and heads, and after you make it **the staves are still staves** — which
is exactly why it can be *repaired*.

> ⭐⭐ **And the consequence is bigger than barrels: a factory is an
> assembly of assemblies, so you cannot build a factory until you can
> build a thing from parts.** Every industrial vertical sits behind this.

⭐ The cheapest proof it is missing: **an axe is a head and a haft, and
the haft is what breaks** — but wear with no parts makes every failure
total, so today an axe simply wears out and `repair` can only ever be
generic.

---

## What already exists

⭐⭐⭐ **This is not new substrate. It is the second consumer of a
shipped one, and the content already asserts the model in two places.**

### The engine already keeps a part's identity inside a whole — once

`CraftingLogic.ts:671`, on the **garnish**:

> *"A glass is a container too (its garnish) — never descended: the olive
> in a served martini is not the next martini's garnish."*

The olive is **moved into the glass as a real Tangible** and survives
there, for ten drinks. ⭐ By this project's own test — *a hook needs more
than one implementer*, *never invent the third consumer* — that is the
strongest available evidence the axis is real rather than invented.
**Assembly generalizes `garnish`.**

### And a content author already wrote an assembly recipe

`trade-mining/content/recipes/pick.yaml`, in full, is two `kind: item`
slots named `head` and `haft` with **no `requiresHeatK`**, and its
comment says what it is:

> *"Head and haft, married. No heat: this is assembly, and it is the rung
> that teaches that a made thing can be made of made things."*

`pick-head.yaml`'s own description ends *"It wants a haft."* The parts
ship, the recipe ships, the learner's ladder is authored. ⭐ Only the
**output** is a lie.

### What is shipped and reusable

- **Craft-resolve** with recipes as `documents` (`kind: 'recipe'`, warmed
  by `RecipeCatalogue.onCreate → warm()`), grade by weakest link, tools
  resolved **by what they can do** rather than by name, a heat gate, and
  provenance on the output. ⭐ It already states the gap: *assembly is a
  genuinely different model, still deferred — not faked.*
- ⭐ **`count` on an item slot already expresses many identical parts** —
  34 slots author `count ≥ 2` today, up to `wood ×8`. **Thirty staves is
  expressible right now;** what is not expressible is the staves still
  being staves afterwards.
- ⭐⭐ **`salvage` is already lossy, by rate, over material constituents**
  (`craftingSalvageRate`, default 0.5, bounded by the item's mass). **So
  the irreversible branch of disassembly already works**: a welded or
  glued thing correctly yields scrap. Only the *reversible* branch is new.
- **Wear, repair and salvage** all ship as verbs, afforded by instruments.
- ⭐ **`ConstructedMixin` ships `constructionForm`** — an authorable word
  meaning *shape* — and `materials-response` runs
  `f(mechanism, material, construction)`. The construction axis is the
  home a composite's derived response needs, and it is already there.
- **Five arms rows already carry a proto-bill**: `_detailMaterialPaths`
  naming the non-primary part (`haft` on spear, mace, warhammer, flail;
  `boards` on shield). ⭐ The bill is not new authoring — it is promoting
  a field that exists.
- ⭐ **Ten woods ship as distinct species** — ash, beech, birch, elm,
  hazel, maple, oak, pine, willow, yew — plus `horn`, `leather`,
  `rawhide`, `linen`, `tin`, `glass`. **The one decision per assembly is
  already affordable with no new material.**
- ⭐⭐ **Glass panes are MAKEABLE TODAY** — `trade-glass`'s `pane.yaml`
  with `scribe`·`snap`·`groze`·`flatten`·`glaze`. The lantern's pane needs
  no new producer.
- **A body plan is already a default bill of materials**, with tissue as a
  **share** so one plan serves a canary and an ox, and butchery is already
  **disassembly by declared plan.**
- **`MaturingMixin`** is a durative reconcile-on-read transform with
  profile rows and a boot-warmed roster — ⭐ **the host for seasoning**
  (see § *Surface decisions* D9).
- ⭐⭐ **`watershed.md`'s `analyze power` already answers, bare,** *"what a
  fall of one metre would make — the honest answer to could I put a mill
  here"*, and the water pack **deliberately has never heard of the grist
  mill.** The sawmill is that duck-typed seam's second consumer, not new
  machinery.
- **An authorship ledger** records who made a thing, with routing for more
  than one contributor.
- **A surgical operation catalogue** is data, driven by one verb on one
  instrument, interruptible. ⭐ The exact shape a joining vocabulary wants.
- ⭐⭐ **`put super in hive` already works, as containment** — *"the
  interior the envelope uses is `broodVolumeM3` plus whatever supers are
  in it, so `put super in hive` is the supering act and there is no verb
  for it."* **This is the line where assembly STOPS** (D6).
- **Casks exist as rows** — a kind, a material, a capacity, a closure —
  and the distilling pack argues at length that *the cask matters and a
  second one is a row rather than code*, with its character on the
  **vessel**.

### ⛔ What is broken or absent

1. ⛔⛔ **The mint has one material and one mass.**
   `CraftingLogic.ts:1676` sums every consumed item's mass into one
   `totalKg` and then calls `setMaterial` **once**. The pick's haft is not
   dropped by oversight — **there is nowhere for a second part to land.**
   This is the build.
2. ⛔⛔ **A crafted good minted onto a floor is invisible to
   persistence.** Custody is followed by `hang`·`get`·`put`·`drop`·`buy`·
   `fell` — **and crafting follows it zero times** (`CraftingLogic` mints
   with a bare `ContainmentApi.move`). ⭐ Invisible for anything you pick
   up; **total for anything whose purpose is to sit still.** Fix it first.
3. ⛔ **`DurableMixin` is a single `0..1` scalar.** `getCondition`/`wear`/
   `isBroken`, one number per object — so **every failure is total** and
   `repair` has no target.
4. ⛔ **Nobody makes the wood.** ⭐⭐ **`trade-mining` is secretly a
   woodworker and a blacksmith**: `pick-haft` is `discipline: mining`
   (*"one stick of wood, by hand, no heat and no station"*) and
   `pick-head` is `discipline: mining` with `requiresHeatK: 1200` and an
   anvil. The trade absorbed two capabilities it does not own, because
   **the sawyer, the carpenter and the cooper are all GAPs**
   ([vocations.md](../vocations.md) rows *sawyer* · *carpenter · joiner* ·
   *cooper*).
5. ⛔ **89.4% of goods have no maker.** 690 thing rows; **73** are some
   recipe's `outputTemplate`. Net of scenery and crop sub-rows, **412
   makerless goods**, and **36 of 56 packs ship zero recipes** — including
   every fixture, lamp, container, garment and soft furnishing in the game.
6. ⚠ **Eleven recipes fake assembly as transformation.** The worst
   physically impossible ones: `felling-axe` **forge-welds a hickory haft
   at 1300 K**; five smithing recipes (spear, mace, warhammer, flail,
   shield) take only `forgeable` stock and output rows that declare a
   wooden haft — the spear's own comment admits it: *"One bar, and the
   rest is a stick."*
7. ⚠ **A cask's own history does not exist.** The argument for putting
   character on the vessel appeals to *this barrel's own history*, and
   **there is no record of how many times it has been filled.** ⭐ Note
   `baseGradeBand` and `imparts` are declared in the recipe's `fieldMeta`
   and **authored nowhere** — there may already be a home nobody filled.
8. ⛔ **Two live content defects, and the gate that should catch them does
   not look.** `/trade/distilling/thing/spirit-bottle` is the
   `outputTemplate` of `vat-whisky.yaml:57` and `compound-gin.yaml:20` and
   **no such row exists** (the authored row is `empty-spirit-bottle`) — so
   two spirits recipes can produce nothing, unnoticed because both are
   exercised only through synthetic test fixtures. Meanwhile
   `check-reachability.ts:527` treats `outputTemplate` as a **faucet**
   without verifying the row resolves, and `RecipeCatalogue.warm()`
   swallows a malformed recipe with a `console.warn`. Both are the
   silent-failure class.

---

## Goals

### The substrate

- ⭐⭐⭐ **A thing can be made FROM parts, and the parts are still
  themselves.** What it is made of is declared on the **kind** — so every
  cask is thirty staves, six hoops and two heads whether a person made it
  or found it — and **what happened to this one** is recorded against the
  instance. ⭐ One declaration serves both: the recipe reads it to know
  what to consume, and taking the thing apart reads it to know what comes
  out.
- ⭐⭐⭐ **How two parts are joined is the interesting half, and it is
  data.** A joining method says what may be joined to what, what act and
  what tool it takes, how much force it survives, ⭐ **whether it can be
  undone**, **who did it**, and ⭐⭐ **where it may be done** — so a trade
  ships a way of joining with nothing in the engine changed.
- ⭐⭐⭐ **An assembly may be made of assemblies.** The armchair is a
  pegged frame plus a stitched cushion; the bellows is riveted leather
  over a rigid frame; a froe is a forged blade on a riven handle.
  **Nesting is what makes *a factory is an assembly of assemblies* true
  in the engine rather than in the prose**, and it is the one goal the
  cask alone would never have demanded.
- ⭐⭐ **A joint has state of its own, distinct from its parts'.** ⭐ A
  **slack hoop is not a broken hoop**: every part is sound and the cask
  leaks. That is what makes the cheapest repair rung — tighten it,
  consume nothing — honest rather than a special case.
- ⭐⭐ **Wear routes to the part that answers the channel.** A haft breaks
  from shock, a head dulls from abrasion. `materials-response` already
  speaks in channels, so **which part absorbs a given mechanism is
  derivable** from its own material and construction rather than authored.
- ⭐⭐ **And the joining method is the epoch.** Wedged, pegged, hooped and
  riveted are bespoke and come apart with effort; a **threaded fastener**
  is standard, reversible and interchangeable; welded and moulded do not
  come apart at all. ⭐ One axis, and the whole industrial transition is a
  move along it.
- ⭐⭐ **Where you can do a join decides which trades can travel.** Some
  joins need only hands, some a tool you can carry, and some a machine
  that does not leave the premises — ⭐ which is why a cooper can work on
  a pitching deck and nobody can press a bearing out there, and why work
  centralises as the epoch turns. ⚠ **And the hand rung must be able to
  make the hand-tool rung's tools**, or the tree has no root. ⭐ The parts
  list proves it closes: a froe, a drawknife, an adze, a croze and a
  cooper's driver are each **a forged blade on a riven handle, joined by
  hand.**
- ⭐⭐ **Taking a thing apart gives you less than went in**, and how much
  less depends on how it was joined and how good you are. ⭐ Which kills
  the obvious arbitrage by arithmetic rather than by a rule, gives a
  craftsman a second income because **he recovers more than you do**, and
  makes **mending one part strictly better than taking the whole thing
  apart.**
- ⭐ **A thing tells you which part failed**, so a repair is specific: the
  haft is split, the hoop is slack, the head has dried. ⚠ And you
  **cannot inspect a part while it is inside the whole** — true in life,
  and it makes *which one is bad* a **diagnosis** rather than a lookup.
- ⭐⭐ **A derived property leaves through whichever subsystem already
  reads it.** `closure: liquidTight` is authored on the cask row today and
  must **derive from joint state** or the leak cannot emerge; a cracked
  pane must attenuate `signalAt`; a racking bed must lower `restQuality`;
  a damaged instrument must lower its own **ceiling**, not the reader's
  competence.
- ⭐ **A part is a tradeable good.** Somebody can make staves and never
  make a cask.

### The wood column — because the parts demand it

- ⭐⭐⭐ **Three trades, in the order the register already named them:**
  `forestry → sawing → carpentry`, with **coopering** as the specialist
  branch. This is where all the new content lives, and it is the answer to
  *who makes an axe handle*.
- ⭐⭐ **A market four rungs deep: bole → boards → parts → assemblies.**
  The slate claimed a part market is *the first market under a market*;
  with the wood column it is three markets under one, each a real
  transaction.
- ⭐ **Riven is not sawn, and the difference is a `constructionForm`.**
  Split along the grain the fibres run unbroken; sawn across them a stave
  weeps. ⭐⭐ **So the stave's whole argument becomes derivable** through
  the shipped construction axis instead of asserted in prose — and
  **staves are a third thing a felled tree becomes**, after a length and
  firewood.
- ⭐⭐ **Seasoning rides `MaturingMixin` as its second host** — the good
  rather than the vessel. Green wood that warps is the failure, and a
  seasoned board is worth more than a wet one because somebody waited.
- ⭐ **The sawmill is premises on a watercourse**, over the grist mill's
  shape and the power seam that already exists — which makes it the first
  new industrial water user in the realm, with the title and the water
  right that implies.
- ⭐⭐ **Re-home what mining should never have owned**: the haft to the
  woodworker, the head to the smith, and the **assembly** stays mining's.
  Free content work with a real payoff.

### The exemplars — eight families, picked for SPAN

⭐⭐ **The selection criterion is not *which goods are assemblies* (412
are makerless and many qualify) but *which minimal set exercises the
widest span of the joint vocabulary*.** A cask alone proves one method,
one failure shape and one reversibility, which is how this becomes the
cooper build instead of the assembly build.

| family | the cell it fills |
|---|---|
| ⭐ **pick · felling axe** | **wedged**, one known failure point, **zero new content** |
| **cask · pail · water-butt** | **hooped**, many identical parts, and the joint failing while every part is sound — one implementation at three scales |
| **bed · table · armchair · wardrobe** | **pegged frames**, a degraded assembly degrading a *service*, and **nesting** (frame + upholstery) |
| **waterskin · boots · the garment** | **stitched** seams, and replacing a part with a *better* one — the resole |
| **lantern · sconce** | **glazed/seated**, with the consequence already simulated: a cracked pane attenuates light |
| **smoker's bellows** | **riveted** and effectively irreversible, plus soft-over-rigid nesting |
| **the wired frame** | the smallest honest assembly — and the **hive beside it is the boundary marker** |
| **instruments** | the only family whose derived property is **epistemic**: precision, not mass or strength |

- ⭐⭐⭐ **A cooper is a real trade**, because the thing you can do badly
  is destroy somebody else's property: **a cask that leaks loses its
  contents for three years and nobody knows whose fault it was until the
  accounts are read.** ⭐ And the three grades of cooper are a
  **capability** ladder, not a quality one — a slack cask is not a bad wet
  cask, it is **a different product**, so the apprentice makes barrels for
  nails rather than inferior barrels for beer.
- ⭐⭐ **A cask wears out its character and can have it restored.** It
  gives less each time it is filled until it gives nothing — and **shaving
  and re-firing the inside brings it back**, the only place in the realm
  where maintenance restores a *flavour* rather than a function.
- ⭐⭐ **A space inside a thing can have its own air and hold its own
  gear** — a freezer compartment, a line tub, the bow of a boat — and **a
  person can occupy one**, at a cost the host decides. (A fridge charges
  nothing; a boat under way charges plenty.)

- ⭐⭐⭐ **A standard gets an enforcer, because somebody profits from
  enforcing it.** The cask is the realm's first standard — *tonnage* comes
  from *tuns* — and the office that made it stick was **the gauger**, an
  excise officer who measured your casks to tax their contents. ⭐ A seat
  whose whole function is **verifying an agreement about a slot
  dimension**, which is the logistics slate's definition of a standard
  wearing a uniform. He measures and records; what the polity does with
  the number is the polity's.

### And close the silent gates while we are in here

- **The craft mint follows custody**, with a **census-then-ratchet** on
  *verbs that mint a good into a room without calling `followCustody`* —
  today's count as the ceiling, driven to zero. One fix is a bug; the
  ratchet is what stops the seventh verb forgetting.
- **A recipe's `outputTemplate` must resolve to an authored row**, gated,
  and a malformed recipe must fail loudly rather than warn.

---

## Non-goals

⚠ **Every non-goal names its destination.**

- ⛔ **No thousand parts and no thousand decisions.** Thirty identical
  staves are **one** decision. The count that matters is **decisions per
  assembly**, and a cask should carry about **one** — the wood.
  → *nowhere; this is a standing content-scaling rule, not deferred work.*
- ⛔ **No threaded fastener.** The vocabulary must *admit* one; the
  medieval rung ships. → **[content-declaration-slate](../slates/builds/content-declaration-slate.md)** § `Epoch`.
- ⛔ **No factory, no interchangeable-parts economy, no machine-rung
  join.** Hands, hand tools, and premises that are a water mill.
  → ⚠ **nowhere yet, and that is a finding**: there is no factory or
  industrial-epoch slate in the tree. The nearest owner is
  [destructive-distillation-slate](../slates/builds/destructive-distillation-slate.md)
  (*"the cheapest door into the industrial epoch"*), and **this build's
  own slate stays open** as the record that the prerequisite is now met.
- ⛔ **No transport conversions** — wagon, coach, dray, barge, ore-tram.
  → the **maritime / transport lane**, and `vocations.md`'s *wainwright ·
  wheelwright* GAP row. Explicitly excluded to keep the lanes disjoint.
- ⛔ **No guns, clocks or looms.** The flintlock musket, the pocket watch
  and the broad loom are all shop-stocked and makerless and all want this
  model. → **a later content build**, once the substrate has shipped;
  recorded in `vocations.md`'s gap matrix.
- ⛔ **No change to how a body works**, even though a body is an assembly
  whose joins are surgical. The operation catalogue is the *precedent*,
  not a consumer. → *nowhere, deliberately.*
- ⛔ **No new verb for taking a thing apart**, and ⛔ **no verb for
  tightening something** — that is the cheapest rung of repair.
  → *nowhere, deliberately.*
- ⛔ **No lumber grading as a new axis.** `Grade`'s weakest-link already
  ships and the sawyer's output takes it. → *nowhere; it already exists.*
- ⛔⛔ **No market control, and no floor-stock retreat mechanism.** Every
  spawned assembled good sets a price ceiling on every part inside it —
  nobody pays more for a stave than barrel-price ÷ recoverable staves —
  and **that is recorded as a finding and left alone.** The owner's
  standing position: *no picking winners and losers; the only legitimate
  lever is the central bank's.* → **[balance-slate](../slates/builds/balance-slate.md)**, as a monetary lever if ever.
- ⛔ **`fixture/toilet.yaml` and `fixture/basin.yaml` stay as they are.**
  Both carry explicit decision records against elaboration (the toilet
  composes no mixin *by enforced test*). → *nowhere; the records stand.*
- ⛔ **No brass.** The material library has no zinc, so instruments are
  bronze or iron. → *nowhere; a one-row addition whenever somebody wants it.*
- ⛔ **No silvered mirror**, so the sextant's index mirror is out of reach
  and the sextant is not an exemplar. → *a later instruments build.*

---

## Placement

| what | where | why |
|---|---|---|
| the **bill**, **joint state**, **per-part condition**, nesting | **kernel** — `lib/craft/` beside `Crafted`/`Durable`, and the mint in `CraftingLogic` | composers have no common pack ancestor; `DurableMixin` and the mint are both kernel |
| the **`Joint` row vocabulary** | **rows** at `<root>/idea/Joint/<name>`, warmed by a catalogue, **no Api** | the shipped `Placement` / `Reading` / `Operation` pattern — a pack ships a way of joining with no kernel edit |
| the **`fit` verb** | **platform**, `cmd/crafting/fit.yaml` | it is the act any trade's instrument confers, like `repair` and `salvage` |
| **carpentry / joinery** | ⭐ a new pack, **`trade-carpentry`**, root `/trade/carpentry` | a capability pack must hold a namespace root of its own or `classFileOf` resolves its classes to the kernel |
| **sawing** | ⭐ `trade-carpentry`'s, not its own pack — the sawyer is a **station** (the mill) inside the wood trade | a second mill is rows; a second pack would be a pack per rung |
| **coopering** | ⭐ a new pack, **`trade-coopering`**, root `/trade/coopering` | it is a distinct trade with its own Discipline, its own tools and nine waiting consumers |
| **riving + seasoning** | **`trade-forestry`** — the bole on the wood floor is the named attach point | riving is forestry's act by the slate's own argument; seasoning starts where the wood is cut |
| the **compartment** | **kernel** substrate, consumed by `fridge-design-pack`'s first composer | a space with its own air is spatial substrate, not a trade's |
| the **gauger's seat** | ⭐ a **row** — a seat on a locality's government chart (`civics.md`), resolved by `holdsSeat`. No Office code, no kernel edit |
| the **gauger's act** | ⭐ a **`Reading` row** at `/trade/coopering/idea/reading/capacity`, warmed by `ReadingCatalogue`. `measure` is already flat over the channel |
| the **part rows** | each in the pack whose trade makes them — hoops to smithing, panes to glass, soles to tanning, staves to coopering | ⭐ a part belongs to its producer, not to its consumer |

⭐ **The test the placement must pass: a second cooperage, a second
sawmill and a second joiner's shop each need ZERO pack code** — rows only.

---

## Collisions

| | |
|---|---|
| ⚠⚠ **itself, at W0** | ⛔ **the craft-mint defect lands first and nearly alone**, because everything after it touches the same tail. Fix, ratchet, drive it, then build |
| ⚠⚠ **`trade-mining`** | its two pick-part recipes are `discipline: mining` and must be **re-homed** — the haft to carpentry, the head to smithing, the assembly left where it is. ⭐ A Discipline change is visible to anyone mid-ladder; say so in the build |
| ⚠ **`trade-forestry`** | gains riving and seasoning. It must keep `fell`, the bole and the coppice working unchanged |
| ⚠ **the maritime lane** | it must not touch the compartment, and this build must not touch the frame. ⛔ Transport conversions excluded expressly to keep them disjoint |
| ⚠ **the climate lane** | it owns the air a space resolves. A compartment **reads** the chain and must keep working when that build rewrites it |
| ⚠⚠ **the compartment has TWO design docs** | [fridge-design-pack](../slates/builds/fridge-design-pack.md) § `Chamber` and [chambered-vessels-slate](../slates/tails/chambered-vessels-slate.md) (2026-09-25) were written for the same problem, and `slates/README.md` already flags them as **possible duplicate ground**. ⛔ Reconcile the two BEFORE the compartment wave, or build the third copy |
| ⚠ **the sugar lane** | both want a **mill** and a **boiling** step. ⭐ Sugar ships the crushing mill; this build ships the **saw** mill, and both are the grist mill's shape over the same water power seam |
| ⚠ **`water` / `trade-milling`** | the sawmill is the power seam's second consumer. ⛔ It must stay **duck-typed** — the water pack must still never have heard of any mill |
| ⚠ **the shipped cask rows** | nine trades consume them. ⛔ **A recipe's output must name the AUTHORED row** — never a crafted-only variant — or the same object has two kinds and the inspection card shows it |
| ⚠ **the general store** | the furnishings line (bed, table, armchair, wardrobe, sconce) is **stocked and owned as chattel across evictions**, so instance history must ride the residence persistence path |
| ⚠ **`trade-tailoring`** | `pieces.yaml` is an assembly input already authored with nothing consuming it. The garment recipe must not disturb `clo`, fit, the dye stack or soiling |

---

## Surface decisions

**D1 — The verb is `fit`.** `set` is unavailable: it is a scripting
builtin (`def`/`make`/`set`), and `trade-medicine` already lost this exact
fight and retreated to `splint`, with the reason written at the top of its
view. `join` is genuinely free — no view claims it, and social joining is
`party`/`group`/`chat` — but `fit` is the craftsman's word and passes lens
5 verbatim: *`fit` answers the same command whether the method is a hoop
or a bolt.*

**D2 — Taking a thing apart is `salvage`, not a new verb**, and the
joint's reversibility decides the yield. ⭐ The existing material-salvage
path **is** the irreversible branch; only the reversible branch is new.

**D3 — Tightening is `repair`'s cheapest rung**, consuming nothing. Not a
fourth verb; `adjust` is for operating a control and a hoop is not one.

**D4 — Derived properties are IN, and they are the point.** Lens 1's
claim is that *behaviour comes from how parts are connected*, and without
composite response the engine contradicts the fiction. Composite material
response goes over the shipped `constructionForm` axis: **a composite's
construction is its joint set.** This is the build's risk item and it is
deliberately early.

**D5 — Nesting is IN.** An assembly may be a part. Without it the epoch
argument ships as prose.

**D6 — The hive is the BOUNDARY MARKER, not an exemplar.** `put super in
hive` already works as containment with the whole's volume deriving from
its contents. **A super is an occupant; a frame's wire is a part.** A hive
with no super is still a hive; a frame with no wire is not a frame. ⭐
This is what keeps the build from swallowing `Slotted`, and it belongs in
the requirements because it is a *decision not to build something*.

**D7 — The bill lives on the ROW; the history on the instance.** One
declaration, read by the recipe for what to consume and by `salvage` for
what comes out. A spawned cask yields thirty generic staves at default
grade — identical behaviour, and the only thing honestly missing is
provenance, because nobody knows who made it.

**D8 — A part is a `Good` that becomes a part by being joined.** ⛔ No
`PartMixin`. The relation is data on the composite, not a new kind of
thing.

**D9 — Seasoning rides `MaturingMixin`, on the GOOD.** Its second host.
A profile row per species, reconcile-on-read, and warping is the failure
of wood worked green. ⭐ The mechanism is shipped and this is the first
time its host is not a vessel.

**D10 — Riven versus sawn is a `constructionForm` token**, with the
mechanical consequence falling out of `f(mechanism, material,
construction)`. No new axis, and the stave's physics stops being prose.

**D11 — The sawyer is a station, not a pack.** The mill is premises on a
watercourse over the grist mill's shape; sawing lives in
`trade-carpentry`. A pack per rung is a pack too many.

**D12 — No market intervention.** The price-ceiling effect is recorded as
a finding and nothing is built to counter it.

**D13 — Two Disciplines, and one re-homing.** `carpentry` and
`coopering` enter the catalogue; `pick-haft` and `pick-head` leave
`discipline: mining`.

**D14 — The gauger is IN, and he costs no kernel code.** The cask is the
realm's first standard and lens 7 lands nowhere else in this build, so the
office ships with the trade that creates the thing worth certifying. ⭐⭐
And both halves are already data:

- **his authority is a SEAT** — `civics.md` makes a seat
  `{ key, label, department, positionKey }` on an organization's chart,
  with `holdsSeat(character, govKey, seatKey)` as the authority predicate
  **as data**, not a second Office apparatus;
- ⭐⭐⭐ **his act is a `Reading` ROW** — `measure capacity`. There is no
  `capacity` among the 37 shipped reading channels, and `measure` is
  already a flat verb over a channel any pack can add. **So the gauger
  adds one row and one seat, no verb and no kernel file.**

⚠ What he must NOT become: a tax mechanism. He **measures and records**;
what a polity does with the number is the polity's, and the entrenchment
tier question belongs to `measurement.md` layer 3, not here.

---

## Lens pass

⭐ The slate carries the pass over **assembly as a mechanism**
([assembly-slate](../slates/builds/assembly-slate.md) § 12) and it still
holds. What follows is the pass over **the new scope this document
added**: the three trades, their Disciplines, and the wood economy.

### ⭐⭐⭐ The keystone: this build is what makes carpentry a vocation

`pick-haft` is *"one stick of wood, by hand, no heat and no station"* at
`difficulty: easy`. **Anybody can shave a stick** — so by criterion 2
(*if anyone can do it, it is a chore, not a job*) shaving is a chore, and
carpentry has no forge to gate it the way smithing does.

> **The gate is the JOINT.** Anybody can shave a stick; **a
> mortise-and-tenon that doesn't rack is competence.** An amateur's chair
> wobbles and a joiner's does not, and that difference has no
> representation in the engine today because `DurableMixin` is one scalar
> and joints do not exist.

⭐⭐ So **carpentry fails criterion 2 without the assembly substrate, and
the assembly substrate supplies its gate.** The two cannot be separated
— a design argument for keeping this scope together, not an economic one.

### Carpenter · joiner

| # | | |
|---|---|---|
| 1 | **unmet demand** | ✓ the strongest form in the register: **the consumers are already shipped and already buying.** 412 makerless goods, the store at par 1–3 on furnishings, eleven recipes faking wooden parts into existence. Nothing fabricated |
| 2 | **gated capability** | ⭐⭐ **the joint** (above). Secondary gate for boards: **the mill is premises you do not own** |
| 3 | **repeatable loop** | ✓ the register's preferred shape — *maintenance*. Joints rack, hafts break, furniture is re-wedged forever |
| 4 | **paid, not minted** | ✓ ⭐⭐ **and the market is structurally beyond floor stock's reach: CAPITAL GOODS.** The store stocks a bed. **It does not stock a loom.** The hand-loom, broad-loom, spinning wheel, cutting table, shaving horse, hive, super, frame, sap pan, extractor and keepnet are all makerless, none are shop goods, and every one is carpentry's. ⭐ No intervention needed to protect this market — see non-goal *no market control* |
| 5 | **failure mode** | ✓ three, all **derivable**: a racking joint, a stave sawn instead of riven, wood worked green that warps |
| ⚠ | **the ladder** | honest: shave a haft (chore, wages) → saw boards (station) → joint a frame (competence) → cabinetmaking and coopering (specialist). ⭐ So `pick-haft` at `difficulty: easy` is **correct**; it was only ever in the wrong Discipline |

- **1 Pedagogy** — ⭐⭐ carpentry teaches what nothing else in the game
  does: **grain, and the cost of working across it.** Why a riven stave
  holds and a sawn one weeps, why a mortise beats a nail, why a chair
  racks *at the joint*. That is structural reasoning — behaviour from
  connection rather than material — which is lens 1's claim for the whole
  build, taught by its cheapest trade. ⭐ And **seasoning teaches time as
  a material input**: it cannot be hurried, and the only lever is having
  started earlier.
- **2 Expression** — ⭐⭐⭐ the build's strongest hit. Ten woods × joint
  methods × a bill means **a chair is rows**, and an author who ships a
  *part* has contributed to every assembly whose joint accepts it.
- **3a Immersion** — the object carries its history without prose: a
  chair with one replaced leg in a different wood.
- **3b Participation** — ⭐ a player supplies an industry they do not
  practise. Hafts for miners they never meet.
- **4 Values** — ⭐⭐ **season or hurry.** A joiner who sells green
  furniture earns now and ruins his name later; renown already ships to
  carry it. Sharper than repair-versus-replace because **the victim is a
  stranger.**
- **5 Continuity** — ✓ `fit` answers the same command for a peg and a
  bolt; the water mill becomes a steam mill; the joint becomes a screw.
  The epoch axis runs straight through this trade.
- **6 Economy** — ⭐⭐⭐ **carpentry is the first trade whose product is
  the MEANS OF PRODUCTION.** Every other trade makes consumables or goods
  people use; the carpenter makes the loom the weaver works at, the bench
  the cooper raises on, the hive the beekeeper keeps. The industrial
  argument in miniature, two epochs early — and it means **carpentry's
  demand grows with every other trade the game ships.**
- **7 Governance** — ⛔ **a GAP, recorded as one.** Timber rights are
  forestry's (the deed is written by the ground) and the standard is the
  cooper's. Do not invent one.

### Sawyer

⭐⭐ **The multure is shipped and it is the sawyer's answer to criterion
4.** `trade-milling`'s toll bin: *"A tenth of everything ground here stays
in this bin… no coin changes hands at the grinding, the premises are paid
for out of the flour, and a miller's honesty is famously a question about
this bin"* — deliberately **not** a `Tariff` service, because payment in
kind *"needs no banking code at all."*

> ⭐⭐ **And a sawyer's tenth is more interesting than a miller's, because
> boards are capital rather than food.** A miller's toll gets eaten; a
> sawyer's **accumulates into a timber yard, seasoning while it sits** —
> so the sawyer is the first trade whose pay is an appreciating inventory
> he can speculate with. Same mechanism, a different economy.

| # | | |
|---|---|---|
| 1 | **unmet demand** | ✓ the whole column above it is blocked on boards; nothing else converts a bole |
| 2 | **gated capability** | ✓✓ **premises on a fall of water** — harder than competence: you cannot carry a sawmill, and the river sets your throughput |
| 3 | **repeatable loop** | ✓ every bole, forever, and the saw dulls |
| 4 | **paid, not minted** | ✓ the multure, in boards |
| 5 | **failure mode** | ⭐ **how you cut it**: quarter-sawn is stable and wastes a third of the log; through-and-through is efficient and **cups** as it dries. The grain argument one rung up, **a real decision per log with no right answer** |

⭐ **`GristMill` already proves the shape** — *"one class, two rungs, both
rows"*: a quern authoring a throughput and no power coefficient, a mill
authoring a coefficient and no throughput, and `availablePowerW()` reading
a **room sibling that answers it** rather than importing the water pack.
⭐⭐ **The two rungs map exactly onto sawing: the pit saw (two men, by
hand) and the sawmill (powered)** — the portability ladder appearing
*inside the station*, which is the `Joint` row's portability axis as a
third consumer of the same axis.

⚠ **One correction for the plan:** the mill composes `ComminutingMixin` —
reducing to particles — and **sawing is not comminution.** The timber
trade's own word is **conversion**: a log becomes boards, not flour. The
sawmill reuses `GristMill`'s shape and power read and needs its own act.

⭐ **Vocation or rung?** **A real vocation and not a real pack** — and the
two questions are genuinely different; conflating them is how a tree grows
a pack per rung. Different gate (premises, not competence), different
product (stock, not goods), historically different guilds. The register
already lists it as its own row; **D11** puts its code in
`trade-carpentry`.

- **1 Pedagogy** — ⭐ the yield question: a round log into square boards is
  a geometry problem **with waste in it**, and quarter-sawn versus
  through-and-through is that geometry having a consequence.
- **4 Values** — the miller's-honesty question, now about a bin of boards
  nobody counts.
- **5 Continuity** — ✓ water → steam → electric, the same station.
- **6 Economy** — ⭐⭐ the appreciating toll, and **the river as a seasonal
  throughput cap that is already simulated**: *"a mill that grinds ten
  sacks in spring grinds fewer in autumn."*
- **7 Governance** — ⭐ **water rights get a second claimant.** The sawmill
  is the first *new* industrial abstraction on a watercourse since the
  grist mill, so prior appropriation finally has somebody to argue with.

### Cooper

| # | | |
|---|---|---|
| 1 | **unmet demand** | ✓✓✓ **the strongest in the register, and it grew during this document's drafting.** TEN consumers: distilling, brewing, winemaking, trade-fuel's lamp-oil cask **and the `oil-cask` the drilling build added 2026-10-09**, milling, salt and fish, ship's water, tanning, whaling. One is a shipped subsystem whose whole mechanism — `MaturingMixin` — lives **on the cask** |
| 2 | **gated capability** | ✓✓✓ ⭐⭐ **the best in the build, because the gate decides WHAT YOU CAN MAKE AT ALL**: slack (nails, apples — leaks freely, nobody cares) · dry-tight (flour, powder) · wet (beer, wine, spirits, oil). **A slack cask is not a bad wet cask, it is a different product** — a shape `Grade` cannot express because it is not a quality axis |
| 3 | **repeatable loop** | ✓✓✓ ⭐ **most of coopering is maintenance** — re-hooping, replacing a stave, re-heading, and **re-charring a spent cask**, which is recharging a depleted reservoir. The cooper earns recurring revenue from casks he already sold, which almost no trade here does |
| 4 | **paid, not minted** | ✓ ⭐⭐ **and structurally immune to the floor-stock problem in a way furniture is not.** What a distiller buys is the cask's *character*, and character **depletes**; a spawned cask arrives with no history and runs out like any other. **The service is the market, not the vessel**, and no amount of floor stock satisfies a cask that needs shaving |
| 5 | **failure mode** | ✓✓✓ **the strongest in the game, and it is not close:** a leaking cask **loses somebody else's contents for three years**, and nobody knows whose fault it was until the accounts are read. Delayed, attributable, and the loss is **a stranger's** — every other trade's failure hurts the practitioner |

- **1 Pedagogy** — ⭐⭐ **compression as a structural principle.** A cask
  has **no fasteners at all**: staves forced into a ring by driven hoops,
  held by nothing but their own thrust. The best teaching object for
  *connection over material* in the whole census, and why the cask was
  always the right exemplar even when it was the only one.
- **2 Expression** — ✓ a second cooperage is rows; the charred cask made
  this argument and won it.
- **3a Immersion** — ⭐ this barrel's own history, the char line, what it
  smells of.
- **3b Participation** — ⭐⭐ the cooper is the trade that **can work on a
  pitching deck** — the portability ladder's whole point, and the reason a
  ship carries one.
- **4 Values** — ⭐⭐ two, both sharp. **The rejuvenated cask is cheaper
  and makes worse whisky**, and the engine prices both and cannot say
  which. And the ladder's own: sell a slack cask honestly, or call it
  dry-tight and let the flour find out?
- **5 Continuity** — ✓ cask → keg → steel drum → IBC, the joint going
  hooped → welded, `fit` answering throughout.
- **6 Economy** — ⭐⭐⭐ two findings. The cask is **a manufactured good
  that behaves like an RGO** — a depleting reservoir with a recharge
  service, the resource law's shape applied to something somebody made.
  And ⭐ **the cask is the realm's first standard**: *tonnage* comes from
  *tuns*, and a hold of identical casks stows without waste while a hold
  of assorted ones does not — the benefit **arithmetic**, exactly as the
  logistics slate's D11 requires.
- **7 Governance** — ⭐⭐⭐ **THE GAUGER, and this is the only place lens 7
  lands across all three trades.** The historical office is an **excise
  officer whose entire job was measuring your casks to tax their
  contents**: a seat whose whole function is **verifying an agreement
  about a slot dimension**, with a revenue motive — which is the answer to
  *who certifies a standard?* ⭐ **A standard nobody profits from
  enforcing does not get enforced.** In scope; see **D14**.

## The drive

1. ⭐ **W0 first: craft something, leave it where you made it, restart,
   and find it still there** — with its state intact. Then **do it with a
   sealed cask of maturing liquid** and find the clock where you left it.
2. **Make a pick** — head and haft, the recipe that already ships — and
   **look at it and read what it is made of.** A bill, on the object the
   engine previously flattened.
3. **Break the haft**, be told **which part**, and **replace just that
   one** — keeping the head you forged.
4. **Fell a tree, rive staves from it**, and get something that is not a
   plank. Then **saw boards from a bole at a mill**, and have the mill run
   slower in a dry season.
5. **Season a board**, and **work one green** — and have the green one
   warp.
6. **Make a cask** — raise it, hoop it, fit the head — and have it hold
   liquid.
7. **Make a bad one** and have it leak, and be told *why* it leaks.
8. ⭐ **Slacken a hoop on a sound cask** and have it leak with **every
   part undamaged**, then **tighten it** and have it hold — consuming
   nothing.
9. **Make a slack cask** at a competence that cannot make a tight one,
   and **put nails in it**, and be refused when you try to put beer in it
   for a stated reason.
10. ⭐ **Fail to inspect one stave** while it is in place.
11. **Take a whole cask apart** and get **fewer and worse** staves than
    went in. ⭐ Then **take a glued thing apart** and get **scrap**, with
    the same verb.
12. **Have an expert take one apart** and recover more than you did.
13. ⭐ **Assemble a nested thing** — a chair whose frame is pegged and
    whose cushion is stitched — and **replace the cushion without
    disturbing the frame.**
14. ⭐ **Crack a lantern's pane** and have the room get darker. Replace
    the pane and have it get brighter.
15. ⭐ **Damage an instrument** and have its **reading get coarser** —
    the instrument's ceiling, not your competence.
16. **Buy staves from somebody who makes only staves**, and **a haft from
    somebody who makes only hafts.**
17. ⭐⭐ **Fill a cask repeatedly** until it gives nothing, then **have it
    shaved and re-fired**, and have it give again.
18. **Read who made a cask**, and after a repair, **read both names.**
19. ⭐ **Make a froe by hand** — a forged blade on a riven handle — and
    then use it to rive. The tool tree's root, walked.
20. ⭐⭐ **Have the gauger measure your cask** — `measure capacity` — and
    get a number; then **try it without the seat** and be refused for a
    stated reason. Then **present an off-standard cask** and have the
    reading say so.
21. ⭐ **Put something in a compartment with its own air** and have it
    read that air rather than the room's — and **stand in one.**

---

## Acceptance criteria

⚠ **Observable from outside the code.**

1. ⛔ **W0: a crafted good left where it was made survives a restart**,
   with its state. **Driven, not reasoned about.** And the mint-without-
   custody census is **gated at zero**.
2. A thing can be **made from parts** declared on its kind, and the
   declaration is the **same one** the recipe consumes.
3. ⭐ **The miner's pick is an assembly with no content change** — its
   shipped recipe, unedited, now produces a pick that knows it has a haft.
4. A **joining method is data**, carrying what may join what, the act and
   tool, a strength, **a reversibility**, **a maker** and **a portability
   rung**, and a new one can be added **with nothing in the engine
   changed.**
5. ⭐ **An assembly can be a part of another assembly**, and the inner one
   can be replaced without disturbing the outer one's joints.
6. ⭐ **A joint can fail while every part is sound**, and the repair that
   fixes it consumes nothing.
7. **At most one new verb**, and taking things apart reuses the shipped
   one, with **the joint's reversibility deciding the yield**.
8. **Disassembly is lossy**, and the loss varies with the joint and with
   competence.
9. **Mending one part is cheaper than rebuilding**, measurably.
10. A failure **names its part**, and a part **cannot be inspected in
    place.**
11. ⭐ **A part's condition changes something another subsystem already
    reads** — a pane and light, a bed and rest, an instrument and the
    coarseness of a reading.
12. A part is a **tradeable good** with its own price, and ⭐ **the wood
    market is four rungs deep**: a bole, boards, parts, assemblies.
13. ⭐⭐ **Three trades answer the vocation test**: a carpenter, a sawyer
    at a mill, and a cooper, each with what it consumes, what it produces
    and who pays. **A second cooperage, sawmill and joiner's shop each
    need zero pack code.**
14. ⭐ **A haft is made by a woodworker and a pick-head by a smith**, and
    neither is `discipline: mining` any more.
15. ⭐ **Seasoned wood differs from green**, the difference is priced, and
    wood worked green fails for a stated reason.
16. ⭐ **Riven and sawn stock behave differently** under the same force,
    through the construction axis rather than a special case.
17. ⭐ **The by-hand rung makes the hand-tool rung's tools** — demonstrated
    with a real tool, not asserted.
18. The three cooper grades are a **capability** ladder: a lower grade
    makes a **different product**, not a worse one, and the refusal says
    which.
19. A cask's **fill history exists**, reduces what it imparts, and is
    **restorable** by a service.
20. ⭐⭐ **The gauger exists as a seat and a reading, and neither is
    code**: `measure capacity` answers on a cask, the seat gates who may
    do it officially, and ⭐ **a second polity appoints a gauger with no
    pack code at all.**
21. ⭐ A **compartment** has its own air, holds gear, and **admits a
    person** at a cost its host declares.
22. ⛔ **A crafted cask and a found cask are the same kind** — same
    composition, same bill, same behaviour — differing only in recorded
    history.
23. ⭐ **TEN shipped consumers of casks keep working unchanged** — the
    `oil-cask` the drilling build added included — and so do `fell`, the
    bole and the coppice.
24. ⛔ **A recipe naming a row that does not exist fails a gate**, and
    `spirit-bottle` is fixed.

---

## Cross-references

- [assembly-slate](../slates/builds/assembly-slate.md) — the seeding
  design, the epoch argument, the prior art, the persistence resolution
- [vocations.md](../vocations.md) — the *sawyer* · *carpenter · joiner* ·
  *cooper* GAP rows, the demand test and the five criteria
- [crafting.md](../subsystems/crafting.md) — the deferral this build
  drives, and § *DEFECT*
- [butchery.md](../subsystems/butchery.md) — `BodyPlan` as the
  default-bill precedent, disassembly by declared plan
- [harm.md](../subsystems/harm.md) — the `Operation` catalogue: the
  row-plus-one-verb-plus-instrument shape `Joint` copies
- [materials-response.md](../subsystems/materials-response.md) —
  `f(mechanism, material, construction)` and the construction axis
- [maturation.md](../subsystems/maturation.md) — seasoning's host
- [forestry.md](../subsystems/forestry.md) — the bole, and the deferred
  sawyer seam
- [watershed.md](../subsystems/watershed.md) — `analyze power`, and the
  mill's duck-typed seam
- [slot.md](../subsystems/slot.md) — occupancy, and why the hive is the
  boundary
- [glass.md](../subsystems/glass.md) — the pane that already ships
- [fridge-design-pack](../slates/builds/fridge-design-pack.md) §
  *`Chamber`* — the compartment's specification and first composer
- ⚠ [chambered-vessels-slate](../slates/tails/chambered-vessels-slate.md)
  — the compartment's **other** design doc; reconcile before building
- [civics.md](../subsystems/civics.md) — seats as positions, and
  `holdsSeat` as the gauger's authority predicate in data
- [instrumentation.md](../subsystems/instrumentation.md) — `measure` as a
  flat verb over a `Reading` row, which is the gauger's whole act
- [logistics-slate](../slates/builds/logistics-slate.md) — **D11**, the
  standard as an agreement about a slot dimension
