/**
 * PressFeedSource — the press ticker's live window as a subscription
 * (navigation-server D1).
 *
 * The snapshot is the window the PressBoard keeps (pins first, recency
 * ordered, retract/expiry filtered, length capped); a change is one
 * release `replace`d (upserted) or `remove`d, keyed by its `releaseId`.
 * The press's own mutators are the poke — the answer is everyone's, so
 * the poke names no holder.
 *
 * Opened by the SERVER at session entry, silently
 * (`SESSION_SUBSCRIPTIONS.pressFeed`): its snapshot rides
 * `connection-established.releaseWindow`.
 */

import { Idea } from '../../lib/stuff/Idea';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext, Stuff } from '../../lib/stuff/Stuff';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { PressApi } from '../../api/press';
import {
  SubscriptionSourceMixin,
  type Subscription,
} from '../../lib/subscription/SubscriptionSource';
import type { ReleaseFeedFrame, ReleaseRow } from '@saxonberg/types';

/** The protocol's registry is the only caller of a source's three methods. */
const SubscriptionSourceCallers = SecurityPolicies.FromModule('/platform/idea/SubscriptionRegistry');

export default class PressFeedSource extends SubscriptionSourceMixin(Idea) {
  /** Engine bookkeeping: the framework's own index, not world state. */
  static boundaryRole: BoundaryRole = 'infrastructure';

  /** A process-lifetime singleton is never culled by the residency sweep. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Runtime: every open subscription — the window is everyone's. */
  private subs: Set<Subscription> = new Set();

  @CallSecurity(SubscriptionSourceCallers)
  public override openSubscription(sub: Subscription, _params: unknown): ReleaseRow[] {
    this.subs.add(sub);
    return PressApi.recent().map((b) => PressApi.toRow(b));
  }

  @CallSecurity(SubscriptionSourceCallers)
  public override closeSubscription(sub: Subscription): void {
    this.subs.delete(sub);
  }

  /** A release was published, edited or retracted (`hint`, a feed frame). */
  @CallSecurity(SubscriptionSourceCallers)
  public override pokeSubscriptions(_holder: Stuff | null, hint?: unknown): void {
    const frame = hint as ReleaseFeedFrame | undefined;
    if (!frame || frame.kind !== 'release') return;
    const change =
      frame.action === 'upsert'
        ? { op: 'replace' as const, key: frame.row.releaseId, fields: frame.row }
        : { op: 'remove' as const, key: frame.releaseId };
    for (const sub of this.subs) sub.push([change]);
  }
}
