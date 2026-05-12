/**
 * DispatchApi — static helpers for the dispatch-response envelope.
 *
 * Owns the auto-escalation table that maps `Note['kind']` to a
 * `Status` weight: a note arriving on the `CommandContext`
 * accumulator may bump the outcome status if its implied weight
 * outranks the current value. Explicit `setStatus` overrides the
 * auto-escalation; `setStatus` is sticky.
 *
 * The accumulator itself lives on `CommandContext` (see
 * `api/command.ts`'s `createCommandContext` factory); this Api is
 * pure-static helper code.
 */

import type { Note, Status } from '@saxonberg/types';
import { SecurityApi } from './security';

const RANK: Record<Status, number> = {
  ok: 0,
  partial: 1,
  declined: 2,
  error: 3,
};

export class DispatchApi {
  /**
   * Auto-escalation table. A note of kind `kind` implies at least
   * this status. The accumulator merges by strongest-wins; explicit
   * `setStatus` opts out.
   */
  static autoEscalation(kind: Note['kind']): Status | undefined {
    switch (kind) {
      case 'quantity-clamped':
        return 'partial';
      case 'target-declined':
        return 'partial';
      case 'quantity-clamped-rejected':
        return 'declined';
      case 'empty-result':
        return 'declined';
      case 'controller-rejected':
        return 'declined';
      case 'mixin-missing':
        return 'declined';
      case 'locomotion-gate-failed':
        return 'declined';
      case 'slot-occupied':
        return 'declined';
      case 'command-rejected':
        return 'declined';
      case 'mql-error':
        return 'declined';
      case 'validator-failed':
        return 'declined';
      case 'controller-error':
        return 'error';
      // match-ambiguous, engagement-*: no escalation
      default:
        return undefined;
    }
  }

  /**
   * Numeric rank for a status. Higher value = stronger; the
   * accumulator keeps the highest-ranked status seen so far.
   */
  static rank(s: Status): number {
    return RANK[s];
  }
}

SecurityApi.decorateApiClass(DispatchApi);
