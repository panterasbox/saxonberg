/**
 * BehaviorBeat — a short, generic `DurativeActivity` that occupies a
 * set of engagement slots for a brief duration, then completes with no
 * effect. It is how an *instant* brain's slot `claims` become **real
 * and time-extended** in the shared `EngagedMixin` slot map: when
 * `greets` attends to an arriving player, it starts a beat claiming
 * `attention`, so a concurrently-wandering `wanders` brain (which
 * `requiresFree: attention`) sees the slot occupied on its next cadence
 * tick and yields — "the NPC stops wandering while it's greeting you."
 *
 * The beat carries no payload and its `onComplete` is a no-op: the
 * brain already emitted its prose at fire time; the beat exists purely
 * to hold the slot for the contention window. All beats share the
 * registered type `'behavior-beat'`; slots vary per instance. Cancel
 * with `cancel behavior-beat`.
 */

import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type { EngagementSlot, Engaged } from '../activity/Engaged';
import type { DurativeActivity } from '../../api/scheduler';
import { SchedulerApi } from '../../api/scheduler';

export const BEHAVIOR_BEAT_TYPE = 'behavior-beat' as const;

export class BehaviorBeat implements DurativeActivity {
  engagementId = '';
  readonly type = BEHAVIOR_BEAT_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots: ReadonlySet<EngagementSlot>;
  readonly interruptibleBy: ReadonlySet<AbortReason> = new Set<AbortReason>();
  readonly cancelable = true;
  readonly duration: number;
  readonly replaceableBy: readonly string[] = [];

  constructor(
    actor: Stuff & Engaged,
    slots: readonly EngagementSlot[],
    durationMs: number
  ) {
    this.actor = actor;
    this.slots = new Set(slots);
    this.duration = durationMs;
  }

  onStart(): void {
    this.startedAt = Date.now();
  }

  onComplete(): void {
    // No-op: the brain emitted at fire time; the beat only held a slot.
  }

  onAbort(_reason: AbortReason): void {
    // No rollback — nothing was mutated.
  }

  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }
}

SchedulerApi.registerActivity(BEHAVIOR_BEAT_TYPE, BehaviorBeat);
