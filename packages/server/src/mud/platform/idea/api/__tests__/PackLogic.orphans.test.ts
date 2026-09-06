/**
 * `PackApi.orphans` (content-packs wave 3, D9): template rows under no
 * pack — a `content` row with no `sourcePack` stamp is listed; a stamped
 * one is not; a document (another collection) is not.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PackApi } from '../../../../api/pack';
import { store, stubPersist, cleanupPacks } from './pack-harness';

beforeEach(() => {
  vi.restoreAllMocks();
  stubPersist();
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanupPacks();
});

describe('PackApi.orphans', () => {
  it('lists unstamped template rows only', async () => {
    store.rows.push(
      { _id: 'a', path: '/obj/OldThing', class: '/platform/thing/Thing', data: {}, __col: 'content' },
      { _id: 'b', path: '/obj/Stamped', class: '/platform/thing/Thing', data: {}, sourcePack: 'platform', __col: 'content' },
      { _id: 'c', path: '/studio/x/msh/script', kind: 'msh', data: {}, __col: 'documents' },
    );
    expect(await PackApi.orphans()).toEqual(['/obj/OldThing']);
  });
});
