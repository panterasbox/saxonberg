# Blood-bank economy — implementation plan

Executes [blood-economy-requirements.md](../requirements/blood-economy-requirements.md).
**Kind:** feature, content-led with thin kernel extensions. **Leads from:**
content — **first consumer: the Terminus infirmary blood window**
(`/world/terminus/infirmary/`), the `{category: blood, level: 2, unit: L}`
par the clinical-medicine build authored on the physician's practice with
nothing filling it.

What is being built: a **civic bank of donated, typed, perishable units
with an un-withdrawable floor**, over shipped substrate — the par/restock
spine, the Business + corpo substrate, the three credit ledgers, the
accountability ledger, the treatment-billing rail, the instrumentation
ladder. Blood is its first content. The kernel grows five small seams
(cross-species compatibility, the donor card + consent ladder, the
disposition graft, the `DonationBankMixin` bank mechanism + a
`transfusion` service, two-houses-in-one-room fixes); `trade-medicine`
grows the window class, the typed unit, three verbs, two readings and
three brains; `terminus` + `corpo-goodkin` grow the rows.

Written for a fresh-context build agent. The Grounding section is the
truth of the tree at plan time (2026-10-02, branch `design/blood-economy`
at `e978c0b39`); verify anything you extend.

---

## Grounding

Every fact below was checked by opening the file named. Line numbers are
approximate (±10).

### The blood core (shipped, clinical-medicine)

- `packages/server/src/mud/lib/vitals/BloodType.ts` — value object
  `BloodType(speciesPath, abo)`; `isCompatibleDonorFor(recipient)` =
  **same `speciesPath`** AND the ABO rule (O→any, A→A/AB, B→B/AB,
  AB→AB; `mixed`→nobody); `mismatchFor(recipient): 0|1|2` returns **`2`
  for ANY species difference**. ⚠ So the requirement *"a
  compatible-across-species, incompatible-within-species donation
  works"* is **contradicted by shipped code** — v1 is flat
  (blood.md § Deferred says so: *"the inter-species compatibility
  topology (v1 is flat; `mismatchFor` is where a graph goes)"*). This
  build changes it (D3). Instance methods only (`lint:lib-statics` at
  ceiling).
- `lib/vitals/Blood.ts` — `BloodUnit { speciesPath, type, labelled,
  donorIdentityPath }` declaration-merged onto `BulkPayload.blood`;
  `BLOOD_DEFAULTS` (UNIT_LITRES 0.45, DONOR_MIN_FRAC 0.9,
  DONATION_MIN_MARROW 40, MARROW_COST_PCT_PER_L 60, DRAW_DURATION_S 180,
  TRANSFUSE_DURATION_S 45); `Blood.blend` (the pour-blend → `mixed`).
- `lib/vitals/Vitals.ts` — `bloodType()` (L980; `null` when no
  `bloodVolume` sign), `isBloodTyped()/markBloodTyped()` (L985–991),
  `speciesPathOf()` (private, L993), `drawBlood(litres)` (L1000: spends
  volume + `marrow`, stamps `donorIdentityPath = getIdentityPath() ??
  getTemplatePath()`), `receiveBlood({litres, blood, expander})` (L1019:
  compatible closes to baseline; expander caps at
  `PLASMA_RESTORE_CEILING_FRAC`; incompatible lands plasma only and
  `afflict`s `TemplatePaths.circulationTransfusionReaction` at stage
  `ceil(litres × REACTION_STAGE_PER_L × (mismatch 2 ? 2 : 1))`), returns
  `{accepted, reaction}`. **No accountability arg anywhere in it.**
  `beginDying(cause, windowSec?, blame?)` (L869) stamps
  `record.accountability = blame` — the attribution precedent, on the
  *dying* record only. `getConsciousness(): 'conscious' | 'unconscious'
  | 'dead'` (L167, L1319); `isDying()` (L899).
  `bloodGenotype` is `{persistent, authorable, runtimeState}` (L746);
  the roll reads `species?.getBloodGroups()?.alleles ?? { O: 1 }` (L941).
- `platform/idea/species/Species.ts` — `bloodGroups: { alleles:
  Record<string, number> } | null` (L571), fieldMeta `{persistent,
  authorable, spoiler: 1}` (L801), `getBloodGroups()` (L1215). **The
  object has no `system` key yet.** `_parentCladePath` / `getParentClade()`
  (L436, L993) exist — the Linnaean tree — but nothing blood-related
  reads them.
- Species rows: `packages/content/species-and-names/content/stuff/idea/
  species/animalia/chordata/mammalia/primates/hominidae/homo/` holds 16
  rows (`sapiens`, `khazadicus`, `eldarinus`, `semieldarinus`, `gnomus`,
  `periannath`, `ogrus`, `orcus`, `semiorcus`, `koboldus`, `ghulius`,
  `draconicus`, `infernalis`, `satyrus`, `sensitivus`, `trollius`). Six
  author `bloodGroups.alleles` (sapiens `{A .3, B .1, O .6}`,
  semieldarinus, gnomus, periannath, ogrus, ghulius); the rest default to
  single-allele `O`.
- `packages/content/trade-medicine/src/idea/cmd/medical/TransfuseController.ts`
  — all gates synchronous: no body / no vessel / empty → fail; saline
  branch (L66); `unit = slot.getPayload()?.blood` (L63); spoiled refused
  (L84); **the competence SELF-refusal** on a labelled+typed mismatch at
  `competent+` in `max(nursing, medicine)` (L89–111, reason
  `known-mismatch`); the effect closure (L114–122) has
  `result.reaction` in hand and calls `this.credit(giver)` (nursing
  standard) and `narrate`. **No consent gate, no money, no accountability
  append.** `runOrEngage` (L130) = the 45 s `ManualBuildStep` on `hands`.
- `BleedController.ts` — refuses unconscious / `frac <
  DONOR_MIN_FRAC` / `marrow < DONATION_MIN_MARROW` / too-small vessel /
  would-mix; `onComplete` sets the slot's material to
  `/stuff/idea/material/tissue/blood` and `setPayload({ blood: unit })`
  (L100–105); credits `nursing standard`. ⚠ The `with` (syringe) arg is
  bound by the view (`default: "me:i:[capability.phlebotomy]"`,
  `required: false`) and **never read by the controller** — an NPC with
  no syringe can draw. `TestController.ts` sets `markBloodTyped()`.
- Views `content/trade/medicine/cmd/medical/{test,bleed,transfuse}.yaml`
  — `patient`/`donor` args `requires: VitalsMixin`, `scope: reachable`;
  vessel `requires: [BulkableMixin]`; validators
  `requiresAnimate/Conscious/Embodied`.
- `blood-bag.yaml` = `/platform/thing/Receptacle` (`interiorBulk: true`,
  `interiorCapacity: 0.5`); `platform/thing/Receptacle.ts` is
  `ThermalMixin(BulkableMixin(Good))` — **not `ChattelMixin`** (so
  `consign` cannot take a blood bag: `consign.yaml` `thing` requires
  `[ChattelMixin]`), **not `CirculatingMixin`** (so a Receptacle row
  cannot be a spawn-sweep candidate as-is; `platform/thing/Bottle.ts` and
  `Crate.ts` compose `CirculatingMixin`).
- The blood Material `/stuff/idea/material/tissue/blood` (base-library):
  tags `["tissue","blood","liquid","organic"]`, `spoilActivationEnergy:
  96000`, `ruinedByFreezing: true`, ~3 game-days warm / ~4 game-weeks at
  277 K. `Bulkable.fieldMeta.interiorPayload` is `{persistent,
  runtimeState}` — **not authorable**: a row cannot author a typed unit's
  payload; a class must stamp it (D13). `Freshness` seeds
  `{load: 0, stamp: seedAt}` lazily on first read when the payload has
  no gauge (`lib/material/Freshness.ts` L675), so a stamped-at-register
  unit starts fresh.
- Marrow regrowth: `lib/metabolism/Metabolic.ts` L329–335
  `MARROW_REGEN_PCT_PER_HOUR 0.08` (≈ two game-weeks a unit), gated
  `satiation > 25` and `protein ≥ 40` (`regrowMarrow`, L781). NPCs DO
  metabolize (only the linkdead freeze and the far-past guard protect a
  body; `integratesLongAbsence` is chattel-only) — so an NPC donor who is
  read on a cadence drains satiation and **stops regrowing marrow unless
  fed**. Only two rows in the realm run the `eats` brain (the pantry
  hand, the distributor clerk), and `eats` buys bread with a purse.

### The par / restock spine — and the two things that break it for a fridge

- `lib/employment/ParLine.ts` — `{category, minGrade, level, unit: 'L'|
  'count'|'kg', supplier, exemplar}`; `category` is **one material tag**
  (or a glass row's `category`). `lib/employment/CategoryMeasure.ts` —
  `counts`/`contribution` by material tag + interior litres; **never reads
  `BulkPayload.blood.type`**. So per-type par lines are not expressible
  without a new tag vocabulary (D1 rejects that path).
- `platform/idea/api/EmploymentLogic.ts` `stockSheetForImpl` (L756) sums
  `CategoryMeasure.contribution` over `perceivedGoods(viewer)`, and
  `perceivedGoods` **skips a sealed container that is closed** (L711:
  `closed = isSealable(item) && !item.isOpen()`). ⚠⚠ The ward's
  `blood-fridge.yaml` authors `open: false`. **A par line on blood read
  through `stockSheetFor` therefore reads ZERO while the door is shut**,
  and a `restocks`-shaped keeper would reorder forever. The bank's
  on-hand must be the vault's own read (D1), not the perception sheet.
- `platform/idea/cmd/inventory/PutController.ts` L199–210 **refuses
  `put <x> in <closed sealable>`** (`is closed`). `open.yaml` (boundary)
  targets `requires: SealableMixin`; `ColdStore` composes `SealableMixin`
  (`packages/content/energy/src/thing/ColdStore.ts`:
  `ClimateControl(GridPowered(Staged(Sealable(Atmospheric(Container(Good))))))`,
  `fixedInPlace = true`). So an NPC delivering into the fridge must
  `open fridge` → `put` → `close fridge` (D13), which is also the honest
  thermal cost of a door.
- `ContainmentLogic` has **no seal check** on `move` (grep `isSealable|
  isOpen` → nothing), so a method-level `ContainmentApi.move(unit,
  fridge)` lands a unit in a closed fridge — the registrar putting it away
  (D2's `receiveGift`), and `takeUnit` lifts one out.
- `lib/behavior/restocks.ts` — on-shift keeper reads
  `business.stockSheetFor(keeper)`, groups short lines by `supplier`,
  posts one `supply N <unit> of <category>` bounty per line
  (`job post --bounty`, funded by `wallet use house`), unpacks the bench,
  shelves with `put … on <shelf>`; `counterRoomOf(supplier)` needs the
  supplier to operate a ROOM holding a `Stock`/`ConsignmentShelf`. The
  bounty is **escrowed from the house account** — a house with no money
  posts nothing. `packages/content/trade-farming/src/behavior/farms.ts`
  = produce then consign (`static produces/consumes/claims`, `ctx.config
  .home/.shelf/.batch`). `trade-shopkeeping/src/behavior/consigns.ts`
  takes goods off its home `Stock` with `get 1 <kw>` (L194) and walks.
- The spawn sweep (`docs/subsystems/residency.md` § *The sweep is a
  faucet*): a template row authoring `censusKey` whose class composes
  `CirculatingMixin` is a candidate, drawn in the zone of its
  `container:`; **recurring** (`residency.spawn.intervalS`, mode
  `enforce`) — *"a region that falls short of target keeps drawing on
  every tick"*. Zone `stocks: {censusKey: count}` overrides a row's
  `regionTarget`. The Veshko floor (`goods-yards/veshko/location/
  distillery.yaml` + `thing/volk.yaml` `censusKey: spirit:volk`, class
  `/trade/distilling/thing/SpiritBottle`) is the shipped producer shape:
  **a producer floor's goods stand at target through the sweep** — the
  game's sanctioned production abstraction. `lint:no-authored-faucet`
  gates MONEY faucets only (`openingCapital` and the three retired
  settings keys), not goods.

### The billing rail

- `lib/commerce/PricedOffer.ts` — `collect(key, reason)`: price → venue
  = **`self.getContainer()`** → `EmploymentApi.ensureOperatorAt(venuePath)`
  → `operatingAccountOf` → `BankingApi.settle(charge, credential)` then
  `cash`; every failure (no operator, no account, **settle throws on no
  funds**) returns `{paid: false, note: null}` — **served on the house,
  no debt** (tabs retired). *"The payer is the ACTING PRINCIPAL —
  `BankingLogic.settle` derives it from execution context and there is no
  payer parameter"* (L104–112). So a fee can only be taken from whoever
  typed the verb: a clinician-driven `transfuse` cannot bill the patient
  (D6).
- `platform/thing/Tariff.ts` — `PricedOfferMixin(Thing)`; closed
  `SERVICE_KINDS = ['repair','treatment','burial']` (L82);
  `services: Record<string,string>` + `serviceFor(key)`; `labourIndexed`
  bends `treatment` by the customer's wage × shortfall;
  `commandContributions` peers+environment = `retail/menu.yaml`,
  `retail/order.yaml`. `__tests__/Tariff.test.ts` L75 asserts the kind
  list verbatim (update it with D6).
- `platform/idea/cmd/retail/OrderController.ts` — `counter` arg bound by
  the view (`order.yaml`: `default: "reachable:[class.Tariff]"`,
  `requires: [PricedOfferMixin]`); the service key is the first word;
  `serviceFor(key)` null → **falls through to the menu path** (L85–93).
  ⚠ With TWO Tariffs reachable (the practice's slate + the window's),
  the default binds one and a key only the other prices dies as
  *"nowhere to order from"* (D6 fix). `doService` (L197) stands the
  operator up by `context.location` (the ROOM), performs, then
  `tariff.collect`. `performService` arms: `repair` (CraftingApi), 
  `treatment` (`treatWorst(giver)` — customer = patient), `burial`.
- Ward rows: `infirmary/thing/tariff.yaml` prices `treatment: 12`,
  `repair: 8`, `labourIndexed: true`, keywords `[slate, tariff, charges,
  prices, board]`.

### The org substrate — and the operator collision

- `platform/idea/Business.ts` — `BusinessEntity extends
  BusinessMixin(OrganizationMixin(Idea))` (L357). Fields (L167–293):
  `banksAt`, `parLines` (`getParLines/setParLine/removeParLine`),
  `charter`, `payrollArrears`, `offstage`, `operatingLocations: string[]`.
  **Does NOT compose `PublisherMixin`** — `platform/idea/Organization.ts`'s
  `OrganizationEntity extends PublisherMixin(OrganizationMixin(Idea))`
  does. `lib/employment/Organization.ts` L677 `allowsPublishingBy` →
  `EmploymentLogic.mayPublishAsImpl` (L245), which **fails closed on
  `!MixinApi.isPublisher(publisher)`**, then matches the principal's
  identity against holders of `publishingPositions` (**empty = any
  position**). So today a Business cannot post a release at all (D14).
- `EmploymentLogic.buildOperatorIndex` (L1838) is
  **`Map<operatingLocation → ONE business template path>`** (last writer
  wins); `businessByKey('location', path)` reads the live
  `businessByLocation` index with the same shape. ⚠⚠ **Two Businesses
  naming the ward in `operatingLocations` collide**: one of them is
  simply unreachable by `ensureOperatorAt(ward)`, `clock`, `house`, the
  help-wanted sign. `operatorsAtImpl` (L1807) walks the room AND every
  fixture's `getIdentityPath()` in it — *"attribution keys on the
  fixture: a bank's business operates its counter, not the hall the
  counter stands in"* (`BankingControllerBase.resolveHouse` L109). The
  shipped precedent: every goods-yard outfit lists its `thing/stock`
  (`goods-yards/*/idea/outfit.yaml`), the dyehouse and tailor their
  `thing/counter`. **So the window Business operates its FIXTURE, and the
  practice keeps the ward** (D11).
- Presence (`EmploymentLogic` L832–855): on shift the assignee is
  `teleport`ed to `assignment.station ?? operatingLocations[0]` **if it is
  a Container** — an operating FIXTURE that composes `ContainerMixin`
  would receive the registrar inside it. ⚠ The window's roster slots
  author `station: /world/terminus/infirmary/ward` (D11), and the window
  fixture is **not** a Container (D2).
- `lib/employment/Authority.ts` — `appointingAuthority` kinds `entity`
  (no founder pass) · `office` (founder default) · `seat` · `committee`
  (pool-of-one founder backstop). `infirmary/business.yaml` uses `{kind:
  entity, path: …/agent/physician}` and carries the blood par; `banksAt:
  goodkin`; `operatingLocations: [ward]`; positions `physician`, `nurse`
  (`requires: {discipline: nursing, band: competent}`); rosters 7–19.
- `lib/employment/Position.ts` — `purchases`, `fulfills: string[]`,
  `requires: {gigs|discipline|band}` (closed; `lint:openings`),
  `headcount` (a house that advertises must be a `boot:` producer —
  `scripts/check-openings.ts` rule 3). `Employed`: `getActiveEmployments()`
  (`{organizationPath, positionKey, status: 'on-shift' | 'off-shift' |
  …}`), `shiftState()`, `buysFor()`; `Organization.employs(giver)`,
  `hasProprietor(giver)`.
- Views: `platform/cmd/employment/{apply,appoint,clock,quit,tip,collect}.yaml`
  exist; `work/fulfill.yaml`.
- `packages/content/terminus/pack.yaml` — title
  `/world/terminus/infirmary` held by group `terminus`, `landUse: civic`,
  `feeder: terminus-main:avenue`; a `boot:` list of producer rows (the
  general store's floor + business are the precedent for *"a brain on an
  unspawned NPC never fires, and a business stood up lazily deals no house
  card"*). `terminus/package.json` already depends on
  `@saxonberg/content-trade-medicine` and `@saxonberg/content-corpo-goodkin`.

### The three credit ledgers

- **Chronicle** — `lib/character/Persona.ts`: `recordDeed(fields)`,
  `recordChronicleOnce(key, fields)`, `chronicleEntries()`; keys on
  `getIdentityPath()`; `ChronicleEntryFields {kind?, text|template+vars,
  when?, where?, who?: string[], tags?: string[], key?, archetype?}`
  (`lib/chronicle/ChronicleEntry.ts` L46–66, fields L77–122). Public,
  ungated — callers everywhere (`CombatLogic` L5392, `MenuController`
  L84, `Postmortem.ts` L217). `PersonaMixin.commandContributions.self`
  lists `platform/cmd/charactergen/chronicle.yaml` (L137) and
  `static settings` carries `identity.portrait` (L86) — the two shipped
  per-person surfaces.
- **Disposition** — `lib/trait/Dispositioned.ts`: `imprintSignature` /
  `imprintDeed` are **`@CallSecurity(SecurityPolicies.SelfOnly)`**
  (L246–281), and `SelfOnly` is **reference identity** (`caller !==
  null && caller === target`, `lib/security/SecurityPolicies.ts` L65).
  ⚠ A controller cannot call `giver.imprintDeed(...)`. **No production
  caller exists** (grep: zero sites outside the file; trait.md § Deferred
  confirms *"imprintSignature / imprintDeed have no production call
  sites… `Advancement.ts` marks the channel read-but-ignored… The
  intended writer is authored moments"*). `lib/advancement/Advancement.ts`
  `creditSignatureImpl` (L111) fans only `signature.discipline` and says
  *"The `dispositionValence` channel is read-but-ignored — the
  defined-but-empty lane-1 trait seam."* That is the graft point (D9).
  `lib/advancement/ActSignature.ts` — `DispositionSubcheck {disposition,
  valence}`; `ActSignature {discipline: Subcheck[], dispositionValence?}`.
  `scripts/check-dispositions.ts` validates `disposition:` keys in
  **YAML** against `DISPOSITION_KEYS` (`lib/trait/Disposition.ts`);
  `generosity` and `compassion` are real axes (the lint's own history
  names `greed` as a sign-flipped `generosity`).
- **Renown** — `api/renown.ts`: `append(RenownEventFields)`,
  `recompute()`, `seedTo(subjectId, scope, band)` (appends + schedules a
  debounced fold — `RenownLogic` L413 `SEED_FOLD_DELAY_MS`); a recurring
  recompute runs on `RENOWN_RECOMPUTE_MS` (L683). `lib/standing/
  RenownEvent.ts` — `{subject, source, kind: 'reaction'|'reception'|
  'engagement-sample', signal, locality, groups, at}`; **reactions score
  by the emote's valence** (`RenownLogic.scoreEvents` L355–374:
  `emoteValences.get(signalEmote(ev))`, from the Emote catalogue —
  `packages/content/expression/content/emotes/applaud.yaml` is
  `valence: 1`, `salute.yaml` likewise). `renownOf` reads the
  **materialized** aggregate; append alone moves nothing (renown.md
  § *Seeding the log does not move the figure*).

### Accountability + consent

- `lib/accountability/AccountabilityEvent.ts` — `AccountabilityFields
  {kind, sessionId, initiator, opponent, victim?, killer?, consented,
  sentient, locality?, …}`; a `harm` row is a crime when `!consented &&
  sentient` (L363). Producer-side appends: `lib/hazard/Hazard.ts` L435
  (the trap: `sessionId: 'trap:<id>'`, `victimFor:
  AccountabilityEvent.partyForOf(mover)`, `consented: false`, `sentient:
  SpeciesApi.isSentient(mover)`), `lib/metabolism/Metabolic.ts` L1577
  (the bad meal), `MagicLogic` L1425. `AccountabilityEvent.partyIdOf`
  (L205) / `partyForOf` (L242). `AccountabilityApi.blameFor(victimId)`
  derives the verdict. `PostmortemReading.ts` infers the cause from the
  wounds (*"never read off the stamp"*); the transfusion-reaction
  condition on the corpse is what it would see.
- `getConsciousness()` is the implied-consent predicate the slate named;
  `isDying()` the emergency one. There is no consent surface of any kind
  on a patient today.

### Corpo — the ghost sign

- `lib/corpo/Branded.ts` — `_brandKey` `{persistent, authorable,
  authorPicker: 'Brand'}`; `getBrand()/getCorpo()` resolve on read via
  `CorpoApi`; `markupAugmenters = [brandMarkAugmenter]` appends *"a
  product of <Corpo>"*; `subscribableFields` `brand`/`corpo`.
- `platform/thing/NeonSign.ts` = `AdornmentMixin(BrandedMixin(
  LightSourceMixin(Thing)))`, attached via a host's `adornments:`
  (`AdornableMixin.applyAdornments`; `Location` composes `AdornableMixin`).
  The Lounge's `neon-veshko.yaml` authors `_brandKey: volk`,
  `emittedIntensity: 95`. A sign with `emittedIntensity: 0` is a **dead
  neon** — zero code (D12).
- `corpo-goodkin`: `content/stuff/idea/corpo/Corpo/goodkin.yaml` (key
  `goodkin`, the Paternalist), `Brand/goodkin-reserve.yaml` (the bank's
  mark), `content/corpo/goodkin.yaml` = the `/platform/idea/Organization`
  chart (`appointingAuthority: {kind: committee, parcel: /corpo/goodkin}`,
  one `chief-executive` seat, unfilled); `pack.yaml` claims
  `/corpo/goodkin` for group `goodkin-committee`. *"Goodkin as a whole
  trades through its subsidiaries — each a Business with its own account,
  naming this as `parentOrganization`."* A Business has no corpo field.

### Instrumentation (the readable surface)

- `lib/instrument/Reading.ts` — abstract `Reading extends
  SingletonMixin(Idea)`; a channel is a **row** `<root>/idea/reading/
  <channel>.yaml` with `channel`, `kind: fact|preview|record`, `scope:
  [self|here|subject]`, `discipline`, `instrument`, `eyeCeiling`,
  `improves`, `stakes`; three `@hook`s `analyze` / `measure` / `benchRead`
  + `truth()`; `ReadingCatalogue` warms by path infix `/idea/reading/`
  across every root, lazily and at `onCreate` — **a pack ships the row +
  the class and is done** (instrumentation.md § *A channel is a row any
  pack can ship*; 15 pack reading classes exist). `trade-medicine` ships
  `patient` + `postmortem` (`src/idea/reading/PatientReading.ts`, the
  banded `analyze(context, subject, band, handTool, param)` shape).
  `analyze.yaml`: `subject` is `greedy: true`, `scope: ["$focus",
  "reachable"]`, `requires: any`.

### Brains

- `lib/behavior/brain.ts` — `BrainContext` has `host`, `config`,
  `say(text, target?)`, `emote(verb, target?)`; a brain forces verbs with
  `host.forceCommand(...)`. Statics `label/kind/claims/summary/urgency/
  presenceGated/ambient/act` (`restocks.ts`, `nurses.ts`). `nurses.ts`
  (trade-medicine) triages the room on shift: `dying` rank 400 first;
  everything through body primitives. `Behaved.fireBeat(brainPath)`
  (L139) is what a drive calls through `eval … --on <kw> return
  this.fireBeat('<brain>')` (cold-storage / agent-coordination drives).
  `tree-dialogue` config shape: `counting-houses/agent/officer.yaml`
  L79+ (`entry:` guards, `nodes:` with `beat`/`choices`).

### Press

- `lib/press/Release.ts` — `ReleaseKind` includes `notice`; `api/press.ts`
  `publish({publisher, headline, body?, kind?, …})`; the `press` verb
  (`platform/cmd/system/press.yaml`): `press post <headline> --kind
  notice`, validator `requiresPublisher` (holds any publishing position).
  `PublisherMixin` fields: `label`, `realm` (`world`), `visibility`,
  `feedPath`, `publishingPositions` (press.md § PublisherMixin).

### The wire harness + the lints

- `packages/wire/src/harness/session.ts` — `Session.open(handle,
  {startLocation?, wizard?})`, `cmd(text).said()`, `plain()`,
  `drainProse()`, `uniqueHandle()`; `declareFile({file, packs,
  dirtyReason})`. Drives are `packages/wire/tests/<feature>.dirty.wire.
  test.ts` (`cold-storage` and `clinical-medicine` are the two to crib —
  the latter uses `practice <discipline> hard success` to band a session
  and `eval … --on <kw>` for NPC beats).
- `packages/server/package.json` lint roster (`lint:family` derives it):
  the gates this build must satisfy are named in § Convention
  conformance. `check-perishable` reads `_materialPath` (a bulk
  `interiorMaterial` is not in its scope); `check-pathogens` reads
  `Condition/pathogen/` rows; `check-person-keys` matches the literal
  `kind: 'player'` + `getTemplatePath()` shape; `check-counters` refuses a
  kernel `platform/**` class composing `PricedOfferMixin(` /
  `ConsignmentShelfMixin(` / `AttendantMixin(` / `HeldGoodsMixin(` /
  `BankMixin(`; `check-arg-kinds` requires a pack mixin named in
  `requires:` to carry `static _mixinRefusal`; `check-dispositions`
  validates YAML `disposition:` keys and dialogue `trait:` guards.
- Package exports (`packages/server/package.json`): `./mud/platform/thing/*`,
  `./mud/platform/idea/*`, `./mud/platform/agent/*` are exported;
  `./mud/platform/idea/api/*` is `null` (a pack never imports a logic
  singleton). `arcana/src/thing/Potion.ts` extends a platform thing class —
  the precedent for `BloodWindow extends Tariff`.

### Collisions (verified branch state)

`./tools/wt-status`: `build-4` on `design/blood-economy`, clean, nobody
else holds it. Merge `origin/master` into the branch before W0.

⭐ **Reconciliation against `origin/master` @ `4791a8ab1` (2026-10-04).**
Master advanced since the grounding (`e978c0b39`) — the **taps build**
(sap/milk/eggs) + a wave of **design slates** (standing/attribution/
contribution, committee, llm-economy, wizardry, client-*). Checked
against this plan; **no semantic conflict**, because:
- The plan's load-bearing code — `Vitals`, `Persona`, `Advancement`,
  `lib/commerce`, `Tariff`, `OrderController`, `Business`,
  `EmploymentLogic`, `lib/trait`, `lib/standing`, `lib/accountability` —
  **did not change**, and the **Terminus infirmary + corpo-goodkin
  content did not change** (Risk 11 relaxes: `ward.yaml`/`business.yaml`
  are as grounded — still merge + re-glance, but they did not move).
- ⚠ **`mixin.ts` merge-adjacency:** taps added `Producing:
  'ProducingMixin'` + its refusal to the same `Mixins`/`MixinRefusals`
  objects the plan edits for `DonationBank`. No conflict (adjacent
  inserts); add `DonationBank` alongside. `Producing`'s rationale
  ("kernel because its composers share no pack ancestor") is the same
  one this plan gives for `DonationBankMixin` — cite it.
- ⚠ **New gate `lint:test-seams`** (the `@TestOnly` decorator) is now in
  `lint:family`. This build adds **no** test-only Api statics, so it
  passes as-is — do **not** introduce an unmarked `_*ForTest` Api static
  (W2's disposition test reads the public `dispositionEntries()`, no seam
  needed).
- ⚠ **`Species.ts` grew +110** (taps' `TapSpec`, unrelated to blood) —
  the cited `bloodGroups` line (~L571) drifted; `bloodGroups` and
  `getBloodGroups()` are unchanged, find them by name, D3 is intact.
- ✅ **`SelfOnly` unchanged** (the `lib/security/decorators.ts` diff only
  *adds* `@TestOnly`, no policy edit) — D9's self-call reasoning stands.
  The accountability.md meal-harm fix (payload maker now stamped on the
  `order` path; toxin doses still unattributed) is adjacent and
  **validates** D5's choice to append the transfusion `harm` row
  controller-side rather than via a producer path.
- **Conceptual overlap, not a conflict:** the standing/attribution/
  contribution slates design a future standing system the gift-credit
  (D8–D10) lives near. They are **unbuilt** (slates), so this plan builds
  against shipped `RenownApi`/`Dispositioned`/chronicle correctly;
  whoever builds that wave should know blood now mints a renown
  `reaction` + the first authored `dispositionValence`. Flagged to the
  user; not a blocker.

---

## Plan-level decisions

### D1 — Per-type demand: one aggregate par drives supply; the typed read is derived from the vault (E1)

**Rejected:** per-type par lines. They need per-type material tags
(`blood-O`, …) that do not exist, a `CategoryMeasure` that reads a
payload, a `supply` contract that can be filled by a specific donor only,
and a supplier whose donors have fixed types — the whole chain would have
to learn blood for one sheet.

**Chosen:** the Business keeps **one** `{category: blood, level, unit: L}`
par line (the authored level, editable with `house par`). The window
fixture derives **on-hand by lot** from the units actually in its vault
(`DonationBankMixin.getLots()` over `BulkPayload.blood` of every bulk
holder in the configured store — D2), **ignoring the door** (a registrar
knows her own fridge; the perception sheet does not see into a closed
one and must not be the bank's read). Restock cadence works off the
aggregate shortfall (`parLevel − Σ lots`); shortage legibility, the
summons and the notice work off the lots: a lot is **short when it has
no unit** (there is no per-type level to be short *against*; "O is
out" is the shortage the product names). `house stock` stays the
perception sheet and will read the fridge as the door state allows — a
documented, honest difference; the typed panel is `analyze bank` (D15).

### D2 — The window fixture is `BloodWindow = DonationBankMixin(Tariff)`, the mechanism is a kernel mixin

The bank needs a fixture that (a) is the window Business's operating
location (the collision fix, D11), (b) carries the service price so the
fee attributes to the window (D6), (c) reads the vault, issues, receives
gifts and records custody, (d) affords `issue`/`donate`/`menu`/`order`.
A `Tariff` already does (b) and `order`/`menu`; the bank mechanism is new.

- **Kernel:** `lib/commerce/DonationBank.ts` — `DonationBankMixin`
  (substrate, inherited only): *a civic bank of donated units read by
  lot over a configured store*. Fields `_vaultPaths: string[]`
  `{persistent, authorable, authorPicker: 'Template'}` (resolved live on
  read, the `_brandKey` idiom), `_lotSystem: string` (the blood system
  this window serves — D3 — default `''` = whatever its vault holds).
  Methods: `getVaults()`, `getLots(): Map<lotKey, {litres, units}>`,
  `lotKeyOf(slot)` (today: `blood.type` within `_lotSystem`; the one
  place a second typed payload adds a branch — stated in the docstring),
  `parLevel()` (the operating business's par line in `lotCategory`,
  default `blood`), `shortfall()`, `shortLots()` (ABO types of the
  window's system with zero units), `takeUnit(lot, by)` /
  `takeCompatibleUnitFor(recipient, by)` (moves the holder to `by` via
  `ContainmentApi.move`, writes the custody deeds — D16),
  `receiveGift(holder, donor)` (moves into the first vault, custody
  deed). `Mixins.DonationBank` + `MixinApi.isDonationBank`. ⭐ Named for
  the substrate (a donation bank), not blood; the lot vocabulary is the
  only blood-aware line and says so.
- **Pack:** `trade-medicine/src/thing/BloodWindow.ts` —
  `DonationBankMixin(Tariff)` (`Tariff` from
  `@saxonberg/server/mud/platform/thing/Tariff`, the `Potion` precedent):
  the registrar's counter — a priced board that is also the bank's
  register. `static commandContributions` = Tariff's (menu/order) +
  `trade/medicine/cmd/medical/issue.yaml` + `donate.yaml` on
  `environment` and `peers`. Row `/world/terminus/infirmary/thing/
  blood-window`. `lint:counters` is satisfied: the composer of
  `PricedOfferMixin(` is a pack class; `Tariff` itself was already kernel.
  ⭐ A second **blood** window is rows (a `BloodWindow` row + a Business
  row + a vault). A second **kind** of bank (milk) is one small class
  composing the same mixin in its trade — honest, and stated.

### D3 — Compatibility crosses species by a declared blood SYSTEM, not the clade tree

`Species.bloodGroups` gains an optional `system: string` beside
`alleles` (same authorable blob, no fieldMeta change). Two bodies are
ABO-comparable iff their systems match; different systems → mismatch
`2` as today. Default system = the species' own path (today's flat
behaviour for every unauthored species — nothing shipped changes until a
row says so). `BloodType` is constructed with `(system, abo)`; `BloodUnit`
gains `system` (stamped at `drawBlood` beside `speciesPath`, which stays
for provenance); `Vitals.bloodSystemOf()` resolves it. **Why not clade
distance:** a tree threshold is nested and the species slate's hazard
is rank; overlapping *declared clusters* are the slate's own answer
("a cycle or overlapping clusters") and need no new vocabulary. Content
authors three clusters across the sixteen `homo/*` rows so the lesson is
visible: e.g. `hominid` (sapiens, khazadicus, periannath, gnomus,
semiorcus), `fae` (eldarinus, semieldarinus, satyrus, sensitivus),
`giant` (ogrus, orcus, trollius, draconicus); koboldus, ghulius,
infernalis stay their own system (*more fragile, its own drive* — the
species slate's deliberate note). ⚠ The exact clustering is the build's
call within that shape; it must satisfy the drive: a sapiens O can give
to a khazadicus AB; two eldarinus (A, B) cannot share.

### D4 — The donor card is a Persona FIELD with its own verb (E2)

**Rejected:** a `PropertiedMixin` prop (CLAUDE.md: a prop is for a
key *computed at runtime*; this key is fixed and the consent ladder
*narrows on it* → a field); a `settings` entry (the lookup chain falls
through to the zone/universe — a locality default of "will receive"
would be the engine consenting on your behalf; and a string setting is
untyped); a `donor` CredentialKind (session-durable, resets at login).

**Chosen:** `PersonaMixin.donorCard: { receive: 'will' | 'wont' | '',
donor: boolean }` `{persistent, authorable}` (an NPC row may author a
conscientious objector), `getDonorCard()/setDonorCard()`. Composed where
Persona is (`Character` → every PC and every NPC with a self; a Beast or
an Extra-without-Persona simply has no card, which is the truth). Verb
`donor` (kernel, `platform/cmd/medical/donor.yaml` +
`platform/idea/cmd/medical/DonorController.ts`): bare `donor` shows the
card and your tested type (or *untested*); `donor register|withdraw`;
`donor accept|refuse|clear`. Afforded by `PersonaMixin.commandContributions.self`
(the `chronicle.yaml` precedent, L137). Acts on the giver only. ⭐ With
the summons pure-pull (user decision), `donor register` places you on the
window's **donor roll** — an opt-in list read off `analyze bank` (D15)
that someone facing a shortage consults and answers in the room, never a
push target. Registration's v1 consumer is the roll + the legibility of
your own card; it is also the seam the future paid-donor lever reads.

### D5 — The consent ladder lives on the patient's Persona; harm is appended controller-side (E5)

`PersonaMixin.transfusionConsent(giver): { verdict: 'directive-yes' |
'directive-no' | 'consented' | 'asked' | 'implied' | 'self', consented:
boolean }`:

1. `giver === this` → `self`.
2. card `receive: 'wont'` → `directive-no` (consented false) — holds
   unconscious, holds dying; *"even to death"*.
3. card `receive: 'will'` → `directive-yes`.
4. no card: `isVitals(this)` and (`isDying()` or `getConsciousness() !==
   'conscious'`) → `implied`.
5. no card, conscious: a **player-driven** body (`MixinApi.isHasInteractive`)
   → `asked` (not consented *yet*); any other body → `consented` (an NPC's
   answer is its author's — author `wont` for an objector).

`TransfuseController` reads it before the competence judgement: `asked`
→ refuse with reason `consent-pending`, tell the giver, and send the
patient one line *"<giver> offers you a transfusion — `donor accept` or
`donor refuse`"* (the contemporaneous answer IS the card; the giver
retries). `directive-no` → the act **proceeds** (never a paternalistic
block — the requirements' consequence-not-refusal rule) and the
controller appends a `harm` row `{consented: false}`. After the effect,
when `result.reaction > 0` OR the verdict was `directive-no`, append
`AccountabilityApi.record({kind: 'harm', sessionId: 'transfusion:<giver
stuffId>:<now>', initiator: giverId, opponent: patientId, victim:
patientId, killer: giverId, consented: verdict.consented, sentient:
SpeciesApi.isSentient(patient), locality, victimFor:
partyForOf(patient)})` — the trap's shape. A consented mismatch is a
malpractice trail (not a crime); a non-consented one is the poisoner's.
`Vitals.receiveBlood` is untouched (no `blame` threading — the ledger row
is what `blameFor` reads; the dying record's `accountability` stays the
cascade's business). A non-Persona patient (a beast) → `implied`.

### D6 — The fee is a `transfusion` service on the window's board; the floor is on the house (E3)

- `SERVICE_KINDS` gains `'transfusion'` (closed-vocab kernel edit; update
  `Tariff.test.ts` L75). `OrderController.performService('transfusion')`:
  the bound tariff must `MixinApi.isDonationBank(tariff)`; the customer
  must be `isVitals`; `tariff.takeCompatibleUnitFor(customer, attendant)`
  (none → `no-compatible-unit`, *"nothing on the shelf will match
  you"*); `customer.receiveBlood(...)`; the consent verdict is `self`
  (the customer asked). The unit's holder drains and is left on the
  counter (an empty bag). Then `collect` as every service does — on the
  house when the customer cannot pay.
- **Two kernel fixes two houses in one room needed anyway:**
  (a) `PricedOfferMixin.collect` resolves the operator **self-first**:
  `ensureOperatorAt(self.getIdentityPath())` when the priced fixture is
  itself an operating location, else its container — the same fixture-
  first attribution `operatorsAtImpl` and `resolveHouse` already use;
  (b) `OrderController`: when the bound `counter` does not price the
  key, scan every reachable `Tariff` (`MqlApi` `reachable:[class.Tariff]`)
  for one that does before falling through to the menu — *"a venue can
  carry both"* extended to *a room can carry two houses*.
- ⚠ **"Billed after" is realized as "on the house."** Tabs were retired;
  there is no debt object and the payer is the acting principal, so the
  floor transfusion (the NPC registrar transfusing a dying patient under
  implied consent) **cannot bill anyone** — it is free, exactly as
  `collect`'s catch already makes a broke customer's `order treatment`
  free. The fee attaches only to the patient-initiated `order
  transfusion`. This satisfies both the *"nobody dies for an empty
  purse"* floor and *"the patient pays for the service"*; what it does
  not do is create a receivable. Flagged in § Risks for the user — it is
  the requirements' *"handled after"* read against shipped money
  doctrine, not a reopening.
- A player clinician who gets a unit `issue`d and `transfuse`s it by hand
  pays nothing — that is the gift path (a friend gives you blood). The
  window's margin is the window's service, not the clinician's act.

### D7 — `issue <lot> [to <someone>]` is seat-gated, gift-only, recorded (E4a)

`trade-medicine/content/trade/medicine/cmd/medical/issue.yaml` +
`src/idea/cmd/medical/IssueController.ts`. Args: `lot` (string: `O`,
`A`, `B`, `AB`; a unit keyword also accepted — the build picks one
grammar and keeps it), `recipient` (object, `reachable`, `requires:
VitalsMixin`, optional → the issuer's own hands), `window` (object,
`default: "reachable:[mixin.DonationBankMixin]"`, `requires:
[DonationBankMixin]`). Gate: the giver holds a non-exited **on-shift**
employment at the window's operating business
(`giver.getActiveEmployments().some(e => e.organizationPath === org &&
e.status === 'on-shift')`) or `business.hasProprietor(giver)`; else
refuse `not-on-the-window` (*"you do not keep this window"*). Effect:
`window.takeUnit(lot, recipient)` → the unit moves to the recipient;
custody deeds (D16); scene. No money; the unit is never `buy`-able (it
is not on a Stock). Afforded by `BloodWindow.commandContributions`.
⭐ **NPC-only in v1 by construction:** the window has no player-fillable
seat (D11) and the proprietor is the NPC registrar, so the seat gate
admits only NPC staff — a player never issues. `issue` exists because the
`banks` brain forces it (the floor beat, D14); it stays a verb (not
dead) so the deferred ceiling can afford it to players later with no new
plumbing. The seat gate is already the right gate; only the *roster* keeps
players out for now.

### D8 — `donate <bag> [at <window>]` is the gift act; two mint sites (E4b)

- `donate.yaml` + `DonateController.ts` (trade-medicine): `bag`
  (`inventory`, `requires: [BulkableMixin]`, must hold a blood unit —
  else `not-blood`), `window` (default reachable DonationBank). Effect:
  `window.receiveGift(bag, giver)` → the bag goes into the vault; then
  the **gift credit** on the giver iff `MixinApi.isHasInteractive(giver)`
  (an NPC giving is plumbing — the requirements' asymmetry) AND
  `unit.donorIdentityPath === giver.getIdentityPath()` (you cannot earn
  credit donating somebody else's blood): chronicle deed (`tags:
  ['blood','gift']`, `where`, `who: [registrar]`), the disposition
  signature (D9), the renown move (D10). `compassion` joins `generosity`
  when the donated lot was **short** at the moment of the gift
  (`window.shortLots()` contains it — the named shortage answered).
- **The second mint site** is `TransfuseController`: own blood
  (`unit.donorIdentityPath === giver identity`) into a **named other**
  (`!self`) by a player → the same credit with `compassion` always (a
  named person). Self-use (own blood, self) → nothing; transfusing
  somebody else's unit → nothing (the donor already earned it).
- The recipient of a transfusion that **revives** them (patient was
  `isDying()` before and is not after) gets `recordChronicleOnce`-shaped
  deed *"<donor>'s blood brought you back"* (the slate's best-donor loop);
  keyed per event, not once-ever.

### D9 — The disposition mint rides `creditSignature`'s graft, not a new seam

`SelfOnly` is reference identity, so the only honest writer is the host's
own method. `AdvancementMixin.creditSignature(signature, opts)` is
already the host-called act-credit entry and documents the disposition
channel as *"the defined-but-empty lane-1 trait seam."* **W2 fills it:**
inside the mixin method (not the free impl), after the transcript fan,
`if (MixinApi.isDispositioned(this) && signature.dispositionValence?.
length) await this.imprintSignature(signature, {kind: opts.kind ?? 'deed',
tags: opts.tags})` — a self-call from the host's frame, which `SelfOnly`
allows. Verified by a unit test that calls `creditSignature` through the
proxy and reads `dispositionEntries()`. The gift signature constants
live beside `BLOOD_DEFAULTS` as `BLOOD_GIFT_SIGNATURE` (`generosity +2`
routine, `compassion +2` named; the magnitudes are dials). This is the
first live authored valence; `traits` begins printing a band for a donor.

### D10 — Renown: a `reaction` from the window, then a scheduled fold

`RenownApi.append({subject: donorId, source: <window business path>,
kind: 'reaction', signal: {emote: 'applaud', tags: ['blood','gift']},
locality: <ward address prefix>})` then `ScheduleApi.schedule(SEED_FOLD-
like delay, () => RenownApi.recompute())` — the `seedTo` shape: append
AND fold, or the figure does not move. `applaud` is a shipped
`valence: 1` emote (the value function scores reactions by emote
valence); the institution applauds the donor publicly, which is also
the scene line. Scope = the locality, so the standing is *known in the
Counting-Houses as someone who gives*.

### D11 — Two Businesses, two fixtures, one ward (E6, E10)

- **The window** `/world/terminus/infirmary/idea/window` (class
  `/platform/idea/Business`): `name: "the blood window"`. ⭐ **Private,
  NPC-run** (user decision 2026-10-04 — a private operator under a
  regulatory floor, not a civic charter; public/private hybrid in one
  life-or-death market is the messy case): `appointingAuthority: {kind:
  entity, path: /world/terminus/infirmary/agent/registrar}` — the
  **registrar NPC is the proprietor** (she kept the divested window and
  the Goodkin name; `entity` = no founder pass, a specific private owner).
  Positions `registrar` (`publishes`; wage 5), `night-registrar` (wage 4),
  `phlebotomist` (`requires: {discipline: nursing, band: novice}`) — **all
  `headcount` matched by NPC `rosterSlots` so every opening is 0; no
  player-fillable seat in v1** (player operation is deferred; `apply`
  finds nothing open, which is the honest refusal). `rosterSlots` for two
  NPC registrars covering 24 h, each with `station: /world/terminus/
  infirmary/ward`; **`operatingLocations: [/world/terminus/infirmary/
  thing/blood-window]`** (the fixture — never the ward); `parLines:
  [{category: blood, level: 2, unit: L}]` (moved OFF the practice;
  **delete the line from `infirmary/business.yaml`**); `banksAt: goodkin`;
  `publishingPositions: [registrar, night-registrar]`, `realm: world`,
  `visibility: public`, `feedPath: /world/terminus/infirmary/press`,
  `label: "the Goodkin window"` (D14). `boot:` producer in
  `terminus/pack.yaml`. ⚠ Because the proprietor is the registrar NPC,
  she must be spawned for the window to stand up with an owner — the ward
  is in `boot:` and she is `cast:` there; verify the entity-authority
  resolves to a live NPC at standup (if a lazy-standup ordering makes the
  owner absent, fall back to `{kind: committee, parcel: /world/terminus/
  infirmary}` as the private-trust backstop and note it).
- **The upstream** `/world/terminus/infirmary/idea/bloodworks`:
  `name: "Goodkin Bloodworks"`, `parentOrganization: /corpo/goodkin`,
  `appointingAuthority: {kind: committee, parcel: /corpo/goodkin}` (the
  corpo's chart appoints, as every Goodkin subsidiary), position
  `runner`, one NPC roster slot 24 h, `operatingLocations:
  [/world/terminus/infirmary/collection]` (its own room — D13),
  `banksAt: goodkin`. `boot:` producer. No par (it is the supplier, not
  the buyer). ⭐ The player can never switch it off: nothing in it is
  player-holdable (its authority is the corpo's committee; players only
  join the corpo's committee through the Registrar of Corporations).
- The practice keeps the ward and its two seats untouched.

### D12 — The ghost sign is a dead Goodkin neon

`/world/terminus/infirmary/thing/goodkin-sign.yaml` = `/platform/thing/
NeonSign` with `_brandKey: goodkin-bloodworks`, `emittedIntensity: 0`,
prose: the sunrise lettering over the window, the tubes long dead.
Attached by the ward's `adornments:`. New Brand row
`corpo-goodkin/content/stuff/idea/corpo/Brand/goodkin-bloodworks.yaml`
(`owner: goodkin`, the mark the upstream's units carry — `BloodUnit`
rows author `_brandKey: goodkin-bloodworks`, so *"a product of Goodkin"*
renders on every unit the upstream ships, while a player's donated bag is
unbranded — the gift is legibly not the corpo's). Zero code.

### D13 — Supply is a producer floor plus a visible donor (E8)

- **The collection room** `/world/terminus/infirmary/collection`
  (`SingletonCartesianLocation`, east of the ward; cross-zone exit both
  sides explicit): Goodkin's kept upstream — a donor couch, the runner's
  cold case, and the **floor stock**: a `Stock` fixture
  (`/trade/shopkeeping/thing/Stock` — the goods-yard precedent) that
  `BloodUnit` rows name as `container:` with `censusKey: blood:O` etc.,
  standing at target through the recurring spawn sweep (the game's
  sanctioned production abstraction, identical to the Veshko floor). Zone
  `stocks:` sets the counts (O 4, A 2, B 2, AB 1 — dials; the rarer the
  lot, the thinner the floor, which is what makes a player's rare-type
  gift matter).
- **`BloodUnit`** (`trade-medicine/src/thing/BloodUnit.ts` =
  `CirculatingMixin(BrandedMixin(Receptacle))`, row-bearing): authorable
  `bloodType`, `bloodSystem`, `donorKey` (default = the Bloodworks
  path — an institutional pooled donor, stated in the docstring),
  `labelled: true`; at `postRegister`, when the interior is blood and
  the payload has no `blood`, stamps `interiorPayload.blood` from the
  fields. Rows `/trade/medicine/thing/unit/{o,a,b,ab}.yaml` ship in the
  trade (a typed unit is the trade's object); the Terminus rows that
  `extends:` them add `container:` + `censusKey` + `_brandKey` in
  `/world/terminus/infirmary/thing/unit-*.yaml`. Freshness seeds on first
  read (grounding) and the room is not cold — a unit left on the floor
  spoils in ~3 game-days; the runner moves them.
- **`supplies` brain** (`trade-medicine/src/behavior/supplies.ts`, host =
  the Goodkin runner, on shift): reads the window's `shortfall()` (via
  `config.window` → the live fixture); while short and the floor has a
  unit: `get 1 <unit kw>` off the Stock (the `consigns` idiom), `go west`,
  `open fridge`, `put <kw> in fridge`, `close fridge`, `go east`. Pure
  verbs; no money (no bounty, no house account — the floor cannot be
  bankrupted); cadence = `config.cadence`; batch cap. The player sees the
  runner come and go — the delivery beat.
- **The visible donor** — one `Extra` row `/world/terminus/infirmary/
  agent/donor` (`cast:` of the collection room) with the `donates` brain
  (`src/behavior/donates.ts`): on cadence, if `marrow ≥ DONATION_MIN_
  MARROW` and a bag is on the couch, `bleed into <bag>` then `put <bag>
  on <stock>`; otherwise sits (an emote beat: *rolls down a sleeve*). It
  really gives when it can — honest, non-load-bearing (the floor stock is
  the floor). ⚠ The Extra's marrow regrows only while fed; **no feeding
  is wired** (the two `eats` rows need a purse). Stated as the known
  limit: the donor is the face, the floor is the sweep. If the drive
  shows the donor never gives even once, drop the `bleed` and keep the
  emote — do not add a feeding economy to this build.

### D14 — The registrar `banks` brain: the floor, the summons, the notice (E9)

`trade-medicine/src/behavior/banks.ts`, host = a registrar on shift,
`config.window`. Three beats in priority order, one act per beat:

1. **The floor.** Any `isVitals` body in the room with `isDying()` and
   a verdict from `transfusionConsent(host)` that is not `directive-no`,
   when `window.takeCompatibleUnitFor` would find a unit → `issue <lot>`
   (to self) then `transfuse <patient> from <unit>` — forced verbs, so a
   player attendant could do the identical thing. Free (D6). The custody
   deed's `who` lists every on-shift window holder present (a fact the
   record keeps: *the floor served while X held the window*).
2. **The summons — pure pull (decided by the user).** For each lot in
   `window.shortLots()` not announced within `config.summonsCooldownS`
   (default one game-hour): `say` *"Anyone type O? The window is out."*
   in the room, once per shortage onset (the cooldown key is `lot`; it
   resets when the lot refills). **No targeted message of any kind** — no
   `tell`, no push into anyone's feed. The pull is the room ask + the
   ticker notice (beat 3), both of which a donor meets by being present
   or by reading, never by being nudged. The opt-in **donor roll** (the
   `donor register` flag) is a READABLE surface, not a push target: a
   registrar or player facing a shortage reads it off `analyze bank`
   (D15) to see who has registered as that type, and asks them in the
   room — the summons stays something a person chooses to answer.
3. **The notice.** When a lot first goes short (transition, not level):
   `press post "The Goodkin window at the infirmary is short of type
   O" --kind notice`; when it refills, no retraction (a notice ages off
   the ticker). Requires D14's kernel half: **`BusinessEntity` composes
   `PublisherMixin`** (`platform/idea/Business.ts`), with
   `mayPublishAsImpl` additionally failing closed on an empty `feedPath`
   (a business that authors no feed publishes nothing — so composing on
   every Business changes nothing for the forty that author none).
   Claim: every house *may* keep a notice board if it names a seat and a
   feed. The `press` verb is afforded to any publisher-position holder
   already; the registrar's roster seat is in `publishingPositions`.

Both registrars run `banks`; the night one only ever fires the floor
(the summons/notice beats carry a `config.quiet: true` on the night row
— nobody shouts at 3 a.m.; the ticker still gets the notice).

### D15 — Legibility: two Reading rows in `trade-medicine` (E7)

- `blood` (`content/trade/medicine/idea/reading/blood.yaml`, class
  `/trade/medicine/idea/reading/BloodReading`, `kind: fact`, `scope:
  [subject, self]`, `discipline: medicine`, `eyeCeiling: expert`):
  `analyze blood` / `analyze blood <person>`. The eye ladder: untrained —
  the type if tested (else *untested; a `test` would tell you*), and
  that O gives to anyone *of the same blood system*; novice — whom you
  can give to within your system; competent — whom you can receive from;
  proficient — **the systems**: which species share yours (*"a dwarf and
  a halfling can take your blood; an elf cannot"*) derived from every
  warmed `Species` row's `bloodGroups.system`; expert — the full table.
  `truth()` returns the compatibility matrix. Competence resolves detail,
  never access. ⚠ `analyze blood <person>` reads a *tested* label only;
  an untested stranger reads *untested* at every band (type is a belief
  learned by `test`).
- `bank` (`reading/bank.yaml`, class `BankReading`, `kind: record`,
  `scope: [subject, here]`, `discipline: nursing`): `analyze bank
  [window]` — the typed panel: each lot's litres/units, the par and
  aggregate shortfall, which lots are **out**; proficient adds the
  freshest-spoils-first order **and the donor roll** (who has
  `donor register`ed, by tested type — the opt-in list a shortage is
  answered from, the pull surface that replaces the push; present
  registrants first); expert adds the custody trail — the last N
  chronicle deeds tagged `blood,custody` with `where` = this room
  (`ChronicleEntry.find`), *who issued what to whom*. This is the read
  the drive's step 1 and step 6 assert against. (The roll reads
  registered donors from their `donorCard.donor`; keyed on
  `getIdentityPath()`, present-in-locality scoped.) Both rows are warmed by
  `ReadingCatalogue` with no kernel edit.

### D16 — Custody is chronicle deeds on the persons, trail derived by tag

No new collection (CLAUDE.md), no new `DocumentKinds` entry. Every
`takeUnit`/`receiveGift` writes a deed on the **issuer** (`"issued a unit
of O to <recipient> at the Goodkin window"`, `who: [recipient]`, `tags:
['blood','custody','issue']`, `where: <room path>`) and on the
**recipient** (`"was issued…"`), on the **donor** (`"gave a unit…"`,
`tags: ['blood','custody','gift']`) — persons only (a Business has no
chronicle; an NPC registrar is a `Cast` with Persona, so the window's
NPC-issued units are on her record). The window-level trail is the query
`{tags: 'custody', where: <room>}` rendered by `analyze bank`'s expert
rung and readable per person with `chronicle`. ⚠ Deeds on the NPC
registrar are *plumbing* too — they are custody, not standing; nothing
appends renown or disposition for an NPC act (the `isHasInteractive`
gate in D8).

### D17 — Lore: a wiki page and the registrar's line; default = recent and resented (E11)

- `corpo-goodkin/content/wiki/lore/the-paramount-decree.md` (the wiki
  contribution kind the pack can carry; `wiki-starter/content/wiki/lore/
  the-compact.md` is the shape): one page — the integrated monopoly, the
  Decree, what Goodkin kept and what it gave up, why the sign stayed.
- The day registrar (`/world/terminus/infirmary/agent/registrar.yaml`, a
  `Cast`, `archetype: registrar`, dispositions `diligence 60, trust 40,
  sociability −20` — crusty) carries a `tree-dialogue` brain (`trigger:
  engage`) with the Decree node: *"We keep the name. Goodkin hasn't run
  this window since the Decree — they kept the collecting and the
  carting, which is where the money was, and left us the giving away.
  Sign's theirs; the blood's yours."* **Default tone: recent enough to be
  resented** — within her working life, so the misread *"so Goodkin runs
  it?"* is corrected by someone who remembers the day. The alternative
  (ancient and forgotten, the sign a curiosity) is a one-line edit to the
  beat; the user left this open and may flip it.
- The night registrar is an `Extra` (a role, no name) with the same
  brain config minus the dialogue.

### D18 — Rh is not shipped; the summons names an ABO type (a finding)

The requirements and drive say *O−* / *A−* / *"O-negative"* throughout.
Shipped types are `A·B·AB·O` (blood.md § Deferred: *"Rh"* is on the
slate). This plan **does not add Rh** (not in the requirements' scope
list; a second axis doubles every row and reading for no stated
product need) — the drive reads *"anyone type O?"* and the notice names
*"type O"*. Flagged in § Risks; if the user wants Rh it is a W0
extension (`AboPhenotype` × `±`, the allele table gains `rh` odds).

### D19 — Rates are dials, in two places

Kernel dials on `BLOOD_DEFAULTS` (`lib/vitals/Blood.ts`): the gift
valences, the renown signal. Pack dials on the rows/brain configs: spawn
targets (`stocks:`), the runner's cadence and batch, the summons
cooldown, the notice hysteresis. The marrow regen and spoilage dials are
untouched.

### D20 — Wave shape: two kernel waves, two pack waves, one content wave, the drive

Each wave lands at a commit with `pnpm test:near` + every touched pack's
vitest + `lint:family` green. The order is dependency order; W0–W3 are
each useful alone (W0 changes the compatibility lesson for the shipped
`transfuse`; W1 ships the donor card + ladder on the shipped verb; W2 is
the trait graft; W3 is the bank mechanism + the fee), W4–W5 are the
content, W6 the drive.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims — and about everything else on that host |
|---|---|---|
| `bloodGroups.system` | `Species.bloodGroups` (existing blob) | a species declares which blood system it shares; unauthored = its own path, so every shipped species keeps today's flat behaviour. Claims nothing about bodies — it is a species fact, spoiler 1 like the alleles. |
| `BloodUnit.system` | `BulkPayload.blood` (declaration-merge, `lib/vitals/Blood.ts`) | a unit carries the system it came from, so compatibility never needs the donor's species row at transfuse time. Claims nothing about non-blood payloads. |
| `donorCard` + `transfusionConsent()` | **`PersonaMixin`** (`lib/character/Persona.ts`) | *a self that can declare a value* carries a standing directive. Every `Character` composes Persona — PCs and all NPCs (Cast and Extra); the card is `''`/false by default and the ladder's no-card branch is the honest answer for an NPC. **Not** `VitalsMixin` (a wolf would carry a donor card; consent is the person's, not the body's) and not `Avatar` (an authored NPC objector must be expressible). The ladder narrows `MixinApi.isVitals(this)` for consciousness — that is reading the body, not re-narrowing the host set; a Persona without Vitals (none today) reads `consented`. |
| `donor` verb | `PersonaMixin.commandContributions.self` (kernel view + controller) | the same self-record surface `chronicle`/`traits` ride. Claims: anyone with a self may set a card; it claims nothing about NPCs (nothing forces them to). |
| the disposition graft | `AdvancementMixin.creditSignature` (the class method) | *an act credited to a host also demonstrates its disposition channel.* `Advancing` already composes on exactly the hosts that compose `Dispositioned` (`Character`); the `isDispositioned(this)` narrowing is the mixin-independence idiom, not a host re-narrowing. The graft is the documented seam; it claims that every future authored valence lands (which is the point — the first consumer is this build's gift signature). |
| `DonationBankMixin` | **kernel `lib/commerce/`**, composed by the pack class `BloodWindow` only | *a fixture that keeps a bank of donated units by lot.* Composing it on a `Tariff` claims the window prices services AND holds a register — true of this window and of any civic bank with a fee. It must never land on `ColdStore` (every fridge would be a bank — the general store's cold room is not) nor on `Stock` (a bank is not a shop: nothing in it is for sale). The vault is a *pointer*, not a composition — which is the whole placement: the store holds, the register reads. |
| `BloodWindow` | **`trade-medicine/src/thing/`** = `DonationBankMixin(Tariff)` | the trade's counter (`lint:counters`: a counter is a vocation's instrument and ships in `/trade/<x>`). Claims: this trade's blood window is a priced board — a second blood window is a row of this class; a milk bank is one class of its own in its trade. |
| `BloodUnit` | **`trade-medicine/src/thing/`** = `CirculatingMixin(BrandedMixin(Receptacle))` | a filled, typed, brandable, spawn-eligible unit. Claims: the trade owns the typed unit's row shape; `Circulating` claims a unit may stand on a producer floor through the sweep (true of the upstream's units); `Branded` claims a unit may carry a corpo mark (the upstream's do; a player's drawn bag is a plain `Receptacle` and never branded — the gift is legibly not the corpo's). **Not** on `Receptacle` itself (every saline bag and water skin would circulate and brand). |
| `transfusion` service kind + arm | `platform/thing/Tariff.ts` + `platform/idea/cmd/retail/OrderController.ts` | the closed vocabulary grows a fourth kernel-orchestrated service: *the house transfuses you from its bank.* The arm narrows on `isDonationBank(tariff)` and `isVitals(customer)`; a Tariff that prices `transfusion` without being a bank reports *"this house has no bank"* (a named refusal, not silence). |
| `PublisherMixin` on `BusinessEntity` | `platform/idea/Business.ts` | every Business *may* publish if it authors a feed and names a seat; with the empty-`feedPath` fail-closed guard in `mayPublishAsImpl`, the forty shipped businesses that author none publish nothing. Claims a business is an organization with a possible masthead — which `OrganizationEntity` already says of every non-business org. |
| `collect` self-first + `order` tariff scan | `lib/commerce/PricedOffer.ts`, `OrderController.ts` | attribution keys on the fixture when the fixture is an operating location (already the `house`/`operatorsAt` rule); a room may hold two houses' boards. Claims nothing new about single-house rooms (the container fallback is byte-identical). |
| `issue`, `donate` verbs | `trade-medicine` views + controllers, afforded by `BloodWindow.commandContributions` | *a verb lives with the pack whose content affords it.* A window affords them to the room (`environment`) — the gate is the seat (issue) / the bag's payload (donate), never the band. |
| `banks`, `supplies`, `donates` brains | `trade-medicine/src/behavior/` | pack brains, named by what the host does; hosts are rows in `terminus` naming them by path (`/trade/medicine/behavior/banks`). Claims nothing of the kernel. |
| `blood`, `bank` readings | `trade-medicine/content/trade/medicine/idea/reading/` + `src/idea/reading/` | two more channels on the shipped ladder; warmed by infix, no kernel list. |
| the window Business, the Bloodworks, the collection room, the sign, the cast, the typed-unit rows, the brand, the wiki page | `terminus` rows (+ one Brand row and one wiki page in `corpo-goodkin`; four base unit rows in `trade-medicine`) | **content** — trade = mechanism, locality = expression. The par line moves from the practice row to the window row (same category, same level). |

⭐ **The test applied:** no new field or mixin here needs a guard that
re-narrows its host. The one place a guard appears — the `transfusion`
arm checking `isDonationBank(tariff)` — is a refusal that *names a
missing route* on a Tariff that is not a bank, which is the
instrumentation doctrine, not a placement smell. If during the build a
`!(fridge is the blood fridge)` or `!(this business is the window)` check
appears anywhere, stop: the mixin has landed on the wrong host.

---

## Convention conformance (checked at plan time)

- **`props:` / `cast:`** — the ward and the collection room use `props:`
  for fixtures and `cast:` for NPCs (`ward.yaml` is the precedent;
  `populates:` is retired). The sign rides `adornments:`.
- **Locations, not rooms** — the collection room is a
  `/platform/location/SingletonCartesianLocation` under the infirmary
  `CartesianZone` (`infirmary.yaml`, `cellSize: 3.0`), with `coords`
  and both sides of the cross-exit explicit. Not a `FurnishableRoom`.
- **`<root>/<branch>/`** — kernel: `lib/commerce/DonationBank.ts`
  (substrate), `platform/idea/cmd/medical/DonorController.ts` + the
  platform pack's `content/platform/cmd/medical/donor.yaml`. Trade:
  `/trade/medicine/thing/BloodWindow`, `/trade/medicine/thing/BloodUnit`,
  `/trade/medicine/idea/cmd/medical/{Issue,Donate}Controller`,
  `/trade/medicine/cmd/medical/{issue,donate}`, `/trade/medicine/idea/
  reading/{blood,bank}`, `/trade/medicine/behavior/{banks,supplies,
  donates}`. Locality: `/world/terminus/infirmary/{idea,thing,agent}/…`
  and the room at `/world/terminus/infirmary/collection`. Corpo:
  `/stuff/idea/corpo/Brand/goodkin-bloodworks` (where the pack's other
  brand sits) and `/wiki/lore/the-paramount-decree`.
- **Module scope declares; lifecycles initialize** — `BloodUnit` stamps
  its payload in `postRegister`; the brains hold no module-scope state
  beyond constants; the `BLOOD_GIFT_SIGNATURE` constant is pure value
  construction.
- **Import boundary** (`lint:imports`) — pack code imports the kernel by
  package specifier only (`@saxonberg/server/mud/lib/...`,
  `.../platform/thing/Tariff`, `.../api/...`); never `platform/idea/api/*`
  (export is `null`). Kernel `lib/commerce/DonationBank.ts` imports
  `lib/vitals/Blood` (types) and `lib/vitals/BloodType` — both kernel
  `lib/`. `lib/advancement/Advancement.ts` already imports nothing from
  trait; the graft uses `MixinApi.isDispositioned` (the api) — no new
  lib→lib edge.
- **No new module category, no free helper, no new Api.** Everything new
  is a mixin, a class, a controller, a brain, a reading, or a row. The
  bank's reads are methods on the window (verbs on objects: `window.
  takeUnit`, `window.receiveGift`, `patient.transfusionConsent`,
  `card.setDonorCard`); nothing is `XApi.verb(host, …)`. No
  `eslint-disable`.
- **Verb collisions** — `issue`, `donate`, `donor` collide with no
  shipped `verbs:` (grep over every pack; `register` is the TPA's, which
  is why the card verb is `donor register`, not `register`).
- **Arg gates** — `issue.yaml`/`donate.yaml` name
  `requires: [DonationBankMixin]` on the window arg; a **kernel** mixin,
  so its refusal lives in `MixinRefusals` (`lib/mixin.ts`, beside
  `PricedOfferMixin`) — add *"{} isn't a bank window"*. Every object arg a
  player may put an article before is `greedy: true` (the instrumentation
  defect).
- **Person keys** — every ledger write keys on `getIdentityPath()`
  (`donorIdentityPath`, chronicle owner, renown subject, accountability
  parties); never `getTemplatePath()` for a person.
- **Lint gates this build must pass** (run `pnpm -C packages/server
  lint:family`; these are the ones with new surface): `lint:dispositions`
  (the registrar rows' authored dispositions and any `trait:` dialogue
  guard), `lint:drive-scripts` (the drive is a wire file, never
  `scripts/drive-*.ts`), `lint:perishable` + `lint:pathogens` (the
  unit rows author `interiorMaterial`, outside `check-perishable`'s
  `_materialPath` scope — confirm it stays green and that a `BloodUnit`
  spoils in a warm room by unit test, since the gate cannot see it),
  `lint:counters` (no kernel class composes a counter mixin),
  `lint:arg-kinds` (the new `requires:` names resolve and carry a
  refusal), `lint:openings` (the window's `headcount` seats → the window
  is a `boot:` producer; its `parLines[].supplier` is empty, which arm 5
  accepts — the supply is push, D13), `lint:idle-cadence` (every
  `behaviors:` entry carries a `trigger:`), `lint:verb-collisions`,
  `lint:controller-rows` (every pack controller has its
  `idea/cmd/<cat>/<Name>Controller.yaml` row), `lint:mixin-names` (the
  `Mixins.DonationBank` entry), `lint:instanceable` (nothing instances
  `/lib/`; `BloodWindow`/`BloodUnit` sit in the trade's `thing/`),
  `lint:object-verbs` (stays at zero), `lint:lib-statics` (at ceiling —
  the mixin's methods are instance methods), `lint:unconsumed-seams`
  (every new authorable field has a reader: `_vaultPaths`/`_lotSystem`
  by the mixin, `donorCard` by the ladder, `bloodType/bloodSystem` by
  the stamp), `lint:test-bootstrap`, `lint:schema` (no collection
  change), `lint:person-keys`, `lint:module-scope`, `lint:imports`,
  `lint:light-sources` (a `NeonSign` at intensity 0 — confirm the gate
  accepts an unlit sign; if it insists a `LightSource` row emit, author
  `1` lumen and prose it as a last flickering tube).

---

## Waves

### W0 — Compatibility crosses species (D3) ✅ DONE (6f1498d90)

> **Done.** `BloodType.speciesPath` renamed to `system`; `BloodUnit.system?`
> added (provenance `speciesPath` kept); `Vitals.bloodSystemOf()` resolves
> the species' declared system else its own path; `drawBlood`/`receiveBlood`/
> `Blood.blend` all compare systems. All 16 homo rows clustered (hominid/fae/
> giant + three own-system). **Surprise:** all 16 rows already authored
> `alleles` (grounding said ten lacked them) — so only a `system:` key was
> added, no new allele tables. **Phantom:** the pre-existing
> `CmsLogic.ts fill` tsc error was a STALE `packages/types/dist` (still had
> retired `hydratorClass?`); `pnpm -C packages/types build` cleared it — did
> NOT touch CmsLogic (the stale-types-after-merge trap). Tests 27 green,
> server build clean, trade-medicine 24 green, lint:family exit 0.

**Goal.** The clade graph is not a hierarchy: a sapiens O can give to a
khazadicus; two eldarinus of different types cannot share.

**Files.** `lib/vitals/BloodType.ts` (constructor `(system, abo)`;
rename the field `speciesPath` → `system`; the rules unchanged),
`lib/vitals/Blood.ts` (`BloodUnit.system`), `lib/vitals/Vitals.ts`
(`bloodSystemOf()`: `species?.getBloodGroups()?.system ?? speciesPath`;
`drawBlood` stamps `system`; `receiveBlood` compares systems),
`platform/idea/species/Species.ts` (type widening `{ alleles, system? }`,
docstring), `TransfuseController.ts` (the judgement builds `BloodType`
from `unit.system ?? unit.speciesPath` and the patient's system),
`species-and-names` `homo/*.yaml` (`bloodGroups.system` on all sixteen,
per D3's clusters; the ten rows with no `bloodGroups` gain one with
`alleles` authored — fictional frequencies, never real-world ethnic
statistics), `BulkableLogic.transfer`'s blend (`Blood.blend` compares
`system`). Tests: `lib/vitals/__tests__/BloodType.test.ts` (same system
different species compatible; different system → 2; default system =
own path keeps every existing test green), a Vitals test over two seeded
bodies of different species in one system.

**Acceptance.** `pnpm test:near` green; `lint:family` green; the
clinical-medicine pack suite green. Commit `build(blood-economy W0): the
blood system — compatibility crosses species by declared cluster`.

### W1 — The donor card and the consent ladder (D4, D5) ✅ DONE

> **Done.** `PersonaMixin.donorCard {receive, donor}` + `getDonorCard`/
> `setDonorCard` + `transfusionConsent(giver)` (the six-verdict ladder);
> `donor` verb (platform `cmd/medical/donor.yaml` + `DonorController` +
> row) afforded on `PersonaMixin.commandContributions.self`.
> `TransfuseController`: the consent ladder before the judgement (an
> `asked` conscious player is refused `consent-pending` + prompted); the
> harm append after the effect (`!self && (!consented || reaction>0)` →
> `AccountabilityApi.record` the trap's shape); the revival deed on the
> recipient. Tests: `Persona.donorCard.test.ts` (8, all verdicts incl.
> unconscious-`wont`-holds via `beginDying`) + `transfuse-consent.test.ts`
> (3: consent-pending, directive-no proceeds+harm, consented no-harm).
> **Fixture notes:** a Character composes Vitals (via Creature) but not
> HasInteractive — compose `HasInteractiveMixin(Character)` for the
> `asked`/player path; the transfuse effect defers to the scheduler for an
> Engaged giver, so the controller test uses a non-Engaged `Creature`
> giver to run it inline; a blood-bag fixture needs `interiorBulk=true` +
> a seeded blood Material (a slot reads empty with no material).

**Goal.** A player sets a standing directive in calm; `transfuse` reads it
first; a conscious no-card player is asked; a non-consented or mismatched
administration is a `harm` row.

**Files.** `lib/character/Persona.ts` (`donorCard` field + fieldMeta +
accessors + `transfusionConsent(giver)` + the `donor.yaml` contribution),
`lib/mixin.ts` (no new mixin; nothing to add), the platform pack
`content/platform/cmd/medical/donor.yaml` + `content/platform/idea/cmd/
medical/DonorController.yaml` (the controller row — `lint:controller-rows`)
+ `platform/idea/cmd/medical/DonorController.ts`,
`trade-medicine/src/idea/cmd/medical/TransfuseController.ts` (the ladder
before the judgement; the `asked` refusal with the patient's one-line
prompt via `MessageApi.scene(patient).toSelf`; the harm append after the
effect; the revival deed on the recipient — D8's last bullet). Tests:
`lib/character/__tests__/Persona.donorCard.test.ts` (the five verdicts,
unconscious-with-`wont` holds), a TransfuseController test over the
harness that a `wont` patient transfused yields a `harm` row with
`consented: false` and a conscious card-less player yields
`consent-pending` (controller tests skip the binder — assert the
controller's note, and let W6 prove the view).

**Acceptance.** `donor` is afforded to a logged-in avatar (`help donor`
resolves; `donor refuse` → `donor` shows it); the three transfuse
outcomes above. Commit `build(blood-economy W1): the donor card — a
standing directive on Persona, and the consent ladder transfuse reads
first`.

### W2 — The disposition graft and the gift signature (D9, D10) ✅ DONE

> **Done.** `AdvancementMixin.creditSignature` now fans the act's
> `dispositionValence` into the host's trait ledger when it keeps one —
> `if (isDispositioned(self) && valence.length) self.imprintSignature(...)`,
> a self-call from the host's frame. ⭐ **Risk 6 resolved:** `SelfOnly`
> ALLOWS the self-call (caller === target) — no `AnyOf(SelfOnly,
> FromMixin)` loosening needed; the test drives it through
> `withRootContext(owner, …)` as a controller would. `BLOOD_GIFT_SIGNATURE`
> (routine `generosity+2`; named `+generosity+2 +compassion+2`) and
> `BLOOD_GIFT_RENOWN {emote:'applaud'}` added to `lib/vitals/Blood.ts`.
> The two read-but-ignored docstrings are corrected. Test:
> `disposition-graft.test.ts` (3: graft fans both axes; no-valence writes
> none; non-Dispositioned untouched) — the fake PM had to be
> **collection-aware** (the host writes a transcript AND a disposition row;
> a collection-agnostic find returns the nursing transcript as a
> disposition entry). `trait.md`'s Deferred note is now false → W6 doc sweep.

**Goal.** The first live authored valence lands: an act credited with a
`dispositionValence` writes disposition rows; the gift signature and the
renown signal exist as data.

**Files.** `lib/advancement/Advancement.ts` (the self-call inside
`creditSignature`; the docstring stops saying read-but-ignored),
`lib/vitals/Blood.ts` (`BLOOD_GIFT_SIGNATURE` — `{routine: [{generosity,
+2}], named: [{generosity, +2}, {compassion, +2}]}` and
`BLOOD_GIFT_RENOWN = {emote: 'applaud'}`), `docs/subsystems/trait.md`
(the Deferred note is now false — fix it in W6's doc sweep, note here).
Tests: `lib/advancement/__tests__/disposition-graft.test.ts` —
`creditSignature` through the proxy on a `Character` fixture writes one
`DispositionEntry` per subcheck; a signature with no valence writes
none; a non-Dispositioned host is untouched.

**Acceptance.** `traits` on a fixture that credited the gift signature
prints a generosity band. Commit `build(blood-economy W2): the trait
seam connected — creditSignature fans the disposition channel`.

### W3 — The bank mechanism, the fee, and two houses in one room (D2, D6, D14-kernel) ✅ DONE

> **Done.** `lib/commerce/DonationBank.ts` `DonationBankMixin` (reads the
> vault by lot, ignoring the door — D1; `takeUnit`/`takeCompatibleUnitFor`/
> `receiveGift`, custody deeds on persons, FIFO by freshness load);
> `Mixins.DonationBank` + refusal + `MixinApi.isDonationBank`. `Tariff`
> `SERVICE_KINDS += 'transfusion'` (+ test). `OrderController`: the
> `transfusion` arm (bank + customer-is-patient; `no-compatible-unit`
> refusal; resolves an on-shift issuer for custody) and the reachable-Tariff
> SCAN (two houses in one room). `PricedOffer.collect` self-first (the
> fixture's own operating business before its container). `BusinessEntity`
> composes `PublisherMixin`; `mayPublishAsImpl` fails closed on an empty
> `feedPath`. Tests: DonationBank (5 — incl. the CLOSED-vault read),
> Tariff (8). **Build decision:** the collect-self-first / order-transfusion
> / mayPublishAs *integration* (banking balances, operator standup) is
> drive-proven in W6, not unit-tested here — the plan's own test strategy
> assigns the two-houses attribution end-to-end to the drive. Regression
> surface clean (commerce/retail/press 53, Publisher incl.).

**Goal.** The kernel can hold a bank of typed units behind a priced
board, sell a transfusion off it, attribute the fee to the board's own
house, and let a house post a notice.

**Files.** `lib/commerce/DonationBank.ts` (new mixin — D2's surface;
custody deeds per D16 on `takeUnit`/`receiveGift`; `takeCompatibleUnitFor`
picks the **oldest compatible** unit by freshness stamp — first in, first
out, as a bank would), `lib/mixin.ts` (`Mixins.DonationBank`,
`MixinRefusals.DonationBankMixin`), `api/mixin.ts`
(`MixinApi.isDonationBank`), `platform/thing/Tariff.ts`
(`SERVICE_KINDS` + `'transfusion'`; `__tests__/Tariff.test.ts` L75),
`platform/idea/cmd/retail/OrderController.ts` (the `transfusion` arm;
the reachable-tariff scan), `lib/commerce/PricedOffer.ts` (`collect`
self-first), `platform/idea/Business.ts` (`BusinessEntity extends
PublisherMixin(BusinessMixin(OrganizationMixin(Idea)))`),
`platform/idea/api/EmploymentLogic.ts` (`mayPublishAsImpl`: fail closed
when `publisher.getFeedPath()` is empty — verify the accessor name in
`lib/press/Publisher.ts`). Tests: `lib/commerce/__tests__/DonationBank.
test.ts` (lots derive from a closed container; `shortLots`; `takeUnit`
moves + records; FIFO), `OrderController` service test for
`transfusion` (compatible unit → volume up, fee collected; none → the
named refusal; broke customer → served, `paid: false`), a `collect`
test with a priced fixture that is itself an operating location, a
`mayPublishAs` test (a Business with a feed + seat publishes; one with
no feed does not; `OrganizationEntity` unchanged).

**Acceptance.** All of the above green; `lint:counters` green (no kernel
class composes `PricedOfferMixin(` beyond `Tariff` as before);
`lint:mixin-names`, `lint:arg-kinds` green. Commit `build(blood-economy
W3): DonationBankMixin, the transfusion service, and two houses in one
room`.

### W4 — The trade's half: the window, the unit, the verbs, the readings, the brains (D2, D7, D8, D13, D14, D15) ✅ DONE

> **Done.** `trade-medicine` grew: `BloodWindow` (= `DonationBankMixin(Tariff)`,
> re-lists menu/order + issue/donate — `getContributions` shadows, so the
> own static must re-list), `BloodUnit` (= `CirculatingMixin(BrandedMixin(
> Receptacle))`, `onCreate` stamps the payload, keywords blood/unit/bag);
> `issue`/`donate` verbs + controllers + rows; `BloodReading`/`BankReading`
> + rows; `banks`/`supplies`/`donates` brains; four base unit rows.
> **Build decisions:** (a) the gift credit lives in `DonateController` only
> — the TransfuseController second mint site (own-blood-to-a-named-other)
> is NOT in the drive and would duplicate the credit block or need a banned
> helper, so it is **deferred within the wave** (→ blood-slate); (b) the
> hook is `onCreate` (not postRegister — cross-field invariants go there);
> (c) `Character` is ABSTRACT — tests use a concrete subclass; (d) a bag
> reads empty with no material (isBulkEmpty), so the unit rows author
> `interiorMaterial` and `onCreate` stamps on top. Tests: BloodWindow (2),
> BloodUnit (3 — the onCreate stamp), donate (3 — the gift-credit gate via
> RenownApi.append); pack suite 35 green. The issue seat-gate + the three
> brains' live behavior are drive-proven (W6).

**Goal.** `trade-medicine` ships everything a locality needs to author a
blood window.

**Files** (all under `packages/content/trade-medicine/`):
`src/thing/BloodWindow.ts`, `src/thing/BloodUnit.ts`,
`src/idea/cmd/medical/IssueController.ts` + `DonateController.ts`,
`content/trade/medicine/cmd/medical/issue.yaml` + `donate.yaml`,
`content/trade/medicine/idea/cmd/medical/IssueController.yaml` +
`DonateController.yaml`, `src/idea/reading/BloodReading.ts` +
`BankReading.ts`, `content/trade/medicine/idea/reading/blood.yaml` +
`bank.yaml`, `src/behavior/banks.ts` + `supplies.ts` + `donates.ts`,
`content/trade/medicine/thing/unit/{o,a,b,ab}.yaml` (base rows: class
`/trade/medicine/thing/BloodUnit`, `interiorMaterial: /stuff/idea/
material/tissue/blood`, `interiorAmount: 0.45`, `interiorCapacity: 0.5`,
`bloodType`, `bloodSystem: hominid`, `labelled: true`; no `censusKey` —
the locality's rows add it with their `container:`), `pack.yaml`
description, `README.md`. Tests (`src/__tests__/`): `BloodWindow.test.ts`
(composition reaches `DonationBankMixin` and `PricedOfferMixin`;
contributions list the two views), `BloodUnit.test.ts` (postRegister
stamps the payload; a unit in a 293 K room reads spoiled after ~3
game-days — the perishable gate cannot see this), `issue.test.ts`
(off-shift refused `not-on-the-window`; on-shift moves the unit and
writes both deeds), `donate.test.ts` (a player's own unit → deed +
disposition rows + a renown event; an NPC's → none; somebody else's unit
→ none; a short lot → compassion too), `banks.test.ts` (the floor beat
issues+transfuses a dying body; skips a `wont` card; the summons `say`s
the short lot once per onset and sends **no** `tell`; the donor roll on
`analyze bank` lists a registered donor of that type),
`supplies.test.ts` (the runner moves a unit floor→fridge through
`open`/`put`/`close`), `readings.test.ts` (prose at each band contains
the band's facts — *tested by reading it*).

**Acceptance.** The pack's vitest green; `lint:family` green
(`controller-rows`, `arg-kinds`, `verb-collisions`, `idle-cadence`,
`instanceable`, `counters`). Commit `build(blood-economy W4): the blood
window — BloodWindow, BloodUnit, issue/donate, two readings, three
brains`.

### W5 — The Terminus content (D11, D12, D13, D17)

**Goal.** The ward has an independent window under a dead Goodkin sign,
fed by the corpo's collection room next door, with a registrar who tells
you why.

**Files.** `terminus/content/world/terminus/infirmary/`: `idea/window.yaml`
(the Business, D11), `idea/bloodworks.yaml` (D11), `collection.yaml` (the
room; `exits: {west: ward}`; `props:` the Stock
`/world/terminus/infirmary/thing/collection-stock` (class
`/trade/shopkeeping/thing/Stock` — check the shipped Stock row class
path in `goods-yards/veshko/thing/stock.yaml` and mirror it), a donor
couch (`/stuff/thing/furniture/…` cot precedent), a crate of empty
`blood-bag`s (`{template: /trade/medicine/thing/blood-bag, count: 6}`),
the runner's cold case = `/stuff/thing/vessel/cooler`; `cast:` the
runner + the donor), `thing/blood-window.yaml` (class
`/trade/medicine/thing/BloodWindow`, `prices: {transfusion: 10}`,
`services: {transfusion: transfusion}`, `_vaultPaths:
[/world/terminus/infirmary/thing/blood-fridge]`, `_lotSystem: hominid`,
keywords `[window, register, counter, blood-window]`),
`thing/goodkin-sign.yaml` (D12), `thing/unit-{o,a,b,ab}.yaml`
(`extends: /trade/medicine/thing/unit/<x>`, `container:
/world/terminus/infirmary/thing/collection-stock`, `censusKey:
blood:<x>`, `_brandKey: goodkin-bloodworks`), `thing/collection-stock.
yaml`, `agent/registrar.yaml` (Cast, `banks` brain `trigger: cadence`,
tree-dialogue D17), `agent/night-registrar.yaml` (Extra, `banks` with
`quiet: true`), `agent/runner.yaml` (Cast, `supplies`), `agent/donor.yaml`
(Extra, `donates`), `ward.yaml` (`props:` + the window; `adornments:` +
the sign; `exits.east` → collection; prose: the window and the dead
sign), `business.yaml` (**remove** the blood par line), `infirmary.yaml`
(`stocks:` — the unit targets), `terminus/pack.yaml` (`boot:` entries
for the window Business, the Bloodworks, the collection room, the ward —
*a brain on an unspawned NPC never fires*; the window's `boot:` is what
`lint:openings` requires), `corpo-goodkin/content/stuff/idea/corpo/Brand/
goodkin-bloodworks.yaml`, `corpo-goodkin/content/wiki/lore/
the-paramount-decree.md` (+ `pack.yaml` if the wiki kind needs declaring
— check `wiki-starter/pack.yaml`), `corpo-goodkin/README.md`.

**Acceptance.** A fresh boot with `SAXONBERG_PACKS` including terminus
stands the window and the Bloodworks up with their rosters on shift;
`lint:family` green (`openings`, `dispositions`, `idle-cadence`,
`light-sources`, `authored-prose`, `world-scan`, `census`); the terminus
pack's row tests green. Commit `build(blood-economy W5): the Goodkin
window at the Terminus infirmary — rows, cast, the dead sign, the
Decree`.

### W6 — The drive, the docs

**Goal.** The requirements' ten-step drive runs against the booted game
as `packages/wire/tests/blood-economy.dirty.wire.test.ts`
(dirty: it consumes units the sweep regenerates only on its cadence,
drives a patient to dying by wizard eval, and posts a release) and
passes; the subsystem docs tell the truth.

**The drive, step by step** (each `it` must be able to FAIL — assert the
specific words, never *"the status is defined"*):

1. A wizard session at the ward: `look` shows the window and the sign
   (*"Goodkin"*, *"dead"/"unlit"*); `analyze bank window` prints lots
   with litres; fire the runner's beat (`eval … --on runner return
   this.fireBeat('/trade/medicine/behavior/supplies')`) with the fridge
   emptied by eval first, then `analyze bank` again — the O line rose;
   `talk registrar` → the Decree line contains *"Decree"*; `look` in the
   collection room shows the donor.
2. A patient session: `eval` a rupture + `bloodVolume` to 70 %; the
   patient `order transfusion` (or a wizard doctor `transfuse` after
   `issue`): volume rises, the lot's litres drop, the `said()` carries
   the fee note `(…)`; a broke patient is served with no note.
3. Empty the O lot (issues); fire the registrar's beat; `press` /
   `press room` shows the notice *"short of type O"*.
4. The same beat said *"Anyone type O?"* in the ward (the patient
   session's prose).
5. A new player session: `test` → the type line; `analyze blood` lists
   species of the same system and excludes one of another;
   `donor register`, `donor accept` → `donor` echoes both, and `analyze
   bank` now lists them on the donor roll for their type (the pull
   surface); `bleed into bag` (wait the draw out — the clinical-medicine
   drive's pattern — or run not-engaged), `donate bag` → `chronicle` has the gift deed,
   `traits` prints generosity, `eval` `RenownApi.renownOf(id, locality)`
   > 0 after the scheduled fold (await it). The control: a second player
   `bleed`s into a bag and keeps it — no deed, no trait line, renown 0.
6. The window is **NPC-run** (v1): `apply` at the window finds **no open
   seat** (every position's headcount is filled by NPC roster); a player's
   direct `issue O` is refused *"you do not keep this window"* (the seat
   gate, which no player passes). The NPC registrar's own issue (fired by
   the floor beat, or the `order transfusion` of step 2) leaves custody
   deeds that `analyze bank`'s expert rung names — *who issued what to
   whom*. (The player-operated issue + the scarce-unit allocation are
   deferred with the ceiling; not driven.)
7. The player `transfuse`s an unlabelled unit into a typed patient
   (not blocked; the band is below competent, or the unit is
   unlabelled): the reaction line; `eval`
   `AccountabilityApi.blameFor(patientId)` names the giver.
8. A `donor refuse` patient transfused → the act proceeds and a harm row
   with `consented: false` exists; a card-less conscious player is told
   `consent-pending`; an unconscious card-less patient is treated.
9. With no player on shift, drive a patient to `dying` by eval, fire the
   night registrar's beat → the patient is no longer dying and the
   custody deed names the night registrar; a broke patient likewise.
   Hoarding: a player on shift does nothing; the beat still serves.
10. Author-level: `analyze bank` on a second `BloodWindow` row cloned by
    eval into another room (with `_vaultPaths` pointing at the cooler)
    reads lots — zero code.

**Docs.** `docs/subsystems/blood.md` expands (the bank, the window, the
card + ladder, the system clusters, the gift credit, the readings;
§ Deferred shrinks), `employment.md` (two houses in one room: the
fixture-operating rule and the `station:` requirement, the closed-door
sheet caveat), `retail.md` (`transfusion`, `collect` self-first, the
tariff scan), `trait.md` (the Deferred "starter set is empty" note is
false now), `press.md` (a Business publishes with a feed), `corpo.md`
(the dead sign, the Bloodworks brand), `instrumentation.md` (two
channels more), `content-packs.md` one-line blurbs for the three packs.
Then the drive record below, with the run output and the count.

**Acceptance.** The wire file green against a booted world (`pnpm
wire`); `pnpm test` once, before the MR. Commits `drive(blood-economy):
<what driving found>` and `docs(blood-economy): …`; then push and open
the MR.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `donor` | `platform/cmd/medical/donor.yaml` | `PersonaMixin.commandContributions.self` | the card field on every Character | — | subcommand strings; no object arg |
| consent ladder | (inside `transfuse`) | — | `donorCard` hydrated (`persistent, authorable`) | — | `patient requires: VitalsMixin` (unchanged) |
| `issue` | `trade/medicine/cmd/medical/issue.yaml` | `BloodWindow.commandContributions.environment` + `peers` | the window row in the ward's `props:`; `_vaultPaths` resolves to the live fridge | the window Business must be live (`boot:` in terminus) for the seat check | `window requires: [DonationBankMixin]` + refusal in `MixinRefusals`; `recipient requires: VitalsMixin`, `greedy: true` |
| `donate` | `donate.yaml` | same | a bag whose slot payload has `blood` | — | `bag requires: [BulkableMixin]` scope `inventory`, greedy |
| `order transfusion` | `retail/order.yaml` (shipped) | `Tariff.commandContributions` inherited by `BloodWindow` | `prices.transfusion` + `services.transfusion` on the window row | the window Business live for `collect` | `counter default reachable:[class.Tariff]` + the W3 scan |
| `analyze blood` / `analyze bank` | `perception/analyze.yaml` (shipped) | global | the two reading rows (`/trade/medicine/idea/reading/`) warmed by infix | `ReadingCatalogue` (lazy + onCreate) | `subject` greedy, `requires: any` |
| the floor / summons / notice | `banks` brain (`forceCommand` of `issue`/`transfuse`/`say`/`press post` — no `tell`, pure pull) | the registrar rows' `behaviors: [{brain: /trade/medicine/behavior/banks, trigger: cadence, config: {window: …}}]` | the window Business `publishingPositions` + `feedPath`; the registrar's roster seat | the registrar Cast spawned (ward in `boot:`), the Business live and on shift | `press`'s `requiresPublisher` |
| the supply | `supplies` brain | the runner row's `behaviors:` | `stocks:` on the infirmary zone + the unit rows' `censusKey`/`container:` | the collection room + its Stock in `boot:` (the sweep draws into a live home) | `open`/`put`/`close` views' gates (Sealable, Container) |
| the sign | — | `ward.yaml adornments:` | `_brandKey` → the Brand row | corpo-goodkin installed (terminus depends on it) | — |
| the Decree | `talk registrar` (shipped `talk`) | `tree-dialogue` brain on the Cast, `trigger: engage` | the node text | the Cast spawned | — |

⚠ The fifth link is the binder: a `requires:` nothing composes is refused
before any controller runs, invisibly to controller tests. W6's drive is
the only thing that proves it; every verb above is exercised there.

---

## Acceptance-criteria coverage

| requirement (acceptance criteria) | wave |
|---|---|
| typed stock at the ward, derived from the units held (draw one, the reading drops) | W3 (`getLots`), W4 (`analyze bank`), W5 (rows), drive 1/2 |
| stock rises toward par over game-time from NPCs, no player | W4 (`supplies`), W5 (`stocks:`, boot), drive 1/9 |
| a gift (to the bank / a named other) → chronicle + traits + local standing; self-use → none | W2 (graft), W4 (`donate` + transfuse mint), drive 5 |
| a named shortage on the ticker, no push/nag; the room summons names the type | W3 (Business publishes), W4 (`banks`), drive 3/4 |
| the NPC window dispenses on `order`; the seat gate admits no player (none open); a readable custody record | W4 (`issue`, roster), W3 (custody deeds), drive 6 |
| patient pays for the service, donor never paid, unit never a priced `buy` | W3 (`transfusion`), W5 (prices), drive 2 — the unit is never on a Stock |
| the floor holds (NPC proprietor serves a dying patient) regardless of purse | W4 (`banks` floor beat), D6, drive 9 |
| historical mistakes not blocked; the reaction; the record shows who gave it | W1 (harm append), shipped reaction, drive 7 |
| ~~a player allocates a scarce unit~~ **deferred with the operator ceiling** → `blood-slate` | — (not in v1) |
| donor-card directive read first; a pre-registered refusal holds unconscious; a conscious refusal wins; against-directive = harm; the opt-in roll is readable (pull, no push) | W1, W4 (`analyze bank` roll), drive 5/8 |
| compatibility legible in-world, crossing species | W0, W4 (`analyze blood`), drive 5 |
| a cross-species compatible / within-species incompatible donation works; nobody hard-blocked | W0, drive 5 (a system-mate recipient) |
| the window is independent, privately NPC-run under the Goodkin name; the registrar yields the history; the upstream is the corpo's and unswitchable; not player-operated in v1; a second window is rows | W5 (D11, D12, D17), drive 1/6/10 |

Nothing in the requirements (as amended 2026-10-04) is unmapped. The
player-operator ceiling (the scarce-unit allocation, the registrar
vocation) is **deferred** by user decision, not unmapped. Two criteria
are satisfied in a weaker form than their original wording and flagged in
§ Risks: *"billed after"* (D6) and *"O−"* (D18).

---

## Test & gate strategy

- **Unit (kernel, `test:near`)**: `BloodType` systems; the Persona ladder;
  the disposition graft; `DonationBankMixin` (lots through a closed
  door, FIFO, custody); `Tariff` kinds; `OrderController` `transfusion`
  arm + scan; `collect` self-first; `mayPublishAs` feed guard.
- **Unit (pack vitest)**: `trade-medicine` — the window/unit classes, the
  two controllers, the three brains, the two readings' prose at each
  band; `terminus` — row tests as the pack already does.
- **What only the drive proves**: every binder gate; the boot/standup
  ordering (a brain on an unspawned NPC never fires; a business stood up
  lazily has no roster); the two-houses attribution end to end (the fee
  lands on the window's account, not the practice's — assert via
  `eval` on `BankingApi` balances); the renown fold actually moving the
  figure; the notice reaching the ticker; the live `open`/`put`/`close`
  door dance of the runner.
- **Gates**: `pnpm -C packages/server lint:family` at every wave; the
  specific gates named in § Convention conformance. `pnpm test` at
  exactly two moments: before the MR opens, and at `/finalize`. Never
  in the background.
- **Not a test**: the unit rows' spoilage is outside `lint:perishable`'s
  sight (interior material, not `_materialPath`) — the `BloodUnit`
  spoilage unit test is the gate for that.

---

## Risks & opens

1. ⚠ **"Billed after" has no debt object** (D6). The floor transfusion is
   free; the fee attaches to `order transfusion`. If the user wants a
   receivable, that is a credit-subsystem design (the credit slate's
   ledger), not this build. **User's eye.**
2. ⚠ **Rh is not shipped; the drive says O−** (D18). The build names ABO
   types. If Rh is wanted, add it in W0 (it doubles the lot vocabulary;
   the readings and rows follow). **User's eye.**
3. ✅ **The summons is pure pull (decided by the user).** No `tell`, no
   targeted message: the room `say` + the ticker notice are the whole
   summons. The `donor register` flag is now a READABLE donor roll on
   `analyze bank` (D15), not a push target — a shortage is answered by
   someone reading the roll and asking in the room. "The registration box
   is what the summons reaches" is satisfied by the roll being the thing
   a registrant chooses to be found on, never by a notification.
4. **The donor Extra's marrow never regrows without food** (D13). The
   floor does not depend on it; the face does. If the live drive shows
   the donor never once gives, keep the emote beat only. Do not add a
   feeding economy.
5. **`PublisherMixin` on every Business** (D14). Guarded by the empty-
   feed fail-closed; verify no shipped Business row authors `feedPath`
   by accident (grep at W3). If the user prefers not to widen Business,
   the fallback is a kernel `PublishingBusiness` twin — one more class,
   same rows.
6. **`SelfOnly` and the proxy** (D9). The self-call inside
   `creditSignature` must run with the host as the frame's caller. If the
   W2 test shows the gate refusing (a free-function frame), move the call
   into the method body (it already is in the plan) — and if it still
   refuses, the policy on `imprintSignature` needs `AnyOf(SelfOnly,
   FromMixin(Advancing))`, which is a call-security conversation: stop
   and say so rather than loosening it.
7. **Operator index last-writer** (grounding). The window never names the
   ward; the practice never names the fixture. A reviewer adding the
   ward to the window's `operatingLocations` "for safety" breaks both.
   Documented in employment.md at W6.
8. **Presence into a fixture**. Both registrar roster slots author
   `station:`; `lint:openings` does not check it. A missing `station`
   would teleport nobody (the window is not a Container) — silent. The
   drive's step 1 (`look` shows the registrar) catches it.
9. **The spawn sweep's home-region draw**: the unit rows name the
   collection Stock as `container:`; the Stock must be live at sweep time
   (`boot:`). The Veshko floor is the proof it works; a fresh-DB boot in
   W5 is the check.
10. **`lint:light-sources` and a zero-lumen sign** (D12) — if the gate
    refuses, author 1 lm.
11. **Branch catch-up**: merge `origin/master` before W0; `ward.yaml` and
    `business.yaml` are the most likely to have moved (cold-storage and
    recovery both touched them this month).

No new module category, no free helper, no lint exemption, no new
collection, no `isWizard` check is planned. If any of these appears
necessary mid-build, the compliant path is named above (fold into the
mixin/class; a document-tree page; the seat).

---

## Deferred seams

These leave as slate material at the sweep (not plan sections):

- **The player-operator ceiling** → `blood-slate` (user decision
  2026-10-04 — NPC-run for now). The seam is already clean: the `issue`
  seat gate (D7) admits any on-shift holder; the only thing keeping
  players out is the window's roster having no open seat (D11). Opening a
  player-fillable `registrar`/`phlebotomist` seat + the scarce-unit
  allocation UI (the values moment) is the future build; nothing else
  changes. ⚠ **A private player operator** who could withhold for profit
  is the sharpest form of the kill-switch hazard — the floor + the
  custody/accountability record are the guards that must be proven before
  it opens.
- **Rh and a second axis** → `blood-slate` (the lot vocabulary is a
  string; `AboPhenotype` is where it widens).
- **The paid-donor lever** → `blood-slate` (the `donate` controller's
  gift gate — `isHasInteractive && own blood` — is where a sale would
  sever the credit; `Blood.donorIdentityPath` already records *who*,
  the slate's "record why" seam is a `BulkPayload.blood.terms?` field
  nothing writes yet).
- **A receivable for the floor fee** → `credit-slate`.
- **Component therapy, disease transmission, screening of a tainted
  unit** → `blood-slate` (`ContaminableMixin` over the same payload).
- **Per-type par** → `blood-slate` only if a second consumer wants a
  typed level (D1's rejection stands until then).
- **A milk / vaccine / seed bank** → the second composer of
  `DonationBankMixin`; the `lotKeyOf` branch is the one line.
- **Epoch-gated typing** → `blood-slate` (the readings' ladder is where
  a pre-Landsteiner world reads *untested* at every band).

---

## Critical files

Kernel (`packages/server/src/mud/`): `lib/vitals/BloodType.ts`,
`lib/vitals/Blood.ts`, `lib/vitals/Vitals.ts`,
`platform/idea/species/Species.ts`, `lib/character/Persona.ts`,
`lib/advancement/Advancement.ts`, `lib/commerce/DonationBank.ts` (new),
`lib/commerce/PricedOffer.ts`, `lib/mixin.ts`, `api/mixin.ts`,
`platform/thing/Tariff.ts` (+ `__tests__/Tariff.test.ts`),
`platform/idea/cmd/retail/OrderController.ts`,
`platform/idea/cmd/medical/DonorController.ts` (new),
`platform/idea/Business.ts`, `platform/idea/api/EmploymentLogic.ts`
(`mayPublishAsImpl`).

Platform pack: `packages/content/platform/content/platform/cmd/medical/
donor.yaml`, `.../idea/cmd/medical/DonorController.yaml`.

Species: `packages/content/species-and-names/content/stuff/idea/species/
animalia/chordata/mammalia/primates/hominidae/homo/*.yaml`.

Trade (`packages/content/trade-medicine/`): `src/thing/BloodWindow.ts`,
`src/thing/BloodUnit.ts`, `src/idea/cmd/medical/{Issue,Donate,
Transfuse}Controller.ts`, `src/idea/reading/{Blood,Bank}Reading.ts`,
`src/behavior/{banks,supplies,donates}.ts`, `content/trade/medicine/cmd/
medical/{issue,donate}.yaml`, `content/trade/medicine/idea/cmd/medical/
{Issue,Donate}Controller.yaml`, `content/trade/medicine/idea/reading/
{blood,bank}.yaml`, `content/trade/medicine/thing/unit/{o,a,b,ab}.yaml`,
`pack.yaml`, `README.md`.

Locality (`packages/content/terminus/content/world/terminus/infirmary/`):
`idea/window.yaml`, `idea/bloodworks.yaml`, `collection.yaml`,
`thing/blood-window.yaml`, `thing/goodkin-sign.yaml`,
`thing/collection-stock.yaml`, `thing/unit-{o,a,b,ab}.yaml`,
`agent/{registrar,night-registrar,runner,donor}.yaml`, `ward.yaml`,
`business.yaml`, `../infirmary.yaml`; `packages/content/terminus/pack.yaml`.

Corpo (`packages/content/corpo-goodkin/`): `content/stuff/idea/corpo/
Brand/goodkin-bloodworks.yaml`, `content/wiki/lore/the-paramount-decree.md`,
`README.md`.

Drive: `packages/wire/tests/blood-economy.dirty.wire.test.ts`.

Docs: `docs/subsystems/blood.md`, `employment.md`, `retail.md`,
`trait.md`, `press.md`, `corpo.md`, `instrumentation.md`,
`content-packs.md`.

---

## Drive record

*(Appended at build time — the run output, the count, what each failure
was. A drive that was written but never run is a drive that claims.)*
