# The aluminium can — a stress test of every system, one object at a time

*Design slate, 2026-08-29, on `design/libations`. A conversation, not a
build list. The can is the object because it is everywhere, it is
standardised to the millilitre, its material has the tightest closed
loop of any commodity (a used can is a new can on a shelf in ~60 days),
and it crosses every layer we claim to model: material physics, energy,
a trade's process, packaging, distribution, retail, the body, waste, the
polity. If a system can't say something honest about a can, that system
has a gap. The wooden pallet is the only better candidate; it gets a
row at the end.*

## 0. The object, in the real economy

A beverage can is **one-way packaging** — the industry's own term,
against **returnable** packaging (the glass bottle with a deposit, the
keg, the pallet). The pallet's category is the **returnable transport
item (RTI)**. Both are *packaging*, which is the word for an object
whose whole value is what it carries and whose own life is a loop.

The loop, primary: bauxite → alumina (Bayer process, caustic + heat) →
aluminium (Hall–Héroult electrolysis, ~14 kWh/kg, the reason smelters
sit beside hydro dams) → sheet (rolling; the can body is a 3004 alloy,
the lid a 5182 — two alloys in one can, which is why "one can" remelts
to a slightly different alloy) → can body (drawing and ironing, a press
line, ~2,000 cans a minute) → coating (an epoxy lining — the drink never
touches metal) → filling and seaming (the lid goes on *after* the fill;
the seam is what makes it gas-tight) → distribution (cases on pallets on
trucks) → retail → the drinker → **the empty**.

The loop, secondary: the empty → collection (kerbside, deposit return,
or the informal collector) → baling → remelt (~5 % of the primary
energy) → sheet → can. Sixty days.

What differs outside the US (the parts an American misses):
- **Deposit-return schemes** — Germany's *Pfand* (€0.25 on a can, the
  highest anywhere; it briefly killed the can market in 2003 because
  retailers refused to take them back), the Nordics (90 %+ return),
  and the current EU wave. The deposit is the polity pricing the
  externality; the return rate is the measurement.
- **Steel cans** still dominate in parts of Asia and Africa; **glass
  returnables** dominate in India and much of Latin America — the
  *returnable* model, with a real washing line.
- **Sizes**: 330 mL (Europe), 355 mL/12 oz (US), 500 mL (northern
  Europe, Japan's "long"), 250 mL (energy drinks). The can is
  standardised *per market*, not globally.
- **Tethered closures**: the EU's 2024 rule that a plastic cap must
  stay attached — the polity reaching into the vessel's construction.
  The stay-on tab (1975) was the same move for cans, made by the
  industry before any law.

## 1. The ledger — what each system says about the can

Legend: **built** = shipped and exercised · **substrate** = the
mechanism exists, nothing authored · **gap** = nothing · **wrong** =
shipped and incorrect.

| layer | the can needs | today | to build | pedagogy |
|---|---|---|---|---|
| **material** | `aluminium`: density, melt 933 K, passivating, soft | **built** (`base-library/…/element/aluminium`, this slate) | the 3004/5182 alloys as `alloy/` rows when a can-body recipe exists; the epoxy lining is a `Layered`-style fact, not a material | a can dents and doesn't rust — `materials-response.md` gets this for free from `hardness` + no `ferrous` tag |
| **the vessel** | an *empty* can: 330 mL, `closure: sealed` (construction — gas-tight), `open: true` (state — an empty can is an opened can), material aluminium, description of construction only | **wrong** — the row narrates state ("ring-pull intact") and has no material | fix the row; same pass for `mixer-bottle`/`wine-bottle`/spirit bottles (`sealed`, not `liquidTight` — a capped tonic must keep its fizz), `keg` (`sealed`), `cask` (`liquidTight`, it breathes), `sack` (`open`) | *construction vs state* — `Bulkable.closure` vs `Sealable.isOpen()` — is the first thing a pack author must learn; the can row is the exemplar |
| **the product** | a filled can: the vessel + `interiorMaterial`/`interiorAmount` + `open: false` + a census key | **built** as 1 L bottles (`cola.yaml` …); no canned row | canned floor rows once the vessel row is right (`can-of-cola`, 330 mL, its own census key, its own price point) | one class, two rows: *the vessel* and *the vessel filled* — the standard every packaging row follows |
| **census** | the count of *product* on the floor | **wrong** — `censusKey` is authored on the row and never changes, so an **emptied can still counts** as `mixer:cola`; once drinkers leave empties, the sweep sees "at target" while the shelf is bare | `getCensusKey()` derives from state: full → the product key, empty → the vessel's key (`can`). Empties then have their *own* census, which is what a returns market counts | *what you count is what you get* — measurement.md's first rule, caught by the can |
| **the faucet** | where cans come from | **substrate** — the spawn sweep stands the bottling floor at target: an abstraction that costs nobody the activity | the upstream chain (below); the sweep is the placeholder the chain replaces, region by region | the **abstraction law** (uncertainty.md): legitimate only while it still costs somebody the activity — the sweep fails it on purpose, and says so |
| **primary production** | bauxite → alumina → smelt | **gap** (mining slate is design only; no refining, no smelting) | `trade-mining` (bauxite as ore), a refining step (chemistry — no subsystem owns "chemistry" yet), smelting as a **furnace recipe with an energy cost** | the first place a recipe needs **kWh**, not just `requiresHeatK` — energy accounting is the missing axis on `Recipe`; `electricity.md` has the physics, `crafting.md` doesn't ask for it |
| **forming** | sheet → can body | **gap** — smithing has forge/hammer/quench; no rolling, no drawing | a metal-forming trade upstream of bottling (can-making is a *process*, distinct from filling — trade = process); a press line is a `Tooled` station like the still | the trade-as-process rule applied where it bites: bottling does *not* make cans, it fills them |
| **filling** | empty can + cola bulk → sealed can | **substrate** — exactly the glass-pool mechanism (claim a clean empty vessel, fill it, mark it); nothing authored | bottling's real recipe: `fill` with `outputTemplate: …/thing/can`, `open: false` on completion (seaming); the pool is the stack of empties | the vessel row is the *input* of the trade that ships it — that is what it's for |
| **carbonation** | fizz that keeps in a sealed can and goes flat once opened | **half** — `carbonated` is a payload tag; the spritz "fizzes"; nothing ever goes flat | flat-on-read: an opened `Bulkable` holding a `carbonated` payload loses the tag after N game-hours (reconcile-on-read, the ice-melt pattern) | derive-on-read for truth; the can is the second consumer of the pattern after ice |
| **temperature** | a cold can from the cold-store | **built** — `Thermal` on `Bottle`, the cellar's cold-store | nothing | — |
| **distribution** | cases, pallets, a truck, a distributor | **built** for the distributor (consignment onto the counter) · **gap** for the rest — the hand *teleports* | the freight slate (the truck), the pallet (below), `Crate` already is a case | von Thünen: where the bottling floor sits relative to the bar is a rent, and today it is free |
| **retail** | buy a can, as a person or as the house | **built** — the wallet rule | a per-unit price on canned rows (330 mL is a price point, not a size) | — |
| **the body** | drink it: sugar, caffeine, the cold | **half** — `cola` has `nutrients: [water, sugar]`, no caffeine, no `chemistry` | `chemistry:` on the mixers (caffeine on cola; metabolism.md's toxins model carries it) | the meal-chemistry model has a hole exactly where a 12-year-old expects one |
| **the empty** | it persists, it's litter, it's a returnable | **built** by accident — `Bottle` stays when drained, `Circulating` counts it · **wrong** — counts as product (above) | the census fix; `look` on an empty says "an empty can" (state augmenter, not the description) | an object whose value is what it carried — the game's first *waste* object, and waste is where every economy's honesty is tested |
| **collection** | kerbside, a deposit return, the scavenger | **gap** | a **deposit** is a `contract.md` escrow leg attached to a sale by *law* (the polity: legal-code slate, measurement.md layer 3); the return is the inverse sale at any counter; the scavenger is a vocation that exists **iff the deposit does** (vocations.md's demand test, passed only by law) | the cleanest lesson in the whole game: *a vocation appears when the polity prices an externality* — no deposit, no can collector; Pfand made a livelihood out of the Berlin park |
| **remelt** | empties → ingot | **substrate** — furnaces exist, `meltingPoint: 933` is authored, phase change is modelled | a `remelt` recipe (any furnace ≥ 933 K, N cans → 1 ingot of aluminium at ~5 % the smelt's energy) | the loop closes in-game the way it does in life; the census can tell primary from recycled if the ingot row says so |
| **the polity** | the deposit law, the tethered-tab rule, the size standard | **substrate** — offices, governments, the legal-code design | law as content: a locality's `bottle-bill` clause that attaches the deposit leg | measurement.md layer 3: *the polity imposes*; the can is what it imposes on |
| **the wiki** | the can's page, the material's page, the loop | **built** (the encyclopedia) · nothing authored | a `can` article in `wiki-starter` that *is* section 0 of this slate, revealed by capability like everything else | the first screen is the syllabus |

## 2. What we are NOT simulating, and whether that's a choice

- **Chemistry as a subsystem.** Refining, the lining, going flat,
  caffeine: four can-facts that all want a chemistry model, and no doc
  owns one (metabolism has meal chemistry; materials have composition;
  nothing has *reactions*). Not a can problem — a gap the can exposes.
  **Choice: name it, don't build it here.**
- **Energy per recipe.** `requiresHeatK` says how hot; nothing says how
  much. Smelting is the recipe that makes the omission absurd. **Choice:
  a `Recipe.energyKWh` field is a one-line substrate change that makes
  every furnace honest; the metering of it is electricity.md's.**
- **The alloy detail.** 3004 vs 5182, the lining — real, but below the
  resolution any player acts on. **Choice: out, with a note in the
  material row (done).**
- **Logistics.** The hand teleports; the pallet doesn't exist. The
  freight slate is where that lives. **Choice: out of this build; the
  pallet gets its own row below because it's the RTI exemplar.**
- **Market-specific standards** (330 vs 355, Pfand vs kerbside). A
  *locality* decides these, by law and by what its bottling floor
  ships. **Choice: the can is 330 mL because the shipped world is not
  America; a second market ships its own row.**

## 3. The content-pack organising principle, tested by the can

- **trade = process.** Bottling *fills*; it doesn't make cans and it
  doesn't smelt. So: `aluminium` → base-library (a commons material);
  the empty `can` → **bottling** *for now* (a stub ships everything
  downstream of production, and the empty can is bottling's input — the
  first thing the can-making trade takes back when it exists);
  `can-of-cola` → bottling (its product); `remelt` → the furnace's
  trade (smithing today; a scrap trade when one exists); the deposit →
  the **polity's** content (a locality's law), never a trade pack; the
  scavenger → nobody's — a vocation is an emergent, not a row.
- **corpo = capital.** A can maker (Ball, Crown) is a corpo that *owns*
  a forming floor in the metal trade's pack. Nothing here changes the
  rule from MR !206.
- **The standard is the exemplar row + the README, not inheritance.**
  A pack author making a canned product copies `can.yaml`'s
  construction and adds the fill. The enforcement is the filling
  recipe's `outputTemplate` — it has to be a real vessel row. No
  `vessel:` pointer, no lint: that would be inheritance in disguise.

## 4. The ideal can, as rows

```yaml
# trade-bottling/content/trade/bottling/thing/can.yaml — the EMPTY vessel
class: /platform/thing/Bottle
data:
  shortDescription: "a can"
  longDescription: "A 330 mL aluminium can — drawn in one piece, lined, the lid seamed on. It weighs almost nothing."
  primaryKeyword: can
  keywords: ["can", "tin", "empty"]
  material: /stuff/idea/material/element/aluminium
  interiorBulk: true
  interiorCapacity: 0.33
  closure: sealed          # construction: gas-tight — it keeps fizz
  open: true               # state: an empty can is an opened can
  censusKey: can           # the EMPTY's own census (the returns market's count)

# thing/can-of-cola.yaml — the PRODUCT: the same vessel, filled and seamed
  …everything above, plus…
  shortDescription: "a can of cola"
  interiorMaterial: /trade/bottling/idea/material/cola
  interiorAmount: 0.33
  open: false
  censusKey: mixer:cola-can   # derives back to `can` when drained (the census fix)
  regionTarget: 24
  container: /trade/bottling/thing/bottling-stock
```

## 5. The wooden pallet (the other perfect object) — one row

The pallet is the **returnable transport item**: 1200 × 800 mm (EUR) or
48 × 40 in (GMA) — again standardised per market; ~25 kg of softwood;
repaired more often than replaced; pooled by rental corpos (CHEP's blue
pallets are *never sold*, only leased — a capital model with no
equivalent in our economy yet). It is what a `Crate` sits on, what a
truck carries, what a forklift lifts, and the single object freight
cannot be modelled without. It belongs to the freight slate; it is
named here because the can and the pallet are the two objects whose
*entire* value is the loop they travel, and the game has neither loop.

## 6. What to do now (this MR) vs later

**Now, small, content + one derive-on-read:** fix the eight vessel rows
(construction in the description, `open: true`, aluminium on the can,
`sealed` on the capped bottles); the census derives from state; a
`can-of-cola` row + its price on the menu; the bottling README rewritten
as the standard.

**Later, in order of how much of the loop each closes:** the deposit
(law + contract leg — closes *collection* and mints a vocation) · the
`fill` recipe (closes *filling*; the pool of empties becomes real) ·
`remelt` (closes the loop) · `Recipe.energyKWh` + smelting · the
metal-forming trade · going flat · caffeine · the pallet, with freight.
