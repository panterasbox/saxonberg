# Wizard-axis cleanup — implementation plan

Executes
[wizard-axis-cleanup-requirements.md](../requirements/wizard-axis-cleanup-requirements.md)
(**kind:** refactor/sweep with one feature wave — W3's governance route;
**leads from:** kernel, first consumers the shipped dorms-agent and
letting seats). The build strips every wizard check that is not *authoring
TypeScript*, folds the doors that really are TypeScript into one
predicate, routes the political dials to the two seats that already hold
the levers, and adds the gate that fails CI when a new leak appears. The
owner's rulings of 2026-11-05 (the axis is AUTHORING TS; running TS is not;
`reload` is title; content that NAMES code is content; fiscal to the
Minister of Finance, monetary to the Governor; never a new wizard check)
amend every older sentence they disagree with, including
`CLAUDE.md`'s *"and the `class`/`behaviors[].brain` content-template
fields"* line and access.md § *The code-trust lockdown*.

Written 2026-11-05 against master at `0f746f045` (harbors merged). The
slate's inventory was taken 2026-09-03 and master has moved ~1,000
commits since; **everything below was re-verified by opening the file.**

**Revised the same day against the amended requirements (`edc4438d3`):**
reading is open (no source read asks for the wizard); Tier B is the
**Prime Minister's** (`config` loses its wizard gate); **PM ⇒ archwizard
⇒ wizard**, derived; a wizard with no seat is the default case and
everything here must work for one; the harness's `wizard: true` becomes
the axis only and authority comes from a seat. The decisions that changed
are D12, D13, D14 and the new D17–D20; the new W5 is the harness
migration.

**Revised again the same evening (owner's answers, plan commit
`e7f21bf23`):** the executive title backstop is **rejected entirely**
(*"no one should 'sit on every committee' not even the founder"*), and in
its place the shipped founder committee backstop is **deleted** (D18);
test sessions are seated on the committees they need, by name (D13); the
regulated form of the hole — an **executive warrant** — leaves as
[executive-warrant-slate](../slates/builds/executive-warrant-slate.md);
D19 is decided.

## Grounding

### The census, re-taken 2026-11-05, every site classified

`grep -rnE 'isWizard\(|requiresWizard|isArchwizard\(|requiresArchwizard'`
over `packages/server/src`, `packages/content/*/src`,
`packages/content/*/content` (non-test): **72 matches in 50 files**. Of
these, 38 are prose (comments, help text, doc strings) and 34 are live
checks. Every live check, with its verdict under the rulings:

| # | site | what it gates | verdict |
|---|---|---|---|
| 1 | `platform/cmd/author/eval.yaml` — `requiresWizard` | typing TS into `eval` | **KEEP** — authoring |
| 2 | `cmd/shell/WriteController.ts:294` | source-tree write (`write -s`) | **FOLD** → the one predicate (D2); wizard only when the file is code |
| 3–6 | `RmController.ts:118` · `MvController.ts:98` · `CpController.ts:103` · `MkdirController.ts:70` | source-tree file ops | **FOLD** → D2 (same per-path rule; `mkdir` of a directory is content — title only) |
| 7–8 | `api/CmsLogic.ts:191` (`gateSourceWrite`) · `:229` (`gateRead` source) | CMS source write · CMS source browse | write **FOLD** → D2; read **OPEN** to any signed-in avatar (D14) |
| 9–10 | `api/StudioLogic.ts:203` (`gateSourceWrite`) · `:942` (scaffold → draft when not wizard) | publishing a class | both **FOLD** → D2 (a refused `.ts` target yields the draft path) |
| 11–16 | `api/GitLogic.ts:137` (`gateSourceWrite`) · `:233` status · `:266` diff · `:285` log · `:306` publish · `:371` revert | git | `gateSourceWrite` **FOLD** → D2 (per touched file); `publish`/`revert` lose the verb-wide wizard check (the per-file fold decides); `status`/`diff`/`log` **OPEN** to any signed-in avatar (D14) |
| 17 | `cmd/author/reload.yaml` — `requiresWizard` | re-running code already in the tree | **REPLACE** → title over the reloaded path (D4) |
| 18 | `cmd/author/typecheck.yaml` — `requiresWizard` | a verdict on a file, no write | **REPLACE** → same gate as `reload` (D4) |
| 19 | `api/TemplateLogic.ts:225` (`enforceCodeFieldGate`) | a row's `class:` / `behaviors[].brain` | **DELETE** (D5) — content that names code is content |
| 20 | `api/DocumentLogic.ts:609` (command-view `controller:`/validators) | a view that names code | **DELETE** (D5) |
| 21 | `api/AccessLogic.ts:147` (`isAgentOf` short-circuit) | leasing authority | **DELETE the whole method** — `isAgentOf` has **zero callers** outside `access.ts`'s forwarder; both packs moved to `HallController.mayProvision` / `LettingController.mayLet` (seat-based, no wizard arm) |
| 22–25 | `duncan-hall/cmd/provision.yaml` · `unprovision.yaml` · `mayfield-row/cmd/lease.yaml` · `unlease.yaml` — `requiresWizard` | who may let a building | **DELETE** the validator (D1); the seat check is already at `execute()` |
| 26 | `api/MagicLogic.ts:2137` (`execScript`) | the command-running spell | **DELETE** the effect kind (D7) |
| 27 | `cmd/author/practice.yaml` — `requiresWizard` | fabricating a Transcript deed | **RELOCATE** to a test-world verb (D8) |
| 28 | `cmd/system/config.yaml` — `requiresWizard` | the operator's knob board | **REPLACE** → the Prime Minister's seat (D12); Tier C refused inside (D11) |
| 29 | `cmd/system/git.yaml` · `cms.yaml` · `studio.yaml` — `requiresWizard` | verb-wide | **DELETE** the verb-level validator; the per-path fold decides (D2, D14) |
| 30 | `cmd/system/testharness.yaml` — `requiresWizard` (+ `requiresTestWorld`) | test-world staging | **DELETE** the wizard half — staging the clock is not authoring; `testOnly` + `requiresTestWorld` stay |
| 31 | `WikiRenderer.ts:282` (`ceilingFor` → 3) | spoiler reveal | **REPLACE** → the wiki's own capability axis (D6) |
| 32 | `WikiRegistry.ts:800` (`satisfies` — a wizard clears every rung) | wiki edit | **DELETE** the rung; title decides (D6) |
| 33 | `api/DiagnosticLogic.ts:361` (`list` — compile rows wizard-only) | reading compile diagnostics | **OPEN** — compile rows are a read of source; the per-path arm beside it (held extents / pack maintainer) is kept, it protects authorship, not code trust (D14) |
| 34 | `api/DiagnosticLogic.ts:416` (`clear` — wizard OR author-of-path) | **deleting** diagnostic rows — a mutation, not a read | **REPLACE** the wizard arm → title over the path (`canAtPath(subject, 'write-document', path)`), the author-of-path arm stays (D14) |
| 35 | `cmd/system/ErrorsController.ts:90` (`errors raw`) | the server's console ring | **REPLACE** → the Prime Minister (D19): the ring is the box's console, not source, and carries other players' lines — what it protects is their privacy, not code trust |
| 36 | `services/auth/AuthRoutes.ts:184` (`response.isWizard`) | "offer the authoring panes" | **KEEP** — it IS the axis (requirements § Non-goals, amended) |
| 37 | `cmd/author/wizard.yaml` — `requiresArchwizard` | conferral | **KEEP** — the axis is the subject (requirements § Non-goals) |
| 38–40 | `api/access.ts` · `api/AccessLogic.ts` · `platform/idea/AccessRegistry.ts` — the `isWizard`/`isArchwizard` definitions; `lib/command/validators/requiresWizard.ts` · `requiresArchwizard.ts` | the predicate and its validators | **KEEP as definitions**; the definition itself changes — `isWizard = wizards ∪ isArchwizard`, `isArchwizard = archwizards ∪ the PM` (D17) |

The prose sites (`Katie.ts:43`, `Walter.ts:17`, `ProvisionController.ts:22,27`,
`Author.ts` ×6, `CodeNamingFields.ts`, `TemplateLogic.ts` ×10,
`PackLogic.ts:961`, `schema/content.yaml:18`, `edit.yaml:16`,
`wizard.yaml:8,35`, `HouseController.ts:13`, `warehouseman.yaml:3`,
`requiresGovernor.ts:5`, `requiresPackInstaller.ts:13`,
`requiresStreamer.ts:9`, `requiresTestWorld.ts:16`,
`EvalController.ts:63`, `ReloadController.ts:92`,
`PracticeController.ts:11`, `WizardController.ts:9`,
`ConfigController.ts:9`, `GitController.ts:9`, `TestHarnessController.ts:20`,
`WriteController.ts:141,286`) are rewritten where the wave touches the
file; the gate (D1) counts tokens, so stale prose that still says
`requiresWizard` is either rewritten or allowlisted as prose — the build
rewrites.

### Facts the plan rests on, each opened

- **The two letting seats are seat-only at `execute()` already.**
  `packages/content/eternal-university/src/lib/HallController.ts`
  `mayProvision(actor)`: a holder of a position at
  `/world/terminus/eternal/duncan-hall/idea/college` (Katie's
  `hall-manager`) OR `CompactApi.isCommitteeMember(actor, HALL_EXTENT)`.
  `packages/content/terminus/src/lib/LettingController.ts` `mayLet` is the
  twin over `/world/terminus/mayfield-row/idea/agency` and the building's
  extent. Neither consults the wizard axis. The views' `requiresWizard`
  exists only so *"only an operator SEES the raw verb"*
  (`Katie.ts:43`); Katie's `dispatch` is `forceCommand`, which skips
  validators. Deleting the validator changes nothing at execute.
- **`isCommitteeMember` has the Art. XI backstop** —
  `CompactLogic.ts:176` `if (await isFounderImpl(player)) return true;` —
  so the **founder passes `mayLet`/`mayProvision` as a committee member**,
  wizard or not. The e2e `residences.spec.ts:229` (`lease founder`, as the
  founder) is therefore unaffected.
- **The committees are groups**: `duncan-hall` (eternal-university
  `pack.yaml:40`), `mayfield-holdings` (terminus `pack.yaml:58`).
- **`AccessApi.isAgentOf` has zero callers** (grep across server + packs):
  only `api/access.ts:173` forwards to `AccessLogic.ts:146`. Both packs'
  base controllers say in their header that the group-membership read was
  *"exactly the wrong question"*.
- **`practice` is the competence-staging tool of ~20 wire drives**
  (`cleanliness`, `ceramics-a/c`, `potash`, `assembly`, `repair`,
  `blood-economy`, `clinical-medicine`, `field-population`,
  `instrumentation`, … all `s.cmd('practice <discipline> hard success')`)
  and every one of those sessions is opened `wizard: true`. The
  `testharness` verb is the shipped shape for test-world scaffolding:
  `testOnly: true` on the view (`CommandLogic.ts:138` `admitsView` refuses
  it outside `SecurityApi.isTestEnvironment()`) plus
  `lib/command/validators/requiresTestWorld.ts`.
- **The command-running spell has no content.** `lib/magic/Effect.ts:268`
  `ScriptEffect`, `:288` in the union, `:305` in the kinds array, `:349`
  the `false` arm, `:640–645` the parser; `MagicLogic.ts:1310` dispatch
  → `:2135 execScript`. `grep -rn "kind: script"` over
  `packages/content` finds **no row**; magic.md:92 and :109 name it.
- **The wiki ladder** (`WikiRenderer.ceilingFor`): 3 = wizard, 2 =
  `canMutateZone(actor, namespaceZone)`, 1 = player, 0 = guest. The
  root `/wiki` is a parcel held by the `wiki-editors` group (platform
  `pack.yaml:46`; the group's owner role is *"moderators"*, `:23`), and a
  root zone row exists (`packages/content/platform/content/wiki.yaml`;
  `WikiRegistry.zoneFor` resolves a namespace's `WikiNamespaceZone` by
  `WikiPage.zonePathFor`). No shipped field is tagged `spoiler: 3`
  (only two tests).
- **The settings vocabulary is one 2,629-line object literal**,
  `packages/server/src/mud/lib/config/AppSettings.ts` `AppSettingKeys`
  (**629 keys**, not the 389 the requirements counted); values live in
  `packages/content/platform/content/settings/<prefix>.yaml`; the write
  surface is `AppApi.setSetting` (`api/app.ts:122`), reached by
  `ConfigController.set` and `ReserveController.set`.
- ⚠ **Three of the requirements' "eight keys" no longer exist.**
  `settings/banking.yaml` says so in its own text: *"No onboarding stipend
  (economic bootstrap D10): a newcomer ARRIVES on their Arrival Note —
  `treasury.arrivalPrincipal`"*; *"No opening float and no opening capital
  (economic bootstrap D9) … `lint:no-authored-faucet` refuses them"*. The
  living keys and their files:
  `banking.salesTaxRate` · `banking.localTaxShare` (its own comment:
  *"A dial the polity can move (governance tier C)"*) ·
  `banking.corpoRoyaltyRate` · `banking.withdrawalDailyCap` ·
  `banking.withdrawalDailyCapCircle` (`banking.yaml`);
  `retail.consignment.commissionRate` (`retail.yaml:15`);
  `treasury.arrivalPrincipal` · `treasury.openingAdvance` (`treasury.yaml`,
  which also says *"a `treasury set` is a seam, not a wave"*). See D10.
- **`reserve set <row> <value>` already exists and is Governor-gated**
  (`reserve.yaml` cmd, `ReserveController.ts:116`; refuses any row outside
  `reserve.` with `controller-rejected: not-a-reserve-row`) and writes
  `AppApi.setSetting` with **no record beyond the chat echo**.
  `treasury` (`TreasuryController.ts`) has `appropriate` only; both verbs
  are afforded on `AuthorMixin` (`lib/shell/Author.ts:159–165`), which
  every player composes (`ShelledCharacter.ts:42`).
- **The validators the seats already have**:
  `requiresFinanceMinister.ts` (`minister-of-finance`) and
  `requiresGovernor.ts` (`central-bank-governor`), verb-level on
  `treasury.yaml` / `reserve.yaml`. `OFFICE_APPARATUS`
  (`lib/governance/Office.ts:150–192`) has eight seats including both.
- **The record**: there is no "governance decisions" collection. The
  shipped append-only per-character ledger is the chronicle —
  `PersonaMixin.recordDeed(fields)` (`lib/character/Persona.ts:307`,
  `@Final @Unshadowable`, `kind: 'deed'`, game-time witnessed, readable by
  the `chronicle` verb). `reserve override` *"goes on the record"* as a
  ledger entry; a setting change is a deed of the officer (D11).
- **`canAtPath` ignores its action** (`AccessRegistry.ts:158–177`:
  `_action` unused; owner by `ParcelApi.ownerOf` longest prefix, member of
  the owner, or the venue-records carve-out). `TreeAction`
  (`api/access.ts:91`) is a closed union; `clone` is in it, `reload` is
  not. `/platform` is held by `/compact/executive` (the PM's seat), every
  `/world/<locality>` by its pack's group, `/trade/*` by `/compact/trade`.
- **`reload`'s target is a class/template path** (`ReloadController.ts:153`
  `classFileOf(model.target)`, or `--mql` → `getTemplatePath()` /
  `Template.path`), so `canAtPath(giver, 'reload', path)` is the same
  question `clone` asks (`CloneController.ts:163`). The sandbox refuses
  `HotReloadApi.reload` on its own (sandbox.md:277), independent of the
  axis.
- **The source-write gate is copied verbatim in four places** —
  `WriteController._gateSourceWrite`, `CmsLogic.gateSourceWrite`,
  `StudioLogic.gateSourceWrite`, `GitLogic.gateSourceWrite` (*"per D1:
  mirror, don't share"*) — plus the four shell file-op controllers. All
  eight ask `isWizard` AND `can(actor, 'write', resolveSourceFolderZone(path))`.
  The source-logical path space is `/<package>/...` under `packages/`
  (`GitLogic.toSourceLogical`), so it holds `.ts` AND every pack's
  content YAML.
- **The PM backstop is half-built.** `AccessRegistry.isArchwizard`
  (`:295–302`) is `archwizards ∪ holdsPrimeMinister`; `isWizard`
  (`:262–270`) is `wizards ∪ holdsPrimeMinister` — the PM is both, but
  **an archwizard who is not in `wizards` is not a wizard** today. D17
  closes that: `isWizard = wizards ∪ isArchwizard`. `holdsPrimeMinister`
  (`:328`) is `CompactApi.holdsOffice(subject, 'prime-minister')`, which
  is the founder by default (`office_holders` sparse row absent). The wire
  harness's founder (`boot.ts:81` sets `FOUNDER_GOOGLE_EMAIL`;
  `TestHooks.ts:93` mints `<handle>@e2e.local`) is therefore the PM, an
  archwizard and a wizard with no grant, and stays so under D17.
- **What a seat confers versus what every-group gave** (the harness
  question, grounded):
  - `canAtPath` → `subjectIsOwnerMember` (`AccessRegistry.ts:443–455`):
    a `group` owner is plain `GroupApi.isMember`; an `organization`
    owner is its staff or appointing authority (`subjectHoldsOrganization`,
    `:488`); **there is no seat backstop, and after D18 there is none
    anywhere** — `CompactLogic.isCommitteeMember` (`:176–178`) had the
    one (`isFounderImpl`, misreading the jury pool-of-one), and it is
    deleted. `canMutateZone` → `subjectHasOwnerRole` (`:462`) is the same
    shape with the `'owner'` role.
  - So the PM holds exactly what `/compact/executive` holds: the platform
    pack's roots (`/obj /cmd /domain /compact /studio /home /platform
    /blueprints`) and the **`/world` root** (`platform/pack.yaml:41`) —
    which **every locality's own claim beats** under nearest-parcel-wins.
  - Every-group gave membership of **26 groups holding ~50 parcels**:
    `terminus` (23 parcels), `duncan-hall` (4), `rejection` (3), `lounge`,
    `hinkley-hills`, `hearts-delight` (2 each), and one each for
    `wiki-editors`, `water`, `waponi-woo`, `transport`, `tpa`, `soul`,
    `residence`, `newbie-wilds`, `mayfield-holdings`, `hollow-mere`,
    `hearthworks`, `ground`, `fishing`, `energy`, `arcana` and the five
    corpo committees. Twelve of those groups are `owner: { office:
    prime-minister }` (the seat APPOINTS members; it is not one), five are
    the registrar's, the rest have no owner.
  - **Neither covers `/compact/trade`**: an organization holding 54
    titles (`/stuff*`, every `/trade/<x>`); only its staff and the
    Minister of Trade (founder default) hold them. That is why drive
    comments already say *"a founder `clone` is refused for any kind whose
    first live copy stands on ground the founder does not hold"*.
  - `/compact/executive` (`packages/content/platform/content/compact/executive.yaml`)
    is an `Organization` with two authored positions,
    `communications-director` and `press-secretary`; its staff hold what
    it holds (`subjectHoldsOrganization`), and `requiresPackInstaller`
    already reads that as *"the PM and her staff"*.
  - `eval` (`EvalController.ts:72–80`) runs against a parcel the giver
    holds (`holdsAuthority` — owner-kind dispatch, self-home by rule);
    `clone` against the kind's path. **26 of the 59 `wizard: true` files
    stage with `eval`/`clone`/`goto`/`destruct`/`write`** (23 use
    `--parcel`), **7 run `config` from a non-founder wizard session**
    (`cordage:189`, `fishing:427,429,534,538`, `maritime-space:173`,
    `paint:172`, `sugar.soak:438,439,473,481,649`, `routing:354`,
    `nutrition-fitness` uses the founder), and 13 of the 59 are `.soak.`
    files (the soak lane's).
- ⚠ **The wire harness's `wizard: true` joins EVERY managed group**
  (`backend/TestHooks.ts:163–207`: *"a test character needs authority
  wherever the thing under test lives"*), so a `wizard: true` session is a
  member of `duncan-hall`, `mayfield-holdings`, `wiki-editors`, … — i.e. a
  committee member everywhere. **The harness conflates the axis with every
  title**, and 59 files (`packages/wire/tests` + `e2e/tests`) stand on it.
  D13/D18/D20 unwind it. `parcels: [...]` (`TestHooks.#grantParcels`, a
  real `ParcelApi.transfer` — ⚠ which SELLS the parcel out from under the
  pack that claimed it, a `conflict` at its next reconcile) already stages
  title for a non-wizard, and is the wrong tool for fifty parcels a run.
- ⚠ **`office assign` cannot resolve an online player** — still open
  (`governance.md § Open`, `world-scan.dirty.wire.test.ts:388` warns and
  returns; `e2e/tests/helpers.ts:311` is marked INTERIM for it). The
  founder holds every seat by default, so drive step 8's cross-refusal
  (Governor refused the tax, Minister refused the cap) needs a character
  holding exactly one seat — a state nothing can stage today (D13).
- **The lint family is derived** (`scripts/lint-family.ts` runs every
  `lint:*` in `package.json`); the allowlist-file shape with a
  *list-only-shrinks* rule is shipped at `scripts/check-test-content.ts`
  + `scripts/test-content-allowlist.txt`, with a positive-fixture test
  (`scripts/__tests__/check-test-content.test.ts`: *"a NEW offender fails"*,
  *"a listed path that no longer offends is stale"*). `scripts/pack-roots.ts`
  is the shared reader of every pack's `src/`.
- **Sibling branches in flight** (`git diff --stat origin/master...`):
  `reqs/water-supply` adds 20 lines of keys to `AppSettings.ts`;
  `reqs/paper` adds 202 lines to `DocumentLogic.ts`. Whichever merges
  second reconciles; the tier record's `tsc` totality (D9) makes a missed
  key loud, not silent.
- **Tests that name the touched sites** (41 files, listed under Test &
  gate strategy) include `TemplateLogic.codeGate.test.ts` and
  `lib/stuff/__tests__/codeNamingDriftGuard.test.ts`, both of which exist
  only to defend the gate D5 deletes.

## ⭐⭐ New substrate

The slate predates the reuse-ledger convention, so the ledger was built by
search this cycle. **No new mixin, class, hook, registry, Api or document
kind.** Everything new is a method on an existing surface, a typed
constant beside the vocabulary it tags, a subcommand on a shipped verb, a
lint script, and a wire-harness option.

| new thing | kind | reuses / generalizes | searched |
|---|---|---|---|
| `AccessApi.sourceWriteRefusal(actor, sourceLogical)` → `AccessLogic` | one Api method | **generalizes the four verbatim `gateSourceWrite` mirrors + four shell-controller copies** into one predicate; the *"mirror, don't share"* decision was made when a shared home would have been a free helper — an Api method is the sanctioned home (CLAUDE.md § Module Categories) | every `isWizard` caller (the census above) |
| `TreeAction` gains `'reload'` | vocabulary entry | the closed union at `api/access.ts:91` (`clone` precedent) | `canAtPath` callers |
| `AppSettingTiers` + `SettingTier` | typed constant in `lib/config/AppSettings.ts` | sits beside `AppSettingKeys`, the single source of the keyspace (app-settings.md) | `AppSettingKeys` consumers (120 files read it; none enumerate it except `ConfigController.KNOWN_KEYS`) |
| `AppApi.tierOf(key)` · `AppApi.seatFor(key)` | two Api reads | `AppApi.setting`/`settings` (api/app.ts) | — |
| `treasury set <row> <value>` | subcommand | `reserve set` (`ReserveController.set`) is the twin; app-settings.md § Deferred names `treasury set` as the seam | `TreasuryController` |
| `lint:wizard-axis` (`scripts/check-wizard-axis.ts` + `scripts/wizard-axis-allowlist.txt`) | lint gate | `check-test-content.ts` + its allowlist (list-only-shrinks); `pack-roots.ts` for the pack walk | the lint roster |
| `requiresPrimeMinister` | validator | the third hand-written office twin after `requiresGovernor` / `requiresFinanceMinister` — governance.md § Deferred names the third copy as the signal to parameterize, which needs a schema change this build does not make (Deferred seams) | the validators dir |
| `offices: [...]` and `committees: [...]` on the test login; `wizard: true` re-meant | harness options | `parcels: [...]` (`TestHooks.#grantParcels`) is the shape — a grant written the way the verb would write it; the seams are `@TestOnly` (`lib/security/decorators.ts:275`); `committees:` writes the managed group's member row the `group` verb / the installer's enrolment writes | `TestAuthRoutes`, `session.ts`, e2e `helpers.ts` |

**Deleted substrate added this revision:** `CompactLogic.isCommitteeMember`'s
founder backstop (`:176–178`) — D18.
| `git publish --dry-run` | option | `GitLogic.publish`'s existing per-file split into `committedPaths`/`skippedPaths` | — |
| the chronicle deed for a Tier C change | a `recordDeed` call | `PersonaMixin.recordDeed` (chronicle.md) | provenance (`recordAuthoring` — authorship, wrong concept), accountability (harm), the ledger (money only) |

**Deleted substrate** (the build is mostly deletion): `AccessApi.isAgentOf`
+ `AccessLogic.isAgentOf`; `MagicLogic.execScript`, `ScriptEffect` and the
`'script'` kind; `TemplateLogic.enforceCodeFieldGate`;
`lib/stuff/CodeNamingFields.ts` and its drift guard;
`DocumentLogic.codeFieldsChanged` and the command-view code arm;
`WikiRegistry.satisfies`'s wizard rung; the four verbatim `gateSourceWrite`
copies; the `requiresWizard` lines on eleven views.

## Plan-level decisions

- **D1 — The four letting views lose `requiresWizard` and gain nothing.**
  The seat check is `HallController.mayProvision` / `LettingController.mayLet`
  at `execute()`, already seat-only and already fail-closed; a view-level
  twin would be the same predicate in two places (P5), and a kernel
  validator cannot name a content organization (a `validators:` entry is a
  bare path — governance.md § Deferred). Co-located players will SEE
  `provision` by Katie's desk and be refused with the seat named — which is
  the progression UI, not a leak. The refusal text names the seat:
  *"Only the college's staff or the hall's committee may let these rooms."*
- **D2 — One source-write predicate.** `AccessApi.sourceWriteRefusal(actor,
  sourceLogical): Promise<string | null>` on `AccessLogic` (null = allowed,
  else the reason, the contract every mirror already has). Inside: **if the
  path is a code file** (`.ts .tsx .mts .cts .js .mjs .cjs`) → `isWizard`
  AND slice title; **else** → slice title only
  (`can(actor, 'write', resolveSourceFolderZone(path))`). The eight copies
  call it. This is the **only** site in the tree that asks `isWizard` for a
  write.
- **D3 — The code-file test is the extension.** A `.ts` under
  `packages/content/<pack>/src/` is as much the axis as one under
  `packages/server/src`; a `.yaml`, `.md` or `.json` anywhere is content.
  No content sniffing.
- **D4 — `reload` and `typecheck` gate on title over the target path**, in
  the controller body (the gate is model-dependent — access.md § *Where the
  gate lives*): `AccessApi.canAtPath(giver, 'reload', path)` with `path` the
  resolved class/template path; a missing title refuses, naming the held
  extents (the `broadcast` precedent). `typecheck` takes the same gate:
  it is a verdict on a file a content developer is about to reload, not a
  source read. `--mql` targets use the live clone's `getTemplatePath()` /
  the Template's `path`.
- **D5 — The code-naming gates are deleted, not relaxed.**
  `TemplateLogic.enforceCodeFieldGate`, `CodeNamingFields`, the drift
  guard and `TemplateLogic.codeGate.test.ts` go; `DocumentLogic.saveImpl`'s
  command-view arm keeps `CommandApi.validateCommandView` and loses the
  wizard check and `codeFieldsChanged`. The title gates (`gateMutation`,
  `canAtPath(write-template)`) are untouched. What still bounds a row's
  `class:` is `lint:instanceable` (build time, author-independent) and what
  bounds `brain:` is the brain module category itself
  (`Behaved.ts:334` resolves `StuffApi.resolveExport(spec.brain, 'brain')` —
  only a brain module exports `brain`; `CmsLogic.validateBehaviorPaths`
  refuses an unresolvable one at save). See Risks for what this reverses.
- **D6 — Wiki level 3 keys on the encyclopedia's own root.**
  `ceilingFor`: 3 = `AccessApi.canMutateZone(actor, rootZone)` where
  `rootZone = zoneFor(<the /wiki root namespace>)` — the owner role on the
  wiki root, i.e. the `wiki-editors` moderators; 2 and 1 unchanged.
  `WikiRegistry.satisfies` drops the wizard rung; the ladder below decides.
  A wizard with no wiki title reads at 1 like any player.
- **D7 — `ScriptEffect` is deleted end to end** — interface, union member,
  kinds-array entry, the `false` arm, the parser case, the dispatch case,
  `execScript`, magic.md:92/:109. No content names it; the lint
  `check-spell-cost.ts` walks effect kinds — the build runs it.
- **D8 — `practice` becomes a test-world verb**, the `testharness` shape:
  the view moves to `platform/cmd/system/practice.yaml` with
  `testOnly: true` and `validators: [requiresTestWorld]` (no
  `requiresWizard`), the controller to `platform/idea/cmd/system/PracticeController.ts`
  (`controller:` path updated), `Author.ts`'s affordance path updated.
  The loader withholds it outside a test world (the AC *"absent from a
  production world"*), and the ~20 drives keep their `practice` lines
  unchanged. `testharness.yaml` loses its `requiresWizard` in the same
  commit (same reason: staging is not authoring).
- **D9 — The tier is a typed record beside the vocabulary, and `tsc` is
  the totality gate.**
  ```ts
  /** measurement.md's tiers; a C key names the seat that may set it. */
  export type SettingTier = 'B' | 'C:minister-of-finance' | 'C:central-bank-governor';
  export const AppSettingTiers: Readonly<Record<keyof typeof AppSettingKeys, SettingTier>> = { … };
  ```
  (There is no `OfficeKey` type — `Office.key` is a `string`, verified in
  `lib/governance/Office.ts:52` — so the two seats that hold dials are
  spelled out; a third seat is a one-line widening.) A key added to
  `AppSettingKeys` without a row here is a compile error
  (`Property 'x' is missing`) — it fails `pnpm build`, `test:near` and the
  wire typecheck, which is *"fails the build"* with no new script. A unit
  test in `lib/config/__tests__/AppSettings.test.ts` asserts the runtime
  object is total and every `C:` seat resolves through `Office.byKey`.
  629 `B` rows is the honest cost of *"classified deliberately rather than
  by silence"*; the build writes them by script, once.
- **D10 — The Tier C set, grounded (⚠ needs the owner's eye).** The
  requirements' eight were named against the 2026-09 keyspace; three are
  gone (Grounding). The plan tags:
  - `C:minister-of-finance` — `banking.salesTaxRate`,
    `banking.localTaxShare`, `banking.corpoRoyaltyRate`,
    `retail.consignment.commissionRate`, `treasury.arrivalPrincipal`
    (the stipend's successor — what the fisc advances a newcomer),
    `treasury.openingAdvance` (the float's successor — the fisc's 0% advance
    to a business; its file calls it *"a FLOAT, not capital"*, and it is a
    treasury facility, so it is fiscal, not monetary).
  - `C:central-bank-governor` — `banking.withdrawalDailyCap`,
    `banking.withdrawalDailyCapCircle`.
  - Everything else `B`, including the `reserve.*` Schedule rows (already
    Governor-set through `reserve set`; arguably *"the reserve's mandate"*
    and therefore C — left B because the requirements closed the list at
    the taxes, levies, grants and capital controls, and flagged below).
  `localTaxShare` is the ninth, added because its own comment already
  declares it tier C and leaving a self-declared C key at B would be the
  *"political decision by accident"* measurement.md warns about.
- **D11 — Tier C is set through the seat's verb and recorded as the
  officer's deed.** `reserve set <row> <value>` admits a `reserve.*` row OR
  a key whose `seatFor` is the Governor; `treasury set <row> <value>` (new)
  admits a key whose `seatFor` is the Minister of Finance. Each refuses any
  other key with `controller-rejected: wrong-seat` naming the seat and verb
  that may (*"`banking.withdrawalDailyCap` is the Governor's — `reserve
  set`"*). On success each calls `AppApi.setSetting` and then
  `officer.recordDeed({ text, tags: ['governance', 'tier-c', <key>], where })`
  — *"As Minister of Finance, set the sales tax (`banking.salesTaxRate`)
  to 0.1; it was 0.08."* — readable with `chronicle`. The
  `ConfigController.set` arm refuses any `C:` key with
  `controller-rejected: tier-c` naming the seat and its verb; reads and the
  listing are unchanged (the listing marks C keys with the seat).
- **D12 — `config` is the Prime Minister's (REVERSED 2026-11-05).**
  Setting an ordinary key is not authoring TypeScript. `config.yaml`
  drops `requiresWizard` and takes a new `requiresPrimeMinister` validator
  (`CompactApi.holdsOffice(giver, 'prime-minister')`, the
  `requiresGovernor` shape; refusal: *"you must hold the Prime Minister's
  office to `config` the world's settings"*). A seatless wizard is refused
  naming the PM; the founder (PM by default) is unchanged. No new office
  is minted. ⚠ This is the **third** hand-written office validator — the
  parameterization signal governance.md deferred is now met (Deferred
  seams).
- **D13 — The harness tells the truth (REVISED twice, 2026-11-05).**
  `wizard: true` on the test login joins **only** the `wizards` group —
  the axis and nothing else; the every-managed-group loop in
  `TestHooks.provisionCharacter` is deleted, not kept behind another
  flag, **under any name**. Authority comes from being seated exactly as
  a content author is — *"you get ownership over that content and are
  seated on a committee"* — through two options that write the same rows
  the verbs would (the `parcels` precedent — *a grant, not a bypass*):
  - `committees: ['/world/terminus', '/corpo/goodkin:owner', …]` — each
    entry an EXTENT; the seam resolves the committee over it
    (`CompactApi.committeeOf`, the same lookup the verbs make) and adds
    the character to that managed group as `member` (or `owner` with the
    `:owner` suffix — the role `canMutateZone` needs). An extent whose
    committee is an organization (the executive, `/compact/trade`, a
    business) is refused at the route with the office or chart that
    seats it named: an organization's title is held by its staff and its
    appointing authority, and a test character gets that through
    `offices:` (the Minister of Trade for `/compact/trade`'s 54 titles,
    the PM for the platform's) — or does without.
  - `offices: ['prime-minister' | 'minister-of-trade' | 'minister-of-finance' | …]`
    seats the minted character through a `@TestOnly` seam on
    `OfficeRegistry` (`assignForTest`; needed while `office assign`
    cannot bind an online player — the drive still TRIES the verb first
    and logs the outcome). ⚠ One holder per office: a drive seats one
    session per seat.
  Both options are validated at the route (an unknown office, an extent
  nothing covers, or an organization-held extent is a 400 naming it).
  There is **no `staff:` option** — it existed only for the rejected
  backstop.
- **D14 — Reading is open (REVERSED 2026-11-05).** No read asks for the
  wizard: `GitLogic.status/diff/log` and `CmsLogic.gateRead('source')`
  admit any signed-in avatar (a null actor still fails closed; the CMS
  source backend is already sandboxed to the mud root by `sourceAbs`, so
  no secret is reachable); `DiagnosticLogic.list` drops the compile-rows
  wizard arm (compile diagnostics are a read of source) and **keeps** the
  per-path arm beside it — a row under an extent you hold or a pack you
  maintain — because that arm protects authorship, not code trust.
  Two sites in the "reads" list are not reads and keep a gate for a
  reason other than code trust, stated: `DiagnosticLogic.clear` DELETES
  rows → its wizard arm becomes title over the path
  (`canAtPath(subject, 'write-document', path)`), the author-of-path arm
  stays; `errors raw` is D19. The verb-level `requiresWizard` on
  `git.yaml`, `cms.yaml`, `studio.yaml` comes off. The client's
  `response.isWizard` stays — it means *offer the authoring panes*, which
  is the axis.
- **D15 — `isAgentOf` is deleted**, not re-decided: zero callers.
- **D16 — The drive never pushes.** `git publish` commits to and pushes
  the server's real checkout; the drive proves the gate through
  `git publish --dry-run` (new: reports `committedPaths`/`skippedPaths`
  without staging, committing or pushing) and the unit tests prove the
  commit path. The drive file is `.dirty.` because step 4 writes a real
  `.ts` into the source tree (and removes it).
- **D17 — PM ⇒ archwizard ⇒ wizard, derived.** `AccessRegistry.isWizard`
  becomes `wizards ∪ isArchwizard`; `isArchwizard` stays
  `archwizards ∪ holdsPrimeMinister` (already shipped). The only behavior
  change in production: an archwizard who was never added to `wizards`
  can now author (before, it could confer the axis it did not hold). The
  founder default is untouched (founder = PM = both). `requiresArchwizard`
  on `wizard grant/revoke` is untouched — the PM already passed it. This is
  the allowlist's `definition` row changing shape, not a new axis site;
  `AccessLogic`/`access.ts` forwarders are unchanged. access.md § *The
  Prime Minister backstop* gains the sentence.
- **D18 — No title backstop for anyone; the founder committee backstop
  is DELETED (owner, 2026-11-05).** The executive backstop the previous
  revision proposed is **rejected entirely** — *"giving anyone root even
  the PM sounds like something we need to talk about … I'd rather punching
  holes like that be temporary and regulated even for the PM"*; and *"no
  one should 'sit on every committee' not even the founder. there are
  certain offices we've said are platform level and need to be seated in
  order for the game to function, and those get seated by the founder by
  default until they're otherwise filled. that does not mean the founder
  is on every committee -- ever."* So: `subjectIsOwnerMember` /
  `subjectHasOwnerRole` are **unchanged**; the founder default for the
  platform OFFICES (`holdsOffice`, the sparse `office_holders` row) is
  **unchanged**; and the shipped `if (await isFounderImpl(player)) return
  true;` in `CompactLogic.isCommitteeMember` (`:176–178`) is **deleted** —
  its comment reads Art. XI's pool-of-one, which is the JURY rule
  (`draft-constitution.md:305`, `compact-political-science.md:244`), as a
  committee rule. A committee's membership is its group, or an
  organization's chart, and nothing else. The regulated form of the hole
  the backstop pretended to be — the **executive warrant**: one named
  extent, a stated reason, an expiry, on the record, the committee told,
  revocable by the legislature or the courts — leaves as
  [executive-warrant-slate](../slates/builds/executive-warrant-slate.md),
  built on the agency slate's grant. **Dependents of the deleted backstop,
  each re-seated honestly:** listed under Test & gate strategy.
- **D19 — `errors raw` is the Prime Minister's (DECIDED by the owner,
  2026-11-05: *"errors raw can stay PM, it's other people's data"*).** The
  console ring is the box's stdout, not source: it carries other players'
  command lines and errors naming them. The gate moves from the wizard to
  the seat (`holdsOffice(actor, 'prime-minister')` in
  `ErrorsController.raw`, the reason `pm-only`) — the one read that keeps
  a gate, for a reason other than code trust.
- **D20 — The harness migration is its own wave (W5), and each file
  names its committees.** 59 files set `wizard: true` meaning *every
  group*; after D13 it means the axis. Every session that stages names
  the committees it needs (`committees: [<extent>…]`) — read off the file
  itself: its `startLocation`s, its `eval --parcel` arguments, its
  `goto`/`write -c`/`destruct` targets, the organizations it `appoint`s
  at. The founder session keeps the platform offices by default and is
  seated on **no** committee: where a file had the founder act inside a
  locality's extent, the founder session gets `committees:` too. The
  seven files whose non-founder wizard runs `config` move that line to
  the founder (D12). Sized under W5.

## ⭐⭐ Host placement

| new field / method | host | what composing it claims |
|---|---|---|
| `AppSettingTiers` | `lib/config/AppSettings.ts` (a `const` beside `AppSettingKeys`, not a Document field) | nothing about any host — it is vocabulary metadata; the Document's `persistentFields = ['values']` is untouched |
| `tierOf` / `seatFor` | `AppApi` → `AppLogic` | the settings surface knows the tier; no object gains a field |
| `sourceWriteRefusal` | `AccessApi` → `AccessLogic` | the access face owns *may this person write this path* — the same face that owns `canAtPath`; no controller decides it twice |
| `treasury set` | `TreasuryController` (the Minister's verb) | the verb that spends also tunes the fisc's dials — app-settings.md § Deferred's own argument |
| the Tier C deed | the officer's `PersonaMixin` (`recordDeed`) | **every player** composes Persona; a deed is a thing a character did — true of every host; nothing is claimed for NPCs (an NPC never holds an office) |
| `'reload'` | `TreeAction` | a title action; nothing hosts it |
| `requiresPrimeMinister` | `lib/command/validators/` | a verb-level, giver-only check — the sanctioned home (access.md § *Where the gate lives*) |
| `wizard: true` (axis only) · `offices` · `committees` | `TestHooks` / `TestAuthRoutes` / wire `session.ts` / e2e `helpers.ts` | test-mode only (`#assertTestMode`); no production predicate changes for the harness |

No mixin is added and no class is widened, so the two P2 tests (a guard
that re-narrows; an honest "no" on most hosts) have nothing to catch.

## Convention conformance

- `props:`/`cast:` — n/a, no rows minted. Locations-not-rooms — n/a.
- Paths: the moved view is `<root>/cmd/system/practice`, its controller
  `<root>/idea/cmd/system/PracticeController` (the `cmd` dir is views unless
  its parent is `idea`). The lint script and allowlist live in
  `packages/server/scripts/` like every gate.
- Module scope declares: the allowlist script is a `tsx` script, not
  mudlib; the validators keep the split-declaration shape; nothing new at
  module scope under `src/mud/**`.
- Import boundary: `AccessLogic` already imports `ParcelApi`/`GroupApi`;
  the new predicate needs `AccessApi.resolveSourceFolderZone` (same
  class). No `fs` in the mudlib — the extension test is a string test.
- Verbs on objects: `officer.recordDeed(...)` is a method on the person;
  `AppApi.setSetting` is orchestration (a Document, not Stuff);
  `sourceWriteRefusal(actor, path)` takes a person as its first argument —
  ⚠ `lint:object-verbs` counts Api statics whose first parameter is a
  world object; `AccessApi.can(subject, …)`, `canAtPath(subject, …)` and
  `isWizard(subject)` already pass that gate (the access face is the
  exemplar of a predicate ABOUT a subject rather than a verb ON it); the
  build confirms the ceiling does not move.
- No new module category, no free helper, no new `eslint-disable`.
- **P3 refuse/skip/throw:** every door refuses with a reason naming the
  seat or the held extents; `AppApi.tierOf` of an unknown key returns `'B'`
  (the open namespace is a documented feature) and `seatFor` returns
  `null`; the `SettingTier` union cannot name a seat that is not one of
  the two, and the unit test asserts each resolves through `Office.byKey`
  (no module-scope statement — the vocabulary declares, the test checks).
- **P4 no duck typing:** the packs' controllers import kernel Apis by
  specifier; nothing new crosses a pack boundary.
- **P5 the mixin decides, the controller is dumb:** the seat decision for
  letting is in the pack `lib/` base (one place); the tier decision is
  `AppApi.seatFor` (one place) consulted by three controllers that only
  render the answer.
- **P6 persistence per content:** `app_settings` is already live-persisted
  (`keep` on reset); the deed is a `chronicles` row (live, per character);
  the staged office row is `office_holders`. Nothing new persists.
- **P7 load on use:** `AppSettingTiers` is a module constant read on the
  write path; `OFFICE_APPARATUS` is a code constant; no boot entry, no
  roster.
- **P8 names:** `SettingTier` values are measurement.md's own letters;
  `sourceWriteRefusal` says what it returns; `wrong-seat` / `tier-c` are the
  envelope reasons.

**Lint gates this build must pass:** the whole family
(`pnpm -C packages/server lint:family`), and specifically
`lint:instanceable` (the controller move), `lint:module-scope`,
`lint:imports`, `lint:object-verbs` (ceiling unchanged),
`lint:closed-vocabularies` (⚠ `SettingTier` is a new closed vocabulary —
if the gate counts it, add it to the gate's declared set citing
measurement.md § Tiers; **no ceiling rise**), `lint:eval-surface`,
`lint:lib-statics` (no new static on a `lib/` class — `AppSettingTiers` is a
const), `lint:spell-cost` (the kinds array shrank), `lint:verb-collisions`
(the `set` subcommand), `lint:schema` (no collection change), the new
`lint:wizard-axis`, and the client/server `tsc`.

## Waves

Each wave ends at one commit, lands independently, and leaves
`lint:family` + `test:near` + the touched packs' vitest green.

### W0 — `lint:wizard-axis`: today's sites, verbatim, as the ceiling

Goal: the list becomes visible and a new site fails CI, before anything
changes behavior (census, then ratchet).

- `packages/server/scripts/check-wizard-axis.ts` — walks
  `packages/server/src/**` (non-test) and, via `pack-roots.ts` extended
  with a content walk, every pack's `src/**` and `content/**`. Counts, per
  file, the tokens `AccessApi.isWizard(`, `.isWizard(` (the logic/registry
  self-calls), `requiresWizard`, `isArchwizard(`, `requiresArchwizard`,
  in code AND prose (a classifier that reads the thing: a comment that
  says `requiresWizard` is counted and listed as `prose` so the sweep
  rewrites it rather than carrying it). Output per file: count.
- `packages/server/scripts/wizard-axis-allowlist.txt` — one line per
  file: `<repo-relative path>  <count>  <reason>`, reasons from a closed
  set: `axis` (authoring TS) · `subject` (conferral) · `definition` ·
  `ux` (the client's authoring-panes flag, `AuthRoutes`) · `prose` ·
  `sweep` (a site W1–W3 will remove). **The list only shrinks**: a file not listed → error; a listed
  file whose count rose → error; a listed file whose count fell or that
  no longer exists → *stale*, also an error (the `check-test-content`
  rule, so a deletion is recorded).
- `scripts/__tests__/check-wizard-axis.test.ts` — the positive fixtures:
  a new site fails; a rise fails; a stale line fails; the shipped tree
  passes. (A gate never seen to fail is not a gate — lint-family.md.)
- `package.json` `"lint:wizard-axis"`; `lint:family --list` shows it
  with no list edited. `docs/lint-family.md` gains its row.

Acceptance: the gate runs in `lint:family`, the allowlist equals the
census table above, and reverting one real deletion (W1's) makes it fire.
Commit: `build(wizard-axis W0): lint:wizard-axis — the census as a ceiling`.

### W1 — The deletions: the seats, the spell, the harness verb

Implements D1, D7, D8, D15.

- Delete `requiresWizard` from
  `packages/content/eternal-university/content/world/terminus/eternal/duncan-hall/cmd/provision.yaml`,
  `unprovision.yaml`,
  `packages/content/terminus/content/world/terminus/mayfield-row/cmd/lease.yaml`,
  `unlease.yaml`; rewrite the help lines (*"or an operator"* → the seat);
  the refusal in `ProvisionController`/`UnprovisionController`/
  `LeaseController`/`UnleaseController` names the seat (D1); rewrite the
  headers of those four and `Katie.ts:43`, `Walter.ts:17`.
- Delete `AccessApi.isAgentOf` (`api/access.ts:173`) and
  `AccessLogic.isAgentOf` (`AccessLogic.ts:146`); the `ParcelOwner` import
  if orphaned; its cases in `api/__tests__/access.test.ts` /
  `platform/__tests__/AccessRegistry.test.ts`.
- Delete the script effect (D7): `lib/magic/Effect.ts` five sites,
  `MagicLogic.ts:1310` + `execScript`, magic.md rows; run `lint:spell-cost`.
- Move `practice` (D8): `git mv` the view to
  `packages/content/platform/content/platform/cmd/system/practice.yaml`
  (`testOnly: true`, `validators: [requiresTestWorld]`, `controller:
  /platform/idea/cmd/system/PracticeController`, help rewritten as a
  test-world harness), `git mv` the controller to
  `platform/idea/cmd/system/PracticeController.ts`, update
  `lib/shell/Author.ts` (the affordance path — ⚠ *a row's
  `commandContributions` is a static on a class; a wrong path is DEAD
  SILENTLY*), delete `requiresWizard` from `testharness.yaml`. Verify with
  one wire run of `instrumentation.dirty.wire.test.ts` (uses `practice`).
- Shrink the allowlist (the `sweep` rows for these files go).
- Doc: access.md § *Verb-controller gates* rows; advancement.md's mention
  of the harness; `help practice` text.

Acceptance: `KatieProvisioning.test.ts`, `DormResidence.test.ts`,
`SeznickHouse.test.ts` green with their `requiresWizard` prose rewritten
and one new case each — *a wizard who holds no position and sits on no
committee is refused with the seat named*; `MagicLogic` tests green with
`'script'` gone; `instrumentation.dirty.wire` green.
Commit: `build(wizard-axis W1): the seats are exercised; the spell and
the harness verb leave production`.

### W2 — The code doors: one predicate, title everywhere else

Implements D2, D3, D4, D5, D6, D14.

- `AccessApi.sourceWriteRefusal` → `AccessLogic` (D2/D3), with its unit
  test (a `.ts` refuses a non-wizard with title; a `.yaml` admits a
  non-wizard with title; both refuse a wizard without title; `.js`/`.mjs`
  count as code).
- Fold the eight copies: `WriteController._gateSourceWrite`,
  `RmController:118`, `MvController:98`, `CpController:103`,
  `MkdirController:70`, `CmsLogic.gateSourceWrite`,
  `StudioLogic.gateSourceWrite` + the scaffold draft arm (`:942` → *a
  refused target yields the draft path*), `GitLogic.gateSourceWrite`;
  `GitLogic.publish`/`revert` drop their leading `isWizard` (the per-file
  loop decides; `publish` reports what it skipped, as today). **Reads open
  (D14):** `GitLogic.status/diff/log` and `CmsLogic.gateRead('source')`
  drop `isWizard` and keep only the null-actor fail-closed;
  `DiagnosticLogic.list` drops its compile-rows wizard arm (the per-path
  arm stays); `DiagnosticLogic.clear`'s wizard arm → `canAtPath(subject,
  'write-document', path)`; `ErrorsController.raw` → the PM (D19). Remove
  the verb-level `requiresWizard` from `git.yaml`, `cms.yaml`,
  `studio.yaml`; rewrite their help (*"Wizard-only — it version-controls
  engine TypeScript"* → *publishing a `.ts` asks for the wizard; reading
  and publishing content ask for title*).
- `reload`/`typecheck` (D4): remove `requiresWizard` from both views; in
  `ReloadController.execute` (and `TypecheckController`, which shares
  `resolveTarget`) gate `AccessApi.canAtPath(giver, 'reload', path)` on
  the resolved class/template path; add `'reload'` to `TreeAction`; the
  refusal lists `heldExtents(giver)`.
- Delete the code-naming gates (D5): `TemplateLogic.enforceCodeFieldGate`
  and its call at `:109`; `lib/stuff/CodeNamingFields.ts`;
  `lib/stuff/__tests__/codeNamingDriftGuard.test.ts`;
  `api/__tests__/TemplateLogic.codeGate.test.ts`; `DocumentLogic.codeFieldsChanged`
  (`:493`) and the arm at `:604–614`; the corresponding cases in
  `DocumentLogic.commandView.test.ts` become *a title holder changes a
  view's `controller:`; a non-holder is refused*. ⚠ B4: grep
  `packages/content` for `CodeNamingFields`/`codeFieldsChanged` — none
  expected.
- Wiki (D6): `WikiRenderer.ceilingFor` level 3 → owner role on the root
  zone; `WikiRegistry.satisfies` drops the wizard rung. Tests in
  `platform/__tests__/WikiRenderer*.test.ts`, `WikiRegistry*.test.ts`,
  `cmd/system/__tests__/WikiController*.test.ts` that stub `isWizard` →
  stub `canMutateZone` on the root.
- Prose sweep: `AccessRegistry.ts:252–260`, `requiresWizard.ts` header,
  `EvalController.ts:63`, `ReloadController.ts:92`, `WriteController.ts:141,286`,
  `PackLogic.ts:961`, `schema/content.yaml:18`, `edit.yaml:16`,
  `wizard.yaml:8,35`; `CLAUDE.md`'s *"and the `class`/`behaviors[].brain`
  content-template fields"* clause (this is the one CLAUDE.md line the
  build edits — leave the index lines to the sweep); access.md § *The
  code-trust lockdown* and § *Verb-controller gates*; `hot-reload.md`,
  `cms.md`, `studio.md`, `git-workflow.md`, `shell-author.md`,
  `document-store.md`, `templates.md`, `wiki.md § The capability ladder`.
- Apply D17 in `AccessRegistry.isWizard` (`wizards ∪ isArchwizard`) with
  its unit case in `platform/__tests__/AccessRegistry.test.ts` (an
  archwizard not in `wizards` is a wizard; a PM is both; a plain wizard is
  neither archwizard nor seated).
- Shrink the allowlist to: `eval.yaml` (axis), `wizard.yaml` (subject),
  the definitions (`access.ts`, `AccessLogic.ts`, `AccessRegistry.ts`, the
  two validators), `AccessLogic` (the one write predicate), `AuthRoutes`
  (ux), and the prose rows that remain. No `config`, no reads.

Acceptance: `GitLogic.test.ts`, `StudioLogic.test.ts`, `cms.test.ts`,
`CmsRoutes.test.ts`, `release-transport.test.ts`,
`TemplateLogic.transitiveClosure.test.ts` green; `typecheck.wire.test.ts`
green with its step at `:124` re-expected (a non-holder is refused on
title, not on the axis); `lint:wizard-axis` passes on the shrunken list.
Commit: `build(wizard-axis W2): the axis is authoring TypeScript — one
predicate; everything else is title`.

### W3 — The tiers: tagged, total, routed to the seats, recorded

Implements D9, D10, D11, D12.

- `lib/config/AppSettings.ts`: `SettingTier`, `AppSettingTiers` (every
  key; the C rows of D10); `lib/config/__tests__/AppSettings.test.ts`
  totality + seat validity.
- `AppApi.tierOf` / `seatFor` (→ `AppLogic`).
- `config` is the PM's (D12): `lib/command/validators/requiresPrimeMinister.ts`
  (the `requiresGovernor` shape, with its `__tests__` twin of
  `requiresGovernor.test.ts`); `config.yaml` swaps `requiresWizard` for it
  and its help says *the Prime Minister's knob board*; `Author.ts`'s
  comment block on `config` (`:127–135`) rewritten.
- `ConfigController`: `set` refuses a `C:` key (`controller-rejected:
  tier-c`, naming seat + verb); `list` marks C keys with the seat;
  `ConfigController.test.ts` gains both cases plus *a seatless wizard is
  refused naming the PM*.
- `ReserveController.set`: admits `reserve.*` OR `seatFor(row) ===
  'central-bank-governor'`; refuses otherwise with `wrong-seat` (the
  `not-a-reserve-row` reason is retired — `economic-bootstrap.dirty:259`
  re-expected); records the deed (D11).
- `TreasuryController`: `set` subcommand (`treasury.yaml` subcommands +
  help), admits `seatFor(row) === 'minister-of-finance'`, refuses
  otherwise with `wrong-seat`, records the deed. The verb-level
  `requiresFinanceMinister` already gates it.
- `sugar.soak.dirty.wire.test.ts:438,473,649` `config treasury.openingAdvance`
  → `treasury set …` (a finding; the soak lane will run it after merge).
- Docs: app-settings.md (the tier model, the two writers, `treasury set`
  leaves § Deferred), governance.md § *Three more seats*, banking.md's
  *"inert, not governed"* sentence on the sales tax (it is governed now),
  measurement.md § Tier C gains the sentence *"the eight keys are tagged
  in `AppSettingTiers`"*.

Acceptance: `tsc` fails when a key is added without a tier (prove it once
by reverting one row); unit tests above; `economic-bootstrap.dirty.wire`
green.
Commit: `build(wizard-axis W3): every key carries a tier; Tier C belongs
to a seat and lands in the chronicle`.

### W4 — The harness options and the drive

Implements D13, D16; writes and runs the blocking drive.

- `TestHooks.provisionCharacter` (D13): `wizard: true` joins **only**
  `wizards` — the every-`Group.find({})` loop is deleted and the header
  comment rewritten; `offices: readonly string[]` →
  `OfficeRegistry.assignForTest` (`@TestOnly`, `#assertTestMode`, each
  key checked by `Office.byKey`); `committees: readonly string[]` →
  `TestHooks.#seatOnCommittees`: for each `<extent>[:owner]`,
  `CompactApi.committeeOf(extent)` → a `group` kind → `Group.addMember`
  with the role + `provider.fireChange` (the write the installer's
  enrolment and the `group` verb make); an `organization` kind or an
  uncovered extent → the login fails naming the office/chart that seats
  it (the `#grantParcels` *"name that"* precedent). `TestAuthRoutes` body
  parsing + 400s; `packages/wire/src/harness/session.ts`
  `SessionOptions`; `e2e/tests/helpers.ts` `mintSession` (its `wizard`
  doc comment already says *"the code-trust axis"* — now true).
- Delete the founder committee backstop (D18): `CompactLogic.ts:176–178`
  and its comment; `CompactLogic.test.ts:180` (*"the founder backstop"*)
  becomes *the founder, seated on no committee, is not a member*; the
  `cold-box-walk.test.ts` header (`:5–7`) and its AC 27 step re-seat the
  founder on the committee the self-appointment needs (honestly — a group
  row) instead of passing by credential. Prose: `access.md:725–727`
  (*"or the founder via the Art. XI pool-of-one backstop"*),
  `employment.md:167` (the `committee` row's *"founder passes? yes"* →
  **no**), `governance.md § The founder default` gains one sentence
  (*the default seats the platform OFFICES; it seats the founder on no
  committee*). The slate `executive-warrant-slate.md` is the forward
  pointer, already written.
- `GitLogic.publish(message, { dryRun })` + `git publish --dry-run`
  (`git.yaml` option, `GitController`).
- `packages/wire/tests/wizard-axis.dirty.wire.test.ts` — the drive
  (steps and paces under Test & gate strategy), the record appended to
  this plan.
- `docs/testing.md` gains the two options beside `parcels`.

Acceptance: the drive 15/15; every checkpoint made to fail once (B2).
Commit: `drive(wizard-axis): the blocking drive, 15/15`.

### W5 — The harness migration: 59 files stop standing on every-group

Implements D20. Its own wave because its proof is a drive run per file,
and that is the build's wall time, not its diff.

**The size, honestly — it grew.** 59 files (46 in the blocking lanes
`wire` / `wire:dirty`, 13 `.soak.` for the soak lane; 6 of the 59 are
`e2e/tests` specs). There is no mechanical edit: **each file has to be
READ to learn which committees each of its sessions needs**, and the
proof is running the file. The previous revision's one-option edit was
only possible because the executive backstop made one seat the realm;
without it a session is seated on exactly the committees a content
author would be. Per file:

1. **Inventory the file's extents**: every `startLocation`, every
   `eval --parcel <X>` (23 files), every `clone` (28 — by the founder, who
   holds `/compact/trade` as Minister of Trade by default, or refused
   today already), `goto`/`teleport` (7), `write -c` (1), `destruct` (2),
   `broadcast --at` (3), `title` (21), `pack` (12 — PM + staff, the
   founder), and every `appoint … at <org>` (7 files) with that
   organization's `appointingAuthority`. Map each extent to its committee
   (`terminus` holds 23 parcels — most drives need only
   `committees: ['/world/terminus']`; `hearts-delight`, `rejection`,
   `hinkley-hills`, `duncan-hall`, `/corpo/goodkin` are the others that
   recur).
2. Every `Session.open(…, { wizard: true })` / `mintSession({ wizard: true })`
   whose session **stages** gains `committees: [<its extents>]`; it keeps
   `wizard: true` only if it `eval`s (the axis). A session that only
   **plays** loses the option — a plain player is the honest body.
3. **The founder session is seated on no committee by default now
   (D18).** Where the founder acted inside a locality — `eval --parcel
   /world/terminus/…`, `appoint` at an organization whose authority is a
   committee (`economic-bootstrap:231–232` at the counting houses, whose
   authority is `/corpo/goodkin`'s committee), `lease`/`provision` — the
   founder session gets `committees:` too, or the act moves to a seated
   session. ⚠ The founder keeps `offices` by default (PM, the Ministers,
   the Governor): `clone` of trade kinds, `config`, `pack`, `treasury`,
   `reserve` are unaffected.
4. The **7 files whose non-founder wizard runs `config`**
   (`cordage.dirty:189`, `fishing.dirty:427,429,534,538`,
   `maritime-space.dirty:173`, `paint.dirty:172`, `routing:354`,
   `sugar.soak.dirty:438,439,473,481,649`) move that line to the founder
   (PM by default) or to a session opened `offices: ['prime-minister']`
   when the founder is not in the file. One PM per world.
5. `e2e/tests/helpers.ts`: `openWorldAsFounder` gains an optional
   `committees` passthrough; its INTERIM note about `seatAsGovernor` gets
   the `offices:` option it was waiting for; `residences.spec.ts:229` seats
   the founder on `/world/terminus/mayfield-row/seznick-house`.
6. Run the file. A failure is a finding: an extent the inventory missed
   (add it), a role the act needs (`:owner`), or a seat the file never
   honestly had — then the file is wrong, not the harness, and the fix
   is in the file.

Estimate: ~46 file reads at 10–30 minutes each plus one run each
(1–6 minutes in a standing world, longer for the drives that jump the
clock) — **the largest wave of the build by wall time, comparable to
W0–W4 together**; the 13 soak files are **read, edited, typechecked and
named for the soak lane** — never run before merge (§ *No merge waits on
the clock*). The build may land W5 as several commits (by pack or by
lane) rather than one.

Acceptance: `grep -rn 'wizard: true' packages/wire/tests e2e/tests` finds
only sessions that author; every staging session names its committees;
`pnpm wire:dirty` green; the soak files typecheck
(`pnpm -C packages/wire typecheck`).
Commit: `build(wizard-axis W5): the harness confers the axis; authority is
a seat — 59 drives migrated`.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| a seat lets a room | `provision`/`lease` (existing) | Katie's / Walter's `commandContributions` (existing) | the college / agency rows + the committee groups (existing) | `StuffApi.singleton(COLLEGE_PATH)` at the act (existing) | `player` arg `requires: class:Agent` (existing; unchanged) |
| `reload` on title | `reload`/`typecheck` | `AuthorMixin` (every player) | the parcel tree (existing) | `ParcelApi.ownerOf` at the act | none new; the refusal is in the controller |
| `treasury set` | new subcommand on `treasury` | `AuthorMixin` affords `treasury.yaml` (existing) | `AppSettingTiers` (module const) | read on the write path | `row`/`value` required strings (the `reserve set` shape) |
| `reserve set` on C keys | existing | existing | `AppSettingTiers` | same | existing |
| the deed | `chronicle` (existing) reads it | — | `chronicles` row | owner-scoped find | — |
| `practice` in a test world | `practice` | `AuthorMixin` — ⚠ the path in `Author.ts` MUST change with the move or the verb is dead silently | — | `admitsView` | `discipline` required |
| the gate | `pnpm lint:wizard-axis` | `lint:family` derives it | the allowlist file | — | — |
| `config` as the PM | `config` (existing) | `AuthorMixin` (every player) | `office_holders` (sparse; founder default) | `holdsOffice` at the act | `requiresPrimeMinister` (verb-level) |
| open reads | `git status/diff/log`, the CMS source browse, `errors` (compile rows) | `AuthorMixin` affords `git.yaml`/`errors.yaml`; the CMS launcher | — | — | none — a null actor fails closed |
| the harness options | `/auth/test-login` body | wire `Session.open` / e2e `mintSession` | `office_holders` · the managed group's member row | `committeeOf(extent)` at login | `offices[]` checked by `Office.byKey`; `committees[]` must resolve to a group-held committee (an organization-held or uncovered extent is a 400 naming the office or chart that seats it) |

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| a seat holder can do the act; a wizard without the seat cannot | W1 (+ W4 drive 1–3) |
| the sales tax from `config` is refused and says where it belongs; from the office it works and lands in the record | W3 (+ drive 7–8) |
| every physics setting behaves as before, and is set by the Prime Minister rather than by a wizard | W3 (`B` rows change nothing; `requiresPrimeMinister`; drive 6, 6b) |
| a wizard with no seat can author TypeScript and read anything, and can do nothing that needs authority; the PM is a wizard and an archwizard without being granted either | W2 (D14, D17; drive 2, 4, 4b, 5, 6b) + W4 (D13 — the harness can open one) |
| the command-running spell appears in no listing | W1 (drive 9) |
| the transcript-fabricating verb is absent from a production world | W1 (`testOnly`; drive 11 runs the loader's admission check through `help practice` in the wire world, and the unit test asserts `admitsView` is false outside a test world) |
| a wizard reading spoiler-tagged material sees what a non-wizard sees | W2 (drive 10) |
| title + no wizardness edits, reloads and commits content; only TS asks for the wizard | W2 (drive 4–5) |
| a new wizard-axis site fails the build until listed | W0 |
| a settings key without a tier fails the build | W3 (`tsc`) |

Nothing unmapped.

## Test & gate strategy

**Unit** (near the change): the predicate (W2); each folded site's
existing test re-expected; `AppSettings` totality + seat validity;
`ConfigController` tier-c refusal; `ReserveController`/`TreasuryController`
seat admission, `wrong-seat` refusal, and the deed written;
`WikiRenderer.ceilingFor` with the root zone; `admitsView(practice)` outside
a test world is false; the lint's positive fixtures. The 41 test files
that name a touched site (`grep -rlE 'isAgentOf|enforceCodeFieldGate|codeGate|codeFieldsChanged|execScript|ceilingFor|requiresWizard|isWizard' --include='*.test.ts'`)
are each opened and re-expected or deleted; `wizardRenameCoverage.test.ts`
is untouched (it guards the `developers` rename).

**The drive** — `packages/wire/tests/wizard-axis.dirty.wire.test.ts`,
run once at code-complete alongside review and once at `/finalize`;
**no span step, no soak twin**. Sessions: `katie`-side acts are driven by
the Katie dialogue (`talk katie` → the move-in branch, which `dispatch`es
`provision`); the wizard-with-no-seat is `Session.open(h, { wizard: true })` (the axis
only, after D13);
the title-holding non-wizard is `Session.open(h, { parcels: ['/world/terminus/eternal/duncan-hall'] })`;
the Minister and the Governor are two non-founder sessions opened with
`offices: ['minister-of-finance']` / `offices: ['central-bank-governor']`
(after a probe `office assign` as the founder, whose outcome is logged).

| step | what | pace | assertion |
|---|---|---|---|
| 1 | a new player talks to Katie and is moved in (the seat, exercised, not bypassed) | instant | `status: ok`, the unit's door reachable (`look` names the unit) |
| 2 | a seatless wizard runs `provision <player>` by Katie's desk | instant | `controller-rejected: not-authorized`, prose names the college's staff or the committee |
| 3 | 1–2 again at Seznick House via Walter / `lease` | instant | as above, the agency named |
| 4 | the seatless wizard with `parcels: ['/platform']`-equivalent title (the founder, who is the PM, holds `/platform`) writes `/platform/thing/WizardAxisProbe.ts` (`write -s`) and `git publish --dry-run -m probe`; a non-wizard holding title over the same path does both | instant | wizard: write ok, dry-run lists the file as committable; non-wizard: `access-denied` on the write, dry-run lists nothing committable; the probe file is removed in `finally` |
| 4b | the seatless wizard, holding nothing, runs `git status`, `git log --limit 3`, `cat`s a kernel `.ts` through the workspace source tree, and `errors --source compile`; a plain player does the same | instant | all ok for both (reading is open); `errors raw` from either is refused `pm-only`; from the founder it answers |
| 5 | the non-wizard with title over `/world/terminus/eternal/duncan-hall` writes a row there (`write -c`), `reload`s it, `git publish --dry-run`s its YAML; a seatless wizard with no title writes a row there | instant | three oks; the wizard is refused `access-denied` |
| 6 | the founder reads and sets `combat.poise.openingTicks` with `config` and sets it back | instant | both ok, value round-trips |
| 6b | the seatless wizard `config combat.poise.openingTicks 3`; a session opened `offices: ['prime-minister']` (the founder vacated first, so the seat moves) does the same, then the seat is handed back | **staged** | the wizard is refused naming the Prime Minister; the PM's set works; the founder, having vacated, is refused in turn (the office moved, so the authority did) |
| 7 | the founder (a wizard) `config banking.salesTaxRate 0.1` | instant | `controller-rejected: tier-c`, prose names *Minister of Finance* and `treasury set` |
| 8 | the Minister `treasury set banking.salesTaxRate 0.1`; the Governor `reserve set banking.withdrawalDailyCap 600`; the Governor `treasury set banking.salesTaxRate 0.08`; the Minister `reserve set banking.withdrawalDailyCap 500` | **staged** (the seats are staged through `offices`) | two oks whose `config banking.salesTaxRate` read-back (as the founder) shows the value; each officer's `chronicle` shows the deed; two `wrong-seat` refusals naming the other seat |
| 8b | the world restarts (R4) and the founder reads both values back; the Minister's `chronicle` still shows the deed | staged | values and deed survive |
| 9 | `cast script …` / `spells` listing | instant | no such spell; the listing contains no `script` |
| 10 | a seatless wizard and a plain player read a wiki page whose test namespace carries `<spoiler level="3">` material (seeded by the drive under a `parcels`-held wiki namespace) | instant | both renders omit the fragment (never on the wire); the root-zone owner sees it |
| 11 | `help practice` and `practice carpentry hard success` in the wire world | instant | both ok (a test world admits it); the unit test carries the production half |
| 12 | `pnpm lint:wizard-axis` against a tree with one injected site | instant (a shell step in the test, not a verb) | non-zero exit naming the file |

⭐ **B2 — every checkpoint is made to fail once** before the record is
written: step 2 by restoring the deleted `isAgentOf` short-circuit in a
scratch edit, step 4b by restoring one git read's wizard check, step 6b
by restoring `requiresWizard` on `config.yaml`, step 7 by tagging the key
`B`, step 10 by restoring the wizard rung, step 12 by removing the
injected site. The record notes each.

**Existing drives that break, each a finding the build fixes:**

1. `sugar.soak.dirty.wire.test.ts:438,473,649` — `config
   treasury.openingAdvance` from a wizard session → refused `tier-c` →
   `treasury set` as the founder (who holds the seat). Soak lane.
2. `economic-bootstrap.dirty.wire.test.ts:259` — expects
   `not-a-reserve-row` for `reserve set treasury.arrivalPrincipal` →
   `wrong-seat` (and the prose now names the Minister).
3. `typecheck.wire.test.ts:124` — a non-wizard `typecheck` is expected to
   be refused on the axis → refused on title (the player holds nothing
   under `/platform`); the founder's `reload`/`typecheck` lines pass
   because the PM holds `/platform`.
4. The `practice` drives (~20 files): **no change from W1** — the verb is
   admitted in a test world and no longer asks for the axis. Verified by
   running `instrumentation.dirty.wire` in W1.
5. ⚠ **The deleted founder committee backstop's dependents (D18)** —
   every one passed by credential and is re-seated honestly:
   - `packages/server/src/mud/platform/idea/api/__tests__/CompactLogic.test.ts:180`
     — asserts the backstop; inverted (*the founder, on no committee, is
     not a member*).
   - `packages/server/src/mud/api/__tests__/cold-box-walk.test.ts` (AC 27,
     header `:5–7`) — the founder *"appoints THEMSELVES → isCommitteeMember
     passes by the Art. XI pool-of-one backstop"*; the test seats the
     founder on that committee's group first (a real `Group` row), and the
     header says so.
   - `packages/wire/tests/economic-bootstrap.dirty.wire.test.ts:231–232` —
     the founder `appoint`s at `/world/terminus/counting-houses/business`,
     whose `appointingAuthority` is the committee over `/corpo/goodkin`
     (`counting-houses/business.yaml:35`); the founder session opens with
     `committees: ['/corpo/goodkin']` (`:207`, the distributor, is
     PM-authority — unaffected).
   - `e2e/tests/residences.spec.ts:229` (`lease founder` as the founder
     — `mayLet` fell through to the committee over Seznick House) — the
     founder session opens with
     `committees: ['/world/terminus/mayfield-row/seznick-house']`.
   - `assembly.dirty:454` / `assembly.soak:519` (`gauger` `appoint`s at
     `/world/terminus/registry/business`, authority the committee over
     `/world/terminus/registry` — group `terminus`): passed by every-group,
     not the backstop, but lands in the same bucket:
     `committees: ['/world/terminus']`.
   - Ship companies (`harbors:284,299`, `maritime-space:286,541`,
     `river-d/e`) are `owners`-authority (the cap table) — not dependents.
   - `DormResidence.test.ts:254` mocks `isCommitteeMember`;
     `KatieProvisioning.test.ts:222` asserts a stranger is NOT a member —
     neither depends on it. `Authority.test.ts`, `OfficeRegistry.test.ts`,
     `office.test.ts`, `requiresFoundingAuthority.test.ts` name
     `isFounder` for the OFFICE default, which is unchanged.
   - `HallController.mayProvision` / `LettingController.mayLet` fall
     through to `isCommitteeMember`: a founder who is not on the hall's or
     the building's committee is refused there now — correct, and drive
     step 2's wizard-with-no-seat refusal is what the founder gets too.
   Noted so nobody re-adds a credential to make any of these pass.
6. ⚠⚠ **All 59 `wizard: true` files** (W5, D20): after D13 a wizard
   session holds no title, so every staging act in them (`eval --parcel`,
   `clone`, `goto`, `destruct`, `write -c`, `broadcast`, `title`, `pack`)
   fails until the session is seated on the committees it needs
   (`committees:`) or the office (`offices:`). The 7 files whose
   non-founder wizard runs `config` also fail on D12 until that line moves
   to the founder/PM. Each is fixed in W5 and proved by running the file
   (soak files: edited and typechecked only).

**Gates:** the family, as listed under Convention conformance. `pnpm test`
twice only: at code-complete and at `/finalize`; between, `test:near` +
`packages/content/eternal-university` and `packages/content/terminus`
vitest + the family.

## Risks & opens

- ⚠⚠ **D10 is the plan re-grounding a closed list, and the owner should
  see it before W3.** The product decision (fiscal → Finance, monetary →
  Governor) is applied; the key NAMES differ from the requirements' eight
  because three were cut by the economic bootstrap. Two calls the plan
  made that the owner may make differently: `treasury.openingAdvance`
  under Finance (it is the fisc's facility, though the requirements file
  "float" under the Governor), and `banking.localTaxShare` added as a
  ninth. A third: the `reserve.*` Schedule rows stay B although they are
  "the reserve's mandate" — tagging them C would break `config
  reserve.defaultHorizonGameDays` in `economic-bootstrap.dirty` (fixable
  by `reserve set`). The build follows the plan unless told.
- **D5 is confirmed by the owner** (*"putting a brain on your NPC is a
  content choice not coding"*) — no review flag. For the record: what
  still bounds a brain is the module category (only a brain module exports
  `brain`; `CmsLogic.validateBehaviorPaths` refuses an unresolvable one)
  and `lint:idle-cadence` on the resource half; the content-generation
  slate's *"may never change what a thing IS"* loses its mechanism while
  its budget (title = extent) stands — the build leaves that slate a
  one-line note.
- ⚠ **D18 deletes a shipped backstop, and its dependents are the ones
  listed — plus whatever a drive run finds.** The six named sites are
  the grep's answer (`isCommitteeMember` callers, `holdsAuthority`'s
  `committee` arm, every test naming `isFounder`); a founder session in a
  drive that acted inside a locality by credential alone would not show
  in a grep and surfaces only when W5 runs the file. That is W5's job and
  the reason it is sized as a read of every file.
- **`office assign` and `appoint` both bind their target through the
  `online` scope** that cannot resolve a second session (governance.md
  § Open) — the reason the `offices:` and `committees:` seams write rows
  instead of driving the verbs. If the build finds the defect small,
  fixing it is a finding worth taking; the seams stay as staging tools
  either way (staging is faster than dialogue).
- **Did anything depend on the deleted gates?** Checked: the sandbox's
  safety does not (*"never depends on trusting the actor"*, sandbox.md:41;
  `HotReloadApi` has its own circle guard); call-security does not (the
  gates were person-axis checks inside Api logic, no `@CallSecurity`
  policy reads `isWizard`); `lint:instanceable` is the structural
  publishing declaration and stays. One real code-trust case the old gate
  never covered — `EvalScript.code` is `persistent` and writable from a
  row's `data` (access.md:347) — is unchanged by this build and remains
  inert without a wizard to `run` it; named here so it is not mistaken for
  a regression.
- **A runtime-authored row naming a `/lib/` class.** `lint:instanceable`
  is build-time over shipped rows; grep found no runtime `/lib/` refusal in
  the resolvers. This was equally true before (a wizard could do it) and is
  now reachable by a title holder. Low: a `/lib/` module has no twin row
  and the clone pipeline's `classFileOf` fails loudly. Recorded as an open,
  not fixed here.
- **`office assign` is defective** and the drive stages the seats
  (D13). If the build finds the `online`-scope defect is small, fixing it
  is in scope as a finding; if not, it stays the governance doc's open and
  the staged twin is the proof.
- **`lint:closed-vocabularies`** may count `SettingTier`; the gate's
  declared set is the escape — no ceiling rise.
- **Sibling merges**: `reqs/water-supply` adds settings keys (the tier
  record must gain rows — `tsc` says so); `reqs/paper` edits
  `DocumentLogic.ts` near the command-view arm (a textual conflict to
  resolve by hand, whichever merges second).
- **`lint:object-verbs`** — `sourceWriteRefusal(actor, …)` takes a person
  first; the access face's existing predicates already do and pass. If the
  gate counts it, the fix is the `@internal`/predicate classification the
  gate provides, never a rise.

## Deferred seams

- **Spoilers in code** → the slate's W4 (`wizard-axis-cleanup-slate.md`,
  rewritten 2026-11-05): reading source is open after this build, so
  source that would spoil the game — a puzzle's answer in a controller, a
  secret in a row — needs the wiki's two-axis reveal model (capability
  deletes, appetite tags) extended to code. Nothing in this build hides
  source; the attach point is `CmsLogic.gateRead('source')` and the
  workspace read verbs, which today answer any signed-in avatar.
- **A parameterized `requiresOffice(<key>)` validator** — the third
  hand-written twin (`requiresPrimeMinister`, after `requiresGovernor` and
  `requiresFinanceMinister`) is governance.md's own signal to parameterize;
  what it needs is a schema change so a view's `validators:` entry can
  carry the office key. Not this build; the three twins are the inventory.
- **The executive warrant** → [executive-warrant-slate](../slates/builds/executive-warrant-slate.md)
  (written this cycle, UNBUILT): the regulated form of the hole the
  deleted backstop pretended to be — the PM requests one named extent
  with a stated reason; it expires; it is on the governance record; the
  overridden committee is told; the legislature or the courts may revoke
  it. Built on the agency slate's scoped, revocable grant. The attach
  point this build leaves is exactly `isCommitteeMember` /
  `subjectIsOwnerMember` with no backstop arm in either.
- **The harness after D13** — the every-group mode is gone, not
  deferred. What remains for the soak-lane slate: the
  `offices:`/`committees:` seams exist because `office assign` and
  `appoint` cannot bind an online player; when that defect is fixed the
  seams stay as staging tools but their comments lose the *"because"*.
- **The amendment library** consumes `AppSettingTiers`'s `C:` rows as its
  first legos (amendment-library-slate — already named by the
  requirements).
- **`reserve.*` as Tier C** — recorded under D10 for the owner.

## Critical files

Read first, in this order:

1. `docs/requirements/wizard-axis-cleanup-requirements.md`
2. `docs/subsystems/access.md` §§ *The two account axes*, *The code-trust
   lockdown*, *Where the gate lives*, *Verb-controller gates*
3. `packages/server/src/mud/platform/idea/api/AccessLogic.ts` and
   `packages/server/src/mud/platform/idea/AccessRegistry.ts`
4. `packages/server/src/mud/platform/idea/cmd/shell/WriteController.ts`
   (`_gateSourceWrite`), `api/CmsLogic.ts`, `api/StudioLogic.ts`,
   `api/GitLogic.ts` (the four mirrors)
5. `packages/content/eternal-university/src/lib/HallController.ts`,
   `packages/content/terminus/src/lib/LettingController.ts`, the four
   views beside them
6. `packages/server/src/mud/lib/config/AppSettings.ts`,
   `packages/server/src/mud/api/app.ts`,
   `packages/server/src/mud/platform/idea/cmd/system/ConfigController.ts`,
   `cmd/banking/ReserveController.ts`, `cmd/banking/TreasuryController.ts`,
   `packages/content/platform/content/platform/cmd/banking/reserve.yaml`,
   `treasury.yaml`, `packages/content/platform/content/settings/banking.yaml`,
   `treasury.yaml`, `retail.yaml`
7. `packages/server/src/mud/lib/governance/Office.ts`,
   `packages/server/src/mud/lib/character/Persona.ts` (`recordDeed`),
   `packages/server/src/mud/platform/idea/api/CompactLogic.ts`
   (`isCommitteeMember` — the founder backstop D18 deletes;
   `committeeOf`, which the `committees:` seam reuses),
   `packages/server/src/mud/lib/command/validators/requiresGovernor.ts`
   (the shape `requiresPrimeMinister` copies),
   `docs/slates/builds/executive-warrant-slate.md` (what the deleted
   backstop becomes, later)
8. `packages/server/src/mud/platform/idea/WikiRenderer.ts` (`ceilingFor`),
   `WikiRegistry.ts` (`satisfies`, `zoneFor`)
9. `packages/server/src/mud/lib/magic/Effect.ts`, `api/MagicLogic.ts`
10. `packages/server/scripts/check-test-content.ts`,
    `scripts/test-content-allowlist.txt`, `scripts/pack-roots.ts`,
    `scripts/lint-family.ts`, `docs/lint-family.md`
11. `packages/server/src/backend/TestHooks.ts`,
    `packages/server/src/services/auth/TestAuthRoutes.ts`,
    `packages/wire/src/harness/session.ts`, `e2e/tests/helpers.ts`,
    `packages/wire/tests/harbors.dirty.wire.test.ts` (the drive-file shape),
    `docs/testing.md`
12. `packages/content/platform/content/platform/cmd/system/testharness.yaml`
    + `lib/command/validators/requiresTestWorld.ts` (the `practice` shape)

## Build log

- **W0 ✅ `1f59c2704`** — `lint:wizard-axis`: 57 files at the census. The
  reason set carries `sweep` while the build is in flight; it is removed
  from `REASONS` once W3 lands, so no shipped line can say it.
- **W1 ✅ `1887377e2`** — ⭐ **Found:** a forced dispatch RUNS view validators
  (npc-dialogue.md, proven 2026-08-04), so the letting views'
  `requiresWizard` was refusing Katie's own `provision` dispatch — a live
  defect the deletion fixes, not just a cleanup. The Grounding's *"Katie's
  dispatch skips validators"* was wrong; residence.md and the controller
  headers now say what is true. ⚠ Removing `isAgentOf` re-attached a
  stray `@CallSecurity(AccessApiCallers)` to `AccessLogic.isWizard`, which it
  had been meant for all along (the forwarder is the only caller). The
  refusal text names the seat: *"Only the college's staff or a member of
  the hall's committee may let Duncan Hall's rooms."* Allowlist 57 → 44.
- **W2 ✅ `39976d929`** — decisions the plan did not make:
  - **D2' — the predicate lives on `AccessApi`, not `AccessLogic`.** The
    logic singleton's methods are gated `FromModule(AccessApi)` and it makes
    no self-calls, so the predicate composes the Api's own `isWizard` /
    `resolveSourceFolderZone` / `can` (each keeps its system-context wrap and
    fail-closed path, and every test spy on them still bites). It takes an
    `action` (`write`/`rm`/`mkdir`) because `rm`/`mv` asked `can(…, 'rm')`.
  - **D14 reached the shell.** AC 4 (*read anything*) and drive step 4b
    (`cat` a kernel `.ts`) were unreachable while `cat`/`ls`/`grep`/`cp`'s
    source endpoint asked title for a source READ — opened (lens 1: reading
    the world's code is how it is learned).
  - `TemplateLogic.transitiveClosure.test.ts` was deleted with the gate it
    proved (its whole premise was D5's gate).
  - `isWizard` is composed from the caches in `AccessRegistry` (a gated
    self-call through the proxy is refused).
  - The doc sweep ran as a subagent (docs only, disjoint files).
- **W3 + W4 harness ✅ `3ec72dfd1`** —
  - `AppApi.whoSets(key)` + `SettingTierVerbs` (seat → verb) so the three
    refusing controllers say one sentence from one place; the shared write
    path is `BankingControllerBase.setSeatDial` (both seat verbs).
  - `assignForTest` landed on **`CompactApi`** (`assignOfficeForTest`),
    not `OfficeRegistry`: `@TestOnly` is Api-statics-only.
  - The founder backstop's dependents went as the plan listed; prose in
    press/corpo/employment/fasttravel/access/governance said *yes* through
    it and was corrected (cold-box corpo boards are seated by their owner —
    the Registrar — with the `group` verb).
  - ⚠ The drive drives the source-write predicate through `cp -s` /
    `mkdir -s`, not `edit`: the wire harness sends no payloads. Step 10
    (wiki) is the unit suite's for the same reason. Recorded in the file.
- **W5 ⏳** — fanned to four subagents (static edits + `tsc`; no worlds);
  the proof is `wire:dirty`, run alongside review.

## Drive record

*(appended at build time)*
