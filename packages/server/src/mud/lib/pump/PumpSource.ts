/**
 * PumpSource — ⭐ something a pump is SET IN (a well, a wellhead, a
 * conduit). See `./Pumpable`.
 */

import type { Stuff } from '../stuff/Stuff';
import type { MixinConstructor } from '../mixin';

/**
 * ⭐ **Something a pump is set IN** — a well, a wellhead, a conduit. Each
 * holds its pump as content and vetoes everything else; this is the one
 * read they share, so a pump can tell being SET from being CARRIED (a pump
 * in a crate is luggage).
 */
export interface PumpSource {
  /** The pump set in this source, or `null`. */
  pumpFitted(): Stuff | null;
}

/**
 * ⭐ **`PumpSourceMixin` — the set-in protocol, as a mixin**
 * (controllers-are-io D8a; four hosts in three places).
 *
 * IS: a source that holds its pump as content and vetoes everything else,
 * so a pump can tell being SET from being CARRIED. IS NOT: a crate a pump
 * travels in (luggage). Default: no pump is set.
 */
export function PumpSourceMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PumpSourceMixin extends Base implements PumpSource {
    static _mixinName: string = 'PumpSourceMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook The pump set in this source; the default: none. */
    public pumpFitted(): Stuff | null {
      return null;
    }
  };
}
