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
 * Destination storage shape:
 *
 *   - **Pattern C** (cross-zone, singleton-by-templatePath): only
 *     `_destinationPath` is set. The getter resolves on every call
 *     via `StuffApi.findByTemplatePath` — O(1) hashtable lookup, no
 *     runtime cache. If the target zone isn't loaded yet, the sync
 *     getter throws and the caller must `await
 *     exit.resolveDestination()` to fault in the zone.
 *   - **Pattern B** (within-session live ref to a non-templated
 *     Location): `_destination` is set; resolution returns it
 *     directly. The S11 case: "Within-session, a live ref works as
 *     long as the target's zone stays loaded."
 *
 * Either slot may be populated independently. The getter prefers
 * the live ref when present; otherwise falls back to the
 * path-resolution path. Setters write the slot that matches their
 * argument shape — a live ref does NOT cache a previous path
 * resolution (the "drop the resolved-ref cache" rule from the
 * ref-shapes design).
 */

import { Idea } from '../stuff/Idea';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type Door from './Door';
import { StuffApi } from '../../api/stuff';
import { LocomotionApi } from '../../api/locomotion';

/**
 * Discriminator naming which gate failed during `canTraverse`. Backcompat
 * additive — pre-locomotion callers reading only `reason` continue to
 * work. New consumers (locomotion controllers, programmatic callers)
 * branch on `gate` to compose verb-templated rejection prose.
 */
export type TraversalGate =
  | 'blocked'
  | 'door'
  | 'exitMode'
  | 'bodyPlan'
  | 'posture'
  | 'enablement'
  | 'capability'
  | 'noConveyance';

/**
 * Result of `Exit.canTraverse()`.
 *
 * `reason` is a player-facing error string when `ok === false`. When `ok`
 * is true the reason is absent.
 *
 * `gate` / `mode` / `context` are additive: pre-locomotion callers that
 * only read `reason` keep working; new consumers branch on `gate` to
 * compose verb-templated rejection prose without re-parsing `reason`.
 */
export interface TraversalGuard {
  ok: boolean;
  reason?: string;
  gate?: TraversalGate;
  /** Short mode name (e.g. `'walk'`) when the gate is mode-related. */
  mode?: string;
  /** Gate-specific context (e.g. `{ missing: 'ClimbableMixin' }`). */
  context?: Record<string, unknown>;
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
  /**
   * Keep `destination` as a within-session **live ref** (Pattern B) even
   * when it carries a templatePath, instead of degrading to path
   * resolution (Pattern C). Required for exits between non-singleton
   * runtime clones that SHARE a template path (e.g. Warren members):
   * path resolution would be ambiguous (`findByTemplatePath` throws on
   * multi-instance). Default false (the historical path-preferring
   * behavior).
   */
  keepLiveDestination?: boolean;
  door?: Door | null;
  hidden?: boolean;
  blocked?: boolean;
  muffled?: boolean;
  noFollow?: boolean;
  oneWay?: boolean;
  messageIn?: string | null;
  messageOut?: string | null;
  /**
   * Locomotion media this exit admits (e.g. `['ground']`,
   * `['water', 'ground']`). An exit admits any `LocomotionMode` whose
   * `getMedium()` is in this list. Default `[]` — legacy walk-only
   * behavior (see `allowsMode`). Grouping by medium lets a normal
   * corridor admit walk + run + crawl + sneak via `['ground']` rather
   * than enumerating every mode name.
   */
  media?: string[];
}

export default class Exit extends Idea {
  protected direction: string;
  public getDirection(): string { return this.direction; }
  public setDirection(value: string): void { this.direction = value; }

  protected source: Stuff & Container;
  public getSource(): Stuff & Container { return this.source; }
  public setSource(value: Stuff & Container): void { this.source = value; }

  /**
   * Within-session live ref (Pattern B). Set when the Exit was
   * constructed with a runtime-only Container (no templatePath) or
   * when `setDestination` was called with such a Container. The
   * getter prefers this over the path-resolution path.
   *
   * NOT populated by the path-resolution path — see the comment on
   * the protected getter below.
   */
  private _destination: (Stuff & Container) | null;

  /**
   * Destination templatePath (Pattern C). Set when the Exit was
   * authored with a templated destination. The getter resolves on
   * every call via `StuffApi.findByTemplatePath` — no runtime cache.
   *
   * Hydrators / framework brackets writing `exit['destinationPath'] = X`
   * land directly on the field; the public method form
   * (`setDestination(loc)`) is the inter-Stuff contract.
   */
  private _destinationPath: string | null;

  /**
   * Host-internal getter.
   *
   * Resolution order:
   *   1. `_destination` (live ref) — present for Pattern B and for
   *      Pattern-C-with-direct-live-ref constructor calls.
   *   2. `_destinationPath` resolved via `StuffApi.findByTemplatePath`
   *      — re-resolved every call, no cache.
   *
   * Throws if no destination is set, or if the path is set but the
   * target zone isn't loaded yet. Callers in the latter case must
   * `await exit.resolveDestination()` to fault in the zone.
   */
  protected get destination(): Stuff & Container {
    if (this._destination) return this._destination;
    if (this._destinationPath) {
      const resolved = StuffApi.findByTemplatePath<Stuff & Container>(
        this._destinationPath
      );
      if (resolved) return resolved;
      throw new Error(
        `Exit destination '${this._destinationPath}' is not yet loaded; ` +
          `await exit.resolveDestination() first.`
      );
    }
    throw new Error('Exit has no destination');
  }

  /**
   * Setter accepts a live Container. Stamps `_destinationPath` from
   * the target's templatePath if available (Pattern C), else stores
   * the ref in `_destination` (Pattern B within-session). NEVER
   * caches a previous path-resolution into the live-ref slot — that
   * was the rule the ref-shapes design dropped.
   *
   * Both slots are written symmetrically: whichever branch the new
   * destination takes, the other slot is cleared so the getter's
   * resolution order can never see stale conflicting state.
   */
  protected set destination(value: Stuff & Container) {
    const path = value.getTemplatePath();
    if (path) {
      this._destinationPath = path;
      this._destination = null;
    } else {
      this._destination = value;
      this._destinationPath = null;
    }
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
   * Locomotion media this exit admits (e.g. `['ground']`,
   * `['water', 'ground']`). The exit admits any `LocomotionMode` whose
   * `getMedium()` is in this list. Default `[]` is treated by
   * `allowsMode` as legacy walk-only — preserves backcompat for exits
   * authored before the medium refactor. Authors group modes by medium
   * to keep declarations terse: a normal corridor's `['ground']` admits
   * every ground-locomotion mode without enumerating each verb.
   */
  protected media: string[] = [];

  public getMedia(): readonly string[] {
    return this.media;
  }
  public setMedia(value: string[]): void {
    const seen = new Set<string>();
    for (const v of value) {
      if (typeof v !== 'string' || v.length === 0) {
        throw new TypeError(
          'Exit.setMedia: entries must be non-empty strings'
        );
      }
      if (seen.has(v)) {
        throw new TypeError(`Exit.setMedia: duplicate '${v}'`);
      }
      seen.add(v);
    }
    this.media = value;
  }

  /**
   * True iff a mode named `modeName` is admitted by this exit. Resolution:
   *   - Empty `media` → legacy default; admits only `'walk'`. Preserves
   *     pre-refactor behavior for exits constructed without an explicit
   *     medium set.
   *   - Non-empty `media` → resolve the mode singleton via
   *     `LocomotionApi.modeOf(modeName)`. If unloaded, reject (matches
   *     the strict-resolution contract elsewhere in the substrate). If
   *     resolved, admit iff the mode's `getMedium()` is in `media`.
   *
   * Passthrough modes (ride / drive) have `medium === null`; they're
   * never admitted by an exit's `media` list directly — the conveyance
   * host's mode is what gets gated. Player flow always routes through
   * `LocomotionControllerBase`, which substitutes the host's mode at
   * the exit-gate call site (see `LocomotionControllerBase.execute`).
   */
  public allowsMode(modeName: string): boolean {
    if (this.media.length === 0) return modeName === 'walk';
    const mode = LocomotionApi.modeOf(modeName);
    if (!mode) return false;
    const medium = mode.getMedium();
    if (medium === null) return false;
    return this.media.includes(medium);
  }

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
    // Initialize both slots; one ends up populated depending on
    // which form the caller passed (or both, if the caller already
    // has the template-resolved live ref).
    this._destinationPath = opts.destinationPath ?? null;
    if (opts.destination) {
      if (opts.keepLiveDestination) {
        // Pattern B: hold the live ref directly regardless of any
        // templatePath. For exits between non-singleton runtime clones
        // that share a template path (Warren members), path resolution
        // would be ambiguous, so we keep the ref.
        this._destination = opts.destination;
        this._destinationPath = opts.destinationPath ?? null;
      } else {
        // Constructor mirror of the setter logic: prefer the path
        // form when the live ref has a templatePath, else keep the
        // live ref directly. Either way, no path-resolution cache
        // between calls.
        const path = opts.destination.getTemplatePath();
        if (path) {
          // Only stamp from the live ref if the caller didn't pass an
          // explicit destinationPath (which takes precedence).
          if (!this._destinationPath) this._destinationPath = path;
          this._destination = null;
        } else {
          this._destination = opts.destination;
        }
      }
    } else {
      this._destination = null;
    }
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
    // Reuse the same validator the public setter does. The `?? []`
    // default preserves backcompat for callers that don't pass it.
    this.setMedia(opts.media ?? []);
  }

  /**
   * Resolve the destination, awaiting a singleton clone when the
   * target zone hasn't been loaded yet. Use this from async paths
   * (`MobileMixin.traverse`) that need to fault in the zone before
   * the cross-boundary move.
   *
   * No runtime cache — every call re-reads via
   * `StuffApi.singleton(path)` (or returns the within-session live
   * ref if one was supplied via `setDestination`). The cache slot
   * the ref-shapes design dropped used to silently turn path
   * resolutions into stale Pattern-B refs across hot-reload churn.
   */
  public async resolveDestination(): Promise<Stuff & Container> {
    if (this._destination) return this._destination;
    if (!this._destinationPath) {
      throw new Error('Exit has no destination');
    }
    return await StuffApi.singleton<Stuff & Container>(this._destinationPath);
  }

  /**
   * Return the destination's templatePath. Returns `null` only when
   * the Exit was constructed with a live-ref destination that itself
   * has no templatePath (the within-session Pattern B case).
   * Used by the mutual-exit verifier to identify the destination
   * by path.
   */
  public getDestinationTemplatePath(): string | null {
    if (this._destinationPath) return this._destinationPath;
    if (this._destination) return this._destination.getTemplatePath() ?? null;
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
  public onDestruct(): void {
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
   * Returns `{ ok: false, reason, gate }` on the first failing gate
   * (blocked / closed door / mode rejection); `{ ok: true }` otherwise.
   *
   * `mode` is the short name of the actor's intended `LocomotionMode`
   * (e.g. `'walk'`, `'climb'`). When supplied, this method consults
   * `allowsMode(mode)`. When omitted (pre-locomotion callers, admin
   * tools), the mode gate is skipped — backcompat-additive.
   */
  public canTraverse(
    _mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    if (this.blocked) {
      return {
        ok: false,
        gate: 'blocked',
        reason: 'The way is blocked.',
      };
    }
    if (this.door && !this.door.isOpen()) {
      const doorName = this.door.getPresentation();
      return {
        ok: false,
        gate: 'door',
        reason: `The ${doorName} is closed.`,
      };
    }
    if (mode != null && !this.allowsMode(mode)) {
      return {
        ok: false,
        gate: 'exitMode',
        mode,
        reason: `You can't ${mode} that way.`,
      };
    }
    return { ok: true };
  }
}
