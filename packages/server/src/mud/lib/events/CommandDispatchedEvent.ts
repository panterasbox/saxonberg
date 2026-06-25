/**
 * CommandDispatchedEvent — the participation *capture* seam, fired once
 * per genuine player command dispatch.
 *
 * Fired from `CommandGiverMixin._emitInputEcho` (the single-fire,
 * sensor-gated dispatch tail) when a giver issues a **recognized** command
 * — i.e. the parser bound a verb (a parse failure carries no `verb`, so it
 * never fires) and the dispatch carries an interactive origin (a real
 * player, never NPC / programmatic / cascaded dispatch). The consumer
 * faucet (`ConsumerLogic`) taps this and credits the giver an *active time
 * bucket*; the per-`(subject, bucket)` dedup at the faucet collapses
 * bursts, so this fires freely per command.
 *
 * Carries the giver's `stuffId` as `subjectId` — the same durable id
 * renown's reaction/reception signals key on, so the consumer-influence
 * projection (`max(0, renownOf) × participationOf`) combines the two
 * faucets on one key. `at` is the game-time witness; `realAt` is the wall
 * clock the active-bucket key and the real-time decay key on (the
 * deliberate divergence from renown's game-time decay — participation
 * measures a *human showing up*).
 */

export interface CommandDispatchedPayload {
  /** The giver's `stuffId` — the credited participating subject. */
  subjectId: string;
  /** The dispatch's `commandId` (the act key). */
  commandId: string;
  /** Game-time SECONDS witness (recorded for parity with renown). */
  at: number;
  /** Real-time epoch MILLISECONDS — the bucket key + decay clock. */
  realAt: number;
}

export class CommandDispatchedEvent {
  static readonly KIND = 'command.dispatched';
  readonly kind = CommandDispatchedEvent.KIND;
  constructor(public readonly payload: CommandDispatchedPayload) {}
}
