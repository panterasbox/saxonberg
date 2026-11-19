/**
 * WhereaboutsSource — what you perceive from here, now, as seven sections
 * (navigation-server D1, D7).
 *
 * The snapshot is every section the body can read
 * (`Perceiver.navigation()`); a change is one section `replace`d under its
 * name.
 *
 * ⭐⭐ **What wakes it is ONE declared table, {@link WHEREABOUTS_WAKES}**
 * (navigation-server review): a section re-reads when something it showed
 * fires a field change — the same `FieldChangedEvent` a live card wakes on
 * — and the table says which field of which thing (your body, your place, a
 * way out, something you carry) wakes which sections, and why. Nothing else
 * wakes it but the two things no command does: the clock's hour (the sky
 * over the place) and a place that moves under you (a ship, a river), which
 * poke it ({@link pokeSubscriptions}). A command that changes nothing it
 * shows (`say`) costs nothing. Every delta names the command whose work
 * fired the change (`causes`).
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
import { EventApi, type Subscription as BusSubscription } from '../../api/event';
import { FieldChangedEvent, type FieldChangedPayload } from '../../lib/events/FieldChangedEvent';
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

/** Whose field a wake is about, relative to the body. */
export type WakeWho = 'body' | 'place' | 'way' | 'carried';

/** One row of {@link WHEREABOUTS_WAKES}. */
export interface WhereaboutsWake {
  who: WakeWho;
  /** The field that fired; `*` is any field of that thing. */
  field: string;
  sections: readonly NavSectionName[];
  /** In a player's words: what happened. */
  why: string;
}

/**
 * ⭐⭐ **Everything that changes where-you-are, in one place** — read by the
 * source, and the list a reader (or the subsystem doc) is pointed at. A row
 * is a field some mixin fires (`SubscriptionApi.fireFieldChange`); adding a
 * thing the panes show means adding its row here and its fire at its
 * setter, never a hand-placed poke.
 */
export const WHEREABOUTS_WAKES: readonly WhereaboutsWake[] = [
  { who: 'body', field: 'container', sections: NAV_SECTION_NAMES, why: 'you moved' },
  { who: 'body', field: 'contents', sections: ['you', 'ways', 'place'], why: 'what you hold or carry changed — your hands, your load, a key, a lamp, a lead' },
  { who: 'body', field: 'posture', sections: ['you', 'ways', 'place'], why: 'you sat, stood, lay or stooped — your reach, a doorway, a low ceiling' },
  { who: 'body', field: 'engagements', sections: ['you', 'ways'], why: 'a fight or an act began or ended' },
  { who: 'body', field: 'hauling', sections: ['you', 'ways'], why: 'you hitched or unhitched a cart' },
  { who: 'body', field: 'occupants', sections: ['you', 'ways'], why: 'someone mounted you, or got down' },
  { who: 'body', field: 'settings', sections: ['you'], why: 'you changed your pace' },
  { who: 'place', field: 'contents', sections: ['place'], why: 'who and what is here changed — the crowd, the light' },
  { who: 'place', field: 'name', sections: ['place'], why: 'the place was renamed' },
  { who: 'way', field: '*', sections: ['ways'], why: 'a way out changed — a door opened, shut or locked; a gangway bolted' },
  { who: 'carried', field: 'on', sections: ['you', 'place'], why: 'a lamp you carry was lit or put out' },
];

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
  /** Runtime: stuffId → the holders watching it, and as whom. */
  private watch: Map<string, Map<Stuff, Set<WakeWho>>> = new Map();
  /** Runtime: each holder's watched stuffIds (to unwatch on a re-read). */
  private watched: Map<Stuff, Set<string>> = new Map();
  /** Runtime: the one field-change listener, while anybody is subscribed. */
  private listener: BusSubscription<unknown> | null = null;

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
    this.rewatch(holder);
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
        this.unwatch(holder);
      }
      return;
    }
  }

  /**
   * The two wakes no field carries: the clock's hour (`null` — everyone's
   * sky) and a place that moved under a holder (a ship, a river).
   */
  @CallSecurity(SubscriptionSourceCallers)
  public override pokeSubscriptions(holder: Stuff | null, hint?: unknown): void {
    const names = (hint as WhereaboutsPoke | undefined)?.names ?? NAV_SECTION_NAMES;
    if (holder === null) {
      for (const h of this.byHolder.keys()) this.mark(h, names);
      return;
    }
    if (this.byHolder.has(holder)) this.mark(holder, names);
  }

  /* ─── the wake table ─── */

  /** A field fired somewhere: the holders watching that thing hear the table's sections. */
  private onFieldChanged(payload: FieldChangedPayload): void {
    const watchers = this.watch.get(payload.target);
    if (!watchers) return;
    for (const [holder, whos] of watchers) {
      const names = new Set<NavSectionName>();
      for (const wake of WHEREABOUTS_WAKES) {
        if (!whos.has(wake.who)) continue;
        if (wake.field !== '*' && wake.field !== payload.field) continue;
        for (const n of wake.sections) names.add(n);
      }
      if (names.size > 0) this.mark(holder, [...names]);
    }
  }

  /** Mark sections dirty for a holder, note the cause, arm one flush. */
  private mark(holder: Stuff, names: readonly NavSectionName[]): void {
    const subs = this.byHolder.get(holder);
    if (!subs || subs.size === 0) return;
    // ⭐ The command whose work fired this is in the context HERE; the
    // flush runs on a later beat. The delta names it.
    for (const sub of subs) sub.noteCause();
    let marks = this.dirty.get(holder);
    if (!marks) {
      marks = new Set();
      this.dirty.set(holder, marks);
    }
    for (const n of names) marks.add(n);
    this.arm();
  }

  /** Watch what the holder's sections showed: its body, its place, its ways, what it carries. */
  private rewatch(holder: Stuff): void {
    this.unwatch(holder);
    const add = (thing: Stuff | null | undefined, who: WakeWho): void => {
      if (!thing) return;
      let byHolder = this.watch.get(thing.stuffId);
      if (!byHolder) {
        byHolder = new Map();
        this.watch.set(thing.stuffId, byHolder);
      }
      let whos = byHolder.get(holder);
      if (!whos) {
        whos = new Set();
        byHolder.set(holder, whos);
      }
      whos.add(who);
      let mine = this.watched.get(holder);
      if (!mine) {
        mine = new Set();
        this.watched.set(holder, mine);
      }
      mine.add(thing.stuffId);
    };
    add(holder, 'body');
    if (MixinApi.isContainer(holder)) for (const t of holder.getContents()) add(t, 'carried');
    const place = MixinApi.isContainable(holder) ? holder.getContainer() : null;
    if (place) {
      add(place, 'place');
      if (MixinApi.isExitable(place)) {
        for (const exit of place.obviousExitsFor(holder)) {
          add(exit as unknown as Stuff, 'way');
          add(exit.getBoundary() as unknown as Stuff | null, 'way');
        }
      }
    }
    if (this.listener === null) {
      this.listener = EventApi.on<FieldChangedPayload>(FieldChangedEvent.KIND, (p) => this.onFieldChanged(p));
    }
  }

  private unwatch(holder: Stuff): void {
    const mine = this.watched.get(holder);
    if (mine) {
      for (const id of mine) {
        const byHolder = this.watch.get(id);
        byHolder?.delete(holder);
        if (byHolder && byHolder.size === 0) this.watch.delete(id);
      }
      this.watched.delete(holder);
    }
    if (this.byHolder.size === 0 && this.listener !== null) {
      this.listener.unsubscribe();
      this.listener = null;
    }
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
        // What it shows now is what it watches now (a move, a door, a lamp).
        this.rewatch(holder);
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
