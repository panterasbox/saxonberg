/**
 * Exit - First-class one-way passage between two exitable places.
 *
 * An `Exit` lives on an `Exitable` (`CartesianLocation`, `SphericalLocation`,
 * or `ExitableVessel`) and points to another Exitable. Reciprocity is opt-in
 * via `ExitableMixin.addBidirectionalExit()`, which installs one Exit on
 * each side (and, optionally, the same shared `Door` reference).
 *
 * An Exit is an `Idea` — it has identity but no physical presence in a
 * location's inventory. Exits are referenced from `Exitable.exits` and,
 * for zone-derived cartesian exits, synthesized lazily by `CartesianZone`.
 *
 * An Exit carries *data* (endpoints, direction label, door, flags, custom
 * messages) and a single guard method — `canTraverse()`. The actual work
 * of traversing (announce departure, move, announce arrival) lives on
 * `MobileMixin.traverse(exit)`, because the mover is the thing performing
 * the action and the mover is what the messaging and containment update
 * are parameterized on.
 *
 * Lazy destination: the Exit's destination may be supplied either as a
 * live `Stuff & Container` reference (the common runtime case) or as a
 * `destinationPath` templatePath string (authored exits whose destination
 * may not yet be loaded). Synchronous reads via the `destination` getter
 * resolve from the singleton cache when possible; if the path-only form
 * is unloaded, the getter throws and the caller must `await
 * exit.getDestination()` first. `MobileMixin.traverse` does this.
 */

import { Idea } from '../stuff/Idea';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';
import type { Containable } from './Containable';
import type { Door } from './Door';
import { DescribeApi } from '../../api/describe';
import { StuffApi } from '../../api/stuff';

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
 *
 * Exactly one of `destination` (live ref) or `destinationPath` (templatePath
 * for lazy resolution) must be provided. Supplying both is allowed when the
 * caller already has both in hand (it skips one resolution step).
 */
export interface ExitOptions {
  direction: string;
  source: Stuff & Container;
  destination?: Stuff & Container;
  destinationPath?: string;
  door?: Door | null;
  hidden?: boolean;
  blocked?: boolean;
  muffled?: boolean;
  noFollow?: boolean;
  oneWay?: boolean;
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

  /**
   * Resolved destination (live ref). Populated lazily by `getDestination()`
   * when the Exit was constructed with `destinationPath` only.
   */
  private _destination: (Stuff & Container) | null;

  /**
   * Unresolved destination by templatePath. Populated when the Exit was
   * constructed with a path-only destination. Null once a live ref has
   * been supplied directly. Use {@link getDestinationTemplatePath} for
   * the verifier-friendly accessor that returns the path regardless of
   * resolution state.
   */
  private _destinationPath: string | null;

  /**
   * Synchronous accessor. Returns the live destination if resolved or
   * cached (the singleton index is consulted as a fast path). Throws if
   * the destination is path-only and not yet loaded — callers in that
   * situation must `await exit.getDestination()`.
   */
  public get destination(): Stuff & Container {
    if (this._destination) return this._destination;
    if (this._destinationPath) {
      const cached = StuffApi.findByTemplatePath<Stuff & Container>(
        this._destinationPath
      );
      if (cached) {
        this._destination = cached;
        return cached;
      }
      throw new Error(
        `Exit destination '${this._destinationPath}' is not yet loaded; ` +
          `await exit.getDestination() first.`
      );
    }
    throw new Error('Exit has no destination');
  }

  /**
   * Setter used by code that constructs an Exit and later supplies a
   * live destination (e.g., a verifier that resolved a path).
   */
  public set destination(value: Stuff & Container) {
    this._destination = value;
  }

  /** Backing storage for `door`; the getter / setter mediate
   *  `Door.attachedTo` bookkeeping. */
  private _door: Door | null = null;

  /**
   * Optional shared door — same instance on both sides of a
   * bidirectional pair. Setting this property updates the door's
   * `attachedTo` back-reference: the previous door (if any) drops
   * this Exit, the new door (if any) gains it. `null` clears.
   */
  public get door(): Door | null {
    return this._door;
  }

  public set door(value: Door | null) {
    if (value === this._door) return;
    if (this._door) this._door.attachedTo.delete(this);
    this._door = value;
    if (value) value.attachedTo.add(this);
  }

  /** Hidden exits are skipped by `getObviousExits()` (and therefore by `look`). */
  public hidden: boolean;

  /** Permanently blocked regardless of door state. */
  public blocked: boolean;

  /** Muffled exits: movement/speech through here is suppressed for sensors. Reserved for later phases. */
  public muffled: boolean;

  /** If true, followers/mounts don't chain through this exit. Reserved for later phases. */
  public noFollow: boolean;

  /**
   * Intentionally one-way. Mutual-exit verification skips this Exit when
   * checking that the destination has a back-pointing inverse.
   *
   * Use for portals, teleporters, and other content whose topology is
   * asymmetric by design. Forgetting to author the back side of a normal
   * exit should NOT set this flag — the verifier exists to catch that.
   */
  public oneWay: boolean;

  /** Custom arrival text (destination peers). `null` → use default. */
  public messageIn: string | null;

  /** Custom departure text (source peers). `null` → use default. */
  public messageOut: string | null;

  /**
   * Counterpart Exit on the destination side, when this exit is part
   * of a bidirectional pair. `undefined` for one-way exits, vessel-
   * synthesized `'out'` exits, or pairs that haven't been wired (lazy-
   * load case).
   *
   * Wired up by `Exitable.addBidirectionalExit()` after both forward
   * and back exits exist, and by the load-time mutual-exit verifier
   * when the destination loads after the source. Readers must tolerate
   * `undefined`.
   */
  public inverse?: Exit;

  constructor(opts: ExitOptions) {
    super();
    if (!opts.destination && !opts.destinationPath) {
      throw new Error(
        'Exit requires either destination (live ref) or destinationPath (templatePath).'
      );
    }
    this.direction = opts.direction;
    this.source = opts.source;
    this._destination = opts.destination ?? null;
    this._destinationPath = opts.destinationPath ?? null;
    // Set `_door` directly (not through the setter) to avoid registering
    // `this` in `door.attachedTo` while still raw — pre-Proxy. The
    // Proxy-aware registration happens post-construction in
    // `ExitableMixin.addExit`, which is the only legitimate way to
    // install an Exit on an Exitable host.
    this._door = opts.door ?? null;
    this.hidden = opts.hidden ?? false;
    this.blocked = opts.blocked ?? false;
    this.muffled = opts.muffled ?? false;
    this.noFollow = opts.noFollow ?? false;
    this.oneWay = opts.oneWay ?? false;
    this.messageIn = opts.messageIn ?? null;
    this.messageOut = opts.messageOut ?? null;
  }

  /**
   * Resolve the destination, awaiting a singleton clone when the Exit was
   * authored with `destinationPath` only and the target hasn't been
   * loaded yet. Caches the resolved live reference for subsequent calls.
   */
  public async getDestination(): Promise<Stuff & Container> {
    if (this._destination) return this._destination;
    if (this._destinationPath) {
      const resolved = await StuffApi.singleton<Stuff & Container>(
        this._destinationPath
      );
      this._destination = resolved;
      return resolved;
    }
    throw new Error('Exit has no destination');
  }

  /**
   * Return the destination's templatePath regardless of resolution state.
   * Returns `null` if the destination was constructed with a live ref
   * that itself has no templatePath (e.g., a runtime-only Stuff). Used
   * by the mutual-exit verifier to identify the destination by path.
   */
  public getDestinationTemplatePath(): string | null {
    if (this._destinationPath) return this._destinationPath;
    if (this._destination) {
      return (
        (this._destination as unknown as { templatePath?: string })
          .templatePath ?? null
      );
    }
    return null;
  }

  /**
   * Cleanup hook fired by `StuffApi.destruct(this)`.
   *
   *   - Clears the inverse back-pointer on the paired Exit so neighbors
   *     don't retain references to a dead instance.
   *   - Removes this Exit from the attached Door's `attachedTo` set
   *     (Phase 4 wires that field — pre-Phase-4 the lookup is a
   *     no-op).
   *   - Drops the local door reference.
   */
  public prepareDestroy(): void {
    if (this.inverse) {
      this.inverse.inverse = undefined;
      this.inverse = undefined;
    }
    // Setter detaches us from the door's `attachedTo` set.
    this.door = null;
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
