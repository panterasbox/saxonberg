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
 * Modality singletons live at `/lib/perception/modalities/<name>` and
 * are bootstrap-cloned. The logic caches a `Map<name, Modality>` keyed
 * by the modality's own `name` to keep `modalityByName` O(1) on hot
 * paths (every `filterMessage`, every single-sense validator);
 * tag invalidation rides on `Events.StuffCreated`/`Events.StuffDestructed`
 * filtered to the prefix — same shape as the `TopicCatalogue` HMR pattern.
 *
 * Thin, security-gated forwarding shell: the dispatch + caches live in
 * the hot-reloadable {@link PerceptionLogic} singleton at
 * `/obj/api/perception`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/perception` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { CompetenceBandName } from '../lib/advancement/CompetenceBand';
import type { ConcealmentLevel } from '../lib/concealment/ConcealmentLevel';
import type { Container } from '../lib/spatial/Container';
import type { Sensor } from '../lib/message/Sensor';
import { Modality } from '../lib/perception/Modality';
import type { Percept } from '../lib/perception/Modality';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { PerceptionLogic } from '../obj/api/PerceptionLogic';
import { fileURLToPath } from 'url';

/**
 * The depth of an active detection act (D5). `broad` = a whole-room
 * `search` scan; `narrow` = `search <container>` rummaging one scope
 * deeper (a depth bonus); `glance` = the cheap instantaneous `examine`.
 * Each maps to a dial-backed attention bonus in {@link PerceptionApi.resolveSearch}.
 */
export type SearchDepth = 'broad' | 'narrow' | 'glance';

const LOGIC_PATH = '/obj/api/perception';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/PerceptionLogic', import.meta.url)
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
    return logic().sensorium(viewer);
  }

  /**
   * Predicate: does the viewer's sensorium include `modality`?
   *
   * Used by the four physical `requires*` validators and by
   * `SensorMixin.filterMessage` for modality-attributed frame
   * reception gating.
   */
  public static canPerceive(viewer: Stuff, modality: Modality): boolean {
    return logic().canPerceive(viewer, modality);
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
  public static perceives(
    viewer: Stuff,
    target: Stuff,
    attention?: number,
  ): boolean {
    return logic().perceives(viewer, target, attention);
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
   * caller (`AdvancementApi.bandFor(actor, 'stealth')`, awaited at command
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
   * or `glance` (the instantaneous `examine`). Pure + deterministic given
   * the viewer's warmed `awareness` band — no RNG. The `search` / `examine`
   * verbs (and `SearchActivity.onComplete`) call this.
   */
  public static resolveSearch(
    viewer: Stuff,
    scope: readonly Stuff[],
    depth: SearchDepth,
  ): Stuff[] {
    return logic().resolveSearch(viewer, scope, depth);
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
