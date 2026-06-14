// MaterialLogic — the hot-reloadable logic singleton behind MaterialApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Material from '../../lib/material/Material';
import type { MaterialComposition } from '../../api/material';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';

const MaterialApiCallers = SecurityPolicies.FromModule(
  'mud/api/material#MaterialApi'
);

/**
 * MaterialLogic — the hot-reloadable logic singleton behind
 * {@link MaterialApi}.
 *
 * Lives at `/obj/api/material` (a stateless `Stuff` singleton, no
 * backing `Template`); `MaterialApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`): `dest` is the
 * reload invalidator and the next `singletonSync` re-creates against
 * the current blueprint. Shared sub-logic lives in module-private free
 * functions (not gated, but off-class and un-callable from outside),
 * so there are no intra-singleton `this.x()` self-calls to trip the
 * gate.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level: a class-level default would also cover the inherited
 * `Stuff`/`Idea` framework methods (`getTemplatePath`, `isDestroyed`,
 * …) that the framework itself invokes (e.g. during `register`), whose
 * caller is `StuffApi`, not `MaterialApi` — and they'd be denied. Only
 * this singleton's own surface carries the gate; inherited methods keep
 * their framework policies. (Mirrors `AccessRegistry`.)
 *
 * @internal
 */
@Unshadowable
export class MaterialLogic extends Idea {
  /** See {@link MaterialApi.materialOf}. */
  @CallSecurity(MaterialApiCallers)
  public materialOf(stuff: Stuff, detailKey?: string): Material | null {
    if (!MixinApi.isTangible(stuff)) return null;
    return stuff.getMaterial(detailKey);
  }

  /** See {@link MaterialApi.compositionOf}. */
  @CallSecurity(MaterialApiCallers)
  public compositionOf(material: Material): MaterialComposition {
    return computeComposition(material);
  }

  /** See {@link MaterialApi.containsElement}. */
  @CallSecurity(MaterialApiCallers)
  public containsElement(material: Material, elementSymbol: string): boolean {
    return containsElementOf(material, elementSymbol);
  }

  /** See {@link MaterialApi.findByTag}. */
  @CallSecurity(MaterialApiCallers)
  public findByTag(tag: string): Material[] {
    return everyMaterial().filter((m) => m.hasTag(tag));
  }

  /** See {@link MaterialApi.findByElement}. */
  @CallSecurity(MaterialApiCallers)
  public findByElement(symbol: string): Material[] {
    return everyMaterial().filter((m) => containsElementOf(m, symbol));
  }
}

/**
 * Recursively expand `material`'s composition. `direct` is one level;
 * `flat` aggregates leaf-element weight fractions. Pure elements with a
 * `chemistry.symbol` contribute their full mass to their own symbol (so
 * iron returns `{ Fe: 1 }`); mixtures recursively expand.
 *
 * Cycle-guarded: a composition reference back to an ancestor truncates
 * the walk at that node (defensive — well-formed content shouldn't
 * produce cycles).
 */
function computeComposition(material: Material): MaterialComposition {
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
 * Does `material` contain `elementSymbol` anywhere in its recursive
 * composition? Walks the same expansion as {@link computeComposition}
 * and consults the leaf elements' `chemistry.symbol`.
 */
function containsElementOf(material: Material, elementSymbol: string): boolean {
  const flat = computeComposition(material).flat;
  return (flat[elementSymbol] ?? 0) > 0;
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
