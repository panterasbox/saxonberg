/**
 * MaterialApi — facade for material-world queries on any Stuff.
 *
 * The "material world" counterpart to ZoneApi/ContainmentApi on the
 * spatial side. Today the API houses two clusters:
 *
 *   - **Per-Stuff lookup** (`materialOf`) — bulk + per-Detail material
 *     resolution with `Tangible` narrowing.
 *   - **Per-Material classification queries** (`compositionOf`,
 *     `containsElement`, `findByTag`, `findByElement`) — educational
 *     surfaces that walk a material's tags / composition / chemistry
 *     to answer "what kind of material is this" / "what's it made of"
 *     / "is this iron in here somewhere" questions.
 *
 * Future surface lands as consumers do: `weightOf(stuff)` (density ×
 * volume once volume is modeled), `damageResistance(stuff,
 * damageType, detailKey?)` (combat), `flammabilityOf(stuff,
 * detailKey?)` (fire propagation), `canConduct(stuff, kind)`
 * (electrical/thermal puzzles). Each earns a method when its consumer
 * arrives.
 *
 * This Api is a thin, security-gated forwarding shell: the logic lives
 * in the hot-reloadable {@link MaterialLogic} singleton at
 * `/obj/api/material`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/material` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type Material from '../lib/material/Material';
import type { CompositionEntry } from '../lib/material/Material';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { MaterialLogic } from '../obj/api/MaterialLogic';
import { fileURLToPath } from 'url';

// kg + kg/m³ tag tables live in `mud/config/quantity-tags.yaml`
// and load at boot via `QuantityApi.loadTagTables`. Material doesn't
// register them locally anymore.

const LOGIC_PATH = '/obj/api/material';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/MaterialLogic', import.meta.url)
);

/** Resolve the HMR-able MaterialLogic singleton (sync). */
function logic(): MaterialLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'MaterialLogic'
      ) as typeof MaterialLogic | null) ?? MaterialLogic)()
  );
}

/**
 * Recursive composition expansion. `direct` is the material's own
 * composition entries (one level). `flat` is the recursive walk down
 * to leaf elements / unmodeled bottoms, expressed as element-symbol
 * → cumulative weight fraction.
 *
 * A mixture of mixtures resolves to atomic-symbol fractions — useful
 * for "does this contain iron?" queries that don't care about the
 * intermediate alloy.
 */
export interface MaterialComposition {
  /** The material whose composition is being expanded. */
  material: Material;
  /** Direct constituents (one level). */
  direct: CompositionEntry[];
  /**
   * Element symbol → cumulative weight fraction across the recursive
   * expansion. Only present for materials that bottom out in elements
   * with a `chemistry.symbol`. Mixtures whose components lack chemistry
   * data contribute their direct entries to `direct` but not to
   * `flat`.
   */
  flat: Record<string, number>;
}

export class MaterialApi {
  /**
   * Resolve the Material at `detailKey`, falling through to the bulk
   * default when no per-Detail override is set. Omit `detailKey` to
   * read the bulk default directly. Returns `null` when `stuff` is
   * not Tangible (or is Tangible but unset).
   *
   * Sync; threads through `Tangible.getMaterial`, which uses
   * `findByTemplatePath` for HMR safety.
   */
  public static materialOf(
    stuff: Stuff,
    detailKey?: string
  ): Material | null {
    return logic().materialOf(stuff, detailKey);
  }

  /**
   * Recursively expand `material`'s composition. `direct` is one
   * level; `flat` aggregates leaf-element weight fractions. Pure
   * elements with a `chemistry.symbol` contribute their full mass to
   * their own symbol (so iron returns `{ Fe: 1 }`); mixtures
   * recursively expand.
   *
   * Cycle-guarded: a composition reference back to an ancestor
   * truncates the walk at that node (defensive — well-formed content
   * shouldn't produce cycles).
   */
  public static compositionOf(material: Material): MaterialComposition {
    return logic().compositionOf(material);
  }

  /**
   * Does `material` contain `elementSymbol` anywhere in its
   * recursive composition? Walks the same expansion as
   * `compositionOf` and consults the leaf elements' `chemistry.symbol`.
   */
  public static containsElement(
    material: Material,
    elementSymbol: string
  ): boolean {
    return logic().containsElement(material, elementSymbol);
  }

  /**
   * Every registered Material that carries `tag`. Tag matching is
   * exact-string. The result reflects the runtime singleton index;
   * Materials that haven't been cloned yet aren't there.
   */
  public static findByTag(tag: string): Material[] {
    return logic().findByTag(tag);
  }

  /**
   * Every registered Material whose recursive composition contains
   * the element identified by `symbol`. Combines `compositionOf` +
   * `containsElement` over the index.
   */
  public static findByElement(symbol: string): Material[] {
    return logic().findByElement(symbol);
  }
}

SecurityApi.decorateApiClass(MaterialApi);
