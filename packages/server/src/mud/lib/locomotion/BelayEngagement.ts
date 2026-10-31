/**
 * BelayEngagement — ⭐ **holding a rope for somebody who climbs** (cordage
 * D12), a `SustainedEngagement` on the belayer's `hands` and `attention`.
 *
 * The belayer holds a rope whose free end is made fast round the climber.
 * While the engagement holds, a fall the climber takes is asked of it
 * first: the shock (the climber and what they carry, times the fall
 * factor) against what the belayer can hold — their own strength, wound
 * round a post if there is one in their room (the capstan: every turn
 * multiplies the hold by `e^(μ·2π)`), never more than the rope itself.
 * Caught, the climber hangs on the rope and is hauled in unhurt. A person
 * tied on with a clove hitch is not held: it works loose under the jerk.
 *
 * Ends by `belay off`, by the belayer letting go of the rope or the climber
 * being cast off it — the engagement reads the rope at the moment of the
 * fall, so a belay nobody is holding any more catches nothing.
 */

import type { SustainedEngagement } from '../../api/scheduler';
import type { EngagementSlot, Engaged } from '../activity/Engaged';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../stuff/Stuff';
import type Rope from '../../platform/thing/Rope';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';

declare module '@saxonberg/types' {
  interface AbortReasonRegistry {
    /** The belayer took the climber off belay. */
    'belay-off': true;
  }
}

/** The activity type key registered with the scheduler. */
export const BELAY_TYPE = 'belay';

const BELAY_SLOTS: readonly EngagementSlot[] = ['hands', 'attention'];

/** Rope on a wooden post — the friction coefficient of the capstan. */
const MU = 0.3;

/** Turns round a post when there is one; a body alone is one turn round the hips. */
const POST_TURNS = 3;

/** What one turn round a post would hold, in words. */
const HOLD_WORDS: readonly [number, string][] = [
  [120, 'it would hold a man, just'],
  [400, 'it would hold a man falling'],
  [Infinity, 'it would hold a horse'],
];

export class BelayEngagement implements SustainedEngagement {
  engagementId = '';
  readonly type = BELAY_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots = new Set<EngagementSlot>(BELAY_SLOTS);
  readonly interruptibleBy = new Set<AbortReason>();
  readonly cancelable = true;

  private readonly rope: Rope;
  private readonly climber: Stuff;
  private ended = false;

  constructor(belayer: Stuff & Engaged, rope: Rope, climber: Stuff) {
    this.actor = belayer;
    this.rope = rope;
    this.climber = climber;
  }

  onStart(): void {
    this.startedAt = Date.now();
    this.rope._setBelay(this);
  }

  onAbort(_reason: AbortReason): void {
    if (this.ended) return;
    this.ended = true;
    this.rope._setBelay(null);
  }

  /** The belayer's hands are held here — their destruction tears it down. */
  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }

  public getClimber(): Stuff {
    return this.climber;
  }

  /** Is the belay still a belay: the belayer holding the rope, the climber on its end? */
  public isLive(): boolean {
    const belayer = this.actor as unknown as Stuff;
    return !this.ended && !belayer.isDestroyed() && this.rope.getHolder() === belayer && this.rope.getOnEnd() === this.climber;
  }

  /** ⭐ What the belayer can hold, kg — their strength round the post, never more than the rope. */
  public holdKg(): number {
    const belayer = this.actor as unknown as Stuff;
    const strain = MixinApi.isLoadBearing(belayer) ? belayer.getStrainCeiling().rawValue() : 40;
    const turns = this.postHere() ? POST_TURNS : 1;
    return Math.min(this.rope.effectiveKg(), strain * Math.exp(MU * 2 * Math.PI * turns));
  }

  /** The hold, in words (*round the post three times — it would hold a horse*). */
  public holdWords(): string {
    const kg = this.holdKg();
    const how = this.postHere() ? `round ${this.postHere()!.getPresentation()} three times` : 'round your hips';
    return `${how} — ${HOLD_WORDS.find(([upTo]) => kg < upTo)![1]}`;
  }

  /**
   * ⭐ A fall, asked of the belay: caught → the climber is hauled in to the
   * belayer's room unhurt and `true`; else `false` and the fall stands.
   */
  public catches(climber: Stuff, shockKg: number): boolean {
    if (climber !== this.climber || !this.isLive()) return false;
    // A clove hitch round a person works loose under the jerk.
    if (this.rope.getKnots().some((k) => k.end === 'free' && k.key === 'clove-hitch')) return false;
    if (shockKg > this.holdKg()) return false;
    const belayer = this.actor as unknown as Stuff;
    const room = MixinApi.isContainable(belayer) ? belayer.getContainer() : null;
    if (room === null || !MixinApi.isContainable(climber)) return false;
    if (climber.getContainer() !== room) ContainmentApi.move(climber, room);
    return true;
  }

  /** A fixture in the belayer's room to take turns round, if any. */
  private postHere(): Stuff | null {
    const belayer = this.actor as unknown as Stuff;
    const room = MixinApi.isContainable(belayer) ? belayer.getContainer() : null;
    if (room === null || !MixinApi.isContainer(room)) return null;
    return room.getContents().find((c) => !c.isAgent?.() && MixinApi.isContainable(c) && c.isFixedInPlace() && c !== (this.rope as unknown as Stuff)) ?? null;
  }
}
