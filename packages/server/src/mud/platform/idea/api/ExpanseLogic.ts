// ExpanseLogic — the hot-reloadable logic singleton behind ExpanseApi.

import { NavigationApi } from '../../../api/navigation';
import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Positioned } from '../../../lib/expanse/Positioned';
import { Expanse } from '../../../lib/expanse/Expanse';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import type { ClimateLean } from '../../../lib/weather/WeatherType';

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
    // The structure attached to the place in the location graph's record
    // — never a catalogue of every structure.
    const s = await NavigationApi.structureAt(placePath);
    return s && MixinApi.isPositioned(s) && s.getExpansePosition() !== null ? s : null;
  }

  /** See {@link ExpanseApi.leanAtSync}. */
  @CallSecurity(ExpanseApiCallers)
  public leanAtSync(placePath: string): ClimateLean | null {
    if (!placePath) return null;
    let craft: Stuff | null = StuffApi.findByTemplatePath<Stuff>(placePath) ?? null;
    if (!craft || !MixinApi.isPositioned(craft) || craft.getExpansePosition() === null) {
      // The structure this place is a member of — attached to it in the
      // location graph's record, and standing whenever the place is.
      craft = NavigationApi.structureAtNow(placePath);
    }
    if (!craft || !MixinApi.isVoyaging(craft)) return null;
    const pos = craft.getExpansePosition();
    const sea = StuffApi.findByTemplatePath<Stuff>(craft.getExpanse() ?? '');
    if (pos === null || !(sea instanceof Expanse)) return null;
    return sea.peekNarrowestAt(pos)?.getWeatherLean() ?? null;
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
