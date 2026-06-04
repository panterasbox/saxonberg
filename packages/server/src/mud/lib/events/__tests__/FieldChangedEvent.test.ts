/**
 * FieldChangedEvent DTO sanity — KIND + payload shape. The
 * `fireFieldChange` helper lives on `MqlSubscriptionApi`; its tests
 * live in `api/__tests__/mql-subscription.fireFieldChange.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { FieldChangedEvent } from '../FieldChangedEvent';

describe('FieldChangedEvent', () => {
  it('carries kind, payload, and exposes static KIND', () => {
    const event = new FieldChangedEvent({
      target: 'stuff-1',
      field: 'name',
      oldValue: 'old',
      newValue: 'new',
    });
    expect(event.kind).toBe('stuff.fieldChanged');
    expect(FieldChangedEvent.KIND).toBe('stuff.fieldChanged');
    expect(event.payload).toEqual({
      target: 'stuff-1',
      field: 'name',
      oldValue: 'old',
      newValue: 'new',
    });
  });

  it('discriminator is `field`, not `property`', () => {
    const event = new FieldChangedEvent({
      target: 'stuff-1',
      field: 'name',
      oldValue: '',
      newValue: 'Alice',
    });
    expect(event.payload).toHaveProperty('field', 'name');
    expect(event.payload).not.toHaveProperty('property');
  });
});
