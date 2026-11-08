/**
 * WheelEngagement — ⭐ **a hand at the jack's wheel** (cordage, the review's
 * lens pass: a ropewalk is a crew). A `SustainedEngagement` on the turner's
 * `hands`: while they hold it, the jack has somebody turning its wheel, and
 * whoever lays a strand or a rope on it lays at full pace — alone, a layer
 * turns the wheel themselves between walks and lays at half.
 *
 * Started by `turn jack`, ended by `turn back jack`, by walking away (the
 * jack reads its turner's room at every plan), or by anything else the
 * turner's hands are wanted for.
 */

import type { SustainedEngagement } from '@saxonberg/server/mud/api/scheduler';
import type { EngagementSlot, Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type RopeJack from '../thing/RopeJack';

declare module '@saxonberg/types' {
  interface AbortReasonRegistry {
    /** The turner let go of the jack's wheel. */
    'wheel-released': true;
  }
}

/** The activity type key registered with the scheduler. */
export const WHEEL_TYPE = 'cordage-wheel';

const WHEEL_SLOTS: readonly EngagementSlot[] = ['hands'];

export class WheelEngagement implements SustainedEngagement {
  engagementId = '';
  readonly type = WHEEL_TYPE;
  readonly actor: Stuff & Engaged;
  startedAt = 0;
  readonly slots = new Set<EngagementSlot>(WHEEL_SLOTS);
  readonly interruptibleBy = new Set<AbortReason>();
  readonly cancelable = true;

  private readonly jack: RopeJack;
  private ended = false;

  constructor(turner: Stuff & Engaged, jack: RopeJack) {
    this.actor = turner;
    this.jack = jack;
  }

  onStart(): void {
    this.startedAt = Date.now();
    this.jack._setWheelHand(this.actor as unknown as Stuff);
  }

  onAbort(_reason: AbortReason): void {
    if (this.ended) return;
    this.ended = true;
    if (this.jack.getWheelHand() === (this.actor as unknown as Stuff)) this.jack._setWheelHand(null);
  }

  /** The turner's hands are held here — their destruction tears it down. */
  getHost(): Stuff | null {
    return this.actor as unknown as Stuff;
  }
}
