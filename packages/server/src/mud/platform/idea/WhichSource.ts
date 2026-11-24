/**
 * ⭐ WhichSource — what you can type here, kept current (the which build).
 * The source behind a kept `which` card: per subscription it holds the
 * word the card asked (`which`, `which #<id>`), re-reads `CommandApi.which`
 * when something it depends on moves, and pushes the whole answer under
 * one key, `answer`, when it changed — never on a beat where it did not.
 *
 * ⭐ It wakes on two things (which D10):
 *   - **the command stack** — the three sealed stack methods on
 *     `CommandGiverMixin` poke it (a move, a pick-up, an app installed, a
 *     shadow attached): every verb the line accepts changes there;
 *   - **what the answer depends on** — a `FieldChangedEvent` on the body,
 *     the place it stands in, or any source on its stack (a lamp lit or
 *     put out, a thing found, a validator's state).
 * One flush per beat per holder (`ScheduleApi.schedule(0, …)`), the cause
 * noted at the mark so the card's ChangeMark names the command.
 *
 * Shape: `WhereaboutsSource`'s — per-holder subscriptions, a watch set
 * over `FieldChangedEvent`, a dirty set, one flush per beat.
 */

import { Idea } from '../../lib/stuff/Idea';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext, Stuff } from '../../lib/stuff/Stuff';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import type { CommandGiver } from '../../lib/command/CommandGiver';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { MixinApi } from '../../api/mixin';
import { ScheduleApi } from '../../api/schedule';
import { CommandApi } from '../../api/command';
import { StuffApi } from '../../api/stuff';
import { EventApi, type Subscription as BusSubscription } from '../../api/event';
import { FieldChangedEvent, type FieldChangedPayload } from '../../lib/events/FieldChangedEvent';
import {
  SubscriptionSourceMixin,
  type Subscription,
  type SubscriptionRefusal,
} from '../../lib/subscription/SubscriptionSource';
import type { WhichAnswer, WhichSubscriptionParams } from '@saxonberg/types';

const SubscriptionSourceCallers = SecurityPolicies.FromModule('/platform/idea/SubscriptionRegistry');

/** One subscription's own state: what it asked, and the JSON it last sent. */
interface SentState {
  params: WhichSubscriptionParams;
  json: string;
}

export default class WhichSource extends SubscriptionSourceMixin(Idea) {
  static boundaryRole: BoundaryRole = 'infrastructure';

  /** Residency veto — a source standing for open subscriptions is never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  private byHolder: Map<Stuff, Set<Subscription>> = new Map();
  private dirty: Set<Stuff> = new Set();
  private flushing = false;
  /** stuffId → the holders whose answer reads it. */
  private watch: Map<string, Set<Stuff>> = new Map();
  /** holder → the stuffIds it watches (to unwatch). */
  private watched: Map<Stuff, Set<string>> = new Map();
  private listener: BusSubscription<unknown> | null = null;

  @CallSecurity(SubscriptionSourceCallers)
  public override async openSubscription(
    sub: Subscription,
    params: unknown,
  ): Promise<WhichAnswer | SubscriptionRefusal> {
    const holder = sub.holder();
    if (!holder || !MixinApi.isCommandGiver(holder)) {
      return { refused: true, reason: 'permission', detail: 'the session drives no body that types' };
    }
    const p = (params as WhichSubscriptionParams | undefined) ?? {};
    const state: SentState = { json: '', params: p };
    sub.state = state;
    const answer = await this.read(holder, p);
    if (!sub.isOpen()) return { refused: true, reason: 'closed', detail: 'unsubscribed while opening' };
    state.json = JSON.stringify(answer);
    let set = this.byHolder.get(holder);
    if (!set) {
      set = new Set();
      this.byHolder.set(holder, set);
    }
    set.add(sub);
    this.rewatch(holder);
    return answer;
  }

  @CallSecurity(SubscriptionSourceCallers)
  public override closeSubscription(sub: Subscription): void {
    for (const [holder, set] of this.byHolder) {
      if (!set.delete(sub)) continue;
      if (set.size === 0) {
        this.byHolder.delete(holder);
        this.dirty.delete(holder);
        this.unwatch(holder);
      }
      return;
    }
  }

  @CallSecurity(SubscriptionSourceCallers)
  public override pokeSubscriptions(holder: Stuff | null, _hint?: unknown): void {
    if (holder === null) {
      for (const h of this.byHolder.keys()) this.mark(h);
      return;
    }
    if (this.byHolder.has(holder)) this.mark(holder);
  }

  /**
   * The answer for `holder`. ⚠ A word that names nothing any more (the
   * counter left behind) answers EMPTY with its ask kept, rather than
   * closing the card: the card says what it was asked and that nothing
   * answers now.
   */
  private async read(holder: Stuff & CommandGiver, p: WhichSubscriptionParams): Promise<WhichAnswer> {
    // The thing by id (the binder named it once); the read re-asks the gates.
    const thing = p.thingId ? StuffApi.findById(p.thingId) : null;
    const r = await CommandApi.which(holder, {
      clashes: p.clashes === true,
      ...(thing ? { thing } : {}),
      ...(p.verb ? { verb: p.verb } : {}),
    });
    if (r.ok) return r.facts;
    return { ask: { mode: p.verb ? 'verb' : 'thing', command: 'which' }, groups: [] };
  }

  private onFieldChanged(payload: FieldChangedPayload): void {
    const holders = this.watch.get(payload.target);
    if (!holders) return;
    for (const h of holders) this.mark(h);
  }

  private mark(holder: Stuff): void {
    const subs = this.byHolder.get(holder);
    if (!subs || subs.size === 0) return;
    for (const sub of subs) sub.noteCause();
    this.dirty.add(holder);
    this.arm();
  }

  /** Watch the body, its place, and every source on its stack. */
  private rewatch(holder: Stuff): void {
    this.unwatch(holder);
    const mine = new Set<string>();
    const add = (thing: Stuff | null | undefined): void => {
      if (!thing || mine.has(thing.stuffId)) return;
      mine.add(thing.stuffId);
      let holders = this.watch.get(thing.stuffId);
      if (!holders) {
        holders = new Set();
        this.watch.set(thing.stuffId, holders);
      }
      holders.add(holder);
    };
    add(holder);
    add(MixinApi.isContainable(holder) ? holder.getContainer() : null);
    if (MixinApi.isCommandGiver(holder)) for (const a of holder.getAffordances()) add(a.source);
    this.watched.set(holder, mine);
    if (this.listener === null) {
      this.listener = EventApi.on<FieldChangedPayload>(FieldChangedEvent.KIND, (p) => this.onFieldChanged(p));
    }
  }

  private unwatch(holder: Stuff): void {
    const mine = this.watched.get(holder);
    if (mine) {
      for (const id of mine) {
        const holders = this.watch.get(id);
        holders?.delete(holder);
        if (holders && holders.size === 0) this.watch.delete(id);
      }
      this.watched.delete(holder);
    }
    if (this.byHolder.size === 0 && this.listener !== null) {
      this.listener.unsubscribe();
      this.listener = null;
    }
  }

  private arm(): void {
    if (this.flushing) return;
    this.flushing = true;
    // `flush` catches everything it does, so the promise it returns never rejects.
    ScheduleApi.schedule(0, () => this.flush());
  }

  private async flush(): Promise<void> {
    try {
      const batch = [...this.dirty];
      this.dirty.clear();
      for (const holder of batch) {
        const subs = this.byHolder.get(holder);
        if (!subs || subs.size === 0 || holder.isDestroyed() || !MixinApi.isCommandGiver(holder)) continue;
        for (const sub of subs) {
          if (!sub.isOpen()) continue;
          const state = sub.state as SentState;
          const answer = await this.read(holder, state.params);
          const json = JSON.stringify(answer);
          if (json === state.json) continue;
          state.json = json;
          sub.push([{ op: 'replace', key: 'answer', fields: answer }]);
        }
        this.rewatch(holder);
      }
    } catch (err) {
      console.warn(`WhichSource: a flush failed: ${(err as Error).message}`);
    } finally {
      this.flushing = false;
      if (this.dirty.size > 0) this.arm();
    }
  }
}
