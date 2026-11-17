/**
 * ClientStateSource — your client state as a subscription
 * (navigation-server D1; owner, 2026-11-17: *"one mechanism that works for
 * everything"*).
 *
 * The keyed store `ClientStateMixin` holds — the cockpit's mode, the
 * shelf, the style overlay, what you watch — reaches the client on the
 * one subscription wire: the snapshot is the holder's
 * `snapshotClientState()`, and a change is one key `replace`d with its
 * new value. `pushClientStateUpdate(key, value)` on the holder is the
 * poke. `client-state-write` stays a REQUEST (the client asking to change
 * a key); this is the push half.
 *
 * Opened by the SERVER at session entry, silently
 * (`SESSION_SUBSCRIPTIONS.clientState`): its snapshot rides
 * `connection-established.clientState` so the first render has the
 * player's settings.
 */

import { Idea } from '../../lib/stuff/Idea';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext, Stuff } from '../../lib/stuff/Stuff';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { MixinApi } from '../../api/mixin';
import {
  SubscriptionSourceMixin,
  type Subscription,
  type SubscriptionRefusal,
} from '../../lib/subscription/SubscriptionSource';

/** The protocol's registry is the only caller of a source's three methods. */
const SubscriptionSourceCallers = SecurityPolicies.FromModule('/platform/idea/SubscriptionRegistry');

/** What a client-state poke carries: the key and the value to send. */
export interface ClientStatePoke {
  key: string;
  value: unknown;
}

export default class ClientStateSource extends SubscriptionSourceMixin(Idea) {
  /** Engine bookkeeping: the framework's own index, not world state. */
  static boundaryRole: BoundaryRole = 'infrastructure';

  /** A process-lifetime singleton is never culled by the residency sweep. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Runtime: each holder's open subscriptions. */
  private byHolder: Map<Stuff, Set<Subscription>> = new Map();

  @CallSecurity(SubscriptionSourceCallers)
  public override openSubscription(
    sub: Subscription,
    _params: unknown,
  ): Record<string, unknown> | SubscriptionRefusal {
    const holder = sub.holder();
    if (!holder || !MixinApi.isClientState(holder)) {
      return { refused: true, reason: 'permission', detail: 'the session drives no body with client state' };
    }
    let set = this.byHolder.get(holder);
    if (!set) {
      set = new Set();
      this.byHolder.set(holder, set);
    }
    set.add(sub);
    sub.state = holder;
    return holder.snapshotClientState();
  }

  @CallSecurity(SubscriptionSourceCallers)
  public override closeSubscription(sub: Subscription): void {
    const holder = sub.state as Stuff | undefined;
    if (!holder) return;
    const set = this.byHolder.get(holder);
    set?.delete(sub);
    if (set && set.size === 0) this.byHolder.delete(holder);
  }

  /** The holder changed `hint.key`: every one of its subscriptions is told. */
  @CallSecurity(SubscriptionSourceCallers)
  public override pokeSubscriptions(holder: Stuff | null, hint?: unknown): void {
    const poke = hint as ClientStatePoke | undefined;
    if (!holder || !poke || typeof poke.key !== 'string') return;
    for (const sub of this.byHolder.get(holder) ?? []) {
      sub.push([{ op: 'replace', key: poke.key, fields: poke.value }]);
    }
  }
}
