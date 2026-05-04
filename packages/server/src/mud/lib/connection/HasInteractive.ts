/**
 * HasInteractiveMixin — Stuff that has one or more connected
 * `Interactive` objects driving it.
 *
 * `Avatar` composes this for multiplexing (many connections, one
 * avatar). `Login` composes it too with a singleton-set seeded from
 * its constructor: a Login owns exactly one Interactive for the brief
 * window between connection-up and avatar-switch, and routing it
 * through the same mixin keeps `MixinApi.isHasInteractive` the
 * canonical detector.
 *
 * The interface gives policy/messaging code a stable name for
 * "which HasInteractive did this?" instead of branching on
 * `instanceof Avatar || instanceof Login`. Use
 * `MixinApi.isHasInteractive(obj)` to narrow.
 */

import type { MixinConstructor } from '../mixin-types';
import type { Interactive } from '../../obj/Interactive';

/**
 * Public shape provided by HasInteractiveMixin.
 */
export interface HasInteractive {
  /**
   * Read-only view of the connected `Interactive` set. To mutate, use
   * `addInteractive` / `removeInteractive`.
   */
  getInteractives(): ReadonlySet<Interactive>;

  /** Add an Interactive connection. */
  addInteractive(interactive: Interactive): void;

  /** Remove an Interactive connection. */
  removeInteractive(interactive: Interactive): void;

  /** True iff at least one Interactive is connected. */
  isConnected(): boolean;

  /** True iff no Interactives are connected. MUD-style alias for `!isConnected()`. */
  isLinkdead(): boolean;
}

export function HasInteractiveMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HasInteractiveMixin extends Base {
    static _mixinName = 'HasInteractiveMixin';

    /**
     * Connected Interactives. Direct mutation is allowed within the
     * class but external consumers should go through the mixin's
     * `addInteractive` / `removeInteractive` methods (or via the
     * read-only `getInteractives()` view).
     */
    interactives: Set<Interactive> = new Set();

    public getInteractives(): ReadonlySet<Interactive> {
      return this.interactives;
    }

    public addInteractive(interactive: Interactive): void {
      this.interactives.add(interactive);
    }

    public removeInteractive(interactive: Interactive): void {
      this.interactives.delete(interactive);
    }

    public isConnected(): boolean {
      return this.interactives.size > 0;
    }

    public isLinkdead(): boolean {
      return !this.isConnected();
    }
  };
}
