/**
 * ⭐⭐ `AddressApi.resolvePlace` — the ONE way a player names a place.
 *
 * ⚠⚠ Why it exists: this ladder was living in two controllers and they
 * had drifted. `job post` knew `here`/reachable/path; `ship` knew
 * reachable/path — and a shipment's destination is BY DEFINITION out of
 * reach, so a literal template path was the only working form and both
 * of `ship`'s own help examples were lies. Nothing caught it because
 * the drive never shipped anything.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AddressApi } from '../../../api/address';
import AddressRegistry from '../../../platform/idea/AddressRegistry';
import Locality from '../../../platform/idea/Locality';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

const REGISTRY = '/platform/idea/AddressRegistry';

/** A Locality that claims `address` and answers to `name`. */
function locality(path: string, name: string, address: string): Locality {
  return makeStuffAtPath(() => {
    const l = new Locality();
    // Protected on the class; a fixture stands the row up the way the
    // hydrator does.
    const raw = l as unknown as { name: string; _address: string };
    raw.name = name;
    raw._address = address;
    return l;
  }, path);
}

describe('AddressApi.resolvePlace', () => {
  let asker: Stuff;

  beforeEach(async () => {
    makeStuffAtPath(() => new AddressRegistry(), REGISTRY);
    // Index by hand — `postRegister` walks the shipped Locality roster,
    // which is content this unit test has no business standing up.
    asker = makeStuffAtPath(() => new Idea(), '/stuff/test/asker');
  });
  afterEach(() => vi.restoreAllMocks());

  it('⭐ names a remote place by the NAME it is known by', () => {
    const rejection = locality('/stuff/idea/Locality/rejection', 'Rejection', 'terminus/rejection');
    AddressApi.registerLocality(rejection);
    expect(AddressApi.resolvePlace('Rejection', asker)).toBe(
      '/stuff/idea/Locality/rejection',
    );
    // Case-insensitively — nobody capitalizes at a shipping desk.
    expect(AddressApi.resolvePlace('rejection', asker)).toBe(
      '/stuff/idea/Locality/rejection',
    );
  });

  it('names one by its ADDRESS in the namespace', () => {
    const rejection = locality('/stuff/idea/Locality/rejection', 'Rejection', 'terminus/rejection');
    AddressApi.registerLocality(rejection);
    expect(AddressApi.resolvePlace('terminus/rejection', asker)).toBe(
      '/stuff/idea/Locality/rejection',
    );
  });

  it('⚠⚠ a NAME COLLISION resolves to the BROADER place, deterministically', () => {
    // Two shipped Localities really are called Terminus: the
    // municipality and the city proper. A plain Map would let whichever
    // indexed last win — silently, and differently on every boot.
    const city = locality('/stuff/idea/Locality/terminus-city', 'Terminus', 'terminus/city');
    const town = locality('/stuff/idea/Locality/terminus', 'Terminus', 'terminus');
    AddressApi.registerLocality(city);
    AddressApi.registerLocality(town);
    expect(AddressApi.resolvePlace('Terminus', asker)).toBe(
      '/stuff/idea/Locality/terminus',
    );
    // …and the order of registration cannot change the answer.
    AddressApi.registerLocality(city);
    expect(AddressApi.resolvePlace('Terminus', asker)).toBe(
      '/stuff/idea/Locality/terminus',
    );
  });

  it('takes a durable path verbatim, and answers nothing for a name nobody knows', () => {
    expect(AddressApi.resolvePlace('/test/place/pithead-yard', asker)).toBe(
      '/test/place/pithead-yard',
    );
    expect(AddressApi.resolvePlace('Narnia-on-Sea', asker)).toBe('');
  });

  it('`here` is where the asker stands', () => {
    expect(AddressApi.resolvePlace('here', asker, '/test/place/quay')).toBe(
      '/test/place/quay',
    );
  });
});
