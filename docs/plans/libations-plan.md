# Libations — implementation plan

Plan for the libations build (D1–D14 of
[libations-requirements.md](../requirements/libations-requirements.md)).
Phase 2 of the workflow: *how*, given the requirements' *what* and *why*.
Self-contained for a fresh build agent; read the requirements, the slate
(Parts 1–13) and the subsystem docs named there first. Fresh DB
throughout: no migration, no compat, no guard.

Six phases, each green on its own (`pnpm build` typecheck, `pnpm
test:near`, the lints the phase touches). The full suite runs **once**,
in phase 6. Push every turn; one MR.

## What the code survey changed

Twenty findings from reading the shipped seams. Each moves or shrinks
work; several are load-bearing enough that the requirements' wording
is realised differently than a first reading suggests (all recorded
under *Blockers / deviations*).

1. **`ChattelOwner` already has the `organization` arm**
   (`lib/chattel/ChattelRecord.ts`). Nothing stamps it yet.
   `ChattelApi.stamp(item, owner: Stuff)` builds the owner via
   `ownerKeyOf(owner)` (`api/chattel.ts:48`), which today returns
   `player` for any Stuff — widen it: an `OrganizationMixin` Stuff →
   `{ kind: 'organization', templatePath }`. D6's stamping is then one
   call, `ChattelApi.stamp(item, business)`.
2. **`BankingLogic.settleImpl` (credential path) routes from
   `cred.getActiveAccount()` and checks only `authorize` (frozen/cap)
   and balance** — it never checks that the payer *owns* the routing
   account. So a business account **linked into the holder's payment
   credential is already spendable** through the ordinary `buy`. D6 is
   a link + an active-account switch, nothing in the payer path
   changes (the "wallet fact, not a new payer path" constraint holds
   literally). `PaymentCredential` has `linkAccount` but no
   `unlinkAccount`; add it.
3. **`SettlementReceipt.accountId` is the routing account** on the
   credential method (`lib/banking/Charge.ts:61`). `BuyController` can
   read it after `settleSale` and resolve the owner key of that account
   to decide who the chattel is stamped to. Needs one small read,
   `BankingApi.ownerKeyOf(accountId)` (`AccountBalance.owner`).
4. **`wallet` is afforded only by a `CredentialWallet` holder**
   (`CredentialWalletUpdate.commandContributions.self`,
   `PaymentCard.commandContributions.environment`). NPCs run **no
   `installDefaultLoadout`** (`lib/npc/NPC.ts`; only `Avatar`, `Gus`
   and `WireBody` call it) — Mara has no implant, no wallet app, no
   `wallet`/`pay` verbs. `BankingApi.issueCard` clones a `PaymentCard`
   into the acting principal's inventory. So the NPC shape of the
   conferral is **the house card**: a `PaymentCard` linked to the
   operating account, carried by the keeper. Same credential kind,
   same `wallet use house`, same `buy`.
5. **`house` is `requiresWizard`-gated** (`platform/cmd/banking/house.yaml`).
   D6/D7 make authority the position's; the validator goes and the
   controller resolves the business + checks `holdsPosition` /
   `isProprietorOf`.
6. **`buyListing` pays `owner.kind === 'player' ? owner.templatePath :
   listing.consignorKey`**, then `BankingApi.primaryAccountIdOf(key)`.
   A business's operating account is opened by
   `ensureVenueAccount(business.getAccountPath(), banksAt, …)` with
   `owner = the business path`, so `primaryAccountIdOf(businessPath)`
   already resolves it. Consignment **by** a business needs only (a)
   `ConsignController` accepting an organization owner the giver acts
   for and (b) the listing's `consignorKey` being the business path.
   "Each consignor's account rises on resale" is then the shipped
   split leg.
7. **`Stock.reset()` re-clones `stockLines` to par — that IS a
   `populates:`-shaped faucet.** The cash-and-carry's counter ships
   **no `stockLines`** (an empty list makes `reset()` a no-op) and
   composes `ConsignmentShelfMixin`; everything on it is consigned.
   `BuyController` already resolves both a `Stock` and a
   `ConsignmentShelf` in one venue.
8. **Brains do not dispatch commands today** (no `CommandApi` call in
   `lib/behavior/`), and `ScheduleApi`/`Behaved` give a brain no acting
   principal, so `BankingApi.settle` inside a bare brain act throws
   `no acting payer`. `CommandApi.forceCommand(giver, text)` exists
   (used by `Avatar` auto-look, `MagicLogic`, `SocialLogic`) and runs a
   real command frame as the giver. The restock brain drives **the
   literal verbs** through it — which is also how D7's "no verb only an
   NPC can use" becomes checkable rather than aspirational.
9. **`shake` already exists**: `stir.yaml` is `verbs: [stir, shake]`
   and `StirController` picks the `BuildMethod` (`shaken`/`stirred`)
   from `context.verb`. `mix` is the craft-resolve verb and dispatches
   on the tool present. D8's answer: **nothing** — no rename, no new
   verb.
10. **`CraftingLogic.craftImpl` clones the output at line 1021**
    (`StuffApi.clone(recipe.getOutputTemplate())`) for every
    application kind; `mintVessel` (the hand-build `strain` path)
    already fills a real present glass. The gather walk
    (`gatherMatter`) already descends one level into **open room
    containers** — so a glass rack that is an open `Container` is
    already in the pool scan. D10 is a replace-one-line + a claim
    helper.
11. **`Recipe.inputSlots` already carries `kind: 'item'` + `count`**
    — that IS the count measure; a dash is `measureL: 0.001`. D9's
    `measureCount` needs no new field (deviation noted).
12. **`GarnishController` is a pure flourish** (narration only) and
    `Receptacle`/`CraftedDrink` are deliberately **not** `Container`s
    ("an ice cube floating in water is a documented future content
    choice"). This build IS that choice: `CraftedDrink` gains
    `ContainerMixin` so a garnish is a thing *in* the glass.
    `Surfaced` was considered and rejected — resting items keep
    `container = the room`, so a handed-over glass would leave its
    olive behind.
13. **`Receptacle` composes `ThermalMixin` (reconcile-on-read, Newton
    cooling) but `CraftedDrink` does not** — it is
    `Crafted(Bulkable(Detailed(Thing)))`. D9's "the drink's temperature
    is real" needs `ThermalMixin` on `CraftedDrink`. Water's
    `latentHeatOfFusion: 334000` and `meltingPoint: 273` are authored
    (`base-library/…/bulk/water.yaml`), so ice melt = the Meltable
    plateau's arithmetic run inside the drink's own reconcile.
14. **The kernel names content rows**: `CraftingLogic` hard-codes
    `GENERIC_MIXED_MATERIAL = '/stuff/idea/material/cocktail/mixed'`.
    D14 empties `base-library/material/cocktail`, and a kernel module
    may not name a pack's row — the blend base moves to **the platform
    pack** (`/platform/idea/material/blend`), not to hospitality.
15. **The spawn sweep draws ONE item per region per sweep**
    (`ResidencyLogic.runSpawnSweep`, cadence a game-day, mode default
    `observe`). As shipped it is a trickle that could never stand a
    distillery at target on a fresh boot. D4 needs (a) a per-region
    draw-until-decline loop with a cap dial and (b) a boot-time sweep
    after pack install, with `residency.spawn.mode: enforce`.
    Placement of a spawned clone rides the row's own `container:` data
    (`Containable.applyContainer`, a singleton target) — so a floor
    bottle row names its producer's Stock counter and the sweep lands
    it there with no new code. `Census.regionOf` is the container
    path's zone; a zone-less producer counts in the unplaced region
    `''`, where the row's own `regionTarget` governs — a zone with
    `stocks:` is optional, not required.
16. **`AetherMixin` is base-agnostic but `_augmentGated`**: it is
    active only when a slot augment or a species confers it
    (`MixinApi.getActiveMixins` → `collectAugmentConferralNames`). A
    Thing with no slots can compose it but it will never be active, and
    nothing needs it to be — a display hosts no updates and has no ESP
    senses. D12's "modem" is realised as a **predicate on the driver**
    (`MixinApi.isActive(driver, 'AetherMixin')`), never as a mixin on
    the screen (deviation noted).
17. **The focal embed is per-viewer clientState** `cockpit.watch`
    (`WatchController` → `setClientState` + `pushClientStateUpdate`;
    client reads `s.clientState["cockpit.watch"]` in
    `LivestreamViewerLayout.tsx` / `StreamEmbed.tsx`). The
    server-authoritative "the display you can see shows X" is **the
    same key, written for every viewer who can see the display** — the
    client changes only in what it renders *around* the iframe (a
    "showing on <display>" caption and no `watch off` control for a
    shared source). No new wire message.
18. **A card is per-Interactive and has one birth path**
    (`CardApi.open` from a controller with `opens_card:`, or
    `CardApi.push(interactive, cardId, opts)` from server code). "A
    second character reads it over the holder's shoulder" is
    `CardApi.push` to every viewer who `PerceptionApi.perceives` the
    display — the onlooker's card is a fact the server pushes, not one
    the client infers. The live `stock` sheet is an `mql`-source card
    (live cards are subscription-backed; `payload` cards are static).
19. **`Position` data has `confers: string[]`** (mixin names, on-shift)
    and nothing else authority-shaped. A purchasing position is a
    **data field**, `purchases: true`, never a marker mixin.
    `holdsPosition` counts any non-exited record, so a `keeper` needs
    no roster schedule to be held.
20. **The lounge is a DATA pack**: its classes (`Bar`, `LoungeTerminal`,
    `LoungeWarren`, `LoungeMixin`, `GlassAlley`, `Lounge`) are parked
    kernel classes under `mud/world/lounge/`, which the rung check
    explicitly permits. Brains live **only** in `lib/behavior/`
    (CLAUDE.md's category table; a pack's `src/` has no `lib/`), so the
    restock brain is kernel (`lib/behavior/restocks.ts`), generic to any
    business with par lines — exactly as `shifts` and `covers` are
    kernel brains the lounge wires by data. The lounge therefore stays a
    data pack (deviation from D14's "capability" cell; see *Blockers*).

## The one rule that ties (a), (g) and (h) together

> **The wallet's active account is the principal you trade as.**

`wallet use house` links the business's operating account into the
holder's payment credential and makes it active (allowed iff the holder
holds a `purchases: true` position there or is its proprietor). While it
is active: `buy` settles from it (shipped) and **stamps the chattel to
the business** (new); `consign` consigns **as the business** — the
listing's `consignorKey` is the business path and the payout is its
operating account (new); `house stock`/`house par` act on that business.
Leaving the position unlinks it (and a relog re-clones the wallet app,
so the link never outlives the position). A thief with the house tablet
has none of this — money authority is only ever the wallet's.

The keeper NPC carries the same credential as a **house card**
(`PaymentCard`, finding 4): the shape is identical, the only difference
is which holder class carries the record.

---

## Phase 1 — platform substrate

Everything here is kernel or the platform pack. No content pack changes
except the platform's own rows. Green on: typecheck, `test:near`,
`lint:gates`, `lint:field-meta`, `lint:instanceable`.

### 1a — the business account in the wallet, and `buy` stamping to a business (D6)

- `lib/employment/Position.ts`: `PositionData.purchases?: boolean`;
  `Position.purchases` read-only; `fromData` / `toData`.
- `lib/credential/Credential.ts`: `PaymentCredential.unlinkAccount(id)`
  — removes; if it was active, active → the first remaining linked
  account or `""`.
- `api/employment.ts` + `EmploymentLogic`: `buysFor(actor):
  BusinessStuff[]` — every Business where the actor holds a non-exited
  `purchases` position, plus the one whose proprietor the actor is.
- `api/banking.ts` + `BankingLogic`: `ownerKeyOf(accountId): string |
  null` (reads `AccountBalance.owner`); `unlinkAccount(actor,
  accountId)` (the `autoLinkToWallet` inverse, best-effort over the
  reachable credential) gated to `EmploymentApi` callers.
- `WalletController.use`: the literal `house` argument → resolve via
  `buysFor(giver)`: prefer the business operating **here**
  (`businessAt(location)`), else the single one, else reject naming
  them (`ambiguous-house`). `operatingAccountOf(business)` →
  `linkAccount` + `setActiveAccount`. Bare `wallet` names a house
  account as such ("the house account of Dave's Bar" — via
  `ownerKeyOf` ≠ giver path). `wallet use <corpo>` unchanged.
  `wallet.yaml` help text updated.
- `EmploymentLogic.fire` / `quit` (`endEmployment` callers): after the
  status flip, `BankingApi.unlinkAccount(actor,
  operatingAccountOf(business))`. (`beginCover`/`endCover` untouched —
  the proprietor keeps standing authority.)
- `api/chattel.ts` `ownerKeyOf(owner)`: organization Stuff → the
  `organization` arm (finding 1).
- `BuyController`: both `buyStock` and `buyListing` read
  `receipt.accountId` (thread the receipt out of `settleSale`), resolve
  `BankingApi.ownerKeyOf`, and if that key is a live `Business`
  (`StuffApi.findByTemplatePath` + `MixinApi.isBusiness`) stamp /
  transfer to **that business**, else to the giver. Announce "for
  Dave's Bar" in the scene.
- `ConsignController`: the owner check accepts `owner.kind ===
  'organization'` when that organization is in `buysFor(giver)`; an
  unstamped good is stamped to the acting business when the wallet's
  active account is a business's (finding 6); `consignorKey` = the
  business path; the payout-account check uses that key.
- `HouseController`: drop `requiresWizard` from `house.yaml` — **it was
  wrong there**: `requiresWizard` is the TypeScript code-trust axis and
  nothing else; venue authority comes from the SEAT (a position held or
  the proprietorship), never from the wizard axis. A private
  `resolveHouse(context)` = `businessAt(here)` if the giver
  `holdsPosition` there or `isProprietorOf`, else `buysFor(giver)[0]`,
  else reject `not-staff`. ⚠ **Nothing new in this build carries
  `requiresWizard`.** Every new verb and every `house`/`wallet` page is
  gated on the seat or on reach.
- **`quit`** — `platform/idea/cmd/employment/QuitController.ts` +
  `quit.yaml` (`quit [<business>]`): the verb over the shipped
  `EmploymentApi.quit` (which had no verb). Leaving a position is a
  player act; it is what unlinks the house account.

**Tests** (kernel, synthetic fixtures — `lint:test-content`):
`buysFor` over a purchasing position and a proprietor; `wallet use
house` links + activates, refuses a non-holder; `buy` with the house
account active stamps `{organization}` and debits the business account;
`buy` with a personal account stamps the player (the named regression);
`fire`/`quit` unlinks and the next `buy` settles personally; `consign`
as the house records the business as consignor and a resale splits to
its operating account; `house` refuses a non-staff giver.

**Risk: low-medium.** Additive; the settle path is untouched.

### 1b — the par manifest, `house stock`, `house par` (D7)

- `platform/idea/Business.ts` (`BusinessMixin`): `parLines: ParLine[]`
  (`{ category, minGrade, level, unit: 'L' | 'count' | 'kg', supplier }`,
  persistent + authorable); `getParLines()`, `setParLine(line)`,
  `removeParLine(category)`. `ParLine` + `PAR_UNITS` live in
  `lib/employment/ParLine.ts` (a vocabulary value-object).
- `EmploymentLogic.stockSheetFor(viewer, business): StockSheetLine[]`
  — for each par line, the on-hand total over the goods the **viewer
  perceives** (`MqlApi.resolveMany('reachable', …)` as the viewer,
  filtered `PerceptionApi.perceives`): litres over Bulkable holders
  whose slot material carries the category tag; count over Tangibles
  whose material carries it (glassware: the glass template's own
  `category` keyword — see 1c); kg over `ice` bulk mass. Returns
  `{ line, onHand, shortfall }`. One function, two consumers: the
  controller and the restock brain.
- `HouseController`: `house par <category> <level> [--grade <band>]
  [--from <business>]` (unit inferred from the level suffix `L`/`kg`,
  bare number = count); `house stock` emits the sheet as prose **and**
  opens the `stock` card.
- **The `stock` card**: new `CardId` `'stock'` (`@saxonberg/types`
  `CardId`/`CARD_IDS`) in `lib/connection/Cards.ts`: `source: { kind:
  'mql', query: 'reachable:[mixin.BulkableMixin]', cardinality: 'many',
  fields: ['displayName','bulkMaterial','bulkAmount'] }`, `live: true`,
  `pinnedByDefault: false`, `command: 'house stock'`. `BulkableMixin`
  gains a `bulkAmount` subscribable field (fires on debit/credit via
  `MqlSubscriptionApi.fireFieldChange`) if it lacks one. The par lines
  ride the card's `prose` (the sheet the controller just emitted); the
  rows are live and perception-scoped by MQL by construction. `house.yaml`
  declares `opens_card: stock`.

**Tests:** par lines round-trip and `house par` edits them; the sheet
counts only perceived holders (a bottle in a closed cupboard is not on
the sheet); `house stock` opens a live `stock` card whose rows change
when a bottle drains (`_drainScheduledForTesting`).

**Risk: low.**

### 1c — the glass pool (D10)

- `platform/thing/GlassRack.ts` — `Detailed(Container(Thing))` (an open,
  non-Sealable container), keywords `rack`. Content, not class, decides
  which glasses live in it.
- `platform/thing/CraftedDrink.ts` → `Crafted(Thermal(Bulkable(
  Container(Detailed(Thing)))))` (findings 12, 13). Persistent
  `soiled: boolean` (`isSoiled()`/`_setSoiled` gated to
  `FromModule('/platform/idea/api/CraftingLogic')` and the wash
  controller), `category` (the glassware par key — `coupe`, `rocks`,
  …, authored). A drink is "empty" when its bulk is empty.
- `CraftingLogic.craftImpl`: for `outputApplication` `bulk` (the bar's
  default) replace the clone with `claimGlass(gathered, recipe)`: the
  first reachable **clean, empty** instance whose `templatePath ===
  recipe.outputTemplate` (the gather walk already sees the rack's
  contents); none → `{ ok: false, reason: 'no-glass', detail:
  outputTemplate }` (a diegetic decline: "no clean coupe"). The claimed
  glass is marked soiled at fill. `tangible`/`edible` keep cloning
  (smithing's transform and cooking's plate are out of scope; noted in
  crafting.md as the next pool).
- `ServeController` / `OrderController`: hand the **claimed** glass to
  the patron exactly as they hand the clone today (no change beyond the
  new decline reason's copy). `MixController` keeps it.
- **`wash`** — `platform/idea/cmd/crafting/WashController.ts` +
  `platform/cmd/crafting/wash.yaml` (`wash <glass>`; a `ManualBuild`-
  style engaged step ~3 s): requires a reachable water source
  (`MixinApi.isBulkable` + `UnboundedSourceMixin` or any holder whose
  material is water); drains the residue to the discard sink
  (`consumeBulkInputs`' sink), destructs any garnish left inside
  (`StuffApi.destruct`), clears `soiled`. Afforded by the basin
  (`UnboundedReceptacle.commandContributions.environment` gains the
  view) — the same affordance pattern as `Menu`.
- Bussing is `get <glass>` / `put <glass> in rack` — shipped verbs.
- Breakage: a glass composes `DurableMixin`? No — `throw` and
  `StuffApi.destruct` already remove a glass; the par line
  `{ category: coupe, unit: count, level: 12 }` reports the shortfall.
  No new mechanism.

**Tests:** 40 `order`s on a 12-glass pool never exceed 12 `CraftedDrink`
instances and decline after the 12th until one is bussed + washed; a
washed glass serves again; a destroyed glass shows as shortfall on the
sheet; `wash` refuses with no water reachable; the strain path
(`mintVessel`) is unchanged (regression).

**Risk: medium.** The one-line change sits on every bar test's path;
the pool decline is the new failure mode every existing bar test must
be given a glass for (the lounge fixtures in
`world/lounge/__tests__/lounge-fixtures.ts` gain a rack).

### 1d — the recipe substrate: garnish, ice, technique, count, carbonation (D9)

- `lib/craft/Recipe.ts`: `garnish?: { category, count? }`; `ice?:
  'cubes' | 'crushed' | 'none'` (default none); `fromData`/`toData`/
  `fieldMeta` (spoiler 1 like the rest). `count` on item slots is the
  count measure (finding 11).
- `lib/craft/Technique.ts` (vocabulary value-object): `Technique =
  'shaken' | 'stirred' | 'built' | 'muddled'`; `TECHNIQUES` table
  `{ chillK, dilutionL, aerated }` (`shaken: −8 K, 0.02 L, true`;
  `stirred: −6 K, 0.01 L`; `built`/`muddled`: 0). Technique derives
  from the recipe's tool capabilities (`shaker` → shaken,
  `mixing-glass` → stirred, `muddler` → muddled, else built) on the
  resolve path, and from `getBuildMethod()` on the hand path.
- `CraftingLogic.applyBulkOutput`: after the fill — apply the technique
  (dilution: add `dilutionL` of water to the slot + payload; chill:
  `ThermalApi.depositHeat` negative, or the `Thermal` re-stamp seam,
  by `chillK`); **ice**: move `ICE_PER_DRINK_KG` (a `crafting.iceKg`
  dial) of `ice` bulk from the reachable ice bin (a Bulkable whose
  material is `ice`) onto the glass (`drink.setIce(kg, form)`); decline
  `insufficient-input: ice` if the recipe wants ice and none is
  reachable; **garnish**: match a reachable item by category (the
  shipped `pickItemInputs` over the garnish slot), consume/move it INTO
  the glass (`ContainmentApi.move(item, glass)`); **carbonation**: if
  any consumed input material carries `carbonated`, the derived payload
  records it (`BulkPayload` gains a `tags` union of input tags).
- `CraftedDrink`: `iceKg`, `iceForm`, `technique` persistent;
  `reconcileThermal()` override: while `iceKg > 0` the temperature is
  clamped at water's `meltingPoint`; heat that would have raised it
  above 273 K instead melts `ΔJ / latentHeatOfFusion` kg of ice
  into the slot as water (dilution, a real bulk credit on the same
  slot); when ice is gone, super's Newton cooling resumes.
  Reconcile-on-read, no scheduled transfer. Presentation
  (`getLong`/`markupAugmenters`): "shaken, cloudy with air", "on the
  rocks", "fizzing", "with an olive" — read from the stamps and the
  contents.
- `GarnishController`: keep the flourish, but at completion actually
  move the garnish into the glass (the same act the resolve path does).
- `muddle` — `platform/idea/cmd/crafting/MuddleController.ts` +
  `muddle.yaml`: a `ManualBuild` step like `stir`; requires a reachable
  `muddler` tool capability; records `BuildMethod` `'muddled'`
  (`ManualBuild.BuildMethod` widens to the `Technique` union).
- A `press` recipe (`outputApplication: 'bulk'`, outputTemplate a
  juice bottle from the pool, tool `juicer`, input `kind: item` lime
  ×1 → 0.03 L `lime-juice`) and `simple-syrup` (sugar item + water
  bulk, `requiresHeatK: 340`, hearth-cooking's) are **hospitality /
  hearth-cooking rows** (phase 3) — the substrate needs nothing new
  for them: the bulk output already fills a claimed receptacle.

**Tests (one per addition):** a G&T with ice reads colder than its
inputs and its amount grows as game-time passes (the melt is
dilution); a martini's olive is in the glass and leaves with it; a
mojito requires `muddler` and stamps `muddled`; a shaken daiquiri is
colder and more dilute than a stirred one of the same inputs; a dash
slot at `measureL: 0.001` debits 1 mL; a soda-water input yields a
carbonated payload the presentation reads; `press` yields bulk juice.

**Risk: medium.** The thermal override is the only physics; it reuses
`Meltable`'s arithmetic on authored water numbers.

### 1e — the `archetype` document kind (D11)

- `lib/document/DocumentKinds.ts`: `archetype: { kind: 'archetype',
  naturalKey: 'archetypeId', contentDir: 'archetypes', ext: 'yaml',
  onVanish: 'delete' }` (`NON_TEMPLATE_DIRS` and `check-untitled-paths`
  derive from it — nothing else to edit).
- `lib/archetype/Archetype.ts` (new subsystem folder, one
  value-object): `{ archetypeId, label, industry, capabilities:
  [{ key, needs, default }] }` — `needs` is a capability predicate the
  kernel already checks (`tool: <capability>`, `heatK: n`,
  `bulkSource: <material>`, `seating: n`, `coldStorage: true`),
  `default` a template path; `fromDocument`/`fromData` validation.
- `platform/idea/ArchetypeCatalogue.ts` (the `RecipeCatalogue`
  shape) + `PackLogic` validator entry (`archetype: (d) => void
  Archetype.fromData(d)`) + the go-live `case 'archetype'` re-warm.
- `api/archetype.ts` + `platform/idea/api/ArchetypeLogic.ts`:
  `describe(id)` — the **effective** floor: the residue plus the
  derived rows (every `toolCapabilities` / `requiresHeatK` across the
  industry's recipes, keyed by `Recipe.discipline` / the archetype's
  `industry`); `checklist(id, venue)` — which capabilities a venue
  location satisfies (read-only, never enforced); `materialize(id)` —
  clone a `FurnishableRoom` and each capability's default binding into
  it, returning the room (the derived test venue, A13.5).
- No runtime consumer beyond the three cold paths (install validate,
  `describe`/`checklist` from the `pack` verb's status, the test
  bootstrap).

**Tests:** the kind installs from a fixture pack (the `pack-harness`);
`describe` derives the tool/heat rows from recipes; `materialize`
returns a room that runs a fixture recipe end-to-end; a venue missing a
capability is *reported*, never refused.

**Risk: low.**

### 1g — brains in packs (ruled in at planning)

A pack must be able to ship a brain — *"platform brains can't
anticipate everything"* — and the loader already allows it:
`resolveExport` rides the pack namespace table. What stops it is a
rule, not a mechanism. **`behavior/` becomes a sanctioned pack
directory** — the Brain category's home inside a pack, mirroring
`lib/behavior/` in the kernel:

- `lint:instanceable` invariant 8 admits `src/behavior/*.ts` alongside
  the four branches, and checks the brain shape on those files (sole
  export `brain`, a named class-expression).
- `validateBehaviorPaths` and the CMS brain-path save-gate accept any
  root the table resolves (`/world/<x>/behavior/<name>`), not only
  `/lib/behavior/`.
- `@saxonberg/server/mud/lib/behavior/*` is already exported (the base
  types a pack brain imports).
- A fixture-pack test (the `pack-harness`): a pack with
  `src/behavior/paces.ts` and an agent row naming it installs, the
  brain resolves into the pack's `src/`, fires on its cadence.

The rule it enables is the class rule: **a brain lives in the pack
whose content is the only thing that names it.** This build's two
brains (`restocks`, `consigns`) are generic economy brains and stay
kernel; the first real pack brain arrives with the first pack that
needs a bespoke one. Documented in behavior.md + content-packs.md.

### 1f — the kernel stops naming trade rows; the stock bottle class; the sweep batch

- `CraftingLogic`: `GENERIC_MIXED_MATERIAL` → `/platform/idea/material/blend`;
  the row moves from `base-library/…/cocktail/mixed.yaml` to
  `packages/content/platform/content/platform/idea/material/blend.yaml`
  (finding 14).
- `platform/thing/Bottle.ts` — `Chattel(Circulating(Sealable(Detailed(
  GradedReceptacle))))`: the stock vessel every floor product is a row
  over. Chattel because consignment keys on `_chattelId`; Circulating
  because the sweep counts it; Sealable so a capped bottle keeps
  (`closure`). Defaults: glass wall, 0.75 L, `censusKey` derived from
  the material's primary tag when unauthored.
- `ResidencyLogic.runSpawnSweep`: per region, draw until the table
  declines, capped by `residency.spawn.perRegionCap` (default 64) —
  one census, many placements; `ResidencyApi.runSpawnSweep()` exposed
  and called once at boot after `PackApi.install()` (the "stands at
  target on a fresh boot" criterion); platform `settings` set
  `residency.spawn.mode: enforce` (the faucet is the point now).
  `rollBlessing` stays exactly where it is.

**Tests:** a fixture region with three circulating rows at targets 2/3/4
reaches all three in one sweep and places nothing on the next; the cap
holds.

**Phase 1 size:** ~2,400 lines kernel + tests, 3–4 sessions.

---

## Phase 2 — the display substrate, three instances, the client (D12)

Green on: typecheck, `test:near` (server + client), `lint:gates`,
`lint:imports`.

### 2a — `DisplayMixin` and the display resolver

- `lib/display/Display.ts` (new subsystem folder): `DisplayMixin` on a
  `Thing`. Persistent + authorable: `pairing: 'remote' | 'held' |
  'staff' | 'open'`, `sourcePolicy: 'any' | 'cards' | 'streams'`,
  `principal: string` (a Business path or ''), `remote: string` (the
  paired remote's template path, `remote` pairing only). Runtime:
  `showing: DisplaySource | null` where `DisplaySource = { kind:
  'stream', target: WatchTarget, label } | { kind: 'card', cardId,
  subjectId?, key }`. Methods: `getShowing()`, `show(source)` /
  `clear()` (gated `FromModule('/platform/idea/api/DisplayLogic')`),
  `mayDrive(actor): boolean` — the pairing policy:
  `held` → the actor carries it; `remote` → the actor carries the
  paired remote; `staff` → `EmploymentApi.holdsPosition(actor,
  principal)` or proprietor; `open` → `PerceptionApi.canReach`.
  Driving **by mind** additionally needs `MixinApi.isActive(actor,
  'AetherMixin')` and works from anywhere the display exists (the
  modem, finding 16); driving **by hand** needs reach.
- `api/display.ts` + `platform/idea/api/DisplayLogic.ts`:
  `resolveFor(actor): Display | null` — held → paired-and-in-sight →
  paired-anywhere-by-mind (`staff`/`held`/`remote` only) → null;
  `show(display, source)`: sets `showing`, then **projects to every
  viewer**: for each `HasInteractive` in the world that
  `PerceptionApi.perceives(viewer, display)` — a stream source writes
  that viewer's `cockpit.watch` (`{ …target, display: <stuffId>,
  label }`) and pushes; a card source `CardApi.push(interactive,
  cardId, { subjectId, key, title: display's name })`. `refresh(display)`
  re-projects (called on arrival — `Mobile.autoSenseOnArrival`'s
  sibling hook — so walking into the booth shows what the TV shows;
  and on departure clears the viewer's `cockpit.watch` if it names that
  display). `clear(display)` clears every projected viewer.
- `platform/thing/Tablet.ts` (`Display(Detailed(Thing))`, portable),
  `platform/thing/Screen.ts` (`Display(Detailed(Fixture(Thing)))`,
  wall-mounted, not portable), `platform/thing/Remote.ts`
  (`Detailed(Thing)`, keywords `remote`; pairing is the screen's field,
  not the remote's). The terminal: `TpaTerminal` composes
  `DisplayMixin` (`pairing: open`, `sourcePolicy: cards`) — its board is
  a card (see 2c).
- **Display-requiring commands**: `HouseController` (`house stock`,
  `house par`) and any controller that opens a card while a display
  is in play call `DisplayApi.resolveFor(giver)`; none → "you'd need a
  screen" (`no-display`). `house stock` then `DisplayApi.show(display,
  { kind: 'card', cardId: 'stock', key })` — the holder's own card is
  one of the projected viewers' (no double push: `show` is the birth
  path when a display is involved). `look <display>` reads what it
  shows.
- **`tune`/`watch` on a display**: `watch <target> on <tv>` (the `watch`
  view gains an optional `on` object arg) → `mayDrive` → `show(display,
  { kind: 'stream', … })`; `watch off on <tv>` clears. Personal `watch`
  (no `on`) is unchanged. A `channel` list is the lounge's build
  (non-goal); v1 the remote drives `watch … on tv`.

### 2b — the client

- `packages/types`: `WatchTarget` gains an optional `display?: { stuffId:
  string; label: string }` (the shared-display marker).
- `LivestreamViewerLayout.tsx` / `StreamEmbed.tsx`: when
  `cockpit.watch.display` is set, render the caption "on <label>" and
  hide the personal "use the watch command" empty-state copy; the
  `watch off` hint becomes "whoever holds the remote". Nothing else —
  the iframe path is identical.
- The card rail: no change. A pushed `stock` card renders through the
  shipped `mql` card path; its `title` names the display.

### 2c — the three instances (rows in phases 3/4; classes here)

- **House tablet** (`/trade/hospitality/thing/house-tablet` — phase 3
  row; class `/platform/thing/Tablet`): `pairing: staff`, `sourcePolicy:
  cards`, `principal` authored per venue instance (the lounge's row
  overrides it to `/world/lounge/idea/business` — phase 4).
- **Terminal**: `TpaTerminal` on the mixin; `teleport` (bare) opens
  the departures board as a card pushed to everyone in reach of the
  terminal (`open`), so "the terminal shows destinations to anyone in
  reach" — the board's prose stays as it is.
- **The sports-booth TV + remote** (phase 4 rows): `Screen` with
  `pairing: remote`, `sourcePolicy: any`, `remote:
  /world/lounge/thing/remote`.

**Tests:** `mayDrive` per policy (four tests); `resolveFor` ladder;
`show` projects to a perceiving onlooker and not to one who cannot see
the display (a closed door between); departure clears; a thief holding
the house tablet gets the sheet and `buy` still settles personally
(the D12 authority test, also acceptance); by-mind driving from another
room shows the driver nothing; client: a `display` marker renders the
caption (RTL test).

**Phase 2 size:** ~1,400 lines + ~150 client, 2 sessions.

---

## Phase 3 — the trade packs (D2–D5, D9, D13, D14)

Green on: typecheck (pack `src/` is in the server tsconfig `include`),
each capability pack's own vitest, `lint:instanceable`,
`lint:untitled`, `lint:imports` (pack tier), `lint:gates`,
`lint:arg-kinds`. Add every new pack to the **root** `package.json`
`dependencies` (the deployment manifest) — never to
`packages/server/package.json`. Each pack: `pack.yaml` (`id`, `root`,
`requires.groups` + `requires.title` — the `<trade>` group PM-owned like
hospitality's), `package.json` (deps derive `dependsOn`), `README.md`;
capability packs add `tsconfig.json` + `vitest.config.ts` copied from
`arcana/`.

### 3a — `trade-distilling` (capability)

`root: /trade/distilling`; claims `/trade/distilling`. Depends on
platform, base-library.

- `src/thing/SpiritBottle.ts` — extends `@saxonberg/server/mud/platform/thing/Bottle`
  with the spirits preset (0.75 L, `closure: sealed`, keywords
  `bottle`); `src/thing/Still.ts` — the furnace-family station
  (`Forge`'s composition over `Thing`: `Tooled` capability `still` +
  the heat surface — copy `platform/thing/Kiln.ts`'s stack); no
  recipes use it yet (the distillery build's tool, waiting). Test under
  `src/__tests__/` importing `@saxonberg/server/test-bootstrap`.
- `content/trade/distilling/idea/material/`: `gin`, `vodka`, `whiskey`,
  `rum-light`, `rum-dark`, `tequila`, `orange-liqueur`,
  `bitter-liqueur`, `aperitivo`, `bitters` — `ConsumableMaterial` rows
  (the shipped gin row's shape; tags carry the recipe category).
- `content/trade/distilling/thing/`: the generic floor bottles (one
  per material, `class: /trade/distilling/thing/SpiritBottle`,
  `interiorMaterial: /trade/distilling/idea/material/<x>`, `gradeBand:
  fair`, `censusKey: spirit:<x>`, `regionTarget: 12`, `container:
  /trade/distilling/thing/floor-stock` — see the consignor below);
  `crowsfoot-gin.yaml` (`gradeBand: fine`, `_brandKey: crowsfoot-gin`,
  `regionTarget: 3`, `container: /trade/distilling/thing/crowsfoot-stock`,
  and a header comment: *flagged — consigned by the "small outfit"
  consignor until the distillery build replaces it*).
- `content/trade/distilling/idea/corpo/Brand/crowsfoot-gin.yaml`
  (moved from generic-objects, `git mv`).
- **The cash-and-carry** (the showroom, D4): `location/cash-and-carry.yaml`
  (`class: /platform/location/FurnishableRoom`, `populates:` the
  `warehouse` bundle's fixtures — 3c — plus its own counter);
  `thing/counter.yaml` (`class: /platform/thing/Stock`, **no
  `stockLines`**, the `Attendant` config of the general store's
  counter, `serverPositionKeys: [clerk]`) — and the consignment
  shelf: `Stock` gains `ConsignmentShelfMixin` in phase 1 so one
  counter is both (today they are two fixtures; `BuyController`
  already resolves either); `idea/business.yaml` (`Business`,
  `banksAt: goodkin`, `operatingLocations: [the room]`, positions
  `clerk` (`confers: []`) and `keeper` (`purchases: true`),
  `appointingAuthority: { kind: office, office: prime-minister }`;
  independent — no `parentOrganization`); `agent/clerk.yaml`
  (`/platform/agent/NPC`, `shifts` brain).
- **The floor's producer of record inside distilling** — two small
  outfits so the trade's own generics and Crowsfoot ride the same
  mechanism the corpos do (D4 "the stubs' generics and Crowsfoot ride
  authored consignors the same way"): `idea/floor-outfit.yaml` +
  `thing/floor-stock.yaml` (a `Stock` the sweep fills via the rows'
  `container:`) + `agent/floor-hand.yaml`, and the same trio for
  `crowsfoot-*`. Each hand runs the **`consigns` brain** (below) with
  `config: { shelf: /trade/distilling/thing/counter, ask: { … } }` —
  the annex names the host, never the reverse.
- `content/platform/idea/Discipline/distilling.yaml` — the `distilling`
  discipline row ships **here**, at
  `/trade/distilling/idea/Discipline/distilling` (the rule: with the
  pack whose code derives it — `Still`'s recipes will; the row waits
  with the tool). `bartending` stays platform (nothing in
  hospitality's `src/` derives it — verified: only seed tests name it).

**The `consigns` brain** — `lib/behavior/consigns.ts` (kernel, generic):
cadence, `ambient: false`, `presenceGated: false`. Each beat: for each
good in its business's stock counter that is unlisted at the host
shelf, up to `config.batch` (default 6): `forceCommand(host, 'get
<kw>')`, teleport to the shelf's room (the `shifts` shape), `forceCommand
(host, 'wallet use house')` once (the hand carries a house card, 3d),
`forceCommand(host, 'consign <kw> --ask <n>')`, teleport back. Ask
prices from config keyed by census key. The clerk at the cash-and-carry
does not consign; the hands do.

### 3b — the five stubs (data)

Each: `root: /trade/<x>`, claims `/trade/<x>`, depends on platform (+
base-library; winemaking also on trade-distilling per D14; produce on
generic-objects for nothing). Each ships **everything downstream of
production**: materials (`idea/material/`), the vessel preset as a
**row** over `/platform/thing/Bottle` (`keg`, `cask`, `wine-bottle`,
`can`, `crate`, `basket` — data presets; a stub is a data pack and
names kernel classes), the floor product rows (`Bottle` rows with
`censusKey`, `regionTarget`, `container:` the stub's own outfit stock),
the outfit trio (`idea/<x>-outfit`, `thing/<x>-stock`, `agent/<x>-hand`
with `consigns` → the cash-and-carry counter), and its serving recipe
under `content/recipes/` (installed at `/trade/<x>/recipes/<id>`).

| pack | materials | vessel rows | floor rows | recipe |
|---|---|---|---|---|
| **trade-brewing** | `ale`, `lager` (ale moved from base-library) | `keg` (30 L, `censusKey: keg:ale`), `cask` | keg of ale, keg of lager | `pint` (tool `tap`, 0.5 L, glass `pint`) |
| **trade-winemaking** | `red`, `white`, `sparkling` (tag `carbonated`), `dry-vermouth`, `sweet-vermouth` (vermouth moved from base-library, split) | `wine-bottle` (0.75 L) | five bottles | `glass-of-wine` ×3 (`red`/`white`/`sparkling`, 0.15 L; wine / flute) |
| **trade-bottling** | `soda-water`, `tonic`, `ginger-beer`, `cola`, `grapefruit-soda` (all `carbonated`), `cranberry-juice`, `orange-juice` | `can` (0.33 L), `mixer-bottle` (1 L) | seven | `mixer` (0.2 L over ice, highball) |
| **trade-produce** | `lime`, `lemon`, `orange`, `grapefruit`, `mint`, `cherry`, `olive`, `cranberry` (food materials with tags = category), plus `crop/seed/plant/pot/bed` rows **moved** from generic-objects (`git mv`, paths `/trade/produce/thing/{crop,seed,plant,pot,bed}/…`) | `crate`, `basket` (Container things) | eight crates (the fruit rows are `Tangible` globs — `/platform/thing/Provision`'s shape — inside a crate; `Circulating` on the crate) | — (produce is an input; `press` is hospitality's) |
| **trade-hearth-cooking** (+ pantry) | `sugar`, `salt`, `coffee` (coffee moved from base-library; salt is new — base-library has only `salt-water`) | `sack` | sugar sack, salt sack, coffee sack; bagged ice is **bottling's** row (`ice` material = frozen water: `meltingPoint: 273`, `latentHeatOfFusion` from water, tag `ice`; a 5 kg `ice-bag` Bottle row) | `simple-syrup` (sugar item + water bulk → 0.5 L syrup into a bottle from the pool, `requiresHeatK: 340`, tool `pot`) |

### 3c — the corpo rows (data)

- **corpo-veshko** (depends on trade-distilling): claims a second
  extent `/world/veshko` (the distillery locality; rows under
  `/world/veshko/{location,thing,idea,agent}/`; a `content/world/veshko.yaml`
  `FolderZone` with `stocks: { 'spirit:vodka': 24, 'spirit:whiskey':
  12, 'spirit:rum': 12, 'spirit:gin': 12 }` — the exemplar zone).
  `idea/business.yaml` (`parentOrganization: /corpo/veshko`, `banksAt:
  goodkin`, positions `hand` with `purchases: true`); `thing/stock.yaml`
  (Stock, no lines); `agent/hand.yaml` (`consigns` → the
  cash-and-carry); `location/distillery.yaml` (a `warehouse` instance);
  bottle rows `thing/volk.yaml` (`_brandKey: volk`, `censusKey:
  spirit:vodka`, `container: /world/veshko/thing/stock`) and the
  generic-under-mark rows for whiskey, rum, gin (Veshko's liquid,
  unbranded or `_brandKey: volk`-family per the slate's roster).
- **corpo-hollis** (depends on trade-distilling, corpo-veshko): claims
  `/world/hollis` likewise (a bottling floor that distils nothing):
  `old-hollis.yaml` (`interiorMaterial` = Veshko's whiskey material
  row, `_brandKey: old-hollis`) and `hollis-cane.yaml` (Veshko's rum,
  `_brandKey: hollis-cane`), the outfit trio consigning to the
  cash-and-carry. The private-label fact is the `interiorMaterial`
  pointer, legible on `look`.
- Vionne, Goodkin, Aevex: **no rows change**; their brands stay
  brands.

### 3d — the house card at hire

`EmploymentLogic.hire`/`ensureRostered`: when the position has
`purchases: true` and the holder is **not** an Avatar
(`PlayerApi.isAvatarStuff`), issue a `PaymentCard` linked to the
operating account into the holder's inventory (idempotent: skip if the
holder already carries one linked to it). Players get nothing minted —
they `wallet use house` on their implant. Tested in 3a's pack suite via
the floor hand.

### 3e — `trade-hospitality` (becomes capability)

Adds `src/` (tsconfig/vitest from arcana), depends on platform,
base-library, the five stubs, hearth-cooking (recipe categories).

- `src/thing/IceBin.ts` — an insulated bulk holder for `ice` (the
  `Thermos`/`Flask` stack: `Thermal + Sealable + Bulkable`, `closure`
  sealed by default, keyword `bin`); `src/thing/Tap.ts` — the
  dispensing station: `Tooled` (capability `tap`) + `Surfaced` fixture
  with a `feeds:` field naming the keg it draws from (the gather walk
  treats the tap as the tool; the keg is the bulk source it sits on —
  `populates: { onto }`). The water tap is a plain
  `/platform/thing/UnboundedReceptacle` row (D13).
- Rows (`content/trade/hospitality/thing/`): tools — `muddler`,
  `bar-spoon`, `strainer`, `juicer` (`/platform/thing/ToolItem` rows
  with `capabilities:`); `tap`, `ice-bin`, `water-tap`, `basin`
  (`UnboundedReceptacle`, water), `glass-rack`
  (`/platform/thing/GlassRack`), `house-tablet`
  (`/platform/thing/Tablet`, `pairing: staff`, `sourcePolicy: cards`);
  nine glasses over `/platform/thing/CraftedDrink` — `coupe` (rename of
  `cocktail-glass`, keep both keywords), `rocks`, `highball`, `collins`,
  `pint`, `wine`, `flute`, `mug` (moved from generic-objects `vessel/mug`),
  `copper-mug` — each with `category: <glass>` and `interiorCapacity`;
  `back-bar` stays.
- Recipes (`content/recipes/`): the 24 lines of slate Part 9 with the
  new fields (garnish/ice), each `discipline: bartending`, `difficulty`
  authored, `outputTemplate` the glass row; plus `press` (×4 citrus)
  and the syrup cross-reference (hearth-cooking's row is the syrup).
- Bundles (`content/trade/hospitality/location/`): `bar.yaml`
  (`FurnishableRoom`, `populates:` back-bar, well shelf (Surface),
  counter (`AttendancePoint`), tap, ice-bin, water-tap, basin,
  glass-rack + 12 coupes/… inside it, seating (`/stuff/thing/fixture/…`
  chairs), the house tablet on the counter) and `cellar.yaml` (racking
  Surface, a keg, a `cold-store` Chest with a Thermal reserve). The
  **`warehouse`** bundle is distilling's
  (`/trade/distilling/location/warehouse.yaml`: Stock counter, racking,
  a dock exit stub) and the cash-and-carry room populates it.
- `content/archetypes/hospitality.yaml` — the venue archetype
  (`archetypeId: hospitality`, capabilities: water source → default
  `water-tap`; dispensing station → `tap`; cold storage → `ice-bin`;
  work surface → `back-bar`; seating → a chair; heat ≥ 340 K for the
  syrup → `/stuff/thing/fixture/range`).
- `muddle.yaml`, `wash.yaml` views ship in the **platform** pack (the
  controllers are platform — the verbs are physical acts any venue
  uses); hospitality's `commandContributions` on the muddler/basin rows
  afford them.
- `src/__tests__/menu.test.ts`: `ArchetypeApi.materialize('hospitality')`
  → a venue; stock it from the pack's own rows (a rack of glasses, one
  bottle per category, a crate of each produce, an ice bin, syrup);
  `order` every one of the 24 lines via a maker fixture; assert each
  consumes real matter, garnish in glass, ice on the iced ones,
  technique stamps, the pool bound.

**Phase 3 size:** ~140 YAML rows, ~600 lines pack `src/`, ~300 kernel
(`consigns`, hire card, Stock+shelf), 3–4 sessions. Content-heavy;
author the 24 recipes first and let them drive the row list.

---

## Phase 4 — the lounge (D14 row)

Green on: typecheck, `test:near` (the lounge tests under
`mud/world/lounge/__tests__/` are content tests and may name the
lounge), `lint:untitled`.

- `bar.yaml`: delete the four bottle `populates` lines and the two
  loose cocktail-glass lines; `class:` → `/platform/location/FurnishableRoom`
  is **not** possible (the bar is a `SingletonMixin` room the Warren
  wires) — instead `Bar` keeps its class and its `populates:` becomes
  the `bar` bundle's list by reference (the same fixtures the bundle
  names) plus the cast, the counter, the menu, the house tablet
  (`principal: /world/lounge/idea/business` — a lounge row
  `thing/house-tablet.yaml` over `/platform/thing/Tablet`), and a
  **sports booth**: `location/booth.yaml` (a `FurnishableRoom` east of
  the bar) populating `thing/tv.yaml` (`/platform/thing/Screen`,
  `pairing: remote`, `remote: /world/lounge/thing/remote`) and
  `thing/remote.yaml`.
- Delete `thing/{gin,vermouth,rum,lime}-bottle.yaml`.
- `business.yaml`: add position `keeper` (`label: keeping the bar`,
  `wageRate: 0`, `confers: []`, `purchases: true`), roster slot Mara →
  keeper (no schedule needed; give her the same weekday window so the
  wage line is honest); `parLines:` ~35 lines (the slate's seven
  categories: spirits in L, liqueurs, vermouths, wine, kegs, mixers,
  produce in count, ice in kg, glassware in count, `supplier:
  /trade/distilling/idea/business` on every line — one distributor).
- `bar-menu.yaml`: `offeredRecipes` = the 24 ids; prices.
- `mara.yaml`: add `- brain: /lib/behavior/restocks, trigger:
  cadence:2h` (game-time via the ambient-exempt path), `config: {
  shelf: /trade/hospitality/thing/back-bar, rack: /trade/hospitality/thing/glass-rack }`.
- **The player path to the seat** — `dave.yaml`: Dave's tree-dialogue
  gains a branch (*"Looking for work?"* → *"I could use a keeper."*) whose
  choice carries the shipped **`dispatch` effect** (*NPCs do their jobs*):
  `appoint <player> keeper /world/lounge/idea/business`, run **as Dave**
  — the appointing authority is the entity edge Dave holds, so the
  validator passes for him and for nobody else. Guarded on the player
  not already holding a position. `quit` (1a) is the way out. No wizard
  anywhere in the loop.
- `terminal.yaml`: nothing (the class composes the mixin).
- Lounge tests: `bar-content.test.ts` re-asserts *no* bottle in
  `populates`, the rack + tablet present; `lounge-fixtures.ts` stocks a
  test rail by `buy`-shaped placement (or direct `ContainmentApi.move`
  of bought bottles) — the kernel crafting tests keep their synthetic
  bottles.

**The `restocks` brain** — `lib/behavior/restocks.ts` (kernel, generic;
`ambient: false`, `presenceGated: false`). Each beat: `business =`
the one `buysFor(host)` operating where the host's shift is; skip when
off-shift; `sheet = EmploymentApi.stockSheetFor(host, business)`
(perception-scoped — she counts what she can see from the rail);
lines with shortfall → group by supplier → teleport to the supplier's
operating location (the `shifts` shape; a walk is the locomotion
slate's), `forceCommand(host, 'wallet use house')`, `buy <keyword>`
per unit of shortfall (bottles: `ceil(shortfall / bottle L)`; produce:
crates; ice: bags; glasses: `buy coupe`), teleport back, `put <kw> on
<shelf>` / `put <kw> in bin|rack` per bought thing; then the bussing
beat: any soiled empty glass in the room → `get`, `put in rack`,
`wash`. Config keys only name fixtures; the supplier comes from the par
line. If a `buy` declines (`insufficient-funds`), stop — the sheet
keeps saying so and `house pnl` shows why.

**Tests (lounge content tests):** boot with an empty rail → after one
brain beat with a funded house account the rail has bottles stamped to
the business, the distributor's counter lost them, the house account
fell, the outfit accounts rose; a game-week drive (the scheduler
harness) shows every `house pnl` line including `cost of goods` (the
`buy` charge category on the business side — `settleSale` posts
category `sales` for the payee; the payer's P&L line for a purchase
is the ledger's debit under `purchases` — add the category on the
`Charge` in `BuyController`); no reboot refills (assert after
`StuffApi.clearAll` + re-boot: the rail is whatever the record says).

**Phase 4 size:** ~400 lines YAML, ~250 kernel brain + tests, 1–2
sessions.

---

## Phase 5 — the generic drain (D14 last row; slate Part 7)

All moves are `git mv` (stages immediately). Every `class:` /
`interiorMaterial:` / `populates:` / recipe `category` reference
repoints in the same commit; `lint:instanceable` + `lint:untitled` are
the proof.

| from | to | referrers to repoint |
|---|---|---|
| `base-library/…/material/spirit/gin.yaml`, `rum.yaml` | `trade-distilling/content/trade/distilling/idea/material/{gin,rum-light}.yaml` | `saxonberg-lounge` bottles (deleted in phase 4); `mud/__tests__/craft-served-path.test.ts`, `platform/idea/api/__tests__/CraftingLogic*.test.ts`, `cmd/crafting/__tests__/manual-build.test.ts`, `lib/craft/__tests__/Recipe.schema.test.ts`, `api/__tests__/pack.test.ts`, `PackLogic.*.test.ts` + `pack-harness.ts` (these name `/stuff/idea/material/spirit/gin` as a fixture path — switch them to a synthetic material they create, per `lint:test-content`) |
| `…/material/spirit/vermouth.yaml` | `trade-winemaking/…/idea/material/{dry,sweet}-vermouth.yaml` | same set |
| `…/material/spirit/lime.yaml` | `trade-produce/…/idea/material/lime.yaml` | the daiquiri recipe (`category: lime` → `kind: item` produce + `press`) |
| `…/material/drink/ale.yaml` | `trade-brewing/…/idea/material/ale.yaml` | none in kernel (verified) |
| `…/material/cocktail/mixed.yaml` | `platform/content/platform/idea/material/blend.yaml` | `CraftingLogic.GENERIC_MIXED_MATERIAL` (phase 1f) |
| `…/material/bulk/coffee.yaml` | `trade-hearth-cooking/…/idea/material/coffee.yaml` | `generic-objects/…/vessel/urn.yaml` (`interiorMaterial`), `world-seed` `substation/flooded-floor.yaml`, `practicum/brine-floor.yaml`, kernel tests `BulkVerbs.test.ts`, `FloodedCell.integration.test.ts`, `substation-content.test.ts`, `Bulkable.test.ts`, `bulk-mql.test.ts` (fixtures → synthetic) |
| `generic-objects/…/idea/corpo/Brand/crowsfoot-gin.yaml` | `trade-distilling/…/idea/corpo/Brand/crowsfoot-gin.yaml` | `CorpoLogic.test.ts`, `CorpoCatalogue.test.ts`, `Branded.test.ts`, `docs/subsystems/corpo.md` |
| `generic-objects/…/thing/corpo/demo/*.yaml` | **deleted** | `platform/thing/corpo/BrandedBottle.ts` loses its only rows → delete the class too (`lint:instanceable` invariant 3 is on rows, not classes; the class is dead code — remove with its test) |
| `generic-objects/…/thing/vessel/mug.yaml` | `trade-hospitality/…/thing/mug.yaml` | the `coffee` recipe (new) |
| `generic-objects/…/thing/{crop,seed,plant,pot,bed}/*` | `trade-produce/…/thing/{crop,seed,plant,pot,bed}/*` | `world-seed` dorm/Hinkley rows that populate pots/beds (`grep -rn "/stuff/thing/\(crop\|seed\|plant\|pot\|bed\)/" packages/content packages/server/src`), `generic-objects/pack.yaml` claims (drop the five), `trade-produce/pack.yaml` claims them under `/trade/produce` |
| `saxonberg-lounge/…/thing/{gin,vermouth,rum,lime}-bottle.yaml` | **deleted** (phase 4) | `bar.yaml` |
| `generic-objects/pack.yaml` `description` | rewritten: no brand, no demo bottles, no crops; "the junk drawer, slimming" | — |

`urn`, `thermos`, `colander`, water, air, salt-water stay commons.

**Phase 5 size:** ~40 files moved/deleted, ~200 lines of test-fixture
repointing, 1 session. Run `lint:instanceable`, `lint:untitled`,
`lint:test-content` after every batch.

---

## Phase 6 — lints, the one full suite, the live drive, docs

1. Every lint gate: `lint`, `lint:gates`, `lint:instanceable`,
   `lint:untitled`, `lint:imports`, `lint:module-scope`,
   `lint:field-meta`, `lint:topics`, `lint:test-content`,
   `lint:test-bootstrap`, `lint:arg-kinds`, `lint:boundary`.
2. `pnpm test` once. Cite the number.
3. **The live drive** (below), on a fresh DB (`pnpm dev`, drop the DB
   first).
4. Docs — `docs/subsystems/display.md` (new: the mixin, the four
   policies, the two source kinds, the projection rule, the modem as a
   predicate, the resolver ladder, the three instances, what the
   client changed, non-goals); `retail.md` (the business purchase via
   the wallet, the consignor business, the cash-and-carry, the
   `consigns` brain, `Stock` + shelf as one counter); `crafting.md`
   (garnish/ice/technique/count/carbonation, the glass pool + `wash`,
   `muddle`, the blend base's move, the archetype-derived test venue);
   `employment.md` (`purchases`, `buysFor`, the house card, the par
   manifest, `house` gate, `restocks`); `furnishing.md` (the three
   bundles); `content-packs.md` (the `archetype` kind, the seven new
   packs + the stub definition, the shipped-packs table → 26, the
   lounge staying data); `corpo.md` (corpo = capital, private label,
   the Veshko/Hollis localities); `streaming.md` (`cockpit.watch.display`,
   `watch … on <display>`); `residency.md` (the batch draw + boot
   sweep + `enforce`); `banking.md` (`ownerKeyOf`, `unlinkAccount`);
   `CLAUDE.md` map line for `display.md` + the pack count in the
   content-packs blurb; the corpos slate: a roster re-cut note.

---

## The hard problems, decided

**(a) The wallet carrying a business account.** No custodial *shape* is
needed: a `PaymentCredential` is a set of linked account ids and an
active pointer, and settlement never checks ownership (finding 2). The
conferral is a link made at `wallet use house` after a position check,
undone at `fire`/`quit`, and never outliving a session (the wallet app
re-clones on login). `wallet use house` resolves to the business the
holder buys for *here*, else the single one, else asks.

**(b) A Thing as an aether host / modem.** `AetherMixin` on a slot-less
Thing would never be active (finding 16), and a display hosts no
updates. "Signed in as a principal" is a **field** (`principal`: the
business path) the `staff` pairing policy checks with
`EmploymentApi.holdsPosition` / `isProprietorOf`; the modem is the
driver's active attunement, checked on the driver. The screen composes
no aether mixin.

**(c) The shared display on the client.** One existing key
(`cockpit.watch`), written by the server for every viewer who perceives
the display, plus a `display` marker on `WatchTarget`. Cards are pushed
per perceiving Interactive through the one birth path. No new envelope.

**(d) The glass pool inside `CraftingLogic`.** `claimGlass` replaces the
clone for `bulk` outputs; the claimed instance is what `serve`/`order`
hand over; a decline is `no-glass`. `tangible`/`edible` keep cloning
this build.

**(e) Ice melt.** Reconcile-on-read in `CraftedDrink.reconcileThermal`:
the latent plateau at 273 K melts ice into water on the same slot.
Nothing is scheduled.

**(f) The sweep targeting a business's stock.** The row's `container:`
is the producer's `Stock` (singleton) — the shipped `applyContainer`
places it; `regionTarget` on the row governs; a zone `stocks:` is the
optional override (Veshko authors one). The sweep gains a
draw-until-decline loop + a boot run + `enforce`.

**(g) Consignment by a pack at install.** Not at install — **by an
authored consignor**: every producer pack ships an outfit (Business +
Stock + a hand NPC with the `consigns` brain whose config names the
host shelf). The annex names the host; `trade-distilling` names nobody.
The hand consigns *as the business* through the wallet rule.

**(h) The restock brain.** Kernel, generic, cadence game-hourly on
shift; reads the same sheet `house stock` shows, issues the same
`wallet use house` / `buy` / `put` / `get` / `wash` through
`CommandApi.forceCommand`. Nothing it does is unavailable to a player.

**(i) `press` / syrup.** Ordinary `bulk`-application recipes whose
output is a receptacle claimed from the pool (a juice bottle, a syrup
bottle); `press` needs the `juicer` tool and a produce item slot.

**(j) The `archetype` kind.** A value-object + catalogue + a small
Api/Logic pair (`describe`, `checklist`, `materialize`); the
hospitality pack's own test builds its venue from it.

---

## Live-drive checklist (fresh DB, no player logged in first)

1. Boot log: `residency.spawn` places N; `/world/veshko/thing/stock`
   holds 24 Volk + the generics; the cash-and-carry counter lists
   consigned goods from Veshko, Hollis, the five stubs, Crowsfoot; the
   bar's back-bar is empty; Mara's first `restocks` beat logs every par
   line short (the sheet is hers to read; nobody stands in).
2. Advance the clock a game-week (`clock` / the world-clock verb):
   watch Mara's beats in the log — the sheet shortfall, the counter's
   count falling, the bar's account falling, each outfit's account
   rising (`bank` as their hands, or `house pnl` at each outfit),
   the rail filling; `house pnl` at the bar shows income, wages, cost
   of goods. Restart the server: the rail is what it was.
3. Log in as an ordinary character. `talk dave` → *"Looking for
   work?"* → Dave appoints you keeper (his dialogue's `dispatch`
   effect); `wallet use house`; walk to the cash-and-carry; `buy gin`
   → "for Dave's Bar", `look` at the bottle → owned by the bar; `quit`;
   `wallet` → personal; `buy gin` → stamps you. **No wizard, no
   `eval`, at any step** — the whole loop is the seat's.
4. Hand the house tablet to a second character who holds no position:
   `house stock` on it → the sheet shows; `wallet use house` → refused;
   `buy` → personal account.
5. At the bar: `order` each of the 24 lines from the menu over a
   session (or the `msh` script that orders the menu): a garnish in the
   glass on `look`, the mojito "muddled", a G&T colder than the rail
   (`feel`), and after a game-hour its amount higher (dilution); a dash
   of bitters debits 1 mL (`look` at the bitters before/after); the
   spritz "fizzing".
6. The pool: order 13 coupes against 12 → the 13th declines; `get
   coupe`, `put coupe in rack`, `wash coupe`, order again → served in
   that glass. `throw coupe` → the sheet shows glassware short.
7. Displays: `house stock` with the tablet held → the card on my rail;
   the second character in the room sees the same card; from the
   cellar `house stock` by mind → "you drive it; you see nothing"; in
   the booth `watch <twitch handle> on tv` holding the remote → the
   embed for everyone in the booth with the caption; a third character
   without the remote `watch … on tv` → refused; leave the booth → the
   embed clears; `teleport` at the terminal → the board card for
   everyone in reach.
8. `pack status trade-distilling` → `capability`, `dependsOn` as
   authored; `lint:untitled`/`lint:instanceable` green in CI.

---

## Acceptance-criteria map

| Criterion | Phase |
|---|---|
| fresh boot: no `populates` bottle; distillery at target; counter consigned; empty rail + par | 1f, 3, 4 |
| a game-week with no player: the back loop, P&L with cost of goods, no reboot refill | 4 (+1a, 3a) |
| keeper → `wallet use house` → `buy` stamps to the bar; leaving unlinks; the thief | 1a, 2 |
| every menu line orderable, consumes matter; garnish/muddle/ice/dash/carbonation | 1d, 3e |
| the glass pool bound; bus + wash; breakage on the sheet | 1c, 1b |
| the five display scenes | 2, 4 |
| `archetype` installs; derived test venue runs the menu; bundles instance; Dave's Bar is a `bar` | 1e, 3e, 4 |
| no row under the old paths; every libation row under its trade; lints green; generic-objects description | 5 |
| docs | 6 |
| full suite once; every lint | 6 |

## Ordering and parallelism

```
1a (wallet/buy/consign) ─┐
1b (par/house/stock card) ┼─ 1c (pool) ─ 1d (recipe substrate) ─┐
1e (archetype kind) ─────┤                                       ├─ 3 (packs) ─ 4 (lounge) ─ 5 (drain) ─ 6
1f (blend/Bottle/sweep) ─┘                                       │
2 (display + client) ────────────────────────────────────────────┘
```

Phase 2 depends only on 1b (the `stock` card id). 1a–1f are
independent of each other except 1c→1d. Phase 3 needs all of 1 and 2
(the house tablet row). 5 can start as soon as 3's destination packs
exist; do it last so the lints prove the whole tree at once.

## Sizes

| phase | est. | sessions |
|---|---|---|
| 1 platform substrate | ~2,400 lines + tests | 3–4 |
| 2 display + client | ~1,550 | 2 |
| 3 trade packs | ~140 rows, ~900 lines code | 3–4 |
| 4 lounge | ~650 | 1–2 |
| 5 drain | ~40 files | 1 |
| 6 lints, suite, drive, docs | docs ~900 lines | 1–2 |

## Blockers / deviations

**Rulings 2026-08-28:** 1 stands (the lounge stays data) **and** packs
gain the ability to ship brains (1g); 2 and 3 are facts; 4, 5, 6
nodded. ⚠ One correction from review: `requiresWizard` is the
TypeScript code-trust axis and nothing else — the plan's live drive
had used a wizard as a stand-in for venue authority; every such step
is now driven through the seat (Dave's dialogue appoints, `quit`
resigns).

None blocks. Six deviations from the requirements' wording, each
forced by the shipped code and each preserving the decision's intent:

1. **D14 — `saxonberg-lounge` stays a DATA pack.** Its classes are
   parked kernel classes (`mud/world/lounge/`), and a brain can only
   live in `lib/behavior/` (the module-category table; a pack `src/`
   has no `lib/`). The restock brain is kernel and generic (`restocks`,
   beside `shifts`/`covers`), wired by the lounge's data. Moving
   `mud/world/lounge/**` into the pack's `src/` is a separate refactor
   with no libations content in it; not done here.
2. **D9 — `measureCount` is the shipped `count` on `kind: 'item'`
   slots** (finding 11). No new field; documented as the count measure.
3. **D8 — `shake` exists already** (`stir.yaml` verbs `[stir, shake]`).
   Nothing is added or renamed.
4. **D12 — the display composes no `AetherMixin`.** The modem is the
   driver's active attunement (finding 16); "signed in as a principal"
   is the `principal` field the `staff` policy reads. Behaviour
   matches D12's five bullets exactly.
5. **D14 — the generic blend base leaves base-library for the PLATFORM
   pack** (`/platform/idea/material/blend`), not for hospitality:
   `CraftingLogic` names it, and a kernel module may not name a trade
   pack's row (finding 14). `base-library/material/cocktail` is still
   emptied.
6. **D4 — the sweep needs two small kernel changes to be a faucet at
   all**: draw-until-decline per region (capped) and a boot-time run
   with `residency.spawn.mode: enforce` (finding 15). Still the
   magic-items channel, still declining regionally at target; the
   requirement's "never a second faucet" holds.

Two things to confirm at build time, neither a blocker: (i) that
`CommandApi.forceCommand` runs cleanly for an NPC `CommandGiver` whose
`postRegister` is shadowed by `Behaved` (the docstring says it
self-seeds lazily; `MagicLogic` uses it for non-avatars); (ii) whether
`Bulkable` already projects a `bulkAmount` subscribable field — add it
if not (1b).
