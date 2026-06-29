// ConnectionLogic — the hot-reloadable logic singleton behind
// ConnectionApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { ConnectionManager } from '../../../backend/ConnectionManager';
import type Interactive from '../Interactive';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { HasInteractive } from '../../lib/connection/HasInteractive';
import { EventApi } from '../../api/event';
import { Events } from '../../lib/events';
import geoip from 'geoip-lite';
import type { ConnectionOrigin } from '../../api/connection';

const ConnectionApiCallers = SecurityPolicies.FromModule(
  'mud/api/connection#ConnectionApi'
);

/** ISO-3166 alpha-2 → English region display name (e.g. `DE` → `Germany`). */
const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

/**
 * Resolve an IP to a country display name via the offline `geoip-lite`
 * dataset. Returns `undefined` for localhost / private / unroutable IPs
 * (no country) and on any lookup failure. Strips an IPv6-mapped-v4
 * prefix (`::ffff:127.0.0.1` → `127.0.0.1`) so dev/proxy addresses
 * resolve. Country is the only datum derived — never city/region here.
 */
function geolocateCountry(ip: string): string | undefined {
  try {
    const normalized = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    const hit = geoip.lookup(normalized);
    if (!hit?.country) {
      // Dev-only fallback: localhost / private IPs never geolocate, so a
      // local session would never show a country. When `DEV_GEO_COUNTRY`
      // is set, treat an unresolved IP as coming from it — a testing knob
      // only (production has real client IPs via X-Forwarded-For).
      return process.env.DEV_GEO_COUNTRY || undefined;
    }
    return REGION_NAMES.of(hit.country) ?? hit.country;
  } catch {
    return undefined;
  }
}

/**
 * ConnectionLogic — the hot-reloadable logic singleton behind
 * {@link ConnectionApi}.
 *
 * Lives at `/obj/api/connection` (a stateless `Stuff` singleton, no
 * backing `Template`); `ConnectionApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`). 0-guts: every
 * method forwards to the privileged `ConnectionManager` and makes no
 * intra-singleton self-calls, so the plain `FromModule` gate suffices.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class ConnectionLogic extends Idea {
  /** See {@link ConnectionApi.getInteractive}. */
  @CallSecurity(ConnectionApiCallers)
  public getInteractive(socketId: string): Interactive | undefined {
    return ConnectionManager.get().getInteractive(socketId);
  }

  /** See {@link ConnectionApi.recordOrigin}. */
  @CallSecurity(ConnectionApiCallers)
  public recordOrigin(interactive: Interactive, ip: string | undefined): void {
    if (!ip) return;
    interactive.setOrigin({ ip, country: geolocateCountry(ip) });
  }

  /** See {@link ConnectionApi.originOf}. */
  @CallSecurity(ConnectionApiCallers)
  public originOf(playerId: string): ConnectionOrigin {
    // Resolve the player's live connection by scanning Interactives for
    // the one whose holder carries this playerId, then read its transient
    // origin. Returns COUNTRY ONLY — the raw IP never leaves the
    // connection layer (the developer-gated IP read is deferred).
    for (const interactive of ConnectionManager.get().getAllInteractives()) {
      const holder = interactive.getHolder() as {
        getPlayerId?: () => string;
      } | null;
      if (holder?.getPlayerId?.() === playerId) {
        const origin = interactive.getOrigin();
        return origin?.country ? { country: origin.country } : {};
      }
    }
    return {};
  }

  /** See {@link ConnectionApi.getAllInteractives}. */
  @CallSecurity(ConnectionApiCallers)
  public getAllInteractives(): Interactive[] {
    return ConnectionManager.get().getAllInteractives();
  }

  /** See {@link ConnectionApi.getConnectionCount}. */
  @CallSecurity(ConnectionApiCallers)
  public getConnectionCount(): number {
    return ConnectionManager.get().getConnectionCount();
  }

  /** See {@link ConnectionApi.hasConnection}. */
  @CallSecurity(ConnectionApiCallers)
  public hasConnection(socketId: string): boolean {
    return ConnectionManager.get().hasConnection(socketId);
  }

  /** See {@link ConnectionApi.getSocketIds}. */
  @CallSecurity(ConnectionApiCallers)
  public getSocketIds(): string[] {
    return ConnectionManager.get().getSocketIds();
  }

  /** See {@link ConnectionApi.transfer}. */
  @CallSecurity(ConnectionApiCallers)
  public transfer(
    interactive: Interactive,
    target: HasInteractive & Stuff
  ): void {
    const previous = interactive.getHolder();
    if (previous === target) return;
    const previousLinkdead = previous?.isLinkdead() ?? true;
    const targetLinkdead = target.isLinkdead();

    if (previous) {
      previous.removeInteractive(interactive);
    }
    target.addInteractive(interactive);
    interactive.setHolder(target);

    // Fire Witness hooks AFTER state mutation. Per-connection
    // notifications fire for both endpoints; presence transitions
    // fire only when the count crosses 0.
    if (previous) {
      previous.onConnectionDetached?.();
      if (!previousLinkdead && previous.isLinkdead()) {
        previous.onLinkdead?.();
      }
    }
    target.onConnectionAttached?.(interactive);
    if (targetLinkdead && !target.isLinkdead()) {
      target.onLinkRestored?.();
    }

    // Cross-cutting global event for any observer that doesn't care
    // about a specific holder. Fires once per attach regardless of
    // whether the per-holder Witness hook is implemented.
    EventApi.emit(Events.ConnectionAttached, {
      interactiveId: interactive.stuffId,
      holderId: target.stuffId,
    });
  }

  /** See {@link ConnectionApi.detach}. */
  @CallSecurity(ConnectionApiCallers)
  public detach(interactive: Interactive): void {
    const previous = interactive.getHolder();
    if (!previous) return;
    const wasConnected = !previous.isLinkdead();
    previous.removeInteractive(interactive);
    interactive.setHolder(null);

    previous.onConnectionDetached?.();
    if (wasConnected && previous.isLinkdead()) {
      previous.onLinkdead?.();
    }
  }
}
