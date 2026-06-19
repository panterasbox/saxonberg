/**
 * CommReceivedEvent — the renown *reception* seam, on the RECEIVING end.
 *
 * Fired from `SensorMixin.onMessage` when a perceiver actually receives a
 * command-scoped frame — i.e. **after** `filterMessage`, so it is
 * perception-gated (a deaf / shadowed / disconnected listener never fires
 * it). Carries only the **perceiver** and the act's `commandId`; renown
 * recovers the speaker + scope from the reactable-act registry
 * (`ReactionApi.actInfo`), then mints a small engagement signal *for the
 * speaker* (`subject`), credited *by* this listener (`source`),
 * rate-limited + log-saturated.
 *
 * Fires per genuine receipt (N per utterance) — the receive-side cost,
 * accepted for accuracy; a later debounce can coalesce it. Frames without
 * a reactable act (look results, system notices) are filtered out on the
 * renown side: `actInfo` returns `null` for them.
 */

export interface CommReceivedPayload {
  /** The receiving Sensor's `stuffId` (the listener / `source`). */
  perceiverId: string;
  /** The received frame's `meta.commandId` — the act key. */
  commandId: string;
}

export class CommReceivedEvent {
  static readonly KIND = 'comm.received';
  readonly kind = CommReceivedEvent.KIND;
  constructor(public readonly payload: CommReceivedPayload) {}
}
