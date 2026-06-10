/**
 * PerceptionApi — single dispatch surface for the perception
 * substrate.
 *
 * Four methods:
 *   - `modalityByName(name)` — resolve a modality singleton by name.
 *   - `signalAt(loc, modality)` — query the modality's signal at `loc`.
 *   - `perceiveAt(viewer, loc, modality)` — query the viewer's percept
 *     (signal + per-viewer narrowing).
 *   - `sensorium(viewer)` — the modalities the viewer can perceive
 *     (innate BodyPlan organs + augment contributions from active
 *     mixins via `MixinApi.getActiveMixins` + `_grantsModalities`).
 *   - `canPerceive(viewer, modality)` — predicate over `sensorium`.
 *
 * Modality singletons live at `/lib/perception/modalities/<name>` and
 * are bootstrap-cloned. The Api caches a `Map<name, Modality>` keyed
 * by the modality's own `name` to keep `modalityByName` O(1) on hot
 * paths (every `filterMessage`, every single-sense validator);
 * tag invalidation rides on `Events.StuffCreated`/`Events.StuffDestructed`
 * filtered to the prefix — same shape as the `TopicCatalogue` HMR pattern.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Sensor } from '../lib/message/Sensor';
import type { Organism } from '../lib/species/Organism';
import { Modality } from '../lib/perception/Modality';
import type { Signal, Percept } from '../lib/perception/Modality';
import { MixinApi } from './mixin';
import { StuffApi } from './stuff';
import { SpeciesApi } from './species';
import { SecurityApi } from './security';

/** Template-path prefix shared by every modality singleton. */
const MODALITY_PREFIX = '/lib/perception/modalities/';

/**
 * Lazily built `Map<modality-name, Modality>`. Built on first access,
 * dropped to `null` by the HMR invalidator below. The keys are the
 * modality singletons' own `name` field (`'vision'`, `'smell'`,
 * `'sound'`, `'touch'`, `'taste'`, `'verbal-esp'`, `'emotive-esp'`).
 *
 * A separate `Map<organ-key, Modality>` exists below because the
 * sound modality is named `'sound'` but its organ key is `'hearing'`.
 */
let modalityByNameCache: Map<string, Modality> | null = null;
let modalityByOrganKeyCache: Map<string, Modality> | null = null;

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
 * Drop the modality caches. Wired below to the HMR event lifecycle so
 * reloading a modality subclass takes effect on next access.
 */
function invalidateModalityCache(): void {
  modalityByNameCache = null;
  modalityByOrganKeyCache = null;
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
    loadCaches();
    const found = modalityByNameCache!.get(name);
    if (!found) {
      throw new Error(
        `PerceptionApi.modalityByName: no modality '${name}' loaded; ` +
          `check the bootstrap manifest's '${MODALITY_PREFIX}' entry`,
      );
    }
    return found;
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
    loadCaches();
    return modalityByOrganKeyCache!.get(organKey) ?? null;
  }

  /**
   * Compute the modality's signal at `loc`. Dispatch is on the
   * modality singleton's `signalAt` — vision walks light, smell
   * walks odor, sound walks dB, touch reads ambient temperature.
   * Contact + network modalities (taste, ESP) return null.
   */
  public static signalAt(
    loc: Stuff & Container,
    modality: Modality,
  ): Signal | null {
    return modality.signalAt(loc);
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
    const signal = modality.signalAt(loc);
    if (signal === null) return null;
    return modality.perceiveFor(viewer, loc, signal);
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
   * `MixinApi.getActiveMixins` + `_grantsModalities` — see
   * `walkAugmentedModalities`.
   *
   * Returns `[]` defensively when:
   *   - the viewer isn't an Organism (test fixtures, debug consoles),
   *   - the Organism has no Species,
   *   - the Species has no BodyPlan,
   *   - the BodyPlan has no sensoryPorts (sessile).
   */
  public static sensorium(viewer: Stuff): readonly Modality[] {
    const innate = walkInnateModalities(viewer);
    const augmented = walkAugmentedModalities(viewer);
    return dedupe([...innate, ...augmented]);
  }

  /**
   * Predicate: does the viewer's sensorium include `modality`?
   *
   * Used by the four physical `requires*` validators and by
   * `SensorMixin.filterMessage` for modality-attributed frame
   * reception gating.
   */
  public static canPerceive(viewer: Stuff, modality: Modality): boolean {
    return this.sensorium(viewer).some((c) => c === modality);
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
    await Promise.all(
      MODALITY_NAMES.map((name) =>
        StuffApi.singleton(`${MODALITY_PREFIX}${name}`).catch(() => null),
      ),
    );
    // Drop the lazy cache so the next sync lookup re-reads via
    // `findByPathGlob` and picks up the freshly-cloned singletons.
    invalidateModalityCache();
  }

  /**
   * Combined async preload for sense / ESP verb-level validators.
   * Warms anatomy (species + clades + body plan) AND modality
   * singletons in parallel — the two everything-must-be-live
   * concerns the validators' sync body assumes. Validators wire
   * this into their `preload` hook.
   */
  public static async preloadForSenseGate(actor: Stuff): Promise<void> {
    await Promise.all([
      SpeciesApi.preloadAnatomy(actor),
      PerceptionApi.preloadModalities(),
    ]);
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
    invalidateModalityCache();
  }
}

/**
 * Modality name list — single source of truth for the
 * `preloadModalities` walk. Stays in step with the seed YAMLs
 * under `seeds/lib/perception/modalities/`.
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
    const modality = PerceptionApi.modalityByOrganKey(key);
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
  const activeMixins = MixinApi.getActiveMixins(viewer);
  const grants = new Set<string>();
  for (const mixin of activeMixins) {
    const list = (mixin as { _grantsModalities?: readonly string[] })
      ._grantsModalities;
    if (!list) continue;
    for (const name of list) grants.add(name);
  }
  const out: Modality[] = [];
  for (const name of grants) {
    try {
      out.push(PerceptionApi.modalityByName(name));
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

SecurityApi.decorateApiClass(PerceptionApi);

// HMR invalidation: when a modality singleton is created or destroyed
// at any path under `/lib/perception/modalities/`, drop the cache so
// the next access rebuilds with the new singleton set. Mirror the
// pattern `TopicCatalogue` uses for its leaf descriptors.
//
// EventApi isn't imported at module load to avoid a boot-order cycle;
// the subscription registers lazily on first cache build (the cost is
// one-time-per-process). The simpler shape — invalidating on first
// non-prefix-related event — is acceptable for v1; a stricter prefix
// filter lands when the modality registry becomes mutable at runtime.
