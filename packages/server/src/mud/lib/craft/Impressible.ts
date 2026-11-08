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
 * an {@link ActRefusal}, facts and a reason the controller words (D4). The default refuses: a medium
 * that has not said what it takes takes nothing. And the medium affords
 * `impress`: a sand flask on the floor, a wax block in your hand.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActOutcome, ActRefusal } from './ActPlan';

const IMPRESSING = ['platform/cmd/crafting/impress.yaml'];

/**
 * ⭐ Every reason a medium refuses an impression — `ImpressController`
 * words each (controllers-are-io D4); the pattern and the medium are the
 * controller's own args.
 */
export type ImpressRefusal =
  /** Not a soft medium — never was (`not-soft`), or cut to its own shape. */
  | ActRefusal<'not-impressible', { why: 'not-soft' | 'cut-to-shape' }>
  // green ware at the wrong moment (shared with `carve`)
  | ActRefusal<'ruined'>
  | ActRefusal<'fired', { act: 'trim' | 'stamp' }>
  | ActRefusal<'too-soft', { act: 'trim' | 'stamp' }>
  | ActRefusal<'too-dry', { act: 'trim' | 'stamp' }>
  | ActRefusal<'not-markable'>
  | ActRefusal<'no-mark'>
  // a mould
  | ActRefusal<'already-impressed', { held: string }>
  | ActRefusal<'occupied'>
  | ActRefusal<'no-shape'>
  | ActRefusal<'too-big'>
  | ActRefusal<'undercut'>;

/** What the medium took. */
export type ImpressFacts =
  /** A maker's mark, read as the actor knows it (`null` — just "the mark"). */
  | { kind: 'marked'; device: string | null }
  /** An impression of the whole shape (`a jug`). */
  | { kind: 'impressed'; form: string };

export type ImpressOutcome = ActOutcome<ImpressFacts>;

/** A medium a pattern can be pressed into. */
export interface Impressible {
  takeImpression(pattern: Stuff, actor: Stuff): Promise<ImpressOutcome | ImpressRefusal>;
}

export function ImpressibleMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class ImpressibleMixin extends Base implements Impressible {
    static _mixinName = 'ImpressibleMixin';
    static _mixinKind = 'protocol' as const;

    static commandContributions: CommandContributions = {
      environment: IMPRESSING,
      peers: IMPRESSING,
    };

    /** @hook What pressing `pattern` into this medium makes of it. */
    public async takeImpression(_pattern: Stuff, _actor: Stuff): Promise<ImpressOutcome | ImpressRefusal> {
      return { ok: false, reason: 'not-impressible', facts: { why: 'not-soft' } };
    }
  };
}
