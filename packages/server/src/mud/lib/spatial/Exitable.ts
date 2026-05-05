/**
 * ExitableMixin — explicit exit map + zone-delegated exit lookup.
 *
 * Exitable is the shared behavior of every navigable container: cartesian
 * locations, spherical locations, and vessel interiors. It maintains an
 * explicit `exits: Map<direction, Exit>` and merges that map with
 * zone-derived lookups so `getExit()` produces a single authoritative
 * answer regardless of exit origin.
 *
 * Explicit exits always win over zone-derived ones. Cartesian zone
 * adjacency is consulted only when no explicit exit covers the requested
 * direction (see Exit-Lookup Algorithm in the Phase 7 plan).
 *
 * Base constraint: `Stuff & Container` — exits only make sense on
 * containers, and we need the Stuff identity for exit messaging.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import type { Containable } from './Containable';
import type { VetoResult } from '../errors';
import type { Door } from './Door';
import type { Mobile, MovementBodies } from './Mobile';
import { Exit } from './Exit';
import { CartesianZone } from './CartesianZone';
import { NavigationApi } from '../../api/navigation';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';

/**
 * Public shape added by ExitableMixin.
 *
 * `zone` is NOT declared here — it lives on `Stuff` base universally.
 * Exitable just reads `this.zone` when deriving cartesian exits.
 *
 * Movement messaging now lives on MobileMixin (the mover composes the
 * Scene). Exitable provides OPTIONAL hook methods that a specific
 * location may implement to override the bodies; default impls are
 * absent. See MobileMixin's `MovementHookProvider` for the shape.
 */
export interface Exitable {
  exits: Map<string, Exit>;
  /**
   * True iff this Exitable has at least one outbound exit awaiting
   * mutual-exit verification — the inverse pointer hasn't been wired
   * because the destination wasn't loaded the last time the verifier
   * ran. Movement consults this on the hot path to skip
   * `verifyOutboundExits()` entirely once every exit has settled.
   *
   * Each authored exit is tracked individually; settled exits (wired,
   * oneWay, blocked, non-cardinal, no resolvable destPath) are evicted
   * from the pending set as the verifier observes them. The set is
   * empty in the steady state.
   */
  readonly hasPendingVerification: boolean;
  addExit(exit: Exit): boolean;
  removeExit(direction: string): boolean;
  getExit(direction: string): Exit | undefined;
  getExits(): Map<string, Exit>;
  getObviousExits(): Exit[];
  getExitDoors(): Door[];
  addBidirectionalExit(
    other: Stuff & Container & Exitable,
    direction: string,
    opts?: BidirectionalExitOptions
  ): void;
  verifyOutboundExits(): void;

  /**
   * Optional override for the bodies a Mover broadcasts when leaving
   * this location through `exit`. Anything the implementation omits
   * falls back to MobileMixin's default for that audience.
   */
  getDepartureMessage?(mover: Stuff, exit: Exit): MovementBodies;

  /**
   * Optional override for the bodies a Mover broadcasts when arriving
   * in this location through `exit`. Anything the implementation omits
   * falls back to MobileMixin's default.
   */
  getArrivalMessage?(mover: Stuff, exit: Exit): MovementBodies;

  /** Optional pre-traversal veto: "may this mover ENTER via via?" */
  canEnter?(mover: Stuff & Mobile & Containable, via: Exit): VetoResult;
  /** Optional pre-traversal veto: "may this mover EXIT via via?" */
  canExit?(mover: Stuff & Mobile & Containable, via: Exit): VetoResult;
  /** Fired after the mover entered through `via`. */
  onEntered?(mover: Stuff & Mobile & Containable, via: Exit): void;
  /** Fired after the mover exited through `via`. */
  onExited?(mover: Stuff & Mobile & Containable, via: Exit): void;
}

/**
 * Options for `addBidirectionalExit`. The shared `door` installs the SAME
 * instance on both sides so opening from either side flips one state.
 *
 * `opposite` is inferred from `NavigationApi.invertDirection(direction)`
 * for cardinal directions. For semantic labels (spherical zones, vessels)
 * the caller MUST supply `opposite` explicitly — there is no canonical
 * inverse for `'office'` or `'portal'`.
 */
export interface BidirectionalExitOptions {
  opposite?: string;
  door?: Door;
  hidden?: boolean;
  blocked?: boolean;
  muffled?: boolean;
  noFollow?: boolean;
  messageInForward?: string | null;
  messageOutForward?: string | null;
  messageInBack?: string | null;
  messageOutBack?: string | null;
}

export function ExitableMixin<TBase extends MixinConstructor<Stuff & Container>>(Base: TBase) {
  return class ExitableMixin extends Base {
    static _mixinName = 'ExitableMixin';

    /**
     * Explicit exit map. Derived exits (cartesian adjacency, vessel `'out'`)
     * are NOT stored here — they are synthesized lazily by the zone and by
     * `ExitableVessel.getExit()` respectively.
     */
    exits: Map<string, Exit> = new Map();

    /**
     * Outbound exits awaiting mutual-exit verification. An exit lands
     * here at `addExit` time when it could in principle be wired but
     * isn't yet (cardinal, no inverse, has a destPath). The verifier
     * walks ONLY this set — settled exits are evicted as soon as the
     * verifier (or another side's verifier) settles them.
     *
     * In the steady state this set is empty and movement skips the
     * verifier call entirely.
     */
    private _pendingVerify: Set<Exit> = new Set();

    get hasPendingVerification(): boolean {
      return this._pendingVerify.size > 0;
    }

    addExit(exit: Exit): boolean {
      if (this.exits.has(exit.direction)) return false;
      this.exits.set(exit.direction, exit);
      if (needsVerification(exit)) {
        this._pendingVerify.add(exit);
      }
      // Door back-reference: now that we're past construction (the
      // exit has been wrapped in its proxy), register the proxied
      // exit in its door's `attachedTo` set so `Door.detach()` can
      // walk back to clear us.
      if (exit.door) exit.door.attachedTo.add(exit);
      return true;
    }

    removeExit(direction: string): boolean {
      const exit = this.exits.get(direction);
      if (exit?.door) exit.door.attachedTo.delete(exit);
      if (exit) this._pendingVerify.delete(exit);
      return this.exits.delete(direction);
    }

    /**
     * Merged lookup:
     *   1. explicit → wins
     *   2. (subclass hook — `ExitableVessel` overrides for `'out'`)
     *   3. zone-derived (only `CartesianZone` returns anything)
     *   4. undefined
     */
    getExit(direction: string): Exit | undefined {
      const explicit = this.exits.get(direction);
      if (explicit) return explicit;

      const zone = (this as unknown as Stuff).zone;
      if (zone instanceof CartesianZone) {
        return zone.deriveExit(this as unknown as import('../stuff/Location').Location, direction);
      }
      return undefined;
    }

    /** Explicit exits only. For tooling / persistence. */
    getExits(): Map<string, Exit> {
      return this.exits;
    }

    /**
     * Exits displayed by `look` — explicit ∪ derived, filtered by `!hidden`.
     *
     * Derived exits are only reachable via `CartesianZone`; we iterate the
     * 10 cardinals and let `getExit()` handle the merge. Uses a Set of
     * directions already covered by explicit exits to avoid re-querying the
     * zone for those.
     */
    getObviousExits(): Exit[] {
      const result: Exit[] = [];
      const seen = new Set<string>();

      for (const [dir, exit] of this.exits) {
        if (!exit.hidden) result.push(exit);
        seen.add(dir);
      }

      const zone = (this as unknown as Stuff).zone;
      if (zone instanceof CartesianZone) {
        for (const dir of NavigationApi.cardinalDirections()) {
          if (seen.has(dir)) continue;
          const exit = zone.deriveExit(
            this as unknown as import('../stuff/Location').Location,
            dir
          );
          if (exit && !exit.hidden) result.push(exit);
        }
      }
      return result;
    }

    /** All non-null doors on this location's obvious exits. */
    getExitDoors(): Door[] {
      const doors: Door[] = [];
      for (const exit of this.getObviousExits()) {
        if (exit.door) doors.push(exit.door);
      }
      return doors;
    }

    /**
     * Install a forward/back exit pair in one call. Both sides share the
     * same `Door` reference when one is supplied, so opening from either
     * side flips a single state.
     *
     * Reciprocity: the opposite direction is inferred from
     * `NavigationApi.invertDirection(direction)` for cardinal directions.
     * For non-cardinal labels (`'office'`, `'portal'`, vessel-specific
     * names) the caller MUST supply `opts.opposite` — there is no
     * structural inverse to infer. Passing `opts.opposite` for a cardinal
     * direction overrides the inferred inverse.
     */
    addBidirectionalExit(
      other: Stuff & Container & Exitable,
      direction: string,
      opts: BidirectionalExitOptions = {}
    ): void {
      const opposite = opts.opposite ?? NavigationApi.invertDirection(direction);
      if (!opposite) {
        throw new Error(
          `addBidirectionalExit: cannot infer the opposite of '${direction}'; pass opts.opposite explicitly.`
        );
      }
      const forward = StuffApi.createSync(() => new Exit({
        direction,
        source: this as unknown as Stuff & Container,
        destination: other,
        door: opts.door ?? null,
        hidden: opts.hidden,
        blocked: opts.blocked,
        muffled: opts.muffled,
        noFollow: opts.noFollow,
        messageIn: opts.messageInForward ?? null,
        messageOut: opts.messageOutForward ?? null,
      }));
      const back = StuffApi.createSync(() => new Exit({
        direction: opposite,
        source: other,
        destination: this as unknown as Stuff & Container,
        door: opts.door ?? null,
        hidden: opts.hidden,
        blocked: opts.blocked,
        muffled: opts.muffled,
        noFollow: opts.noFollow,
        messageIn: opts.messageInBack ?? null,
        messageOut: opts.messageOutBack ?? null,
      }));
      // Wire each side's `inverse` pointer to the other so MobileMixin
      // can reach `exit.inverse?.direction` when announcing arrival
      // without a separate cross-location lookup. One-way exits (a
      // single `addExit`) leave inverse undefined; vessel-synthesized
      // `'out'` exits also leave it undefined.
      forward.inverse = back;
      back.inverse = forward;

      this.addExit(forward);
      other.addExit(back);
    }

    /**
     * Mutual-exit invariant check, run at Location load (via
     * `postRegister`) and on traversal as a fallback. Walks ONLY the
     * `_pendingVerify` set — exits the addExit-time triage flagged as
     * "could be wired but isn't yet."
     *
     * For each pending exit:
     *
     *   - If it has settled by some other path (its inverse was wired
     *     by the destination's own verifier, it became oneWay / blocked,
     *     etc.), evict from the pending set and move on.
     *   - Else attempt to resolve: if the destination is now loaded and
     *     a matching back-exit exists, wire the inverse pointer pair.
     *     If the destination is loaded but the topology is wrong, mark
     *     the exit `blocked = true` with a logged warning. Either way,
     *     evict.
     *   - Else (destination still unloaded, or back-exit's destination
     *     unloaded), leave in the pending set for a future pass.
     *
     * Idempotent. Zone-derived cartesian exits are synthesized per-call
     * and inherently mutual by grid adjacency — they aren't tracked.
     */
    verifyOutboundExits(this: Stuff & Exitable & Container): void {
      // Snapshot to allow in-loop mutation of `_pendingVerify`.
      const pending = [...this._pendingVerify];
      for (const exit of pending) {
        // Lazy eviction: settled by us or by another side.
        if (exit.oneWay || exit.inverse || exit.blocked) {
          this._pendingVerify.delete(exit);
          continue;
        }

        const expectedBack = NavigationApi.invertDirection(exit.direction);
        if (!expectedBack) {
          this._pendingVerify.delete(exit);
          continue;
        }

        const destPath = exit.getDestinationTemplatePath();
        if (!destPath) {
          this._pendingVerify.delete(exit);
          continue;
        }

        const liveDest = StuffApi.findByTemplatePath(destPath);
        if (!liveDest) {
          // Destination still not loaded; keep pending for a future pass.
          continue;
        }

        const here = this as unknown as Stuff;
        const tag =
          (here as unknown as { templatePath?: string }).templatePath ??
          here.stuffId;
        const destTag =
          (liveDest as unknown as { templatePath?: string }).templatePath ??
          liveDest.stuffId;

        if (!MixinApi.isExitable(liveDest)) {
          exit.blocked = true;
          this._pendingVerify.delete(exit);
          console.warn(
            `exit-verifier: ${tag} → ${exit.direction} → ${destPath}: ` +
              `destination is not Exitable; marking blocked.`
          );
          continue;
        }

        const backExit = liveDest.getExit(expectedBack);
        if (!backExit) {
          exit.blocked = true;
          this._pendingVerify.delete(exit);
          console.warn(
            `exit-verifier: ${tag} → ${exit.direction} → ${destTag}: ` +
              `no '${expectedBack}' back-exit; marking blocked.`
          );
          continue;
        }

        // Confirm the back-exit actually points at us. If the back-
        // exit's destination is path-only and not yet loaded, we
        // can't confirm — keep pending so a future verify retries
        // when the back side has loaded.
        let backDest: Stuff | null = null;
        try {
          backDest = backExit.destination as unknown as Stuff;
        } catch {
          continue;
        }
        if (backDest !== here) {
          exit.blocked = true;
          this._pendingVerify.delete(exit);
          console.warn(
            `exit-verifier: ${tag} → ${exit.direction} → ${destTag}: ` +
              `back-exit '${expectedBack}' does not return to source; ` +
              `marking blocked.`
          );
          continue;
        }

        // Match. Wire inverse pointers — but only when both exits are
        // in their respective explicit maps. A derived back-exit is
        // recreated per call and any inverse pointer to it would
        // dangle.
        const forwardExplicit = this.exits.get(exit.direction) === exit;
        const backExplicit = liveDest.exits.get(expectedBack) === backExit;
        if (forwardExplicit && backExplicit) {
          exit.inverse = backExit;
          backExit.inverse = exit;
        }
        // Either we wired or there was nothing more to do — evict.
        this._pendingVerify.delete(exit);
      }
    }

    /**
     * Exit-side teardown for the host's destruction. Marks each
     * inbound back-pointer blocked (so neighbors can't traverse
     * through us once we're gone), destructs every outbound exit,
     * and empties the explicit exits map. Does NOT detach from the
     * owning Zone — that's a Location-level concern handled by
     * `Location.prepareDestroy()`.
     *
     * Subclasses overriding `prepareDestroy` MUST call
     * `super.prepareDestroy()` to reach this layer (and through it,
     * the Location-level zone detach).
     */
    prepareDestroy(): void {
      const outbound = [...this.exits.values()];

      for (const exit of outbound) {
        if (exit.inverse) {
          exit.inverse.blocked = true;
        }
      }
      for (const exit of outbound) {
        StuffApi.destruct(exit as unknown as Stuff);
      }
      this.exits.clear();
      this._pendingVerify.clear();

      // Chain to the Base — Stuff has a no-op default, Location
      // overrides it to detach from the owning zone.
      (super.prepareDestroy as (() => void) | undefined)?.call(this);
    }
  };
}

/**
 * Triage at `addExit` time: does this exit have any work the verifier
 * could do for it? Returns true only when the exit is a candidate for
 * inverse wiring — cardinal direction, no inverse already set, not
 * oneWay, not pre-blocked, with a destPath the singleton index can
 * eventually look up. Anything that returns false is "settled at birth"
 * and never enters the pending set.
 */
function needsVerification(exit: Exit): boolean {
  if (exit.oneWay) return false;
  if (exit.inverse) return false;
  if (exit.blocked) return false;
  if (!NavigationApi.invertDirection(exit.direction)) return false;
  if (!exit.getDestinationTemplatePath()) return false;
  return true;
}
