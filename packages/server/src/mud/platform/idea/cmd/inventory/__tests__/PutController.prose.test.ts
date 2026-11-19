/**
 * ⭐ `put`'s line for a container's own unnamed inside (size and carrying
 * finalize drive, step 4): *"You put a compass in the of a leather belt
 * pouch."* The `in` member's prose branches on `{% if name %}`, and Liquid
 * reads an empty string as TRUE — so region zero must pass no name at all,
 * never `''`.
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PutController from '../PutController';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { MessageApi } from '../../../../../api/message';
import { CommandApi, type ModelData } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installShapes } from '../../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, carry, pack } from '../../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import Location from '../../../../../lib/location/Location';
import { TestHarnessApi } from '../../../../../api/test-harness';

const one = (stuff: Stuff | null, raw: string, prep?: string): MqlOneResult => ({ stuff, raw, ...(prep ? { prep } : {}) });

let said: string[];

describe('`put X in <container>` — the plain inside reads "in the pouch"', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installShapes();
    said = [];
    const real = MessageApi.scene.bind(MessageApi);
    vi.spyOn(MessageApi, 'scene').mockImplementation((...args: Parameters<typeof MessageApi.scene>) => {
      const b = real(...args);
      const toSelf = b.toSelf.bind(b);
      b.toSelf = ((m: unknown) => {
        said.push(String((m as { toPlain?: () => string }).toPlain?.() ?? JSON.stringify(m)));
        return toSelf(m as never);
      }) as typeof b.toSelf;
      return b;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('names no chamber when the container has none', async () => {
    const room = makeStuff(() => new Location());
    const { me } = makeBody();
    ContainmentApi.move(me, room);
    const pouch = pack('belt pouch', 0.15, [0.15, 0.06, 0.12]);
    ContainmentApi.move(pouch, room);
    const key = tool('key', 0.02, [0.05, 0.02, 0.005]);
    ContainmentApi.move(key, room);
    carry(me, key);
    const c = CommandApi.createCommandContext({
      commandGiver: me as never,
      location: room as never,
      commandText: 'put key in pouch',
      executionId: 'test',
      commandId: 'test',
      verb: 'put',
      command: CommandDefinition.fromYaml('verbs: [put]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
    });
    await TestHarnessApi.actAs(c.commandGiver, () => makeStuff(() => new PutController()).execute(
      { item: one(key, 'key'), target: one(pouch, 'belt pouch', 'in') } as ModelData as never,
      c,
    ));
    expect(key.getContainer(), said.join(' | ')).toBe(pouch);
    // The names render per viewer (an Mml thing tag); the words around them are the line.
    const line = said.join('\n').replace(/<[^>]*>/g, '#');
    expect(line).toMatch(/You put #[^#]*# in #[^#]*#\./);
    expect(line).not.toMatch(/in the\s+of/);
  });
});
