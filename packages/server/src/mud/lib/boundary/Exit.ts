/**
 * Exit - First-class one-way passage between two exitable places.
 *
 * An `Exit` lives on an `Exitable` (`CartesianLocation`, `SphericalLocation`,
 * or `ExitableVessel`) and points to another Exitable. Reciprocity is opt-in
 * via `ExitableMixin.addBidirectionalExit()`, which installs one Exit on
 * each side (and, optionally, the same shared `Door` reference).
 *
 * An Exit is an `Idea` — it has identity but no physical presence in a
 * location's contents. Exits are referenced from `Exitable.exits` and,
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
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
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
  protected direction: string;
  public getDirection(): string { return this.direction; }
  public setDirection(value: string): void { this.direction = value; }

  protected source: Stuff & Container;
  public getSource(): Stuff & Container { return this.source; }
  public setSource(value: Stuff & Container): void { this.source = value; }

  /**
   * Resolved destination (live ref). Populated lazily by
   * `resolveDestination()` when the Exit was constructed with
   * `destinationPath` only.
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
   * Host-internal accessor pair (Pattern D). External callers go
   * through `getDestination()` / `setDestination()`. The getter throws
   * if the destination is path-only and not yet loaded — callers in
   * that situation must `await exit.resolveDestination()`.
   *
   * The accessor is kept (private) so that hydrators / framework
   * brackets writing `exit['destination'] = X` continue to fire the
   * setter; the public method form is the inter-Stuff contract.
   */
  protected get destination(): Stuff & Container {
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
          `await exit.resolveDestination() first.`
      );
    }
    throw new Error('Exit has no destination');
  }

  protected set destination(value: Stuff & Container) {
    this._destination = value;
  }

  public getDestination(): Stuff & Container { return this.destination; }
  public setDestination(value: Stuff & Container): void { this.destination = value; }

  /** Backing storage for `door`; the accessor pair mediates
   *  `Door.attachedTo` bookkeeping. */
  private _door: Door | null = null;

  /**
   * Host-internal accessor pair (Pattern D). External callers go
   * through `getDoor()` / `setDoor()`. Setting this property updates
   * the door's `attachedTo` back-reference: the previous door (if any)
   * drops this Exit, the new door (if any) gains it. `null` clears.
   */
  protected get door(): Door | null {
    return this._door;
  }

  protected set door(value: Door | null) {
    if (value === this._door) return;
    if (this._door) this._door.detachExit(this);
    this._door = value;
    if (value) value.attachExit(this);
  }

  public getDoor(): Door | null { return this.door; }
  public setDoor(value: Door | null): void { this.door = value; }

  /** Hidden exits are skipped by `getObviousExits()` (and therefore by `look`). */
  protected hidden: boolean;

  /** Permanently blocked regardless of door state. */
  protected blocked: boolean;

  /** Muffled exits: movement/speech through here is suppressed for sensors. Reserved for later phases. */
  protected muffled: boolean;

  /** If true, followers/mounts don't chain through this exit. Reserved for later phases. */
  protected noFollow: boolean;

  /**
   * Intentionally one-way. Mutual-exit verification skips this Exit when
   * checking that the destination has a back-pointing inverse.
   */
  protected oneWay: boolean;

  public isHidden(): boolean { return this.hidden; }
  public setHidden(value: boolean): void { this.hidden = value; }
  public isBlocked(): boolean { return this.blocked; }
  public setBlocked(value: boolean): void { this.blocked = value; }
  public isMuffled(): boolean { return this.muffled; }
  public setMuffled(value: boolean): void { this.muffled = value; }
  public isNoFollow(): boolean { return this.noFollow; }
  public setNoFollow(value: boolean): void { this.noFollow = value; }
  public isOneWay(): boolean { return this.oneWay; }
  public setOneWay(value: boolean): void { this.oneWay = value; }

  /** Custom arrival text (destination peers). `null` → use default. */
  protected messageIn: string | null;

  /** Custom departure text (source peers). `null` → use default. */
  protected messageOut: string | null;

  public getMessageIn(): string | null { return this.messageIn; }
  public setMessageIn(value: string | null): void { this.messageIn = value; }
  public getMessageOut(): string | null { return this.messageOut; }
  public setMessageOut(value: string | null): void { this.messageOut = value; }

  /**
   * Counterpart Exit on the destination side, when this exit is part
   * of a bidirectional pair. `undefined` for one-way exits, vessel-
   * synthesized `'out'` exits, or pairs that haven't been wired (lazy-
   * load case).
   */
  protected inverse?: Exit;
  public getInverse(): Exit | undefined { return this.inverse; }
  public setInverse(value: Exit | undefined): void { this.inverse = value; }

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
  public async resolveDestination(): Promise<Stuff & Container> {
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
      return this._destination.getTemplatePath() ?? null;
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
  protected override prepareDestroy(): void {
    if (this.inverse) {
      this.inverse.setInverse(undefined);
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
    if (this.door && !this.door.getIsOpen()) {
      const doorName = DescribeApi.getDisplayName(this.door, 'door');
      return { ok: false, reason: `The ${doorName} is closed.` };
    }
    return { ok: true };
  }
}
