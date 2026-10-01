/**
 * A candidate whose beat yields to NOTHING (`interruptibleBy: []`) — the
 * `tree-dialogue` shape, where an empty set is a deliberate statement
 * rather than the old default-of-nothing. See `probe-candidate.ts`.
 */

import { Urgency, type TaskKind } from '../../Urgency';
import type { BrainContext, BrainStatics } from '../../brain';
import type { EngagementSlot } from '../../../activity/Engaged';
import type { AbortReason } from '@saxonberg/types';
import { dial } from './probe-candidate';

export const brain = class {
  static label = 'cand-fixed';
  static kind: TaskKind = 'social';
  static summary = 'fixture candidate whose beat yields to nothing at all';
  static claims: readonly EngagementSlot[] = ['voice', 'attention'];
  static interruptibleBy: readonly AbortReason[] = [];

  static urgency(_ctx: BrainContext): Urgency {
    return new Urgency(
      dial().bands['cand-fixed'] ?? 'idle',
      'is minded to cand-fixed',
    );
  }

  static act(_ctx: BrainContext): void {
    dial().ran.push('cand-fixed');
  }
} satisfies BrainStatics;
