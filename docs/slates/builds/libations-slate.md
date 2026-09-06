# Libations slate — the bar's supply chain, and putting things where they go

> **Built 2026-08-28 on `design/libations`** — review rulings: a corpo pack is capital + the mark only (products in the trade pack); **a verb lives with the pack whose content affords it** (hospitality/hearth-cooking/smithing own their steps; the capability vocabulary is open and a tool row names its own verbs; `menu`/`order` are platform `retail`). The requirements
> (D1–D14) and plan (six phases, twenty findings) were **retired at the
> pre-merge sweep**; what the code forced is recorded here and in the
> subsystem docs: the lounge stays
> a data pack, `measureCount` is the shipped `count`, `shake` existed, the
> display composes no aether mixin, the blend base went to the platform
> pack, the sweep needed the batch draw + a boot run). Build-time
> deviations worth knowing: `held` is an unconditional drive rung; the
> Crowsfoot Brand row ships with trade-distilling at the catalogue's
> `/stuff/idea/corpo/Brand/` prefix; cadence is real-time only (Mara
> restocks every 10 min); no glassware supplier exists yet; cost of goods
> derives on read. **The corpos roster re-cut** (Part 4) is now shipped
> content: Veshko makes, Hollis private-labels, Vionne/Goodkin/Aevex ship
> no bottle — and (review ruling) **a corpo pack is capital + the mark,
> never products or trade localities**: both yards live in
> `trade-distilling` (`location/veshko-yard/`, the `hollis-*` rows), owned via `parentOrganization`. Subsystem homes: [retail.md](../../subsystems/retail.md),
> [employment.md](../../subsystems/employment.md),
> [crafting.md](../../subsystems/crafting.md),
> [display.md](../../subsystems/display.md),
> [residency.md](../../subsystems/residency.md),
> [content-packs.md](../../subsystems/content-packs.md).

> **Status: design conversation, captured 2026-08-28. Not requirements.**
> The second pack of the alphabetical reorg (*b*: the bar), and the first
> one that is not a refactor for its own sake — the point is a **fully
> realized, shippable system**: Dave's Bar operating on a real supply
> chain with no magic in it — and a **real menu** (Part 9) driving a
> real ingredient catalog, because the menu is the demand everything
> upstream exists to meet.

> **User: "the point of splitting all this content pack out wasn't just a
> refactor for its own sake, I wanna start actually trying to build fully
> realized shippable systems. the bar is like half realized if that."**

> **User: "I wanna start putting things where they really go instead of
> 'generic' object buckets. and the few buckets we have of generics I
> wanna pull shit outta of there."**

Seeds and neighbours: [daves-bar-slate](./daves-bar-slate.md) (the
experience — this slate builds its supply half),
[supply-chain-slate](./supply-chain-slate.md) (⭐ *the magic is four
lines and the fix is a deletion*; the store is the hinge; a business
cannot buy; the martini end to end), [corpos-slate](./corpos-slate.md)
(the mark + the approval vector; the roster this slate re-cuts),
[retail-slate](./retail-slate.md), [content-packs-slate](./content-packs-slate.md)
(*pack = a trade*; *every trade ships a showroom*; *seed backwards from
sinks*), [pack-seams-slate](./pack-seams-slate.md) (annex knows host,
never the reverse), [vocations.md](../../vocations.md) (a link exists
iff someone could make a living at it). Substrate:
[retail.md](../../subsystems/retail.md), [banking.md](../../subsystems/banking.md),
[employment.md](../../subsystems/employment.md), [crafting.md](../../subsystems/crafting.md),
[bulk.md](../../subsystems/bulk.md), [corpo.md](../../subsystems/corpo.md),
[behavior.md](../../subsystems/behavior.md), [activity.md](../../subsystems/activity.md),
[content-packs.md](../../subsystems/content-packs.md) (the capability rung).

---

## Part 0 — What the bar is today

The **sink is finished.** A room, four bartenders on a real roster with
shifts and wages, a menu with prices, `order martini` → the on-shift
`Maker` → the recipe consumes 0.06 L of gin + 0.01 L of vermouth from
real bottles → a drink in a glass → a Charge settles from the patron's
credential to the bar's account at Goodkin → the deficit P&L reads
income against wages. Attendant queue, tip jar. Two recipes (martini,
daiquiri). The customer-facing loop is real. (⚠ Corrected at
requirements: the **glass pool is NOT built** — `CraftingLogic` clones
the output glass per drink, so every order mints a glass and nothing
busses or washes it. daves-bar-slate designed the pool; this build
ships it.)

Five things are fake or missing, and they are the whole build:

| # | | where |
|---|---|---|
| 1 | **The bottles are magic.** `bar.yaml` `populates:` re-clones four house bottles every boot. Bulk drains as drinks pour; the reboot refills. | `saxonberg-lounge/…/location/bar.yaml` |
| 2 | **A business cannot buy.** `BuyController`'s payer is the giver's own credential; the bar has an account nothing can spend on inputs. | kernel — the one real mechanism gap |
| 3 | **Nobody restocks.** The back loop (par, inventory, replenish) is designed in daves-bar-slate and unbuilt. Delete the magic without it and the bar runs dry. | the lounge pack |
| 4 | **The brands are one row each with nothing behind them.** Five corpo `Brand` rows; **no corpo bottle anywhere in the world** — the only branded bottles are two non-Bulkable demo props in `generic-objects/corpo/demo/`; the rail is stamped `crowsfoot-gin`, a demo brand parked in generic-objects; the spirits are "house" categories in base-library. | the corpo packs, generic-objects, base-library |
| 5 | **Nobody sells to the bar.** No supplier, no store carrying spirits. | a new trade |

---

## Part 1 — ⭐⭐⭐ Why it felt complicated: three axes, one word

> **User: "why is this so complicated?"**

Because everyday language collapses **three different things** into one
word, and the model inherited the collapse. Kirkland vodka: the **brand**
is Costco's, the **maker** is a distillery in Ohio that also makes other
people's vodka, the **capital** is Costco's. Diageo: a dozen heritage
distilleries make it, the brands feel independent, the capital is one
megacorp. We had been treating *corpo = brand = producer* as one fact,
which is why "does Goodkin make whiskey?" seemed to need a mixin on a
bottle.

| axis | what it is | in the model |
|---|---|---|
| **a trade** | a **process** — grow, ferment, distil, extract, cook, bottle | a pack (*pack = a trade*); the vocations test |
| **a brand** | a **mark** — a label with an `owner` | a `Brand` row; cheap, content-only; anyone's (a corpo, an independent, a player) |
| **a corpo** | **capital** — it owns businesses | an `Organization`; a corpo distillery is a `Business` with `parentOrganization` (the business = economy / organization = chart split) |

Once separated, the store-brand instinct is exactly right, and it is
**real economics rather than a stylistic choice**: **corpos private-label
generics.** Volk is not Veshko's craft; it is the well rail — made in
volume, consistent, everywhere. Premium is independent *by count*. And
the wrinkle (capital interest in "independent" wineries) is not an
exception but a **future mechanic**: a corpo *buying* an independent
brand — the label stays, the capital changes, and the regulars notice or
don't. It falls out of the split for free.

### ⭐ The corpo mixin question, answered

> **User: "I would think that GoodkinBrandedMixin always does at least one
> thing which is it hardwires the brand to goodkin just by composing the
> mixin. I dunno if that's enough to justify its existence the way
> templating works."**

It is not. A mixin that only sets a key is what a template row does
(`_brandKey:`). Mixins are for **behavior**, and with corpo = capital the
ethos behaviors belong on the corpo's **business** (pricing, the approval
vector) or on the **material** (aevex's chemistry), never on the bottle.
**No per-corpo mixins; the corpo packs stay data packs.** (A proposal to
the contrary was made and withdrawn in the same conversation.)

---

## Part 2 — ⭐⭐ How corporate is the world? Two dials, not one

> **User: "is most stuff corpo affiliated or most not? or half and half?
> like what's the experience we're actually trying to create."**

- **By volume, mostly corpo.** Walk into any store: the shelf is ~80%
  generics. That is the NPC floor — the sanctioned faucet, cheap, always
  there.
- **By count of interesting things, mostly not.** The good stuff is rare
  and made by somebody — and "somebody" is the player-apex. This is the
  corpos slate's own thesis (*large = corpo = floor; micro = independent
  = apex*) made concrete.

The **feel** dial — 80/20 vs 50/50 — is genuinely stylistic and stays
**out of the kernel**: it is how many generics vs independents a shelf
stocks, which is content (a venue's par list) and a distribution setting.
The pedagogy is strongest exactly here — *why is the store brand cheaper,
and who really made it* is a real question with a real answer.

---

## Part 3 — The corpos in booze: two, and what each actually does

> **User: "I dunno if every corpo makes alcohol. Maybe just two."**

With corpo = capital the question becomes "which corpos own a distillery
or a bottling line", and two is right:

| corpo | in booze? | what it does |
|---|---|---|
| **Veshko** (industrial, vertical integration) | **yes — makes** | owns the volume distillery. **Volk** vodka (the well) and the generic whiskey. |
| **Hollis** (mass retail) | **yes — private-labels** | distils nothing; **Old Hollis** / **Hollis Cane** are Veshko's liquid under a cheaper label — the Kirkland structure, literally, and a lovely thing for a curious player to discover. |
| **Vionne** (luxury house) | later | makes nothing; **owns** a premium brand it *bought* — the capital-interest mechanic. Until acquisition exists, Vionne has no bottle. |
| **Goodkin** (staples, food) | no | not in spirits. Its whiskey line is retired; a staples corpo belongs in beer, coffee, or bread. |
| **Aevex** (synthetics) | no — a different trade | *aevex zero* is not a spirit; it is a synthetic **material** (zero congeners) from **compounding** (pharma). The brand row stays; not this build. |
| **the independents** | **yes — make** | the premium tier by count; the player-apex. **Crowsfoot Gin** is the exemplar. |

### The shelf (the roster, re-cut)

| brand | owner | category | the drink it exists for |
|---|---|---|---|
| Volk | Veshko | vodka | vodka soda — the well |
| Old Hollis | Hollis (Veshko's liquid) | whiskey | whiskey sour |
| Hollis Cane | Hollis (Veshko's liquid) | rum | the daiquiri |
| Crowsfoot Gin | independent | gin | the house martini |
| *(house vermouth)* | generic | vermouth | the martini — until winemaking |
| *(ale)* | generic → brewing | beer | a pint |
| *(red / white)* | generic → winemaking | wine | a glass |

Every brand has a drink; every drink has a bottle; **the shelf takes a
side** (the corpos slate's legibility payoff) — Volk in the well, Old
Hollis for the regulars, one Crowsfoot from the little place across town.
Vionne Noir, Vionne Rouge, Goodkin Reserve and aevex zero **come off the
rail** — their rows survive as brands with no product until their
mechanics (acquisition, compounding) exist. *Nothing is half-grown.*

---

## Part 4 — ⭐⭐ The industry lines are PROCESSES, never substances

> **User: "does spirits include beer and wine? what about cannabis? where
> are the lines between these industries? where does libations stop and
> pharma begin? what about mixers?"**

Alcohol *is* a drug; what differs between libations and pharma is the
**process**, and a trade is a process:

| process | trade | products |
|---|---|---|
| **grow** | farming — husbandry / smallholding (ships) | grain, grapes, cane, limes, botanicals, **cannabis flower**, tobacco |
| **ferment** | **brewing** (beer) · **winemaking** (wine; vermouth is fortified wine) | the durative transform — supply-chain Part 1 |
| **distil** | **distilling** | gin, vodka, whiskey, rum |
| **extract / react / purify** | **pharma** (the farming slate's synthesis branch) | tinctures, cannabis extracts, aevex zero |
| **cook** | hearth-cooking (ships) | syrups, edibles |
| **press / bottle** | a bottling line — *or* hospitality's own labor | juice, soda, tonic |

- **Cannabis is three things in three trades**: flower is a farm product
  (like tobacco), extract is pharma, an edible is cooking. No "cannabis
  trade".
- **Mixers**, for the bar, are hospitality's own labor (pressed lime,
  house syrup) plus generics bought like anything else. A bottling trade
  earns its pack when someone can make a living at it — not before.
- **Vermouth needs winemaking**, which itself needs distilling's spirit
  (the convergence supply-chain Part 6 found). So until winemaking
  *produces*, vermouth is a generic the bar buys.

### ⭐ The three libation trades, and what a stub is

> ✅ **PARTLY OVERTAKEN — the fermentation build (2026-09-01, MR !215)
> de-stubbed winemaking, brewing and distilling's production**: the
> working winery/brewhouse/still-house produce by brain over the
> kernel ferment; their floor faucets are retired (the switchover).
> Bottling stays the stub (carbonation is its own physics), and the
> cash-and-carry moved to the `distribution` pack (D10 — sibling
> trades share no edges). See docs/subsystems/maturation.md.

> **User: "I kinda wanna stub the winemaking and maybe even brewery trades
> if we're planning on stocking beer and wine in the bar."**

Three trade packs, one per process. **Distilling** ships whole at the
supply tier; **brewing** and **winemaking** ship as *stubs* — and a stub
here has a precise meaning that keeps *never half-grown* honest:

> **A stub trade ships everything DOWNSTREAM of production and nothing
> of production itself.** Its materials, its vessels (bottle / keg /
> cask presets), its brand rows, its generic floor product on the
> distributor's shelf, and the hospitality recipe that serves it. What
> it does not ship is the transform that makes the liquid — the ferment
> and the still are the **distillery build** (supply-chain Parts 1 + 6),
> where the independent producer and the player-apex arrive together.

So beer and wine are on Dave's shelf, bought and poured and paid for
like everything else, from a floor that is honestly a floor. A stub is
complete at its tier, exactly as the retail slate's general store was.

---

## Part 5 — The packs

| pack | rung | ships | depends on |
|---|---|---|---|
| **`trade-distilling`** | capability | the spirit **materials** (gin, vodka, whiskey, rum light + dark, **tequila** — out of base-library) and the **liqueurs** (orange, bitter, aperitivo, bitters — distilling's compounding step), the `Bottle` preset (a `GradedReceptacle` with the glassware boilerplate — the `Potion` pattern), the **still** (a furnace-family station, so the distillery build has its tool waiting), the independent brand + bottle (**Crowsfoot Gin** — out of generic-objects), the generic floor bottles, the trade's **showroom** (below), the `distilling` discipline (the discipline rule: with the pack whose code derives it) | platform, base-library (glass, water), generic-objects for nothing |
| **`trade-brewing`** (stub) | data | ale / lager materials (`drink/ale` out of base-library), keg + cask presets, a generic floor beer, "a pint" | platform, trade-distilling? no — independent |
| **`trade-winemaking`** (stub) | data | wine materials (red, white, sparkling) + **vermouth** (dry + sweet — out of base-library; fortified wine is winemaking's), the wine `Bottle`, generic floor wines + the house vermouths, "a glass of …" | trade-distilling (fortification names its spirit) |
| **`trade-bottling`** (stub) | data | the soft mixers (soda water, tonic, ginger beer, cola, grapefruit soda, bottled juices), a bottle/can preset, the generic floor | platform |
| **`trade-farming`** (stub) | data | fresh produce materials (lime, lemon, orange, grapefruit, mint, cherry, olive, cranberry — and the crops out of generic-objects), crate/basket presets, the greengrocer floor; the beginning of the farming pack | platform, base-library |
| **`corpo-veshko`** | data | the Volk bottle rows + the **Veshko distillery** — a `Business` (`parentOrganization: veshko`) that is the floor's producer of record | trade-distilling |
| **`corpo-hollis`** | data | the Old Hollis / Hollis Cane bottle rows (the private label: `interiorMaterial` = Veshko's generic, `_brandKey` = Hollis's) | trade-distilling, corpo-veshko |
| **`trade-hospitality`** | data → capability if the ice machine / tap need a class | the **v1 menu** (Part 9: ~24 recipes), the house recipes (`press`, simple syrup, the garnish cuts), the tools (muddler, bar spoon, strainer, juicer, tap, ice machine), nine glassware presets | + the five libation trades |
| **`saxonberg-lounge`** | capability (LoungeMixin) | the four magic `populates` lines **deleted**; the bar's **par manifest**; Mara's **restock** brain; the Bar's shelf re-cut per Part 3 | + the libation trades, corpo-veshko, corpo-hollis |

### ⭐⭐ The showroom is the distributor, and the corpos consign into it

Every trade ships a showroom (content-packs-slate A13). Distilling's is
a **cash-and-carry** — the store hinge from supply-chain Part 3: a
`Business` with a `Stock` counter that the bar *buys* from. Two rules
keep the dependency graph honest:

- **The distributor stocks by consignment, never by `populates`.** A
  corpo pack *consigns* its bottles onto the distributor's stock
  (consignment is the shipped mechanism, and it is exactly diegetic:
  Hollis consigns to the wholesaler). The annex knows the host, never
  the reverse — `trade-distilling` never names a corpo.
- **The floor is minted at the producer of record**, not at the shelf.
  Veshko's distillery is the sanctioned faucet (the corpos slate's
  *large = corpo = floor*): the distribution sweep keeps its stock at
  target and the distillery consigns onward. When the distillery build
  lands, the *independent* producer replaces the faucet for its own
  brand and nothing else changes.

**Who owns the distributor** — an independent cash-and-carry, or
Hollis (mass retail is literally that)? *Decision deferred to
requirements.* The Hollis answer is dramatic (the outsider Crowsfoot
must sell through the megacorp) and real; the independent answer is
simpler and keeps the corpo count at two. ⚠ Either way it is a Business
with positions, an account and a bank — *everything is a business*.

---

## Part 6 — The kernel bill (small)

| # | what | why it is kernel |
|---|---|---|
| 1 | **A purchase paid from a business account.** `buy <thing> --for <business>` (or the proprietor's / a purchasing position's standing authority) settles from the business's account, stamps the chattel to the business. | the one gap supply-chain Part 3 named; used by the restock brain and a player proprietor alike |
| 2 | **The par manifest.** `{ input category, min grade, par level (L or count), supplier }` on the venue — an owner-set policy. | the daves-bar slate's "one genuinely new piece, and small" |
| 3 | **`restock` — the back loop as a brain + an activity.** Count the rail against par (a perception act — you *see* what is low), buy the shortfall from the supplier on the business's account, carry it in, place it on the back-bar. NPC-first (Mara's brain), player-available (the same verbs). | closes the loop with NPCs alone — DAU-independent |
| 4 | The `Bottle` / `Keg` / `Cask` presets. | the `Potion` pattern; a catalog row is three lines |
| 5 | The **grade seam** (supply-chain Part 6): filling a receptacle carries the batch's band onto it. | small, load-bearing for the distillery build; verify first |

Not kernel, deliberately: the shelf-mix dial (content); brand ethos
behaviors (the corpo's business + the approval vector, Phase 2 of the
corpos slate); the ferment transform + the still's recipes (the
distillery build); the bottling line; acquisition (the capital-interest
mechanic — its own slate when a corpo first buys a brand).

---

## Part 7 — ⭐ Putting things where they go: the generic drain

> **User: "I wanna start putting things where they really go instead of
> 'generic' object buckets."**

`generic-objects` is the junk drawer by its own description, and
`base-library` has grown product categories that belong to trades. The
rule this build applies, and every later pack applies again:

> **A row lives in the pack whose PROCESS makes it or whose CONTENT
> names it. The commons keeps only what no trade makes and every trade
> uses.**

What this build moves (the libation rows), and where the rest goes when
its trade arrives:

| today | rows | goes to |
|---|---|---|
| `base-library/material/spirit/` | gin, rum, vermouth, lime | **trade-distilling** (gin, rum + vodka, whiskey new); vermouth → **trade-winemaking**; lime → farming produce (a `food/` material beside the crops it comes from) |
| `base-library/material/drink/ale` | ale | **trade-brewing** |
| `base-library/material/cocktail/mixed` | mixed | **trade-hospitality** (the drink is the bar's) |
| `generic-objects/idea/corpo/Brand/crowsfoot-gin` + `thing/corpo/demo/*` | the independent brand; two demo bottles | brand + bottle → **trade-distilling**; the demo props **deleted** (the real bottles replace them) |
| `saxonberg-lounge/thing/{gin,rum,vermouth,lime}-bottle` | the four magic bottles | **deleted**; the rail is bought stock |
| `generic-objects/thing/vessel/{mug,urn,thermos}` | drinkware, an urn, a thermos | mug → **trade-hospitality**; urn/thermos stay commons (every trade uses them) |

Not this build, but named so the drain has a direction — the rest of
`generic-objects` by the same rule: `arms/` + `armor/` → the smithing
trade (what it makes) with a future armoury; `gear/{anvil,smiths-hammer}`
→ trade-smithing (already its stations' twins); `items/{cuts, logs,
rations}` → hearth-cooking / a butchery trade / forestry as each arrives;
`instrument/` → a scientific-instruments trade (the instrumentation
slate); `crop/`, `seed/`, `plant/`, `pot/`, `bed/` → farming; `clothes/`
→ textiles (the cosmetics slate's chain); `traps/` → the trapping /
security trade; `room/`, `exits/`, `surface/`, `fixture/` → the platform
or a builder's trade. What remains commons is short: `Coin`, `Key`,
`PaymentCard`, `AetherImplant`, `Corpse`, water, air, salt-water.

---

## Part 8 — What "fully operational" means (the acceptance shape)

The bar is operational when this runs **with no player logged in**:

1. Boot on a fresh DB. No `populates` mints a bottle. The Veshko
   distillery stands at its stock target; Hollis's and Veshko's bottles
   are consigned at the distributor; Crowsfoot's one bottle is consigned
   too (the independent, at the floor **only until the distillery build**
   — flagged, not hidden).
2. The bar opens with an **empty rail** and a par manifest. Mara's brain
   runs `restock` on her shift: counts, buys on the bar's account, carries
   in, places. The distributor's stock falls; the bar's account falls;
   the consignor's account rises on resale.
3. A patron orders **every line of the v1 menu** (Part 9) over a game-
   week — a martini (Crowsfoot + house vermouth, an olive), a daiquiri
   (Hollis Cane + pressed lime), a vodka soda (Volk, a wedge, ice), an
   old fashioned (Old Hollis, a dash of bitters, a peel), a mojito
   (muddled mint), a pint from the tap, a glass of red, a coffee. Each
   consumes real bulk from a bought bottle or a pressed lime or a bucket
   of ice; each settles a Charge; each garnish is a thing on a glass.
4. The rail drains over a game-week; restock replenishes it; the bar's
   P&L now carries **cost of goods** against income and wages, so the
   deficit the central bank subsidises is a real number and the
   credit slate's `match_rate` has something true to measure.
5. Nothing is ever refilled by a reboot.

---

---

## Part 9 — ⭐⭐ The menu, and everything it exposes

> **User: "I wanna fill out a lot more recipes and then of course if we
> make more recipes we need more ingredients … enough for any healthy bar
> to offer. and then whatever else the recipes expose we need, we need to
> include that in the requirements too."**

The menu is the **forcing function**: a real bar list is the demand,
and every ingredient it names is a row that must live somewhere, every
tool it needs is a station, every technique is a capability, and every
thing a recipe cannot yet say is a gap in the substrate. So author the
menu first and derive everything else from it — *seed the economy
backwards from the sink*, one level deeper.

### The list (v1 — what a healthy neighbourhood bar offers)

| # | drink | base | the rest | tool → technique | glass |
|---|---|---|---|---|---|
| 1 | Martini | gin | dry vermouth · olive **or** lemon twist | mixing-glass → stir | coupe |
| 2 | Gin & tonic | gin | tonic · lime wedge · ice | — → build | highball |
| 3 | Negroni | gin | sweet vermouth · bitter liqueur · orange peel · ice | mixing-glass → stir | rocks |
| 4 | Tom Collins | gin | lemon juice · simple syrup · soda · ice | shaker → shake | collins |
| 5 | Gimlet | gin | lime juice · simple syrup | shaker → shake | coupe |
| 6 | Vodka soda | vodka | soda · lime wedge · ice | — → build | highball |
| 7 | Moscow mule | vodka | ginger beer · lime juice · ice | — → build | mug (copper) |
| 8 | Cosmopolitan | vodka | orange liqueur · cranberry juice · lime juice | shaker → shake | coupe |
| 9 | Screwdriver | vodka | orange juice · ice | — → build | highball |
| 10 | Old fashioned | whiskey | sugar · bitters · orange peel · ice | bar-spoon → build/stir | rocks |
| 11 | Whiskey sour | whiskey | lemon juice · simple syrup · (egg white — v2) | shaker → shake | rocks |
| 12 | Manhattan | whiskey | sweet vermouth · bitters · cherry | mixing-glass → stir | coupe |
| 13 | Whiskey ginger | whiskey | ginger beer · ice | — → build | highball |
| 14 | Daiquiri | rum | lime juice · simple syrup | shaker → shake | coupe |
| 15 | Mojito | rum | mint · lime · sugar · soda · ice | muddler → muddle, build | highball |
| 16 | Dark & stormy | rum (dark) | ginger beer · lime wedge · ice | — → build | highball |
| 17 | Cuba libre | rum | cola · lime wedge · ice | — → build | highball |
| 18 | Margarita | tequila | orange liqueur · lime juice · (salt rim) | shaker → shake | coupe/rocks |
| 19 | Paloma | tequila | grapefruit soda · lime · ice | — → build | highball |
| 20 | Aperol spritz | (wine) | aperitivo · sparkling wine · soda · orange slice · ice | — → build | wine |
| 21 | A pint | beer (ale / lager) | — | tap → pour | pint |
| 22 | A glass of wine | wine (red / white / sparkling) | — | — → pour | wine / flute |
| 23 | Coffee | coffee | — | urn → pour | mug |
| 24 | Soda / tonic / juice | mixer | ice | — → pour | highball |

Twenty-four lines, a well of **five spirits** (gin, vodka, whiskey, rum,
tequila), and — deliberately — no blender drinks, no cream, no egg in
v1 (Piña colada, White Russian, a sour with a foam: **menu v2**, when
dairy and poultry have a trade).

### The ingredient matrix, and where each row goes

| category | ingredients | process | pack |
|---|---|---|---|
| **spirit** | gin, vodka, whiskey, rum (light + dark), **tequila** (agave — a fifth category) | distil | **trade-distilling** |
| **liqueur** | orange liqueur (triple sec), bitter liqueur (a campari), aperitivo, **bitters** (dashes) | distil + **compound** (macerate — distilling's own compounding step, not pharma: it starts from spirit) | **trade-distilling** |
| **fortified wine** | dry vermouth, sweet vermouth | ferment + fortify | **trade-winemaking** (stub) |
| **wine** | red, white, sparkling | ferment | **trade-winemaking** (stub) |
| **beer** | ale, lager | ferment | **trade-brewing** (stub) |
| **soft / mixer** | soda water, tonic, ginger beer, cola, grapefruit soda, cranberry juice, orange juice (bottled) | **bottle** | **trade-bottling** (stub) — earns its pack here: seven products and someone could make a living at it |
| **fresh produce** | lime, lemon, orange, grapefruit, mint, cherry, olive, cranberry | grow | **trade-farming** (stub) — everything downstream of growing: the materials, crate/basket presets, the floor at a greengrocer; the beginning of the farming pack the reorg reaches at *f* |
| **pantry** | sugar, simple syrup, salt, coffee | cook / mill | **trade-hearth-cooking** (syrup is a recipe; sugar + salt are its pantry materials — `salt` and `coffee` move out of base-library's `bulk/`) |
| **ice** | ice (cubes, crushed) | freeze — *bought bagged in v1* (Part 10) | the **distributor's floor**, kept in hospitality's **ice bin**; the ice machine waits for power |
| **house-made** | pressed lime / lemon / orange / grapefruit juice, simple syrup, a twist / a wedge / a peel | press / cook / cut | **trade-hospitality** (recipes: `press`, the syrup, the garnish cuts) |

**Five stubs, then, not two** — brewing, winemaking, bottling, produce,
and (already shipped, extended) hearth-cooking's pantry. Each is complete
at its tier by the Part 4 definition; each is the downstream half of a
trade the reorg will reach.

### The tools and the glassware (hospitality's)

| tool capability | station | technique |
|---|---|---|
| `shaker` (ships) | the cocktail shaker | shake |
| `mixing-glass` (ships) | the mixing glass | stir |
| `muddler` | a muddler | muddle |
| `bar-spoon` | a bar spoon | build / stir in glass |
| `strainer` | a Hawthorne strainer (rides the shaker + mixing glass — or is their own capability) | strain |
| `juicer` | a citrus press | press |
| `tap` | a beer tap on a keg | pour (draught) |
| ~~`ice-machine`~~ → **ice bin** | an insulated vessel; the ice is *bought* (Part 10) | hold |
| `urn` (ships as a vessel) | the coffee urn | pour |

Glassware as **output templates** (the recipe's `outputTemplate` is the
glass): coupe, rocks, highball, collins, pint, wine, flute, mug, the
copper mug. Nine presets on the existing `cocktail-glass` shape, each in
the **cycling pool** (daves-bar-slate § glassware — claim, serve, bus,
wash; never minted per drink).

### ⭐⭐ What the recipes cannot yet say — the substrate this exposes

The recipe schema today: `inputSlots[]` by **category + minGrade +
measureL** (bulk) or a tangible carrying the tag, `toolCapabilities`,
`outputTemplate`, `requiresHeatK`, `outputApplication`. The menu needs
five things it has no word for, and each is a requirements line:

| # | gap | what the menu needs | the shape (for requirements, not the planner) |
|---|---|---|---|
| 1 | **Garnish** — a solid ON a drink | an olive in the martini, a wedge on the rim, a twist, a mint sprig, a cherry | a recipe `garnish:` slot: a tangible (or a cut of one) **placed on the served glass** (`Surfaced` / adornment), consumed with the drink or bussed with the glass; visible in the drink's presentation |
| 2 | **Ice — chill and dilution** | every built drink; the shaken ones dilute | ice is a bulk material (frozen water); a slot `ice: cubes \| crushed \| none`; the drink's temperature is real (Receptacle already composes Thermal) and **melt = dilution** (a bulk transfer into the drink over time — the thermal substrate + bulk, no new physics) |
| 3 | **Technique** | shake vs stir vs build vs muddle changes the result (texture, dilution, temperature) | technique **is** the tool capability — the recipe's `toolCapabilities` already names it; what is missing is the *consequence*: shake = colder + more dilute + aerated; stir = cold, clear; build = as poured. A small table the drink's presentation and thermal reconcile read. No new verb: `mix` dispatches on the tool present |
| 4 | **Dash measures + count measures** | bitters by the dash (~1 mL); sugar by the cube; a wedge by the count | `measureL` handles 0.001; a `measureCount` for tangibles (the schema's `kind: tangible` needs a count) |
| 5 | **Carbonation** | soda, tonic, ginger beer, sparkling wine go flat | a material **tag** now (`carbonated`) that the presentation reads; fizz decay is a spoilage-slate concern, not this build |

And one the bar exposes at the **station** level: the **tap** is a
dispenser over a supply — keg-fed for beer, source-fed for water (Part
10) — a `Surfaced` fixture with a bulk source behind it, the
supply-chain hinge in miniature. (The ice machine, and with it the bar's
first power draw, is deferred to the supply design pack; v1 buys ice.)

### What this does to the par manifest

A healthy bar's par is no longer four bottles: it is **~35 lines** across
seven categories, in three units (litres for bulk, count for produce and
glassware, kilograms for ice). That is the argument for the par manifest
being **structured by category with a supplier per line**, and for
`restock` visiting **more than one supplier** (the distributor for
bottles, the greengrocer for produce, the bottler's shelf for mixers —
or one cash-and-carry that stocks all three by consignment). *Requirements
decides the supplier topology;* the slate's preference is **one
distributor, many consignors**, because it is one trip and one
mechanism, and it is how a small bar actually buys.

---

## Part 10 — Water and power: utilities, not supply chains

> **User: "the bar's going to need a water source too but I'm not sure
> how much of that we're prepared to deal with this build."**

The line that keeps this small: **a bottle comes from a trade; water
comes down a pipe.** Utilities have their own model already — the
[supply design pack](./supply-design-pack.md) (planner-ready, unbuilt):
*coverage is legal, connection is physical*; a source answers *"is
anything coming out right now, and if not, why not"*; the recurring
charge rides the stewardship doctrine. The bar must not get a bespoke
meter ahead of the pack that meters every tap in the world at once.

The bar's water: ice, dilution and soda, **washing the glass pool**,
coffee. What ships for that is one row — an `UnboundedSourceMixin` tap,
exactly what the dorm tap and the Hinkley standpipe are. Infinite,
unmetered, honest about being a utility.

| | this build | when |
|---|---|---|
| **water** | a **tap** behind the bar at the shipped tier: unbounded, unmetered, the dorm's shape | metered by the supply design pack, with every other tap |
| **ice** | **bought.** Bagged ice from the distributor, kept in an insulated **ice bin** (the thermos shape); a line on the par manifest like any other bought thing | the ice machine returns when the socket does |
| **power** | **none.** Buying ice removes the ice machine — the only powered fixture the menu introduced — so the bar draws no power in v1 | the socket, the supply design pack |
| **the bill** | **named, not built:** water and power are recurring utility charges the P&L is *known* to be missing | they land on the P&L when the supply pack ships |

Part 9's tool table is amended accordingly: the `ice-machine` row is
struck for v1, an **ice bin** (a vessel, insulated) takes its place, and
the `tap` row covers both the beer tap (keg-fed) and the water tap
(source-fed) — the same dispensing shape over two supplies. This keeps
the build clear of the sync/async source seam the water pack stalled on.

---

## Part 11 — Archetypes, and the two things the repo calls that

Both apply, and the bar is the case that triggers the second:

- **Room archetypes** (the furnishing build): a `FurnishableRoom` row
  that is a *bundle* — the kitchen is "a range, a counter, a larder, a
  basin"; it confers nothing, it is the errand collapse. The bar wants
  **`bar`** (the back-bar, the well, the counter, the tap, the ice bin,
  the basin, the glass rack, seating) and **`cellar`** (racking, kegs,
  the cold store); the distributor reuses the general store's shape as
  **`warehouse`** (a Stock counter, racking, a dock). Dave's Bar becomes
  an *instance* of the bundle, and a player who opens a bar gets the
  same one from the provisioner.
- **The venue archetype** (content-packs A13.5 / A14): a declared
  `archetype` *document* stating an industry's floor **in capabilities,
  not furniture** — derives a synthetic test venue and a completeness
  checklist; never enforced at runtime. Declined until a third industry
  brought its own gap: **hospitality is the third industry**, and its
  floor (a water source, a dispensing station, cold storage, a work
  surface, seating) is genuinely different, so the kind ships here with
  `hospitality` as the exemplar.

> Room archetype = furniture (content, a bundle). Venue archetype =
> capabilities (a document, a floor). The bundle *satisfies* the floor.

---

## Part 12 — ⭐⭐ Verbs are for physical acts; operations are apps

> **User: "I'm hesitant to have verbs that are highly specialized like
> 'stocktake'. what's wrong with just 'get'? some processes are bespoke
> so yes that would need a verb like 'muddle'. but when we can stay
> generic we should. 'buy' should just be 'buy' everywhere."**

A verb earns a word when a body does something to matter — `muddle`,
`pour`, `wash`. Information and administration — counting stock,
setting par, the P&L, which account pays — are **apps**, and apps
already have a home: `house`, `wallet`, `job`. So: **no `stocktake`**
(`house stock`, a live card), **no `par` verb** (`house par`), **no
`buy --for`** (`buy` is `buy`; a purchasing position puts the *house
account in your wallet*, `wallet use house`), **no `bus`** (`get` /
`put`). New verbs: **`muddle`**, **`wash`**; `shake` only if `mix` is
not already the shaker's word. Mara's restock is the same three things
a player does — read `house stock`, `buy` with the house account
active, `put` on the rail. No verb exists that only an NPC can use.

---

## Part 13 — ⭐⭐⭐ Apps render on a DISPLAY; the display is a substrate

> **User: "emotes and dms work because they're both expressions that
> you're tuned into. but what are you tuned into for doing inventory?
> are we just materializing imagery into the person's mind? maybe you
> need an ocular implant as well as the cranial one, otherwise you need
> to carry around a screen."**

The three-base model already draws the seam: the aether host is *"ESP
in phenomenology — thoughts willed into existence, bypassing the sense
organs."* That is **expression**. A stock sheet is **imagery**, and
nothing licenses materializing it in a mind. So:

> **An app renders on a display. A display is a Thing — a tablet, a
> terminal, a wall screen — or (later) an ocular implant. The aether is
> only the link.**

> **User: "a generic tablet item is just a portable screen connected to
> the aether through its own modem. that also means you can control it
> with your mind, because your cranial implant has duplex communication
> over the network just like the tablet does. you can manipulate it
> with your hands but you don't have to."**

**The display substrate** — `DisplayMixin` on a Thing: `showing: Source
| null`, a modem (attunement intrinsic to a device), a pairing policy.

- **A display shows a SOURCE**, of two kinds — a **stream** (a
  `StreamerTarget`: the fights, the chamber, the news, real players in
  the lounge; the client renders the video embed, now *following the
  screen in front of you*) or a **card** (MQL-backed: the stock sheet,
  the auction board, a bill's countdown; the card surface with a
  *place*). The lounge slate lists both as screen content already. A
  per-display **source policy** is the fiction boundary (the lounge
  shows anything; Terminus shows in-world channels only).
- **Input is duplex over the aether; output is optical.** Drive a
  display by hand (holding it) or by mind (your implant, no hands) —
  the same command, two channels. Everyone who can **see** the screen
  sees what it shows; from the cellar you can drive the counter tablet
  by mind and still not see it. The ocular implant (later) is a display
  in your own visual field — the augment table's next row.
- **Pairing is the physics of the remote.** Who may drive a display is
  the display's policy: **`remote`** (whoever holds the paired remote —
  the lounge TV; possession is the ability, the room's tolerance is the
  social layer, *"the remote is not held, it is tolerated"* survives),
  **`held`** (a personal tablet), **`staff`** (positions on the signed-in
  principal — the house tablet), **`open`** (a terminal, a kiosk).
  Pairing your own implant to a TV that did not invite it is *hacking a
  display* — real, a security build's, not this one.
- **Display ≠ authority.** A display is *signed in* as a principal
  (the house tablet as the business), which scopes its apps; **money
  authority never comes from the screen** — `buy` on the house account
  needs the wallet to carry it, which a purchasing position confers. A
  thief with the house tablet sees the stock sheet and spends nothing.

⭐ **The tablet is the clipboard.** daves-bar's leadership thesis —
*"leadership = the inventory clipboard, recognized not granted,
transferred by continuity"* — needed no design: whoever is carrying the
house tablet is running the bar, and picking it up when Mara is gone is
the succession arc as a physical act.

**Ships:** the mixin with both source kinds and all four policies (a
"generic tablet" that only showed cards would be a claim, not a
proof); three instances — the **house tablet** (cards, `staff`), the
**terminal** re-homed onto it (cards, `open`), and **one TV with a
remote** in the sports booth (streams, `remote`) as the stream
exemplar; the client's focal embed learns to follow a shared display.
Not this build: the ocular implant, an app store (apps stay verbs), a
display streaming to another, the rest of the lounge's screens and the
channel lineup (the lounge's own build). Hospitality is the display's
*first consumer*, not its owner — it is platform substrate.

## Open (for requirements)

- Who owns the distributor (Part 5).
- Whether `restock` is one verb (count + buy + place) or the three it
  is made of; whether a player bartender may run it without the
  proprietor's purchasing authority (a position that `confers` it).
- The par manifest's home: a field on the Business (policy is the
  owner's) or on the venue (the shelf is the room's). Leaning Business.
- The pour: does "a pint" consume from a keg via the existing bulk
  transfer, or does brewing's stub need a **tap** station? (A keg is a
  `Receptacle`; a tap is a `Surfaced` fixture that dispenses — probably
  the latter, and it is small.)
- Lime: a farm product the bar *presses*. Does hospitality ship a
  `press` recipe (lime → juice, bulk output) now, or is juice a generic
  until farming ships citrus? Leaning: the recipe now, the crop later.
- The supplier topology (Part 9): one distributor with many consignors,
  or a distributor + a greengrocer + the bottler's shelf.
- Menu v2's line: dairy / egg / tropical fruit wait on ranching and a
  produce trade with a climate; the blender, like the ice machine, is a
  powered station and waits on the socket.
- The Crowsfoot faucet: consigned at the floor until the distillery
  build (accepted above), or off the rail until then? The conversation
  leaned *off the rail*; Part 8 keeps it *on, flagged* so the martini
  still exists. **Requirements decides.**
