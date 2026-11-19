/**
 * AetherHostedMixin — the *app* side of the aether hosting relation.
 *
 * An app is an incorporeal `Idea` that has **no independent existence**:
 * it lives as a member of an aether host's hosted set (`AetherHostMixin`
 * — see `lib/augmentation/AetherHost`), with a back-reference to that
 * host, and its lifecycle is bound to the host. Orphaning an app —
 * removing it from its host with no re-host — destroys it (the
 * must-be-hosted invariant, enforced by the host chokepoint
 * `AetherHostMixin.unhostApp`).
 *
 * This is the third base of the three-base capability model: a
 * capability mixin (forums, the wallet, the calendar) composes around an
 * `Idea` co-composed with `AetherHostedMixin`, and is hosted on a person
 * or a device. Messages is the thinnest app: a row on `App` that the
 * person's comms looks for.
 *
 * **Invariant lives on the relation, not on `Idea`.** A bare `Idea`
 * (Biome / Zone / Controller) composes no `AetherHostedMixin` and is
 * entirely unaffected. Only an Idea that opts into this mixin gains the
 * must-be-hosted constraint.
 *
 * **Privacy.** `_host` is a runtime live-ref (an instance ref per
 * `ref-shapes.md`) — an app is re-cloned into its host from the host's
 * installed list, never persisted itself. It is TypeScript `private`,
 * NOT `#`-private: mixin instance state on a proxy-wrapped Stuff host
 * can't use hard-private slots (CLAUDE.md § Member Privacy
 * hard-constraint 2).
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { AetherHost } from "./AetherHost";

/** Public shape provided by AetherHostedMixin. */
export interface AetherHosted {
  /** The host this app is plugged into, or `null` when unhosted. */
  getHost(): (Stuff & AetherHost) | null;
  /**
   * Set the back-reference to the host. Call ONLY via the host
   * chokepoint (`AetherHostMixin.hostApp` / `unhostApp`); a hard
   * call-security gate keyed on the calling mixin isn't achievable
   * (caller-identity resolves to the host's concrete class, never to a
   * mixin inner class), so consistency comes from the sealed host
   * chokepoint being the sole legitimate mutator — never from a gate.
   */
  setHost(host: (Stuff & AetherHost) | null): void;
  /** Is this app currently hosted? */
  isAetherHosted(): boolean;
  /** The name a player reads (`Messages`); the row's key when none is authored. */
  getAppName(): string;
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

    /** Authored: the name a player reads. */
    appName = "";

    getAppName(): string {
      if (this.appName) return this.appName;
      const path = (this as unknown as Stuff).getTemplatePath() ?? "";
      return path.slice(path.lastIndexOf("/") + 1);
    }

    /**
     * R2.x live-ref cleanup. If this update is destructed directly
     * while still hosted (the misuse path — the chokepoint
     * `unhostApp` clears `_host` before it destructs, so the
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
      host._dropHostedApp(update);
    }
  };
}
