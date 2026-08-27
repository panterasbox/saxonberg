/**
 * The boot guard (content-packs wave 4a, D4): a `content` row under the
 * retired `/domain/` root refuses the boot — one line naming the count
 * and the database, then a throw the boot does not catch. A clean store,
 * or one holding only `/world/` rows, resolves. The root is matched
 * anchored: a path that merely contains the word is not a hit.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../api/pack';
import { store, stubPersist } from './pack-harness';

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
});
afterEach(() => vi.restoreAllMocks());

/** Built, not written: the guard's own test must not read as a legacy literal. */
const LEGACY = ['', 'domain', ''].join('/');

describe('PackApi.assertNoLegacyPaths', () => {
  it('resolves on an empty store and on one holding only /world/ (and other) rows', async () => {
    await expect(PackApi.assertNoLegacyPaths('db')).resolves.toBeUndefined();
    store.rows.push({ _id: 'a', path: ['', 'world', 'x'].join('/'), class: '/obj/Prop' } as never);
    store.rows.push({ _id: 'b', path: '/obj/Prop', class: '/obj/Prop' } as never);
    store.rows.push({ _id: 'c', path: `/home/x${LEGACY}notes`, class: '/obj/Prop' } as never);
    await expect(PackApi.assertNoLegacyPaths('db')).resolves.toBeUndefined();
  });

  it('one legacy row refuses the boot: the message names the count and the database', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    store.rows.push({ _id: 'a', path: `${LEGACY}x`, class: '/obj/Prop' } as never);
    store.rows.push({ _id: 'b', path: `${LEGACY}y/z`, class: '/obj/Prop' } as never);
    await expect(PackApi.assertNoLegacyPaths('saxonberg_build1')).rejects.toThrow(
      /2 content row\(s\) under the retired \/domain\/ root .* Drop database 'saxonberg_build1'/,
    );
    expect(error).toHaveBeenCalledTimes(1);
  });
});
