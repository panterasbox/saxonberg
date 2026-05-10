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
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type {
  Material,
  CompositionEntry,
} from '../lib/material/Material';
import { MixinApi } from './mixin';
import { StuffApi } from './stuff';
import { SecurityApi } from './security';
import { Quantity } from '../lib/quantity';

// Wave 4 tag tables. Registered at module-load so authoring shapes
// (`mass: heavy`, `density: rock-like`) round-trip cleanly through
// `Quantity.parse(s, U)`.
const KG_TAGS = [
  { tag: 'feather', threshold: 0.001 },
  { tag: 'light', threshold: 0.5 },
  { tag: 'medium', threshold: 5 },
  { tag: 'heavy', threshold: 50 },
  { tag: 'enormous', threshold: 500 },
];

const DENSITY_TAGS = [
  { tag: 'gas-like', threshold: 0 },
  { tag: 'water-like', threshold: 500 },
  { tag: 'rock-like', threshold: 2000 },
  { tag: 'metal-like', threshold: 6000 },
];

Quantity.registerTagTable('kg', KG_TAGS);
Quantity.registerTagTable('kg/m³', DENSITY_TAGS);

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
    if (!MixinApi.isTangible(stuff)) return null;
    return stuff.getMaterial(detailKey);
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
    const direct = material.getComposition();
    const flat: Record<string, number> = {};
    const visited = new Set<string>();
    expandInto(material, 1, flat, visited);
    return {
      material,
      direct: direct.map((e) => ({ ...e })),
      flat,
    };
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
    const flat = MaterialApi.compositionOf(material).flat;
    return (flat[elementSymbol] ?? 0) > 0;
  }

  /**
   * Every registered Material that carries `tag`. Tag matching is
   * exact-string. The result reflects the runtime singleton index;
   * Materials that haven't been cloned yet aren't there.
   */
  public static findByTag(tag: string): Material[] {
    return everyMaterial().filter((m) => m.hasTag(tag));
  }

  /**
   * Every registered Material whose recursive composition contains
   * the element identified by `symbol`. Combines `compositionOf` +
   * `containsElement` over the index.
   */
  public static findByElement(symbol: string): Material[] {
    return everyMaterial().filter((m) =>
      MaterialApi.containsElement(m, symbol)
    );
  }
}

function everyMaterial(): Material[] {
  return StuffApi.findByPathGlob<Material>('/lib/material/**').filter((m) =>
    isMaterial(m)
  );
}

function isMaterial(stuff: Stuff): stuff is Material {
  // Duck-check via the Material surface. Avoids an instanceof import
  // cycle and tolerates RadioactiveMaterial / future capability
  // subclasses uniformly.
  return (
    typeof (stuff as Partial<Material>).getDensity === 'function' &&
    typeof (stuff as Partial<Material>).getTags === 'function'
  );
}

function expandInto(
  material: Material,
  weight: number,
  acc: Record<string, number>,
  visited: Set<string>
): void {
  const path = material.getTemplatePath();
  if (path && visited.has(path)) return;
  if (path) visited.add(path);

  const direct = material.getComposition();
  if (direct.length === 0) {
    // Leaf material — credit its own element symbol if it has one.
    const symbol = material.getChemistry()?.symbol;
    if (symbol) acc[symbol] = (acc[symbol] ?? 0) + weight;
    return;
  }

  for (const entry of direct) {
    const child = StuffApi.findByTemplatePath<Material>(entry.materialPath);
    if (!child) continue;
    expandInto(child, weight * entry.fraction, acc, visited);
  }
}

SecurityApi.decorateApiClass(MaterialApi);
