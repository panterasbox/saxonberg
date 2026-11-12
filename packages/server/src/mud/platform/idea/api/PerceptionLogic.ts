// PerceptionLogic — the hot-reloadable logic singleton behind
// PerceptionApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { NavigationApi } from '../../../api/navigation';
import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Slotted } from '../../../lib/slot/Slotted';
import type { Attired } from '../../../lib/slot/Attired';
import type { Sensor } from '../../../lib/message/Sensor';
import type { Organism } from '../../../lib/species/Organism';
import type { Perception } from '../../../lib/perception/Perception';
import { Modality } from '../../../lib/perception/Modality';
import type { Percept } from '../../../lib/perception/Modality';
import { MixinApi } from '../../../api/mixin';
import type { SenseChannel } from '../../../lib/description/Perceiver';
import { StuffApi } from '../../../api/stuff';
import { SpeciesApi } from '../../../api/species';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { TemplatePathPrefixes, TemplatePaths } from '../../../lib/paths';
import { DISCOVERY } from '../../../lib/belief/BeliefStore';
import {
  ConcealmentLevels,
  type ConcealmentLevel,
} from '../../../lib/concealment/ConcealmentLevel';
import { Postures } from '../../../lib/slot/Postured';
import {
  CompetenceBand,
  type CompetenceBandName,
} from '../../../lib/advancement/CompetenceBand';
import {
  LIGHT_BANDS,
  LIGHT_BANDS_TOO_DARK_TO_DESCRIBE,
  type LightBand,
} from '../../../lib/perception/Light';
// Type-only — the vision singleton's class is resolved lazily off its
// registered clone (the RecognitionLogic `canSeeGate` idiom); a *static*
// value import of a specific modality would drag the whole modality
// subsystem into this module's eval.
import type { VisionModality } from '../modalities/VisionModality';
import type {
  PerceivedHow, ReachOptions, ReachPool, ReachTier, Reached, SearchDepth,
} from '../../../api/perception';
import { PlayerApi } from '../../../api/player';
import { SIZE_DEFAULTS } from '../../../lib/spatial/Dimensions';
import type {
  HorizonView, HorizonSighting, HorizonTraffic, Observation, VisibleContents,
} from '../../../api/perception';
import { WorldClockApi } from '../../../api/worldclock';
import type { SpatialZone } from '../../../lib/zone/SpatialZone';
import type Place from '../../../lib/stuff/Place';
import type Structure from '../../../lib/structure/Structure';
import type { Positioned } from '../../../lib/expanse/Positioned';
import type { Voyaging } from '../../../lib/expanse/Voyaging';
import { Expanse, type Contact } from '../../../lib/expanse/Expanse';
import { BiomeApi } from '../../../api/biome';
import { WeatherApi } from '../../../api/weather';

/** Template-path prefix shared by every modality singleton. */
const MODALITY_PREFIX = TemplatePathPrefixes.perceptionModalities;

/** Template path of the vision modality singleton (light conditions read). */
const VISION_PATH = `${MODALITY_PREFIX}vision`;

/**
 * **Channels the sensorium cannot speak to, so its silence is not a NO.**
 *
 * `sensoryPorts` models **organs** — each entry carries a `count` and a
 * `position`, because it describes eyes, ears, a nose. Touch is not an
 * organ; it is the integument. The schema has no way to say it, which is
 * why **no shipped body plan declares it** — biped has vision, hearing
 * and smell and stops.
 *
 * So absence here is not evidence of absence, and treating it as such
 * would have made every embossed text unreadable by everyone the moment
 * the perceive gate became symmetric. Organ-modelled channels are the
 * ones the sensorium may legitimately deny.
 *
 * ⚠ This is a placeholder for a real touch model, not a claim that one
 * exists. A numbed, gloved or burned character *should* fail to read
 * raised lettering, and that mechanic needs the integument modelled —
 * at which point this list shrinks to empty and the gate stops needing
 * an exception.
 */
const NON_ORGAN_CHANNELS: readonly SenseChannel[] = ['touch'];

/** The perception/awareness Discipline key (seeded as data in Phase 3). */
const AWARENESS_DISCIPLINE = 'awareness';

/** The light band at which conditions are neutral (0). Darker bands penalize. */
const NEUTRAL_LIGHT_INDEX = LIGHT_BANDS.indexOf('lit');

/**
 * Seeded-literal dial fallbacks (safe pre-warm / unit-test reads — the
 * harm / electricity / concealment dial idiom). Kept in sync with
 * the platform pack's `content/settings/`.
 */
const DEFAULT_CAPACITY_PER_BAND = 3;
const DEFAULT_PASSIVE_BASELINE = 0;
/** `concealment.hintCutoff` fallback (Phase 3). Kept in sync with the dial. */
const DEFAULT_HINT_CUTOFF = 4;
/** `concealment.searchBonus` fallback (Phase 3, broad-search attention). */
const DEFAULT_SEARCH_BONUS = 4;
/** `concealment.searchDepthBonus` fallback (Phase 3, narrow-search extra). */
const DEFAULT_SEARCH_DEPTH_BONUS = 3;
/** `concealment.examineBonus` fallback (Phase 3, the cheap instantaneous look). */
const DEFAULT_EXAMINE_BONUS = 2;
/** `movement.attention.sneak` fallback (Phase 5, careful → notices more). */
const DEFAULT_MOVEMENT_ATTENTION_SNEAK = 2;
/** `movement.attention.run` fallback (Phase 5, careless → notices less). */
const DEFAULT_MOVEMENT_ATTENTION_RUN = -2;
/** `stealth.hide.*` fallbacks (the hider's derived level — kept in sync
 * with the platform pack's `content/settings/`). */
const DEFAULT_HIDE_COMPETENCE_PER_BAND = 2;
const DEFAULT_HIDE_COVER_WEIGHT = 1;
const DEFAULT_HIDE_LIGHT_WEIGHT = 1;
const DEFAULT_HIDE_STILLNESS_BONUS = 1;
const DEFAULT_HIDE_BAND_CONSPICUOUS = -1;
const DEFAULT_HIDE_BAND_SUBTLE = 0;
const DEFAULT_HIDE_BAND_HIDDEN = 4;
const DEFAULT_HIDE_BAND_DEEP = 7;
const DEFAULT_HIDE_BAND_BURIED = 10;
/** Max room-cover objects folded into the hide score (bounds the term). */
const HIDE_COVER_CAP = 6;
/** `movement.concealment.*` fallbacks (observer-side motion-degrade — bands
 * of concealment a move at each mode strips from a hiding mover). */
const DEFAULT_MOVEMENT_CONCEALMENT_SNEAK = 0;
const DEFAULT_MOVEMENT_CONCEALMENT_WALK = 1;
const DEFAULT_MOVEMENT_CONCEALMENT_RUN = 99;

/**
 * Per-actor `awareness` competence-band snapshot, warmed by the async
 * `preloadForSenseGate(actor)` so the sync detection gate (`perceives` /
 * `effectivePerception`, called at the sync enumeration seams — look,
 * scope-walk, projection) reads a cached band with no `await`. Keyed by
 * `stuffId` (session-ephemeral, exactly the cache's lifetime — a per-
 * command preload re-warms it). A miss degrades to the floor band, so
 * Phase 2 is self-contained without Phase 3's `awareness` seed.
 *
 * Module-scope (not instance state): resets with the module on HMR
 * reload, the same invalidation point as the modality caches.
 */
const awarenessBandCache = new Map<string, CompetenceBandName>();

const PerceptionApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/perception#PerceptionApi'),
  SecurityPolicies.SelfOnly
);

/**
 * Lazily built `Map<modality-name, Modality>`. Built on first access,
 * dropped to `null` by the HMR invalidator. The keys are the modality
 * singletons' own `name` field (`'vision'`, `'smell'`, `'sound'`,
 * `'touch'`, `'taste'`, `'verbal-esp'`, `'emotive-esp'`).
 *
 * A separate `Map<organ-key, Modality>` exists because the sound
 * modality is named `'sound'` but its organ key is `'hearing'`.
 *
 * Module-scope (not instance state): the cache resets with the module on
 * HMR reload, which is exactly the invalidation point.
 */
let modalityByNameCache: Map<string, Modality> | null = null;
let modalityByOrganKeyCache: Map<string, Modality> | null = null;

/**
 * PerceptionLogic — the hot-reloadable logic singleton behind
 * {@link PerceptionApi}.
 *
 * Lives at `/platform/idea/api/perception` (a stateless `Stuff` singleton, no
 * backing `Template`); `PerceptionApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `onCreate` override); the modality
 * caches live at module scope. Guts-variant gate
 * (`AnyOf(FromModule, SelfOnly)`): `canPerceive` self-calls
 * `this.sensorium`, and `preloadForSenseGate` self-calls
 * `this.preloadModalities`. The sensorium-walk helpers and cache
 * loaders are module-private free functions (off-class, ungated,
 * un-callable from outside) and resolve modalities through the
 * module-private `resolveByName` / `resolveByOrganKey` free functions
 * rather than the gated methods, so the walk paths make no self-calls.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class PerceptionLogic extends ApiLogic {
  /** See {@link PerceptionApi.modalityByName}. */
  @CallSecurity(PerceptionApiCallers)
  public modalityByName(name: string): Modality {
    return resolveByName(name);
  }

  /** See {@link PerceptionApi.holdLightSteady}. */
  @CallSecurity(PerceptionApiCallers)
  public holdLightSteady(): () => void {
    let vision: VisionModality | null = null;
    try {
      vision = resolveByName('vision') as VisionModality;
    } catch {
      // No vision modality registered (pre-boot, a bare unit fixture):
      // nothing to remember.
    }
    if (vision === null || !vision.holdSteadyLight()) return () => {};
    const held = vision;
    return () => held.releaseSteadyLight();
  }

  /** See {@link PerceptionApi.modalityByOrganKey}. */
  @CallSecurity(PerceptionApiCallers)
  public modalityByOrganKey(organKey: string): Modality | null {
    return resolveByOrganKey(organKey);
  }

  /** See {@link PerceptionApi.perceiveAt}. */
  @CallSecurity(PerceptionApiCallers)
  public perceiveAt(
    viewer: Stuff & Sensor,
    loc: Stuff & Container,
    modality: Modality
  ): Percept | null {
    const signal = modality.signalAt(loc);
    if (signal === null) return null;
    return modality.perceiveFor(viewer, loc, signal);
  }

  /** See {@link PerceptionApi.sensorium}. */
  @CallSecurity(PerceptionApiCallers)
  public sensorium(viewer: Stuff): readonly Modality[] {
    const innate = walkInnateModalities(viewer);
    const augmented = walkAugmentedModalities(viewer);
    return dedupe([...innate, ...augmented]);
  }

  /** See {@link PerceptionApi.canPerceive}. */
  @CallSecurity(PerceptionApiCallers)
  public canPerceive(viewer: Stuff, modality: Modality): boolean {
    return this.sensorium(viewer).some((c) => c === modality);
  }

  /** See {@link PerceptionApi.preloadModalities}. */
  @CallSecurity(PerceptionApiCallers)
  public async preloadModalities(): Promise<void> {
    await Promise.all(
      MODALITY_NAMES.map((name) =>
        StuffApi.singleton(`${MODALITY_PREFIX}${name}`).catch(() => null)
      )
    );
    // Drop the lazy cache so the next sync lookup re-reads via
    // `findByPathGlob` and picks up the freshly-cloned singletons.
    invalidateModalityCache();
  }

  /** See {@link PerceptionApi.preloadForSenseGate}. */
  @CallSecurity(PerceptionApiCallers)
  public async preloadForSenseGate(actor: Stuff): Promise<void> {
    // Warm anatomy + modalities AND the actor's `awareness` band in
    // parallel, then snapshot the band so the sync detection gate reads it
    // without an await. `bandFor` returns the floor band when the
    // `awareness` Discipline is unseeded (Phase 3 seeds it), so this is
    // safe today; a throw degrades to the floor too.
    // ⭐ And the place's climate site + weather Locality (the climate
    // build): daylight is read at the room's LATITUDE and the floor's snow
    // from both, all on sync seams — an unresolved walk answers the
    // default site and no snow, so a first `look` at a snowfield read
    // bare earth (found by the climate drive).
    const place = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    const [, , band] = await Promise.all([
      SpeciesApi.preloadAnatomy(actor),
      this.preloadModalities(),
      MixinApi.isAdvancing(actor)
        ? actor.competenceBandFor(AWARENESS_DISCIPLINE).catch(
            () => CompetenceBand.FLOOR,
          )
        : Promise.resolve(CompetenceBand.FLOOR),
      place !== null && MixinApi.isAtmospheric(place)
        ? Promise.all([
            place.resolveClimateSite(),
            place.isWeatherLocalityResolved()
              ? Promise.resolve()
              : place.resolveWeatherLocality(),
          ])
        : Promise.resolve(),
      // ⭐ The competence digest (field population D10): a crop's read is
      // banded by the viewer's competence through a SYNC augmenter, so
      // the first look after login must find the digest folded. Folds
      // once; the ledger keeps it fresh after that.
      MixinApi.isAdvancing(actor)
        ? actor.warmCompetenceDigest().catch(() => undefined)
        : Promise.resolve(),
    ]);
    awarenessBandCache.set(actor.stuffId, band);
  }

  /** See {@link PerceptionApi.perceives}. */
  @CallSecurity(PerceptionApiCallers)
  /**
   * Is `attacker` striking from concealment `defender` does not perceive?
   *
   * Reads the attacker's hidden state FIRST — warming the defender's
   * `awareness` so the sync gate uses their real capacity — then clears
   * the attacker's hide, because striking reveals you, ambush or not.
   *
   * It lives HERE rather than in combat because it is a perception
   * fact, not combat physics — `check-combat-dynamics` says so, and it
   * is right. Combat asks the question; perception answers it.
   */
  public async resolveAmbush(attacker: Stuff, defender: Stuff): Promise<boolean> {
    if (!MixinApi.isHiding(attacker) || !attacker.isHiding()) return false;
    await this.preloadForSenseGate(defender);
    const unseen = !perceivesImpl(defender, attacker);
    attacker.breakHide();
    return unseen;
  }

  /** See {@link PerceptionApi.reach}. */
  @CallSecurity(PerceptionApiCallers)
  public reach(actor: Stuff, opts?: ReachOptions): Reached[] {
    return reachOf(actor, opts);
  }

  /** See {@link PerceptionApi.canReach}. */
  @CallSecurity(PerceptionApiCallers)
  public canReach(
    actor: Stuff,
    target: Stuff,
    opts?: { location?: Stuff | null },
  ): boolean {
    if (target.stuffId === actor.stuffId) return true;
    const member = reachOf(actor, opts).some(
      (r) => r.pool !== 'around' && r.stuff.stuffId === target.stuffId,
    );
    return member && !refusesReach(actor, target);
  }

  /**
   * ⭐⭐ **The same rule, once, for a whole candidate list.**
   *
   * `canReach` is a walk of everything to hand per call AND it is gated,
   * so a caller that asks it per candidate pays that walk N times and a
   * call-security stack capture N times. That is quadratic, and it is
   * not theoretical: `get produce` on a farm floor binds every produce
   * item in the open floor stock — hundreds — and `GetController` asked
   * `canReach` for each. A live drive found **96.5% of the whole
   * server's CPU inside `GetController.executeWholeSet`**, with a
   * trivial HTTP GET taking 17 seconds behind it.
   *
   * One walk, one gate, O(1) per candidate afterwards. The RULE is not
   * duplicated — both read {@link reachOf} and the object's refusal.
   */
  @CallSecurity(PerceptionApiCallers)
  public reachableAmong(
    actor: Stuff,
    candidates: readonly Stuff[],
    opts?: { location?: Stuff | null },
  ): Stuff[] {
    if (candidates.length === 0) return [];
    const ids = new Set<string>();
    for (const r of reachOf(actor, opts)) {
      if (r.pool !== 'around') ids.add(r.stuff.stuffId);
    }
    return candidates.filter((c) => ids.has(c.stuffId) && !refusesReach(actor, c));
  }

  /** See {@link PerceptionApi.perceived}. */
  @CallSecurity(PerceptionApiCallers)
  public perceived(viewer: Stuff, list: readonly Stuff[], ordinal?: number): Stuff[] {
    const seen = list.filter((s) => perceivesImpl(viewer, s));
    if (ordinal === undefined) return seen;
    const i = ordinal > 0 ? ordinal - 1 : seen.length + ordinal;
    return i >= 0 && i < seen.length ? [seen[i]!] : [];
  }

  /** See {@link PerceptionApi.perceivedHow}. */
  @CallSecurity(PerceptionApiCallers)
  public perceivedHow(viewer: Stuff, target: Stuff): PerceivedHow {
    if (perceivesImpl(viewer, target, undefined, false)) return 'plain';
    return lensAdmits(viewer, target) ? 'builder' : null;
  }

  @CallSecurity(PerceptionApiCallers)
  public perceives(viewer: Stuff, target: Stuff, attention?: number): boolean {
    return perceivesImpl(viewer, target, attention);
  }

  /** See {@link PerceptionApi.canMakeOutMarks}. */
  @CallSecurity(PerceptionApiCallers)
  public canMakeOutMarks(
    viewer: Stuff,
    target: Stuff,
    asked?: readonly SenseChannel[],
  ): boolean {
    // **The symmetric gate.** Perceiving marks succeeds iff the reader
    // has SOME sense that reaches them — reader's channels ∩ the marks'
    // modalities ≠ ∅ — and that channel is usable right now.
    //
    // The first cut asked only "are these vision-only? then check
    // light", which made the touch branch unconditional: embossed text
    // was readable by anyone, in the dark, with no sense of touch, and
    // the celebrated "a sightless reader is not excluded" fell out of a
    // gate being SKIPPED rather than from any model. Both directions
    // now run through one intersection.
    const modalities: readonly SenseChannel[] =
      asked ?? (MixinApi.isMarked(target) ? target.getMarkModalities() : ['vision']);
    if (modalities.length === 0) return false;
    if (!MixinApi.isSensor(viewer) || !MixinApi.isPerception(viewer)) {
      return true;
    }

    // An empty sensorium means *undeterminable*, not *senseless* — it is
    // the documented answer for non-Organisms, speciesless fixtures and
    // sessile hosts. Fail OPEN there, which is what this read did before.
    const senses = this.sensorium(viewer);
    const determinable = senses.length > 0;

    for (const channel of modalities) {
      if (
        determinable &&
        !NON_ORGAN_CHANNELS.includes(channel) &&
        !senses.some((m) => m.getName() === (channel as string))
      ) {
        continue; // the reader has no such sense
      }
      // Vision is the only channel with an environmental gate: ink needs
      // light. Touch reaches whatever the verb's `reachable` scope
      // already let the reader address.
      if (channel === 'vision' && !visionAdequateForMarks(viewer, target)) {
        continue;
      }
      return true; // one usable channel is enough
    }
    return false;
  }

  /** See {@link PerceptionApi.effectivePerception}. */
  @CallSecurity(PerceptionApiCallers)
  public effectivePerception(
    viewer: Stuff,
    target: Stuff,
    attention: number,
  ): number {
    return effectivePerceptionImpl(viewer, target, attention);
  }

  /** See {@link PerceptionApi.hasDiscovered}. */
  @CallSecurity(PerceptionApiCallers)
  public hasDiscovered(viewer: Stuff, target: Stuff): boolean {
    return hasDiscoveredImpl(viewer, target);
  }

  /** See {@link PerceptionApi.recordDiscovery}. */
  @CallSecurity(PerceptionApiCallers)
  public recordDiscovery(viewer: Stuff, target: Stuff): void {
    recordDiscoveryImpl(viewer, target);
  }

  /** See {@link PerceptionApi.hintsFor}. */
  @CallSecurity(PerceptionApiCallers)
  public hintsFor(viewer: Stuff, scope: readonly Stuff[]): Stuff[] {
    return hintsForImpl(viewer, scope);
  }

  /** See {@link PerceptionApi.modeAttention}. */
  @CallSecurity(PerceptionApiCallers)
  public modeAttention(mode: string): number {
    return modeAttentionImpl(mode);
  }

  /** See {@link PerceptionApi.motionExposure}. */
  @CallSecurity(PerceptionApiCallers)
  public motionExposure(mode: string): number {
    return motionExposureImpl(mode);
  }

  /** See {@link PerceptionApi.hideLevelFor}. */
  @CallSecurity(PerceptionApiCallers)
  public hideLevelFor(
    actor: Stuff,
    stealthBand: CompetenceBandName,
  ): ConcealmentLevel {
    return hideLevelForImpl(actor, stealthBand);
  }

  /** See {@link PerceptionApi.horizonFor}. */
  @CallSecurity(PerceptionApiCallers)
  public horizonFor(viewer: Stuff): HorizonView {
    // ⭐ Scoped, never registry-wide (maritime review, 2026-10-13): the
    // craft you stand on is the STRUCTURE CATALOGUE's answer (which
    // building is this room in), what you can see at sea is THAT craft's
    // EXPANSE's (its landmarks and registered craft), and ashore a named
    // zone's structures are the catalogue's again. Nothing asks the
    // registry for every craft in the world.
    const atSea = horizonAtSea(viewer);
    if (atSea !== null) return atSea;
    // ⭐ A bank on a river sees the river AND what its horizon names (the
    // tower over the roofs): the line's answer adds to the declaration,
    // never replaces it (the maritime drive found the bank blind).
    const ashore = horizonAshore(viewer);
    const river = horizonOnRiver(viewer);
    if (river === null) return ashore;
    const seen = new Set(river.things.map((t) => t.stuff));
    return {
      things: [...river.things, ...ashore.things.filter((t) => !seen.has(t.stuff))],
      traffic: [...river.traffic, ...ashore.traffic],
      atSea: false,
    };
  }

  /** See {@link PerceptionApi.visibleContentsOf}. */
  @CallSecurity(PerceptionApiCallers)
  public visibleContentsOf(viewer: Stuff, target: Stuff): VisibleContents {
    return visibleContentsImpl(viewer, target);
  }

  /** See {@link PerceptionApi.isAnotherPerson}. */
  @CallSecurity(PerceptionApiCallers)
  public isAnotherPerson(viewer: Stuff, target: Stuff): boolean {
    return isAnotherPersonImpl(viewer, target);
  }

  /** See {@link PerceptionApi.glance}. */
  @CallSecurity(PerceptionApiCallers)
  public glance(bearingDeg: number, rangeNm: number): string {
    const i = Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8;
    const point = COMPASS_POINTS[i]!;
    if (rangeNm < 1) return `${point}, close by`;
    if (rangeNm < 2) return `${point}, about a mile off`;
    return `${point}, some ${Math.round(rangeNm)} miles off`;
  }


  /** See {@link PerceptionApi.observe}. */
  @CallSecurity(PerceptionApiCallers)
  public async observe(actor: Stuff, target: Stuff): Promise<Observation> {
    await this.preloadForSenseGate(actor);
    const place = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    if (place !== null && target === place) return observePlace(actor, place);
    return observeThing(actor, target);
  }

  /** See {@link PerceptionApi.resolveSearch}. */
  @CallSecurity(PerceptionApiCallers)
  public resolveSearch(
    viewer: Stuff,
    scope: readonly Stuff[],
    depth: SearchDepth,
    onBody?: Stuff,
  ): Stuff[] {
    return resolveSearchImpl(viewer, scope, depth, onBody);
  }

  /** See {@link PerceptionApi._resetModalityCacheForTest}. */
  @CallSecurity(PerceptionApiCallers)
  public _resetModalityCacheForTest(): void {
    invalidateModalityCache();
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private, off-class, not part of the public surface).
// ---------------------------------------------------------------------------

/**
 * Modality name list — single source of truth for the
 * `preloadModalities` walk. Stays in step with the seed YAMLs
 * under the platform pack's `content/platform/idea/modalities/`.
 */
const MODALITY_NAMES: readonly string[] = [
  'vision',
  'smell',
  'sound',
  'touch',
  'taste',
  'verbal-esp',
  'emotive-esp',
];

function loadCaches(): void {
  if (modalityByNameCache !== null && modalityByOrganKeyCache !== null) return;
  // Walk every live Stuff whose templatePath starts with the prefix.
  // `findByPathGlob` returns clones; the bootstrap manifest's
  // `templatePathPrefix` entry guarantees each subclass is cloned at
  // boot. Callers in pre-bootstrap test environments must register
  // singletons explicitly (see `__tests__/test-helpers.ts`).
  const stuffs = StuffApi.findByPathGlob<Modality>(`${MODALITY_PREFIX}*`);
  const byName = new Map<string, Modality>();
  const byOrgan = new Map<string, Modality>();
  for (const stuff of stuffs) {
    if (!(stuff instanceof Modality)) continue;
    const name = stuff.getName();
    const organ = stuff.getModality();
    if (name) byName.set(name, stuff);
    if (organ) byOrgan.set(organ, stuff);
  }
  modalityByNameCache = byName;
  modalityByOrganKeyCache = byOrgan;
}

/**
 * Drop the modality caches. Wired to the HMR event lifecycle (in the
 * facade) so reloading a modality subclass takes effect on next access.
 */
function invalidateModalityCache(): void {
  modalityByNameCache = null;
  modalityByOrganKeyCache = null;
}

/** Cache-backed name resolver (throws on miss). */
function resolveByName(name: string): Modality {
  loadCaches();
  const found = modalityByNameCache!.get(name);
  if (!found) {
    throw new Error(
      `PerceptionApi.modalityByName: no modality '${name}' loaded; ` +
        `check the bootstrap manifest's '${MODALITY_PREFIX}' entry`
    );
  }
  return found;
}

/** Cache-backed organ-key resolver (null on miss). */
function resolveByOrganKey(organKey: string): Modality | null {
  loadCaches();
  return modalityByOrganKeyCache!.get(organKey) ?? null;
}

/**
 * Walk the viewer's BodyPlan and resolve each sensoryPort organ key
 * to its modality singleton. Skips organ keys with no live modality
 * (reserved future-species organs that haven't shipped a modality
 * singleton).
 */
/** The medium a viewer's senses are in: the water under its surface, else air. */
function mediumOf(viewer: Stuff): string {
  try {
    const read = BiomeApi.mediumFor(viewer);
    return read.immersed && !read.atSurface ? read.tag : 'air';
  } catch {
    return 'air';
  }
}

function walkInnateModalities(viewer: Stuff): Modality[] {
  if (!MixinApi.isOrganism(viewer)) return [];
  const organism = viewer as Stuff & Organism;
  const species = organism.getSpecies();
  if (!species) return [];
  const bodyPlan = species.getBodyPlan();
  if (!bodyPlan) return [];
  // ⭐ An organ works in its own media (underwater D21): under the water a
  // nose would breathe it in, eyes and ears go on working.
  const organKeys = bodyPlan.getModalitiesIn(mediumOf(viewer));
  const out: Modality[] = [];
  for (const key of organKeys) {
    const modality = resolveByOrganKey(key);
    if (modality) out.push(modality);
  }
  return out;
}

/**
 * Walk the viewer's active mixin set and collect every
 * `_grantsModalities` declaration via `MixinApi.getActiveMixins` —
 * augment-conferred mixins flow in transparently via the active-mixin
 * set.
 */
function walkAugmentedModalities(viewer: Stuff): Modality[] {
  // Viewers with no active augment-conferring mixins (e.g. test
  // fixtures, or hosts before any augment is installed) get an
  // empty grant set.
  const grants = new Set<string>();
  const addGrants = (
    mixins: ReturnType<typeof MixinApi.getActiveMixins>,
  ): void => {
    for (const mixin of mixins) {
      if (mixin._grantsModalities) {
        for (const name of mixin._grantsModalities) grants.add(name);
      }
    }
  };
  addGrants(MixinApi.getActiveMixins(viewer));
  // Hosted-update modality grants (the single generalization point —
  // the augment-contribution walks include a host's hosted updates
  // alongside its slot occupants). No update grants a modality in v1
  // (comms grants none; attunement does), so this is substrate-only —
  // it proves the symmetry without changing behavior today. `isAether`
  // narrows the viewer to an `AetherHost`, so no cast is needed.
  if (MixinApi.isAether(viewer)) {
    for (const u of viewer.getHostedUpdates()) {
      addGrants(MixinApi.getActiveMixins(u));
    }
  }
  const out: Modality[] = [];
  for (const name of grants) {
    try {
      out.push(resolveByName(name));
    } catch {
      // Unknown modality name — augment declares a modality not in
      // the v1 substrate; silently drop.
    }
  }
  return out;
}

function dedupe(modalities: readonly Modality[]): readonly Modality[] {
  const seen = new Set<Modality>();
  const out: Modality[] = [];
  for (const m of modalities) {
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Detection — the concealment gate (D2/D3). Pure + deterministic (no RNG):
//   perceives = discovered-in-belief OR effectivePerception >= requirement
//   effectivePerception = capacity + attention + conditions
// The band read (`capacity`) is warmed synchronously by
// `preloadForSenseGate`; everything else is a pure read of durable state,
// so a single input tuple always yields the same answer, monotone in
// attention up to the capacity-vs-concealment ceiling.
// ---------------------------------------------------------------------------

/** Numeric AppSetting read with a seeded-literal fallback. */
function dialNumber(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/** The passive attention baseline (no active search / mode bonus). */
function passiveBaseline(): number {
  return dialNumber(
    AppSettingKeys.concealmentPassiveBaseline,
    DEFAULT_PASSIVE_BASELINE,
  );
}

/**
 * The care↔speed attention a locomotion mode brings to a trap-traverse
 * perceive check (D8): the passive baseline plus a per-mode dial modifier.
 * `sneak` adds a positive dial (careful → notices more), `run` a negative
 * one (careless → notices less), and `walk` (and every other mode) is a 0
 * modifier — so a walk crossing reads byte-identically to the passive
 * baseline. `HazardMixin.resolveTraversal` passes this into `perceives`.
 * Accepts a short mode name (`'sneak'`) or a full templatePath.
 */
function modeAttentionImpl(mode: string): number {
  return passiveBaseline() + modeModifier(mode);
}

/**
 * The observer-side motion-degrade (the mirror of {@link modeAttentionImpl}):
 * how many concealment bands a move at the given mode strips from a hiding
 * mover — `sneak` holds (0), `walk` degrades one band, `run` clears hiding
 * (a large count). `Mobile.traverse` passes this to `HidingMixin.degradeHide`
 * after a move. Accepts a short mode name or a full templatePath.
 */
function motionExposureImpl(mode: string): number {
  const name = mode.startsWith('/')
    ? mode.slice(mode.lastIndexOf('/') + 1)
    : mode;
  switch (name) {
    case 'sneak':
      return dialNumber(
        AppSettingKeys.movementConcealmentSneak,
        DEFAULT_MOVEMENT_CONCEALMENT_SNEAK,
      );
    case 'run':
      return dialNumber(
        AppSettingKeys.movementConcealmentRun,
        DEFAULT_MOVEMENT_CONCEALMENT_RUN,
      );
    default:
      return dialNumber(
        AppSettingKeys.movementConcealmentWalk,
        DEFAULT_MOVEMENT_CONCEALMENT_WALK,
      );
  }
}

/** The per-mode attention delta (0 for walk / any non-care↔speed mode). */
function modeModifier(mode: string): number {
  const name = mode.startsWith('/') ? mode.slice(mode.lastIndexOf('/') + 1) : mode;
  switch (name) {
    case 'sneak':
      return dialNumber(
        AppSettingKeys.movementAttentionSneak,
        DEFAULT_MOVEMENT_ATTENTION_SNEAK,
      );
    case 'run':
      return dialNumber(
        AppSettingKeys.movementAttentionRun,
        DEFAULT_MOVEMENT_ATTENTION_RUN,
      );
    default:
      return 0;
  }
}

/**
 * The stillness bonus a hider earns from a low, held posture (crouched /
 * sitting / lying) — you hide better when you aren't standing. `0` for a
 * standing actor or one with no posture surface.
 */
function stillnessBonusFor(actor: Stuff): number {
  if (!MixinApi.isPosed(actor)) return 0;
  if (actor.getPosture() === Postures.Stand) return 0;
  return dialNumber(
    AppSettingKeys.stealthHideStillnessBonus,
    DEFAULT_HIDE_STILLNESS_BONUS,
  );
}

/**
 * The available room cover — the count of non-creature objects in the
 * hider's environment they could duck behind (each mover/creature is not
 * cover), capped at {@link HIDE_COVER_CAP}. `0` outside a container.
 */
function coverScoreOf(actor: Stuff): number {
  if (!MixinApi.isContainable(actor)) return 0;
  const env = actor.getContainer();
  if (!env || !MixinApi.isContainer(env)) return 0;
  let n = 0;
  for (const c of env.getContents()) {
    if (c === actor) continue;
    if (MixinApi.isMobile(c)) continue; // creatures/movers aren't cover
    n += 1;
    if (n >= HIDE_COVER_CAP) break;
  }
  return n;
}

/**
 * See {@link PerceptionApi.hideLevelFor}. The pure, deterministic hide-level
 * derivation (the opposed sibling of the detection side): a weighted score
 * of competence × cover × darkness × stillness, mapped to a
 * {@link ConcealmentLevel} band by the `stealth.hide.band.*` thresholds. The
 * `stealthBand` is resolved by the caller (the actor's `competenceBandFor(
 * 'stealth')`, awaited at command time) and snapshotted into `hiddenLevel`,
 * so the sync perceive gate never reaches here. A score below `band.subtle`
 * fails to conceal (`obvious`).
 */
function hideLevelForImpl(
  actor: Stuff,
  stealthBand: CompetenceBandName,
): ConcealmentLevel {
  // Darkness = how many bands below neutral light the room is (the negated
  // observer-side light penalty, reusing the same vision read).
  const darkness = Math.max(0, -lightConditionsFor(actor, actor));
  const score =
    CompetenceBand.rank(stealthBand) *
      dialNumber(
        AppSettingKeys.stealthHideCompetencePerBand,
        DEFAULT_HIDE_COMPETENCE_PER_BAND,
      ) +
    coverScoreOf(actor) *
      dialNumber(
        AppSettingKeys.stealthHideCoverWeight,
        DEFAULT_HIDE_COVER_WEIGHT,
      ) +
    darkness *
      dialNumber(
        AppSettingKeys.stealthHideLightWeight,
        DEFAULT_HIDE_LIGHT_WEIGHT,
      ) +
    stillnessBonusFor(actor) +
    // ⭐⭐ What you are WEARING, and this is where the covering read
    // becomes load-bearing rather than decorative. `concealmentOffset`
    // is negative for a dark close weave and positive for a bright open
    // one, so a person in grey hides better than the same person in a
    // hi-vis vest — through the score, not a special case.
    (MixinApi.isAttired(actor) ? -actor.concealmentOffset() : 0);

  const buried = dialNumber(
    AppSettingKeys.stealthHideBandBuried,
    DEFAULT_HIDE_BAND_BURIED,
  );
  const deep = dialNumber(
    AppSettingKeys.stealthHideBandDeep,
    DEFAULT_HIDE_BAND_DEEP,
  );
  const hidden = dialNumber(
    AppSettingKeys.stealthHideBandHidden,
    DEFAULT_HIDE_BAND_HIDDEN,
  );
  const subtle = dialNumber(
    AppSettingKeys.stealthHideBandSubtle,
    DEFAULT_HIDE_BAND_SUBTLE,
  );
  if (score >= buried) return 'buried';
  if (score >= deep) return 'deep';
  if (score >= hidden) return 'hidden';
  if (score >= subtle) return 'subtle';
  // ⭐ The FLOOR is no longer flat. A failed hide used to bottom out at
  // `obvious` however loudly the actor was dressed; below the
  // conspicuous threshold it now bottoms out one band WORSE, which is
  // the whole point of extending the scale downward: a person in a
  // hi-vis vest who tries to hide is easier to see than one in grey,
  // not merely equally visible.
  const conspicuous = dialNumber(
    AppSettingKeys.stealthHideBandConspicuous,
    DEFAULT_HIDE_BAND_CONSPICUOUS,
  );
  return score < conspicuous ? 'conspicuous' : 'obvious';
}

/**
 * The viewer's perception `capacity` = `awareness` band rank × the per-band
 * dial. Reads the warmed snapshot; a cache miss (never preloaded) or an
 * unseeded `awareness` Discipline both read as the floor band (rank 0 →
 * capacity 0) — the Phase-2-self-contained degrade.
 */
function capacityOf(viewer: Stuff): number {
  const band = awarenessBandCache.get(viewer.stuffId) ?? CompetenceBand.FLOOR;
  return CompetenceBand.rank(band) * dialNumber(
    AppSettingKeys.detectionCapacityPerBand,
    DEFAULT_CAPACITY_PER_BAND,
  );
}

/**
 * The light `conditions` term — darkness makes a concealed thing harder to
 * notice. Reuses the existing per-viewer vision path
 * (`VisionModality.perceivedBand`, which threads the viewer's Shadow seam,
 * so night-vision / blindness enter here — no second light read). Neutral
 * (0) at `lit` and brighter; a negative penalty in dimmer bands. Degrades
 * to 0 (no effect) whenever the viewer can't run vision queries or the
 * vision singleton isn't loaded (unit fixtures), so detection stays
 * deterministic and testable without a light substrate.
 */
function lightConditionsFor(viewer: Stuff, target: Stuff): number {
  if (!MixinApi.isSensor(viewer) || !MixinApi.isPerception(viewer)) return 0;
  if (!MixinApi.isContainable(target)) return 0;
  const env = target.getContainer();
  if (!env || !MixinApi.isContainer(env)) return 0;
  const vision = StuffApi.findByTemplatePath(VISION_PATH);
  if (!vision) return 0;
  let idx: number;
  try {
    const band = (vision as VisionModality).perceivedBand(
      viewer as Stuff & Sensor & Perception,
      env as Stuff & Container,
    );
    idx = LIGHT_BANDS.indexOf(band);
  } catch {
    return 0;
  }
  if (idx < 0) return 0;
  return Math.min(0, idx - NEUTRAL_LIGHT_INDEX);
}

/**
 * **The perceive half of `read`** (magic-items D33).
 *
 * `read = perceive(the marks) + decode(the script)`, and this is the
 * first half. It is deliberately NOT a general visibility check: making
 * out lettering needs the `'fine'` detail band, which is a much higher
 * bar than seeing that a scroll is there at all. That gap is the whole
 * point — you can see the scroll in the gloom and be unable to read it.
 *
 * **Embossed marks bypass this entirely**, and the caller is what knows
 * that (`Marked.requiresLightToRead`). Reading raised lettering by hand
 * in the pitch dark is a real advantage worth paying for, not a
 * courtesy — and it is the same mechanic that keeps a character without
 * functioning sight inside the spellbook economy.
 *
 * Degrades to `true` when the vision singleton isn't loaded (unit
 * fixtures), so reading stays testable without a light substrate.
 */
function visionAdequateForMarks(viewer: Stuff, target: Stuff): boolean {
  if (!MixinApi.isSensor(viewer) || !MixinApi.isPerception(viewer)) return true;
  const vision = StuffApi.findByTemplatePath(VISION_PATH);
  if (!vision) return true;
  try {
    return (vision as VisionModality).canSee(
      viewer as Stuff & Sensor & Perception,
      target,
      'fine',
    );
  } catch {
    return true;
  }
}

/** See {@link PerceptionApi.effectivePerception}. */
function effectivePerceptionImpl(
  viewer: Stuff,
  target: Stuff,
  attention: number,
): number {
  return capacityOf(viewer) + attention + lightConditionsFor(viewer, target);
}

/**
 * The durable `DISCOVERY`-realm key a target is recorded under. A
 * concealable's own `getDiscoveryKey()` (default = `templatePath`; an `Exit`
 * overrides to a synthetic `source#exit:dir` handle so a secret door is
 * discoverable despite carrying no templatePath). Falls back to the raw
 * `templatePath` for a non-concealable (never reached by the gate, but keeps
 * the read total).
 */
function discoveryReferentOf(target: Stuff): string | null {
  if (MixinApi.isConcealable(target)) return target.getDiscoveryKey() ?? null;
  return target.getIdentityPath() ?? null;
}

/** See {@link PerceptionApi.hasDiscovered}. */
function hasDiscoveredImpl(viewer: Stuff, target: Stuff): boolean {
  if (!MixinApi.isBeliefStore(viewer)) return false;
  const referent = discoveryReferentOf(target);
  if (!referent) return false;
  return !!viewer.recall(DISCOVERY, referent)?.payload.found;
}

/**
 * See {@link PerceptionApi.recordDiscovery}. `foundOn` — the body it was
 * found on by a search through it (D24a), so the find holds only while
 * that body holds it.
 */
function recordDiscoveryImpl(viewer: Stuff, target: Stuff, foundOn?: string): void {
  if (!MixinApi.isBeliefStore(viewer)) return;
  const referent = discoveryReferentOf(target);
  if (!referent) return;
  viewer.know(DISCOVERY, referent, foundOn === undefined ? { found: true } : { found: true, foundOn });
}

/**
 * ⭐⭐ See {@link PerceptionApi.perceives} — the rules, in order
 * (size-and-carrying D24): (0) the builder lens; (1) your own body and
 * everything on it; (2) the holders; (3) concealment, discovery and light.
 * `lens: false` asks the plain rules only ({@link PerceptionApi.perceivedHow}).
 */
function perceivesImpl(
  viewer: Stuff,
  target: Stuff,
  attention?: number,
  lens = true,
): boolean {
  if (lens && lensAdmits(viewer, target)) return true; // rule 0
  if (onBodyOf(viewer, target)) return true; // rule 1
  if (!holdersAdmit(viewer, target)) return false; // rule 2
  return concealmentAdmits(viewer, target, attention); // rule 3
}

/** Rule 3 — the concealment/discovery/light gate (the shipped rule). */
function concealmentAdmits(viewer: Stuff, target: Stuff, attention?: number): boolean {
  // A non-concealable or `obvious` thing is always present.
  if (!MixinApi.isConcealable(target)) return true;
  const level = target.getConcealment();
  if (!ConcealmentLevels.isConcealed(level)) return true;
  // Once found, always seen (the per-viewer discovery belief sticks).
  if (hasDiscoveredImpl(viewer, target)) return true;
  const att = attention ?? passiveBaseline();
  return (
    effectivePerceptionImpl(viewer, target, att) >=
    ConcealmentLevels.requirementFor(level)
  );
}

/**
 * The containers above `s`, innermost first (the enclosing scope — a
 * placement member that encloses, else the container), stopping at a Place.
 */
function upward(s: Stuff): Stuff[] {
  const out: Stuff[] = [];
  let cur: Stuff = s;
  for (let i = 0; i < 32; i++) {
    if (!MixinApi.isContainable(cur)) break;
    const up = cur.getEnclosingScope();
    if (up === null) break;
    out.push(up);
    if (up.isPlace()) break;
    cur = up;
  }
  return out;
}

/** Rule 1: the viewer itself, or anything on the viewer's body at any depth. */
function onBodyOf(viewer: Stuff, target: Stuff): boolean {
  if (target.stuffId === viewer.stuffId) return true;
  let cur: Stuff | null = target;
  for (let i = 0; cur !== null && i < 32; i++) {
    cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
    if (cur !== null && cur.stuffId === viewer.stuffId) return true;
  }
  return false;
}

/**
 * ⭐ Rule 0 — the builder lens (D25): `lens on` memoized the extents the
 * viewer holds; a thing whose enclosing place (an exit: its source) lies
 * under one is perceived. ⛔ Never a player's body or what is on one — the
 * lens is for content, not people.
 */
function lensAdmits(viewer: Stuff, target: Stuff): boolean {
  if (!MixinApi.isAuthor(viewer)) return false;
  const extents = viewer.lensExtents();
  if (extents === null || extents.length === 0) return false;
  for (const s of [target, ...upward(target)]) {
    if (s.stuffId !== viewer.stuffId && PlayerApi.isAvatarStuff(s)) return false;
  }
  let place: Stuff | null = null;
  if (target.isExit()) place = target.getSource();
  else if (target.isPlace()) place = target;
  else if (MixinApi.isContainable(target)) place = target.getEnclosingPlace();
  const path = place?.getTemplatePath();
  if (!path) return false;
  return extents.some((e) => path === e || path.startsWith(e.endsWith('/') ? e : `${e}/`));
}

/** The light a shut container's walls must pass to be seen through (D24). */
const SEE_THROUGH_T = 0.3;
/** A shell's thickness when nothing says better — a jar's wall, metres. */
const DEFAULT_SHELL_M = 0.003;

/**
 * ⭐ Can light pass a holder's shell (D24)? Beer–Lambert over its material:
 * `e^(−α·t) ≥` {@link SEE_THROUGH_T}, `t` the wall its authored box implies
 * (`(1 − INTERIOR_FRACTION)/2` of its least side) or a jar's 3 mm. A
 * material with no `lightAbsorption` is opaque — glass, mesh and ice are
 * not.
 */
function seeThrough(holder: Stuff): boolean {
  if (!MixinApi.isTangible(holder)) return false;
  const material = holder.getMaterial();
  if (material === null || !MixinApi.hasOptics(material)) return false;
  const alpha = material.getLightAbsorption()?.rawValue();
  if (typeof alpha !== 'number' || alpha < 0) return false;
  const box = holder.hasAuthoredSize() ? holder.getDimensions() : null;
  const least = box ? Math.min(box.width, box.depth, box.height) : 0;
  const t = least > 0 ? (least * (1 - SIZE_DEFAULTS.INTERIOR_FRACTION)) / 2 : DEFAULT_SHELL_M;
  return Math.exp(-alpha * t) >= SEE_THROUGH_T;
}

/**
 * ⭐⭐ Rule 2 — the holders (D24). Walk up from the target through what
 * encloses it, to the viewer's place: a SHUT container light does not pass
 * hides it; a placement member that is covered or fastened (an inner
 * pocket, a buttoned one) hides it; ANOTHER BODY shows only what
 * {@link bodyShows} says. What holds the viewer is the viewer's side of
 * its lid (in a shut wardrobe, the coat beside you is in view).
 */
function holdersAdmit(viewer: Stuff, target: Stuff): boolean {
  const around = new Set<string>([viewer.stuffId]);
  let up: Stuff | null = viewer;
  for (let i = 0; up !== null && i < 32; i++) {
    up = MixinApi.isContainable(up) ? up.getContainer() : null;
    if (up !== null) around.add(up.stuffId);
  }
  let cur: Stuff = target;
  for (let i = 0; i < 32; i++) {
    if (!MixinApi.isContainable(cur)) return true;
    const scope = cur.getEnclosingScope();
    if (scope === null || around.has(scope.stuffId) || scope.isPlace()) return true;
    if (isAnotherBody(viewer, scope)) {
      if (!bodyShows(viewer, scope, cur)) return false;
    } else {
      // ⭐ A covered region (an inner pocket) or one that fastens (a
      // buttoned breast pocket) hides what sits in it (D24/D26).
      const placement = cur.getPlacement();
      if (placement !== null && (placement.host as unknown as Stuff).stuffId === scope.stuffId) {
        const entry = placement.host.getPlacementEntry(placement.name);
        if (entry?.covered === true || entry?.closes === true) {
          // ⭐ …unless this viewer FOUND it there by searching the body that
          // wears the pocket, and that body still holds it (D24a). The
          // pocket is the thing's scope, not the body, so the body's own
          // rule never asked (the drive, step 15: a search turned up the
          // letter, and nothing showed it).
          const wearer = MixinApi.isContainable(scope) ? scope.getContainer() : null;
          if (!(wearer !== null && isAnotherBody(viewer, wearer) && foundOnBy(viewer, cur, wearer))) return false;
        }
      }
      if (MixinApi.isSealable(scope) && !scope.isOpen() && !seeThrough(scope)) return false;
    }
    cur = scope;
  }
  return true;
}

/**
 * ⭐ Another BODY — what wears things and is not the viewer: a person, an
 * animal in tack, a corpse (D24 / D24a: a dead man's pockets are as covered
 * as a living one's). Reads `Attired` — a rack is slotted and wears nothing.
 */
function isAnotherBody(viewer: Stuff, s: Stuff): s is Stuff & Slotted & Attired {
  return s.stuffId !== viewer.stuffId && MixinApi.isAttired(s);
}

/**
 * ⭐ What another body shows of a thing directly on it (D24 rule 2): what is
 * in its hands; a worn layer nothing covers (`Attired.coveringAt`); what
 * hangs `from` something it wears (everyone sees the holster); and what
 * this viewer FOUND on it by searching, while it is still there (D24a).
 * Never its loose pockets or what is inside the body (an implant's slot
 * accepts neither a wearable nor a wieldable).
 */
function bodyShows(viewer: Stuff, body: Stuff & Slotted & Attired, thing: Stuff): boolean {
  if (foundOnBy(viewer, thing, body)) return true;
  const hands = MixinApi.isCarrying(body) ? body.handSlots() : null;
  for (const [slot, occupants] of body.getAllOccupants()) {
    if (![...occupants].some((o) => o.stuffId === thing.stuffId)) continue;
    const spec = body.getSlotSpec(slot);
    const accepts = spec?.accepts ?? '';
    if (hands?.includes(slot) || accepts.includes('Wieldable')) return true;
    if (!accepts.includes('Wearable') && !spec?.userFacingDetail) continue;
    return uncovered(body, thing);
  }
  if (MixinApi.isContainable(thing)) {
    const placement = thing.getPlacement();
    if (placement !== null && !placement.host.placementOf(placement.name).getEncloses()) {
      const host = placement.host as unknown as Stuff;
      for (const occupants of body.getAllOccupants().values()) {
        if ([...occupants].some((o) => o.stuffId === host.stuffId)) return true;
      }
    }
  }
  return false;
}

/** Is a worn layer outermost wherever it covers (or covers nothing)? */
function uncovered(body: Stuff & Slotted & Attired, worn: Stuff): boolean {
  let appears = false;
  for (const part of body.leafParts()) {
    const stack = body.coveringAt(part);
    const at = stack.findIndex((x) => x.stuffId === worn.stuffId);
    if (at === 0) return true;
    if (at > 0) appears = true;
  }
  return !appears;
}

/** Did this viewer find `thing` on `body` by searching it (D24a)? */
function foundOnBy(viewer: Stuff, thing: Stuff, body: Stuff): boolean {
  if (!MixinApi.isBeliefStore(viewer)) return false;
  const referent = discoveryReferentOf(thing);
  const holder = body.getIdentityPath();
  if (!referent || !holder) return false;
  return viewer.recall(DISCOVERY, referent)?.payload.foundOn === holder;
}

/**
 * ⭐ D15/D17's tier read — `Carrying.tierOf` (size and carrying W4): the
 * carrier answers how near its own things are. A holder that does not
 * carry (a cart, a chest) has nothing in a hand: what is in it is ready.
 */
function tierOfImpl(carrier: Stuff, thing: Stuff): ReachTier {
  if (MixinApi.isCarrying(carrier)) return carrier.tierOf(thing);
  let up: Stuff | null = MixinApi.isContainable(thing) ? thing.getContainer() : null;
  for (let i = 0; up !== null && i < 32; i++) {
    if (up.stuffId === carrier.stuffId) return 'ready';
    up = MixinApi.isContainable(up) ? up.getContainer() : null;
  }
  return 'elsewhere';
}

/** The order the binder ties on, nearest first. */
const TIER_RANK: Record<ReachTier, number> = { hand: 0, ready: 1, packed: 2, elsewhere: 3 };

/** Would the object refuse a hand right now (`Containable.reachRefusal`)? */
function refusesReach(actor: Stuff, target: Stuff): boolean {
  return MixinApi.isContainable(target) && target.reachRefusal(actor) !== null;
}

/**
 * The active-attention bonus a search of the given depth folds in on top of
 * the passive baseline (D5). `broad` = a whole-room scan (`searchBonus`);
 * `narrow` = rummaging one container/detail deeper (`+ searchDepthBonus`);
 * `glance` = the cheap instantaneous close `look` (`examineBonus`, weaker). All
 * dial-backed with seeded-literal fallbacks.
 */
function activeBonusFor(depth: SearchDepth): number {
  switch (depth) {
    case 'narrow':
      return (
        dialNumber(AppSettingKeys.concealmentSearchBonus, DEFAULT_SEARCH_BONUS) +
        dialNumber(
          AppSettingKeys.concealmentSearchDepthBonus,
          DEFAULT_SEARCH_DEPTH_BONUS,
        )
      );
    case 'glance':
      return dialNumber(
        AppSettingKeys.concealmentExamineBonus,
        DEFAULT_EXAMINE_BONUS,
      );
    case 'broad':
    default:
      return dialNumber(
        AppSettingKeys.concealmentSearchBonus,
        DEFAULT_SEARCH_BONUS,
      );
  }
}

/** See {@link PerceptionApi.resolveSearch}. */
function resolveSearchImpl(
  viewer: Stuff,
  scope: readonly Stuff[],
  depth: SearchDepth,
  onBody?: Stuff,
): Stuff[] {
  const attention = passiveBaseline() + activeBonusFor(depth);
  const holder = onBody?.getIdentityPath() ?? null;
  const found: Stuff[] = [];
  for (const cand of scope) {
    const level = MixinApi.isConcealable(cand) ? cand.getConcealment() : null;
    const concealed = level !== null && ConcealmentLevels.isConcealed(level);
    // ⭐ D24a: what the body's clothes cover from this viewer — the one
    // reason rule 2 refuses a thing directly on a body.
    const covered =
      onBody !== undefined &&
      holder !== null &&
      isAnotherBody(viewer, onBody) &&
      !bodyShows(viewer, onBody, cand);
    if (!concealed && !covered) continue;
    if (concealed && level !== null) {
      const known = hasDiscoveredImpl(viewer, cand);
      if (known && !covered) continue; // already found
      const clears =
        known || effectivePerceptionImpl(viewer, cand, attention) >= ConcealmentLevels.requirementFor(level);
      if (!clears) continue;
    }
    recordDiscoveryImpl(viewer, cand, covered ? holder ?? undefined : undefined);
    found.push(cand);
  }
  return found;
}

/**
 * See {@link PerceptionApi.visibleContentsOf} — a GROUPING of an
 * already-perceived list (size-and-carrying D23): what `target` holds,
 * through {@link PerceptionApi.perceived}'s rule, sorted by how it is held.
 * The person/pockets rule is `perceives`' rule 2 now.
 */
function visibleContentsImpl(viewer: Stuff, target: Stuff): VisibleContents {
  const out: VisibleContents = { worn: [], held: [], carried: [], shut: false };
  if (!MixinApi.isContainer(target)) return out;
  const slotted = new Map<string, 'held' | 'worn' | 'inside'>();
  if (MixinApi.isSlotted(target)) {
    // Held = a hand slot (size and carrying D12, the flip).
    const hands = MixinApi.isCarrying(target) ? target.handSlots() : null;
    for (const [slot, occupants] of target.getAllOccupants()) {
      const spec = target.getSlotSpec(slot);
      const accepts = spec?.accepts ?? '';
      const kind = hands?.includes(slot) || (hands === null && accepts.includes('Wieldable'))
        ? 'held'
        : accepts.includes('Wearable') || spec?.userFacingDetail
          ? 'worn'
          : 'inside';
      // ⭐ Once, however many slots it covers (a diving dress claims torso
      // and legs and was listed as worn twice).
      for (const o of occupants) if (!slotted.has(o.stuffId)) slotted.set(o.stuffId, kind);
    }
  }
  const all = target.getContents();
  const seen = all.filter((c) => perceivesImpl(viewer, c));
  for (const c of seen) {
    const kind = slotted.get(c.stuffId);
    if (kind === 'held') out.held.push(c);
    else if (kind === 'worn') out.worn.push(c);
    else out.carried.push(c);
  }
  // A shut thing that shows this viewer nothing says so.
  if (seen.length === 0 && MixinApi.isSealable(target) && !target.isOpen()) out.shut = true;
  return out;
}

/** See {@link PerceptionApi.isAnotherPerson}. */
function isAnotherPersonImpl(viewer: Stuff, target: Stuff): boolean {
  // A PERSON is an agent with slots; a rack is slotted and wears
  // nothing, so it lists like any container.
  return viewer.stuffId !== target.stuffId && target.isAgent() && MixinApi.isSlotted(target);
}

/* ───────────────────────── the look (controller-liquidity W8) ───────────────────────── */

/**
 * The room's listing — its visible contents, never the room's structure
 * (an adornment routes through its host), never the viewer. The same
 * query `sense` reads. ⚠ It NAMES (the same for everyone); the viewer's
 * listing is this through `perceives` (honest fog — D23).
 */
const ROOM_LISTING = 'here:i:visible:[not mixin.AdornmentMixin] - me';

/** An observation that took nothing in. */
function emptyObservation(): Observation {
  return {
    band: null, dark: false, indistinct: false,
    seen: [], exits: [], holds: null, found: [], hints: [],
  };
}

/**
 * The light band at `place` as `viewer` perceives it (envelope D10 — a
 * night-sighted species and a human in the same room get different
 * answers), or `null` when the viewer cannot run vision queries or the
 * vision singleton is not loaded. `null` degrades to describing the room:
 * a perception gap must never take `look` down.
 */
function perceivedBandImpl(viewer: Stuff, place: Stuff): LightBand | null {
  if (!MixinApi.isSensor(viewer) || !MixinApi.isPerception(viewer)) return null;
  if (!MixinApi.isContainer(place)) return null;
  try {
    const vision = resolveByName('vision') as VisionModality;
    return vision.perceivedBand(
      viewer as Stuff & Sensor & Perception,
      place as unknown as Stuff & Container,
    );
  } catch {
    return null;
  }
}

/** See {@link PerceptionApi.observe} — a place observed from inside. */
async function observePlace(
  viewer: Stuff,
  place: Stuff & Container,
): Promise<Observation> {
  const band = perceivedBandImpl(viewer, place);
  const dark = band !== null && LIGHT_BANDS_TOO_DARK_TO_DESCRIBE.includes(band);
  // Lazily: the MQL pipeline's predicates read perception, so a static
  // import here would close a module cycle through this singleton.
  const { MqlApi } = await import('../../../api/mql');
  // ⭐ MQL names the room's things for everyone; what this viewer takes in
  // is the perceived subset (size-and-carrying D23).
  const named = MqlApi.resolveMany(ROOM_LISTING, {
    commandGiver: viewer as never,
    scope: 'here',
  }).stuff;
  const seen = named.filter((x) => perceivesImpl(viewer, x));
  // ⭐ Nothing to perceive teaches nothing — the void on a fresh login
  // writes no map claim and tracks nobody.
  const indistinct =
    !MixinApi.isVisible(place) &&
    !MixinApi.isExitable(place) &&
    !MixinApi.isNamed(place) &&
    seen.length === 0;
  if (indistinct) return { ...emptyObservation(), band, indistinct, seen };
  // ⭐⭐ The body runs the perception gate, tells whatever it keeps (a map,
  // a memory, nothing) and hands back the exits this viewer may know about
  // — the same ones the verb renders, because computing them twice is how
  // the transcript and the map could ever disagree. In the dark: the ways
  // out you can feel along a wall for, never the people you cannot see.
  const exits = MixinApi.isPerceiver(viewer)
    ? viewer.learnSurroundings(place, dark ? [] : seen)
    : [];
  // Passive hints (honest fog): the full contents + every exit (hidden
  // ones included), narrowed to the close-but-unperceived. Nothing is
  // nearly seen in a place too dark to describe.
  let hints: Stuff[] = [];
  if (!dark) {
    const candidates: Stuff[] = [...place.getContents()];
    if (MixinApi.isExitable(place)) {
      for (const exit of place.getExits().values()) {
        candidates.push(exit as unknown as Stuff);
      }
    }
    hints = hintsForImpl(viewer, candidates);
  }
  return { ...emptyObservation(), band, dark, seen, exits, hints };
}

/** See {@link PerceptionApi.observe} — a thing looked at. */
async function observeThing(viewer: Stuff, target: Stuff): Promise<Observation> {
  // ⭐ (cleanliness D21) What has been happening to it since it was last
  // looked at — the sun on a line, the fume in a shut room — settles
  // before it is described.
  if (MixinApi.isSoilable(target)) await target.reconcileAiring();
  // A thing that cannot be seen teaches nothing.
  if (!MixinApi.isVisible(target)) return emptyObservation();
  // Repeat-perception: a deliberate look at a being tracks it (the same
  // coalescing stranger-record write the room listing makes).
  if (MixinApi.isOrganism(target) && MixinApi.isBeliefStore(viewer)) {
    viewer.learnIdentityOf(target, null);
  }
  if (!MixinApi.isContainer(target)) return emptyObservation();
  // What it visibly holds is read FIRST: the close look below may turn
  // something up, and that is told as a finding, not folded into the list.
  const holds = visibleContentsImpl(viewer, target);
  const contents = [...target.getContents()];
  if (contents.length === 0) return { ...emptyObservation(), holds };
  // The close look: the cheap `glance` depth of the active search, which
  // records each discovery. Then what is still nearly seen.
  const found = resolveSearchImpl(viewer, contents, 'glance');
  const hints = hintsForImpl(viewer, contents);
  return { ...emptyObservation(), holds, found, hints };
}

/** See {@link PerceptionApi.hintsFor}. */
function hintsForImpl(viewer: Stuff, scope: readonly Stuff[]): Stuff[] {
  const cutoff = dialNumber(
    AppSettingKeys.concealmentHintCutoff,
    DEFAULT_HINT_CUTOFF,
  );
  const att = passiveBaseline();
  const out: Stuff[] = [];
  for (const cand of scope) {
    if (!MixinApi.isConcealable(cand)) continue;
    const level = cand.getConcealment();
    if (!ConcealmentLevels.isConcealed(level)) continue;
    if (hasDiscoveredImpl(viewer, cand)) continue; // already found, not a hint
    // A thing already passively perceived isn't a hint — it's visible.
    if (perceivesImpl(viewer, cand, att)) continue;
    const gap =
      ConcealmentLevels.requirementFor(level) -
      effectivePerceptionImpl(viewer, cand, att);
    if (gap <= cutoff) out.push(cand);
  }
  return out;
}

/* ───────────────────────── the horizon (maritime R4) ───────────────────────── */

const COMPASS_POINTS = [
  'to the north', 'to the north-east', 'to the east', 'to the south-east',
  'to the south', 'to the south-west', 'to the west', 'to the north-west',
] as const;

/** An observer's eye above the ground they stand on, meters. */
const SHORE_EYE_M = 2;

const EMPTY_HORIZON: HorizonView = { things: [], traffic: [], atSea: false };

type Craft = Stuff & Positioned & Voyaging;

/**
 * ⭐ The craft `viewer` is aboard — the boat they sit in at sea, or the
 * ship whose extent holds their room: the room's own ZONE names the
 * structures standing in it (maritime review, 2026-10-14). `null` ashore.
 */
function craftAboard(viewer: Stuff): Craft | null {
  const root = MixinApi.isContainable(viewer) ? viewer.getRootContainer() ?? viewer : viewer;
  if (MixinApi.isVoyaging(root) && !root.isDestroyed()) return root as Craft;
  const room = roomOf(viewer);
  // The room is asked: a keyed room's structure is its warren's.
  const s = room !== null && room.isPlace() ? (room as unknown as Place).structureNow() : null;
  return s && MixinApi.isVoyaging(s) && !s.isDestroyed() ? (s as unknown as Craft) : null;
}

/**
 * The weather's factor on sight from `room`: the cached sky
 * (`WeatherApi.peekSkyType`, maritime R10). A sky never read yet counts as
 * clear this once — the read it starts lands for the next look.
 */
function seeingFrom(room: Stuff & Container): number {
  const type = WeatherApi.peekSkyType(room);
  if (type === null) return 1;
  return dialNumber(`expanse.visibility.${type}`, VISIBILITY[type] ?? 1);
}

const VISIBILITY: Record<string, number> = {
  clear: 1, overcast: 1, rain: 0.6, snow: 0.4, storm: 0.3, fog: 0.1,
};

/** The resident expanse at `path`, or `null`. */
function expanseAt(path: string | null): Expanse | null {
  const e = path ? StuffApi.findByTemplatePath<Stuff>(path) : null;
  return e instanceof Expanse ? e : null;
}

/** Contacts as horizon sightings and traffic. */
function toView(contacts: readonly Contact[], atSea: boolean, seen = new Set<string>()): HorizonView {
  const things: HorizonSighting[] = [];
  const traffic: HorizonTraffic[] = [];
  for (const c of contacts) {
    if (c.craft) {
      if (seen.has(c.craft.stuffId)) continue;
      seen.add(c.craft.stuffId);
      things.push({ stuff: c.craft, bearingDeg: c.bearingDeg, rangeNm: c.rangeNm });
    } else {
      traffic.push({ name: c.name, bearingDeg: c.bearingDeg, rangeNm: c.rangeNm });
    }
  }
  return { things, traffic, atSea };
}

/** Every resident craft on the sea at `seaPath`, a structure with no deck being FIXED. */
/**
 * At sea: the viewer's root is a craft on an expanse, and the range is
 * COMPUTED from two heights — the viewer's eye (a lookout seat is the
 * masthead) and each target's. `null` when the viewer is not afloat.
 */
function horizonAtSea(viewer: Stuff): HorizonView | null {
  const craft = craftAboard(viewer);
  const here = craft?.getExpansePosition() ?? null;
  const sea = expanseAt(craft?.getExpanse() ?? null);
  if (craft === null || here === null || sea === null) return null;
  // Below decks there is no horizon: the watch is kept where the sky is.
  const room = roomOf(viewer);
  if (room === null || !(BiomeApi.exposureOf(room)?.skyVisible() ?? false)) return { things: [], traffic: [], atSea: true };
  const hour = Math.floor(WorldClockApi.getNow().rawValue() / 3600);
  const contacts = sea.sightingsAmong(
    here, craft.sightHeightFor(viewer), 'visual', hour,
    sea.sightables(), seeingFrom(room), craft,
  );
  return toView(contacts, true);
}

/**
 * ⭐ On a river (river D26): the viewer's room is on a river's line — the
 * water itself, or a bank standing on it — and what is in sight is the
 * frame's answer (whoever is in the water, to the next bend or as far as
 * height carries). `null` when the room is on no river.
 */
function horizonOnRiver(viewer: Stuff): HorizonView | null {
  const room = MixinApi.isContainable(viewer) ? viewer.getContainer() : null;
  if (room === null) return null;
  const framePath =
    (MixinApi.isPositioned(room) ? room.getLine() : null) ??
    (MixinApi.isFrameSited(room) ? room.getFrameSite()?.frame ?? null : null);
  if (!framePath) return null;
  const frame = StuffApi.findByTemplatePath<Stuff>(framePath);
  if (!frame || !MixinApi.isLineFrame(frame)) return null;
  if (!(BiomeApi.exposureOf(room)?.skyVisible() ?? false)) return EMPTY_HORIZON;
  const things: HorizonView['things'] = [];
  for (const s of frame.sightablesNear(room, RIVER_EYE_M)) {
    const stuff = s as Stuff;
    if (!stuff || stuff === viewer || stuff.isDestroyed()) continue;
    things.push({ stuff, bearingDeg: null, rangeNm: null });
  }
  return { things, traffic: [], atSea: false };
}

/** A person's eye above the water or the bank, m. */
const RIVER_EYE_M = 1.7;

/**
 * Ashore: the nearest `horizon` declaration names ZONES; a Structure in
 * one is in view when the room is open to the sky and its height — plus
 * the elevation between — clears the distance the zones' size implies.
 * A named EXPANSE is read like a deck from the nearest landing, at the
 * zone's elevation (maritime R11: the headland).
 *
 * ⭐ Distance is approximated from the zones' extents in meters (cell size
 * × the grid's span): from inside a named zone, half its span; from
 * another zone, half of each. Crude by design — a grain, tuned by
 * `perception.horizonRatio`, which optics widen later.
 */
function horizonAshore(viewer: Stuff): HorizonView {
  const room = MixinApi.isContainable(viewer) ? viewer.getContainer() : null;
  if (room === null || !room.isPlace() || !MixinApi.isContainer(room)) return EMPTY_HORIZON;
  // (rubber build) a horizon is seen from where the sky is.
  if (!(BiomeApi.exposureOf(room)?.skyVisible() ?? false)) return EMPTY_HORIZON;
  // The branch predicate is the narrowing (no value import of Place —
  // it closes a load cycle through the MQL pipeline).
  const place = room as unknown as Place;
  const zone = room.getZone() as SpatialZone | null;
  const named = place.getHorizon() ?? zone?.peekField<string[]>('horizon') ?? null;
  if (!Array.isArray(named) || named.length === 0) return EMPTY_HORIZON;

  const here = room.getTemplatePath() ?? '';
  const ratio = dialNumber('perception.horizonRatio', 20);
  const myExtent = zone?.getExtentM() ?? 0;
  const myElev = zone?.peekField<number>('elevation') ?? 0;

  const view: HorizonView = { things: [], traffic: [], atSea: false };
  const seen = new Set<string>();
  for (const zonePath of named) {
    const sea = expanseAt(zonePath);
    if (sea !== null) {
      const from = sea.peekShorePositionFor(here);
      if (from === null) continue;
      const hour = Math.floor(WorldClockApi.getNow().rawValue() / 3600);
      const contacts = sea.sightingsAmong(
        from, Math.max(0, myElev) + SHORE_EYE_M, 'visual', hour,
        sea.sightables(), seeingFrom(room),
      );
      const v = toView(contacts, false, seen);
      view.things.push(...v.things);
      view.traffic.push(...v.traffic);
      continue;
    }
    const target = StuffApi.findByTemplatePath<SpatialZone>(zonePath);
    const theirExtent = target?.getExtentM() ?? 0;
    const theirElev = target?.peekField<number>('elevation') ?? 0;
    const within = here === zonePath || here.startsWith(`${zonePath}/`);
    const distanceM = within ? theirExtent / 2 : (myExtent + theirExtent) / 2;
    // The structures attached within the named zone (the location graph's
    // record) — stood up when the first room looking out at it was
    // (`LocationZone.lookOutFrom`). Only what is standing is seen.
    for (const sp of NavigationApi.attachedWithinNow(zonePath, 'structure')) {
      // Structural: `Structure` is a type import here (a module cycle).
      const s = StuffApi.findByTemplatePath(sp) as (Stuff & Partial<Structure>) | undefined;
      if (!s || typeof s.hasMember !== 'function' || typeof s.getHeightM !== 'function') continue;
      if (s.isDestroyed() || seen.has(s.stuffId) || s.hasMember(here)) continue;
      const clearanceM = s.getHeightM() + Math.abs(theirElev - myElev);
      if (clearanceM * ratio < distanceM) continue;
      seen.add(s.stuffId);
      view.things.push({ stuff: s, bearingDeg: null, rangeNm: null });
    }
  }
  return view;
}

/** The room `who` stands in — through any vessel (a boat) to the Place. */
function roomOf(who: Stuff): (Stuff & Container) | null {
  if (!MixinApi.isContainable(who)) return null;
  const place = who.getEnclosingPlace();
  return place !== null && place.isPlace() ? place : null;
}

/**
 * ⭐⭐⭐ **Everything `actor` can lay hands on, each tagged with its pool —
 * the ONE definition of reach** (controller-liquidity D5, W20). Read by
 * `canReach` / `reachableAmong` (membership) and by MQL's `person` ·
 * `inventory` · `here` · `peers` · `reachable` pools (`api/mql/scope-walk`
 * filters it by pool and builds its candidates from it), so what you can
 * name is what you can touch — there is no second assembly to drift.
 *
 * ⚠ `around` — the holders themselves (the place, the vessel you sit in) —
 * is in the list because MQL's `here` names them, and is the ONE pool that
 * is not reach: a hand is IN the room, not on it, so `canReach` and
 * `reachableAmong` skip it (the vessel is still reached as a `peer` of
 * the place it stands in).
 *
 * Emission order is MQL's tie-break: the PERSON first — `self`, then its
 * whole carried tree (never into another body), nearest first by tier,
 * hand · ready · packed (size-and-carrying D17; a slot occupant is
 * `attached`, the rest `inventory`, the apps an implant hosts `attached`)
 * — then `here` (the place's surface, then the vessel's you sit in), then
 * `peers`. ⭐ A thing behind a shut lid or in the pack on your back IS in
 * the person's list: the binder binds it and `canReach` refuses with the
 * object's reason (`Containable.reachRefusal` — *the box is shut*, *take
 * it off first*).
 *
 * The holders: the actor's person; the place around it
 * (`getEnclosingPlace` — in a boat on the river, the river) AND the vessel
 * it sits in when that is not the place (the passenger beside you in a
 * shut coach is to hand though the coach's lid is between you and the
 * road); and `opts.location` when a caller names one. Each holder's
 * contents (the place, the vessel, a named holder) are
 * `Container.getReachableContents()` — the top level and one level into
 * open things. Then what lives in no container at all:
 *
 * ⚠ Attached doors ride `exit.getBoundary()` — a containment-only test misses
 * every door in the game (the card hold that omitted them released
 * `out-of-reach` on doors `open` worked on perfectly well); and the way
 * itself binds a direction. The ways — and so their doors — are the ones
 * the ACTOR can see (`obviousExitsFor`), never the physics list: the
 * rope's way down off the Sunken Delve's lip bound and was "you can't
 * reach down" (harbors sibling drives, 2026-11-04), and a hidden way's
 * door would name the way it hides.
 *
 * ⚠ ...and fixtures ride the room's fixture map, likewise uncontained —
 * `peers`, because a fixture is a thing a person hangs and takes down;
 * `here` is the surface you never pick up (the place, its ways and their
 * doors, the buildings whose landing it is, open ground seen across a way).
 *
 * ⚠ Reach is not perception: nothing here asks `perceives` — a SURFACE
 * does (`PerceptionApi.perceived`, D23). `opts.pools` computes only the
 * sections asked for, so an `inventory` scope never walks the room.
 */
function reachOf(actor: Stuff, opts?: ReachOptions): Reached[] {
  const want = (p: ReachPool): boolean => !opts?.pools || opts.pools.includes(p);
  const out: Reached[] = [];
  const push = (stuff: Stuff, pool: ReachPool): void => {
    if (want(pool)) out.push({ stuff, pool });
  };
  // The apps an implant hosts are on the person with it.
  const pushHosted = (host: Stuff): void => {
    if (!MixinApi.isAether(host)) return;
    for (const u of host.getHostedUpdates()) {
      if (u !== actor) push(u, 'attached');
    }
  };

  // ── the person: the whole carried tree, nearest first (D17) ──
  if (want('self') || want('attached') || want('inventory')) {
    push(actor, 'self');
    pushHosted(actor);
    const occupied = new Map<string, Stuff>();
    if (MixinApi.isSlotted(actor)) {
      for (const occupants of actor.getAllOccupants().values()) {
        for (const occ of occupants) occupied.set(occ.stuffId, occ);
      }
    }
    // A slot occupant that is not in the body's contents (an installed
    // aug) is still on the person — attached, first.
    const inContents = new Set(
      MixinApi.isContainer(actor) ? actor.getContents().map((c) => c.stuffId) : [],
    );
    for (const occ of occupied.values()) {
      if (inContents.has(occ.stuffId)) continue;
      push(occ, want('attached') ? 'attached' : 'inventory');
      if (want('attached')) pushHosted(occ);
    }
    if (MixinApi.isContainer(actor)) {
      // ⭐ The carried tree is the container's own read (breadth-first,
      // never into another body, sandbox-scoped) — then stable by tier.
      const tree: Stuff[] = actor.getCarriedContents();
      const ranked = tree
        .map((stuff, i) => ({ stuff, i, rank: TIER_RANK[tierOfImpl(actor, stuff)] }))
        .sort((a, b) => a.rank - b.rank || a.i - b.i);
      for (const { stuff } of ranked) {
        // A slot occupant is `attached`; with `attached` not asked for it
        // still counts as carried (`inventory`).
        const pool: ReachPool =
          occupied.has(stuff.stuffId) && want('attached') ? 'attached' : 'inventory';
        push(stuff, pool);
        if (want('attached')) pushHosted(stuff);
      }
    }
  }
  if (!want('here') && !want('peers')) return out;

  // ── the holders around the person: the place, the vessel, a named one ──
  if (!MixinApi.isContainable(actor)) return out;
  const place = actor.getEnclosingPlace();
  const holders: (Stuff & Container)[] = [];
  for (const h of [place, actor.getContainer(), opts?.location ?? null]) {
    if (h && MixinApi.isContainer(h) && !holders.some((x) => x.stuffId === h.stuffId)) {
      holders.push(h);
    }
  }

  if (want('here') || want('around')) {
    for (const holder of holders) {
      // What holds you is named (`look here`) but not laid hands on: a
      // direction binds the WAY, never the room (harbors review 3).
      push(holder, 'around');
      if (!MixinApi.isExitable(holder)) continue;
      const ways = holder.obviousExitsFor(actor);
      const doors = new Set<string>();
      for (const way of ways) {
        const door = way.getBoundary();
        if (!door || doors.has(door.stuffId)) continue;
        doors.add(door.stuffId);
        push(door, 'here');
      }
      for (const way of ways) push(way, 'here');
      // ⭐ The buildings whose LANDING this is (paint build, 2026-10-31): a
      // structure is an Idea, never in a room, so it is reached from where
      // it meets the weather — `look cottage` from the lane.
      if (holder.isPlace()) {
        for (const s of (holder as unknown as Place).landedStructuresNow()) {
          push(s as unknown as Stuff, 'here');
        }
      }
      // ⭐ A place read from where it is reached (tracts build D30): open
      // ground through a way, by its own name from this side — only the
      // place, never what stands in it, and only when it is loaded.
      const far = new Set<string>();
      for (const way of ways) {
        const there = way.peekDestination();
        if (!there || there === holder || !there.isPlace()) continue;
        if (!(there as unknown as Place).isSeenAcrossExit()) continue;
        if (far.has(there.stuffId)) continue;
        far.add(there.stuffId);
        push(there, 'here');
      }
    }
  }

  if (want('peers')) {
    const seen = new Set<string>([actor.stuffId]);
    for (const holder of holders) {
      for (const item of holder.getReachableContents()) {
        if (seen.has(item.stuffId)) continue;
        seen.add(item.stuffId);
        push(item, 'peers');
      }
      if (MixinApi.isAdornable(holder)) {
        for (const fixture of holder.getFixtures()) {
          if (seen.has(fixture.stuffId)) continue;
          seen.add(fixture.stuffId);
          push(fixture, 'peers');
        }
      }
    }
  }
  return out;
}
