/**
 * PerceptionApi — single dispatch surface for the perception
 * substrate.
 *
 * Methods:
 *   - `modalityByName(name)` — resolve a modality singleton by name.
 *   - `modalityByOrganKey(key)` — resolve a modality by BodyPlan organ key.
 *   - `signalAt(loc, modality)` — query the modality's signal at `loc`.
 *   - `perceiveAt(viewer, loc, modality)` — query the viewer's percept
 *     (signal + per-viewer narrowing).
 *   - `sensorium(viewer)` — the modalities the viewer can perceive
 *     (innate BodyPlan organs + augment contributions from active
 *     mixins via `MixinApi.getActiveMixins` + `_grantsModalities`).
 *   - `canPerceive(viewer, modality)` — predicate over `sensorium`.
 *
 * Modality singletons live at `/platform/idea/modalities/<name>` and
 * are bootstrap-cloned. The logic caches a `Map<name, Modality>` keyed
 * by the modality's own `name` to keep `modalityByName` O(1) on hot
 * paths (every `filterMessage`, every single-sense validator);
 * tag invalidation rides on `Events.StuffCreated`/`Events.StuffDestructed`
 * filtered to the prefix — the template-event HMR pattern.
 *
 * Thin, security-gated forwarding shell: the dispatch + caches live in
 * the hot-reloadable {@link PerceptionLogic} singleton at
 * `/platform/idea/api/perception`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/perception` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { SenseChannel } from '../lib/description/Perceiver';
import type { CompetenceBandName } from '../lib/advancement/CompetenceBand';
import type { ConcealmentLevel } from '../lib/concealment/ConcealmentLevel';
import type { Container } from '../lib/spatial/Container';
import type { Sensor } from '../lib/message/Sensor';
import type { LightBand } from '../lib/perception/Light';
import type Exit from '../lib/boundary/Exit';
import { Modality } from '../lib/perception/Modality';
import type { Percept } from '../lib/perception/Modality';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { PerceptionLogic } from '../platform/idea/api/PerceptionLogic';
import { fileURLToPath } from 'url';
import AromaCatalogue from '../platform/idea/AromaCatalogue';

/**
 * The depth of an active detection act (D5). `broad` = a whole-room
 * `search` scan; `narrow` = `search <container>` rummaging one scope
 * deeper (a depth bonus); `glance` = the cheap instantaneous close `look <thing>`.
 * Each maps to a dial-backed attention bonus in {@link PerceptionApi.resolveSearch}.
 */
export type SearchDepth = 'broad' | 'narrow' | 'glance';

/**
 * Which pool a reached thing belongs to (see {@link PerceptionApi.reach}) —
 * MQL's pools exactly: `self` the actor; `attached` what is on the person
 * without being carried (slot occupants, the apps an implant hosts);
 * `inventory` its whole carried tree, nearest first (hand · ready ·
 * packed — size-and-carrying D17); `here` the surface of the place
 * and of the vessel it sits in (the place itself, its ways and their
 * doors, the buildings whose landing it is, open ground seen across a
 * way); `peers` what stands there with it, fixtures included; `around`
 * the holders themselves — the place and the vessel the actor sits in —
 * which MQL's `here` names and which is NOT reach (a hand is in the room,
 * not on it: `canReach` skips this pool). MQL's `person` is
 * `self`+`attached`+`inventory`, `here` is `around`+`here`, `reachable`
 * is all six.
 */
export type ReachPool = 'self' | 'attached' | 'inventory' | 'around' | 'here' | 'peers';

/** One thing to hand, and the pool it is in. */
export interface Reached {
  stuff: Stuff;
  pool: ReachPool;
}

/**
 * ⭐ How near a carried thing is to the carrier's hand (size-and-carrying
 * D15/D17) — the binder's tie-break order, nearest first: `hand` · `ready`
 * (worn, hung from what is worn, in a pocket or an open worn container) ·
 * `packed` (inside a worn container in the `back` slot — *take it off
 * first*) · `elsewhere` (not on the carrier).
 */
export type ReachTier = 'hand' | 'ready' | 'packed' | 'elsewhere';

/**
 * How a viewer perceives a thing ({@link PerceptionApi.perceivedHow}):
 * `plain` by the ordinary rules, `builder` only through the builder lens
 * (D25 — a surface labels the line `[builder]`), `null` not at all.
 */
export type PerceivedHow = 'plain' | 'builder' | null;

/** The options of {@link PerceptionApi.reach}. */
export interface ReachOptions {
  /** A further holder to reach into (a command's location), beside the
   *  place and the vessel the actor sits in. */
  location?: Stuff | null;
  /** Compute only these pools (an `inventory` scope never walks the
   *  room). Default: all of them. */
  pools?: readonly ReachPool[];
}

/** One thing in view beyond the room (maritime R4). */
export interface HorizonSighting {
  /** The structure or craft. */
  stuff: Stuff;
  /** Degrees true from the viewer, when it can be said (at sea). */
  bearingDeg: number | null;
  /** Nautical miles, at sea; `null` ashore (the zones give no number). */
  rangeNm: number | null;
}

/**
 * Seeded traffic in view at sea — a passer-by the world IS, with no object
 * behind it, so it can be told in words and never looked at.
 */
export interface HorizonTraffic {
  name: string;
  bearingDeg: number;
  rangeNm: number;
}

/**
 * ⭐ What `viewer` may see of what `target` holds (maritime revision 2) —
 * ONE rule, read by `look` and `inventory` alike so they can never
 * disagree.
 */
export interface VisibleContents {
  /** On a person: what they wear (a worn slot, or an outward one — a pack on the back). */
  worn: Stuff[];
  /** On a person: what is in their hands. */
  held: Stuff[];
  /** Everything else — a container's contents, or (your own only) your pockets. */
  carried: Stuff[];
  /** A sealed container that is shut: nothing inside is in view. */
  shut: boolean;
}

/** What `viewer` can see from where they stand that is not in their room. */
export interface HorizonView {
  things: HorizonSighting[];
  traffic: HorizonTraffic[];
  /** `true` at sea (ranges computed), `false` ashore (zones named). */
  atSea: boolean;
}

/**
 * ⭐ What one deliberate look took in (controller-liquidity W8) — the
 * answer {@link PerceptionApi.observe} hands back after it has written
 * everything the look teaches. The controller words this; it never
 * observes again.
 *
 * A PLACE observed from inside fills `band` · `dark` · `indistinct` ·
 * `seen` · `exits` · `hints`; a THING fills `holds` · `found` · `hints`.
 * The fields the other case does not use are empty, never absent.
 */
export interface Observation {
  /** The light at the place as this viewer perceives it; `null` for a thing, or when vision cannot be read. */
  band: LightBand | null;
  /** The place is too dark to describe — its prose and its people are withheld. */
  dark: boolean;
  /** The place offers nothing to perceive at all (no name, no prose, no ways out, nothing seen); nothing was learned. */
  indistinct: boolean;
  /** What the viewer sees here — the place's listing, honest fog applied. Empty for a thing. */
  seen: Stuff[];
  /** The ways out this viewer may know about — the same list the map was told. */
  exits: readonly Exit[];
  /** What the viewer may see a thing holding, read BEFORE the close look; `null` for a non-container. */
  holds: VisibleContents | null;
  /** What the close look turned up — newly discovered, already recorded. */
  found: Stuff[];
  /** Concealed things the viewer nearly perceives — their tells may be told, never their names. */
  hints: Stuff[];
}

const LOGIC_PATH = '/platform/idea/api/perception';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/PerceptionLogic', import.meta.url)
);

/** Resolve the HMR-able PerceptionLogic singleton (sync). */
function logic(): PerceptionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'PerceptionLogic'
      ) as typeof PerceptionLogic | null) ?? PerceptionLogic)()
  );
}

export class PerceptionApi {
  /**
   * ⭐ The aromas — every smell a nose can read, a tree any pack extends
   * (the folder is the tree), served by {@link AromaCatalogue}: `ensure`
   * loads one with its parents, `resolve` reads one (starting its load if
   * cold), `settling` is what `smell`/`taste`/`analyze` wait out.
   */
  public static aromas(): AromaCatalogue {
    return StuffApi.singletonSync('/platform/idea/AromaCatalogue', () => new AromaCatalogue());
  }

  /**
   * Resolve a modality singleton by its canonical name. Throws when
   * not found — every consumer should know which modality it's
   * asking for; a missing modality is a config bug.
   *
   * Accepts the modality NAME (`'vision'`, `'sound'`, `'verbal-esp'`),
   * NOT the BodyPlan organ key (the sound modality's organ key is
   * `'hearing'`). To resolve from an organ key, use
   * `modalityByOrganKey`.
   */
  public static modalityByName(name: string): Modality {
    return logic().modalityByName(name);
  }

  /**
   * ⭐ Hold the light steady for a synchronous READ that describes many
   * things — the light at each place is then walked once, not once per
   * thing. Returns the release; call it in a `finally`:
   *
   * ```ts
   * const release = PerceptionApi.holdLightSteady();
   * try { … } finally { release(); }
   * ```
   *
   * MQL resolution and a live card's projection use it. Nothing that might
   * change a light (light, douse, carry a lamp) may run inside a hold. A
   * pair rather than a callback so the read runs in its CALLER's frame —
   * see `VisionModality.holdSteadyLight`.
   */
  public static holdLightSteady(): () => void {
    return logic().holdLightSteady();
  }

  /**
   * Resolve a modality singleton by its BodyPlan organ key. Used by
   * `sensorium` when walking `BodyPlan.sensoryPorts.modality` strings
   * (which are organ keys, not modality names). Returns null when no
   * modality declares this organ key — a reserved organ in the
   * BodyPlan with no v1 modality is silently dropped from the
   * sensorium rather than throwing.
   */
  public static modalityByOrganKey(organKey: string): Modality | null {
    return logic().modalityByOrganKey(organKey);
  }

    /**
   * Compute the viewer's percept at `loc` for `modality`. Walks
   * `signalAt` then `perceiveFor`. Returns null when the signal is
   * null OR the modality's `perceiveFor` returns null (the default).
   */
  public static perceiveAt(
    viewer: Stuff & Sensor,
    loc: Stuff & Container,
    modality: Modality,
  ): Percept | null {
    return logic().perceiveAt(viewer, loc, modality);
  }

  /**
   * Effective sensorium — the modalities the viewer can perceive.
   *
   * Walks (a) the viewer's BodyPlan `sensoryPorts.modality` strings
   * (innate organs) and resolves each to its modality singleton via
   * `modalityByOrganKey`. Returns the deduped union.
   *
   * Also includes modalities granted by mixins the viewer composes
   * (or has activated via augment-conferral), via
   * `MixinApi.getActiveMixins` + `_grantsModalities`.
   *
   * Returns `[]` defensively when:
   *   - the viewer isn't an Organism (test fixtures, debug consoles),
   *   - the Organism has no Species,
   *   - the Species has no BodyPlan,
   *   - the BodyPlan has no sensoryPorts (sessile).
   */
  public static sensorium(viewer: Stuff): readonly Modality[] {
    // The boundary read aperture (SecurityApi.projectAcross): message
    // delivery asks each RECIPIENT what it can perceive, and a channel
    // spans the boundary routinely — the sender is in the field and a
    // subscriber is inside a circle, or the reverse. The walk reads the
    // recipient's species/anatomy, so un-apertured it denies and takes
    // the whole `chat` down with it. Pure read; yields modalities.
    return SecurityApi.projectAcross(viewer, undefined, () =>
      logic().sensorium(viewer),
      PerceptionApi
    );
  }

  /**
   * Predicate: does the viewer's sensorium include `modality`?
   *
   * Used by the four physical `requires*` validators and by
   * `SensorMixin.filterMessage` for modality-attributed frame
   * reception gating.
   */
  public static canPerceive(viewer: Stuff, modality: Modality): boolean {
    return SecurityApi.projectAcross(viewer, undefined, () =>
      logic().canPerceive(viewer, modality),
      PerceptionApi
    );
  }

  /**
   * Lazy-load every modality singleton. The substrate is not
   * bootstrap-eager-loaded — modalities follow the same pattern
   * as locomotion modes / species clades: singletons load on
   * first verb-level demand via their validator's async
   * `preload` hook. After this call, sync `modalityByName` /
   * `modalityByOrganKey` lookups resolve.
   *
   * Tolerant of individual template misses (a fresh DB without
   * the seeds yet, an in-progress migration); each modality's
   * `StuffApi.singleton` failure logs and the cache simply omits
   * that modality. Sense / ESP validators surface their polite
   * refusal downstream when their modality is missing.
   */
  public static async preloadModalities(): Promise<void> {
    return logic().preloadModalities();
  }

  /**
   * Combined async preload for sense / ESP verb-level validators.
   * Warms anatomy (species + clades + body plan) AND modality
   * singletons in parallel — the two everything-must-be-live
   * concerns the validators' sync body assumes. Validators wire
   * this into their `preload` hook.
   */
  public static async preloadForSenseGate(actor: Stuff): Promise<void> {
    return logic().preloadForSenseGate(actor);
  }

  /**
   * ⭐⭐ **The perception moment of a deliberate look** (controller-
   * liquidity W8) — everything a `look` writes to the world, in one call,
   * so a player rewriting the verb copies none of it:
   *
   * 1. warms the viewer's senses ({@link preloadForSenseGate}) — the
   *    boot link that keeps a fresh world from describing every room at
   *    midnight;
   * 2. a THING settles what has been happening to it since it was last
   *    looked at (`Soilable.reconcileAiring` — cleanliness D21);
   * 3. a PLACE (the viewer's own container) reads its light, resolves
   *    what the viewer sees there, and — unless nothing at all is
   *    perceivable — tells the body (`Perceiver.learnSurroundings`, the
   *    `seen` channel; in the dark the ways out only, never the people);
   * 4. a PERSON looked at is tracked (`BeliefStore.learnIdentityOf`);
   * 5. a CONTAINER with contents gets the close look — the `glance`
   *    {@link resolveSearch}, which records each discovery — after what
   *    it visibly holds was read.
   *
   * ⚠ A glance records DISCOVERY, never a `searched` map claim: only a
   * deliberate going-over makes absences evidence (location-graph § 4).
   */
  public static observe(actor: Stuff, target: Stuff): Promise<Observation> {
    return logic().observe(actor, target);
  }

  /**
   * The concealment gate — does `target` resolve for `viewer` at all?
   *
   * `true` when the target isn't concealable or its concealment level is
   * `obvious` (backcompat — everything currently visible stays visible),
   * when the viewer has already **discovered** it (a sticky per-viewer
   * belief), or when the viewer's {@link effectivePerception} meets the
   * band's requirement. Pure, deterministic (no RNG), monotone in
   * `attention` up to the capacity-vs-concealment ceiling.
   *
   * `attention` defaults to the `concealment.passiveBaseline` dial (a
   * passive glance); active search / care↔speed modes pass a bonus in
   * later phases. This is the predicate the enumeration seams (look,
   * scope-walk, MQL `visible`, the wire projection, viewer-aware exits)
   * consult so a concealed-undiscovered thing is absent from a viewer's
   * world AND the wire.
   *
   * Reads the actor's `awareness` band from the snapshot warmed by
   * {@link preloadForSenseGate}; call it per-command so the sync gate has
   * a live band (a miss degrades to the floor band, not an error).
   */
  /**
   * Is `attacker` striking from concealment `defender` does not
   * perceive? Warms the defender's awareness, reads the gate, then
   * clears the attacker's hide — striking reveals you either way.
   *
   * Combat's initiation handshake asks this; the answer is a perception
   * fact and lives here.
   */
  public static resolveAmbush(
    attacker: Stuff,
    defender: Stuff,
  ): Promise<boolean> {
    return logic().resolveAmbush(attacker, defender);
  }

  /**
   * ⭐⭐⭐ **Everything `actor` can lay hands on right now, each tagged with
   * its pool — the one definition of reach** (controller-liquidity W20;
   * the owner: *"I just don't want two different algos for the same
   * thing"*). {@link canReach} and {@link reachableAmong} are membership
   * in it (every pool but `around` — what holds you is named, not
   * touched); MQL's `person` · `inventory` · `here` · `peers` · `reachable`
   * pools are filters over it. Ordered as MQL breaks ties: the person,
   * then the place's surface, then what stands there.
   *
   * ⭐ **One rule** (size-and-carrying D17): the person's whole carried
   * tree — hands and what is worn, inside worn containers all the way down,
   * shut or packed, never another body — ordered nearest first (hand ·
   * ready · packed); the place's top level and one level into the open
   * things there. A thing behind a shut lid or in a pack on the back is IN
   * the list so a verb can bind it and SAY why it cannot be touched;
   * {@link canReach} is membership AND the object's own
   * `Containable.reachRefusal` (`enclosed-shut` · `packed`).
   *
   * Reach is not perception — nothing here is filtered by what the actor
   * perceives; a caller that needs both asks both.
   */
  public static reach(actor: Stuff, opts?: ReachOptions): Reached[] {
    return logic().reach(actor, opts);
  }

  /**
   * **Can the actor physically reach the target right now?**
   *
   * ⭐ The one definition of reach. It used to exist twice — once
   * hand-rolled inside the `canReach` validator, once again inside the
   * card-hold evaluator — and the two disagreed: the validator counted
   * doors attached to the location's exits, the hold did not. So a card
   * held `inReach` on a door released as `out-of-reach` while `open
   * north` on that same door still worked. Two hand-rolled definitions
   * of one world concept is one too many; verbs, cards and anything
   * later ask here.
   *
   * ⭐ It is membership in {@link reach} — the set MQL's `reachable`
   * pool is a view of (controller-liquidity W20). Until W20 it was a
   * second assembly of the same holders, fixtures, ways and doors, and
   * the two drifted (MQL offered a hidden way's door; this did not
   * count the place, the hosted apps or the buildings whose landing it
   * is). Now there is one list: what MQL's `reachable` resolves is
   * `canReach`-true but the room and vessel that hold you (the `around`
   * pool), and nothing else is (`reach.sameSet.test.ts`).
   *
   * ⚠ **Reach is not perception.** A thing can be reachable and
   * unperceived (dark room) or perceived and unreachable (across a
   * chasm). Callers that need both ask both.
   *
   * ⭐ One rule (size-and-carrying D17): a member of {@link reach} whose
   * own `Containable.reachRefusal` is `null` — so the apple in the shut box
   * you carry is named and bound, and refused here (*the box is shut*); a
   * thing in the pack on your back likewise (*take it off first*).
   *
   * @param opts.location a further holder beside the place and the vessel.
   */
  public static canReach(
    actor: Stuff,
    target: Stuff,
    opts?: { location?: Stuff | null },
  ): boolean {
    return logic().canReach(actor, target, opts);
  }

  /**
   * ⭐ `canReach` for a whole candidate list, in ONE walk and ONE gated
   * call. Use this in any loop — asking `canReach` per candidate is
   * quadratic (each call re-walks the room and one level into every
   * open container) and pays a call-security stack capture each time.
   *
   * `GetController` did exactly that, and a live drive found 96.5% of
   * the server's CPU inside it: `get produce` binds every item in an
   * open floor stock, so the per-candidate ask re-walked hundreds of
   * items hundreds of times.
   */
  public static reachableAmong(
    actor: Stuff,
    candidates: readonly Stuff[],
    opts?: { location?: Stuff | null },
  ): Stuff[] {
    return logic().reachableAmong(actor, candidates, opts);
  }

  /**
   * ⭐⭐ **Does `viewer` perceive `target`?** The rules, in order
   * (size-and-carrying D24): (0) the builder lens — inside an extent the
   * viewer holds with `lens on`, everything (never a player's body or what
   * is on one); (1) your own body and everything on it, at any depth;
   * (2) the holders: a shut container that light does not pass (Beer–Lambert
   * over its material, `e^(−α·t) < 0.3`) hides what is in it; another
   * body shows what is in its hands, its outermost layers, what hangs from
   * what it wears, an open uncovered pocket of an outer layer and the inside
   * of an open worn container — and what this viewer FOUND on it by
   * searching while it still holds it (D24a); (3) concealment, discovery
   * and light.
   */
  public static perceives(
    viewer: Stuff,
    target: Stuff,
    attention?: number,
  ): boolean {
    return logic().perceives(viewer, target, attention);
  }

  /**
   * ⭐⭐⭐ **The one filter every surface applies** (size-and-carrying D23):
   * the members of `list` that `viewer` perceives ({@link perceives}), in
   * their order. MQL names the same things for everybody; the act that
   * binds, prompts over, counts or shows a list runs it through here first
   * (`lint:perceived-surfaces` holds every surface to it).
   *
   * `ordinal` — a head ordinal (`MqlMany.ordinal`, 1-based, negative from
   * the end) — picks the nth AFTER the filter, so `2nd knife` never counts
   * a knife the viewer does not perceive.
   */
  public static perceived(viewer: Stuff, list: readonly Stuff[], ordinal?: number): Stuff[] {
    return logic().perceived(viewer, list, ordinal);
  }

  /**
   * How `viewer` perceives `target` — `plain`, `builder` (only through the
   * builder lens: a surface labels the line `[builder]`, D25), or `null`.
   */
  public static perceivedHow(viewer: Stuff, target: Stuff): PerceivedHow {
    return logic().perceivedHow(viewer, target);
  }


  /**
   * The viewer's effective perception against `target`:
   * `capacity + attention + conditions`. `capacity` = the viewer's
   * `awareness` competence band rank × the `detection.capacityPerBand`
   * dial (floor 0 when the Discipline is unseeded or the band snapshot is
   * cold); `attention` = the passed value; `conditions` = the light-band
   * penalty from the existing per-viewer vision path (0 in adequate light
   * or when vision can't be evaluated). Pure + deterministic.
   */
  /**
   * **The perceive half of `read`** — can `viewer` make out the marks on
   * `target` at all?
   *
   * Reading decomposes into *perceive the marks* + *decode the script*
   * (magic-items D33), and this is the first half. It asks for the
   * `'fine'` detail band rather than mere visibility, because seeing
   * that a scroll is there and being able to read it are different
   * questions and the gap between them is the mechanic.
   *
   * Callers gate on this **only for marks that need light** — embossed
   * lettering bypasses it, which is why a tactile book reads in the
   * dark. Ask the marks (`Marked.requiresLightToRead`), then ask this.
   *
   * `modalities` asks about marks other than the target's text — a
   * DEVICE pressed or cut into it is relief, seen or felt (B106).
   */
  public static canMakeOutMarks(
    viewer: Stuff,
    target: Stuff,
    modalities?: readonly SenseChannel[],
  ): boolean {
    return logic().canMakeOutMarks(viewer, target, modalities);
  }

  public static effectivePerception(
    viewer: Stuff,
    target: Stuff,
    attention: number,
  ): number {
    return logic().effectivePerception(viewer, target, attention);
  }

  /**
   * Has `viewer` discovered `target`? Reads the `DISCOVERY` belief realm
   * (keyed on the target's `templatePath`). `false` when the viewer keeps
   * no belief store or the target has no durable templatePath.
   */
  public static hasDiscovered(viewer: Stuff, target: Stuff): boolean {
    return logic().hasDiscovered(viewer, target);
  }

  /**
   * Record that `viewer` has discovered `target` — writes the `DISCOVERY`
   * belief realm (a bare `found` flag), the sticky per-viewer sink for the
   * detection gate. No-op when the viewer keeps no belief store or the
   * target has no durable templatePath.
   */
  public static recordDiscovery(viewer: Stuff, target: Stuff): void {
    logic().recordDiscovery(viewer, target);
  }

  /**
   * Passive-hint candidates in `scope`: concealed-and-undiscovered things
   * the viewer *nearly* perceives — `requirement − effectivePerception ≤
   * concealment.hintCutoff`. The "the bookshelf sits oddly" nudge that
   * directs attention without revealing. (Phase 2 reads the cutoff dial
   * with a seeded fallback; Phase 3 wires the surfacing render.)
   */
  public static hintsFor(viewer: Stuff, scope: readonly Stuff[]): Stuff[] {
    return logic().hintsFor(viewer, scope);
  }

  /**
   * The care↔speed attention a locomotion mode brings to a trap-traverse
   * perceive check (D8) — the `concealment.passiveBaseline` plus a per-mode
   * dial modifier: `movement.attention.sneak` (positive — careful movement
   * notices more) for `sneak`, `movement.attention.run` (negative —
   * careless movement notices less) for `run`, and 0 for `walk` and every
   * other mode (so a walk crossing reads identically to the passive
   * baseline). `HazardMixin.resolveTraversal` passes this into
   * {@link perceives} so the mode changes the trap outcome — sneak avoids a
   * trap walk springs, run springs a trap walk avoids. Accepts a short mode
   * name (`'sneak'`) or a full templatePath.
   */
  public static modeAttention(mode: string): number {
    return logic().modeAttention(mode);
  }

  /**
   * The **hider's** derived concealment level (the actor-side, opposed
   * sibling of the detection engine). A pure, deterministic score of the
   * hider's `stealth` competence × available room cover × darkness ×
   * stillness (a low posture), mapped to a {@link ConcealmentLevel} band by
   * the `stealth.hide.band.*` thresholds. `stealthBand` is resolved by the
   * caller (`actor.competenceBandFor('stealth')`, awaited at command
   * time) and the result snapshotted into `HidingMixin.hiddenLevel`, so the
   * sync perceive gate reads only the stored band — never this. A score
   * below `band.subtle` returns `'obvious'` (the hide failed). See
   * docs/subsystems/stealth.md.
   */
  public static hideLevelFor(
    actor: Stuff,
    stealthBand: CompetenceBandName,
  ): ConcealmentLevel {
    return logic().hideLevelFor(actor, stealthBand);
  }

  /**
   * The **observer-side** motion-degrade (the mirror of
   * {@link modeAttention}) — how many concealment bands a move at `mode`
   * strips from a hiding mover: `sneak` holds (0), `walk` degrades one band,
   * `run` clears hiding (a large count). `Mobile.traverse` feeds this to
   * `HidingMixin.degradeHide` after a move, lighting the observer-side of
   * the care↔speed axis (a runner can't stay hidden). Dial-backed
   * (`movement.concealment.*`). See docs/subsystems/stealth.md.
   */
  public static motionExposure(mode: string): number {
    return logic().motionExposure(mode);
  }

  /**
   * The active-search resolver (D5) — walk the concealable candidates in
   * `scope`, and for each one the viewer's boosted effective perception now
   * clears, record the sticky per-viewer discovery and collect it. Returns
   * the newly-discovered things (already-found and still-hidden ones are
   * omitted). `depth` folds in the dial-backed attention bonus: `broad`
   * (whole-room `search`), `narrow` (`search <container>`, a depth bonus),
   * or `glance` (the instantaneous close `look <thing>`). Pure + deterministic given
   * the viewer's warmed `awareness` band — no RNG. The `search` / `look`
   * verbs (and `SearchActivity.onComplete`) call this.
   *
   * ⭐ `onBody` (size-and-carrying D24a) — the search went through a body
   * that cannot resist (`scope` is what is on it): every item its clothes
   * COVER from this viewer is found too, recorded with the body it was found
   * on (`BeliefPayload.foundOn`), so perception admits it only while that
   * body still holds it. An item that is also concealed must still clear
   * the awareness check.
   */
  public static resolveSearch(
    viewer: Stuff,
    scope: readonly Stuff[],
    depth: SearchDepth,
    onBody?: Stuff,
  ): Stuff[] {
    return logic().resolveSearch(viewer, scope, depth, onBody);
  }

  /**
   * ⭐ **The horizon** (maritime R4) — what `viewer` can see from where
   * they stand that is NOT in their room, recomputed now:
   *
   * - **at sea** (the viewer's root is a craft on an expanse): every craft
   *   and fixed structure in range from the viewer's own eye height (the
   *   lookout seat sees from the masthead), plus this hour's seeded
   *   traffic in words;
   * - **ashore**: the nearest `horizon` declaration (the room's, then the
   *   zone walk) names ZONES; a Structure standing in one is in view when
   *   the viewer's room is open to the sky and its height — plus the
   *   elevation between — clears the distance the zones' size in metres
   *   implies over `perception.horizonRatio`.
   *
   * ⛔ The viewer's own structure is never on its own horizon.
   *
   * ⭐ SYNCHRONOUS — it is the MQL `horizon` seed's pool, and the resolver
   * cannot wait. It reads warm state only: the resident structures and
   * craft (structures are booted and never culled), the resident zones'
   * fields, the compiled sea, and the cached sky. Nothing to call first.
   */
  public static horizonFor(viewer: Stuff): HorizonView {
    return logic().horizonFor(viewer);
  }

  /**
   * ⭐ What `target` holds that `viewer` perceives, GROUPED — worn · held ·
   * carried (size-and-carrying D23: a grouping of an already-perceived
   * list; the person/pockets rule is {@link perceives}' rule 2 now, so
   * `look` and `inventory` cannot disagree with every other surface).
   * `shut` when a shut container shows the viewer nothing. Which slot is
   * which is read off what the slot ACCEPTS (a wearable, a wieldable) and
   * whether it has an outward face — never a list of slot names.
   */
  public static visibleContentsOf(viewer: Stuff, target: Stuff): VisibleContents {
    return logic().visibleContentsOf(viewer, target);
  }

  /**
   * Whether `target` is a PERSON other than `viewer` — an agent with
   * slots that is not the viewer. The predicate {@link visibleContentsOf}
   * reads, named once: what a look may not tell you about somebody else
   * (their pockets, their weight) is decided here and nowhere else.
   */
  public static isAnotherPerson(viewer: Stuff, target: Stuff): boolean {
    return logic().isAnotherPerson(viewer, target);
  }

  /**
   * Where something on the horizon lies, as a GLANCE gives it — one of
   * eight compass points and a rough range (*to the north-east, some 3
   * miles off*). `look horizon` and a kept watch both say it this way; a
   * bearing worth fixing by is `measure bearing`'s, never a glance's.
   */
  public static glance(bearingDeg: number, rangeNm: number): string {
    return logic().glance(bearingDeg, rangeNm);
  }

  /**
   * Drop the modality cache so the next access rebuilds with the
   * current singleton set. Test seam for suites that mutate the
   * modality registry; gated by `assertTestOnly` so production code
   * never reaches it.
   *
   * @internal
   */
  public static _resetModalityCacheForTest(): void {
    SecurityApi.assertTestOnly('_resetModalityCacheForTest');
    logic()._resetModalityCacheForTest();
  }
}

SecurityApi.decorateApiClass(PerceptionApi);
