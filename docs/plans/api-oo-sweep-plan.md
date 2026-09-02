# The Api OO sweep — implementation plan

**Input:** [api-oo-sweep-requirements.md](../requirements/api-oo-sweep-requirements.md)
(CLOSED scope — every surface decision there is settled; do not reopen).
Seeding slates (phase order A–G decided at their feet):
[oo-calling-conventions-slate](../slates/builds/oo-calling-conventions-slate.md),
[api-boot-retirement-slate](../slates/builds/api-boot-retirement-slate.md).
Read alongside: [architecture.md](../architecture.md) (§ Api ↔
logic-singleton split, § import boundary, § export discipline),
[antipatterns.md](../antipatterns.md) (§ Thin Api Wrappers),
[call-security.md](../subsystems/call-security.md) (participant
contracts, caller identity, the intra-singleton self-call gotcha,
§ Built-in Policies), [content-packs.md](../subsystems/content-packs.md)
(the boot manifest), [chronicle.md](../subsystems/chronicle.md),
[belief.md](../subsystems/belief.md), [trait.md](../subsystems/trait.md),
[advancement.md](../subsystems/advancement.md),
[measurement.md](../measurement.md).

**Build discipline:** ONE branch (`build/api-oo-sweep` off fresh
master), ONE MR, per-wave commits (`refactor(api-oo): …` /
`feat(boot): …`), **push every turn**. Stage by name — never
`git add -A`. Each wave gates on `pnpm test:near` + every touched
pack's own vitest + the lint family (`lint:gates`, `lint:imports`,
`lint:instanceable`, `lint:module-scope`, `lint:thin-forwarder`,
`lint:schema`, plus the new `lint:object-verbs` in advisory mode —
record its falling count in the wave's commit message). The FULL
`pnpm test` runs at exactly two moments: before the MR opens, and at
`/finalize`. Size is never an exemption. No migration shims: an old
static may forward only *between commits of the same wave*, never
across a commit boundary that could ship — default is delete-and-
repoint in one commit.

---

## Wave 0 — tree health (MANDATORY, before any sweep work)

The user reports tsc errors on master after the bar-fight merge. A
design-branch check came back clean, but the build branch starts from
fresh master and must prove it:

1. `git switch -c build/api-oo-sweep origin/master` (confirm no sibling
   worktree holds it — `./tools/wt-status`).
2. `npx tsc --noEmit` in `packages/server`, `packages/types`,
   `packages/client`, and every `packages/content/*` that has a
   `tsconfig.json`.
3. `pnpm test:near` over the sequencer + api + security areas
   (`packages/server`), plus `pnpm lint`.
4. Fix any compile/test failure found **before** Phase A, as its own
   `fix(...)` commit(s). If a failure is design-level, stop and surface
   to the user.

Budget this as a real step. Exit: clean tsc everywhere, lint green,
baseline `test:near` green, pushed.

---

## Grounding (facts verified this cycle — file refs current at plan time)

- **The sequencer** (`packages/server/src/backend/AppBootstrap.ts`) is
  ~26 ordered acts: 16 `Api.boot()`s (`WorldClock, Material, Condition,
  Renown, Consumer, Producer, Residency, Card, Sandbox, Banking,
  Employment, Attendant, Social, Party, Press, Record`), 6 warms
  (`AppSettings, RenownStanding, ParticipationStanding,
  ProducerStanding, AccountBalance, SupplyAggregate`), plus
  `ResidencyApi.spawnNow()`, `DiagnosticApi.startRouter()`, the three
  relay `boot()`s (stay — mandate (c)), and
  `installOnlineHoldersProvider()` (stays — documented cycle-avoidance).
  `AppSettings.warm()` runs AFTER `BootstrapManager.run()` today.
- **`AppSettings.warm()`** (`mud/lib/config/AppSettings.ts:1455`) only
  does `AppSettings.find({})` — it needs Mongo + the platform pack's
  merged `settings` defaults, nothing from `loadHooks`/`preloadAll`/
  the manifest. `getCached()` throws loudly when unwarmed; several
  Logics keep a seeded-literal `dial()` fallback for tests/pre-boot.
- **The boot manifest** (`packages/content/platform/pack.yaml`, 33
  entries, ends line 77) topo-sorts on `dependsOn`
  (`BootstrapManager.#topologicalSort`; cycles and missing refs throw;
  stable order otherwise). It cannot express "after everything".
- **The precedent** (`mud/platform/idea/FermentProfileCatalogue.ts` +
  `content/platform/idea/FermentProfileCatalogue.yaml` + the boot entry
  at pack.yaml:56 + `platform/__tests__/FermentProfileCatalogue.test.ts`):
  `PostRegistrationMixin(Idea)`, `canEvict`/`canDestruct` vetoes,
  `postRegister → warm()`, queries as statics on the owning class.
- **Existing manifest-booted homes for Phase A**: `WorldClockRegistry`
  (its `boot()` already exists — `WorldClockLogic.boot` is
  `resolveRegistry().boot()`), `CardRegistry` (the sweep's state
  `sweepHandle` currently sits at module scope of `api/card.ts`),
  `CentralBank` (already `PostRegistrationMixin(Idea)`;
  `BankingLogic.boot` = `restampCustodiansImpl()`), `PressBoard`
  (`PressLogic.boot` is an empty call-site-symmetry seam).
  `MaterialLogic.boot`/`PartyLogic.boot` delegate to module-private
  `bootImpl()` functions that can move whole.
- **Policy machinery**: `AnyOf/AllOf/Not` combinators exist
  (`lib/security/SecurityPolicies.ts`); `FromClass`/`FromMixin` carry
  `opts.where(caller, target, method, args)`; `FromController` is
  AnyOf-sugar over stamped controller module ids; `SelfOnly` is
  `caller === target`. ⚠ Backend classes are **unstamped** (the loader
  transform covers `mud/**` only), so any `FromX` policy fails closed
  for a backend caller — methods invoked from the connection layer must
  be ungated or keep an Api fold.
- **The exemplar duplicate is verified**: `Thermal.depositHeat(joules)`
  at `lib/thermal/Thermal.ts:336`; `ThermalLogic.depositHeat` is a
  narrowing guard + forward.
- **`check-thin-forwarder.ts`** flags `return p.m(...)` and
  `if (c) return <trivial>; return p.m(...)` but NOT the void-guard
  `if (!isX) return; p.m(...)`. It has an empty ALLOWLIST and a
  fixtures/tests convention (`scripts/__fixtures__`, `scripts/__tests__`).
- **The ledger storage homes**: regard/recognition/identification are
  **BeliefStore realms** (`viewer.recall(REGARD|RECOGNITION|IDENTIFICATION,…)`,
  `viewer.know(…)`) — the viewer face already lives on the mixin;
  RegardLogic holds only clamp arithmetic, BeliefStoreLogic only the
  `BeliefDocument` Mongo read/write (BeliefDocument is `lib/belief/` —
  inside the mudlib, no boundary issue). Chronicle has **no mixin**
  (owner key read off `getTemplatePath()`); `PersonaMixin`
  (`lib/character/Persona.ts`) affords the `chronicle` verb.
  `AdvancementMixin` exists (`lib/advancement/Advancement.ts`,
  `refreshConferrals`); Trait has **no mixin** (`lib/trait/` is
  vocabulary + entries). Transcript/disposition entries are Documents
  keyed by owner durable id. Character composes
  `AdvancementMixin(… PersonaMixin(… BeliefStoreMixin(…)))` —
  all three ledger faces share ONE host class, so the three
  `recordDeed`/`recordSignature`/`seedClaims` families **collide by
  name** and must be renamed per-family (P4).
- **Production caller files** (grep, non-test, non-api): BeliefStore 2
  (`Avatar`, `BeliefStore` write-through), Posture 5 controllers,
  Credential 1 (`TitleController`; **no CredentialLogic exists** — the
  Api works inline over `CredentialWalletMixin`), Regard 3
  (`IntroduceController`, `DialogueConversation`, `npc/tree`), Trait 6,
  Chronicle 6, Thermal 9(+2 api), Electricity 13, Slot 15(+3 api),
  Recognition 21 + `backend/inbound/affordance.ts`; Connection 16,
  Card 20, Prompt 15, Reaction 15; Fire 6, Glob 8, Chattel 18,
  Subject 6, Chat 7, Magic 6, Social 11, Employment 34 (widest),
  Bulkable 20, Forums 5, Party 11, Combat 22, Advancement 26.
- **`Interactive` extends `Idea`** (`platform/idea/Interactive.ts`) —
  it is Stuff, proxied, gateable. Card/Prompt/Reaction state lives in
  the manifest-booted registries, keyed per-Interactive.
- **`reachableHeatFor`** (ThermalLogic) is "hottest lit Furnace in the
  caller's container" — consumed only by `HeatController`,
  `BoilController`, `CraftingLogic` (the crafting heat gate).
- **`api/bulk.ts` exports `class BulkableApi`**; gate string
  `/api/bulk#BulkableApi` (in `BulkableLogic`). The file is already
  `bulk.ts` — only the class + gate string rename remain.
- **`NotifyPolicyMixin`** (`lib/social/NotifyPolicy.ts`) owns
  `notifyRules()` — Social's rule surface has a mixin home.
- **FromTemplate occurrence census** (this branch): the
  `/platform/idea/api/<x>` arm appears in `lib/` and `platform/idea/`
  files for: address ×4, soul ×3, employment ×3, access ×3,
  worldclock ×2, scheduler ×2, parcel ×2, mql-subscription ×2, and ×1
  each for template, studio, party, document, containment, condition,
  compact, card (+ the `/platform/idea/api/**` arm inside the ApiOnly
  composite). The requirements' 29/21/5/16 arithmetic does not
  reconcile exactly against this grep — **the acceptance target is
  NO ORPHANS + `lint:gates` green, not a number**. Rule per wave:
  when a Logic singleton is deleted, grep its
  `FromTemplate('/platform/idea/api/<x>')` arm and remove every
  occurrence in the same commit.
- **CI**: the lint job in `.gitlab-ci.yml` enumerates the lint family
  explicitly — `lint:object-verbs` is added there when it flips to
  gating (Phase G). `pnpm lint:thin-forwarder` is already in the job.
- There is **no api barrel** (`api/index.ts` does not exist) — the
  acceptance item about barrels is vacuously satisfied; note it at
  finalize.

---

## Plan-level decisions

### P1 — Settings warm at step zero of the warm order (the keystone, decided)

`await AppSettings.warm()` MOVES UP to immediately after
`PackApi.install()` (before `loadHooks`, `preloadAll`, and
`BootstrapManager.run()`). Reasoning from the code: `warm()` reads only
the `app_settings` Document, whose defaults the platform pack merges
during `install()` — nothing between install and the manifest feeds it;
today's late position is exactly why manifest `postRegister`s cannot
read dials (the SeznickHouse warning class). After the move, **every
manifest entry — including all of Phase A's migrating warms — may read
settings**. The seeded-literal `dial()` fallbacks in the Logics are
**kept as test-mode discipline only** (unit fixtures never warm), and a
one-line comment at each fallback says so. `AppSettings.warm` itself
stays a sequencer line: it is not an `Api.boot()` (AppApi never had a
boot), and it is a Document warm with no template-backed row to ride —
the same reason the old WorldClock comment gave, which for AppSettings
is still true.

### P2 — Two post-manifest acts stay sequencer lines (they are not boots)

The manifest cannot express "after everything", and two boot-time acts
genuinely need the whole manifest stood: the **boot spawn sweep**
(`ResidencyApi.spawnNow()` — it counts the live population the manifest
just cloned) and the **immediate roster pass**
(`EmploymentApi.tickRoster()` — on-shift state must be correct at boot,
and the Businesses it walks are other packs' manifest entries, which
platform `dependsOn` edges cannot name without coupling to optional
packs). Both survive as explicit sequencer lines *after*
`BootstrapManager.run()`; both are existing consumer statics, not
`boot()`s, so the acceptance bar (zero `Api.boot()` lines, no
`static boot` on any Api) holds. Everything else the 16 boots did moves
into the manifest. `DiagnosticApi.startRouter()`, the three relay
`boot()`s, `installOnlineHoldersProvider()`, `AppApi.closeWorld()`/
`openWorld()` and the shutdown path are out of scope and stay.

### P3 — One self-warming singleton per retired boot; move code, widen gates only as fallback

Each migrating warm gets a template-backed home following
FermentProfileCatalogue verbatim (`PostRegistrationMixin(Idea)`,
eviction/destruct vetoes, `postRegister → warm()`), one manifest entry
each, so every ordering is a visible `dependsOn` edge. Twelve new
classes (`platform/idea/`, platform-pack template YAML each):
`MaterialCatalogue`, `ConditionCatalogue`, `RenownStandings`,
`ParticipationStandings`, `ProducerStandings`, `ResidencyWarden`,
`SandboxWarden`, `AttendantWarden`, `PresenceRelay`, `PartyRoster`,
`EmploymentEngine`, `ResetWarden`. Four boots ride EXISTING entries:
WorldClockRegistry, CardRegistry, CentralBank, (Press: delete only).
Default mechanics: the Logic's module-private warm/install code
**moves into** the new singleton (the `bootImpl` precedent); only where
it is entangled with Logic internals does the method stay on the Logic
with its gate widened `AnyOf(<existing>, FromTemplate('/platform/idea/<Home>'))`.
Never widen `ApiOnly`.

### P4 — The ledger method families are renamed per ledger (collision is real)

Chronicle, Trait and Advancement all land on Character's composition
and all three currently expose `recordDeed`/`recordSignature`/
`seedClaims`/`entriesFor`. On the host they become three named
families (exact tables in Waves C2/C3): chronicle → `recordClaim` /
`recordDeed` / `recordChronicleOnce` / `chronicleEntries` /
`seedChronicleClaims`; advancement → `creditSignature` / `creditDeed` /
`transcriptEntries` / `competenceBandFor` / `competenceBands` /
`conferredVerbs`; trait → `imprintSignature` / `imprintDeed` /
`dispositionEntries` / `traitPositions` / `traitPosition` /
`pronouncedTraits` / `compatibilityWith` / `regardBaselineToward` /
`seedTraitClaims`. `recordDeed` (unqualified) belongs to the chronicle
— the subsystem whose doc owns the word deed.

### P5 — Gate parity is a legitimate rule-1 outcome

Most retiring statics are `Public` today (anyone could call the Api).
Where the three-way test lands on "trusted relationship → ungated",
that is a *chosen* gate, recorded per method below — not an omission.
`@Final @Unshadowable` still goes on every moved method that owns a
field invariant (the seal is what makes a chokepoint a chokepoint).
Methods reachable from the **backend** (connection layer) must be
ungated or keep an Api fold, because backend classes carry no module
stamp and every FromX policy fails closed on them.

### P6 — The conversion recipe (stated once; every wave follows it)

1. Move the method + its module-private helpers into the owning
   mixin/class file in `lib/<subsystem>/` (or the platform class).
   Helpers become file-private functions or private methods — never
   exported (export discipline).
2. Apply the three-way gate chosen in this plan; add
   `@Final @Unshadowable` where the method owns a field invariant.
   Mind the intra-singleton/self-call gate gotcha
   (call-security.md § the intra-singleton self-call gotcha).
3. Repoint every caller (`grep -rn "XApi\.method"` across `mud/`,
   `backend/`, and every pack's `src/`), narrowing locally with
   `MixinApi.isX`.
4. Delete the Api static and the Logic method. If the Api empties:
   delete `api/<x>.ts`, the Logic file, every
   `FromModule('/api/<x>#XApi')` and
   `FromTemplate('/platform/idea/api/<x>')` occurrence, and the
   subsystem-doc references. Emptied Logic = deleted Logic; surviving
   Api = surviving split (never collapse a surviving pair).
5. Rehome the Api's tests beside the mixin
   (`api/__tests__/x.test.ts` → `lib/<subsystem>/__tests__/`),
   rewritten to call the object surface. Never delete a behavior test.
6. Run the wave gate; commit; push.

### P7 — The census instrument's type rules (so the count is honest)

`check-object-verbs.ts` counts a static as subject-first when its
FIRST parameter's type mentions `Stuff` or a class imported from
`lib/**` / `platform/**`. Two enumerated lists live IN the script:
`EXEMPT_APIS` (the doctrine-exempt orchestrators + framework Apis +
MixinApi + crafting, copied from the requirements' census exclusions)
and `NON_SUBJECT_TYPES` (`CommandContext`, `ExecutionContext`,
envelope/frame types — context plumbing, not world objects; without
this `CardApi.open(context,…)` false-positives). Widening either list
is a visible diff (the `lint:boundary` precedent). `Interactive` IS a
subject type — Phase E is measured by the same instrument. Advisory
(exit 0, print the count) until Phase G flips `--gate` on and adds the
CI line.

---

## Phase A — boot retirement (4 waves)

**The target table** (every sequencer act, its home, its `dependsOn`):

| Sequencer act today | Home after | New class? | Boot entry (role, dependsOn) |
|---|---|---|---|
| `AppSettings.warm()` | sequencer, moved to just after `PackApi.install()` (P1) | — | — |
| `WorldClockApi.boot()` | `WorldClockRegistry.postRegister` calls its own existing `boot()` (anchor restore + backstop) | no | exists; keep `dependsOn: [EventSubscriptions]`; update the `reason` string |
| `MaterialApi.boot()` | `MaterialCatalogue.warm()` (MaterialLogic's `bootImpl` moves whole) | **yes** | sync-read, no deps |
| `ConditionApi.boot()` | `ConditionCatalogue.warm()` | **yes** | sync-read, `dependsOn: [MaterialCatalogue]` (signs name tissue materials) |
| `RenownStanding.warm()` + `RenownApi.boot()` | `RenownStandings.postRegister`: warm, then reaction+reception taps + recompute schedule | **yes** | producer, `dependsOn: [EventSubscriptions, WorldClockRegistry]` |
| `ParticipationStanding.warm()` + `ConsumerApi.boot()` | `ParticipationStandings.postRegister` | **yes** | producer, `dependsOn: [RenownStandings]` (projection reads renown) |
| `ProducerStanding.warm()` + `ProducerApi.boot()` | `ProducerStandings.postRegister` | **yes** | producer, `dependsOn: [ParticipationStandings]` (shared-signal allowlist order) |
| `AccountBalance.warm()` + `SupplyAggregate.warm()` + `BankingApi.boot()` | `CentralBank.postRegister`: two warms, then `restampCustodians` | no | exists (sync-read) |
| `EmploymentApi.boot()` | recurring tick → `EmploymentEngine.postRegister`; immediate pass → sequencer `EmploymentApi.tickRoster()` (P2) | **yes** | producer, `dependsOn: [CentralBank]` |
| `AttendantApi.boot()` | `AttendantWarden.postRegister` (lease sweep + linkdead release) | **yes** | producer, `dependsOn: [EmploymentEngine]` |
| `ResidencyApi.boot()` | three sweep installs → `ResidencyWarden.postRegister`; `spawnNow()` stays a sequencer line (P2) | **yes** | producer, `dependsOn: [WorldClockRegistry]` |
| `CardApi.boot()` | `CardRegistry.postRegister` installs the sweep; the module-scope `sweepHandle` state moves onto the registry; keep the `runRoot` principal re-plant | no | exists |
| `SandboxApi.boot()` | `SandboxWarden.postRegister` (orphan sweeper) | **yes** | producer, no deps |
| `SocialApi.boot()` | `PresenceRelay.postRegister` (presence tap + roster tap) | **yes** | producer, `dependsOn: [EventSubscriptions]` |
| `PartyApi.boot()` | `PartyRoster.postRegister` (register `party:` provider + re-materialize durable parties; PartyLogic's `bootImpl` moves whole) | **yes** | producer, `dependsOn: [GroupRegistry]` |
| `PressApi.boot()` | deleted (empty symmetry seam; PressBoard already manifest-booted) | no | — |
| `RecordApi.boot()` | `ResetWarden.postRegister` (nightly-reset arm; reads dials — safe post-P1) | **yes** | producer, `dependsOn: [WorldClockRegistry]` |

### Wave A1 — the keystone + the roster chain head
P1's settings move (with the comment explaining why, and the fallback
comments); WorldClock into `WorldClockRegistry.postRegister`;
`MaterialCatalogue` + `ConditionCatalogue` (new classes + YAMLs + boot
entries); delete those four `boot()` statics + their Logic `boot`
bodies + sequencer lines. `MaterialApi`/`ConditionApi` keep their
consumer query surfaces. **Tests:** each old boot test becomes the
singleton's postRegister test + a pack.yaml wiring assert (the
`FermentProfileCatalogue.test` shape); the naming drift-guard test
gains the new classes. Wave gate + a dev-server boot sanity check.

### Wave A2 — the standings + money chain
`RenownStandings`, `ParticipationStandings`, `ProducerStandings`;
banking's two warms + custodian restamp onto `CentralBank.postRegister`.
Delete `RenownApi.boot`/`ConsumerApi.boot`/`ProducerApi.boot`/
`BankingApi.boot` + the four warm lines. Tap-install code moves out of
the Logics where clean; otherwise widen per P3.

### Wave A3 — the sweeps
`ResidencyWarden`, `SandboxWarden`, `AttendantWarden`, `ResetWarden`,
`EmploymentEngine`; Card's sweep into `CardRegistry.postRegister`;
delete the six `boot()` statics; add the two P2 sequencer lines
(`tickRoster` gets a comment naming P2's reason). The card sweep suite
(`card-sweep.test.ts`) is the pin.

### Wave A4 — social/party/press + the fresh-DB drive
`PresenceRelay`, `PartyRoster`; delete `SocialApi.boot`,
`PartyApi.boot`, `PressApi.boot` (+ `PressLogic.boot`). Then the
phase's acceptance drive: **drop the dev DB, boot the server, verify
every roster stands** — materials count line, conditions, the clock
anchor restored/seeded, the three standings warmed, account balances,
frame store, spawn sweep placement line, world-open line. Grep-proof:
`grep -n "Api.boot()" src/backend/AppBootstrap.ts` → empty;
`grep -rn "static.*boot(" src/mud/api/` → empty (relay readers are
backend, not Apis). `pnpm docs:project` → no `boot()` in the consumer
tier. Sizing: Phase A is the largest single phase by file count
(~12 new classes + YAMLs, ~20 edited files) but is mechanical;
budget 3–4 waves of a session each.

---

## Phase B — lint hardening + the census instrument (2 waves)

### Wave B1 — the two scripts
1. Harden `scripts/check-thin-forwarder.ts`: add the **void-guard
   shape** — a body that is exactly [guard `if` whose consequent is a
   bare/trivial `return`] + [a single `<param>.m(...)` expression
   statement or `return <param>.m(...)`]. Add a fixture under
   `scripts/__fixtures__/` and a test that asserts the lint **fires**
   on it (the requirements' shipped-broken-gate clause).
2. Ship `scripts/check-object-verbs.ts` per P7; wire
   `"lint:object-verbs"` into `packages/server/package.json` and the
   root. Advisory. Record the baseline count (should print ≈190) in
   the commit message — this number is the build's burn-down meter.

### Wave B2 — the ten already-illegal wrappers (the exemplar wave)
Convert everything the hardened lint now flags — the verified ten:

| Wrapper (deleted) | Callers go to | Notes |
|---|---|---|
| `ThermalLogic.depositHeat` (+ `ThermalApi.depositHeat`) | `stuff.depositHeat(joules)` (`lib/thermal/Thermal.ts`) | ⭐ THE EXEMPLAR — do first, document the P6 recipe in the commit |
| `MessageLogic.sendMessage` | `recipient.onMessage(...)` | ~10 caller files (registries) |
| `MessageLogic.sendEnvelope` | `recipient.onEnvelope(...)` | rides the same commit |
| `GlobbableLogic.canMerge` | `a.canMergeWith(b)` | |
| `CommandLogic.forceCommand` | `giver.executeCommand(...)` | 11 caller files (brains) |
| `ConnectionLogic.recordOrigin` | `interactive.recordOrigin(ip)` — lands on `Interactive` NOW (Phase E vanguard) | ungated (backend caller, P5) |
| `ContainmentLogic.isContainedIn` | the containable's own method | doctrine-exempt Api, still an illegal wrapper |
| `LocomotionLogic.exitAllowsMode` | the exit's own method | same |
| `WorldClockLogic.cancel` | the handle's own method | same |
| `SlotLogic.vacateAll` | `host.vacateAll(candidate, slots)` — lands on `Slotted` now (D5 vanguard) | |

Each conversion follows P6 in full (gate chosen, callers repointed,
Api static deleted, tests rehomed). `pnpm lint:thin-forwarder` green
with the strengthened shapes is the wave's exit.

---

## Phase C — the ledger family (3 waves; the two faces)

The design (requirements § the ledger family): **viewer face** on
`BeliefStoreMixin` (belief + regard — the state already lives there);
**owner face** on `PersonaMixin` (chronicle), a NEW `DispositionedMixin`
(trait), and the existing `AdvancementMixin` (transcript). The
key-based ledgers (Accountability, Provenance, Record's store) are out
of scope.

### Wave C1 — the viewer face (retires BeliefStoreApi + RegardApi)
Extend `lib/belief/BeliefStore.ts`:

| New method (on BeliefStoreMixin) | From | Gate |
|---|---|---|
| `hydrateBeliefs(): Promise<void>` | `BeliefStoreApi.hydrate` | `SelfOnly` (Avatar restore path calls `this.…`) |
| `evictAndFlushBeliefs(): Promise<void>` | `evictAndFlush` | `SelfOnly` |
| *(file-private)* belief write-through/delete | `writeRecord`/`deleteRecord` | none — becomes internal to the mixin file (`BeliefDocument` I/O moves in from BeliefStoreLogic); the mixin's own `know`/`forget` call it directly |
| `regardFor(subject: Stuff): number` | `RegardApi.getRegard` | ungated read |
| `adjustRegard(subject: Stuff, delta: number): void` | `adjustRegard` | `AnyOf(SelfOnly, FromController(IntroduceController), FromClass(() => DialogueConversation, { where: caller is conversing with this host }))` — verify the tree.ts effect path runs under the conversation principal; `@Final @Unshadowable` (owns the clamp) |
| `setRegard(subject, value)` / `clearRegard(subject)` | same | same gate + seal |
| `regardsHeld(): ReadonlyMap<string, number>` | `regardsHeldBy` | ungated read |

Delete: `api/belief.ts`, `api/regard.ts`, `BeliefStoreLogic.ts`,
`RegardLogic.ts`, their `FromModule` strings. Repoint: `Avatar.ts`
(hydrate/evict → `this.`), the mixin's own write-through,
`IntroduceController`, `DialogueConversation`, `npc/tree.ts`. Tests:
`api/__tests__/belief.test.ts` + regard tests → `lib/belief/__tests__/`.
Docs: belief.md.

### Wave C2 — the chronicle (retires ChronicleApi; deed vs claim becomes the gate)
Extend `lib/character/Persona.ts` (PersonaMixin — it already affords
the `chronicle` verb). ChronicleEntry/fields types stay in
`lib/chronicle/`.

| New method | From | Gate (THE point of this wave) |
|---|---|---|
| `recordClaim(fields: ChronicleEntryFields): Promise<void>` | `record` with `kind:'claim'` | **self-callable**: `AnyOf(SelfOnly, FromController(EnrollController, ChronicleController))` |
| `recordDeed(fields): Promise<void>` | `recordDeed` | **witness-gated**: `AnyOf(FromController(IntroduceController), FromClass(() => RecipeKnowledge), FromClass(() => SpellKnowledge))` — map every current caller (`Avatar.ts`, char-gen, knowledge stores) to claim-vs-deed and extend the arms accordingly; never `Public` |
| `recordChronicleOnce(key, fields)` | `recordOnce` | same contract as `recordDeed` |
| `chronicleEntries(): Promise<ChronicleEntry[]>` | `entriesFor` | ungated read (the public, contestable record) |
| `seedChronicleClaims(seeds)` | `seedClaims` | `FromController(EnrollController)` |

All mutators `@Final @Unshadowable` (append-only invariant). The
generic any-kind `record` primitive does NOT survive — every caller
declares claim or deed. ChronicleLogic's Prose/witness logic moves
into the mixin file (module-private). Delete api/chronicle.ts +
ChronicleLogic + strings; docs: chronicle.md (+ measurement.md
cross-ref note at finalize).

### Wave C3 — the twins (trait + advancement; retires TraitApi, and AdvancementApi if emptied)
New `lib/trait/Dispositioned.ts` (`DispositionedMixin`,
`_mixinName = 'DispositionedMixin'`, registered in `lib/mixin.ts` +
`MixinApi.isDispositioned`), composed into `Character` beside
PersonaMixin; methods per P4's trait family. Writers:
`imprintSignature`/`imprintDeed` gated `AnyOf(SelfOnly,
FromController(TraitsController))` (Behaved's claim-seeding and the
advancement lane-1 forward both run as the host — verify), sealed;
reads ungated. `seedTraitClaims`: `AnyOf(SelfOnly,
FromController(TraitsController))`.

`lib/advancement/Advancement.ts` (AdvancementMixin) gains the P4
advancement family. `creditSignature`/`creditDeed`: **rule-1 ungated
with seal** (P5 — parity with today's Public statics; the writer set is
every acting controller and engagement in the tree, and a FromModule
glob over all controller trees is a worse contract than an honest
ungated seal; flagged in Risks). Body ends with
`await this.refreshConferrals()` (replacing the Api-side re-invoke).
Reads ungated; the two sync competence caches become mixin methods over
`DerivedStandingCache`; `_clearDerivedCacheForTesting` moves to
`DerivedStandingCache` as its own test seam.

Blast radius: Trait 6 files, Advancement 26 files (the second-widest
repoint — controllers crediting deeds across kernel + packs; run every
touched pack's vitest). Delete TraitApi/TraitLogic; delete
AdvancementApi/AdvancementLogic **if fully emptied** (expected — every
method is owner-first), else leave the survivor and say so in the
commit. Docs: trait.md, advancement.md. Tests → `lib/trait/__tests__/`,
`lib/advancement/__tests__/`.

---

## Phase D — the remaining fully-subject Apis (4 waves, blast-radius order)

Each wave = P6 recipe; the Api + Logic + gate strings deleted whole;
tests rehomed; subsystem doc repointed.

### Wave D1 — Posture (5 caller files) + Credential (1)
- `PostureApi.transferPosture` / `vacatePostureBearingSlots` /
  `findCurrentPostureBearingSlot` → methods on `Posed`
  (`lib/character/Posed.ts`): `actor.transferPosture(…)`,
  `actor.vacatePostureBearingSlots()`,
  `actor.currentPostureBearingSlot()`. Gate: mutators
  `FromController(SitController, StandController, LieController,
  KneelController, MountController, DismountController)`; the find is
  an ungated read. Delete PostureApi + PostureLogic.
- `CredentialApi.presentsKey(mover, lock)` →
  `mover.presentsKey(lock)` on `CredentialWalletMixin`
  (`lib/credential/CredentialWallet.ts`), ungated read;
  `issueKey`/`issueMasterKey` → wallet-side mint methods gated
  `FromController(TitleController)` (sole caller; extend the arm when
  a second issuer appears). No Logic exists; delete `api/credential.ts`.
  Docs: posture.md, credential.md.

### Wave D2 — Thermal (retires ThermalApi; 11 files)
`depositHeat` went in B2. Remaining: `reconcilePhase(stuff)` →
`stuff.reconcilePhase()` on the Thermal mixin (phase-change internals
move from ThermalLogic to `lib/thermal/` module-private; callers
MagicLogic, Furnace, Casting narrow locally) — ungated,
`@Final @Unshadowable` (owns phase/temperature invariants).
`reachableHeatFor(position)` → `maker.reachableHeatK()` on
**MakerMixin** (verify the mixin file at build; all three consumers are
crafting-side and their subject is the maker) — ungated read. Delete
ThermalApi + ThermalLogic + the gate string. Docs: thermal.md.

### Wave D3 — Electricity (13 files)
`conduct(source)` → `source.conduct()` on `Energized`
(`lib/electricity/Energized.ts`); `currentThrough`, `shockContact`,
`pathToGround(node)`, `groundNodeFor(node)` follow the same walk into
the mixin file (module-private graph helpers). Gates: `conduct`/
`shockContact` ungated + sealed (physics drivers: LiveWire, StunBaton,
FloodedCell, weather lightning, magic effects — a trusted physical
relationship); reads ungated. Callers include `WorldClockRegistry`,
`Condition`, `Vitals`, `api/magic.ts`, `api/weather.ts`. Delete
ElectricityApi + ElectricityLogic. Docs: electricity.md.

### Wave D4 — Slot (18 files) then Recognition (22 files)
- Slot: host-side onto `Slotted` (`lib/slot/Slotted.ts`):
  `occupyAll(candidate, slots)` (sealed — transactional invariant),
  `vacateAll` (done in B2), `findOpenSlotFor(candidate)`,
  `resolveSlot(by)`, `walkOccupants(…)`; candidate-side onto
  `Slottable`: `occupiedSlots()`, `occupiedHost()`;
  `transferOccupancy` onto whichever side its signature roots (verify
  at `api/slot.ts:168`). Mutator gates: ungated + `@Final
  @Unshadowable` (the callers are the embodiment/conveyance verbs and
  mixin cleanup paths — trusted relationship; the seal carries the
  atomicity invariant). Delete SlotApi + SlotLogic. Docs: slot.md,
  embodiment.md.
- Recognition (the naming-sharpest wave — flag deviations to the
  user): **target-side** on `Stuff` (the `getPresentation` precedent —
  the described object owns its fallback): `describeFor(viewer)`,
  `describeWithStatusFor(viewer)`, `perceivedKeywordsFor(viewer)`,
  `salientFeaturesFor(viewer)`, `kindFor(viewer?)` (the
  undefined-viewer fallback folds in). **Viewer-side** on
  `BeliefStoreMixin`: `learnIdentityOf(subject, …)` (write — gate
  `AnyOf(SelfOnly, FromController(IntroduceController),
  FromClass(() => DialogueConversation))`, sealed),
  `recognizes(subject)`, `knowsTrueTypeOf(target)` (reads, ungated;
  non-belief viewers: callers narrow, default false). Repoint 21 mud
  files + `backend/inbound/affordance.ts` + 6 api files. Delete
  RecognitionApi + RecognitionLogic. Docs: belief.md, perception.md.

---

## Phase E — Interactive (2 waves)

`Interactive` (`platform/idea/Interactive.ts`, an Idea — proxied and
gateable) gets real methods. The four Apis are NOT whole-retirements:
each keeps its key-based/subjectless remainder, so each keeps its
XApi↔XLogic split. Registry/Logic state stays where it is; the new
instance methods forward into the Logic singletons, whose per-method
gates widen `AnyOf(<existing FromModule>,
FromModule('/platform/idea/Interactive#Interactive'))`.

### Wave E1 — the method surface

| Interactive method | From | Gate |
|---|---|---|
| `sendMessage(frame)` / `sendEnvelope(template)` | ConnectionApi | ungated + `@Final @Unshadowable` (owns the per-Interactive frameId monotonicity) |
| `transferTo(target: HasInteractive & Stuff)` / `detach()` | ConnectionApi | ungated (backend connection layer calls these — P5); the doc comment names the trusted caller |
| `recordOrigin(ip?)` | landed in B2 | ungated (backend) |
| `pushCard(cardId, opts)` / `touchCard(key, opts)` / `setCardPinned(ref, pinned)` / `closeCard(ref, reason)` / `listCards()` / `applyCardArrangement(…)` / `notifyPromptSettled(…)` / `cancelAllCards()` | CardApi | ungated (parity; card pushes are server-side by construction — the `opens_card` gate stays on `CardApi.open`) |
| `promptChoice/promptConfirm/promptText/promptCompose/promptMqlObject/promptMqlMany(…)` | PromptApi | ungated (controllers everywhere — trusted relationship with own connection) |
| `handlePromptResponse/handlePromptCancel(…)` / `cancelPrompts()` / `hasPendingPrompt(…)` | PromptApi | response/cancel: ungated (inbound layer is backend) |
| `registerReactions()` / `cancelAllReactions()` / `lastDeliveredAct()` / `noteDeliveredFrame(…)` | ReactionApi | ungated (registry + inbound plumbing) |

Stays static: `ConnectionApi`'s socket/playerId-keyed reads
(`getInteractive`, `getAllInteractives`, counts, `originOf`,
`sequenceInbound`) — mandate (a)/(c); `CardApi.open(context, cardId)` +
`keyFor` (CommandContext plumbing + the opens_card gate — P7's
NON_SUBJECT_TYPES keeps the census honest) + `isLive`;
`PromptApi`'s resolver-map/cardinality machinery and
`renderPromptRefresh(giver)` if its subject is the giver-side refresh
note (convert opportunistically if clean); `ReactionApi`'s
commandId/scope-keyed surface and the sink registry.

### Wave E2 — the repoint
~50 caller files across the four families (Connection 16, Card 20,
Prompt 15, Reaction 15, overlapping). Delete the moved statics + their
Logic bodies where they became pure forwards. The census count after E
should show only Phase F+G Apis. Docs: connection.md, card-surface.md,
prompt.md, reactions.md.

---

## Phase F — the mid-size Apis (5 waves)

Same recipe per Api. Per-Api targets (first param → home; verbs move,
reads convert opportunistically in the same wave; key/string-first
methods stay):

### Wave F1 — thing-side small fry: Fire (6), Glob (8), Chattel (18)
- Fire → `Combustible` (`lib/fire/Combustible.ts`): `ignite()`,
  `tryAutoignite()`, `douse()`, `advanceBurn()`, `isBurning()`
  (ungated + seal on the state-owning mutators; physics drivers).
  `onFireTick`/`fireTickIntervalSeconds` are subjectless — FireApi
  survives thin (or the tick moves to a Phase-A-style home if trivial;
  builder's call, recorded in the commit).
- Glob → `Globbable`: `split(…)`, `absorb(other)` (from `merge` —
  sealed, owns quantity conservation), `applyQuantity(…)`;
  `installMergeOnArrival` stays (subjectless install). GlobApi
  survives only if something subjectless remains; else delete.
- Chattel → item-side methods on the chattel mixin
  (`lib/chattel/Chattel.ts`): `chattelOwner()`, `isStamped()`,
  `isOwnerPersisted()`, `setChattelPlace(place)`, `followCustody()`,
  `stampChattel(owner)` (sealed — chain-of-title invariant; gate
  `FromController` of the stamping verbs + the retail/crafting
  participants — enumerate from grep at build), `transferChattel(to)`
  (same). Registry-keyed `release(chattelId)`/`evictToStorage(prefix)`
  stay on ChattelApi (key-based). Docs: chattel.md.

### Wave F2 — comms/social: Subject (6), Chat (7), Forums (5), Social (11)
- Subject/Chat: actor-first methods (`visibleSubjects`,
  `isAudienceMember`, `follow`, `mute`, `get/setSubscription`,
  `postToChannel`, `visibleChannels`) → actor-side methods on the
  mixin that owns subscriptions (verify: the subscription store home —
  likely the Avatar-side subject/chat surface; land beside it). The
  Subject/Channel-object-first ones (`renameSubject`, `deleteSubject`,
  `addManifestation`, `promoteAdHocToManaged`) → methods on the
  `Subject` Idea where it is Stuff; string/id-keyed resolvers stay.
- Forums: actor-first verbs (`postThread`, `reply`, `attachClaim`,
  `editBody`, `castVote`, `promoteThread`, `matureArgument`,
  `listBoards`) → actor-side methods; the actor param drops where the
  context-derived author (provenance) already carries it — verify
  against `recordAuthoring` before dropping any param.
- Social: rule surface (`ruleFor`, `listRules`, `setRule`,
  `removeRule`, `reorderRule`) → `NotifyPolicyMixin`
  (`lib/social/NotifyPolicy.ts`, beside `notifyRules()`); viewer
  composes (`snapshotFor`, `composeCard`, `composeRow`,
  `composeOccupants`, `styleMessageFor`) → viewer-side methods;
  `statusOf(target)` → `target.presenceStatus()`. `online()` stays
  (subjectless). Docs: social-graph.md, forums.md, chat.md.

### Wave F3 — Magic (6) + Party (11)
- Magic: `prepareCast`/`resolveCast`/`spellsView(caster)` →
  `CasterMixin`; `transferCharge`/`discharge`(item) →
  `lib/magic/Charged.ts`; `requiresMark(item)` → item-side read;
  `spellAt(path)`/`suppressionAt(place|null)` stay (path-keyed /
  nullable-subject walks). The Effect-gating doctrine (magic.md) rides
  the method gates: cast mutators `FromController` of the casting
  verbs + sealed. Docs: magic.md, magic-items.md.
- Party: member-side verbs onto `PartyMemberMixin`
  (`lib/party/PartyMember.ts` — the participant-contract exemplar
  already lives here): `formParty(name)`, `inviteToParty(invitee)`,
  `acceptPartyInvite()`, `enlist(hiree)`, `leaveParty()`,
  `kickFromParty(member)`, `disbandParty()`, `transferCaptaincy(to)`,
  `setPartySide(…)`, `setPartyFormation(…)`, `assignPartyRole(…)`,
  `muster(name)`, `standDown()` — gates: the Party↔member participant
  contracts already adjudicated (`FromClass(() => Party)` + where);
  captain-only verbs get `where: caller is this party's captain` on
  the Party side. The combat seam reads (`sideOf`, `areAllied`,
  `formationPathOf`, `roleOf`, `isCaptain`, `activePartyOf`) must
  answer for NON-members (solo ref) — they stay on PartyApi as the
  read tail (convert opportunistically only if a clean host exists);
  `partiesOf(memberId)` is key-based and stays. PartyApi survives
  thin; PartyLogic survives with it. Docs: party.md.

### Wave F4 — Employment (34 files — the widest repoint) + Banking + Material tail
- Employment: org-side verbs onto `lib/employment/Organization.ts`:
  `org.hire(actor, position)`, `org.fire(actor)`, actor-side
  `actor.quitJob(orgPath)`, `actor.beginCover(business)` /
  `endCover(business)` onto `Employed`; reads (`holdsAuthority`,
  `holdsPosition`, `isProprietorOf`, `mayPublishAs`, `buysFor`,
  `shiftStateOf`, `tipRecipientFor`, `businessOfProprietor`,
  `stockSheetFor`, `goodsFor`) split actor-side/org-side by whose
  state they read; path-keyed (`businessAt`, `holdersOf`,
  `organizationChainOf`, `operatingAccountOf`, `ensureOperatorAt`,
  `tickRoster`, settlement statics) stay — EmploymentApi survives.
  Gates: hire/fire `FromController(AppointController/…)` + the
  roster-materialization participant (enumerate callers at build);
  wage/settlement methods keep their existing money posture (they
  call the sealed banking chokepoint). Touched packs: every trade
  pack with `src/` — run each pack's vitest.
- Banking's 5 subject-first (member methods onto `Bank`/wallet hosts
  where the census flags them — the `postTransaction` chokepoint and
  account-id surface stay untouched), Material's 5 (onto `Material`
  instance surface), and the F-tail: Group, Weather, WorldClock,
  Conviction, Government, Perception, Message, Record's
  viewer-shaped strays, and the ~15 one-method singletons the census
  lists. Convert each per P6.

### Wave F5 — census-tail zero check
Run `pnpm lint:object-verbs`. Everything still listed that is not
`CombatApi` gets converted here, or — where the four mandates
genuinely cover it — added to the script's `EXEMPT_APIS` with a
one-line reason **and surfaced to the user in the MR** (the widening
is a visible diff by design). Exit: the census reports CombatApi only.

---

## Phase G — Combat, alone, last (2 waves)

### Wave G1 — the combatant face
Onto `CombatantMixin` (`lib/combat/Combatant.ts`), actor-first:
`initiateCombat(target, …)`, `queueGambit(key)`, `yieldFight()`,
`intervene(target)`, `defendAlly(ally)`, `disengage()`, `bumRush(…)`,
`offerBreak()`, `beginWeaponSwitch(…)`, `drawSidearm()`,
`resolveThrown(…)`, `orderCoup()`; reads `assessCombat(target)`,
`perceiveCombat()`, `rangeStanding()`, `formationStanding()`,
`bandTo(other)`, `mayDeliverTo(other, …)`, `splashSet()`. Weapon reads
`isWeapon`/`weaponProfileOf`/`visibleArms` → `Wieldable`/weapon-side.
Gates: combat verbs `FromController` of the combat category's
controllers (the context-dependent case — the *reason* is the verb) +
pair-verbs carry a `where` asserting session co-membership; mutators
that own poise/tempo fields sealed. Session-first statics
(`openSession`, `advance`, `merge`, `sessionFor`) and `blameFor
(victimId)` stay on CombatApi — `CombatSession` is a lib value class,
not Stuff, so the session lifecycle is mandate (b); CombatApi survives
with CombatLogic. 22 caller files; the combat suites +
`lint:combat-dynamics` + `pnpm test:gym` spot-run (not CI-gating) are
the pins.

### Wave G2 — the gate flips + doctrine docs
Flip `check-object-verbs.ts` to CI-gating (`--gate` default / add the
`.gitlab-ci.yml` line beside `lint:thin-forwarder`); census must
report **zero**. Docs pass: antipatterns.md gains the doctrine
statement + the three-way gate rule; architecture.md records the
post-sweep Api-tier mandate; call-security.md records the
identity-path rule (a future FromIdentity must read the raw
`_identityStampOf`, never the overridable method — the requirements'
recorded reasoning) and the participant-contract-default posture;
CLAUDE.md's antipattern table audited for rows naming moved statics;
combat.md updated.

---

## Pre-MR runway (after G2)

`git status` source-change check → ONE full `pnpm test` + `pnpm
test:gym` untouched-check + every lint + `pnpm docs:project` (no
`boot()`, consumer tier sane) → fresh-DB boot drive re-run → push →
**open the MR** (workflow § 3; pushing and MR creation are not gated
on the user). `/finalize` later retires this plan + the requirements
and graduates knowledge to the subsystem docs.

---

## The 190, accounted

Baseline (requirements, re-measured post-`ecbafb9a0`): 1,353 statics;
190 subject-first outside the four mandates. Wave B1's census run is
the authoritative burn-down checklist; every named Api maps to exactly
one wave:

| Bucket | Apis | ≈methods | Wave |
|---|---|---|---|
| Already-illegal wrappers | Thermal·Message·Glob·Command·Connection·Containment·Locomotion·WorldClock·Slot (one–two each) | 10 | B2 |
| Ledger, viewer face | BeliefStore 4, Regard 5 | 9 | C1 |
| Ledger, owner face | Chronicle 5, Trait 9, Advancement 9 | 23 | C2–C3 |
| Fully-subject rest | Posture 3, Credential 5, Thermal 2, Electricity 5, Slot 7, Recognition 8 | 30 | D1–D4 |
| Interactive family | Connection·Card·Prompt·Reaction | ~25 | E1–E2 |
| Mid-size | Fire·Glob·Chattel · Subject·Chat·Forums·Social · Magic·Party · Employment·Banking·Material + the ≤4 tail (Group, Weather, WorldClock, Conviction, Government, Perception, Record, ~15 singletons) | ~67 | F1–F5 |
| Combat | Combat | ~26 | G1 |
| Explicit exemption bucket | anything F5/G adjudicates into `EXEMPT_APIS` (visible diff + MR note) | 0 target | F5 |

Totals are approximate by design — the SCRIPT is the count; the
invariant enforced per phase is: after E only F+G Apis remain; after
F5 only Combat; after G, zero.

## Acceptance-criteria coverage

| Criterion (requirements) | Waves |
|---|---|
| `check-object-verbs.ts` exists, advisory→gating, enumerated exemptions | B1, F5, G2 |
| thin-forwarder void-guard + fixture-fires test + the ten converted | B1, B2 |
| Zero `Api.boot()`; no `static boot`; projection clean | A1–A4 |
| Fresh-DB boot stands every roster on `dependsOn` alone | A4, pre-MR |
| Gate strings shrink with the Logics; no orphans; `lint:gates` green | every wave (P6 step 4) |
| Retired Apis gone in full, tests rehomed | C–D waves per Api |
| Ledger gates by the three-way rule; claim self-callable, deed witness-gated | C1–C3 |
| Lint family + full suite at the two moments | every wave; pre-MR + /finalize |
| Docs (antipatterns/architecture/call-security/subsystems/CLAUDE.md) | per-wave + G2 |

## Risks & opens

1. **The settings step-zero move (P1)** changes when every existing
   postRegister can read dials — latent ordering assumptions may
   surface. Mitigation: `getCached` throws loudly; A1's dev-boot check
   and A4's fresh-DB drive are the tripwires.
2. **Post-manifest acts (P2)**: `spawnNow` + `tickRoster` stay
   sequencer lines. This is a deliberate, documented deviation from
   "everything on the manifest" — the manifest cannot express
   after-everything, and inventing a `phase: late` manifest field is
   new machinery the requirements didn't buy. Flag in the MR
   description.
3. **The ledger name collisions (P4)** are real and underestimated in
   the requirements: three `recordDeed` families share one host class.
   The renames add naming churn to ~60 call sites beyond mere
   repointing. The P4 table is the decision; iterate with the user if
   any name reads wrong.
4. **Prompt tension**: the requirements list Prompt as doctrine-exempt
   (non-goals) AND decide its Interactive-first methods move (surface
   decisions). This plan follows the specific decision: the
   Interactive-first tier moves; the resolver-map machinery stays
   exempt.
5. **`describeFor` on the Stuff base** (D4) grows the root class —
   implied by whole-retirement of RecognitionApi but not named in the
   requirements. Precedent is `getPresentation()`. Surface in the MR.
6. **Backend callers are unstamped** — every Interactive/connection
   method callable from the backend must be ungated or keep an Api
   fold. Do not "fix" this by stamping backend files.
7. **Advancement's ungated credit seam (C3)** is security-parity, not
   tightening; sandbox/wizard code could still grind transcripts as it
   can today. Recorded, not solved, this build.
8. **Gate-string arithmetic**: the requirements' 29/21/5/16 counts do
   not reconcile exactly against this branch's grep. Target = no
   orphans + `lint:gates` green; a per-wave grep of the deleted
   Logic's arm is the mechanism.
9. **CombatSession is not Stuff**, so CombatApi survives (session
   lifecycle = mandate (b)) — Combat is a verb-move, not a
   whole-retirement. Consistent with requirements (Combat is not in
   the ten).
10. **B2 is bigger than the slate implies** (`sendMessage`/`forceCommand`
    ≈ 20+ caller files) — budget it as a real wave, not a warm-up.

## Relative wave sizes (pacing)

W0 small · A1–A4 large-mechanical (the most new files; ~1 session
each) · B1 small · B2 medium · C1 small · C2 medium · C3 large (26
files) · D1 small · D2 small · D3 medium · D4 large (2 sessions) ·
E1 medium · E2 large · F1 medium · F2 large · F3 medium · F4 largest
single wave (34 files + packs) · F5 small · G1 large · G2 small ·
runway small. Roughly 20 waves ≈ 20 commits minimum.
