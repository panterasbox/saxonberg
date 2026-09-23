# Trades & the labor market — implementation plan

Executes [trades-and-labor-requirements.md](../requirements/trades-and-labor-requirements.md).
**Kind:** refactor/sweep (Stage A) → feature (Stage B). **Leads from:** content.

Stage A stands up `trade-shopkeeping` and moves the shopkeeper's
instruments (the counter, the consignment shelf, the stocking and
consigning brains, the shop's `house` subcommands, the stall seed, a
`shop` archetype) out of the kernel, and `CheckRack` into
`trade-hospitality` — **zero command views move**, the kernel keeps the
counter's *mechanism* as substrate, and a lint keeps the line from
rotting back. Stage B adds the four small things: an authored
**headcount** on a position (the opening, derived), a **derived sign**
the room's `look` prints, an **`apply`** verb whose refusal names a
number, and **par lines on two more houses** so the terminal hall's board
carries work at world start. Planning found one thing the requirements
assumed and the code does not have — a way for an applied-for holder to
**clock on and be paid** — which is D15 (confirmed by the user; it
implements a recorded lean). Planning's second finding grew Stage B by a
wave: the only capability a position could grant was `MakerMixin`, an
augment-gated marker no player can compose, so **the marker retires and
"who fulfils an order here" becomes an employment read** (D17, wave B0)
— a refactor of shipped order-routing with live content behind it, and
the reason *Risks & opens* now leads with regressions.

---

## Grounding

Verified by opening files on `design/trades-and-labor` (current with
master, 2026-09-23). Line numbers are approximate.

### The three moving classes and everything that names them

- **`packages/server/src/mud/platform/thing/Stock.ts`** — the counter:
  `PersistableMixin(ConsignmentShelfMixin(ResettableMixin(AttendantMixin(PricedOfferMixin(DetailedMixin(PostRegistrationMixin(Vessel)))))))`,
  `fixedInPlace = true` in the constructor, fields `stockLines` +
  `purchasing` (`fieldMeta` persistent + authorable), the mechanism
  (`priceFor` override with the stocking elasticity, `termsPriceFor`,
  `shortSuppliedLines`, `carriesLine`, `resolveBuy`, `onHand`, `parFor`,
  `reset`, `getLong`, `termsLineFor`), one `private static dial`, and
  `static commandContributions` naming `platform/cmd/retail/{buy,consign,reclaim}.yaml`
  in both `peers` and `environment`.
- **`platform/thing/ConsignmentShelf.ts`** — composition only:
  `PersistableMixin(ConsignmentShelfMixin(PostRegistrationMixin(DetailedMixin(Vessel))))`
  + affordances (`consign`/`reclaim`/`buy` peers, `consign`/`reclaim`
  environment). Exports `type ShelfStuff = Stuff & Container & ConsignmentShelfSurface`.
- **`platform/thing/CheckRack.ts`** — composition only:
  `PersistableMixin(HeldGoodsMixin(PostRegistrationMixin(FixtureMixin(DetailedMixin(Vessel)))))`
  + `postRegister → seatSelf()` + affordances (`check`/`reclaim`).
  Exports `type RackStuff = Stuff & Container & HeldGoodsShelf`.
- **Rows** (`class:` exactly): **17 `Stock`** — terminus ×14
  (`counting-houses/distributor/thing/counter`, `general-store/counter`,
  `goods-yards/{bottling,brewing,crowsfoot,farm,hollis,pantry,veshko,vintner}/thing/stock`,
  `market/thing/{bread-counter,fish-stall,stall}`, `wharfside/mill/thing/stock`),
  rejection ×1 (`rejection/thing/store-counter`), trade-textiles ×1
  (`trade/textiles/thing/bale-store`), hearts-delight ×0; **4
  `ConsignmentShelf`** — terminus ×2 (`general-store/consignment-shelf`,
  `market/thing/bakery-shelf`), rejection ×1 (`rejection/thing/assay-counter`),
  hearts-delight ×1 (`hearts-delight/thing/farm-shelf`); **1 `CheckRack`**
  — saxonberg-lounge (`world/lounge/thing/check-rack.yaml`, `seatIn: /world/lounge/idea/warren`).
  ⚠ That is **21 rows in four packs, plus one more pack for the rack** —
  the requirements' "20" undercounted the distributor's counter, which
  is terminus's (moved there by fermentation D10).
  Plus `packages/content/terminus/src/market/thing/MarketStalls.ts`
  (`extends Stock`, imported by package specifier
  `@saxonberg/server/mud/platform/thing/Stock`) named by
  `market/stalls.yaml` as `class: /world/terminus/market/thing/MarketStalls`.
- **Kernel production code that names the classes** (a kernel module may
  never import a pack, so every one of these is a Stage A edit):
  `platform/idea/cmd/retail/BuyController.ts:30-31,62,141,199`
  (`instanceof Stock`, `Stock` param types, `ShelfStuff`);
  `ConsignController.ts:31,35,49,252` (`instanceof Stock` →
  `getPurchasing()`); `ReclaimController.ts:13-14,24-25` (class imports
  used only for `ShelfStuff | RackStuff` typing); `CheckController.ts:25,40`
  (`RackStuff`); `platform/idea/cmd/banking/HouseController.ts:31,311`
  (`price`: `instanceof Stock` to find the counter, `lineFor`,
  `setPrice`); `platform/idea/api/EmploymentLogic.ts:38,773-777`
  (`import type Stock`, then reads `getStockLines`/`onHand` **by shape**);
  `lib/behavior/stocks.ts:59,88,274` and `lib/behavior/consigns.ts:82,281`
  (`instanceof Stock`). `BankingLogic.priceIndex` (`:826-840`) already
  narrows on `MixinApi.isPricedOffer` — untouched. `restocks.ts` narrows
  on `MixinApi.isConsignmentShelf` — untouched.
- **Kernel tests that construct them**: `lib/employment/__tests__/credit.test.ts`,
  `credit.note.test.ts`, `lib/behavior/__tests__/{stocks,eats,cellars}.test.ts`,
  `world/lounge/__tests__/restocks.test.ts`, `platform/thing/__tests__/Stock.terms.test.ts`,
  `platform/idea/cmd/retail/__tests__/{BuyController,Consignment,CheckRack}.test.ts`,
  `platform/idea/cmd/banking/__tests__/{HouseAccount,HouseStockCard}.test.ts`;
  literal path asserts in `world/__tests__/libations-annexes.test.ts:155`.
  **Pack tests**: terminus `src/__tests__/{general-store-standup.integration,general-store-content:128,fishing-content:105}.test.ts`,
  `src/market/__tests__/stall.test.ts`; trade-distilling `src/__tests__/distilling.test.ts:80,280`;
  trade-farming `src/behavior/__tests__/farms.test.ts:23,265`;
  trade-hospitality `src/__tests__/bar-fixtures-are-fixed.test.ts:26,41`.
  The `lint:field-meta` golden `packages/server/scripts/__fixtures__/field-meta-golden.json`
  records `/platform/thing/Stock` (regenerate with `--snapshot`).
- **Brains named by rows**: `/lib/behavior/stocks` — one row
  (`terminus/…/general-store/agent/keeper.yaml:46`, `cadence:90s`,
  config `{counter, ways}`); `/lib/behavior/consigns` — seven rows
  (`wharfside/mill/agent/weaver.yaml:28` — consigns linen bolts onto
  `/world/terminus/general-store/counter` at ask 40 — and the six
  goods-yard hands `bottling|hollis|veshko|farm|crowsfoot|pantry/agent/hand.yaml`);
  `/lib/behavior/restocks` — one row (`saxonberg-lounge/…/agent/mara.yaml:61`,
  `cadence:15m`, config `{shelf, rack, bin, board: /trade/haulage/thing/works-board, bench: /trade/haulage/thing/receiving-bench, reward: 30}`).
  Pack brains exist already (`residence`, `trade-farming`, `trade-fishing`,
  `trade-haulage/src/behavior/hauls.ts`, `trade-mining`, `trade-ranching`,
  `trade-tailoring`, `trade-textiles`): `src/behavior/<name>.ts` backs
  `/<root>/behavior/<name>`, sole export `export const brain = class {…}`.
- **`house`** — `packages/content/platform/content/platform/cmd/banking/house.yaml`
  is one view with subcommand stanzas; `freight` and `traffic` already
  carry `controller: /trade/haulage/idea/cmd/banking/HouseFreightController`
  (`packages/content/trade-haulage/src/idea/cmd/banking/HouseFreightController.ts`,
  `extends CommandController`, resolves its house via `buysFor()[0]`).
  `HouseController` (`:48-68` dispatch; `par` `:210-284`; `price`
  `:285-345`; `stock` `:346-410`) extends `BankingControllerBase`, whose
  `resolveHouse(context)` (`BankingControllerBase.ts:93-128`) is the
  seat-based house resolver (wallet's active house → a business
  operating the room or a fixture in it that employs the giver → `buysFor()[0]`).
  `@saxonberg/server/mud/platform/idea/*` is in the server's `exports`
  map, so a pack controller may extend `BankingControllerBase`.
- **The stall** — `terminus/src/market/idea/cmd/StallController.ts`
  hard-codes `STALL_SEED = '/world/terminus/market/thing/stall'` (a
  `Stock` row, terminus) and `STALL_BUSINESS_SEED = '/platform/idea/Business/stall'`
  (`packages/content/platform/content/platform/idea/Business/stall.yaml`,
  `class: /platform/idea/Business`, one `keeper` seat, `purchases: true`);
  `identitiesOf` mints `<seed>/<leaf>` for both.
- **Pack shape** (`packages/content/trade-fuel/`): `pack.yaml`
  (`id, version, root, description, requires.title[{extent, holder:{organization: /compact/trade}}]`),
  `package.json` (`@saxonberg/content-<id>`, `workspace:*` deps — the
  derived `dependsOn`), `tsconfig.json` (`extends ../../../tsconfig.base.json`,
  `include: src/**/*`, `noEmit`), `vitest.config.ts` (`callSecPlugin()`,
  globals, node), `README.md`, `src/…`, `content/<root-minus-slash>/…`,
  a controller row `content/trade/fuel/idea/cmd/fuel/CharController.yaml`
  beside its `src/idea/cmd/fuel/CharController.ts`. A pack is discovered
  from the **root** `package.json`'s `@saxonberg/content-*` dependencies
  (`package.json:37` lists `content-trade-fuel`). Cross-pack class import
  is by package specifier into the other pack's `src/`
  (`tpa/src/thing/TpaTerminal.ts:54` ← `@saxonberg/content-arcana/src/lib/ManaPowered`;
  `terminus/src/realty/agent/Realtor.ts:51` ← `@saxonberg/content-residence/src/idea/ResidenceCatalogue`)
  with the dependency line; the rung check requires it
  (content-packs.md § The rung check, rule 2).
- **Archetypes** — `lib/archetype/Archetype.ts`: `fromData` takes
  `archetypeId`, `label`, optional `industry` (only for recipe-derived
  rows), optional `surveyScope` (`space`), `capabilities[{key, needs, default?}]`;
  `CapabilityNeed` ∈ `tool | heatK | bulkSource | surface | seating | coldStorage | rest | presence | lightLux | cultivation | vesselKind`.
  `platform/idea/ArchetypeCatalogue.ts` warms from `documents {kind: 'archetype'}`
  (`content/archetypes/*.yaml`, any pack). `Archetype.materialize()`
  clones each `default` into a derived test venue; the precedent is
  `trade-hospitality/src/__tests__/menu.test.ts` (`:194-203`). No verb
  materializes an archetype; `SurveyController` reads them.
- **Position / Organization / Business** —
  `lib/employment/Position.ts`: `PositionData {key, label, noun?, wageRate, confers, compensation?, reportsTo?, purchases?}`,
  `Position.fromData` coerces every field and drops what it does not
  know; `serialize` round-trips. `lib/employment/Organization.ts`:
  fields `positions: PositionData[]`, `rosterSlots`, `appointingAuthority`;
  reads `getPositions/getPosition/holdersOf(key)/employees()`; the F4
  face `appoint(actor, key)` (`:434`, forwards into `EmploymentLogic.hireImpl`
  `:437` — **no authority check inside**; the `appoint` verb's gate is the
  field validator `lib/command/validators/mustHoldAppointingAuthority.ts`
  on the view's `organization` arg); the seven holder transitions
  (`hire/endEmployment/ensureRostered/beginShift/endShift/beginCover/endCover`)
  gated `AnyOf(SelfOnly, FromTemplate('/platform/idea/api/employment'))`.
  `platform/idea/Business.ts:151` `BusinessMixin` (`isClosed()`,
  `getOperatingLocations()`, `getAccountPath()`), `:331` `BusinessEntity`.
- **Shifts** — `beginShift` is called from exactly one place:
  `EmploymentLogic.runTick` (`:1380-1412`), per **roster assignment**,
  from `roster.evaluate(assignment, date)`; the off-transition runs
  `settleShiftWageImpl(business, assignee, emp, nowRaw)` (`:1021`;
  `amount = Math.round(wageRate × gameHours)`, then `payHouseWageImpl`).
  `Employed.shiftState()` (`Employed.ts:435`). **No view under
  `platform/cmd/` is a clock-on/clock-off verb** (grep of `platform/cmd/**`
  for `clock|shift` hits prose only). ⚠ So a holder with no
  `rosterSlots` entry is never on shift, is never paid, and confers
  nothing — see D15.
- **The actor face** — `Employed.ts:415-421`: `quitJob(organizationPath)`
  and `buysFor()` forward into `employedLogic()` (the F4 actor face, with
  the sanctioned `no-restricted-imports` disable at `:70`). The pattern
  `clock on/off` follows.
- **`appoint`/`quit`** — views `platform/cmd/employment/{appoint,quit}.yaml`,
  controllers `platform/idea/cmd/employment/{Appoint,Quit}Controller.ts`,
  afforded on `lib/character/Persona.ts:168,172` (`commandContributions.self`).
  `platform/cmd/employment/` also holds `tip.yaml`, `collect.yaml`.
  No view claims `apply` or `clock` (checked against `lint:verb-collisions`'s
  corpus by grep).
- **Contracts** — `lib/employment/ContractRecord.ts`: `kind` (`gig|loan|note|unclaimed`),
  `state` (`open|claimed|settled|breached|expired`), `claimant`,
  **`settledBy`** = "the completer's durable key once settled, or ''"
  (`:183`), `boardPath`; finders `findLiveByBoard`, `findActiveByClaimant(claimant)`,
  `findByKind(kind, state)`, `findAllClaimed`. `ContractApi` → `ContractLogic`
  (`/platform/idea/api/contract`) is the one writer; reads are async
  record finders. `JobController` bare = `ContractApi.openGigsOn(boardPath)`.
  A gig is posted **to a board template path** — every works board
  shares `/trade/haulage/thing/works-board`, so the nine propped works
  boards are **one pool**; the hall's `/world/terminus/terminal/thing/job-board`
  and rejection's `pithead-board` are two other pools. The carter
  (`trade-haulage/…/agent/carter.yaml:48-56`, `hauls`, `cadence:4m`,
  `boards: [works-board]`, batch 1) covers **bounty** gigs nobody took
  inside `haulage.gigWindowGameHours` (= 6, `trade-haulage/content/settings/haulage.yaml:37`)
  and never claims. Bounties escrow at post; posting fails if the house
  cannot fund it; `job complete` pays only a completer who **holds a
  primary bank account**.
- **Competence** — `lib/advancement/Advancement.ts:509`
  `competenceBandFor(discipline): Promise<CompetenceBandName>` on
  `AdvancementMixin` (every `Character` composes it, `Character.ts:99`);
  `lib/advancement/CompetenceBand.ts`: `COMPETENCE_BANDS = untrained|novice|competent|proficient|expert`,
  `CompetenceBand.atOrAbove(current, threshold)`, `isBand`. `MixinApi.isAdvancing`
  (`api/mixin.ts:991`). Disciplines are rows (`platform/…/idea/Discipline/*.yaml`
  + each trade pack's `trade/<x>/idea/Discipline/*.yaml` — `tailoring`,
  `baking`, `smithing`, …).
- **The room's `look`** — `platform/idea/cmd/perception/LookController.ts:150-300`:
  the room branch is `async`, renders `location.getMarkupLong(actor)`
  (the location's own mixins' `markupAugmenters` — a fixture's
  augmenters never reach the room's text), then an engine line for
  puddles (`BulkableApi.floorPuddleSummary(location)` — **the precedent
  for a derived room-level line from a subsystem read**), exits, then
  `── You also see: <Mml.thing(item)>`. `MarkupAugmenter` is sync and
  pure by contract (`api/mml.ts:95-120`).
- **The business index** — `EmploymentApi.businessAt(locationPath: string): BusinessStuff | null`
  (`api/employment.ts:134`) is **sync** over the live-business memo
  (`EmploymentLogic.ts:1557`); `ensureOperatorAt(path)` is the async
  lazy standup (stands a business up — an economic act, not a read).
  `operatingLocations` name **rooms or fixtures**: the general store
  names its counter; the university farm-unit names
  `campus-farm/location/yard` + `campus-field/location/home-field`;
  the tailor names its shop room + counter; the bakery its room + bread
  counter. `EmploymentApi` is in `check-object-verbs`'s `EXEMPT_APIS`
  (`scripts/check-object-verbs.ts:103`).
- **Houses this build authors on** — general store business
  (`terminus/…/general-store/business.yaml`: `clerk` @5 held by Pemby,
  `keeper` @0 `purchases` held by Odell, `banksAt: goodkin`, **boot-pinned**
  with its shop floor at `terminus/pack.yaml`); the university farm-unit
  (`eternal-university/…/campus-farm/idea/farm-unit.yaml`: `labourer` @2,
  authority `office: prime-minister`, **not boot-pinned** — eternal's
  `boot:` lists only the dorm warren and the college); the tailor's shop
  (`terminus/…/mayfield-row/tailor/idea/outfit.yaml`: `tailor` @6
  `purchases`, 24/7, **boot-pinned** with its shop); the hearthworks
  (`hearthworks/…/idea/business.yaml`: `smith` @5, `cook` @4, both
  `confers: [MakerMixin]`, 24/7, entity authority = the smith,
  `operatingLocations: [location/smithy, location/cookhouse]`, **not
  boot-pinned**; the cookhouse props an oven, a cook-pot, a water butt,
  the kitchen menu and a `pantry-chest`).
- **`MakerMixin` and the conferral fold** — `lib/craft/Maker.ts` is a
  marker with no behaviour (`isMaker(): boolean { return true }`,
  `_augmentGated = true`); its docstring names the premise that expired:
  *"with crafting location-agnostic and no venue/staff roster, the
  fulfilling maker is identified by an agent property."* `MixinApi.isMaker`
  (`api/mixin.ts:1640`) = `isActive(obj, Mixins.Maker)`, and
  `collectAugmentConferralNames` (`:2171`) walks slot augments, then
  species innates, **then folds in `Employed.getConferredMixinNames()`**
  (`:2229-2234`, a structural soft-lookup) — the augment mechanism
  carrying a job. `Employed.getConferredMixinNames` (`Employed.ts:334`)
  unions on-shift Positions' `confers`. **Six production call sites**,
  every one asking *who is the on-duty staff member here*:
  `CraftingLogic.resolveMaker:179` (`order` routing — a present maker
  other than the giver), `:348` and `:448` (gather-walk exclusions —
  redundant with the `!isOrganism` beside them), `EmploymentLogic:830`
  (`tipRecipientFor`), `covers.ts:42` (the proprietor covers when no
  other maker is present), `CollectController:36` (only the on-shift
  bartender collects the jar), `BankingControllerBase.presentBartender:134`
  (the house's rep — used to find a bank's teller). **Composers**:
  `platform/agent/Crafter.ts:30` (`CastMixin(MakerMixin(NPC))`, named by
  **7 rows**: lounge `dave|mara|remy|sloane|augie`, hearthworks
  `smith|cook`) and comments in `Cast.ts`/`lib/npc/Cast.ts`.
  **49 `confers:` lines** across the content rows. **Rows**: `confers: [MakerMixin]`
  on 9 seats — hearthworks `smith`+`cook`, lounge `bartender`, bakery
  `baker`, hearts-delight `miller` + the farm's, goods-yard `hand` at
  brewing/crowsfoot/vintner (the production hands that `order` recipes
  on their floors); every other seat authors `confers: []`. **Cover**:
  `Organization.beginCover` (`:405`) upserts a transient on-shift record
  against `positions[0]`. `Mixins.Maker` at `lib/mixin.ts:433`.
  **24 test files** name `MakerMixin`/`isMaker` (crafting ×5, employment
  ×8, lounge/hearthworks content ×3, tips, wages, Caster, CraftMixins,
  Business, Position, conferral, compensation). `CasterMixin` and
  `AetherMixin` are the other two `_augmentGated` mixins — real
  augments (an implant, a gift) — and are untouched. `Avatar` composes
  none of the three. The only position grant a player receives today is
  `purchases` (`wallet use house`, off `buysFor()`, not shift-gated).
- **Every `order` venue's `operatingLocations` covers the room its maker
  stands in** (needed by D17's "here" leg): lounge → `location/bar`;
  hearthworks → `smithy` + `cookhouse`; bakery → its room + counter;
  hearts-delight mill → `location/millsite`, farm → `farmstead-yard` +
  `upper-bench`; goods-yard outfits → their floors. The kitchen menu
  (`hearthworks/thing/kitchen-menu.yaml`) is a `Menu` in the cookhouse,
  so `order` bites there for a player; the bakery has no `Menu` (its
  loaves are `buy`). Dave runs `covers` (`dave.yaml:64`, `cadence:30s`);
  hearthworks's smith does not.
- **`livelihood-slate` §5.4:343** carries `[LEAN] Shift model — voluntary
  clock-in, employer-bounded; rigid schedules are hostile to real humans`.
- **Lints** — roster derived from `packages/server/package.json`
  `lint:*` (`lint:family`). Zero-ceiling exemplar `scripts/check-drive-scripts.ts`;
  allowlist-ceiling exemplar `scripts/check-verb-collisions.ts`;
  census-ratchet exemplar `scripts/check-lib-statics.ts`; the shared pack
  reader `scripts/pack-roots.ts`. `lint:untitled` derives title roots
  from every pack's `requires.title` claims. `lint:field-meta --snapshot`
  rewrites the golden.
- **The wire harness** — `packages/wire/src/harness/index.ts` exports
  `Session` (`cmd`, `prose`, `query`, `queryOne`, `awaitActivity`,
  `awaitPrompt`, `drainProse`), `uniqueHandle`, `expectOk/expectRefused/expectNote/expectNoNote/detailOf`,
  `declareFile({file, packs, dirtyReason})`. `tests/work.dirty.wire.test.ts`
  is the gig-loop precedent (unbanked refusal → open an account →
  `job complete`). Cadence brains fire **after** their first jittered
  interval (`Behaved.ts:_scheduleJittered`), never at spawn.
- **Docs already claim the destination**: `docs/subsystems/retail.md:78`
  says the counter is `lib/retail/Stock.ts` (it is not, today);
  `docs/subsystems/behavior.md:195` lists `consigns` among the kernel's
  generic economy brains (it moves — the sweep updates this).

---

## Plan-level decisions

**D1 — The counter's MECHANISM stays in the kernel as an abstract base; the
pack ships the concrete twin.** `lib/retail/Stock.ts` (kernel, substrate
only ever inherited) becomes the whole of today's `platform/thing/Stock.ts`
minus the affordance statics: the composition chain, `fixedInPlace`,
`stockLines`/`purchasing` + `fieldMeta`, every method. It is exported as
`Stock` and never instanced by a row (`lint:instanceable`). The pack's
`packages/content/trade-shopkeeping/src/thing/Stock.ts` is
`export default class Stock extends StockBase {}` carrying **only**
`static commandContributions` (strings unchanged). This is the repo's
own *split it* rule (`CLAUDE.md § Instanceable lives in platform/…` —
seven twins share their base's name), with the twin across the pack
boundary. Why not a pure shape seam: six kernel production sites and
twelve kernel tests need the mechanism itself (`priceFor` is the price
index's and the ladder's rung 0), and the kernel may not import the
pack. Why not a mixin: it would need a four-mixin base constraint and
have one production composer; the abstract base gives every kernel test
a one-line fixture (`class TestStock extends Stock {}`) and every kernel
consumer `instanceof Stock` against a lib import. The dials
`retail.stockingElasticity` / `retail.termsMargin` are the mechanism's
and stay in the platform's `settings/retail.yaml` — the requirements'
"the trade's own dials" turns out to be an empty set once the mechanism
is kernel substrate (see *Risks & opens*).

**D2 — `ConsignmentShelf` and `CheckRack` move whole.** They are
compositions of kernel mixins plus affordances; nothing in them is
mechanism. `ShelfStuff` and `RackStuff` move to `lib/retail/Consignment.ts`
beside the surfaces they alias. Kernel controllers narrow on
`MixinApi.isConsignmentShelf` / `isHeldGoodsShelf` and on `Stock`
(the lib base) — never on a pack class.

**D3 — `stocks` and `consigns` go to the pack's `src/behavior/`;
`restocks` stays kernel.** Requirements name the two. Rows renamed
`/lib/behavior/stocks` → `/trade/shopkeeping/behavior/stocks`
(1 row) and `/lib/behavior/consigns` → `/trade/shopkeeping/behavior/consigns`
(7 rows, all terminus). `restocks` reads `Business.parLines` (kernel) and
narrows on a mixin; it is the bar's and stays.

**D4 — `house price / par / stock` move by STANZA, not by view.** The
platform's `house.yaml` keeps every stanza; `price`, `par`, `stock` gain
`controller: /trade/shopkeeping/idea/cmd/banking/HouseShopController`
exactly as `freight`/`traffic` name haulage's. `HouseShopController
extends BankingControllerBase` (inherits `resolveHouse`) and takes the
three methods verbatim from `HouseController`, which keeps
`book/pnl/payroll/roster` and drops its `Stock` import. A world without
`trade-shopkeeping` gets a legible `controller-error` on those three,
never a crash (the haulage precedent). ⚠ The bar's keeper uses `house par`
and `house stock` too; since every pack ships in every build this is a
dependency, not a break — recorded under *Risks & opens*.

**D5 — The stall's BUSINESS seed moves; its COUNTER seed stays.**
`/platform/idea/Business/stall` → `/trade/shopkeeping/idea/business/stall`
(row moved byte-for-byte, path updated in `StallController.STALL_BUSINESS_SEED`).
`/world/terminus/market/thing/stall` is the market's own prose and stays
in terminus, re-classed like every other counter.

**D6 — A `shop` archetype + two default rows.** `content/archetypes/shop.yaml`:
`archetypeId: shop`, `label: a shop`, `surveyScope: space`, no `industry`
(a shop derives no recipe rows), capabilities
`counter {presence: counter} default /trade/shopkeeping/thing/counter`,
`shelf {presence: shelf} default /trade/shopkeeping/thing/consignment-shelf`,
`light {lightLux: 60}`, `keeper {presence: keeper}` (no default — an
agent is the venue's). The two default rows are generic (no lines, no
prices, `businessPath: ""`) so `materialize()` stands up a buyable
floor once a test consigns onto it.

**D7 — `MarketStalls extends Stock` survives by package specifier.**
`import Stock from '@saxonberg/content-trade-shopkeeping/src/thing/Stock'`
+ `"@saxonberg/content-trade-shopkeeping": "workspace:*"` in terminus's
`package.json` (the tpa→arcana precedent). `StallController` likewise.

**D8 — Migration honesty: the dev DB is DROPPED after Stage A.** Rows
change `class:`; the stall business identity path changes; `holder_snapshots`
and `content` rows from before the move are stale by definition. No
compat shim, no migration (`CLAUDE.md`, memory *NO MIGRATIONS EVER*).
The A2 commit message and the MR description say so.

**D9 — The anti-rot gate is `lint:counters`, an allowlisted ceiling of
4.** Census: every kernel class under `platform/**` (non-test) whose
composition text contains `AttendantMixin(`, `PricedOfferMixin(`,
`HeldGoodsMixin(`, `ConsignmentShelfMixin(`, or `extends Stock` — a
*counter*: the front-of-house instrument of some vocation. After Stage A
the kernel holds exactly four, each named in the script with its reason:
`AttendancePoint` (the generic queue — substrate), `Menu` and `Tariff`
(the consumer's `order` surface over a kernel-owned closed vocabulary —
retail.md § The priced SERVICE), `BankCounter` (**trade-banking, deferred
by the requirements with a stated reason** — the one row that is a to-do).
A fifth fails the build with the message *a counter is a vocation's
instrument; it ships in `/trade/<x>`*. The rule it enforces is written
into `docs/subsystems/retail.md` at the sweep (*The kernel/pack line*).
Rejected: a "single-pack-namer" census (misfires on ~21 kernel substrate
classes and would not have caught `Stock`, which four packs name).

**D10 — Openings are DERIVED from an authored `headcount`.**
`PositionData.headcount?: number` (≥1; absent = today: no opening ever
advertised) and `PositionData.requires?: { gigs?: number; discipline?: string; band?: CompetenceBandName }`.
`OrganizationMixin.openingsFor(key) = max(0, headcount − holdersOf(key).length)`
(sync; `holdersOf` already unions live records with the authored roster
and suppresses exits), `openings(): Opening[]`. Nothing decrements; a
hire, a `quit`, a `vacated` all move the count by construction.
`Position.fromData` **throws** on a `requires` key outside the closed
three — a criterion outside the vocabulary is the ⛔ and must not be
silently coerced away.

**D11 — The sign has NO host mixin: it is a room-level line the
employment engine derives on `look`.** `EmploymentApi.noticesAt(locationPath: string): Opening[]`
(sync; string-keyed, the `businessAt` shape) → `EmploymentLogic`: the
businesses **live** in the memo that operate this room or any fixture
standing in it (the `resolveHouse` candidate walk: the room's path, then
each content's identity path), skipping `isClosed()` houses, flattened
to their `openings()`. `LookController`'s room branch appends one line
per opening after the puddle line — the puddle precedent exactly. Host
placement test: no mixin is composed anywhere, so nothing claims
anything about any host; a room with no business costs one memo miss.
The read is **sync over live businesses only** — standing a business up
from a `look` would make walking past a shop an economic act (its
roster ticks, its wages flow). Consequence, an **authoring rule the lint
checks**: a house that authors a `headcount` is a `boot:` producer of
its pack (D18).

**D12 — `apply` is a platform verb in `employment`.** View
`platform/cmd/employment/apply.yaml` (`apply [for <position>] [at <organization>]`,
both `type: string`, optional), controller `platform/idea/cmd/employment/ApplyController.ts`,
afforded on `Persona.commandContributions.self` beside `appoint`/`quit`
(a person's own act). Resolution: an explicit organization path, else
the openings `noticesAt(here)` finds — one → it; several and no position
named → refuse `ambiguous-opening` naming them. Then
`organization.considerApplicant(giver, key)` (D13/D14) → on refusal,
`controller-rejected` with reason `no-opening | gigs-short | band-short | already-held | not-employable`
and prose naming **both numbers**; on success `organization.appoint(giver, key)`
(the same act Dave's dialogue dispatches) and a scene. Standing is
conferred by the employer: the organization decides, the applicant
asks.

**D13 — The gig criterion is one ContractApi read.**
`ContractApi.settledGigsBy(identityPath: string): Promise<number>` →
`ContractLogic` → `ContractRecord.find({kind: 'gig', state: 'settled', settledBy: identityPath})`
(a finder `findSettledBy(key)` on `ContractRecord`, the existing
static-finder shape). Not a free helper: it is a static on the one Api
that owns the collection, string-keyed.

**D14 — The trade criterion reads the applicant's band.**
`considerApplicant` asks `MixinApi.isAdvancing(applicant)` →
`applicant.competenceBandFor(discipline)` and compares with
`CompetenceBand.atOrAbove(held, wanted)`. The verdict carries
`{ ok: false, kind: 'band', wanted, held, discipline }` and the prose
says *a competent hand at tailoring is asked; you are untrained —
practising lifts it*. Gigs first, then the band (one refusal names one
number; the cheaper lift first).

**D15 — `clock on` / `clock off` is the wage mechanism for an applied-for
seat.** Not in the requirements, and forced by grounding: `beginShift`
runs only from the roster tick over authored `rosterSlots`, so a player
who `apply`s holds a seat that never starts a shift, never pays, and
never confers. Two ways out: (a) `apply` writes the applicant a roster
slot with the seat's authored hours — paid for the window, present or
not, which is the AFK wage the requirements defer and lens 6 names a
failure (*a wage for existing*); (b) an explicit act. **Lens 6 and lens 3
choose (b), and it is a recorded lean, not new scope**:
`livelihood-slate` §5.4 — *"[LEAN] Shift model — voluntary clock-in,
employer-bounded; rigid schedules are hostile to real humans."*
Confirmed by the user at planning. Verb `clock` (`clock on` / `clock off`, aliases `in`/`out`),
category `employment`, afforded on `Persona.self`; controller
`ClockController`; the actor face `Employed.clockOn(organizationPath)` /
`clockOff(organizationPath)` forwarding into `EmploymentLogic` (the
`quitJob` shape), which verifies a non-exited employment at that
organization, requires the actor to be **in a room the organization
operates or that holds an operated fixture**, then `organization.beginShift(actor, now)`;
`clockOff` runs `settleShiftWageImpl` then `endShift` — the roster
tick's own off-transition, invoked by the holder. A rostered NPC is
untouched (the tick still governs it); a player with no roster slot is
governed only by the clock. The refusal names why (`not-employed-here`,
`already-on-shift`, `not-on-shift`).

**D16 — Which houses, and which board.** Openings: the general store
gains a **`hand`** seat (`noun: hand`, `label: hauling and shelving for
the general store`, `wageRate: 4`, `headcount: 1`, `requires: {gigs: 2}`,
no `purchases`, no `fulfills`) — a plain waged seat; the demand is real
(Odell keeps *and* stocks; the shop's work exceeds its hands) and it is
the **application** demonstration (drive steps 3–5). The hearthworks
gains a **`kitchen-hand`** seat (`noun: kitchen hand`, `label: at the
hearth`, `wageRate: 3`, `headcount: 1`, **`fulfills: true`**,
`requires: {gigs: 2}`) — the **capability-grant** demonstration (drive
step 6): the cookhouse has a `Menu`, so `order` bites there; the NPC
`cook` keeps its own seat (24/7, `fulfills: true`) so a clocked-off
player's order visibly routes to the cook instead. The tailor's `tailor`
seat gets `headcount: 2` and `requires: {discipline: tailoring, band: competent}`
(the trade seat for drive step 7; the house is boot-pinned and pays 6);
the university farm's `labourer` gets `headcount: 2` and the farm-unit a
`boot:` line in `eternal-university/pack.yaml`. Par lines: the
**hearthworks cook** gains `purchases: true` (the NPC posts as the house;
the player's `kitchen-hand` does not carry it), a `parLines:` of two cheap
distributor lines (citrus and ice — copy the category/unit/exemplar
shape from the lounge's `business.yaml`), a `restocks` brain
(`cadence:90s`, `board: /world/terminus/terminal/thing/job-board`,
`bench: /trade/haulage/thing/receiving-bench` propped into the cookhouse,
`shelf:` a `Surfaced` fixture in the cookhouse the goods are `put … on`,
reward ≥ supplier price + carriage, and ≤ what a newcomer's twenty coin
can front); the **tailor** gains `parLines:` of one line — linen bolts,
supplier `/world/terminus/general-store/business` (where the mill's
weaver consigns them at 40), reward 48 — a `restocks` brain and a bench
in the shop. Both post to the **hall noticeboard**; Mara stays on the
works-board pool (nine boards keep her orders); the carter's `boards:`
gains the hall board so both pools are covered. The pithead board stays
empty (its demand is player-supplied timber and charcoal — a slate
note). Hearthworks's business joins its pack's `boot:`.

**D17 — `MakerMixin` and `confers:` retire; "who fulfils here" is an
employment read.** (Replaces the plan's first D17, which put `purchases`
on the entry seat as a workaround for a grant no player could receive;
an uncapped house card is a spending authority, not a skill.) The
user's ruling, verified in *Grounding*: augment gating is for physical
implants and innate gifts, not a means test — yet `collectAugmentConferralNames`
folds a job into the implant walk, and `MakerMixin` is a marker whose
own docstring says it stood in for a staff roster that now exists.

- **The information `confers: [MakerMixin]` carries is real and not
  derivable**, so it becomes **`PositionData.fulfills?: boolean`** —
  the `purchases?: boolean` precedent: data on the position, never a
  marker mixin, authority is the seat's. Not derivable: `order` serves
  both a customer at the bar and a production hand on a goods-yard
  floor, and the outfits' own rows say which hands do the work (brewing,
  crowsfoot and vintner's hands fulfil; bottling, hollis, veshko, farm
  and pantry's do not) — no field already there separates them
  (`serverPositionKeys` is *who attends the counter*, a different
  question; `noun`, `wageRate`, `purchases` say nothing about it). The
  spelling follows the repo's verb (`fulfill.yaml`): `fulfills`.
- **The read** is `Employed.isFulfilling(): boolean` (sync, on the actor
  face): some **on-shift** employment whose live organization's position
  has `fulfills: true` **and** whose organization operates the room the
  actor stands in or a fixture standing in it (`getOperatingLocations()`
  against the room's path and its contents' identity paths — the
  `resolveHouse` walk). Identical for an Avatar and an NPC; nothing is
  composed on either. `MixinApi.isMaker`, `Mixins.Maker`, the `Maker`
  interface and `lib/craft/Maker.ts` are deleted; the six call sites
  read `MixinApi.isEmployed(c) && c.isFulfilling()`; the two gather-walk
  exclusions (`CraftingLogic:348,448`) drop the maker clause — they sit
  beside `!isOrganism`, which already excludes every agent.
- **`beginCover`** upserts against the first position with `fulfills: true`
  (today: `positions[0]`, which happens to be the bartender).
- **The augment mechanism goes back to being only about augments**:
  `Employed.getConferredMixinNames` and the employment fold in
  `collectAugmentConferralNames` are deleted; `_augmentGated` remains on
  `CasterMixin` and `AetherMixin` alone; `PositionData.confers` is
  deleted from the interface, `fromData`, `serialize` and all 49 row
  lines. `Crafter` (`CastMixin(MakerMixin(NPC))`) is now a `Cast`: the 7
  rows re-class to `/platform/agent/Cast` and the class is deleted.
- **What a player now gets at clock-on is real**: on shift in a
  `fulfills` seat, `order` at that venue routes to them; off shift, it
  does not. Drive step 6 demonstrates it at the hearthworks cookhouse
  (D16), where a `Menu` makes it bite.

**D18 — `lint:openings`, ceiling 0.** Over every pack's rows: a
`requires` key outside `{gigs, discipline, band}`; a `band` not in
`COMPETENCE_BANDS`; a `discipline` no shipped `Discipline` row keys; a
`headcount` that is not an integer ≥ 1; a Business row carrying a
`headcount` position that is not a `boot:` entry of its own pack;
`fulfills`/`purchases` present but not boolean; **any `confers:` key on
a position** (the retired seam must not creep back); and, for every
position with `fulfills: true` that has a roster assignee, the business
operates the room that assignee's `shifts`/`behindBar` config or
`startLocation` names (the "here" leg of D17 — a maker standing in a
room its house does not list silently stops fulfilling). The boot rule
keeps D11 honest; the `requires` rule is the ⛔ made mechanical.

**D19 — Drive step 11 is proven by the pack's own archetype test.** No
verb materializes an archetype and the wire harness may not import
server code, so `trade-shopkeeping/src/__tests__/shop-archetype.test.ts`
(the `menu.test.ts` precedent) materializes `shop`, consigns a good
onto the shelf, and `buy`s it; the drive record cites the test for step
11 and the wire file covers steps 1–10.

---

## ⭐⭐ Host placement

| what | host | what composing/adding it claims | the narrowing test |
|---|---|---|---|
| The counter mechanism (`lib/retail/Stock.ts`, abstract) | inherited by the pack's `Stock` twin and by test fixtures only | nothing about any other host; nothing instances it | no guard anywhere — consumers `instanceof` the base |
| `Stock` / `ConsignmentShelf` (pack twins), `CheckRack` (hospitality) | `/trade/shopkeeping/thing/…`, `/trade/hospitality/thing/CheckRack` | a shop's counter and shelf are the shopkeeper's; a cloakroom is the doorman's | rows name them; nothing else |
| `headcount`, `requires` | `PositionData` (kernel value object) | every position everywhere *may* author an opening — a ministry, a newspaper, a shop; absent is exactly today | no guard: absent → no opening |
| `fulfills` (replaces `confers`) | `PositionData` — the `purchases` precedent | a seat, anywhere, may be the one that does the work an `order` asks for; absent = a seat that does not fulfil (today's `confers: []`) | no guard: absent → false |
| `isFulfilling()` | `EmployedMixin` actor face | every employable actor can answer *am I the on-duty hand here*; an Avatar and an NPC answer identically with nothing composed | the "here" leg is a read of the organization's own `operatingLocations`, not a host guard |
| `MakerMixin` (deleted) | — | its removal *un*-claims: no agent class is a maker by construction any more; `_augmentGated` is left to two real augments | the tell that justified the wave: a job folded into the implant walk |
| `openingsFor` / `openings` / `considerApplicant` | `OrganizationMixin` (the chart) | the chart answers *what is open here and who qualifies* for any organization; `isClosed()` is not consulted here (it is Business's) | the engine read (D11) skips closed houses — a Business fact read where Business is known, not a re-narrowing |
| The sign | **no host** — `EmploymentApi.noticesAt(path)` + a `LookController` line | every room asks the memo once per look (the puddle precedent); nothing is composed | n/a |
| `Opening` value object | `lib/employment/Opening.ts` | a named vocabulary (`describe()`, `wants()` words) — the *named value-object* category | n/a |
| `apply`, `clock` views + controllers | `platform/cmd/employment/`, `platform/idea/cmd/employment/` | a person's own acts; afforded on `Persona.self` like `appoint`/`quit` | the controller refuses when nothing applies |
| `clockOn` / `clockOff` | `EmployedMixin` actor face → `EmploymentLogic` | any employable actor may clock at a house that employs them; the org's gated `beginShift/endShift` stay gated (the logic calls them) | refusal reasons, not host guards |
| `settledGigsBy` | `ContractApi` / `ContractLogic` + `ContractRecord.findSettledBy` | one more read on the collection's one owner | n/a |
| `HouseShopController` | pack `src/idea/cmd/banking/` | the shop's three subcommands are the shopkeeper's; `resolveHouse` inherited from `BankingControllerBase` | n/a |
| `stocks` / `consigns` brains | pack `src/behavior/` | named only by rows the pack's counter serves | n/a |
| `shop` archetype + default rows | pack `content/` | a second store composes from rows | n/a |

Nothing in this build puts a field on `Thing`, `Location`, `Character`
or `Avatar`.

---

## Convention conformance

Checked against the tree at plan time:

- **`props:` / `cast:`** — the benches this build props into the
  cookhouse and the tailor's shop go on the rooms' `props:` lists
  (`saxonberg-lounge/…/location/bar.yaml:128-129` is the shape).
- **Locations, not rooms** — no new location class; `materialize()`
  builds its venue on a `FurnishableRoom` as every archetype does.
- **The five axes / `<root>/<branch>/`** — the pack is `/trade/shopkeeping`
  (a trade: practised, can be quit). Rows: `thing/counter`,
  `thing/consignment-shelf`, `idea/business/stall`,
  `idea/cmd/banking/HouseShopController`. Classes mirror:
  `src/thing/Stock.ts` ↔ `/trade/shopkeeping/thing/Stock`.
- **Module scope declares** — brains are `export const brain = class {…}`;
  controllers are classes; the lint scripts are scripts.
- **Import boundary** — kernel never imports the pack (D1/D2 exist for
  this); the pack imports the kernel by package specifier only;
  terminus → shopkeeping by package specifier + dependency line.
- **Module categories** — no new category: an abstract lib base, two
  value-object files (`Opening.ts`; the requirement type lives in
  `Position.ts`), controllers, brains, views, one Api method each on
  two existing Apis, two lint scripts. **No free helper, no new Api, no
  new Mongo collection, no new mixin** (`Mixins` only LOSES `Maker`).
- **Verbs on objects** — `organization.considerApplicant`,
  `organization.openings`, `actor.clockOn/clockOff`,
  `applicant.competenceBandFor`; the Api statics added are string-keyed
  (`noticesAt(path)`, `settledGigsBy(key)`).
- **Bound args** — `apply`/`clock` args are strings; no `MqlOneResult`
  is read as a `Stuff`.
- **Gates this build must pass** (all of `lint:family`, and these are
  the ones it touches): `lint:imports` (kernel/pack tiers),
  `lint:instanceable` (invariants 3 and 8 — the lib base, the pack
  `src/` layout, the brain shape), `lint:field-meta` (golden regenerated
  after the path moves), `lint:lib-statics` (the base carries only a
  private static), `lint:object-verbs` (string-first statics),
  `lint:verb-collisions` (`apply`, `clock` are free), `lint:arg-kinds`
  + `lint:binder-models` (the two new views), `lint:untitled` (the new
  root is claimed), `lint:census`, `lint:test-bootstrap` +
  `lint:test-content` (moved tests), `lint:gates` (no relative gate
  strings in pack code), `lint:module-scope`, `lint:mixin-names` (`Maker` leaves the registry; nothing joins it)
  (nothing new), and the two this build adds: `lint:counters` (D9),
  `lint:openings` (D18).

---

## Waves

Every wave lands green on `pnpm test:near` + every touched pack's
vitest + `pnpm -C packages/server lint:family`, and ends at one commit.
The full `pnpm test` runs once, before the MR.

### Stage A — the sweep

**A1 — the kernel keeps the mechanism** ✅ **DONE** (`be4eaddba`)

> **Build note.** Landed as planned. Three importers (`CheckController`,
> `ReclaimController`, `BuyController`) turned out to import the classes
> as VALUES and never use them — dead imports, deleted. ⚠ **The plan's
> `lint:field-meta --snapshot` step is a no-op and was not run**: that
> golden is a deliberately frozen pre-codemod capture and the gate in
> `lint:family` is `--lint`, which is path-agnostic and stays clean. Do
> not regenerate it. 60 files / 373 tests green, 48 gates pass.

- Create `packages/server/src/mud/lib/retail/Stock.ts`: today's
  `platform/thing/Stock.ts` in full (doc comment, imports re-pathed,
  `STOCK_PRICINGS`/`STOCK_PURCHASINGS`/`StockLine`, the composition, the
  constructor's `fixedInPlace`, `fieldMeta`, every method) **minus**
  `commandContributions`. Export `default class Stock`. Header comment:
  substrate, never instanced; the twin is `/trade/shopkeeping/thing/Stock`.
- `platform/thing/Stock.ts` becomes the thin twin for one wave:
  `import StockBase from '../../lib/retail/Stock'; export default class Stock extends StockBase { static commandContributions = {…unchanged…} }`.
- Move `ShelfStuff` to `lib/retail/Consignment.ts` (beside
  `ConsignmentShelfSurface`) and `RackStuff` beside `HeldGoodsShelf`;
  `platform/thing/ConsignmentShelf.ts` / `CheckRack.ts` re-export
  nothing — every importer re-points: `BuyController` (`Stock` from
  `lib/retail/Stock`; `ShelfStuff` from `lib/retail/Consignment`),
  `ConsignController`, `ReclaimController` (drop the two class imports),
  `CheckController`, `HouseController` (`Stock` from lib),
  `EmploymentLogic:38` (`import type Stock from '../../../lib/retail/Stock'`),
  `lib/behavior/stocks.ts`, `consigns.ts`.
- Kernel tests: every `new Stock()` now constructs a local fixture —
  `class TestStock extends Stock {}` over the lib base (one line per
  file; `credit`, `credit.note`, `stocks`, `eats`, `cellars`,
  `restocks`, `Stock.terms`, `BuyController`, `HouseAccount`,
  `HouseStockCard`); `ConsignmentShelf`/`CheckRack` fixtures are the
  composition line from the class (`Consignment.test`, `HouseAccount`,
  `CheckRack.test`). Move `platform/thing/__tests__/Stock.terms.test.ts`
  to `lib/retail/__tests__/`.
- `pnpm lint:field-meta --snapshot` (the class path of the fields moved).
- Acceptance: `pnpm test:near` green; `lint:family` green; no kernel
  file imports `platform/thing/{Stock,ConsignmentShelf,CheckRack}`
  except the three twins themselves.

**A2 + A3 — `trade-shopkeeping`, and the cloakroom** ✅ **DONE** (one commit)

> **Build note.** A2 and A3 landed together: the lounge's rack row is
> re-classed in the same sweep as the 21 counter rows, so splitting them
> would have left one commit with a row pointing at a class that had not
> moved yet. Everything else is as planned.
>
> Decisions this wave took that the plan did not:
> - **The brains narrow on the kernel BASE, not the pack twin.** The plan
>   said `Stock` from `../thing/Stock`; `instanceof` against
>   `lib/retail/Stock` matches the twin too and also matches any future
>   trade's counter, so it is strictly more general at no cost.
> - **`lint:counters` needed a wider census than D9 specified.** The four
>   markers D9 named found only 2 of the 4 kernel counters: `BankCounter`
>   composes `BankMixin` (not `AttendantMixin`) and `Menu` reaches the
>   offer surface by INHERITANCE (`extends CommerceMenu`). Both were
>   added; the gate now reads exactly 4 against a ceiling of 4. A census
>   that reads 2 where the truth is 4 is a ceiling that means nothing.
> - **The `stocks` brain test may not import `platform/idea/api/**`** —
>   the server's `exports` map blocks it (a logic singleton is not pack
>   surface). Its `EmploymentLogic.prototype` spy goes through
>   `StuffApi.loadClassByPath`, the SeznickHouse precedent.
> - **`HouseStockCard.test.ts` now drives `HouseShopController`**, and
>   `HouseAccount.test.ts`'s not-staff proof moved from `house stock` to
>   `house roster` (the claim is about the SEAT, on any subcommand).
> - **The dev DB was dropped** (D8) and `pnpm install` run after the pack
>   was added. The live boot check is folded into B5's drive, which boots
>   a fresh DB and exercises `buy` / `consign` / `stall rent` anyway.
>
> Pack suite 5 files / 22 tests green; terminus 21 files green;
> trade-textiles, trade-distilling, trade-farming, trade-hospitality green.

<details><summary>the original A2 wave text</summary>

(`build(trades-and-labor A2): trade-shopkeeping
— the counter, the shelf, the brains, the shop's house subcommands, the
stall seed, the shop archetype; 21 rows re-classed; the dev DB is
dropped`)

- Scaffold `packages/content/trade-shopkeeping/`: `pack.yaml`
  (`id: trade-shopkeeping`, `version: 0.1.0`, `root: /trade/shopkeeping`,
  description from the requirements' *Placement*, `requires.title:
  [{extent: /trade/shopkeeping, holder: {organization: /compact/trade}}]`),
  `package.json` (`@saxonberg/content-trade-shopkeeping`; deps
  `@saxonberg/server`, `@saxonberg/types`, `@saxonberg/content-platform`),
  `tsconfig.json`, `vitest.config.ts`, `README.md` — copy trade-fuel's
  and edit. Add the dependency line to the **root** `package.json`.
  `pnpm install` (memory: a pack add/rename without it fails every pack
  suite at collection).
- `src/thing/Stock.ts` = the twin from A1 (delete
  `platform/thing/Stock.ts`); `src/thing/ConsignmentShelf.ts` = today's
  class with package-specifier imports (delete the kernel file).
- `src/behavior/stocks.ts`, `src/behavior/consigns.ts` — moved, imports
  by package specifier, `Stock` from `../thing/Stock`; tests
  `lib/behavior/__tests__/stocks.test.ts` and `consigns.bounded.test.ts`
  → `src/behavior/__tests__/`. Rows: `general-store/agent/keeper.yaml:46`
  → `/trade/shopkeeping/behavior/stocks`; the seven `consigns` rows →
  `/trade/shopkeeping/behavior/consigns`.
- `src/idea/cmd/banking/HouseShopController.ts` (`extends BankingControllerBase`;
  `par`, `price`, `stock` lifted verbatim from `HouseController`, which
  loses them and its `Stock` import) + row
  `content/trade/shopkeeping/idea/cmd/banking/HouseShopController.yaml`
  (the `CharController.yaml` shape). Edit the platform's
  `cmd/banking/house.yaml`: add `controller: /trade/shopkeeping/idea/cmd/banking/HouseShopController`
  to the `par`, `price`, `stock` stanzas with a comment naming the
  freight precedent. `HouseStockCard.test.ts` → the pack's
  `src/idea/cmd/banking/__tests__/`.
- `content/trade/shopkeeping/idea/business/stall.yaml` (moved from the
  platform pack); `StallController.STALL_BUSINESS_SEED` →
  `/trade/shopkeeping/idea/business/stall`.
- `content/archetypes/shop.yaml` (D6) + `content/trade/shopkeeping/thing/counter.yaml`
  and `thing/consignment-shelf.yaml` (generic defaults).
- Re-class the **17 + 4 rows** listed in *Grounding*: `class: /trade/shopkeeping/thing/Stock`
  / `…/ConsignmentShelf`. Add `"@saxonberg/content-trade-shopkeeping": "workspace:*"`
  to terminus, rejection, trade-textiles, hearts-delight. `MarketStalls.ts`
  and `StallController.ts` import the pack's `Stock`.
- Pack tests that constructed the kernel class: terminus's four import
  the pack's class (the dep exists); trade-distilling, trade-farming,
  trade-hospitality build a one-line fixture over
  `@saxonberg/server/mud/lib/retail/Stock` (no test-only dependency
  line). Literal path asserts (`general-store-content:128`,
  `fishing-content:105`, `distilling:280`, `libations-annexes:155`) →
  the new path.
- `src/__tests__/shop-archetype.test.ts` (D19) and a content test that
  every row the pack ships parses and every class it ships is named by
  some row (the rung check's *reported* case, asserted).
- **Drop the dev DB and reboot** (D8); verify the boot line prints the
  pack as `capability`, its `classOrigins` resolve, and the general
  store's floor stands up with its counter.
- Acceptance: `pnpm -C packages/content/trade-shopkeeping test` green,
  `test:near` green, `lint:family` green (`lint:field-meta --snapshot`
  again), `buy`/`consign`/`reclaim` at the general store and `stall rent`
  on the square work against the running game.

**A3 — the cloakroom and the gate** (`build(trades-and-labor A3):
CheckRack to trade-hospitality; lint:counters holds the kernel at four`)

- `packages/content/trade-hospitality/src/thing/CheckRack.ts` (moved;
  package-specifier imports; affordances unchanged); delete the kernel
  file; `saxonberg-lounge/…/thing/check-rack.yaml` →
  `class: /trade/hospitality/thing/CheckRack` (the lounge already
  depends on hospitality). `CheckRack.test.ts` → hospitality's
  `src/__tests__/` (or a kernel fixture over `HeldGoodsMixin` for the
  `reclaim` half — keep the kernel `reclaim` proof kernel).
- `packages/server/scripts/check-counters.ts` + `"lint:counters"` in
  `package.json` (D9). Header names the four and why; the message names
  the requirement. Add the roster line to `docs/lint-family.md` at the
  sweep.
- Acceptance: `check` and `reclaim` at the lounge rack work live;
  `lint:counters` prints `4 counters in the kernel (ceiling 4) ✔`.

### Stage B — the labor market

**B0 — the maker retires** ✅ **DONE**

> ⚠⚠ **Re-planned in place: D17 was wrong about the augment fold, and the
> fold STAYS.** Grounding said `collectAugmentConferralNames`'s
> `getConferredMixinNames` soft-lookup was employment's alone. It is not:
> **`Shade` overrides it** (`platform/agent/Shade.ts`) to confer
> `AetherMixin` intrinsically — a shade is attuned with no implant and no
> slot, and species `innateMixins` is shared reference data a shade
> cannot write without corrupting the species. That is a *genuine* augment
> conferral and exactly what the seam is for.
>
> So the seam is kept and re-documented as the **per-host intrinsic
> conferral** leg, with one consumer; what was deleted is
> `EmployedMixin`'s implementation of it, i.e. the thing that put a JOB
> through the implant mechanism. `Shade` declares the method outright now
> instead of `override`-ing an inherited one. The D17 claim that survives
> intact — *augment gating is for implants and innate gifts, not a means
> test* — is the whole reason the employment leg had to go, and it did.
>
> Other build decisions:
> - **Test doubles stub `isFulfilling()` rather than standing up a
>   business.** The plan asked for a business with a `fulfills` seat per
>   file. In the eight crafting/tips/venue files the fulfiller is
>   *scenery* and the double was already stubbing the shift seam (it
>   overrode `getConferredMixinNames` to fake being on shift); the seam
>   changed name, not honesty. The doubles now compose `EmployedMixin` and
>   return `true` from `isFulfilling`, and the REAL three-condition read
>   is proved as a truth table in `lib/employment/__tests__/conferral.test.ts`
>   — including employer-bounding, the fixture-as-"here" case, and that an
>   Avatar-shaped and an NPC-shaped body answer identically.
> - **The shipped-content proofs were NOT stubbed.** `employment-seed.test.ts`
>   (Dave's Bar) now stands its staff behind the real bar and asserts the
>   seed authors `fulfills: true` **and** names `operatingLocations` — the
>   two halves the "here" leg needs, which is the regression this wave
>   could most easily have shipped silently.
> - **`beginCover` covers the first `fulfills` seat**, falling back to
>   `positions[0]` (what it meant before the flag existed).
> - Rows: 9 × `confers: [MakerMixin]` → `fulfills: true`; 40 × `confers: []`
>   deleted; 7 × `class: /platform/agent/Crafter` → `/platform/agent/Cast`;
>   `lib/craft/Maker.ts`, `platform/agent/Crafter.ts`, `Mixins.Maker` and
>   `MixinApi.isMaker` deleted.

<details><summary>the original B0 wave text</summary>

(`refactor(employment): MakerMixin retires —
who fulfils an order is the position's flag, read off the shift; the
augment walk carries augments only`)

A refactor of shipped order-routing with live content behind it (D17).
Lands first because every later wave's "grant" language rests on it.

- `Position.ts`: `fulfills?: boolean` (coerced `=== true`, serialized
  only when true — the `purchases` shape); `confers` removed from
  `PositionData`, the constructor, `of`, `fromData`, `serialize`.
- `Employed.ts`: `isFulfilling()` (D17's read, sync); delete
  `getConferredMixinNames` and its interface line + doc paragraph.
- `api/mixin.ts`: delete the employment fold in
  `collectAugmentConferralNames` (`:2229-2240`) and its comment; delete
  `isMaker` (`:1640`) and the `Maker` import; `lib/mixin.ts`: delete
  `Mixins.Maker` (+ any `MixinRefusals` line). Delete `lib/craft/Maker.ts`
  and `platform/agent/Crafter.ts`; fix the comments in
  `platform/agent/Cast.ts:12` and `lib/npc/Cast.ts`.
- The six sites: `CraftingLogic.resolveMaker:179`, `EmploymentLogic:830`,
  `covers.ts:42`, `CollectController:36`, `BankingControllerBase.presentBartender:134`
  → `MixinApi.isEmployed(c) && c.isFulfilling()`; `CraftingLogic:348,448`
  drop the clause. `Organization.beginCover:405` → the first position
  with `fulfills`. `OrderController:5,128` comments.
- Rows: 9 × `confers: [MakerMixin]` → `fulfills: true`; the other 40
  `confers:` lines deleted; 7 × `class: /platform/agent/Crafter` →
  `/platform/agent/Cast`.
- Tests (the 24 files in *Grounding*): a test double that "conferred
  MakerMixin directly to stand in for on-shift" now stands up a
  business with a `fulfills` seat operating the test room and puts the
  double on shift (one shared local helper per file, no new module);
  `conferral.test.ts` becomes the `isFulfilling` truth table (off shift
  → false; on shift, seat without the flag → false; on shift with the
  flag in a room the house does not operate → false; on shift with the
  flag in an operated room → true; an Avatar and an NPC → the same
  answers). Augmentation's own tests (`Caster.test`, the augment
  substrate) must pass **unchanged** — that is the "augments only" proof.
- A content test (kernel `world/__tests__/` or the lint) that every
  `fulfills` seat's roster room is operated by its business — the
  regression the "here" leg could introduce.
- Docs touched at the sweep, not here: augmentation.md (the fold is
  gone), employment.md (*Capability grant* section rewritten), crafting.md,
  retail.md (`presentBartender`).
- Acceptance: `test:near` green across crafting, employment, lounge,
  hearthworks, tips and wages suites; live — `order` a drink at the bar
  routes to the on-shift bartender, an off-shift one is inert, Dave
  covers when nobody is on, `collect` refuses a patron, `order stew` at
  the cookhouse routes to the cook, a goods-yard hand's production
  `order` still fulfils, the teller lookup at the counting-house still
  finds the teller.

</details>

**B1 — the opening and the criterion** ✅ **DONE** (`c86263eb6`)

> **Build note.** As planned. Two decisions the plan did not make:
> - **`Opening` has a public constructor and NO `of` static.**
>   `lint:lib-statics` is a ratchet whose population may not grow, and
>   it fired on `Opening.of` (338 against a ceiling of 337). An Opening
>   has no coercion to do, so `new` says everything `of` would. ⭐ The
>   gate was right and the ceiling was not raised.
> - **`lint:openings` grew a FIFTH arm during B3** (below): a house that
>   advertises a waged seat must author `banksAt`.
>
> All four planned arms were verified to FIRE by probing shipped rows —
> `renown` as a criterion, `skilled` as a band, `nosuchthing` as a
> discipline, and a `headcount` on the un-pinned campus farm-unit. A
> gate nobody has seen fail is a gate nobody knows works.

<details><summary>the original B1 wave text</summary>

(`build(trades-and-labor B1):
headcount + requires on Position; openings derived; considerApplicant;
settledGigsBy; lint:openings`)

- `Position.ts`: `headcount?`, `requires?` (`PositionRequirementData`,
  `POSITION_REQUIREMENT_KEYS = ['gigs','discipline','band']`), coercion
  (throw on an unknown `requires` key or a bad band), `serialize`
  round-trip, doc comments carrying the ⛔.
- `lib/employment/Opening.ts`: `Opening { organizationPath, at: string|null, position: Position, open: number }`
  with `wants(): string` (*two completed gigs* / *a competent hand at
  tailoring* / *no prerequisite*) and `describe(): string` (*HELP WANTED
  — a hand, four zorkmids a game-hour; two completed gigs asked*), money
  words via `Money.of(...).render()`.
- `Organization.ts`: `openingsFor(key)`, `openings()`, `considerApplicant(applicant, key): Promise<ApplicationVerdict>`
  (`already-held` → `no-opening` → `gigs` (D13) → `band` (D14) → ok).
- `ContractRecord.findSettledBy(key)`; `ContractApi.settledGigsBy(key)`
  → `ContractLogic`.
- `scripts/check-openings.ts` + `"lint:openings"` (D18).
- Tests: `Position.test` (round-trip, the throw), `Organization.openings.test`
  (headcount − holders; a quit reopens; a rostered NPC counts),
  `considerApplicant.test` (each refusal names both numbers; a settled
  gig by another key does not count; a breached gig does not count),
  `contract` finder test.
- Acceptance: `test:near` green; `lint:openings` green on today's rows
  (none author `headcount` yet).

</details>

**B2 — the sign** ✅ **DONE**

> **Build note.** As planned: `operatorsAt` lifted out of
> `BankingControllerBase.resolveHouse` into `EmploymentLogic` so one
> candidate walk has two consumers, and `noticesAt` over it. The
> `look` line reads *A notice here: HELP WANTED — hand, four zorkmids a
> game-hour; two completed gigs asked.*
>
> ⭐ The test captures the real `MessageApi.scene` body rather than
> asserting the read — it proves the SIGN reaches the player, and that
> it stops the moment the seat is filled. (First draft asserted only
> `noticesAt`, which would have passed with the `look` line deleted.)

<details><summary>the original B2 wave text</summary>

(`build(trades-and-labor B2): the help-wanted line —
noticesAt on the employment engine, printed by look`)

- `EmploymentLogic.noticesAtImpl(locationPath)` + `EmploymentApi.noticesAt`
  (sync; D11) — reuse the `resolveHouse` candidate walk by lifting it into
  the logic as `operatorsAt(locationPath): BusinessStuff[]` and having
  `BankingControllerBase.resolveHouse` call `EmploymentApi.operatorsAt`
  (one walk, two consumers).
- `LookController` room branch: after the puddle line, one line per
  opening: *A card on the general-store counter: HELP WANTED — a hand,
  four zorkmids a game-hour; two completed gigs asked.* (at a room the
  business operates directly: *A notice here: …*). `Mml.compose`, topic
  unchanged.
- Tests: a business with one open `hand` at a fixture in the room → the
  line; filled → no line; `setClosed(true)` → no line; a business not
  live → no line (and the lint rule that makes that honest is B1's).
- Acceptance: `look` in a test room prints the line; `test:near` green.

</details>

**B3 — `apply` and `clock`** ✅ **DONE**

> **Build note.** As planned (D12/D15). `clock` is a subcommand view
> (`on`/`off`), not a two-word verb. ⭐ `clock on` names what the shift
> GRANTS when the seat is `fulfills` — *"You're the one an order here is
> served by now"* — because otherwise a player has no way to learn it.
>
> ⭐⭐ **The drive found a gap before the drive ran.** Driving `clock off`
> against a test house that authored no `banksAt` threw out of the pay
> path: the shift stands, the worker is never paid, and nothing anywhere
> said the job was unpayable. That is `lint:openings`'s fifth arm now —
> a house advertising a WAGE must author the bank the wage comes from.
> Probed against the general store with its `banksAt` removed.

<details><summary>the original B3 wave text</summary>

(`build(trades-and-labor B3): apply — the
player moves first, refused with a number; clock on/off — the applied-for
seat pays`)

- `platform/cmd/employment/apply.yaml` (verbs `[apply]`; args
  `position` string optional with `prepositions: [for]`, `organization`
  string optional with `prepositions: [at]`; validators
  `requiresAnimate`, `requiresConscious`; help text stating the
  criterion and the appeal in words — the governance limb, tier B).
- `platform/idea/cmd/employment/ApplyController.ts` (D12). Reasons and
  prose as decided; success runs `organization.appoint`.
- `platform/cmd/employment/clock.yaml` (`clock on|off`, subcommands;
  `in`/`out` as subcommand aliases if the spec grammar allows, else help
  text) + `ClockController.ts`; `Employed.clockOn/clockOff` +
  `EmploymentLogic.clockOn/clockOff` (D15); `Persona.ts` gains both
  views in `self`.
- Tests: controller tests for each refusal reason and the success path;
  `EmploymentLogic.clock.test` (on → off settles `round(rate × hours)`
  through `payHouseWage`; off with no shift refuses; the roster tick
  leaves a clocked-on player alone).
- Acceptance: `test:near` + `lint:binder-models` + `lint:arg-kinds`
  green; `apply` and `clock` appear in `help`.

</details>

**B4 — the houses** (`build(trades-and-labor B4): openings on three houses;
par lines on two; the hall board carries work`)

- terminus `general-store/business.yaml`: the `hand` seat (D16).
  hearthworks `idea/business.yaml`: the `kitchen-hand` seat
  (`fulfills: true`, D16). `mayfield-row/tailor/idea/outfit.yaml`: `headcount: 2` + `requires`
  on `tailor`; `parLines:` (linen bolt, supplier the general store,
  exemplar the mill's bolt row); the tailor agent gains a `restocks`
  brain (`cadence:90s`, board the hall noticeboard, bench + shelf named);
  `tailor/location/shop.yaml` props a `receiving-bench` and, if the shop
  has no `Surfaced` fixture to shelve onto, a generic surface row.
- hearthworks `idea/business.yaml`: `cook` gains `purchases: true`;
  `parLines:` (two cheap distributor lines); the cook agent gains
  `restocks`; `location/cookhouse.yaml` props a bench (+ a surface);
  `hearthworks/pack.yaml` gains `boot:` for the business and the
  cookhouse.
- eternal-university `campus-farm/idea/farm-unit.yaml`: `headcount: 2`
  on `labourer`; `pack.yaml` `boot:` for the farm-unit.
- trade-haulage `agent/carter.yaml`: `boards:` gains
  `/world/terminus/terminal/thing/job-board`.
- Rewards: each ≥ the supplier's ask + carriage and, for the cook's two
  lines, fundable from twenty coin; the build records the numbers in
  the rows' comments against the shipped anchors.
- Acceptance: `lint:openings` green (every advertising house is
  boot-pinned); boot a fresh DB, wait one cadence, `job` at the hall
  lists ≥2 gigs from two issuers; `look` at the store, the tailor's and
  the farm yard prints a notice; `house roster` at the store shows the
  `hand` seat `vacant`.

**B5 — the drive** (`drive(trades-and-labor): <what driving found>`)

- `packages/wire/tests/trades-and-labor.dirty.wire.test.ts`
  (`declareFile({packs: ['terminus','trade-shopkeeping','trade-hospitality','hearthworks','eternal-university','trade-haulage','saxonberg-lounge']})`;
  dirty reason: appoints a character, settles gigs, leaves a hired hand
  on the roster). Steps 1–10 of the requirements' drive, in order; step
  1 polls `job` at the hall for up to four minutes (the posters' first
  cadence); step 2 follows `work.dirty`'s account-opening beat; steps
  3–5 at the general store's `hand` seat; **step 6 at the hearthworks
  cookhouse**: `apply` as `kitchen-hand` (the two gigs qualify), `clock on`,
  a second session `order`s from the kitchen menu and the scene names
  the player as the fulfiller, a minute's work, `clock off` → `bank`
  shows the wage, the second session orders again and the NPC cook
  fulfils; step 7 at the tailor's; step 11 cites `shop-archetype.test.ts`.
  Every checkpoint must be able to fail (assert the number in the
  refusal and the fulfiller's name, not that a string exists).
- Append the **Drive record** below with the run's output and count.
- `pnpm test` once; open the MR.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the counter from the pack | `buy`/`consign`/`reclaim` (unchanged, platform) | `static commandContributions` on the pack's `Stock`/`ConsignmentShelf` — strings unchanged | 21 rows re-classed | the general store's floor + business already `boot:` | `buy.yaml`'s args unchanged |
| the cloakroom from hospitality | `check`/`reclaim` (unchanged) | on `trade/hospitality/thing/CheckRack` | 1 row | lounge `seatIn` self-seats | unchanged |
| `stocks`/`consigns` brains | none | rows' `behaviors[].brain` renamed | 8 rows | the keeper's floor is boot-pinned | n/a |
| `house price/par/stock` | `house` (unchanged view) | stanza `controller:` → the pack's controller row | `content/trade/shopkeeping/idea/cmd/banking/HouseShopController.yaml` | n/a | unchanged |
| the stall seed | `stall` (terminus) | `StallController` constant | `idea/business/stall.yaml` in the pack | n/a | unchanged |
| the `shop` archetype | none (`survey` reads it) | `ArchetypeCatalogue` warms `documents {kind: archetype}` | `content/archetypes/shop.yaml` + two default rows | catalogue warms at postRegister | n/a |
| the opening | none | derived (`openingsFor`) | `headcount` + `requires` on three rows | the three houses are `boot:` producers (`lint:openings`) | n/a |
| the sign | rides `look` | `LookController` room branch | same rows | same | n/a |
| `apply` | `platform/cmd/employment/apply.yaml` | `Persona.commandContributions.self` | the openings | same | args are strings; no `requires:` |
| `clock` | `platform/cmd/employment/clock.yaml` | `Persona.self` | an employment record at a house operating here | the house live | strings |
| the order grant (`fulfills`) | `order` (unchanged) — `resolveMaker` reads `isFulfilling()` | none: a read on the actor, per request | `fulfills: true` on 9 seats + the `kitchen-hand` | the venue's business live (lazy standup on the first `order` already) | n/a; the seat's business must operate the room (`lint:openings`) |
| par lines → the hall board | none (the brain runs `job post`) | rows' `restocks` brains | `parLines:` on two houses; benches propped; carter `boards:` | both houses + rooms `boot:` | n/a |
| `lint:counters`, `lint:openings` | `pnpm lint:family` (derived roster) | `package.json` `lint:*` | — | — | — |

---

## Acceptance-criteria coverage

| criterion (requirements) | wave |
|---|---|
| arrival → paid wage with no wizard, founder or authored dialogue | B3 (`apply`, `clock`), B4 (an open waged seat with a reachable criterion), B5 proves it |
| every refusal names a number and says what lifts it | B1 (verdict), B3 (prose), B5 asserts the numbers |
| open waged seats > 1, each advertised where a player walks past | B4 (store `hand`, tailor, farm), B2 (the line on `look`) |
| the hall's board has work at world start from > 1 supplier | B4 (cook + tailor post to the hall; cadence 90s), B5 step 1 |
| a venue with an open seat cannot fail to advertise | B2 (derived) + B1's `lint:openings` boot rule |
| buy, consign, reclaim, bank, menu/order, check behave exactly as before | A1–A3 (kernel tests kept; live checks at each wave), B5 steps 8–10 |
| a store in a new locality authored with rows only | A2 (`shop` archetype + default rows), D19 test cited by B5 step 11 |
| no seat selects on species, lineage, trait or renown | B1 (`fromData` throws), `lint:openings` (D18) |
| drive step 6 — clock on, the grant lands, the wage settles | B0 (`fulfills` is the grant), B3 (`clock`), B4 (`kitchen-hand`), B5 |

Unmapped: none. Drive step 6's "clock on" is D15 (a recorded lean, now
a verb) and its "capability grant" is the `fulfills` seat's order
routing (D17) — both now literal, demonstrated at the cookhouse.

---

## Test & gate strategy

- **Unit**: every new method above; the lib base's tests are the moved
  `Stock.terms` + `credit` suites over a fixture; the pack's suite covers
  the archetype (D19), the moved brains, `HouseShopController`, and a
  rows-parse test.
- **Only the drive proves**: the board's timing at world start, the sign
  on a real `look`, the wage landing after `clock off`, an `order`
  routing to a clocked-on player and back to the NPC when off, that the
  moved classes hydrate from real rows after a DB drop, and that
  `stall rent` still mints from the new seed.
- **B0's regression net**: the crafting, employment, lounge, hearthworks,
  tips and wages suites already assert every live behaviour D17 touches
  (order routing, cover, collect, teller); they pass on the new read or
  the wave has not landed. The `isFulfilling` truth table is the new
  unit; the operates-the-room content check is the new lint arm.
- **Gates**: `pnpm -C packages/server lint:family` at every wave; the
  two new gates enrol themselves. `pnpm test` exactly once before the
  MR (and again at `/finalize`); everything between is `test:near` +
  the touched packs' vitest.
- **Golden**: `lint:field-meta --snapshot` after A1 and A2 (paths
  moved), committed with the wave.

---

## Risks & opens

1. **B0 refactors shipped order-routing with live content behind it.**
   What could regress, named: (a) **`order` at the bar** — the routing
   used to be *composition + on-shift*; it is now *on-shift + flag +
   the house operates this room*. A maker whose room the house does not
   list stops fulfilling **silently** — the lint arm and the content
   test exist for this, and every shipped venue was checked in
   *Grounding*; (b) **goods-yard production `order`s** — the brewing,
   crowsfoot and vintner hands keep the flag; the five hands that never
   conferred keep not fulfilling (the requirements' own seat/staff line:
   the row says who does the work); (c) **`covers`** — Dave's transient
   cover must land on a `fulfills` seat, hence the `beginCover` change;
   (d) **tip collection** and (e) **the teller lookup** read the same
   predicate and are covered by `tips.test` and the counting-houses
   suite; (f) **any test double that composed `MakerMixin` to fake a
   staff member** now needs a business — 24 files, mechanical but
   wide; (g) **`lint:mixin-names` / the field-meta golden** move when
   `Mixins.Maker` and `PositionData.confers` go. Mitigation: B0 lands
   alone, first, with the live checks in its acceptance run before B1
   starts.
2. **The "here" leg is a tightening.** Today an on-shift bartender who
   walked into the smithy would fulfil smithy orders; after B0 they do
   not. That is the correct reading of *employer-bounded*, and it is a
   behaviour change to say out loud in the MR.
3. **`house par` / `house stock` for the bar** now dispatch into
   trade-shopkeeping's controller (D4). Every deployment ships every
   pack, so nothing breaks; but if the user would rather only `price`
   move, B/A2 changes one stanza instead of three.
4. **"The trade's own dials" is empty** after D1: the stocking
   elasticity and the terms margin are the mechanism's and stay in the
   platform's settings. Say so at the sweep rather than move dials whose
   readers are kernel.
5. **The board at world start is a cadence away** (≈90 s + jitter, then
   the escrow post). The drive polls; a CI box that boots slowly may
   need the poll ceiling raised, never the cadence dropped below the
   restocks doctrine (*ordering faster than the road can answer*).
6. **Bounty gigs a newcomer cannot front** (the bolt at 40) sit for the
   carter; that is the second rung, by design. The cook's two lines are
   the rung-zero ones — the build must verify the distributor's asks
   before choosing `reward`.
7. **`Position.fromData` throwing** on a bad `requires` key turns a
   content typo into a boot-time row failure for that business. That is
   the intended tripwire; `lint:openings` catches it first.
8. **`fixedInPlace` on the lib base** — hospitality's
   `bar-fixtures-are-fixed.test` asserted it on the kernel class; it
   asserts it on a fixture over the base now, which is the same claim.
9. **The dev DB drop (D8)** must happen before A2's acceptance is
   checked — a stale `content` row with the old `class:` or a stale
   stall identity reads like a repo defect.

---

## Deferred seams

- **Player tending** — employment.md's named seam **closes** with B0
  (a player on shift in a `fulfills` seat is the resolved maker; what
  `order` then asks of a *player* maker — craft it yourself, or the
  engine crafts as you — is crafting.md's question, recorded there at
  the sweep, not built here).
- **The AFK wage gate / firing / the trust ramp** — `livelihood-slate` §5.4
  (recorded there already). `clock` is the honest floor under all three.
- **The pithead board's supply** (timber, charcoal — player-made) and
  the works-board pool's producers' backhaul — a note in
  `logistics-slate`.
- **`trade-banking`** (`BankCounter` is `lint:counters`'s one to-do) —
  `credit-slate` Parts 6/7.
- **An offer on top of the application** (the NPC who notices you) —
  `livelihood-slate` §5.4 `[LEAN]`, now buildable because the criterion
  is written down.
- **A tier-C question** — whether a polity may permit a venue to select
  on other grounds — `legal-code-slate`, not opened here.

---

## Critical files

Read first, in this order:

1. `docs/requirements/trades-and-labor-requirements.md`
2. `packages/server/src/mud/platform/thing/Stock.ts`,
   `ConsignmentShelf.ts`, `CheckRack.ts`; `lib/retail/Consignment.ts`
3. `packages/server/src/mud/platform/idea/cmd/retail/{Buy,Consign,Reclaim,Check}Controller.ts`
4. `packages/server/src/mud/platform/idea/cmd/banking/HouseController.ts`,
   `BankingControllerBase.ts`; `packages/content/platform/content/platform/cmd/banking/house.yaml`;
   `packages/content/trade-haulage/src/idea/cmd/banking/HouseFreightController.ts`
5. `packages/content/trade-fuel/` (pack shape); `packages/content/terminus/src/market/{thing/MarketStalls.ts,idea/cmd/StallController.ts}`;
   `packages/content/tpa/src/thing/TpaTerminal.ts` (cross-pack import)
6. `packages/server/src/mud/lib/craft/Maker.ts`; `api/mixin.ts:570-630`
   (`getActiveMixins`/`isActive`) and `:2160-2245`
   (`collectAugmentConferralNames`); `platform/idea/api/CraftingLogic.ts:170-185`
   (`resolveMaker`); `platform/agent/Crafter.ts`; `lib/behavior/covers.ts`;
   `platform/idea/cmd/employment/CollectController.ts`;
   `docs/subsystems/augmentation.md`
7. `packages/server/src/mud/lib/employment/{Position,Organization,Employed,ContractRecord}.ts`;
   `packages/server/src/mud/platform/idea/api/EmploymentLogic.ts`
   (`hireImpl` :437, `runTick` :1380, `settleShiftWageImpl` :1021,
   `businessAt` :1557); `api/employment.ts`, `api/contract.ts`
8. `packages/server/src/mud/platform/idea/cmd/employment/{Appoint,Quit}Controller.ts`
   + their views; `lib/character/Persona.ts:135-180`
9. `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts:150-300`
10. `packages/server/src/mud/lib/behavior/{restocks,stocks,consigns}.ts`;
   `packages/content/saxonberg-lounge/content/world/lounge/{agent/mara.yaml,idea/business.yaml}`
11. `packages/server/src/mud/lib/archetype/Archetype.ts`;
    `packages/content/trade-hospitality/content/archetypes/hospitality.yaml`;
    `packages/content/trade-hospitality/src/__tests__/menu.test.ts`
12. `packages/server/scripts/{check-drive-scripts,check-verb-collisions,pack-roots}.ts`
13. `packages/wire/tests/work.dirty.wire.test.ts`; `packages/wire/src/harness/index.ts`
14. `docs/subsystems/{employment,contract,retail,content-packs,behavior}.md`,
    `docs/design-lenses.md` § 6

---

## Drive record

Run against a world booted on a **freshly dropped** database — the only
honest way to answer *"does the board carry work at world start?"*, which
is the question the whole labor market rests on.

### ⭐⭐ What driving found that ~6,600 tests could not

**1. The cook's beat posted into the void, silently, forever.**

```
[dispatch] Odo "job post supply 6 /stuff/thing/items/root-vegetables to
  /trade/haulage/thing/receiving-bench for 30 --bounty --business --from
  /world/terminus/counting-houses/cash-and-carry"
  → declined: command-rejected:unknown-verb(job)
```

`job` is afforded by a **`JobBoard` in the room** —
`JobBoard.commandContributions.peers`, and `peers` only. The cookhouse
propped a receiving bench and a table but no board, so the beat fired
every 90 seconds and every posting was refused as an unknown verb. The
hall's board stayed empty; a new arrival would have found no work at
all, which is the one thing this build exists to prevent.

⭐ Nothing could have caught this but a drive. Every unit test in B4
asserts the par sheet, the seat and the sign; none of them types `job
post` as an NPC standing in a kitchen. It is the **affordance** link of
the reachability chain — *a verb nothing confers* — failing exactly the
way that link always fails: closed and silent.

**The fix**: the cookhouse props `/world/terminus/terminal/thing/job-board`.
⭐ It is the SAME board, not a second one — a gig is posted to a board's
**template path**, so every room propping that row shares one pool. That
is precisely the mechanism the nine works boards already run on (nine
floors, one pool), applied to the hall's public board: the cook writes
his docket at the rail, and a newcomer reads it where they actually
stand. A brain must not walk to a board; the board comes to the floor
(logistics D11).

**2. ⭐⭐ `apply` and `clock` had no CONTROLLER ROWS — the verbs died on
dispatch.** A `controller:` value is a **template path**, resolved
through a row like any other Idea. Both controllers shipped with their
views, their affordances on `Persona.self`, and **fifteen green
controller tests** — and answered `controller-error` to every player.

⚠ Invisible to the entire suite by construction: a controller test
instantiates the class directly, and a view test parses YAML. Nothing
between the two asks *does this path resolve*.

**The fix**: the two rows, plus ⭐ **`lint:controller-rows`, ceiling 0** —
309 `controller:` refs across every pack's command views, every one
checked against the set of shipped rows, verified to FIRE by removing
one. This is the reachability chain's **data** link in its purest form,
and it had no gate until now.

**3. A business can be boot-pinned and its ROOM not be.** `goto` at the
campus farm yard answered `unknown-target`: the farm-unit was a `boot:`
producer, the yard it operates was not, so the sign existed in a room
nothing had reached. Pinned.

**4. Harness findings (mine, not the product's).** The first draft moved
one newcomer around with a wizard `goto` plus `summon`. **`summon` is
not a verb in this game** — it answered `unknown-verb` and took eight
checkpoints down with it, which is how a drive punishes a harness that
assumes. Rewritten so every venue gets its **own** newcomer, born there
by `startLocation`: no wizard appears in the file at all, which is what
the claim actually needs — *a person with nothing* — rather than a
wizard escorting somebody with nothing.

*(the run's own output follows)*
