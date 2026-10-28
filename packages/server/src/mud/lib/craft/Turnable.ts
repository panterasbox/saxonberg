/**
 * TurnableMixin — ⭐ the protocol behind the platform's `turn` (ceramics
 * D25): a thing you work by turning a screw or a handle, declared as what
 * the thing IS — a screw press today, a windlass or a capstan when a pack
 * ships one. The verb is dumb; the THING says what a turn did, at once and
 * in its own words — an {@link ActOutcome} or an {@link ActRefusal}. The
 * default refuses. And the thing affords `turn`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActOutcome, ActRefusal } from './ActPlan';
import { Mml } from '../../api/mml';

const TURNING = ['platform/cmd/device/turn.yaml'];

/** A thing worked by turning. */
export interface Turnable {
  /** Turn it one turn tighter (`back` — slacken it right off). */
  turnBy(actor: Stuff, back: boolean): Promise<ActOutcome | ActRefusal>;
}

export function TurnableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TurnableMixin extends Base implements Turnable {
    static _mixinName = 'TurnableMixin';

    static commandContributions: CommandContributions = {
      environment: TURNING,
      peers: TURNING,
    };

    /** @hook What a turn does — the default turns nothing. */
    public async turnBy(_actor: Stuff, _back: boolean): Promise<ActOutcome | ActRefusal> {
      return {
        ok: false,
        reason: 'not-turnable',
        line: Mml.compose`There is nothing to turn on ${Mml.thing(this as unknown as Stuff)}.`,
      };
    }
  };
}
