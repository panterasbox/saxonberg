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
import type { CommandGiver } from '../lib/command/CommandGiver';
import {
  collectInventoryDefs,
  collectEnvironmentDefs,
  collectPeersDefs,
} from '../lib/command/CommandGiver';
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
    }

    const from = item.getContainer();
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

    // STATE MUTATION through the chokepoint. setContainer handles
    // the three cross-object updates atomically.
    item.setContainer(to);

    // NOTIFICATION HOOKS. Single onMoved per item; per-container
    // hooks for source and destination separately.
    if (from) callHook(from, 'onContainableRemoved', [item]);
    if (to) callHook(to, 'onContainableAdded', [item]);
    callHook(item, 'onMoved', [from, to]);

    // Recency-stack bookkeeping for command-source attribution. Runs
    // after world state reflects the new positions. The helpers below
    // are no-ops when neither side carries a `CommandGiver`.
    applyContainmentDelta(item, from, to);
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

/**
 * Drive the recency stack on every successful move.
 *
 * Two relationships exist between item and any affected
 * `CommandGiver`:
 *
 *   - **`from`/`to` IS the giver** — the giver had / now has item
 *     in its `inventory` bucket.
 *   - **`from`/`to` is the giver's container** — the giver had /
 *     now has item in its `environment`/`peers` bucket as a sibling
 *     occupant.
 *
 * The two are independent — both can fire on the same move (e.g. a
 * vehicle that's a Container AND a CommandGiver and holds passenger
 * CommandGivers: a new passenger lands in the vehicle's inventory
 * AND in the existing passengers' environment).
 *
 * Plus the self-move case: an item that's itself a CommandGiver
 * needs its own env+peers slice rebuilt from the destination's
 * occupants.
 */
function applyContainmentDelta(
  item: Stuff,
  from: ContainerStuff | null,
  to: ContainerStuff | null
): void {
  // Source side: pop from anyone whose stack carried item.
  if (from) {
    if (MixinApi.isCommandGiver(from)) {
      (from as Stuff & CommandGiver).popCommandSource(item);
    }
    for (const sibling of from.getContents()) {
      if (sibling === item) continue;
      if (MixinApi.isCommandGiver(sibling)) {
        (sibling as Stuff & CommandGiver).popCommandSource(item);
      }
    }
  }

  // Dest side: push to anyone whose stack now carries item.
  if (to) {
    if (MixinApi.isCommandGiver(to)) {
      const defs = collectInventoryDefs(item);
      if (defs.length > 0) {
        (to as Stuff & CommandGiver).pushCommandSource(
          item,
          'inventory',
          defs
        );
      }
    }
    const envDefs = collectEnvironmentDefs(item);
    const peerDefs = MixinApi.isCommandGiver(item)
      ? collectPeersDefs(item)
      : [];
    if (envDefs.length > 0 || peerDefs.length > 0) {
      for (const sibling of to.getContents()) {
        if (sibling === item) continue;
        if (!MixinApi.isCommandGiver(sibling)) continue;
        const siblingCG = sibling as Stuff & CommandGiver;
        if (envDefs.length > 0) {
          siblingCG.pushCommandSource(item, 'environment', envDefs);
        }
        if (peerDefs.length > 0) {
          siblingCG.pushCommandSource(item, 'peers', peerDefs);
        }
      }
    }
  }

  // Self-move: item is itself a CommandGiver entering a container.
  // Drop its prior env+peers slice (if any) and push contributions
  // from every neighbor in the new place — this is what makes "I
  // just walked into a room" see the room's existing contents on
  // the giver's own stack.
  if (MixinApi.isCommandGiver(item) && to) {
    const itemCG = item as Stuff & CommandGiver;
    if (from) {
      itemCG.resetCommandSources('self-moved');
    }
    for (const neighbor of to.getContents()) {
      if ((neighbor as Stuff) === item) continue;
      const envDefs = collectEnvironmentDefs(neighbor);
      const peerDefs = MixinApi.isCommandGiver(neighbor)
        ? collectPeersDefs(neighbor)
        : [];
      if (envDefs.length > 0) {
        itemCG.pushCommandSource(neighbor, 'environment', envDefs);
      }
      if (peerDefs.length > 0) {
        itemCG.pushCommandSource(neighbor, 'peers', peerDefs);
      }
    }
  }
}

SecurityApi.decorateApiClass(ContainmentApi);
