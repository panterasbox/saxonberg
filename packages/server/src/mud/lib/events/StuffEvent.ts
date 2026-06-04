/**
 * StuffEvent — abstract base for the class-per-event vocabulary.
 *
 * Sits alongside the string-keyed `EventApi.emit` / `EventApi.on`
 * surface. The class-based forms (`EventApi.fire(event)` and
 * `EventApi.on(EventClass, listener)`) route through the same pub/sub
 * bus — the class is sugar at the call site, the access-control
 * mechanism is unchanged.
 *
 * Concrete subclasses live one-per-file under this directory:
 *
 *   - FieldChangedEvent — fact-mixin field assignment
 *   - PropertyChangedEvent — PropertiedMixin property-bag write
 *   - ShadowChangedEvent — shadow attach/detach/mutate (declared
 *     in Wave 1; firing wires up in a later subsystem)
 *   - GenericEvent<P> — escape hatch when no specific class fits
 *
 * Each subclass exposes a static `KIND` string used as the bus key.
 * Listeners receive an event-shaped object with `kind` and `payload`;
 * class-instance reconstruction is not part of the contract.
 */

export abstract class StuffEvent<P = unknown> {
  abstract readonly kind: string;
  abstract readonly payload: P;
}
