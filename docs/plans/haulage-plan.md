# Cart & haulage — implementation plan

A cart already mostly works: cargo in a cart's container is invisible to the encumbrance tree-walk, so `put X in cart` drops weight for free today. This build adds the cost of moving the cart itself (a single attenuated draft term), the `hitch`/`unhitch` verbs, the live-ref tow, and two diegetic move-time gates — all without touching the raw move primitive for encumbrance.

Verified anchor files: `lib/encumbrance/LoadBearing.ts`, `lib/stuff/Vessel.ts`, `lib/slot/{Mountable,Drivable,Wieldable}.ts`, `lib/spatial/Mobile.ts` (ripple at lines 419–439), `obj/api/LocomotionLogic.ts` (`canTraverseExit` 213–238, `checkEnablementScope` 419–466, `engageAround` 327–355), `lib/boundary/Exit.ts` (`TraversalGate` 55–64, `media`/`allowsMode` 284–328), `lib/boundary/Exitable.ts` (`ExitInstruction` 175, `applyExits` 479–555), `obj/command/movement/{Mount,Dismount}Controller.ts`, `obj/command/inventory/{Get,Wield}Controller.ts`, `lib/mixin.ts` (registry), `api/mixin.ts` (`is*` 487+), `lib/character/Character.ts` (composition 74–94), `packages/types/src/index.ts` (`LocomotionGateFailedNote` 305–318).

Key resolved decisions up front:
- **No new Api, no new module category.** Haulage rides existing surfaces: `LoadBearing.getBorneBurden` (draft term), `LocomotionLogic.canTraverseExit` (gates), `Mobile.traverse` ripple (tow), `ContainmentApi.move` (cart motion), two new mixins in the existing conveyance/slot family `lib/slot/` (where `Mountable`/`Drivable` already live).
- **Two new mixins.** Cart side `HaulableMixin` (`lib/slot/Haulable.ts`) on `Vessel`; hauler side `HaulerMixin` (`lib/slot/Hauler.ts`) on `Character`. The hauler ref genuinely needs a home — it is read by four subsystems (burden, tow, slot/wield enforcement, locomotion gates) and needs an `onDestruct` cleanup site and an `isHauling` narrowing; bolting it onto `LoadBearing` or `Mobile` would force the other three to reach across and would over-broaden `Mobile` (composed by every future NPC/vehicle).
- **The coupling is a Pattern-B live ref, R2.2 symmetric pair** (`hauler._hauling` ↔ `cart._hauledBy`) with an R2.3 self-heal backstop in the getters — exactly the `Exit`↔`Door` / `Boundary`↔`BoundaryAnchor` shape (ref-shapes.md). Symmetric gives clean reciprocal clear on either destruct, a free "already-hitched / multi-hauler" guard, and matches the doc's cleanup-on-both-sides requirement.
- **`getDraftLoad` reuses the tree-walk by call-through to a single narrow export from its home module.** Promote nothing duplicative: add one exported helper `effectiveContentsBurden(container): number` to `LoadBearing.ts` (the documented single home for the walk) wrapping the existing private `walk`. The `HaulableMixin.getDraftLoad()` imports that one function. No free-floating helper, no duplicated recursion, no new Api — the walk's home stays `LoadBearing.ts`.

---

## Phase 0 — Registry & capability plumbing

Foundational, compiles standalone.

**Files modified:**
- `lib/mixin.ts` — add `Haulable: 'HaulableMixin'` and `Hauler: 'HaulerMixin'` to `Mixins`.
- `api/mixin.ts` — add `isHaulable(obj): obj is Stuff & Haulable` and `isHauling(obj): obj is Stuff & Hauler` (mirror `isMountable`/`isDrivable` at lines 487+; `hasMixin(obj, Mixins.Haulable/Hauler)`).
- `lib/boundary/Exit.ts` — extend `TraversalGate` union (line 55) with `'terrain'` and `'breakaway'`.
- `packages/types/src/index.ts` — extend `LocomotionGateFailedNote['gate']` (line 307) with `'terrain'` and `'breakaway'`.

**Tests:** none yet (type-only); covered downstream.

---

## Phase 1 — Cart side: `HaulableMixin` + the draft load

**Files added:**
- `lib/slot/Haulable.ts` — `HaulableMixin`, constraint `MixinConstructor<Stuff & Container & Tangible>` (composed on `Vessel`, which supplies `getContents` + `getMass`). Surface:
  - `draftFactor: number` — Pattern: own private `_draftFactor` + accessor pair with the **`transmissionFactor` validation precedent** (`Vessel.ts:61-77`): finite, `0..1`, else `RangeError`. `static persistentFields = ['draftFactor', 'handedness', '_passageModePath', ...]`.
  - `handedness: number` (default `2`, validated `1` or `2`) — hands the haul claims.
  - `getPassageMode()/setPassageMode()` — **Pattern A** ref echoing `Drivable.vehicularMode` (`Drivable.ts:82-92`); `_passageModePath` default the `wheeled` singleton path. Read by the terrain gate.
  - `getDraftLoad(): Quantity<'kg'>` = `Quantity.of((this.getMass().rawValue() + effectiveContentsBurden(this)) * this._draftFactor, 'kg')`.
  - `_hauledBy` live ref + `getHauledBy()` (R2.3 self-heal on `isDestroyed()`), `setHauledBy(hauler|null)`, `onDestruct()` clears `hauledBy?._hauling` then `super.onDestruct()` (R2.2).
- `lib/slot/__tests__/Haulable.test.ts`.

**Files modified:**
- `lib/encumbrance/LoadBearing.ts` — export `effectiveContentsBurden(container: Stuff): number`: a thin wrapper that loops `ContainmentApi.getContents(container)` and sums `walk(item, 1.0, 1.0, 0, visited)` (transmission seeded `1.0`, **worn-floor placement** — cargo in a cart isn't held-in-hand; the cart is the placement root, exactly as the bearer is in `getBorneBurden`). The private `walk` recursion stays private; only this one documented entry point is exported. A nested bag-of-holding still attenuates via its own `transmissionFactor` inside `walk` — the ~0 case is honored for free.

**Decisions resolved:** the cart's *own* `transmissionFactor` is **not** applied to its contents for draft (the cart's coupling is `draftFactor`, not transmission); seeding the walk at `1.0` keeps `cartSelfMass + cartEffectiveContents` matching the spec formula exactly, and the conventional cart `transmissionFactor: 1.0` makes it moot anyway. `draftLoad` is **effective-kg**, same `Quantity<'kg'>` as true mass — discipline note: never summed into true mass.

**Tests close:** `draftFactor` validation (`0..1`, reject `1.2`/`-0.1`/`NaN`); `getDraftLoad` over empty cart (`selfMass × draftFactor`), loaded cart (`(self + cargo) × draftFactor`), and a cart holding a low-`transmissionFactor` Vessel (bag-of-holding contributes ~0); `handedness` validation; `getPassageMode` defaults to `wheeled`.

---

## Phase 2 — Hauler side: the live ref + the draft burden term

**Files added:**
- `lib/slot/Hauler.ts` — `HaulerMixin`, constraint `MixinConstructor<Stuff & Containable>`. Surface:
  - `_hauling: (Stuff & Haulable) | null` live ref (runtime-only; **not** in `persistentFields` — live refs are transient by definition).
  - `getHauledCart()` — R2.3 self-heal getter (clear on `isDestroyed()`).
  - `isHauling()` predicate.
  - `hitch(cart)` — atomic R2.2 setter: `this._hauling = cart; cart.setHauledBy(this)`. `unhitch()` — `this._hauling?.setHauledBy(null); this._hauling = null`.
  - `getHaulDraft(): Quantity<'kg'>` — `getHauledCart()?.getDraftLoad() ?? Quantity.of(0,'kg')`. This is the **single surface LoadBearing reads**, so `LoadBearing` never imports the cart class.
  - `onDestruct()` — clears `_hauling?.setHauledBy(null)` (R2.2 reciprocal) then `super.onDestruct()`. Fires on **Avatar destruct = real logout** (`Avatar.ts:483` "a real logout destructs the Avatar") → covers the logout cleanup acceptance case.
- `lib/slot/__tests__/Hauler.test.ts`.

**Files added:**
- `lib/character/HaulingCreature.ts` — `HaulingCreature = HaulerMixin(Creature)` (compose alongside whatever a rideable beast needs — `Mobile` + `Mountable`; verify the `Creature` mixin order and that `LoadBearing` is present so the draft term has a gauge). The dedicated home for draft beasts; draft-animal seeds derive from it. **`HaulerMixin` is NOT composed on the `Creature` base** — most creatures never haul, so per the encumbrance doc's *"compose the mixin, not the class tree"* rule it lands only on the player `Character` stack and on this class.

**Files modified:**
- `lib/character/Character.ts` — compose `HaulerMixin` adjacent to `MobileMixin` (inner of `Mobile` is fine; it reads only `Containable`, already in base): `MobileMixin(HaulerMixin(EngagedMixin(...)))`. This gives **every player** self-haul; a character-NPC inheriting it is harmless (it just never hitches).
- `lib/encumbrance/LoadBearing.ts` — in `getBorneBurden` (after the two store-walks, before `Quantity.of`): `if (MixinApi.isHauling(bearer)) total += bearer.getHaulDraft().rawValue();`. This is the **one extra term**; the entire ladder (`getLoadRatio`, climb/swim/fly veto, `drainForTraversal`) then flows through it unchanged. No edit to `Mobile.traverse` — compliant with the red-flag rule.

**Decisions resolved:** `HaulerMixin` is carved onto the player `Character` path + a dedicated `HaulingCreature` class, **not** the `Creature` base (user call — don't broaden every sprite/fish with a hauling ref). Both are `Creature`s, so the `LoadBearing` prerequisite for the draft term still holds. *Linkdead* (non-guest body lingering for reconnect) keeps the transient ref in memory (harmless; cart waits in the room; a restart drops the Pattern-B ref) — the testable cleanup cases (cart destruct, real logout) ride `onDestruct` + the self-heal getter. Flag below.

**Tests close:**
- **Free offload** (acceptance): `getBorneBurden` before vs after `ContainmentApi.move(chest, cart)` — unchanged, zero haulage code.
- **Draft term:** burden rises by exactly `(cartSelfMass + cartEffectiveContents) × draftFactor` across empty / loaded / bag-of-holding-inside.
- **Consequence reuse:** an over-capacity-under-ceiling loaded cart raises `getLoadRatio()`; `LocomotionApi.canTraverseExit(actor, climbExit, climb, …)` returns `gate:'encumbrance'` (existing `checkEnablementScope` veto, no new code); `drainForTraversal()` drains.
- **Endurance both ends:** a cart whose `draftLoad` keeps ratio ≤ `LIGHT_LOAD_FLOOR` → `drainForTraversal` is a no-op (zero drain); a heavy cart → drain (assert endurance reserve drops).
- **Live-ref cleanup:** destruct the cart → `getHauledCart()`/`isHauling()` self-heal to null; destruct the hauler → `cart.getHauledBy()` null (no dangling ref on either side).

---

## Phase 3 — Verbs + hands-occupied enforcement

**Files added:**
- `cmd/movement/hitch.yaml` — `verbs: [hitch]`, `controller: movement/HitchController`; validators `requiresAnimate`, `requiresPosed`, `requiresSlotted`; arg `target` (`scope: ["$focus","reachable"]`) with `mustBeVisible`, **`mustBeHaulable`** (new); **plus an optional `to <mount>` operand** (second arg, `scope: ["reachable"]`, `mustBeHauler` — must compose `HaulerMixin`, e.g. a `HaulingCreature`). Bare `hitch <cart>` = self-haul (giver is the hauler); `hitch <cart> to <horse>` = harness the named creature as the hauler. Mirrors `mount.yaml` for the single-target shape; the `to` form follows the existing two-operand verb pattern (check `put X in Y` / `give X to Y` for the prepositional-operand wiring).
- `cmd/movement/unhitch.yaml` — `verbs: [unhitch]`, `controller: movement/UnhitchController`; validators `requiresAnimate`, `requiresSlotted`, **`requiresHitched`** (new). Mirrors `dismount.yaml`.
- `obj/command/movement/HitchController.ts` — mirror `MountController`: resolve cart; assert `isHaulable`. **Two paths by whether a `to <mount>` operand is present:**
  - **Self-haul** (no `to`): the **giver** is the hauler. **Hands-free precheck** — decline if `isHauling(giver)` already, or if the giver's `WieldableMixin`-accepting hand slots are occupied for the cart's `handedness` count (consult `SlotApi`/`isSlotFull` on `hand:left`/`hand:right`); on success `giver.hitch(cart)` + scene `"You take hold of the cart."`.
  - **Harness** (`to <mount>`): the **mount** is the hauler (assert `isHauling`-capable / `HaulerMixin`, reachable). **No hands precheck** — a harnessed beast claims no hands, and the giver isn't the hauler so their hands stay free. `mount.hitch(cart)` + scene `"You hitch the cart to the <mount>."`. (Optionally require the giver be mounted-on / leading the target; v1 may just require reachable.)
  - **Overload never gates the hitch** (mirrors `get`: you can always grab a handle / buckle a harness) — only the hands precheck (self path) and `mustBeHaulable`/`mustBeHauler` can decline.
- `obj/command/movement/UnhitchController.ts` — mirror `DismountController`: `giver.unhitch()`; scene `"You let go of the cart."`. No-op-safe.
- `seeds/obj/command/movement/HitchController.yaml`, `UnhitchController.yaml` — `class:` lines, `data: {}` (mirror `MountController.yaml`).
- `lib/command/validators/mustBeHaulable.ts` (mirror `mustBeMountable.ts`: `MixinApi.isHaulable`), `lib/command/validators/mustBeHauler.ts` (`MixinApi.isHauling`-capable — composes `HaulerMixin`; for the `to <mount>` operand), `lib/command/validators/requiresHitched.ts` (mirror `requiresMounted.ts`: `MixinApi.isHauling(giver)`).

**Files modified (hands enforcement — derived-from-the-ref, the loose-carry virtual-occupation precedent):**
- `obj/command/inventory/WieldController.ts` — before `SlotApi.occupyAll` (after the body-plan/fit checks, line ~74): `if (MixinApi.isHauling(giver)) { scene "Your hands are full — you're pulling the cart."; note controller-rejected reason:'hands-hauling'; return; }`.
- `obj/command/inventory/GetController.ts` — in `pickUpOperand` (alongside the lift gate, line ~205): same `isHauling` guard → decline the loose-carry grab.

**Decisions resolved:** **derived-from-the-ref, not a real hand-slot claim** — the cart stays a room object (per the coupling decision), so parking it in a hand slot is wrong; instead `isHauling()` is the virtual hand-occupation, consulted at the two call sites the requirements name (`wield`, get-into-hands). **The hands tax self-resolves for the animal case**: the guard keys on `isHauling(giver)`, so when the player harnesses a cart *to a horse* the horse is the hauler and `isHauling(player) == false` → the rider's hands stay free. Hands-occupied is thus intrinsic to *hand*-hauling (self-hitch), needing no haul-mode flag. v1 enforcement is **binary** (hand-hauling ⇒ both wield and loose-carry refused); `handedness` is recorded on the cart and used only by the self-hitch precheck (need that many free hands to grab). Partial-hand nuance (a 1-handed cart leaving one hand to wield a dagger) is a flagged deferral — it needs real per-hand slot accounting the cart-in-room model deliberately avoids.

**Tests close:** `hitch cart` sets the coupling and refuses subsequent `wield`/`get`; `unhitch` clears it and re-permits both; `hitch` declined when hands already full; `requiresHitched` rejects `unhitch` when not hauling; `controller-rejected` / `empty-result` envelope notes per the response-envelope pattern.

---

## Phase 4 — The tow

**Files modified:**
- `lib/spatial/Mobile.ts` — in the conveyance ripple region (right after the slot-occupant loop, lines 419–439, before the post-move hooks): add a tow block:
  ```
  if (MixinApi.isHauling(mover)) {
    const cart = mover.getHauledCart();
    if (cart) ContainmentApi.move(cart, destination);
  }
  ```
  This reads **no encumbrance** (no burden/capacity) — purely the conveyance coupling — so it honors the red-flag rule, exactly as the existing rider ripple is conveyance code in this same region. The cart's **cargo follows structurally**: cargo's `environment` is still the cart, which now lives in `destination`; nothing moves the cargo separately, and it never reaches `engageAround` → never drains/gated (the walked-vs-towed exclusion is structural, like conveyance riders).

**Decisions resolved:** use `ContainmentApi.move` (the Api primitive), not raw containment, not `cart.traverse` (a plain handcart is inert, not `Mobile` — the crash-test-dummy/container model). A plain creature with no `_hauling` ref misses the `isHauling` narrowing entirely → reaches none of it.

**Tests close:** **Tow** (acceptance) — a hitched hauler's `traverse` moves the cart *and* its cargo to the destination as a unit (assert both `environment`s); a non-hauling creature's traverse leaves room objects untouched. **Ridden tow** — a player mounted on a `HaulingCreature` that hitches a cart: the *horse's* `traverse` carries the rider (existing ripple) **and** tows the cart+cargo (new block), all four landing in the destination.

---

## Phase 5 — The two move-time gates

**Files modified:**
- `lib/boundary/Exit.ts` — add `wheelPassable` (default **true**): private `_wheelPassable = true`, `isWheelPassable()/setWheelPassable()`, `ExitOptions.wheelPassable?`, constructor `this._wheelPassable = opts.wheelPassable ?? true` (near `setMedia`, line 394). Exits are reconstructed from the `exits` instruction (not persisted as Stuff), so no persistence handler is touched.
- `lib/boundary/Exitable.ts` — `ExitInstruction` (line 175) gains `wheelPassable?: boolean`; `applyExits` (line ~552) passes `wheelPassable: spec.wheelPassable` into the `new Exit({...})`.
- `obj/api/LocomotionLogic.ts` — in `canTraverseExit` (213–238), after `checkEnablement` passes, append a haulage check (module-private helper `checkHaulage(hauler, exit)`). **Resolve the hauler against the actual traverser, not the commanding actor**: for a passthrough (ride/drive) move the host traverses, so check the **conveyance host** (`findConveyanceHost(actor, mode)` — already used in the enablement gate for passthrough) and fall back to `actor` for a self-powered move. Then gate on `MixinApi.isHauling(hauler)`. This closes the mounted-move hole — a rider whose horse hauls a cart is gated by the *horse's* hauling state + ceiling, not the rider's (`isHauling(rider) == false` would otherwise wave it through). This is the **veto layer explicitly allowed to read encumbrance / draft / strain ceiling**; walk has no `enablementMixin` so the gates can't live in `checkEnablementScope`. Two sub-gates (read off the resolved `hauler` + its cart):
  - **Terrain:** resolve `cart.getPassageMode()` (default `wheeled`); reject if `!this.exitAllowsMode(exit, passageMode)` **or** `!exit.isWheelPassable()`. Gate `'terrain'`, reason `"You can't drag the cart that way."` / `"… up the stairs."`. The (a) ladder/ford/air path is refused **for free** by the existing `exitAllowsMode` (`wheeled` medium is `ground`, absent from those exits) — assert no new gate code on that path. The (b) stairs path (`media:['ground']` but `wheelPassable:false`) is the one residue the bit covers.
  - **Breakaway:** reject if `cart.getDraftLoad().rawValue() > actor.getStrainCeiling().rawValue()`. Gate `'breakaway'`, reason `"The cart won't budge."`. The hitch stays intact (gate vetoes the *move* only).
- `obj/command/movement/LocomotionControllerBase.ts` — `composeRejection` (182): add `case 'terrain'` / `case 'breakaway'` returning `guard.reason ?? …` (the default branch already surfaces `guard.reason`, but explicit cases are clearer); `mapGate` (210): add `case 'terrain': return 'terrain'` / `case 'breakaway': return 'breakaway'`.

**Decisions resolved:** both gates at the `LocomotionApi` veto layer where the overload veto already lives (`checkEnablementScope`'s `'encumbrance'`), never bolted onto `Mobile.traverse`. `getStrainCeiling` is physiology-derived (capacity × `OVERLOAD_FACTOR`), and `enduranceMargin` shaves capacity as endurance empties → **exhaustion lowers the budge threshold emergently** (no new code). Breakaway compares `draftLoad` vs ceiling per the spec (not total burden).

**Tests close:**
- **Terrain (a):** hitched hauler blocked at a ladder/ford/air exit; assert the rejection comes through the existing `exitAllowsMode` with no haulage-specific branch taken.
- **Terrain (b):** blocked at a `media:['ground']` stairs exit with `wheelPassable:false`; `locomotion-gate-failed { gate:'terrain' }` note + scene line; a non-hauler walks the same exit fine.
- **Breakaway:** `draftLoad` over ceiling → move vetoed (`gate:'breakaway'`, `"won't budge"`), `isHauling()` still true after.
- **Exhaustion lowers budge:** a cart that traverses when fresh hits breakaway after draining endurance (drive the reserve down via repeated `drainForTraversal`/direct adjust, re-check `canTraverseExit`).
- **Ridden gate (host-resolved):** a rider on a `HaulingCreature` hitched to a cart — `canTraverseExit(rider, stairsExit, ride, …)` is **declined** (gate `terrain`) because the resolved hauler is the *horse*, and breakaway fires off the *horse's* ceiling; assert a rider whose horse is **not** hauling traverses the same exit fine (no false-positive gating).
- **Animal bears the draft, rider doesn't:** `horse.getBorneBurden()` rises by the cart's `draftLoad`; the mounted `rider.getBorneBurden()` is unchanged by the cart; a draft horse's ceiling budges a cart over a human's.

---

## Phase 6 — Demo content

**Files added:**
- `seeds/domain/eternal/gear/handcart.yaml` — `class: /lib/stuff/Vessel` composed with `HaulableMixin` (define a thin concrete `lib/equipment/Handcart.ts = HaulableMixin(Vessel)` if YAML can't compose a bare mixin — mirror how `Pack` is a concrete wearable Vessel subclass under `lib/equipment/`; check the `Pack` precedent and follow it). Authored `data`: `mass` (cart frame, e.g. `25`), `draftFactor: 0.03` (well-wheeled, common case → light-load → zero drain), `handedness: 2`, `passageMode: wheeled`, `transmissionFactor: 1.0`, keywords/descriptions. The worked example for the subsystem doc.
- A stairs exit for the terrain gate: extend an existing eternal demo room's `exits` instruction with an `up` exit `media: ['ground'], wheelPassable: false` (a staircase that admits walking but refuses wheels) plus a level wheel-passable cardinal exit for the happy path.
- A **draft-animal seed** deriving from `lib/character/HaulingCreature` (a cart-horse): `Mountable` + a big `baseMass` so its capacity budges a loaded cart a human couldn't, `passageMode`/locomotion as appropriate. The worked example for the animal-haul path in the subsystem doc.
- `lib/equipment/__tests__/Handcart.demo.test.ts` (mirror `LoadBearing.demo.test.ts`) — the acceptance roster as one integration test: `put chest in cart` (free offload) → `hitch` (hands occupied) → level exit (cart + chest arrive) → stairs `up` (declined, terrain) → `put anvil in cart` over the ceiling → declined, breakaway.
- A **ridden-haul integration test** (same or sibling file): `hitch cart to horse` → `mount horse` → move on a level exit (rider + horse + cart + cargo all arrive; rider's burden unchanged) → a stairs exit declined via the host-resolved gate → the heavy cart the human couldn't budge rolls behind the horse.

---

## Phase 7 — Docs (sweep)

Graduate the model — draft-term-in-burden, the R2.2 live-ref tow, the two gates, the `wheelPassable` bit, and the animal-haul composition (`HaulingCreature` + `hitch to <mount>` + host-resolved gating) — into `docs/subsystems/encumbrance.md` (the draft term + consequence reuse) and `docs/subsystems/conveyance.md` (the inverted coupling, the tow, the verbs, the orthogonal mount⊕haul couplings); retire the encumbrance slate's "cart hinge" tail. Doc-only; handled at the finalize sweep.

---

## Flags (genuine ambiguities the requirements didn't fully settle)

1. **Linkdead vs. logout.** Requirements list "hauler logout/linkdead" as a cleanup site. Real logout destructs the Avatar → `onDestruct` clears cleanly (tested). A *linkdead* body lingers for reconnect; since `_hauling` is a runtime-only Pattern-B ref, I keep it (cart waits in the room; restart drops the transient ref). If product wants a linkdead body to drop its cart immediately, that needs an explicit hook on the linkdead witness (`Avatar.ts:~721`) — small add, flagged rather than silently wired.
2. **Partial-hand occupation.** `handedness` is authored and gates the hitch precheck, but v1 wield/loose-carry enforcement is binary (hauling ⇒ refused). A 1-handed cart leaving one hand free to wield needs real per-hand accounting that the cart-in-room model deliberately avoids — deferred, not invented.
3. **"…pulling the cart" arrival prose** (acceptance roster) is cosmetic; the testable contract is the cart+cargo arriving as a unit plus the gate notes. I'd let it ride the hauler's existing movement message as optional polish rather than coupling `Mobile` narration to haulage.
4. **Handcart composition shape** — whether the seed composes `HaulableMixin(Vessel)` via a concrete `lib/equipment/Handcart` subclass (the `Pack` precedent) or YAML can target a mixin directly. I lean to the concrete subclass to match `Pack`; verify the `Pack` seeding path during Phase 6.
5. **`ExitableVessel` carts** (a cart you can also enter) would hit `ContainmentApi.move`'s Exitable cross-zone invariant during the tow — out of scope (v1 carts are plain `Vessel`s), flagged for any future enterable-cart composition.

---

## Critical files for implementation
- `packages/server/src/mud/lib/encumbrance/LoadBearing.ts`
- `packages/server/src/mud/obj/api/LocomotionLogic.ts`
- `packages/server/src/mud/lib/spatial/Mobile.ts`
- `packages/server/src/mud/lib/boundary/Exit.ts` (+ `lib/boundary/Exitable.ts`)
- `packages/server/src/mud/lib/character/Character.ts` (composition site for the two new `lib/slot/{Haulable,Hauler}.ts` mixins) + `lib/character/HaulingCreature.ts` (the draft-beast carve)
