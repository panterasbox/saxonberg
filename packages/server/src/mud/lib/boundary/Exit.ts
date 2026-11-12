/**
 * Exit - First-class one-way passage between two exitable places.
 *
 * An `Exit` lives on an `Exitable` (`Location`, `SphericalLocation`,
 * or `ExitableVessel`) and points to another Exitable. Reciprocity is opt-in
 * via `ExitableMixin.addBidirectionalExit()`, which installs one Exit on
 * each side (and, optionally, one shared `Boundary` — a door, a window — of which each exit is a side).
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
import { PerceptibleMixin } from '../description/Perceptible';
import { VisibleMixin } from '../description/Visible';
import type { NounPhrase } from '../description/NounPhrase';
import { ConcealmentLevels } from '../concealment/ConcealmentLevel';
import type { ConcealmentLevel } from '../concealment/ConcealmentLevel';
import type { Enablement } from '../locomotion/Enablement';
import type { Stuff, EvictionContext } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import type { Container } from '../spatial/Container';
import type { Containable } from '../spatial/Containable';
import type { Boundary } from './Boundary';
import type { BoundaryOpening } from './Conduit';
import type { ActRefusal } from '../craft/ActPlan';
import type Place from '../stuff/Place';
import type { WayRecord, WayState } from '@saxonberg/types';
import type Structure from '../structure/Structure';
import { StuffApi } from '../../api/stuff';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { Mixins, type FieldMeta } from '../mixin';
import { LocomotionApi } from '../../api/locomotion';
import { MixinApi } from '../../api/mixin';
import { GrammarApi } from '../../api/grammar';
import { ParcelApi } from '../../api/parcel';
import { NavigationApi } from '../../api/navigation';
import { Creature } from '../creature/Creature';
import type { LocomotionMode } from '../../platform/idea/LocomotionMode';

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
  | 'breakaway'
  /**
   * ⭐ What is coming through does not fit the way (size and carrying D21):
   * the body at its mode, a held thing, the turn, a cart.
   */
  | 'clearance'
  /** ⭐ The mode wants more free hands than the body has (a ladder, D20). */
  | 'handsNeeded'
  /** ⭐ A held load too long or awkward to run with (size and carrying D35). */
  | 'awkwardLoad'
  /**
   * ⭐ The far side is **not published** — a readiness wall, not a
   * locked door. Draft content that has never been live, or live
   * content taken offline; either way the parcel says it is not open.
   */
  | 'unpublished'
  /**
   * ⭐ The far side **does not exist**: the destination names a row that
   * is not there. The direction is installed so `look` still names it
   * and so creating the row heals it, but nothing lies that way yet.
   * Before this the same situation was a BOOT CRASH.
   */
  | 'unbuilt'
  /**
   * A traversal witness said no — the mover's `beforeTraverse`, the
   * source's `canExit`, or the destination's `canEnter`. The hook's own
   * `reason` is the prose.
   */
  | 'veto';

/**
 * ⭐ Why a way will not take what is coming through it (size and carrying
 * D21), and what would: `lower` — a mode the body's plan has that fits;
 * `pack` — the worn container that makes it too deep; `dismount` — the
 * mounted pair will not go; `thing` — the held thing or cart that will not.
 */
export type ClearanceRefusal = ActRefusal<
  'too-big-for-way' | 'held-too-big' | 'wont-turn' | 'cart-too-big',
  {
    mover: Stuff;
    gap: BoundaryOpening | null;
    turn: number | null;
    thing?: Stuff;
    lengthM?: number;
    lower?: string;
    pack?: Stuff;
    dismount?: boolean;
  }
>;

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
  /**
   * ⭐ On an ok guard for a mode with an enablement mixin: the host that
   * enabled the crossing (the ladder, the rope at the lip), so the crossing
   * can tell it afterwards (`Enablement.afterEnabledTraverse`, cordage D11).
   */
  host?: Stuff & Enablement;
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
  /** Per-site size of the gap this way passes through (see {@link Exit.getOpening}). */
  opening?: BoundaryOpening | null;
  /** Per-site longest rigid length that swings round this way's bend (see {@link Exit.getTurn}). */
  turn?: number | null;
  /**
   * ⭐⭐ Is this the KIND of way that closes? See
   * {@link Exit.isConditional}.
   */
  conditional?: boolean;
  /**
   * Game minutes for ONE baseline traverse of this edge — unloaded, in
   * walk mode. `null` (the default) means *use the corridor default*,
   * the `transport.defaultEdgeMinutes` AppSetting.
   *
   * ⚠ **Nothing in the kernel reads this.** `go north` stays
   * instantaneous, and it must: a duration on ordinary movement would
   * put a real-time toll on every step in the game. It exists for the
   * transport system's Journey, which spends it as
   * `edgeMinutes × modeFactor(mode) × loadFactor(rig)`.
   *
   * ⭐ It is authored per EDGE rather than derived from `coords`
   * distance, because **length here is an event budget, not a metric**:
   * a lonely stretch is few rooms and long edges, and coordinates are
   * grid membership rather than a distance. See
   * [docs/subsystems/logistics.md].
   */
  edgeMinutes?: number | null;
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

/** The self-powered way across each medium, for a refusal that names it. */
/**
 * The ground modes an empty `media` list admits: the three paces and the
 * two ways a body gets low (size and carrying D20).
 */
const GROUND_FAMILY: readonly string[] = ['walk', 'sneak', 'run', 'stoop', 'crawl'];

/**
 * Does `opening` pass a body whose envelope is `env`? Its sides as they
 * stand — a standing body does not turn on its side — unless it goes
 * through lengthwise, when either way round will do.
 */
function opens(env: BoundaryOpening, opening: BoundaryOpening, lengthwise = false): boolean {
  const e = 1e-9;
  if (env.width <= opening.width + e && env.height <= opening.height + e) return true;
  return lengthwise && env.width <= opening.height + e && env.height <= opening.width + e;
}

/** A way up or down, passed lengthwise. */
function isVertical(direction: string): boolean {
  const d = NavigationApi.normalizeDirection(direction);
  return d === 'up' || d === 'down';
}

const EXIT_MEDIUM_VERB: Readonly<Record<string, string>> = {
  ground: 'walk',
  vertical: 'climb',
  water: 'swim',
  air: 'fly',
};

/**
 * ⭐ An exit is a thing you can NAME and LOOK AT: MQL
 * binds a direction to the exit itself, scored by its own name (its
 * direction) and its authored keywords (`Perceptible` — `gangway` on a
 * ship's berth way), and it describes itself (`Visible` — an authored
 * `longDescription`, else {@link Exit.getLongFor}'s default).
 */
export default class Exit extends VisibleMixin(PerceptibleMixin(ConcealableMixin(Idea))) {
  /**
   * The exit-KIND hydration allowlist (the applier applies only
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
    // The boundary standing in this way — shared with the far side, owned
    // by neither (a row singleton or its minter's). Weak: a destroyed
    // boundary reads as an open way.
    _boundary: { ref: 'instance', lifetime: 'weak' },
    messageIn: { persistent: true },
    messageOut: { persistent: true },
    media: { persistent: true },
    wheelPassable: { persistent: true },
    opening: { persistent: true, authorable: true },
    // ⭐ Size and carrying D8: the longest rigid thing that swings round
    // this way's bend (a turning stair); unset = no bend.
    turn: { persistent: true, authorable: true },
    spansGround: { persistent: true, authorable: true },
    _conditional: { persistent: true },
    _edgeMinutes: { persistent: true },
    blocked: { persistent: true },
    muffled: { persistent: true },
    noFollow: { persistent: true },
    oneWay: { persistent: true },
  };

  protected direction: string;
  public getDirection(): string { return this.direction; }
  public setDirection(value: string): void { this.direction = value; }

  /**
   * ⚠ **DERIVED (magic), named here:** an exit is CALLED by its direction
   * — `north`, `up`, `hesper` (a berth way is named for her) — never an
   * authored name. That is the name MQL scores (`look
   * north` is this exit at the top tier), and the heading `look` prints.
   * An unbound kind clone (no direction yet) falls back to the ladder.
   */
  /**
   * ⚠ **DERIVED (magic), named here:** the keywords an author wrote on
   * this exit's row (`gangway` on a berth way) PLUS its direction PLUS
   * that direction's short forms (`north` → `n`, `up` → `u`, read from
   * the direction table via `NavigationApi.shortFormsOf`). None of these
   * is authored — they are folded in, the `Boundary.getKeywords()` shape — and
   * MQL reads an exit ONLY through this Perceptible interface: it builds
   * no exit-shaped name or keyword and rewrites no word, so `go n` binds
   * the north exit because the exit says it answers to `n`.
   */
  public override getKeywords(viewer?: Stuff): string[] {
    const out = super.getKeywords(viewer);
    const dir = this.direction?.toLowerCase().trim();
    if (dir) {
      for (const w of [dir, ...NavigationApi.shortFormsOf(dir)]) {
        if (!out.includes(w)) out.push(w);
      }
    }
    return out;
  }

  /** Yes — see {@link Stuff.isExit}. */
  public override isExit(): this is Exit {
    return true;
  }

  /**
   * ⭐ A way named for the water it goes into is CALLED *the way into the
   * river* — never the water's bare name (harbors sibling drives,
   * 2026-11-04). Its direction stays the word (`swim river`, *Obvious
   * exits: river*) and the word stays among its keywords. Decided by lens
   * 3a, on the gangway's precedent (`BerthExit.presentationPhrase`): since
   * review 3 an exit is a candidate in its own right, so on the bank — whose
   * own description has the river in it — the way `river` and the river
   * tied at the name tier and `look river` prompted *"the bank at the
   * confluence / river"*, two choices no player could tell apart. A player
   * who looks at the river means the water. Only a word that is not a
   * direction, on a way whose media are water. Keyword data on the
   * object, never a scorer tier.
   */
  public override presentationPhrase(): NounPhrase {
    if (this.direction) {
      if (this.media.includes('water') && NavigationApi.normalizeDirection(this.direction) === undefined) {
        return GrammarApi.properPhrase(`the way into the ${this.direction}`);
      }
      return GrammarApi.properPhrase(this.direction);
    }
    return super.presentationPhrase();
  }

  /**
   * ⭐ The exit describes itself: an authored `longDescription` when it
   * has one, else *a way north* and the state of what hangs in it.
   *
   * ⛔ Never names the far side. Where a way LEADS is map evidence the
   * viewer earns by walking it (`location-graph.md` § the evidence
   * firewall); the way itself is all that stands here to be seen.
   */
  public override getLongFor(viewer: Stuff): string {
    if (this.getLongDescription()) return super.getLongFor(viewer);
    return this.plainWay();
  }

  /**
   * *A way north, through the oak door (closed).* — the unauthored
   * description. A window is named, not stated: *a way west, through the
   * west window.* ⚠ Parenthetical on purpose: *"the front doors is open"*
   * (the boundary drive) — the way cannot know its boundary's number.
   */
  protected plainWay(): string {
    let said = `A way ${this.direction}`;
    const boundary = this.getBoundary();
    if (boundary) {
      const name = boundary.presentationPhrase().withRegister('definite').render();
      said += this.wayState() === 'window'
        ? `, through ${name}`
        : `, through ${name} (${boundary.stateWord()})`;
    } else if (MixinApi.isLockable(this) && this.isLocked()) {
      said += '; it is locked';
    }
    return `${said}.`;
  }

  /**
   * ⭐ This way as every screen sees it — the one wire shape
   * (`WayRecord`) both producers emit (the room card's `exits`
   * subscription, the whereabouts push), so they cannot disagree.
   */
  public wayRecord(): WayRecord {
    const here = this.source ? this.source.getZone() : null;
    const far = this.peekDestination() as Stuff | null;
    const out: WayRecord = {
      direction: this.direction,
      state: this.wayState(),
      // ⭐ A threshold: the far place is in another zone's frame. Unknown
      // (the far side not standing) reads as no threshold.
      crossesZone: !!far && far.getZone() !== here,
    };
    const boundary = this.getBoundary();
    if (boundary) {
      const kw = boundary.getPrimaryKeyword();
      out.boundary = {
        stuffId: boundary.stuffId,
        name: boundary.getPresentation(),
        ...(kw ? { primaryKeyword: kw } : {}),
      };
    }
    return out;
  }

  /**
   * ⭐ The way's whole state in one word — what every screen shows
   * (`WayRecord.state`): no boundary → `open`; a boundary no body can cross
   * even open → `window`; else the boundary's own word, `locked` over `shut`
   * over `open`. A keyed exit with a lock of its own (a sleeping ship's
   * berth way) answers `locked` from that lock.
   */
  public wayState(): WayState {
    const boundary = this.getBoundary();
    if (!boundary) {
      return MixinApi.isLockable(this) && this.isLocked() ? 'locked' : 'open';
    }
    if (!boundary.passesBodiesWhenOpen()) return 'window';
    const word = boundary.stateWord();
    return word === 'closed' ? 'shut' : word;
  }

  protected source: Stuff & Container;
  public getSource(): Stuff & Container { return this.source; }

  /**
   * ⭐ **My jurisdiction is my source room's** — see
   * {@link Stuff.jurisdictionHost}.
   *
   * An exit answers to its exit-KIND path
   * (`/platform/idea/exits/passage`), which names what sort of exit it
   * is and not where it is, and a room holds its exits in a
   * `direction → exit` map rather than containing them. So neither
   * rung of the default jurisdiction walk reaches an exit, and a
   * governed `eval --parcel <extent>` was refused on every exit of
   * every room inside its own extent — `getBoundary()` included, so not
   * even a read got through. Found by a browser drive.
   *
   * ⚠⚠ **The SOURCE, never the destination.** An exit has two ends and
   * the far one may sit in somebody else's extent; answering with the
   * source means *you own the door on your side of the wall*, and
   * keeps this hook from becoming a way to reach into a neighbouring
   * parcel. It is also the same end `getDiscoveryKey` already keys on,
   * for the same reason.
   */
  public override jurisdictionHost(): Stuff | null {
    return this.source as unknown as Stuff;
  }
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
   * The applier / framework brackets writing `exit['destinationPath'] = X`
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

  /**
   * ⭐ The boundary standing in this way — a door, a window, a curtain — or
   * null for an open way. This exit is one SIDE of it; the far place's exit
   * is the other. Set only by `BoundaryApi.attach` (both sides at once, or
   * each authored side as it installs).
   */
  private _boundary: Boundary | null = null;

  public getBoundary(): Boundary | null { return this._boundary; }

  /** BoundaryLogic-only seam: the Api attaches, the exit records it. */
  @CallSecurity(SecurityPolicies.FromModule('/platform/idea/api/BoundaryLogic#BoundaryLogic'))
  public _setBoundary(value: Boundary | null): void { this._boundary = value; }

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
   * Durable discovery key — an `Exit` is a runtime instance with no
   * `templatePath` of its own, so it keys its `DISCOVERY` belief on a
   * synthetic `<source-handle>#exit:<direction>` string, and `undefined`
   * when its source has no durable handle at all.
   *
   * ⚠⚠ The source's key is its {@link Stuff.getDurableHandle}, **not**
   * its template path. Keying on lineage was a real defect with two
   * visible faces: forty provisioned dorm rooms share one row, so a
   * secret found in one read as found in every one of them; and a
   * lounge satellite — a fresh clone per landing, named by nothing —
   * answered with a handle it had no right to, so a find in a room that
   * no longer exists stayed found forever. The handle answers both: a
   * keyed room is `<row>#<extent/leaf>`, a minted one its identity, a
   * singleton place its row (byte-identical to what every DISCOVERY
   * belief already written used), and an ephemeral clone `undefined`.
   *
   * Uniform for an `ExitableVessel` source too — the handle is asked of
   * the object, so nothing here narrows on being a Location.
   */
  public override getDiscoveryKey(): string | undefined {
    if (!this.source) return undefined; // unbound kind clone
    const handle = this.source.getDurableHandle();
    return handle ? `${handle}#exit:${this.direction}` : undefined;
  }
  /**
   * ⚠ **Transient** — set at install when the destination row is
   * missing, never persisted. It is a fact about the world as loaded,
   * and the next hydrate re-derives it: create the row the author meant
   * and the stub is replaced by the real exit. Persisting it would
   * outlive the defect it describes.
   */
  private _unbuilt = false;

  /** Does this exit's destination row not exist? */
  public isUnbuilt(): boolean {
    return this._unbuilt;
  }

  /**
   * Mark this exit as pointing at a row that is not there. Called only
   * by `Exitable._installUnbuiltExit`, which is the one place that
   * knows the row was missing.
   */
  public markUnbuilt(): void {
    this._unbuilt = true;
  }

  /**
   * What to call the far side without resolving it — the live
   * destination's presentation when it is resident, else the path's
   * leaf read as words. ⭐ The whole point is that it never resolves:
   * a refusal must be nameable for a place that is not loaded, not
   * open, or not there.
   */
  public farSideName(): string {
    const path = this._destinationPath;
    if (path) {
      const live = StuffApi.findByIdentityPath(path)[0];
      if (live && MixinApi.isPerceptible(live)) return live.getPresentation();
      const leaf = path.split('/').filter(Boolean).pop() ?? path;
      return leaf.replace(/[-_]/g, ' ');
    }
    return 'that way';
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
   * ⭐ **The size of the gap this way passes through** — `{ width, height }`
   * in metres, from the way's kind row or per site; `null` = the whole face
   * (open ground between two cells). It is the WAY's, not the door's
   * (boundary build, owner's call 2026-11-10): an empty archway has a size
   * too, and what carries what through it (size and carrying) asks here. A
   * boundary hung in the way must fit it.
   */
  protected _opening: BoundaryOpening | null = null;

  public getOpening(): BoundaryOpening | null {
    return this._opening ? { ...this._opening } : null;
  }
  public setOpening(value: BoundaryOpening | null): void {
    if (value === null || value === undefined) {
      this._opening = null;
      return;
    }
    if (
      typeof value !== 'object' ||
      !(typeof value.width === 'number' && value.width > 0) ||
      !(typeof value.height === 'number' && value.height > 0)
    ) {
      throw new TypeError(
        `Exit.opening must be { width, height } in metres, both positive; got ${JSON.stringify(value)}.`,
      );
    }
    this._opening = { width: value.width, height: value.height };
  }

  /**
   * ⭐ **The longest rigid length that can swing round this way's bend**, m
   * (size and carrying D8) — the sofa in the stairwell, the one thing a
   * cube cannot say about a narrow stair. From the kind row (`stair`: 2.2)
   * or per site; `null` = the way runs straight and length never matters.
   */
  protected _turn: number | null = null;

  public getTurn(): number | null {
    return this._turn;
  }
  public setTurn(value: number | null): void {
    if (value === null || value === undefined) {
      this._turn = null;
      return;
    }
    if (!(typeof value === 'number' && Number.isFinite(value) && value > 0)) {
      throw new TypeError(`Exit.turn must be a positive number of metres; got ${JSON.stringify(value)}.`);
    }
    this._turn = value;
  }

  /**
   * ⭐ **The way's tightest gap** (size and carrying D8): elementwise the
   * least of the face it passes through (its source's cell), its own
   * opening, and the boundary hung in it (a door's own size). `null` when
   * nothing bounds it — a track over open ground with no opening given.
   */
  public clearance(): BoundaryOpening | null {
    const gaps: BoundaryOpening[] = [];
    if (!this._spansGround) {
      const src: Stuff | undefined = this.source;
      const face = src != null && src.isPlace() ? (src as unknown as Place).getLinearExtent() : null;
      if (face !== null && face > 0) gaps.push({ width: face, height: face });
    }
    const own = this.getOpening();
    if (own !== null) gaps.push(own);
    const hung = this.getBoundary();
    if (hung !== null) {
      const b = hung.getOpening();
      if (b !== null) gaps.push(b);
    }
    if (gaps.length === 0) return null;
    return {
      width: Math.min(...gaps.map((g) => g.width)),
      height: Math.min(...gaps.map((g) => g.height)),
    };
  }

  /**
   * ⭐ **Would `mover` pass this way, moving as `mode` moves?** (size and
   * carrying D8/D21). `null` = it passes (or its size is unknown).
   *
   * - A **body** passes by its envelope at the mode's profile
   *   (`Creature.envelope`) against the {@link clearance}: a way up or down
   *   is passed lengthwise, by the body's girth. Mounted, the pair is
   *   measured, and a pair that will not go says *dismount*. A rider being
   *   carried by its mount is not asked again — the mount was.
   * - What its **hands** hold is measured on its own (a crawler pushes it
   *   ahead): its cross-section against the clearance, and — rigid — its
   *   longest side against the {@link getTurn}.
   * - A **hitched cart** by its own box's cross-section.
   * - Anything else by its own fit box, as W1 measured it.
   *
   * The refusal names what would work: a lower mode the body's plan has
   * (`lower`), or the worn container that makes it too deep (`pack`) — or,
   * failing both, nothing. It never changes posture.
   */
  public async clearanceRefusal(mover: Stuff, mode?: string): Promise<ClearanceRefusal | null> {
    const gap = this.clearance();
    const turn = this.getTurn();
    if (gap === null && turn === null) return null;
    const base = { mover, gap, turn };
    const lengthwise = isVertical(this.direction);

    if (mover instanceof Creature) {
      const pair = mover.mountedPair();
      if (pair !== null && pair.rider === mover) return null;
      const current = mode != null ? LocomotionApi.modeOf(mode) : null;
      const profile = current?.getBodyProfile() ?? 'upright';
      // What it carries is measured by its shape — loaded on use (W1).
      for (const c of mover.getContents()) if (MixinApi.isTangible(c)) await c.ensureShape();
      const env = mover.envelope(profile, { lengthwise });
      if (gap !== null && env !== null && !opens(env, gap, lengthwise)) {
        if (pair !== null) return { ok: false, reason: 'too-big-for-way', facts: { ...base, dismount: true } };
        return { ok: false, reason: 'too-big-for-way', facts: { ...base, ...(await this.whatWouldPass(mover, current, lengthwise, gap)) } };
      }
      const bodies: Creature[] = pair !== null ? [pair.mount, pair.rider] : [mover];
      for (const body of bodies) {
        if (!MixinApi.isCarrying(body)) continue;
        for (const held of body.heldThings()) {
          const thing = await this.thingRefusal(held, gap, turn);
          if (thing !== null) return { ok: false, reason: thing.reason, facts: { ...base, ...thing.facts } };
        }
      }
    } else if (MixinApi.isTangible(mover)) {
      const own = await this.thingRefusal(mover, gap, turn);
      if (own !== null) {
        return { ok: false, reason: own.reason === 'held-too-big' ? 'too-big-for-way' : own.reason, facts: { ...base, ...own.facts } };
      }
    }

    if (MixinApi.isHauling(mover) && mover.isHitched()) {
      const cart = mover.getHauledCart() as Stuff | null;
      if (cart !== null && MixinApi.isTangible(cart)) {
        await cart.ensureShape();
        const box = cart.getFitBox();
        if (gap !== null && box !== null && !box.fitsThrough(gap)) {
          return { ok: false, reason: 'cart-too-big', facts: { ...base, thing: cart } };
        }
      }
    }
    return null;
  }

  /**
   * A thing measured on its own against this way: its cross-section
   * against the gap, and — rigid — its longest side against the turn.
   */
  private async thingRefusal(
    thing: Stuff,
    gap: BoundaryOpening | null,
    turn: number | null,
  ): Promise<{ reason: 'held-too-big' | 'wont-turn'; facts: { thing: Stuff; lengthM?: number } } | null> {
    if (!MixinApi.isTangible(thing)) return null;
    await thing.ensureShape();
    const box = thing.getFitBox();
    if (box === null) return null;
    if (gap !== null && !box.fitsThrough(gap)) return { reason: 'held-too-big', facts: { thing } };
    const rigid = thing.getShape()?.isRigid() ?? true;
    if (turn !== null && rigid && box.longest() > turn + 1e-9) {
      return { reason: 'wont-turn', facts: { thing, lengthM: box.longest() } };
    }
    return null;
  }

  /**
   * What would get this body through when its mode will not: the first mode
   * its plan has, lower than `current`, admitted here, that fits
   * (`lower`); else the worn container whose bulk is the trouble, and the
   * mode that would fit without it (`pack`, `lower` when not `current`).
   */
  private async whatWouldPass(
    body: Creature,
    current: LocomotionMode | null,
    lengthwise: boolean,
    gap: BoundaryOpening,
  ): Promise<{ lower?: string; pack?: Stuff }> {
    const height = current?.getProfileHeight() ?? 1;
    for (const name of body.getSpecies()?.getBodyPlan()?.getLocomotionModes() ?? []) {
      try {
        await LocomotionApi.loadMode(name);
      } catch {
        /* a plan naming a mode with no row: never a candidate */
      }
    }
    const lower = LocomotionApi.eligibleModes(body)
      .filter((m) => m.getProfileHeight() < height - 1e-9 && !m.getPassthrough() && this.allowsMode(m.getName()))
      .sort((a, b) => b.getProfileHeight() - a.getProfileHeight() || b.getSpeed() - a.getSpeed());
    const fits = (m: LocomotionMode | null, bare: boolean): boolean => {
      const env = body.envelope(m?.getBodyProfile() ?? 'upright', { lengthwise, bare });
      return env !== null && opens(env, gap, lengthwise);
    };
    const full = lower.find((m) => fits(m, false));
    if (full !== undefined) return { lower: full.getName() };
    const bulk = body.wornBulk();
    const worn = [...bulk.things, ...bulk.hung];
    if (worn.length === 0) return {};
    const pack = worn[0]!;
    if (fits(current, true)) return { pack };
    const bare = lower.find((m) => fits(m, true));
    return bare !== undefined ? { pack, lower: bare.getName() } : {};
  }

  /**
   * The words for a way that will not take what is coming through it —
   * to the mover (`second`), or about it to somebody leading it (`third`:
   * *its canvas panniers won't go through*).
   */
  private clearanceWords(refusal: ClearanceRefusal, person: 'second' | 'third' = 'second'): string {
    const { facts } = refusal;
    const way = this.direction;
    const name = (t: Stuff): string => t.presentationPhrase().definite();
    const keyword = (t: Stuff): string =>
      (MixinApi.isPerceptible(t) ? t.getPrimaryKeyword() : undefined) ?? t.presentationPhrase().bare();
    switch (refusal.reason) {
      case 'too-big-for-way': {
        if (person === 'third') {
          const mover = facts.mover;
          if (facts.dismount === true) return `${GrammarApi.cap(GrammarApi.pronoun(mover))} won't fit through there with a rider.`;
          if (facts.pack !== undefined && mover instanceof Creature) {
            const bulk = mover.wornBulk();
            const same = [...bulk.things, ...bulk.hung].filter(
              (t) => t.presentationPhrase().bare() === facts.pack!.presentationPhrase().bare(),
            );
            const bare = facts.pack.presentationPhrase().bare();
            const what = same.length > 1 ? GrammarApi.pluralize(facts.pack, bare) : bare;
            const it = same.length > 1 ? 'them' : 'it';
            return `${GrammarApi.possessive(mover)} ${what} won't go through — take ${it} off first.`;
          }
          return `${GrammarApi.cap(GrammarApi.pronoun(mover))} won't fit through there.`;
        }
        if (facts.dismount === true) return `You won't fit through there mounted; you'd have to dismount.`;
        if (facts.mover instanceof Creature) {
          if (facts.pack !== undefined) {
            const own = `your ${facts.pack.presentationPhrase().bare()}`;
            // A hung thing comes off its host; a worn one is removed.
            const pair = MixinApi.isContainable(facts.pack) ? facts.pack.getPlacement() : null;
            const off = pair !== null
              ? `get ${keyword(facts.pack)} from ${keyword(pair.host)}`
              : `remove ${keyword(facts.pack)}`;
            const then = facts.lower !== undefined ? `, then \`${facts.lower} ${way}\`` : '';
            const how = facts.lower !== undefined ? `You'd have to ${facts.lower}, and ${own}` : GrammarApi.cap(own);
            return `${how} won't go through — \`${off}\`${then}.`;
          }
          if (facts.lower !== undefined) return `You'd have to ${facts.lower} — \`${facts.lower} ${way}\`.`;
          return `You won't fit through there.`;
        }
        return `${GrammarApi.cap(name(facts.mover))} won't fit through there.`;
      }
      case 'held-too-big':
        return `${GrammarApi.cap(name(facts.thing!))} won't go through — it's too big for the way.`;
      case 'wont-turn': {
        const len = facts.lengthM !== undefined ? ` — ${Math.round(facts.lengthM * 10) / 10} m of it` : '';
        return `${GrammarApi.cap(name(facts.thing ?? facts.mover))} is too long to get round the turn${len}.`;
      }
      case 'cart-too-big':
        return `${GrammarApi.cap(name(facts.thing!))} won't fit through there.`;
      default: {
        const unworded: never = refusal.reason;
        throw new Error(`Exit.clearanceWords: no words for ${String(unworded)}`);
      }
    }
  }

  /**
   * ⭐ **A way across open ground** — a track, a road (the `track` kind). An
   * ordinary way joins two ADJACENT cells of its zone through their shared
   * face; a track runs on along its direction over cells nobody has
   * authored, to a place that lies that way (the long walk to a remote
   * claim, the lane up the valley). It has no face, so no boundary can
   * hang in it. See `Location.edgeRefusal`.
   */
  protected _spansGround = false;

  public spansOpenGround(): boolean {
    return this._spansGround;
  }
  public setSpansGround(value: boolean): void {
    this._spansGround = value === true;
  }

  /**
   * ⭐⭐ **Is this the kind of way that sometimes is not there?**
   *
   * A ford that floods, a causeway the tide covers. ⚠ This does NOT
   * say the way is closed right now — `isBlocked()` says that, and a
   * conditional exit refreshes it at the traverse, which is where a
   * river belongs. This says the way is *the kind that closes*, which
   * is a fact about the kind and therefore authorable on the kind row.
   *
   * ⭐ It lives on the base `Exit`, not on the transport pack's
   * `FordExit`, for two reasons: the projection and the Cartographer
   * both read it through the base shape, and **a second conditional
   * class — a tidal causeway — then needs no kernel edit**. Every exit
   * can answer *am I the kind that closes*; the honest answer for
   * almost all of them is no.
   *
   * What reads it: the `location_graph` projection (stamping
   * `StoredEdge.conditional`), so a route plan can carry *this way
   * crosses the ford; it is not always passable* as a stated
   * assumption; and `CartographerMixin.recordTraversal`, so your own
   * map remembers that you saw a ford.
   */
  /*
   * ⚠ Underscored, where `VehicularMixin.travelMode` deliberately is
   * not, and the asymmetry is a real distinction rather than taste.
   * A vehicle ROW is applied by FIELD NAME (the `TemplateApplier`
   * matches `travelMode:` to `setTravelMode`), so an underscored key
   * would read to `lint:instanceable` as a key the applier discards
   * silently. An exit is never built that way: `_applyExitSpec` binds
   * an `ExitInstruction` through `bind(opts)`, so the row key and the
   * field name never have to agree — which is why `_edgeMinutes` and
   * `_destination` carry the prefix too.
   */
  protected _conditional: boolean = false;

  public isConditional(): boolean {
    return this._conditional;
  }
  public setConditional(value: boolean): void {
    this._conditional = value;
  }

  /**
   * Game minutes for one baseline (unloaded, walk-mode) traverse of
   * this edge; `null` → the `transport.defaultEdgeMinutes` corridor
   * default. Read by the transport pack's Journey and by nothing in the
   * kernel — see the `edgeMinutes` option's note.
   */
  protected _edgeMinutes: number | null = null;

  public getEdgeMinutes(): number | null {
    return this._edgeMinutes;
  }
  public setEdgeMinutes(value: number | null): void {
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      throw new TypeError(
        'Exit.setEdgeMinutes: expected a non-negative number or null, ' +
          `got ${String(value)}`
      );
    }
    this._edgeMinutes = value;
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
      // ⭐ …and anywhere you can walk you can stoop or crawl (size and
      // carrying D20): how a body passes an opening is a ground mode too.
      return GROUND_FAMILY.includes(modeName);
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
    this._conditional = opts.conditional ?? false;
    this.setEdgeMinutes(opts.edgeMinutes ?? null);
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
    this._applyBinding(opts);
  }

  /**
   * The binding itself, ungated. ⚠ `rebind` cannot simply call `bind`:
   * the gate reads the CALLER, and a `this.bind(...)` from inside the
   * exit makes the exit its own caller — which is never a party to the
   * edge, so the room's legitimate rebind was refused. One body, two
   * gated doors.
   */
  private _applyBinding(opts: ExitOptions): void {
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
    if (opts.opening !== undefined) this.setOpening(opts.opening);
    if (opts.turn !== undefined) this.setTurn(opts.turn);
    if (opts.edgeMinutes !== undefined) {
      this.setEdgeMinutes(opts.edgeMinutes);
    }
  }

  /**
   * ⭐ Re-bind an ALREADY-bound exit to a new edge.
   *
   * The one seam {@link bind}'s "throws if already bound" rule needs:
   * an exit whose source or destination MOVES WITH ITS HOST. A vessel's
   * `in`/`out` pair is the case — the cart is a room, the room goes
   * somewhere else, and the same two exits now join a different pair of
   * places. Every other exit is minted for one edge and stays on it.
   *
   * ⚠ Not a general mutator. It resets the edge fields and binds again,
   * under the same participant gate: only a room party to the NEW edge
   * may call it, which is what stops an exit being re-pointed by
   * anything that merely holds a reference to it.
   */
  @CallSecurity(ByPartyRoom)
  @Final
  @Unshadowable
  public rebind(opts: ExitOptions): void {
    this.source = null as unknown as Stuff & Container;
    this.direction = '';
    this._destination = null;
    this._destinationPath = null;
    this._applyBinding(opts);
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
  /**
   * ⭐ Does a map record this way (river D38 d)? A way that is worked out
   * against a moving frame — the water within hail of you, a ship lying
   * alongside — is not a fact about the place it leaves, and a map that
   * wrote it down would be telling its owner something that stopped being
   * true when the water moved on. *Maps never name a ship, or a patch.*
   * @hook Override on a way that comes and goes with a frame. Default
   *   `true`.
   */
  public isMapped(): boolean {
    return true;
  }

  /**
   * ⭐ Does this way go into the water — what a bare `swim` beside a water
   * takes (river D8)? By default: its far side, when it is loaded, is a
   * water place.
   * @hook Override on a way worked out against moving water, whose far
   *   side is not known until it is taken.
   */
  /**
   * ⭐ A way flooded at both ends is a swim, whatever it was authored as
   *. A sunk ship's companionway is a dry
   * stair by its row, and under the sea it is neither walkable (over your
   * head) nor — before this — swimmable, so the diver could reach her deck
   * and nothing below it. The place is the water (swim.yaml): a water
   * mode passes a way when the mover is in water over their head AND its
   * far side is too. Never a way out of the water — a basin's wall stays
   * a climb, because the quay above it is dry.
   */
  protected async floodedFor(mover: Stuff & Containable, modeName: string): Promise<boolean> {
    if (LocomotionApi.modeOf(modeName)?.getMedium() !== 'water') return false;
    const here = mover.getContainer();
    if (here === null || !MixinApi.isWaterPlace(here) || here.stateNow() !== 'swimming') return false;
    let far: Stuff | null = this.peekDestination();
    if (far === null) {
      try {
        far = await this.resolveDestination();
      } catch {
        return false;
      }
    }
    return MixinApi.isWaterPlace(far) && far.stateNow() === 'swimming';
  }

  public leadsIntoWater(): boolean {
    const dest = this.peekDestination();
    return dest !== null && MixinApi.isWaterPlace(dest) && dest.depthNow() > 0;
  }

  /**
   * ⭐ The far side if it is loaded now, or `null` — never a throw. The
   * destination this exit HOLDS when it holds one (a boat: one of however
   * many its row has made, so its path is not a name); otherwise the place
   * its path names. Use this, not `findByTemplatePath(getDestinationTemplatePath())`,
   * which throws on a row with several instances (the river drive's three
   * canoes).
   */
  public peekDestination(): Stuff | null {
    if (this._destination) return this._destination;
    const path = this._destinationPath;
    if (!path) return null;
    try {
      return StuffApi.findByTemplatePath<Stuff>(path) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * @hook The structure lying ALONGSIDE this exit now — a ship at a quay
   * (paint build). Three answers, and they mean different things:
   * `undefined` — an ordinary exit: its far side is the place its path
   * names (the default); a structure — the one lying alongside now;
   * `null` — this exit's far side is a ship (`BerthExit`, the way aboard
   * her) and she is not lying here now. A landing never falls back to the
   * authored path of an exit that answers `null`: a ship that has sailed
   * lands nowhere. Derived from what is standing — never authored.
   */
  public alongsideNow(): Structure | null | undefined {
    return undefined;
  }

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
   *   - Its boundary's slot for this side self-heals (a weak ref), so the
   *     boundary needs no call back.
   */
  public onDestruct(): void {
    if (this.inverse) {
      this.inverse.setInverse(undefined);
      this.inverse = undefined;
    }
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
   * choreography, and nothing material ever traverses. Default `false`.
   *
   * ⚠ ONE job: *I handle this crossing myself.* It is not a place to
   * read state or refuse — it runs after the gate has decided; reading
   * and refusing are {@link canTraverse}'s.
   *
   * @hook Invoked by `Mobile.traverse` after the gate and the mover's
   *   `beforeTraverse`, BEFORE destination resolution, the source and
   *   destination vetoes and the departure announcement. Return `true`
   *   when this exit has fully handled the traversal; `false` to continue
   *   the ordinary move. **Override** — the base is a constant `false`.
   */
  public async applyTraversal(
    _mover: Stuff & Containable
  ): Promise<boolean> {
    return false;
  }

  /**
   * @hook ⭐ Does this way wire its own way back (underwater drive, run
   * 32)? The topology verifier checks an exit by looking its destination
   * PATH up and asking that place for the way back — right for an
   * authored room, wrong for a way whose far side is computed per
   * instance from a shared row (every column's `dark` band is the same
   * row): the lookup finds SOME band of that row, its way back is not
   * ours, and the verifier blocks a good way. A way whose warren wires
   * both ends says so here and is never verified by path.
   */
  public wiresItsOwnInverse(): boolean {
    return false;
  }

  /**
   * @hook ⭐ How long crossing this way takes `mover`, in REAL seconds
   * (underwater review). An ordinary way is a step, `0`. A way whose
   * LENGTH is the cost — a swim down through the water — says it here, and
   * the movement verbs hold the mover's hands that long and cross at the
   * end, so no verb that takes this way skips the time.
   */
  public async crossingRealS(mover: Stuff): Promise<number> {
    void mover;
    return 0;
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
   *
   * @hook ⭐ ASYNC, so an exit whose passability depends on something
   *   that moves reads it HERE, at the moment of asking: a ford reads the
   *   river, a pass its snow, an ice crossing the sheet against this
   *   mover's mass, the wardrobe whose circle it opens onto. One hook,
   *   one question — *may this mover pass, now?* (A separate
   *   `prepareTraversal` step existed while this was sync; it is gone.)
   *   Readers with no mover in hand ask {@link isBlocked}, which stays
   *   sync and is the exit's last-known summary. **Override** and
   *   `await super.canTraverse(...)` for the ordinary gates.
   */
  public async canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): Promise<TraversalGuard> {
    if (this.blocked) {
      return {
        ok: false,
        gate: 'blocked',
        reason: 'The way is blocked.',
      };
    }
    // ⭐ The two far-side gates run BEFORE the lock gate, so a wall
    // reads as a wall rather than as a locked door — and they follow
    // the lock gate's own rule: never resolve the destination. One
    // reads a transient flag, the other a sync parcel read.
    if (this._unbuilt) {
      return {
        ok: false,
        gate: 'unbuilt',
        reason: 'Nothing lies that way yet.',
      };
    }
    const farPath = this._destinationPath;
    if (farPath && !ParcelApi.isPathPublished(farPath)) {
      return {
        ok: false,
        gate: 'unpublished',
        reason: `${GrammarApi.cap(this.farSideName())} is not open.`,
      };
    }
    // Lock gate runs BEFORE the shut gate so a locked door reports
    // "locked" not "closed". Reads entirely off the boundary (already in
    // hand) — the destination is never resolved, so a locked gate pointing
    // at an unbuilt/dangling destination path is safe to veto.
    // ⭐⭐ **The bolt refuses, the key excuses.** A locked door admits
    // whoever presents a key that fits its keyway — or stands on its free
    // side (`Door.freeFrom`) — so a key-holder never has to `unlock` to get
    // through. ⚠ An empty keyway opens for nobody, so a row authoring
    // `locked: true` and no keyway is sealed against the whole world (the
    // university gate). The boundary is ONE object for both sides, so this
    // gate reads the same from either (boundary build, 2026-11).
    const boundary = this.getBoundary();
    if (boundary) {
      const name = GrammarApi.cap(boundary.getPresentation());
      if (
        MixinApi.isLockable(boundary) &&
        boundary.isLocked() &&
        !boundary.opensFor(mover)
      ) {
        return { ok: false, gate: 'locked', reason: `${name} is locked.` };
      }
      // ⭐ Nothing crosses that its movement channel refuses: a shut door
      // (unless it swings shut behind you, `Door.closesBehind`), and a
      // window, open or shut — *the west window is not a way through.*
      if (!(boundary.transmissivityInto('movement', this) > 0)) {
        return {
          ok: false,
          gate: 'door',
          reason: boundary.isOpen() || !boundary.passesBodiesWhenOpen()
            ? `${name} is not a way through.`
            : `${name} is closed.`,
        };
      }
    }
    if (mode != null && !this.allowsMode(mode) && !(await this.floodedFor(mover, mode))) {
      // ⭐ Name the way that works (found by the underwater browser walk:
      // the card's `up` out of the river sends `go up`, which said only
      // "You can't walk that way" beside steps you have to climb).
      const ways = [...new Set(this.media.map((m) => EXIT_MEDIUM_VERB[m]).filter(Boolean))];
      return {
        ok: false,
        gate: 'exitMode',
        mode,
        reason: ways.length > 0
          ? `You can't ${mode} that way — you'll have to ${ways.join(' or ')}.`
          : `You can't ${mode} that way.`,
      };
    }
    // ⭐ The way's size against what comes through it (size and carrying
    // D21): after the media, before the haulage. Words what would work.
    const tight = await this.clearanceRefusal(mover, mode);
    if (tight !== null) {
      return {
        ok: false,
        gate: 'clearance',
        ...(mode != null ? { mode } : {}),
        reason: this.clearanceWords(tight),
        context: {
          refusal: tight.reason,
          // The same refusal told ABOUT the mover — a leader hears it (D18).
          about: this.clearanceWords(tight, 'third'),
          ...(tight.facts.lower !== undefined ? { lower: tight.facts.lower } : {}),
        },
      };
    }
    return { ok: true };
  }
}
