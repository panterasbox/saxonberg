# `lib/` vs `obj/` taxonomy — implementation plan

**Artifact:** plan (one build cycle; retired at sweep — `docs/workflow.md` §2).
**Spec:** [`docs/requirements/lib-obj-taxonomy-requirements.md`](../requirements/lib-obj-taxonomy-requirements.md). Every "Surface decision" in it is **settled**; this plan implements them and does not re-open them.
**Read before starting:** the requirements doc, [`CLAUDE.md`](../../CLAUDE.md) (Module Categories, File Naming Conventions, the backing-class-mirrors-template-path convention, the lint family, Import Statement Style), [`architecture.md`](../architecture.md), [`templates.md`](../subsystems/templates.md), [`content-packs.md`](../subsystems/content-packs.md), [`persistence.md`](../subsystems/persistence.md).

---

## 0. What this build is

Restore `/obj/` = instanceable, `/lib/` = substrate-only, on **both axes** — TS class placement *and* template path — and make it checkable by the build. The invariant that becomes literally true: **nothing instances `/lib/`.**

Scale, verified against the tree at plan time:

| Quantity | Count |
|---|---|
| Templates in repo | 828 (758 seeds + 70 pack) |
| Templates whose `class:` resolves under `/lib/` | 410 |
| Distinct `/lib/` class paths named by a template | 76 |
| Existing `lib/` class **files** that move | 68 (+5 authorable-but-unseeded = 73) |
| **New** concrete classes authored (the splits) | 8 |
| `obj/` classes deleted | 5 |
| Template paths under `/lib/` | 324 (254 seeds + 70 pack) |
| Relative imports resolving into `lib/` | ~5,258 |
| `'/lib/…'` string literals in `.ts` | 1,045 across 313 files |
| Markdown files citing a `/lib/` path | 103 |

This cannot land as one commit. It lands as **seven waves**, each of which leaves the tree green.

---

## 1. Verified mechanics you must design around

Do not re-derive these; they were checked at plan time and are load-bearing.

1. **`backend/SeederManager.ts` is insert-only, keyed by `path`.** It inserts a `domain` row only when none exists at that path. The `class:` string lives in the Mongo row, and *that stored value* is what resolves at runtime. Moving a class file therefore breaks every already-seeded row. **Do not make it upsert** (requirements constraint).
2. **`StuffApi.loadClassByPath` (`api/stuff.ts` ~1290)** validates the path (`/obj/`, `/lib/`, `/domain/` only), consults `HotReloadApi`, then `import('..' + path + '.js')` and takes `module[basename] ?? module.default`. So a moved class must keep its **file basename == exported class name** (or a default export).
3. **`class:` and `hydratorClass:` are different axes despite looking alike.** `class` is a **module path** (`loadClassByPath`); `hydratorClass` is a **template path** — `api/stuff.ts` resolves it with `this.singleton(template.hydratorClass)`. Both happen to read `/lib/persistence/PersistentHydrator` today because the class file and the template row mirror each other. Keep them mirrored and the single rewrite table works for both; but **the class axis moves in Wave 2 and the hydrator axis in Wave 3.**
4. **`PackApi`/`PackLogic` reconciles** (`reconcileDomain`): stamped rows whose file vanished are deleted, new paths inserted, unstamped rows at a pack path adopted. Pack `domain` rows therefore self-heal. `PackLogic.readContent` hardcodes `join(pack.contentRoot, 'lib')` — that literal becomes `'obj'`, and both packs' trees move.
5. **All the other seeders are insert-only too** (`ParcelSeeder`, `BlueprintSeeder`, `AppSettingsSeeder`, `ChannelSeeder`, `RecipeSeeder`, `ScriptSeeder`, `EmoteSeeder`). Their rows do **not** self-heal; `parcels.extent: /lib/lounge`, `blueprints.classPath: /lib/banking/PaymentCard`, and an `app_settings` value of `/lib/material/bulk/water` are all durable stale references.
6. **Template paths appear inside `data`, including as object *keys*.** e.g. `slotClaims: { "/lib/body-plans/biped": [torso] }`, `_speciesPath:`, `_materialPath:`, `interiorMaterial:`, `_biomePath:`. The sweep must rewrite keys, not just values.
7. **`lib/paths.ts`** holds `TemplatePaths` (exact) and `TemplatePathPrefixes` (families). Catalogues/registries consume the constants (`AddressRegistry` etc.), so a prefix change is a one-line edit per family — **leaf keys must not change**, or `${prefix}${key}` lookups break.
8. **Folder/leaf invariant** (`TemplateApi.validateFolderLeafSave` via `obj/hooks/DomainHook.ts`): a template may not be saved under an ancestor row that is a *leaf*. Ancestors with **no row** are fine. Every new family root proposed below is either absent (`/obj/Topic`) or a `FolderZone` row (`/obj/Locality`).
9. **`ModuleApi`'s registry is keyed by class *identity*, not name** — a `class NPC extends NPCBase` in `obj/` cannot collide with `lib/npc/NPC`. Same-name splits are safe.
10. **Only 3 `FromModule('/lib/…')` gate strings exist**, all naming classes that stay in `lib/` (`Thing`, `SpatialZone`). Low risk; `lint:gates` is the net.
11. **`SecurityApi.#BOUNDARY_EXEMPT_TEMPLATE_PATHS` are all `/obj/…`** — `lint:boundary` is unaffected by the path moves.
12. **`scripts/__fixtures__/field-meta-golden.json` keys by repo-relative file path** and mentions `lib/` 238 times. CI runs `lint:field-meta` (`--lint`), which scans the tree — **not** `--verify`. Do **not** regenerate the golden: it is a historical codemod proof. `--verify` will report path churn after this build; that is expected and not CI-gating.
13. **The live box (`mud.panterasbox.com`) runs from a git checkout** (`/srv/saxonberg`, `deploy/dev/update.sh` = pull → install → build → `systemctl restart`). Mongo is **Atlas M0**, which has **no automated backups**.

---

## 2. The single source of truth: one move map

Everything mechanical in this build — the file mover, the import codemod, the YAML/TS text sweep, the DB migration, and the lint's own completeness check — reads **one table**.

**File:** `packages/server/scripts/lib-to-obj-moves.ts` (a script asset, outside `src/mud/`, so Module Categories and the export-discipline ESLint rules do not apply).

```ts
export interface MoveRule {
  /** Always starts with "/lib/". */
  from: string;
  to: string;
  /** "exact" = whole-string match; "prefix" = match with the trailing slash. */
  kind: "exact" | "prefix";
  /** Which axis this rule serves — lets a wave apply half the table. */
  axis: "class" | "path" | "both";
  note?: string;
}

export const MOVES: readonly MoveRule[];

/** Longest-`from`-first, exact before prefix. Returns null when unchanged. */
export function rewrite(value: string, axis?: "class" | "path"): string | null;
```

Two properties make this design carry the build:

- **Idempotency is structural.** Every `from` starts with `/lib/`; no `to` does. `rewrite(rewrite(x)) === rewrite(x)`, and a half-migrated DB converges. The requirement "runs against a DB in either state without corrupting rows" falls out of the table's shape rather than out of a flag.
- **One rewrite function, five consumers.** The class axis and the path axis agree wherever a class and its template mirror (`/lib/persistence/PersistentHydrator` → `/obj/persistence/PersistentHydrator`), so the DB migration can apply the *whole* table to *any* string without knowing which axis it is looking at.

### 2.1 Class-axis rules (`axis: "class" | "both"`)

Derive the list mechanically, then hand-check it against §2.3:

```bash
# every /lib/ class path any template names (seeds + both packs)
grep -rhoE '^class: /lib/\S+' packages/server/src/mud/seeds packages/content/*/content \
  | sed 's/^class: //' | sort -u
```

Placement rules (from the requirements — do not extend them):

- **Flat by default:** `obj/<Name>.ts`.
- **Cluster only at the eight named directories.** The table below is **closed**. Where a 9th cluster is tempting (boundary: `Door`/`Window`/`Exit`; material: `Material`/`ConsumableMaterial`/`RadioactiveMaterial`; attendant: `Ticket`/`AttendancePoint`) — **do not create it**. Those land flat.

| Directory | Classes |
|---|---|
| `obj/equipment/` | Armor, Garment, Handcart, Pack, PortableLight, Shield, Weapon |
| `obj/modalities/` | the seven `*Modality` singletons |
| `obj/location/` | CartesianZone, FurnishableRoom, SphericalLocation, SphericalZone (+ the new `Room`) |
| `obj/species/` | BodyPlan, Clade, Species |
| `obj/magic/` | GlowlightOrb, SparkSource, Spell |
| `obj/corpo/` | Brand, BrandedBottle, Corpo |
| `obj/persistence/` | EncryptedStringMarshaller, PersistentHydrator, QuantityMarshaller |
| `obj/sandbox/` | CircleFloor, SandboxCrossing, WireBody |

- **A subclass lands beside its base when the base clustered** — `StunBaton` beside `Weapon` in `obj/equipment/`, `DisguiseGarment` beside `Garment`. `Whetstone` follows `ToolItem` (flat). `ConsumableMaterial`/`RadioactiveMaterial` follow `Material` (flat). `SkyExposedBiome` follows `Biome` (flat).
- **Stays in `lib/`, permanently:** `Shadow` (framework attachment — a *named exception*, documented, not an oversight), `BoundaryAnchor`, `SandboxCrossingExit`, `LightningStrike` (minted, never stamped), `ExitableVessel` (deferred — no `fieldMeta`, no documented authoring path).

### 2.2 The eight splits — new files, not moves

Each is a new, empty concrete subclass in `obj/`; the abstract base **stays put and is not edited**. No behavior changes: existing subclasses keep extending the `lib/` base.

| New file | `extends` (stays in `lib/`) | Absorbs |
|---|---|---|
| `obj/Prop.ts` | `lib/stuff/Thing` | 11 generic-Thing clones |
| `obj/location/Room.ts` | `lib/location/CartesianLocation` | 37 room templates |
| `obj/NPC.ts` | `lib/npc/NPC` | 8 |
| `obj/Vessel.ts` | `lib/stuff/Vessel` | 1 |
| `obj/Exit.ts` | `lib/boundary/Exit` | 2 |
| `obj/Material.ts` | `lib/material/Material` | 24 (pack) |
| `obj/Biome.ts` | `lib/biome/Biome` | 3 (pack) |
| `obj/Corpse.ts` | `lib/creature/Creature` | `/lib/mortality/corpse` |

Five of these shadow their base's name. That is safe (§1.9) but the import must be aliased:

```ts
import { NPC as NpcBase } from "../lib/npc/NPC";
export class NPC extends NpcBase {}
```

Each new file gets a TSDoc header stating *why it exists* (the generic clone target for its substrate base) and pointing at the rule. `obj/Corpse.ts` cross-references [`mortality.md`](../subsystems/mortality.md).

### 2.3 Path-axis rules (`axis: "path" | "both"`) — the complete family table

**The rule:** a template path mirrors its backing class's **file location**, and **leaf names never change**. Only the prefix moves. Three families are content-structural rather than class-structural (their folders are Clades / material families / biome kinds, and their leaves span several classes) and keep their own tree, re-rooted.

| Old template prefix / path | New | Backing class after move | Count |
|---|---|---|---|
| `/lib/messaging/Topic/` | `/obj/Topic/` | `obj/Topic.ts` | 87 |
| `/lib/advancement/Discipline/` | `/obj/Discipline/` | `obj/Discipline.ts` | 41 |
| `/lib/persistence/QuantityMarshaller/` | `/obj/persistence/QuantityMarshaller/` | `obj/persistence/QuantityMarshaller.ts` | 30 |
| `/lib/material/` | `/obj/material/` *(content-structural)* | `obj/Material.ts` + subclasses | 36 (pack) |
| `/lib/species/` | `/obj/species/` *(content-structural)* | `obj/species/{Clade,Species}.ts` | 26 (22 pack + wolf + clades) |
| `/lib/address/` | `/obj/Locality/` | `obj/Locality.ts` | 12 leaves |
| `/lib/address` (the FolderZone row) | `/obj/Locality` | `obj/FolderZone.ts` | 1 |
| `/lib/locomotion/` | `/obj/LocomotionMode/` | `obj/LocomotionMode.ts` | 11 |
| `/lib/magic/Spell/` | `/obj/magic/Spell/` | `obj/magic/Spell.ts` | 9 |
| `/lib/corpo/Brand/` | `/obj/corpo/Brand/` | `obj/corpo/Brand.ts` | 8 |
| `/lib/corpo/Corpo/` | `/obj/corpo/Corpo/` | `obj/corpo/Corpo.ts` | 5 |
| `/lib/corpo/demo/` | `/obj/corpo/demo/` | `obj/corpo/BrandedBottle.ts` | 2 |
| `/lib/biome/` | `/obj/biome/` *(content-structural)* | `obj/Biome.ts`, `obj/SkyExposedBiome.ts` | 9 (pack) |
| `/lib/perception/modalities/` | `/obj/modalities/` | `obj/modalities/*Modality.ts` | 7 |
| `/lib/metabolism/conditions/` | `/obj/Condition/metabolism/` | `obj/Condition.ts` | 8 |
| `/lib/thermal/conditions/` | `/obj/Condition/thermal/` | `obj/Condition.ts` | 3 |
| `/lib/magic/conditions/` | `/obj/Condition/magic/` | `obj/Condition.ts` | 2 |
| `/lib/mortality/conditions/` | `/obj/Condition/mortality/` | `obj/Condition.ts` | 1 |
| `/lib/respiration/conditions/` | `/obj/Condition/respiration/` | `obj/Condition.ts` | 1 |
| `/lib/body-plans/` | `/obj/species/BodyPlan/` | `obj/species/BodyPlan.ts` | 3 |
| `/lib/combat/CombatFormation/` | `/obj/CombatFormation/` | `obj/CombatFormation.ts` | 4 |
| `/lib/civics/Government/` | `/obj/Government/` | `obj/Government.ts` | 4 |
| `/lib/persistence/PersistentHydrator` | `/obj/persistence/PersistentHydrator` | — | 1 |
| `/lib/persistence/EncryptedStringMarshaller` | `/obj/persistence/EncryptedStringMarshaller` | — | 1 |
| `/lib/magic/SparkSource`, `/lib/magic/GlowlightOrb` | `/obj/magic/…` | — | 2 |
| `/lib/zone/FolderZone` | `/obj/FolderZone` | `obj/FolderZone.ts` | 1 |
| `/lib/sandbox/CircleFloor` | `/obj/sandbox/CircleFloor` | — | 1 |
| `/lib/mortality/corpse` | `/obj/Corpse` | `obj/Corpse.ts` | 1 |
| `/lib/lock/Key` | `/obj/Key` | `obj/Key.ts` | 1 |
| `/lib/banking/PaymentCard` | `/obj/PaymentCard` | `obj/PaymentCard.ts` | 1 |
| `/lib/augmentation/AetherImplant` | `/obj/AetherImplant` | `obj/AetherImplant.ts` | 1 |
| `/lib/comms/CommsUpdate` | `/obj/CommsUpdate` | — | 1 |
| `/lib/forum/ForumsUpdate` | `/obj/ForumsUpdate` | — | 1 |
| `/lib/credential/CredentialWalletUpdate` | `/obj/CredentialWalletUpdate` | — | 1 |
| `/lib/lounge` | `/obj/lounge` | `obj/FolderZone.ts` | 1 |

Two entries deserve their reasoning on the record:

- **`/lib/lounge`** is a `FolderZone` *ownership root* seeded into `parcels` (`mud/config/parcels.yaml`, `extent: /lib/lounge`) and matched by `AccessRegistry.resolveSourceFolderZone` against source paths. There is **no `src/mud/lib/lounge/` directory** — the source-tree half of that mapping is already vestigial; the live half is the `parcels` title. It moves to `/obj/lounge` (lowercase — a namespace root, not a class family), `config/parcels.yaml` is edited, and the migration rewrites the `parcels.extent` value.
- **`/lib/address`** is the `FolderZone` parent of the 12 `Locality` leaves, so it must land at `/obj/Locality` to keep the leaves under a folder row (§1.8).

### 2.4 Repo-path rules (not template paths)

A third, small rule set the codemod applies to **file-path strings** in source and tests:

- `packages/server/src/mud/seeds/lib/…` → `…/seeds/obj/…`
- `packages/content/*/content/lib/…` → `…/content/obj/…`

Live examples that will break without it: `obj/__tests__/SpellCatalogue.test.ts`, `obj/api/__tests__/MagicLogic.test.ts`, `domain/lounge/__tests__/bar-content.test.ts`, `domain/eternal/duncan-hall/__tests__/DormHouseplant.test.ts`, `domain/hearthworks/__tests__/hearthworks-venues.integration.test.ts`, `obj/api/__tests__/PackLogic.test.ts`.

---

## 3. Tooling

Three scripts. All under `packages/server/scripts/`, all `tsx`-run, all consistent with the existing family (`check-gate-strings.ts` is the shape reference).

### 3.1 `apply-lib-to-obj-moves.ts` — the codemod (one-shot, retired at sweep)

```
tsx scripts/apply-lib-to-obj-moves.ts --axis=class   [--dry-run] [--report]
tsx scripts/apply-lib-to-obj-moves.ts --axis=path    [--dry-run] [--report]
```

**`--axis=class`:**
1. Build `fileMoves: Map<absOld, absNew>` from the class rules (+ the `__tests__/<Name>.test.ts` sibling of each — 24 of the 68 have one).
2. `git mv` every entry (git records renames; the diff stays reviewable).
3. Walk every `.ts` under `packages/server/src` and `e2e/`. For each **relative** import/export specifier (and dynamic `import()`), resolve it against the file's **old** directory, map the target through `fileMoves`, and re-relativise from the file's **new** directory. Posix separators, leading `./`, **never a `.js` extension** (CLAUDE.md § Import Statement Style).
4. Rewrite `class:` values in every `.yaml` under `src/mud/` and `packages/content/`, and `classPath:` in `mud/config/blueprints.yaml`.
5. Rewrite TS string literals that are class references: the `class:` property in TS object literals, the 2nd argument of `TemplateApi.saveTemplate(`, `loadClassByPath('…')`, and `FromModule(`/`FromController(` gate strings.

**`--axis=path`:**
1. `git mv` seed files per the family table (`seeds/lib/messaging/Topic/*.yaml` → `seeds/obj/Topic/*.yaml`, …) and `git mv packages/content/*/content/lib packages/content/*/content/obj`.
2. Rewrite `hydratorClass:` in every `.yaml`.
3. Rewrite every remaining `/lib/…` string literal in `.ts`, `.yaml`, and `.md` through `rewrite(value, "path")` — including **object keys** in YAML/TS (`"/lib/body-plans/biped":`).
4. Apply the repo-path rules of §2.4.

**`--report`** prints the **residue**: every surviving `/lib/…` literal in the tree, grouped by whether it resolves to an extant `src/mud/lib/<x>.ts`. A residue entry that does not resolve is either a doc typo or a missed rule. Expected legitimate residue: class module ids for classes that stay (`/lib/stuff/Thing`, `/lib/zone/SpatialZone`), **brain module paths** (`/lib/behavior/wary`, `/lib/behavior/idles/*` — brains are a Module Category that lives in `lib/behavior/` and is never template-instanced), and prose.

The codemod is committed for reviewability and **deleted in the pre-merge sweep**; `lib-to-obj-moves.ts` and the migration stay until the live box is migrated.

### 3.2 `check-instanceable-placement.ts` — the new CI lint

**Script:** `packages/server/scripts/check-instanceable-placement.ts`
**npm:** `"lint:instanceable": "tsx scripts/check-instanceable-placement.ts"` in `packages/server/package.json`, plus a root alias `"lint:instanceable": "pnpm --filter @saxonberg/server run lint:instanceable"`.

**Why a script, not an ESLint rule:** the repo is on ESLint 8 *legacy* config, where a local rule needs `--rulesdir`, which breaks editor and ad-hoc `eslint` invocations. `check-gate-strings.ts` documents this precedent; follow it verbatim.

Four invariants, all findings printed then a single non-zero exit:

1. **No template names a `/lib/` class.** Parse every `.yaml` under `packages/server/src/mud/` and `packages/content/*/content/` with the `yaml` package; fail on a top-level `class:` beginning `/lib/`. *This is the requirement's headline gate.*
2. **No template path lives under `/lib/`.** Fail if `src/mud/seeds/lib/` exists or if any pack has a `content/lib/` directory.
3. **Every `class:` resolves** to a real `src/mud/<path>.ts` with a matching named or default export (the `check-gate-strings` resolver, reused) — catches a mistyped move.
4. **Every `hydratorClass:` resolves to a real template row** — a seed file or a pack content file at that path (the `check-boundary-exemptions` trick). This is the axis that would otherwise silently rot, since `hydratorClass` is a *template* path.
5. **No redundant `hydratorClass`** — declared on a template whose `data` is empty or absent. Hydration would be a no-op; the declaration is noise.
6. **No orphaned `data`** — a non-empty `data` block on a template with **no** `hydratorClass`. `clone()` step 5 runs no hydration when it is absent, so every authored key is silently discarded. This is the dangerous direction: invariant 5 catches clutter, invariant 6 catches data loss.

Invariants 5 and 6 need a real YAML parse (`data: {}` inline vs. a block form defeats grep — this is how the pre-existing defect below went unnoticed). Use the `yaml` package, not regexes.

Plus a TS sweep for template authoring in tests: a `class:` object-literal property or a `saveTemplate(_, '/lib/…')` argument. Keep the regexes to those two syntactic forms — a broad "`/lib/` string literal" scan would false-positive on gate strings and brains.

**No exemption list.** Requirements are explicit: deliberate `lib/` residents are not exempted, they are simply never named by a template. If someone needs an exemption, that is a design conversation, not a list edit.

**Wiring:** add to the `lint:` job in `.gitlab-ci.yml` alongside the others, with a one-line comment in the house style:

```yaml
    # Nothing instances /lib/: no template's class: resolves to substrate.
    - pnpm -C packages/server lint:instanceable
```

Also add it to CLAUDE.md's *The lint family* list.

> **Observed gap, not this build's job:** `lint:gates` and `lint:boundary` are documented as CI-gating but are **not** in the `.gitlab-ci.yml` lint job today (verified). Run them locally in the gate set. Adding them to CI is a one-line change the user should decide on separately.

### 3.3 `migrate-lib-to-obj.ts` — the data migration

See §6 for the full design.

---

## 4. Wave plan & commit boundaries

**Framing that matters:** each wave leaves the *tree* green (`pnpm build`, `pnpm test`, `pnpm lint`, every `lint:*`). Only the **merged whole** is deployable — there is no intermediate commit you can ship to a live world, because the code and the DB flip together. Waves are for review, bisect, and CI, not for incremental deploy.

**The gate set** — run at the end of every wave:

```bash
pnpm build && pnpm test && pnpm lint
for g in gates imports boundary module-scope field-meta pm world-scan \
         thin-forwarder does-nothing inert-weapon combat-dynamics; do
  pnpm -C packages/server lint:$g || echo "FAILED: $g"
done
```

### Wave 0 — dead code
**Commit:** `refactor(obj): delete the one genuinely unreferenced class`
Delete `obj/LitterBin.ts` only. It has no template and zero references anywhere, tests included.

**The other four stay.** The plan originally called for deleting five; that rested on a scan matching only `new X(` and template `class:` refs, which saw neither `instanceof` nor imports. Verified reality:

- `obj/instrument/Sextant.ts` — live `instanceof` gate in `obj/command/perception/MeasureAltitudeController.ts`; deleting it breaks `measure altitude`.
- `obj/instrument/Sundial.ts` — same in `MeasureShadowController.ts`; breaks `measure shadow`.
- `obj/Candle.ts` — fixture for 6 test suites (`VisionModality.shadow`, `LightSource`, `Door.light`, `SmellModality`, `Window.integration`, its own).
- `obj/Lamp.ts` — fixture for 5 (`SwitchController`, `AnalyzeLightController`, `VisionModality`, `Window.integration`, its own).

The correct reference check is `grep -rln '\bCandle\b' --include='*.ts'` minus `__tests__` and the class's own file — not a `new X(` scan.

Independent of everything else; do it first so the tree is smaller for every later pass.

### Wave 1 — tooling, no moves
**Commits:**
- `chore(taxonomy): the lib→obj move map`
- `chore(taxonomy): codemod for the lib→obj moves`
- `feat(lint): nothing-instances-lib gate (report-only)`

Land `lib-to-obj-moves.ts`, `apply-lib-to-obj-moves.ts`, and `check-instanceable-placement.ts` **with `EXIT_ON_FINDINGS = false`** — exactly the documented history of `check-gate-strings` ("WARN-only during the sweep; flip at the end of P3"). Report-only is the progress meter: findings go 410 → 0 across Waves 2–3. **Do not wire it into CI yet.**

Add a unit test for `rewrite()` (`scripts/__tests__/lib-to-obj-moves.test.ts`): rule ordering (longest-first, exact-before-prefix), idempotency (`rewrite(rewrite(x)) === rewrite(x)`), and non-matching input returns `null`.

### Wave 2 — the class axis
**Commits:**
- `feat(obj): the eight concrete split classes` — the new files of §2.2, each with its header and, where the base was a clone target for content, a short TSDoc explaining the split.
- `refactor(obj): move instanceable classes out of lib/` — the `--axis=class` codemod output. Big, mechanical, `git mv`-shaped.
- `refactor(obj): repoint every template class: at obj/` — YAML + TS `class:` values, `config/blueprints.yaml`, gate strings.
- `fix(boundary): correct Window's stale class: header` — its header cites `class: '/lib/perception/Window'`, a path that never existed (named acceptance criterion).

Interim state after Wave 2: `/lib/…`-pathed templates backed by `/obj/…` classes. That is fine **inside the branch** — it is only unacceptable as a shipped state, which is why the path axis follows immediately.

At the end of this wave `check-instanceable-placement` invariants 1 and 3 report clean; 2 and 4 still report.

### Wave 3 — the path axis
**Commits:**
- `refactor(seeds): move /lib/ template paths under /obj/` — seed `git mv` + `hydratorClass:` + every path literal + repo-path strings (`--axis=path`).
- `refactor(packs): content/obj/ replaces content/lib/` — both packs' trees move; `PackLogic.readContent`'s `join(pack.contentRoot, 'lib')` becomes `'obj'`; the `fileToTemplatePath` doc comment updates; bump both `pack.yaml` versions (documentation-only — nothing reads them).
- `refactor(paths): TemplatePaths + prefixes follow the seeds` — `lib/paths.ts` in lockstep, plus `Discipline.TEMPLATE_PATH_PREFIX`-style statics and every class's `static templatePath`.
- `refactor(config): parcels + app-settings + char-gen follow the paths` — `config/parcels.yaml` (`/lib/lounge` → `/obj/lounge`), `config/app-settings.yaml`, `config/char-gen.yaml` species paths.
- `refactor(seeds): drop redundant hydratorClass declarations` — the 8 templates in the table below, plus the fix for the one orphaned-`data` template. See §4.1.

#### 4.1 The `hydratorClass` audit

`hydratorClass` is already optional; `clone()` step 5 runs no hydration when it is absent. Two defect shapes exist in the tree today, verified by a YAML parse of all 838 templates:

**Redundant (drop the line) — 8 templates, all stateless singletons:**

| Class | Seed |
|---|---|
| `/obj/HelpCatalogue` | `seeds/obj/HelpCatalogue.yaml` |
| `/obj/RecipeCatalogue` | `seeds/obj/RecipeCatalogue.yaml` |
| `/obj/BulletinBoard` | `seeds/obj/BulletinBoard.yaml` |
| `/obj/CentralBank` | `seeds/obj/CentralBank.yaml` |
| `/lib/comms/CommsUpdate` | `seeds/lib/comms/CommsUpdate.yaml` |
| `/lib/forum/ForumsUpdate` | `seeds/lib/forum/ForumsUpdate.yaml` |
| `/lib/credential/CredentialWalletUpdate` | `seeds/lib/credential/CredentialWalletUpdate.yaml` |
| `/lib/persistence/EncryptedStringMarshaller` | `seeds/lib/persistence/EncryptedStringMarshaller.yaml` |

(Paths shown pre-move; this commit lands after Wave 3's `git mv`, so edit them at their new `/obj/` locations.)

**Orphaned data (pre-existing defect) — 1 template.** `seeds/obj/surface/default-floor.yaml` carries a full `data` block — `shortDescription`, `longDescription`, `surfaceBulk`, a `ground:1` posture slot, a `floor` detail — and declares **no** `hydratorClass`, so none of it would ever apply. Its working sibling `seeds/domain/substation/flooded-floor.yaml` (same `class: /obj/Floor`, same job) does declare it.

It is **inert today**: nothing in the tree clones `/obj/surface/default-floor`, and the `noDefaultFloor: true` opt-out its own comment documents exists nowhere in the codebase — consistent with `obj/Floor.ts`'s header (*"v1 ships no class-level default for 'every Location has a floor'"*). It is a seed for an unshipped feature that would fail silently the moment someone wires it.

**Resolution: add the missing `hydratorClass: /obj/persistence/PersistentHydrator` line.** One line, matches the sibling, changes no runtime behavior (nothing clones it), and satisfies invariant 6. Do **not** delete the seed — the default-floor feature is unbuilt, not abandoned, and deleting content is outside this build's scope.

**Do not drop `hydratorClass` from any template with a non-empty `data` block** (580 of them). Absent means no hydration; it would silently discard authored content.

**Command controllers are already clean** — all 217 are `class:` + `data: {}` with no `hydratorClass`. No change; recorded so the question isn't re-opened mid-build.

Wave 3 is where the folder/leaf invariant could bite. Before committing, sanity-check the new tree:

```bash
# every new template path's ancestors: either no row, or a Zone-class row
find packages/server/src/mud/seeds/obj packages/content/*/content/obj -name '*.yaml' \
  | sed 's|.*/content/obj/|/obj/|; s|.*/seeds/obj/|/obj/|; s|\.yaml$||' | sort
```
and confirm `/obj/Locality`, `/obj/lounge`, `/obj/biome`, `/obj/biome/indoor`, `/obj/biome/outdoor`, `/obj/species/<clade>` are the only ancestor rows, all `FolderZone`/`Clade`/`Zone`-classed.

At the end of Wave 3 all four lint invariants report clean, and `grep -rn 'class: /lib/'` over the repo returns nothing.

### Wave 4 — the migration
**Commit:** `feat(migrate): one-shot lib→obj data migration`
`migrate-lib-to-obj.ts` + `scripts/__tests__/migrate-lib-to-obj.test.ts` (the three required cases). See §6.

### Wave 5 — the gate
**Commit:** `feat(lint): make nothing-instances-lib CI-gating`
Flip `EXIT_ON_FINDINGS = true`; add `lint:instanceable` to `packages/server/package.json`, the root alias, and the `.gitlab-ci.yml` lint job.

### Wave 6 — docs
**Commit:** `docs: lib/ vs obj/ taxonomy`
See §7.

### Wave 7 — verification (no commit unless it finds bugs)
The pre-move-DB boot proof and the drive-it-by-hand proof of §5.3–§5.4.

---

## 5. Order of operations — and why getting it wrong bricks a world

### 5.1 Inside the repo

`class:` values must be repointed **in the same commit sequence as** the class files move (Wave 2), because `pnpm test` clones templates and would otherwise fail to import. Template paths must move **after** classes (Wave 3), because the path map's `to` values are derived from where the classes landed — the mirror convention is the definition of the path map, not an independent choice.

`lib/paths.ts` moves **with the seed files, in the same commit**. It is the TS-side index of exactly those keys; a commit where they disagree is a commit where boot fails.

### 5.2 Against a live database — the hard cut

There is no code state that works against both an unmigrated and a migrated DB. Sequence, on the box:

```
1. mongodump                     # the only rollback Atlas M0 gives you
2. sudo systemctl stop saxonberg # world is down; connections drop (a restart does this anyway)
3. git pull --ff-only            # new code arrives, DB still old
4. pnpm install --frozen-lockfile && build types + client
5. tsx scripts/migrate-lib-to-obj.ts --scan            # audit: what will change, what is unmapped
6. tsx scripts/migrate-lib-to-obj.ts                   # dry-run is the DEFAULT — read the plan
7. tsx scripts/migrate-lib-to-obj.ts --apply
8. tsx scripts/migrate-lib-to-obj.ts --scan            # must report zero mapped /lib/ residue
9. sudo systemctl start saxonberg
```

**Why the server must be stopped for steps 3–8, not merely restarted at the end:**

- Between (3) and (7) the on-disk classes are at `/obj/…` while `domain` rows still say `/lib/…`. A running server that clones anything in that window throws `loadClassByPath: failed to import`. Worse, the old process is still holding the *old* module graph, so it would appear to work until something cold-loads.
- If the new code **boots before** the migration, `SeederManager` inserts a **fresh default row at every new `/obj/…` path**, and because it is insert-only those defaults then sit alongside the old `/lib/…` rows. Any wizard's hand-edit to a moved template is stranded on a row nothing reads, and step (7) hits a destination-collision on every one of the 324 paths. **This is the single most damaging ordering mistake available in this build.**
- `PackApi` reconciles at boot: booting first would delete the pack's `/lib/…` rows and insert `/obj/…` ones, which is *harmless for `domain`* but leaves every durable reference to a pack path (an avatar's species, a bottle's material) pointing at a row that no longer exists — a class of breakage the migration can still fix afterwards, but only if you notice.

**`deploy-dev` must not be clicked for this release.** The CI job does pull → build → restart with no migration step, i.e. exactly the failure above. Do this deploy by hand on the box, or add the migration to the runbook as a manual pre-step. Say so in the MR description.

**Rollback:** `git checkout <pre-merge sha> && systemctl restart` **plus** either `mongorestore` from step (1) or `migrate-lib-to-obj.ts --reverse --apply`. `--reverse` inverts the table; it is an emergency lever for the deploy window only (it cannot know about content authored at `/obj/…` paths after the cut).

### 5.3 The pre-move-DB proof (acceptance criterion)

```bash
# on master
MONGODB_DATABASE=saxonberg_premove AUTH_MODE=test pnpm dev:server   # let it seed, then stop
git checkout <branch>
MONGODB_DATABASE=saxonberg_premove tsx packages/server/scripts/migrate-lib-to-obj.ts --scan
MONGODB_DATABASE=saxonberg_premove tsx packages/server/scripts/migrate-lib-to-obj.ts --apply
MONGODB_DATABASE=saxonberg_premove AUTH_MODE=test pnpm dev:server   # boot clean
```
Pass = zero template-resolution errors in the log and `SeederManager: 0 new templates inserted` on the second boot (proof the migration produced exactly the paths the seeder expects).

### 5.4 Drive it, don't only suite it (acceptance criterion)

Log into the migrated world and confirm, at minimum:
- a **Topic** route — send a `say`/`look` and confirm the message reaches the client through a `/obj/Topic/world.speech.say`-backed descriptor;
- an **equipment item** — `wear`/`wield` something from `/obj/clothes/*` or `/obj/arms/*` (now `obj/equipment/`-backed);
- a **room** — walk between two `/domain/` rooms (now `obj/location/Room`-backed), confirming zone resolution and exits.

Also spot-check a **species** (char-gen dossier lists species from the pack) and a **material** (`analyze`/`measure` on a bulk container), since those are the pack-path references most likely to have been missed.

---

## 6. The migration script

**File:** `packages/server/scripts/migrate-lib-to-obj.ts`
**npm:** `"migrate:lib-to-obj": "tsx scripts/migrate-lib-to-obj.ts"`

### 6.1 Shape

Two layers, deliberately:

```ts
// ── pure planner (exported, no I/O — this is what the tests drive) ──
export interface DocChange { collection: string; id: unknown; before: unknown; after: unknown; touched: string[] }
export interface Collision  { collection: string; field: string; value: string; fromId: unknown; toId: unknown; identical: boolean }
export interface Plan { changes: DocChange[]; collisions: Collision[]; residue: string[] }

export function rewriteDeep(value: unknown): unknown;          // strings, array items, object VALUES and KEYS
export function planCollection(name: string, docs: unknown[], opts): Plan;

// ── thin driver shell ──
// connect (mongodb driver, MONGODB_URI/MONGODB_DATABASE via dotenv) → listCollections()
// → for each: read all docs → planCollection → print or replaceOne({_id}, after)
```

**The script must not import the mudlib.** Use the raw `mongodb` driver. Three reasons: (a) the world cannot boot until the migration has run, so booting it to migrate is circular; (b) writes through `PersistApi`/`PersistenceManager` fire `DomainHook.aroundSave`, whose folder/leaf validation would reject legitimate intermediate states mid-run; (c) `scripts/` is outside `src/mud/`, so `lint:imports` does not apply and the driver import is clean. Say this in the script header — it is the kind of thing a later reader will otherwise "fix".

### 6.2 Modes

| Flag | Behaviour |
|---|---|
| *(none)* | **Dry run — the default.** Prints per-collection counts, a sample of changed documents, every collision, and the residue. Writes nothing. Safer than an opt-in `--dry-run` you can forget on a live box. |
| `--apply` | Performs the writes. |
| `--scan` | Audit only: walks **every** collection returned by `listCollections()` and reports (a) documents containing a **mapped** `/lib/…` string, (b) documents containing an **unmapped** `/lib/…` string, (c) substring-only occurrences (a moved path embedded in a longer string). Run before and after. This is the coverage *proof*, not a guess. |
| `--reverse` | Inverts the table. Emergency rollback only (§5.2). |
| `--collections=a,b` | Limit. |
| `--uri=`, `--db=` | Override env. |
| `--on-collision=abort\|skip\|prefer-source` | Default `abort`. |

### 6.3 What gets rewritten

**Every collection, every document, every string — deeply.** Do not hand-enumerate fields. The requirements' floor (`domain.path`, `domain.class`, `holder_snapshots.scope` + container refs, `parcels`, `chattel` Estate entries) is a *floor*, and the reason is `holder_snapshots.state`: an opaque per-mixin JSON blob in which persistence slices marshal Stuff identity refs **as templatePath strings**, at arbitrary depth. A field-by-field sweep cannot see them. The known-not-obvious carriers, all covered for free by the deep sweep:

- `domain` — `path`, `class`, `hydratorClass`, and `data` (including **object keys** like `slotClaims["/lib/body-plans/biped"]`, `_speciesPath`, `_materialPath`, `interiorMaterial`, `_biomePath`);
- `holder_snapshots` — `scope`, `place`, and everything inside `state`;
- `parcels` — `extent` (`/lib/lounge`);
- `chattel` / `chattel_events` — `EstateEntry.templatePath` and the slice copies inside `holder_snapshots`;
- `blueprints` — `classPath`;
- `app_settings` — the `values` bag (a setting whose value is `/lib/material/bulk/water`);
- `documents` — stored scripts, whose **source text** may embed a path as a substring (`--scan` reports these; the default exact-match rewrite deliberately does **not** touch them — if the scan finds any, fix them by hand or with an explicit, reviewed `--substrings=documents.<field>` pass).

Confirmed **not** affected (checked at plan time, but `--scan` will re-prove it): `transcripts` and the standings ledgers key disciplines by their durable `key` (`'mixology'`), not by path.

### 6.4 Collisions

A `domain` row moving to a path that is already occupied means someone booted the new code before migrating (§5.2) or a prior run was interrupted. Policy:

- destination row is **byte-identical** to the source → delete the source (an interrupted run converging);
- destination row **differs** → `--on-collision=abort` (default) lists every case and exits non-zero without writing. `prefer-source` moves the pre-existing (hand-edited) row over the freshly-seeded default, which is the intent when a wizard's edit is on the source; `skip` leaves both.

Apply the same check to the other path-unique collections (`documents.path`, `parcels.extent`).

### 6.5 Tests — the three named cases

`packages/server/scripts/__tests__/migrate-lib-to-obj.test.ts`, driving the **pure planner** over fixture arrays (no DB — consistent with the repo's DB-free server tests):

1. **Pre-move DB.** Fixtures: a `domain` row `{path: '/lib/messaging/Topic/system.auth', class: '/lib/messaging/Topic', hydratorClass: '/lib/persistence/PersistentHydrator'}`; a `/domain/` room row whose `class` is `/lib/location/CartesianLocation` and whose `data.slotClaims` is keyed by `/lib/body-plans/biped`; a `holder_snapshots` row with a moved path nested three levels inside `state`; a `parcels` row with `extent: /lib/lounge`. Assert every one is rewritten, keys included, and nothing else changes.
2. **Already-migrated DB.** Feed the *output* of case 1 back in. Assert `plan.changes.length === 0` — idempotency proven end-to-end, not just on `rewrite()`.
3. **Hand-edited row at a moved path.** A `domain` row at `/lib/advancement/Discipline/mixology` whose `data.label` differs from the shipped seed. Assert (a) it lands at `/obj/Discipline/mixology` with `data` byte-identical, and (b) a simulated `SeederManager` pass over the new seed tree would find that path occupied and insert nothing — i.e. the wizard's edit survives the move *and* survives the next boot.

Add a fourth for the collision policy (destination occupied + differing) since it is the one path that can lose data: assert `abort` reports and writes nothing.

---

## 7. Doc-update checklist

| Doc | Edit |
|---|---|
| `CLAUDE.md` — Module Categories | The "Stuff class" row's *Where* becomes explicit about the rule: `lib/<subsystem>/` for substrate that is only inherited; `obj/` (flat, or one of the eight clusters) for anything a template's `class:` names. |
| `CLAUDE.md` — File Naming Conventions | Under **Backing-class path mirrors template path**: state that the mirror now holds end-to-end, that a template path never starts `/lib/`, and that `obj/api/*Logic` keeps its module-id ≠ template-path exception. |
| `CLAUDE.md` — The lint family | Add `pnpm lint:instanceable` with its four invariants and the "no exemption list" note. |
| `CLAUDE.md` — MongoDB Collections | No change (no collection added). |
| `architecture.md` § file-structure tree (~line 39) | `lib/` → "Substrate — abstract roots, mixins, value objects, framework attachments"; `obj/` → "Everything instanceable — anything a template's `class:` names". |
| `architecture.md` § *Three flavors of each layer* | The `lib/` list gains a **fourth** flavor: **framework attachments** — objects that attach to a Stuff, model nothing on their own, and are never template-backed. `Shadow` is the exemplar and is named as a **permanent** exception. |
| `architecture.md` (same section or adjacent) | Record `ExitableVessel`'s **deferral** with its reason (no `fieldMeta`, no documented authoring path; it moves when a consumer demands a concrete class), and the "instanced but never *stamped*" carve-out (`BoundaryAnchor`, `SandboxCrossingExit`, `LightningStrike`) — the test is *does an instance carry a template-path stamp*, not *is it ever `new`'d*. |
| `content-packs.md` | The pack tree diagram and the two prose examples: `content/lib/…` → `content/obj/…`; note the format change is **breaking for out-of-tree packs** and that shipped packs need no data migration because the installer reconciles. |
| `templates.md` | The `saveTemplate` example's `'/lib/location/CartesianLocation'` → `'/obj/location/Room'`; the `PersistentHydrator.templatePath` mention; a line in the folder/leaf section noting the new family roots. |
| `persistence.md` | The `PersistentHydrator` / `QuantityMarshaller` / `EncryptedStringMarshaller` template paths. |
| **Every subsystem doc citing a moved path** | 103 markdown files mention `/lib/`; the `--axis=path` codemod rewrites them mechanically. **Read the diff** — some are prose about the `lib/` *source directory* (correct, leave alone) and some are class module ids (unchanged for classes that stay). The heavy hitters: `race.md` (22), `quantities.md` (13), `topics.md` (10), `biome.md` (10), `address.md` (8), `locomotion.md` (6), `metabolism.md`, `combat-formations.md`, `corpo.md`, `boundary.md`, `respiration.md`, `parcel.md`, `sandbox.md`, `light.md`. |
| `mortality.md` | The corpse's backing class is now `obj/Corpse.ts` at `/obj/Corpse`; the forensic-Creature role is unchanged. |
| `parcel.md` / `access.md` | `/lib/lounge` → `/obj/lounge` as an ownership root, and the note that `AccessRegistry.resolveSourceFolderZone`'s source-tree half was already vestigial. |

---

## 8. Risks & mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | **New code boots before the migration**, seeding 324 default rows and stranding wizard edits. The worst outcome available here. | The runbook stops the service *before* `git pull` (§5.2). The migration's collision detection **aborts by default**. Say "do not click `deploy-dev` for this release" in the MR description. |
| R2 | **A durable reference is missed**, silently breaking one object months later. | `--scan` audits **every** collection in the DB (not a hand list) for mapped *and* unmapped `/lib/` strings, before and after. Post-migration mapped-residue must be zero; unmapped residue must be reviewed line by line. |
| R3 | **Rewriting a string that only looks like a path** (prose in a description, a script body). | The rewriter matches **whole strings and whole keys** only; substring occurrences are *reported* by `--scan`, never rewritten, and only touched via an explicit reviewed `--substrings=` pass. |
| R4 | **Atlas M0 has no automated backups**; a bad run is unrecoverable. | `mongodump` is step 1 of the runbook, not an afterthought. `--reverse` is the second lever. |
| R5 | **Import rewrite breaks a cycle-sensitive module** or introduces a `.js` extension. | `pnpm build` (whole-project `tsc`) is the oracle; `pnpm lint` + `lint:imports` back it; the codemod never emits an extension. `architecture.md § Dynamic imports as a cycle smell` — if a new cycle appears, it is a real finding, not codemod noise. |
| R6 | **The `class:` axis silently regresses later** (someone adds a template naming a `lib/` class). | That is precisely `lint:instanceable`, CI-gating from Wave 5, with no exemption list to hide in. |
| R7 | **The `hydratorClass:` axis rots** — it is a template path that *looks* like a class path, so a reviewer "fixes" it wrong. | Lint invariant 4 resolves it against real seed/pack rows; §1.3 is stated in the script header. |
| R8 | **A moved template's leaf key changes**, breaking a `${prefix}${key}` lookup (modalities by sense name, metabolism conditions by toxin tag). | The path rule is *prefix-only, leaves never change*. Grep for `TemplatePathPrefixes.` (16 files) and confirm each consumer still concatenates the same leaf. |
| R9 | **Folder/leaf invariant violated** by a new family root landing under a leaf. | The §4 Wave-3 check; `DomainHook` would also throw at first save, which the pre-move-DB boot proof (§5.3) exercises. |
| R10 | **`git mv` at this scale produces an unreviewable diff.** | Moves and content edits are in **separate commits** (Wave 2 splits the file move from the `class:` repoint; Wave 3 likewise). `git log --follow` and `git diff -M` stay useful. |
| R11 | **`--verify` on the field-meta golden goes noisy** and someone regenerates it, destroying an old codemod proof. | Not CI-gating; called out in §1.12 and in the Wave-6 doc commit. **Do not regenerate.** |
| R12 | **Same-name split classes** (`obj/NPC` extends `lib/npc/NPC`) confuse a reader or a registry. | Registries key by class identity (§1.9). Every split file aliases its base import (`NPC as NpcBase`) and carries a header saying which one it is. |
| R13 | **Out-of-tree content packs break** on `content/obj/`. | Accepted and documented in `content-packs.md` as a breaking format change; no such packs exist today. |
| R14 | A pre-existing **dangling reference** (`/lib/material/wood/pine` appears in a seed but no pack ships it) gets carried across and looks like migration damage. | `--scan` will list it as unmapped-but-rewritten-by-prefix. It is pre-existing; note it in the MR, do not fix it here (no authoring of missing content). |

---

## 9. Acceptance-criteria traceability

| Requirement acceptance criterion | Delivered by |
|---|---|
| No file under `mud/seeds/lib/`; no `content/lib/` in either pack | Wave 3; lint invariant 2 |
| No `.yaml` has a `class:` beginning `/lib/` | Wave 2; lint invariant 1 |
| New CI-gating lint, no exemption list, wired into the same script set | §3.2; Waves 1 + 5 |
| `pnpm build` / `test` / `lint` / every `lint:*` pass | the gate set, every wave |
| Migration exists, dry-run, idempotent, 3 tests | §6; Wave 4 |
| A dev DB seeded before the move boots clean after | §5.3; Wave 7 |
| Verified by driving (Topic, equipment, room) | §5.4; Wave 7 |
| Docs updated (CLAUDE.md, architecture.md, content-packs.md, subsystem docs) | §7; Wave 6 |
| `lib/boundary/Window.ts`'s stale `class:` header corrected | Wave 2 |
| 8 redundant `hydratorClass` declarations dropped; the orphaned-`data` template resolved; both directions gated | §4.1; lint invariants 5 + 6 |
| `Shadow`'s permanent residency + `ExitableVessel`'s deferral recorded in `architecture.md` | §7 |

---

## 10. Explicitly out of scope

No behavior changes. No `api/`↔`lib/` reshuffling. No `domain/` reorganization. No new module categories — **if a moved file doesn't fit one of CLAUDE.md's categories, stop and ask; do not invent one.** No authoring of the missing templates for `Window`, `HaulingCreature`, `SphericalLocation`, `SphericalZone`, `Ticket` — they move without seeds. No new subsystem doc. No `SeederManager` upsert. No 9th `obj/` cluster.

**Rejected alternative, recorded so it isn't re-proposed:** leaving re-export shims at the old `lib/` paths so the code could deploy before the migration. It would keep `class: /lib/…` resolving — which is the exact loophole `lint:instanceable` exists to close — and would still need a second deploy window to remove. One cut, one window.

---

## 11. Critical files

- `packages/server/scripts/lib-to-obj-moves.ts` *(new — the move map; the spine every other piece reads)*
- `packages/server/scripts/migrate-lib-to-obj.ts` *(new — the data migration)*
- `packages/server/scripts/check-instanceable-placement.ts` *(new — the CI gate; model on `check-gate-strings.ts` + `check-boundary-exemptions.ts`)*
- `packages/server/src/mud/lib/paths.ts` *(`TemplatePaths` + `TemplatePathPrefixes` — must move in lockstep with the seeds)*
- `packages/server/src/mud/obj/api/PackLogic.ts` *(`readContent`'s `contentRoot/lib` → `obj`, and the reconcile that makes pack rows self-heal)*
- `packages/server/src/mud/api/stuff.ts` *(`loadClassByPath` ~1290 and the `hydratorClass` singleton resolve ~394 — the two axes)*

---

## 12. What actually happened (written during execution)

Five things the plan got wrong or did not anticipate. Recorded because
each is a general lesson, not a one-off.

**The two axes are not separable.** §4 promised each wave independently
green. False. For the marshallers, the hydrator, `Key`, `FolderZone`
and others, the class path and the template path are the SAME string,
so moving the class without the template leaves live references
pointing at a template that has not moved. 31 tests failed exactly that
way. Waves 2 and 3 landed as one commit.

**Deriving a class path from a template prefix is the bug this
refactor exposes.** Two independent instances, both silent:
`AddressRegistry` computed `${TemplatePathPrefixes.address}Locality`
and `MaterialLogic.boot` filtered on
`tpl.class.startsWith('/lib/material/')`. Both were accidentally
correct only while a class and its template family shared a directory.
Neither threw — the address trie just stayed empty and every material
was skipped at boot. **Anywhere a prefix constant is concatenated to
reach a class, check it by hand; the compiler cannot.**

**The material cluster is load-bearing, and §2.1 was wrong to forbid
it.** `MaterialLogic` filters on the directory, so flat placement broke
material standup entirely. `obj/material/` is a ninth cluster, added
for that reason.

**A codemod must not rewrite its own inputs.** The sweep rewrote the
move map (turning every `from` into its own `to`), its tests, and this
plan. A `SELF` exclusion list exists now. Related: the path-axis regex
originally matched inside relative import specifiers —
`'../lib/material/Channel'` contains `/lib/material/` — which required
a lookbehind rejecting a preceding `.`, `/`, or alphanumeric.

**Grep-shaped reference checks under-report.** Wave 0 originally
deleted five classes on the strength of a scan matching `new X(` and
template `class:` refs. Four were live: two were `instanceof` gates on
shipped verbs, two were fixtures for eleven test suites. Only
`LitterBin` was genuinely dead. The right check is
`grep -rln '\bName\b' --include='*.ts'` minus tests and the class's own
file.

---

## 13. The e2e pass (written during execution)

Running the browser suite was the single highest-value verification
step, and it is the one the plan did not call for. It found three
migration bugs no unit test could reach, because none of them boot a
world and a dry run never writes:

- the migration ignored `MONGODB_DATABASE` and happily migrated `test`,
  reporting success;
- `rewriteDeep` rebuilt every object it walked, turning an `ObjectId`
  `_id` into `{buffer: {…}}` — Mongo rejected the write;
- an identical collision was reported and then left alone, so the stale
  source row survived carrying its old `/lib/` class and boot died on
  `failed to clone '/domain/void'`.

**Comparing failure counts across databases is invalid.** An early
comparison of a migrated month-old DB against a freshly seeded one
manufactured six phantom "regressions". Apples-to-apples — both fresh —
the refactor causes **zero**. Always fix the database state before
attributing a test failure to a code change.

It also surfaced a real product bug that predates this build: `chat`
from inside a sandbox circle died on the first field-scoped recipient.
Fixed here (see the boundary exemption note in `api/security.ts`), and
worth recording as the class of thing only a live client finds.

**Known-red, order-dependent.** Two specs mutate persistent world state
and depend on position: `work-drive` and `hinkley:163`. Both pass
alone. `startLocation` applies only when a character is CREATED
(`Application.provisionTestCharacter`), so a fixed handle keeps the room
the previous spec left it in — and rewriting the template row does NOT
move it, because an Avatar is snapshot-backed and restores its recorded
`place`. The live object is the only thing that decides where `enter`
finds you.
