// PerceptionLogic — the hot-reloadable logic singleton behind
// PerceptionApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Sensor } from '../../../lib/message/Sensor';
import type { Organism } from '../../../lib/species/Organism';
import type { Perception } from '../../../lib/perception/Perception';
import { Modality } from '../../../lib/perception/Modality';
import type { Percept } from '../../../lib/perception/Modality';
import { MixinApi } from '../../../api/mixin';
import type { SenseChannel } from '../../../lib/description/Perceiver';
import { StuffApi } from '../../../api/stuff';
import { SpeciesApi } from '../../../api/species';
import { AdvancementApi } from '../../../api/advancement';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { TemplatePathPrefixes } from '../../../lib/paths';
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
import { LIGHT_BANDS } from '../../../lib/perception/Light';
// Type-only — the vision singleton's class is resolved lazily off its
// registered clone (the RecognitionLogic `canSeeGate` idiom); a *static*
// value import of a specific modality would drag the whole modality
// subsystem into this module's eval.
import type { VisionModality } from '../modalities/VisionModality';
import type { SearchDepth } from '../../../api/perception';

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
 * Stateless by construction (no `PostRegistrationMixin`); the modality
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
    const [, , band] = await Promise.all([
      SpeciesApi.preloadAnatomy(actor),
      this.preloadModalities(),
      AdvancementApi.bandFor(actor, AWARENESS_DISCIPLINE).catch(
        () => CompetenceBand.FLOOR,
      ),
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

  /** See {@link PerceptionApi.canReach}. */
  @CallSecurity(PerceptionApiCallers)
  public canReach(
    actor: Stuff,
    target: Stuff,
    opts?: { location?: Stuff | null; viaExit?: boolean },
  ): boolean {
    const id = target.stuffId;
    if (id === actor.stuffId) return true;

    const location =
      opts?.location !== undefined
        ? opts.location
        : MixinApi.isContainable(actor)
          ? actor.getContainer()
          : null;

    // The door-via-direction case: `open north` resolves to the LOCATION
    // carrying an exit attribution, and the controller then fetches the
    // door off that exit. Without this the commonest way to open a door
    // is unreachable.
    if (opts?.viaExit && location && id === location.stuffId) return true;

    // ⭐ ONE LEVEL into an open container, on both sides. Reach into the
    // open crate standing here, or into the open pouch you are carrying;
    // a box INSIDE that crate must be opened or taken out first. The
    // openness test is `MixinApi.isOpenContainer` — the single rule the
    // `peers` scope walk, `mustBeInLocation` and `VisionModality` also
    // ask, so what you can name, see and touch can never diverge.
    //
    // ⚠ This clause is why reach could not stay flat: with only the two
    // direct scans below, a coupe standing in a glass rack — or any good
    // in an open Stock counter, or a lime in a crate — was unreachable
    // by every verb in the game, and each caller grew its own bespoke
    // descent instead.
    const reachesInto = (holder: Stuff): boolean => {
      if (!MixinApi.isContainer(holder)) return false;
      for (const c of holder.getContents()) {
        if (c.stuffId === id) return true;
        if (MixinApi.isOpenContainer(c)) {
          for (const inner of c.getContents()) {
            if (inner.stuffId === id) return true;
          }
        }
      }
      return false;
    };

    if (MixinApi.isContainer(actor) && reachesInto(actor)) return true;
    if (location && reachesInto(location)) return true;
    // ⚠ Attached doors are in NO container — they ride `exit.getDoor()`
    // — so a containment-only test misses every door in the game. This
    // clause is the entire reason reach could not stay hand-rolled: the
    // card hold that omitted it released `out-of-reach` on doors the
    // `open` verb worked on perfectly well.
    if (location && MixinApi.isExitable(location)) {
      for (const exit of location.getObviousExits()) {
        if (exit.getDoor()?.stuffId === id) return true;
      }
    }
    // ⚠ ...and neither are fixtures. A hung sconce, a wall TV, a neon
    // sign lives in `getFixtures()`, in no container — so the two
    // containment scans above miss it exactly as they missed doors. The
    // `here` scope offers them; reach must agree, or what you can name is
    // not what you can touch.
    if (location && MixinApi.isAdornable(location)) {
      for (const f of location.getFixtures()) {
        if (f.stuffId === id) return true;
      }
    }
    return false;
  }

  /**
   * ⭐⭐ **The same rule, once, for a whole candidate list.**
   *
   * `canReach` is O(room contents + one level into each open container)
   * per call AND it is gated, so a caller that asks it per candidate
   * pays that walk N times and a call-security stack capture N times.
   * That is quadratic, and it is not theoretical: `get produce` on a
   * farm floor binds every produce item in the open floor stock —
   * hundreds — and `GetController` asked `canReach` for each. A live
   * drive found **96.5% of the whole server's CPU inside
   * `GetController.executeWholeSet`**, with a trivial HTTP GET taking
   * 17 seconds behind it.
   *
   * One walk, one gate, O(1) per candidate afterwards. The RULE is not
   * duplicated — this is the walk, and `canReach` is the single-target
   * question asked of the same descent.
   */
  @CallSecurity(PerceptionApiCallers)
  public reachableAmong(
    actor: Stuff,
    candidates: readonly Stuff[],
    opts?: { location?: Stuff | null },
  ): Stuff[] {
    if (candidates.length === 0) return [];
    const location =
      opts?.location !== undefined
        ? opts.location
        : MixinApi.isContainable(actor)
          ? actor.getContainer()
          : null;

    // The reachable id set: everything directly in the actor or the
    // room, plus one level into each open container on either side —
    // the same descent `canReach` walks, and the same
    // `MixinApi.isOpenContainer` the `peers` scope asks.
    const ids = new Set<string>([actor.stuffId]);
    const collect = (holder: Stuff | null): void => {
      if (!holder || !MixinApi.isContainer(holder)) return;
      for (const c of holder.getContents()) {
        ids.add(c.stuffId);
        if (MixinApi.isOpenContainer(c)) {
          for (const inner of c.getContents()) ids.add(inner.stuffId);
        }
      }
    };
    collect(MixinApi.isContainer(actor) ? actor : null);
    collect(location);
    // Attached doors ride their exit, in no container at all.
    if (location && MixinApi.isExitable(location)) {
      for (const exit of location.getObviousExits()) {
        const door = exit.getDoor();
        if (door) ids.add(door.stuffId);
      }
    }
    // ...and fixtures ride the room's fixture map, likewise uncontained.
    if (location && MixinApi.isAdornable(location)) {
      for (const f of location.getFixtures()) ids.add(f.stuffId);
    }
    return candidates.filter((c) => ids.has(c.stuffId));
  }

  @CallSecurity(PerceptionApiCallers)
  public perceives(viewer: Stuff, target: Stuff, attention?: number): boolean {
    return perceivesImpl(viewer, target, attention);
  }

  /** See {@link PerceptionApi.canMakeOutMarks}. */
  @CallSecurity(PerceptionApiCallers)
  public canMakeOutMarks(viewer: Stuff, target: Stuff): boolean {
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
    const modalities: readonly SenseChannel[] = MixinApi.isMarked(target)
      ? target.getMarkModalities()
      : ['vision'];
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

  /** See {@link PerceptionApi.resolveSearch}. */
  @CallSecurity(PerceptionApiCallers)
  public resolveSearch(
    viewer: Stuff,
    scope: readonly Stuff[],
    depth: SearchDepth,
  ): Stuff[] {
    return resolveSearchImpl(viewer, scope, depth);
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
function walkInnateModalities(viewer: Stuff): Modality[] {
  if (!MixinApi.isOrganism(viewer)) return [];
  const organism = viewer as Stuff & Organism;
  const species = organism.getSpecies();
  if (!species) return [];
  const bodyPlan = species.getBodyPlan();
  if (!bodyPlan) return [];
  const organKeys = bodyPlan.getModalities();
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
 * `stealthBand` is resolved by the caller (`AdvancementApi.bandFor(actor,
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
    stillnessBonusFor(actor);

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
  return 'obvious'; // the hide failed — no concealment gained
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
  const VisionCtor = vision.constructor as typeof VisionModality;
  let idx: number;
  try {
    const band = VisionCtor.perceivedBand(
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
  const VisionCtor = vision.constructor as typeof VisionModality;
  try {
    return VisionCtor.canSee(
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

/** See {@link PerceptionApi.recordDiscovery}. */
function recordDiscoveryImpl(viewer: Stuff, target: Stuff): void {
  if (!MixinApi.isBeliefStore(viewer)) return;
  const referent = discoveryReferentOf(target);
  if (!referent) return;
  viewer.know(DISCOVERY, referent, { found: true });
}

/** See {@link PerceptionApi.perceives}. */
function perceivesImpl(
  viewer: Stuff,
  target: Stuff,
  attention?: number,
): boolean {
  // Backcompat: a non-concealable or `obvious` thing is always present —
  // everything currently visible stays visible.
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
 * The active-attention bonus a search of the given depth folds in on top of
 * the passive baseline (D5). `broad` = a whole-room scan (`searchBonus`);
 * `narrow` = rummaging one container/detail deeper (`+ searchDepthBonus`);
 * `glance` = the cheap instantaneous `examine` (`examineBonus`, weaker). All
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
): Stuff[] {
  const attention = passiveBaseline() + activeBonusFor(depth);
  const found: Stuff[] = [];
  for (const cand of scope) {
    if (!MixinApi.isConcealable(cand)) continue;
    const level = cand.getConcealment();
    if (!ConcealmentLevels.isConcealed(level)) continue;
    if (hasDiscoveredImpl(viewer, cand)) continue; // already found
    if (
      effectivePerceptionImpl(viewer, cand, attention) >=
      ConcealmentLevels.requirementFor(level)
    ) {
      recordDiscoveryImpl(viewer, cand);
      found.push(cand);
    }
  }
  return found;
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
