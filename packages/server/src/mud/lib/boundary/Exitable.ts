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
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { VetoResult } from '../errors';
import type Door from './Door';
import type { Mobile, MovementBodies } from '../spatial/Mobile';
import Exit from './Exit';
import type { ConcealmentLevel } from '../concealment/ConcealmentLevel';
import { NavigationApi } from '../../api/navigation';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { PerceptionApi } from '../../api/perception';
import { BoundaryApi } from '../../api/boundary';
import type { SubscribableFieldDescriptor } from '../../api/mql-subscription';

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
  hasPendingVerification(): boolean;
  /**
   * Install an explicit exit. Async because subclasses (notably
   * `CartesianLocation`) may perform an async cardinal-zone check
   * via `ZoneApi.resolveZoneForPath` before accepting the exit.
   * The base implementation does only sync work; the async return
   * type lets overrides remain typesafe.
   */
  addExit(exit: Exit): Promise<boolean>;
  removeExit(direction: string): boolean;
  getExit(direction: string): Exit | undefined;
  getExits(): ReadonlyMap<string, Exit>;
  hasExit(direction: string): boolean;
  getObviousExits(): Exit[];
  /**
   * The viewer-aware obvious exits — obvious exits always, a concealed
   * exit only when this `viewer` has discovered or can perceive it. The
   * perception paths (`look`, scope-walk) use this; the viewer-blind
   * {@link getObviousExits} stays the seam for physics/propagation walks.
   */
  obviousExitsFor(viewer: Stuff): Exit[];
  getExitDoors(): Door[];
  /**
   * Install a forward/back exit pair. Async because it internally
   * `await`s the two `addExit` calls — subclass overrides may run
   * an async cardinal-zone check.
   */
  addBidirectionalExit(
    other: Stuff & Container & Exitable,
    direction: string,
    opts?: BidirectionalExitOptions
  ): Promise<void>;
  /**
   * Declarative-content applier. Iterates the YAML-shape exits map
   * and installs each entry, lazily cloning destination Locations
   * (and doors) via `StuffApi.singleton`. Per-direction idempotency:
   * matching existing exit → no-op; mismatching exit → throws with a
   * diagnostic naming both seed paths. Per declarative-content-slate
   * § exits on ExitableMixin.
   *
   * @hook Invoked by the `Hydrator`'s Phase-2 instruction dispatch from
   *   a template's `exits` field. **Instruction applier** — consumes a
   *   declaration to produce derived runtime state; no paired getter
   *   (not a property). Per-direction idempotent across re-clone.
   *
   * @authorable
   */
  applyExits(map: Record<string, ExitInstruction>): Promise<void>;
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
  /**
   * Hold BOTH sides' destinations as within-session live refs (Pattern
   * B) rather than templatePath resolution. Required when the two
   * endpoints are non-singleton runtime clones sharing a template path
   * (Warren hub exits). See `Exit`'s `keepLiveDestination`.
   */
  keepLiveDestination?: boolean;
  hidden?: boolean;
  blocked?: boolean;
  muffled?: boolean;
  noFollow?: boolean;
  messageInForward?: string | null;
  messageOutForward?: string | null;
  messageInBack?: string | null;
  messageOutBack?: string | null;
}

/**
 * Declarative-content shape for a single exit entry in
 * `Exitable.applyExits`. Mirrors the YAML the content author writes:
 *
 * ```yaml
 * exits:
 *   north:                                   # one edge; the neighbour's
 *     destination: /narnia/castle/library    # template declares `south` back
 *   portal:
 *     destination: /narnia/dark-wood/clearing
 *     bidirectional: true                    # shares a Door → install both
 *     opposite: portal
 * ```
 *
 * `destination` is the template path of the destination Location;
 * the applier resolves it lazily via `StuffApi.singleton` (clones on
 * first need). Exits are authored **explicitly on both sides** — an entry
 * installs only its own edge; the return trip is a separate entry on the
 * destination's template (every template self-describes). `bidirectional`
 * defaults to **false**; set it `true` to also install the reciprocal (the
 * inverse is inferred via `NavigationApi.invertDirection` for cardinals, or
 * `opposite` for labels) — used where the two exits share one physical `Door`,
 * whose anchors must be wired once. `door` is the template path of an optional
 * Door whose anchors are installed transitively when present.
 *
 * Per declarative-content-slate § exits on ExitableMixin.
 */
export interface ExitInstruction {
  destination: string;
  door?: string;
  bidirectional?: boolean;
  opposite?: string;
  hidden?: boolean;
  /**
   * Explicit concealment band (D1 — subsumes `hidden`). Authored form of a
   * concealed exit: `concealment: hidden` (a secret door), `deep`/`buried`
   * to bury it. Wins over the legacy `hidden` flag. See
   * `lib/concealment/ConcealmentLevel.ts`.
   */
  concealment?: ConcealmentLevel;
  /** Authored hint / "tell" surfaced when a viewer nearly perceives it. */
  hint?: string;
  blocked?: boolean;
  muffled?: boolean;
  noFollow?: boolean;
  oneWay?: boolean;
  messageIn?: string;
  messageOut?: string;
  media?: string[];
  /**
   * Whether a wheeled hauled cart may pass (default true). Set false on a
   * stairs / stile / narrow exit that admits walking but not wheels. Wired
   * through the one-way path (alongside `media`); a bidirectional exit
   * inherits the default. See `Exit.wheelPassable`.
   */
  wheelPassable?: boolean;
}

export function ExitableMixin<TBase extends MixinConstructor<Stuff & Container>>(Base: TBase) {
  return class ExitableMixin extends Base {
    static _mixinName = 'ExitableMixin';

    /**
     * `exits` is the canonical instruction field shape for declarative
     * content. `applyExits` consumes a `Record<string, ExitInstruction>` and
     * installs the runtime entries — no paired getter for the spec
     * (the runtime `exits: Map<string, Exit>` has its own API). See
     * `applyExits` and `feedback_property_vs_instruction_fields`.
     *
     * @authorable
     */
    static instructionFields = ['exits'];

    /**
     * Projection field for live subscriptions. Reads
     * `getObviousExits()` (explicit ∪ zone-derived, !hidden) and
     * shapes each entry as `{ direction }` for the wire. Destination
     * paths are deliberately NOT shipped — the pane renders a "go
     * <dir>" click target, not a hyperlink to the destination.
     *
     * No `dependsOnFields` plumbing today: rooms with explicit exits
     * settle at hydration and cartesian-derived exits are positional.
     * If runtime exit add/remove ever becomes a hot path (door
     * sealing, dynamic walls), wire `addExit` / `removeExit` to fire
     * `FieldChangedEvent { field: 'exits' }` the same way Container's
     * `addContainable` / `removeContainable` do for `contents`.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'exits',
        read: (stuff) => {
          const host = stuff as Stuff & Exitable;
          return host.getObviousExits().map((exit) => {
            const door = exit.getDoor();
            const out: { direction: string; door?: unknown } = {
              direction: exit.getDirection(),
            };
            if (door) {
              const doorOut: {
                stuffId: string;
                displayName: string;
                open: boolean;
                primaryKeyword?: string;
              } = {
                stuffId: door.stuffId,
                displayName: door.getPresentation(),
                open: door.isOpen(),
              };
              // Door is Perceptible via Boundary; primaryKeyword is
              // optional (Perceptible's fail-soft default falls back
              // to the first keyword of the derived pool when no
              // explicit value is set). Ship only when defined so
              // the wire shape stays clean.
              if (MixinApi.isPerceptible(door)) {
                const kw = door.getPrimaryKeyword();
                if (kw) doorOut.primaryKeyword = kw;
              }
              out.door = doorOut;
            }
            return out;
          });
        },
      },
    ];

    /**
     * Explicit exit map. Derived exits (cartesian adjacency, vessel `'out'`)
     * are NOT stored here — they are synthesized lazily by the zone and by
     * `ExitableVessel.getExit()` respectively.
     *
     * Host-internal storage; external callers use `getExits()` /
     * `getExit(direction)`.
     */
    protected exits: Map<string, Exit> = new Map();

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

    hasPendingVerification(): boolean {
      return this._pendingVerify.size > 0;
    }

    async addExit(exit: Exit): Promise<boolean> {
      const direction = exit.getDirection();
      if (this.exits.has(direction)) return false;
      this.exits.set(direction, exit);
      if (needsVerification(exit)) {
        this._pendingVerify.add(exit);
      }
      // Door back-reference: now that we're past construction (the
      // exit has been wrapped in its proxy), register the proxied
      // exit in its door's `attachedTo` set so `Door.detach()` can
      // walk back to clear us.
      const door = exit.getDoor();
      if (door) door.attachExit(exit);
      return true;
    }

    removeExit(direction: string): boolean {
      const exit = this.exits.get(direction);
      const door = exit?.getDoor();
      if (door) door.detachExit(exit!);
      if (exit) this._pendingVerify.delete(exit);
      return this.exits.delete(direction);
    }

    /**
     * Exits are **explicit only** — a room connects to exactly what its own
     * template declares (`ExitableVessel` overrides for the vessel `'out'`
     * hook). The zone no longer *synthesizes* exits from grid adjacency; it
     * only *enforces* geometry invariants on authored exits (see
     * `CartesianLocation.addExit`). Every template is self-describing: read it
     * and you know what it connects to.
     */
    getExit(direction: string): Exit | undefined {
      return this.exits.get(direction);
    }

    /** Explicit exits only. For tooling / persistence. */
    getExits(): ReadonlyMap<string, Exit> {
      return this.exits;
    }

    hasExit(direction: string): boolean {
      return this.exits.has(direction);
    }

    /**
     * Exits displayed by `look` — the explicit exits, filtered by `!hidden`.
     * Explicit-only (see {@link getExit}); the zone no longer contributes
     * grid-derived exits.
     */
    getObviousExits(): Exit[] {
      const result: Exit[] = [];
      for (const exit of this.exits.values()) {
        if (!exit.isHidden()) result.push(exit);
      }
      return result;
    }

    /**
     * The viewer-aware obvious exits — the perception paths (`look`,
     * scope-walk) call this so a **concealed** exit is listed only when
     * that viewer has discovered it or can passively perceive it, while an
     * obvious exit is always shown. Delegates the whole decision to
     * {@link PerceptionApi.perceives} (which short-circuits true for an
     * un-concealed / `obvious` exit — backcompat, byte-identical to
     * {@link getObviousExits} when nothing is hidden).
     *
     * The viewer-blind {@link getObviousExits} stays the seam for the
     * physics/propagation walks (they carry no viewer; concealment is a
     * per-viewer presence fact, not a physical barrier).
     */
    obviousExitsFor(viewer: Stuff): Exit[] {
      const result: Exit[] = [];
      for (const exit of this.exits.values()) {
        if (PerceptionApi.perceives(viewer, exit)) result.push(exit);
      }
      return result;
    }

    /** All non-null doors on this location's obvious exits. */
    getExitDoors(): Door[] {
      const doors: Door[] = [];
      for (const exit of this.getObviousExits()) {
        const door = exit.getDoor();
        if (door) doors.push(door);
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
    async addBidirectionalExit(
      other: Stuff & Container & Exitable,
      direction: string,
      opts: BidirectionalExitOptions = {}
    ): Promise<void> {
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
        keepLiveDestination: opts.keepLiveDestination,
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
        keepLiveDestination: opts.keepLiveDestination,
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
      forward.setInverse(back);
      back.setInverse(forward);

      await this.addExit(forward);
      await other.addExit(back);

      // Phase 5 Door retrofit: a Door is a Boundary, so when this
      // pair carries a shared door, also install the door's
      // BoundaryAnchors on each room. Idempotent against re-install
      // — `attachExistingBoundary` rejects a wired boundary, so
      // callers passing the same door twice (e.g., reinstall after
      // detach) must `door.detach()` first. The cross-boundary light
      // walk consumes these anchors; `Exit.canTraverse` keeps using
      // `door.isOpen()` directly (see plan § Exit.canTraverse).
      if (opts.door) {
        // Cast `this` and `other` to plain `Stuff` (sound — both are
        // Stuff via the mixin chain), then let `MixinApi.isAdornable`
        // narrow to `Stuff & Adornable` via its type predicate. Don't
        // pre-assert the Adornable shape with a cast; the predicate is
        // the verification.
        const thisStuff = this as unknown as Stuff;
        const otherStuff = other as unknown as Stuff;
        if (
          MixinApi.isAdornable(thisStuff) &&
          MixinApi.isAdornable(otherStuff)
        ) {
          BoundaryApi.attachExistingBoundary({
            boundary: opts.door,
            hostA: thisStuff,
            hostB: otherStuff,
          });
        }
      }
    }

    /**
     * Declarative-content applier. The instruction field is consumed
     * here: each `ExitInstruction` is translated into an explicit `Exit` (or
     * `addBidirectionalExit` for cardinal / explicit-bidirectional
     * entries). Destinations and doors lazy-clone via
     * `StuffApi.singleton`, so a depended-on Location is materialized
     * on first need; further `singleton(x)` calls during a cascade
     * hit the registered proxy and short-circuit cycle scenarios.
     *
     * Per-direction idempotency: a matching existing exit (same
     * destination, same door) is a no-op; a mismatch throws with a
     * diagnostic naming both seed paths.
     */
    async applyExits(map: Record<string, ExitInstruction>): Promise<void> {
      for (const [direction, spec] of Object.entries(map)) {
        await this._applyExitSpec(direction, spec);
      }
    }

    private async _applyExitSpec(
      direction: string,
      spec: ExitInstruction
    ): Promise<void> {
      const existing = this.exits.get(direction);
      const destStuff = await StuffApi.singleton<
        Stuff & Container & Exitable
      >(spec.destination);
      let doorStuff: Door | undefined;
      if (spec.door) {
        doorStuff = await StuffApi.singleton<Door>(spec.door);
      }
      if (existing) {
        // Idempotency vs conflict. Compare by reference — `singleton`
        // is the canonical resolver, so equal templatePaths yield the
        // same proxy.
        let existingDest: Stuff | null = null;
        try {
          existingDest = existing.getDestination() as unknown as Stuff;
        } catch {
          existingDest = null;
        }
        const sameDest = existingDest === (destStuff as unknown as Stuff);
        const sameDoor =
          (existing.getDoor() ?? null) ===
          ((doorStuff as Door | undefined) ?? null);
        if (sameDest && sameDoor) return;
        const here = this as unknown as Stuff;
        const tag = here.getTemplatePath() ?? here.stuffId;
        throw new Error(
          `Exitable.applyExits: direction '${direction}' on ${tag} ` +
            `already wired to a different exit; refusing to overwrite. ` +
            `(existing destination: ${
              existing.getDestination().getTemplatePath() ?? '<no-path>'
            }, incoming destination: ${spec.destination})`
        );
      }
      // Exits are authored explicitly on BOTH sides — an exit creates only
      // its OWN edge; the return trip is a separate declaration on the
      // destination's template. `bidirectional: true` is an explicit opt-in
      // that also installs the reciprocal (used where the two exits share one
      // physical `Door`, whose boundary anchors must be wired once — the door
      // IS the shared "both sides"). No cardinal auto-reciprocity.
      const bidirectional = spec.bidirectional ?? false;
      if (bidirectional) {
        const opts: BidirectionalExitOptions = {
          door: doorStuff,
          opposite: spec.opposite,
          hidden: spec.hidden,
          blocked: spec.blocked,
          muffled: spec.muffled,
          noFollow: spec.noFollow,
          messageInForward: spec.messageIn ?? null,
          messageOutForward: spec.messageOut ?? null,
        };
        await this.addBidirectionalExit(destStuff, direction, opts);
        return;
      }
      const exit = StuffApi.createSync(
        () =>
          new Exit({
            direction,
            source: this as unknown as Stuff & Container,
            destination: destStuff,
            door: doorStuff ?? null,
            hidden: spec.hidden,
            concealment: spec.concealment,
            concealmentHint: spec.hint,
            blocked: spec.blocked,
            muffled: spec.muffled,
            noFollow: spec.noFollow,
            oneWay: spec.oneWay ?? true,
            messageIn: spec.messageIn,
            messageOut: spec.messageOut,
            media: spec.media,
            wheelPassable: spec.wheelPassable,
          })
      );
      await this.addExit(exit);
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
    verifyOutboundExits(): void {
      // Snapshot to allow in-loop mutation of `_pendingVerify`.
      const pending = [...this._pendingVerify];
      for (const exit of pending) {
        // Lazy eviction: settled by us or by another side.
        if (exit.isOneWay() || exit.getInverse() || exit.isBlocked()) {
          this._pendingVerify.delete(exit);
          continue;
        }

        const direction = exit.getDirection();
        const expectedBack = NavigationApi.invertDirection(direction);
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
        const tag = here.getTemplatePath() ?? here.stuffId;
        const destTag = liveDest.getTemplatePath() ?? liveDest.stuffId;

        if (!MixinApi.isExitable(liveDest)) {
          exit.setBlocked(true);
          this._pendingVerify.delete(exit);
          console.warn(
            `exit-verifier: ${tag} → ${direction} → ${destPath}: ` +
              `destination is not Exitable; marking blocked.`
          );
          continue;
        }

        const backExit = liveDest.getExit(expectedBack);
        if (!backExit) {
          exit.setBlocked(true);
          this._pendingVerify.delete(exit);
          console.warn(
            `exit-verifier: ${tag} → ${direction} → ${destTag}: ` +
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
          backDest = backExit.getDestination() as unknown as Stuff;
        } catch {
          continue;
        }
        if (backDest !== here) {
          exit.setBlocked(true);
          this._pendingVerify.delete(exit);
          console.warn(
            `exit-verifier: ${tag} → ${direction} → ${destTag}: ` +
              `back-exit '${expectedBack}' does not return to source; ` +
              `marking blocked.`
          );
          continue;
        }

        // Match. Wire inverse pointers — but only when both exits are
        // in their respective explicit maps. A derived back-exit is
        // recreated per call and any inverse pointer to it would
        // dangle.
        const forwardExplicit = this.exits.get(direction) === exit;
        const backExplicit = liveDest.getExits().get(expectedBack) === backExit;
        if (forwardExplicit && backExplicit) {
          exit.setInverse(backExit);
          backExit.setInverse(exit);
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
     * `Location.onDestruct()`.
     *
     * Subclasses overriding `onDestruct` MUST call
     * `super.onDestruct()` to reach this layer (and through it,
     * the Location-level zone detach).
     */
    onDestruct(): void {
      const outbound = [...this.exits.values()];

      for (const exit of outbound) {
        const inverse = exit.getInverse();
        if (inverse) {
          inverse.setBlocked(true);
        }
      }
      for (const exit of outbound) {
        StuffApi.destruct(exit as unknown as Stuff);
      }
      this.exits.clear();
      this._pendingVerify.clear();

      // Chain to super — Location overrides onDestruct to detach
      // from the owning zone, which then chains into Adornable for
      // fixture teardown, bottoming out at Stuff's no-op terminal.
      super.onDestruct();
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
  if (exit.isOneWay()) return false;
  if (exit.getInverse()) return false;
  if (exit.isBlocked()) return false;
  if (!NavigationApi.invertDirection(exit.getDirection())) return false;
  if (!exit.getDestinationTemplatePath()) return false;
  return true;
}
