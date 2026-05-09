/**
 * ContainmentApi — public surface for object movement and the policy
 * layer above the `Containable.setContainer` chokepoint.
 *
 * Layering (Phase 5):
 *
 *   - `Containable.addContainable` / `removeContainable` are
 *     `@Final @Unshadowable` state-mutation primitives reachable
 *     ONLY from `Containable.setContainer`.
 *   - `Containable.setContainer` is the atomic chokepoint —
 *     reachable ONLY from this Api. It orchestrates the three
 *     cross-object updates (remove from old, add to new, set field)
 *     in one call.
 *   - `ContainmentApi.move` is the public surface. It runs invariants
 *     and Witness `can*` vetoes, calls `setContainer` once, then
 *     fires the post-move `on*` hooks. NO direct
 *     `removeContainable` / `addContainable` calls happen here —
 *     `setContainer` does the state mutation.
 *
 * Detach: `ContainmentApi.move(item, null)`. A direct
 * `setContainer(null)` is rejected by the policy.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { VetoResult } from '../lib/errors';
import { CommandApi } from './command';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';

type ContainerStuff = Stuff & Container;
type ContainableStuff = Stuff & Containable;

/**
 * Programmatic-contract violation thrown by `ContainmentApi.move()`.
 *
 * These are NOT user-input failures — user-facing commands (`go`, `get`,
 * `drop`) should validate and produce friendly messages before calling
 * `move()`. `ContainmentError` exists to catch seeder/test/scripted bugs.
 */
export class ContainmentError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, opts?: { cause?: unknown }) {
    super(message);
    this.name = 'ContainmentError';
    if (opts?.cause !== undefined) this.cause = opts.cause;
  }
}

/**
 * Static API for containment and movement operations.
 */
export class ContainmentApi {
  /**
   * Move an item to `to`, or detach it (when `to === null`).
   *
   * Pipeline:
   *   1. Pre-flight invariants (Exitable layering, zone crossing).
   *   2. `can*` Witness hooks — short-circuit on the first veto.
   *   3. `item.setContainer(to)` — atomic state mutation.
   *   4. `on*` Witness hooks (post-mutation, never veto).
   *
   * Zone is NOT restamped on move — it should reflect whichever
   * zone created the item, not whichever container it currently
   * sits in. Cross-zone movement rules are enforced by the
   * pre-flight invariants (Exitables can't cross zones via
   * containment) but the `zone` field itself is set at clone time
   * and stays put.
   *
   * @throws ContainmentError on invariant violations or hook vetoes.
   */
  public static move(
    item: ContainableStuff,
    to: ContainerStuff | null
  ): void {
    ContainmentApi.#moveCore(item, to, false);
  }

  /**
   * Force-bypass variant of `move()`. Pre-flight invariants still
   * fire (those are programmatic-contract guards, not policy);
   * `canMove` / `canRemoveContainable` / `canAddContainable`
   * witnesses still fire (so observers / audit hooks see the call)
   * but their veto results are ignored. Post-move `on*` hooks fire
   * identically.
   *
   * Gated by `SecurityPolicies.AdminOnly`. v1 the policy is an
   * always-deny stub: every call throws `SecurityError: admin
   * privilege required` from the decorator gate before this body
   * runs. The seam is in place; the real permissions-aware policy
   * replaces the stub when the permission framework lands.
   */
  @CallSecurity(SecurityPolicies.AdminOnly)
  public static forceMove(
    item: ContainableStuff,
    to: ContainerStuff | null
  ): void {
    ContainmentApi.#moveCore(item, to, true);
  }

  /**
   * Shared implementation for `move` / `forceMove`. Pre-flight
   * invariants and witness invocation are uniform across both
   * paths so any side effects the hooks attach observe every call;
   * `force=true` skips only the veto-result enforcement.
   */
  static #moveCore(
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
      if (MixinApi.isExitable(item) && item.getZone() && item.getZone() !== to.getZone()) {
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

    // Recency-stack bookkeeping. Runs BEFORE the on-hooks so anything
    // those hooks observe (e.g. peers' getAvailableCommands) reflects
    // the new contributions.
    CommandApi.applyContainmentDelta(item, from, to);

    // NOTIFICATION HOOKS. Single onMoved per item; per-container
    // hooks for source and destination separately.
    if (from) callHook(from, 'onContainableRemoved', [item]);
    if (to) callHook(to, 'onContainableAdded', [item]);
    callHook(item, 'onMoved', [from, to]);
  }

  /**
   * Check if an object is contained in a specific container
   */
  public static isContainedIn(item: Stuff, container: ContainerStuff): boolean {
    return container.getContents().some((obj) => obj.stuffId === item.stuffId);
  }

  /**
   * Get the container that holds an item
   */
  public static getContainer(item: ContainableStuff): ContainerStuff | null {
    return item.getContainer();
  }

  /**
   * Get contents from a container object
   *
   * Usage:
   * ```typescript
   * const inventory = ContainmentApi.getContents(avatar);
   * const locationContents = ContainmentApi.getContents(location);
   * ```
   */
  public static getContents(container: ContainerStuff): ContainableStuff[] {
    return container.getContents();
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

SecurityApi.decorateApiClass(ContainmentApi);
