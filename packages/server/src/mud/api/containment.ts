/**
 * ContainmentApi — public surface for object movement and the policy
 * layer above the `Containable.setEnvironment` chokepoint.
 *
 * Layering (Phase 5):
 *
 *   - `Containable.addContainable` / `removeContainable` are
 *     `@Final @Unshadowable` state-mutation primitives reachable
 *     ONLY from `Containable.setEnvironment`.
 *   - `Containable.setEnvironment` is the atomic chokepoint —
 *     reachable ONLY from this Api. It orchestrates the three
 *     cross-object updates (remove from old, add to new, set field)
 *     in one call.
 *   - `ContainmentApi.move` is the public surface. It runs invariants
 *     and Witness `can*` vetoes, calls `setEnvironment` once, then
 *     fires the post-move `on*` hooks. NO direct
 *     `removeContainable` / `addContainable` calls happen here —
 *     `setEnvironment` does the state mutation.
 *
 * Detach: `ContainmentApi.move(item, null)`. A direct
 * `setEnvironment(null)` is rejected by the policy.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type {
  Containable,
  VetoResult,
} from '../lib/spatial/Containable';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

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
   *   3. `item.setEnvironment(to)` — atomic state mutation.
   *   4. `on*` Witness hooks (post-mutation, never veto).
   *   5. Runtime-fallback zone stamp.
   *
   * @throws ContainmentError on invariant violations or hook vetoes.
   */
  public static move(
    item: ContainableStuff,
    to: ContainerStuff | null
  ): void {
    if (to !== null) {
      // PRE-FLIGHT (1): Exitables may only land in Exitables.
      if (MixinApi.isExitable(item) && !MixinApi.isExitable(to)) {
        throw new ContainmentError(
          'Exitables can only be placed inside other exitables.'
        );
      }
      // PRE-FLIGHT (2): Exitables cannot cross zones via containment.
      if (MixinApi.isExitable(item) && item.zone && item.zone !== to.zone) {
        throw new ContainmentError(
          'Cannot move an exitable into a different zone.'
        );
      }
    }

    const from = item.getEnvironment();
    if (from === to) return;

    // VETO HOOKS (in declaration-of-care order: item, source, dest).
    assertVetoOk(callHook(item, 'canMove', [to]), 'canMove');
    if (from) {
      assertVetoOk(
        callHook(from, 'canRemoveContainable', [item]),
        'canRemoveContainable'
      );
    }
    if (to) {
      assertVetoOk(
        callHook(to, 'canAddContainable', [item]),
        'canAddContainable'
      );
    }

    // STATE MUTATION through the chokepoint. setEnvironment handles
    // the three cross-object updates atomically.
    item.setEnvironment(to);

    // POST-WRITE: zone stamp fallback (idempotent, harmless when
    // already stamped at clone time).
    if (to && item.zone === null && to.zone !== null) {
      item.zone = to.zone;
    }

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
    return item.getEnvironment();
  }

  /**
   * Get contents from a container object
   *
   * Usage:
   * ```typescript
   * const inventory = ContainmentApi.getContents(avatar);
   * const roomContents = ContainmentApi.getContents(location);
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
