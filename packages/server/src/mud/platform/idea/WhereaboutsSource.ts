/**
 * WhereaboutsSource — what you perceive from here, now, as seven sections
 * (navigation-server D1, D7).
 *
 * The snapshot is every section the body can read
 * (`Perceiver.navigation()`); a change is one section `replace`d under its
 * name. The body pokes this source (`SaxonbergClient.refreshNavigation`)
 * with the sections that may have changed — on arrival, after its own
 * command, when a way it can see changes state, when the place it stands in
 * moves.
 *
 * ⭐ One flush per beat, here: a poke adds to a dirty set per holder and
 * arms ONE `ScheduleApi.schedule(0, …)`. The flush computes the dirty
 * sections once per holder, compares each with what each of that holder's
 * subscriptions was last sent (canonical JSON), and pushes one delta per
 * subscription holding only the sections that differ — each stamped with
 * its own `v`, +1 when it is sent. A recompute in flight absorbs later
 * marks into the next flush. A holder with no subscription costs nothing.
 */

import { Idea } from '../../lib/stuff/Idea';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext, Stuff } from '../../lib/stuff/Stuff';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { MixinApi } from '../../api/mixin';
import { ScheduleApi } from '../../api/schedule';
import {
  SubscriptionSourceMixin,
  type Subscription,
  type SubscriptionRefusal,
} from '../../lib/subscription/SubscriptionSource';
import type { SubscriptionChange, NavSectionName, NavSections, WhereaboutsSnapshot } from '@saxonberg/types';
import { NAV_SECTION_NAMES } from '@saxonberg/types';

/** The protocol's registry is the only caller of a source's three methods. */
const SubscriptionSourceCallers = SecurityPolicies.FromModule('/platform/idea/SubscriptionRegistry');

/** What a body pokes this source with: the sections that may have changed (all, when absent). */
export interface WhereaboutsPoke {
  names?: readonly NavSectionName[];
}

/** What one subscription was last sent, per section. */
interface SentState {
  json: Map<NavSectionName, string>;
  v: Map<NavSectionName, number>;
}

export default class WhereaboutsSource extends SubscriptionSourceMixin(Idea) {
  /** Engine bookkeeping: the framework's own index, not world state. */
  static boundaryRole: BoundaryRole = 'infrastructure';

  /** A process-lifetime singleton is never culled by the residency sweep. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** Runtime: each holder's open subscriptions. */
  private byHolder: Map<Stuff, Set<Subscription>> = new Map();
  /** Runtime: the sections each holder has been told may have changed. */
  private dirty: Map<Stuff, Set<NavSectionName>> = new Map();
  /** Runtime: a flush is armed or running. */
  private flushing = false;

  @CallSecurity(SubscriptionSourceCallers)
  public override async openSubscription(
    sub: Subscription,
    _params: unknown,
  ): Promise<WhereaboutsSnapshot | SubscriptionRefusal> {
    const holder = sub.holder();
    if (!holder || !MixinApi.isPerceiver(holder)) {
      return { refused: true, reason: 'permission', detail: 'the session drives no body that perceives' };
    }
    const state: SentState = { json: new Map(), v: new Map() };
    sub.state = state;
    const sections = await holder.navigation();
    if (!sub.isOpen()) return { refused: true, reason: 'closed', detail: 'unsubscribed while opening' };
    let set = this.byHolder.get(holder);
    if (!set) {
      set = new Set();
      this.byHolder.set(holder, set);
    }
    set.add(sub);
    const stamped: NavSections = {};
    for (const name of NAV_SECTION_NAMES) {
      if (!(name in sections)) continue;
      const value = this.stamp(state, name, sections[name]);
      (stamped as Record<string, unknown>)[name] = value;
    }
    return { sections: stamped };
  }

  @CallSecurity(SubscriptionSourceCallers)
  public override closeSubscription(sub: Subscription): void {
    for (const [holder, set] of this.byHolder) {
      if (!set.delete(sub)) continue;
      if (set.size === 0) {
        this.byHolder.delete(holder);
        this.dirty.delete(holder);
      }
      return;
    }
  }

  /** The body says these sections may have changed. */
  @CallSecurity(SubscriptionSourceCallers)
  public override pokeSubscriptions(holder: Stuff | null, hint?: unknown): void {
    if (!holder || !this.byHolder.has(holder)) return;
    const names = (hint as WhereaboutsPoke | undefined)?.names ?? NAV_SECTION_NAMES;
    let marks = this.dirty.get(holder);
    if (!marks) {
      marks = new Set();
      this.dirty.set(holder, marks);
    }
    for (const n of names) marks.add(n);
    this.arm();
  }

  /* ─── internals ─── */

  private arm(): void {
    if (this.flushing) return;
    this.flushing = true;
    ScheduleApi.schedule(0, () => {
      void this.flush();
    });
  }

  private async flush(): Promise<void> {
    try {
      const batch = [...this.dirty];
      this.dirty.clear();
      for (const [holder, names] of batch) {
        const subs = this.byHolder.get(holder);
        if (!subs || subs.size === 0 || !MixinApi.isPerceiver(holder) || holder.isDestroyed()) continue;
        const sections = await holder.navigation([...names]);
        for (const sub of subs) {
          if (!sub.isOpen()) continue;
          const state = sub.state as SentState;
          const changes: SubscriptionChange[] = [];
          for (const name of names) {
            // A read that failed is absent: nothing is sent for it.
            if (!(name in sections)) continue;
            const value = (sections as Record<string, unknown>)[name];
            const json = JSON.stringify(value);
            if (state.json.get(name) === json) continue;
            changes.push({ op: 'replace', key: name, fields: this.stamp(state, name, value) });
          }
          sub.push(changes);
        }
      }
    } catch (err) {
      console.warn(`WhereaboutsSource: a flush failed: ${(err as Error).message}`);
    } finally {
      this.flushing = false;
      // ⭐ Marks that arrived while this flush ran are the next flush's.
      if (this.dirty.size > 0) this.arm();
    }
  }

  /** Remember what is being sent, and stamp the section's `v`. */
  private stamp(state: SentState, name: NavSectionName, value: unknown): unknown {
    state.json.set(name, JSON.stringify(value));
    const v = (state.v.get(name) ?? 0) + 1;
    state.v.set(name, v);
    return value === null ? null : { ...(value as object), v };
  }
}
