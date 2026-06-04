/**
 * PropertyChangedEvent — PropertiedMixin property-bag write.
 *
 * Fired by `PropertiedMixin.setProp` after a successful, value-changing
 * write. The `property` discriminator (distinct from
 * FieldChangedEvent's `field`) keeps the property-bag namespace and
 * the fact-mixin field namespace separated on the meta-bus index — a
 * fact-mixin field named 'name' and a property-bag key named 'name'
 * do not cross-trigger.
 *
 * No setter helper is exported here. `setProp` already centralizes
 * the change site, so a helper would not pay for itself.
 */

import { StuffEvent } from './StuffEvent';

export interface PropertyChangedPayload {
  target: string;          // StuffId
  property: string;
  oldValue: unknown;
  newValue: unknown;
}

export class PropertyChangedEvent extends StuffEvent<PropertyChangedPayload> {
  static readonly KIND = 'stuff.propertyChanged';
  readonly kind = PropertyChangedEvent.KIND;
  constructor(public readonly payload: PropertyChangedPayload) {
    super();
  }
}
