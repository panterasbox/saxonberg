# Content packs, wave 4b — the venue packs — implementation plan

**Feature branch:** `design/content-pack-wave-4b` (carries the requirements and this plan; build on it; push every step).
**Requirements:** `docs/requirements/content-pack-wave-4b-requirements.md` (closed scope; D1–D7 and the twelve acceptance criteria are the contract).
**Subsystem baseline:** `content-packs.md` (§ The path pattern — every new row is `<root>/<branch>/…`; the walk rule; the pack table), `employment.md`, `crafting.md`, `retail.md`, `time.md`, `location.md`, `residence.md`.
**Precedent:** the retired wave-4a plan (`git show 7a7807b26~1:docs/plans/content-pack-wave-4a-plan.md`) — same shape, and the same tooling lesson: **a template row's path mirrors its file under `content/`**, and a `class:` reference always takes the module path.

Self-contained: a fresh build agent who has read CLAUDE.md, the requirements and the docs above can execute it top to bottom. Every step leaves the tree green (`pnpm build`, `pnpm test:near`, the lint family) and is a legitimate stopping point (**Stop protocol**). Where this plan decides HOW it says **planner's choice**.

Conventions that bind every step:

- **This is content movement + three graduations + seven class collapses. No new Api, no new `*Logic` method, no new module category, no new kernel mechanism.** D7 is a *test*, not code.
- **Move commits hold ONE move each** (`git mv` stages immediately; stage by name; never `add -A`). Everything that must change *with* the move to stay green rides the same commit.
- **Paths**: a template row lives at the path its file mirrors under `content/`; a locality with >6 rows uses branch subdirs (`/world/lounge/location/bar`); ≤6 stays flat. Source follows the same rule (`src/mud/world/lounge/{thing,idea,location}/`, hearthworks flat). Branch = the class's Stuff lineage — resolve it with the 4a resolver (the scratch script `reorg/branches.py`'s method: walk `extends` to `Thing|Idea|Agent|Location`), never by guess. A `Warren`/`Zone` is an `Idea`; `Offstage`, `Bar`, `Lounge`, `GlassAlley` are `Location`s; `TipJar` (a `Vessel`) and the four composition classes are `Thing`s.
- **Drop-not-migrate, no adopt, no compat.** The drive starts from a dropped `saxonberg_build1`; a row at a pack key the pack did not stamp fails the pack — which is exactly how a half-moved row shows up.
- **Nothing instances `/lib/`**: an extraction leaves a concrete `platform/` class for every template that names it (`lint:instanceable`).
- Per step: `pnpm build`, `pnpm test:near`, the lint family (`gates instanceable imports module-scope pm test-bootstrap arg-kinds topics test-content untitled world-scan thin-forwarder`). The full `pnpm test` runs **once**, at step 8.
- Commit shape: `refactor(paths): …` for moves, `feat(pack): …` for packs, `refactor(<area>): …` for the graduations, `test(pack): …`, `docs(pack): …`.

Three cross-cutting facts, verified against the tree:

- **The lounge today**: `saxonberg-lounge` ships 1 template row (`/stuff/idea/lounge`), 3 msh, 1 setting (`defaultStartLocation: /world/lounge/warren`) and claims `/stuff/idea/lounge` + `/world/lounge`; `world-seed` ships the 23 venue rows under `content/world/lounge/` (incl. `npc/{augie,dave,mara,remy,sloane}`), declares the `lounge` group, claims `/world/lounge` too (→ `kept`), and carries the boot entry `/world/lounge/terminal` (producer). Source: 14 files in `src/mud/world/lounge/` (`Bar`, `CocktailShaker`, `CraftedDrink`, `GlassAlley`, `GradedReceptacle`, `Lounge`, `LoungeMixin`, `LoungeTerminal`, `LoungeWarren`, `Menu`, `NeonSign`, `Offstage`, `TipJar`, `paths`).
- **Hearthworks today**: 12 rows in `world-seed/content/world/hearthworks/` (smithy, cookhouse, cellar, woodshed, forge-floor, business, kitchen-menu, smithy-menu, pantry-chest, npc/smith, npc/cook); source: `SmithyMenu`, `KitchenMenu`, `SealedCellar`. Its rows ride the platform's `/world` claim (no claim of its own — `lint:untitled` is silent, and that is what D2 fixes).
- **The extraction targets**: `Offstage` = `SingletonMixin(PostRegistrationMixin(DetailedMixin(VisibleMixin(Location))))` (a Location with parking semantics — consumers `CollectController`/`TipController` name `TipJar`, not `Offstage`; the cast's `shifts` brains use it by path); `MechanicalMovement` is already a **mixin** (`MechanicalMovementMixin`, registered in `lib/mixin.ts`, documented in `lib/time/Timekeeping.ts`) that merely *lives* under `world/eternal/university-avenue/` — consumers are `Watch`, `AdjustController`, `WindController`; `TipJar = DetailedMixin(Vessel)`; the three menus are thin `CommerceMenu` subclasses; the four composition classes are `<Mixins>(Thing)` with no methods of their own (verify — A23 found only "verb-surface lighting" residue in `Bar`/`LoungeMixin`, which stay).
- **Positions** are rows on a `Business` (employment.md: the org chart lives on the Organization); there is no industry-level position artifact today → per D3's ⚠, hospitality ships **no** position def; the venues keep theirs. Do not invent one.

---

## Step 1 — the graduations: `MechanicalMovement` → `lib/time`, `Offstage` → `lib/employment` + `platform/location/Offstage` (D4)

Commits: `refactor(time): MechanicalMovementMixin lives in lib/time (one move commit)` · `refactor(employment): Offstage graduates — OffstageMixin in lib/employment, the concrete platform/location/Offstage`.

### 1.1 `MechanicalMovement`

`git mv src/mud/world/eternal/university-avenue/MechanicalMovement.ts src/mud/lib/time/MechanicalMovement.ts` (+ its tests to `lib/time/__tests__/`). Repoint the three imports (`Watch`, `AdjustController`, `WindController`) and `lib/mixin.ts` if it imports by path (it registers the name only — check). `Timekeeping.ts`'s doc comment already describes it as the sibling. No behaviour change; `lint:imports` (a `lib/` file importing from `world/` would have been a boundary smell — confirm none remains).

### 1.2 `Offstage`

**Planner's choice** (the requirements allow either): the *parking semantics* become `lib/employment/Offstage.ts` exporting `OffstageMixin` (whatever `Offstage.ts` does beyond composing — read it first; if it is pure composition, the mixin is the composition and the file is a rename), and the *clonable* is `platform/location/Offstage.ts` = `SingletonMixin(OffstageMixin(PostRegistrationMixin(DetailedMixin(VisibleMixin(Location)))))` — the lounge's `offstage` row names `/platform/location/Offstage`. Hearthworks gets its own `offstage` row (D2, step 4) naming the same class — the second consumer. `Mixins.Offstage` + `MixinApi.isOffstage` if a mixin is minted (the `Mixins` registry is the single source of truth for names). Tests: `lib/employment/__tests__/Offstage.test.ts` (parking a cast member off-shift and returning it, two venues, no bleed) — the shape of the existing lounge test if one exists (`grep -rl Offstage src/mud/world/lounge/__tests__`).

*Exit: nothing under `src/mud/world/` defines a mixin; `Offstage` is a platform class.*

---

## Step 2 — the composition classes become commons (D5)

Commit: `refactor(lounge): the composition-only classes are platform commons — CraftedDrink, GradedReceptacle, NeonSign, CocktailShaker, TipJar, one Menu`.

For each of `CraftedDrink`, `GradedReceptacle`, `NeonSign`, `CocktailShaker`, `TipJar`: `git mv src/mud/world/lounge/<X>.ts src/mud/platform/thing/<X>.ts` (+ tests), strip anything lounge-specific (there should be nothing — if a method exists, it either moves with the class as generic behaviour or stays in `LoungeMixin`; **read each file before moving**). `Menu` + `SmithyMenu` + `KitchenMenu` → ONE `src/mud/platform/thing/Menu.ts extends CommerceMenu` (the differing bits were the menu *contents* — data on the rows); delete the three content classes. Every `class:` in content that named `/world/lounge/<X>` or `/world/hearthworks/<Menu>` → `/platform/thing/<X>`; every import follows; `TipController`/`CollectController` import `TipJar` from `platform/thing`. Tests move beside the classes; `lint:test-content` — a moved test that names `/world/lounge/…` is a NEW kernel offender: rewrite it over synthetic fixtures (the point of the move is that the class no longer needs the lounge).

*Exit: `src/mud/world/lounge/` holds `Bar`, `GlassAlley`, `Lounge`, `LoungeMixin`, `LoungeTerminal`, `LoungeWarren`, `paths` (7); `src/mud/world/hearthworks/` holds `SealedCellar` (1).*

---

## Step 3 — the lounge is one pack (D1, D6) — ONE green boundary, two commits

Commits: `refactor(paths): the lounge venue rows move into saxonberg-lounge under branch subdirs (one move commit)` · `refactor(paths): src/mud/world/lounge under branch subdirs; every class: and import follows`.

### 3.1 Content

For each of the 23 rows, resolve the class's branch and `git mv packages/content/world-seed/content/world/lounge/<row>.yaml packages/content/saxonberg-lounge/content/world/lounge/<branch>/<row>.yaml` (NPCs → `agent/<name>.yaml`, dropping the `npc/` dir — the branch IS the grouping). Every path string that named a moved row follows: the rows' own `populates:` / `container:` / `exits`, `LoungePaths.terminal`, the msh scripts (`/world/lounge/…` in `daiquiri.msh` etc.), the setting (`/world/lounge/warren` → `/world/lounge/idea/warren`), `AppSettingFallbacks`? (no — the platform's fallback is the void), the terminus/eternal rows that reference the lounge (`grep -rn '/world/lounge' packages/content`), tests (54 files name `/world/lounge…`; 20 are kernel tests on the allowlist — repoint literals, do not grow the list). Manifest: `saxonberg-lounge` gains the boot entry `/world/lounge/location/terminal` (producer) and its description loses "rooms/NPCs are world-seed's"; `world-seed` drops the `lounge` group, the `/world/lounge` claim, the boot entry, and — if no remaining row references a lounge path — the `saxonberg-lounge` dependency. `lint:untitled`: still covered (the lounge pack's own claim).

### 3.2 Source

`git mv` the 7 remaining lounge files into `src/mud/world/lounge/{location,idea,thing}/` by branch (`Bar`, `GlassAlley`, `Lounge`, `LoungeTerminal`? — `LoungeTerminal extends TpaTerminal`: resolve; `LoungeWarren` → `idea/`; `LoungeMixin` is a mixin → it is substrate: **planner's choice** — it stays at the locality root as `LoungeMixin.ts` (a locality's mixin has no branch), `paths.ts` stays at the root). Module ids follow the files; every `class:` in the moved rows and every import (the 4a import rewriter's rules: relative specs, bare `import '…'`, `readJsonResource(import.meta.url, …)`, `join(HERE, …)`, `new URL(…)`) is re-derived. `lib/paths.ts` has no lounge constants (verified).

### 3.3 Validation at the boundary

`pnpm build`; `test:near` (large — background it with a watcher); the lint family; `git grep -n 'world-seed.*lounge\|content/world/lounge' -- packages` → nothing under `world-seed`.

*Exit: `world-seed/content/world/lounge/` is gone; `saxonberg-lounge` ships 24 rows.*

---

## Step 4 — the hearthworks venue pack (D2)

Commit: `feat(pack): hearthworks — the venue pack (one move commit)`.

`packages/content/hearthworks/{package.json,pack.yaml}` on `trade-smithing`'s shape: `id: hearthworks`, `root: /world/hearthworks`, `dependsOn: [platform, trade-smithing, trade-hearth-cooking, corpo-goodkin]`, `requires.groups: [{ name: hearthworks, purpose: the Hearthworks' staff, owner: { office: prime-minister } }]`, `requires.title: [{ extent: /world/hearthworks, holder: { group: hearthworks } }]`; add `@saxonberg/content-hearthworks` to `packages/server/package.json` + `pnpm install` (lockfile rides the commit). `git mv` the 12 rows from `world-seed` into `content/world/hearthworks/<branch>/` (`location/`: smithy, cookhouse, cellar, woodshed, forge-floor; `idea/`: business, smithy-menu, kitchen-menu; `agent/`: smith, cook; `thing/`: pantry-chest) and add the venue's `location/offstage.yaml` (class `/platform/location/Offstage`; the cast's off-shift parking — wire it the way the lounge's is: the business/shifts reference). Repoint every intra-venue path (`populates:`, `assignee:`, `operatingLocations`, the exits between rooms), the hearthworks tests (`src/mud/world/hearthworks/__tests__`, `world/__tests__/business-authority.test.ts`, `hearthworks-populates.content.test.ts` — extend the latter to walk the new pack), `e2e/tests/drive-crafting.spec.ts` (`startLocation`). `SealedCellar` stays at `src/mud/world/hearthworks/SealedCellar.ts` (flat: 1 file). `PackLogic.discover.test`: twenty packs, `hearthworks` after `trade-hearth-cooking`. `world-seed`'s description loses "hearthworks".

*Exit: `world-seed/content/world/hearthworks/` is gone; a fresh install inserts 13 hearthworks rows.*

---

## Step 5 — `/trade/hospitality` + hearth-cooking's second pass (D3)

Commit: `feat(pack): trade-hospitality — the bar stations, the cocktail recipes, the tip jar; hearth-cooking's second pass (one move commit)`.

`packages/content/trade-hospitality/` on `trade-smithing`'s shape (`root: /trade/hospitality`, `dependsOn: [platform, generic-objects, base-library]`, group `hospitality`, claim `/trade/hospitality`). Moves:

- stations → `content/trade/hospitality/thing/{shaker,mixing-glass,cocktail-glass,back-bar}.yaml` from the lounge pack (3.1 put them under `saxonberg-lounge/content/world/lounge/thing/`; this step lifts the **templates** to the trade and leaves the lounge's `bar` row `populates:` them by the trade path — the smithy precedent). ⚠ `cocktail-glass` is a recipe `outputTemplate` (`daiquiri`, `martini`) → those recipe files follow the path.
- `tip-jar.yaml` → `content/trade/hospitality/thing/tip-jar.yaml` (class `/platform/thing/TipJar`); the lounge's `bar` populates it by the trade path.
- recipes `daiquiri`, `martini` → `content/trade/hospitality/recipes/`; `fine-roast`, `hearty-stew` → `trade-hearth-cooking/content/recipes/`; `git rm -r packages/content/generic-objects/content/recipes` (empty). `RecipeCatalogue` is path-agnostic; the `hearthworks-venues.integration` test's `RECIPE_DIRS` list gains `trade-hospitality`; Dave's Bar tests (`world/lounge/__tests__/Menu.test.ts`, `craft-served-path.test.ts`) read recipes from the hospitality dir.
- bottles stay lounge rows (venue stock).
- `lint:instanceable` invariant 7 gates the `thing/` placement; `lint:untitled` the claim.

*Exit: twenty packs (18 + `hearthworks` + `trade-hospitality`); `generic-objects` ships no recipes.*

---

## Step 6 — seed, don't own: the proof (D7)

Commit: `test(pack): a venue row the DB changed is kept; a file change against an unedited row updates it`.

`src/mud/platform/idea/api/__tests__/PackLogic.venue-ownership.test.ts` on `pack-harness`: install a synthetic venue pack (`world/x/location/bar.yaml` etc.); mutate the stored `bar` row's `data.name` (the owner renamed it); reinstall with the file unchanged → `kept`, the record's baseline hash unchanged, the DB name intact. Second case: change the file, DB untouched → `updated`. Third: both changed differently → `conflict`, DB untouched (already covered by `threeway.test`; assert once here for the venue framing). No installer change — if one is needed, stop: the requirements say the mechanism exists.

---

## Step 7 — both venues park their cast through `Offstage` (AC 7)

Commit: `test(employment): the lounge and the hearthworks park their cast off-shift through one Offstage`.

One test per venue (beside the content): the shift ends → the NPC is in the venue's `offstage` location; the shift starts → back at its post. The lounge test exists in some form (`grep -rn offstage src/mud/world/lounge/__tests__`) — repoint it; write the hearthworks one on its shape.

---

## Step 8 — docs, the one full suite, the drive, the MR

Commit: `docs(pack): content packs wave 4b — subsystem docs`.

- `content-packs.md`: the pack table (twenty rows: `hearthworks`, `trade-hospitality`; `saxonberg-lounge` complete; `world-seed` = eternal + terminus + moor + practicum + substation + common; `generic-objects` minus recipes), § Deferred (wave 5; the bridge; the archetype), Key files, History (wave 4b).
- `employment.md` (`Offstage` — the mechanism, two consumers), `time.md` (`MechanicalMovementMixin` in `lib/time`), `crafting.md` (recipe homes: three industries, none in generic-objects), `retail.md`/`crafting.md` (one `Menu`), `location.md` + `residence.md` + `attendant.md` (the lounge's new paths where named).
- The slate: mark A23's lounge/eternal tables applied (lounge rows) — one line each; do not rewrite the slate.
- Validation: `pnpm build`; the lint family; **one** `pnpm test` (background, watcher on `EXIT:`); `pnpm test:e2e:platform` on a dropped DB.
- The drive (recorded on the MR): drop `saxonberg_build1` (the drop command works — 4a did it seven times); first boot: twenty packs, every row `inserted`, every claim `granted`, `bootstrapped` 40 (+1 if `offstage` rows are boot entries — they are not), no "template not found"; second boot all-zero; `pack status` twenty; as the founder: land in the lounge (`look` names it), `menu` at Dave's Bar lists daiquiri + martini, `goto /world/hearthworks/location/smithy`, `menu`, `look` shows the stations; the cook parked in `offstage` outside shift hours (`goto` there).
- The MR (`create_merge_request` via the GitLab MCP, `design/content-pack-wave-4b` → `master`): what lands · the AC table · the drive · planner's choices (the `Offstage` split, `LoungeMixin` at the locality root, the trade lifting the station *templates* while the venue keeps *instances* by reference, no position artifact) · known gaps.

---

## Acceptance-criteria mapping

| Criterion | Step | Test / verification |
|---|---|---|
| 1. `world-seed` has no lounge, no hearthworks; manifest clean | 3, 4 | `git ls-files`; `PackLogic.discover.test`; `lint:untitled` |
| 2. `saxonberg-lounge` ships the venue + boot entry; fresh install inserted/granted | 3, 8 | drive (1) |
| 3. `hearthworks` pack: 12 (+1 offstage) rows, ordered, inserted; populates test | 4 | `discover.test`, `hearthworks-populates.content.test`, the integration tests |
| 4. `trade-hospitality`; generic-objects no recipes; catalogue serves all | 5 | crafting tests; drive (`menu` ×2) |
| 5. The graduations + collapses; `lint:instanceable` | 1, 2 | build; `lint:instanceable`; the moved tests |
| 6. `src/mud/world/lounge` branch-subdir'd; hearthworks flat | 3 | `git ls-files`; the locality tests |
| 7. Both casts park through one `Offstage` | 7 | the two tests |
| 8. Seed-don't-own test | 6 | `PackLogic.venue-ownership.test` |
| 9. Twenty packs; fresh boot; second boot all-zero | 8 | drive (1)(2)(3) |
| 10. Platform-only e2e green; main e2e not a criterion | 8 | `pnpm test:e2e:platform` |
| 11. Full suite, lints, build; drive recorded | 8 | CI + one `pnpm test` |
| 12. Docs | 8 | doc diff |


---

## Risks & ordering constraints

- **Step 3 is one boundary** (content move + source move); nothing between its two commits is pushable.
- **`LoungeTerminal`'s boot entry** — the TPA network's eager root; if its path is wrong the whole fast-travel cascade never stands up (`bootstrapped` drops). Watch the boot line.
- **The lounge Warren clones `/world/lounge/location/lounge`** by path constant (`LoungeWarren.ts`, `LoungeMixin.applyWarren`); every literal in `world/lounge/**` follows the move — grep, don't assume.
- **Moved tests become kernel offenders** (`lint:test-content`) when a class leaves the lounge; rewrite over synthetic fixtures rather than growing the allowlist.
- **`cocktail-glass` is both a station and a recipe output** — the recipe files move in the same commit as the template (step 5), or the catalogue names a path that no longer exists.
- **No position artifact** — do not mint one for hospitality; the requirements' ⚠ resolves to "the venue keeps them".
- **The DB drop is routine now** (no guard, no adopt): a half-moved row shows as a pack failure at `reconcile` ("no sourcePack stamp") — that is the intended tripwire, not a bug to code around.

## Context budget

| Step | Weight |
|---|---|
| 1 | light (2 moves, 1 new concrete class) |
| 2 | medium (6 moves, 3 deletes, class: repoints) |
| 3 | **heaviest** — 23 + 7 moves, ~54 test files, the manifests |
| 4 | medium (new pack, 12 moves, tests) |
| 5 | medium (new pack, recipe moves, catalogue tests) |
| 6, 7 | light |
| 8 | medium (docs, suite, drive, MR) |

Pace: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Clean handover points: after 2, after 3, after 5.

## Stop protocol

If stopping before step 8, the MR description (or a `§ Build status` block appended to this plan — one or the other) states: the steps done with commit range; the steps not done verbatim, any half-applied move called out as *reverted*; the pack count at HEAD and which of `hearthworks` / `trade-hospitality` exist; which `test:near` scopes ran green at the last boundary and whether the full suite ran; which drive items were exercised; the planner's-choice deviations in the tree.
