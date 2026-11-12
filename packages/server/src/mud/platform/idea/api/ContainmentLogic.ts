// ContainmentLogic — the hot-reloadable logic singleton behind
// ContainmentApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { Placing } from '../../../lib/spatial/Placing';
import type { Slotted } from '../../../lib/slot/Slotted';
import type { Slottable } from '../../../lib/slot/Slottable';
import type { VetoResult } from '../../../lib/errors';
import type { Warren } from '../../../lib/location/Warren';
import { CommandApi } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlSubscriptionApi } from '../../../api/mql-subscription';
import { StuffApi } from '../../../api/stuff';
import { ContainmentError } from '../../../api/containment';
import type {
  MergeOnArrivalHook,
  PlaceRefusal,
  PutPlan,
  PutRoute,
} from '../../../api/containment';
import { ContainmentApi } from '../../../api/containment';

type ContainerStuff = Stuff & Container;
type ContainableStuff = Stuff & Containable;
type PlacingStuff = Stuff & Placing;

/**
 * Late-bound merge-on-arrival hook slot. `StackableApi` registers a
 * function at module load (forwarded through the face's
 * `_registerMergeOnArrivalHook`). Module-level so it survives
 * `dest`/recreate of the singleton — the registration happens once at
 * `StackableApi` module load, not per singleton lifetime.
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
 * `placeDirect` / `place`), plus the containment topology queries.
 * Lives at `/platform/idea/api/containment`; `ContainmentApi`'s statics forward
 * here via `StuffApi.singletonSync`. `dest /platform/idea/api/containment`
 * reloads it.
 *
 * Gating (the guts-variant recipe): every public method carries
 * `AnyOf(FromModule('/api/containment#ContainmentApi'), SelfOnly)`.
 * `FromModule` admits the Api facade forwarders; `SelfOnly` admits the
 * intra-singleton `this.x()` self-calls (e.g. `place` → `this.move`).
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
 * they'd be denied. (Mirrors `LocomotionLogic` / `StackableLogic`.)
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
  public move(
    item: ContainableStuff,
    to: ContainerStuff | PlacingStuff | null,
    placement?: string,
  ): void {
    // ⭐ A destination that offers placements and holds nothing — a desk,
    // a drying loft, a rack — is a PLACE ON something: the thing goes into
    // the host's own environment and takes the placement pair. A word
    // names which placement when the host offers more than one; with none,
    // the host's own default. One primitive; the relation is derived.
    if (
      to !== null &&
      MixinApi.isPlacing(to) &&
      (placement !== undefined || !MixinApi.isContainer(to))
    ) {
      placeOn(item, to, placement);
      return;
    }
    // ⭐ Moving a placed thing into the container it already stands in takes
    // it OFF its host (size and carrying D5 — the cup drifts off the table
    // into the room). The container did not change, so `moveCore` would be
    // a no-op; the placement pair is the whole of the move.
    if (to !== null && item.getContainer() === to && item.getPlacement() !== null) {
      const was = item.getPlacement()?.name ?? '';
      item._setPlacement(null);
      MqlSubscriptionApi.fireFieldChange(item as unknown as Stuff, 'placement', was, '');
      if (MixinApi.isThermal(item)) void item.restamp();
      return;
    }
    moveCore(item, to as ContainerStuff | null, false);
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

  /** See {@link ContainmentApi.putPlanFor}. */
  @CallSecurity(ContainmentApiCallers)
  public putPlanFor(
    item: ContainableStuff,
    target: Stuff,
    opts: { prep?: string; by: Stuff },
  ): PutPlan | PlaceRefusal {
    const { prep, by } = opts;
    let route: PutRoute;
    // ⭐ The slot rule stays first: a slot is more specific than a
    // container, so an item that fits an open slot goes in the slot.
    const slot = MixinApi.isSlotted(target) ? target.openSlotFor(item, prep) : null;
    if (slot !== null) {
      // A part that goes into a machine has to physically BE somewhere.
      if (!MixinApi.isContainer(target)) return { ok: false, reason: 'slot-host-not-container' };
      route = { kind: 'slot', slot };
    } else {
      const choice =
        MixinApi.isPlacing(target) || MixinApi.isContainer(target)
          ? target.placementFor(prep)
          : ({ ok: false, reason: 'wrong-preposition', takes: [], ...(prep ? { got: prep } : {}) } as const);
      if (!choice.ok) {
        return {
          ok: false,
          reason: choice.reason,
          facts: { takes: choice.takes, ...(choice.got !== undefined ? { got: choice.got } : {}) },
        };
      }
      const offer = choice.offer;
      if (offer.kind === 'zero') {
        // A shut lid refuses at the verb — never in `move`.
        if (MixinApi.isSealable(target) && !target.isOpen()) return { ok: false, reason: 'shut' };
        // ⭐ The tape measure, asked first so it is a sentence (size and
        // carrying D4) — `move` asserts the same rule at the chokepoint.
        const fit = MixinApi.isContainer(target) ? target.fitRefusal(item) : null;
        if (fit !== null) return { ok: false, reason: 'wont-fit', facts: { why: fit.reason } };
        // ⭐ A container that says what it is FOR refuses in its own words —
        // the hook `move` asserts, asked first so it is a sentence, not a
        // thrown ContainmentError.
        const veto = MixinApi.isContainer(target) ? target.canAddContainable?.(item) : undefined;
        if (veto && !veto.ok) {
          return { ok: false, reason: 'refused-by-container', facts: { said: veto.reason ?? null } };
        }
        route = { kind: 'zero' };
      } else {
        const veto = (target as PlacingStuff).canPlace(item, offer.name);
        const word = offer.words[0] ?? offer.name;
        if (!veto.ok) {
          return veto.reason === 'shut'
            ? { ok: false, reason: 'shut' }
            : { ok: false, reason: 'cannot-rest', facts: { word, why: veto.reason ?? '' } };
        }
        route = { kind: 'region', name: offer.name, word };
      }
    }
    return {
      ok: true,
      durationMs: 0,
      effortW: 0,
      facts: { route },
      onComplete: () => {
        // **Leaving your inventory means leaving your body first** — the
        // release gate `remove`/`unwield`/`drop` run: a curse refuses it,
        // and an unvacated slot would keep a phantom occupant.
        if (MixinApi.isSlotted(by) && MixinApi.isSlottable(item)) {
          const release = by.tryReleaseFromSlots(item);
          if (!release.released) {
            return { ok: false, reason: 'cursed-will-not-release', facts: { dumpedTau: release.dumpedTau } };
          }
        }
        const named = item.getPresentation();
        if (route.kind === 'slot') {
          (target as Stuff & Slotted).seatInSlot(item as ContainableStuff & Slottable, route.slot);
        } else if (route.kind === 'zero') {
          if (MixinApi.isCarrying(target)) target.receive(item);
          else ContainmentApi.move(item, target as ContainerStuff);
        } else {
          ContainmentApi.move(item, target as PlacingStuff, route.name);
        }
        // ⭐ Putting is how a home is made (size and carrying D14): a thing
        // put in a container the putter carries goes back there when it
        // is put away.
        if (
          route.kind === 'zero' &&
          MixinApi.isCarrying(by) &&
          MixinApi.isContainer(target) &&
          !target.isAgent() &&
          by.tierOf(target) !== 'elsewhere'
        ) {
          by.setHome(item, target);
        }
        return { ok: true, facts: { route, named } };
      },
    };
  }

  // `findReachable` / `findHostedUpdate` were removed — the reachable
  // walk now lives in `PerceptionApi.reach`, which MQL's `reachable`
  // seed filters (api/mql/scope-walk.ts `candidatesForReachable`).

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
 * Put `item` ON (or IN) a placing host: into the host's environment, then
 * the placement pair. `move` is a no-op when the container is unchanged
 * (a mug from one desk to another in the same room), so the placement
 * update, its card wake and the ambient restamp happen here regardless.
 */
function placeOn(
  item: ContainableStuff,
  host: PlacingStuff,
  word: string | undefined,
): void {
  const name =
    word !== undefined && host.getPlacements().includes(word)
      ? word
      : host.resolvePlacement(word);
  if (name === null) {
    throw new ContainmentError(
      `move: ${(host as Stuff).stuffId} offers no placement '${word ?? ''}'`,
    );
  }
  const targetEnv = (host as unknown as Containable).getContainer();
  if (!targetEnv) {
    throw new ContainmentError(
      `move: host ${(host as Stuff).stuffId} has no environment to place items into`,
    );
  }
  const veto = host.canPlace(item, name);
  if (!veto.ok) {
    throw new ContainmentError(
      `move: host ${(host as Stuff).stuffId} rejects ${item.stuffId} (${veto.reason})`,
    );
  }
  moveCore(item, targetEnv as ContainerStuff, false);
  item._setPlacement(host, name);
  // Rung 1: the placement member just changed — wake every card showing it.
  MqlSubscriptionApi.fireFieldChange(item as unknown as Stuff, 'placement', '', name);
  // A member that encloses changes the thing's ambient scope even when the
  // container did not change.
  if (MixinApi.isThermal(item)) void item.restamp();
  // ⭐ Pressed in, or it leaves (D5): a thing set on a table at zero gravity
  // does not stay set. Deferred a tick — never move a thing from inside its
  // own arrival.
  pressAfterArrival(item, targetEnv as ContainerStuff);
}

/**
 * Ask the container a thing just arrived in whether it is pressed in
 * (size and carrying D5), a tick later. A body or a container with no sides
 * to speak of answers at once and moves nothing.
 */
function pressAfterArrival(item: ContainableStuff, to: ContainerStuff): void {
  if (to.isAgent()) return;
  void Promise.resolve().then(() => {
    if (item.isDestroyed() || to.isDestroyed() || item.getContainer() !== to) return;
    try {
      to.reconcilePressing(item);
    } catch (err) {
      console.warn('ContainmentApi.move: pressing failed:', err);
    }
  });
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
    // ⭐ One opening, and it keeps the stamp honest: a vessel goes down
    // the column of the water it belongs to (found by the underwater
    // browser walk — `pull bell down` threw, because a water's bands are
    // the column's zone and the bell is its quay's). The bell is still
    // of its surface's zone; it hangs below it.
    const downItsOwnWater =
      MixinApi.isWaterPlace(to) && to.surfacePlace()?.getZone() === item.getZone();
    if (
      MixinApi.isExitable(item) &&
      item.getZone() &&
      item.getZone() !== to.getZone() &&
      !downItsOwnWater
    ) {
      throw new ContainmentError(
        'Cannot move an exitable into a different zone.'
      );
    }
    // PRE-FLIGHT (3): Adornments attached to a host cannot be moved
    // into a Container's contents while still adorning. The
    // not-portable invariant — wall sconces, floors, and
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

  // Auxiliary-pair invariant: when the container actually changes, the
  // placement can no longer be valid (the apple is now in the chest;
  // whatever desk it was on can't still be holding it). Clearing here
  // keeps the move-as-container-change contract clean. `place`
  // re-stamps after this move() call, so the placed case is unaffected.
  if (from !== to && item.getPlacement() !== null) {
    item._setPlacement(null);
    // Rung 1: the placement is gone — wake the cards that showed it.
    MqlSubscriptionApi.fireFieldChange(
      item as unknown as Stuff,
      'placement',
      'on',
      '',
    );
  }

  // Recency-stack bookkeeping. Runs BEFORE the on-hooks so anything
  // those hooks observe (e.g. peers' getAvailableCommands) reflects
  // the new contributions.
  CommandApi.applyContainmentDelta(item, from, to);

  // NOTIFICATION HOOKS. Single onMoved per item; per-container
  // hooks for source and destination separately.
  // ⭐ Each witness is told the other end of the move: who took it, who put
  // it (a pit lifts a hide for the hand it went to; a feeder knows who
  // filled it). A second argument, never a search of the frame.
  if (from) callHook(from, 'onContainableRemoved', [item, to]);
  if (to) callHook(to, 'onContainableAdded', [item, from]);
  callHook(item, 'onMoved', [from, to]);

  // Merge-on-arrival ripple (stackable substrate). Fires after the
  // arrival witnesses so subscribers see the arriving Stuff before
  // it's absorbed and destructed. The hook is responsible for its
  // own `isStackable` skip path.
  if (to !== null && _mergeOnArrivalHook !== null) {
    _mergeOnArrivalHook(item, to);
  }

  // ⭐ Pressed in, or it leaves (size and carrying D5) — asked of the
  // container a thing arrives in (a place holds what lies loose in it, so
  // only a thing container is asked here; `placeOn` asks for what is set
  // on a host).
  if (to !== null && !to.isPlace() && MixinApi.isContainer(to)) {
    pressAfterArrival(item, to);
  }

  // ⭐⭐ CUSTODY is derived here, for every move by anyone: where an owned
  // good now is gets recorded (so it is where it was left after a
  // restart), and a fresh good — arriving from nowhere — is titled to
  // whoever it is derived to be (ChattelLogic's `derivedMinter`). Async
  // and never thrown: the move already happened.
  if (MixinApi.isChattel(item) && !item.isDestroyed()) {
    void item
      .followCustody({ fresh: from === null, to })
      .catch((err: unknown) => console.warn('ContainmentApi.move: custody record failed:', err));
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
