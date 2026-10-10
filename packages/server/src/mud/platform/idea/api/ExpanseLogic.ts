// ExpanseLogic — the hot-reloadable logic singleton behind ExpanseApi.

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Positioned } from '../../../lib/expanse/Positioned';
import { Expanse } from '../../../lib/expanse/Expanse';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../../lib/paths';
import type StructureCatalogue from '../StructureCatalogue';

const ExpanseApiCallers = SecurityPolicies.FromModule('/api/expanse#ExpanseApi');

/**
 * ExpanseLogic — resolves a place to the craft it is part of, and an
 * expanse path to its live frame. Holds no state: the craft registry is
 * the Expanse's own, and a Structure's position is the Structure's.
 *
 * Lives at `/platform/idea/api/expanse`. Each public method carries the
 * `FromModule` gate; internals are module-private.
 *
 * @internal
 */
export class ExpanseLogic extends ApiLogic {
  /** See {@link ExpanseApi.craftAt}. */
  @CallSecurity(ExpanseApiCallers)
  public async craftAt(placePath: string): Promise<(Stuff & Positioned) | null> {
    if (!placePath) return null;
    const here = StuffApi.findByTemplatePath<Stuff>(placePath);
    if (here && MixinApi.isPositioned(here) && here.getExpansePosition() !== null) {
      return here;
    }
    const cat = await StuffApi.singleton<StructureCatalogue>(TemplatePaths.structureCatalogue);
    const row = await cat.structureOf(placePath);
    if (row === null) return null;
    const s = await StuffApi.singleton<Stuff>(row.path);
    return MixinApi.isPositioned(s) && s.getExpansePosition() !== null ? s : null;
  }

  /** See {@link ExpanseApi.expanse}. */
  @CallSecurity(ExpanseApiCallers)
  public async expanse(expansePath: string): Promise<Expanse | null> {
    if (!expansePath) return null;
    try {
      const s = await StuffApi.singleton<Stuff>(expansePath);
      return s instanceof Expanse ? s : null;
    } catch {
      return null;
    }
  }
}
