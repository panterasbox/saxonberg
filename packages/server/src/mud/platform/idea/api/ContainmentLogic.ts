// ContainmentLogic — the hot-reloadable logic singleton behind
// ContainmentApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { Surfaced } from '../../../lib/spatial/Surfaced';
import type { VetoResult } from '../../../lib/errors';
import type { Warren } from '../../../lib/location/Warren';
import { CommandApi } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { ContainmentError } from '../../../api/containment';
import type { MergeOnArrivalHook } from '../../../api/containment';

type ContainerStuff = Stuff & Container;
type ContainableStuff = Stuff & Containable;

/**
 * Late-bound merge-on-arrival hook slot. `GlobbableApi` registers a
 * function at module load (forwarded through the face's
 * `_registerMergeOnArrivalHook`). Module-level so it survives
 * `dest`/recreate of the singleton — the registration happens once at
 * `GlobbableApi` module load, not per singleton lifetime.
 */
let _mergeOnArrivalHook: MergeOnArrivalHook | null = null;

const ContainmentApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/containment#ContainmentApi'),
  SecurityPolicies.SelfOnly
);

/**
 * ContainmentLogic — the hot-reloadable logic singleton behind
 * {@link ContainmentApi}.
 *
 * Holds object-movement orchestration and the policy layer above the
 * `Containable.setContainer` chokepoint (`move` / `forceMove` /
 * `placeDirect` / `placeOn`), plus the containment topology queries.
 * Lives at `/platform/idea/api/containment`; `ContainmentApi`'s statics forward
 * here via `StuffApi.singletonSync`. `dest /platform/idea/api/containment`
 * reloads it.
 *
 * Gating (the guts-variant recipe): every public method carries
 * `AnyOf(FromModule('/api/containment#ContainmentApi'), SelfOnly)`.
 * `FromModule` admits the Api facade forwarders; `SelfOnly` admits the
 * intra-singleton `this.x()` self-calls (e.g. `placeOn` → `this.move`).
 * The narrow-entry guards on `forceMove` (FromController) and
 * `placeDirect` (ApiOnly) stay on the FACE statics — the face is the
 * security boundary; the logic methods only re-admit the face. Shared
 * stateless helpers are module-private free functions — off-class,
 * ungated, un-callable from outside.
 *
 * The `FromModule`/`SelfOnly` gate is applied **per public method**,
 * not at the class level: a class-level default would also cover the
 * inherited `Stuff`/`Idea` framework methods the framework itself
 * invokes (e.g. during `register`), whose caller is `StuffApi`, and
 * they'd be denied. (Mirrors `LocomotionLogic` / `GlobbableLogic`.)
 *
 * @internal
 */
@Unshadowable
export class ContainmentLogic extends ApiLogic {
  /** See {@link ContainmentApi._registerMergeOnArrivalHook}. */
  @CallSecurity(ContainmentApiCallers)
  public _registerMergeOnArrivalHook(hook: MergeOnArrivalHook): void {
    _mergeOnArrivalHook = hook;
  }

  /** See {@link ContainmentApi.move}. */
  @CallSecurity(ContainmentApiCallers)
  public move(item: ContainableStuff, to: ContainerStuff | null): void {
    moveCore(item, to, false);
  }

  /** See {@link ContainmentApi.forceMove}. */
  @CallSecurity(ContainmentApiCallers)
  public forceMove(item: ContainableStuff, to: ContainerStuff | null): void {
    moveCore(item, to, true);
  }

  /** See {@link ContainmentApi.placeDirect}. */
  @CallSecurity(ContainmentApiCallers)
  public placeDirect(item: ContainableStuff, env: ContainerStuff): void {
    if (!MixinApi.isContainable(item)) {
      throw new ContainmentError(
        'ContainmentApi.placeDirect: item is not Containable.'
      );
    }
    if (!MixinApi.isContainer(env)) {
      throw new ContainmentError(
        'ContainmentApi.placeDirect: env is not a Container.'
      );
    }
    if (item.getContainer() !== null) {
      throw new ContainmentError(
        'ContainmentApi.placeDirect: item already has a container; ' +
          'use ContainmentApi.move for relocations.'
      );
    }
    item.setContainer(env);
  }

  /** See {@link ContainmentApi.placeOn}. */
  @CallSecurity(ContainmentApiCallers)
  public placeOn(item: ContainableStuff, surface: Stuff & Surfaced): void {
    // Resolve target environment: the surface's container.
    const surfaceAsContainable = surface as unknown as Containable;
    const targetEnv = surfaceAsContainable.getContainer();
    if (!targetEnv) {
      throw new ContainmentError(
        `placeOn: surface ${(surface as Stuff).stuffId} has no ` +
          `environment to place items into`,
      );
    }
    if (!surface.canRest(item)) {
      throw new ContainmentError(
        `placeOn: surface ${(surface as Stuff).stuffId} rejects ` +
          `${item.stuffId}`,
      );
    }
    // Move item into the surface's environment first (fires existing
    // containment hooks); then set the auxiliary restingOn pointer.
    // move() clears restingOn as part of its container-change
    // invariant when the container differs from the previous one;
    // setting restingOn AFTER move ensures the new support pointer
    // survives. When the container is unchanged (apple already in
    // the room, just moving from one desk to another in the same
    // room), move is a no-op and we go straight to the restingOn
    // update.
    this.move(item, targetEnv);
    item._setRestingOn(surface);
  }

  // `findReachable` / `findHostedUpdate` were removed — the reachable
  // walk now lives in MQL's `reachable` seed (api/mql/scope-walk.ts
  // `candidatesForReachable`).

  /** See {@link ContainmentApi.resolveLanding}. */
  @CallSecurity(ContainmentApiCallers)
  public async resolveLanding(
    ref: string
  ): Promise<{ container: Stuff & Container; warren: Warren | null }> {
    const { Warren } = await import('../../../lib/location/Warren');
    const cls = await StuffApi.classForRef(ref);
    if ((cls.prototype as object) instanceof Warren) {
      const warren = await StuffApi.singleton<Warren>(ref);
      return { container: await warren.getHost(), warren };
    }
    return {
      container: await StuffApi.singletonOrClone<Stuff & Container>(ref),
      warren: null,
    };
  }
}

/**
 * Shared implementation for `move` / `forceMove`. Pre-flight
 * invariants and witness invocation are uniform across both paths so
 * any side effects the hooks attach observe every call; `force=true`
 * skips only the veto-result enforcement.
 */
function moveCore(
  item: ContainableStuff,
  to: ContainerStuff | null,
  force: boolean
): void {
  if (to !== null) {
    // PRE-FLIGHT (1): Exitables may only land in Exitables.
    if (MixinApi.isExitable(item) && !MixinApi.isExitable(to)) {
      throw new ContainmentError(
        'Exitables can only be placed inside other exitables.'
      );
    }
    // PRE-FLIGHT (2): Exitables cannot cross zones via containment.
    if (
      MixinApi.isExitable(item) &&
      item.getZone() &&
      item.getZone() !== to.getZone()
    ) {
      throw new ContainmentError(
        'Cannot move an exitable into a different zone.'
      );
    }
    // PRE-FLIGHT (3): Adornments attached to a host cannot be moved
    // into a Container's contents while still adorning. The
    // not-portable invariant — wall sconces, BoundaryAnchors, and
    // similar fixtures are reachable through `Adornable.getFixtures()`,
    // not `getContents()`. Detaching first
    // (`host.removeFixture(item)`) is the prerequisite for moving
    // the Adornment as inventory; same shape as `Door.detach()` for
    // a broken door.
    if (MixinApi.isAdornment(item) && item.getAdornedTo() !== null) {
      throw new ContainmentError(
        'Cannot move an adornment that is still attached to a host; ' +
          'detach it first.'
      );
    }
  }

  const from = item.getContainer();
  if (from === to) return;

  // VETO HOOKS — invoked uniformly; only the assert is conditional.
  // Witnesses fire on every call (observability) so the force path
  // matches the polished path's side effects.
  const moveVeto = callHook<VetoResult>(item, 'canMove', [to]);
  const removeVeto = from
    ? callHook<VetoResult>(from, 'canRemoveContainable', [item])
    : undefined;
  const addVeto = to
    ? callHook<VetoResult>(to, 'canAddContainable', [item])
    : undefined;
  if (!force) {
    assertVetoOk(moveVeto, 'canMove');
    assertVetoOk(removeVeto, 'canRemoveContainable');
    assertVetoOk(addVeto, 'canAddContainable');
  }

  // STATE MUTATION through the chokepoint. setContainer handles
  // the three cross-object updates atomically.
  item.setContainer(to);

  // Auxiliary-pointer invariant: when the container actually
  // changes, the `restingOn` auxiliary pointer can no longer be
  // valid (the apple is now in the chest; whatever desk it was on
  // can't still be supporting it). Clearing here keeps the
  // move-as-container-change contract clean. `placeOn` re-stamps
  // restingOn after this move() call, so the on-surface case is
  // unaffected.
  if (from !== to && item.getRestingOn() !== null) {
    item._setRestingOn(null);
  }

  // Recency-stack bookkeeping. Runs BEFORE the on-hooks so anything
  // those hooks observe (e.g. peers' getAvailableCommands) reflects
  // the new contributions.
  CommandApi.applyContainmentDelta(item, from, to);

  // NOTIFICATION HOOKS. Single onMoved per item; per-container
  // hooks for source and destination separately.
  if (from) callHook(from, 'onContainableRemoved', [item]);
  if (to) callHook(to, 'onContainableAdded', [item]);
  callHook(item, 'onMoved', [from, to]);

  // Merge-on-arrival ripple (globbable substrate). Fires after the
  // arrival witnesses so subscribers see the arriving Stuff before
  // it's absorbed and destructed. The hook is responsible for its
  // own `isGlobbable` skip path.
  if (to !== null && _mergeOnArrivalHook !== null) {
    _mergeOnArrivalHook(item, to);
  }
}

/**
 * Call an optional Witness hook by name. The dispatcher uses
 * `typeof === 'function'` so the proxy resolves through any shadow
 * stack naturally — a shadow that defines `onEntered` participates
 * without needing a `MixinApi.hasMixin` precheck on the host.
 *
 * Returns the hook's return value (or `undefined` if no hook present).
 */
function callHook<T>(
  obj: object,
  hookName: string,
  args: unknown[]
): T | undefined {
  const fn = (obj as Record<string, unknown>)[hookName];
  if (typeof fn !== 'function') return undefined;
  return (fn as (...a: unknown[]) => T).apply(obj, args);
}

function assertVetoOk(result: VetoResult | undefined, hookName: string): void {
  if (!result) return;
  if (result.ok) return;
  throw new ContainmentError(
    `${hookName} veto: ${result.reason}`,
    { cause: { hookVeto: result, hookName } }
  );
}
