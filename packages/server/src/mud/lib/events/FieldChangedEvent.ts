/**
 * FieldChangedEvent — fact-mixin field assignment.
 *
 * Fired whenever a mixin setter mutates a persistent field that other
 * subsystems may want to observe (Named.setName, Visible.set*Description,
 * Detailed.setDetail / removeDetail, Tangible.setMaterial / setMass,
 * Globbable.setQuantity, etc.).
 *
 * The payload's `field` discriminator names the mixin-declared field
 * that changed. PropertyChangedEvent uses a separate KIND with a
 * `property` discriminator so the property-bag namespace and the
 * fact-mixin field namespace stay distinct on the meta-bus dependency
 * index.
 */

import { EventApi } from '../../api/event';
import { StuffEvent } from './StuffEvent';

export interface FieldChangedPayload {
  target: string;          // StuffId
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export class FieldChangedEvent extends StuffEvent<FieldChangedPayload> {
  static readonly KIND = 'stuff.fieldChanged';
  readonly kind = FieldChangedEvent.KIND;
  constructor(public readonly payload: FieldChangedPayload) {
    super();
  }
}

/**
 * Compress the noop-check + capture + assign + fire boilerplate at
 * every fact-mixin setter into one call.
 *
 * Caller pattern:
 *
 *   setName(value: string): void {
 *     this.name = fireFieldChange(this, 'name', this.name, value);
 *   }
 *
 * Strict-equals (Object.is) compares old vs new; on equal it skips
 * emission and returns `oldValue`. On change it fires
 * FieldChangedEvent and returns `newValue`. Either way the caller
 * assigns the return value, so the setter body is a single line.
 *
 * The helper is opt-in: a setter with side-effects beyond the
 * assign can still inline.
 */
export function fireFieldChange<T>(
  target: { stuffId: string },
  field: string,
  oldValue: T,
  newValue: T,
): T {
  if (Object.is(oldValue, newValue)) {
    return oldValue;
  }
  EventApi.fire(
    new FieldChangedEvent({
      target: target.stuffId,
      field,
      oldValue,
      newValue,
    }),
  );
  return newValue;
}
