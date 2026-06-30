# Wizard authority & the code-trust lockdown — implementation plan

Drives one build cycle against
[wizard-authority-requirements.md](../requirements/wizard-authority-requirements.md).
Self-contained: a fresh build agent can execute against this without the
originating conversation. Every precedent below was verified against the
real code; places where the requirements' / audit's assumed precedents
did not match reality are flagged inline and consolidated in
**§ Stale-fact corrections**.

## Grounding (verified precedents)

| Concern | Real file + pattern confirmed |
|---|---|
| The axis predicate | `AccessApi.isDeveloper` (`mud/api/access.ts:89-91`) → `AccessLogic.isDeveloper` (`mud/obj/api/AccessLogic.ts:104-111`, **default-permits when no Registry** — `if (!reg) return true`) → `AccessRegistry.isDeveloper` (`mud/obj/AccessRegistry.ts:191-198`, reads `cachedDeveloperPlayerIds`, warmed by `ensureDeveloperCache` 295-313 via `findByName('developers')`, invalidated by managed-provider `onChange`). |
| Axis seeding precedent | `AccessRegistry.seedStreamersGroup` (`mud/obj/AccessRegistry.ts:401-436`) — `findByName`, mint-if-absent, then additive+idempotent member seed from `STREAMER_PLAYER_IDS` env (split/trim/filter), drop the warmed cache after seeding. `seedDevelopersGroup` (386-399) mints an **empty** group with **no env seed** today. |
| Streamer cache mirror | `cachedStreamerPlayerIds` / `streamerCacheCancel` / `ensureStreamerCache` (315-333) + `onDestruct` cancel (438-444) — the exact template to mirror for an archwizard axis. |
| The save chokepoint | `TemplateLogic.saveTemplate` (`mud/obj/api/TemplateLogic.ts:51-80`) — loads existing by path (57-58), writes `class`/`data`/`hydratorClass`, `tpl.save()`, then `ProvenanceApi.recordAuthoring({ path })`. Gated `@CallSecurity(FromModule('mud/api/template#TemplateApi'))`. |
| Actor-from-context at the chokepoint | `ProvenanceLogic` (`mud/obj/api/ProvenanceLogic.ts:32`), `CmsLogic.actingActor` (`mud/obj/api/CmsLogic.ts:212-214`), `DocumentLogic` (`:30`) all read `ExecutionContextApi.getActingAuthor()` (`mud/api/execution-context.ts:341`). The `tagActingAuthor` stamp seam is `:376`. |
| **CMS attribution bridge is LIVE** | `backend/CmsSession.ts:60-68` — `if (actor) ExecutionContextApi.tagActingAuthor(actor)`. So `getActingAuthor` resolves the CMS author correctly **today** (provenance.md's "safely unattributed until then" is stale — see §Stale-facts). |
| In-world content write | `WriteController` (`mud/obj/command/shell/WriteController.ts`) content branch (132-172): `--class`/`--hydrator` are **user-supplied** (139, 142-147) and passed straight to `saveTemplate` (161-166). `_gateContentWrite` 226-241, `_gateSourceWrite` 249-261. |
| CMS content write | `CmsLogic._writeContent` (`mud/obj/api/CmsLogic.ts:560-592`) — `validateBehaviorPaths(data)` (133-159), requires an **existing** template, then `saveTemplate(path, existing.class, data, existing.hydratorClass)` — **class/hydrator are immutable on the CMS path**; only `data` (incl. `behaviors[].brain`) is author-controlled. |
| Brain resolution | `BehavedMixin.postRegister` warm (`mud/lib/behavior/Behaved.ts:194` `resolveExport`), per-fire re-resolve (`:381` `resolveExportSync`), `TalkController.ts:59` `resolveExportSync`. |
| Clone-pipeline module resolution | `StuffApi.#cloneInner` (`mud/api/stuff.ts:277-...`) → `#validateClassPath` (160, format-only: leading `/`, no `..`, prefix `/obj/`|`/lib/`) → `loadClassByPath` (1104) for `class`; `singleton`/`clone` for `hydratorClass`. `Populates.ts:110`, `ZoneLogic.ts:79/96`, `TemplateLogic.ts:151/171`, `WriteController.ts:207`, `PackLogic.ts:278` also call `loadClassByPath` (validation/transitive — see §drift-guard). |
| Managed-group mutation | `Group` Document (`mud/lib/social/Group.ts`) `addMember`/`removeMember`/`save`; `ManagedGroupProvider.findByName` + `fireChange(id)`; `GroupController` (`mud/obj/command/social/GroupController.ts`) is the CRUD-with-`fireChange` precedent. |
| Verb validator | `mud/lib/command/validators/requiresDeveloper.ts` — `CommandValidator<boolean>`, `validator.preload = (ctx) => AccessApi.isDeveloper(ctx.commandGiver)`. Mirror for `requiresStreamer.ts`. |
| Verb affordance + seed pair | `mud/lib/shell/Author.ts:64-100` `commandContributions.self` (the `'stream/stream.yaml'` precedent); silent controller seed e.g. `seeds/obj/command/system/AnnounceController.yaml`. Verb YAML carries `validators: [/lib/command/validators/...]`. |
| Narrow-entry mutation | `access.md § narrow-entry` — `StuffApi.forceDestruct` gated `FromController(DestructController)` (string-keyed), controller runs the authorization check then calls the gated mutation. The model for `wizard grant`. |
| Client-facing axis hint | `services/auth/AuthRoutes.ts:118-130` resolves `response.isDeveloper` via `CmsSession.runAsSessionPlayer` → `AccessApi.isDeveloper`; wire type `AuthStatusResponse.isDeveloper` + mirror field (`packages/types/src/index.ts:1812, 1847`); client `App.tsx:387-389`, `store` auth slice, `components/frame/AccountMenu.tsx:87,170` (gates CMS-launcher visibility). |

---

## Design decisions (resolve before coding)

**D1 — Where the code-field gate lives.** In `TemplateLogic.saveTemplate`, in a
private helper `enforceCodeFieldGate(path, classPath, data, hydratorClassPath, existing)`
called **after** the `existing = Template.findByPath(path)` load and **before**
`tpl.save()`. This is the requirements-pinned chokepoint and the one place that
has (a) the path, (b) the incoming code-field values, (c) the existing doc to
diff against, and (d) a live execution context for the actor. It is *not* in
`CmsLogic` (would miss in-world `write -c`) and *not* in `DomainHook` (see D6).

**D2 — Actor resolution + the allow ladder.** The gate resolves
`actor = ExecutionContextApi.getActingAuthor()` (never caller-supplied; same seam
as provenance). The allow ladder:
1. `actor == null` (system / bootstrap / forced / cross-actor / pre-Avatar login
   & char-gen principals) → **ALLOW**. Necessary: keeps `AccessRegistry`
   lounge-seed, `Login`/`EnrollController`/`Application` Avatar provisioning, and
   guest creation working — those run with no attributable Avatar author.
2. `actor` is a wizard (`AccessApi.isWizard(actor)`) → **ALLOW**.
3. else (a non-wizard Avatar author) → enforce the **delta rule** (D3).

   This is the gated-api-actor-from-context rule applied literally; the only
   contexts that reach step 3 are real in-world `write -c` / `cp` / `mv` /
   `mkdir -c` dispatches and CMS writes by a non-wizard.

**D3 — The delta rule (what counts as a violation).** For a non-wizard author,
compute the incoming vs. existing **code-field** values and reject (throw
`TemplateError`, surfaced as `controller-rejected` / `CmsError('denied')`) if the
write *introduces or changes* any of:
- `class` — `classPath !== existing?.class`
- `hydratorClass` — `hydratorClassPath !== existing?.hydratorClass`
- `behaviors[].brain` — the multiset of brain strings in `data.behaviors[]` is not
  a subset of the multiset in `existing?.data.behaviors[]`.

A pure cosmetic edit (same class, same hydrator, same brain set; only
`name`/`description`/ordinary `data` changed) passes — this is the protowizard
authoring path the acceptance criteria require. A create (no `existing`) by a
non-wizard with any code field set is a delta-from-nothing → reject.

**D4 — The structural-scaffolding carve-out (mkdir).** `mkdir -c` is a
member-level op (access.md) that writes the **fixed engine constant**
`/lib/zone/FolderZone` with empty `data` and no behaviors. To avoid breaking it,
the delta rule exempts a `class` write when **`ZoneApi.isFolderClass(classPath)`
is true AND there are no `behaviors` AND `hydratorClass` is absent-or-the-standard
`PersistentHydrator`**. Justification: a Zone/folder class is engine code by
construction, carries no author-chosen executable strategy, and the folder/leaf
invariant already constrains it; permitting structural sub-zone creation does not
let a non-wizard name arbitrary code.

**D5 — `cp`/`mv` of class-bearing leaf templates becomes wizard-only (intentional
tightening).** `cp`/`mv` content copy an existing template's `class`/`hydratorClass`/
`behaviors` into a *new* path (no `existing` at dst) → the delta rule rejects them
for non-wizards. This is the faithful v1 reading ("a protowizard cannot set the
direct fields at all; they author by cloning/customizing wizard-made templates").
The blessed protowizard authoring path remains: edit an existing template's
cosmetic `data` via `write -c` / CMS. **Note for ratification:** if preserving
non-wizard `cp`/`mv` is later desired, the minimal extension is "a code-field value
that already appears on a persisted template is vetted-by-construction" — but that
edges into the deferred v2 catalog, so it is out of scope here. Existing
`cp`/`mv` content tests that run as a non-wizard must be updated to a wizard actor
(see Phase 5 test notes).

**D6 — Universality of the chokepoint + the one bypass.** Every *authoring*
template write funnels through `saveTemplate` **except** `PackLogic` (content-pack
import), which writes `PersistApi.save(Collections.Domain, …)` directly
(`mud/obj/api/PackLogic.ts:357/376/380`). The `pack` verb is dev-gated
(`cmd/author/pack.yaml` → `requiresDeveloper`), so after the Phase-1 rename it is
**wizard-only at the verb** — a non-wizard can never reach that bypass. The plan
documents this explicitly rather than adding a second gate. (The truly universal
domain-write chokepoint is `DomainHook.aroundSave`; we deliberately keep the gate
at `saveTemplate` per the requirements because that is where the actor context and
the in-world/CMS authoring intent live, and the only non-`saveTemplate` authoring
path is independently wizard-gated.) Non-authoring domain writes that bypass
`saveTemplate` — `snapshotToTemplate`→`tpl.save()` (Avatar persist-back; only
marshals live `persistentFields`, never author-named class strings) — cannot carry
a non-wizard-chosen code field and run under `null`/system contexts anyway.

**D7 — `isArchwizard` is a first-class axis (not an ad-hoc membership check).**
Add `isArchwizard` to `AccessApi`/`AccessLogic`/`AccessRegistry` mirroring
`isStreamer` (own cache + `onChange` + `onDestruct` cancel). Justification:
consistency with the five-axis facade, a single cached read for the `requiresArchwizard`
validator hot path, and HMR-safe invalidation. The wizard-membership *mutation*
(`grant`/`revoke`) is a narrow-entry method on the access subsystem (D8), keeping
all wizard-axis state and writes in one place.

**D8 — Grant verb shape.** A dedicated `wizard grant <player>` / `wizard revoke <player>`
verb (controller + YAML pair), authorized by a `requiresArchwizard` validator, that
calls a new narrow-entry mutation `AccessApi.setWizardMembership(playerId, isWizard)`
gated `FromController(WizardController)`. The mutation lives in `AccessRegistry`
(it owns the `wizards` group ref + member cache, so it resolves the group, mutates
`Group.addMember`/`removeMember`, `save()`, fires `managed().fireChange(id)` to
invalidate the cache). The verb arg (target player) is an ordinary object argument;
the *authority* (the giver's archwizard status) is context-derived.

---

## Phase 1 — Rename the axis: `developers/isDeveloper` → `wizards/isWizard`

Pure rename + a one-time DB migration. No new capability yet. After this phase
`eval`, `reload`, source writes, CMS source read/write, and the operator verbs all
gate on `wizards`, and existing developer-group members retain access.

**Edits — the predicate chain**
- `mud/api/access.ts` — rename `isDeveloper` → `isWizard` (89-91); update the
  doc comment (`'developers'` → `'wizards'`).
- `mud/obj/api/AccessLogic.ts` — rename method `isDeveloper` → `isWizard`
  (104-111); keep the `if (!reg) return true` default-permit (tests rely on it).
- `mud/obj/AccessRegistry.ts` — rename: method `isDeveloper`→`isWizard` (191-198);
  fields `cachedDevelopersRef`→`cachedWizardsRef`, `cachedDeveloperPlayerIds`→
  `cachedWizardPlayerIds`, `developerCacheCancel`→`wizardCacheCancel`;
  `ensureDeveloperCache`→`ensureWizardCache` (295-313); `seedDevelopersGroup`→
  `seedWizardsGroup` (386-399) — **and** add `WIZARD_PLAYER_IDS` env seeding by
  mirroring `seedStreamersGroup`'s additive/idempotent block (new capability per
  requirements). Update `postRegister` (83-88) and `onDestruct` (438-444). The
  group **name string** `'developers'` → `'wizards'` (the migration handles
  existing rows — see Phase 4).

**Edits — the validator**
- `mud/lib/command/validators/requiresDeveloper.ts` → **rename file** to
  `requiresWizard.ts`; `validator.preload = (ctx) => AccessApi.isWizard(ctx.commandGiver)`;
  update the doc comment.
- Update every YAML referencing the validator path (the audit's "eval + reload"
  is incomplete — there are **7**): `cmd/author/eval.yaml`, `cmd/author/reload.yaml`,
  `cmd/system/config.yaml`, `cmd/author/pack.yaml`, `cmd/author/practice.yaml`,
  `cmd/banking/house.yaml`, `cmd/banking/reserve.yaml` — change
  `/lib/command/validators/requiresDeveloper` → `/lib/command/validators/requiresWizard`.

**Edits — server call sites (`isDeveloper` → `isWizard`)**
- `mud/obj/command/shell/WriteController.ts:253` (`_gateSourceWrite`).
- `mud/obj/command/shell/MkdirController.ts:70`, `RmController.ts:118`,
  `CpController.ts:101`, `MvController.ts:96` (source-mode branches).
- `mud/obj/command/author/TeleportController.ts:51`.
- `mud/obj/api/CmsLogic.ts:188` (`gateSourceWrite`), `:227` (`gateRead` source
  branch), plus the doc comments at `:180`, `:200-201`, `:223`, `:607` and the
  denial strings ("you must be a developer to browse source" → "…a wizard…").
- `services/auth/AuthRoutes.ts:118-130` — `AccessApi.isDeveloper` → `isWizard`;
  rename the response field `isDeveloper` → `isWizard` and the topic label
  `'auth.status.isDeveloper'` → `'auth.status.isWizard'`.
- Doc-comment-only refs to update for hygiene: `mud/bootstrap.ts:104,106`,
  `mud/api/banking.ts:17`, `mud/lib/social/providers/ManagedGroupProvider.ts:35`,
  `mud/lib/shell/Author.ts:74,96`.

**Edits — the client-facing wire field (cross-package blast radius)**
- `packages/types/src/index.ts` — rename `AuthStatusResponse.isDeveloper` (1806-1812)
  and the mirrored hint (1841-1847) → `isWizard`; update the JSDoc ("developer-tier"
  → "wizard-tier").
- `packages/client/src/App.tsx:387-389` — `isWizard: data.isWizard === true`.
- `packages/client/src/store/index.ts` — auth slice field `isDeveloper` → `isWizard`.
- `packages/client/src/components/frame/AccountMenu.tsx:87,170` — `s.auth.isWizard`.

**Edits — docs/config touched by the rename (full doc sweep is Phase 6)**
- `packages/server/.env.example` — add a `WIZARD_PLAYER_IDS` block mirroring the
  `STREAMER_PLAYER_IDS` block (10-14).

**Tests (Phase 1)**
- `mud/obj/__tests__/AccessRegistry.*` — `isWizard` true for a `wizards` member,
  false otherwise; `WIZARD_PLAYER_IDS` env seeds members additively+idempotently
  (mirror the streamer-seed test).
- `mud/obj/command/system/__tests__/ConfigController.test.ts` — update the import
  and the two assertions (lines 20, 136, 140-150) to `requiresWizard`.
- New `mud/lib/command/validators/__tests__/requiresWizard.test.ts` — passes for a
  wizard, rejects a non-wizard (mirror the retired requiresDeveloper assertions).
- Rename-coverage guard: grep-style unit asserting no `isDeveloper` /
  `requiresDeveloper` / `'developers'` symbol survives in `packages/server/src`
  (excluding migration code + this test).

Satisfies **AC1** (and the rename half of **AC8**'s vocabulary).

---

## Phase 2 — The code-field gate at `saveTemplate` (the lockdown)

**New file**
- `mud/lib/stuff/CodeNamingFields.ts` — the single source of truth for the gated
  direct set, consumed by both the gate and the drift-guard (Phase 3):
  ```ts
  export const CODE_NAMING_FIELDS = ['class', 'hydratorClass', 'behaviors[].brain'] as const;
  // + a helper extractBrains(data): string[]  (reads data.behaviors[].brain, tolerant of shape)
  ```

**Edit — the gate**
- `mud/obj/api/TemplateLogic.ts` — add `private async enforceCodeFieldGate(...)`
  and call it inside `saveTemplate` after the `existing` load (57-58), before
  `tpl.save()` (71). Implement the D2 allow-ladder and the D3 delta rule with the
  D4 folder carve-out. Imports: `ExecutionContextApi`, `AccessApi`, `ZoneApi`
  (already imported), `Avatar` (instanceof check), `extractBrains` +
  `PersistentHydrator.templatePath` (already imported). Reject via `TemplateError`
  with a field-specific message ("only a wizard may set `class` on a content
  template"). Because `enforceCodeFieldGate` calls `AccessApi.isWizard`, confirm no
  call-security cycle (TemplateLogic is `FromModule('mud/api/template#TemplateApi')`-gated;
  it calls *out* to `AccessApi`, which is fine — no self-call).

  Note the natural division of labor that falls out of D6: on the **CMS** path
  `classPath`/`hydratorClassPath` always equal `existing` (CmsLogic passes them
  through), so only the `behaviors[].brain` delta can fire there; on the **in-world**
  path `--class`/`--hydrator` are the freehand surface and all three can fire.

**Tests (Phase 2)** — `mud/obj/api/__tests__/TemplateLogic.codeGate.test.ts`
- Non-wizard author + `saveTemplate` introducing a new `class` on a fresh path →
  rejected; same call as a wizard → succeeds.
- Non-wizard author editing an existing template, **same** class/hydrator/brains,
  changed `data.description` → **succeeds** (AC3).
- Non-wizard author changing `class` / `hydratorClass` on an existing template →
  rejected (each field).
- Non-wizard author adding a `behaviors[].brain` not in the existing set →
  rejected; reordering / unchanged set → succeeds.
- `null` acting author (system/bootstrap) introducing a class → **allowed**
  (provisioning invariant).
- `mkdir`-shaped write (`/lib/zone/FolderZone`, empty data, no hydrator) by a
  non-wizard → **allowed** (D4 carve-out); a non-folder class by a non-wizard →
  rejected.

Satisfies **AC2**, **AC3**, and the gate half of **AC4**.

---

## Phase 3 — Drift-guard

**New file**
- `mud/lib/stuff/__tests__/codeNamingDriftGuard.test.ts` — a structural lint test
  (the enumerated-list-backed-by-failing-test option). It scans
  `packages/server/src/mud` for every module-resolving call site
  (`resolveExport(`, `resolveExportSync(`, `loadClassByPath(`, and dynamic
  `import(` with a non-string-literal argument) and asserts the set of call sites
  equals a checked-in expected manifest. Each expected entry is classified:
  - **gated-direct** — fed by a `CODE_NAMING_FIELDS` value (clone pipeline
    `class`/`hydratorClass`; `Behaved`/`TalkController` `brain`).
  - **transitive-safe** — resolves *another template's* already-gate-passed class
    (`Populates.ts:110`, the clone pipeline's recursive hydrator/zone resolution).
  - **validation-only** — does not instantiate/run author-chosen code
    (`ZoneLogic.ts:79/96` isFolderClass, `TemplateLogic.ts:151/171`,
    `WriteController.ts:207`, `PackLogic.ts:278`).
  A *new, unclassified* call site (e.g. the audit's residual risk — a custom
  `Hydrator` subclass reading a new instruction field that resolves a module) makes
  the test **fail**, forcing the author to either join `CODE_NAMING_FIELDS` + the
  gate or justify a classification. The test's header comment documents the
  procedure.

**Tests (Phase 3)** — the drift-guard test itself is the deliverable; add one
negative meta-assertion (a synthetic "unexpected call site" fixture string proves
the scanner would fail on an unknown site).

Satisfies **AC5**.

---

## Phase 4 — Migration: keep existing developer-group members as wizards

`SeederManager` is insert-only and the `wizards` group is seeded by
`AccessRegistry.postRegister`, not a seed YAML, so the rename strands the old
`developers` Group doc. Fix in the seeding path (idempotent, boot-safe):

**Edit**
- `mud/obj/AccessRegistry.ts` `seedWizardsGroup` — before minting a fresh group:
  `wizards = findByName('wizards')`; if absent, `legacy = findByName('developers')`;
  if `legacy` exists, **rename the doc** (`legacy.name = 'wizards'; await legacy.save()`)
  so `_id` + `memberIds` + `memberRoles` carry over verbatim, then treat it as
  `wizards`; only if neither exists, mint empty. Then run the `WIZARD_PLAYER_IDS`
  env seed. Re-running against an already-migrated DB is a no-op
  (`findByName('wizards')` hits, `developers` is gone). Add a one-line console.info
  on the rename branch for operational visibility.

**Tests (Phase 4)** — `mud/obj/__tests__/AccessRegistry.migration.test.ts`
- Seed a legacy `developers` Group with two members → run `postRegister` → a
  `wizards` group exists with the same `_id` + members, no `developers` group
  remains, `isWizard` true for both members.
- Idempotency: second `postRegister` is a no-op (no duplicate, members intact).

Satisfies **AC7**.

---

## Phase 5 — Archwizard axis + the `wizard grant/revoke` verb

**Edits — the axis (mirror the streamer axis exactly)**
- `mud/obj/AccessRegistry.ts` — add `cachedArchwizardsRef`,
  `cachedArchwizardPlayerIds`, `archwizardCacheCancel`; `isArchwizard` (mirror
  `isStreamer` 207-214); `ensureArchwizardCache` (mirror 315-333);
  `seedArchwizardsGroup` (mirror `seedStreamersGroup` 401-436, env
  `ARCHWIZARD_PLAYER_IDS`); call both from `postRegister`; cancel in `onDestruct`.
  Add the narrow-entry mutation `setWizardMembership(playerId: string, makeWizard: boolean)`
  gated with the existing `AccessApiCallers` policy **plus** a `FromController`
  admit for `WizardController` — implement by resolving the `wizards` group via
  `managed()`, `addMember`/`removeMember`, `save()`, `managed().fireChange(id)`
  (invalidates `cachedWizardPlayerIds`), returns a boolean (changed).
- `mud/obj/api/AccessLogic.ts` — add `isArchwizard` (mirror `isStreamer` 113-121)
  and `setWizardMembership` forwarding methods, both `@CallSecurity(AccessApiCallers)`.
- `mud/api/access.ts` — add `isArchwizard` and `setWizardMembership` facade methods
  (forward to `logic()`); `setWizardMembership` carries the `FromController(WizardController)`
  narrow-entry policy (string-keyed `FromModule('mud/obj/command/author/WizardController#…')`
  per the `forceDestruct` precedent to avoid a static-import cycle).

**New files — the verb (controller + YAML + seed + validator)**
- `mud/lib/command/validators/requiresArchwizard.ts` — mirror `requiresWizard.ts`;
  `validator.preload = (ctx) => AccessApi.isArchwizard(ctx.commandGiver)`.
- `mud/cmd/author/wizard.yaml` — verbs `[wizard]`, `controller: author/WizardController`,
  `validators: [/lib/command/validators/requiresArchwizard]`, positional subcommand
  (`grant`|`revoke`) + a target player arg (resolved as a player/Avatar reference
  per the existing player-targeting convention used by `cmd/author/player.yaml`).
- `mud/obj/command/author/WizardController.ts` — `extends CommandController`,
  `execute(model, ctx): Promise<void>`. Resolves the **giver** from context (the
  validator already gated archwizard status; the controller re-derives nothing
  caller-supplied), resolves the **target** playerId from the arg, calls
  `AccessApi.setWizardMembership(targetPlayerId, model.sub === 'grant')`, responds
  via `MessageApi.scene(ctx.commandGiver).topic('system.access').toSelf(...).send()`,
  rejects malformed input via `ctx.note({ kind: 'controller-rejected', … })`.
- `seeds/obj/command/author/WizardController.yaml` — `{ class: /obj/command/author/WizardController, data: {} }` (the silent half of the affordance+seed pair).

**Edit — affordance**
- `mud/lib/shell/Author.ts` — add `'author/wizard.yaml'` to
  `commandContributions.self` (the `'stream/stream.yaml'` precedent), with a
  comment noting it is authorized on the archwizard axis (`requiresArchwizard`), so
  an author who is not an archwizard sees the verb but cannot run it.
- `packages/server/.env.example` — add an `ARCHWIZARD_PLAYER_IDS` block.

**`cp`/`mv` test fixups (consequence of D5)**
- `mud/obj/command/shell/__tests__/CpController.*` / `MvController.*` — any content-mode
  test that copies a class-bearing template as a non-wizard now expects rejection;
  update those cases to run as a wizard actor (or assert the new denial). Document
  the D5 decision in the test comment.

**Tests (Phase 5)**
- `mud/obj/__tests__/AccessRegistry.archwizard.test.ts` — `isArchwizard` true for a
  member; `ARCHWIZARD_PLAYER_IDS` seeding; `setWizardMembership` toggles `wizards`
  membership and invalidates the cache (next `isWizard` reflects it).
- `mud/lib/command/validators/__tests__/requiresArchwizard.test.ts` — pass/reject.
- `mud/obj/command/author/__tests__/WizardController.test.ts` — `grant` adds the
  target to `wizards`; `revoke` removes; mapping of subcommand + target; void return
  + `ctx.note` on bad input. Authorization (archwizard-only) is the validator's job
  (covered above).
- **Live verification gate** (affordance+seed pairs are invisible to unit tests —
  the recurring lesson): run the server, dispatch `wizard grant <player>` as an
  archwizard (verb in the recency stack, controller seed dispatches, a
  non-archwizard is rejected by `requiresArchwizard`, and the target gains `eval`
  access), then `wizard revoke` removes it.

Satisfies **AC6**.

---

## Phase 6 — Transitive-closure test + docs + CLAUDE.md

**Test — the closure proof (AC4 transitive half)**
- `mud/obj/api/__tests__/TemplateLogic.transitiveClosure.test.ts` — a protowizard
  cannot reach code execution through a transitive reference field: attempt, as a
  non-wizard, to author a template whose `adornments[].template` / `exits[].destination`
  / `populates[]` points at a path that would carry a dangerous `class`, and show
  that the only way such a target template can exist is via a wizard-authored
  `class` write (the gate blocks the non-wizard from creating the dangerous-class
  target in the first place). Assert: the transitive fields themselves are
  ungated (the reference write succeeds) **and** the dangerous-class target write
  is rejected for the non-wizard — i.e. closure-by-construction holds.

**Docs**
- `docs/subsystems/access.md` — fold in the wizard/protowizard partition:
  - §"The five axes" item 4: `isDeveloper` → `isWizard`, "developers" → "wizards"
    (the renamed TS-escape axis); add the new `isArchwizard` axis.
  - §"The four bootstrap-seeded groups" → **five**: rename `developers`→`wizards`
    (now env-seeded from `WIZARD_PLAYER_IDS`), add `archwizards`
    (`ARCHWIZARD_PLAYER_IDS`, confers wizard status via `wizard grant/revoke`).
  - New section "The code-trust lockdown": the wizard/protowizard partition
    (protowizard = content-write access ∧ ¬wizard, unstored), the direct gated set
    (`class`/`hydratorClass`/`behaviors[].brain`) enforced at `saveTemplate` with
    actor-from-context, the transitive set closed by construction, the D4 folder
    carve-out, the D5 `cp`/`mv` tightening, the D6 `PackLogic`/verb-gate caveat, and
    the drift-guard. **Retire** the "Class-allowlist for content-tree Template
    writes" deferral note (lines 348-351) — this build closes it (note the v2
    curated-catalog relaxation remains deferred).
  - §"narrow-entry pattern" — add the `setWizardMembership`/`WizardController`
    adoption site.
  - HMR notes: rename `developerCacheCancel`→`wizardCacheCancel`, add the archwizard
    cache cancel.
- `docs/subsystems/provenance.md` — correct the **stale** "Until then CMS writes
  are safely unattributed" / cross-worktree note (§"Cross-worktree CMS contract"):
  the `CmsSession.runAsSessionPlayer` → `tagActingAuthor` bridge is wired
  (`backend/CmsSession.ts:68`), so CMS authoring writes are attributed and the
  code-field gate reads the real CMS author.
- `docs/subsystems/templates.md` — note that `saveTemplate` now enforces the
  code-field gate (the "Class Path Validation" section was format-only; add a
  pointer to access.md for the trust gate).
- `docs/story-bible.md` — vocabulary reconciliation: the doc's "wizards" =
  world-building content authors are this build's **protowizards**; "code-trust
  wizards" are the renamed TS-escape axis. Reconcile lines 34, 42-50, 179, 369
  (and confirm "archwizards" at 217, 303 already aligns with the new managed group).
- `CLAUDE.md`:
  - Doc-map `access.md` entry (74) — add the wizard/protowizard axis + code-trust
    lockdown + archwizard chain.
  - The two "how do I gate a staff verb" rows (557-558) — `isDeveloper` → `isWizard`.
  - Module Categories / env table — document `WIZARD_PLAYER_IDS`,
    `ARCHWIZARD_PLAYER_IDS` alongside `STREAMER_PLAYER_IDS`.

Satisfies **AC8**.

---

## Wiring touchpoints easy to miss (checklist)

1. **7 YAML validator refs**, not 2 — eval, reload, config, pack, practice,
   banking/house, banking/reserve (Phase 1).
2. **Cross-package wire rename** — `AuthStatusResponse.isDeveloper` → `isWizard`
   ripples types → client store/App/AccountMenu (Phase 1). Skipping it leaves a
   dead client field.
3. **`WIZARD_PLAYER_IDS` is new env seeding** — the old `developers` group had no
   env seed; mirror `seedStreamersGroup`, not `seedDevelopersGroup` (Phase 1).
4. **Gate call ordering in `saveTemplate`** — after `existing` load, before
   `tpl.save()` (Phase 2). The `existing` diff is the whole mechanism.
5. **`null` acting-author allow** — verify enroll/login/guest/bootstrap still write
   Avatar/lounge templates (Phase 2 test). Forgetting this bricks new-player
   creation.
6. **Migration in `seedWizardsGroup`** — rename the legacy doc, don't re-mint
   (Phase 4).
7. **Controller seed YAML** for `WizardController` — the silent half of the
   affordance+seed pair (Phase 5).
8. **`AuthorMixin` contribution** — `'author/wizard.yaml'` (Phase 5).
9. **Narrow-entry string-keyed policy** for `setWizardMembership` to avoid the
   value-level import cycle (the `forceDestruct`/`DestructController` precedent).
10. **`cp`/`mv` test actor fixups** (D5) and the **retired access.md deferral note**
    (Phase 6).

---

## Stale-fact corrections (audit vs. reality)

1. **Validator blast radius understated.** The audit said "eval.yaml and reload.yaml
   reference the requiresDeveloper validator." Actually **7** YAMLs do (eval, reload,
   config, pack, practice, banking/house, banking/reserve), plus a **client-facing
   `auth.status.isDeveloper`** REST field (`AuthRoutes.ts`) that flows into
   `packages/types` and three client files. Rename scope is larger than "~14 server
   call sites."
2. **CMS attribution bridge is already wired.** provenance.md says CMS writes are
   "safely unattributed until [`CmsSession.runAsSessionPlayer` calls `tagActingAuthor`]."
   That call exists today (`backend/CmsSession.ts:68`), so `getActingAuthor` resolves
   the CMS author and the gate works on the CMS path without new bridge work. The
   doc note is stale and is corrected in Phase 6.
3. **CMS cannot change `class`/`hydratorClass`.** `CmsLogic._writeContent` passes
   `existing.class` / `existing.hydratorClass` (template *creation* is out of scope
   in CMS), so the CMS path's only code-field exposure is `data.behaviors[].brain`.
   The audit framed `class` as gated on the CMS path; in fact it is already
   immutable there. The in-world `write -c` path (user `--class`/`--hydrator`) is
   the real freehand-class surface — matching access.md's documented
   "class-allowlist gap."
4. **`saveTemplate` has structural-verb callers the audit didn't list.** `mkdir -c`
   (`/lib/zone/FolderZone`, member-level), `cp`/`mv` content (copy an existing
   template's class), and the Avatar-provisioning paths (`Login`, `EnrollController`,
   `Application`, guest) all call `saveTemplate` with a class. The gate's allow-ladder
   (D2) + folder carve-out (D4) keep provisioning and `mkdir` working; `cp`/`mv` of
   class-bearing leaves become wizard-only (D5, intentional).
5. **One authoring bypass of `saveTemplate` exists.** `PackLogic` writes
   `PersistApi.save(Collections.Domain, …)` directly; it is already wizard-gated at
   the `pack` verb (D6), so it is not a hole, but the plan documents it rather than
   assuming `saveTemplate` is the literal sole writer.
6. Line-number facts otherwise verified accurate (AccessApi 89-91, AccessLogic
   104-111, AccessRegistry 191-198 / streamer seed 401-436, WriteController 253,
   CmsLogic 188/227/607, Behaved 194/381, TeleportController 51).

---

## Acceptance-criteria → test map

| AC | Phase | Test(s) |
|---|---|---|
| AC1 `isWizard` replaces `isDeveloper`; all code doors gate on `wizards`; non-wizard denied | 1 | AccessRegistry `isWizard`; ConfigController; `requiresWizard`; rename-coverage guard; (live) eval/reload/source-write denial |
| AC2 non-wizard `class`/`hydratorClass`/`brain` write rejected at `saveTemplate` (in-world + CMS); wizard succeeds | 2 | `TemplateLogic.codeGate` (both paths) |
| AC3 protowizard cosmetic-only edit succeeds | 2 | `TemplateLogic.codeGate` cosmetic case |
| AC4 transitive closure holds | 2,6 | code-gate brain delta + `TemplateLogic.transitiveClosure` |
| AC5 drift-guard fails on a new module-resolving field | 3 | `codeNamingDriftGuard` |
| AC6 `archwizards` seeded; `wizard grant/revoke` archwizard-only, toggles `wizards`; non-archwizard denied | 5 | AccessRegistry.archwizard; `requiresArchwizard`; WizardController; (live) grant/revoke |
| AC7 migration preserves existing developer members as wizards | 4 | AccessRegistry.migration |
| AC8 subsystem doc + CLAUDE.md + story-bible reconciled | 6 | docs (reviewed at sweep) |

---

## Cross-references

- Requirements: [wizard-authority-requirements.md](../requirements/wizard-authority-requirements.md)
- Subsystem docs: [access.md](../subsystems/access.md), [templates.md](../subsystems/templates.md),
  [persistence.md](../subsystems/persistence.md), [provenance.md](../subsystems/provenance.md),
  [behavior.md](../subsystems/behavior.md), [grouping.md](../subsystems/grouping.md),
  [call-security.md](../subsystems/call-security.md)
- Project rules: `gated-api-actor-from-context`, Module Categories ([CLAUDE.md](../../CLAUDE.md))
- Deferred seam: [draft-constitution.md](../governance/draft-constitution.md) Art. V (the PM above `archwizards`)

---

### Critical Files for Implementation
- packages/server/src/mud/obj/api/TemplateLogic.ts (the code-field gate at the `saveTemplate` chokepoint)
- packages/server/src/mud/obj/AccessRegistry.ts (rename axis, `WIZARD_PLAYER_IDS` seed, migration, archwizard axis + `setWizardMembership` mutation)
- packages/server/src/mud/api/access.ts + packages/server/src/mud/obj/api/AccessLogic.ts (facade rename `isWizard`, new `isArchwizard` / narrow-entry `setWizardMembership`)
- packages/server/src/mud/obj/command/shell/WriteController.ts (the freehand `--class` surface the gate must cover) and packages/server/src/mud/obj/api/CmsLogic.ts (rename + the `behaviors[].brain` CMS surface)
