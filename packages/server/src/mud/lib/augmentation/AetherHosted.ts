/**
 * AetherHostedMixin — the *update* side of the aether hosting relation.
 *
 * A capability update is an incorporeal `Idea` that has **no
 * independent existence**: it lives as a member of an aether host's
 * hosted set (`AetherMixin`, the host side — see `lib/message/Aether`),
 * with a back-reference to that host, and its lifecycle is bound to the
 * host. Orphaning a hosted update — removing it from its host with no
 * re-host — destroys it (the must-be-hosted invariant, enforced by the
 * host chokepoint `AetherMixin.unhostUpdate`).
 *
 * This is the third base of the three-base capability model: a
 * capability mixin (comms, the travel credential) composes around an
 * `Idea` co-composed with `AetherHostedMixin`, and is hosted on
 * attunement. The same mixin composed around a `Thing` is the corporeal
 * twin (the radio, the travel card).
 *
 * **Invariant lives on the relation, not on `Idea`.** A bare `Idea`
 * (Biome / Zone / Controller) composes no `AetherHostedMixin` and is
 * entirely unaffected — it stays free-standing-capable. Only an Idea
 * that opts into this mixin gains the must-be-hosted constraint.
 *
 * **Privacy.** `_host` is a runtime live-ref (an instance ref per
 * `ref-shapes.md`) — the update is re-created into its host each session
 * (like the implant), never persisted. It is TypeScript `private`, NOT
 * `#`-private: mixin instance state on a proxy-wrapped Stuff host can't
 * use hard-private slots (CLAUDE.md § Member Privacy hard-constraint 2).
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { AetherHost } from "../message/Aether";

/** Public shape provided by AetherHostedMixin. */
export interface AetherHosted {
  /** The host this update is plugged into, or `null` when unhosted. */
  getHost(): (Stuff & AetherHost) | null;
  /**
   * Set the back-reference to the host. Call ONLY via the host
   * chokepoint (`AetherMixin.hostUpdate` / `unhostUpdate`); a hard
   * call-security gate keyed on the calling mixin isn't achievable
   * (caller-identity resolves to the host's concrete class, never to a
   * mixin inner class), so consistency comes from the sealed host
   * chokepoint being the sole legitimate mutator — never from a gate.
   */
  setHost(host: (Stuff & AetherHost) | null): void;
  /** Is this update currently hosted? */
  isAetherHosted(): boolean;
}

export function AetherHostedMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class AetherHostedMixin extends Base implements AetherHosted {
    static _mixinName = "AetherHostedMixin";

    /**
     * Runtime live-ref back to the host. NOT persisted (no entry in
     * `persistentFields`) — re-injected each session by the host's
     * default loadout. TS-`private` per the proxy-receiver constraint.
     */
    private _host: (Stuff & AetherHost) | null = null;

    getHost(): (Stuff & AetherHost) | null {
      return this._host;
    }

    setHost(host: (Stuff & AetherHost) | null): void {
      this._host = host;
    }

    isAetherHosted(): boolean {
      return this._host !== null;
    }

    /**
     * R2.x live-ref cleanup. If this update is destructed directly
     * while still hosted (the misuse path — the chokepoint
     * `unhostUpdate` clears `_host` before it destructs, so the
     * host-driven path sees a null ref and no-ops here), detach the
     * stale reference from the host's collection. No re-destruct: we
     * are already mid-destruct. The host-destruct path clears each
     * update's `_host` first, so this also no-ops there.
     */
    static cleanupOnDestruct(update: Stuff): void {
      const u = update as Stuff & AetherHosted;
      const host = u.getHost();
      if (!host) return;
      u.setHost(null);
      if (host.isDestroyed()) return;
      // Raw removal (splice + command-delta retire, no re-destruct —
      // we are already mid-destruct).
      host._dropHostedUpdate(update);
    }
  };
}
