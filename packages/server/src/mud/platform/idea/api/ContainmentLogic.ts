// ContainmentLogic — the hot-reloadable logic singleton behind
// ContainmentApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Arrival, ArrivalRefusal, Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import type { Placing } from '../../../lib/spatial/Placing';
import type { PlacementChoice } from '../../../lib/spatial/PlacementOffers';
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
import { Placements } from '../../../lib/spatial/Placement';

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
    // ⭐⭐ A word names a region (size and carrying W9, D-W9-5): the host's
    // own region by name, else by the word it answers to. A region whose
    // member ENCLOSES is a region of a Container — the thing goes IN it, as
    // its contents, with the pair naming the region (`placeIn`: a key in a
    // coat's pocket). Any other (`on`, `from`) is the sibling pair: the
    // thing goes into the host's own environment (`placeOn`: a mug on a
    // desk). A word that names no region is accepted on a container with an
    // inside iff it is one of region zero's own words (`in`) — and throws
    // otherwise: a word is never silently ignored.
    if (to !== null && placement !== undefined) {
      const key = MixinApi.isPlacing(to)
        ? to.getPlacements().includes(placement)
          ? placement
          : to.resolvePlacement(placement)
        : null;
      if (key !== null) {
        if (MixinApi.isContainer(to) && (to as unknown as PlacingStuff).placementOf(key).getEncloses()) {
          placeIn(item, to as unknown as ContainerStuff & PlacingStuff, key);
        } else {
          placeOn(item, to as PlacingStuff, key);
        }
        return;
      }
      if (!(MixinApi.isContainer(to) && isRegionZeroWord(to, placement))) {
        throw new ContainmentError(`move: ${(to as Stuff).stuffId} offers no placement '${placement}'`);
      }
    } else if (to !== null && MixinApi.isPlacing(to) && !MixinApi.isContainer(to)) {
      // ⭐ A destination that offers placements and holds nothing — a desk,
      // a rack — is a PLACE ON something: its own default, with no word.
      placeOn(item, to, undefined);
      return;
    }
    // ⭐⭐ THE DESTINATION places what arrives (size and carrying W8; W9,
    // D-W9-4 — every Container, given no word): into its contents, a hand
    // or its tack (`seat`), a pocket (`pair` — a body's worn coat, or a
    // coat's own region when it has no inside of its own) — or refuses.
    // ⭐⭐ A CARRIER routes a refused arrival (owner, 2026-11-13): its own
    // arrival handling (`Carrying.routeArrival`) takes it — a true move
    // onto the body — and sends it on with a second true move, into a bag
    // it carries or down where it stands. Nothing is retargeted here. A
    // body that does not carry (a fish), or a coat no pocket of which takes
    // the thing, refuses, and `move` throws naming why. (A key moved out of
    // its pocket onto its owner asks too, and goes to a hand.)
    if (to !== null && placement === undefined && MixinApi.isContainer(to)) {
      const arrival = callHook<Arrival>(to, 'arrivalFor', [item, { placed: false }]) ?? { kind: 'contents' };
      switch (arrival.kind) {
        case 'contents':
          break;
        case 'seat':
          (to as unknown as Stuff & Slotted).seatInSlots(item as ContainableStuff & Slottable, arrival.slots);
          return;
        case 'pair':
          this.move(item, arrival.host, arrival.region);
          return;
        case 'refuse':
          if (MixinApi.isCarrying(to)) {
            to.routeArrival(item, arrival.refusal);
            return;
          }
          throw new ContainmentError(arrivalWords(item, to as Stuff, arrival.refusal), {
            reason: arrival.refusal.reason,
            facts: arrival.refusal.facts,
          });
      }
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
    opts: { prep?: string; by: Stuff; region?: string },
  ): PutPlan | PlaceRefusal {
    const { prep, by } = opts;
    let route: PutRoute;
    // ⭐ A region named by its own words (`put cup in inner pocket` — the
    // binder's `via.region`, D26) is the destination; the word must still be
    // one that region answers to.
    const named =
      opts.region !== undefined && MixinApi.isPlacing(target) && target.getPlacements().includes(opts.region)
        ? opts.region
        : null;
    // ⭐ The slot rule stays first: a slot is more specific than a
    // container, so an item that fits an open slot goes in the slot.
    const slot = named === null && MixinApi.isSlotted(target) ? target.openSlotFor(item, prep) : null;
    if (named !== null) {
      const placing = target as PlacingStuff;
      const words = placing.placementOf(named).getPrepositions();
      if (prep !== undefined && !words.includes(prep)) {
        return { ok: false, reason: 'wrong-preposition', facts: { takes: [words[0] ?? named], got: prep } };
      }
      const veto = placing.canPlace(item, named);
      const word = words[0] ?? named;
      if (!veto.ok) {
        return veto.reason === 'shut'
          ? { ok: false, reason: 'shut' }
          : { ok: false, reason: 'cannot-rest', facts: { word, why: veto.reason ?? '' } };
      }
      route = { kind: 'region', name: named, word };
    } else if (slot !== null) {
      // A part that goes into a machine has to physically BE somewhere.
      if (!MixinApi.isContainer(target)) return { ok: false, reason: 'slot-host-not-container' };
      route = { kind: 'slot', slot };
    } else {
      const choice: PlacementChoice =
        MixinApi.isPlacing(target) || MixinApi.isContainer(target)
          ? target.placementFor(prep)
          : { ok: false, reason: 'wrong-preposition', takes: [], ...(prep ? { got: prep } : {}) };
      if (!choice.ok) {
        return {
          ok: false,
          reason: choice.reason,
          facts: {
            takes: choice.takes,
            ...(choice.got !== undefined ? { got: choice.got } : {}),
            ...(choice.regions !== undefined ? { regions: choice.regions } : {}),
          },
        };
      }
      const offer = choice.offer;
      if (offer.kind === 'zero') {
        // A shut lid refuses at the verb — never in `move`.
        if (MixinApi.isSealable(target) && !target.isOpen()) return { ok: false, reason: 'shut' };
        // ⭐⭐ Would it arrive — asked before any write so it is a sentence,
        // not a thrown ContainmentError (size and carrying W8). Every
        // container answers: the tape measure (D4), a container that says
        // what it is FOR, a person HANDED it — ON them (their hands, a
        // pocket, a hook), never routed on to their bag or their feet.
        const refused = MixinApi.isContainer(target) ? arrivalRefusal(target, item) : null;
        if (refused !== null) {
          switch (refused.reason) {
            case 'too-big-for-mouth':
            case 'too-big-inside':
            case 'no-room':
            case 'not-shaped-for':
              return { ok: false, reason: 'wont-fit', facts: { why: refused.reason } };
            case 'refused-by-container':
              return { ok: false, reason: 'refused-by-container', facts: { said: refused.facts.said } };
            default:
              // A body's refusal travels as facts — never a reason code
              // rendered as a sentence (size and carrying W8).
              return { ok: false, reason: 'refused-by-carrier', facts: { carry: refused } };
          }
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
        } else if (route.kind === 'zero' && MixinApi.isCarrying(target)) {
          // Handed: exactly onto the person, or nothing moves (the routing
          // is gone around — owner, 2026-11-13). Refused now (the plan's
          // read went stale), it goes back to the putter.
          const carry = target.directMove(item);
          if (carry !== null) {
            ContainmentApi.move(item, by as ContainerStuff);
            return { ok: false, reason: 'refused-by-carrier', facts: { carry } };
          }
        } else if (route.kind === 'zero') {
          ContainmentApi.move(item, target as ContainerStuff);
        } else {
          ContainmentApi.move(item, target as PlacingStuff, route.name);
        }
        // ⭐ Putting is how a home is made (size and carrying D14): a thing
        // put in a container the putter carries — or in a region of a host
        // the putter carries, a pocket (W9, D-W9-9) — goes back there when
        // it is put away.
        if (
          route.kind === 'zero' &&
          MixinApi.isCarrying(by) &&
          MixinApi.isContainer(target) &&
          !target.isAgent() &&
          by.tierOf(target) !== 'elsewhere'
        ) {
          by.setHome(item, target);
        } else if (
          route.kind === 'region' &&
          MixinApi.isCarrying(by) &&
          !target.isAgent() &&
          by.tierOf(target) !== 'elsewhere'
        ) {
          by.setHome(item, target as PlacingStuff, route.name);
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
 * Put `item` ON (or FROM) a placing host: into the host's environment, then
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
  // ⭐ It arrives PLACED (D11): a body's veto admits a thing that comes
  // with its pair on a host there.
  moveCore(item, targetEnv as ContainerStuff, false, undefined, true);
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
 * ⭐ Put `item` IN a region of `host` (size and carrying W9, D-W9-5) — the
 * enclosing twin of {@link placeOn}: the region's own fit (`canPlace` — its
 * mouth, its room, a shut flap), then into the host's CONTENTS (the region
 * measured it, so the container's interior is not asked), then the pair
 * naming the region. A key from one pocket to the other changes no
 * container; the pair is the whole of the move, as a mug from one desk to
 * another.
 */
function placeIn(
  item: ContainableStuff,
  host: ContainerStuff & PlacingStuff,
  key: string,
): void {
  const veto = host.canPlace(item, key);
  if (!veto.ok) {
    throw new ContainmentError(
      `move: host ${(host as Stuff).stuffId} rejects ${item.stuffId} in its ${key} (${veto.reason})`,
    );
  }
  const from = item.getContainer();
  const was = item.getPlacement()?.name ?? '';
  moveCore(item, host, false, undefined, false, key);
  item._setPlacement(host, key);
  // Rung 1: the region just changed — wake every card showing it.
  MqlSubscriptionApi.fireFieldChange(item as unknown as Stuff, 'placement', was, key);
  if (MixinApi.isThermal(item)) void item.restamp();
  // `moveCore` asked the pressing when the container changed; from one
  // region to another it did not move, so ask here.
  if (from === host) pressAfterArrival(item, host);
}

/**
 * Is `word` one of region zero's words on `to` — a container with an
 * inside of its own, offering it (`in`, `into`, or the member's path)?
 */
function isRegionZeroWord(to: ContainerStuff, word: string): boolean {
  if (to.isAgent() || !to.hasInterior()) return false;
  if (word === Placements.IN) return true;
  return ContainmentApi.placements().need(Placements.IN).getPrepositions().includes(word.trim().toLowerCase());
}

/**
 * Ask the container a thing just arrived in whether it is pressed in
 * (size and carrying D5), a tick later. A body or a container with no sides
 * to speak of answers at once and moves nothing.
 */
function pressAfterArrival(item: ContainableStuff, to: ContainerStuff): void {
  // A body presses only what is in a pocket (D26) — anything else on it is
  // held, worn or (until the flip) loose, and nothing is asked.
  if (to.isAgent() && item.getPlacement() === null) return;
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
  force: boolean,
  following?: Set<string>,
  placed = false,
  region?: string,
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

  // ⭐⭐ What travels with it (size and carrying D33): everything placed on
  // or from this thing — a tray's cups, a belt's pouches — lives in its OLD
  // environment with a pair naming it, and goes where it goes, pair kept.
  // (What is IN it — a coat's pocketed key — is its contents and travels
  // as contents: W9, D-W9-8.) The whole bring-along is gathered (recursive,
  // one cycle guard) and asked of the destination FIRST, so a refusal moves
  // nothing; then each is moved after the host, by this function, keeping
  // its pair (witnesses fire, custody follows).
  const top = following === undefined;
  const visited = following ?? new Set<string>([item.stuffId]);
  const followers = from !== null && from !== to ? directFollowers(item, from) : [];
  if (top && to !== null && !force && followers.length > 0) {
    for (const f of bringAlong(item, from as ContainerStuff)) {
      assertVetoOk(callHook<VetoResult>(to, 'canAddContainable', [f, { placed: true }]), 'canAddContainable');
    }
  }

  // VETO HOOKS — invoked uniformly; only the assert is conditional.
  // Witnesses fire on every call (observability) so the force path
  // matches the polished path's side effects.
  const moveVeto = callHook<VetoResult>(item, 'canMove', [to]);
  const removeVeto = from
    ? callHook<VetoResult>(from, 'canRemoveContainable', [item])
    : undefined;
  const addVeto = to
    ? callHook<VetoResult>(to, 'canAddContainable', [
        item,
        { placed: placed || following !== undefined, ...(region !== undefined ? { region } : {}) },
      ])
    : undefined;
  if (!force) {
    assertVetoOk(moveVeto, 'canMove');
    assertVetoOk(removeVeto, 'canRemoveContainable');
    assertVetoOk(addVeto, 'canAddContainable');
  }

  // STATE MUTATION through the chokepoint. setContainer handles
  // the three cross-object updates atomically.
  item.setContainer(to);

  // ⭐ A thing that leaves a holder leaves the holder's SLOTS (size and
  // carrying drive, step 18): a lead rope tied to a mule's halter went
  // with the mule and stayed in the leader's hand slot — a phantom that
  // filled the hand, so nothing else could be held. Every caller that
  // remembered to vacate first still does; this is the floor under them.
  if (from !== null && from !== to && MixinApi.isSlotted(from) && MixinApi.isSlottable(item)) {
    for (const [slot, occupants] of from.getAllOccupants()) {
      if ([...occupants].some((o) => o.stuffId === item.stuffId)) from.vacate(slot, item);
    }
  }

  // Auxiliary-pair invariant: when the container actually changes, the
  // placement can no longer be valid (the apple is now in the chest;
  // whatever desk it was on can't still be holding it). Clearing here
  // keeps the move-as-container-change contract clean. `place`
  // re-stamps after this move() call, so the placed case is unaffected.
  if (from !== to && item.getPlacement() !== null && following === undefined) {
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

  // ⭐ The host-follow (D33): each thing placed on the moved host follows
  // it, pair kept — and brings its own (a cup on a tray in a pocket).
  for (const f of followers) {
    if (visited.has(f.stuffId)) {
      throw new ContainmentError(`move: placement cycle at ${f.stuffId} while moving ${item.stuffId}`);
    }
    visited.add(f.stuffId);
    if (f.isAgent() || to === null) {
      // A creature steps off what is carried away; a host gone from the
      // world drops what was on it where it stood.
      const was = f.getPlacement()?.name ?? '';
      f._setPlacement(null);
      MqlSubscriptionApi.fireFieldChange(f as unknown as Stuff, 'placement', was, '');
      continue;
    }
    moveCore(f, to, force, visited, true);
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
 * The things placed on `host` that live in `env` — what moves with it
 * (D33). A host that offers no placements has none.
 */
function directFollowers(host: ContainableStuff, env: ContainerStuff): ContainableStuff[] {
  if (!MixinApi.isPlacing(host)) return [];
  const out: ContainableStuff[] = [];
  for (const c of env.getContents()) {
    if (c.stuffId === host.stuffId || !MixinApi.isContainable(c)) continue;
    const pair = c.getPlacement();
    if (pair !== null && (pair.host as Stuff).stuffId === host.stuffId) out.push(c);
  }
  return out;
}

/**
 * The whole bring-along of moving `host` out of `env` — followers, their
 * followers, … — creatures excluded (they step off). Throws on a cycle,
 * before anything has moved.
 */
function bringAlong(host: ContainableStuff, env: ContainerStuff): ContainableStuff[] {
  const out: ContainableStuff[] = [];
  const seen = new Set<string>([host.stuffId]);
  const queue: ContainableStuff[] = [host];
  while (queue.length > 0) {
    const h = queue.shift()!;
    for (const f of directFollowers(h, env)) {
      if (seen.has(f.stuffId)) {
        throw new ContainmentError(`move: placement cycle at ${f.stuffId} while moving ${host.stuffId}`);
      }
      seen.add(f.stuffId);
      if (f.isAgent()) continue;
      out.push(f);
      queue.push(f);
    }
  }
  return out;
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

/**
 * Would `item` arrive in `target` — the destination's own answer read dry
 * (its `arrivalFor`; for contents, the tape measure and the veto), before
 * any write. A carrier answers for its own regions only: the plan words a
 * refusal rather than letting `move` route the thing on.
 */
function arrivalRefusal(target: ContainerStuff, item: ContainableStuff): ArrivalRefusal | null {
  const arrival = target.arrivalFor(item, { placed: false, onBody: true });
  if (arrival.kind === 'refuse') return arrival.refusal;
  if (arrival.kind !== 'contents') return null;
  const fit = target.fitRefusal(item);
  if (fit !== null) return fit;
  const veto = target.canAddContainable?.(item, { placed: false });
  if (veto !== undefined && !veto.ok) {
    return { ok: false, reason: 'refused-by-container', facts: { said: veto.reason ?? '' } };
  }
  return null;
}

/**
 * The author's sentence for a refused arrival (size and carrying W8) — the
 * `ContainmentError` message: *"move: the lantern has no place on Bob —
 * hands hold the mug and the map; tried the coat, the satchel"*. A
 * player's sentence is the controller's, from the refusal's facts.
 */
function arrivalWords(item: ContainableStuff, to: Stuff, r: ArrivalRefusal): string {
  const name = (x: Stuff): string => {
    try {
      return x.presentationPhrase().definite();
    } catch {
      return x.getTemplatePath() ?? x.stuffId;
    }
  };
  const head = `move: ${name(item)} has no place ${to.isAgent() ? 'on' : 'in'} ${name(to)}`;
  switch (r.reason) {
    case 'nowhere-to-carry': {
      const held = r.facts.held.map(name);
      const tried = r.facts.tried.map(name);
      if (held.length === 0 && tried.length === 0) {
        return `${head} — it does not carry (no hands, nothing worn it fits)`;
      }
      return (
        `${head} — hands hold ${held.length > 0 ? held.join(' and ') : 'nothing'}; ` +
        `tried ${tried.length > 0 ? tried.join(', ') : 'nothing worn'}`
      );
    }
    case 'too-heavy':
      return `${head} — more than it can lift`;
    case 'cannot-grip':
      return `${head} — it cannot grip (${r.facts.why})`;
    case 'hands-on-cart':
      return `${head} — its hands are on ${name(r.facts.cart)}`;
    case 'refused-by-container':
      return `${head} — ${r.facts.said}`;
    case 'too-big-for-mouth':
      return `${head} — too big for its mouth`;
    case 'too-big-inside':
      return `${head} — too big to go inside`;
    case 'no-room':
      return `${head} — no room`;
    default:
      return `${head} — ${r.reason}`;
  }
}

function assertVetoOk(result: VetoResult | undefined, hookName: string): void {
  if (!result) return;
  if (result.ok) return;
  throw new ContainmentError(
    `${hookName} veto: ${result.reason}`,
    { cause: { hookVeto: result, hookName } }
  );
}
