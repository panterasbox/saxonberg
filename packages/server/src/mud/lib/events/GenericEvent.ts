/**
 * GenericEvent<P> — escape hatch for events whose payload doesn't
 * warrant a dedicated class.
 *
 * Lets call sites use the class-based `EventApi.fire(event)` /
 * `EventApi.on(EventClass, listener)` surface for ad-hoc events
 * without declaring a one-off subclass. Prefer a concrete class when
 * the event has a stable payload shape that other subsystems will
 * consume.
 */

import { StuffEvent } from './StuffEvent';

export class GenericEvent<P = unknown> extends StuffEvent<P> {
  readonly kind: string;
  constructor(kind: string, public readonly payload: P) {
    super();
    this.kind = kind;
  }
}
