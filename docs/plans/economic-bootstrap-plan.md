# The economic bootstrap — implementation plan

Executes [economic-bootstrap-requirements.md](../requirements/economic-bootstrap-requirements.md)
(**feature, kernel-led**; first consumers: the Counting-Houses/Goodkin,
the cash-and-carry + the general store, Dave's Bar, Duncan Hall's
intake), including its `## Retrofit — districting the 1.0 content`
section. What is built: the reserve's two lanes and one officer; a
treasury that spends; the four-rung credit ladder gated on the ledger;
the Arrival Note; the wage overdraft retired into a loan or a
refusal; the three estate states derived from absence, with escheat up
the title tree; the retrofit that makes the title tree the situs tree
(the realm root, the trade premises in the world, three seats, corpo
committees, Walter off a committee, two lints). One MR, twelve waves,
one dirty wire drive.

Planned 2026-09-18 against `design/economic-bootstrap-retrofit` at
`cf9189816` (caught up to `origin/master`). Every path below is
relative to the repo root; every line number was read this cycle.

---

## Grounding

Verified by opening files. What exists, what it does, what it does
NOT do.

### Money — `packages/server/src/mud/{api/banking.ts, platform/idea/api/BankingLogic.ts, lib/banking/}`

- **The chokepoint.** `postTransaction(kind, legs, opts)` is a
  module-private free function, `BankingLogic.ts:1507-1597`. It runs
  `assertConserving` (:1514), an endpoint-currency check (:1528-1540),
  stamps `at/realAt/actor/txId`, writes one `LedgerEntry` per leg with
  `category = leg.category ?? defaultCategory(kind)` (:1562), then
  `applyDelta` (:1624-1638) — which **find-or-creates a bare row and
  does `row.balance += delta` with no floor**. Negative balances are
  allowed by construction; nothing in the chokepoint refuses.
- **The closed kinds.** `LEDGER_KINDS` (`lib/banking/LedgerEntry.ts:47-60`):
  `mint · drain · deposit · withdraw · transfer · payment · wage · tax ·
  escrow-hold · escrow-release · escrow-revert · draw`. `assertLegKind`
  (`lib/banking/Transaction.ts:104-186`) carries the counterparty rule
  per kind and a `never` backstop (:176-184) — **a new kind is a compile
  error until its case exists**. Rules: the eight real-money kinds
  require both endpoints real (:108-128); `mint` from `Account.ISSUANCE`
  to a real account or `CASH_BRIDGE` (:129-144); `drain` to `ISSUANCE`
  (:145-159); `deposit` from `CASH_BRIDGE` (:160-167); `withdraw` to
  `CASH_BRIDGE` (:168-175). `supplyDelta` (:192-202) counts only
  mint/drain.
- **Categories.** `PnlCategory` (`LedgerEntry.ts:69-88`) is an OPEN
  union: `sales cogs wages subsidy tax transfer deposit withdraw float
  fare networkFee fee onboarding consignment escrow draw commission
  piecework other`. The two-layer rule (doc comment :38-45): a
  standalone movement gets its own KIND; a rider split inside a
  multi-leg transaction gets its own CATEGORY.
- **Sentinels** (`lib/banking/Account.ts`): `ISSUANCE =
  "issuance:central-bank"` (:32), `CASH_BRIDGE = "cash:bridge"` (:35),
  `CENTRAL_BANK = "central-bank"` (:38, a REAL account id),
  `CENTRAL_BANK_INSTITUTION = "central-bank"` (:50, the custodian key —
  "only an organ of the polity banks at the CB"),
  `escrowAccountFor(id)` → `escrow:contract:<id>` (:63-65).
- **The account row** — `AccountBalance` (`lib/banking/AccountBalance.ts:25-77`,
  collection `bank_accounts`): `accountId · owner (an identity path) ·
  bank (institution key) · bankPath (legacy) · corpoKey · isPrimary ·
  isActive · balance · currency`. **No `frozen`, no credit limit, no
  terms on the row.** `cachedOverdraftByCurrency` (:193-200) is the
  Σ-of-negatives read the dashboard prints.
- **The four faucets on master** (the census `lint:no-authored-faucet`
  will count):
  1. `ensureVenueAccountImpl` (:364-420) mints `openingCapital ??
     openingCapitalMinor()` on first materialization (:404-418, category
     `subsidy`); the default reads `banking.openingCapital` = `"20000"`
     (`packages/content/platform/content/settings/banking.yaml:70`);
     the per-Business override is `Business.openingCapital = -1`
     (`platform/idea/Business.ts:168`, `getOpeningCapital()` :205-207),
     passed by `EmploymentLogic.operatingAccountOfImpl` (:708-731).
     **No content row authors `openingCapital`** — all 33 Businesses
     take the default. `ensureCorpoTreasuryImpl` (:579-585) also takes
     the default (a fifth mint site nobody names).
  2. `seedFloatImpl` (:593-611): `issueCashImpl(bank, amount, "float")`
     + a `deposit` leg into the branch account; lazily from
     `openAccountImpl` (:276-282); `banking.openingFloat` = `"500"`.
  3. `EmbodyController.ts:774-786` — `BankingApi.issueCash(avatar,
     Money.of(stipend), "onboarding")` with `banking.onboardingStipend`
     = `"20"`; coin in hand, no account opened.
  4. The `reserve` verb (`packages/content/platform/content/platform/cmd/banking/reserve.yaml`,
     validators `requiresAnimate` + `requiresGovernor` :13-15):
     `mint <amount>` → `ReserveController.ts:42-68` mints `subsidy` into
     the present venue's account (:63); `issue <amount>` → :90-116
     `issueCash` into the Governor's hands (:106); `supply` → :127-155
     prints the reconcile incl. the *"of which overdraft"* line
     (:139-142). Afforded by `lib/shell/Author.ts:117-118` (beside
     `house`), i.e. every Avatar sees the verb and the seat validator
     gates the act.
- **Wages have no floor.** `payWageImpl` (:951-977) — the comment at
  :963-966: *"No employer-solvency check: a venue runs its P&L red by
  design … blocking it would defeat the deficit model."* `payWage`
  (:2151-2159) takes a `category` from the caller (piecework).
  `payDrawImpl` (:1111-1142) IS solvency-checked (:1119-1126, throws
  `holds less than`). `settleImpl` (:808-943) refuses below balance
  (:909-911) and posts the main leg + `Charge.splits` as one `payment`
  transaction (:926-936). `remitDemoTaxImpl` (:1225-1244) posts `tax`
  seller → the raw string id `"treasury"` (`banking.treasuryAccount`),
  no check. `chargeFeeImpl` (:642-700) is the corpo royalty leg.
- **The wage caller** is `EmploymentLogic.settleShiftWageImpl`
  (`platform/idea/api/EmploymentLogic.ts:778-814`): skips the
  proprietor (:788), `round(wageRate × gameHours)` (:799),
  `ensurePayableWorker` (:741-763, opens an NPC's account at the
  employer's bank with capital `0`), then `BankingApi.payWage` (:813).
  Runs from `tickBusiness` (:1107-1165) on the game-hour roster tick
  (`installRosterSchedule` :1168-1181, `WorldClockApi.every(3600)`).
- **Terms** (`lib/banking/Terms.ts:24-37`): `minBalance openingFee
  transactionFee wireFee crossCorpoFee cardReissueFee`; carried by the
  **BankMixin counter** (`lib/banking/Bank.ts:162`, fieldMeta :114),
  authored at
  `packages/content/terminus/content/world/terminus/counting-houses/bank-counter.yaml:33-40`.
  **No rate anywhere; no `charter` field anywhere.** `Bank.getBank()`
  (:172-174) = `bank || corpoKey`. The counter affords `bank.yaml`
  (:122-126).
- **Custody.** `isRealCustodian` (:349-354): `central-bank`, the
  `banking.defaultCustodianBank` value, or an institution with a live
  `BankMixin` branch. Every one of the 33 Business rows authors
  `banksAt: goodkin`.
- **BankingApi** (`api/banking.ts:98-555`): thin forwards; the statics
  the plan touches are `mint` :105, `drain` :119, `payWage` :325,
  `payDraw` :343, `settle` :288, `issueCash` :473,
  `ensureVenueAccount` :514, `ensureCorpoTreasury` :535, `reconcile`
  :486 / `fullReconcile` :497, `profitAndLoss` :449,
  `primaryAccountIdOf` :230, `ownerKeyOf` :247. Tail :557
  `SecurityApi.decorateApiClass(BankingApi)`. `deposit`/`withdraw` live
  on the `Bank` mixin face, not the Api.
- **Boot.** `platform/idea/CentralBank.ts:40-50` `postRegister` warms
  `AccountBalance`/`SupplyAggregate` and restamps custodians.
- **Nothing lends.** grep over `lib/banking` + `BankingLogic` for
  loan/lien/credit-line: none. "Overdraft" exists only as the reported
  aggregate.

### Employment — `lib/employment/`, `platform/idea/Business.ts`, `EmploymentLogic.ts`

- `BusinessMixin` (`Business.ts:115-218`) fields: `operatingLocations`
  (:144), `banksAt` (:155), `openingCapital` (:168), `parLines` (:178);
  fieldMeta :130-139; `getAccountPath()` = **its own `templatePath`**
  (:213-215) — fine for content rows, wrong for a minted per-player
  Business (D15). `BusinessEntity extends
  BusinessMixin(OrganizationMixin(PostRegistrationMixin(Idea)))`
  (:229-241), `canDestruct` refuses. `OrganizationFields`
  (`lib/employment/Organization.ts:167-173`): `appointingAuthority ·
  parentOrganization · proprietorPath · positions · rosterSlots` +
  `name`. `PrincipalRef` (`lib/employment/Authority.ts:42-87`):
  `entity{path} · office{office} · seat{government,seat} ·
  committee{parcel}`; only `office` and `committee` carry the founder
  default.
- `EmploymentStatus` = `employed | on-shift | off-shift | quit |
  fired`; **nothing vacates a position**; `endEmploymentImpl`
  (:494-520) is the only exit and it is an act (`quit`/`fired`).
- **The Business stands up lazily** — `ensureOperatorAt(locationPath)`
  (:1337-1383) matches a **fixture** path against
  `operatingLocations` (the general store lists its counter, :239 of
  its yaml; the cash-and-carry lists both its counter and the room).
- `stockSheetFor(viewer)` (Organization.ts :432-500) reads `parLines`
  only; the general store's counter authors `stockLines` and the
  Business no `parLines`; **only Dave's Bar authors `parLines`** (46
  lines, `supplier: /world/terminus/counting-houses/distributor/idea/business`).
- **Brains** (`lib/behavior/`): cadence triggers are **REAL-TIME**
  (`Behaved.ts:280-292`, doc :399-400) and fire whether or not a player
  is present when `presenceGated` is false; but a cast NPC that is not
  resident has no brain running (residency spawns cast lazily —
  `EmploymentLogic.ts:1094-1096`). `consigns` (`consigns.ts`, config
  `{stock, shelf, ask, defaultAsk?, batch?}` :55-60) walks the outfit's
  goods to a host shelf and runs the LITERAL `wallet use house` +
  `consign <kw> --ask <n>` (:224-230). ⚠ **`restocks` does not buy**:
  it posts a `job post supply … --bounty --business` on the haulage
  board (`restocks.ts:310-377`) for a hauler to fill — no NPC hauler
  brain exists, so with nobody online the bar never restocks. `shifts`,
  `covers`, `homes` as documented.
- `house` (`cmd/banking/house.yaml`) is SEAT-gated
  (`BankingControllerBase.resolveHouse` :56-71: position held or
  proprietor here, else `buysFor()[0]`); subcommands `pnl payroll par
  freight traffic stock`. `house payroll <worker> <amount>` posts a
  `wage` leg directly (`HouseController.ts:95-138`).

### Retail — `platform/thing/Stock.ts`, `lib/retail/Consignment.ts`, `platform/idea/cmd/retail/`

- `Stock = Persistable(ConsignmentShelf(Resettable(Attendant(PricedOffer(Detailed(PostRegistration(Vessel)))))))`
  (:53-61). `stockLines: {itemTemplatePath, par, brandKey?}[]` (:37-44,
  :80); `prices` from `PricedOfferMixin` (`lib/commerce/PricedOffer.ts:64`,
  keyed by item template path — the shop's ask). `reset()` (:139-149)
  **clones `par − onHand` fresh goods from the template** — goods from
  nothing; called from `postRegister` (:74-77) and the game-time reset
  sweep (`ResidencyLogic.installResetSweep` :710-725,
  `residency.reset.intervalS` = 3600 game-s). `resetsWhilePresent() →
  true` (:152-154). Affords `buy/consign/reclaim` (:87-99). The
  Business link is `AttendantMixin.businessPath` (`lib/attendant/Attendant.ts:131-139`)
  for staffing; **money resolves through `ensureOperatorAt(stock
  path)`**, not that field.
- Listing = `HeldGood {holdingId, itemChattelId, consignorKey}` +
  `askMinor` (`Consignment.ts:29-36, 118-121`); `recordListing`
  (:192-203). Ownership is always `ChattelApi.ownerOf` — never on the
  listing.
- `BuyController`: stock good → `settleSale(stock path, price)` +
  `stampChattel(buyer)` (:122-153); listing → `commission = ask ×
  retail.consignment.commissionRate` ("0.15"), remainder as a
  `RemittanceSplit{category: "consignment"}` to the consignor's primary
  (:169-241), `transferChattel(buyer)`; `buyerOf` (:159-165) stamps to
  the Business when the house account paid. `ConsignController`: ask
  :74-82, principal = the active house (:241-250), cap
  `retail.consignment.listingCap` ("24"), stamp-on-consign :217-219.
  `ReclaimController` (:62-75) **admits only a `player` owner** — an
  outfit (organization) cannot reclaim its own consigned goods today.
- The market's `stalls.yaml` is one municipal `Stock` (consignment,
  `/world/terminus/market/business` the operator); **there is no verb by
  which a player stands up a business** (grep for
  found/openShop/mintBusiness in `cmd/` + `EmploymentLogic`: none).

### Polity — `lib/governance/Office.ts`, `api/compact.ts`, `PackLogic.ts`, `api/parcel.ts`

- `OFFICE_APPARATUS` (`Office.ts:140-171`): the five seats; keys are
  plain strings (no `OfficeKey` type). One test pins the exact list —
  `platform/__tests__/OfficeRegistry.test.ts:170-178`; `office.yaml:6`
  says "There are five". `requiresGovernor`
  (`lib/command/validators/requiresGovernor.ts`) is a non-parameterized
  validator with a `preload` (`CompactApi.holdsOffice(giver,
  'central-bank-governor')`); `requiresFoundingAuthority` guards
  `office assign/vacate` only. **No generic requires-office validator
  exists** (governance.md deferred it to "the second office-gated
  verb").
- `CompactApi` (`api/compact.ts`): `holdsOffice` :126, `officeRoster`
  :192, `assignOffice` :211 / `vacateOffice` :226 (gated to
  `OfficeController`), `committeeOf(path)` :246, `isCommitteeMember`
  :255, `committeeMembersOf` :263. `committeeOfImpl`
  (`CompactLogic.ts:85-110`): `ParcelApi.ownerOf` → group view /
  organization view / **null for a `player` owner**.
- `ParcelOwner` (`lib/parcel/ParcelRecord.ts:58-61`): `group | player |
  organization` — **no `office` kind**; a manifest title `holder` parses
  only `{group}` / `{organization}` (`PackLogic.ts:434-444`); a group's
  `owner` parses only `{office}` (:402-407). `ParcelApi`: `ownerOf` :75,
  `coveringParcelOf` :83, `grant(claim)` :243, `transfer(extent,
  newOwner)` :254, `grantUse/revokeUse` :266/:275, `heldUnitsOf` :309,
  `childParcelsOf` :314. `parentParcel` is a stored field walked by
  `ParcelRegistry` (:96-115); coverage is longest-prefix.
- **The requires phase** (`PackLogic.ts`): `gateRequires` :3111-3176 —
  group holder declared by pack or host (:3133-3140), organization
  holder a shipped row (:3122-3129), **the NPC-only fence :3146-3165**
  (a member id must be a row THIS pack ships, under an extent THIS pack
  claims), coverage :3167-3175. `applyRequiresFor` :3260-3339 (groups
  → members → titles); `reprovision()` :4117-4145 re-runs it nightly
  from the install record (players' group memberships are NOT restored;
  manifest NPC members are).
- **Title claims today**: the table in the launch prompt is confirmed
  from every `pack.yaml`. Notably: terminus claims ten districts +
  seznick-house (for `mayfield-holdings`, whose one member is Walter —
  `packages/content/terminus/pack.yaml:26-29`), **not
  `/world/terminus` itself and not `wharfside`, `goods-yards`,
  `infirmary`, `necropolis`** (they resolve to the platform's `/world`
  → `/compact/executive`); the four world packs root beside it
  (`/world/terminus/rejection`, `/world/terminus/eternal`, `/world/terminus/hearthworks`,
  `/world/terminus/hearts-delight`); each trade pack claims `/trade/<x>` for a
  PM-owned group `<x>`; each corpo pack claims `/corpo/<x>` for its own
  organization, whose `appointingAuthority` is `{office:
  prime-minister}`
  (`packages/content/corpo-<x>/content/corpo/<x>.yaml:35-37`).
  Goodkin's counting-houses Business already uses `{committee:
  /corpo/goodkin}` (`counting-houses/business.yaml`). The city budget
  `/world/terminus/budget` uses `{committee: /world/terminus/terminal}`.
- `AccessLogic.isAgentOf` (:146-152) starts with `if (await
  this.isWizard(actor)) return true;` and returns false for any
  non-group owner; `LeaseController.ts:56-71` and three siblings call
  it. Flagged in the wizard-axis slate; **not this build's to fix**.
- `Government` rows: four; only `terminus-city` has a `treasury`
  (`/world/terminus/budget`, a Business). Jurisdiction lives on
  `Locality._governmentKey`. Addresses already read `terminus/city/…`.

### Contracts — `lib/employment/ContractRecord.ts`, `ContractLogic.ts`, `api/contract.ts`

- `ContractRecord`: states `open | claimed | settled | breached |
  expired` (:26-32); `ContractParty {kind: "player" | "business",
  templatePath}` (:43-46, holds an IDENTITY path despite the name);
  fields `contractId · state · boardPath · origin · issuer ·
  issuerAccountId · claimMode · claimant · clause · rewardMinor ·
  escrowAccountId · postedAt … closedAt · settledBy · realAt ·
  watchedSec · watchSeenSec` (:54-160). **No `kind` discriminator.** The
  clause vocabulary is closed and engine-verifiable
  (`CONDITION_TEMPLATES = delivery | supply | watch`) — a loan is NOT a
  clause. `watchedSec` is the shipped precedent for a **stamp-forward
  materialized accrual on the record**. Finders :163-219 (by id, live by
  board/origin, active by claimant). `ContractEvent.event` (:20-28):
  `posted claimed fulfilled breached released-back settled reverted`.
  `ContractLogic` is the one writer; `breachClaim` (:412-450) is where
  breach is decided; expiry is lazy at every touchpoint (:459-466).
  Schema `packages/server/src/schema/contracts.yaml`: "money legs only
  in `bank_ledger`; the escrow account id is a TERM, not a balance".
- `ContractApi` (`api/contract.ts`): `post claim reconcileWatches abandon
  fulfill complete activeClaims openGigsOn openGigsFrom contractById
  eventsFor`. `onContractSettled` is a `@hook` on `BusinessTrade`.

### Lifecycle — `platform/agent/Avatar.ts`, `Login.ts`, `PlayerLogic.ts`, `lib/persistence/PersistedRecord.ts`

- `Avatar.lastSeen` (:267 persistent, :287, `getLastSeen` :290,
  `markSeen` :298) — **the sole write is the connection teardown**
  (:1403-1412, wall clock, both logout and linkdead), then `save()`
  (:1422). The only reader is `Login.rosterFigures` (:453-457).
- **There is no lightweight offline read.** `Login` lists a user's
  characters by fully materializing each (`PlayerLogic.loadAvatarsForUser`
  :184-215 → `materializeAvatar` :227-238, a full clone + hydrate from
  `holder_snapshots`). `PersistedRecord` (`PersistedRecord.ts:42-57`,
  collection `holder_snapshots`) carries `scope · owner · state · place`
  — `state` is an OPAQUE per-mixin JSON the store never inspects, so a
  Mongo query on a field inside it is not a supported read.
- Holding dormancy keys on **zero `HasInteractive` occupants now**
  (`lib/location/OuterWarren.ts:556-568`, event-driven from
  `FurnishableRoom.onContainableAdded/Removed`), not on `lastSeen`; the
  shell weathers on game time
  (`packages/content/residence/src/idea/HoldingWarren.ts:549-566`).
- Real time: `Date.now()` is read raw (`ResidencyLogic.ts:610`,
  `execution-context.ts`); game time `WorldClockApi.getNow()` at
  `DEFAULT_SCALE = 12` (`api/worldclock.ts:108`); a game-day is 86,400
  game-s (`lib/time/DefaultCalendar.ts:16`); `WorldClockApi.every` is
  the game-time recurring seam; `ScheduleApi.recurring` the real-time
  one.

### Wallet, press, disciplines, chronicle, settings

- `CredentialKind = "payment" | "travel" | "key"`
  (`lib/credential/Credential.ts:26-27`, "Adding a kind is adding
  data"); a credential is a value-object, not a Stuff — **`look` cannot
  target one**; bare `wallet` prints only the active payment account
  (`WalletController.ts:54-79`). `draw` is afforded by
  `CredentialWalletUpdate.ts:50`.
- Press: `PressApi.publish(req)` derives the author from context and
  requires a publishing position (`api/press.ts:138`;
  `Publisher.ts:84-87, 115`); the only publisher row is
  `packages/content/platform/content/compact/press.yaml` (ooc, unfilled
  `communications-director`). **No periodic edition exists.** The ticker
  is a frame (`PressLogic.fanFeedImpl` :92-98) + `Avatar.enter`'s
  `releaseWindow` (:919).
- Disciplines are rows (`packages/content/platform/content/platform/idea/Discipline/*.yaml`,
  30 today; shape `key channel label iscedf specializes description`);
  crediting is `giver.creditDeed({discipline, difficulty, outcome})` on
  `AdvancementMixin` (`lib/advancement/Advancement.ts:225-236`; call
  site `PlantController.ts:241-246`, narrowed by
  `MixinApi.isAdvancing`). No lint checks a code-referenced Discipline
  key exists as a row.
- `recordChronicleOnce(key, fields)` on `PersonaMixin`
  (`lib/character/Persona.ts:279-288`; forestry's call
  `trade-forestry/src/thing/Panel.ts:174-185`).
- `AppApi.setting/settings/setSetting` (`api/app.ts:104-122`), keys in
  `AppSettingKeys` (`lib/config/AppSettings.ts:43-1717`), values in
  `packages/content/platform/content/settings/<prefix>.yaml`; `config`
  is `requiresWizard`
  (`packages/content/platform/content/platform/cmd/system/config.yaml`),
  unknown keys still save (`ConfigController.ts:26, :70`).
- `GrammarApi.inWords(n)` (`api/grammar.ts:278`): whole non-negative
  integers under a million, else digits. `Money.render()` prints digits.

### Wire harness — `packages/wire/`

- `Session.open(handle, {startLocation?, wizard?})` (`session.ts:251`,
  `POST /auth/test-login`), `cmd` :457, `prose` :513, `query` :528,
  `close` :702; `expectOk / expectRefused / expectNote(result, kind,
  {reason}) / expectNoNote / detailOf` (`assertions.ts`);
  `declareFile({file, packs, dirtyReason})` (`registry.ts:82`); dirty
  files sequenced last (`vitest.config.ts:27-47`), `testTimeout
  300_000`. **No clock helper, no settings helper**; a wizard session
  may `config <key> <value>`. 19 files today; `logistics.wire.test.ts`
  is the cleanest shape; `grain-chain.dirty` drives `buy`.

### Lints

`lint:family` derives its roster from `package.json` (45 `lint:*`
scripts; `scripts/lint-family.ts:27-31`). `check-lib-statics.ts` is
the ratchet shape to copy (a `CEILING` constant that may fall, a test
asserting the invariant not the number). `lint:schema` gates that every
collection's `schema/*.yaml`, `Collections.ts`, the record class and
the subsystem doc agree — **every field this build adds to `contracts`
/ `bank_ledger` / `holder_snapshots` edits the yaml too**.

---

## Plan-level decisions

### D1 — A loan, a note and an unclaimed-property claim are `contracts` rows

`ContractRecord` gains `kind: "gig" | "loan" | "note" | "unclaimed"`
(default `gig` so every existing finder and row is unchanged), a
`holder: ContractParty | null` (the creditor — for a gig it stays null
and `claimant` keeps its role), `terms: CreditTermsData | null`
(`{ratePerGameYear, share, security: {kind: "inventory", counterPath} |
{kind: "account", accountId} | {kind: "none"}, principalMinor,
windowAdvanceMinor, dischargeOnFirstWage, dischargeAfterGameDays}`),
and the stamp-forward pair `owedMinor` + `owedStampS` (game seconds) —
the `watchedSec` precedent. `ContractParty.kind` widens to `player |
business | organization` (the treasury). `ContractEvent.event` gains
`advanced repaid discharged defaulted repossessed recovered escheated
reclaimed`. Finders added: `findOpenByIssuer(key, kind)`,
`findOpenByHolder(key, kind)`, `findByKind(kind, state)`.

*Why not derive-from-ledger only:* the terms (rate, share, security,
the discharge condition) are facts the ledger cannot hold, and the
requirements want a note a player can read. *Why not the document
tree:* a loan is queried by system across jurisdictions (every inflow
to any borrower asks "who holds a claim on this account?") — the
sort rule in press.md decides it. *Why contracts and not a banking
record:* the auction slate trades debt as a claim, and contracts is
where claims already live with an escrow precedent and one writer.
Money legs stay ONLY in `bank_ledger`; the row records terms and the
running `owedMinor`. **`ContractLogic` remains the one writer** of
`contracts`; the credit face is on `ContractApi`; BankingLogic never
writes a contract.

### D2 — Four new leg kinds; the two lanes ride `mint`/`drain`

New `LEDGER_KINDS`: **`advance`** (creditor → borrower),
**`repayment`** (borrower → creditor; also the treasury paying back
unclaimed property), **`appropriation`** (treasury → anyone), and
**`escheat`** (an absentee's account → the treasury). All four take the
real→real rule in `assertLegKind` (join the first case group). The
window advance is a `mint` (ISSUANCE → the bank's account, category
`window`) and the bank's repayment of it a `drain` (bank → ISSUANCE,
category `window`); the perpetual purchase is a `mint` (ISSUANCE → the
treasury, category `perpetual`). Those are the reserve's two rules and
the ONLY mint/drain call sites the faucet lint allows. The share of an
inflow taken for a creditor is a rider split inside the `settle`
transaction: kind `payment`, category `repayment`; interest inside a
repayment is a second leg of the same transaction, category
`interest`. New categories: `window perpetual advance repayment
interest terms appropriation escheat unclaimed recovery arrival
opening`.

### D3 — The floor is structural

`postTransaction` refuses (throws) any leg that would take a real
account below zero, checked against the warmed cache before any write
(the endpoint check at `BankingLogic.ts:1528-1540` is where it goes).
Every caller that today refuses gracefully keeps doing so before the
chokepoint; `payWageImpl` gains the same shape as `payDrawImpl`
(refuses `holds less than`); `house payroll` maps it to a
`controller-rejected` note. `remitDemoTaxImpl` is left as is (it runs
after the sale landed and cannot fail the floor). The
`reserve supply` overdraft line and `cachedOverdraftByCurrency` stay as
audit reads and are expected to print zero.

### D4 — The Schedule lives in AppSettings; the reserve's rows are the Governor's

Every row below is a `settings/<prefix>.yaml` entry + an
`AppSettingKeys` constant + a consumer (lint:unconsumed-seams). The
`reserve.*` rows are written by **`reserve set <row> <value>`**
(`requiresGovernor`; refuses a key outside the `reserve.` prefix) — the
independence clause in code: the treasury seat cannot reach them and
`config` stays the operator's code-trust act. The other prefixes stay
on `config` this build (the Minister of Finance *appropriates*, it does not
tune; a `treasury set` is a seam, not a wave).

| row | value | read by |
|---|---|---|
| `reserve.moneyPerActiveMember` | `"2000"` | the perpetual rule (D9) |
| `reserve.windowRatePerYear` | `"0.08"` | window accrual (bank rate 5% + 3) |
| `reserve.haircut` | `"0.20"` | window advance = (1 − h) × principal |
| `reserve.ladder.termsRequired` (N) | `"3"` | rung-1 gate |
| `reserve.ladder.loansRequired` (M) | `"2"` | rung-2 gate |
| `reserve.ladder.workingCapitalCap` | `"5000"` | rung-2 line limit |
| `reserve.repaymentShareMin` / `Max` | `"0.10"` / `"0.50"` | bounds a bank's posted share |
| `reserve.defaultHorizonGameDays` | `"30"` | default revealed on read |
| `reserve.indexBasket` | the two NPC counters, comma-separated | the index (D20) |
| `treasury.arrivalPrincipal` | `"20"` | the Note's principal |
| `treasury.noteDischargeGameDays` | `"30"` | discharge without a wage |
| `treasury.openingAdvance` | `"20000"` | the standing facility (D9) |
| `estate.dormantAfterDays` | `"30"` (real) | D16 |
| `estate.escheatAfterDays` | `"180"` (real) | D16/D17 |
| `employment.absenceVacatesAfterDays` | `"3"` (real) | vacancy + closure (D16) |
| `retail.stockingElasticity` | `"0.5"` | the derived ask (D11/D14) |
| `banking.tillFloat` | `"500"` | the float conversion (D9) |
| `press.indexEditionGameHours` | `"24"` | the `prints` brain |

Retired: `banking.onboardingStipend`, `banking.openingCapital`,
`banking.openingFloat`, `banking.treasuryAccount`. Rates are quoted per
game-year and rendered with the real-month equivalent beside them
(`Terms.describe()` and the dashboard: *"five per cent a game-year —
a real month"*), whole percentages through `GrammarApi.inWords`.

### D5 — The realm root is `/world/terminus`; no city segment

The terminus manifest claims `/world/terminus` itself for `terminus`
(`landUse: civic`); its ten district claims stay as they are (same
holder — the sparse hierarchy derives the parent; `parentParcel:
/world/terminus` is added to each so `childParcelsOf` and the escheat
walk are O(1)). The four world packs re-root **as children**:
`/world/terminus/rejection` → `/world/terminus/rejection`, `/world/terminus/eternal` →
`/world/terminus/eternal`, `/world/terminus/hearthworks` →
`/world/terminus/hearthworks`, `/world/terminus/hearts-delight` →
`/world/terminus/hearts-delight` — `root:` in each `pack.yaml`, every
row path, every cross-reference (280 / 312 / 88 / 28 refs at plan
time; re-census at build with `grep -rn '/world/<x>' packages docs
e2e`), and `parentParcel: /world/terminus` on their top claims.
`/world/lounge` stays a root. `/world/saxonberg` is declared as one
title line in the platform manifest with **no holder** (it resolves to
the platform's maintainers, the executive) and nothing under it.
`/world/newbie-wilds` is untouched.

**The city gets no path segment.** The address is already
`terminus/city/…` and parcel.md is explicit that the address tree does
not mirror the content tree. What is lost: the realm committee and the
city committee are one group (`terminus`) until the Compact subdivides,
and subdividing later costs the ~1,250-ref rename then. That cost is
deferred to the decision that would need it, which the requirements
say is the Compact's, not this build's. `/world/terminus/budget` and
`/world/terminus/hinkley-hills` therefore do not move.

### D6 — The trade premises move into terminus; trade packs keep mechanism

The venue rows (locations, their exits, the counters/Stocks, the
outfit's NPC rows, the outfit's **Business row**) move out of each
trade pack into the terminus pack, at the district the shipped exits
already name (terminus-city.md §§2–3d): the mill and the dyehouse
under `/world/terminus/wharfside/…`; Crowsfoot, the Hollis floor,
Veshko's distillery, the bottling, pantry and brewing floors and the
farm outfit under `/world/terminus/goods-yards/…`; the tailor's shop
under `/world/terminus/mayfield-row/…`; the cash-and-carry's Business
row to `/world/terminus/counting-houses/idea/business` (its counter is
already a terminus boot entry). Instruments, recipes, materials,
classes, brains stay in the trade packs; the venue rows name them by
path (the rejection → trade-forestry precedent: terminus gains
`dependsOn` each trade pack via `package.json`). Every
`parLines[].supplier`, `consigns` config, `operatingLocations`, wire
test and doc that names an old path is re-pointed (census at build:
`/trade/<x>/location` 57+23+11+9+8+8+4+4 refs, plus
`/world/terminus/counting-houses/distributor/idea/business` 46 in the lounge's `business.yaml`
alone). The orphans are claimed: `wharfside`, `goods-yards`,
`infirmary`, `necropolis` → `terminus`; `campus-farm` → the
eternal-university manifest (`/world/terminus/eternal/campus-farm` for
`duncan-hall` — the University's one group today; a `campus` group is
a rename the Compact can make). Each `/trade/<x>` claim's holder becomes
`{organization: /compact/minister-of-trade}` and the `<x>` groups are
deleted from the manifests (their only purpose was the title; the
maintainers group `<id>-maintainers` remains for diagnostics).
`/stuff/*` claims (`generic-objects`, the platform's `/stuff`) also move
to the Board. `/system/<x>` packs are **not** touched — the
requirements name `/trade` and the commons only.

*Why the Business rows move too:* the fault line is liability — the
outfit is the thing that fails on the ground, so it sits under the
committee that can be at fault. A trade pack keeps nothing that is an
instance in the world.

### D7 — Three seats, two organizations, five committees

`OFFICE_APPARATUS` gains `minister-of-finance` ("Minister of Finance",
executive, founder-established), `minister-of-trade` ("Minister of
Trade", executive, founder-established) and `registrar-of-corporations`
("Registrar of Corporations", executive, founder-established) — the
kebab-case key style of `central-bank-governor`; the display names are
`docs/governance/glossary.md`'s. Because a title holder is `group | organization`
and a seat holds ground only through an organization (governance.md §
Seat-held title), the platform pack ships two Organization rows beside
`/compact/executive`: **`/compact/treasury`** (`appointingAuthority:
{office: minister-of-finance}`, one position `clerk` unfilled; it is the Note's
counterparty, the escheat's recipient and the owner of the treasury
account) and **`/compact/trade`** (`appointingAuthority:
{office: minister-of-trade}`; holds `/trade/*` and `/stuff/*`). Both are
`boot:` entries (an organization-held title admits nobody until the
org is resident). The corpo packs each declare `requires.groups:
[{name: <key>-committee, purpose: "…", owner: {office:
registrar-of-corporations}}]`, claim `/corpo/<key>` for that group, and
set the corpo org's `appointingAuthority: {kind: committee, parcel:
/corpo/<key>}`. "Seated through the Registrar's seat" is exactly the
`soul` precedent: the seat owns the group and adds members with the
`group` verb; no code. Seat validators: **`requiresFinanceMinister`** is
added as a sibling of `requiresGovernor` (the validator shape takes no
parameter — governance.md's "generic requires-office validator" wants a
schema change and is left as the deferred seam it already is). The
Board and the Registrar act through title (`canAtPath` admits the
org's authority) and the `group` verb; they need no validator.

### D8 — Walter is staff of an agency; the landlord committee is a player group

The terminus pack ships `/world/terminus/mayfield-row/idea/agency`
("Mayfield Holdings", `/platform/idea/Organization`, position `agent`,
roster slot Walter, `appointingAuthority: {kind: committee, parcel:
/world/terminus/mayfield-row/seznick-house}`). The `mayfield-holdings`
group loses its `members:` line (it stays the seznick-house holder;
founder default until seated). `LeaseController` /
`UnleaseController` gate on `EmploymentApi.holdsPosition(actor,
agency)` **or** `CompactApi.isCommitteeMember(actor, BUILDING_EXTENT)`
instead of `AccessApi.isAgentOf`; Walter's dialogue dispatches are
unchanged. The `isAgentOf` wizard short-circuit is not this build's
(wizard-axis slate).

### D9 — The treasury is an organization's account at the CB; the reserve's two rules; cash genesis is a withdrawal

- The `treasury` account is re-owned: `ensureVenueAccount('/compact/treasury',
  Account.CENTRAL_BANK_INSTITUTION, '', currency)` on first touch; the
  raw `"treasury"` id and `banking.treasuryAccount` go; `remitDemoTax`
  routes to `primaryAccountIdOf('/compact/treasury')`. The DB drops, no
  migration.
- **The perpetual rule** (`BankingLogic.reconcilePerpetualImpl`): target
  = `reserve.moneyPerActiveMember × activeMembers`; outstanding = Σ
  `mint` legs with category `perpetual` (a keyed `bank_ledger` read on
  `toAccount` = the treasury); if outstanding < target, mint the
  difference to the treasury (category `perpetual`, memo the member
  count). Never redeems. Runs on every treasury touch (an appropriation,
  a Note issuance, an opening advance, the dashboard) — observe-first,
  no scheduler. `activeMembers` is `PlayerApi.activeMemberCount()` (D16).
- **The window rule** lives in `ContractLogic.issueLoan` for rung 1
  (D12): after the bank's `advance` leg, `BankingApi.windowAdvance(bank
  account, (1 − h) × principal, contractId)` mints to the bank; each
  repayment the bank receives triggers `BankingApi.windowRepay(bank
  account, share of the advance, contractId)` — a `drain`.
- **Appropriation** — `BankingApi.appropriate(toOwnerKey, amount,
  memo)`: `appropriation` leg treasury → the payee's primary account,
  actor from context; the **`treasury` verb**
  (`platform/cmd/banking/treasury.yaml`, validators `requiresAnimate` +
  `requiresFinanceMinister`, afforded beside `reserve` in
  `lib/shell/Author.ts:117`): bare → the treasury's account, the
  perpetual outstanding, unclaimed property held, opening advances
  outstanding; `treasury appropriate <amount> to <business|player>`.
  Refuses below balance (the floor).
- **The standing facility.** `ensureVenueAccountImpl` mints nothing.
  Instead, `EmploymentLogic.operatingAccountOfImpl` — after the account
  exists and only when it has no ledger history — asks
  `ContractApi.openingAdvance(business)`: a `loan` row (issuer = the
  business, holder = the treasury, rate 0, share = the bank's posted
  share, security `{kind: account}`, no discharge) funded by an
  `advance` leg treasury → business of `treasury.openingAdvance`,
  refused (with a diagnostic, not a throw) when the treasury cannot
  cover it. Uniform for NPC and player businesses; the ledger says who
  got what.
- **The emergency override stays, and it is the ONE hand-typed number
  left.** `reserve override <amount> to <business|player> "<reason>"`
  — a `mint` (category `override`, memo = the reason, actor = the
  officer from context) the ledger records as the officer's act; the
  dashboard prints overrides outstanding as its own line and the
  faucet lint allowlists exactly this call site beside the two rules.
  The requirements' test — *could a member read the Schedule and
  predict it?* No → the officer did it and the record says so.
- **`reserve mint` and `reserve issue` are deleted.** Cash genesis is
  `BankingApi.disburse(accountId, into, amount, category)`: a
  `withdraw` leg from a real account to `CASH_BRIDGE` plus the coin
  clone that `issueCashImpl` does today — supply-neutral, floor-checked.
  Its two consumers: the Note's principal (treasury → the new player's
  hands, category `arrival`) and the bank's **till float** — a bank
  converts `min(banking.tillFloat, its own balance)` of its operating
  balance into vault coin on the first `openAccount` at a branch
  (`seedFloatImpl` becomes this; a bank with no balance has an empty
  till until its opening advance or fees arrive, which is honest).
  `issueCash` survives only for the banking test harness and is on the
  faucet lint's allowlist by file.

### D10 — The Arrival Note

At `EmbodyController.commit` (the renamed `enroll confirm` → `embody confirm`, W0) step 5c, instead of `issueCash`:
`ContractApi.issueNote(avatar)` → a `note` row (issuer = the player,
holder = `/compact/treasury`, `principalMinor =
treasury.arrivalPrincipal`, rate 0, share 0,
`dischargeOnFirstWage: true`, `dischargeAfterGameDays =
treasury.noteDischargeGameDays`, security `{kind: account}`), then
`BankingApi.disburse(treasury, avatar, principal, 'arrival')`, then
the paper is **filed, not carried**: a new closed document kind
**`instrument`** (`lib/document/DocumentKinds.ts` — a platform edit, on
the `water-right` pattern: path-keyed, `contentDir: 'papers'`, `ext:
'yaml'`, `onVanish: 'keep'`) written by `ContractApi` through
`DocumentApi` as the system at `/home/<identity key>/papers/arrival-note`
— the terms in words, the contract id, the date, and an appended
`discharged`/`recovered` line when that happens. Every loan files the
same way under the borrower's branch and the lender's (`house book` /
`bank book` list the branch's `papers/`). The document is the readable
record; the contract row is the live claim. No Thing, no NPC: the
commit frame says *"The Treasury has advanced you twenty zorkmids
against your note; it is filed in your papers."* Discharge fires from
`payWageImpl` (the wage landing calls `ContractApi.onWageLanded(workerKey)`,
which discharges any open note of that issuer, appends `discharged` to
the row and the paper, and tells the player if resident) or lazily from
`dischargeAfterGameDays` on any touch. Bare `wallet` gains a line per open instrument the wallet's
owner issues or holds (`ContractApi.instrumentsOf(owner)`): *"You hold
an Arrival Note for twenty zorkmids, at no interest, to the
treasury."* The chronicle records the signing once
(`recordChronicleOnce('economy:note:signed', …)`) and `finance` is
credited (D21). **Katie is untouched** — the Note is a meta instrument
between a member and the Compact's Treasury; no character in the
fiction hands it over.

### D11 — Rung 0 is a listing whose basis is `terms`

`ConsignmentListing` gains `basis: "consignment" | "terms"` (default
`consignment`). `Stock` gains an authorable `purchasing: "consignment"
| "terms"` (default `consignment`, the counter's policy for what it
accepts). `consign` at a `terms` counter records `basis: terms` and
reads the `--ask` as the supplier's **price** (what it is owed at
sale); the shop's ask for the good is the counter's `priceFor(template)`
(D14). At `buy` of a terms good: `settleSale` posts the full ask to the
shop (`sales`), then a second post `payment` shop → supplier's primary
of `askMinor` with category `terms` (the shop's P&L reads it as `cogs`
through the existing payer-side rule; the supplier's as `sales`), then
`transferChattel(buyer)`. Two posts, one command, each conserving — the
`remitDemoTax` precedent. `look` at a terms good appends *"held on the
farm outfit's terms until sold"* (the listing's consignor name, via
`Stock.getLong`'s per-item line). The shop's book — **`house book`** —
lists terms payable per supplier (Σ `askMinor` over unsold terms
listings by consignor), open loans with creditor and balance, and
payroll arrears. `reclaim` widens to admit an **organization** owner
acting through the house (`activeHouse(giver)` as in
`ConsignController`), so a supplier outfit's hand can take back an
unpaid crate — the rung-0 repossession, a query over `chattelOwner()`.
The rung-1 gate's "no repossession" is read as no `defaulted` loan
event (D12): at rung 0 nothing is owed until sale, so a supplier
reclaiming unsold goods is its choice, not the shop's failure. **The
build records this reading in the MR description for the user's eye.**

### D12 — Rungs 1 and 2: borrow at a chartered bank; window automatic; default revealed

- `bank borrow <amount> [--for stock|wages]` (a `bank` subcommand,
  afforded by the counter): the borrower is the house the giver acts
  for (`activeHouse` or `businessOfProprietor`); the lender is the
  counter's bank; `ContractApi.issueLoan({borrower, lender, principal,
  rung})`. Gate reads, all ledger/contract counts: rung 1 requires
  `completedTerms(borrower) ≥ N` (Σ `payment` legs with category `terms`
  where `fromAccount` is the borrower's) and `defaultedLoans(borrower)
  = 0`; rung 2 requires `settledLoans(borrower, rung 1) ≥ M` and none
  defaulted. A refusal names the number: *"three completed terms are
  required; you have one."* — `controller-rejected` with `reason:
  'ladder-gate'` and the counts in `detail`.
- Rung 1: `advance` leg bank → borrower of `principal`; the bank must
  hold the haircut share (solvency refusal otherwise); then the window
  mints `(1 − h) × principal` to the bank (category `window`). Security
  `{kind: inventory, counterPath}` = the borrower's counter(s) from
  `operatingLocations` that are Stocks. Rung 2 (`--for wages`, or the
  wage path in D18): from the bank's own balance only; security `none`;
  bounded by `reserve.ladder.workingCapitalCap` minus drawn.
- **Accrual** is stamp-forward on every touch of the row:
  `owed *= (1 + r)^(Δgame-years)` (continuous-compounding approximation,
  integer minor units, a unit test pins the outcomes). Bank rate =
  the counter's `terms.loanRatePerGameYear` (D13); a note's is 0.
- **The share** is taken at `settle`: `BankingLogic.settleImpl` asks
  `ContractApi.repaymentSplitsFor(payeeAccountId, netAmount)` for the
  payee's open loans (holder ≠ payee, oldest first) and appends
  `RemittanceSplit{accountId: creditor primary, amount: share ×
  amount, category: 'repayment'}` (+ an `interest` split when accrued
  interest exists). One transaction, conserving. The share is the
  bank's posted `terms.repaymentShare` clamped to the reserve's bounds.
  After the transaction, `ContractApi.recordRepayment(contractId,
  amount, txId)` reduces `owedMinor`, appends `repaid`, and — for a
  window-funded loan — `BankingApi.windowRepay` drains the reserve's
  pro-rata share from the bank. `settled` + `escrowClose`-style cleanup
  when `owedMinor` hits zero; the lien releases (event `settled`; the
  bank's `bank book` reads *"lien released"*).
- **Default is revealed on read**: `ContractApi.reconcileLoans(borrower
  | all open)` marks a loan `defaulted` when `lastInflowAt(borrower
  account)` (a keyed `bank_ledger` read on `toAccount`, newest) is older
  than `reserve.defaultHorizonGameDays` while `owedMinor > 0`. Touches:
  every `bank borrow`, `bank book`, `house book`, the reserve
  dashboard, and the `stocks` beat. On default the creditor's rule acts
  (NPC banks are all there are): **repossession** = every good on the
  security counter whose `chattelOwner()` is the borrower is
  `transferChattel(bank)`'d and moved to the bank's counter (the
  `BankCounter` is a Container); event `repossessed`; the window row is
  marked (a `defaulted` event on the loan carries `windowAdvanceMinor`)
  and the reserve's **default rate** = Σ defaulted window advances / Σ
  window advances over open + closed loans since boot — the dashboard's
  second number. The advance itself is not reversed: that is the
  faucet the requirements describe.

### D13 — Rates are Terms

`TermsData` gains `loanRatePerGameYear?` and `repaymentShare?`; Goodkin
authors `loanRatePerGameYear: 0.05`, `repaymentShare: 0.25`
(`bank-counter.yaml`). A counter with no rate does not lend (refusal
`no-lending-terms`). `Terms.describe()` renders them in words with the
real-month equivalent. There is no benchmark object anywhere.

### D14 — The stocking rule: supplied lines are bought; unsupplied lines are imports

`StockLine` gains `supplier?: string` (a Business path) and `pricing?:
"fixed" | "stocking"` (default `fixed`). **`Stock.reset()` clones only
lines with no `supplier`** — the import faucet (goods from nothing,
never money; the malt sack and the general store's staples nobody
produces). `Stock.priceFor(key)` overrides `PricedOfferMixin.priceFor`:
for a `stocking` line, `round(prices[key] × (1 + e × (1 −
onHand/par)))` with `e = retail.stockingElasticity` (empty shelf → base
× 1.5; at par → base; over par → cheaper) — the market-maker's ask,
derived on read, an offer never an oracle; a `fixed` line returns the
authored price (a player shop sets its own with **`house price <thing>
<ask>`**). `Business.stockSheetFor` unions the operated Stocks'
supplied `stockLines` as `count` lines (`exemplar = itemTemplatePath`,
`supplier = line.supplier`) so one read serves the keeper. A new
kernel brain **`lib/behavior/stocks.ts`** (the keeper who stocks the
counter): on cadence, for each short supplied line, walk to the
supplier's counter (the `consigns` route code, factored onto a shared
module-private helper inside `lib/behavior/` only if both brains can
import it without a new free export — else duplicated and noted),
`wallet use house`, and `buy` up to the shortfall; before buying, if
the house balance is short, walk to the bank and `bank borrow
<shortfall> --for stock`; carry the goods home and `put <good> on
<counter>`. Every step is the LITERAL verb through `forceCommand`.
`consigns` gains `basis?: "consignment" | "terms"` in its config and,
under `terms`, reads the host counter's `par − onHand` for the good as
its headroom instead of the listing cap. The general store's keeper
(`/world/terminus/general-store/agent/keeper`) gets `stocks` at
`cadence:90s`; the general store's counter marks ≥ 2 lines `supplier`
(the build picks the two whose producing outfit ships a matching
census key — candidates: the pantry outfit's ration, the tailor's
sewing kit, the mill's grist; verified at build against the outfits'
`stockLines`/spawn candidates) and `pricing: stocking` on every line;
the cash-and-carry's counter sets `purchasing: terms` and `pricing:
stocking`; the farm hand's `consigns` gains `basis: terms`. Keepers and
hands that must run with nobody online are **`boot:` entries** of
their packs (`role: producer`, the cash-and-carry precedent) — a brain
on an unspawned NPC never fires.

### D15 — A player shop is a rented market stall

The terminus pack ships `src/market/thing/MarketStalls.ts extends
Stock` (a pack class so the affordance is a static on a class) whose
`commandContributions.environment` affords **`stall`**
(`content/world/terminus/market/cmd/stall.yaml`, controller
`src/market/idea/cmd/StallController.ts`): `stall rent` mints, for the
giver, a `Stock` keyed `(scope: /world/terminus/market/thing/stall,
key: <identity path>)` via `PersistableApi.standUpKeyed` placed in the
square, and a Business keyed `(scope: /platform/idea/Business/stall,
key: <identity path>)` from a new platform seed row
`/platform/idea/Business/stall` (positions `[keeper {purchases:
true}]`, `appointingAuthority` set at mint to `{entity: <identity
path>}`, `banksAt` = the bank of the giver's primary account — refused
`no-bank` without one, `operatingLocations` = the minted counter's
identity path). `stall give-up` returns the goods and retires both.
**`Business.getAccountPath()` becomes `getIdentityPath()`** (falls back
to the template path for every content row — the CLAUDE.md rule).
`ensureOperatorAt`'s operator index matches identity paths for minted
instances. Rent is a `payment` to the market's Business on `rent`
(`market.stallRentMinor`, a terminus setting? — no: a field on the
`MarketStalls` row, `rentMinor`, content not a Schedule row). The stall
composes `purchasing: terms` by default. This is the requirements'
"open a player shop" and it is the minimum that makes rungs 0–2
reachable by a player; retail S4's franchising and frontage stay
deferred.

### D16 — The three states derive from the snapshot's write time

`PersistedRecord` gains `writtenAt: number` (epoch ms, persistent,
stamped by `PersistableLogic` on every capture). For an Avatar the last
capture is its logout/linkdead save, so `writtenAt` IS `lastSeen`
without inspecting the opaque `state` — and a resident, connected
avatar is active by definition. `PlayerApi.estateStateOf(identityPath):
Promise<'active' | 'dormant' | 'escheated'>` (`lib/character/Estate.ts`
holds the `ESTATE_STATES` tuple + type; `PlayerLogic` the read):
resident with an interactive → active; else the avatar-seed-scoped
`holder_snapshots` row's `writtenAt` against `estate.dormantAfterDays`
/ `estate.escheatAfterDays`; no row → active (never played).
`PlayerApi.activeMemberCount()` = a count query on the same scope with
`writtenAt > cutoff` plus the online set. `PlayerApi.absentForDays(key)`
serves the short clock. **Login lifts dormancy** (the capture at login
stamps `writtenAt`); what dormancy did stays done and is reclaimable by
ordinary acts. The reads:

- **account freeze** — `BankingLogic` refuses `withdraw`, `transfer`,
  `payDraw` and `settle` when the paying account's owner is dormant
  (a live actor is never dormant, so in practice this bites a linked
  house account whose business is closed — below); credits always land.
- **position vacancy** — `EmploymentLogic.holdersByPositionImpl` (the
  one holder-resolution path) treats an Avatar holder absent past
  `employment.absenceVacatesAfterDays` as not holding, flips the record
  to the new status **`vacated`** (counts as an exit — never
  resurrected by the roster), unlinks the house account; the roster tick
  calls the same path. NPC holders are never absent.
- **business closure** — `business.isClosed()`: every principal who
  could run it (the `entity` authority if an Avatar, every Avatar
  position holder) is absent past the short clock and no NPC holds a
  position; NPC-run businesses never close. `AttendantMixin` answers
  `closed` for a closed business's counters; `ensureOperatorAt` still
  stands it up (the sign is a state, not an absence); the roster tick
  runs no shifts for it; its account refuses outflows; `reclaim` works.
- **`house roster`** — a new subcommand: positions, holders, on-shift,
  `vacant`.
- **the estate touch** — `PlayerApi.touchEstate(identityPath)` runs at
  login, at every credit landing on a player's primary account
  (`payWage`, `settle` payee, `escrowRelease`, `appropriate`), and at
  the roster tick per Avatar assignee; when the state is `escheated`
  and `Avatar.escheatedAt = 0`, it executes D17.

### D17 — Escheat: debts first, then situs up the title tree

`PlayerLogic.escheatImpl(identityPath)` (the avatar is materialized for
the act — the existing roster path): (1) `ContractApi.reconcileLoans`
for the person's businesses and their liens repossess; (2) the open
note is **recovered**: `escheat` leg of `min(balance, principal)` from
the primary account to the treasury, event `recovered`, the paper
appended; (3) player-held parcels (`ParcelApi.extentsHeldBy({kind:
player})`) `transfer` to the **parent parcel's owner**
(`coveringParcelOf(parent)`; the realm root's parent is `/world` → the
executive), event stamped `escheat`; the nightly reprovision never
re-grants a player title, so nothing reverts; (4) use-grants
(`heldUnitsOf(identityPath)`) are revoked — the dorm and a let unit go
to their institution (the residence pack's `unprovision` is content,
so the kernel revokes the grant and fires `onUseGrantRevoked` — a new
`@hook` on the parcel's Zone with a no-op terminal — which the dorm
class overrides to evict furnishings the way `unprovision` does);
(5) a business the person is `entity` authority of: its shelf stock and
premises are already the locality's by title (the stall's minted rows
are retired and its goods moved to the market's own shelf), its account
`escheat`s to the state; (6) the remaining balance moves by an `escheat`
leg to the treasury and an **`unclaimed`** contract row is written
(issuer = the treasury, holder = the player, `owedMinor` = the amount,
rate 0) — reclaimable forever; (7) `Avatar.escheatedAt = now`. If the
Avatar names a **beneficiary** (`Avatar.beneficiary`, an identity path,
set by `wallet beneficiary <player>`), steps 3–6 pass to them instead
of the treasury unless they are themselves dormant (chains onward; a
`repayment` leg to the beneficiary's primary account replaces the
unclaimed row). On login, an escheated avatar's `touchEstate` runs
**reclaim**: every `unclaimed` row it holds is paid by a `repayment`
leg treasury → primary (the treasury cannot refuse: the floor is met
by the perpetual rule reconciling first), `escheatedAt` cleared, a
scene says the treasury paid. **Chattel lying in the world is
finders-keepers** (re-stamping it would need a registry-wide read
`lint:world-scan` forbids; the locality's option is a slate). **Pets
and livestock are not escheated by this build** — the pound keeper is
institutions-slate Part 5 and a bonded animal's transfer needs the
pets substrate's consent model; recorded as a deferred seam and flagged
in the handoff.

### D18 — The wage refusal

`settleShiftWageImpl` (and `house payroll`): if the business balance is
short, `ContractApi.drawWorkingCapital(business, shortfall)` — succeeds
only where the rung-2 gate holds (M repaid inventory loans, none
defaulted) and the line has headroom, posting an `advance` from the
business's bank's own balance; then `payWage`. If no line, the wage is
**not posted**: the Business appends `{workerKey, amountMinor, at}` to
`payrollArrears` (persistent), the proprietor (if resident) gets a
scene *"Payroll refused: the house holds twelve zorkmids and owes Mara
twenty; no working-capital line — two repaid inventory loans are
required, you have none"*, `house book` and `house pnl` print the
arrears, and the next settlement (any path) pays arrears first. The
worker is the creditor by name — no account goes negative without one.

### D19 — Chartered is a field

`BusinessMixin.charter: string[]` (persistent, authorable; closed
vocabulary `CHARTERS = ['bank'] as const` in `Business.ts`, validated
at the setter with `includes`) — Goodkin's counting-houses Business
authors `charter: [bank]`. `ContractApi.issueLoan` and
`BankingApi.windowAdvance` refuse a lender whose Business lacks it
(`not-chartered`). Deposits are not gated this build (only Goodkin has
a counter). Host: every Business may be chartered; empty means nothing.

### D20 — The index and the Gazette

`BankingApi.priceIndex(): {basis: number, ratio: number, lines}` reads
the counters named in `reserve.indexBasket`, and for each `stocking`
line divides `priceFor(key)` by the authored base `prices[key]`; the
index is the mean ratio, printed as a whole-number percentage of base
(a hundred is par). The reserve dashboard prints it. The Gazette: the
terminus pack ships `/world/terminus/gazette` (an Organization with
`PublisherMixin` fields — `realm: world`, `visibility: public`,
`feedPath: /world/terminus/gazette/feed`, position `editor`,
`publishingPositions: [editor]`, `appointingAuthority: {committee:
/world/terminus}`), an editor NPC on its roster (a `boot:` entry), and
the kernel brain **`lib/behavior/prints.ts`** on the editor: on
`cadence` (real; the row sets `cadence:2m`, the brain skips unless
`press.indexEditionGameHours` of game time have passed since its last
edition, remembered on the host), reads `BankingApi.priceIndex()` and
runs `press post "Prices: the basket stands at one hundred and four
against the base" --as /world/terminus/gazette --kind notice` as the
editor. `press.frontPage` gains the Gazette. Nothing new in the press
substrate.

### D21 — The `finance` Discipline

A row `Discipline/finance.yaml` (`key: finance`, `channel: knowledge`,
`iscedf: "0412"`, `label: Finance, banking and insurance`, `specializes:
[business-admin-law]`, description). Credited (`creditDeed`,
`difficulty: routine`, on the giver, narrowed by `isAdvancing`) at:
signing the Note, `bank borrow` (granted or refused — the refusal is
the lesson), a bank's officer approving (the NPC path credits nobody),
presenting paper (the rule's act credits nobody), `house book` / `bank
book` (reading a book), `wallet beneficiary`. The build adds the key to
`lint:dossiers`'s shipped set automatically (it reads rows).

### D22 — The two lints

`scripts/check-committees-are-players.ts` → `lint:committees-are-players`:
reads every `packages/content/*/pack.yaml`; for every `requires.title[]`
with a `{group}` holder, that group's `requires.groups[]` entry must
list no `members[]` whose id is under an `/agent/` segment. Census on
master: **1** (Walter). Ceiling 1 at W3, 0 after W2 lands (W2 precedes
W3 so it ships at 0 with a fixture that proves it fires).
`scripts/check-no-authored-faucet.ts` → `lint:no-authored-faucet`:
counts (a) content keys `openingCapital:` in any row (0 today), (b) the
settings keys `banking.openingCapital`, `banking.onboardingStipend`,
`banking.openingFloat` in `settings/*.yaml` (3), (c) code call sites of
`postTransaction("mint"` / `BankingApi.mint(` / `issueCash(` /
`.float(` outside an allowlist by file+function (the perpetual rule,
the window rule, `reserve override`, the banking test harness) — today: `ensureVenueAccountImpl`,
`ensureCorpoTreasuryImpl`, `seedFloatImpl`, `issueCashImpl` callers
(`EmbodyController`, `ReserveController` ×2), `float`, `mint` = **9**.
Ceiling = the census at W3; W6 drives it to 0; the gate then holds 0.
Both follow `check-lib-statics.ts` (a `CEILING` that may fall, a test
asserting *at or below, and fires on a fixture*).

### D23 — NPCs are never absent

An NPC holder never vacates, an NPC-run business never closes, an NPC
proprietor never escheats. Every estate read narrows on
`PlayerApi.isAvatarStuff` / an Avatar identity path before consulting
the snapshot, exactly as the committee arm of `holdsAuthority` does.

### D24 — The drive is a dirty wire file

`packages/wire/tests/economic-bootstrap.dirty.wire.test.ts`
(`DIRTY_REASON`: it creates characters, spends the general store's
supplied line, moves the Governor's rows, and escheats an estate). It
opens one `wizard: true` session for `config` and one founder-shaped
session for `reserve`/`treasury` (the founder holds every seat by
default), sets the Schedule rows low (`estate.dormantAfterDays
0.00005`, `estate.escheatAfterDays 0.0001`,
`employment.absenceVacatesAfterDays 0.00005`,
`reserve.defaultHorizonGameDays 0.001`, `reserve.ladder.termsRequired
1`, `reserve.ladder.loansRequired 1`, `press.indexEditionGameHours
0.01`) and restores them at the end. See Test & gate strategy for the
step-by-step and what only the browser can prove.

---

## ⭐⭐ Host placement

| new thing | host | what composing/adding it claims |
|---|---|---|
| `kind`, `holder`, `terms`, `owedMinor`, `owedStampS` | `ContractRecord` (a Document, not a Stuff) | every contract may carry a creditor and an accrual; a gig leaves them null. No mixin; no guard. |
| `ContractParty.kind += organization` | the party value | the treasury and any Organization can be a party; `holdsFor` never reads a party kind. |
| `LEDGER_KINDS += advance repayment appropriation escheat` | `LedgerEntry.ts` | four standalone movements; each real→real; `assertLegKind` exhaustive. |
| `charter: string[]` | `BusinessMixin` (`platform/idea/Business.ts`) | any business may hold a charter; empty by default; only lending reads it. No re-narrowing guard anywhere. |
| `payrollArrears[]` | `BusinessMixin` | the payer owes; every Business can. |
| `loanRatePerGameYear?`, `repaymentShare?` | `TermsData` on the `BankMixin` counter | a bank's standing offer lives with its fees — the requirements' own sentence. |
| `basis` | `ConsignmentListing` (record on `ConsignmentShelfMixin`) | every shelf listing has a basis; `HeldGoodsMixin` (the coat check) does not see it. |
| `purchasing` | `Stock` (`platform/thing/Stock.ts`) | the counter's policy; the market stalls, the cash-and-carry and the general store are Stocks; `CheckRack` is not touched. |
| `supplier?`, `pricing?` on `StockLine` | `Stock.stockLines` (data) | per line; a line without a supplier is an import. |
| `Stock.priceFor` override | `Stock` | Menu/Tariff keep `PricedOfferMixin.priceFor` unchanged. |
| the `instrument` document kind | `lib/document/DocumentKinds.ts` (closed vocabulary; platform edit) | path-keyed under the owner's branch, `onVanish: keep` — the `water-right` / `bill-of-lading` pattern; written only by `ContractApi` as the system. |
| `escheatedAt`, `beneficiary` | `Avatar` | players only — the only host with an estate. |
| `ESTATE_STATES` | `lib/character/Estate.ts` (vocabulary module) | a tuple + type; no statics (lib-statics ratchet). |
| `EMPLOYMENT_STATUSES += vacated` | `lib/employment/Employment.ts` | an exit status; `holdersByPositionImpl` treats it as `quit`. |
| `writtenAt` | `PersistedRecord` | every snapshot records when it was written; only the estate read interprets it as presence, and only for the avatar scope. |
| `onUseGrantRevoked` `@hook` | `Zone` (the parcel's backing zone) | a no-op terminal like `onDestruct`; the dorm class overrides. |
| offices ×3 | `OFFICE_APPARATUS` | code constant; the roster test updates. |
| `/compact/treasury`, `/compact/trade` | platform Organization rows | `/platform/idea/Organization` — no class. |
| `agency`, `gazette` orgs, editor NPC, `MarketStalls` class, `StallController` | terminus pack (`content/…`, `src/market/…`) | pack content + one pack class + one pack controller; the pack already ships `src/`. |
| `stocks`, `prints` brains | `lib/behavior/` (kernel) | kernel-generic: any keeper, any paper. |
| `requiresFinanceMinister` | `lib/command/validators/` | a sibling of `requiresGovernor`. |
| `treasury` verb, `bank borrow/book`, `house book/price/roster`, `reserve set`, `wallet beneficiary`, `stall` | views in `platform/cmd/banking/` (+ `market/cmd/stall.yaml`) | subcommands on existing dispatch verbs wherever one exists; `treasury` and `stall` are the two new verbs (`lint:verb-collisions` checked: none). |

**No new mixin is introduced.** That is deliberate: every capability
here is a field on the host that already owns the concern, or a
record. The test — "would a guard re-narrow the host set?" — was run
on `charter` (no: an empty list claims nothing), on `payrollArrears`
(no), on `escheatedAt` (Avatar only), and on the estate reads (they
narrow on *Avatar* because only Avatars have estates — that is the host
set, not a re-narrowing).

---

## Convention conformance

Checked at plan time against the tree, not recalled:

- **`props:` / `cast:`** — new rows use `props:` for fixtures and
  `cast:` for NPCs (the general-store and counting-houses rows are the
  exemplars); `populates:` is retired.
- **Locations, not rooms** — the moved premises are
  `CartesianLocation` rows (their existing classes); no `Room`.
- **The five axes / `<root>/<branch>/`** — platform rows at
  `/platform/<branch>/…` (`/platform/idea/Business/stall`, `/compact/*` orgs on the document
  axis's existing `/compact` claim — the `/compact/press` precedent);
  terminus rows under `/world/terminus/<district>/<branch>/…`; the
  pack controller at `/world/terminus/market/idea/cmd/StallController`,
  its view at `/world/terminus/market/cmd/stall`.
- **Module scope declares; lifecycles initialize** — brains export a
  named class expression; the perpetual rule runs on touch; no
  module-scope statement; the two new Api tails are the sanctioned
  `decorateApiClass` (none are new Apis — every static lands on
  `BankingApi`, `ContractApi`, `PlayerApi`).
- **Import boundary** — terminus `src/` imports the kernel by
  `@saxonberg/server/…` specifier only; no pack imports another pack's
  `src/`; no fs/path in `mud/`.
- **Module categories** — no new Api, no logic singleton, no free
  helper. The one temptation is a shared "walk to a counter" routine
  for `stocks`/`consigns`: it is folded onto a **`Mobile` instance
  method** (`walkTo(targetPath, network)` on the host — a verb on the
  object) if the build finds the `consigns` route code is host-shaped;
  otherwise duplicated inside the brain with a note. **Never a
  `lib/behavior/util.ts`.**
- **Verbs on objects** — `business.isClosed()`, `business.stockSheetFor`,
  `stock.priceFor`, `avatar.estateState()` are instance methods;
  orchestration (`appropriate`, `issueLoan`, `escheat`) is Api.
  `lint:object-verbs` stays at 0.
- **A PERSON keys on `getIdentityPath()`** — every party, owner,
  account and estate key; `Business.getAccountPath()` moves to
  `getIdentityPath()` for exactly this reason (D15). `lint:person-keys`.
- **No new `isWizard`** — the seats are `requiresGovernor`,
  `requiresFinanceMinister`, title and positions; `isAgentOf` is untouched.
- **`Api.boot()` is an operator act** — the perpetual rule and the
  loan reconcile are derive-on-touch; the Gazette editor and the
  keepers are boot-pinned rows; nothing warms from an Api.
- **A reference row is inert unless warmed** — `/compact/treasury`
  and `/compact/trade` are `boot:` entries; `Discipline/finance`
  is read by the catalogue the way the other 30 are.
- **A verb affordance is a static on a class** — `stall` rides
  `MarketStalls`; `treasury` rides `AuthorMixin` beside `reserve`; the
  rest are subcommands.
- **A bound arg is `MqlOneResult`** — `treasury appropriate … to
  <target>` and `wallet beneficiary <player>` bind objects; the
  controllers read `.stuff`.
- **`args[].requires` names what the targets compose** — `to <target>`
  requires nothing beyond `scope: online|reachable` (a Business is an
  Idea, resolved by keyword through the existing `job post --business`
  shape: the build reuses that resolver rather than a `requires`).
- **No new collection; no migration** — every new field is on
  `contracts`, `bank_ledger`, `bank_accounts` (none), `holder_snapshots`
  (`writtenAt`); the DB drops at W0 and W6.
- **`lint:lib-statics` ratchet** — `CHARTERS`, `ESTATE_STATES`,
  `CONTRACT_KINDS` are tuples; no value-object statics.

**Gates this build must pass** (all of `lint:family`, and these are
the ones it will actually exercise): `lint:schema` (contracts,
bank_ledger docs), `lint:untitled` (W0/W1), `lint:instanceable`
(`Note`, the stall seed, the moved rows), `lint:mixin-names` (none
added), `lint:lib-statics`, `lint:person-keys`, `lint:object-verbs`,
`lint:verb-collisions` (`treasury`, `stall`), `lint:arg-kinds`,
`lint:binder-models`, `lint:unconsumed-seams` (19 new settings keys),
`lint:test-content`, `lint:drive-scripts`, `lint:module-scope`,
`lint:imports`, `lint:capabilities`, `lint:dossiers` (the `finance`
key), plus the two new ones. `pnpm test` runs exactly twice: before the
MR and at `/finalize`.

---

## Waves

Each wave ends at one commit `build(economic-bootstrap W<n>): …`, is
green on `pnpm test:near` + every touched pack's vitest +
`lint:family`, and leaves the world bootable. W0 and W6 drop the dev
DB (`pnpm reset:db` — a row move and the treasury re-owning; no
migration).

### W0 — The realm root and the re-rooted world packs (D5)

- `packages/content/terminus/pack.yaml`: add `{extent: /world/terminus,
  holder: {group: terminus}, landUse: civic}`; add `parentParcel:
  /world/terminus` to the ten district claims.
- `packages/content/{rejection,eternal-university,hearthworks,hearts-delight}/pack.yaml`
  `root:` → `/world/terminus/<x>`; every `content/world/<x>/…` directory
  moves to `content/world/terminus/<x>/…`; every path string inside
  rows, `src/`, tests, `packages/wire/tests`, `e2e/`, `docs/` (a
  `grep -rn '/world/(rejection|eternal|hearthworks|hearts-delight)'`
  census, then a scripted rewrite, then the census again = 0); the
  class-file resolution is by longest prefix so `src/` needs no move.
  Top claims gain `parentParcel: /world/terminus`.
- `packages/content/platform/pack.yaml`: `{extent: /world/saxonberg}`
  (no holder), one comment line.
- **The `enroll` → `embody` rename** (the word was the char-gen build's,
  and the University has a real enrollment at Duncan Hall): the view
  `cmd/charactergen/enroll.yaml` → `embody.yaml` (`verbs: [embody]`,
  help rewritten: *take a body — the first embodiment; `reembody` is
  the shade's*), `EnrollController` →
  `EmbodyController`, `EnrollmentDraft` → `CharacterDraft`, `EnrollModel`
  → `EmbodyModel`, every test, the wire harness's character-creation
  path, the client's char-gen phase strings, `docs/subsystems/char-gen.md`
  and every doc that names the verb (census: 40 code files, 64 docs at
  plan time; `grep -rniw 'enroll\|enrollment\|enrolls' packages docs` →
  only `enrollCircle` and the Circle's prose remain — a real
  enrollment). No compat alias.
- Acceptance: `lint:untitled` 0; `pnpm -C packages/content/<each> test`
  green; boot on a dropped DB shows every re-rooted pack `applied` with
  no `title conflict`; `committee` at `/world/terminus/rejection/…`
  names `rejection`; at `/world/terminus/wharfside` names — nothing yet
  (W1). Wire `platform-smoke` + `world-scan` green.
- Commit: `build(economic-bootstrap W0): /world/terminus is the realm root; four world packs re-root under it; enroll is embody`.

**W0 — DONE.** Census 224/142/70/30 refs → 0, one scripted rewrite over
`world/(rejection|eternal|hearthworks|hearts-delight)` (slash-less forms
included: `join()` fragments and one regex-escaped `\/world\/hearthworks`
were the three misses the packs' suites caught). What surprised: **the
hearthworks pack's `SealedCellar` lived in the KERNEL** at
`mud/world/hearthworks/SealedCellar.ts` (class path `/world/hearthworks/…`,
resolved from the kernel tree because the pack shipped no `src/`); under
`/world/terminus/hearthworks/…` that path resolves into the terminus
pack's `src/` and fails, so the class moved into the hearthworks pack as
`src/location/SealedCellar.ts` (the pack is now a capability pack with
its own vitest; the kernel integration test composes the same shape
locally). `/world/saxonberg` is a holder-less title line (the `/world`
precedent; a manifest holder is optional, a registry holder is not — the
executive fills it). Hinkley gained `parentParcel: /world/terminus` too.
`enroll` → `embody` landed in 26 code files + 28 docs; the University's
real enrollment (Katie, the Circle, `enrollCircle`, "enrolled at the
University" as an aspiration) is untouched by construction. Boot on a
dropped DB: every pack `applied`, 0 conflicts; platform-smoke, world-scan
and forestry wires green (forestry 15/15 alone after a prose-timing miss
in the three-file run).

### W1 — The trade premises into the world; the orphans (D6)

- terminus `package.json` gains `dependsOn` for each trade pack whose
  rows it now names; `pack.yaml` claims `wharfside`, `goods-yards`,
  `infirmary`, `necropolis` for `terminus`; eternal-university claims
  `/world/terminus/eternal/campus-farm` for `duncan-hall`.
- Move (with `git mv`, path-rewritten): textiles `location/mill` +
  `idea/mill` + its stocks/NPCs → `terminus/content/world/terminus/wharfside/mill/…`;
  dyeing `location/dyehouse` + `idea/dyehouse` → `wharfside/dyehouse/…`;
  distilling `crowsfoot-floor`, `hollis-floor`, `veshko-yard` (+ the
  three outfit Business rows) → `goods-yards/{crowsfoot,hollis,veshko}/…`;
  bottling/cooking/brewing floors + outfits → `goods-yards/{bottling,pantry,brewing}/…`;
  farming `location/farm` + `farm-outfit` + `farm-stock` + `farm-hand` →
  `goods-yards/farm/…`; tailoring `location/shop` + `tailor-shop` →
  `mayfield-row/tailor/…`; distribution `idea/business` →
  `counting-houses/idea/business` (its counter row moves with it under
  `counting-houses/thing/counter`; the boot entry follows).
  `wharfside/bank.yaml`, `goods-yards/yard.yaml`, `mayfield-row/street.yaml`
  exits re-point; every `parLines[].supplier`, `consigns.config.{stock,shelf}`,
  `businessPath`, `operatingLocations`, `container:` re-point.
- Each trade pack's `pack.yaml`: title holder → `{organization:
  /compact/minister-of-trade}` **only after W2** — so in W1 the holder
  stays the trade group and W2 flips it (W1 is landable alone).
- Acceptance: the coverage gate passes for terminus and every trade
  pack; `lint:untitled` 0; each trade pack's own vitest green
  (rows they tested by path now live in terminus — their tests move
  with the rows into `terminus/src/__tests__/`); the bar's
  `restocks` supplier path resolves (`ensureOperatorAt` on the moved
  distributor Business); wire `cooking`, `grain-chain`, `textiles`,
  `farming`, `logistics` green after path edits; `committee` at the
  Hollis floor names `terminus`.
- Commit: `build(economic-bootstrap W1): the trade premises sit in the city; the orphans are claimed`.

**W1 — DONE.** 47 rows moved by an explicit path map (the vintner floor
came too — winemaking is a venue like the others; haulage's depot and
carrier Business rows did NOT: they are the `props:` pattern, kinds a
room names, and the depot already stands on the estuary — flagged for the
MR). Each premises is a **sub-zone of its own** under its district
(`wharfside/mill.yaml`, `goods-yards/crowsfoot.yaml`, …: the
seznick-house / veshko shape) so every floor keeps its authored coords
and nothing re-plots; the trade root zones stay for the trade's kinds.
Leaf names normalised to the veshko shape (`location/floor`,
`idea/outfit`, `agent/hand`, `thing/stock`); the distributor sits at
`counting-houses/distributor/…`. 24 `boot:` producers moved into the
terminus manifest with their rows. ⚠ **The dependency direction
flipped**: textiles, dyeing and tailoring had depended on terminus (for
their own exits back to the bank/street); with the rows in terminus the
city now depends on every trade whose floor it hosts, and the three
trades dropped terminus — the PackLogic cycle check would have refused
otherwise. The trade suites that read their floor rows by file now read
them from the terminus pack (distilling, textiles, tailoring); the kernel
annex/discover/forcing-function tests re-state the rule (a floor's Stock
is the CITY's). Orphans claimed: wharfside + goods-yards `industrial`,
infirmary + necropolis `civic`; campus-farm + campus-field for
`duncan-hall`. Wires after a dropped DB: logistics, textiles, cooking,
grain-chain, farming green (platform-smoke 10/10 alone; one prose-timing
miss in the six-file run).

### W2 — Three seats, the Board and the treasury organizations, corpo committees, Walter (D7, D8)

- `Office.ts:140-171` + three; `OfficeRegistry.test.ts:170-178`;
  `office.yaml:6` prose.
- `lib/command/validators/requiresFinanceMinister.ts` (+ test, the
  `requiresGovernor` shape).
- Platform rows `content/compact/treasury.yaml`, `content/compact/minister-of-trade.yaml`
  (class `/platform/idea/Organization`); both in the platform `boot:`
  list.
- Every `/trade/<x>` claim (21 packs) and every `/stuff/*` claim
  (platform, generic-objects) → `holder: {organization:
  /compact/minister-of-trade}`; the `<x>` groups removed.
- corpo-{aevex,goodkin,hollis,veshko,vionne}: `requires.groups` +
  `<key>-committee` (owner `{office: registrar-of-corporations}`); the
  claim's holder → that group; the org row's `appointingAuthority` →
  `{kind: committee, parcel: /corpo/<key>}`. Goodkin's counting-houses
  Business already reads `/corpo/goodkin`'s committee — now a group.
- terminus: `mayfield-row/idea/agency.yaml`; `pack.yaml` drops the
  `members:` under `mayfield-holdings`; `LeaseController` /
  `UnleaseController` gate as D8.
- Acceptance: `offices` lists eight, founder-held; `committee` at the
  Counting-Houses hall still names `terminus`, at `/corpo/goodkin`
  names `goodkin-committee`; `appoint <player> to teller at
  /world/terminus/counting-houses/business` as the founder works and
  that teller is refused `committee`-membership at `/corpo/goodkin`
  (a unit test over `isCommitteeMember`); Walter's `lease $player`
  still works via the position; the NPC-only fence passes; a wire step
  in `pets-offer` (bank open) still green.
- Commit: `build(economic-bootstrap W2): the Ministers of Finance and Trade, the Registrar; corpo committees; Walter is staff`.

**W2 — DONE.** Eight offices; `requiresFinanceMinister` beside
`requiresGovernor`; `/compact/treasury` + `/compact/trade` (both `boot:`);
every `/trade/<x>` claim (21) and every `/stuff` claim (platform +
generic-objects' 12) → `{organization: /compact/trade}`, the 21 trade
groups deleted; the five `<key>-committee` groups owned by
`registrar-of-corporations`, each corpo org's authority now
`{committee: /corpo/<key>}`; Mayfield Holdings is
`mayfield-row/idea/agency` (Walter on its authored roster, the landlord
group emptied), `lease`/`unlease` gate on a pack-`lib/` base
(`LettingController.mayLet`: the agency employs you, or you sit on the
building's committee — a `protected static`, because the lib-statics
ratchet counts public ones and a controller is a non-Api class). **Two
kernel defects found and fixed on the way:** (1) `CompactApi.isCommitteeMember`
keyed the group read on the bare `playerId` while every writer (`group`
create, the installer, the provider's own doc) keys on the IDENTITY path
— a seated committee was invisible to the predicate; and `group add`
wrote `getTemplatePath()` (every Avatar shares one). Both now the
identity path; five test stubs updated. (2) The organization arm's
recursion guard compared strings; the corpo suite's old fixture (org
holds its own branch, authority = the committee over it, sparse cover)
looped the heap out — the guard now RESOLVES the authority's parcel.
The corpo suite's headline test flipped by design: a seated group
member holds the authority, the chief executive does NOT (doctrine 2),
city staff never did.

### W3 — The two lints (D22)

- `scripts/check-committees-are-players.ts` + `lint:committees-are-players`
  in `packages/server/package.json`; fixture test proving it fires on a
  manifest with an `/agent/` member under a title-holding group; ceiling
  0.
- `scripts/check-no-authored-faucet.ts` + `lint:no-authored-faucet`;
  ceiling = the measured census (expected 12: 3 settings keys + 9 code
  sites; the script prints the roster); allowlist by `file#function`
  for the two rules that do not exist yet (declared now, so W4/W5 land
  under the gate).
- `docs/lint-family.md` gains both entries.
- Commit: `build(economic-bootstrap W3): lint:committees-are-players (0) and lint:no-authored-faucet (census 12)`.

**W3 — DONE.** `lint:committees-are-players` ceiling 0 — and the census
before the gate was **2, not 1**: Katie sat on `duncan-hall` exactly as
Walter sat on `mayfield-holdings`, so the D8 shape was applied to Duncan
Hall too (`duncan-hall/idea/college`, Katie on its authored roster as
`hall-manager`; `provision`/`unprovision` gate on the pack-`lib/`
`HallController.mayProvision`; the landlord group emptied). The gate
excludes a PLAYER's `/platform/agent/Avatar/…` key, which carries the
same `/agent/` segment. `lint:no-authored-faucet` census **10** (the plan
guessed 12: `ensureCorpoTreasuryImpl` rides `ensureVenueAccountImpl`, so
it is one site not two) — three settings keys + seven code sites
(`openAccountImpl`'s float seed, `ensureVenueAccountImpl`,
`seedFloatImpl`, `float`, `ReserveController#mint`/`#issue`,
`EmbodyController#commit`); the allowlist is declared now for the two
rules, the override and the three harness seams. Both fixture tests live
under `/test/**` (lint:test-content). The roster is 48.

### W4 — The ledger, the floor, the treasury, the reserve (D2, D3, D4, D9 minus the standing facility, D13)

- `LedgerEntry.ts`: kinds + categories; `Transaction.ts` cases;
  `schema/bank_ledger.yaml` documents them; `defaultCategory` maps the
  four.
- `BankingLogic`: the floor in `postTransaction`; `payWageImpl` refuses;
  `disburseImpl` (+ `BankingApi.disburse`); `seedFloatImpl` → the
  conversion (`banking.tillFloat`); `ensureVenueAccountImpl` and
  `ensureCorpoTreasuryImpl` **stop minting** (the `openingCapital`
  parameter and `Business.openingCapital` are deleted — every business
  opens on nothing until W6's advance; the world boots and refuses
  wages with a reason, which is the honest intermediate state and the
  drive is not run at W4); the treasury re-owned to `/compact/treasury`;
  `remitDemoTax` re-routed; `appropriateImpl` + `BankingApi.appropriate`;
  `reconcilePerpetualImpl` (its `activeMembers` input is a stub reading
  the online count until W9 lands `activeMemberCount` — noted in the
  code as W9's seam, not a TODO); `windowAdvance`/`windowRepay` Api
  statics (consumed at W5); `priceIndex` (consumed at W10 — W4 ships it
  reading `reserve.indexBasket`, so the setting is consumed).
- `Terms.ts` + `describe()` in words; Goodkin's `bank-counter.yaml`.
- Settings: `settings/reserve.yaml`, `settings/treasury.yaml`, the
  `banking.yaml` edits; `AppSettingKeys`.
- `reserve.yaml` + `ReserveController`: `mint`/`issue` deleted; bare =
  dashboard (two lanes, three numbers, per currency, never a total;
  rates in words); `supply` kept; `set <row> <value>` (prefix-checked);
  `override <amount> to <target> "<reason>"` (the recorded mint).
  `treasury.yaml` + `TreasuryController` (`requiresFinanceMinister`);
  `Author.ts:117` affords it.
- Tests: conservation with the four kinds (the pinned exhaustiveness
  test grows); the floor (a leg that would go negative throws, the
  cache untouched); `disburse` supply-neutral; the perpetual rule
  (target arithmetic, never redeems); `appropriate` refuses below
  balance; `reserve mint` no longer parses (view test).
- Acceptance: `reserve` as the founder prints the dashboard; `reserve
  mint 5` → `unknown-subcommand`; `treasury appropriate 100 to <bar>`
  moves 100 and `reserve supply` is unchanged; `lint:no-authored-faucet`
  falls to 3 (the settings keys + `EmbodyController`'s `issueCash`).
- Commit: `build(economic-bootstrap W4): four leg kinds, the floor, the treasury's account, the two rules, the reserve reshaped`.

**W4 — DONE.** As planned, with three decisions the build made: (1) **the
till float is gone entirely, not converted.** D9's "convert
`min(banking.tillFloat, balance)` into vault coin" breaks the conservation
identity: vault coin is deliberately NOT in the audit's bottom-up sum
(every coin in a vault got there by a deposit whose leg credited a
balance 1:1 — M1 excludes vault cash), and a conversion via `withdraw`
puts UNPAIRED coin in the vault; the old float fit the identity only
because it minted coin AND credited the branch, i.e. was the faucet. So
a till fills from deposits and a withdrawal past it is refused "till
low" (the existing refusal). No `banking.tillFloat`. (2) **`reserve`
subcommands `mint`/`issue` are refused at the BINDER** (the view no
longer declares them — a parse refusal, not a controller note); the
drive asserts `expectRefused`. (3) The dashboard's default-rate line
lands with W5 (it reads loan rows), the treasury book's paper lines with
W6. What shipped: the four kinds + twelve categories; the floor at
`postTransaction` (per-account net projected over the cache before any
write); `payWage` refuses like `payDraw`; `ensureVenueAccount` opens on
nothing (the `openingCapital` param, `Business.openingCapital`, the two
dials and the opening-capital test are gone); `treasuryAccountId`
(`/compact/treasury`'s row at the CB; `remitDemoTax` and the restamp use
it); `reconcilePerpetual`, `windowAdvance`/`windowRepay`, `override`,
`appropriate`, `disburse` (withdraw + coin), `priceIndex`
(`PricedOffer.basePriceFor` + `MixinApi.isPricedOffer`),
`reserveDashboard`; `Terms.loanRatePerGameYear`/`repaymentShare` with
`describeLoanRate()` in words (Goodkin 5% / a quarter); `settings/reserve.yaml`
+ `treasury.yaml` (19 keys); `reserve` (dashboard · supply · set ·
override) and `treasury` (book · appropriate) verbs; `PlayerApi.activeMemberCount`
(the connected set until W9). Three wire files that funded a character
by `reserve issue` now `bank open` + `reserve override … to <handle>`;
two e2e specs were updated by text only (the render tier is outside the
gate). Seven kernel tests that encoded the deficit model were rewritten
to the floor. **Pre-existing defect found by the drive:** `reserve
supply`'s full audit threw `expected singleton, found 3` — `snapshotCoinOf`
used the singleton read on a keyed scope (`/trade/farming/thing/plant/wheat`);
now `findAllByTemplatePath`. Faucet census 10 → **2** (the stipend dial +
`EmbodyController#commit`). Drive steps 4–5 green on a fresh world.

### W5 — Credit: loans, the window, accrual, the share, default (D1, D12, D19)

- `ContractRecord` / `ContractEvent` / `schema/contracts.yaml` +
  `contract_events.yaml`; `Business.charter`; `ContractLogic` credit
  face: `issueLoan`, `openingAdvance` (used at W6), `repaymentSplitsFor`
  (sync-safe read over the warmed row? — no: `settleImpl` is async and
  awaits it), `recordRepayment`, `reconcileLoans`, `drawWorkingCapital`,
  `loansOf`, `instrumentsOf`, the two gate reads (`completedTerms`,
  `settledLoans`), the repossession act; `ContractApi` forwards.
- `BankingLogic.settleImpl`: the split hook (imports `ContractApi`; the
  Api→Logic lookup is by template path at call time, so no static
  cycle — the build verifies `lint:imports` and boot).
- `bank borrow` / `bank book` subcommands (`bank.yaml`,
  `BankController`); `house book` (`house.yaml`, `HouseController`).
- Tests: accrual outcomes (a table: 100 at 5%/game-year over 0, ½, 1,
  2 game-years); the share split conserves; the window advance is
  (1 − h) × principal and repays pro rata; the rung gates count exactly
  the legs/events named (a refusal names the number); default reveals on
  read at the horizon and never before; repossession transfers only the
  borrower's goods; `not-chartered` refusal; `no-lending-terms` refusal.
- Acceptance: as a keeper with a house account at a `terms`-history
  fixture, `bank borrow 50 --for stock` at Goodkin → the ledger shows
  `advance` + `window` mint; a `buy` at the borrower's counter shows the
  `repayment` split and the reserve `drain`; `bank book` reads the lien
  and, after full repayment, its release.
- Commit: `build(economic-bootstrap W5): loans are contracts; the window funds inventory paper; repayment is a share of inflow; default is revealed`.

### W6 — The Note, the standing facility, the wage refusal; the faucets to zero (D9, D10, D18, D22)

- `EmbodyController.ts:774-786` → `issueNote` + `disburse` + the paper
  (the `instrument` kind in `lib/document/DocumentKinds.ts`; written
  through `DocumentApi` at `/home/<key>/papers/arrival-note`; the
  commit frame names where it is filed);
  `banking.onboardingStipend` → `treasury.arrivalPrincipal`;
  `wallet` lists instruments; `ContractApi.onWageLanded` from
  `payWageImpl`; the discharge scene; `recordChronicleOnce`.
- `operatingAccountOfImpl` → `openingAdvance` on a history-less
  account; `banking.openingCapital` / `openingFloat` keys deleted from
  the yaml and `AppSettingKeys`; `Business.openingCapital` field gone.
- `settleShiftWageImpl` + `HouseController.payroll` → D18;
  `Business.payrollArrears`; `house pnl` prints arrears.
- `lint:no-authored-faucet` ceiling → 0 (the ratchet flips).
- Tests: `embody confirm` → a note row + a paper at `/home/<key>/papers/arrival-note`
  + coin in hand; a wage → discharged on the row and the paper + prose; a business's first account → an
  `advance` from the treasury and a 0% loan row; a short business with
  no line → arrears + refusal note; with M repaid loans → a draw and the
  wage.
- Acceptance: `lint:no-authored-faucet` = 0; a fresh boot pays Mara's
  first shift from Dave's Bar's opening advance; `reserve` shows the
  perpetual outstanding ≥ the advances made.
- Commit: `build(economic-bootstrap W6): the Arrival Note; opening capital is the treasury's advance; a wage is a loan or a refusal; no authored faucet`.

### W7 — Rung 0 and the stocking rule (D11, D14)

- `Consignment.ts` `basis`; `Stock.purchasing`, `StockLine.supplier/pricing`,
  `priceFor` override, `reset()` narrowed, `getLong` per-item terms
  line; `ConsignController` (basis by counter policy);
  `BuyController.buyListing` (terms path, two posts); `ReclaimController`
  (organization owner via the house); `house price`; `stockSheetFor`
  union; `lib/behavior/stocks.ts`; `consigns` `basis`; the general
  store's and the cash-and-carry's counter rows; the keeper's
  `behaviors:`; `boot:` entries for the general-store keeper, the farm
  hand and the distribution clerk; `settings/retail.yaml`
  `retail.stockingElasticity`.
- Tests: a terms sale posts sales then `terms`, transfers title, and
  the book shows the payable falling; `reset()` clones nothing for a
  supplied line; `priceFor` across onHand 0..2×par; the `stocks` brain
  buys the shortfall and borrows first when short (a controller-free
  brain test with a stubbed `forceCommand`, the `restocks` test shape);
  `reclaim` by the outfit's hand.
- Acceptance: at the cash-and-carry, `look crate` says whose terms; `buy
  lime` credits the distributor's account, then the farm outfit's;
  `house book` at the counter as the clerk shows *"owed to the farm
  outfit: …"*.
- Commit: `build(economic-bootstrap W7): supplier terms are a listing basis; the shop's ask derives from its shelf; keepers stock their counters`.

### W8 — A player shop: the rented stall (D15)

- Platform seed `content/platform/idea/Business/stall.yaml`;
  `Business.getAccountPath()` → identity path; `ensureOperatorAt`'s
  index over identity paths; terminus `src/market/thing/MarketStalls.ts`,
  `src/market/idea/cmd/StallController.ts`, `content/world/terminus/market/cmd/stall.yaml`,
  `stalls.yaml` re-classed; `standUpKeyed` for both rows; `stall
  give-up`.
- Tests: `stall rent` mints one Business + one Stock per player keyed
  by identity; a second `rent` is idempotent; the account is per
  player (two players, two accounts — the shared-account regression);
  `give-up` returns goods and retires; the stall accepts `consign`
  on terms and its keeper prices with `house price`.
- Commit: `build(economic-bootstrap W8): a player rents a market stall and owns what is on it`.

### W9 — The three states: freeze, vacancy, closure, escheat, reclaim, beneficiary (D16, D17, D23)

- `PersistedRecord.writtenAt` (+ `schema/holder_snapshots.yaml`);
  `PersistableLogic` stamps it; `lib/character/Estate.ts`;
  `PlayerLogic` reads (`estateStateOf`, `absentForDays`,
  `activeMemberCount`, `touchEstate`, `escheatImpl`, `reclaimImpl`);
  `Avatar.escheatedAt/beneficiary` + `wallet beneficiary`;
  `EMPLOYMENT_STATUSES += vacated`; `holdersByPositionImpl` derivation;
  `Business.isClosed()`; `AttendantMixin` reads it; `BankingLogic`'s
  freeze reads; the touch call sites; `ParcelApi` walk + `Zone.onUseGrantRevoked`
  hook (+ the residence pack's dorm override); `house roster`;
  `settings/estate.yaml`, `employment.absenceVacatesAfterDays`; the
  perpetual rule's `activeMembers` un-stubbed.
- Tests (real time stubbed through one module-private `nowMs()` in
  `PlayerLogic`, `vi.spyOn`): the three states across the thresholds;
  a resident connected avatar is active whatever the row says; vacancy
  flips exactly one record and never an NPC's; closure needs every
  runner absent and no NPC on a position; the freeze refuses outflows
  and admits credits; escheat order (liens, note, parcels up, grants,
  balance → unclaimed row, `escheatedAt`); the beneficiary chain; the
  reclaim pays and clears; the nightly reprovision does not re-grant a
  transferred player title (a test over `applyRequiresFor` with a
  player-held child).
- Commit: `build(economic-bootstrap W9): active, dormant, escheated — derived from absence; escheat walks the title tree; unclaimed property is a claim`.

### W10 — The index, the Gazette, the `finance` Discipline (D20, D21)

- `Discipline/finance.yaml`; the credit sites; terminus `gazette.yaml`
  + `agent/editor.yaml` (boot entry) + `settings/press.yaml`
  `press.indexEditionGameHours` + `press.frontPage`; `lib/behavior/prints.ts`.
- Tests: the index arithmetic over a two-counter basket; `prints`
  publishes once per edition window and as the editor; `finance`
  appears on a transcript after `bank borrow` (granted and refused).
- Commit: `build(economic-bootstrap W10): the price index; the Gazette prints it; finance is a Discipline`.

### W11 — The drive, the docs, the record (D24)

- `packages/wire/tests/economic-bootstrap.dirty.wire.test.ts` — the
  twelve steps (below); run it (`WIRE_PORT=2013` beside a driving
  sibling per the memory rule); append the **Drive record** to this
  plan with the output and the count; fix what it finds under the
  `drive(economic-bootstrap): …` commit.
- Docs: `banking.md` (the two lanes, the kinds, the floor, the treasury,
  `disburse`), `contract.md` (kinds, credit face), `retail.md` (basis,
  pricing, the stall), `employment.md` (vacancy, closure, arrears,
  `house` subcommands), `governance.md` (three seats), `access.md` /
  `parcel.md` (escheat-up, the hook), `content-packs.md` (the
  re-rooted roster, the trade premises rule), `char-gen.md` (the Note),
  `press.md` (the Gazette), `app-settings.md` (the Schedule table),
  `lint-family.md`, `advancement.md` (`finance`), `residency.md`
  (the boot-pinned keepers), a new `docs/subsystems/credit.md` (the
  ladder, the Note, the estate — the graduation target for the sweep),
  and one-line map entries in `CLAUDE.md` left to the sweep.
- `pnpm test` once, then the MR.

---

## Reachability wiring

For each new capability: **verb · affordance · data · boot · arg gate**.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| appropriate | `treasury appropriate <amount> to <target>` | `AuthorMixin.commandContributions` (`Author.ts:117`) | `/compact/treasury` row; `treasury.*` settings | platform `boot:` entry for `/compact/treasury` | `target` bound as `MqlOneResult`, resolved like `job post --business` (keyword → Business or Avatar); no `requires:` |
| the dashboard, `reserve set` | `reserve`, `reserve set <row> <value>` | same as above (already) | `reserve.*` settings | — | `row` string, prefix-checked in the controller |
| borrow / the book | `bank borrow`, `bank book` | `BankMixin.commandContributions.peers` (`Bank.ts:122-126`) | Goodkin's `terms` + `charter` | the counter is content in the hall (resident with the room) | strings/numbers; the borrower derives from the house |
| the shop's book / price / roster | `house book|price|roster` | `Author.ts:118` | — | — | `price <thing> <ask>`: `thing` string resolved against the counter's lines |
| supplier terms | `consign … --ask` at a `purchasing: terms` counter | `Stock.commandContributions` (:87-99) | counter `purchasing`; listing `basis` | the counter row's residency (boot entry for the cash-and-carry exists) | unchanged (`requires: ChattelMixin` on the thing — every consigned good composes it) |
| stocking | the `stocks` brain running `buy`/`bank borrow`/`put` | n/a (an NPC drives literal verbs) | keeper row `behaviors:`; `StockLine.supplier` | **the keeper's `boot:` entry** — without it the brain never fires | the literal verbs' own gates |
| the Note | `wallet`; the workspace read verbs on `/home/<self>/papers/` | `wallet` from the wallet update; the workspace verbs exist | the `instrument` kind; the `note` contract | the kind is declared in code (no warm) | — |
| the stall | `stall rent|give-up` | `MarketStalls.commandContributions.environment` (a pack class static) | `market/cmd/stall.yaml`; `/platform/idea/Business/stall` seed | the square is content; the stalls row resident with the room | none |
| beneficiary | `wallet beneficiary <player>` | the wallet update | `Avatar.beneficiary` | — | `player` bound `MqlOneResult`, `scope: online`, `requires: class:Agent` (the `office assign` shape) |
| the Gazette edition | the `prints` brain running `press post --as` | n/a | gazette org + editor rows; `press.indexEditionGameHours` | **the editor's `boot:` entry** | `requiresPublisher` passes for the editor's position |
| `finance` | (credited by acts) | — | `Discipline/finance.yaml` | the catalogue warms rows | — |
| escheat / reclaim / vacancy / closure | (no verb — derived on touch) | — | `estate.*`, `employment.absenceVacatesAfterDays` | — | — |
| the three seats | `office assign <player> minister-of-finance` etc. | `Persona.ts:151` | `OFFICE_APPARATUS` | — | existing |
| corpo committees | `group add …` by the Registrar | existing | manifests | — | existing |

Each row's "boot" column is the link that has cost this repo a
shipped-but-dead feature most often; the two brain rows are the ones
to check first at the drive.

---

## Acceptance-criteria coverage

| requirement (acceptance criterion) | wave |
|---|---|
| a player who creates a character holds a readable note; it discharges visibly on the first wage | W6 (+W11 step 1, 3) |
| creates a character, banks, never returns → no balance, no note; treasury holds the principal; nothing to a beneficiary | W9 (unit) + W11 step 11 (a third newbie) |
| no account negative without a loan naming it | W4 (floor) + W6 (arrears) |
| the reserve cannot mint into a venue; the treasury can appropriate; supply unchanged | W4 |
| a shop sells at its own ask; the supplier's title readable; an unpaid crate can be taken back | W7 |
| a bank's loans ≤ capital + window; the window funds only inventory paper | W5 (structural: rung 1 = window + haircut share, rung 2 = own balance; a test asserts it) |
| every gate a number of ledger events; a refusal names the number | W5 |
| no due date; default = no inflows for the horizon | W5 |
| rates per game-year with the real-time equivalent | W4 (`Terms.describe`, the dashboard) |
| the dashboard: money per active member, default rate, index; per currency; never a total | W4 + W9 (the member count) + W10 |
| a dormant player's seat vacant, shop closed, account frozen and whole | W9 |
| an escheated player's placed property → the locality; placeless → the state; content credited; balance paid back on return | W9 (parcels, grants, balance, reclaim); authored content is already credited by provenance and title escheats up — no code; **pets: deferred, flagged** |
| an NPC shop keeps stocking, selling and repaying with nobody online | W7 (boot-pinned keeper + `stocks`) + W5 |
| the `finance` Discipline records the acts | W10 |
| every business's premises under `/world/terminus`, `/world/lounge` or `/world/newbie-wilds` with a player-group committee; no trade group or corpo org holds ground | W0 + W1 + W2 |
| `committee` at a corpo extent names `<key>-committee`; a new teller is not on it | W2 |
| no title-holding group has an NPC member; no authored row's number becomes money | W3 (+W2, W6) |
| the roster shows the Ministers of Finance and Trade and the Registrar beside the Governor, founder-held | W2 |

Unmapped: none. Two readings the build records in the MR description:
the rung-1 "no repossession" clause (D11) and pets at escheat (D17).

---

## Test & gate strategy

- **Unit** (`pnpm test:near` per wave; every wired test imports
  `test-bootstrap`): the ledger vocabulary, the floor, accrual,
  splits, gates, default, the estate machine under a stubbed real
  clock, the escheat order, the stall's per-identity keying, the two
  lints' fixtures, the brains with a stubbed `forceCommand`.
- **Pack suites**: terminus (the moved rows' tests), each trade pack
  after W1, corpo packs after W2.
- **Gates**: `pnpm -C packages/server lint:family` after every wave; the
  roster is 47 after W3.
- **`pnpm test`**: once before the MR, once at `/finalize`.
- **The drive** — `economic-bootstrap.dirty.wire.test.ts`, one
  `describe`, the steps in order, each an `it` with an assertion that
  can fail:
  1. Embody `A` (`Session.open(uniqueHandle('note'))` runs the
     char-gen flow the `identity.dirty` file already drives); assert
     `wallet` prose contains "Arrival Note" (residue) AND
     `query('inventory')` lists a `Note` (state); `look note` prose has
     no digit (`/\d/` absent).
  2. Walk to the cash-and-carry; `look crate` prose names the farm
     outfit's terms; `buy lime` → `expectOk`; then as the clerk session
     `house book` shows the payable (residue).
  3. Talk to Dave (`talk dave`, choose work) → appointed keeper; as
     Dave's keeper `house payroll A 5` → `expectOk`; A's next `wallet`
     shows no note; `query('inventory')` has no `Note`. (The roster-tick
     path is unit-tested; the wire cannot wait a game-hour.)
  4. Founder session `reserve` → prose has "window advances" and
     "perpetual"; `reserve mint 5` → `expectNote(…, 'controller-rejected')`
     or a parse refusal — either way `expectRefused`.
  5. `treasury appropriate 100 to bar` → ok; `reserve supply` before/after
     prints the same supply figure (residue, exact string compare of the
     supply line).
  6. As A, buy out the general store's supplied line to below par; wait
     for the keeper's `stocks` beat (poll `reserve` every 10 s up to
     150 s for the window-advances line to change — a refusal-shaped
     loop that fails on timeout); `bank book` at Goodkin as the founder
     shows the lien; after A buys at the restocked counter, the reserve
     line falls.
  7. `stall rent` as A; `consign` a bought lime onto it (terms); `bank
     borrow 10 --for stock` at Goodkin → `expectNote(…, 'controller-rejected',
     {reason: 'ladder-gate'})` with `detailOf` naming the count; sell the
     lime (a second session buys it); `bank borrow 10` → ok.
  8. Set Dave's Bar's balance low (appropriate is the only faucet: the
     test drains it with `draw` as Dave? Dave is an NPC — instead the
     test opens a bar-shaped fixture business via a second stall, hires
     B as keeper with a wage, and runs `house payroll B 1000` → refused
     with reason `insufficient-funds` and the arrears line in `house
     book`; grant the line by seeding history is not drivable → the
     working-capital draw path is unit-tested only. **Recorded as a
     wire limitation.**
  9. A's stall borrower stops trading: set the horizon tiny, `reserve`
     (a touch) → default rate line > 0; `query('peers')` at the stall no
     longer lists the pledged goods; `bank book` shows "repossessed".
  10. B logs out (`close()`); wait past the tiny thresholds; as the
      keeper `house roster` shows B vacant; `buy` at B's stall →
      `controller-rejected: unattended`; `survey` at B's dorm as A is
      not possible (not A's) — the dorm sleeping is already asserted by
      the residence suite; log B back in → `bank` shows the balance
      unchanged.
  11. Embody `C`, bank the principal at Goodkin, `wallet beneficiary A`,
      log out; past the escheat threshold, A `pay C 1` (a landing, the
      touch); then founder `treasury` shows unclaimed property held and
      A's `bank statement` shows nothing from C; log C in → prose "the
      treasury pays" and `bank` shows the 1 zorkmid landing only (the
      principal was recovered).
  12. Buy out the basket line again; wait for the `prints` beat (poll
      `press` up to 150 s); the latest Gazette headline's number differs
      from the previous edition's.
- **What only the browser can prove**: the wallet line and the ticker
  rendering in the client (render tier, optional), and the `look note`
  typography. Everything else is envelope or state through the socket.
- **What the wire cannot drive** (recorded): the roster-tick wage (5
  real minutes per game-hour); the working-capital draw's happy path
  (needs M repaid loans — unit); the 30-game-day note discharge; the
  nightly reprovision.

---

## Risks & opens

- **The trade-premises move (W1) is the largest diff in the build**
  and every path it touches is a silent failure if missed (a
  `supplier:` that resolves to nothing stops the bar restocking with no
  error). The census-then-zero loop is mandatory, and the trade packs'
  own tests move with their rows.
- **`settleImpl` → `ContractApi`** is a new dependency direction
  (banking asks contracts). The Api resolves its logic by template
  path at call time, so no import cycle at module scope — but the build
  must boot a fresh DB after W5 and watch for a `FromModule` denial
  (the split hook runs inside the banking logic's own call frame; the
  gated `ContractLogic` method must admit `/api/contract#ContractApi`
  as today).
- **`Business.getAccountPath()` → identity path** touches every account
  owner key for content businesses only by fallback; a content row whose
  `getIdentityPath()` is somehow not its template path would re-key its
  account on a live DB — the DB drops at W6, so the risk is only a test
  fixture with a stubbed identity.
- **Real-time thresholds in a wire test** rely on `config` from a wizard
  session; the drive restores the rows in `afterAll` and a failed run
  leaves them low — the file's `DIRTY_REASON` says so.
- **Brain cadence in the drive**: 90 s + jitter; two beats inside one
  `it` may need `it(…, 240_000)`.
- **The `stocks` brain's route**: `consigns` walks by
  `LaneCatalogue.planRoute(here, target, 'city')`; the general store and
  the cash-and-carry are both in the city network — verified by the
  logistics wire file's routes. If Goodkin's hall is not reachable by
  lane from the store, the beat teleports (the `shifts` precedent) and
  the plan notes it.
- **`activeMemberCount` on a `holder_snapshots` count query** needs the
  avatar scope to be a stable template path
  (`Avatar.SEED_TEMPLATE_PATH`) — verified: `materializeAvatar` clones
  from it; an index on `{scope, writtenAt}` is added to the schema yaml.
- **Open, escalate if hit**: if `standUpKeyed` cannot key a `Business`
  (it is `PostRegistrationMixin(Idea)` without `Persistable`), the stall
  Business needs `PersistableMixin` composed on `BusinessEntity` — a
  host-placement change every Business inherits (it is already
  snapshot-backed through the estate slice? — the build checks
  `Business` persistence before W8 and stops to ask only if the answer
  is "Business persists nothing", which would also mean `parLines`
  edits do not survive a restart, a defect worth its own line).
- **`committee` at a `player`-held parcel returns null** — the stall is
  not a parcel, so no change; a player's Hinkley lot already reads that
  way.

---

## Deferred seams

Each leaves as a slate line, never a plan section:

- **Pets and livestock at escheat** (the pound keeper) →
  institutions-slate Part 5 / pets slate.
- **Chattel lying in the world at the locality's option** (finders-keepers
  is the default) → a line in the credit slate's step 6.
- **Committee escheat-up and the vacancy board** (a committee all of
  whose members are dormant) → institutions-slate Stage A, still open;
  this build ships the player half and the parent walk it needs.
- **A generic `requiresOffice(<key>)` validator** → governance.md's
  existing deferred line (the schema needs a parameterized validator).
- **A `treasury set` for the fiscal rows** → app-settings.md deferred.
- **The city path segment** (`/world/terminus/city`) → terminus-city.md
  Open forks: the Compact's districting.
- **A compressed-clock boot group for wire drives** →
  wire-suite-growth-slate (this drive is the third file to want it).
- **Retail S4 — frontage, franchising, a second stall market** →
  retail.md Deferred (the stall is the first rung only).
- **The `isAgentOf` wizard short-circuit** → wizard-axis-cleanup slate
  (W1 of that slate lists these four callers; two of them lose the call
  here).
- **Bank charters as documents with terms and renewal; the wall;
  deposits gated on the charter** → institutions-slate Stage B.
- **The Ministry of Works as a seat** (Art. V §6 — the people who
  program the machine; today the wizard axis) → the wizard-axis-cleanup
  slate; named in `docs/governance/glossary.md`, not built here.

---

## Critical files

Read first, in this order:

- `docs/governance/glossary.md` — the Compact's names; every title,
  display name and message in this build uses them.

1. `docs/requirements/economic-bootstrap-requirements.md`
2. `docs/subsystems/banking.md` — the whole thing; then
   `packages/server/src/mud/lib/banking/{LedgerEntry,Transaction,Account,Terms}.ts`
   and `packages/server/src/mud/platform/idea/api/BankingLogic.ts`
   (`postTransaction` :1507, `settleImpl` :808, `payWageImpl` :951,
   `ensureVenueAccountImpl` :364, `seedFloatImpl` :593, `issueCashImpl`
   :1252)
3. `docs/subsystems/contract.md`; `lib/employment/{ContractRecord,ContractEvent}.ts`;
   `platform/idea/api/ContractLogic.ts` (`breachClaim` :412,
   `expireStale` :459); `api/contract.ts`
4. `docs/subsystems/employment.md`; `platform/idea/Business.ts`;
   `lib/employment/{Organization,Authority,Employment}.ts`;
   `platform/idea/api/EmploymentLogic.ts` (`settleShiftWageImpl` :778,
   `operatingAccountOfImpl` :708, `tickBusiness` :1107,
   `ensureOperatorAt` :1337)
5. `docs/subsystems/retail.md`; `platform/thing/Stock.ts`;
   `lib/retail/Consignment.ts`; `platform/idea/cmd/retail/{Buy,Consign,Reclaim}Controller.ts`;
   `lib/behavior/{consigns,restocks,brain}.ts`; `lib/behavior/Behaved.ts` :280-300
6. `docs/subsystems/content-packs.md` § The requires phase;
   `platform/idea/api/PackLogic.ts` :375-470, :3111-3339, :4117-4145;
   every `packages/content/*/pack.yaml`
7. `docs/subsystems/{governance,civics,access,parcel}.md`;
   `lib/governance/Office.ts`; `api/compact.ts`;
   `platform/idea/api/CompactLogic.ts`; `api/parcel.ts`;
   `lib/parcel/ParcelRecord.ts`; `lib/command/validators/requiresGovernor.ts`
8. `platform/agent/Avatar.ts` :267-300, :1403-1422;
   `platform/idea/api/PlayerLogic.ts` :184-238;
   `lib/persistence/PersistedRecord.ts`; `docs/subsystems/persistence.md`
9. `platform/idea/cmd/charactergen/EmbodyController.ts` :620-800;
   `lib/credential/{Credential,CredentialWallet}.ts`;
   `platform/idea/cmd/banking/{Reserve,House,Bank,Wallet}Controller.ts`
   and their views under `packages/content/platform/content/platform/cmd/banking/`
10. `docs/subsystems/press.md`; `api/press.ts`; `lib/press/Publisher.ts`;
    `packages/content/platform/content/compact/press.yaml`
11. `docs/lint-family.md`; `packages/server/scripts/{check-lib-statics,lint-family}.ts`
12. `docs/testing.md` § Two tiers; `packages/wire/src/harness/*`;
    `packages/wire/tests/{logistics,work.dirty,grain-chain.dirty}.wire.test.ts`
13. `docs/staging/terminus-city.md` §§2–3d; `docs/slates/builds/{institutions,credit}-slate.md`

---

## Drive record

*(appended at build time, not at plan time — the output of running
`packages/wire/tests/economic-bootstrap.dirty.wire.test.ts` against
the running game, the count, and what each failure was.)*
