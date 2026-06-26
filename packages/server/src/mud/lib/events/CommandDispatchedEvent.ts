/**
 * CommandDispatchedEvent — the participation *capture* seam, fired once
 * per genuine player command dispatch.
 *
 * Fired from `CommandGiverMixin._emitInputEcho` (the single-fire,
 * sensor-gated dispatch tail) when a giver issues a **recognized** command
 * (a verb bound — a parse failure carries no `verb`, so it never fires)
 * from an **interactive** origin (a real player, never NPC / programmatic /
 * cascaded). `ConsumerLogic.installDispatchTap` taps it and credits the
 * giver an *active time bucket*; the per-`{subject, bucket}` dedup at the
 * faucet collapses bursts.
 *
 * **Receive-gated.** This event's payload is a per-subject activity signal
 * that fires on *private* commands too (inventory / settings / whisper / dm
 * / char-gen), so its subscribe side is locked to `ConsumerLogic` via
 * `EventApi.restrictSubscribe` — no other subscriber may watch it (snoop
 * prevention). Emit stays open; the bus still gives producer-ignorant
 * decoupling, but only the blessed consumer can listen.
 *
 * Carries the giver's `stuffId` as `subjectId` — the same durable id
 * renown's reaction/reception signals key on, so the consumer-influence
 * projection combines the two faucets on one key. `at` is the game-time
 * witness; `realAt` is the wall clock the active-bucket key + real-time
 * decay key on.
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
  /**
   * OPTIONAL — the durable `templatePath` of the giver's location (the
   * container holding them at dispatch), for the producer faucet's credit
   * routing. Absent for an incorporeal / location-less giver. The consumer
   * tap ignores it, so its rows are byte-identical whether present or not.
   */
  locationTemplatePath?: string;
  /**
   * OPTIONAL — the giver's own durable `templatePath` (the engaging player's
   * id, same space as the credited author), for the producer faucet's A≠P
   * self-credit exclusion. Absent for an un-templated giver.
   */
  actorTemplatePath?: string;
}

export class CommandDispatchedEvent {
  static readonly KIND = 'command.dispatched';
  readonly kind = CommandDispatchedEvent.KIND;
  constructor(public readonly payload: CommandDispatchedPayload) {}
}
