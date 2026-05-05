/**
 * ExitableMixin — explicit exit map + zone-delegated exit lookup.
 *
 * Exitable is the shared behavior of every navigable container: cartesian
 * rooms, spherical rooms, and vessel interiors. It maintains an explicit
 * `exits: Map<direction, Exit>` and merges that map with zone-derived
 * lookups so `getExit()` produces a single authoritative answer regardless
 * of exit origin.
 *
 * Explicit exits always win over zone-derived ones. Cartesian zone
 * adjacency is consulted only when no explicit exit covers the requested
 * direction (see Exit-Lookup Algorithm in the Phase 7 plan).
 *
 * Base constraint: `Stuff & Container` — exits only make sense on
 * containers, and we need the Stuff identity for exit messaging.
 */

import type { MixinConstructor } from '../mixin-types';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import type { Containable } from './Containable';
import type { VetoResult } from '../witness-types';
import type { Door } from './Door';
import type { Mobile, MovementBodies } from './Mobile';
import { Exit } from './Exit';
import { CartesianZone } from './CartesianZone';
import { NavigationApi } from '../../api/navigation';
import { StuffApi } from '../../api/stuff';

/**
 * Public shape added by ExitableMixin.
 *
 * `zone` is NOT declared here — it lives on `Stuff` base universally.
 * Exitable just reads `this.zone` when deriving cartesian exits.
 *
 * Movement messaging now lives on MobileMixin (the mover composes the
 * Scene). Exitable provides OPTIONAL hook methods that a specific
 * room may implement to override the bodies; default impls are
 * absent. See MobileMixin's `MovementHookProvider` for the shape.
 */
export interface Exitable {
  exits: Map<string, Exit>;
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

  /**
   * Optional override for the bodies a Mover broadcasts when leaving
   * this room through `exit`. Anything the implementation omits falls
   * back to MobileMixin's default for that audience.
   */
  getDepartureMessage?(mover: Stuff, exit: Exit): MovementBodies;

  /**
   * Optional override for the bodies a Mover broadcasts when arriving
   * in this room through `exit`. Anything the implementation omits
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
 * instance on both sides so opening from either room flips one state.
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

    addExit(exit: Exit): boolean {
      if (this.exits.has(exit.direction)) return false;
      this.exits.set(exit.direction, exit);
      return true;
    }

    removeExit(direction: string): boolean {
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

    /** All non-null doors on this room's obvious exits. */
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
     * room flips a single state.
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
      // without a separate cross-room lookup. One-way exits (a single
      // `addExit`) leave inverse undefined; vessel-synthesized `'out'`
      // exits also leave it undefined.
      forward.inverse = back;
      back.inverse = forward;

      this.addExit(forward);
      other.addExit(back);
    }
  };
}
