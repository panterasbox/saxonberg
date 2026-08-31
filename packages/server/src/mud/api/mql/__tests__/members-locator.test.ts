/**
 * The keyed-member locator (residences wave 2, D16): target a warren —
 * a real row — and narrow to the member by `key` (the explicit
 * persistence key) and/or `address` (the declared Locality address).
 *
 * Synthetic fixtures throughout (lint:test-content: a kernel test
 * proves the kernel, never shipped content).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { MqlApi } from '../../mql';
import { StuffApi } from '../../stuff';
import { Warren, type Attachment } from '../../../lib/location/Warren';
import { ContainerMixin, type Container } from '../../../lib/spatial/Container';
import { PersistableMixin } from '../../../lib/persistence/Persistable';
import { AddressableMixin } from '../../../lib/address/Addressable';
import Location from '../../../lib/stuff/Location';
import type { Stuff } from '../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

/** A keyed, addressable member room — the D16 keyed-instance shape. */
class KeyedRoom extends AddressableMixin(
  PersistableMixin(ContainerMixin(Location)),
) {
  static _mixinName = 'MembersLocatorRoom';
}

/** A minimal concrete warren — policy hooks are no-ops. */
class TestWarren extends Warren {
  static _mixinName = 'MembersLocatorWarren';
  protected async createMember(): Promise<Stuff & Container> {
    throw new Error('not used');
  }
  async admitArrival(): Promise<void> {}
  protected attachmentFor(): Attachment {
    return {} as Attachment;
  }
  protected async reconcile(): Promise<void> {}
  protected async wireHostFixtures(): Promise<void> {}
  protected async unwireHostFixtures(): Promise<void> {}
}

const WARREN_PATH = '/obj/_test/members-warren';
const EXTENT = '/obj/_test/members-warren/lots/lot-7';

let warren: TestWarren;
let keyed: KeyedRoom;
let plain: KeyedRoom;

beforeEach(() => {
  const prior = StuffApi.findByTemplatePath(WARREN_PATH);
  if (prior) StuffApi.unregister(prior);
  warren = makeStuffAtPath(() => new TestWarren(), WARREN_PATH);

  keyed = makeStuff(() => new KeyedRoom());
  keyed.setPersistenceKey(`${EXTENT}/bedroom`);
  keyed.setAddress('test/members-warren/lot-7');
  warren.addMember(keyed as never);

  plain = makeStuff(() => new KeyedRoom());
  warren.addMember(plain as never);
});

function resolve(q: string): Stuff[] {
  return MqlApi.resolveMany(q, { commandGiver: null, scope: 'world' }).stuff;
}

describe('the :members chain element', () => {
  it('expands a warren to its live members', () => {
    const got = resolve(`${WARREN_PATH}:members`);
    const ids = got.map((s) => s.stuffId).sort();
    expect(ids).toEqual([keyed.stuffId, plain.stuffId].sort());
  });

  it('a non-warren prior element contributes nothing', () => {
    const got = resolve(`${WARREN_PATH}:members:members`);
    expect(got).toEqual([]);
  });
});

describe('the key / address filter atoms', () => {
  it('warren → member by explicit persistence key', () => {
    const got = resolve(`${WARREN_PATH}:members:[key = '${EXTENT}/bedroom']`);
    expect(got.map((s) => s.stuffId)).toEqual([keyed.stuffId]);
  });

  it('member by declared Locality address', () => {
    const got = resolve(
      `${WARREN_PATH}:members:[address = 'test/members-warren/lot-7']`,
    );
    expect(got.map((s) => s.stuffId)).toEqual([keyed.stuffId]);
  });

  it('an unkeyed, unaddressed member never false-matches', () => {
    expect(resolve(`${WARREN_PATH}:members:[key = '${EXTENT}/bedroom']`)).toHaveLength(1);
    expect(resolve(`${WARREN_PATH}:members:[has key]`)).toHaveLength(1);
    expect(resolve(`${WARREN_PATH}:members:[has address]`)).toHaveLength(1);
  });
});
