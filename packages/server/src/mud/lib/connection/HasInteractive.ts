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

import type { MixinConstructor } from '../mixin';
import type { Interactive } from '../../obj/Interactive';

/**
 * Public shape provided by HasInteractiveMixin.
 *
 * Witness hooks (optional methods) — fire from `ConnectionApi`:
 *   - `onConnectionAttached(conn)` / `onConnectionDetached()` —
 *     per-connection events, fire on every transfer/detach.
 *   - `onLinkdead()` / `onLinkRestored()` — presence transitions,
 *     fire only when the connection count crosses 0/1.
 */
export interface HasInteractive {
  /**
   * Read-only view of the connected `Interactive` set. To mutate, use
   * `addInteractive` / `removeInteractive`.
   */
  getInteractives(): ReadonlySet<Interactive>;

  /** Add an Interactive connection. */
  addInteractive(interactive: Interactive): void;

  /** Remove an Interactive connection. Returns true iff it was present. */
  removeInteractive(interactive: Interactive): boolean;

  /** Membership test. */
  hasInteractive(interactive: Interactive): boolean;

  /** Drop every connection in one call. Used during destruct. */
  clearInteractives(): void;

  /** True iff at least one Interactive is connected. */
  isConnected(): boolean;

  /** True iff no Interactives are connected. MUD-style alias for `!isConnected()`. */
  isLinkdead(): boolean;

  /** Per-connection notification fired after attach. */
  onConnectionAttached?(conn: Interactive): void;
  /** Per-connection notification fired after detach. */
  onConnectionDetached?(): void;
  /** Fired when the connection count drops to zero. */
  onLinkdead?(): void;
  /** Fired when the connection count rises from zero to one. */
  onLinkRestored?(): void;
}

export function HasInteractiveMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class HasInteractiveMixin extends Base {
    static _mixinName = 'HasInteractiveMixin';

    /**
     * Connected Interactives. Host-internal storage; external consumers
     * use `addInteractive` / `removeInteractive` / `getInteractives()`.
     */
    protected interactives: Set<Interactive> = new Set();

    public getInteractives(): ReadonlySet<Interactive> {
      return this.interactives;
    }

    public addInteractive(interactive: Interactive): void {
      this.interactives.add(interactive);
    }

    public removeInteractive(interactive: Interactive): boolean {
      return this.interactives.delete(interactive);
    }

    public hasInteractive(interactive: Interactive): boolean {
      return this.interactives.has(interactive);
    }

    /** Drop every connection in one call. Used during destruct. */
    public clearInteractives(): void {
      this.interactives.clear();
    }

    public isConnected(): boolean {
      return this.interactives.size > 0;
    }

    public isLinkdead(): boolean {
      return !this.isConnected();
    }
  };
}
