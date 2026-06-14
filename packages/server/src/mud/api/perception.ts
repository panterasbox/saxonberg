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
import type { Container } from '../lib/spatial/Container';
import type { Sensor } from '../lib/message/Sensor';
import { Modality } from '../lib/perception/Modality';
import type { Signal, Percept } from '../lib/perception/Modality';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { PerceptionLogic } from '../obj/api/PerceptionLogic';
import { fileURLToPath } from 'url';

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
   * Compute the modality's signal at `loc`. Dispatch is on the
   * modality singleton's `signalAt` — vision walks light, smell
   * walks odor, sound walks dB, touch reads ambient temperature.
   * Contact + network modalities (taste, ESP) return null.
   */
  public static signalAt(
    loc: Stuff & Container,
    modality: Modality,
  ): Signal | null {
    return logic().signalAt(loc, modality);
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
