/**
 * QuantityApi — load / reload Quantity tag tables from the YAML config
 * file at `mud/config/quantity-tags.yaml`, plus the natural-language
 * unit-token lexicon.
 *
 * Tag tables (`{ tag, threshold }` rows keyed by unit) are pure data
 * with no behavior — the API forces every consumer through
 * `Quantity.tag()` / `Quantity.fromTag()` / `Quantity.parse()`.
 * Centralizing them in YAML lets content authors tune thresholds and
 * tag vocabulary without TS edits, and lets the engine reload the
 * registry at runtime.
 *
 * Boot wiring: `AppBootstrap` calls `QuantityApi.loadTagTables()` after
 * `SeederManager.run()`. Tests bypass this and use the
 * `installV1QuantityTagTables` helper from `lib/persistence/__tests__/`
 * (or call `loadTagTables` directly).
 *
 * Reload semantics: `reloadTagTables()` re-reads the YAML and applies
 * the changes to the live registry — replacing tables for units present
 * in the new file, deleting tables for units that disappeared. Existing
 * `Quantity` instances see new tags on their next `tag()` call (no
 * caching layer to invalidate).
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link QuantityLogic} singleton at `/obj/api/quantity`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /obj/api/quantity` reloads it.
 */

import type { Unit, ScaleName } from '../lib/quantity';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { QuantityLogic } from '../obj/api/QuantityLogic';
import { fileURLToPath } from 'url';

/**
 * Result of a load / reload run. Surfaces actionable counts for boot
 * logs and the future `tags reload` admin command.
 *
 * Granularity is per (unit, scaleName) — a single unit with two scales
 * contributes two entries.
 */
export interface TagTableLoadResult {
  /** (unit, scale) pairs freshly registered (added or replaced). */
  registered: Array<{ unit: Unit; scaleName: ScaleName }>;
  /** (unit, scale) pairs removed because they disappeared from the YAML. */
  removed: Array<{ unit: Unit; scaleName: ScaleName }>;
  /** Resolved YAML path used for this run. */
  path: string;
}

const LOGIC_PATH = '/obj/api/quantity';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/QuantityLogic', import.meta.url)
);

/** Resolve the HMR-able QuantityLogic singleton (sync). */
function logic(): QuantityLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'QuantityLogic'
      ) as typeof QuantityLogic | null) ?? QuantityLogic)()
  );
}

export class QuantityApi {
  /**
   * Resolve a natural-language unit token (`'cups'`, `'litre'`, `'mL'`)
   * to its canonical {@link Unit}, or `null` when unrecognized. Case-
   * insensitive; singular and plural both resolve. The single unit-word
   * lexicon for the formal `:{N unit}` parser and the natural-language
   * measure desugar — no free-floating recognizer module.
   */
  public static resolveUnitToken(token: string): Unit | null {
    return logic().resolveUnitToken(token);
  }

  /**
   * Whether `token` names a known unit — convenience predicate over
   * {@link resolveUnitToken} for the desugar pass's measure guard.
   */
  public static isUnitToken(token: string): boolean {
    return logic().isUnitToken(token);
  }

  /**
   * Read the tag-tables YAML and register each declared (unit, scaleName)
   * table with `Quantity`. Idempotent — calling twice with the same file
   * re-registers the same tables.
   *
   * Boot path: `AppBootstrap` calls this after `SeederManager.run` so the
   * tables are available before any code that hits `tag()` /
   * `parse(tagString)` runs (the marshallers, the propagation walks,
   * controllers).
   *
   * Tests can pass an explicit path to load fixture files.
   */
  public static loadTagTables(yamlPath?: string): TagTableLoadResult {
    return logic().loadTagTables(yamlPath);
  }

  /**
   * Re-read the YAML and apply the diff to the live registry at
   * (unit, scaleName) granularity:
   *   - Pairs present in the new file get re-registered (replacing any
   *     prior table).
   *   - Pairs present in the registry but absent from the new file get
   *     cleared.
   *
   * Removing a unit's default scale promotes the next remaining scale to
   * default automatically (see `Quantity._clearTagTable`'s contract).
   *
   * Existing Quantity instances see new tags on their next `tag()` call —
   * there's no caching layer to invalidate.
   */
  public static reloadTagTables(yamlPath?: string): TagTableLoadResult {
    return logic().reloadTagTables(yamlPath);
  }
}
