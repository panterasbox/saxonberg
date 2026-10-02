/**
 * Test fixture brains for the **deliberation beat** — three candidates
 * whose urgency the test drives through a `globalThis` dial, so the
 * arbiter's sort, its switch prose and its preemption can be asserted
 * without a real NPC.
 *
 * ⚠ One module, three exports — which is NOT the brain module shape
 * (`export const brain = class`, one export, enforced by
 * `lint:instanceable` invariant 8). Fixtures under `__tests__/` are
 * exempt there, and three sibling files would say the same thing three
 * times.
 */

import { Urgency, type TaskKind } from '../../Urgency';
import type { BrainContext, BrainStatics } from '../../brain';
import type { EngagementSlot } from '../../../activity/Engaged';
import type { AbortReason } from '@saxonberg/types';

export interface CandidateDial {
  /** band per brain label; absent ⇒ idle. */
  bands: Record<string, 'idle' | 'wanted' | 'pressing' | 'critical'>;
  /** every act that ran, in order. */
  ran: string[];
  /** every free-form emote the host emitted, in order. */
  said: string[];
}

const g = globalThis as unknown as { __candidateDial?: CandidateDial };
g.__candidateDial ??= { bands: {}, ran: [], said: [] };

export function dial(): CandidateDial {
  return (globalThis as unknown as { __candidateDial: CandidateDial })
    .__candidateDial;
}

function make(
  label: string,
  kind: TaskKind,
  opts: {
    claims?: readonly EngagementSlot[];
    presenceGated?: boolean;
    interruptibleBy?: readonly AbortReason[];
  } = {},
) {
  return class {
    static label = label;
    static kind: TaskKind = kind;
    static summary = `fixture candidate '${label}' for the beat tests`;
    static claims: readonly EngagementSlot[] = opts.claims ?? [];
    static presenceGated = opts.presenceGated ?? true;
    static interruptibleBy: readonly AbortReason[] =
      opts.interruptibleBy ?? ['called', 'outranked'];

    static urgency(_ctx: BrainContext): Urgency {
      const band = dial().bands[label] ?? 'idle';
      return new Urgency(band, `is minded to ${label}`);
    }

    static act(_ctx: BrainContext): void {
      dial().ran.push(label);
    }
  } satisfies BrainStatics;
}

/** `filler`, claims nothing — the floor. */
export const brain = make('cand-filler', 'filler');
