# Slate-compaction pass — crafting batch ledger

Five slates: cooking · crafting · libations · daves-bar · retail. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: `crafting.md` · `retail.md` (`retail.md` needed nothing). Line
numbers below are the ORIGINAL file's. Every cut left a one-line pointer
where remaining design still leans on it; whole-section cuts with no
dependants left nothing.

Verified against: `packages/content/trade-{cooking,hospitality,distilling,
baking,milling,farming}/`, `packages/content/{distribution,saxonberg-lounge}/`,
`packages/server/src/mud/lib/{craft,retail,commerce,thermal,fire,metabolism,
behavior}/`, `platform/thing/{Stock,Tariff,Dish,ServingVessel,CraftVessel}.ts`,
`world/lounge/location/Bar.ts`, and the docs named per line.

---

## docs/slates/builds/retail-slate.md — 299 → 240 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block (11–17, 7) — history (*"staged across four builds"*; S1 shipped MR !143)
- `## Pricing model` → **v1 (S1): authored flat stance** bullet (125–131, 7) — code: `lib/commerce/PricedOffer.ts`, the general-store staples priced 2..10; doc: `retail.md § The shared price-list` (Law 1), `§ Content` (*a coinage-clean ladder against the 20-credit stipend*)
- `### S1 — The general store` body (151–192, 42) except the bar-cleanup bullet — code: `platform/thing/Stock.ts` (⚠ `retail.md` still says `lib/retail/Stock.ts`; the class moved to the branch — a path drift, not a false decision), `lib/retail/Consignment.ts` (`HeldGoodsMixin` + `ConsignmentShelfMixin`), `platform/idea/cmd/retail/{Buy,Consign}Controller.ts`, `content/platform/cmd/retail/{buy,consign,reclaim}.yaml`; doc: `retail.md § The counter`, `§ The buy loop`, `§ Consignment`, `residency.md` (the reset sweep). Pointer left
- `### S1` → *Deferred out of S1* + *First content* bullets (200–203, 4) — restated by S2–S4 / shipped content

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- `## The retailer, among the business archetypes` · `## The conservation crux` · `## Pricing model` (framing + the S3 / characterization bullets) · `## The build arc` intro · `### S1` → the **bar-refresh standing intent** bullet · `### S2` (no `CirculationReserve` in `src/`; the term appears only in `civics.md`/`contract.md`/`retail.md § Deferred`) · `### S3` (`franchis|costPlus|supplyDemand|priceIndex` → 0 hits in `src/mud`) · `### S4` · `## Open questions` · `## ⚠ Wire finding — a venue visited once is operated forever` (`standDown|ceaseOperat|isOperating` → 0 hits; `EmploymentLogic.ensureOperatorAt` stands up, nothing stands down)

### Uncertain — kept
- the archetype table's *Service* row (*"bank shipped"*) is stale — `Tariff` (`platform/thing/Tariff.ts`: `repair` · `treatment` · `burial`) shipped the priced service (`retail.md § The priced SERVICE`); kept because the table is framing
- `## Open questions` → the two **S1** questions are answered by code (the storefront abstraction: within S1, `PricedOfferMixin`; low-DAU consignment: P2P-only, *the store fronts no coin* — `retail.md § Consignment`); kept as spine per the pilot's call, flagged so requirements does not re-open them
- inside the cut S1 body, *"Corpo `Branded` (goods carry marks)"* was listed as a reuse — `retail.md § Deferred` says Branded marks on the goods are a cosmetic follow-up; the cut is right, the original claim was optimistic
- S4 *player-owned shops*: `distribution/…/idea/business.yaml` leaves the `keeper` (`purchases: true`) unfilled *"a player path"* — a player can already RUN a business's purchasing; nothing lets a player OWN a storefront. Unbuilt as stated

### Handoff
- none

### Status block
- Left: *S2 the Circulation Reserve · S3 producer + real cost/supply pricing · S4 player-owned storefronts and the market arena · ⚠ a business never stands DOWN* → *S2 the Circulation Reserve (the welfare-floor buy) · S3 producer + real cost/supply pricing (the derived stance, then characterization) · S4 player-owned storefronts, franchising and the market arena · ⚠ a business never stands DOWN · the standing bar-refresh intent*
- Size: a build → a build

---

## docs/slates/builds/daves-bar-slate.md — 643 → 346 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block (13–19, 7) — *"pre-requirements … build-phasing deferred"*; the near-term scope shipped
- `## Near-term scope vs. vision` (40–56, 17) — code: `saxonberg-lounge/…/idea/business.yaml` (roster, wages, `confers: [MakerMixin]`), `content/platform/cmd/retail/order.yaml`; doc: `employment.md`, `crafting.md § Verbs`
- `## The room — the anti-lounge` → para 1 *One room, fixed* (113–123, 11) — code: `saxonberg-lounge/…/location/bar.yaml` (`SingletonMixin`, the lounge grid's origin, *"NOT a Warren member"*), `location/office.yaml` (one cell north, `concealment: hidden`, `search` reveals); doc: `location.md` l.324 (*the anti-lounge*), `concealment.md`. Pointer left
- the **bar counter** + **corpo décor** bullets (127–139, 13) — code: `trade-hospitality/…/thing/stool.yaml` (`/platform/thing/Chair`, one `sit:1` slot), `saxonberg-lounge/…/thing/bar-counter.yaml`, `platform/thing/NeonSign.ts` (`AdornmentMixin(BrandedMixin(LightSourceMixin(Thing)))`), `thing/neon-{veshko,aevex}.yaml`; doc: `corpo.md § The mark`, `crafting.md § Dave's Bar content`; sponsorship stays deferred in `corpo.md § Deferred`
- the **lived-in history** bullet + the *layered description* para (143–154, 12) — code: `bar.yaml` `details:` (`signs` / `photos` / `mug` / `bills`, examine-on-demand); doc: the `Detailed` face, `crafting.md § Surface presentation`
- the three bartender bullets — Mara / Remy / Sloane (172–180, 9) — code: `saxonberg-lounge/…/agent/{mara,remy,sloane}.yaml` (`/platform/agent/Crafter`, `archetype: barkeep`, authored dispositions); authored content, not open design
- `### Glassware & venue durables` → intro para + *Reaping = bussing* + *Generalizes to all venue durables* (266–270 · 272–273 · 284–285, 9) — code: `platform/thing/CraftVessel.ts` (claim / `soil()` / `wash()`), `lib/craft/Serviceable.ts`, `trade-hospitality/…/thing/glass-rack.yaml`; doc: `crafting.md § The glass pool`, `§ The serviceware tier`. Pointer left
- `## Ingredients & the back-bar` → bullets 1–4 and 6 (325–350 · 356–362, 33) — code: `platform/thing/Bottle`, the back-bar `Surfaced` fixture, `CraftingLogic` (the rail rule; `with <brand>`), `lib/craft/Grade.ts` + `CraftedMixin.renderVerdict`, `trade-distilling` (Volk / Old Hollis / Hollis Cane / Crowsfoot rows); doc: `crafting.md § Surface presentation`, `§ The glass pool` (the rail rule), `§ Value-objects` (Grade — never a number), `corpo.md § Content`; the two producer tiers shipped as content (Veshko's yard the floor, Crowsfoot the independent)
- `## Verbs & the recipe-learning loop` (366–396, 31) — code: `content/platform/cmd/retail/{menu,order}.yaml`, `trade-hospitality/…/cmd/crafting/{serve,mix,strain,garnish,muddle}.yaml`, `lib/craft/ManualBuild.ts`, `ScriptApi.captureManualBuild`; doc: `crafting.md § Verbs`, `§ The manual build`, `§ The knowledge ladder`, `scripting.md`. Pointer left
- `## Corpos` → the world-frame para + the *A corpo is a mark* bullet + the scope para (404–412 · 416–422 · 440–444, 21) — code: `platform/idea/corpo/Corpo.ts`, `lib/corpo/Branded.ts`, the five `corpo-*` packs; doc: `corpo.md` (the mark, the roster, `§ Deferred` — the approval vector)
- `## The economics` → *The bootstrap P&L* · *The deficit is the design target* · *Recovering the losses* · *Build the ledger early* (458–491, 34) — code: `BankingApi.profitAndLoss`, `house pnl`, the `subsidy` leg; doc: `banking.md § Tabs, wages, demo tax, the P&L` (*deficit-as-target instrument, red by design*; cost of goods derives on read, l.326)
- `## How it's modeled` → the five-category spine + the mixins line (534–546, 13) — doc: `architecture.md`; the *Persist consequences and policy* para (562–566, 5) — doc: `crafting.md § Persistence story`
- `## How it's modeled` → presentation bullets 1–3 (585–595, 11) — code: `ContainmentApi.looseContents`, the Scene composer, `Detailed`; doc: `crafting.md § Surface presentation`, `messaging.md`
- `## Open / deferred` → *Sequencing* · *The crafting verb surface* · *The quality-verdict rendering* (609–614, 6) — all three answered by shipped code

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut (one-line note left at each)
- `## The cast` → the **Dave** para (158–165, 8) — by content: `agent/dave.yaml` (proprietor, a `Crafter`, the `enforces` brain); the office is a hidden exit `search` discovers (`concealment.md`), not a regard-gated door. The earned-regard sanctum is unbuilt and now lives in the kept *Augie* / *leadership* paras
- `## The two loops & inventory` (235–262, 28) — by libations + logistics: the par sheet is `house par` / `house stock` on the Business (`employment.md § The house account in the wallet, and the par manifest`), restock is Mara's `restocks` brain (`mara.yaml` `trigger: cadence:15m`, ORDERING against the sheet since logistics D11), stock is bought at the distributor by consignment (`retail.md § The distributor`). *Inventory as a skill* waits on the skill seam
- `## The economics` → *The supply abstraction: a magic distributor* (448–456, 9) — by libations: a real cash-and-carry (`distribution` pack), Veshko's yard standing at target via the residency sweep (`retail.md § The distributor`)
- `## How it's modeled` → *"There are no bar-specific classes"* (526–532, 7) — by `world/lounge/location/Bar.ts` (one class: `SingletonMixin` + the Warren wiring); everything else is content (`crafting.md § Dave's Bar content`)
- `## How it's modeled` → *Three persistence tracks* (548–560, 13) — by the persistence spine: no save-back-to-template, `holder_snapshots` (`persistence.md`); crafted drinks transient (`crafting.md § Persistence story`)

### Kept (UNBUILT)
- `## Why Dave's Bar` · `## The experience` (all five paras) · `## The room` → the **Amusements** bullet · `## The cast` → the *three behind the bar* intro, **Augie**, *The warmth is the design*, *CK3-style traits*, *Leadership = the inventory clipboard* · `### Glassware` → **theft is priced** + **breakage / walk-off** · `## NPC business & the shift-change ritual` (all — `countTill|shiftChange|cashDrawer` → 0 hits) · `## Ingredients` → **Low quality → worse hangover** (`congener|hangover` → 0 hits) · `## Corpos` → the **approval-vector** bullet + the fault-line para · `## Payments` (all) · `## How it's modeled` → *Who remembers what*, the **crowds** bullet + closing para · `## Open / deferred` (the remaining nine)

### Uncertain — kept
- `## The experience` → *"first one's on the house"* — no comp mechanism; `PricedOfferMixin.collect` serves on the house only on a failure (`retail.md § Tariff`). Design intent, unverified either way
- `## The cast` → *The warmth is the design* (bartenders drink there off-shift) — **contradicted** by shipped content: the `shifts` brain parks off-duty cast in `location/offstage.yaml` (*"the no-exit holding room … players cannot reach it"*). Kept because `Left` names the off-shift presence; requirements must reconcile
- *CK3-style traits* — `trait.md` shipped 19 opposed pairs; `Crafter = CastMixin(MakerMixin(NPC))` so the cast keeps regard; nothing found that writes NPC→NPC regard from trait compatibility. The mechanism, not the roster, is what remains
- `## Payments` — `banking.md § Tabs, wages, demo tax, the P&L` describes `TabMixin` + a `tab` verb as shipped, but `world/lounge/location/Bar.ts:34` says *"the soft-credit `TabMixin` was retired — zero credit until it is designed for real"*, only `Bar.ts` mentions the name, and no `tab.yaml` / `TabController` exists. The slate's tab design is LIVE and the doc is stale (→ Handoff)
- *Who remembers what* → institutional records: the **86 list shipped** as a venue document (`lib/behavior/enforces.ts` writes `venue-eighty-six` into the venue's document-tree slice; `AccessRegistry.venue-records.test.ts`) — for the armed-patron rule only; *regular* status and tab history are unbuilt. Kept whole
- `## Open / deferred` → *Appraisal-as-skill + the congener mechanics* — appraisal of TASTE shipped as the palate (`lib/metabolism/Palatable.ts`; `crafting.md § The palate`); the congener → hangover half has no code. Kept for that half
- *Player distillery* — Crowsfoot (the NPC independent) now DISTILS by brain (`crowsfoot-hand.yaml`: `cellars` with `distills: { recipe: distil }`); the surviving faucet is Veshko's yard (`veshko-yard/agent/hand.yaml` runs only `consigns` + `idles`, stock at target via residency). A player-OWNED distillery is retail-S4-shaped. Kept, reworded in `Left` to name Veshko's floor
- **Amusements** — the TV shipped (`display.md`); `dartboard|jukebox` → 0 rows in `saxonberg-lounge`; the jukebox is also in `lounge-slate`'s `Left`
- Overlaps for the cluster pass: the succession arc ↔ libations Part 13's *"the tablet is the clipboard"* (cut there, noted below); jukebox / screens ↔ `lounge-slate`; corpo approval ↔ `corpos-slate`; tabs ↔ `credit-slate`

### Handoff (belongs in a doc outside my list)
- → `banking.md § Tabs, wages, demo tax, the P&L`: a **correction, not an insert** — the *Tabs* bullet describes a retired mixin. Evidence: `packages/server/src/mud/world/lounge/location/Bar.ts:33-35` *"no tab (the soft-credit `TabMixin` was retired — zero credit until it is designed for real, see docs/subsystems/banking.md)"*; `find packages/content -name tab.yaml` → nothing; `TabController` → nothing. The doc should say tabs are deferred to the credit slate

### Status block
- Left: *the succession arc · tabs + customer records (regular / 86'd) · corpo faction-approval standing · the Scene composer's crowd aggregation for a full room · appraisal-as-skill + the congener / hangover tuning · the player distillery that retires the faucet* → *the succession arc (Augie recognizes the heir; the house tablet is the clipboard) · tabs (`TabMixin` was RETIRED — zero credit until designed for real) + customer records (regular; 86'd exists only for the armed-patron rule) · the NPC task repertoire + the shift-change ritual (till · receipts · reconcile · hand off · deposit) · the cast's off-shift presence + the trait compatibility→regard mechanism · corpo faction-approval standing · the Scene composer's crowd aggregation for a full room · the congener / hangover tuning (appraisal shipped as the palate) · glass theft remembered + the glassware leak · the dartboard · the player distillery that retires Veshko's floor · numeric tuning*
- Size: a build → a build

---

## docs/slates/tails/libations-slate.md — 684 → 81 · Status PARTIAL → PARTIAL

Everything but Part 7's drain direction, Part 10 and one open question
shipped in MR !206 (then fermentation MR !215 and logistics moved two
pieces again). One pointer paragraph replaces Parts 0–9 and 11–13 and
names where each decision lives.

### Cut (SHIPPED · DOCUMENTED)
- the *Built 2026-08-28* block (12–32, 21) — history; every deviation it lists is in a doc: the `held` rung (`display.md`), the Crowsfoot Brand row in `trade-distilling` (`corpo.md` l.151), cost of goods derives on read (`banking.md` l.326), the capital + mark ruling (`corpo.md § A corpo pack is capital + the mark`), no glassware supplier (`Left`). ⚠ *"Mara restocks every 10 min"* is stale: `mara.yaml` reads `trigger: cadence:15m` and she ORDERS (logistics D11)
- the stale second status block + the two user quotes (34–48, 15) — conversation
- `## Part 0 — What the bar is today` (69–91) — the pre-build state; history
- `## Part 1 — ⭐⭐⭐ Why it felt complicated: three axes, one word` + `### ⭐ The corpo mixin question, answered` (95–135) — code: `trade-distilling/…/thing/old-hollis.yaml` (`interiorMaterial: /trade/distilling/idea/material/whiskey` — Veshko's liquid — `_brandKey: old-hollis`: the private label as ONE field), no per-corpo mixin anywhere (the corpo packs are data packs); doc: `corpo.md § A corpo pack is capital + the mark, nothing else`, `§ A corpo is a mark; its ORGANIZATION is the chart`. ⚠ The three-axes statement in the slate's words (trade = process · brand = mark · corpo = capital; *corpos private-label generics*) is not in `corpo.md` → Handoff
- `## Part 2 — ⭐⭐ How corporate is the world? Two dials, not one` (139–156) — doctrine, shipped as content (Volk in the well, Crowsfoot the independent); `corpo.md` l.3, `§ Deferred` (price ≠ quality belongs to the bar / economy)
- `## Part 3 — The corpos in booze: two, and what each actually does` + `### The shelf (the roster, re-cut)` (160–193) — code: `trade-distilling/…/location/{veshko-yard,hollis-floor,crowsfoot-floor}`, `thing/{old-hollis,hollis-cane,crowsfoot-gin}.yaml`, `veshko-yard/thing/volk.yaml`; `corpo-{vionne,goodkin,aevex}` ship no bottle; doc: `corpo.md § Content`
- `## Part 4 — ⭐⭐ The industry lines are PROCESSES, never substances` + `### ⭐ The three libation trades, and what a stub is` (197–252) — code: `trade-{distilling,brewing,winemaking,bottling,farming}`; brewing / winemaking de-stubbed by fermentation (the slate's own *overtaken* note); doc: `content-packs.md` (the stub trades), `maturation.md`
- `## Part 5 — The packs` + `### ⭐⭐ The showroom is the distributor, and the corpos consign into it` (256–294) — code: the packs exist; the distributor is the `distribution` pack (fermentation D10); the corpo bottle rows moved INTO `trade-distilling` per the review ruling (the table's `corpo-veshko` / `corpo-hollis` rows are superseded); *who owns the distributor* is DECIDED — independent (`distribution/…/idea/business.yaml`: no `parentOrganization`, the Prime Minister appoints); doc: `retail.md § The distributor`, `corpo.md`
- `## Part 6 — The kernel bill (small)` (298–312) — code: `wallet use house` (`WalletController`), `house par` / `house stock`, the `restocks` brain, the `Bottle` / `keg` / `cask` / `sack` / `ice-bag` rows, `GradedReceptacle` (the grade seam); doc: `employment.md § The house account in the wallet`, `retail.md § The stock vessels`. The *"Not kernel, deliberately"* list's one live pointer — **acquisition** (a corpo buying an independent brand) — stays *"its own slate when a corpo first buys a brand"*; recorded here, not in `Left`
- `## Part 7` → the user quote, the junk-drawer para, the rule blockquote and the *what this build moves* table (318–339) — code: the rows moved (spirits in `trade-distilling`, ale in `trade-brewing`, the blend in the platform pack, the four lounge bottles deleted, `Crowsfoot` out of `generic-objects`); doc: `content-packs.md` l.1151 (*"whose PROCESS makes it; `generic-objects` is the junk drawer, slimming"*)
- `## Part 8 — What "fully operational" means (the acceptance shape)` (355–379) — the drive, shipped; `trade-hospitality/src/__tests__/menu.test.ts` orders all 24 lines off `archetype.materialize()`
- `## Part 9 — ⭐⭐ The menu, and everything it exposes` — `### The list (v1 — what a healthy neighbourhood bar offers)` · `### The ingredient matrix, and where each row goes` · `### The tools and the glassware (hospitality's)` · `### ⭐⭐ What the recipes cannot yet say — the substrate this exposes` · `### What this does to the par manifest` (385–505) — code: 26 recipe files in `trade-hospitality/content/recipes/` (the 20 cocktails + coffee + four presses; `pint` / `glass-of-*` / `soft-drink` with the stub trades), nine glass rows, `Recipe.garnish` + `Recipe.ice`, `lib/craft/Technique.ts`, `count` on `kind: item` slots, `BulkPayload.tags` (carbonation), `src/thing/{Tap,IceBin}.ts`; doc: `crafting.md § The glass pool, the technique, ice, garnish`, `§ Technique — an OPEN vocabulary`; the supplier topology decided as *one distributor, many consignors* (`retail.md § The distributor`). The one open clause — *fizz decay* — is already `Left`'s *carbonation going flat*
- `## Part 10` → the *Part 9's tool table is amended accordingly* para (534–538, 5) — history
- `## Part 11 — Archetypes, and the two things the repo calls that` (542–565) — code: `trade-hospitality/…/location/{bar,cellar}.yaml`, `trade-distilling/…/location/warehouse.yaml`, `trade-hospitality/content/archetypes/hospitality.yaml`; doc: `furnishing.md § The room class and its archetypes` (*three trade bundles joined them in libations*), `crafting.md § Dave's Bar content`
- `## Part 12 — ⭐⭐ Verbs are for physical acts; operations are apps` (569–587) — code: the `house` verb, `wallet use house`, `muddle.yaml`, `wash.yaml`; `stocktake|bus|buy --for` → nothing; doc: `employment.md`, `crafting.md § Verbs`. ⚠ The doctrine sentence itself is in no subsystem doc (`display.md` l.22 has the half-sentence *"Verbs are physical acts"*) → Handoff
- `## Part 13 — ⭐⭐⭐ Apps render on a DISPLAY; the display is a substrate` (590–659) — code: `platform/thing/{Tablet,Screen,Remote}.ts`, `DisplayMixin`; doc: `display.md` (both source kinds, the four policies + the unconditional `held` rung, *a display confers no money authority*). *"The tablet is the clipboard"* → the succession arc stays in `daves-bar-slate`
- `## Open` → seven answered bullets (663–677 · 681–684): who owns the distributor (independent — above); `restock` is the three verbs it is made of (Part 12, shipped); the par manifest's home is the Business (`house par … --from <business>`, `employment.md`); the pour is a `Tap` station (`Tap.ts`, `put keg on tap`); the press recipe now (`press-lime.yaml`); one distributor, many consignors (`retail.md`); the Crowsfoot faucet (Crowsfoot distils by brain — `crowsfoot-hand.yaml`)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none — the two undocumented statements belong to docs outside my list (Handoff)

### Superseded — cut
- folded into the pointer paragraph: Part 5's corpo-pack product rows → the review ruling (products in the trade pack); Part 4's stubs → fermentation; Part 8/Open's Crowsfoot-at-the-floor → Crowsfoot produces

### Kept (UNBUILT)
- `## Part 7` → the *Not this build, but named so the drain has a direction* para — `generic-objects/content/stuff/thing/` still holds `armor arms clothes cutlery fixture gear instrument items surface traps vessel`
- `## Part 10 — Water and power: utilities, not supply chains` (the framing + the table) — the rationale for `Left`'s first two items; the supply design pack is unbuilt
- `## Open` → *Menu v2's line* (dairy / egg / tropical fruit / the blender)

### Uncertain — kept
- Part 7's direction list is partially stale: `clothes/` → textiles (textiles shipped; `clothes/` still present), `items/{cuts,…}` → *hearth-cooking* (now `trade-cooking`, which ships `treated-cut`), `crop/seed/plant` → farming (`trade-farming` shipped; the dirs are gone from the listing). The remaining drain is real; the paragraph is the only record of its direction
- *"the bar's first socket"* — the lounge has a `mana-main` row (`/system/arcana/thing/ManaMain`, `seatIn: /world/lounge/idea/warren`) but it feeds the TERMINAL by the door, not the bar; the ice machine still has no socket. `Left` reworded to say so
- Overlaps for the cluster pass: water / power metering ↔ `supply-design-pack` + `power-utility-slate`; menu v2 ↔ `ranching-slate` (dairy, eggs); the drain ↔ `content-packs-slate`; acquisition ↔ `corpos-slate`

### Handoff (belongs in a doc outside my list)
- → `corpo.md § A corpo pack is capital + the mark, nothing else` (as a preface — the three axes the ruling rests on), verbatim from the cut Part 1:

  > Because everyday language collapses **three different things** into one
  > word, and the model inherited the collapse. Kirkland vodka: the **brand**
  > is Costco's, the **maker** is a distillery in Ohio that also makes other
  > people's vodka, the **capital** is Costco's. Diageo: a dozen heritage
  > distilleries make it, the brands feel independent, the capital is one
  > megacorp. We had been treating *corpo = brand = producer* as one fact,
  > which is why "does Goodkin make whiskey?" seemed to need a mixin on a
  > bottle.
  >
  > | axis | what it is | in the model |
  > |---|---|---|
  > | **a trade** | a **process** — grow, ferment, distil, extract, cook, bottle | a pack (*pack = a trade*); the vocations test |
  > | **a brand** | a **mark** — a label with an `owner` | a `Brand` row; cheap, content-only; anyone's (a corpo, an independent, a player) |
  > | **a corpo** | **capital** — it owns businesses | an `Organization`; a corpo distillery is a `Business` with `parentOrganization` (the business = economy / organization = chart split) |
  >
  > Once separated, the store-brand instinct is exactly right, and it is
  > **real economics rather than a stylistic choice**: **corpos private-label
  > generics.** Volk is not Veshko's craft; it is the well rail — made in
  > volume, consistent, everywhere. Premium is independent *by count*. And
  > the wrinkle (capital interest in "independent" wineries) is not an
  > exception but a **future mechanic**: a corpo *buying* an independent
  > brand — the label stays, the capital changes, and the regulars notice or
  > don't. It falls out of the split for free.
  >
  > It is not. A mixin that only sets a key is what a template row does
  > (`_brandKey:`). Mixins are for **behavior**, and with corpo = capital the
  > ethos behaviors belong on the corpo's **business** (pricing, the approval
  > vector) or on the **material** (aevex's chemistry), never on the bottle.
  > **No per-corpo mixins; the corpo packs stay data packs.**

- → `command-spec.md` (a short new section, *Verbs are for physical acts; operations are apps*), verbatim from the cut Part 12:

  > A verb earns a word when a body does something to matter — `muddle`,
  > `pour`, `wash`. Information and administration — counting stock,
  > setting par, the P&L, which account pays — are **apps**, and apps
  > already have a home: `house`, `wallet`, `job`. So: **no `stocktake`**
  > (`house stock`, a live card), **no `par` verb** (`house par`), **no
  > `buy --for`** (`buy` is `buy`; a purchasing position puts the *house
  > account in your wallet*, `wallet use house`), **no `bus`** (`get` /
  > `put`). New verbs: **`muddle`**, **`wash`**; `shake` only if `mix` is
  > not already the shaker's word. Mara's restock is the same three things
  > a player does — read `house stock`, `buy` with the house account
  > active, `put` on the rail. No verb exists that only an NPC can use.

### Status block
- Left: *metered water + power on the P&L (the supply design pack) · the ice machine and the bar's first socket · carbonation going flat · a glassware supplier* → *metered water + power on the P&L (the supply design pack) · the ice machine and the bar's first socket (the lounge's `mana-main` feeds the terminal, not the bar) · carbonation going flat · a glassware supplier · menu v2's line (dairy / egg / the blender) · the generic drain's remaining direction (Part 7)*
- Size: a tail → a tail

---

## docs/slates/builds/crafting-slate.md — 722 → 452 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block (14–23, 10) — *"the venue model is settled enough to seed a slice"*; three branches shipped
- `## Inputs, outputs & the standard-model situation` (98–147, 50 · 157–162, 6) except *Procedural vs CMS* — code: `CraftingLogic.craftImpl` (`applyTangibleOutput` flows the primary input's Material + summed mass onto the cloned output; `CraftedMixin.stamp`), combat's `instrumentDeliveryScale` reading grade / condition / material; doc: `crafting.md` intro, `§ Craft-resolve`, `§ The lifecycle` (*"Part II"* — the readers — shipped). Pointer left
- `## Tools` → `### Standard-model situation — a role + a capability, not a kind` (300–313, 14) — code: `lib/craft/ToolCapability.ts` (open vocabulary), `Tooled.ts`, `lib/material/Durable.ts`; doc: `crafting.md § Value-objects & vocabulary`, `§ Mixins`
- `### The economic identity — the durable-good sink` (315–338, 24) — code: `DurableMixin.wear()` on use, `CraftingApi.repair` (deficit-priced, ceiling-free) / `salvage`, `lib/craft/Serviceable.ts`; doc: `§ The lifecycle` (*gear never obsoletes, it asks for care*), `§ The glass pool`. Pointer left
- `### Fixed vs portable` (348–357, 10) — code: the anvil a fixture by encumbrance (60 kg), `Whetstone` carried-only (`environment` bucket); doc: `§ Value-objects` (*no workbench concept*), `§ Split by what performs the act` (*carried vs reachable is the bucket*)
- `## Quality` → the *Render Dwarf-Fortress style* bullet (425–431, 7) — code: `CraftedMixin.renderVerdict` (band-word headline + grade-keyed prose + maker, never a number); doc: `§ Mixins`; the *Anticipate via provenance* + *Quality is the whole* bullets (435–442, 8) — code: weakest-link `Grade.deriveAtFixedControl`, `BrandedMixin` + the maker's mark; doc: `§ Value-objects`, `corpo.md`
- `## Deconstruction` → the intro + the two *lossy* bullets + *Standard-model-native* + the *Melt-down* bullet (464–483 · 485–493, 29) — code: `CraftingApi.salvage` (`crafting.salvageRate`, provenance / grade / chattel id die with the form, conservation asserted); doc: `§ The lifecycle`. Pointer left
- `## The open design space` → the *Crafting actions / verbs* bullet (655–658, 4) and the *Materials & grades* bullet (667–670, 4) — `§ Verbs`; `Grade` as the first quality axis
- `## Buildable now — the Dave's Bar slice (v1)` (676–697, 22) — all six bullets shipped and grown to three branches. Pointer left
- `## Open problems` → *A full crafting design doc* (720–722, 3) — `crafting.md` exists

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Quality` → the ***No Diablo-style rarity tiers*** paragraph (446–458, 13) — code: `lib/craft/Grade.ts` (five bands, the one quality axis), `renderVerdict` never a number, `rarity` → 0 hits in `lib/craft/` (the word appears only in `magic-items.md` as spawn weight, a different thing) → inserted at `crafting.md § Value-objects & vocabulary (lib/craft/)`, after the `ToolCapability` bullet (13 lines: the four things a rarity tier fuses and where each lives here — quality / uniqueness / power / scarcity; a consumable has no rarity)

### Superseded — cut (one-line note left at each)
- `## The venue model (settled — the buildable spine)` (168–198, 31) — by the code: `CraftingApi` has no venue concept; feasibility is *reachable tools + inputs + heat* (`gatherMatter`), so *Dave's Bar* is emergent and camp-stew works at a campfire (`crafting.md § The model: crafting is location-agnostic`); the served / DIY split and the NPC floor shipped as content (`§ The venues`)
- `### 1. Representation (buildable)` (207–232, 26) — the recipe shipped as a `Document`, not an `Idea` (`§ Recipe = a Document`); constrained slots, tools by capability, `Recipe ≠ template` all landed; **assembly** stays deferred (`§ Deferred`)
- `### 2. Knowledge — who *knows* it (layered)` (234–243, 10) — by the knowledge ladder: recipes are open canon, the **deed** is what is earned (`§ The knowledge ladder`); *venue-known* and *crafter-known* both shipped in a different shape; recipe-items remain in `§ 3`
- `## Quality` → *Viewer-relative richness is the appraisal skill — deferred* (443–444, 2) — shipped as the palate (`lib/metabolism/Palatable.ts`; `§ The palate`)

### Kept (UNBUILT)
- the framing + *See also* · `## The spine` (framing; item 3 is the open seam) · *Procedural vs CMS* (skill-scatter) · `## Recipes` intro + `### 3. Spread` + `### 4. Resolution` + `### The north star` · `## Tools` intro + `### Tools are the capital side of control` + `### Tools are craftables → a parallel tech tree` · `## Skill — the seam, not the system` (all) · `## Quality` intro + *Effects are diegetic events* · `## Deconstruction` → the **Disassembly** bullet + *Rides existing seams* · `## Supply chains & tiers` · `## The making spectrum` · `## Prior art` (all) · `## The open design space` (the remaining five) · `## Open problems` (the remaining five)

### Uncertain — kept
- `### Tools are the capital side of control` — half shipped: a capability entry's `control` band FLOORS the outcome grade (`crafting.md § capability entries are parameterized`); the *"master with a poor hammer and novice with a masterwork both pull to the middle"* combination with skill is the unbuilt seam. Kept whole; `Left` says so
- `## The spine` items 1, 2, 4, 5 are shipped doctrine; kept as the framing the open item 3 rests on
- `## Deconstruction` → *Rides existing seams*: skill-scaled yield (`§ Deferred`), the NPC counterparty-of-last-resort (retail S2), a salvager venue — none built; kept
- `## Prior art` → *The venue model is a distinctive synthesis* — the station + business + social-place fusion shipped EMERGENTLY (reachability), not as a venue model; kept as reference, not design
- `## Making spectrum` → *"authoring is free; instantiation costs credits"* — no credits mechanism found (`credits` retired as a currency word — `banking.md` l.34); the authoring economy is `Left`'s and `scoped-authoring-slate`'s
- Overlaps for the cluster pass: skill-as-control ↔ `advancement-slate` and cooking's tending wave; the authoring-credits economy ↔ `scoped-authoring-slate` + `cooperative-slate`; recipe-scripts ↔ `scripting`

### Handoff
- none

### Status block
- Left: *skill-as-control (the declared next crafting wave) · defects & failure as diegetic events · recipe-spread beyond watching (taught / discovered / tradeable recipe-items) · the per-domain quality property bundles · supply-chain depth tuning · the authoring-credits economy* → *skill-as-control (the declared next crafting wave — the seam's three levers; tool `control` shipped only as a grade FLOOR) · defects & failure as diegetic events · recipe-spread beyond watching (taught / discovered / tradeable recipe-items; authoring as the fourth vector) · assembly recipes + disassembly · the per-domain quality property bundles · the tool tech-tree · supply-chain depth tuning · the authoring-credits economy*
- Size: a build → a build

---

## docs/slates/builds/cooking-slate.md — 1672 → 1112 · Status PARTIAL → PARTIAL

W0–W3 shipped as designed; doneness (S1 + S2 of the tending wave's seam
bill) and the baker pack shipped since. What remains is large and mostly
pre-registered design for the tending wave, the kitchen as place, and the
sibling builds — so `Left` grows from 6 items to 17.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block (17–21, 5) — *"design, captured 2026-09-02"*
- *The trade is `cooking`; "hearth" was era-marking, and it comes off* (`###`, 50–59) — code: `packages/content/trade-cooking/` at `/trade/cooking`. ⚠ `packages/content/trade-hearth-cooking/` survives as an EMPTY directory holding only a stale `node_modules` — a sweep item
- `### Cooking vs. baking: one Discipline family, trades cut by what they sell` (61–78) — code: `trade-baking` + `trade-milling`, `baking.yaml` `specializes: cooking`, `trade-baking/src/lib/Staling.ts`; doc: `spoilage.md § Staling — the THIRD clock`
- `### Domestic vs. professional is NOT a taxonomy axis` (276–285, 10) — code: `trade-cooking/src/__tests__/kitchen-affordances.test.ts`, `knowledge-gate.test.ts`; doc: `crafting.md § The venues` (the DIY floor, unpriced), `§ Split by what performs the act` (camp cooking)
- `## Part 2` main — the table, *water can't brown*, the sweets amendment, *where each word lives*, the fat gap (291–356) — code: `lib/craft/Recipe.ts` (`medium`, `RECIPE_MEDIA`, `mediumFrom` throws on an unknown word), `Material.smokePoint`, `trade-cooking/…/material/tallow.yaml` (`smokePoint: 478`) + `olive-oil.yaml`, `hearty-stew.yaml`'s water slot; doc: `crafting.md § The MEDIUM — why boiling cannot brown` (the two-pass fat pick, the syrup row, *the working heat is not the room's heat*). ⚠ The *"`CookPot` is not `Bulkable`"* correction inside this cut is now FALSE (`CookPot` is a `CraftVessel` — `§ Dinnerware`)
- `## Part 3` → axes 1–4 (477–487, 11) — code: `BulkPayload`, `Grade`, `CraftedMixin`, `lib/spoilage/Freshness`; doc: `crafting.md`, `spoilage.md § The gauge`
- *The one exception, taken now: the toxin kill* (501–506) — code: `applyEdibleOutput` writes payload toxicity; doc: `crafting.md § The MEDIUM` (last para — the formed toxin)
- `### How the trade feeds the clock` (508–523) — doc: `spoilage.md § What cooking does to it`, `§ Calibration`
- `### Leftovers` → *Freshness rides the PAYLOAD* (634–642) + *Reheating is the kill step again* (643–647) — code: `BulkPayload.freshness`, transfers blend by mass; the lazy warm-through (`warmed-through.yaml` 335 K / 120 s); doc: `spoilage.md § The blend half`, `§ What cooking does to it`
- `### Seasoning` → *As an ingredient — works today* (691–697) — code: the discrete-ingredient branch of `pour` / `add`; doc: `crafting.md § The by-hand paths (cooking)`
- `## Part 4` → *One build, not two* + the four waves (735–765, 31) — shipped as designed; the baker-pack item 4 (787–788) — shipped. Pointer left
- `## Part 4` → the seam bill's **S1** + **S2** (801–825, 25) — code: `lib/thermal/Thermal.ts` l.556–576 (*the held temperature of a lit, fuelled Furnace that is heating this body — the furnace HOLDING it or the furnace it RESTS ON — supplies the ambient*), `FurnaceMixin.restampHeated` (`thermal.md` l.77), `lib/thermal/ThermalDose.ts` (∫f(T)dt; browning z = 33 K kept apart from the kill's Arrhenius); doc: `crafting.md § The doneness seam`, `spoilage.md § Doneness`. Pointer left
- `## Part 6` main — the requirement, the two paths, the unification, the payoffs (942–1014, 73) — code: `platform/thing/Dish.ts` extends `CraftVessel`, `ServingVessel.ts`, `trade-cooking/src/thing/CookPot.ts`, `claimGlass` for `edible`; doc: `crafting.md § Dinnerware is a POOL, not a mint`. Pointer left
- `### Cutlery & utensils (settled)` (1016–1054) — code: `lib/bulk/Utensil.ts`, `CutleryMixin`, `EatController`; doc: `crafting.md § Cutlery — it reads, it never gates`, `§ The serviceware tier`
- `### The field: no travel category (settled)` (1154–1176) — doc: `crafting.md § Split by what performs the act` (*camp cooking works*), `§ Dinnerware` (the pot as last resort), the `boil` / `purifiedByBoiling` cross-reference
- `### Taste: the anti-gauge` (1609–1659, 51) — code: `lib/metabolism/Palatable.ts` on `ServingVessel`, `BulkPayload.parts` / `tastes`, `Material.tastes` (the closed five); doc: `crafting.md § The palate — taste is DERIVED, and it reads you`. Pointer left
- the build-freeze note (1670–1672)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Part 5 — The W2 recipe roster` (870–936, 67) — code: nineteen files in `trade-cooking/content/recipes/` (every sketched rung present; the rows' authored difficulties differ from the sketch in three cells — `render-tallow` easy, `press-olive-oil` standard, `clear-broth` standard), `idea/material/{tallow,olive-oil}.yaml`, `thing/{tallow-crock,oil-bottle,fruit-press}.yaml`. `crafting.md § Dave's Bar content` still said *"`trade-cooking` its four (toasted-ration, root-mash, fine-roast, hearty-stew)"* — **that sentence was fixed** (to *"its roster (nineteen since the cooking + food-safety builds — § The roster below)"*) and `### The roster — one ingredient, four outcomes` was inserted at `crafting.md § The cooking branch`, after `§ The MEDIUM` (24 lines: the grid by medium, what each rung teaches, the two fat Materials, zero new instruments, the formidable row deferred)
- `### Gadgetry: the unitasker test (settled)` (1056–1083, 28) — code: `lib/craft/ToolCapability.ts` (open kind vocabulary, parameterized `CapabilitySpec`), `clear-broth.yaml` requiring `strainer` → inserted at `crafting.md § Value-objects & vocabulary`, after the rarity paragraph (15 lines: the kind axis grows reluctantly, the row axis is free, why one good knife is mechanically enough)

### Superseded — cut (note left in the Part 1 pointer)
- *Butchery is its own trade, upstream* + its stashed findings (80–113, 34) — by the code: `butcher` / `dress` ship in **`trade-cooking`** (`src/idea/cmd/crafting/ButcherController.ts`, `src/thing/ButcherBlock.ts`, `__tests__/butchery.test.ts`), not a butchery pack; ⚠ the *domestic rule* (field-dress small game at a campfire) is **CONTRADICTED** — the `ButcherBlock` is `peers`-only and fixed (*"you cannot field-dress a boar in the woods"*, `crafting.md § verbs`). Corpse-is-not-a-recipe, cuts inheriting the carcass's age (`spoilage.md`), `render-tallow` all landed
- `### Grains & bread` → the *Milling folds into the baker pack* bullet (187–192) — by `trade-milling` (quern, grist-mill, toll-bin; the mill paid in kind — `retail.md § Deferred`); the *staling is NOT spoilage* pre-registration (203–213) — by `Staling.ts` in the baker's `lib/` (`spoilage.md § Staling` — the inverted temperature term shipped as written)

### Kept (UNBUILT)
- Part 1 → *Fish and seafood* · *Eggs & dairy* · *Grains & bread* (the crop bullet + the hearth-staples bullet) · *Hunting & foraging* (`forage` → no verb, no controller) · *Confectionery* (`caramel|toffee` → no recipe)
- Part 2 → `### Hot drinks` · `### Alcohol in the kitchen` · `### Prior art: technique is the act layer` · `### Recipe-gate v1; the free-cooking horizon`
- Part 3 → axis 5 *Process memory* · `### Hazards` (`flashPoint` → 0 hits in `Material.ts`) · `### Food & medicine` · `### Leftovers` (the rest) · `### Scraps, waste & cleanup` · `### Seasoning` 2–4
- Part 4 → the *Deliberately out* intro · items 1 (cold storage), 2 (compost), 3 (preservation), 5 (the tending wave: S4 sequencing, S5 the skill seam, *explicitly not seams*), 6 (the antitoxin — a `resolution.by` token on `ptomaine.yaml` / `botulinum*.yaml` with no item anywhere), 7 (disease)
- Part 6 → `### Cookware: rows over two spatial relations`
- Part 7 (all) · Part 8 (all) · Part 9 (all) · Part 10 → `### Can you burn things?` · `### Measurement` · `### The four lenses, tabulated`

### Uncertain — kept
- `### Can you burn things? No` — **contradicted in part** by doneness: scorch and burnt SHIPPED (`ThermalDose.scorchS`, `thermal.dose.scorchedAtS`, *"the bread came out black"*, ruined writes the Grade to `poor`); the grease fire (`flashPoint` absent) and the burnt smell reaching the room are unbuilt. Kept whole — it is the tending wave's argument — and `Left` says S1 + S2 shipped
- Part 4 → *Explicitly not seams* → *"scorched = another off-spec terminal beside the pot-luck mint"* — contradicted by `spoilage.md § Doneness` (*burnt is the object with the band; no second terminal*). Kept inside the tending bullet
- `### Grains` → *Cooking keeps the unleavened hearth staples*: `flatbread.yaml` ships in **`trade-baking`**, not cooking's roster; porridge unbuilt; no cereal crop anywhere (`trade-farming` materials: no barley / wheat; `trade-milling` ships flour, grist and bran only; `malt` still has no barley above it) — the crop bullet stands as written
- `### Hot drinks` — `coffee.yaml` (hospitality, from the urn) is the only brew; `caffeine` → 0 hits in `lib/metabolism/`; no tea / tisane rows. Unbuilt as stated
- `### Food & medicine` — `Metabolic.ts` l.174: protein *"goes nowhere — it lights up when vitals healing is driven"*; `scurvy|deficien` → 0 hits in `lib/metabolism/`. Unbuilt as stated; the scurvy set-piece is design
- Part 6 → `### Cookware` — S1 shipped through `Thermal`'s held-temperature ambient; whether τ and C flow through the VESSEL's own material (the pre-registration) is unverified. Kept
- Part 3 → axis 5 *Process memory absent*: `lib/craft/Technique.ts` is its declared carrier; `Recipe` has no `method` field (`BoilController.ts` l.33 still sketches `{ requiresHeatK: 373, method: boiled }`), so the Part 2 prior-art caution stands
- Part 9 — settled doctrine with no mechanism and nothing false (magic cannot make food; the firelighter; Carnot into the caster). A candidate for `arcane-science.md`'s content rules; flagged, not handed off
- Part 7 → `### Fuel technology is invisible` — the `kitchen` archetype (`generic-objects/content/archetypes/kitchen.yaml`: heat 373 · surface · water · cold) shipped; the gas / electric / induction ladder is tending-era. Kept whole
- Part 1 → *Fish*, *Eggs & dairy* are pre-registrations for other builds (*"not cooking's to build"*); overlaps `fishing-slate`, `ranching-slate`, `preservation-slate` for the cluster pass. The archetype palette overlaps `venue-and-supply-slate`; utilities overlap `power-utility-slate`; delivery overlaps `logistics`
- `packages/content/trade-hearth-cooking/` — an empty directory with a stale `node_modules`; a sweep item, not a slate item

### Handoff
- none — Part 9 is flagged above as a candidate for `arcane-science.md`, not handed off (no code, nothing the code proves false)

### Status block
- Left: *the tending wave (durative cook · braise) · cold storage/icebox · compost · preservation + the victualler · slices · staling promoted to the kernel* → *the tending wave (the durative cook · braise as a recipe-script · free cooking · the skill seam — S1 + S2 shipped with doneness; what remains is the durative verb, sequencing and the window skill widens) · cold storage/icebox + the cold-set desserts · compost (the spoiled-food sink) · preservation + the victualler · slices · staling promoted to the kernel · the antitoxin + the ptomaine band calibration · hot drinks (brewing, caffeine routing, tea) · the kitchen hazards (the grease fire and `flashPoint`, smoke/CO) · food & medicine (healing spends protein; deficiency) · cookware physics through the vessel's own material + the toxin convergences · the kitchen as place (the fuel ladder, utilities, the archetype palette — galley / mess / commissary / pushcart — front of house, takeout + delivery, real estate) · food culture, observance and magic (settled doctrine awaiting content) · the tolerance band on `RecipeInputSlot` · the pre-registered seams for sibling builds (the fish freshness gate · eggs & dairy · the grain crop + porridge · hunting & foraging · confectionery)*
- Size: a build → a build

---

## Notes for the coordinator

1. **Two subsystem-doc statements the code proves stale, outside my list** — `banking.md § Tabs` (a retired `TabMixin`) and `retail.md`'s two `lib/retail/…` paths (`Stock` is `platform/thing/Stock.ts`; the shelf is `lib/retail/Consignment.ts`). I changed neither; the first is in daves-bar's Handoff, the second is a path detail recorded here only.
2. **One sentence in `crafting.md` was fixed**, not inserted (the *"trade-cooking its four"* roster count) — recorded under cooking's Graduated.
3. **Kept-but-contradicted, all flagged under Uncertain**: the off-shift bartenders (Offstage), field dressing (the fixed block), *"v1 cannot burn"* (doneness), *"scorched = an off-spec terminal"*, the hearth flatbread (baking's), `CookPot` not Bulkable (inside a cut).
4. **Empty leftover**: `packages/content/trade-hearth-cooking/` (only `node_modules`).
