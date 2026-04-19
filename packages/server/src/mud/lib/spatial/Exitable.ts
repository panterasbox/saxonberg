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
import type { Door } from './Door';
import { Exit } from './Exit';
import { CartesianZone } from './CartesianZone';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { NavigationApi } from '../../api/navigation';

/**
 * Public shape added by ExitableMixin.
 *
 * `zone` is NOT declared here — it lives on `Stuff` base universally.
 * Exitable just reads `this.zone` when deriving cartesian exits.
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
  announceDeparture(mover: Stuff, opts?: MovementAnnouncement): void;
  announceArrival(mover: Stuff, opts?: MovementAnnouncement): void;
}

/**
 * Options for `announceArrival` / `announceDeparture`.
 *
 * `direction` is the direction the mover went (for departures) or came
 * from (for arrivals) — normalized cardinals render as `"leaves to the
 * <direction>"` / `"arrives from the <direction>"`; non-cardinals and
 * `undefined` degrade gracefully.
 *
 * `message` lets a caller (typically an `Exit` with custom `messageIn`/
 * `messageOut`) supply the raw broadcast text, bypassing default formatting.
 * `{mover}` is interpolated to the mover's display name.
 */
export interface MovementAnnouncement {
  direction?: string;
  message?: string | null;
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
      const forward = new Exit({
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
      });
      const back = new Exit({
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
      });
      this.addExit(forward);
      other.addExit(back);
    }

    /**
     * Announce that `mover` has just left this Exitable. Broadcasts to every
     * sensor inside EXCEPT the mover.
     *
     * `MobileMixin.traverse()` calls this after a successful `canTraverse()`.
     * Teleport-style departures (no Exit, e.g. admin commands) may call it
     * directly with a synthesized message.
     */
    announceDeparture(
      this: Stuff & Container,
      mover: Stuff,
      opts: MovementAnnouncement = {}
    ): void {
      const moverName = DescribeApi.getDisplayName(mover, 'Someone');
      const text =
        opts.message != null
          ? opts.message.replace(/\{mover\}/g, moverName)
          : !opts.direction
            ? `<name>${moverName}</name> leaves.`
            : `<name>${moverName}</name> leaves to the <direction>${opts.direction}</direction>.`;
      MessageApi.messageContents(
        this,
        { type: 'output', payload: { text } },
        { exclude: mover }
      );
    }

    /**
     * Announce that `mover` has just arrived in this Exitable. Broadcasts to
     * every sensor inside EXCEPT the mover.
     *
     * `opts.direction` is the direction the mover *came from* (i.e., the
     * inverse of the exit they traversed). When it isn't a recognizable
     * cardinal, the message degrades to "Alice arrives." — used for
     * teleports and non-cardinal semantic exits.
     */
    announceArrival(
      this: Stuff & Container,
      mover: Stuff,
      opts: MovementAnnouncement = {}
    ): void {
      const moverName = DescribeApi.getDisplayName(mover, 'Someone');
      let text: string;
      if (opts.message != null) {
        text = opts.message.replace(/\{mover\}/g, moverName);
      } else {
        const cardinal = opts.direction
          ? NavigationApi.normalizeDirection(opts.direction)
          : undefined;
        text = cardinal
          ? `<name>${moverName}</name> arrives from the <direction>${cardinal}</direction>.`
          : `<name>${moverName}</name> arrives.`;
      }
      MessageApi.messageContents(
        this,
        { type: 'output', payload: { text } },
        { exclude: mover }
      );
    }
  };
}
