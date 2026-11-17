/**
 * ⭐ A tool CARRIED where it sits is used there (size and carrying D-W10-1;
 * finalize run 16): the tinker's sewing kit in the satchel he wears mends
 * leather; shut in it, the mend is refused naming the next command.
 *
 * Since W9 a thing in a bag is the BAG's contents, so the gather walk's old
 * read of the maker's top-level contents found no kit at all.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CraftingApi } from '../../../../api/crafting';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { Quantity } from '../../../../lib/quantity';
import Material from '../../../../lib/material/Material';
import Good from '../../../../lib/stuff/Good';
import Garment from '../../../thing/equipment/Garment';
import Tool from '../../../thing/Tool';
import RecipeCatalogue from '../../RecipeCatalogue';
import { Idea } from '../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { CraftingDecline } from '../../../../lib/craft/CraftingDecline';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { RepairOutcome } from '../../../../api/crafting';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import { makeBody, wornBag, type Body } from '../../../../lib/slot/__tests__/carrying-fixture';

class TestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'TestRoomRepairCarried';
}

const LEATHER = '/stuff/idea/material/_test/rpc-leather';

async function repairAs(hand: Stuff, item: Stuff): Promise<RepairOutcome> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(hand);
    return CraftingApi.repair({ item });
  }) as unknown as Promise<RepairOutcome>;
}

let room: TestRoom;

beforeEach(async () => {
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(async () => [] as never);
  WorldClockApi._setNowProviderForTesting(() => 1000);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('leather');
    m.setTags(['organic', 'leather', 'hide']);
    return m;
  }, LEATHER);
  const catalogue = makeStuffAtPath(() => new RecipeCatalogue(), '/platform/idea/RecipeCatalogue');
  await catalogue.warm();
  room = makeStuff(() => new TestRoom());
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

/** A tinker-shaped body: a worn satchel with the kit and the leather in it. */
function tinker(): { me: Body; satchel: ReturnType<typeof wornBag>; jerkin: Garment } {
  const { me, plan } = makeBody();
  ContainmentApi.move(me, room);
  const satchel = wornBag(me, plan, 'satchel', 'torso');
  const kit = makeStuff(() => new Tool());
  kit.setCapabilities(['mending']);
  ContainmentApi.move(kit, satchel);
  const hide = makeStuff(() => new Good());
  hide.setMaterial(StuffApi.findByTemplatePath<Material>(LEATHER) as unknown as Material);
  hide.setMass(Quantity.of(2, 'kg'));
  ContainmentApi.move(hide, satchel);
  const jerkin = makeStuff(() => new Garment());
  jerkin.setMaterial(StuffApi.findByTemplatePath<Material>(LEATHER) as unknown as Material);
  jerkin.setMass(Quantity.of(4, 'kg'));
  jerkin.setCondition(0.5);
  ContainmentApi.move(jerkin, room);
  return { me, satchel, jerkin };
}

describe('repair reaches what the hand carries where it sits (D-W10-1)', () => {
  it('⭐ the sewing kit and the stock in a worn OPEN satchel mend a leather jerkin', async () => {
    const { me, jerkin } = tinker();
    const outcome = await repairAs(me, jerkin);
    expect(outcome.ok).toBe(true);
    expect(jerkin.getCondition()).toBe(1);
  });

  it('⭐ the satchel SHUT: refused, naming `open satchel`', async () => {
    const { me, satchel, jerkin } = tinker();
    satchel.setOpen(false);
    const outcome = await repairAs(me, jerkin);
    expect(outcome).toMatchObject({ ok: false, reason: 'tool-out-of-reach', detail: 'shut:satchel' });
    if (outcome.ok) return;
    expect(CraftingDecline.messageFor(outcome)).toBe('Your satchel is shut — `open satchel` first.');
    expect(jerkin.getCondition()).toBe(0.5);
  });
});
