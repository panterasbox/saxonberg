/**
 * The boot roll — ⭐⭐ **the link that fails closed and silent.**
 *
 * Everything else persistable is stood up because somebody asks for it.
 * A named animal standing in a PUBLIC room has nobody to ask: rooms are
 * lazy, and a public street has no record of its own to overlay. Without
 * this roll the animal is simply not in the world after a restart —
 * which the suite would not notice and a player would.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeptAnimalRegistry } from '../KeptAnimalRegistry';
import { PersistedRecord } from '../../../lib/persistence/PersistedRecord';
import { PersistableApi } from '../../../api/persistable';
import { PersistApi } from '../../../api/persist';
import { Mixins } from '../../../lib/mixin';
import { StuffApi } from '../../../api/stuff';
import { Idea } from '../../../lib/stuff/Idea';
import { makeStuff, makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

function record(scope: string, owner: string): PersistedRecord {
  const r = new PersistedRecord();
  r.scope = scope;
  r.owner = owner;
  return r;
}

beforeEach(() => {
  StuffApi.clearAll();
  vi.spyOn(PersistApi, 'isConnected').mockReturnValue(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('roll call', () => {
  it('⭐ asks for every record carrying the BOND layer, and nothing else', async () => {
    // The query is by LAYER, because the record IS the list — there is no
    // roster of kept animals anywhere else in the game.
    const find = vi
      .spyOn(PersistedRecord, 'findWithLayer')
      .mockResolvedValue([]);
    const reg = makeStuff(() => new KeptAnimalRegistry());
    await reg.rollCall();
    expect(find).toHaveBeenCalledWith(Mixins.Bonded);
  });

  it('stands up one animal per record', async () => {
    vi.spyOn(PersistedRecord, 'findWithLayer').mockResolvedValue([
      record('/stuff/agent/cat', 'mouse-1'),
      record('/trade/ranching/agent/farm-dog', 'shep-1'),
    ]);
    const stand = vi
      .spyOn(PersistableApi, 'standUpKeyed')
      .mockResolvedValue(makeStuffAtPath(() => new Idea(), '/x/1'));

    const reg = makeStuff(() => new KeptAnimalRegistry());
    expect(await reg.rollCall()).toBe(2);
    expect(stand).toHaveBeenCalledWith('/stuff/agent/cat', 'mouse-1');
    expect(stand).toHaveBeenCalledWith('/trade/ranching/agent/farm-dog', 'shep-1');
  });

  it('⚠ a record whose room no longer resolves does NOT take boot down', async () => {
    // A deleted lot is a thing that happens. The record survives and the
    // animal reads as lost, which is honest; a thrown boot is not.
    vi.spyOn(PersistedRecord, 'findWithLayer').mockResolvedValue([
      record('/stuff/agent/cat', 'gone-1'),
      record('/stuff/agent/cat', 'fine-1'),
    ]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(PersistableApi, 'standUpKeyed').mockImplementation(
      async (_scope: string, key: string) => {
        if (key === 'gone-1') throw new Error('no such room');
        return makeStuffAtPath(() => new Idea(), '/x/2');
      },
    );

    const reg = makeStuff(() => new KeptAnimalRegistry());
    expect(await reg.rollCall()).toBe(1);
  });

  it('is inert with no database', async () => {
    vi.spyOn(PersistApi, 'isConnected').mockReturnValue(false);
    const find = vi.spyOn(PersistedRecord, 'findWithLayer');
    const reg = makeStuff(() => new KeptAnimalRegistry());
    expect(await reg.rollCall()).toBe(0);
    expect(find).not.toHaveBeenCalled();
  });

  it('never gets culled', () => {
    const reg = makeStuff(() => new KeptAnimalRegistry());
    expect(reg.canEvict().ok).toBe(false);
  });
});
