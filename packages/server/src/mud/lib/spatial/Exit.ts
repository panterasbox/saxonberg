/**
 * Exit - First-class one-way passage between two exitable places.
 *
 * An `Exit` lives on an `Exitable` (`CartesianLocation`, `SphericalLocation`,
 * or `ExitableVessel`) and points to another Exitable. Reciprocity is opt-in
 * via `ExitableMixin.addBidirectionalExit()`, which installs one Exit on
 * each side (and, optionally, the same shared `Door` reference).
 *
 * An Exit is an `Idea` — it has identity but no physical presence in a
 * room's inventory. Exits are referenced from `Exitable.exits` and, for
 * zone-derived cartesian exits, synthesized lazily by `CartesianZone`.
 *
 * An Exit carries *data* (endpoints, direction label, door, flags, custom
 * messages) and a single guard method — `canTraverse()`. The actual work
 * of traversing (announce departure, move, announce arrival) lives on
 * `MobileMixin.traverse(exit)`, because the mover is the thing performing
 * the action and the mover is what the messaging and containment update
 * are parameterized on.
 */

import { Idea } from '../stuff/Idea';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import type { Containable } from './Containable';
import type { Door } from './Door';
import { DescribeApi } from '../../api/describe';

/**
 * Result of `Exit.canTraverse()`.
 *
 * `reason` is a player-facing error string when `ok === false`. When `ok` is
 * true the reason is absent.
 */
export interface TraversalGuard {
  ok: boolean;
  reason?: string;
}

/**
 * Constructor options for `Exit`.
 */
export interface ExitOptions {
  direction: string;
  source: Stuff & Container;
  destination: Stuff & Container;
  door?: Door | null;
  hidden?: boolean;
  blocked?: boolean;
  muffled?: boolean;
  noFollow?: boolean;
  messageIn?: string | null;
  messageOut?: string | null;
}

export class Exit extends Idea {
  /**
   * Direction label. Cardinals (`'north'`, `'ne'`, `'up'`, …) for cartesian
   * exits; semantic labels (`'office'`, `'plaza'`) for spherical exits; and
   * `'out'` for the vessel-synthesized exit.
   */
  public direction: string;

  /** The Exitable this exit leaves from. */
  public source: Stuff & Container;

  /** The Exitable this exit lands in. */
  public destination: Stuff & Container;

  /** Optional shared door — same instance on both sides of a bidirectional pair. */
  public door: Door | null;

  /** Hidden exits are skipped by `getObviousExits()` (and therefore by `look`). */
  public hidden: boolean;

  /** Permanently blocked regardless of door state. */
  public blocked: boolean;

  /** Muffled exits: movement/speech through here is suppressed for sensors. Reserved for later phases. */
  public muffled: boolean;

  /** If true, followers/mounts don't chain through this exit. Reserved for later phases. */
  public noFollow: boolean;

  /** Custom arrival text (destination peers). `null` → use default. */
  public messageIn: string | null;

  /** Custom departure text (source peers). `null` → use default. */
  public messageOut: string | null;

  constructor(opts: ExitOptions) {
    super();
    this.direction = opts.direction;
    this.source = opts.source;
    this.destination = opts.destination;
    this.door = opts.door ?? null;
    this.hidden = opts.hidden ?? false;
    this.blocked = opts.blocked ?? false;
    this.muffled = opts.muffled ?? false;
    this.noFollow = opts.noFollow ?? false;
    this.messageIn = opts.messageIn ?? null;
    this.messageOut = opts.messageOut ?? null;
  }

  /**
   * Can `mover` traverse this exit right now?
   *
   * Returns `{ ok: false, reason }` when blocked or the door is shut. Returns
   * `{ ok: true }` otherwise. The mover argument is accepted for future hooks
   * (stamina / permissions / etc.) but is unused today.
   */
  public canTraverse(_mover: Stuff & Containable): TraversalGuard {
    if (this.blocked) {
      return { ok: false, reason: 'The way is blocked.' };
    }
    if (this.door && !this.door.isOpen) {
      const doorName = DescribeApi.getDisplayName(this.door, 'door');
      return { ok: false, reason: `The ${doorName} is closed.` };
    }
    return { ok: true };
  }
}
