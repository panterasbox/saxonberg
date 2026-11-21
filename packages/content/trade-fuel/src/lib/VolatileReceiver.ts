/**
 * VolatileReceiverMixin — ⭐ **a receiver that takes what leaves a retort's
 * charge** (biome.md § The one vapor route; matter-model-overlaps D16): a condenser on the retort's head, a
 * gasometer on the condenser's outlet. The chain is *retort → condenser →
 * gasometer*, and each link asks only whether the thing standing on it IS a
 * receiver — by this name, never by probing for a method (it was a
 * `typeof receiver.receive` test, the duck-typing the kernel lints for).
 *
 * A **protocol mixin** (the `TakesFish` rule): no shared state, a name
 * (`VOLATILE_RECEIVER_MIXIN`) the retort and the condenser narrow on. The
 * default takes nothing; each host overrides `receive`.
 *
 * **IS for:** a vessel that takes a firing's tar, wood spirit or gas off a
 * pipe. **IS NOT for:** the air of a room (that is the kernel's vent).
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** The mixin's registered name — what a link in the chain narrows on. */
export const VOLATILE_RECEIVER_MIXIN = 'VolatileReceiverMixin';

/** The protocol: take what you can of a volatile and say how much. */
export interface VolatileReceiver {
  /**
   * Take what you can of `litres` of `materialPath`; return the litres
   * taken. ⚠ The return is load-bearing: the link below passes the rest on.
   */
  receive(materialPath: string, litres: number): number;
}

export function VolatileReceiverMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class VolatileReceiverMixin extends Base implements VolatileReceiver {
    static _mixinName = VOLATILE_RECEIVER_MIXIN;

    static _mixinRefusal = "{} doesn't take what a retort gives off";

    /** @hook Override on the host: what it takes. Default: nothing. */
    public receive(materialPath: string, litres: number): number {
      void materialPath;
      void litres;
      return 0;
    }
  };
}
