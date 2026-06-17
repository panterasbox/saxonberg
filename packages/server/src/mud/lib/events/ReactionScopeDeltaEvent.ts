/**
 * ReactionScopeDeltaEvent — the overlay-ready, sink-agnostic seam.
 *
 * Fired by `ReactionRegistry.flush()` once per audience-scope that moved
 * in a tick, carrying that scope's coalesced act-states. Lets the
 * registry reach the read-only `service:broadcast` principal — which has
 * **no Interactive** — without the registry knowing anything about
 * broadcast sockets. `BroadcastFeed` lazily installs a listener and
 * forwards scope-filtered deltas, exactly as it taps
 * `Events.StreamStateChanged`.
 *
 * The carried act-states are the **server-numbers** projection: buckets
 * + total + aggregated, with an empty per-recipient `sample` (the
 * overlay shows aggregate counts, not viewer-personalized names).
 *
 * See docs/subsystems/reactions.md and docs/subsystems/livestream.md.
 */

import type { ReactionActState } from '@saxonberg/types';

export interface ReactionScopeDeltaPayload {
  /** Audience-scope key: `'channel:<groupRef>'` | `'location:<id>'`. */
  scope: string;
  /** The acts that moved in this scope this tick (canonical, no sample). */
  acts: ReactionActState[];
}

export class ReactionScopeDeltaEvent {
  static readonly KIND = 'reaction.scopeDelta';
  readonly kind = ReactionScopeDeltaEvent.KIND;
  constructor(public readonly payload: ReactionScopeDeltaPayload) {}
}
