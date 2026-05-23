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
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import type { Surfaced } from './Surfaced';
import type { VetoResult } from '../errors';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { StuffApi } from '../../api/stuff';

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
   */
  applyContainer(path: string): Promise<void>;

  /**
   * Auxiliary support pointer. Set when this Containable is resting
   * on a Surfaced host (e.g., apple on a desk). Orthogonal to
   * `getContainer()` — the apple is in the room AND resting on the
   * desk; both relationships are real.
   *
   * Null when the item is not on a surface (in a container, in
   * inventory, in an actor's grip, freely in a room).
   *
   * Pattern A reference shape (path-string for cross-restart
   * persistence, runtime resolution on read); see
   * [`docs/ref-shapes.md`](../../../../../docs/ref-shapes.md).
   * Surfaces in v1 are singleton-shaped (one per templatePath); a
   * non-singleton surface produces an undefined lookup result from
   * `StuffApi.findByTemplatePath` and the apparent restingOn
   * resolves to `null`.
   */
  getRestingOn(): (Stuff & Surfaced) | null;

  /**
   * Privileged setter — only `ContainmentApi.placeOn` /
   * `ContainmentApi.move` may call. Runtime-rejected by the
   * call-security gate otherwise. Authors don't touch this directly;
   * the Api maintains the invariant that restingOn is only non-null
   * when the item's container matches the surface's container.
   *
   * Pass `null` to clear (apple lifted off the desk).
   */
  _setRestingOn(surface: (Stuff & Surfaced) | null): void;

  /** Optional pre-move veto on the moving item itself. */
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

const FromContainmentApi = SecurityPolicies.FromModule(
  'mud/api/containment#ContainmentApi',
  { includeSubclasses: false }
);

export function ContainableMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ContainableMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'ContainableMixin';

    /**
     * Instruction field — declarative spawn target. Consumed by
     * Phase 2 of the Hydrator. There is NO paired `getContainer(path)`
     * declaration accessor; the live `getContainer()` ref is the
     * only runtime getter.
     */
    static instructionFields = ['container'];

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
     * (see static `instructionFields` above) or by direct
     * `ContainmentApi.move` calls after hydration.
     *
     * Auxiliary `restingOn` is different — it's a Pattern A
     * path-string (`_restingOnPath`) that DOES persist; see static
     * `persistentFields` below.
     */
    protected environment: (Stuff & Container) | null = null;

    /**
     * Persistent backing for the auxiliary `restingOn` pointer.
     * Pattern A — stores the supporting surface's templatePath
     * string (null when no support). Hydrator round-trips this via
     * the static `persistentFields` declaration; runtime accessors
     * resolve it through `StuffApi.findByTemplatePath`.
     */
    static persistentFields = ['_restingOnPath'];

    public _restingOnPath: string | null = null;

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
    }

    /**
     * Get the current container.
     *
     * R2.3 self-heal: if `environment` points at a destroyed
     * Container (a path bypassed the eager evacuation in
     * `Container.cleanupOnDestruct`), clear the slot and return
     * `null`. Cheap one-liner backstop for S1 / S8.
     */
    getContainer(): (Stuff & Container) | null {
      const env = this.environment;
      if (env !== null && env.isDestroyed()) {
        this.environment = null;
        return null;
      }
      return env;
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
     * Resolve the auxiliary `restingOn` pointer. Pattern A — re-resolves
     * the stored templatePath every read so hot-reload churn of the
     * supporting surface stays correct.
     *
     * Returns `null` when the field is unset OR the path no longer
     * resolves (surface destructed / never loaded). The caller can't
     * tell the two apart from the return value; that's deliberate —
     * absence of support is the same observable as a stale pointer.
     */
    getRestingOn(): (Stuff & Surfaced) | null {
      if (this._restingOnPath === null) return null;
      const surface = StuffApi.findByTemplatePath(this._restingOnPath);
      if (!surface) return null;
      if (surface.isDestroyed()) return null;
      return surface as Stuff & Surfaced;
    }

    /**
     * Privileged setter for the auxiliary `restingOn` pointer.
     * Reachable only from `ContainmentApi.move` /
     * `ContainmentApi.placeOn`. Pass `null` to clear.
     *
     * Stamps the supporting surface's templatePath; resolution
     * happens lazily on `getRestingOn`. Hosts that aren't
     * singleton-shaped at clone time produce a non-resolving stamp
     * (the getter returns null) — acceptable in v1 (surfaces are
     * singletons in the demo content).
     */
    @CallSecurity(FromContainmentApi)
    @Final
    @Unshadowable
    _setRestingOn(surface: (Stuff & Surfaced) | null): void {
      if (surface === null) {
        this._restingOnPath = null;
        return;
      }
      const path = (surface as Stuff).getTemplatePath();
      this._restingOnPath = path ?? null;
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
