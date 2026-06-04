/**
 * GenericEvent<P> — escape hatch for events whose payload doesn't
 * warrant a dedicated class.
 *
 * Lets call sites use the class-based `EventApi.fire(event)` surface
 * for ad-hoc events without declaring a one-off subclass. Prefer a
 * concrete class when the event has a stable payload shape that other
 * subsystems will consume; reach for `GenericEvent` only for truly
 * one-off events.
 *
 * GenericEvent has no static `KIND` (the `kind` is per-instance), so
 * it routes via the string-keyed `EventApi.on(name, listener)` form,
 * not the class-based `EventApi.on(EventClass, listener)`.
 *
 * Concrete event classes don't extend a common base — they satisfy
 * the `BusEvent<P>` structural contract (in `api/event.ts`) by
 * declaring `kind: string` + `payload: P` directly.
 */

export class GenericEvent<P = unknown> {
  readonly kind: string;
  constructor(kind: string, public readonly payload: P) {
    this.kind = kind;
  }
}
