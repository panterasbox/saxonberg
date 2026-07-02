/**
 * EventSubscriptions — singleton Idea holding the EventApi side-table:
 * the per-event listener registry and the bounded history ring buffer.
 *
 * Distinct from `EventRegistry`: that one holds event-property
 * *declarations* (and per-property `checkAccess` policies). This one
 * holds runtime *subscriptions* (who's listening) and the bounded
 * recent-payload history. Two singletons, two responsibilities.
 *
 * Lives at `/obj/EventSubscriptions`. The thin `EventApi` facade at
 * `api/event.ts` is the only legitimate caller — every public method
 * here carries `@CallSecurity(FromModule('/api/event#EventApi'))`
 * so external code that grabs the Stuff via `StuffApi.findByTemplatePath`
 * gets a reference but `SecurityError` is thrown on any method call.
 *
 * HMR-aware: reload of `api/event.ts` invalidates only the cached
 * pointer in the Api; subscriber state survives. Reload of THIS file
 * re-clones the Stuff per HotReloadApi's pattern, which resets the
 * subscriber table — listeners must re-register after such a reload.
 */

import { Idea } from '../lib/stuff/Idea';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { EventApi } from '../api/event';

/** See WorldClockRegistry — same gate shape, same rationale. */
const EventApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/event#EventApi'),
  SecurityPolicies.SelfOnly,
);

const HISTORY_LIMIT = 100;

/**
 * Structural shape that callers register. The Api creates these in
 * its `on()` body; we hold them in a Set keyed by event name.
 */
export interface SubscriptionRecord {
  __invoke(payload: unknown, ctx: unknown): Promise<void> | void;
  __filter?: (payload: unknown) => boolean;
  __until?: (payload: unknown) => boolean;
  __lastPayload: unknown;
  unsubscribe(): void;
  readonly eventName: string;
  readonly lastPayload: unknown;
}

export interface HistoryRecord {
  payload: unknown;
  timestamp: number;
  triggeringContext: unknown;
}

export default class EventSubscriptions extends Idea {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  private subs: Map<string, Set<SubscriptionRecord>> = new Map();
  private history: Map<string, HistoryRecord[]> = new Map();

  /* ─── subscription registration ─── */

  @CallSecurity(EventApiCallers)
  public addSubscription(name: string, sub: SubscriptionRecord): void {
    let set = this.subs.get(name);
    if (!set) {
      set = new Set();
      this.subs.set(name, set);
    }
    set.add(sub);
  }

  @CallSecurity(EventApiCallers)
  public removeSubscription(name: string, sub: SubscriptionRecord): void {
    const set = this.subs.get(name);
    if (!set) return;
    set.delete(sub);
    if (set.size === 0) this.subs.delete(name);
  }

  /**
   * Snapshot the live subscriber set for `name` so listeners that
   * mutate the set during dispatch (e.g. `until`-driven unsubscribe)
   * don't trip "modified during iteration" surprises. Returns `null`
   * when no subscribers are registered — the caller can short-circuit
   * the fan-out.
   */
  @CallSecurity(EventApiCallers)
  public snapshotSubscribers(name: string): SubscriptionRecord[] | null {
    const set = this.subs.get(name);
    if (!set || set.size === 0) return null;
    return [...set];
  }

  /* ─── history (bounded ring buffer) ─── */

  @CallSecurity(EventApiCallers)
  public recordHistory(name: string, entry: HistoryRecord): void {
    let hist = this.history.get(name);
    if (!hist) {
      hist = [];
      this.history.set(name, hist);
    }
    hist.push(entry);
    if (hist.length > HISTORY_LIMIT) {
      hist.splice(0, hist.length - HISTORY_LIMIT);
    }
  }

  @CallSecurity(EventApiCallers)
  public getHistory(name: string, limit?: number): HistoryRecord[] {
    const hist = this.history.get(name) ?? [];
    if (typeof limit === 'number') {
      return hist.slice(Math.max(0, hist.length - limit));
    }
    return [...hist];
  }

  /* ─── test seam ─── */

  @CallSecurity(EventApiCallers)
  public _clearAll(): void {
    this.subs.clear();
    this.history.clear();
  }
}

// Side-effect: hand the class to EventApi for its lazy-create path.
EventApi._registerSubsClass(EventSubscriptions);
