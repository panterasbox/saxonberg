/**
 * ShadowChangedEvent — declared for use by subscribable-field
 * descriptors that want re-resolution on shadow attach / detach /
 * mutate.
 *
 * Ships declared but unfired. The firing site lights up with the
 * shadow lifecycle hooks in a later subsystem build. Subscribable-
 * field descriptors that participate in shadowed projection
 * (Name / Visible / Detail) declare this event in their `changes`
 * array so the meta-bus index is wired end-to-end; until the firing
 * site exists, the listener is silent.
 *
 * Concrete event classes don't extend a common base — they satisfy
 * the `BusEvent<P>` structural contract (in `api/event.ts`) by
 * declaring `kind: string` + `payload: P` directly.
 */

export interface ShadowChangedPayload {
  target: string;                              // host StuffId
  shadow: string;                              // shadow class name (or shadow id when stable)
  cause: 'attach' | 'detach' | 'mutate';
}

export class ShadowChangedEvent {
  static readonly KIND = 'stuff.shadowChanged';
  readonly kind = ShadowChangedEvent.KIND;
  constructor(public readonly payload: ShadowChangedPayload) {}
}
