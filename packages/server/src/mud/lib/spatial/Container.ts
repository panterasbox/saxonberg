/**
 * ContainerMixin — anything that holds Containables.
 *
 * Vocabulary unified on the `contain*` root for state mutators
 * (`addContainable` / `removeContainable`) and on `contents` for the
 * collection itself: read accessor `getContents()`, host-internal
 * field `contents`. The MUD-classic "inventory" word is reserved for
 * the player-facing command verb (the `inventory` command and its
 * `sense.survey` topic) — see
 * [docs/subsystems/collections.md § Capability-derived items](../../../../../../docs/subsystems/collections.md).
 *
 * Lockdown contract (Phase 5):
 *   - `addContainable` / `removeContainable` are the state-mutation
 *     primitives. They are `@Final` (no subclass override —
 *     out-of-sync contents is catastrophic), `@Unshadowable` (no
 *     shadow bypass), and `@CallSecurity` gated to be reachable
 *     ONLY from inside `Containable.setContainer`. All
 *     application code goes through `ContainmentApi.move` instead.
 *
 * Witness hooks (optional methods on the interface):
 *   - `canAddContainable(thing)` / `canRemoveContainable(thing)` —
 *     pre-mutation veto.
 *   - `onContainableAdded(thing)` / `onContainableRemoved(thing)` —
 *     post-mutation notification.
 *   ContainmentApi.move dispatches these around the chokepoint call.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff, EvictionContext } from '../stuff/Stuff';
import type { Containable } from './Containable';
import type { VetoResult } from '../errors';
import type {
  CaptureContext,
  ContainerSlice,
  ContentEntry,
  ContentPlacement,
} from '../persistence/PersistenceSlice';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { ExecutionContextApi, OMNI_SCOPE } from '../../api/execution-context';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { PlacementOffers, type PlacementChoice } from './PlacementOffers';
import { MqlApi } from '../../api/mql';
import type { CommandGiver } from '../command/CommandGiver';
import { StuffApi } from '../../api/stuff';
import { PerceptionApi } from '../../api/perception';
import {
  CommandApi,
  type CommandContributions,
} from '../../api/command';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { ChattelApi } from '../../api/chattel';
import {
  MqlSubscriptionApi,
  REF_FIELDS,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';
import type { FieldMeta } from '../mixin';
import type { ActRefusal } from '../craft/ActPlan';
import type { BoundaryOpening } from '../boundary/Conduit';
import type { ClosureLevel } from '../bulk/Bulkable';
import type Place from '../stuff/Place';
import { Dimensions, SIZE_DEFAULTS, type ClosedSides } from './Dimensions';
import { BiomeApi } from '../../api/biome';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

/**
 * ⭐ What a container is, to a tape measure (size and carrying D4): the box
 * inside it, which of its sides it closes, and the way in.
 */
export interface ContainerBounds {
  /** The room inside. */
  interior: Dimensions;
  /** The sides it closes — open sides bound nothing (a broom stands in a bucket). */
  closed: ClosedSides;
  /** The way in, or `null` when entry is not through a mouth (a place: through a way). */
  mouth: BoundaryOpening | null;
}

/**
 * Why a thing will not go in — the tape measure's three answers, and a
 * shaped container's own (`not-shaped-for`: a holster takes a pistol, never
 * a cup — size and carrying D27). `dims` is `null` only for the shape
 * refusal, which asks no tape measure.
 */
export type FitRefusal = ActRefusal<
  'too-big-for-mouth' | 'too-big-inside' | 'no-room' | 'not-shaped-for',
  { container: Stuff; item: Stuff; dims: Dimensions | null }
>;

/** The form a container's interior takes when its own form gives (a sack, filled, is a block). */
const BLOCK_FORM = '/platform/idea/Form/block';

/**
 * Public shape provided by ContainerMixin.
 *
 * The optional Witness methods (`canAddContainable`,
 * `canRemoveContainable`, `onContainableAdded`, `onContainableRemoved`)
 * fire from `ContainmentApi.move`. Implement only the ones you care
 * about; absence is treated as "no opinion."
 */
export interface Container {
  hasContainable(item: Stuff): boolean;
  addContainable(item: Stuff & Containable): void;
  removeContainable(item: Stuff & Containable): boolean;
  hasContainable(item: Stuff & Containable): boolean;
  getContents(): (Stuff & Containable)[];
  /**
   * Recursive contents: every Containable reachable from this
   * Container, including descendants of nested Containers. Walked
   * depth-first pre-order, so a child appears immediately after its
   * parent. Containment is acyclic by construction (a Container
   * can't contain its own ancestor — `Containable.setContainer`
   * enforces it), so no cycle protection is needed.
   *
   * Used by MQL's `:I` deep-inventory transform; equally available
   * to controllers that want every nested item without writing the
   * recursion themselves.
   */
  getDeepContents(): (Stuff & Containable)[];

  /**
   * ⭐ **Everything a person carries, as one list** — my contents and
   * theirs, all the way down, breadth-first (the top level first, so a
   * stable tie-break reads nearest-first), **never into another body** (a
   * mouse in a pocket is carried; what the mouse ate is not), and only what
   * the current sandbox circle may read (omni sees all). The person's half
   * of reach (`PerceptionLogic.reachOf`) and `inventory --flat` read it.
   *
   * Unlike {@link getDeepContents} (depth-first, into everything) this is
   * the CARRIED tree: the containment walk lives on the container, so no
   * caller grows its own frontier (`lint:graph-walks` — a containment
   * walk beside a room's exits read as a graph walk; size-and-carrying W7).
   */
  getCarriedContents(): (Stuff & Containable)[];

  /**
   * ⭐⭐ **What a hand could take from in here, reaching in from OUTSIDE**
   * — my own contents and one level into every OPEN thing among them
   * (`MixinApi.isOpenContainer`: the crate's limes, not a box inside the
   * crate; never into a body). The step under `PerceptionApi.reach` for a
   * place, the vessel you sit in and a named holder, and MQL's mid-chain
   * read of somebody else (`bob:inventory`). One rule (size-and-carrying
   * D17): the rungs are gone, and a carrier's OWN tree is
   * `PerceptionApi.reach`'s, nearest first.
   *
   * A thing placed under an ENCLOSING member of a shut host (the steak in
   * a shut cold compartment) is behind that lid. Breadth-first.
   */
  getReachableContents(): Stuff[];

  /**
   * ⭐ A **presentation** read — the model read is `getContents()`, and
   * it is unchanged.
   *
   * Filter a contents snapshot to the **loose** items: those not placed
   * on another item *in the same set*. Items placed on a listed host
   * (the bottles on the back-bar, the ham on the hook) are represented
   * by that host and discovered by examining it (`look <host>`); listing
   * them at top level is the clutter this avoids. A crop standing over
   * an area is likewise represented by its ground. Shared by `look`,
   * `sense` and the inspection-card projection so all three agree.
   *
   * Pass the already-filtered snapshot (perception, worn, adornments);
   * with no argument, this container's own contents.
   */
  getLooseContents(items?: readonly Stuff[]): Stuff[];

  /**
   * Pre-add veto. Return `{ ok: false, reason }` to block. ⭐ The default
   * asks {@link fitRefusal} (size and carrying D4) — a container that says
   * what it is FOR overrides it and owns the whole answer.
   */
  canAddContainable?(thing: Stuff & Containable): VetoResult;

  // ── size (size and carrying D4–D5, D22) ──

  /** The authored way in (a sheath, a bottle's neck), else `null` — derived by {@link bounds}. */
  getMouth(): BoundaryOpening | null;
  /** Author the way in (`{width, height}` m); `null` derives it. Throws on a non-positive side. */
  setMouth(value: BoundaryOpening | null): void;
  /**
   * ⭐ What this container is shaped to (D27) — a mixin name
   * (`WieldableMixin`) or a template path (`/trade/smithing/thing/pistol`,
   * which admits that row and every row under it) — or `null`, unshaped. A
   * quiver, a holster, a knife block, a cup rack: it admits only that, and a
   * thing drawn out of it is drawn fast.
   */
  getShapedTo(): string | null;
  /** Author the shape (`null` = unshaped). */
  setShapedTo(value: string | null): void;
  /** Is this container shaped for `item`? An unshaped one is shaped for everything. */
  isShapedFor(item: Stuff): boolean;
  /**
   * ⭐ The box inside, the sides closed, the way in — or `null` when this
   * container's room is unknown (a hollow thing with no authored size: its
   * mass measures its walls, never its room) or it is a body (a body
   * carries; it is sized by its envelope). Unknown bounds ask nothing.
   */
  bounds(): ContainerBounds | null;
  /**
   * ⭐ Would `item` go in? The two tape-measure checks — through the mouth
   * by its cross-section, and, turned some way, along every side this
   * closes — and the capacity (what is already in, filled by box, packed
   * cloth, a stack's count). `null` = it goes (or nothing is known).
   */
  fitRefusal(item: Stuff): FitRefusal | null;
  /**
   * ⭐ How tight it closes against the wet (D22): a bulk vessel's authored
   * `closure`; any other — shut and of a material that takes no water →
   * `liquidTight`, else `open`.
   */
  closureLevel(): ClosureLevel;
  /**
   * ⭐ Pressed in, or it leaves (D5): what is not held drifts out of an open
   * side when nothing presses it in — a floater up out of a submerged open
   * bucket, anything not behind a closed side at zero gravity, a cup off a
   * table (a fastened member — `from` — holds). With `only`, that thing
   * alone. Returns what left.
   */
  reconcilePressing(only?: Stuff): Stuff[];
  /** Optional pre-remove veto. */
  canRemoveContainable?(thing: Stuff & Containable): VetoResult;
  /** Fired after the Containable has been added; `from` is where it was. */
  onContainableAdded?(thing: Stuff & Containable, from?: Stuff | null): void;
  /** Fired after the Containable has been removed; `to` is where it went. */
  onContainableRemoved?(thing: Stuff & Containable, to?: Stuff | null): void;
  /**
   * ⭐ What `word` means on this host (`PlacementOffers`): the interior, or
   * a member of a placing host. No word: its only offer, or which of them.
   */
  placementFor(word: string | undefined): PlacementChoice;
}

/**
 * Custom predicate: caller's most-recent frame is inside
 * `Containable.setContainer`. The proxy checks the policy BEFORE
 * pushing the `addContainable` / `removeContainable` frame, so the
 * top of the stack at check time IS the calling `setContainer`
 * frame.
 */
const CalledFromSetContainer = SecurityPolicies.Custom(() => {
  const stack = ExecutionContextApi.getCallStack();
  const callerFrame = stack[stack.length - 1];
  return callerFrame?.method === 'setContainer';
}, 'CalledFromSetContainer');

export function ContainerMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ContainerMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'ContainerMixin';

    /** See {@link Container.placementFor}. */
    public placementFor(word: string | undefined): PlacementChoice {
      return new PlacementOffers(this as unknown as Stuff).choose(word);
    }

    static fieldMeta: FieldMeta = {
      // ⭐ The way in, authored only where it is the point (a sheath, a
      // holster, a bottle's neck); unset derives (D4).
      mouth: { persistent: true, authorable: true },
      // ⭐ The one kind of thing it admits (D27) — a holster, a quiver.
      shapedTo: { persistent: true, authorable: true },
    };

    private _mouth: BoundaryOpening | null = null;

    /** See {@link Container.getShapedTo}. Public so the applier can reflect into it. */
    public shapedTo: string | null = null;

    public getShapedTo(): string | null {
      return typeof this.shapedTo === 'string' && this.shapedTo !== '' ? this.shapedTo : null;
    }

    public setShapedTo(value: string | null): void {
      if (value !== null && value !== undefined && (typeof value !== 'string' || value.trim() === '')) {
        throw new TypeError(`Container.shapedTo must be a mixin name or a template path; got ${JSON.stringify(value)}.`);
      }
      this.shapedTo = value ?? null;
    }

    public isShapedFor(item: Stuff): boolean {
      const shape = this.getShapedTo();
      if (shape === null) return true;
      if (shape.startsWith('/')) {
        const path = item.getTemplatePath() ?? '';
        return path === shape || path.startsWith(`${shape}/`);
      }
      return MixinApi.hasMixin(item, shape);
    }

    protected get mouth(): BoundaryOpening | null {
      return this._mouth ? { ...this._mouth } : null;
    }
    protected set mouth(value: BoundaryOpening | null) {
      this.setMouth(value);
    }

    public getMouth(): BoundaryOpening | null {
      return this._mouth ? { ...this._mouth } : null;
    }

    public setMouth(value: BoundaryOpening | null): void {
      if (value === null || value === undefined) {
        this._mouth = null;
        return;
      }
      if (
        !(typeof value.width === 'number' && value.width > 0) ||
        !(typeof value.height === 'number' && value.height > 0)
      ) {
        throw new TypeError(
          `Container.mouth must be { width, height } in metres, both positive; got ${JSON.stringify(value)}.`,
        );
      }
      this._mouth = { width: value.width, height: value.height };
    }

    /** See {@link Container.bounds}. */
    public bounds(): ContainerBounds | null {
      const self = this as unknown as Stuff & Container;
      if (self.isAgent()) return null;
      // The room first: most containers have no known room, and their
      // sides are then never asked (a place's sides cost an exposure read).
      const interior = interiorOf(self);
      if (interior === null) return null;
      const closed = closedSidesOf(self);
      if (closed === null) return null;
      let mouth: BoundaryOpening | null = this.getMouth();
      if (mouth === null && !self.isPlace()) {
        // The open (or lidded) face: the top. A bag opens as wide as it is.
        mouth = { width: interior.width, height: interior.depth };
      }
      return { interior, closed, mouth };
    }

    /** See {@link Container.fitRefusal}. */
    public fitRefusal(item: Stuff): FitRefusal | null {
      const self = this as unknown as Stuff & Container;
      // A destroyed piece (merged into a stack on arrival) has no size to fit.
      if (item.stuffId === self.stuffId || self.isAgent() || item.isDestroyed()) return null;
      // ⭐ A shaped container admits its one kind, whatever its size (D27).
      if (!this.isShapedFor(item)) {
        return { ok: false, reason: 'not-shaped-for', facts: { container: self as Stuff, item, dims: null } };
      }
      const box = (MixinApi.isTangible(item) ? item.getFitBox() : null);
      if (box === null) return null;
      const interior = interiorOf(self);
      if (interior === null) return null;
      // ⭐ Every side closed is the strictest case — an open side only ever
      // lets more in. A thing that fits a closed box fits whatever this is,
      // and the sides (a place's cost an exposure read) are never asked.
      const strict: ContainerBounds = {
        interior,
        closed: { width: true, depth: true, height: true },
        mouth: self.isPlace() ? null : (this.getMouth() ?? { width: interior.width, height: interior.depth }),
      };
      if (this.fitsWithinBounds(item, box, strict)) return null;
      const b = this.bounds();
      if (b === null) return null;
      const facts = { container: self as Stuff, item, dims: box };
      if (b.mouth !== null && !box.fitsThrough(b.mouth)) {
        return { ok: false, reason: 'too-big-for-mouth', facts };
      }
      if (box.orientationWithin(b.interior, b.closed) === null) {
        return { ok: false, reason: 'too-big-inside', facts };
      }
      // Capacity: only a container that closes some side holds a volume —
      // a field takes a whale skeleton however much is lying there.
      if (b.closed.width || b.closed.depth || b.closed.height) {
        let used = 0;
        for (const c of this.getContents()) {
          if (c.stuffId === item.stuffId) continue;
          used += fillOf(c, b);
        }
        if (used + fillOf(item, b) > b.interior.boxVolume() * (1 + 1e-9)) {
          return { ok: false, reason: 'no-room', facts };
        }
      }
      return null;
    }

    /** Would `item` (fitted by `box`) go into `b`? The cheap pass of {@link fitRefusal}. */
    private fitsWithinBounds(item: Stuff, box: Dimensions, b: ContainerBounds): boolean {
      if (b.mouth !== null && !box.fitsThrough(b.mouth)) return false;
      if (box.orientationWithin(b.interior, b.closed) === null) return false;
      let used = 0;
      for (const c of this.getContents()) {
        if (c.stuffId !== item.stuffId) used += fillOf(c, b);
      }
      return used + fillOf(item, b) <= b.interior.boxVolume() * (1 + 1e-9);
    }

    /** The default veto: the tape measure. See {@link Container.canAddContainable}. */
    public canAddContainable(thing: Stuff & Containable): VetoResult {
      const refusal = this.fitRefusal(thing);
      return refusal === null ? { ok: true } : { ok: false, reason: refusal.reason };
    }

    /** See {@link Container.closureLevel}. */
    public closureLevel(): ClosureLevel {
      const self = this as unknown as Stuff;
      if (MixinApi.isBulkable(self)) return self.getClosure();
      if (MixinApi.isSealable(self) && !self.isOpen()) {
        const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
        const takesWater =
          mat !== null && MixinApi.hasPorosity(mat)
            ? mat.getWaterAbsorptionCapacity().rawValue()
            : 0;
        return takesWater > 0 ? 'open' : 'liquidTight';
      }
      return 'open';
    }

    /** See {@link Container.reconcilePressing}. */
    public reconcilePressing(only?: Stuff): Stuff[] {
      const self = this as unknown as Stuff & Container;
      if (self.isDestroyed()) return [];
      // ⭐ A body carries; what it holds is not pressed in by sides — except
      // what is in a POCKET (D26), which has a pocket's sides: a bottom and
      // walls, and a top only when it `closes` (a buttoned breast pocket
      // keeps the cork; an open side pocket lets it float away).
      const agent = self.isAgent();
      const closed = agent ? { width: false, depth: false, height: false } : closedSidesOf(self);
      if (closed === null) return [];
      const place: Stuff | null = self.isPlace()
        ? self
        : MixinApi.isContainable(self)
          ? self.getEnclosingPlace()
          : null;
      const g =
        place !== null && MixinApi.isAtmospheric(place)
          ? place.gravityNow().rawValue()
          : SIZE_DEFAULTS.STANDARD_GRAVITY;
      // ⚠ The CONTAINER's medium, never the item's: a cork floats in a
      // bucket's own water and stays in the bucket; it leaves only when the
      // bucket itself is under.
      let mediumRho: number | null = null;
      const floats = (c: Stuff): boolean => {
        if (!MixinApi.isTangible(c)) return false;
        const rho = c.getMaterial()?.getDensity().rawValue() ?? 0;
        if (!(rho > 0)) return false;
        if (mediumRho === null) {
          const medium = BiomeApi.mediumFor(self);
          if (!medium.immersed) {
            mediumRho = 0;
          } else {
            try {
              mediumRho = BiomeApi.densityOf(medium.tag).rawValue() || 1000;
            } catch {
              mediumRho = 1000;
            }
          }
        }
        return rho < mediumRho;
      };
      const occupants = new Set<string>();
      if (MixinApi.isSlotted(self)) {
        for (const [, occ] of self.getAllOccupants()) {
          for (const o of occ) occupants.add((o as unknown as Stuff).stuffId);
        }
      }
      const left: Stuff[] = [];
      const candidates = only !== undefined ? [only] : this.getContents();
      for (const c of candidates) {
        if (!MixinApi.isContainable(c) || c.getContainer() !== self) continue;
        if (c.isAgent() || occupants.has(c.stuffId) || c.isFixedInPlace()) continue;
        const placed = c.getPlacement();
        let sides: ClosedSides;
        if (placed !== null) {
          const member = placed.host.placementOf(placed.name);
          // A hung thing is fastened — clipped or tied — and stays put.
          if (member.getFastens()) continue;
          if (agent) {
            // On a body only a pocket presses: its walls, and a top if it closes.
            if (!member.getEncloses()) continue;
            const shut = placed.host.getPlacementEntry(placed.name)?.closes === true;
            sides = { width: true, depth: true, height: shut };
          } else {
            sides = { width: false, depth: false, height: false };
          }
        } else {
          // Loose in a place, there is nowhere further to go — and loose on
          // a body is the body's (until the flip, W7).
          if (self.isPlace() || agent) continue;
          sides = closed;
        }
        let leaves: boolean;
        let how: 'up' | 'drifts';
        if (g > 0) {
          // Down is held by a bottom, always; up only by a closed top.
          if (!floats(c)) continue;
          leaves = !sides.height;
          how = 'up';
        } else {
          leaves = !(sides.width && sides.depth && sides.height);
          how = 'drifts';
        }
        if (!leaves) continue;
        // Out of a pocket it is gone from the body, into the place around it.
        const dest: Stuff | null = placed !== null && !agent ? self : place;
        if (dest === null || !MixinApi.isContainer(dest)) continue;
        if (placed === null && dest.stuffId === self.stuffId) continue;
        try {
          ContainmentApi.move(c, dest);
        } catch {
          continue;
        }
        left.push(c);
        const from: Stuff = placed !== null ? (placed.host as unknown as Stuff) : self;
        try {
          MessageApi.scene(c)
            .topic('sense.surroundings')
            .toPeers(
              how === 'up'
                ? Mml.compose`${Mml.thing(c)} bobs up and away from ${Mml.thing(from)}.`
                : Mml.compose`${Mml.thing(c)} drifts away from ${Mml.thing(from)}.`,
            )
            .send();
        } catch {
          /* no one to tell (a unit world) */
        }
      }
      return left;
    }

    /**
     * Residency veto: a non-empty container stays resident — its cold
     * contents cull individually first, then the emptied container culls
     * a later sweep (bottom-up, so R2.4's owning-cascade never destructs
     * a subtree out from under itself). Falls through to `super` when
     * empty so other composed vetoes still apply.
     */
    public canEvict(context: EvictionContext): VetoResult {
      // A persistable host (persistence spine) does NOT veto on contents:
      // its contents are captured to a `PersistedRecord` before the cull
      // (the residency sweep awaits `PersistableApi.capture` first), so it
      // can evict safely and re-materialize on next reference. Fall through
      // to `super` so the host's OTHER vetoes still apply (a live Avatar's
      // `HasInteractive`, a `WarrenMember`). A non-persistable container
      // keeps the classic contents veto.
      if (
        this.getContents().length > 0 &&
        !MixinApi.isPersistable(this as unknown as Stuff)
      ) {
        return { ok: false, reason: 'container is not empty' };
      }
      return super.canEvict(context);
    }

    /**
     * Persistence-spine capture hook (see
     * [docs/subsystems/persistence.md]). Serializes this Container's
     * directly-held content: one {@link ContentEntry} per Containable, in
     * `getContents()` order (the shared index the Slotted slice references).
     * A nested **host** (composes `Persistable`) is emitted as a `{ ref }`
     * (it persists itself); anything else nests its composed `state`,
     * recursing through `ctx.captureItem`. A placed item records the
     * index of the `Placing` sibling it sits on and the member's name.
     *
     * Restore of the container slice is centralized in `PersistableLogic`
     * (it cross-references the Slotted slice by index), so there is no
     * paired `hydrateSlice` here.
     */
    static captureSlice(
      host: Stuff,
      ctx: CaptureContext,
    ): ContainerSlice {
      const container = host as Stuff & Container;
      // Three skips, one filter — they must produce the SINGLE ordering the
      // Slotted slice indexes into, so they cannot be separate passes.
      //
      // 1. A live player avatar (HasInteractive) is a transient occupant,
      //    never a host's persistent content — it persists itself, under
      //    its own record.
      // 2. A good someone has been STAMPED as owning persists owner-side
      //    too, in that owner's estate (D2). An unstamped fixture — the
      //    dorm's bed, a let unit's range, litter — captures here exactly
      //    as it always has, which is why the rule keys on the stamp and
      //    not on `ownerOf`: a fixture under a parcel extent is *owned* but
      //    not *stamped*, and belongs to its room's record.
      // 3. A `Behaved` NPC is CAST, never content. A hand that commutes
      //    between two persistable rooms (its floor and the counter it
      //    consigns at) stands in whichever one each room's capture
      //    happens to catch — so BOTH records can carry it, and the next
      //    boot restores it twice: `expected singleton, found 2`, boot
      //    dead. The cast is authored `cast:` data; a room's
      //    materialize re-seeds a missing troupe via
      //    `Persistable.reseedCast`, so skipping it here loses nothing.
      //    (The skip keys on the MIXIN, not the authored list — a
      //    wandering NPC standing here at capture time is some other
      //    room's cast, and equally not our content.)
      //
      // The skipped goods are reported so `PersistableLogic` can flush them
      // into their owners' estates after this synchronous walk. Dropping
      // one here without reporting it would destroy it with the host.
      const contents = container.getContents().filter((item) => {
        if (MixinApi.isHasInteractive(item)) return false;
        if (MixinApi.isBehaved(item)) return false;
        if (MixinApi.isChattel(item) && item.isOwnerPersisted()) {
          ctx.noteOwnedGood(item);
          return false;
        }
        return true;
      });
      const entries: ContentEntry[] = contents.map((item) => {
        const placement: ContentPlacement = {};
        const placed = item.getPlacement();
        if (placed) {
          const idx = ctx.indexOf(placed.host);
          if (idx >= 0) {
            placement.hostIndex = idx;
            placement.placement = placed.name;
          } else if (MixinApi.isChattel(placed.host) && placed.host.isOwnerPersisted()) {
            // ⭐ An owned host persists in its owner's estate, not here (W7).
            placement.hostChattelId = placed.host.getChattelId();
            placement.placement = placed.name;
          }
        }
        return ctx.captureItem(item, placement);
      });
      return { contents: entries };
    }

    /**
     * Framework cleanup (S1 — evacuate to outer container).
     * When a Container destructs, every Containable currently held
     * is re-parented to the destructing Container's own outer
     * container via `ContainmentApi.move`. Top-of-containment
     * (Container that isn't also Containable, or whose
     * `getContainer()` is null) has no outer; per-item policy
     * applies:
     *
     *   - `HasInteractive` items (Avatars with a live connection)
     *     escape to the void singleton (`/platform/location/void`) so an
     *     active session never ends up with a null environment.
     *     The void is in the bootstrap manifest, so the sync
     *     `findByTemplatePath` lookup here is guaranteed to find
     *     a live instance.
     *   - Everything else cascade-destructs along with the host.
     *
     * `onMoved(from, to)` witnesses fire for each item that's
     * evacuated; `onDestruct` fires for each item that cascades.
     *
     * Walk order matters: this fires BEFORE `Containable.
     * cleanupOnDestruct` for a Container+Containable composition,
     * so the evacuation completes while `getContainer()` still
     * returns the outer. Snapshot first — `removeContainable`
     * mutates the live set during iteration.
     *
     * Limitation: only the DIRECT contents of the destructing host
     * are policy-targeted. A `HasInteractive` nested inside a
     * non-`HasInteractive` Container that itself sits inside a
     * top-of-containment host will be cascade-destructed when its
     * containing Container destructs (which moves it to the
     * top-host while that's mid-destruct, then R2.3 self-heal
     * nulls its container). If that nested-HI case becomes real,
     * lift the rule into `ContainmentApi.move` as a chokepoint.
     */
    static cleanupOnDestruct(stuff: Stuff): void {
      const host = stuff as Stuff & Container;
      // Snapshot via getContents() (returns Array.from(this.contents)
      // — already a fresh array). Safe to iterate while mutating
      // the underlying set via ContainmentApi.move.
      const snapshot = host.getContents();
      const outer = MixinApi.isContainable(host)
        ? (host as Stuff & Containable).getContainer()
        : null;
      // Pre-resolve the evacuation fallback exactly once — only the
      // null-outer branch needs it, and only when at least one item exists.
      // The target is the `evacuationFallback` app setting (default
      // `/platform/location/void`), read sync from the warmed cache.
      const evacuationFallback =
        outer === null && snapshot.length > 0
          ? StuffApi.findByTemplatePath<Stuff & Container>(
              AppApi.setting(AppSettingKeys.evacuationFallback)
            ) ?? null
          : null;
      // ⭐⭐ A persistable host's destruct is its DORMANCY, and its record holds
      // its contents: dropping them on the floor as well would be two of
      // everything once it comes back (a signed-out body, D30). A person it
      // happens to hold is nobody's contents and still steps out.
      const dormant = MixinApi.isPersistable(host) && host.shouldPersist();
      // ⚠ Whoever stands around this host took command sources from it and from
      // everything it holds. Say so while it still knows what that is: found by a
      // census of a live heap, a bystander's stack keeping every signed-out body's
      // implant and clothes in memory (80 of them on one NPC, after 20 sign-outs).
      if (outer !== null) CommandApi.applyContainmentDelta(host, outer, null);
      for (const item of snapshot) {
        try {
          if (outer !== null && (!dormant || MixinApi.isHasInteractive(item))) {
            if (MixinApi.isCarrying(outer)) outer.receive(item);
            else ContainmentApi.move(item, outer);
          } else if (
            MixinApi.isHasInteractive(item) &&
            evacuationFallback !== null
          ) {
            ContainmentApi.move(item, evacuationFallback);
          } else {
            // ⭐ A persistable host's destruct is its dormancy: its record
            // keeps its contents and an owned good rides its owner's
            // estate, naming this host — so the good's title must outlive
            // this instance.
            if (
              MixinApi.isPersistable(host) &&
              MixinApi.isChattel(item) &&
              item.isOwnerPersisted()
            ) {
              item.keepTitleThroughDestruct();
            }
            StuffApi.destruct(item);
          }
        } catch (err) {
          // Log-and-continue (same policy as the dispatcher).
          // One stuck item must not strand the rest.
          console.error(
            `ContainerMixin.cleanupOnDestruct: failed to evacuate ` +
              `${item.stuffId} from ${host.stuffId}`,
            err
          );
        }
      }
    }

    /**
     * Command provider for inventory management commands
     */
    static commandContributions: CommandContributions = {
      self: [
        'platform/cmd/inventory/inventory.yaml',
        'platform/cmd/inventory/get.yaml',
        'platform/cmd/inventory/drop.yaml',
        'platform/cmd/inventory/put.yaml',
        'platform/cmd/inventory/give.yaml',
      ],
      peers: [],
      environment: [],
    };

    /**
     * Live-query subscribable field: `contents`. Projects each visible
     * contained Stuff as a `REF_FIELDS`-shape record so the inspection
     * card (and any future container widget) can render the inside-of
     * view from a single subscription without a per-child round trip.
     *
     * Per-viewer visibility filter mirrors `LookController.lookAtLocation`'s
     * structural policy:
     *
     *   - Items the viewer (`self`) IS are excluded — a player listing
     *     their own container shouldn't see themselves in it.
     *   - `AdornmentMixin` items are excluded (they're part of the
     *     host's structure, not loose contents).
     *   - Non-`VisibleMixin` items are excluded (they can't be
     *     referenced in prose anyway).
     *
     * `dependsOnFields: ['contents']` keys the dependency-index entry
     * to the `FieldChangedEvent { field: 'contents' }` fires installed
     * on `addContainable` / `removeContainable` below — the field is
     * not a persistent field (the applier never reflects into it) and
     * setter-shaped invariants don't fit, so the events fire from the
     * primitives.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'contents',
        // ⭐ Rung 1: a placement change on a child (an apple placed ON a
        // desk that is already IN this room) moves nothing in this
        // container's set, so `contents` alone would not wake — the
        // field is name-keyed on the bus, so a `placement` fire anywhere
        // re-resolves every open container card, which re-projects its
        // children with their fresh placement.
        dependsOnFields: ['contents', 'placement'],
        read: (stuff, viewer) => {
          const host = stuff as Stuff & Container;
          // ⭐ The listing's rule, said in MQL — the one `look` and `sense`
          // use, plus `:carried`: `contents` and `worn` are a PARTITION of
          // one set (wearing something never takes it out of the wearer's
          // contents), so a shirt renders in one projection, not both.
          // MQL names the same children for everyone (D23); the card shows
          // what THIS viewer perceives — a stranger's pockets, a shut chest
          // and a concealed-undiscovered child never enter the projection.
          const visible = PerceptionApi.perceived(
            viewer,
            MqlApi.resolveMany(
              `#${host.stuffId}:i:visible:carried:[not mixin.AdornmentMixin] - me`,
              // The card's viewer is a character (a CommandGiver); the static
              // type at this seam is only `Stuff & Sensor`.
              { commandGiver: viewer as unknown as Stuff & CommandGiver, scope: 'here' },
            ).stuff,
          );
          // Placed items (the back-bar's bottles) render under their host,
          // not as loose contents — the same rule `look`/`sense` use, so the
          // inspection card agrees.
          return host.getLooseContents(visible).map((child) =>
            MqlSubscriptionApi.projectFields(child, REF_FIELDS, viewer),
          );
        },
      },
      {
        // ⭐ Rung 1: this thing is itself a holder — it holds more. A
        // capability, not a count, so it is `static` (never fires) and
        // true even for an empty container. Carried on every ref record
        // so a fridge's freezer compartment, a chest, the hive read as
        // things that hold more, not anonymous boxes. `Placing` declares
        // the same-named field for a bare surface; a thing composing both
        // reads one `holds: true`.
        name: 'holds',
        static: true,
        read: () => true,
      },
    ];

    /**
     * The contained items. Read access goes through `getContents()`;
     * mutation goes through `addContainable` / `removeContainable`,
     * which only `Containable.setContainer` may legitimately invoke.
     */
    protected contents: Set<Stuff & Containable> = new Set();

    /**
     * State-mutation primitive. Locked down — only callable from
     * `Containable.setContainer`. Use `ContainmentApi.move(item,
     * container)` from application code.
     *
     * Fires `FieldChangedEvent { field: 'contents' }` after a real
     * addition so the MQL subscription substrate's dependency index
     * picks up containment-shape changes for the `contents` descriptor.
     * The substrate matches on `(KIND, 'field', 'contents')` only —
     * `oldValue` / `newValue` are inspected by the diff pass via
     * re-projection of the host, not by the index, so the count
     * delta carried here is informational (debugging / future
     * coarse-grain optimizations) rather than load-bearing.
     */
    @CallSecurity(CalledFromSetContainer)
    @Final
    @Unshadowable
    addContainable(item: Stuff & Containable): void {
      const before = this.contents.size;
      this.contents.add(item);
      if (this.contents.size !== before) {
        // Inline the fire rather than route through `fireFieldChange`
        // — Object.is(before, before+1) is false but the values are
        // documentation-only here, and we want the event to fire
        // unconditionally on a real mutation rather than being
        // suppressed by an accidental no-op return path.
        MqlSubscriptionApi.fireFieldChange(
          this,
          'contents',
          before,
          this.contents.size,
        );
      }
    }

    /**
     * Remove primitive. Same lockdown as `addContainable`. Fires the
     * matching `FieldChangedEvent { field: 'contents' }` on a real
     * removal.
     */
    @CallSecurity(CalledFromSetContainer)
    @Final
    @Unshadowable
    removeContainable(item: Stuff & Containable): boolean {
      const before = this.contents.size;
      const removed = this.contents.delete(item);
      if (removed) {
        MqlSubscriptionApi.fireFieldChange(
          this,
          'contents',
          before,
          this.contents.size,
        );
      }
      return removed;
    }

    /** Membership predicate. */
    hasContainable(item: Stuff & Containable): boolean {
      return this.contents.has(item);
    }

    /** Snapshot of contained items as an array. */
    getContents(): (Stuff & Containable)[] {
      return Array.from(this.contents);
    }

    /**
     * Walk the containment tree depth-first pre-order, starting
     * from this Container's immediate contents, and return every
     * Containable encountered. Used by MQL's `:I` transform and
     * any controller that wants the full nested inventory.
     */
    getDeepContents(): (Stuff & Containable)[] {
      const out: (Stuff & Containable)[] = [];
      const walk = (c: Stuff & Container): void => {
        for (const item of c.getContents()) {
          out.push(item);
          if (MixinApi.isContainer(item)) {
            walk(item as Stuff & Container);
          }
        }
      };
      walk(this as unknown as Stuff & Container);
      return out;
    }

    /** See the interface docstring (size-and-carrying W7). */
    getCarriedContents(): (Stuff & Containable)[] {
      const ctxScope = ExecutionContextApi.getCircleScope();
      const inScope = (c: Stuff): boolean => ctxScope === OMNI_SCOPE || c.getCircleScope() === ctxScope;
      const out: (Stuff & Containable)[] = [];
      const holders: (Stuff & Container)[] = [this as unknown as Stuff & Container];
      // `out` grows behind `holders`; containment is acyclic (`setContainer`
      // refuses an ancestor), so the walk ends with the tree.
      for (let i = 0; i < holders.length; i++) {
        for (const item of holders[i]!.getContents()) {
          if (!inScope(item)) continue;
          out.push(item);
          if (MixinApi.isContainer(item) && !item.isAgent()) holders.push(item);
        }
      }
      return out;
    }

    /** See the interface docstring (size-and-carrying D17). */
    getReachableContents(): Stuff[] {
      const self = this as unknown as Stuff & Container;
      const out: Stuff[] = [];
      // ⚠ Sandbox hygiene, before anything is asked of an item: a walk in a
      // circle never reads a field object (or one of another circle) — the
      // proxy denies any method on it, the lid read included (the
      // sandbox-escape battery's `reachable`). Omni sees all.
      const ctxScope = ExecutionContextApi.getCircleScope();
      const inScope = (c: Stuff): boolean => ctxScope === OMNI_SCOPE || c.getCircleScope() === ctxScope;
      const behindLid = (c: Stuff): boolean => {
        if (!MixinApi.isContainable(c)) return false;
        const scope = c.getEnclosingScope();
        if (scope === null || scope.stuffId === c.getContainer()?.stuffId) {
          return false;
        }
        return MixinApi.isSealable(scope) && !scope.isOpen();
      };
      const open: (Stuff & Container)[] = [];
      for (const item of self.getContents()) {
        if (!inScope(item) || behindLid(item)) continue;
        out.push(item);
        if (MixinApi.isOpenContainer(item)) open.push(item);
      }
      for (const holder of open) {
        for (const item of holder.getContents()) {
          if (!inScope(item) || behindLid(item)) continue;
          out.push(item);
        }
      }
      return out;
    }

    /** See the interface docstring — a presentation read, not the model. */
    getLooseContents(items?: readonly Stuff[]): Stuff[] {
      const snapshot: readonly Stuff[] =
        items ?? (this as unknown as Stuff & Container).getContents();
      const ids = new Set(snapshot.map((i) => i.stuffId));
      return snapshot.filter((item) => {
        // ⭐ A crop standing over an area is part of the GROUND, not loose
        // contents (field population D17): the field's own description
        // reads the stand. A labeled individual (no sown area) is a plant
        // and stays listed.
        if (MixinApi.isGrowing(item) && item.isAreaCrop()) return false;
        const placement = MixinApi.isContainable(item)
          ? item.getPlacement()
          : null;
        return !(
          placement && ids.has((placement.host as Stuff).stuffId)
        );
      });
    }
  }
  return ContainerMixin;
}

/**
 * The sides a container closes (D4), or `null` for a body. A place: its
 * walls unless it has none or stands open-fronted, its top unless open to
 * the sky. A thing: its sides and bottom always, its top when it is shut.
 */
function closedSidesOf(c: Stuff & Container): ClosedSides | null {
  if (c.isAgent()) return null;
  if (c.isPlace()) {
    if (!MixinApi.isAtmospheric(c)) return null;
    const e = c.exposure();
    const walled = !e.wallsNone;
    return {
      // An open-fronted barn spills along its depth; three open sides,
      // both ways.
      width: walled && e.openSides < 3,
      depth: walled && e.openSides < 1,
      height: e.top !== 'open',
    };
  }
  const shut = MixinApi.isSealable(c) && !c.isOpen();
  return { width: true, depth: true, height: shut };
}

/**
 * The room inside (D4), or `null` when it is not known. A place: its cube.
 * A vessel: its `interiorCapacity`, in its own proportions (a flexible one
 * filled is a block). A thing with an authored box: that box less its
 * walls. Anything else — a hollow thing whose only size is its mass — has
 * no known room, and nothing asks it to fit.
 */
function interiorOf(c: Stuff & Container): Dimensions | null {
  if (c.isPlace()) {
    // Places stay cubes; an open top is an open SIDE (`closedSidesOf`), so
    // the height is the cell's whether or not a ceiling closes it.
    const ext = (c as unknown as Place).getLinearExtent();
    if (ext === null || !(ext > 0)) return null;
    return new Dimensions(ext, ext, ext);
  }
  if (!MixinApi.isTangible(c)) return null;
  if (MixinApi.isBulkable(c)) {
    const litres = c.getInteriorCapacity()?.rawValue() ?? 0;
    if (litres > 0) {
      const own = c.getShape();
      const form =
        own !== null && own.isRigid()
          ? own
          : StuffApi.findByTemplatePath<NonNullable<typeof own>>(BLOCK_FORM) ?? null;
      return form === null ? null : form.dimensionsFor(litres / 1000);
    }
  }
  if (c.hasAuthoredSize()) {
    const d = c.getDimensions();
    if (d === null) return null;
    const f = SIZE_DEFAULTS.INTERIOR_FRACTION;
    return new Dimensions(d.width * f, d.depth * f, d.height * f);
  }
  return null;
}


/**
 * The room a content takes inside these bounds (D4): a rigid thing its box
 * as it best stands, clipped where it stands out of an open side; a
 * flexible one its packed volume; a stack its count (its volume already
 * is). Unknown size takes no room.
 */
function fillOf(item: Stuff, b: ContainerBounds): number {
  const box = (MixinApi.isTangible(item) ? item.getFitBox() : null);
  if (box === null) return 0;
  const stands = box.orientationWithin(b.interior, b.closed) ?? box;
  return stands.clippedTo(b.interior);
}
