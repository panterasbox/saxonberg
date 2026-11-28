/**
 * ⭐ `get X from <another body>` reaches what you perceive ANYWHERE on them
 * (size and carrying D24a; finalize drive run 15, step 15). Since W9 a
 * pocket's contents are its garment's, so a letter in a coat's inner pocket
 * is not among the body's own contents: the search FOUND it and `query`
 * showed it, yet `get letter from <them>` answered *"You don't find any
 * 'letter' in a human"* — it looked only one level down.
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GetController from '../GetController';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { MessageApi } from '../../../../../api/message';
import { PerceptionApi } from '../../../../../api/perception';
import { CommandApi, type ModelData } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installShapes } from '../../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, wornGarment } from '../../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import Location from '../../../../../lib/place/Location';
import { TestHarnessApi } from '../../../../../api/test-harness';

const one = (stuff: Stuff | null, raw: string, prep?: string): MqlOneResult => ({ stuff, raw, ...(prep ? { prep } : {}) });
const POCKET = { member: '/platform/placements/in', name: 'inner pocket', mouth: { width: 0.25, height: 0.04 }, volumeM3: 0.002, covered: true };

let said: string[];

describe('`get X from <another body>` — what you perceive anywhere on them', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installShapes();
    said = [];
    const real = MessageApi.scene.bind(MessageApi);
    vi.spyOn(MessageApi, 'scene').mockImplementation((...args: Parameters<typeof MessageApi.scene>) => {
      const b = real(...args);
      const toSelf = b.toSelf.bind(b);
      b.toSelf = ((m: unknown) => {
        said.push(JSON.stringify(m));
        return toSelf(m as never);
      }) as typeof b.toSelf;
      return b;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ a found letter in the coat\'s inner pocket is taken', async () => {
    const room = makeStuff(() => new Location());
    const { me } = makeBody();
    const { me: them, plan } = makeBody();
    ContainmentApi.move(me, room);
    ContainmentApi.move(them, room);
    const coat = await wornGarment(them, plan, 'coat', 'torso', [POCKET]);
    const letter = tool('letter', 0.01, [0.2, 0.1, 0.001]);
    ContainmentApi.move(letter, coat, 'inner pocket');
    expect(letter.getContainer()).toBe(coat);
    // Senseless — a body that cannot resist (the drive's anaesthesia).
    vi.spyOn(them as unknown as { searchRefusal(): null }, 'searchRefusal').mockReturnValue(null);
    // The search found it: this searcher perceives it (the find is belief's).
    vi.spyOn(PerceptionApi, 'perceives').mockImplementation((_v, t) => t.stuffId === letter.stuffId || t.stuffId === coat.stuffId);
    const c = CommandApi.createCommandContext({
      commandGiver: me as never,
      location: room as never,
      commandText: 'get letter from them',
      executionId: 'test',
      commandId: 'test',
      verb: 'get',
      command: CommandDefinition.fromYaml('verbs: [get]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
    });
    await TestHarnessApi.actAs(c.commandGiver, () => makeStuff(() => new GetController()).execute(
      { targets: { stuff: [], raw: 'letter' }, source: one(them, 'them', 'from') } as ModelData as never,
      c,
    ));
    expect(said.join('\n')).not.toMatch(/don't find/);
    expect(letter.getContainer()).toBe(me);
  });
});
