/**
 * TurnableMixin — ⭐ the protocol behind the platform's `turn` (ceramics
 * D25): a thing you work by turning a screw or a handle, declared as what
 * the thing IS — a screw press today, a windlass or a capstan when a pack
 * ships one. The verb is dumb; the THING says what a turn did, at once — an
 * {@link ActOutcome} or an {@link ActRefusal}, facts and a reason; the
 * `turn` controller words them (controllers-are-io D4). The default
 * refuses. And the thing affords `turn`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActOutcome, ActRefusal } from './ActPlan';

const TURNING = ['platform/cmd/device/turn.yaml'];

/** How hard a screw is down after a turn. */
export type TurnTightness = 'snug' | 'hard-down' | 'as-tight';

/** ⭐ Every reason a turn is refused — the `turn` controller words each. */
export type TurnRefusal =
  | ActRefusal<'not-turnable'>
  | ActRefusal<'already-slack'>
  | ActRefusal<'screwed-down'>
  // a ropewalk's jack (trade-cordage `RopeJack`): the great wheel
  | ActRefusal<'not-turning'>
  | ActRefusal<'already'>
  | ActRefusal<'taken', { holder: Stuff }>
  | ActRefusal<'out-of-reach'>
  | ActRefusal<'cannot'>
  | ActRefusal<'busy'>;

/** What a turn did. */
export type TurnFacts =
  | { kind: 'slackened' }
  /** A post of wet sheets gave up its water. */
  | { kind: 'squeezed'; tight: TurnTightness; sheets: number }
  /** A charge took its shape and came free of its mould. */
  | { kind: 'released'; tight: TurnTightness; released: Stuff }
  /** The platen bore down on a mould (or on an empty bed). */
  | { kind: 'pressed'; tight: TurnTightness; mould: Stuff | null }
  /** The wheel let go (a jack). */
  | { kind: 'let-go' }
  /** The crank taken, to turn the wheel for whoever lays (a jack). */
  | { kind: 'took-wheel' };

export type TurnOutcome = ActOutcome<TurnFacts>;

/** A thing worked by turning. */
export interface Turnable {
  /** Turn it one turn tighter (`back` — slacken it right off). */
  turnBy(actor: Stuff, back: boolean): Promise<TurnOutcome | TurnRefusal>;
}

export function TurnableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TurnableMixin extends Base implements Turnable {
    static _mixinName = 'TurnableMixin';
    static _mixinKind = 'protocol' as const;

    static commandContributions: CommandContributions = {
      environment: TURNING,
      peers: TURNING,
    };

    /** @hook What a turn does — the default turns nothing. */
    public async turnBy(_actor: Stuff, _back: boolean): Promise<TurnOutcome | TurnRefusal> {
      return { ok: false, reason: 'not-turnable' };
    }
  };
}
