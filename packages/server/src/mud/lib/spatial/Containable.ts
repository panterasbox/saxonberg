/**
 * ContainableMixin — anything that lives inside a Container.
 *
 * State-mutation chokepoint: `setContainer(container)` is the only
 * place the container's `contents` and the item's `environment`
 * fields are updated atomically.
 * `ContainmentApi.move` is the policy / hook layer above; it calls
 * `setContainer` once, which orchestrates the cross-object
 * mutation:
 *
 *   1. `oldContainer.removeContainable(this)` if there was a previous
 *      environment.
 *   2. `newContainer.addContainable(this)` if there is a new one.
 *   3. `this.environment = newContainer`.
 *
 * Lockdown contract (Phase 5):
 *   - `setContainer` is `@Final` (no subclass override —
 *     out-of-sync state is catastrophic), `@Unshadowable`, and
 *     `@CallSecurity`-gated to ContainmentApi callers only. Detach
 *     is `ContainmentApi.move(item, null)`; a direct
 *     `setContainer(null)` is rejected by policy.
 *
 * Witness hooks (optional methods on the interface):
 *   - `canMove(to)` — pre-move veto on the moving item.
 *   - `onMoved(from, to)` — post-move notification. Either argument
 *     may be `null` for first-placement / final-detach edges.
 *
 * ⚠⚠ **`canMove` is for a CLASS INVARIANT, never for "a person can't
 * take that."** It fires inside `ContainmentApi.move`, which is the
 * chokepoint *everything* goes through — a remodel, a `place`, a room
 * being rebuilt, an author moving scenery. A veto there says the move is
 * **impossible**, not that the actor lacks the standing to make it, and
 * there is no actor in its arguments to reason about anyway.
 *
 * The thing you almost always mean is much narrower: *this cannot be
 * picked up or carried off by an agent* — which is `fixedInPlace`, a
 * STATE the row authors and the taking verb reads. A wall-mounted screen
 * is not immovable; it is not pocketable. Those are different facts, and
 * only the second one belongs to `get`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff, EvictionContext } from '../stuff/Stuff';
import type { Container } from './Container';
import type { Placing } from './Placing';
import type { VetoResult } from '../errors';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { StuffApi } from '../../api/stuff';
import { MqlSubscriptionApi } from '../../api/mql-subscription';

/**
 * Public shape provided by ContainableMixin.
 *
 * The optional Witness methods fire from `ContainmentApi.move`.
 * Implement only the ones you care about.
 */
export interface Containable {
  setContainer(container: (Stuff & Container) | null): void;
  getContainer(): (Stuff & Container) | null;
  /**
   * Walk the container chain to the topmost non-null environment.
   * Returns `null` when this Stuff is already at the root (its own
   * `getContainer()` is null) — the caller decides whether "I am
   * the root" should be treated as the result or as no-op.
   *
   * Counterpart to `ContainerMixin.getDeepContents()` — both side
   * helpers for "walk all the way" navigation. Used by MQL's `:E`
   * transform; equally available to controllers that want to find
   * the world / zone / outermost room without rolling their own
   * loop.
   */
  getRootContainer(): (Stuff & Container) | null;

  /**
   * Declarative-content applier. Phase 2 of the Hydrator's two-
   * phase dispatch reads `data.container` from the source template
   * and calls this method with the resolved templatePath. The
   * applier resolves the target via `StuffApi.singleton` (the
   * target MUST be singleton-shaped — validated at template-save
   * time by `TemplateApi.validateSingletonContainerTarget`) and
   * moves self into it via `ContainmentApi.move`.
   *
   * Per-call idempotency: compare current container's templatePath
   * to the declared path; no-op when they match. The compare-and-
   * move shape supports both fresh-clone placement AND
   * `Avatar.restore()` re-move semantics with no flag.
   *
   * @hook Invoked by the `Hydrator`'s Phase-2 instruction dispatch from
   *   a template's `container` field (self-placement during the clone
   *   cascade). **Instruction applier** — no paired getter (not a
   *   property); idempotent (compare-and-move, no-op when already in
   *   the declared container).
   */
  applyContainer(path: string): Promise<void>;

  /**
   * ⭐ **Where inside its container this thing sits** — the placement
   * host and the name of the relation (`on` a desk, `in` a compartment,
   * `from` a hook), or `null` when the thing is merely loose.
   *
   * Orthogonal to `getContainer()` — the apple is in the room AND on
   * the desk; both relationships are real, and reading the room's
   * contents still finds the apple.
   *
   * **The host is an instance (live) ref**, so the R2.3 self-heal runs
   * in the proxy get trap: a host destructed since the last set reads
   * as no placement at all. An identity ref by templatePath only
   * resolves unambiguously for singleton hosts, which would constrain
   * the natural case of several identical tables in one hall.
   *
   * ⚠ The PAIR is persisted, by the container's slice — see
   * `ContentPlacement` in `lib/persistence/PersistenceSlice.ts`, which
   * records the host's index within the same contents list and the
   * member name, and `PersistableLogic`'s placement pass, which
   * re-places on restore. (This docstring used to say the relationship
   * reset on restart; that stopped being true when the slice learned to
   * record it.)
   */
  getPlacement(): { host: Stuff & Placing; name: string } | null;

  /**
   * Privileged setter — only `ContainmentApi.place` /
   * `ContainmentApi.move` may call. Runtime-rejected by the
   * call-security gate otherwise. Authors don't touch this directly;
   * the Api maintains the invariant that a placement is only set when
   * the item's container matches the host's container.
   *
   * Pass `null` to clear (apple lifted off the desk).
   */
  _setPlacement(host: (Stuff & Placing) | null, name?: string): void;

  /**
   * ⭐ **What stands between me and my container, for air, sight and
   * reach.** The placement host when this thing is placed under a
   * member whose `encloses` is true (a compartment with its own air);
   * otherwise the container itself.
   *
   * A mug on a desk reads the room's air; a steak in a cold
   * compartment reads the compartment's. Read by `Thermal`'s ambient
   * resolution and by `PerceptionLogic.canReach` (a shut enclosing
   * host is not reached into).
   *
   * ⭐ Stepping further outward — through a non-atmospheric container
   * until a scope with air answers — is NOT this. That walk lives in
   * `lib/thermal/Thermal.ts` as `airScopeOf`, and **this method is its
   * step**. The two questions are *what holds me* (here) and *what air
   * reaches me* (there); they were the same call until the base-class
   * narrowing build, when `AtmosphericMixin` left `Vessel` and a bag
   * stopped pretending to be weather.
   */
  getEnclosingScope(): Stuff | null;

  /**
   * ⭐ **Bolted down: no agent picks this up or carries it off.** The
   * wall TV, the terminal's brass pillar, a bench cemented to the
   * pavement. Read by the verbs that model *a person taking a thing*
   * (`get`), never by `ContainmentApi.move` — a remodel, a `place`, an
   * author rearranging scenery all still move it, because they are not
   * agents pocketing it.
   *
   * It is a per-INSTANCE, authorable fact, which is the other half of
   * why it is not a `canMove` override: whether a given screen is bolted
   * to the wall or standing on a counter is the ROW's business, and a
   * class-level veto could never say.
   */
  isFixedInPlace(): boolean;
  setFixedInPlace(fixed: boolean): void;

  /**
   * Optional pre-move veto on the moving item itself. ⚠ A CLASS
   * INVARIANT only — see the note at the top of this file. For "an agent
   * cannot take this", use `fixedInPlace`.
   */
  canMove?(to: (Stuff & Container) | null): VetoResult;

  /**
   * Fired after the item has moved. Either `from` or `to` may be
   * `null` for first-placement / final-detach edges. Single hook
   * covers every transition — no separate "placed" / "removed"
   * methods on the item side.
   */
  onMoved?(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null
  ): void;
}

// ContainmentApi's logic now lives in the /platform/idea/api/containment logic
// singleton (the Api face is a thin forwarding shell). Admit both the
// face module and the logic singleton's template path so the
// `setContainer` / `_setRestingOn` chokepoints stay reachable only
// through the containment subsystem.
const FromContainmentApi = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/containment#ContainmentApi', {
    includeSubclasses: false,
  }),
  SecurityPolicies.FromTemplate('/platform/idea/api/containment'),
);

export function ContainableMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ContainableMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'ContainableMixin';

    /**
     * Residency veto: anything anywhere inside an interactive holder
     * (Avatar / Login) stays resident — player-held stuff is precious,
     * and this protects a disconnected-but-in-memory avatar's inventory
     * that presence-touch doesn't reach. Self-knowable walk up the
     * container chain; falls through to `super` otherwise.
     */
    public canEvict(context: EvictionContext): VetoResult {
      let cur: (Stuff & Container) | null = this.getContainer();
      while (cur !== null) {
        if (MixinApi.isHasInteractive(cur)) {
          return { ok: false, reason: 'inside an interactive holder' };
        }
        cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
      }
      return super.canEvict(context);
    }

    /**
     * Instruction field — declarative spawn target. Consumed by
     * Phase 2 of the Hydrator. There is NO paired `getContainer(path)`
     * declaration accessor; the live `getContainer()` ref is the
     * only runtime getter.
     */
    static fieldMeta: FieldMeta = {
      container: { instruction: true, authorable: true, authorPicker: 'Template' },
      fixedInPlace: { persistent: true, authorable: true },
      // Both reference fields are instance refs, so both self-heal on
      // read. Neither is persistent — see the field docs below.
      environment: { ref: 'instance', lifetime: 'weak' },
      _placementHost: { ref: 'instance', lifetime: 'weak' },
    };

    /**
     * Framework cleanup (R2.4 collection-symmetric). When a
     * Containable destructs, unhook it from its container's
     * `contents` set via the canonical chokepoint so `onMoved` /
     * `onContainableRemoved` witnesses fire. Discovered by the
     * dispatcher in `StuffApi.#destructCore` via the
     * `MixinApi.queryMixins` walk + own-static filter.
     *
     * The Container-side cleanup (most-derived) for a
     * Container+Containable composition fires BEFORE this — it
     * evacuates contents while `_container` is still set, then
     * this hook completes the unhook for the destructing item's
     * own membership in its outer container.
     */
    static cleanupOnDestruct(stuff: Stuff): void {
      const self = stuff as Stuff & Containable;
      const env = self.getContainer();
      if (env) {
        ContainmentApi.move(self, null);
      }
    }

    /**
     * Live reference to the container. NOT a persistent field —
     * cross-Stuff references would round-trip badly through the
     * Hydrator's reflection. The container relationship is rebuilt
     * at clone time via the `applyContainer` instruction-field path
     * (declared `{ instruction: true }` in `fieldMeta` above) or by
     * direct `ContainmentApi.move` calls after hydration.
     *
     * The auxiliary `_placementHost` pointer below is the SAME shape,
     * not a different one — both reference fields here are instance
     * refs. The placement PAIR is persisted by the container's slice
     * (`ContentPlacement`), not by this mixin; see `_placementHost`'s
     * own note for why templatePath stamping was rejected for it.
     */
    protected environment: (Stuff & Container) | null = null;

    /**
     * Auxiliary placement host — an instance (live) ref. Holds a direct
     * reference to the `Placing` host this thing sits on or in (null
     * when loose). Declared `{ ref: 'instance' }`, so the R2.3
     * self-heal clears the slot when the host is destructed.
     *
     * An instance ref was chosen over identity templatePath stamping
     * because non-singleton hosts (several identical tables in a
     * dining hall) can't be addressed unambiguously by templatePath.
     * The pair survives a restart through the container's slice, which
     * records the host's INDEX in the same contents list.
     */
    protected _placementHost: (Stuff & Placing) | null = null;

    /**
     * The member name this thing is placed under (`on`, `in`, `from`).
     * `''` when there is no placement. Paired with `_placementHost`;
     * `getPlacement()` normalises the two, so a host healed to null
     * reads as no placement whatever this says.
     */
    protected _placementName: string = '';

    /**
     * Bolted down — see `isFixedInPlace` on the interface. Authorable
     * per row, because whether a thing is mounted is a fact about THIS
     * one, not about its class.
     */
    fixedInPlace = false;

    isFixedInPlace(): boolean {
      return this.fixedInPlace;
    }
    setFixedInPlace(fixed: boolean): void {
      this.fixedInPlace = fixed;
    }

    /**
     * State-mutation chokepoint. Reachable only from
     * `ContainmentApi.move`; cross-Container `contents` mutation must
     * not be subclass-extensible (`@Final`) or shadow-bypassable
     * (`@Unshadowable`).
     *
     * Atomic across three updates: detach from the old container,
     * attach to the new, update the field. `null` argument is the
     * detach case; the policy rejects calls from anywhere other than
     * `ContainmentApi`, so `setContainer(null)` outside the Api
     * throws — the legitimate detach is `ContainmentApi.move(item,
     * null)`.
     */
    @CallSecurity(FromContainmentApi)
    @Final
    @Unshadowable
    setContainer(container: (Stuff & Container) | null): void {
      const old = this.environment;
      if (old === container) return;
      if (old) {
        old.removeContainable(this as unknown as Stuff & Containable);
      }
      if (container) {
        container.addContainable(this as unknown as Stuff & Containable);
      }
      this.environment = container;
      // Fire a `FieldChangedEvent { field: 'container' }` so MQL
      // subscriptions flagged `locationDependent` wake on movement
      // (the inspection card's breadcrumb-root subscription is the
      // current consumer). Containability change is the load-bearing
      // signal for "the player walked to a new room" / "this item
      // entered/left an inventory" — same shape `addContainable` /
      // `removeContainable` use on the container side for the
      // `contents` projection.
      MqlSubscriptionApi.fireFieldChange(
        this,
        'container',
        old,
        container,
      );
    }

    /**
     * Get the current container.
     *
     * R2.3 self-heal is DECLARED, not written here: `environment` is
     * `{ ref: 'instance' }` in `fieldMeta`, so the proxy get trap nulls
     * the slot and yields `null` when the container has been destroyed
     * (a path that bypassed the eager evacuation in
     * `Container.cleanupOnDestruct`). This body is a plain read.
     *
     * Caveat worth knowing: the heal lives in the proxy, so a read on
     * the RAW target does not get it. `ResidencyLogic` walks raw by
     * design and carries its own `isDestroyed()` guard for that.
     */
    getContainer(): (Stuff & Container) | null {
      return this.environment;
    }

    /**
     * Walk the container chain to the topmost non-null environment.
     * Returns `null` when already at the root.
     *
     * Containment is acyclic by construction (a Container can't
     * contain its own ancestor — `setContainer`'s atomic update is
     * the chokepoint), so the loop is bounded by the depth of the
     * world's nesting.
     */
    getRootContainer(): (Stuff & Container) | null {
      let current: Stuff = this as unknown as Stuff;
      let topmost: (Stuff & Container) | null = null;
      while (MixinApi.isContainable(current)) {
        const env = current.getContainer();
        if (!env) break;
        topmost = env;
        current = env as Stuff;
      }
      return topmost;
    }

    /**
     * Resolve the placement pair. The host is an instance (live) ref
     * declared `{ ref: 'instance' }` in `fieldMeta`, so the R2.3
     * self-heal runs in the proxy get trap: a host destructed since the
     * last set reads as `null` and the slot is cleared — and then this
     * reads as no placement at all, whatever the name says.
     *
     * Returns `null` when unplaced OR the host has been destructed. The
     * caller can't tell the two apart; that's deliberate.
     */
    getPlacement(): { host: Stuff & Placing; name: string } | null {
      const host = this._placementHost;
      if (!host) return null;
      return { host, name: this._placementName || 'on' };
    }

    /**
     * See the interface docstring. Whether a member encloses is the
     * member's own claim, carried on its `Placement` row — so a pack
     * that ships an enclosing member gets this read for free, and a
     * cold catalogue degrades to the container, which is the answer
     * the model gave before the relation had a name.
     */
    getEnclosingScope(): Stuff | null {
      const placement = this.getPlacement();
      if (placement !== null) {
        const member = ContainmentApi.placement(placement.name);
        if (member?.getEncloses() === true) {
          return placement.host as unknown as Stuff;
        }
      }
      return this.getContainer();
    }

    /**
     * Privileged setter for the placement pair. Reachable only from
     * `ContainmentApi.move` / `ContainmentApi.place`. Pass `null` to
     * clear.
     *
     * Stores the host ref directly (instance ref); the pair is
     * persisted by the container's slice, not here.
     */
    @CallSecurity(FromContainmentApi)
    @Final
    @Unshadowable
    _setPlacement(host: (Stuff & Placing) | null, name?: string): void {
      this._placementHost = host;
      this._placementName = host ? (name ?? 'on') : '';
    }

    /**
     * Phase 2 applier — see the interface docstring for semantics.
     * Compare-and-move idempotency: no-op when the current container's
     * templatePath matches the declared `path`; otherwise resolve the
     * target via `StuffApi.singleton` and `ContainmentApi.move` into
     * it. The singleton-target invariant is enforced at template-save
     * time by `TemplateApi.validateSingletonContainerTarget`.
     */
    async applyContainer(path: string): Promise<void> {
      const target = await StuffApi.singleton<Stuff & Container>(path);
      const current = this.getContainer();
      if (current && current.getTemplatePath() === path) {
        return; // already in declared container; no-op.
      }
      ContainmentApi.move(
        this as unknown as Stuff & Containable,
        target,
      );
    }
  }
  return ContainableMixin;
}
