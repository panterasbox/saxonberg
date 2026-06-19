/**
 * CommActEmittedEvent — the renown *reception* seam.
 *
 * Fired once per **reactable communication act** (say / shout / whisper /
 * emote / chat post) at `ReactionRegistry.noteReactableAct` — the same
 * one-per-utterance chokepoint that makes an act reactable. Carries the
 * speaker (`subjectId`) and the act's audience-`scope` (`location:<id>` |
 * `channel:<groupRef>`); the renown reception tap resolves that scope to
 * the actual listeners and mints a small per-listener engagement signal
 * for the speaker (rate-limited + log-saturated).
 *
 * Distinct from `ReactionFiredEvent` (an *active*, signed reaction): this
 * is *passive reception* — being heard. Mirrors the `FieldChangedEvent`
 * DTO shape. The reactions/messaging layer ships only the typed event; the
 * renown consumer is a separate tap.
 */

export interface CommActEmittedPayload {
  /** The act's speaker — `(req.subject as Stuff).stuffId`. */
  subjectId: string;
  /** Audience scope: `'location:<stuffId>'` | `'channel:<groupRef>'`. */
  scope: string;
  /** The act key (`meta.commandId`). */
  commandId: string;
}

export class CommActEmittedEvent {
  static readonly KIND = 'comm.act.emitted';
  readonly kind = CommActEmittedEvent.KIND;
  constructor(public readonly payload: CommActEmittedPayload) {}
}
