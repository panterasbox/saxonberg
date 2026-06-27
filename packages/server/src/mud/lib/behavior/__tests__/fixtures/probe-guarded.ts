/**
 * Test fixture brain — like `probe`, but **not** presence-gated and
 * **requires `attention` free**. Used to prove slot contention: while a
 * BehaviorBeat occupies `attention`, a cadence fire of this brain yields
 * (no log entry); once the slot frees, it fires again.
 */

import type { BrainContext, BrainStatics } from '../../brain';
import type { EngagementSlot } from '../../../activity/Engaged';

const g = globalThis as unknown as { __guardedFires?: number };
g.__guardedFires ??= 0;

export const brain = class {
  static label = 'probe-guarded';
  static presenceGated = false;
  static claims: readonly EngagementSlot[] = ['body'];
  static requiresFree: readonly EngagementSlot[] = ['attention'];

  static act(_ctx: BrainContext): void {
    const gg = globalThis as unknown as { __guardedFires: number };
    gg.__guardedFires += 1;
  }
} satisfies BrainStatics;
