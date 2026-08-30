# Libations — requirements

Dave's Bar becomes a **fully operational business on a real supply
chain**: no bottle is minted by a reboot, the bar buys its stock from a
distributor on its own account, someone restocks it, a healthy bar's
menu is on the board, every glass cycles, and every row a drink touches
lives in the pack whose process makes it. The build is the second pack
of the alphabetical reorg (*b*, the bar) and the first that is a
shippable system rather than a refactor. Alongside the bar it lands two
pieces of platform substrate the bar is merely the first consumer of:
**a purchase paid from a business account**, and **the display** — the
generic tablet / terminal / screen that apps render on.

Seeding slate: [libations-slate.md](../slates/builds/libations-slate.md)
(all thirteen parts; the decisions below close its open list).
Load-bearing docs: [retail.md](../subsystems/retail.md),
[banking.md](../subsystems/banking.md), [credential.md](../subsystems/credential.md),
[employment.md](../subsystems/employment.md), [crafting.md](../subsystems/crafting.md),
[bulk.md](../subsystems/bulk.md), [corpo.md](../subsystems/corpo.md),
[chattel.md](../subsystems/chattel.md), [behavior.md](../subsystems/behavior.md),
[activity.md](../subsystems/activity.md), [furnishing.md](../subsystems/furnishing.md),
[augmentation.md](../subsystems/augmentation.md), [streaming.md](../subsystems/streaming.md),
[card-surface.md](../subsystems/card-surface.md), [residency.md](../subsystems/residency.md),
[content-packs.md](../subsystems/content-packs.md) (the capability rung).

## Goals

- **No magic.** Nothing at the bar is minted by `populates:` or a
  reboot; every bottle, keg, bag of ice, lime and glass on the premises
  was bought, and the bar's P&L carries cost of goods against income and
  wages.
- **A business can buy.** A purchase settles from a business's account
  and stamps the chattel to the business, through the ordinary `buy`, by
  anyone whose wallet carries that account — a purchasing position
  confers it.
- **The back loop runs without a player.** A par manifest on the
  business; a keeper's brain that reads the stock sheet, buys the
  shortfall, carries it in and places it; the same three acts available
  to a player holding the position.
- **The supply chain exists as trades.** `trade-distilling` whole;
  `trade-brewing`, `trade-winemaking`, `trade-bottling`, `trade-farming`
  as stubs (everything downstream of production); hearth-cooking's
  pantry; a distributor the bar buys from that the producers consign
  into.
- **Corpos are capital.** Veshko makes (the floor's producer of record);
  Hollis private-labels Veshko's liquid; the other three ship no bottle.
  No per-corpo mixin exists.
- **A healthy bar's menu**: the slate's 24-line v1 list, on the board,
  every line orderable, with the recipe substrate grown to say what it
  could not (garnish, ice, technique consequence, count measures,
  carbonation).
- **Glassware cycles.** Serving claims a clean glass from the venue's
  pool; a drunk glass is bussed and washed back; breakage is a matter
  sink the par manifest restocks. No glass is minted per drink.
- **Displays.** A `DisplayMixin` substrate — a display shows a source
  (card or stream), is driven by hand or by mind under a pairing policy,
  and is seen optically by everyone who can see it — with the house
  tablet, the terminal and one TV + remote as its three instances.
- **Archetypes.** The `bar`, `cellar` and `warehouse` room bundles; the
  `archetype` document kind with `hospitality` as its exemplar venue
  floor, and the bar's test venue derived from it.
- **Things live where they go.** Every libation row leaves
  `generic-objects` and `base-library` for the pack whose process makes
  it; the demo props are deleted.

## Non-goals

- **Production.** The ferment durative transform, the still's recipes,
  grain/grape/cane crops, the independent distillery — the distillery
  build (supply-chain slate Parts 1 + 6). The still *station* ships
  (distilling's furnace-family tool) so that build has its tool waiting.
- **Acquisition** (a corpo buying a brand — Vionne's whole story), the
  **approval vector** and any brand-ethos behavior (corpos slate Phase
  2), **broadcasting as a business** and the channel lineup (the
  lounge's build).
- **Menu v2**: dairy, egg, tropical fruit, the blender — ranching, a
  produce trade with a climate, and the socket.
- **Utilities metered**: water and power ride the supply design pack.
  The bar's tap is an unbounded source at the shipped tier; ice is
  bought; no fixture draws power; the bill is named, not built.
- **The ocular implant** (a display in the visual field) and **display
  hacking** (pairing an implant to a display that did not invite it);
  an app store of any kind — apps stay verbs; a display streaming to
  another display.
- **The rest of the generic drain** (arms, armor, instruments, crops,
  clothes, traps, fixtures) — each with its trade as the reorg reaches
  it; the slate's Part 7 table is the direction.
- **A record-layer POS** that remembers pours so the stock sheet is true
  from anywhere — the record layer's job; v1's sheet is perception-
  scoped.
- **Tabs, credit, the 86 list** — payments and customer records, with
  banking + reputation.

## Surface decisions

### D1 — Three axes, one word: trade = process, brand = mark, corpo = capital

A trade is a **process** and a pack (grow, ferment, distil, extract,
cook, bottle). A brand is a **mark** — a `Brand` row with an `owner`,
anyone's. A corpo is **capital** — an `Organization` that owns
`Business`es (`parentOrganization`). The three are independent
(Kirkland: brand Costco, maker an Ohio distillery, capital Costco), and
the model stops conflating them. Consequences: **corpos private-label
generics** (by volume the shelf is mostly corpo — the NPC floor; by
count the interesting things are independent — the player-apex); the
feel dial (80/20 vs 50/50) is content, never kernel; **no per-corpo
mixin** — a mixin that only sets a key is what `_brandKey:` on a row
does, and ethos behavior belongs on the corpo's business or the
material. The corpo packs stay data packs.

### D2 — Two corpos in booze

**Veshko makes**: owns the floor distillery (a `Business`,
`parentOrganization: veshko`), the sanctioned faucet — Volk vodka and
the generic whiskey, rum, gin. **Hollis private-labels**: distils
nothing; Old Hollis and Hollis Cane are Veshko's liquid
(`interiorMaterial` = Veshko's generic) under Hollis's mark. Vionne
(buys brands — later), Goodkin (out of spirits; its whiskey retired),
Aevex (a synthetic material from compounding — later) ship no bottle;
their `Brand` rows stay as brands with no product. **Crowsfoot Gin** is
the independent exemplar.

### D3 — Industry lines are processes; five stubs

Distilling (spirits + liqueurs — compounding starts from spirit, so
bitters and orange liqueur are distilling's), brewing, winemaking
(vermouth is fortified wine), bottling (the soft mixers — seven
products; someone could make a living), produce (fresh fruit, herbs,
garnish — the beginning of the farming pack), and hearth-cooking's
pantry (sugar, syrup, salt, coffee). Cannabis is three trades' products
and no trade of its own; mixers for the bar are hospitality's labor
(press, syrup) plus bottling's generics.

> **A stub trade ships everything DOWNSTREAM of production and nothing
> of production itself**: materials, vessels (presets), brand rows, the
> generic floor product consigned at the distributor, the serving
> recipe. Complete at its tier; production is the distillery build.

### D4 — The distributor: an independent cash-and-carry, distilling's showroom

`trade-distilling` ships its showroom (content-packs A13: every trade
ships one): a **cash-and-carry** `Business` with a `Stock` counter, a
clerk position, an account and a bank — the store hinge the bar buys
from. **Independent**, not corpo-owned: the trade's showroom cannot be
a corpo's business without the trade pack naming a corpo (the
dependency would run backwards); a Hollis retail front is a later
story, better when acquisition exists. **One distributor, many
consignors**: every producer pack — the corpos, the stubs, the produce
floor, bagged ice — *consigns* onto its stock (the shipped mechanism;
annex knows host, never the reverse — `trade-distilling` names no
consignor). **The floor is minted at the producer of record**, never
at the shelf: the distribution sweep keeps the Veshko distillery's
stock at target and the distillery consigns onward; the stubs' generics
and Crowsfoot ride authored consignors the same way.

### D5 — Crowsfoot stays on the rail, flagged

The independent's bottle is consigned by an authored "small outfit"
consignor at the floor **until the distillery build**, so the martini
exists. The row says so. The distillery build replaces that consignor
with a real producer and nothing else moves.

### D6 — Buying: `buy` is `buy`; the wallet carries the house account

No `--for`. `BuyController` settles from the **wallet's active
account**, which it already does; what is new is that a **purchasing
position** (`keeper`, which Mara holds and the proprietor has by
default) puts the **business's account into the holder's wallet** while
held — `wallet use house` — through the credential substrate's own
custodial-account shape. A purchase so paid **stamps the chattel to the
business** (`ChattelOwner` kind `organization` with the business's
path — a Business composes `OrganizationMixin`). Leaving the position
removes the account from the wallet. Authority is the position's,
never the screen's (D12).

### D7 — The par manifest lives on the Business; `house` is the app

`{ category, minGrade, level (L / count / kg), supplier }` lines on the
`Business` — policy is the owner's, the supplier is a business
relationship, `operatingLocations` says where the shelf is. No verb:
**`house par`** sets a line, **`house stock`** shows the live sheet (an
MQL-subscribed card: the rail against par, updating as bottles drain,
**perception-scoped** — it shows what you could see from where you
stand, because the aether is a modem and not a sense organ),
`house pnl` reads cost of goods. Restocking is not a verb: the keeper's
brain (Mara's) and a player alike read the sheet, `buy` with the house
account active, and `put` on the rail. **No verb exists that only an
NPC can use.**

### D8 — Verbs are for physical acts; operations are apps

New verbs, both bespoke bodily processes: **`muddle`** (the muddler's
technique) and **`wash`** (a transform at a basin with a water source;
returns a glass to the clean pool). `shake` only if `MixController` is
not already the shaker's word (the planner reads it; a rename or
nothing). Not verbs: `stocktake` (`house stock`), `par` (`house par`),
`bus` (`get` empties / `put` in the rack), `press` (a hospitality
recipe under `make`), `restock` (a routine). All verbs stay one word.

### D9 — The v1 menu and the recipe substrate

All 24 lines of the slate's Part 9 ship as hospitality recipes, with
the tools (muddler, bar spoon, strainer, juicer, tap, ice bin) and nine
glass presets. The recipe substrate grows exactly five things:

| | shape |
|---|---|
| **garnish** | a slot for a tangible (or a cut of one) *placed on the served glass*, visible in the drink's presentation, consumed with it or bussed with the glass |
| **ice** | a bulk material (frozen water); a slot `cubes \| crushed \| none`; the drink's temperature is real (Receptacle composes Thermal) and **melt is dilution** — a bulk transfer into the drink over time, no new physics |
| **technique consequence** | the verb is the technique (`mix`/`shake`, `stir`, `muddle`, build by `pour`); what is missing is the consequence table — shaken is colder, more dilute, aerated; stirred cold and clear; built as poured — read by presentation and the thermal reconcile |
| **count measures** | `measureCount` for tangible slots (a cube, a wedge, a dash at `measureL: 0.001`) |
| **carbonation** | a material tag the presentation reads; fizz decay is spoilage's, not this build's |

A `press` recipe (citrus → juice, bulk output) and simple syrup ship as
house recipes.

### D10 — The glass pool

`CraftingLogic` stops cloning the output glass: serving **claims** a
clean glass from the venue's pool (the glass rack), the drink fills it,
a drunk glass is **bussed** (`get` / `put` into the rack — a bartender
task and a brain beat) and **washed** (`wash`, at the basin), and
breakage is a real matter sink restocked through the par manifest.
Glass count is bounded by the pool, never the drink count. daves-bar-
slate § glassware, as designed.

### D11 — Archetypes: two kinds, both ship

**Room bundles** (`FurnishableRoom`): `bar` (back-bar, well, counter,
tap, ice bin, basin, glass rack, seating), `cellar` (racking, kegs, cold
store), `warehouse` (a Stock counter, racking, a dock — the general
store's shape). Dave's Bar and the distributor are *instances* of the
bundles. **The venue archetype**: the `archetype` document kind
(content-packs A13.5 / A14) ships with **`hospitality`** as its
exemplar — the floor in capabilities (a water source, a dispensing
station, cold storage, a work surface, seating), never furniture; the
bar's own test venue is **derived** from it; no runtime enforcement.
Hospitality is the third industry, the slate's own trigger.

### D12 — The display substrate

**An app renders on a display. A display is a Thing.** `DisplayMixin`
on a Thing: `showing: Source | null`, a modem (attunement intrinsic to
a device), a **pairing policy**, a **source policy**, a signed-in
**principal**.

- **Two source kinds**: a **stream** (a `StreamerTarget`; the client's
  focal embed renders it, now *following the shared display in front of
  you* rather than only the viewer's own `watch`) and a **card**
  (MQL-backed; the card surface with a place). A display's **source
  policy** is the fiction boundary (the lounge shows anything including
  real player streams; a Terminus screen in-world channels only).
- **Input is duplex over the aether; output is optical.** A display is
  driven by hand (held) or by mind (the driver's implant) — one
  command, two channels. **Everyone who can see the display sees what
  it shows**; nobody sees it from where they cannot.
- **Pairing policies**: `remote` (whoever holds the paired remote
  Thing — possession is the ability, the room's tolerance is social),
  `held`, `staff` (positions on the signed-in principal), `open`.
- **Display ≠ authority.** The principal scopes which apps render;
  money authority comes only from the wallet (D6). A thief with the
  house tablet spends nothing.
- **Display-requiring commands** (`house …`, anything returning a
  card) resolve a display: held → paired-and-in-sight → none ("you'd
  need a screen").

**Three instances** ship: the **house tablet** (cards, `staff`, signed
in as the bar's business — *the clipboard*: whoever carries it is
running the bar), the lounge **terminal** re-homed onto the mixin
(cards, `open`), and **one TV with a remote** in the sports booth
(streams, `remote`) as the stream exemplar. Hospitality is the
display's first consumer; the substrate is the platform's.

### D13 — Utilities are not supply chains

The bar's tap is an `UnboundedSourceMixin` at the shipped tier (the
dorm's shape). Ice is bought bagged and kept in an insulated ice bin (a
par line). No fixture draws power in v1 (the ice machine and the
blender wait on the socket). Water and power land on the P&L when the
supply design pack ships; this build names the bill and does not build
it.

### D14 — The packs

| pack | rung | ships |
|---|---|---|
| **trade-distilling** | capability | spirit materials (gin, vodka, whiskey, rum light/dark, tequila) + liqueurs (orange, bitter, aperitivo, bitters); the `Bottle` preset; the **still** station; Crowsfoot's brand + bottle + its flagged consignor; the generic floor bottles; the **cash-and-carry** (business, counter, clerk, the `warehouse` instance); the `distilling` discipline |
| **trade-brewing** (stub) | data | ale, lager; keg + cask presets; the tap's keg; a generic floor beer; "a pint" |
| **trade-winemaking** (stub) | data | red, white, sparkling; dry + sweet vermouth (out of base-library); the wine bottle; generic floor wines; "a glass of …" |
| **trade-bottling** (stub) | data | soda water, tonic, ginger beer, cola, grapefruit soda, bottled cranberry / orange juice; a bottle/can preset; the floor |
| **trade-farming** (stub) | data | lime, lemon, orange, grapefruit, mint, cherry, olive, cranberry; crate/basket presets; the floor; `crop/seed/plant/pot/bed` rows out of generic-objects |
| **trade-hearth-cooking** | data | + the pantry: sugar, salt, coffee (out of base-library), simple syrup |
| **corpo-veshko** | data | the Veshko distillery (`Business`) + Volk and the generic-under-mark rows |
| **corpo-hollis** | data | Old Hollis, Hollis Cane (private label over Veshko's liquid) |
| **trade-hospitality** | capability | the 24 recipes + `press` + syrup; tools (muddler, bar spoon, strainer, juicer, tap, ice bin); nine glasses; the `bar` + `cellar` bundles; the `hospitality` venue archetype; the house tablet template; `muddle`, `wash` |
| **platform** | — | `DisplayMixin` + the tablet / terminal / screen / remote classes; the `archetype` kind; the business-account wallet conferral; the par manifest; the glass pool; the recipe substrate growth |
| **saxonberg-lounge** | capability | the four magic `populates` **deleted**; the bar as a `bar` instance; the par manifest; the `keeper` position (Mara); the restock brain; the house tablet; the terminal on the mixin; the sports-booth TV + remote; the glass rack |
| **generic-objects / base-library** | — | lose every row above; `corpo/demo/*` deleted; the four lounge bottles deleted |

## Constraints

- **No migration, no compat, no guard.** Paths move; the DB drops.
- **The capability rung's rules** hold for every pack that ships `src/`:
  branches only, no `lib/`, no Api in a pack, the export map is the
  import profile, a kernel module never names a pack's row, a class only
  one pack's rows name is that pack's.
- **The discipline rule**: a discipline row ships with the pack whose
  code derives its key (`distilling`, `bartending` stays platform until
  hospitality's code derives it — the planner checks).
- **Consignment settles on resale and only spans links where the good
  survives**; purchase is how you buy; nobody consigns to a consumer.
  No new commerce mechanism.
- **Money moves only through the sealed ledger chokepoint**; the
  business-account purchase is a wallet fact, not a new payer path.
- **The distribution sweep mints at the producer of record only**, and
  declines regionally at target — the magic-items channel reused, never
  a second faucet.
- **Perception honesty**: a card on a display is seen by those who can
  see the display; MQL stays viewer-aware; the aether is a modem.
- **Mixins are for behavior**; a marker mixin is refused.
- **Verbs are one word**; a verb is for a physical act.
- **Never half-grown**: a stub ships complete at its tier; the TV ships
  only with the client following a shared display, or not at all.
- **The glass pool bounds object count**; a regression that mints a
  glass per drink is a test failure.
- **`pnpm test` runs once**; push every turn; one MR.

## Acceptance criteria

- Fresh-DB boot: no `populates` mints a bottle; the Veshko distillery
  stands at its stock target; the cash-and-carry's counter carries
  Veshko's, Hollis's, the stubs' and Crowsfoot's consigned goods; the
  bar opens with an **empty rail** and a par manifest.
- **Driven live, no player logged in**: over a game-week Mara's brain
  runs the back loop — the stock sheet shows the shortfall, the
  distributor's stock falls, the bar's account falls, each consignor's
  account rises on resale, the rail fills, and every `house pnl` line is
  a real number including cost of goods. Nothing is ever refilled by a
  reboot.
- **Driven live, as a player**: hold the `keeper` position; `wallet use
  house`; `buy` at the cash-and-carry stamps the bottle to the bar;
  leaving the position removes the account from the wallet; a thief
  holding the house tablet cannot spend from it. Each is also a test.
- Every line of the v1 menu is orderable and consumes real matter; a
  garnish is a thing on the glass; a mojito is muddled; a G&T is colder
  than its parts and dilutes as the ice melts; a dash is 1 mL; a
  carbonated mixer reads as such. Tests per recipe-substrate addition.
- The glass pool: 40 orders on a 12-glass pool never exceed 12 glasses;
  a bussed and washed glass serves again; a broken glass is a matter
  sink the sheet reports. Driven live: order, drink, `get`, `put`,
  `wash`, order again in the same glass.
- Displays: `house stock` renders on the held tablet and on nobody
  else's; a second character in the room reads it over the holder's
  shoulder; from the cellar the keeper can drive it by mind and sees
  nothing; the sports-booth TV shows a stream to everyone in the booth
  and changes channel only for whoever holds the remote; the terminal
  shows destinations to anyone in reach. Each driven live.
- The `archetype` kind installs; the hospitality floor derives a test
  venue the whole v1 menu runs through; the `bar`, `cellar`, `warehouse`
  bundles instance; Dave's Bar is a `bar`.
- No row under `base-library/material/{spirit,drink,cocktail}`, no
  `generic-objects/corpo/**`, no lounge `*-bottle` row exists; every
  libation row's path is under its trade's root; `lint:untitled` and
  `lint:instanceable` green; the generic-objects manifest's description
  updated.
- Docs: `retail.md` (the business purchase, the distributor), a new
  `display.md` subsystem doc, `crafting.md` (garnish / ice / technique /
  count / carbonation, the glass pool), `employment.md` (the purchasing
  position, the wallet conferral), `furnishing.md` (the three bundles),
  `content-packs.md` (the `archetype` kind, the libation packs, the
  stub definition), `corpo.md` (corpo = capital, private label),
  `streaming.md` (the shared display), CLAUDE.md's pack count and map
  line; the corpos slate's roster re-cut noted.
- The full suite green once; every lint gate green.

## Cross-references

- Seeding slate: [libations-slate.md](../slates/builds/libations-slate.md)
- Neighbours: [daves-bar-slate](../slates/builds/daves-bar-slate.md),
  [supply-chain-slate](../slates/builds/supply-chain-slate.md),
  [corpos-slate](../slates/builds/corpos-slate.md),
  [lounge-slate](../slates/builds/lounge-slate.md) (the remote, the
  screens), [retail-slate](../slates/builds/retail-slate.md),
  [supply-design-pack](../slates/builds/supply-design-pack.md),
  [content-packs-slate](../slates/builds/content-packs-slate.md) (A13,
  A13.5, A14, A33)
- Subsystem docs: as listed in the framing
- Follow-ons this unblocks: the distillery build (supply-chain Parts
  1 + 6), acquisition, broadcasting, the ocular implant, display
  hacking, the record-layer POS, the rest of the generic drain
