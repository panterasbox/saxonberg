/**
 * ImpressibleMixin — ⭐ the protocol behind the platform's `impress` (alias
 * `mold`; ceramics D21): pressing a hard shape into something soft, and the
 * MEDIUM that takes it, declared as what the thing IS. The medium decides
 * what that makes of it — a leather-hard pot takes its maker's mark
 * (`GreenwareMixin`); a sand flask or a wax block takes an impression of
 * the whole pattern (`MouldMixin`, moulding W7).
 *
 * ⚠ A blank struck on a die is NOT an impression: a strike needs the
 * hammer's blow energy, which a press does not carry — that is
 * `StrikingDieMixin`, asked by `hammer`.
 *
 * The verb is dumb; the medium answers at once — an {@link ActOutcome} or
 * an {@link ActRefusal} in its own words. The default refuses: a medium
 * that has not said what it takes takes nothing. And the medium affords
 * `impress`: a sand flask on the floor, a wax block in your hand.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActOutcome, ActRefusal } from './ActPlan';
import { Mml } from '../../api/mml';

const IMPRESSING = ['platform/cmd/crafting/impress.yaml'];

/** A medium a pattern can be pressed into. */
export interface Impressible {
  takeImpression(pattern: Stuff, actor: Stuff): Promise<ActOutcome | ActRefusal>;
}

export function ImpressibleMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ImpressibleMixin extends Base implements Impressible {
    static _mixinName = 'ImpressibleMixin';

    static commandContributions: CommandContributions = {
      environment: IMPRESSING,
      peers: IMPRESSING,
    };

    /** @hook What pressing `pattern` into this medium makes of it. */
    public async takeImpression(_pattern: Stuff, _actor: Stuff): Promise<ActOutcome | ActRefusal> {
      return {
        ok: false,
        reason: 'not-impressible',
        line: Mml.compose`${Mml.thing(this as unknown as Stuff)} is not soft enough to take an impression.`,
      };
    }
  };
}
