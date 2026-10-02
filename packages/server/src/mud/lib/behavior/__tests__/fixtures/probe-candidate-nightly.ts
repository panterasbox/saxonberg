/**
 * A `body` candidate that runs with nobody watching (`presenceGated =
 * false`) — the one kind of candidate an unwatched agent consults at all.
 * See `probe-candidate.ts`.
 */

import { Urgency, type TaskKind } from '../../Urgency';
import type { BrainContext, BrainStatics } from '../../brain';
import type { EngagementSlot } from '../../../activity/Engaged';
import { dial } from './probe-candidate';

export const brain = class {
  static label = 'cand-nightly';
  static kind: TaskKind = 'body';
  static summary = "fixture 'body' candidate that runs unwatched";
  static claims: readonly EngagementSlot[] = ['body'];
  static presenceGated = false;

  static urgency(_ctx: BrainContext): Urgency {
    return new Urgency(
      dial().bands['cand-nightly'] ?? 'idle',
      'is minded to cand-nightly',
    );
  }

  static act(_ctx: BrainContext): void {
    dial().ran.push('cand-nightly');
  }
} satisfies BrainStatics;
