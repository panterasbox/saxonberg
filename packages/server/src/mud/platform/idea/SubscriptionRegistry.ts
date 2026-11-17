/**
 * SubscriptionRegistry — the one table of live subscriptions, for every
 * source (navigation-server D1). Reached only through
 * {@link SubscriptionApi} and the session's own verbs on `Interactive`.
 *
 * ⭐⭐ It holds exactly what each of the two shipped registries used to
 * hold a copy of: the per-session id table, the per-subscription `rev`,
 * the three emits (`subscription-result` · `-delta` · `-error`) and the
 * disconnect sweep. What a subscription MEANS — its query, its index, its
 * diff — stays in its source.
 *
 * ## Finding a source
 *
 * A source is named on the wire by its template path and loaded on use.
 * There is no list. If an instance already stands at the path it is
 * asked whether it is a source; otherwise the row's CLASS is read
 * (`StuffApi.classForRef` loads the module and instantiates nothing) and
 * refused unless it composes `SubscriptionSourceMixin` — only then is the
 * singleton stood up. A client can therefore not make the server stand up
 * an arbitrary singleton by naming it.
 *
 * ## `rev`
 *
 * The snapshot is `rev` 0; each delta is the previous `rev + 1`. A socket
 * neither drops nor reorders inside a connection and nothing here drops,
 * so a break is a defect. Repair is always the same act: subscribe again.
 *
 * ## Synchronous when it can be
 *
 * When the source already stands and answers synchronously the open is
 * synchronous too — a live card's open rides its own `card-opened` and
 * must have its answer in hand.
 */

import { Idea } from '../../lib/stuff/Idea';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext, Stuff } from '../../lib/stuff/Stuff';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import type Interactive from './Interactive';
import type {
  Subscription,
  SubscriptionRefusal,
  SubscriptionSource,
} from '../../lib/subscription/SubscriptionSource';
import type { SubscriptionChange } from '@saxonberg/types';

/** The Api (poke, tests) and the session's own verbs. */
const SubscriptionApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/subscription#SubscriptionApi'),
  SecurityPolicies.FromModule('/platform/idea/Interactive'),
);

/** Options on an open. */
export interface SubscriptionOpenOptions {
  /**
   * Send no `subscription-result`: the caller carries the snapshot on its
   * own envelope (a live card's `card-opened`). Its deltas still flow.
   */
  silent?: boolean;
}

type Source = Stuff & SubscriptionSource;

/** One live subscription — the handle its source holds. */
class Handle implements Subscription {
  state: unknown = undefined;
  rev = 0;
  open = true;
  /** Changes pushed before the snapshot went out — sent right after it. */
  early: SubscriptionChange[][] | null = [];

  constructor(
    readonly id: string,
    readonly interactive: Interactive,
    readonly source: string,
    readonly src: Source,
    private readonly owner: {
      delta(h: Handle, changes: SubscriptionChange[]): void;
      fail(h: Handle, reason: string, detail?: string): void;
      forget(h: Handle): void;
    },
  ) {}

  holder(): Stuff | null {
    return this.interactive.getHolder() as Stuff | null;
  }

  push(changes: SubscriptionChange[]): void {
    if (!this.open || changes.length === 0) return;
    if (this.early !== null) {
      this.early.push(changes);
      return;
    }
    this.owner.delta(this, changes);
  }

  fail(reason: string, detail?: string): void {
    if (!this.open) return;
    this.owner.fail(this, reason, detail);
  }

  end(): void {
    if (!this.open) return;
    this.owner.forget(this);
  }

  isOpen(): boolean {
    return this.open;
  }
}

function isRefusal(answer: unknown): answer is SubscriptionRefusal {
  return (
    typeof answer === 'object' &&
    answer !== null &&
    (answer as { refused?: unknown }).refused === true
  );
}

function isThenable(v: unknown): v is PromiseLike<unknown> {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { then?: unknown }).then === 'function'
  );
}

export default class SubscriptionRegistry extends Idea {
  /** Engine bookkeeping: the framework's own index, not world state. */
  static boundaryRole: BoundaryRole = 'infrastructure';

  /** A process-lifetime singleton is never culled by the residency sweep. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  private table: Map<Interactive, Map<string, Handle>> = new Map();

  /** See `Interactive` (the session's own verb). */
  @CallSecurity(SubscriptionApiCallers)
  public open(
    interactive: Interactive,
    subscriptionId: string,
    source: string,
    params: unknown,
    opts: SubscriptionOpenOptions = {},
  ): unknown | null | Promise<unknown | null> {
    if (this.table.get(interactive)?.has(subscriptionId)) {
      this.sendError(interactive, subscriptionId, 'duplicate', 'subscriptionId already in use');
      return null;
    }
    const standing = StuffApi.findByTemplatePath<Stuff>(source);
    if (standing) {
      if (!MixinApi.isSubscriptionSource(standing)) {
        this.sendError(interactive, subscriptionId, 'source', `${source} is not a subscription source`);
        return null;
      }
      return this.openOn(interactive, subscriptionId, source, standing, params, opts);
    }
    return this.load(source).then((src) => {
      if (src === null) {
        this.sendError(interactive, subscriptionId, 'source', `${source} is not a subscription source`);
        return null;
      }
      if (this.table.get(interactive)?.has(subscriptionId)) {
        this.sendError(interactive, subscriptionId, 'duplicate', 'subscriptionId already in use');
        return null;
      }
      return this.openOn(interactive, subscriptionId, source, src, params, opts);
    });
  }

  /** See `Interactive` (the session's own verb). */
  @CallSecurity(SubscriptionApiCallers)
  public close(interactive: Interactive, subscriptionId: string): void {
    const h = this.table.get(interactive)?.get(subscriptionId);
    if (h === undefined) return;
    this.drop(h);
    h.src.closeSubscription(h);
  }

  /** See `Interactive` (the session's own verb). */
  @CallSecurity(SubscriptionApiCallers)
  public closeAll(interactive: Interactive): void {
    const bucket = this.table.get(interactive);
    if (bucket === undefined) return;
    for (const h of [...bucket.values()]) {
      this.drop(h);
      try {
        h.src.closeSubscription(h);
      } catch (err) {
        console.warn(`SubscriptionRegistry: closing ${h.source} for a gone session failed:`, err);
      }
    }
    this.table.delete(interactive);
  }

  /** See {@link SubscriptionApi.poke}. */
  @CallSecurity(SubscriptionApiCallers)
  public poke(source: string, holder: Stuff, hint?: unknown): void {
    const src = StuffApi.findByTemplatePath<Stuff>(source);
    // ⭐ A source nobody has subscribed to has not been stood up: poking
    // it costs nothing, and nothing is loaded to be told.
    if (!src || !MixinApi.isSubscriptionSource(src)) return;
    src.pokeSubscriptions(holder, hint);
  }

  /** See `Interactive` (the session's own verb). */
  @CallSecurity(SubscriptionApiCallers)
  public has(interactive: Interactive, subscriptionId: string): boolean {
    return this.table.get(interactive)?.has(subscriptionId) === true;
  }

  /** See {@link SubscriptionApi._countForTesting}. */
  @CallSecurity(SubscriptionApiCallers)
  public count(): number {
    let n = 0;
    for (const b of this.table.values()) n += b.size;
    return n;
  }

  /* ─── internals ─── */

  private async load(source: string): Promise<Source | null> {
    let cls;
    try {
      cls = await StuffApi.classForRef(source);
    } catch {
      return null;
    }
    // ⭐ The row's class is asked BEFORE anything is stood up.
    if (!MixinApi.hasMixin(cls, Mixins.SubscriptionSource)) return null;
    const src = await StuffApi.singleton<Stuff>(source);
    return MixinApi.isSubscriptionSource(src) ? src : null;
  }

  private openOn(
    interactive: Interactive,
    id: string,
    source: string,
    src: Source,
    params: unknown,
    opts: SubscriptionOpenOptions,
  ): unknown | null | Promise<unknown | null> {
    const h = new Handle(id, interactive, source, src, {
      delta: (handle, changes) => this.sendDelta(handle, changes),
      fail: (handle, reason, detail) => this.failHandle(handle, reason, detail),
      forget: (handle) => this.drop(handle),
    });
    let bucket = this.table.get(interactive);
    if (!bucket) {
      bucket = new Map();
      this.table.set(interactive, bucket);
    }
    bucket.set(id, h);
    let answer: unknown;
    try {
      answer = src.openSubscription(h, params);
    } catch (err) {
      answer = { refused: true, reason: 'resolve', detail: err instanceof Error ? err.message : String(err) };
    }
    if (isThenable(answer)) {
      return Promise.resolve(answer).then(
        (a) => this.settle(h, a, opts),
        (err: unknown) =>
          this.settle(h, { refused: true, reason: 'resolve', detail: err instanceof Error ? err.message : String(err) }, opts),
      );
    }
    return this.settle(h, answer, opts);
  }

  private settle(h: Handle, answer: unknown, opts: SubscriptionOpenOptions): unknown | null {
    if (!h.open) return null;
    if (isRefusal(answer)) {
      this.drop(h);
      try {
        h.src.closeSubscription(h);
      } catch {
        // the source kept nothing worth sweeping
      }
      this.sendError(h.interactive, h.id, answer.reason, answer.detail);
      return null;
    }
    if (opts.silent !== true) {
      h.interactive.sendEnvelope({
        type: 'subscription-result',
        subscriptionId: h.id,
        rev: 0,
        snapshot: answer,
      });
    }
    const early = h.early ?? [];
    h.early = null;
    for (const changes of early) this.sendDelta(h, changes);
    return answer;
  }

  private sendDelta(h: Handle, changes: SubscriptionChange[]): void {
    if (!h.open || changes.length === 0) return;
    h.rev += 1;
    h.interactive.sendEnvelope({
      type: 'subscription-delta',
      subscriptionId: h.id,
      rev: h.rev,
      changes,
    });
  }

  private failHandle(h: Handle, reason: string, detail?: string): void {
    this.drop(h);
    try {
      h.src.closeSubscription(h);
    } catch (err) {
      console.warn(`SubscriptionRegistry: closing failed ${h.source} subscription:`, err);
    }
    this.sendError(h.interactive, h.id, reason, detail);
  }

  private drop(h: Handle): void {
    h.open = false;
    const bucket = this.table.get(h.interactive);
    if (bucket?.get(h.id) === h) {
      bucket.delete(h.id);
      if (bucket.size === 0) this.table.delete(h.interactive);
    }
  }

  private sendError(interactive: Interactive, subscriptionId: string, reason: string, detail?: string): void {
    interactive.sendEnvelope({
      type: 'subscription-error',
      subscriptionId,
      reason,
      ...(detail !== undefined ? { detail } : {}),
    });
  }
}
