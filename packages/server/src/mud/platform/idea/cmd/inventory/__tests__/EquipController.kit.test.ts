/**
 * ⭐⭐ `equip` — the whole kit, in the right order, over time.
 *
 * The three claims the verb exists for, which the per-item layer suite
 * beside this one does not reach:
 *
 *   1. **Bare `equip` dresses you inside-out.** The covering ladder is
 *      engine knowledge; a player was rediscovering it one refusal at a
 *      time. Here a shirt and a cuirass go on in the wrong order and
 *      come out right.
 *   2. **Layers CHAIN.** Each is an engagement occupying `hands`, so
 *      firing them in a loop earns `engagement-conflict` and dresses you
 *      in exactly one garment. (Measured — it did, before the chain.)
 *   3. **`--from` reaches into a container**, which is the only
 *      genuinely new capability: `wear` was `scope: inventory`, so
 *      getting dressed out of a wardrobe was six `get`s first.
 *
 * Plus `unequip`, which peels outermost-first for the same reason.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import EquipController from '../EquipController';
import UnequipController from '../UnequipController';
import { WearableMixin } from '../../../../../lib/slot/Wearable';
import { SlottableMixin } from '../../../../../lib/slot/Slottable';
import { WardrobeMixin } from '../../../../../lib/slot/Wardrobe';
import { ConstructedMixin } from '../../../../../lib/material/Constructed';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import Thing from '../../../../../lib/stuff/Thing';
import Location from '../../../../../lib/stuff/Location';
import { Character } from '../../../../../lib/character/Character';
import Species from '../../../species/Species';
import BodyPlan from '../../../species/BodyPlan';
import { Construction } from '../../../../../lib/material/Construction';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { WorldClockApi } from '../../../../../api/worldclock';
import { SchedulerApi } from '../../../../../api/scheduler';
import { EventApi } from '../../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../../../../lib/stuff/Stuff';

class Garment extends WearableMixin(
  SlottableMixin(ConstructedMixin(ContainableMixin(Thing))),
) {
  static _mixinName = 'Garment';
}

class Wearer extends WardrobeMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(Character))),
) {
  static _mixinName = 'Wearer';
}

/** A plain box to dress out of — the wardrobe stand-in. */
class Chest extends ContainerMixin(ContainableMixin(Thing)) {
  static _mixinName = 'Chest';
}

let seq = 0;
let clockNow = 1000;

function standUp(): { body: Wearer; loc: Location; plan: string } {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => clockNow);
  WorldClockApi.setScale(1);
  SchedulerApi._clearAllForTesting();
  const reg = makeStuff(() => new EventRegistry());
  stampTemplatePathForTest(reg as never, '/platform/idea/EventRegistry');
  EventApi._setRegistryForTesting(reg as never);

  // ⚠ Only `woven` is registered: `plate` is already a KERNEL covering
  // form (the closed `as const`), and re-registering it throws. The
  // pack-supplied fabric and the kernel form together are exactly the
  // two-source shape the ladder reads.
  Construction.registerFabric({
    key: 'woven',
    layerBand: 0,
    loft: 0.1,
    weaveDensity: 0.7,
    drape: 0.5,
  });

  // ⚠ The fixture shape the layer suite already proves out: the plan and
  // the species are STAMPED rather than created-at-path, and the plan
  // needs `bodyParts` for the covering reads.
  const n = (seq += 1);
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`kit-${n}`);
  plan.setSlots([
    { name: 'torso', accepts: 'WearableMixin', capacity: 4, covers: ['body.torso'] },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 40 }],
    },
  ]);
  const planPath = `/stuff/idea/species/BodyPlan/kit-${n}`;
  stampTemplatePathForTest(plan, planPath);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/kit-${n}`);

  const body = makeStuff(() => new Wearer());
  body.setSpecies(species);

  const loc = makeStuff(() => new Location());
  ContainmentApi.move(body as never, loc as never);
  return { body, loc, plan: planPath };
}

function garment(plan: string, fabric: string, keyword: string): Garment {
  const g = makeStuff(() => new Garment());
  g.setPrimaryKeyword(keyword);
  g.setKeywords([keyword]);
  g.setShortDescription(`a ${keyword}`);
  g.setConstructionForm(fabric);
  g.setSlotClaims({ [plan]: ['torso'] });
  stampTemplatePathForTest(g, `/stuff/thing/kit-${(seq += 1)}-${keyword}`);
  return g;
}

function ctx(body: Wearer, loc: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: body as never,
    location: loc as never,
    commandSource: body as never,
    commandText: 'equip',
    executionId: 't',
    commandId: 't',
    verb: 'equip',
    command: CommandDefinition.fromYaml(
      'verbs: [equip]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

/** Let a whole CHAIN of dressing steps unwind. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    clockNow += 10 * 60_000;
    WorldClockApi._advanceForTesting(10 * 60_000);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

function worn(body: Wearer): string[] {
  return [...body.wornStack()].map(
    (g) => (g as unknown as Garment).getPrimaryKeyword() ?? '',
  );
}

afterEach(() => {
  Construction.clearFabrics();
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('bare `equip` — the whole kit', () => {
  it('⭐⭐ dresses INSIDE-OUT however the pieces are ordered in the pack', async () => {
    const { body, loc, plan } = standUp();
    // Deliberately the wrong way round in the inventory: the plate is
    // picked up first, so a naive walk would try it first and then
    // refuse the shirt for ever.
    const cuirass = garment(plan, 'plate', 'cuirass');
    const shirt = garment(plan, 'woven', 'shirt');
    ContainmentApi.move(cuirass as never, body as never);
    ContainmentApi.move(shirt as never, body as never);

    await makeStuff(() => new EquipController()).execute({} as never, ctx(body, loc));
    await settle();

    // `wornStack()` is outermost-first, so the plate on top and the
    // shirt underneath is the correct answer.
    expect(worn(body)).toEqual(['cuirass', 'shirt']);
  });

  it('⚠⚠ puts on EVERY layer — the chain, not a loop', async () => {
    /*
     * Each layer occupies `hands`. An earlier draft fired them back to
     * back and the second earned `engagement-conflict`: you ended up in
     * one garment and were told your hands were full of the rest. Three
     * pieces landing is the regression guard for that.
     */
    const { body, loc, plan } = standUp();
    for (const kw of ['shirt', 'jerkin', 'cloak']) {
      ContainmentApi.move(garment(plan, 'woven', kw) as never, body as never);
    }
    await makeStuff(() => new EquipController()).execute({} as never, ctx(body, loc));
    await settle();
    expect(worn(body).sort()).toEqual(['cloak', 'jerkin', 'shirt']);
  });

  it('says so when there is nothing to put on', async () => {
    const { body, loc } = standUp();
    const c = ctx(body, loc);
    await makeStuff(() => new EquipController()).execute({} as never, c);
    await settle();
    expect(
      c.getNotes().some(
        (n) => (n as { reason?: string }).reason === 'nothing-to-equip',
      ),
    ).toBe(true);
  });
});

describe('⭐ `--from` — dressing out of a container', () => {
  it('reaches into a chest, which `wear` could never do', async () => {
    const { body, loc, plan } = standUp();
    const chest = makeStuff(() => new Chest());
    ContainmentApi.move(chest as never, loc as never);
    const shirt = garment(plan, 'woven', 'shirt');
    ContainmentApi.move(shirt as never, chest as never);
    // It starts in the CHEST, not in the hands — the old verb's
    // `mustBeInInventory` would have refused this outright.
    expect(shirt.getContainer()).toBe(chest);

    await makeStuff(() => new EquipController()).execute(
      { from: { stuff: chest as never, raw: 'chest' } } as never,
      ctx(body, loc),
    );
    await settle();
    expect(worn(body)).toEqual(['shirt']);
  });
});

describe('`unequip`', () => {
  it('⭐ peels OUTERMOST-first — you cannot pull a shirt out from under plate', async () => {
    const { body, loc, plan } = standUp();
    const shirt = garment(plan, 'woven', 'shirt');
    const cuirass = garment(plan, 'plate', 'cuirass');
    ContainmentApi.move(shirt as never, body as never);
    ContainmentApi.move(cuirass as never, body as never);
    body.occupyAll(shirt as never, ['torso']);
    body.occupyAll(cuirass as never, ['torso']);
    expect(worn(body)).toEqual(['cuirass', 'shirt']);

    await makeStuff(() => new UnequipController()).execute({} as never, ctx(body, loc));
    await settle();
    expect(worn(body)).toEqual([]);
  });

  it('refuses readably with nothing on', async () => {
    const { body, loc } = standUp();
    const c = ctx(body, loc);
    await makeStuff(() => new UnequipController()).execute({} as never, c);
    expect(
      c.getNotes().some(
        (n) => (n as { reason?: string }).reason === 'nothing-worn',
      ),
    ).toBe(true);
  });
});
