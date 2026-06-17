/**
 * ReactionFiredEvent — the renown seam.
 *
 * Fired by `ReactionRegistry.onScopedEmote` on a **flip-on** (a
 * newly-present reaction), never on a toggle-off. Carries the raw,
 * UNINTERPRETED emote + tags — no valence/polarity mapping, no score.
 * This build ships **no consumer**: the reputation build is the trap
 * the non-goals warn against (a Sybil-gameable provisional score), so
 * the event exists only as the typed substrate a later aggregator
 * subscribes to. Mirrors the `FieldChangedEvent` DTO shape.
 *
 * See docs/subsystems/reactions.md.
 */

export interface ReactionFiredPayload {
  /** Durable stuffId of the reactor. */
  reactorId: string;
  /** The act's `payload.speaker.stuffId` (the credited author). */
  subjectId: string;
  /** The act being reacted to (`meta.commandId`). */
  commandId: string;
  /** Raw emote verb, or a free-form marker. */
  emote: string;
  /** Raw, uninterpreted tags — no valence mapping. */
  tags: string[];
  customText?: string;
  /** Circle-context: `'channel:<groupRef>'` | `'location:<id>'`. */
  scope: string;
  /** True when `reactorId === subjectId` (emitted, but identifiable). */
  selfReaction: boolean;
}

export class ReactionFiredEvent {
  static readonly KIND = 'reaction.fired';
  readonly kind = ReactionFiredEvent.KIND;
  constructor(public readonly payload: ReactionFiredPayload) {}
}
