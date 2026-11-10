/**
 * A joint is a document, resident whenever the kind whose bill names it
 * is (documents path identity, D7): `setBill` returns the joints' load for
 * the applier to await, and a synchronous read of a joint nothing loaded
 * throws by name.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Joint } from '../Joint';
import { AssembledMixin } from '../Assembled';
import { Idea } from '../../stuff/Idea';
import { DurableMixin } from '../../material/Durable';
import { DocumentApi } from '../../../api/document';
import { DocumentNotResidentError } from '../../errors';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { StoredDocument } from '../../document/StoredDocument';
import { CraftingApi } from '../../../api/crafting';

const PEGGED = '/test/joints/pegged';

class TestKind extends AssembledMixin(DurableMixin(Idea)) {
  static _mixinName = 'TestAssembledHost';
}

const BILL = {
  parts: [
    { part: 'leg', template: '/x/thing/leg', count: 1, role: 'structural' },
    { part: 'seat', template: '/x/thing/seat', count: 1, role: 'structural' },
  ],
  joints: [{ key: 'j', method: PEGGED, members: ['leg', 'seat'] }],
};

afterEach(() => vi.restoreAllMocks());

describe('Joint — resident with the bill that names it', () => {
  it('⭐ the bill’s setter loads every joint it names; a sync read finds it at once', async () => {
    vi.spyOn(DocumentApi, 'read').mockResolvedValue({
      getPath: () => PEGGED,
      getKind: () => 'joint',
      getData: () => ({ portability: 'hand', competence: null, strength: 0.7 }),
    } as unknown as StoredDocument);
    const kind = makeStuff(() => new TestKind());
    await kind.setBill(BILL);
    expect(CraftingApi.joints().need(PEGGED).strength).toBe(0.7);
    expect(CraftingApi.joints().need(PEGGED).key).toBe('pegged');
  });

  it('a bill naming a path with no joint fails the load, naming it', async () => {
    vi.spyOn(DocumentApi, 'read').mockResolvedValue(null);
    const kind = makeStuff(() => new TestKind());
    await expect(
      kind.setBill({ ...BILL, joints: [{ key: 'j', method: '/test/joints/none', members: ['leg'] }] }),
    ).rejects.toThrow(/none/);
  });

  it('a sync read of a joint nothing loaded throws DocumentNotResidentError', () => {
    expect(() => CraftingApi.joints().need('/test/joints/never')).toThrow(DocumentNotResidentError);
  });

  it('only a hand joint may carry no competence', () => {
    expect(() => CraftingApi.joints().parse({ portability: 'tool', competence: null }, '/t/joints/x')).toThrow(
      /competence/,
    );
  });
});
