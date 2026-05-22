# Spawn substrate + Avatar persist-back — Requirements

This document is the **input** to a planning agent. The planner reads this, reads the source slates and subsystem docs cited below, then produces an implementation plan (shaped like `docs/plans/activity-plan.md`) that a build agent can execute.

**Output expected from the planner**: `docs/plans/spawn-substrate-plan.md` — a full implementation plan with file-by-file changes, waves, test specifications, and answered design questions from this doc's "Open questions for the planner" section.

This is the **second** of the two substrate builds carving out of `docs/slates/declarative-content-slate.md`. The first (spatial+boundary, shipped in commit `b9afbaa`, retired plan + requirements in `6d01214`) covered the structural field shapes: `coords` / `focus` / `exits` (instruction) / `attachedHosts`. This build covers the **spawn shape** — `container:` as an instruction field on `ContainableMixin`, `PopulatesMixin`, and the Login adjunct — **plus** the minimal Avatar persist-back that takes the Login change from same-session-only to across-restart. Together with the prior build, this closes the declarative-content slate's substrate and removes the "Avatar persist-back is NYI" caveat from the slate's Adjacent section.

The persist-back addition is bounded but real: `Avatar.save()` / `Avatar.restore()` public methods, snapshot all of the Avatar's `persistentFields` chain (plus a derived `data.container` for the live container ref), wire auto-save into the logout/linkdead path, add a periodic auto-save backstop. The architecture is elegant because the per-player Avatar template doc at `/obj/Avatar/<playerId>` already serves as the persistence anchor — save writes back to that doc; the existing clone-from-template flow IS restore for the across-restart case. The slate's rejection of any per-Avatar `savedLocation` field still holds: the existing `data.container` instruction field IS the saved-location seam, just now bidirectional.

**Divergence from the slate (read this first).** The slate puts `container:` at the **top level** of the Template doc (alongside `path`, `class`, `hydratorClass`, `data`), justifying the carve-out by "the field has to be readable BEFORE the instance exists." This requirements doc instead puts `container:` **in `data:`** as an instruction field on `ContainableMixin`, exactly parallel to how `exits:` is an instruction field on `ExitableMixin`. The "pre-clone read" argument dissolves once you accept that hydration's Phase 2 auto-placement is the substrate (clone verb hydrates first, routes after; Login reads the live ref). The slate's "Decisions log" entry — "Field name for clone destination default: `container` (top-level on Template doc)" — and the "**Top-level on the doc, not inside `data:`**" section under § `container:` on Template are superseded by this doc. The slate is the design history; the requirements doc is the build agreement; when the build retires and the subsystem docs are updated, the slate's "Once shaped into formal requirements" entry will be brought into alignment.

## Source slates and subsystem docs

The planner MUST read these before drafting:

- [`docs/slates/declarative-content-slate.md`](../slates/declarative-content-slate.md) — design authority for `container:`, `PopulatesMixin`, the Login adjunct, the precedence stack, and the "no content-shaped Apis" constraint. The "Once shaped into formal requirements" section near the bottom enumerates what this build ships. **Read the "Divergence from the slate" note in this doc's header first** — the slate's top-level-on-Template-doc framing for `container:` is superseded by the instruction-field-in-`data:` shape; everything else from the slate carries through unchanged.
- [`docs/subsystems/templates.md`](../subsystems/templates.md) — Hydrator contract, the folder/leaf invariant, the two-phase dispatch (Phase 1 `setX` property fields; Phase 2 `applyX` instruction fields). This build adds new instruction-field consumers on existing mixins; **no Template doc structural change**.
- [`docs/subsystems/spatial.md`](../subsystems/spatial.md) — `Containable` / `Container` chokepoint, `ContainmentApi.move`. `PopulatesMixin` calls `move` for placement.
- [`docs/subsystems/lifecycle.md`](../subsystems/lifecycle.md) — construction sentinel, `postRegister`, `PostRegistrationMixin`. The slate sometimes describes `applyPopulates` as firing in `postRegister` and sometimes as firing in Hydrator Phase 2; planner resolves which (see Open Question §1).
- [`docs/subsystems/persistence.md`](../subsystems/persistence.md) — `Persistable`, `persistentFields`, `Hydrator`, around-save/delete hooks. The spawn-shape side doesn't change this subsystem, but the persist-back side does: Avatar gains a `save()` method that calls into `PersistenceManager`, and a `restore()` method that re-enters the Hydrator against an existing in-memory instance. Planner identifies the right Api surface for each.
- [`docs/subsystems/connection.md`](../subsystems/connection.md) — login flow, `Login.enter()`, the avatar handoff, disconnect choreography. Two changes here: (1) Login.enter reads the avatar's live container; (2) avatar.save() is hooked into the logout/linkdead destruct path.
- [`docs/subsystems/state-model.md`](../subsystems/state-model.md) — what gets persisted; Avatar self-contained; persist-back direction marked NYI. This build promotes Avatar persist-back from NYI to "minimal v1 shipping" — snapshot persistentFields back to the per-player template doc; restore via re-hydration. The state-model doc gets updated accordingly.
- [`docs/subsystems/hot-reload.md`](../subsystems/hot-reload.md) — `HotReloadApi`. `PopulatesMixin` must compose cleanly under class-swap re-fire.
- [`docs/subsystems/mixins.md`](../subsystems/mixins.md) — `_mixinName` marker, `Mixins` registry, `MixinApi.hasMixin` and `isX` predicates. Dispatch in `applyPopulates` uses `MixinApi.hasMixin(templateClass, Mixins.Singleton)`.
- [`docs/ref-shapes.md`](../ref-shapes.md) — Pattern A vs B vs C. The `container:` *YAML declaration* is a Pattern A path string (resolved during hydration). The runtime `container` ref on Containable is Pattern B (live; existing — not added here). The two shapes coexist cleanly: hydration reads the Pattern A declaration and produces the Pattern B live state.
- [`CLAUDE.md`](../../CLAUDE.md) — project conventions (module categories, file naming, member privacy, inter-stuff contract, "Go Through the API Layer"). New mixin file name has no `Mixin` suffix (`Populates.ts`, not `PopulatesMixin.ts`).

## Scope

A single coherent substrate build across **four subsystems** — `stuff` (`PopulatesMixin` + `ContainableMixin.applyContainer` + `Avatar.save`/`Avatar.restore`), `templates` (singleton-target validation), `connection` (Login.enter live-ref read + auto-save hook), `persistence` (re-entry into Hydrator for restore; per-player template write-back). After this build, every behavioral guarantee from the declarative-content-slate's "Once shaped into formal requirements" section is shipped, and the Adjacent section's "across-restart degraded" caveat is removed (within v1 persist-back scope: persistentFields round-trip; inventory does not).

**Tangible completion criterion (spawn shape)**: a content author can author a Containable with `container: /some/singleton-location` in its `data:` block and a separate Container with `populates: [/path/a, /path/b]` also in `data:`, have the populates dispatch correctly between singleton and non-singleton entries on lazy hydration, have `applyContainer` self-place the Containable into the declared container during its own hydration (idempotent against existing-container state), have the `clone` verb's destination resolution defer to that hydration-time self-placement (with explicit `--into`/`--here` overriding and inventory-fallback catching the unplaced) — all without writing any TypeScript and without any new framework substrate beyond what's listed here.

**Tangible completion criterion (persist-back)**: a player logs in, takes some actions that mutate their avatar's persistent state (changes settings, walks to a new room, etc.), logs out. The auto-save fires during the disconnect choreography, snapshotting the avatar's persistentFields chain (including the derived `data.container` from the live container ref) back to the per-player template doc. On next login (even across server restart), the avatar clones from the now-updated template and `applyContainer` places them in the saved location with their saved field values intact. The periodic-save backstop runs every N minutes during an active session as crash protection. The `avatar.save()` and `avatar.restore()` public methods are callable from anywhere (eval, future verbs, tests).

### In scope (~18 deliverables across stuff + spatial + templates + connection + persistence)

**Stuff subsystem** (`packages/server/src/mud/lib/stuff/` and `lib/spatial/`):

1. **`PopulatesMixin`** — new class at `lib/stuff/Populates.ts`. Composes on `Container` (you can only populate a Container). The mixin file follows the naming rule: exported function `PopulatesMixin()`, marker `_mixinName = 'PopulatesMixin'`, filename `Populates.ts`. Declares `static instructionFields = ['populates']` (instruction field — no paired getter; `populates` is a declaration consumed to produce side effects, per the `feedback_property_vs_instruction_fields` memory). Exposes `applyPopulates(specs: string[]): Promise<void>`. For each entry: lookup the template's class via `TemplateApi.getClassFor(path)`; dispatch via `MixinApi.hasMixin(templateClass, Mixins.Singleton)`:
   - **Singleton source**: `StuffApi.singleton(path)`. If the returned instance already has a non-null container (per `getContainer()`), skip — the singleton lives elsewhere and that's intentional.
   - **Non-singleton source**: `StuffApi.clone(path)`.
   - Move the resulting instance into self via `ContainmentApi.move(instance, this)`.
   - Cycle protection: inherited from `StuffApi.clone`'s existing `#inFlightClonePaths` set.
   - v1 entries are paths only; richer entry shapes (`{ template, count }`, etc.) are deferred per slate.
   - Per declarative-content-slate § `PopulatesMixin` + `populates:`.

2. **`ContainableMixin.applyContainer`** — extend the existing Containable mixin at `lib/spatial/Containable.ts` with the instruction-field surface that makes `container:` work like `exits:`. Add `static instructionFields = ['container']` (verify Containable doesn't already declare other instruction fields; if it does, append). Add `applyContainer(path: string): Promise<void>`:
   - Idempotency: if `this.getContainer() !== null` (some other mechanism — explicit clone-verb override, `populates:` parent, etc. — already placed this instance), no-op. The live-ref state IS the source of truth.
   - Resolve target: `await StuffApi.singleton<Container>(path)`. Singleton-shaped: a `container:` value must resolve to a unique Container instance (the slate's singleton-target constraint).
   - Place: `await ContainmentApi.move(this, target)`. The existing `setContainer` chokepoint handles invariants.
   - Per declarative-content-slate § `container:` on Template, adjusted for the in-`data:` shape per this doc's header divergence note.
   - **No paired `getContainer(path)` accessor for the declaration** — the live `getContainer()` returning the runtime `Stuff & Container | null` ref is the only getter; the declared path is consumed and discarded (instruction-field shape).

3. **`Mixins.Populates` registry constant** — add `Populates` to the `Mixins` constants object in `lib/mixin.ts`. Single source of truth for the mixin name.

4. **`Mixins.Singleton` registry constant** — verify a `Mixins.Singleton` constant exists for use by the dispatch in `applyPopulates`. If `SingletonMixin` doesn't yet have a registry constant, add one. (Planner reads code to confirm whether this is net-new or already present.)

5. **Unit tests for `PopulatesMixin`** — `lib/stuff/__tests__/Populates.test.ts`:
   - Dispatch correctness: singleton-shaped template → `singleton()`; non-singleton → `clone()`.
   - Singleton-already-elsewhere skip: pre-place a singleton in another container; `applyPopulates` invokes it; instance not moved.
   - Cycle protection: A populates B, B populates A; first lazy resolution does not infinite-recurse and surfaces a diagnostic from the existing `#inFlightClonePaths` guard.
   - Idempotency / re-apply: calling `applyPopulates` a second time with the same specs handles existing-state correctly (singletons stay where they are; non-singletons re-clone fresh — slate confirms this is the v1 behavior, fire-and-forget per restart).
   - Composition: a `Container` host with `PopulatesMixin` correctly fires through the Hydrator's instruction-field dispatch path (planner determines exact integration point per Open Question §1).
   - Interaction with `applyContainer`: a non-singleton child with `container: /default` that is brought in by a parent's `populates: [/child]` ends up in the parent (not in `/default`) — verifying the double-move outcome (`applyContainer` places in `/default`; `applyPopulates` moves to parent) lands correctly. For singleton children with the same setup, the existing-container skip prevents the move.

6. **Unit tests for `ContainableMixin.applyContainer`** — `lib/spatial/__tests__/Containable.test.ts` (extend existing):
   - Happy path: a Containable template with `data.container: /test/target-container` self-places on hydration; instance ends up in `/test/target-container`.
   - Idempotency on already-placed: pre-place the instance manually before applier runs (or via the Hydrator's pre-Phase-2 state); `applyContainer` no-ops.
   - Unresolvable target: `data.container: /nonexistent`; throws with diagnostic naming both source and target paths.
   - Non-singleton target: `data.container: /multi-instance-container`; throws (the singleton-target constraint).
   - Re-applicability: calling `applyContainer` twice with the same path is idempotent; with different paths after the first placement is also idempotent (first placement wins per existing-container check).

**Templates subsystem** (planner identifies exact paths):

7. **Singleton-target validation for `data.container`** — when a Template doc is saved with a `container` key in `data:` (i.e., the template composes `ContainableMixin` and declares `container:`), verify the target path resolves to a singleton-shaped Container. Planner identifies the existing template-save validation seam and the right surface to inject this check. Slate says "Validated against singleton constraint at template-save time"; the constraint applies to **the target value**, not the declaring template — multi-instance source templates may declare `container:` (it's fallback-only for them, per slate). On violation, throws with diagnostic naming both the source template path and the offending target path.

8. **`environment` → `container` cleanup in `CloneController.ts` and `clone.yaml`** — the existing `clone` verb has TBD comments and code references to `template.environment` at `packages/server/src/mud/obj/command/CloneController.ts:13`, `:14`, `:165`, `:170`, and the header docstring. With the in-`data:` shape, **CloneController stops reading the field by name at all** — destination resolution defers to hydration's `applyContainer` self-placement. The cleanup removes the TBD stubs and reshapes the precedence flow per deliverable #9. Header docstring updated to describe the new "hydrate first, then route" flow.

9. **`CloneController` destination-resolution refactor** — replace the current "resolve destination, then clone, then move" structure with a "clone first, then route" structure:
   1. Clone the template via `StuffApi.clone(templatePath)`. During hydration, Phase 2 fires `applyContainer` if `data.container` is declared — the instance self-places (idempotent against any pre-placement).
   2. After hydration completes, apply the precedence stack:
      - **Layer 1 (explicit caller override)**: if `--into X` or `--here`, call `ContainmentApi.move(instance, X)` (or `giver.getContainer()` for `--here`). This overrides any self-placement that happened during hydration.
      - **Layer 2 (hydration result)**: if the instance ended up in a container during hydration (because `data.container` was declared), accept that placement — no additional move.
      - **Layer 3 (fallback)**: if the instance is still uncontained after hydration AND the verb has no explicit override, move into the giver's inventory.
   - The "resolve destination before clone" flow is gone; the verb no longer peeks into the doc for placement hints.
   - Diagnostics: when Layer 1 overrides a hydration-time self-placement, the verb's output mentions where the override moved from (UX polish; planner picks the message).

**Connection subsystem** (`packages/server/src/mud/obj/Login.ts`):

10. **`Login.enter()` consults the avatar's live container ref** — replace the current hardcoded `DEFAULT_STARTING_LOCATION_PATH` lookup at `packages/server/src/mud/obj/Login.ts:73-79`. The new shape uses the existing live ref (no path-shaped accessor needed):
    ```ts
    let startingLocation = avatar.getContainer();
    if (!startingLocation) {
      startingLocation = await StuffApi.singleton<Location>(DEFAULT_STARTING_LOCATION_PATH);
      avatar.teleport(startingLocation, { silent: true });
    }
    // If avatar already has a container (placed during hydration by applyContainer
    // from data.container on the Avatar template), leave them there. No re-teleport
    // is needed; the welcome scene fires from wherever they are.
    ```
    The slate's pseudocode (which used `getContainerPath()`) is superseded by this shape; the live ref is the truth. **Across-restart now works**: v1 persist-back (deliverables #12-16) means the avatar's `data.container` is updated on logout/periodic-save to reflect their current location, so the next login's clone-from-template lands them where they last were. The Avatar template's authored `data.container: /some/starting-location` only matters at first login (before any save has happened); after that, save-back is the source of truth.

11. **Tests for `Login.enter` starting-location resolution** — `obj/__tests__/Login.test.ts` (or wherever Login tests live; planner picks):
    - Avatar has container from hydration: avatar's template declared `data.container: /test/dorm`; hydration placed the avatar; `Login.enter` reads the live ref; no fallback fires.
    - Avatar has no container (no declaration, or unresolvable): `getContainer()` returns null; falls through to `DEFAULT_STARTING_LOCATION_PATH`.
    - `DEFAULT_STARTING_LOCATION_PATH` fallback teleports silently (welcome scene fires; no movement narration).

**Avatar persist-back** (`obj/Avatar.ts`, `api/player.ts`, connection disconnect choreography, persistence):

12. **`Avatar.save(): Promise<void>`** — public method on `Avatar` (or on `PlayerApi` with Avatar as delegated owner — planner picks; lean is method on Avatar with thin PlayerApi pass-through if needed for security gating). Snapshots all of the avatar's `persistentFields` chain back to the per-player template doc:
    - For each field name in the chain (computed via `Persistable.getPersistentFieldsChain(this)` or equivalent — planner identifies), read the runtime value via the field's getter or direct read, marshal via the field's `static fieldMarshallers` entry if declared (per `docs/subsystems/quantities.md`'s marshaller pattern), and write to `template.data[fieldName]`.
    - **Derived `data.container` from live ref**: the live container is a Pattern B ref not in `persistentFields`. Save explicitly captures `getContainer()?.getTemplatePath() ?? null` and writes to `template.data.container`. (When persist-back ships, the existing `applyContainer` instruction-field substrate handles the read side on next clone; save just needs to produce the right declaration.) If the container is null, write null or delete the key — planner picks.
    - **Instruction fields skipped in v1**: fields like `populates`, `exits`, `attachedHosts`, `coords` are declarations the Template was authored with; gameplay doesn't typically mutate these. v1 doesn't snapshot them. (Future: snapshot from derived runtime state if/when gameplay-driven changes need to survive.) The container is the lone exception because Avatar movement is the load-bearing v1 case.
    - Persist via the existing `PersistenceManager.save(template)` (or equivalent — planner identifies the right Api call on `TemplateApi` or `PersistenceManager`).
    - Throws on persistence failure; caller decides whether to retry or log.

13. **`Avatar.restore(): Promise<void>`** — public method that re-applies the current template doc state to the existing in-memory Avatar instance:
    - Re-fetch the latest template doc for this avatar (`Avatar.getTemplatePath(playerId)`).
    - Re-enter the Hydrator on the existing in-memory instance with the fresh `data:` payload. Phase 1 setters fire (overwriting current field values); Phase 2 appliers fire (`applyContainer` moves the avatar to wherever the template now says, idempotency permitting — actually for restore we want a *move*, not a no-op-if-already-placed, so `applyContainer`'s idempotency may need refinement, or restore needs to clear container first then re-apply; see Open Question §12).
    - Distinct from a fresh clone: this operates on an existing Stuff instance with an existing `stuffId`, preserving identity. Useful for "revert my session changes" semantics and for testing.
    - Throws on template-doc fetch failure or hydration failure.

14. **Auto-save on logout / linkdead** — wire `avatar.save()` into the connection-disconnect / linkdead choreography described in `docs/subsystems/connection.md`. Per the doc map, the avatar destructs when the last connection drops (cf. Avatar header docstring: "Lifetime: cloned when a player connects, destroyed when the last connection drops"). Save MUST fire before the avatar destructs (so the snapshot reads the live state, not the post-teardown shell). Planner identifies the exact hook (likely a pre-destruct event on `Events.StuffDestructed` filtered to Avatar, an `onLinkdead` witness, or a step in the existing disconnect handler in `Backend` / `ConnectionApi`).

15. **Periodic auto-save backstop** — every N minutes, the active avatar's `save()` fires asynchronously. The interval is exposed as a **setting** with a reasonable default (lean: 5 minutes / 300_000 ms). Planner picks the setting key per project convention (likely under a `world.autosave.*` or `world.persist.*` namespace, schema declared per `docs/subsystems/shell-environment.md`'s schema-on-mixin pattern); per-Avatar override falls out naturally from the `resolveSetting` lookup chain. Resolved once at timer-install time (post-login wiring); changes to the setting mid-session don't restart the timer in v1 (future enhancement if needed). Timer lifecycle:
    - **Start**: when the avatar is bound to an interactive (post-login; in the same flow where `Login.enter` fires).
    - **Stop**: when the avatar destructs (or when all connections drop, in concert with auto-save-on-logout).
    - **Concurrent saves are acceptable**: no in-flight coordination flag. If the periodic timer fires while a manual or logout-triggered save is mid-flight, both proceed independently. Each save reads avatar state atomically (JavaScript is single-threaded; the synchronous persistentFields walk completes before any await yield), so each write reflects a valid snapshot. Last-write-wins on Mongo. The wasted work (occasional duplicate snapshot + write) isn't load-bearing enough to justify the coordination machinery. Cross-process coordination is explicitly out of scope.
    - **Mechanism**: planner picks. Options: existing `SchedulerApi` (per `docs/subsystems/activity.md`) if it's not still inert, `setInterval` (simple but doesn't compose with HMR / shutdown), or a small in-house scheduler. See Open Question §13.
    - **Error handling**: a failed periodic save logs the error and continues the timer; doesn't crash the session.

16. **Tests for persist-back round-trip** — `obj/__tests__/Avatar.test.ts` (or wherever Avatar tests live):
    - **save() snapshots all persistentFields**: instantiate avatar via clone; mutate several persistentField values (settings keys, properties, etc.); call `save()`; re-fetch template from MongoDB; verify each field's value matches the in-memory state.
    - **save() captures container derivation**: avatar in `/room-A`; call `save()`; template's `data.container` now equals `/room-A`.
    - **restore() re-applies template state**: mutate field X in-memory; revert template doc to a known prior state; call `restore()`; verify in-memory field X now matches the template.
    - **restore() moves avatar via `applyContainer`**: avatar in `/room-A`; update template's `data.container` to `/room-B`; call `restore()`; verify avatar's live container is now `/room-B`.
    - **Across-restart simulation**: clone avatar → mutate state → save → destruct avatar → re-clone from template → verify new instance has saved state.
    - **Auto-save fires on linkdead**: simulate disconnect; verify save was called; verify template doc on disk reflects pre-disconnect state.
    - **Periodic save fires on cadence**: install fake timer; advance N minutes; verify save was called; advance again; verify save called again; destruct avatar; advance again; verify save NOT called (timer cleanup).

**Integration test**:

17. **Spawn substrate end-to-end fixture test** — a small fixture exercising the full substrate:
    - One singleton template (e.g., a unique sword) with `data.container: /test/treasury`.
    - One singleton Container at `/test/treasury` (composes `SingletonMixin`).
    - One non-singleton template (e.g., a generic potion) — no `data.container` declaration.
    - One Container at `/test/library` with `data.populates: [/test/sword, /test/potion]`.
    - On `StuffApi.singleton('/test/library')`: lazy-clone unfolds; library's `applyPopulates` fires. Sword: singleton check returns it (it may already have been cloned via its own `data.container` declaration if anything else touched it first; the singleton path handles either order). Library's move sees sword has no container yet (or has treasury as container) — planner resolves the precise order per Open Question §5.
    - `clone --template /test/sword` (no `--into`, no `--here`) — hydration's `applyContainer` lands the sword in `/test/treasury`; verb's Layer 2 accepts; no fallback.
    - `clone --template /test/potion` (no `--into`, no `--here`) — no `data.container`; hydration doesn't self-place; verb's Layer 3 lands the potion in the giver's inventory.
    - A `populates:` cycle (`/test/a` populates `/test/b` populates `/test/a`) trips the cycle guard with a diagnostic.
    - A `container:` cycle (`/test/x.data.container: /test/y` and `/test/y.data.container: /test/x`) — verify the existing `#inFlightClonePaths` cycle guard catches this through the `applyContainer → singleton(other) → applyContainer` recursion.

**Documentation updates** (rolled into the build, not separate deliverables):

18. **Subsystem doc updates** — at minimum:
    - `docs/subsystems/templates.md` — clarify that all wiring metadata, including `container:`, lives in `data:`; remove any prior framing that suggested top-level fields beyond `path`/`class`/`hydratorClass`/`data`. Note the per-player Avatar template's bidirectional usage (template-as-persistence-anchor).
    - `docs/subsystems/spatial.md` (the containment section) — add `applyContainer` to the Containable surface; add `PopulatesMixin`; document the singleton-vs-clone dispatch; document drift behavior dependency on persist-back. Or carve a new `docs/subsystems/containment.md` if the spatial doc has gotten too big — planner judges.
    - `docs/subsystems/connection.md` — Login.enter live-ref-reading behavior; the auto-save-on-disconnect wiring; the periodic-save backstop; the Avatar-template-`container:` interaction.
    - `docs/subsystems/state-model.md` — promote Avatar persist-back from NYI to v1: persistentFields round-trip via `Avatar.save()`/`Avatar.restore()`; container is derived from live ref; inventory NOT in v1 scope. Document what gets persisted vs what regenerates from template defaults on each clone.
    - `docs/subsystems/persistence.md` — document the Hydrator re-entry path used by `Avatar.restore()` (whatever shape the planner lands on); document `PersistenceManager` template-write-back for the save path (or confirm existing surface already handles it).
    - `docs/subsystems/bootstrap.md` — clarify content-is-lazy-loaded and the bootstrap manifest is engine-services-only. (May already be done in the spatial+boundary build; planner verifies and only updates if needed.)
    - `CLAUDE.md` antipattern table — add any freshly-cemented patterns from this build, especially "don't read `template.container` from a verb; let hydration do it" and "use `avatar.save()` / `avatar.restore()`, never reach into the template doc directly from gameplay code."
    - `docs/slates/declarative-content-slate.md` — at retire time, the slate's "Decisions log" entry and "Top-level on the doc, not inside `data:`" section get updated to reflect the resolved shape; the Adjacent section's "persist-back gating" note gets updated to reflect that v1 persist-back ships in this build. (Slate update is not a deliverable of THIS build; it's a follow-on at slate-retire time, consistent with how prior builds handled slate alignment.)

### Out of scope (with reasons)

- **Eternal University content (YAML seeds for Duncan Hall and beyond)** — substrate ships here, but no actual `/domain/eternal-u/` content authoring. Content is its own work, lands in a separate effort, and (per `feedback_no_api_for_content`) is YAML + bootstrap, not code.
- **`DEFAULT_STARTING_LOCATION_PATH` change** — even if Eternal U eventually wants the default to point at an Eternal U location, that's a content/configuration call, not substrate. Leave the constant pointing at whatever it currently points at; revisit when Eternal U content ships.
- **Character-creation hook for placing new freshmen** — also content-side. Mentioned in the slate's Adjacent section ("the freshly-forked avatar in the initial location via normal `teleport` / `ContainmentApi.move`"). The hook itself lives wherever the character-creation flow lives; this build does not design or implement it.
- **Inventory persist-back** — what the avatar is carrying does NOT round-trip in v1. The avatar's contents (held items, equipped gear, posture, mounted vessel, etc.) regenerate from the per-player template's `populates:` / authored defaults on each clone. Reason: nested-container serialization is a meaningfully bigger feature (every contained item is itself a Stuff with its own state, possibly with its own nested contents). Future build. Scenario B from the slate (welcome packet staying with player across restart) doesn't fully work in v1; it works partially (the packet's container update on the player's body doesn't survive restart, but the packet itself respawns via the dorm's `populates:`).
- **Per-field opt-out from persist-back** — v1 snapshots all of Avatar's persistentFields. Some fields might want to opt out (e.g., session-only state that shouldn't round-trip). Future refinement; out of v1.
- **Save-as / named saves / save-history** — v1 has one save slot per avatar: the per-player template doc. No "save game 1, save game 2" or revision history.
- **Save-back for non-Avatar Stuff** — only Avatar gets `save()`/`restore()` in v1. The mechanism is general enough to extend (a future `PersistableStuff` mixin could expose the same surface), but the v1 build doesn't generalize beyond Avatar.
- **`clone` verb redesign / new verb options** — the existing `--into`, `--here`, fallback shape is locked. This build only fills in step-3 and renames the term; no new options, no new shorthand.
- **Save / restore as player-facing commands** — public methods on Avatar are the v1 surface. Verb spec (YAML view + controller) is deferred; can layer on later as a `player save` / `player restore` subcommand pair or its own verbs.
- **Reset / respawn substrate** — Open Question §10 in the slate; deferred to its own slate / build. v1 `PopulatesMixin` is fire-and-forget.
- **Multi-room / facade targets for `container:` (the Lounge case)** — Open Question §11 in the slate; Phase 2 problem; ship without; flag in docs as a known limitation.
- **Boot-time content ref-resolution CLI** — Open Question §12 in the slate; deferred dev-ergonomics affordance.
- **Richer `populates:` entry shapes** (`{ template, count }`, conditional spawns) — v1 is path strings.
- **Zone-template `populates:` ("default content for this zone")** — slate Open Question §7; deferred.
- **In-game runtime editor for content shape** — out of any near-term substrate slate.
- **Topology / spawn migrations** — restart-with-reset-doc is the dev workflow; no migration framework.

### Deliberately preserved as design reference, not implemented

- **`postRegister` cascade narration for HMR** — `PostRegistrationMixin` re-fires on class swap. `applyPopulates`'s idempotency comes from the existing-container check and `#inFlightClonePaths`; the build verifies but does not extend HMR semantics.
- **Persist-back of `populates` spawned children** — slate Open Question §10 notes this as the seam reset/respawn will need. Don't pre-bake; leave the path open.

## Open questions for the planner

The planner must resolve these before producing the plan. Some require reading code; some require small design calls. None should reopen the slate's design.

1. **Hydrator Phase 2 vs `postRegister` timing for `applyPopulates` and `applyContainer`** — The slate is internally inconsistent on `populates`. The body says `applyPopulates` is an instruction-field method called by Hydrator Phase 2 dispatch; Scenario A says "PopulatesMixin's postRegister cascades child content." Read `packages/server/src/mud/lib/persistence/PersistentHydrator.ts` (or wherever Phase 2 dispatch lives — likely added in the spatial+boundary build) and `lib/stuff/PostRegistration.ts`. Resolve for **both** new appliers in this build:
   - Does Phase 2 instruction-field dispatch fire during hydration (before `postRegister`) or after?
   - Is `applyPopulates` / `applyContainer` invoked directly by Phase 2, or does a mixin's `postRegister` call them?
   - If Phase 2 dispatches directly, neither mixin may need to compose `PostRegistrationMixin` at all. Confirm.
   - **Ordering question specific to this build**: when a Container with `populates: [/child]` hydrates, in what order do (a) the Container's own `applyPopulates`, (b) the child's `applyContainer` (during child's hydration triggered by `applyPopulates`'s clone call), and (c) any other instruction-field appliers fire? Document the order so the integration test in deliverable #12 can be written deterministically.
   - Pick a shape; document the choice and reasoning.

2. **Template-save validation seam for the singleton-target check** — Where does Template doc validation currently live? `TemplateApi.save`? A sibling? Does it already validate other field shapes inside `data:`? The planner identifies the right place to inject the `data.container` target validation and documents the surface (sync vs async; how diagnostics are surfaced; what makes a target "singleton-shaped" — `MixinApi.hasMixin(targetClass, Mixins.Singleton)` or some stronger gate).

3. **`MixinApi.hasMixin(templateClass, Mixins.Singleton)` — Template's class vs instance** — The dispatch in `applyPopulates` checks the source template's class. Verify that `TemplateApi.getClassFor(path)` is the right call (or whatever the equivalent is) and that `MixinApi.hasMixin` accepts a class constructor argument. If the API only works on instances, the planner identifies an alternative (e.g., walk the mixin manifest on the class without instantiating).

4. **`applyContainer` / `applyPopulates` re-fire semantics under HMR** — A class swap re-fires `postRegister` (per `docs/subsystems/hot-reload.md`). If the new appliers run via `postRegister`, they'll fire again on swap. The idempotency story: `applyContainer`'s "already in a container" check covers it cleanly. `applyPopulates` for singletons skips correctly; for non-singletons, would re-clone — unwanted. Resolve: (a) Phase 2 dispatch fires only during initial hydration, not on class swap, dissolving the question; (b) appliers track "I already ran this lifecycle" via a runtime flag; (c) the existing `#inFlightClonePaths` guard happens to cover it. Planner reads code and picks.

5. **Async Hydrator dispatch** — `applyPopulates` and `applyContainer` are both async (`await StuffApi.singleton/clone`). The spatial+boundary build (commit `b9afbaa`) had to handle async instruction-field appliers (`applyExits` calls `singleton` for cross-references). Verify the Hydrator does in fact `await` instruction-field applier returns; if it does, this is "no new framework substrate." If it doesn't, the planner identifies the small fix.

6. **`Login.enter` interaction with hydration-time self-placement** — If the Avatar template declares `data.container: /some/location` and `applyContainer` places the avatar during hydration, by the time `Login.enter` runs, `avatar.getContainer()` already returns the target. The pseudocode in deliverable #10 leaves the avatar there (no re-teleport). Verify this is correct:
   - Does the welcome scene / `system.connection.established` payload need a teleport event to fire correctly, or does it fire from wherever the avatar happens to be?
   - Is there any pre-existing assumption in the connection subsystem that the avatar arrives at the starting location via `teleport`? Search `packages/server/src/mud/obj/Login.ts` and `connection.md` for relevant invariants.
   - If a silent teleport-to-current-container is needed for scene-emission purposes, the pseudocode shifts slightly (always teleport, even when already there).

7. **`container:` vs `populates:` order in the conflict case (slate § Open Question §5)** — When a Containable declares `container: /A` and Container `/B` declares `populates: [/that-containable]`, who wins? Slate's locked policy: "first to fire moves the singleton; second no-ops via existing-container check." With the in-`data:` shape and Phase 2 dispatch, the ordering is determined by which hydration runs first:
   - If `/B` hydrates first, its `applyPopulates` clones the child (or fetches the singleton). The child's hydration includes `applyContainer(/A)`. If `applyContainer` runs *before* `applyPopulates`'s subsequent `move(child, /B)`, the child ends up in `/A` momentarily, then moved to `/B`. Net: child in `/B`. For singletons: `applyPopulates`'s existing-container check sees the singleton in `/A` and skips; net: singleton in `/A`.
   - If the child hydrates first (e.g., touched via a different path), `applyContainer(/A)` places it; later `applyPopulates` from `/B` runs the existing-container check; singleton stays in `/A`.
   - So **the policy can flip for non-singletons depending on hydration order**, but `applyPopulates`'s `move` always overrides for non-singletons. This may be acceptable (non-singletons land where their last mover put them) or may need clarification. Planner verifies and documents the practical resolution.

8. **`PopulatesMixin` / `ContainableMixin` composability with existing mixins** — Does `lib/spatial/Container.ts` already participate in any class-side compositional pattern that would conflict with `PopulatesMixin`? Does `lib/spatial/Containable.ts` already declare `static instructionFields`? Verify no name collisions and that the extensions land cleanly.

9. **`Stuff.getTemplatePath()` interaction with singleton-already-elsewhere skip** — The dispatch in `applyPopulates` resolves a *template* path string to a class. For the singleton-already-elsewhere skip (`if (instance.getContainer() !== null) continue;`), the slate uses the live ref. Confirm that's correct for the case where `singleton(path)` returns an instance that *was* placed correctly by a prior parent (or by its own `applyContainer`) during the same hydration cascade.

10. **`Persistable.getPersistentFieldsChain` (or equivalent)** — Does an Api method already exist to walk the `static persistentFields` chain across a class's mixin composition and return the merged field list? Read `lib/persistence/Persistable.ts` (and the Hydrator) to find out how the existing hydration path enumerates fields. If yes, `Avatar.save()` uses it; if no, this build needs to either expose it or use the Hydrator's existing internal enumeration (which planner identifies).

11. **`PersistenceManager.save(template)` surface for Avatar write-back** — Read `lib/persistence/PersistenceManager.ts` and `api/template.ts`. Today, templates are seeded into `domain` and read by the clone pipeline. Is there an existing write-back surface (e.g., `TemplateApi.save(template)`, `PersistenceManager.persist(template)`), or is template-doc mutation a new pattern this build introduces? If existing, use it. If new, planner identifies the right shape (likely a thin wrapper around the Mongo `replaceOne` call by templatePath, mirroring the seeder's insert path).

12. **`applyContainer` idempotency vs `restore()`'s expected move semantics** — `applyContainer`'s v1 idempotency check is "if `getContainer() !== null`, no-op." But `restore()` against a moved-elsewhere template needs to actually MOVE the avatar to the new container. Two options:
    - (a) `restore()` clears the avatar's container before re-hydrating (`ContainmentApi.move(this, null)` or equivalent), so `applyContainer` sees a null container and re-places. Clean but introduces a transient null state.
    - (b) `applyContainer`'s behavior diverges by call-site: idempotent during normal hydration; force-move during restore. Requires a flag or different code path; muddies the substrate.
    - (c) `applyContainer` always moves (compares current container path to declared; no-op only if they match exactly). Slightly more expensive but most semantically correct; might collide with `populates:` parent's overriding move.
    - Planner picks; documents the choice. Lean: (a) or (c), with (c) preferred for substrate cleanliness.

13. **Periodic-save scheduler mechanism** — `SchedulerApi` per `docs/subsystems/activity.md` is the substrate framework's scheduler. The doc says "Wave 1 ships the substrate inert" — read the current state to determine if SchedulerApi is fit for purpose here, or if it's still on the substrate side without a usable consumer surface. If usable: use it. If not: a small `setInterval`-based timer on the Avatar (cleaned up in destruct) is acceptable for v1, with a note pointing forward at SchedulerApi adoption when it lands. Planner picks and documents.

14. **Periodic-save interval source — resolved as setting.** Originally framed as constant-vs-setting; reviewed to setting. Planner picks the exact key (likely `world.autosave.interval` or `world.persist.interval`), declares the schema per the schema-on-mixin pattern in `docs/subsystems/shell-environment.md`, resolves via `resolveSetting(avatar, key)` at timer-install time, and documents the default (5 minutes / 300_000 ms). Per-Avatar override falls out of the lookup chain; mid-session setting changes don't restart the timer (acceptable v1 limitation).

15. **In-flight save coordination — resolved as no coordination needed.** Auto-save-on-logout, periodic save, and manual `avatar.save()` calls can race. Originally specified with a single-process in-flight flag (skip if already saving); reviewed out at requirements time. Reasoning: each save reads avatar state atomically (JS single-threaded; the synchronous persistentFields walk completes before any await), so each write is a valid snapshot, and Mongo's last-write-wins resolves the order. The flag would only avoid duplicate work (one extra snapshot walk + write) — not correctness. Not worth the substrate. Cross-process coordination is separately out of scope (per architectural constraints).

16. **Restore against an actively-multiplexed avatar** — multiple connections can share one Avatar (per the multiplexing pattern in `docs/subsystems/connection.md`). A `restore()` call mutates field values that other connections may currently be observing. What's the safe ordering? Lean: `restore()` is a developer/admin operation and the multiplexed-session case is rare enough that v1 doesn't add coordination; if connections observe inconsistent state during a restore, that's acceptable. Planner confirms or flags.

17. **Save on construction-sentinel boundary** — `avatar.save()` reads field values; during `postRegister` or other construction-time hooks, the avatar's state may not be fully settled. Auto-save fires when the avatar is well-formed (post-login, in steady state) — confirm the construction sentinel is closed by then. Planner verifies the timing.

18. **`User` doc participation** — the User in `lib/identity/User.ts` is a Persistable with `persistentFields = ['googleProfileId', 'playerIds']`. Does the User doc need any change for persist-back? Lean: no — the per-player Avatar template is the storage; User's `playerIds` already lists what Avatars exist; no User-side change. Planner verifies no schema migration on User is required.

## Acceptance criteria

The build is **done** when all of the following hold:

- [ ] All 18 deliverables ship and pass their tests.
- [ ] `pnpm test` passes across the monorepo with no regressions in stuff, spatial, templates, connection, or persistence tests.
- [ ] `pnpm build` succeeds.
- [ ] `pnpm lint` passes.
- [ ] `docs/subsystems/templates.md`, the containment portion of `docs/subsystems/spatial.md` (or new `containment.md`), `docs/subsystems/connection.md`, `docs/subsystems/state-model.md`, `docs/subsystems/persistence.md`, and `CLAUDE.md` (if any antipattern entries are added) are updated.
- [ ] The integration test (deliverable #17) — a small fixture exercising `populates:` dispatch, `applyContainer` self-placement, the clone verb's hydrate-then-route flow, and both cycle guards — passes end-to-end.
- [ ] `Login.enter`'s test triad (avatar placed by hydration, no container falls back, fallback teleports silently) passes.
- [ ] Avatar persist-back tests (deliverable #16) all pass: save round-trip, container derivation, restore re-applies, restore moves via applyContainer, across-restart simulation, auto-save-on-linkdead, periodic save cadence + cleanup, in-flight collision handling.
- [ ] `CloneController` no longer references `template.environment` or `template.container` by name; destination resolution defers to hydration's `applyContainer` self-placement plus the precedence stack in deliverable #9.
- [ ] `Avatar.save()` and `Avatar.restore()` are public methods callable from `eval` and tests; they go through any security gating standard for Avatar-side mutations (planner confirms).
- [ ] Auto-save fires during the disconnect/linkdead choreography BEFORE the avatar destructs; periodic save runs on the documented cadence during an active session and stops cleanly when the avatar destructs.
- [ ] No content (YAML seeds for actual game locations) is added in this build. No changes to `DEFAULT_STARTING_LOCATION_PATH`. No new framework substrate beyond what's listed above. **No top-level addition to the Template doc** — every wiring field lives in `data:`. **No inventory persist-back** — only Avatar's own persistentFields chain plus the derived container.
- [ ] The "Open questions for the planner" section above is answered in the plan doc (or deliberately deferred with a stated reason).

## Architectural constraints (load-bearing — DO NOT compromise)

The planner and the build agent must hold these rules. They are documented in CLAUDE.md and the related feedback memories but worth restating:

- **Content has no Api class.** This build is substrate, not content; there should be no temptation to add `EternalUApi`, `FreshmanApi`, or any per-content helper. Per `feedback_no_api_for_content`.
- **No new registries.** This build does NOT introduce any registry singletons. `Mixins.Populates` is a single constant added to the existing `Mixins` constants object; that's a name in an existing registry, not a new one. Per `feedback_no_premature_registries`.
- **No new substrate beyond what's listed.** Specifically, all of the following were rejected during slate iteration and remain rejected: `LoginRoutingRegistry`, per-Avatar `savedLocation` field, `WiringSynthesizer`, dep extractor, `BootstrapAction` interface, `seedOnlyFields` flag, `initialContents` field, content participation in login. Don't re-introduce any of them.
- **Content is lazy-loaded.** This build does NOT add content templates to the bootstrap manifest. The manifest stays engine-services-only. `PopulatesMixin` works by triggering lazy clones via `StuffApi.singleton`/`clone`, never by enumerating content at boot.
- **Substrate handles configuration; content provides values, never participates in subsystem logic.** Per `feedback_substrate_no_content_hooks`. Login does not know about Eternal U or any other content subdivision. Login reads the avatar's container; the content layer set that container via normal containment ops (or via `container:` on the Avatar template, hydrated by this build's own substrate).
- **Instruction field vs property field — distinct shapes.** Both new wiring fields in this build are **instruction fields**: `populates` (`applyPopulates(specs)`, no `populates` accessor on the runtime instance) and `container` (`applyContainer(path)`, no `container` *path* accessor — the live `getContainer()` ref is the runtime surface, returning the resolved live container, not the declared path). Per `feedback_property_vs_instruction_fields`.
- **No top-level Template doc structural change.** Every wiring field — `container:`, `populates:`, `coords:`, `focus:`, `exits:`, `attachedHosts:` — lives in `data:`. The Template doc's top level remains `path`/`class`/`hydratorClass`/`data`. This is a deliberate departure from the slate's "one exception to everything-in-`data:`" carve-out for `container:`; see this doc's header divergence note. **Do not re-introduce the top-level shape.**
- **Field naming.** `container` (not `environment`, not `containerPath`, not `_containerPath`). The YAML key inside `data:` is plain `container`; the cleanup in `CloneController.ts` and `clone.yaml` removes all `environment` references and does NOT replace them with `container` reads — the verb no longer reads the field by name. Per `feedback_template_path_field_naming` — public surfaces use the bare conceptual name, no `Path`/`TemplatePath` suffix.
- **Mixin file naming.** `lib/stuff/Populates.ts` (no `Mixin` suffix on the filename). Exported function is `PopulatesMixin()`. Internal marker `_mixinName = 'PopulatesMixin'`. Per CLAUDE.md § File Naming Conventions.
- **`Mixin` placement.** `PopulatesMixin` lives in `lib/stuff/` because spawn shape is a stuff-subsystem concern (the canonical home for substrate cross-cutting Stuff lifecycle/composition). Do NOT create a `lib/mixins/` folder. Per CLAUDE.md.
- **`ContainableMixin` extension stays in place.** The new `applyContainer` method goes on the existing `lib/spatial/Containable.ts` mixin — not a new mixin file. The runtime `_container` live-ref state and `getContainer()` / `setContainer()` API surface stay exactly as they are; we're only adding instruction-field surface for declarative seeding.
- **Don't span beyond stuff + spatial + connection + templates + persistence.** Boundary, zone, hot-reload, mixins subsystems are NOT touched in this build. Spatial gets a small extension to `Containable.ts` (one new method + one new static field), nothing else. Persistence is touched by `Avatar.save()` (template-doc write-back) and `Avatar.restore()` (Hydrator re-entry); the changes are additive (Api surface used by Avatar; no `Persistable` substrate redesign). The `clone` verb edits live in `mud/obj/command/` (the existing controller's home), not a subsystem expansion.
- **Avatar persist-back v1 is scoped — don't sprawl.** Save snapshots Avatar's `persistentFields` chain plus the derived container; that's it. Don't add: inventory serialization, per-field opt-out, save slots, save-as, save versioning, snapshots-of-other-Stuff. All are future builds. The substrate is general enough to extend later but the v1 surface is exactly two public methods on Avatar (`save` / `restore`), one wiring hook (disconnect), one timer (periodic backstop).
- **No new Stuff-side persistent state for save mechanism.** No `lastSavedAt`, no `saveVersion`, no `isDirty` flag on Avatar. The avatar's per-player template doc IS the saved state; comparing the live state to the template doc is the source of truth, not derived "dirty"-tracking fields.
- **`StuffApi.destruct` + `onDestruct` witnesses** — if any test fixture or scenario needs to clean up Stuff, use `StuffApi.destruct(obj)`. Never override `destroy()`. Per `project_destroy_hook_naming`.
- **Inter-Stuff contract.** Methods, not field access. `instance.getContainer()`, not `instance._container`. Per CLAUDE.md § Inter-Stuff Contract.

## What the planner produces

A plan document at `docs/plans/spawn-substrate-plan.md` (or planner's choice of filename matching `*-plan.md` precedent) containing:

- Resolved answers to each "Open question for the planner" item, with citations to code/docs that informed the answer.
- A file-by-file breakdown of what changes (new files, modified files, lines affected).
- Test specifications (filenames, test names, what each verifies).
- Wave structure if the planner identifies sequencing — e.g., "Hydrator Phase 2 dispatch verification lands first (Wave 1) since both `PopulatesMixin` and `ContainableMixin.applyContainer` depend on it," "`Mixins.Populates` + `PopulatesMixin` land second (Wave 2)," "`ContainableMixin.applyContainer` + singleton-target validator land third (Wave 3)," "CloneController hydrate-first refactor lands fourth (Wave 4)," "Login.enter change lands fifth (Wave 5)," "Avatar `save`/`restore` + write-back surface land sixth (Wave 6)," "Auto-save + periodic-save wiring lands seventh (Wave 7)."
- Risks and mitigations specific to this build — especially the persist-back additions (template-doc write-back as a new pattern; Hydrator re-entry semantics; periodic-timer lifecycle and HMR interactions; in-flight save coordination).
- An explicit re-statement of what's OUT of scope so the build agent doesn't accidentally pull in adjacent work (especially: no content YAML, no `DEFAULT_STARTING_LOCATION_PATH` change, no inventory persist-back, no save commands / verbs).

## Followup builds enabled by this one

Once this build ships, the declarative-content slate is fully closed at the substrate layer. The following are unblocked:

- **Eternal University Phase 1 content authoring** — YAML seeds for Duncan Hall (5 dorms + hallway + outside stub + windows + desks + welcome packets), per `project_eternal_university`. Pure content; no substrate. The Avatar template gains `data.container: /domain/eternal-u/duncan-hall/dorm-1xx` (or the character-creation hook chooses among the dorm pool); hydration self-places freshmen on first login; subsequent logins use the persist-back-updated container.
- **Character-creation hook for new freshman placement** — content-side; lives wherever the character-creation flow lives. With this build's substrate, the hook's job is to set the new Avatar template's `data.container` to whichever dorm room is chosen at creation time. No imperative placement needed during the login flow.
- **Inventory persist-back** — what the avatar is carrying survives restart. Requires nested-container serialization for arbitrary Stuff trees. Substantial; its own substrate slate (when content authoring surfaces the need).
- **Save / restore as player-facing verbs** — `player save` / `player restore` subcommands or standalone verbs. Pure verb-spec work; no substrate change.
- **Reset / respawn substrate** — extends `PopulatesMixin` with runtime ref tracking + ownership-vs-drift policy + declarative reset cadence. Slate § Open Question §10.
- **Multi-room / facade `container:` targets (Lounge case)** — Phase 2 of Eternal U problem. Slate § Open Question §11.
- **Boot-time content ref-resolution CLI** — deferred dev-ergonomics affordance. Slate § Open Question §12.
- **Richer `populates:` entry shapes** — `{ template, count }`, conditional spawns, named entries.
- **Generalized `save`/`restore` for non-Avatar Stuff** — the v1 substrate is Avatar-specific; a future build could promote it to a `PersistableStuffMixin` once a second concrete consumer surfaces.
- **Per-field opt-out / explicit persist-back manifest** — v1 snapshots all of Avatar's persistentFields. A future shape could mark certain fields as session-only via a `static volatileFields` declaration or similar.

Each is independently shippable; none re-touches stuff, templates, or connection at the substrate layer.
