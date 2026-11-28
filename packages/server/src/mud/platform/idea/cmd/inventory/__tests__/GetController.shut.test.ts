/**
 * ⭐ Shut means shut — and says so (size and carrying finalize drive, step
 * 14b): `get pistol from backpack` with the pack shut answered *"You don't
 * find any 'pistol' in a canvas backpack"*, as though it had been looked
 * in. Nothing in a shut thing is perceived, so nothing is named; the
 * refusal names the next command, as `put` and the reach gate already do.
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GetController from '../GetController';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { MessageApi } from '../../../../../api/message';
import { CommandApi, type ModelData } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installShapes } from '../../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, pack } from '../../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import Location from '../../../../../lib/place/Location';
import { TestHarnessApi } from '../../../../../api/test-harness';

const one = (stuff: Stuff | null, raw: string, prep?: string): MqlOneResult => ({ stuff, raw, ...(prep ? { prep } : {}) });

let said: string[];

describe('`get X from <a shut thing>` — shut, `open` first', () => {
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

  it('names the shut thing and `open`, never what is (or is not) inside', async () => {
    const room = makeStuff(() => new Location());
    const { me } = makeBody();
    ContainmentApi.move(me, room);
    const backpack = pack('backpack', 1, [0.3, 0.2, 0.45]);
    backpack.setOpen(false);
    ContainmentApi.move(backpack, room);
    const c = CommandApi.createCommandContext({
      commandGiver: me as never,
      location: room as never,
      commandText: 'get pistol from backpack',
      executionId: 'test',
      commandId: 'test',
      verb: 'get',
      command: CommandDefinition.fromYaml('verbs: [get]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
    });
    await TestHarnessApi.actAs(c.commandGiver, () => makeStuff(() => new GetController()).execute(
      { targets: { stuff: [], raw: 'pistol' }, source: one(backpack, 'backpack', 'from') } as ModelData as never,
      c,
    ));
    const line = said.join('\n');
    expect(line).toMatch(/is shut — `open backpack` first/);
    expect(line).not.toMatch(/don't find/);
  });
});
