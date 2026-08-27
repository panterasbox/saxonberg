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
 *   - **Identity ref, resolved on read** (cross-zone, singleton-by-templatePath): only
 *     `_destinationPath` is set. The getter resolves on every call
 *     via `StuffApi.findByTemplatePath` — O(1) hashtable lookup, no
 *     runtime cache. If the target zone isn't loaded yet, the sync
 *     getter throws and the caller must `await
 *     exit.resolveDestination()` to fault in the zone.
 *   - **Instance ref** (within-session live ref to a non-templated
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
import { ConcealableMixin } from '../concealment/Concealable';
import { ConcealmentLevels } from '../concealment/ConcealmentLevel';
import type { ConcealmentLevel } from '../concealment/ConcealmentLevel';
import type { Stuff, EvictionContext } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type Door from '../../platform/thing/Door';
import { StuffApi } from '../../api/stuff';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { Mixins, type FieldMeta } from '../mixin';
import { LocomotionApi } from '../../api/locomotion';
import { MixinApi } from '../../api/mixin';
import { GrammarApi } from '../../api/grammar';

/**
 * Discriminator naming which gate failed during `canTraverse`. Backcompat
 * additive — pre-locomotion callers reading only `reason` continue to
 * work. New consumers (locomotion controllers, programmatic callers)
 * branch on `gate` to compose verb-templated rejection prose.
 */
export type TraversalGate =
  | 'blocked'
  | 'locked'
  | 'door'
  | 'exitMode'
  | 'bodyPlan'
  | 'posture'
  | 'enablement'
  | 'capability'
  | 'noConveyance'
  | 'encumbrance'
  | 'terrain'
  | 'breakaway';

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
   * Keep `destination` as a within-session **live ref** (an instance ref) even
   * when it carries a templatePath, instead of degrading to path
   * resolution (an identity ref). Required for exits between non-singleton
   * runtime clones that SHARE a template path (e.g. Warren members):
   * path resolution would be ambiguous (`findByTemplatePath` throws on
   * multi-instance). Default false (the historical path-preferring
   * behavior).
   */
  keepLiveDestination?: boolean;
  door?: Door | null;
  hidden?: boolean;
  /**
   * Explicit concealment band (D1 — subsumes `hidden`). When set, it wins
   * over the legacy `hidden` flag; `concealment: 'hidden'` is the authored
   * equivalent of `hidden: true`, `'deep'`/`'buried'` bury it further.
   */
  concealment?: ConcealmentLevel;
  /** Authored hint / "tell" surfaced when a viewer nearly perceives it. */
  concealmentHint?: string;
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
  /**
   * Whether a wheeled hauled cart may pass through this exit. Default
   * `true`. The `media` gate already refuses a cart on any non-ground
   * exit (a ladder / ford / open air); this bit covers the one residue
   * the medium can't express — an exit that admits *walking* but must
   * refuse *wheels* (stairs, a stile, a turnstile, a narrow door, all
   * `media: ['ground']`). Authors set it `false` on those. See the
   * haulage terrain gate in `LocomotionApi.canTraverseExit`.
   */
  wheelPassable?: boolean;
}

/**
 * The bind contract: only an `Exitable` room that is PARTY to the edge
 * (the source, or the destination of the reciprocal edge it is
 * installing) may complete an unbound kind-cloned Exit. The where
 * clause reads the bind options' endpoints from the call args.
 */
const ByPartyRoom = SecurityPolicies.FromMixin(Mixins.Exitable, {
  where: (caller, _target, _method, args) => {
    const o = args[0] as ExitOptions | undefined;
    if (!o) return false;
    return (
      caller === (o.source as unknown) ||
      caller === (o.destination as unknown)
    );
  },
});

export default class Exit extends ConcealableMixin(Idea) {
  /**
   * The exit-KIND hydration allowlist (the Hydrator applies only
   * declared fields). Exits are never saved — no persistence host
   * captures them — so this list exists purely so a kind template's
   * authored defaults (`/stuff/idea/exits/<kind>` data) hydrate onto a fresh
   * clone before `bind()` completes identity. Identity fields
   * (direction / source / destination) are deliberately absent:
   * they're bind-owned, never authored data.
   */
  static fieldMeta: FieldMeta = {
    // The three reference fields. `source` and `_destination` are
    // `weak`: an Exit outlives neither endpoint conceptually, but it
    // does not own them either — the room owns the exit, not the
    // reverse (`Exitable.exits` is the `owned` side).
    source: { ref: 'instance', lifetime: 'weak' },
    _destination: { ref: 'instance', lifetime: 'weak' },
    // `inverse` was HALF-symmetric: cleared on its own destruct, never
    // on its partner's, so destructing one exit left the other pointing
    // at a dead Exit. Declaring it makes the relationship whole — a
    // behaviour change, which is why it is here and not in W6.
    inverse: { ref: 'instance', lifetime: 'symmetric', inverse: 'inverse' },
    messageIn: { persistent: true },
    messageOut: { persistent: true },
    media: { persistent: true },
    wheelPassable: { persistent: true },
    blocked: { persistent: true },
    muffled: { persistent: true },
    noFollow: { persistent: true },
    oneWay: { persistent: true },
  };

  protected direction: string;
  public getDirection(): string { return this.direction; }
  public setDirection(value: string): void { this.direction = value; }

  protected source: Stuff & Container;
  public getSource(): Stuff & Container { return this.source; }
  public setSource(value: Stuff & Container): void { this.source = value; }

  /**
   * Residency veto: an exit whose source room is alive stays resident —
   * else the sweep would cull an exit out from under a live room (R2.1
   * owned). An exit of a destroyed room is cullable.
   */
  public override canEvict(context: EvictionContext): VetoResult {
    // An unbound kind clone (post-clone, pre-bind) owns no room; it is
    // ordinary cullable clutter if its installer never bound it.
    if (!this.source) return super.canEvict(context);
    if (!this.source.isDestroyed()) {
      return { ok: false, reason: 'exit of a live room' };
    }
    return super.canEvict(context);
  }

  /**
   * Within-session live ref (an instance ref). Set when the Exit was
   * constructed with a runtime-only Container (no templatePath) or
   * when `setDestination` was called with such a Container. The
   * getter prefers this over the path-resolution path.
   *
   * NOT populated by the path-resolution path — see the comment on
   * the protected getter below.
   */
  private _destination: (Stuff & Container) | null;

  /**
   * Destination templatePath (an identity ref, resolved on read). Set when the Exit was
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
   *   1. `_destination` (live ref) — present for an instance ref and for
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
   * the target's templatePath if available (an identity ref), else stores
   * the ref in `_destination` (an instance ref, within-session). NEVER
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

  /**
   * Does traversing this exit actually land the mover in the room
   * `getDestination()` names?
   *
   * True for every ordinary exit. An exit subclass that fully applies
   * its own traversal (`applyTraversal`) may have no spatial
   * destination at all — the sandbox's wardrobe passage is the shipped
   * case: crossing onto the wire moves no body, and its
   * `destinationPath` is a presentation label naming the wire, not a
   * room.
   *
   * The distinction matters to anything that walks the exit GRAPH
   * structurally instead of traversing it — the vision flux walk today;
   * sound, pathfinding and reachability by the same argument. Those
   * walkers must skip an exit that answers false rather than resolving
   * its destination, which may not be a Container at all.
   *
   * @hook Override (returning false) in an exit subclass whose
   *   `applyTraversal` handles the move itself. Structural walkers read
   *   it; the traversal path does not.
   */
  public hasSpatialDestination(): boolean { return true; }
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

  /**
   * Legacy hidden-flag surface, now a thin view over the concealment band
   * (D1 — `Exit.hidden` is subsumed by {@link ConcealableMixin}).
   * `getObviousExits()` still drops a hidden exit because it reads this.
   * `isHidden()` is true iff concealed; `setHidden(true)` raises the band
   * to the migration default (`concealment.hiddenDefaultLevel`),
   * `setHidden(false)` clears it back to `obvious`. Authors and the reveal
   * path can also address the band directly via `setConcealment()`.
   */
  public isHidden(): boolean { return this.isConcealed(); }
  public setHidden(value: boolean): void {
    this.setConcealment(value ? ConcealmentLevels.hiddenDefault() : 'obvious');
  }

  /**
   * Durable discovery key (D3) — an `Exit` is a runtime instance with no
   * `templatePath` of its own, so it keys its `DISCOVERY` belief on a
   * synthetic `<source-templatePath>#exit:<direction>` handle, stable across
   * re-clones (the bar's secret north door stays discovered). `undefined`
   * when the source has no durable templatePath (a shared multi-clone room —
   * the deferred player-placed-concealment case).
   */
  public override getDiscoveryKey(): string | undefined {
    if (!this.source) return undefined; // unbound kind clone
    const src = this.source.getTemplatePath();
    return src ? `${src}#exit:${this.direction}` : undefined;
  }
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
   * Whether a wheeled hauled cart may pass through. Default `true`;
   * authors set `false` on stairs / stiles / narrow doors that admit
   * walking but not wheels (the residue the `media` gate can't express).
   */
  protected _wheelPassable: boolean = true;

  public isWheelPassable(): boolean {
    return this._wheelPassable;
  }
  public setWheelPassable(value: boolean): void {
    this._wheelPassable = value;
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
    // Empty `media` is the legacy walk-only default — now widened to the
    // ground *pace* family (walk / sneak / run, the care↔speed siblings),
    // since anywhere you can walk you can sneak or run. Non-ground media
    // (climb / swim / fly) and wheeled conveyance still require an explicit
    // `media` declaration, so this stays backcompat-safe for old content.
    if (this.media.length === 0) {
      return modeName === 'walk' || modeName === 'sneak' || modeName === 'run';
    }
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

  constructor(opts?: ExitOptions) {
    super();
    if (!opts) {
      // UNBOUND construction — the exit-kind clone path. The clone
      // pipeline builds the instance bare, hydration applies the
      // kind's authored fields (messages / media / concealment /
      // wheelPassable), and the installing room completes identity
      // via `bind()` (participant-gated). Every authored field keeps
      // its declaration default here; identity slots stay empty.
      this.direction = '';
      this.source = null as unknown as Stuff & Container;
      this._destination = null;
      this._destinationPath = null;
      this._door = null;
      this.blocked = false;
      this.muffled = false;
      this.noFollow = false;
      this.oneWay = false;
      this.messageIn = null;
      this.messageOut = null;
      return;
    }
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
        // Instance ref: hold the live ref directly regardless of any
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
    // D1: map the legacy `hidden` flag onto the concealment band. An
    // un-hidden exit stays at the mixin's `obvious` default. An explicit
    // `concealment` band (the authored form) takes precedence over the
    // legacy flag; an authored `hint` rides the ConcealableMixin carrier.
    if (opts.concealment) {
      this.setConcealment(opts.concealment);
    } else if (opts.hidden) {
      this.setConcealment(ConcealmentLevels.hiddenDefault());
    }
    if (opts.concealmentHint !== undefined) {
      this.concealmentHint = opts.concealmentHint;
    }
    this.blocked = opts.blocked ?? false;
    this.muffled = opts.muffled ?? false;
    this.noFollow = opts.noFollow ?? false;
    this.oneWay = opts.oneWay ?? false;
    this.messageIn = opts.messageIn ?? null;
    this.messageOut = opts.messageOut ?? null;
    // Reuse the same validator the public setter does. The `?? []`
    // default preserves backcompat for callers that don't pass it.
    this.setMedia(opts.media ?? []);
    this._wheelPassable = opts.wheelPassable ?? true;
  }

  /**
   * Whether identity has been bound (source + direction + a
   * destination). An unbound exit is a freshly-cloned kind instance
   * awaiting `bind()`; nothing should traverse or install it yet.
   */
  public isBound(): boolean {
    return this.source !== null && this.direction !== '';
  }

  /**
   * Complete a kind-cloned exit's identity: source, direction,
   * destination (live ref or path), door — plus any per-site
   * overrides. **Delta-aware**: an override field is applied only when
   * the caller passed it, so the kind template's hydrated defaults
   * (traverse messages, media, concealment, wheelPassable) survive
   * unless the site explicitly overrides them.
   *
   * Participant-gated (`FromMixin(Mixins.Exitable)` + party-to-the-edge
   * `where`): only the room installing the edge may bind. `@Final
   * @Unshadowable` — identity writes are unspoofable. Throws if
   * already bound.
   */
  @CallSecurity(ByPartyRoom)
  @Final
  @Unshadowable
  public bind(opts: ExitOptions): void {
    if (this.isBound()) {
      throw new Error(
        `Exit.bind: already bound ('${this.direction}' from ` +
          `${this.source.getTemplatePath() ?? this.source.stuffId})`
      );
    }
    if (!opts.destination && !opts.destinationPath) {
      throw new Error(
        'Exit.bind requires either destination (live ref) or destinationPath (templatePath).'
      );
    }
    this.direction = opts.direction;
    this.source = opts.source;
    this._destinationPath = opts.destinationPath ?? null;
    if (opts.destination) {
      if (opts.keepLiveDestination) {
        this._destination = opts.destination;
        this._destinationPath = opts.destinationPath ?? null;
      } else {
        const path = opts.destination.getTemplatePath();
        if (path) {
          if (!this._destinationPath) this._destinationPath = path;
          this._destination = null;
        } else {
          this._destination = opts.destination;
        }
      }
    } else {
      this._destination = null;
    }
    // Direct `_door` write for the same pre-`addExit` reason as the
    // constructor: proxy-aware attachedTo registration happens in
    // `ExitableMixin.addExit`, the only legitimate installer.
    this._door = opts.door ?? null;
    // Per-site overrides — delta-only from here down.
    if (opts.concealment) {
      this.setConcealment(opts.concealment);
    } else if (opts.hidden) {
      this.setConcealment(ConcealmentLevels.hiddenDefault());
    }
    if (opts.concealmentHint !== undefined) {
      this.concealmentHint = opts.concealmentHint;
    }
    if (opts.blocked !== undefined) this.blocked = opts.blocked;
    if (opts.muffled !== undefined) this.muffled = opts.muffled;
    if (opts.noFollow !== undefined) this.noFollow = opts.noFollow;
    if (opts.oneWay !== undefined) this.oneWay = opts.oneWay;
    if (opts.messageIn !== undefined) this.messageIn = opts.messageIn ?? null;
    if (opts.messageOut !== undefined) {
      this.messageOut = opts.messageOut ?? null;
    }
    if (opts.media !== undefined) this.setMedia(opts.media);
    if (opts.wheelPassable !== undefined) {
      this._wheelPassable = opts.wheelPassable;
    }
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
   * has no templatePath (the within-session instance-ref case).
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
    // Chain. `Stuff.onDestruct` is a no-op terminal, so this costs
    // nothing today — but a witness that does not chain silently
    // amputates every layer beneath it, which is exactly the collision
    // class master's antipattern entry was added for.
    super.onDestruct();
  }

  /**
   * Traversal-application override seam (sandbox Decision H). An exit
   * subclass may fully APPLY the traversal itself and report `true` =
   * handled — `Mobile.traverse` then returns without resolving a
   * destination, announcing, or moving anything. The wardrobe passage
   * is the first override: crossing into a circle runs the wire-body
   * choreography, and nothing material ever traverses. Default `false`
   * (a virtual call + branch on the hot path; every ordinary exit
   * takes the normal road).
   *
   * @hook Invoked by `Mobile.traverse` after the door gate
   *   (`canTraverse`) and the mover's own veto, BEFORE departure
   *   announcement and destination resolution. Return `true` when this
   *   exit has fully handled the traversal (nothing more happens);
   *   `false` to continue the ordinary move. **Override** — chain is
   *   unnecessary (the base is a constant `false`).
   */
  public async applyTraversal(
    _mover: Stuff & Containable
  ): Promise<boolean> {
    return false;
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
    // Lock gate runs BEFORE the closed-door gate so a locked door
    // reports "locked" not "closed". Reads entirely off `this.door`
    // (already in hand) — the destination is never resolved, so a
    // locked gate pointing at an unbuilt/dangling destination path is
    // safe to veto.
    if (
      this.door &&
      MixinApi.isLockable(this.door) &&
      this.door.isLocked()
    ) {
      const doorName = this.door.getPresentation();
      return {
        ok: false,
        gate: 'locked',
        // `getPresentation()` already carries the article ("the
        // university gate"); cap the leading char rather than re-prefix
        // "The " (which double-articles to "The the …").
        reason: `${GrammarApi.cap(doorName)} is locked.`,
      };
    }
    if (this.door && !this.door.isOpen()) {
      const doorName = this.door.getPresentation();
      return {
        ok: false,
        gate: 'door',
        reason: `${GrammarApi.cap(doorName)} is closed.`,
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
