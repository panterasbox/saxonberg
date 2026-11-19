/**
 * ⭐ `unwield` puts up ANYTHING you are holding (size and carrying
 * finalize drive, step 4). The full-hands refusal names `unwield mug` as
 * the way to free a hand, and the view refused it — *"a mug isn't
 * something you can wield"* — because its arg still required
 * `WieldableMixin`. A held thing is a `Slottable` in a hand; what is not
 * in a hand (a worn bag) is not yours to unwield, and is never taken off
 * by the word.
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import UnwieldController from '../UnwieldController';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { MessageApi } from '../../../../../api/message';
import { CommandApi, type ModelData } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installShapes } from '../../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, wornBag, carry } from '../../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff, stampTemplatePathForTest } from '../../../../../lib/security/__tests__/test-setup';
import { EventApi } from '../../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import { SlottableMixin } from '../../../../../lib/slot/Slottable';
import { Quantity } from '../../../../../lib/quantity';
import Thing from '../../../../thing/Thing';
import Location from '../../../../../lib/location/Location';
import { TestHarnessApi } from '../../../../../api/test-harness';

/** A cup: a hand takes it, nothing wields it. */
class Cup extends SlottableMixin(Thing) {}

const one = (stuff: Stuff | null, raw: string): MqlOneResult => ({ stuff, raw });

let said: string[];

function ctx(giver: Stuff, loc: Stuff) {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandText: 'unwield',
    executionId: 'test',
    commandId: 'test',
    verb: 'unwield',
    command: CommandDefinition.fromYaml('verbs: [unwield]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

describe('`unwield` — anything in a hand, nothing else', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    installShapes();
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      stampTemplatePathForTest(r, '/platform/idea/EventRegistry');
      return r;
    });
    EventApi._setRegistryForTesting(reg);
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

  it('the view admits a held thing that is not a weapon (a Slottable, not a Wieldable)', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const view = readFileSync(
      join(here, '../../../../../../../../content/platform/content/platform/cmd/inventory/unwield.yaml'),
      'utf8',
    );
    expect(view).toMatch(/requires: SlottableMixin/);
    expect(view).not.toMatch(/requires: WieldableMixin/);
  });

  it('a held cup with nowhere on you to go stays in hand, said so', async () => {
    const room = makeStuff(() => new Location());
    const { me } = makeBody();
    ContainmentApi.move(me, room);
    const cup = makeStuff(() => new Cup());
    cup.setShortDescription('cup');
    cup.setKeywords(['cup']);
    cup.setMass(Quantity.of(0.3, 'kg'));
    cup.setDimensions({ width: 0.09, depth: 0.09, height: 0.1 });
    ContainmentApi.move(cup, room);
    carry(me, cup);
    expect(me.tierOf(cup)).toBe('hand');
    await ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => makeStuff(() => new UnwieldController()).execute({ target: one(cup, 'cup') } as ModelData as never, ctx$)))(ctx(me, room));
    expect(me.tierOf(cup)).toBe('hand');
    expect(said.join('\n')).toMatch(/nowhere on you to put/);
  });

  it('a worn bag is not held: refused, and it stays on', async () => {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const bag = wornBag(me, plan, 'satchel', 'torso');
    await ((ctx$) => TestHarnessApi.actAs(ctx$.commandGiver, () => makeStuff(() => new UnwieldController()).execute({ target: one(bag, 'satchel') } as ModelData as never, ctx$)))(ctx(me, room));
    expect(me.wears(bag)).toBe(true);
    expect(said.join('\n')).toMatch(/You aren't holding/);
  });
});
