# Encumbrance — implementation plan

Status: planning artifact. Authoritative scope is
[`docs/requirements/encumbrance-requirements.md`](../requirements/encumbrance-requirements.md);
design rationale is [`docs/slates/builds/encumbrance-slate.md`](../slates/builds/encumbrance-slate.md).
This doc is the *how*. The *what* (surface decisions, non-goals) is settled — do not reopen it.

## 0. Branch / base — read this first

The vitals substrate this build depends on — `Creature`,
`Reserved`/`reserve.ts`, `Vitals`, `BodyPlan`, `Slotted`, `Tangible`,
`Mobile.traverse`, the locomotion gate — **is already merged to
`master`** (`origin/master` @ `fafdd33`, "Merge branch 'feature/vitals'").
There is **no merge dependency** and `feature/vitals` is now redundant.

**Cut the feature branch from an up-to-date `master`** (e.g.
`feature/encumbrance` off `master`). NOTE the local checkout may be stale:
when this plan was written the working tree was on `feature/client-shell-frame`
with local `master` 5 commits behind `origin/master` and `reserve.ts`
absent from the tree — so **fetch + update `master` first**, then branch.
Once on updated `master`, all substrate files below are present in the
working tree (no `git show` needed).

### Substrate facts (verified against the merged vitals substrate; paths as on `master`)

- `Creature` (`lib/creature/Creature.ts`) composes, outer→inner:
  `Container(Containable(Visible(Vitals(Reserved(Posed(BodyPlanSlots(Slotted(Sexed(Organism(Named(Agent))))))))))))`.
  Constructor calls `this.installBiologicalReserves()`. **No constructor arg
  for mass.** This is the seeding hook we extend (Phase 2).
- `Reserved` (`lib/reserve.ts`): `getReserve(key): Reserve | undefined`,
  `adjustReserve(key, delta: Quantity<Unit>)` (clamps `[0, capacity]`,
  throws on unit mismatch / unknown key), `getReserves()`. Biological
  reserves are `%`-unit, installed at 100/100. `endurance.floorEffect =
  'collapse'` — **no consumer; keep it that way** (non-goal).
- `Tangible` (`lib/material/Tangible.ts`): `getMass(): Quantity<'kg'>` /
  `setMass(Quantity<'kg'>)`. Private `_mass` defaults `Quantity.of(0,'kg')`;
  `protected get/set mass` accessor pair validates type + non-negativity;
  `setMass` fires a `FieldChangedEvent('mass')`. Marshalled via
  `QuantityMarshaller.pathFor('kg')`; authoring coercion (`mass: heavy`,
  `mass: "12000 g"`, bare number) lives in the marshaller, runs only on the
  persistence path. `mass` is already a `subscribableFields` entry
  (`{ value, unit:'kg' }`).
- `Vitals` (`lib/vitals/Vitals.ts`): `getConditionBand(): 'healthy' |
  'hurt' | 'serious' | 'critical' | 'dead'`, derived every call. Requires
  `OrganismMixin`. No subscribableFields entry for the derived band — see
  §9 on the observability seam.
- `BodyPlan` (`lib/species/BodyPlan.ts`): `SingletonMixin(PropertiedMixin(Idea))`.
  Authored `bodyParts: BodyPart[]` (each part `tissues: TissueComposition[]`,
  `mass` a plain kg number), `slots: SlotSpec[]`, plus getters/setters with
  per-field-invariant validation in the setters. **We add `baseMass`.**
- Reaching a Creature's BodyPlan: `creature.getSpecies()` (Organism) →
  `species.getBodyPlan()` (Species, `_bodyPlanPath` → singleton). Both are
  HMR-safe path-resolved. **Confirmed path.**
- `Slotted` (`lib/slot/Slotted.ts`): runtime occupancy is
  `slots: Map<string, Set<Stuff & Slottable>>`, **not persisted, separate
  from `Container.contents`**. Public surface: `getAllOccupants():
  ReadonlyMap<string, ReadonlySet<Stuff & Slottable>>`, `getOccupants(slot)`,
  `getSlotSpec(name): SlotSpec | null`. `SlotSpec` is a flat record (fields:
  `name`, `accepts`, `capacity?`, `postures?`, `userFacingDetail?`,
  `bodyPart?`, `covers?`). **We add a coupling field to `SlotSpec`.**
- `BodyPlanSlots` (`lib/slot/BodyPlanSlots.ts`) overrides `getSlotSpec` to
  read `species → bodyPlan → slots`, so a Creature's `getSlotSpec(slot)`
  returns the **body-plan** spec. The placement-coupling field rides there.
- Locomotion gate: `api/locomotion.ts` →
  `canTraverseExit` → `checkEnablement` → `#checkEnablementScope` →
  `host.canBeEngagedBy(actor)`. **We add a load-aware veto alongside** the
  existing capability check.
- `GetController` (`obj/command/inventory/GetController.ts`): `pickUpOperand`
  calls `ContainmentApi.move(operand, giver)` unconditionally. **Strain-ceiling
  gate goes here**, emitting a `controller-rejected` envelope note.
- `Mobile.traverse` (`lib/spatial/Mobile.ts`): generic; ends with
  post-move hooks + `autoSenseOnArrival()`. **It does NOT hook the drain** —
  that lives in the movement controller (§1.4 invariant); `Mobile.traverse`
  stays encumbrance-agnostic.
- `Mixins` registry + `MixinApi.isX(obj)` predicates live in
  `lib/mixin.ts` / `api/mixin.ts`. New mixins register in `Mixins` and get a
  predicate.
- Seeds are YAML under `packages/server/src/mud/seeds/...` (`class:` +
  `hydratorClass:` + `data:`). `biped` body plan at
  `seeds/lib/body-plans/biped.yaml`. Wearable garments under
  `seeds/domain/eternal/clothes/*.yaml` with `class: /lib/equipment/Garment`,
  `data.slotClaims: { "/lib/body-plans/biped": [torso] }`.
- `Thing` is `Tangible` + `Containable` but **not** a `Container`. `Vessel`'s
  **real** composition is `AtmosphericMixin(TangibleMixin(AdornableMixin(
  ContainerMixin(ContainableMixin(Stuff)))))` — already `Container` +
  `Containable` + **`Tangible`** (`getMass()` exists) + `Atmospheric` +
  `Adornable`. (Its doc-comment is stale, claiming no Tangible/Atmospheric.)
  `Vessel` is the carriable-container home (see Phase 3); this build adds a
  `transmissionFactor` field and narrows `Adornable` off the base onto
  `ExitableVessel`. The demo backpack is a wearable `Vessel`.

## 1. Architecture decisions (within the settled constraints)

1. **No new "Encumbered" mixin.** Per requirements: the gauge is a derived
   facet, not storage. `getBorneBurden()` / `getCarryCapacity()` / the load
   ratio are **methods on `Creature`** (the bearer), not a mixin. They read
   substrate only.

   *Where exactly:* a `Creature` already concretely composes `Container +
   Slotted + Tangible + Reserved + Vitals + Organism`. The cleanest home
   that respects "no new mixin" and "go through the Api layer" is to put the
   **computation in a new `EncumbranceApi`** (`api/encumbrance.ts`, the
   sanctioned home for cross-cutting static helpers) and expose **thin
   instance methods on `Creature`** that delegate to it. So:

   - `Creature.getBorneBurden(): Quantity<'kg'>` → `EncumbranceApi.borneBurden(this)`
   - `Creature.getCarryCapacity(): Quantity<'kg'>` → `EncumbranceApi.carryCapacity(this)`
   - `Creature.getLoadRatio(): number` → `EncumbranceApi.loadRatio(this)`

   Rationale: the tree-walk is genuinely cross-cutting (it reads Container,
   Slotted, the coupling mixin, the slot specs, and recurses through
   arbitrary nested containers that are *not* creatures). That is Api-shaped
   work, not a one-liner that belongs inline on `Creature`. The methods on
   `Creature` keep the **inter-stuff method-surface contract** intact (other
   Stuff calls `creature.getBorneBurden()`, never the Api directly across the
   Stuff boundary), while the heavy logic lives in a security-decorated Api.

   *Why methods on Creature and not a free function:* other Stuff and the
   consequence drivers must read the gauge through a stable method surface
   (shadow framework dispatches methods only; a future "exo-frame doubles
   your effective capacity" shadow needs `getCarryCapacity` to be a method).
   The driver call sites (GetController, locomotion gate, Mobile drain) call
   `EncumbranceApi.*` directly because they are *engine* code already inside
   the Api layer — they may go straight to the Api.

2. **Two coupling factors, two homes** (settled):
   - **Container transmission** → a `transmissionFactor` **field on
     `Vessel`** (default `1.0`). `Vessel` is the container-object category
     (a `Thing` that holds things — bag, box, chest, cart, ship, at any
     scale); a bag of holding is a small `Vessel` with a low factor. *Not*
     on the universal `ContainerMixin` (rooms are Containers and weigh
     nothing). `Vessel` is already `Tangible`, so nothing to add for mass;
     this build adds the field and (per the cleanup below) narrows
     `Adornable` off the `Vessel` base onto `ExitableVessel`. See Phase 3.
   - **Placement coupling** → a new **optional field on `SlotSpec`**
     (`coupling?: number`), authored on the **body-plan** slot definitions.
     Absence ⇒ engine default by slot kind (held → surcharge, worn → 1.0).

3. **Engine constants live as a top-of-file `const` in `api/encumbrance.ts`.**
   A single exported record (`ENCUMBRANCE_DEFAULTS`) of named dials
   (`CAPACITY_FRACTION`, `OVERLOAD_FACTOR`, `HEAVY_LOAD_THRESHOLD`,
   `LOOSE_CARRY_SURCHARGE`, the slot-coupling defaults, `LIGHT_LOAD_FLOOR`,
   `DRAIN_PER_TRAVERSAL`, `ENDURANCE_FLOOR`, the
   condition-band margin table), declared in the `EncumbranceApi` file and
   read only by it. These are *deferred dials* (non-goal: numeric tuning) —
   named, greppable, retunable. **No `EncumbranceConstants.ts`, no
   `lib/encumbrance/` module** — that would invent a module type outside the
   taxonomy; constants belong in the Api that consumes them (the vitals
   precedent: `UNIVERSE_DEFAULT_VITAL_PROFILE` / `VITAL_UNITS` live in their
   owning file). **Do not** depend on the unbuilt GameConfig; leave a
   one-line comment that GameConfig is the eventual home when it lands.

4. **Enforcement lives at the command layer — the move substrate stays
   encumbrance-agnostic (hard invariant).** Encumbrance is a
   player-command-experience concern, not a physics-of-containment concern.
   The raw movement/containment substrate carries **zero** encumbrance code:

   - `Mobile.traverse`, `ContainmentApi.move` / `placeDirect` /
     `placeOn`, the containment chokepoint, and `forceMove` **must not**
     read, gate on, or apply encumbrance. A dev or script doing a plain
     (even non-forced) `traverse` / `move` of a 200 kg anvil onto a sparrow
     Just Works — no block, no drain.
   - All three consequences are applied by the **command layer**: the lift
     gate in `GetController` (before it calls `ContainmentApi.move`), and
     both the locomotion veto and the traversal drain in the **movement
     controller** path (`LocomotionControllerBase`), never in
     `Mobile.traverse`.
   - The locomotion veto rides the controller's existing pre-move gate
     (`LocomotionApi.canTraverseExit`, parallel to the climb-difficulty
     check) — command-invoked, skipped by raw `traverse`. **Open seam:**
     this gate could instead live on the exit (`ExitableMixin`/boundary).
     Left in the locomotion gate for now; relocate to exits if desired
     after seeing it in place (a clean swap — the veto predicate is
     `EncumbranceApi.loadRatio(actor) >= HEAVY_LOAD_THRESHOLD` wherever it
     is invoked).
   - The command layer is also the *correct* home: only the controller
     knows whether the actor **walked** (self-powered → drain) or **rode** a
     conveyance (the host moved → no drain). The primitive can't tell.

   Acceptance: a test asserts raw `Mobile.traverse` / `ContainmentApi.move`
   / `forceMove` of an over-ceiling item neither blocks nor drains
   (§11 — the agnostic-substrate guarantee).

## 2. Phase 1 — `BodyPlan.baseMass` + creature mass default-seeding

**Goal:** capacity rests on a body-grounded default. `BodyPlan` gains an
authored `baseMass`; a `Creature` seeds `getMass()` from its resolved plan's
`baseMass` at construction/hydration; an explicitly authored creature mass is
the deviation that wins.

### Files

- **Modify** `lib/species/BodyPlan.ts`:
  - Add `protected baseMass: number = 0;` (plain kg number — mirrors
    `TissueComposition.mass`, keeps `BodyPlan` free of a `Quantity` field and
    of any `lib/material` import; `BodyPlan` is a flat authoring flyweight).
  - Add to `persistentFields`.
  - `getBaseMass(): number` / `setBaseMass(value: number): void`. **Per-field
    invariant on the setter** (the project rule): reject non-finite /
    negative (`throw new RangeError`). This makes the Hydrator's Phase-1
    `setBaseMass` dispatch the validation point.
  - Authoring coercion: `baseMass` is a bare number in YAML, so no marshaller
    is needed — the default Hydrator bracket-assigns through `setBaseMass`.
    (If we later want `baseMass: heavy` tag authoring, add a marshaller then;
    not now.)

- **Modify** `lib/creature/Creature.ts`: add a mass-seeding step. The
  constructor seeds reserves but **cannot** seed mass — at construction time
  `_speciesPath` isn't populated yet (species/mass are authored fields the
  Hydrator fills in Phase 1, *after* `new Creature()`). So seeding must run
  **after hydration**, override-aware.

  **Decision — where the seed runs:** add a `postRegister`/post-hydrate
  default-seed. The cleanest seam that already exists is `OrganismMixin`/
  Creature hydration completion. Concretely: add a protected method
  `Creature.seedMassFromBodyPlan()` that:
    1. reads `this.getMass()`; if it is **non-zero**, the instance authored a
       deviation — leave it (the authored mass is the deviation that wins).
    2. else resolves `this.getSpecies()?.getBodyPlan()?.getBaseMass()`; if
       present and `> 0`, `this.setMass(Quantity.of(baseMass, 'kg'))`.
    3. else leave at `0` (no plan / sessile — graceful, no throw).

  **Trigger:** call `seedMassFromBodyPlan()` from a post-hydrate hook.
  Check whether `Creature`/`Agent` already composes `PostRegistrationMixin`
  (the `postRegister` seam, registry constant `PostRegistration`). If it
  does, override `postRegister()` (super-call first) and seed there — this is
  the natural home because species/plan singletons are resolvable by then.
  If `Creature` does **not** already have a post-register hook, the fallback
  is to seed lazily inside `EncumbranceApi.carryCapacity()` on first read
  (read-time: if `getMass()` is 0 and a plan baseMass exists, seed-and-cache
  by calling `setMass`). Lazy-seed is acceptable because capacity is the only
  consumer of body mass in v1.

  > **NOTE (genuine ambiguity to resolve at build time):** the exact
  > post-hydrate hook available on `Creature`. Two candidates: (a) a
  > `PostRegistrationMixin.postRegister()` override, (b) lazy seed-on-read in
  > `EncumbranceApi.carryCapacity`. Confirm whether `Agent`/`Creature`
  > composes `PostRegistrationMixin` (registry has `PostRegistration:
  > 'PostRegistrationMixin'`). **Prefer (a)** if available — it makes
  > `getMass()` honest for every reader, not just the capacity path. Fall
  > back to (b) otherwise. Either satisfies the acceptance criterion. Do not
  > add a new persistent "mass was seeded" flag — the "is mass still 0?"
  > check is the idempotency guard.

### Tests (`lib/creature/__tests__/Creature.mass.test.ts`)

- A Creature whose plan authors `baseMass: 70` and whose template authors no
  mass reads `getMass() == 70 kg` after hydration.
- A Creature authoring `mass: 90` keeps `90 kg` (deviation wins).
- A Creature with a sessile plan (`baseMass` absent / 0) reads `0 kg`, no throw.
- `BodyPlan.setBaseMass(-1)` throws `RangeError`.

## 3. Phase 2 — placement coupling on `SlotSpec` (body-plan home)

**Goal:** placement coupling is a field on the body-plan slot definition.
Hand/held slots couple at a surcharge (`> 1.0`); worn slots at the floor
(`1.0`). Absence ⇒ engine default by slot kind.

### Files

- **Modify** `lib/slot/Slotted.ts` — extend `SlotSpec`:
  ```ts
  /**
   * Encumbrance placement coupling — the dimensionless factor a borne
   * item's effective burden is multiplied by when it attaches through
   * this slot. Worn slots default to the 1.0 floor (bearing it well);
   * held/wielded slots default to a surcharge (> 1.0). Absent ⇒ the
   * engine default-by-kind in EncumbranceApi. Authored on the body-plan
   * slot definition (read via BodyPlanSlots.getSlotSpec).
   */
  coupling?: number;
  ```
  No setter change needed — `SlotSpec` is a flat record validated by
  `validateSlotSpecs` (which only checks `name`/`accepts`/uniqueness). Add an
  optional sanity check there: if `coupling` is present it must be a positive
  finite number (cheap, fail-loud on a typo'd template).

- **No change to `BodyPlanSlots.ts`** — it already routes `getSlotSpec`
  through the body plan; the new field rides along for free.

- **Engine default-by-kind** lives in `EncumbranceApi` (Phase 4), not on the
  slot: given a `SlotSpec` whose `coupling` is undefined, derive the default
  from the slot's `accepts` — `WieldableMixin` (held) → surcharge constant;
  `WearableMixin` / everything else (worn) → `1.0`. This keeps the "absence
  ⇒ sensible default" rule in one place and lets unauthored body plans Just
  Work.

### Authoring

- **Modify** `seeds/lib/body-plans/biped.yaml`: add `coupling: 1.0` to worn
  slots is optional (it's the default); add `coupling: <surcharge>` to
  `hand:left` / `hand:right` to make the held surcharge explicit and authored
  (demonstrates the seam and is the surcharge the lift/burden tests read).
  The numeric magnitude is a deferred dial — author the engine-default value
  explicitly here so the test reads the same constant.

### Tests

Covered indirectly by the burden-walk tests (Phase 4): a held item reads the
surcharge, a worn item reads `1.0`.

## 4. Phase 3 — `Vessel`: `transmissionFactor` field + narrow `Adornable` to `ExitableVessel`

**Goal:** (a) a container-object can attenuate the weight its contents
transmit to a bearer — a `transmissionFactor` field on `Vessel`, default
`1.0`, a bag of holding sets it low; (b) move `AdornableMixin` off the
`Vessel` base onto `ExitableVessel`, the only thing that needs it. **No new
mixin, no new class.**

### Verified substrate reality (corrects the earlier draft)

`Vessel`'s *actual* composition (the doc-comment is stale):

```ts
const VesselBase = AtmosphericMixin(
  TangibleMixin(AdornableMixin(ContainerMixin(ContainableMixin(Stuff))))
);
```

So **`Vessel` is already `Tangible`** (`getMass()` exists) and already
`Atmospheric`. The earlier "add `TangibleMixin`, it's an omission" was wrong
— there is nothing to add for mass. Only the doc-comment (which still claims
`AdornableMixin(ContainerMixin(ContainableMixin(Stuff)))`) needs fixing.

The reconception stands: a bag, box, chest, cart, and ship are the same
category (*a `Thing` that holds things*) at different **scales**; carry /
drag / ride / can't-budge is emergent from mass vs. capacity, never a type
flag. `Vessel` is the already-existing carriable-container home — and since
it's already `Tangible`, a bag-of-holding-as-`Vessel` works mechanically
today.

### 4a. `transmissionFactor` field

- **Modify** `lib/stuff/Vessel.ts`:
  - Add `transmissionFactor` as a persistent field, default `1.0`:
    ```ts
    getTransmissionFactor(): number;             // default 1.0
    setTransmissionFactor(value: number): void;  // validate 0 <= v <= 1, finite
    ```
    Backing `private _transmissionFactor: number = 1.0`; `protected get/set
    transmissionFactor` accessor pair owns the invariant (per-field-invariant
    -on-setter rule); add to `persistentFields`. **TypeScript `private`, not
    `#`** (proxy receiver rule, CLAUDE.md hard-constraint 2). Authoring: bare
    number in YAML (`transmissionFactor: 0.05`); default Hydrator
    bracket-assigns through the setter.
  - Fix the stale doc-comment to reflect the real composition and the
    broadened concept (container-object at any scale; carriability emergent;
    `Thing` ↔ `Vessel` = "a Thing that holds things"). `spatial.md` likewise
    (Phase 9).

The tree-walk reads it off any `Vessel` via `instanceof Vessel` (Phase 4);
no `Mixins` / `MixinApi` change — it's a field on an existing class.

### 4b. Narrow `Adornable` to `ExitableVessel` (the requested cleanup)

`AdornableMixin` is currently on the `Vessel` base, so *every* vessel carries
fixture machinery (`getFixtures()`/`addFixture()`). **Verified safe to
narrow:** every consumer of `getFixtures()`/`addFixture()` already gates on
`MixinApi.isAdornable()` first — `ExitableVessel` (lines 145–146), `Window`,
`Exitable`, all three perception modalities (`Vision`/`Sound`/`Smell`),
`Globbable`, and the `BoundaryApi` call sites' callers. Nothing assumes a
bare `Vessel` is Adornable. The only production `Vessel` subclass is
`ExitableVessel`; all other `extends Vessel` are test fixtures that never
touch fixtures.

- **Modify** `lib/stuff/Vessel.ts`: drop `AdornableMixin` (and its import)
  from the base →
  ```ts
  const VesselBase = AtmosphericMixin(
    TangibleMixin(ContainerMixin(ContainableMixin(Stuff)))
  );
  ```
- **Modify** `lib/boundary/ExitableVessel.ts`: compose `AdornableMixin`
  itself (it needs fixtures for the Door→`BoundaryAnchor` retrofit) — add to
  its base, which is currently
  `DoorBearingMixin(ExitableMixin(VisibleMixin(Vessel)))` →
  `DoorBearingMixin(ExitableMixin(VisibleMixin(AdornableMixin(Vessel))))`.
  `AdornableMixin` requires `MixinConstructor<Stuff & Container>`; `Vessel`
  is a `Container`, so the constraint holds. Add the import; note in its
  doc-comment that it declares its own `Adornable` need (the rationale that
  was wrongly on the `Vessel` base moves here).
- **Behavior unchanged** everywhere: a bare `Vessel` was Adornable-with-an-
  empty-fixture-set; now it is `!isAdornable`. Every consumer narrows, so an
  empty set and "not adornable" produce identical observable results. No
  content adds fixtures to a non-Exitable vessel.

### Tests

- (`lib/stuff/__tests__/Vessel.test.ts`) `transmissionFactor` defaults
  `1.0`; set to `0`/`0.5` reads back; out-of-range (`-0.1`, `1.5`, `NaN`)
  throws. A plain `Vessel` is **`!MixinApi.isAdornable`** and has no
  `getFixtures`. An existing vessel seed hydrates unchanged.
- (`lib/boundary/__tests__/ExitableVessel*.test.ts`) the **existing**
  ExitableVessel / Door / Boundary suites are the regression guard — they
  must stay green with `Adornable` now declared on `ExitableVessel`. Add one
  assertion that `ExitableVessel` is `isAdornable` and its door surfaces as a
  fixture.

## 5. Phase 4 — the gauge: `getBorneBurden` + `getCarryCapacity` + load ratio

**Goal:** the two derivation functions, derived-on-read, through the substrate
method surface.

### Files

- **Create** `api/encumbrance.ts` — `EncumbranceApi` (static, ends with
  `SecurityApi.decorateApiClass(EncumbranceApi)`). Top-of-file exported
  constants (`ENCUMBRANCE_DEFAULTS`, see §1.3). Methods:

  - **`borneBurden(bearer: Stuff & Container & Slotted): Quantity<'kg'>`** —
    the weighted tree-walk. Algorithm:

    ```
    total = 0
    visited = new Set<Stuff>()        // cycle guard by stuffId/identity
    for each top-level borne item:
        a) Container contents: for item in ContainmentApi.getContents(bearer)
           → contribution = walk(item, transmissionProduct = 1.0,
                                  placement = LOOSE_CARRY_SURCHARGE, depth = 0)
        b) Slot occupants: for [slotName, occupants] in
           bearer.getAllOccupants():
             placement = placementCouplingFor(bearer.getSlotSpec(slotName))
             for occ in occupants:
                 contribution = walk(occ, 1.0, placement, 0)
        total += contribution
    return Quantity.of(total, 'kg')
    ```

    `walk(item, transmission, placement, depth)`:
    ```
    if depth > MAX_DEPTH or visited.has(item): return 0   // termination
    visited.add(item)
    self = isTangible(item) ? item.getMass().rawValue() : 0
    contribution = self * transmission * placement
    if isContainer(item):
        childTransmission = transmission *
          (item instanceof Vessel ? item.getTransmissionFactor() : 1.0)
        for child in item.getContents():
            contribution += walk(child, childTransmission, placement, depth+1)
    return contribution
    ```

    (Transmission lives on `Vessel`, so the attenuation read is
    `item instanceof Vessel ? item.getTransmissionFactor() : 1.0` — a plain
    `instanceof` since `Vessel` is a class, not a mixin. A non-`Vessel`
    container, e.g. a creature-as-container, passes through at `1.0`; a room
    is never in a borne subtree.)

    Key points, all required:
    - **Covers both stores** — `getContents()` AND `getAllOccupants()`. A
      contents-only walk silently undercounts every worn item (the explicit
      constraint).
    - **Placement applies to the whole top-level subtree** — a backpack worn
      on `back` applies the worn-slot coupling (1.0) to itself *and* its
      contents; a chest held in `hand:left` applies the held surcharge to
      itself and its contents. So `placement` is fixed at the top-level
      attach point and carried down unchanged; only `transmission`
      accumulates as containers nest.
    - **Loose carry is a surcharge.** Top-level items in general
      `Container.contents` (not in any slot) attach at
      `LOOSE_CARRY_SURCHARGE` (= the held-slot surcharge), honoring the
      slate's "carrying loose is a surcharge" without a hand-slot mechanic on
      `get` (see §5-get note below).
    - **Transmission is a running product down the path** — a bag of holding
      multiplies its whole subtree by ~0.
    - **Cycle + depth safety** — `visited` set (identity) + `MAX_DEPTH` (reuse
      the locomotion/conveyance constant of 16). Containment is a DAG via the
      move chokepoint, but the walk must not assume it (explicit constraint).
    - **Go through method surface** — `getMass()`, `getContents()`,
      `getAllOccupants()`, `getSlotSpec()`, `getTransmissionFactor()`. Never
      touch fields.
    - **Slot occupants that are also in contents:** a worn/wielded item is in
      `slots` but **not** in `Container.contents` (they are separate stores,
      verified). So no double count across the two top-level loops. The
      `visited` set guards against a pathological author who manages to put
      the same item in both. (Confirm in a test.)

  - **`carryCapacity(bearer: Stuff & Tangible & Vitals & Reserved): Quantity<'kg'>`**:
    ```
    base = bearer.getMass().rawValue() * CAPACITY_FRACTION
    margin = conditionBandMargin(bearer.getConditionBand())
           * enduranceMargin(bearer.getReserve('endurance'))
    return Quantity.of(base * margin, 'kg')
    ```
    - `CAPACITY_FRACTION` — a creature carries some fraction of its own body
      mass comfortably (engine constant).
    - `conditionBandMargin` — map `healthy→1.0`, `hurt→…`, `serious→…`,
      `critical→…` (gentle, all ≤ 1.0; dead irrelevant). Table in
      `ENCUMBRANCE_DEFAULTS`.
    - `enduranceMargin` — read `getReserve('endurance')`, take
      `current/capacity` fraction (`%`-unit, so 0..1), map to a multiplier
      `[floor, 1.0]` where `floor` is gentle (the spiral floor is "exhausted",
      not zero-capacity). E.g. `margin = ENDURANCE_FLOOR + (1 - ENDURANCE_FLOOR) * fraction`.
      This is the **spiral** term: low endurance shaves capacity but never to
      zero.
    - Both margins ≤ 1.0 and pull capacity *down* off baseline (settled).
    - **Environmental margins (spo2, gravity) are deferred** — do not read
      them; no driver sets them off-baseline (non-goal).

  - **`strainCeiling(bearer): Quantity<'kg'>`** = `carryCapacity(bearer) ×
    OVERLOAD_FACTOR` (engine constant `> 1.0`). The absolute lift cap.

  - **`loadRatio(bearer): number`** = `borneBurden / carryCapacity`
    (dimensionless; guard capacity `0` → return `0` or `Infinity`
    sensibly — if capacity is 0, treat any positive burden as over-ceiling).

  - **`wouldExceedCeiling(bearer, candidate: Stuff): boolean`** — the lift
    gate's predicate. Computes the **prospective** burden: current
    `borneBurden` + the candidate's contribution *as it would attach* (loose
    carry → into hands → held surcharge). v1 simplification: a `get` puts the
    item into the bearer's `Container` contents (loose carry), so its
    prospective contribution is `candidate.getMass() × LOOSE_CARRY_SURCHARGE`.
    Returns true iff `prospective > strainCeiling`.

    > **NOTE (ambiguity — does `get` claim a hand slot?):** `GetController`
    > today does `ContainmentApi.move(operand, giver)` — into general
    > contents, *not* into a `hand:*` slot. The slate's model says loose
    > carry claims hands and pays the held surcharge. v1 has no "claim a hand
    > slot on get" mechanic and building one is out of scope. **Decision:**
    > do **not** add hand-slot claiming to `get`. Instead, treat a bearer's
    > general `Container` contents (items not in any slot) as "carried loose"
    > and apply the **held surcharge** to top-level loose contents in
    > `borneBurden`, the same surcharge as a hand slot. This satisfies "loose
    > carry is a surcharge" without a new slot mechanic, and keeps the gauge
    > honest. Worn/wielded items (in `slots`) get their slot's coupling.
    > Flag this clearly in the subsystem doc as the v1 coupling model.

  - **Thin Creature methods** (delegate): `Creature.getBorneBurden()`,
    `getCarryCapacity()`, `getLoadRatio()` — see §1.1.

- **Modify** `lib/creature/Creature.ts`: add the three delegating methods.
  They make the gauge part of the Creature method surface (inter-stuff
  contract + shadow-extensible).

### Tests (`api/__tests__/encumbrance.gauge.test.ts` + `lib/creature/__tests__/`)

Map to acceptance criteria:
- Burden: nested container sums correctly; a worn item counts; a held/loose
  item counts at the surcharge; an attenuating container (factor ~0) drops
  its subtree to ~0; same-item-in-both-stores guarded by `visited`; a cycle
  (author-forced) terminates.
- Capacity: baseline from body mass × fraction; a degraded condition band
  lowers it; low endurance lowers it (the spiral term) but never to 0.
- Mass default (Phase 1) feeds capacity baseline.

## 6. Phase 5 — the lift gate (strain ceiling in `GetController`)

**Goal:** picking up an item that would push burden past the strain ceiling
fails diegetically (envelope decline). Picking one up between capacity and
ceiling succeeds (overloaded but functional).

### Files

- **Modify** `obj/command/inventory/GetController.ts`, in `pickUpOperand`
  (the single chokepoint both the whole-set and quantity paths call):
  before `ContainmentApi.move(operand, giver)`, gate:
  ```ts
  if (MixinApi.isCreature?(giver) /* or isReserved+isTangible+isVitals */ &&
      EncumbranceApi.wouldExceedCeiling(giver, operand)) {
    context.note({
      kind: 'controller-rejected',
      reason: 'too-heavy-to-lift',
      detail: `${operand.getPresentation()} won't budge`,
    });
    MessageApi.scene(giver)
      .topic('world.perception.inventory')
      .toSelf(Mml.compose`You strain, but ${Mml.item(operand)} doesn't budge.`)
      .send();
    return; // do NOT move; do NOT push to pickedNames
  }
  ```
  - The narrow: gate only when the giver is a bearer with the gauge
    (`Reserved + Tangible + Vitals`, i.e. a `Creature`). Non-creature
    containers (a chest looting into a bag) skip the gate. Use a `MixinApi`
    narrow; if a `MixinApi.isCreature` predicate doesn't exist, narrow on the
    three component mixins or add a small `isCreature` predicate.
  - **Diegetic decline, not a throw / boolean** (the constraint): a
    `controller-rejected` envelope note + a scene line. The slate's
    "the anvil doesn't budge."
  - **Over-capacity-but-under-ceiling succeeds:** the gate only triggers past
    the *ceiling*. An item that pushes burden over *capacity* but under
    `capacity × OVERLOAD_FACTOR` moves normally — the creature is now
    overloaded (locomotion-gated + drains on traverse), but the lift
    succeeds. This falls out of `wouldExceedCeiling` testing the ceiling, not
    capacity.
  - **Whole-set path:** `pickUpOperand` is called from both
    `executeWholeSet` and the `applyQuantity` callback. Since the gate lives
    *inside* `pickUpOperand` and returns early without moving, a declined
    heavy item is simply skipped while lighter items in the same `get all`
    succeed. The callers already tolerate "skipped" items (they only push
    successes to `pickedNames`). Verify the whole-set summary still reads
    sensibly when one item declines. (One refinement: `pickUpOperand`
    currently returns `void` and always emits a per-item scene; restructure
    so the decline path emits the decline scene and the success path emits the
    pickup scene — return a boolean to the caller if needed so it can adjust
    `pickedNames`. Keep the change minimal.)

### Tests (`obj/command/inventory/__tests__/GetController.encumbrance.test.ts`)

- A 200 kg anvil vs an ~80 kg-capacity creature: `get anvil` → declined,
  `controller-rejected` note `too-heavy-to-lift`, item NOT in inventory.
- A 25 kg item that pushes over capacity but under ceiling: `get` → succeeds,
  item in inventory, `getLoadRatio() > 1.0`.
- A non-creature container is not gated (regression: looting still works).

## 7. Phase 6 — locomotion veto + traversal drain (recovery deferred to metabolism)

Three consequence drivers. All narrow.

### 7a. Load-aware locomotion veto

**Goal:** an overloaded creature (over the heavy-load threshold) can't engage
climb/swim/fly. An additional veto **alongside** the existing host-difficulty
check.

- **Modify** `api/locomotion.ts`, `#checkEnablementScope` — after the
  existing `host.canBeEngagedBy(actor)` block, add a load check:
  ```ts
  if (MixinApi.isReserved(actor) && MixinApi.isTangible(actor) &&
      MixinApi.isVitals(actor) &&
      EncumbranceApi.loadRatio(actor) >= HEAVY_LOAD_THRESHOLD) {
    return {
      ok: false,
      gate: 'encumbrance',
      mode: mode.getName(),
      reason: `You're carrying too much to ${mode.getName()}.`,
      context: { loadRatio: EncumbranceApi.loadRatio(actor) },
    };
  }
  ```
  - Placement: **alongside**, not replacing, the capability check (explicit
    constraint). Put it after the capability check so a too-hard host still
    reports the difficulty reason first if both fail.
  - **Command-layer, not the primitive** (§1.4 invariant): `canTraverseExit`
    is invoked by `LocomotionControllerBase.execute` (line ~113), *before*
    the actual `actor.traverse(...)` at ~142. `Mobile.traverse` does not call
    it, so a raw/dev `traverse` skips the veto entirely. **Open seam:** if you
    later want this on the exit instead, the same predicate moves to
    `ExitableMixin`/boundary — decide after seeing it.
  - Scope: this lives in `#checkEnablementScope`, which only runs for modes
    with an `enablementMixin` (climb/swim/fly) — exactly the "locomotion
    modes (climb/swim/fly) suppressed" target. Walk is unaffected (it has no
    enablement mixin), so an overloaded creature can still *walk* (and pay the
    endurance drain). This matches "movement-speed effects are a non-goal —
    load taxes endurance, not pace, and gates *modes*."
  - `gate: 'encumbrance'` is a new `TraversalGuard.gate` value — confirm the
    `TraversalGuard` type allows an open string or extend the union.
  - `HEAVY_LOAD_THRESHOLD` is an engine constant (load ratio, e.g. `1.0` =
    over capacity, or a touch above — a deferred dial).

- **Tests** (`api/__tests__/locomotion.encumbrance.test.ts`): an overloaded
  creature is refused `climb` with the `encumbrance` gate reason; an unloaded
  creature passes; `walk` is never refused on load.

### 7b. Loaded-traversal endurance drain

**Goal:** traversing while loaded draws down `endurance` ∝ load ratio. Light
loads cost nothing. **In the movement controller, NOT `Mobile.traverse`**
(§1.4 invariant). Narrow — only self-powered `Reserved` movers.

- **`Mobile.traverse` is NOT modified.** It stays encumbrance-agnostic. Raw
  `traverse` (dev, script, conveyance ripple) never drains.

- **Modify** `obj/command/movement/LocomotionControllerBase.ts`, in
  `execute`, **after the successful self-powered traverse** (the
  `engageAround(actor, mode, exit, () => actor.traverse(...))` branch at
  ~line 142 — NOT the conveyance-host branch at ~138, since a rider doesn't
  pay for the vehicle's movement):
  ```ts
  // after the actor's own traverse resolves successfully:
  if (MixinApi.isReserved(actor) && MixinApi.isTangible(actor) &&
      MixinApi.isVitals(actor)) {
    EncumbranceApi.drainForTraversal(actor);
  }
  ```
  - **`EncumbranceApi.drainForTraversal(actor)`**:
    ```
    ratio = loadRatio(actor)
    if ratio <= LIGHT_LOAD_FLOOR: return          // light loads cost nothing
    cost = DRAIN_PER_TRAVERSAL * (ratio - LIGHT_LOAD_FLOOR)   // ∝ overload
    actor.adjustReserve('endurance', Quantity.of(-cost, '%'))  // clamps at 0
    ```
  - **Walked vs rode:** drain only on the actor's own-power traverse branch.
    The conveyance-host branch (the vehicle's `traverse`) does not drain the
    rider — only the controller has this context, which is why the drain
    can't live in the primitive.
  - **Narrowness:** guard on `isReserved` (+ gauge mixins). A non-creature
    actor somehow on this path is skipped. The drain logic lives entirely in
    `EncumbranceApi`; the controller carries one narrow conditional.
  - Drains via `adjustReserve` with a `Quantity<'%'>` delta (auto-clamps to
    `[0, capacity]`). Never reach the reserve field.

- **Tests** (`obj/command/movement/__tests__/LocomotionController.encumbrance.test.ts`):
  the `go`/`walk` command while loaded reduces `endurance`; while light
  (ratio ≤ floor) does not; riding a conveyance does not drain the rider; and
  — the §1.4 guarantee — a direct `actor.traverse(exit, mode)` (bypassing the
  controller) drains nothing.

### 7c. Recovery — NOT in this build

Endurance recovery is **deferred to the metabolism/survival build** and is
**out of scope here.** Rationale (the physics-vs-game-design call): recovery
is genuinely physical — it's *metabolic*, the convergence of rest + fuel
(satiation/hydration), oxygen (`spo2`), and fatigue clearance. But none of
those inputs are live (satiation/hydration are inert no-driver reserves, no
rest mechanic, no `spo2` driver), so an honest recovery model can't be built
yet — modeling it now would be either a dishonest flat rate or the whole
metabolism system. And recovery isn't an encumbrance concern in the first
place: encumbrance *drains* endurance; how a reserve *replenishes* is
metabolism. So it lands in the metabolism build, homed as a reserve concern.

Consequence for v1: **endurance drain is one-way.** A creature that hauls
over-capacity loads loses endurance and stays diminished (the spiral
persists) until the metabolism build adds recovery. v1 therefore ships
**gentle** drain defaults so this is mild, not punishing — and metabolism is
to be designed *before* this build starts, so the recovery seam can be wired
cleanly when it lands. **No recovery code, no `WorldClock` timestamp, no
`lastEnduranceRecoveryAtS` field in this build.**

## 8. Phase 7 — demo content (three real templates)

**Goal:** three real templates, each exercising one axis. Props real or cut.

### Files (seeds + possibly one Stuff class)

Both containers are **`Vessel`s** (the container-object category, now
`Tangible` with a `transmissionFactor` field — Phase 3). No `Bag`/
`Receptacle` ad-hoc *container* classes — the bag of holding is a plain
`Vessel` seed; only the backpack needs a thin `Pack` subclass to add the
wear affordance.

1. **Worn backpack** — placement coupling, full transmission. A small
   **wearable `Vessel`**.
   - **Create** `lib/equipment/Pack.ts` — `WearableMixin(SlottableMixin(
     Vessel))` (a `Vessel` that can be worn). Since `Vessel` is now
     `Tangible` + `Container` + `Containable`, `Pack` only adds the
     wear/slot affordance. Natural sibling of `Garment` in `equipment`.
   - **Create** `seeds/domain/eternal/gear/backpack.yaml` — `class:
     /lib/equipment/Pack`, `data.slotClaims: { "/lib/body-plans/biped":
     [torso] }`, authored `mass` (empty-pack weight),
     `transmissionFactor` omitted (⇒ `1.0`).

   > **NOTE:** biped currently has no `back` slot — worn items use `torso`.
   > Either reuse `torso` for the pack (simplest) or add a `back` wearable
   > slot to `biped.yaml` (`{ name: back, accepts: WearableMixin, coupling:
   > 1.0 }`). **Default: reuse `torso`** to avoid touching the body plan's
   > slot universe; flag `back` as a content nicety.

2. **Bag of holding** — low transmission. A plain (carried, not worn)
   **`Vessel`**.
   - **Create** `seeds/domain/eternal/gear/bag-of-holding.yaml` — `class:
     /lib/stuff/Vessel`, `data.mass:` the empty bag's own (light) weight,
     `data.transmissionFactor: 0.05`. No new class needed — it's just a
     `Vessel` with a low factor. (Diegetic framing deferred; the mechanic is
     what matters now.)

3. **Heavy object** over a normal creature's strain ceiling — the lift gate.
   - **Create** `seeds/domain/eternal/gear/anvil.yaml` — `class:
     /lib/stuff/Thing`, `data.mass:` a value above `baseMass × CAPACITY_FRACTION
     × OVERLOAD_FACTOR` for the demo species (e.g. 200 kg). Real prop,
     exercises the GetController gate.

### Test bootstrapping

- Follow the existing fixture pattern (`domain/lounge/__tests__/lounge-fixtures.ts`,
  `Garment.test.ts`). The acceptance test (`api/__tests__/encumbrance.demo.test.ts`):
  - wears the backpack, stows a heavy item, asserts borne burden = worn floor
    (not the loose surcharge) and hands are free (no `hand:*` occupancy);
  - drops gold into the bag of holding, asserts borne burden barely changes;
  - `get`s the anvil, asserts the lift declines.

## 9. Phase 8 — observability (load ratio through the existing query surface)

**Goal:** the load ratio is observable through the existing
inspection/query surface (acceptance criterion).

- The existing seam is `subscribableFields` (the per-mixin descriptor array
  the MQL-subscription / inspection-pane substrate reads — `Tangible.mass`
  already projects this way).
- **Decision:** surface
  - `borneBurden` → `{ value, unit: 'kg' }` (read via `getBorneBurden`)
  - `carryCapacity` → `{ value, unit: 'kg' }`
  - `loadRatio` → number (read via `getLoadRatio`)

  These are **derived reads** (no event wiring required in v1).

  > **NOTE (confirm at build time):** the exact host for a Creature-tier
  > `subscribableFields` entry and whether `Creature` (concrete class, not a
  > mixin) participates in the descriptor scan, or whether the entry must
  > ride a mixin the Creature composes. `getConditionBand` has **no**
  > subscribableFields entry, so there is precedent for derived readouts
  > surfacing through a non-subscribed path. **Resolve by matching how the
  > vitals build surfaced `getConditionBand`** to the cockpit/query and
  > following suit — that is the canonical "derived body readout is
  > observable" seam.

## 10. Phase 9 — the subsystem doc

**Goal:** `docs/subsystems/encumbrance.md` (a deliverable).

- **Create** `docs/subsystems/encumbrance.md` documenting:
  - The gauge: `getBorneBurden` / `getCarryCapacity` / `getLoadRatio`,
    derived-on-read, on `Creature`, delegating to `EncumbranceApi`.
  - The weighted tree-walk: both stores (contents + slots), transmission
    product, placement coupling, the loose-carry-surcharge v1 model (the
    ambiguity decision from §5), cycle/depth safety.
  - The capacity formula: `baseMass`-seeded body mass × `CAPACITY_FRACTION` ×
    margins (condition band, endurance), the spiral, the gentle floor.
  - The two coupling homes: `Vessel.transmissionFactor` (container-objects)
    and `SlotSpec.coupling` (body-plan slots), with the default-by-kind
    rule.
  - The `Vessel` reconception: container-object at any scale, carriability
    emergent from mass (`Vessel` is already `Tangible`), the `Thing` ↔
    `Vessel` line ("a Thing that holds things"), and that `Adornable` now
    lives on `ExitableVessel` not the `Vessel` base. Also update `spatial.md`
    and the (stale) `Vessel` class doc-comment.
  - The consequence ladder: lift gate (strain ceiling, envelope decline),
    locomotion veto (climb/swim/fly, `gate: 'encumbrance'`), traversal drain
    (narrow, `Reserved` only). Recovery deferred to the metabolism build —
    v1 drain is one-way, gentle.
  - Where the engine constants live (`ENCUMBRANCE_DEFAULTS`) and that they are
    deferred dials, GameConfig the eventual home.
  - The deferred tails (cart/conveyance handoff, survival ticks, the collapse
    driver, environmental margins, tissue-derived mass, numeric tuning,
    augment-conferred capacity).
- Add a cross-reference entry to the `docs/` map in `CLAUDE.md` (the
  subsystem list).

## 11. Test strategy summary (acceptance-criterion → test)

| Acceptance criterion | Test file | Case |
|---|---|---|
| `getBorneBurden` sums carried+worn+held through nested containers w/ coupling | `api/__tests__/encumbrance.gauge.test.ts` | nested container; worn item; held/loose at surcharge; attenuating container ~0; cycle/depth |
| `getCarryCapacity` body-mass-derived w/ condition + endurance margins | same | baseline; degraded band lowers; low endurance lowers (spiral) |
| Mass defaults from `BodyPlan.baseMass`; authored mass is the deviation | `lib/creature/__tests__/Creature.mass.test.ts` | plan-default; authored-deviation; sessile=0; `setBaseMass` invariant |
| Load ratio observable via query/inspection | `api/__tests__/encumbrance.observability.test.ts` | `getLoadRatio` / projection read |
| Lift past strain ceiling declined; between capacity and ceiling succeeds | `obj/command/inventory/__tests__/GetController.encumbrance.test.ts` | anvil declined w/ note; 25 kg overload succeeds; non-creature ungated |
| Overloaded refused climb/swim/fly; unloaded not | `api/__tests__/locomotion.encumbrance.test.ts` | overloaded climb declined `gate:encumbrance`; unloaded passes; walk never gated |
| Loaded traversal drains endurance; light does not (recovery deferred to metabolism) | `obj/command/movement/__tests__/LocomotionController.encumbrance.test.ts` | command-driven loaded drain; light no-drain; rider-on-conveyance no-drain; raw `traverse` no-drain |
| Move substrate stays encumbrance-agnostic (§1.4 invariant) | `lib/spatial/__tests__/Mobile.encumbrance-agnostic.test.ts` | raw `Mobile.traverse` / `ContainmentApi.move` / `forceMove` of an over-ceiling item: no block, no drain |
| The spiral: lower endurance lowers capacity, gentle floor | folded into `encumbrance.gauge.test.ts` | endurance→capacity, floor not zero |
| `Vessel` gains `transmissionFactor`; `Adornable` narrowed to `ExitableVessel`; existing seeds unaffected | `lib/stuff/__tests__/Vessel.test.ts` + existing `ExitableVessel`/Boundary suites | `transmissionFactor` default 1.0 + range-validated; plain `Vessel` is `!isAdornable`; `ExitableVessel` is `isAdornable` + door surfaces as fixture; legacy seed hydrates unchanged |
| Three demo objects real + exercise their axis | `api/__tests__/encumbrance.demo.test.ts` | backpack worn floor + hands free; bag-of-holding ~0; anvil lift decline |
| `docs/subsystems/encumbrance.md` exists | n/a (doc deliverable) | — |

Tests are colocated in `__tests__/` siblings, Vitest. Use the
`CommandApi.createCommandContext` factory + scene assertions for the
GetController test (per response-envelope conventions). Construct creatures
via `StuffApi.create(() => new Creature())` with species/plan singletons
loaded, mirroring the vitals tests' fixtures.

## 12. Phase ordering, dependencies, and the critical/risky files

**Order** (each phase compiles + tests green before the next):
1. Phase 1 (`baseMass` + mass seeding) — foundation for capacity.
2. Phase 2 (`SlotSpec.coupling`) — pure additive field.
3. Phase 3 (`Vessel` `transmissionFactor` field + narrow `Adornable` to
   `ExitableVessel`) — edits shipped base classes (`Vessel`, `ExitableVessel`);
   run the Boundary/ExitableVessel/perception suites as the regression guard.
4. Phase 4 (`EncumbranceApi` gauge + Creature methods) — the core; depends on 1–3.
5. Phase 5 (lift gate) — depends on 4.
6. Phase 6 (locomotion veto + traversal drain; recovery deferred) — depends on 4.
7. Phase 7 (demo content) — depends on 3, 4, 5.
8. Phase 8 (observability) — depends on 4.
9. Phase 9 (subsystem doc) — last.

**Cross-cutting dependency:** everything depends on the branch being cut from
an up-to-date `master` (the vitals substrate is already merged there at
`fafdd33`; fetch/update local `master` first — see §0).

### Critical / risky files

- **`packages/server/src/mud/api/encumbrance.ts`** (new) — the whole gauge +
  the consequence helpers; the tree-walk correctness (both stores, coupling,
  cycle/depth, loose-carry model) is the build's load-bearing logic. Highest
  risk: silently undercounting slot occupants, or double-counting, or
  mis-propagating transmission vs placement.
- **`packages/server/src/mud/lib/creature/Creature.ts`** (modify) — the mass
  seeding step (two-phase hydration timing) and the gauge method surface.
  Risky because the post-hydrate seeding hook is the one under-determined
  seam (§2 note).
- **`packages/server/src/mud/lib/spatial/Mobile.ts`** — **NOT modified
  (invariant §1.4).** `Mobile.traverse` must stay encumbrance-agnostic. Any
  edit here is a red flag in review.
- **`packages/server/src/mud/obj/command/movement/LocomotionControllerBase.ts`**
  (modify) — the traversal drain goes here, after the actor's own-power
  traverse (not the conveyance-host branch). Risk: draining a rider for a
  vehicle's movement, or draining on a failed/vetoed traverse. Drain only on
  the confirmed self-powered move.
- **`packages/server/src/mud/api/locomotion.ts`** (modify) — the veto must be
  *alongside* the capability check and only in the enablement-scope path
  (climb/swim/fly), never gating walk; `TraversalGuard.gate` union extension.
  It's the controller's pre-move gate (command-invoked), not raw `traverse`.
- **`packages/server/src/mud/obj/command/inventory/GetController.ts`**
  (modify) — the lift gate must be a diegetic envelope decline (not a
  throw/boolean), must skip cleanly in `get all`, and must not regress
  non-creature looting.
- **`packages/server/src/mud/lib/stuff/Vessel.ts` + `lib/boundary/ExitableVessel.ts`**
  (modify) — edits **shipped base classes**: add `transmissionFactor` to
  `Vessel`, drop `AdornableMixin` from the `Vessel` base, add it to
  `ExitableVessel`. (`Vessel` is *already* `Tangible` — no mass change.)
  Risk: a mixin-order break, or a fixture/boundary path that doesn't narrow
  on `isAdornable` (none found — every consumer narrows). Regression guard:
  the existing Boundary / `ExitableVessel` / perception-modality suites must
  stay green.

Secondary (lower risk, additive): `lib/species/BodyPlan.ts`,
`lib/slot/Slotted.ts` (SlotSpec field), the demo seed YAMLs (backpack,
bag-of-holding, anvil), `lib/equipment/Pack.ts` (wearable `Vessel`),
`docs/subsystems/encumbrance.md`.

### Open ambiguities flagged for the implementer (none reopen settled scope)

1. **Mass-seeding hook** (§2): `PostRegistrationMixin.postRegister` override
   vs lazy seed-on-read. Prefer the post-register hook if `Creature` composes
   it; confirm.
2. **`get` and hand slots** (§5): v1 does not add hand-slot claiming; loose
   contents pay the held surcharge in the burden walk. Decided — documented
   in the subsystem doc.
3. **Observability wiring** (§9): follow the `getConditionBand` surfacing path
   the vitals build established.
4. **Backpack worn slot** (§8): reuse biped `torso` (chosen) vs add a `back`
   slot.

All four are mechanism choices within the requirements' settled surface; each
has a chosen default and a documented fallback.
