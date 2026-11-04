/**
 * TearableMixin — a thing you can TEAR (paper D13): a sheet into halves, a
 * page out of a book, a shirt into rags, a paper bag open.
 *
 * ⭐ A protocol on the thing torn, not a verb that knows the cases. One
 * verb (`tear`) on three hosts (`Sheet`, `Book`, `Garment` — and the
 * paper goods that spill), so the act is model-side: each host says what
 * tearing it makes and what is lost. Not on `Good` — a hammer does not
 * tear — and not on `Thing`.
 *
 * Tearing is a TRANSFORMATION: what is torn stops being the thing it was.
 * The default refuses; a host that composes this overrides {@link
 * Tearable.tear}.
 */

import type { MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';

/** What a tear made, or why it would not go. */
export type TearOutcome =
  | { ok: true; line: string; made: Stuff[] }
  | { ok: false; reason: string; line: string };

export interface Tearable {
  /**
   * Tear this. `page` (1-based) names a leaf of a bound book; a sheet and a
   * garment ignore it. Refusals in words.
   */
  tear(by: Stuff, page?: number): Promise<TearOutcome>;
}

const TEAR = ['platform/cmd/inventory/tear.yaml'];

export function TearableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class TearableMixin extends Base implements Tearable {
    static _mixinName = 'TearableMixin';

    static commandContributions: CommandContributions = {
      self: [],
      inventory: TEAR,
      environment: TEAR,
      peers: TEAR,
    };

    /** @hook Each host says what tearing it makes. */
    public async tear(_by: Stuff, _page?: number): Promise<TearOutcome> {
      return { ok: false, reason: 'will-not-tear', line: 'It will not tear.' };
    }
  };
}
