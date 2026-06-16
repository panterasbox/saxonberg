/**
 * AddressableMixin on Location — sparse declaration + predicate.
 *
 * The mixin is intentionally thin: it stores a declared address string
 * and nothing more (resolution to a covering Locality is AddressApi's
 * job). These tests pin the sparse/non-breaking contract — an
 * un-authored Location declares no address and reads identically to
 * before the mixin existed — plus the `isAddressable` narrowing.
 */

import { describe, it, expect, afterEach } from 'vitest';
import Location from '../../stuff/Location';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestLocation extends Location {}

describe('AddressableMixin on Location', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('defaults to no declared address (sparse)', () => {
    const room = makeStuff(() => new TestLocation());
    expect(room.getAddress()).toBeNull();
  });

  it('every Location is Addressable (predicate narrows)', () => {
    const room = makeStuff(() => new TestLocation());
    expect(MixinApi.isAddressable(room)).toBe(true);
  });

  it('round-trips a declared address and clears back to null', () => {
    const room = makeStuff(() => new TestLocation());
    room.setAddress('narnia/castle');
    expect(room.getAddress()).toBe('narnia/castle');
    room.setAddress(null);
    expect(room.getAddress()).toBeNull();
  });
});
