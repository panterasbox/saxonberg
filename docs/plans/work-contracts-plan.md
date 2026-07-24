# Work contracts & arrangements — implementation plan

The buildable kernel of the livelihood slate's work model: the **clause
primitive** with engine verification, the **gig** (a Contract that
escrows, settles, or breaches) on a five-state lifecycle, a **physical
job board** as the discovery surface, and the **arrangement
generalization** of the shipped employment engine — compensation bases
as data on the `Position`, the ledger **leg-kind discipline**, and the
proprietor's **draw**. Read the requirements
(`docs/requirements/work-contracts-requirements.md`) in full before
starting, plus `docs/subsystems/employment.md`,
`docs/subsystems/banking.md`, `docs/subsystems/command-spec.md`,
`docs/subsystems/chattel.md` (the Api/Logic + current-state-row +
append-only-events template), `docs/subsystems/belief.md` (regard), and
`docs/subsystems/mql.md` (system mode).

Everything the requirements list as a **non-goal** stays out: no
systemic job generator, no public-works program, no entity forms/tax
rates, no franchise agreements, no liability scope-context, no
maintain-violation detection, no adjudication stack, no
standing/competence claim gates, no client board pane.

## Grounding (facts established by codebase investigation)

- **Leg kinds today** (`lib/banking/LedgerEntry.ts:33`): `LedgerKind =
  mint | drain | deposit | withdraw | transfer | payment | wage | tax`.
  It is a **type-only union** — there is no runtime validation array.
  `PnlCategory` (same file) is the orthogonal P&L line: `sales | cogs |
  wages | subsidy | tax | transfer | deposit | withdraw | float | fare |
  networkFee | fee | onboarding | consignment | other`. Several
  economically distinct movements already ride generic kinds + a
  category: bank fees and the corpo royalty post as kind `transfer`
  (`BankingLogic.chargeFeeImpl`, line ~436), the consignment split rides
  inside a `payment` transaction as a split leg with category
  `consignment` (`obj/command/retail/BuyController.ts:164–188`), the CB
  subsidy is kind `mint` category `subsidy`.
- **The sealed chokepoint** (`obj/api/BankingLogic.ts:862`,
  `postTransaction(kind, legs, opts)`): module-private free function,
  the only writer of `LedgerEntry` rows / `AccountBalance` deltas.
  Asserts `BankTransaction.assertConserving` **first** (pure, throws
  offline too), stamps `actor` from
  `ExecutionContextApi.getActingAuthor()` (`actingActorKey()`, line 70 —
  falls back `'system'`), stamps game-time `at` + wall `realAt` + a
  per-process `txId`. **It currently returns `void`** — contract events
  that want to reference their money legs need the txId returned
  (additive signature change, Phase 1).
- **The per-kind counterparty rule** (`lib/banking/Transaction.ts:64`,
  `assertLegKind`): a `switch (kind)` — `transfer|payment|wage|tax` must
  be real-account→real-account; `mint`/`drain`/`deposit`/`withdraw`
  have sentinel rules. **A kind not named in the switch falls through
  unchecked** — new kinds MUST be added to the real-accounts-only case.
  `defaultCategory(kind)` (`BankingLogic.ts:902`) needs entries too.
- **Accounts**: `AccountBalance` rows in `bank_accounts` key on an
  opaque `accountId` with registry fields `{owner, bankPath, corpoKey,
  isPrimary, isActive}`; `applyDelta` (`BankingLogic.ts:920`)
  **find-or-creates a row for any non-sentinel accountId**. Sentinels
  (`Account.ISSUANCE = 'issuance:central-bank'`, `Account.CASH_BRIDGE =
  'cash:bridge'`) are a closed set (`Account.isSentinel`). Synthetic
  owner keys are precedented (`corpo:<key>` treasuries,
  `ensureCorpoTreasuryImpl`).
- **`reconcile` mechanics** (`BankingLogic.ts:792`): `supply` (O(1) off
  `SupplyAggregate`) must equal `Σ AccountBalance` (the whole warmed
  cache) `+ Σ circulating coin`. Any **real** account row — including a
  new escrow account — is automatically inside `accountTotal`, so
  escrow-in-flight keeps `reconcile` green with **zero** changes to the
  audit.
- **`settle` + splits**: `Charge` (`lib/banking/Charge.ts`) carries
  `splits?: RemittanceSplit[]` (`{accountId, amount, category?}`);
  credential settlement posts one multi-leg `payment` transaction
  (payer → payee remainder, payer → each split). **All legs of one
  `postTransaction` call share one `kind`** — a rider split can only be
  distinguished by `category`. `payWage(employerAccount, workerKey,
  amount)` posts kind `wage` to the worker's **primary** account
  (`primaryAccountIdOf`), with the worker-account guard precedent in
  `EmploymentLogic.settleShiftWageImpl` (lines 166–172:
  `ensureVenueAccount(employeeKey, employeeKey, '')` when no primary
  exists — note the second arg is `bankPath`, so this is the
  self-custody shape Decision L retires; the guard's call sites get
  re-pointed to the default custodian).
- **Employment**: `Position` (`lib/employment/Position.ts`) is `{key,
  label, wageRate /* minor units per game-hour */, confers}` with
  `of`/`fromData`/`serialize`. `Business` (`lib/employment/Business.ts`)
  exposes `getProprietor(): string | undefined`, `getAccountPath()` (=
  its templatePath), `getPosition(key)`, plus the participant-gated
  transitions (`hire`/`beginShift`/`endShift`/…). Wage settles **once at
  the on→off boundary** (`settleShiftWageImpl`, `EmploymentLogic.ts:140`
  — `wageRate × gameHours`, skips the proprietor's cover,
  `ONE_GAME_HOUR_S = 3_600`). The roster tick rides
  `WorldClockApi.every(Quantity.of(3600, 's'), …)`. `EmploymentApi`
  already exposes `isProprietorOf` and `businessOfProprietor` — the
  draw's participant resolution exists.
- **MQL system mode** exemplar (`EmploymentLogic.allBusinesses`, line
  205): `MqlApi.resolveMany('world:[mixin.BusinessMixin]', {
  commandGiver: null, scope: 'world' })` — viewer-blind engine
  enumeration; `lint:world-scan` forbids raw `getAllObjects` scans.
- **The containment chokepoint is NOT touched by this build.**
  Recon for completeness: `ContainmentLogic.moveCore`
  (`obj/api/ContainmentLogic.ts:173`) fires only object-level witness
  hooks (`onContainableRemoved`/`onContainableAdded`/`onMoved`) and
  the globbable merge hook (installed through the late-bound
  module-level `_registerMergeOnArrivalHook` slot), and the mover is
  **not** a parameter anywhere. The turn-in model (Decision D)
  verifies on demand at `complete` time, so no engine seam is needed;
  the hook-slot pattern is the named mechanism for *future* ambient
  detection (maintain violation), never `EventApi` for a
  single-consumer seam.
- **The chattel trio** (the storage/gating template): `api/chattel.ts`
  (thin statics, `SecurityApi.decorateApiClass` tail, sync
  `StuffApi.singletonSync('/obj/api/chattel', …)` + `HotReloadApi`
  resolver) → `obj/api/ChattelLogic.ts` (`@Unshadowable extends
  ApiLogic`, `@internal`, every method
  `@CallSecurity(FromModule('/api/chattel#ChattelApi'))`) → storage as a
  current-state row (`lib/chattel/ChattelRecord.ts`, collection
  `chattel`) + append-only chain (`lib/chattel/ChattelEvent.ts`,
  `chattel_events`). Typed principal `ChattelOwner = {kind:'player',
  templatePath}`.
- **Command layer**: categories are directories under `mud/cmd/`
  (currently incl. `banking`, `employment`, `retail`, `governance` — the
  preloader walks recursively, no registration list in code). A verb =
  YAML view + controller (`mud/obj/command/<cat>/`) + a one-line
  controller seed (`mud/seeds/obj/command/<cat>/<Name>.yaml`, `class:
  /obj/command/<cat>/<Name>`) + affordance via a class's `static
  commandContributions`. Fixture exemplar:
  `lib/retail/ConsignmentShelf.ts:44` affords
  `retail/consign|reclaim|buy.yaml` from the `environment` bucket;
  seeded as content at
  `seeds/domain/terminus/general-store/consignment-shelf.yaml` (`class:
  /lib/retail/ConsignmentShelf`). The wallet implant
  (`lib/credential/CredentialWalletUpdate.ts:43`) affords the flat
  banking verbs (`banking/pay.yaml`) from `self`.
- **AppSettings**: keys registered in `lib/config/AppSettings.ts`
  (`AppSettingKeys` map, e.g. `bankingOpeningFloat:
  "banking.openingFloat"`), values seeded with comments in
  `mud/config/app-settings.yaml`, read via
  `AppApi.setting(AppSettingKeys.x)` with try/`Number` fallback.
- **Regard**: `RegardApi` (`api/regard.ts`) — `adjustRegard(viewer,
  subject, delta)` clamped −100..+100, **no-ops gracefully** for a
  non-belief-holding viewer or keyless subject.
- **Collections**: the `Collections` enum in
  `backend/PersistenceManager.ts:31` (+ `ensureIndexes`); `lint:pm`
  forbids `PersistenceManager.get()` outside the framework — all
  Document I/O in logic code rides the `Document` base which is
  sanctioned, and any direct persistence goes through `PersistApi`
  (`PersistApi.isConnected()` is the `active()` no-DB guard precedent).
- **Boot order** (`backend/AppBootstrap.ts:203–290`):
  `WorldClockApi.boot()` → … → `BankingApi.boot()` (line 244) →
  `EmploymentApi.boot()` (line 251) → … . `ContractApi` needs **no
  boot entry** under the turn-in model (Decision D) — nothing warms,
  nothing subscribes.
- **Green gate**: `pnpm -r build` (tsc), `pnpm test` (Vitest), `pnpm
  lint`, plus the server lint family: `lint:gates`,
  `lint:module-scope`, `lint:world-scan`, `lint:thin-forwarder`,
  `lint:pm`, `lint:does-nothing`, `lint:inert-weapon`.

Constraints honored throughout: actor from context, never a parameter;
no free-floating helper modules; no new module-scope execution (Api
tail `SecurityApi.decorateApiClass` excepted); methods-only inter-Stuff
contract; no `.js` import extensions; double quotes per prettier; no
credit anywhere; the `XApi`↔`XLogic` split is mandatory.

---

## Decisions

- **DECISION A — one common home: the contract substrate lives in the
  existing `lib/employment/`; the command category is `work`.** No new
  `lib/contract/` dir — gig and employment are two shapes of one work
  system (the slate's own claim), and the codebase precedent is
  `lib/standing/`: one consolidated lib home read by several Api pairs
  (renown/consumer/producer/conviction). The Api split stays exactly
  as required: `ContractApi` (`api/contract.ts`) / `ContractLogic`
  (`/obj/api/contract`) beside the shipped
  `EmploymentApi`/`EmploymentLogic` — two gated faces over one
  namespace. The new files land beside `Position.ts`/`Business.ts`
  (`Condition.ts`, `Clause.ts`, `ContractRecord.ts`,
  `ContractEvent.ts`, `JobBoard.ts`, plus Phase 4's
  `Compensation.ts`); **no existing file moves**, so the seeded class
  paths (`/lib/employment/Business`) are untouched — zero data
  migration. The player-facing **category** is `work`
  (`mud/cmd/work/`): the subcommand-dispatched `job` verb + the
  standalone `fulfill` (Phase 3) are
  the labor-market surface, the same substrate-vs-surface split as
  `lib/banking/` under the `banking` category.
- **DECISION B — escrow = a per-contract REAL account, deterministic
  id, no new Stuff.** `Account.escrowAccountFor(contractId)` →
  `escrow:contract:<contractId>`. Chosen over a single pooled sentinel
  account because: (1) **reconcile is untouched either way** (any real
  `AccountBalance` row is inside `accountTotal` — `reconcileImpl` sums
  the whole cache), but per-contract accounts make the conservation
  audit *per contract* trivial: balance == reward while in flight, == 0
  after close (a pinned test); (2) a pooled account commingles funds so
  an over-release bug silently robs other contracts — per-contract, an
  over-release throws on insufficient balance; (3) escrow legibility
  ("the stakes are real because the money is locked and visible") gets
  a direct read (`escrowBalanceOf`). It must NOT be a sentinel: a
  sentinel has no balance row and would take held funds *out of*
  `accountTotal`, breaking `reconcile` while escrow is in flight. And
  it must not be a per-contract **Stuff** — the persistence spine's
  singleton-host invariant and residency exist to keep live-object
  cardinality bounded; a contract needs a ledger *identity*, not a
  world *object*. The row is created on the first hold with `owner =
  contract:<contractId>` and **`bankPath` = the default custodian
  bank** (Decision L — v1: the Goodkin branch). This is what escrow
  actually is: an **agent** (the contract system) holding the stake in
  an account **at a commercial bank** — the bank custodies and is
  accountable for the books; the agent moves the money. No vault
  backing is needed: escrow never converts to cash, it moves only by
  ledger transfer (liquidity≠solvency is already the shipped, deliberate
  property of branch books). And it is **deleted at contract close**: every
  terminal transition (settle / revert / expire) leaves the balance
  provably zero (over-release throws), so `escrowClose(contractId)`
  asserts zero and removes the row from the collection + warm cache.
  `bank_accounts` is a rebuildable cache over the append-only ledger,
  so nothing is lost — the ledger legs + the contract events (txIds)
  are the permanent record — and live escrow rows scale with *open*
  contracts only. Rebuild caveat: a rebuild-from-ledger must skip
  zero-balance `escrow:`-prefixed accounts so closed contracts don't
  resurrect as rows.
- **DECISION L — every account names a REAL custodian; self-custody
  and empty `bankPath` are retired.** Corrected recon
  (`ensureVenueAccountImpl(ownerPath, bankPath, corpoKey)`,
  `BankingLogic.ts:180`): the six venue-account call sites all pass
  `(X, X, "")` — **`bankPath` = the owner's own path** (the bar's
  account is "held at" the bar, which is not a bank), not `""`; the
  truly-empty case is `applyDelta`'s bare auto-create (the
  `"treasury"` sales-tax row: `owner: ""`, `bankPath: ""`). Six
  production call sites: `OrderController:145`,
  `BuyController:209`, `TeleportController:300`+`:323`,
  `EmploymentLogic:161` (Business account) + `:171` (worker
  wage-fallback) — plus the test-file siblings. Either way the
  defect is the same: a recorded *owner* but **no custodian
  institution** — a non-bank "custodian" is no custodian: no Terms,
  no cash ops, nobody accountable if the books are disputed. The
  honest model forbids this (no real account is held *nowhere*), and
  custody follows the constitutional line:
  - **Only the state banks at the CB.** A CB account belongs solely
    to an organ of the polity acting under the legislature through an
    executive agency. The **sole current occupant is the `treasury`**
    (the sales-tax receiver — the legislature's fisc, the account the
    future appropriation build draws from): restamped to
    `Account.CENTRAL_BANK_PATH = "/obj/CentralBank"`.
  - **Everything else is private and banks at a commercial bank.**
    City governance inside the diegesis is *content development, not
    the state* — Terminus is a group-owned parcel, so the city budget
    is a private account like any other; most cities will be
    privately authored and this is the rule, not the exception. Venue
    operating accounts, TPA operators, consignors, and the worker
    wage-fallback all go to the **default custodian bank** — a new
    AppSetting `banking.defaultCustodianBankPath`, seeded to the
    Goodkin branch (`/domain/terminus/counting-houses/bank-counter`),
    v1's only real commercial bank (and diegetically the bank that
    *wants* the newcomer — apt for the wage-fallback). Corpo
    treasuries already bank at their corpo's own branch and are
    untouched; when independent non-corpo banks exist (a named
    future), independents choose.
  - **Escrow is an agent's account at a commercial bank** — the
    contract system is the agent; its per-contract accounts are held
    at the default custodian bank. (A future seam: escrow custody as
    a competitive bank product on Terms.)
  Mechanically behavior-preserving: these accounts move money by
  transfer only (never the till), and liquidity≠solvency is already
  the shipped branch-book property, so Goodkin's cash physics are
  unchanged. Implementation (Phase 1): the AppSetting + the
  `Account.CENTRAL_BANK_PATH` constant; `ensureVenueAccountImpl`
  **refuses a `bankPath` that names no real custodian** — accepted:
  `Account.CENTRAL_BANK_PATH`, the `banking.defaultCustodianBankPath`
  setting value, or a path resolving to a live `BankMixin` branch
  (the `seedFloatImpl` `findByTemplatePath` + `MixinApi.isBank`
  check) — which rejects both `""` and owner==bankPath self-custody
  (note: a real bank branch's own operating account at its own
  branch remains legitimate — the check is "is the custodian a
  bank", not "is it someone else"). The six production call sites
  (+ their test siblings) pass the resolved custodian path; the
  existing `?? owned[0]` fallback in `ensureVenueAccountImpl` means
  re-pointed call sites find the existing account rather than minting
  a duplicate. An idempotent boot pass restamps existing rows whose
  `bankPath` is empty **or** self-custodied-at-a-non-bank to the
  default custodian, and the `treasury` row to the CB (a
  cache-field fill, not a money movement — conservation untouched;
  customer accounts at real branches and corpo treasuries are
  untouched by construction).
- **DECISION C — leg-kind discipline is two-layer, and the audit says
  so.** `kind` is the **conservation/counterparty class** enforced by
  `assertLegKind`; `category` is the **economic line** reports
  partition on. The rule this build writes down (banking.md, Phase 5):
  **a standalone movement gets its own `kind`; a rider split inside a
  multi-leg transaction gets its own `category`** (forced by
  `postTransaction`'s one-kind-per-transaction shape; the consignment
  split is the shipped precedent). New **kinds**: `escrow-hold`
  (issuer → escrow account), `escrow-release` (escrow → contractor),
  `escrow-revert` (escrow → issuer), `draw` (business → proprietor) —
  all real-account→real-account. New **categories**: `escrow`, `draw`,
  `commission` (the share-of-flow rider split), `piecework` (the
  per-settlement wage line). Per-settlement pay posts as kind `wage` +
  category `piecework` (it is labor income — the tax wedge the slate
  cares about is wage-vs-draw, and that stays a *kind* distinction);
  the share-of-flow split posts as kind `payment` + category
  `commission` (a rider on the revenue settle, exactly like
  `consignment`).
- **DECISION D — completion is an explicit two-beat turn-in
  (`fulfill` at the destination, `job complete` at the board), verified
  on demand; NO ambient detection, NO engine seam.** The contractor
  performs the work, then petitions; the engine checks
  `Condition.holdsFor` against modeled state **at the moment of the
  petition** — the player's word is worth nothing, the state decides
  (engine-as-observer intact). Two beats:
  1. **`fulfill <id>` — the capture (proof-of-delivery).** Performed
     **at the destination** (the presenter's environment chain must
     include the destination — the handoff is diegetic, not remote).
     Runs `holdsFor` now (strict possession included); on success
     appends an engine-sealed **`fulfilled`** row to
     `contract_events` `{actor, at, txId:null}`. Trustworthy by
     construction: only gated logic writes the row, and only after
     the engine itself verified — call security is the
     authentication (the house append-only-ledger pattern; the
     narrowest instance of the future general trusted-recording
     instrument).
  2. **`job complete [id]` — the redeem (payday).** At the board; settles
     on **either** live `holdsFor` **or** a valid post-claim
     `fulfilled` row **whose actor is the completer** — so the payout
     survives later state drift (the recipient taking the crate
     inside is the *point* of delivering it).
  Consequences: **no** containment change, **no** hook, **no**
  `EventApi`, **no** watch index, **no** boot subscription — a new
  job template is just a new `holdsFor` predicate, never a new
  chokepoint instrumentation (the extension seam the vocabulary
  widens through). The presenter/completer is the **command giver**
  (actor from context), so attribution is inherent: exclusive → only
  the claimant may `fulfill`/`complete`; open-bounty → anyone may
  `fulfill`, each row redeems only for its own actor, first settle
  wins, a concurrent second `complete` refused by the
  compare-and-set state guard. **Strict possession** for delivery:
  the item must rest in/on the destination and **not** inside the
  presenter (or any creature) — "you're still carrying it" is a
  crisp refusal (this dissolves the old ambient-detection edge
  cases). Both beats are the diegetic arc the slate demands — the
  signature at the door, the payoff Scene at the board. Ambient
  detection remains named-deferred for the cases turn-in
  structurally can't serve: maintain-clause violation (the bouncer)
  and the systemic generator; when those arrive, the mechanism is a
  direct witness hook (the `_registerMergeOnArrivalHook` pattern),
  never `EventApi` for a single-consumer seam.
- **DECISION E — templated conditions, delivery is v1.**
  `lib/employment/Condition.ts` owns the closed template vocabulary
  (`CONDITION_TEMPLATES = ["delivery"]`) as a pure value class:
  `ConditionData = { template: "delivery"; item: { kind: "template";
  path: string } | { kind: "chattel"; chattelId: string };
  destinationPath: string }`. Statics: `validate(data)` (shape +
  template-membership — the "engine-verifiable or rejected" boundary),
  `matchesItem(data, stuff)` (chattelId or
  templatePath match; **refuses `Globbable`** — a merging stack has no
  stable identity, the chattel precedent), and `holdsFor(data, item)` —
  the authoritative check, run **at turn-in** (Decision D): walk
  `item.getContainer()` **upward**
  comparing each ancestor's `getTemplatePath()` to `destinationPath`
  (bounded walk, so "inside a chest inside Dave's bar" delivers) —
  **refusing if any ancestor is a Creature** (the item resting in a
  courier's hands is not delivered; the strict-possession rule) — and
  additionally accept `item.getRestingOn()?.getTemplatePath() ===
  destinationPath` (a `placeOn` onto a counter puts the item in the
  *room* with a `restingOn` pointer — without this leg, "deliver to
  the bar counter" could never hold). Free-form MQL predicates are
  **not** accepted from players (the anti-grief boundary); the
  template vocabulary is the extension seam.
  `lib/employment/Clause.ts` carries `{shape: "achieve" | "maintain",
  condition: ConditionData}` + `CLAUSE_SHAPES`; a v1 Contract holds one
  `achieve` clause. `maintain` exists in the vocabulary only, documented
  as the shipped time-wage's paid-by-interval instance — **no violation
  detection ships** (non-goal).
- **DECISION F — storage is the chattel precedent: `contracts`
  current-state rows + append-only `contract_events`, one writer.**
  `ContractRecord` (Document, `Collections.Contracts = "contracts"`):
  `{contractId, state, boardPath, issuer: ContractParty, claimMode,
  claimant, clause, rewardMinor, escrowAccountId, postedAt,
  postingExpiresAt, claimedAt, claimExpiresAt, settledBy, closedAt,
  realAt}` — `ContractParty = { kind: "player" | "business";
  templatePath: string }` (the `ChattelOwner` shape widened). States:
  `CONTRACT_STATES = ["open", "claimed", "settled", "breached",
  "expired"]` (`settled`/`breached`/`expired` terminal; a failed claim
  reopens the gig, it does not terminate it). `ContractEvent`
  (Document, `Collections.ContractEvents = "contract_events"`):
  `{contractId, event: "posted" | "claimed" | "fulfilled" |
  "breached" |
  "released-back" | "settled" | "reverted", actor, counterparty, txId,
  memo, at, realAt}` — money legs live **only** in `bank_ledger`;
  events carry the `txId` linking them (`fulfilled` carries none —
  it is the engine-sealed proof-of-delivery, Decision D). Unlike chattel/parcel there is
  **no registry Stuff**: those registries exist because title is
  consulted synchronously by `AccessApi`; contract state has one
  writer (`ContractLogic`) and all reads are async record finders —
  with turn-in verification (Decision D) there is no watch index and
  no warm cache at all; every touchpoint reads `ContractRecord` by
  finder.
- **DECISION G — claim modes + expiry are lazy-on-read
  (observe-first), no sweep.** Exclusive: `claim` escrows
  (`escrow-hold` from the claimer-facing issuer account) and stamps
  `claimedAt`/`claimExpiresAt = claimedAt +
  contract.claimExpiryGameHours` (game seconds). Open-bounty: escrowed
  at **post** time, no claim step; anyone may `complete` (Decision
  D). Expiry enforcement is **lazy**: every
  read/mutation touchpoint (`openGigsOn` browse, `claim`, `abandon`,
  `fulfill`, and `complete` before verifying) first runs
  `expireStale(record)` — claim past `claimExpiresAt` → breach the
  claimant (revert escrow, `breached` + `released-back` events, regard
  nudge) and reopen; posting past `postingExpiresAt` → revert escrow to
  issuer, `reverted` event, state `expired`. Justification: the
  codebase's Law-2-clean derive-on-read precedents (the withdrawal
  quota — "no counter, no scheduler"; residency's observe-first) and
  conservation makes laziness safe — held funds sit in a real account
  that `reconcile` counts, so nothing is lost while nobody looks; the
  refund lands on the next touch. A game-time safety-net sweep
  (`WorldClockApi.every`) is a named deferred seam, not built.
- **DECISION H — breach is felt, cheaply.** Breach (abandon or claim
  expiry) = `escrow-revert` legs + a durable `breached`
  `contract_events` row naming the claimant + an **issuer-side regard
  nudge**: resolve the issuer's *person* — the issuer itself for a
  player, `getProprietor()` for a business — via
  `StuffApi.findByTemplatePath`, then
  `RegardApi.adjustRegard(issuerStuff, contractorStuff,
  -contract.breachRegardPenalty)`. If either party isn't live (lazy
  NPC standup) the nudge no-ops (RegardApi's documented graceful
  degrade); the durable event row is the record reputation consumers
  read later. No global reputation write.
- **DECISION I — posting funds-check vs escrow moment.** Open-bounty
  escrows at post (hold fails → post refused). Exclusive checks the
  issuer's balance at post (`cachedBalance ≥ reward`, refuse
  otherwise — "posting fails if the issuer can't fund") but holds at
  claim; if the hold fails at claim time (funds moved since), the
  claim is refused and the gig is closed as `expired` with a
  `reverted` event (memo `unfundable`) — the board never advertises a
  check the system can't cash. Issuer account resolution: a player
  posts from their **primary** account; `post --business` resolves
  `EmploymentApi.businessOfProprietor(actor)` (the participant
  relationship, actor from context — an NPC proprietor like Dave
  dispatches the same verb) and escrows from
  `business.getAccountPath()`'s account via `ensureVenueAccount`.
- **DECISION J — the draw is a dumb banking primitive + a
  participant-resolved verb.** `BankingApi.payDraw(businessAccount,
  proprietorKey, amount)` mirrors `payWage` (post to the proprietor's
  primary account, worker-account guard) with two differences: kind
  `draw`, and it is **solvency-checked** (refuses when the business
  balance < amount — a proprietor pocketing from an insolvent business
  is exactly the wedge the leg-kind exists to expose; `payWage`'s
  no-solvency-check red-by-design behavior is untouched). The verb
  `draw <amount>` lives in the existing `banking` category
  (`cmd/banking/draw.yaml`), afforded by the born-with
  `CredentialWalletUpdate` (`self` bucket, the `pay` precedent); the
  controller resolves the business **from the actor**
  (`EmploymentApi.businessOfProprietor(giver)` — a non-proprietor
  resolves null and is refused; no business parameter exists to
  spoof), keeping banking↔employment imports one-directional
  (employment → banking only; the controller is the join point).
- **DECISION K — comp bases are additive data on `Position`;
  time-wage is byte-identical.** `PositionData` gains `compensation?:
  CompensationData` where `lib/employment/Compensation.ts` defines
  `{ basis: "time" | "per-settlement" | "share-of-flow"; rate?: number
  /* minor units: per game-hour (time) or per settlement */; share?:
  number /* 0..1 of the flow */ }` + `COMP_BASES`. Absent
  `compensation`, `wageRate` behaves exactly as today (basis `time` is
  the default reading of the shipped field; `settleShiftWageImpl` is
  untouched except a guard that a non-time basis pays **no** shift
  wage). Two new payment paths on the employment engine:
  - **Per-settlement**: `EmploymentApi.settlePiecework(business,
    employeeKey, units = 1)` — verifies the employee holds a
    non-terminal Employment at the business whose Position basis is
    `per-settlement`, posts `units × rate` as kind `wage` category
    `piecework` from the business account (worker-account guard
    reused). No venue consumes it yet (the mine is unbuilt); it is
    exercised at test level against a test Business — per the
    systems-over-content stance, **no fake content venue is
    authored**.
  - **Share-of-flow**: `EmploymentApi.flowSplitsFor(business,
    amountMinor): Promise<RemittanceSplit[]>` — one split per
    non-terminal Employment whose Position basis is `share-of-flow`
    (`share × amount`, floored; category `commission`, to the
    holder's primary account, guard reused; capped so Σ splits <
    amount). Wired live at the one revenue seam:
    `OrderController.settleDrink` appends these splits to the drink
    `Charge` before `BankingApi.settle` — **byte-identical for all
    shipped content** (no authored Position carries the basis, so the
    list is empty), which is the same trick the consignment split
    proved. This is "the consignment/royalty primitive, now nameable
    on an employment arrangement."

---

## Phase 1 — Banking: the leg-kind audit, escrow primitives, the draw primitive

**Commit:** `feat(banking): escrow + draw leg kinds and conserved primitives`

### Files

**`lib/banking/LedgerEntry.ts`** — extend `LedgerKind` with
`"escrow-hold" | "escrow-release" | "escrow-revert" | "draw"`; add the
runtime validation array `export const LEDGER_KINDS = [...] as const`
(the `EMPLOYMENT_STATUSES` precedent — the type union alone can't back
the "no untyped legs" test); extend `PnlCategory` with `"escrow" |
"draw" | "commission" | "piecework"`. Doc comment gains the two-layer
rule (Decision C).

**`lib/banking/Transaction.ts`** — `assertLegKind`: add the four new
kinds to the `transfer|payment|wage|tax` real-accounts-only case (they
are all conserving account→account movements; **without this they'd
fall through the switch unchecked** — the audit's one genuine hole).

**`lib/banking/Account.ts`** — `static escrowAccountFor(contractId:
string): string` → `` `escrow:contract:${contractId}` `` and `static
isEscrowAccount(accountId)` (prefix test, for reporting/tests). Not
sentinels (Decision B). Plus `static CENTRAL_BANK_PATH =
"/obj/CentralBank"` (Decision L — the custodian of *state* accounts
only; the sole current occupant is the `treasury`).

**`obj/api/BankingLogic.ts`** —
- `postTransaction` returns the `txId` it minted (change `Promise<void>`
  → `Promise<string>`; every existing call site ignores the return —
  zero behavior change).
- `defaultCategory`: `escrow-*` → `"escrow"`, `draw` → `"draw"`.
- New module-private impls + gated public methods (all
  `@CallSecurity(BankingApiCallers)`, forwarding statics on the face):
  - `escrowHold(fromAccountId, contractId, amount: Money)` → refuses
    (typed `{ok:false, reason}`) when
    `AccountBalance.cachedBalance(fromAccountId) < amount.minor` (no
    credit), else ensures the escrow account row **with registry
    fields** (`owner: contract:<contractId>`, `bankPath:` the default
    custodian — ensureVenueAccount-style, NOT `applyDelta`'s bare
    auto-create) and posts kind `escrow-hold` from →
    `Account.escrowAccountFor(contractId)`; returns `{ok:true, txId}`.
  - `escrowRelease(contractId, toAccountId, amount)` /
    `escrowRevert(contractId, toAccountId, amount)` — post
    `escrow-release`/`escrow-revert` from the escrow account; throw if
    the escrow balance is short (a programmatic invariant, the
    contract logic must never over-release).
  - `escrowBalanceOf(contractId): number` — the legibility read.
  - `escrowClose(contractId)` — asserts the escrow balance is zero,
    then deletes the `bank_accounts` row (collection + warm cache) —
    called by the contract logic at every terminal transition
    (Decision B lifecycle). Escrow accounts are created at the
    default custodian bank (`banking.defaultCustodianBankPath`,
    Decision L). If the balance-rebuild path exists/is touched, it
    skips zero-balance `escrow:`-prefixed accounts.
  - `payDraw(businessAccount, proprietorKey, amount)` — the `payWageImpl`
    shape (primary-account resolution + worker-account guard) with kind
    `draw` and a solvency refusal (Decision J).

**`api/banking.ts`** — the forwarding statics + result types for the
five new methods (the face stays a thin gated shell;
`lint:thin-forwarder` applies).

### Tests

- `lib/banking/__tests__/BankingLogic.conservation.test.ts` (extend):
  each new kind rejects sentinel counterparties; `escrow-hold` against
  insufficient funds refuses **before** any row is written.
- New `lib/banking/__tests__/escrow.test.ts`: hold → release round-trip
  moves issuer → escrow → contractor with correct kinds/categories;
  hold → revert returns to issuer; over-release throws;
  `escrowBalanceOf` reads the in-flight amount; **`reconcile()` is
  balanced with escrow in flight and after both outcomes**;
  `moneySupply()` unchanged throughout (all four kinds are
  supply-neutral); `escrowClose` on a zero-balance account removes the
  `bank_accounts` row (and refuses on a non-zero one) — no escrow rows
  linger for terminal contracts, `reconcile` still green after close.
- New `lib/banking/__tests__/draw.test.ts`: `payDraw` posts kind
  `draw` to the proprietor's primary; refuses on short business
  balance; `payWage` still pays red (regression).
- Custodian-rule tests (Decision L): `ensureVenueAccount` **throws**
  on an empty `bankPath` AND on a `bankPath` naming a non-bank (the
  old self-custody shape); it accepts the CB path, the default
  custodian, and a live branch; the boot restamp pass moves both a
  `bankPath: ""` row and a self-custodied row to the default
  custodian and the `treasury` row to `/obj/CentralBank`,
  idempotently, leaving customer-at-branch + corpo-treasury rows
  untouched, with balances unchanged and `reconcile` green; a
  re-pointed call site finds its existing account (no duplicate row —
  the `?? owned[0]` fallback); a new escrow account row carries
  `owner: contract:<id>` + the custodian `bankPath` (no
  registry-empty escrow rows).
- Vocabulary audit test (the acceptance "no untyped legs"): every
  member of `LEDGER_KINDS` is either handled by `assertLegKind`'s
  explicit cases (assert the switch refuses a sentinel for the
  account-only kinds) — i.e. no kind falls through unchecked — and
  `defaultCategory` returns a non-`other` category for every
  movement-specific kind this build touches.

Green gate: full server suite + lint family (existing banking tests
must pass untouched — `reconciliation.test.ts`, `settlement.test.ts`,
`bar-loop.test.ts`, `law-compliance.test.ts` are the sensitive ones).

---

## Phase 2 — The contract substrate: records, Api/Logic, lifecycle, turn-in, breach

**Commits (two, both green):**
1. `feat(contract): contract records + gated ContractApi/ContractLogic + escrow lifecycle`
2. `feat(contract): two-beat turn-in (fulfill/complete) + breach consequences`

### Commit 2a files

**`lib/employment/Condition.ts`** — Decision E (pure value class; unit
tests drive `validate`/`matchesItem`/`holdsFor` directly;
`holdsFor` takes the live item and walks
`getContainer()`/`getRestingOn()` — engine code, viewer-blind by
construction).

**`lib/employment/Clause.ts`** — `ClauseData`/`CLAUSE_SHAPES` (Decision
E); doc comment names the maintain shape's shipped instance (the
time-wage) and the deferred violation engine.

**`lib/employment/ContractRecord.ts`** / **`lib/employment/ContractEvent.ts`**
— the Documents (Decision F), with static finders
(`findByContractId`, `findOpenByBoard(boardPath)`,
`findActiveByClaimant(claimant)` — the bare-`complete`/`abandon`/
`fulfill` single-active-claim resolution — and
`ContractEvent.findByContractId` oldest-first — the `ChattelEvent`
shape).

**`backend/PersistenceManager.ts`** — `Collections.Contracts =
'contracts'`, `Collections.ContractEvents = 'contract_events'`;
indexes: `contracts` unique `contractId`, indexed `state` +
`boardPath`; `contract_events` indexed `contractId` + `at`.

**`api/contract.ts` (`ContractApi`)** — the thin gated face (chattel
template: `singletonSync('/obj/api/contract', …)` + `HotReloadApi`
resolver, `SecurityApi.decorateApiClass(ContractApi)` tail). Surface:
- `post(spec: GigSpec): Promise<PostGigResult>` — `GigSpec = {
  boardPath, condition: ConditionData, rewardMinor, claimMode:
  "exclusive" | "open-bounty", asBusiness?: boolean,
  expiresGameHours?: number }`. Poster derived from context.
- `claim(contractId): Promise<ClaimResult>` — claimer from context.
- `abandon(contractId): Promise<AbandonResult>` — claimer from context.
- `fulfill(contractId): Promise<FulfillResult>` — presenter from
  context; the capture beat (commit 2b, Decision D).
- `complete(contractId): Promise<CompleteResult>` — completer from
  context; the redeem beat (commit 2b, Decision D).
- `openGigsOn(boardPath): Promise<ContractRecord[]>` (lazy-expiry
  applied before returning).
- `contractById(contractId)`, `eventsFor(contractId)`.
- No `boot()` — turn-in verification needs no warm state, no
  subscription, no bootstrap entry (Decision D); lazy expiry needs
  none either (Decision G).

**`obj/api/ContractLogic.ts`** — `@Unshadowable extends ApiLogic`,
`@internal`, every public method
`@CallSecurity(FromModule("/api/contract#ContractApi"))`; all real
logic in module-private free functions (the
`BankingLogic`/`EmploymentLogic` precedent — no gated `this.x()`
self-calls). **Stateless** — no watch index, no cache; every
touchpoint reads `ContractRecord` by finder (Decision F).
Impl highlights:
- `postImpl`: actor via `ExecutionContextApi.getActingAuthor()`
  (refuse unattributable context); `Condition.validate` — an invalid or
  non-template condition is **refused** (the verification boundary);
  refuse a `Globbable`-kind item; destination existence check via
  `StuffApi.findByTemplatePath(destinationPath)` ?? a viewer-blind MQL
  system probe (`MqlApi.resolveMany` with `commandGiver: null`) — must
  resolve to a Container/Surfaced target; refuse when `holdsFor`
  is **already true** (a pre-satisfied gig is degenerate); resolve the
  issuer account (Decision I) and party (`asBusiness` →
  `EmploymentApi.businessOfProprietor(actor)`, refused if none);
  open-bounty → `BankingApi.escrowHold` now; exclusive → balance
  check only; persist the row (state `open`), append `posted` event
  (with the hold's txId when escrowed).
- `claimImpl`: lazy-expire first; refuse a bounty gig (`no claim
  needed`), a non-open state (`exclusive lockout` — the second-claimant
  test), the issuer self-claim; `escrowHold` from the issuer account —
  on refusal close the gig (`reverted`, memo `unfundable`, Decision I);
  stamp claimant/claimedAt/claimExpiresAt (game seconds from
  `WorldClockApi.getNow().rawValue()` + `contract.claimExpiryGameHours
  × 3600`); append `claimed`.
- `abandonImpl`: claimant-only (from context); runs the shared
  `breachClaim` (below); gig reopens.
- `breachClaim(record, reason)`: `BankingApi.escrowRevert` → append
  `breached` (actor = claimant, txId) → regard nudge (Decision H) →
  clear claim fields, state back to `open`, append `released-back`.
- `expireStale(record)`: Decision G (claim expiry → `breachClaim`;
  posting expiry → `escrowRevert` + `reverted` + state `expired`).
- Every **terminal** transition (`settled` in `completeImpl`,
  `expired` in `expireStale`) ends with
  `BankingApi.escrowClose(contractId)` (Decision B lifecycle — the
  account row dies with the contract). A claim-breach that *reopens*
  the gig leaves the zero-balance row in place (the id is reused by
  the next claim's hold; rows scale with open contracts either way).
- `fulfillImpl(contractId)` (the capture beat, commit 2b): presenter
  = the acting author from context (refuse unattributable context);
  lazy-expire first; refuse a non-live state; **exclusive → claimant
  only** (`not-your-claim`), open-bounty → anyone; require the
  presenter **at the destination** (environment chain includes
  `destinationPath` — the diegetic handoff); resolve the live item
  and run `Condition.holdsFor` **now** (strict possession, Decision
  E); refuse `not-done` when it doesn't hold; refuse
  `already-fulfilled` when this actor already holds a `fulfilled`
  row; on success append **`fulfilled`** `{actor: presenter}` — no
  money moves, no state transition (the gig stays
  `claimed`/`open`); render the handoff Scene.
- `completeImpl(contractId)` (the redeem beat, commit 2b): completer
  = the acting author from context (refuse unattributable context);
  lazy-expire first; refuse a non-live state; **exclusive → only the
  claimant may complete** (anyone else refused `not-your-claim`);
  open-bounty → anyone may. Verification passes when **either** (a)
  the live item resolves (`matchesItem`-satisfying instance — by
  chattelId via the registry, or the nearest template-path match
  inside the destination) and `Condition.holdsFor` holds **now**, or
  (b) a **`fulfilled`** row exists **whose actor is the completer**,
  minted after the claim (exclusive) or after the posting
  (open-bounty, which has no claim); else refuse `not-done` (incl.
  the still-carried case
  — the strict-possession rule, Decision E). On verification:
  compare-and-set state guard
  (re-entrancy/second-completer safe); ensure the completer's
  primary account (the `settleShiftWageImpl` worker-account guard,
  reused — now passing the default custodian `bankPath`, Decision L);
  `BankingApi.escrowRelease`; append `settled` (actor = completer,
  counterparty = payee, txId — "attribution recorded both ways");
  state `settled`; `escrowClose`. If the issuer party is a business
  and the payee holds a per-settlement Employment there, nothing
  extra happens here (piecework is orthogonal, Decision K).

**`lib/config/AppSettings.ts`** + **`mud/config/app-settings.yaml`** —
`contract.claimExpiryGameHours: "48"`,
`contract.postingExpiryDefaultGameHours: "0"` (0 = no posting expiry
unless the post specifies one), `contract.breachRegardPenalty: "15"` —
commented in the yaml per house style.

No `AppBootstrap` change — `ContractApi` has no boot (Decision D).

### Commit 2b files

**`obj/api/ContractLogic.ts`** + **`api/contract.ts`** — the
`fulfillImpl` capture path + the `completeImpl` redeem path (specs
above) and their gated public/forwarding pairs, plus the
`breachClaim` regard-nudge consequences (Decision H). No engine
files are touched: verification is an on-demand `Condition.holdsFor`
read at `fulfill`/`complete` time — nothing is instrumented, nothing
subscribes (Decision D).

### Tests (`lib/employment/__tests__/`, `obj/api/__tests__/`)

Unit: `Condition.test.ts` (validate/matchesItem/holdsFor
incl. the restingOn leg, the ancestor walk, the **creature-ancestor
refusal** (still-carried ≠ delivered), the glob refusal, the
non-template refusal). `ContractRecord`/`ContractEvent` round-trips.

Integration (`contract-lifecycle.test.ts`, the banking-test-harness
pattern — real BankingApi + WorldClockApi, real `ContainmentApi.move`):
- **Happy path**: post (exclusive) → claim (escrow held; reconcile
  green) → `ContainmentApi.move(crate, destination)` — **nothing
  settles yet** (no ambient detection, asserted) → `complete` →
  verification passes: escrow released to claimant's primary,
  `settled` event carries completer + txId, escrow account row
  deleted, reconcile green.
- **Two-beat path**: post → claim → deliver →
  `fulfill` (at the destination; `fulfilled` row appended, no money
  moves, state unchanged) → *remove the crate* (state drifts) →
  `complete` at the board → settles against the sealed `fulfilled`
  row; reconcile green.
- **Capture refusals**: `fulfill` before delivery → `not-done`;
  `fulfill` while still carrying → refused (strict-possession);
  `fulfill` away from the destination → refused; a second `fulfill`
  by the same actor → `already-fulfilled`; a non-claimant's
  `fulfill` on an exclusive gig → `not-your-claim`.
- **Turn-in refusals**: `complete` before the crate is delivered →
  `not-done`; `complete` while the crate is still in the completer's
  inventory (standing in the destination) → refused
  (strict-possession); deliver, *remove* the crate, then `complete`
  **without** a prior `fulfill` → refused (live verification must
  hold); a `fulfilled` row redeems only for its own actor (another
  player's `complete` against it refused).
- **Exclusive lockout**: second claimant refused; issuer self-claim
  refused; a non-claimant's `complete` on a claimed gig refused
  (`not-your-claim`).
- **Claim expiry**: advance the world clock past `claimExpiresAt` →
  next `openGigsOn` shows the gig open again; escrow reverted;
  `breached` + `released-back` events; regard: issuer's regard for the
  claimant dropped by the AppSetting (assert via
  `RegardApi.getRegard`).
- **Abandon**: same consequences, driven by the verb path's Api call.
- **Posting expiry**: post with `expiresGameHours` → advance → lazy
  touch → escrow back to issuer, `reverted`, state `expired`.
- **Open-bounty**: post `--bounty` escrows at post; a third player
  who delivers and then `complete`s is the payee (no claim step); a
  second `complete` after settlement is refused by the state guard;
  the delivering move alone settles nothing.
- **Verification boundary**: a condition with an unknown template /
  free-form string refused at post; a pre-satisfied condition refused.
- **Funding**: post refused when the issuer can't cover (both modes);
  claim against a drained issuer account closes the gig `unfundable`.
- **Business-issued**: a proprietor-context `post --business` escrows
  from the Business account; settles identically to a player gig.
- **Conservation sweep**: after the full suite, `reconcile().balanced`
  and every `bank_ledger` row's `kind` ∈ `LEDGER_KINDS`.

---

## Phase 3 — The board fixture + the `work` verb surface

**Commit:** `feat(work): JobBoard fixture + the subcommand-dispatched job verb + fulfill`

### Files

**`lib/employment/JobBoard.ts`** — the reusable fixture (the
`lib/retail/Stock` placement precedent, NOT `obj/` — multiple boards
in multiple localities): `class JobBoard extends
DetailedMixin(VisibleMixin(ContainableMixin(Thing)))` (match Stock's
actual mixin stack at build time), with

```ts
static commandContributions: CommandContributions = {
  self: [],
  environment: ["work/job.yaml"],
  inventory: [],
  peers: [],
};
```

plus `static resolveIn(context)` — the affording board:
`commandSource` fast-path, else `MqlApi.resolveMany("peers", …)`
filtered `instanceof JobBoard` (the `TipJar.resolveIn`/`Menu.resolveIn`
precedent). The board's identity (what gigs key on) is its
`getTemplatePath()`.

**`mud/cmd/work/`** — the new category directory (no registration
needed; the preloader walks it). **Two verbs, not six** — the house
subcommand pattern (`party`/`bulletin`/`fight`/`office`; per-subcommand
args + validators are a shipped engine feature):
- `job.yaml` — verbs `[job, jobs]`, **subcommand-dispatched** (bare =
  browse, the `fight`-bare precedent). Description + help on the verb
  (the acceptance criterion; syntax/options are generated, don't
  restate). Subcommands:
  - *(bare)* — list open gigs on this board.
  - `post` — args: `item` (`type: object`, required, `scope:
    ["reachable"]`, validator `mustBeContainable`), `destination`
    (`type: string`, required, `prepositions: [to]`), `reward`
    (`type: number`, required, `prepositions: [for]`, validator
    `mustBeNumber`); options: `bounty` (boolean), `business`
    (boolean), `expires` (number, game-hours). Player shape: `job
    post crate to /domain/lounge/bar for 25`; one worked example in
    the YAML (the multi-positional case that earns it).
  - `claim` — arg `id` (`type: string`, required).
  - `complete` — arg `id` (`type: string`, required: false — bare
    resolves the giver's single active claim on this board, refuses
    on ambiguity; an open-bounty must be named by id). The redeem
    beat: the payoff Scene renders here (the world noticing — the
    slate's REQ).
  - `abandon` — arg `id` (`type: string`, required: false — same
    single-active-claim resolution).
- `fulfill.yaml` — verbs `[fulfill, handoff]`; arg `id` (`type:
  string`, required: false — bare `fulfill` resolves the giver's
  single active claim, refuses on ambiguity). **Deliberately a
  standalone verb, not a `job` subcommand**, for two reasons:
  affordance granularity is per-verb — the board affords `job` in
  its environment, but `fulfill` must travel with the courier
  (**afforded from `self` by the born-with `CredentialWalletUpdate`**,
  the `pay`/`draw` precedent) — and it is a diegetic physical act at
  a place (the handoff), the category that earns a dedicated verb
  (`give`/`put`/`pour`), unlike the board-side admin operations.
  Diegetically the implant logs the delivery (the narrowest seed of
  the future trusted-recording instrument). Renders the handoff
  Scene.

**`lib/credential/CredentialWalletUpdate.ts`** — add
`"work/fulfill.yaml"` to the `self` contributions (the `pay`
precedent; the verb must travel with the courier, away from any
board).

**`mud/obj/command/work/`** — `JobController.ts`
(dispatch-on-subcommand, the `OfficeController`/`PartyController`
shape: bare → browse; post/claim/complete/abandon branches map model
→ the `ContractApi` call) + `FulfillController.ts`
(+ seeds `mud/seeds/obj/command/work/<Name>.yaml`, `class:
/obj/command/work/<Name>`). `FulfillController` resolves no board
(the verb is self-afforded); `JobController` resolves via
`JobBoard.resolveIn` (reject `no-board` if absent). Both are thin:
map model → the `ContractApi` call, render Scene + `ctx.note` per
the Scene-plus-note discipline. The `post` branch builds
`ConditionData`
from the item exemplar: `MixinApi.isChattel(item) &&
item.getChattelId()` → instance-bound (`{kind: "chattel", chattelId}`,
deliver *this* crate); else kind-bound (`{kind: "template", path:
item.getTemplatePath()}`); `destination` resolved reachable-first
(MQL on the string), else treated as a template path — `ContractApi`
re-validates either way. The browse branch renders id-prefixed rows
(short `contractId` prefix, reward, item, destination, mode, expiry,
claimed-by-you flag) — escrow legibility ("held in escrow" on
bounty rows).

**Seeds (content placement — Dave's Bar lounge):**
`mud/seeds/domain/lounge/job-board.yaml` (`class:
/lib/employment/JobBoard`, prose: a cork board by the door) + a
`populates` entry in the lounge room seed (the TipJar/Menu placement
precedent — match how the lounge seeds compose at build time).

### Tests (`obj/command/work/__tests__/`)

- Integration via `giver.executeCommand(...)` on a fixture giver in a
  room with a seeded board: bare `job` lists an open gig posted to
  *this* board and not one posted to another board; `job post … for
  25` creates an open exclusive gig funded-checked from the poster;
  `job post --bounty` escrows; `job claim <id>` locks; a second
  `job claim` refused; `job complete`
  before delivery refused with the `not-done` prose, after delivery
  settles and renders the payoff Scene; `fulfill` at the destination
  seals the row and renders the handoff Scene — and is **available in
  a board-less room** (self-afforded) while `job` is
  absent there (affordance test); `job abandon`
  reverts + reopens; `help job` and `help fulfill` render
  (help-text criterion).
- `JobController` unit: chattel-vs-template condition construction
  (post branch); destination fallback; bare-`complete`/`abandon`
  single-claim resolution + ambiguity refusal; unknown subcommand
  refusal.

---

## Phase 4 — Arrangement generalization: comp bases + the draw verb

**Commit:** `feat(employment): compensation bases on Position + piecework/flow-split paths + the proprietor draw`

### Files

**`lib/employment/Compensation.ts`** — `CompensationData`,
`COMP_BASES = ["time", "per-settlement", "share-of-flow"]`, a
`Compensation` value class (`of`/`fromData`/`serialize`, validation:
`per-settlement` requires `rate > 0`, `share-of-flow` requires `0 <
share < 1`) — the `Position` precedent.

**`lib/employment/Position.ts`** — `PositionData.compensation?:
CompensationData`; `Position.fromData`/`serialize` carry it;
`basis()` accessor defaulting `"time"`. `wageRate` untouched.

**`obj/api/EmploymentLogic.ts`** —
- `settleShiftWageImpl`: one added guard — `if (position.basis() !==
  "time") return;` (a per-settlement/share position accrues no shift
  wage). With no authored non-time Position, behavior is
  byte-identical.
- `settlePieceworkImpl(business, employeeKey, units)` (Decision K):
  participant verification (the employee's stored Employment at this
  business, non-terminal; Position basis `per-settlement`), pays
  `units × rate` via a `wage`-kind posting with category `piecework`
  from `business.getAccountPath()`'s account (reuse the
  ensure-accounts guards).
- `flowSplitsForImpl(business, amountMinor)` (Decision K): the
  `RemittanceSplit[]` for `share-of-flow` position holders; Σ capped
  below `amountMinor`.
- Gated public methods + `EmploymentApi` forwarders
  (`api/employment.ts`).

**`obj/command/crafting/OrderController.ts`** — in `settleDrink`
(~line 125–169): resolve the business (already in hand for the venue
account), `const splits = await EmploymentApi.flowSplitsFor(business,
price)`, attach to the `Charge.splits`. Empty for all shipped content.

**`cmd/banking/draw.yaml`** + **`obj/command/banking/DrawController.ts`**
(+ seed `mud/seeds/obj/command/banking/Draw.yaml` — match the
existing banking controller seed naming) — Decision J: arg `amount`
(`type: number`, required, `mustBeNumber`); controller resolves
`EmploymentApi.businessOfProprietor(giver)` (null → Scene "you don't
run a business" + `controller-rejected { reason: "not-proprietor" }`
— the participant-gate acceptance test), resolves the business
account (`ensureVenueAccount` with the default custodian `bankPath`,
Decision L — finds the restamped existing account via the
`?? owned[0]` fallback), calls
`BankingApi.payDraw`; refusal prose on short funds. Help text: the
draw is the owner's take-home, distinct from a wage — the doc-facing
sentence the tax hook will cite.

**`lib/credential/CredentialWalletUpdate.ts`** — add
`"banking/draw.yaml"` to the `self` contributions (the `pay`
precedent). (Phase 3 already added `"work/fulfill.yaml"` the same
way.)

### Tests

- **Pinned time-wage regressions (must pass untouched — run them
  first, name them in the commit message):**
  `lib/banking/__tests__/employment-wages.test.ts`,
  `lib/banking/__tests__/bar-loop.test.ts`,
  `lib/employment/__tests__/{Business,Employed,Employment,Position,
  Roster,conferral}.test.ts`,
  `domain/terminus/__tests__/city-budget-wage.test.ts`.
- New `lib/employment/__tests__/compensation.test.ts`: value-object
  validation; `Position` round-trips the term; a legacy seed blob
  (no `compensation`) reads basis `time`.
- New `obj/api/__tests__/comp-bases.integration.test.ts` (test
  Business, no content venue): per-settlement — `settlePiecework`
  pays `units × rate` as `wage`/`piecework` legs, refuses a
  non-employee and a time-basis employee; share-of-flow — a settle
  carrying `flowSplitsFor` splits routes `share × amount` to the
  holder as a `payment`/`commission` leg, conservation green; a
  time-basis roster shift on the same Business settles the shift wage
  identically to before (in-file regression).
- `DrawController` integration: proprietor draws (ledger shows kind
  `draw`, business debited, proprietor's primary credited);
  non-proprietor refused; short-funds refused; `reconcile` green.

---

## Phase 5 — Documentation

**Commit:** `docs(contract): work-contracts subsystem doc + banking leg-kind vocabulary + employment comp bases`

- **New `docs/subsystems/contract.md`** — the substrate doc: the
  clause primitive (achieve/maintain; the engine-is-the-observer rule
  and the only-contract-on-what-you-simulate boundary), the condition
  template vocabulary (delivery v1; the extension seam), the
  five-state lifecycle + `contracts`/`contract_events` storage (the
  chattel precedent, no registry Stuff — say why), the escrow design
  (per-contract real account, why not a sentinel/Stuff, the
  reconcile argument), claim modes + the **two-beat turn-in
  verification model** (`fulfill` captures the engine-sealed
  proof-of-delivery at the destination, `complete` redeems at the
  board on live verification or the sealed row; the engine judges
  every petition against modeled state at that moment; no ambient
  detection — a new job template is a new predicate, never a new
  engine seam; witness hooks named-deferred for maintain violation,
  `EventApi` reserved for genuinely global broadcasts; the
  `fulfilled` row = the narrowest instance of the future
  trusted-recording instrument), lazy expiry
  (observe-first justification + the deferred sweep seam), breach
  (events + regard nudge), the board fixture + `work` category, and
  the deferred seams list.
- **`docs/subsystems/banking.md`** — a new "**The leg-kind
  vocabulary**" section: the full kind table (12 kinds with
  counterparty rules and supply effect — extending the existing
  table at the top of the doc), the kind-vs-category two-layer rule
  (Decision C) with the consignment and commission splits as the
  rider examples, the escrow family + `draw` semantics
  (draw = solvency-checked, wage = red-by-design — the deliberate
  asymmetry), and the sentence the requirements demand: this
  vocabulary is the future tax-policy hook (a governance rate table
  over kinds/categories, no rework needed).
- **`docs/subsystems/employment.md`** — a "**Compensation bases**"
  section: the `compensation` term on `Position`, the four-basis model
  (time / per-settlement / share-of-flow shipped as data; residual =
  ownership, i.e. the draw, not a clause), the two payment paths and
  their consumers (test-level Business for piecework — the mine is
  the named future venue; the OrderController flow-split seam), the
  time-wage's byte-identical guarantee and which tests pin it.
- **`CLAUDE.md`** — add `work` to the category list in File Naming
  Conventions; add `contract.md` to the Documentation Map line set.
  **`docs/subsystems/command-spec.md`** — category list likewise.
- `mud/config/app-settings.yaml` comments already landed in Phase 2;
  verify `docs/subsystems/app-settings.md` (if it catalogs keys) gains
  the `contract.*` block.
- The livelihood slate's §5.3/§6 built-state markers are updated **at
  the pre-merge sweep** (`/finalize`), not in this build — note only.

Then: push the branch and open the MR against `master`.

---

## Test plan ↔ acceptance criteria map

| Acceptance criterion | Covering tests (phase) |
|---|---|
| Lifecycle, both beats: live-verified `complete`; `fulfill`-then-drift-then-`complete`; open→claim→expiry/abandon→revert + breach + regard | `contract-lifecycle.test.ts` happy path / two-beat path / claim-expiry / abandon (P2) |
| Verification boundary: non-template rejected; settles only via `complete` backed by verification that ran while the condition held (live or at `fulfill`); still-carried + away-from-destination refused; never ambient | `Condition.test.ts` + lifecycle happy-path (move alone settles nothing) + capture/turn-in refusal tests (P2) |
| Claim modes: exclusive lockout + claimant-only fulfill/complete; expired claim reopens; unclaimed bounty settles for first verified completer; `fulfilled` redeems only for its actor; second `complete` refused | lockout / claim-expiry / open-bounty / capture-refusal tests (P2) |
| Player posting self-funded; NPC/Business gig escrows from Business account; both settle identically | funding + business-issued tests (P2), `post --business` verb test (P3) |
| Conservation: reconcile + moneySupply green in every state; new kinds on escrow legs; full vocabulary asserted, no untyped legs | `escrow.test.ts` (P1), conservation sweep + per-state reconcile assertions (P2), vocabulary audit test (P1) |
| Comp bases: piecework + share-of-flow on a test Business; time-wage suite unchanged | `comp-bases.integration.test.ts` + the pinned regression list (P4) |
| Draw: proprietor draws as `draw` leg; non-proprietor refused by participant gate | `draw.test.ts` (P1) + `DrawController` integration (P4) |
| Board: bare `job` lists open gigs on the board's locality; post/claim/complete/abandon as `job` subcommands; `fulfill` self-afforded away from the board; help text on both verbs | work-verbs integration + affordance + help tests (P3) |
| Docs: new subsystem doc; banking leg-kind section; employment comp-basis section | Phase 5 (slate markers at sweep) |

---

## Deviations & risks

- **R1 — surface-delivery semantics, resolved by turn-in.**
  `placeOn(item, counter)` puts the item in the counter's *room* with
  `restingOn = counter` — a pure ancestor-chain check would make
  "deliver to the counter" unsatisfiable, so `Condition.holdsFor`
  also accepts the `restingOn` match (Decision E). The converse
  ("deliver to the bar room" while still holding the crate) is closed
  by the strict-possession rule: the ancestor walk **refuses any
  Creature-tier ancestor** — delivered means out of your hands.
  Turn-in makes this crisp rather than fuzzy: the refusal is a prose
  response to `complete`, not a silent non-detection.
- **R2 — resolving the live item at `complete` time.** For a
  chattel-bound gig the instance is found via the chattel registry;
  for a template-bound gig the completer's claim is checked against
  any matching instance **inside the destination** (a bounded
  viewer-blind containment read at the destination, not a world
  scan). If the destination is not live (evicted room), it is
  re-materialized by the same resolve used at post time — worst case
  the `complete` is refused `not-done` and retried in place; no
  correctness risk, noted for the builder.
- **R3 — `postTransaction` returns `void` today.** Contract events
  reference their money legs by `txId`, so Phase 1 changes the return
  to the minted `txId`. All existing callers ignore the return; zero
  behavior change, but it is a signature change on the sealed
  chokepoint — call it out in the MR.
- **R4 — regard nudge best-effort.** `RegardApi` needs live Stuff on
  both sides; lazy NPC standup means a business proprietor may not be
  live at breach time. The nudge no-ops then (RegardApi's documented
  degrade); the durable `breached` event row is the authoritative
  record. Documented, tested (a breach with a non-live issuer still
  reverts + records).
- **R5 — escrow account rows are transient and contract-owned.**
  Rows carry `owner: contract:<id>` + the custodian `bankPath`
  (Decisions B/L) and `escrowClose` deletes them at contract close,
  so only open contracts hold rows. A `bank statement` by player
  owner correctly does *not* show escrow (the stake isn't the
  player's while held); the `escrow:contract:` prefix +
  `Account.isEscrowAccount` is the classification hook for audits.
  Any rebuild-from-ledger path must skip zero-balance escrow accounts
  (else closed contracts resurrect as rows) — asserted in the escrow
  tests if a rebuild entrypoint exists.
- **R6 — `Position.fromData` forward-compat.** Old seed blobs carry no
  `compensation`; `fromData` must default it absent (not `{basis:
  "time"}` materialized) so `serialize` round-trips byte-identically —
  the pinned `Position.test.ts` guards it.

## Deferred seams (named, not built)

The systemic job generator (world posts its own needs); the
public-works floor/match (Circulation Reserve dependency); more
condition templates (`cull`, `escort`, `restock` — the vocabulary
widens, the machinery doesn't change: each is one new `holdsFor`
predicate); ambient/event-driven verification — maintain-violation
detection (a bouncer-shaped consumer first) via a direct witness hook
on the relevant chokepoint (the `_registerMergeOnArrivalHook`
pattern, never `EventApi` for a single-consumer seam);
standing/competence claim gates;
demand/difficulty pricing; entity forms + differential tax rates (read
the leg-kind vocabulary this build lays); liability scope-context on
`accountability_events`; the client board pane; a game-time expiry
sweep as a safety net over lazy expiry; NPC claiming brains; the
mine as the first real piecework venue; the **general
trusted-recording instrument** (player-usable, engine-sealed capture
of session state / message frames, reconstructable by an
authenticating agent — the "tricorder"; the courts' evidence
substrate, of which the `fulfilled` row is the narrowest shipped
instance).

## Critical files for implementation

- `packages/server/src/mud/obj/api/BankingLogic.ts` —
  postTransaction/txId, escrow + draw impls, defaultCategory (Phase 1
  core)
- `packages/server/src/mud/lib/banking/LedgerEntry.ts` (+
  `Transaction.ts`, `Account.ts`) — the leg-kind vocabulary +
  counterparty rules
- `packages/server/src/mud/api/chattel.ts` +
  `packages/server/src/mud/obj/api/ChattelLogic.ts` — the gated
  Api/Logic + record/events template `ContractApi`/`ContractLogic`
  copies
- `packages/server/src/mud/obj/api/EmploymentLogic.ts` (+
  `lib/employment/Position.ts`) — settleShiftWage guard,
  piecework/flow-split impls, the comp-basis term
- `packages/server/src/mud/lib/retail/ConsignmentShelf.ts` +
  `packages/server/src/mud/obj/command/retail/BuyController.ts` — the
  fixture-affordance and split-settlement precedents the board +
  share-of-flow copy
