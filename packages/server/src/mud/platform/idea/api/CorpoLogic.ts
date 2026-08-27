// CorpoLogic — the hot-reloadable logic singleton behind CorpoApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { Mixins } from "../../../lib/mixin";
import { TemplatePaths } from "../../../lib/paths";
import type { CorpoDescriptor } from "../corpo/Corpo";
import type { BrandDescriptor } from "../corpo/Brand";
import type CorpoCatalogue from "../CorpoCatalogue";

const CorpoApiCallers = SecurityPolicies.FromModule("/api/corpo#CorpoApi");

/**
 * A branded host, narrowed structurally (via `Mixins.Branded`) rather than
 * by importing the mixin — keeps the logic free of a lib back-import.
 */
interface BrandedHost {
  getBrandKey(): string;
}

/** The live CorpoCatalogue singleton, or `null` before it warms. */
function catalogue(): CorpoCatalogue | null {
  return (
    (StuffApi.findByTemplatePath(
      TemplatePaths.corpoCatalogue
    ) as CorpoCatalogue | null) ?? null
  );
}

/** Resolve a brand `key` to its owning corpo; independent / unknown → `null`. */
function corpoOfBrandImpl(brandKey: string): CorpoDescriptor | null {
  const cat = catalogue();
  if (!cat) return null;
  const brand = cat.getBrand(brandKey);
  if (!brand || brand.owner.length === 0) return null;
  return cat.getCorpo(brand.owner);
}

/** The brand key a branded host carries, or `null` if not branded. */
function brandKeyOf(obj: Stuff): string | null {
  if (!MixinApi.hasMixin(obj, Mixins.Branded)) return null;
  const key = (obj as unknown as BrandedHost).getBrandKey();
  return typeof key === "string" && key.length > 0 ? key : null;
}

/** Resolve a corpo's portfolio (forward edge) to brand descriptors. */
function portfolioOfImpl(corpoKey: string): BrandDescriptor[] {
  const cat = catalogue();
  if (!cat) return [];
  const out: BrandDescriptor[] = [];
  for (const brandKey of cat.portfolioOf(corpoKey)) {
    const brand = cat.getBrand(brandKey);
    if (brand) out.push(brand);
  }
  return out;
}

/** Resolve a corpo's `rivals` edge keys to corpo descriptors (drop unknowns). */
function rivalsOfImpl(corpoKey: string): CorpoDescriptor[] {
  const cat = catalogue();
  if (!cat) return [];
  const out: CorpoDescriptor[] = [];
  for (const rivalKey of cat.rivalsOf(corpoKey)) {
    const rival = cat.getCorpo(rivalKey);
    if (rival) out.push(rival);
  }
  return out;
}

/**
 * CorpoLogic — the hot-reloadable logic singleton behind {@link CorpoApi}.
 *
 * Lives at `/platform/idea/api/corpo` (a stateless `Stuff` singleton, no backing
 * `Template`); `CorpoApi`'s public statics forward here via
 * `StuffApi.singletonSync`. It reads only the in-memory `CorpoCatalogue`
 * (no per-owner Mongo, so no connection guard — unlike `AdvancementLogic`).
 * Internal sub-logic lives in module-private free functions so there are no
 * intra-singleton `this.x()` calls to trip the gate; each public method
 * carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class CorpoLogic extends ApiLogic {
  /** See {@link CorpoApi.corpoOfBrand}. */
  @CallSecurity(CorpoApiCallers)
  public corpoOfBrand(brandKey: string): CorpoDescriptor | null {
    return corpoOfBrandImpl(brandKey);
  }

  /** See {@link CorpoApi.corpoOf}. */
  @CallSecurity(CorpoApiCallers)
  public corpoOf(obj: Stuff): CorpoDescriptor | null {
    const brandKey = brandKeyOf(obj);
    return brandKey ? corpoOfBrandImpl(brandKey) : null;
  }

  /** See {@link CorpoApi.brandOf}. */
  @CallSecurity(CorpoApiCallers)
  public brandOf(obj: Stuff): BrandDescriptor | null {
    const brandKey = brandKeyOf(obj);
    if (!brandKey) return null;
    return catalogue()?.getBrand(brandKey) ?? null;
  }

  /** See {@link CorpoApi.getBrand}. */
  @CallSecurity(CorpoApiCallers)
  public getBrand(brandKey: string): BrandDescriptor | null {
    return catalogue()?.getBrand(brandKey) ?? null;
  }

  /** See {@link CorpoApi.getCorpo}. */
  @CallSecurity(CorpoApiCallers)
  public getCorpo(corpoKey: string): CorpoDescriptor | null {
    return catalogue()?.getCorpo(corpoKey) ?? null;
  }

  /** See {@link CorpoApi.portfolioOf}. */
  @CallSecurity(CorpoApiCallers)
  public portfolioOf(corpoKey: string): BrandDescriptor[] {
    return portfolioOfImpl(corpoKey);
  }

  /** See {@link CorpoApi.rivalsOf}. */
  @CallSecurity(CorpoApiCallers)
  public rivalsOf(corpoKey: string): CorpoDescriptor[] {
    return rivalsOfImpl(corpoKey);
  }

  /** See {@link CorpoApi.listCorpos}. */
  @CallSecurity(CorpoApiCallers)
  public listCorpos(): CorpoDescriptor[] {
    return catalogue()?.allCorpos() ?? [];
  }

  /** See {@link CorpoApi.listBrands}. */
  @CallSecurity(CorpoApiCallers)
  public listBrands(): BrandDescriptor[] {
    return catalogue()?.allBrands() ?? [];
  }
}
