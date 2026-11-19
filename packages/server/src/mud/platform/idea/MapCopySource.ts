/**
 * MapCopySource — your map, as a copy the client holds
 * (navigation-server D1).
 *
 * The snapshot is every Locality document you hold a claim in (or those
 * under one `locality` prefix), each claim projected for the wire — its
 * key, and every path tagged among the spoiler levels. After that, a
 * change is one claim `replace`d under `<locality>|<claim key>`: the
 * cartographer's one write chokepoint (`NavigationApi.recordPlace`) pokes
 * this source with exactly the claims the write grew or bumped.
 *
 * ⛔ Nobody else's map can be asked for: the copy is always the map of
 * whoever the session drives (`mapOwnerKey()` — the person, so a shade
 * reads its person's map), and there is no owner parameter.
 */

import { Idea } from '../../lib/stuff/Idea';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext, Stuff } from '../../lib/stuff/Stuff';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { MixinApi } from '../../api/mixin';
import { NavigationApi } from '../../api/navigation';
import {
  SubscriptionSourceMixin,
  type Subscription,
} from '../../lib/subscription/SubscriptionSource';
import type { MapCopySnapshot, WireClaim } from '@saxonberg/types';

/** The protocol's registry is the only caller of a source's three methods. */
const SubscriptionSourceCallers = SecurityPolicies.FromModule('/platform/idea/SubscriptionRegistry');

/** What a map write pokes this source with — the claims it grew or bumped, projected. */
export interface MapCopyPoke {
  ownerKey: string;
  locality: string;
  claims: readonly WireClaim[];
}

interface CopyState {
  ownerKey: string;
  /** The prefix asked for; `''` is the whole map. */
  prefix: string;
}

export default class MapCopySource extends SubscriptionSourceMixin(Idea) {
  /** Engine bookkeeping: the framework's own index, not world state. */
  static boundaryRole: BoundaryRole = 'infrastructure';

  /** A process-lifetime singleton is never culled by the residency sweep. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Runtime: each owner key's open copies. */
  private byOwner: Map<string, Set<Subscription>> = new Map();

  @CallSecurity(SubscriptionSourceCallers)
  public override async openSubscription(
    sub: Subscription,
    params: unknown,
  ): Promise<MapCopySnapshot> {
    const holder = sub.holder();
    const raw = (params as { locality?: unknown } | undefined)?.locality;
    const prefix = typeof raw === 'string' ? raw.replace(/^\/+|\/+$/g, '') : '';
    // ⭐ A body that keeps no map (a guest, a role) holds an empty copy,
    // and says so by being empty — the sections still flow.
    const ownerKey =
      holder && MixinApi.isCartographer(holder) && holder.keepsMaps() ? holder.mapOwnerKey() : '';
    sub.state = { ownerKey, prefix } satisfies CopyState;
    if (!ownerKey) return { documents: [] };
    let set = this.byOwner.get(ownerKey);
    if (!set) {
      set = new Set();
      this.byOwner.set(ownerKey, set);
    }
    set.add(sub);
    return NavigationApi.readMapCopy(ownerKey, prefix);
  }

  @CallSecurity(SubscriptionSourceCallers)
  public override closeSubscription(sub: Subscription): void {
    const state = sub.state as CopyState | undefined;
    if (!state?.ownerKey) return;
    const set = this.byOwner.get(state.ownerKey);
    set?.delete(sub);
    if (set && set.size === 0) this.byOwner.delete(state.ownerKey);
  }

  /** A map write: every copy of that owner's map under that Locality is told. */
  @CallSecurity(SubscriptionSourceCallers)
  public override pokeSubscriptions(_holder: Stuff | null, hint?: unknown): void {
    const poke = hint as MapCopyPoke | undefined;
    if (!poke?.ownerKey || poke.claims.length === 0) return;
    const subs = this.byOwner.get(poke.ownerKey);
    if (!subs || subs.size === 0) return;
    const changes = poke.claims.map((claim) => ({
      op: 'replace' as const,
      key: `${poke.locality}|${claim.key}`,
      fields: { locality: poke.locality, claim },
    }));
    for (const sub of subs) {
      const { prefix } = sub.state as CopyState;
      if (prefix && poke.locality !== prefix && !poke.locality.startsWith(`${prefix}/`)) continue;
      sub.push(changes);
    }
  }
}
