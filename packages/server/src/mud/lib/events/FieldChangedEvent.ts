/**
 * FieldChangedEvent — fact-mixin field assignment.
 *
 * Fired whenever a mixin setter mutates a persistent field that other
 * subsystems may want to observe (Named.setName, Visible.set*Description,
 * Detailed.setDetail / removeDetail, Tangible.setMaterial / setMass,
 * Globbable.setQuantity, etc.).
 *
 * The payload's `field` discriminator names the mixin-declared field
 * that changed. `PropertyChangedEvent` uses a separate KIND with a
 * `property` discriminator so the property-bag namespace and the
 * fact-mixin field namespace stay distinct on the meta-bus
 * dependency index.
 *
 * Concrete event classes don't extend a common base — they satisfy
 * the `BusEvent<P>` structural contract (in `api/event.ts`) by
 * declaring `kind: string` + `payload: P` directly.
 */

export interface FieldChangedPayload {
  target: string;          // StuffId
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export class FieldChangedEvent {
  static readonly KIND = 'stuff.fieldChanged';
  readonly kind = FieldChangedEvent.KIND;
  constructor(public readonly payload: FieldChangedPayload) {}
}
