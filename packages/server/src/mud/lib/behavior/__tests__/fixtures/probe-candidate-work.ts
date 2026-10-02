/**
 * A `work` candidate that claims `hands` — the beat's slot-holder, so a
 * preemption has something real to cut. See `probe-candidate.ts`.
 */

import { Urgency, type TaskKind } from '../../Urgency';
import type { BrainContext, BrainStatics } from '../../brain';
import type { EngagementSlot } from '../../../activity/Engaged';
import type { AbortReason } from '@saxonberg/types';
import { dial } from './probe-candidate';

export const brain = class {
  static label = 'cand-work';
  static kind: TaskKind = 'work';
  static summary = "fixture 'work' candidate that claims hands";
  static claims: readonly EngagementSlot[] = ['hands'];
  static interruptibleBy: readonly AbortReason[] = ['called', 'outranked'];

  static urgency(_ctx: BrainContext): Urgency {
    return new Urgency(
      dial().bands['cand-work'] ?? 'idle',
      'is minded to cand-work',
    );
  }

  static act(_ctx: BrainContext): void {
    dial().ran.push('cand-work');
  }
} satisfies BrainStatics;
