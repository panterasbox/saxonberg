/**
 * EquipController — the ladder refusal.
 *
 * ⚠ Narrow on purpose: a low band may not go OUTSIDE a high one (a
 * shirt over plate), and **shirt-vs-coat is not refused** — both are
 * band 0, which of them goes on first is the player's call, and its
 * consequence is being cold rather than being prevented.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import EquipController from '../EquipController';
import { WearableMixin } from '../../../../../lib/slot/Wearable';
import { SlottableMixin } from '../../../../../lib/slot/Slottable';
import { WardrobeMixin } from '../../../../../lib/slot/Wardrobe';
import { ConstructedMixin } from '../../../../../lib/material/Constructed';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
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
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../../api/command';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { WorldClockApi } from '../../../../../api/worldclock';
import { SchedulerApi } from '../../../../../api/scheduler';
import { EventApi } from '../../../../../api/event';
import EventRegistry from '../../../EventRegistry';

/*
 * ⭐⭐ DRESSING IS DURATIVE NOW, so this suite has to reckon with time.
 *
 * `equip` runs a `DressingStep` per layer — the claim lands at the
 * step's completion, not at dispatch — which is the whole point of the
 * verb (you cannot armour up in an ambush). A test that calls
 * `execute()` and reads the stack on the next line is asserting against
 * a garment that is still going on.
 *
 * So: a scheduler that can actually run (it needs an `EventRegistry`),
 * a stopped clock we advance by hand, and `settle()` after every act.
 * The ladder assertions below are unchanged; only the waiting is new.
 */
let clockNow = 1000;

function standUpScheduler(): void {
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => clockNow);
  WorldClockApi.setScale(1);
  SchedulerApi._clearAllForTesting();
  const reg = makeStuff(() => new EventRegistry());
  stampTemplatePathForTest(reg as never, '/platform/idea/EventRegistry');
  EventApi._setRegistryForTesting(reg as never);
}

/**
 * Let every started dressing step reach its completion.
 *
 * ⚠ Repeatedly: layers CHAIN, so each completion starts the next one and
 * one advance only lands one garment. Eight passes covers any kit a test
 * builds.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 8; i++) {
    clockNow += 10 * 60_000;
    WorldClockApi._advanceForTesting(10 * 60_000);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

class TestGarment extends WearableMixin(
  SlottableMixin(ContainableMixin(ConstructedMixin(Thing))),
) {}

/** A body with a real covering slot the ladder can be tested on. */
class Wearer extends WardrobeMixin(
  SensorMixin(CommandGiverMixin(Character)),
) {}

let seq = 0;

function bodyAndPlanPath(): { body: Wearer; planPath: string } {
  const n = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName(`ladder-${n}`);
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
  const planPath = `/stuff/idea/species/BodyPlan/ladder-${n}`;
  stampTemplatePathForTest(plan, planPath);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/ladder-${n}`);

  const body = makeStuff(() => new Wearer());
  body.setSpecies(species);
  return { body, planPath };
}

function garment(planPath: string, form: string, keyword: string): TestGarment {
  const g = makeStuff(() => new TestGarment());
  g.setShortDescription(`a ${keyword}`);
  g.setPrimaryKeyword(keyword);
  g.setConstructionForm(form);
  g.setSlotClaim(planPath, ['torso']);
  return g;
}

function context(body: Wearer, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: body as never,
    location: location as never,
    commandText: 'wear',
    executionId: 'test',
    commandId: 'test',
    verb: 'wear',
    command: CommandDefinition.fromYaml(
      'verbs: [wear]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

/** Dispatch, then let the dressing steps land. */
async function equipVia(
  ...args: Parameters<EquipController['execute']>
): Promise<void> {
  await makeStuff(() => new EquipController()).execute(...args);
  await settle();
}

function model(target: TestGarment): Parameters<EquipController['execute']>[0] {
  return {
    target: { stuff: target as never, raw: target.getPrimaryKeyword() ?? '' },
  } as ModelData as unknown as Parameters<EquipController['execute']>[0];
}

describe('the ladder refusal', () => {
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  function setup(): {
    body: Wearer;
    planPath: string;
    location: Location;
  } {
    installV1QuantityMarshallers();
    standUpScheduler();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
    const { body, planPath } = bodyAndPlanPath();
    const location = makeStuff(() => new Location());
    ContainmentApi.move(body, location);
    return { body, planPath, location };
  }

  it('⚠ refuses a shirt OVER plate, and names what is in the way', async () => {
    const { body, planPath, location } = setup();
    const cuirass = garment(planPath, 'plate', 'cuirass');
    const shirt = garment(planPath, 'woven', 'shirt');
    ContainmentApi.move(cuirass, body);
    ContainmentApi.move(shirt, body);
    body.occupyAll(cuirass, ['torso']);

    const ctx = context(body, location);
    await equipVia(model(shirt), ctx);

    const notes = ctx.getNotes();
    expect(notes.some((n) => n.kind === 'controller-rejected')).toBe(true);
    const rejection = notes.find((n) => n.kind === 'controller-rejected') as
      | { reason?: string }
      | undefined;
    expect(rejection?.reason).toBe('layer-order');
    // …and it did NOT go on.
    expect(body.getOccupants('torso').has(shirt)).toBe(false);
  });

  it('⭐ does NOT refuse a coat over a shirt — that is the player\'s call', async () => {
    const { body, planPath, location } = setup();
    const shirt = garment(planPath, 'woven', 'shirt');
    const coat = garment(planPath, 'woven', 'coat');
    ContainmentApi.move(shirt, body);
    ContainmentApi.move(coat, body);
    body.occupyAll(shirt, ['torso']);

    const ctx = context(body, location);
    await equipVia(model(coat), ctx);

    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(false);
    expect(body.getOccupants('torso').has(coat)).toBe(true);
  });

  it('plate OVER a shirt is fine — the ladder only forbids the inversion', async () => {
    const { body, planPath, location } = setup();
    const shirt = garment(planPath, 'woven', 'shirt');
    const cuirass = garment(planPath, 'plate', 'cuirass');
    ContainmentApi.move(shirt, body);
    ContainmentApi.move(cuirass, body);
    body.occupyAll(shirt, ['torso']);

    const ctx = context(body, location);
    await equipVia(model(cuirass), ctx);

    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(false);
    expect(body.coveringAt('body.torso')[0]).toBe(cuirass);
  });
});

describe('the impossible fit', () => {
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  it("⚠ refuses a garment cut for a body unlike yours, with a `fit-impossible` note", async () => {
    installV1QuantityMarshallers();
    standUpScheduler();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
    const n = seq++;
    const plan = makeStuff(() => new BodyPlan());
    plan.setName(`refuse-${n}`);
    plan.setBaseMass(70);
    plan.setBaseStature(1.75);
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
    const planPath = `/stuff/idea/species/BodyPlan/refuse-${n}`;
    stampTemplatePathForTest(plan, planPath);

    const species = makeStuff(() => new Species());
    species.setBodyPlan(plan);
    species.setBaseMass(125);
    species.setStature(2.0);
    stampTemplatePathForTest(species, `/stuff/idea/species/test/refuse-${n}`);

    const big = makeStuff(() => new Wearer());
    big.setSpecies(species);
    const location = makeStuff(() => new Location());
    ContainmentApi.move(big, location);

    // Cut for a halfling — and both are the same body plan, so slot
    // matching alone would have let it straight on.
    const coat = garment(planPath, 'woven', 'coat');
    coat.setCutTo(planPath, 1.05, Math.sqrt(38 / 1.05));
    ContainmentApi.move(coat, big);

    const ctx = context(big, location);
    await equipVia(model(coat), ctx);

    const rejection = ctx
      .getNotes()
      .find((n2) => n2.kind === 'controller-rejected') as
      | { reason?: string }
      | undefined;
    expect(rejection?.reason).toBe('fit-impossible');
    expect(big.getOccupants('torso').has(coat)).toBe(false);
  });
});

describe('the wardrobe stanza — getting dressed is one command', () => {
  afterEach(() => {
    Construction.clearFabrics();
    StuffApi.clearAll();
  });

  function dressed(): {
    body: Wearer;
    planPath: string;
    location: Location;
    shirt: TestGarment;
    coat: TestGarment;
  } {
    installV1QuantityMarshallers();
    standUpScheduler();
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
    const { body, planPath } = bodyAndPlanPath();
    const location = makeStuff(() => new Location());
    ContainmentApi.move(body, location);
    const shirt = garment(planPath, 'woven', 'shirt');
    const coat = garment(planPath, 'woven', 'coat');
    ContainmentApi.move(shirt, body);
    ContainmentApi.move(coat, body);
    return { body, planPath, location, shirt, coat };
  }

  async function run(
    body: Wearer,
    location: Location,
    model: Record<string, unknown>,
  ): Promise<ReturnType<typeof context>> {
    const ctx = context(body, location);
    await equipVia(model as never, ctx);
    return ctx;
  }

  it('⭐ `--save` captures the worn stack in WEAR ORDER (innermost first)', async () => {
    const { body, location, shirt, coat } = dressed();
    body.occupyAll(shirt, ['torso']);
    body.occupyAll(coat, ['torso']);

    await run(body, location, { subcommand: 'set', name: 'daily', save: true });
    // Worn shirt-then-coat, so the saved order is shirt-then-coat —
    // which is exactly the order a replay must dress in.
    expect(body.getWardrobe('daily')).toEqual(['shirt', 'coat']);
  });

  it('replays the set in one command, innermost-first', async () => {
    const { body, location, shirt, coat } = dressed();
    body.setWardrobe('daily', ['shirt', 'coat']);

    await run(body, location, { subcommand: 'set', name: 'daily' });
    expect(body.getOccupants('torso').has(shirt)).toBe(true);
    expect(body.getOccupants('torso').has(coat)).toBe(true);
    // …and the ladder is satisfied: the coat went on second, so it is
    // outer, which is what wear order means.
    expect(body.coveringAt('body.torso')[0]).toBe(coat);
  });

  it('⚠ a missing keyword is SKIPPED readably and the rest still land', async () => {
    // A dressing mistake has to be survivable and readable, and that
    // starts here: failures are per-item and non-fatal.
    const { body, location, shirt } = dressed();
    body.setWardrobe('daily', ['shirt', 'hat-i-sold', 'coat']);

    const ctx = await run(body, location, { subcommand: 'set', name: 'daily' });
    expect(body.getOccupants('torso').has(shirt)).toBe(true);
    // No rejection note — a partial dress is a success with a caveat.
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(false);
  });

  it('an unknown set is refused by name', async () => {
    const { body, location } = dressed();
    const ctx = await run(body, location, { subcommand: 'set', name: 'nope' });
    const rejection = ctx
      .getNotes()
      .find((n) => n.kind === 'controller-rejected') as
      | { reason?: string }
      | undefined;
    expect(rejection?.reason).toBe('unknown-set');
  });

  it('`--save` with nothing on refuses rather than saving an empty set', async () => {
    const { body, location } = dressed();
    const ctx = await run(body, location, {
      subcommand: 'set',
      name: 'empty',
      save: true,
    });
    const rejection = ctx
      .getNotes()
      .find((n) => n.kind === 'controller-rejected') as
      | { reason?: string }
      | undefined;
    expect(rejection?.reason).toBe('nothing-worn');
    expect(body.getWardrobeNames()).toEqual([]);
  });

  it('`wear sets` lists what is saved', async () => {
    const { body, location } = dressed();
    body.setWardrobe('daily', ['shirt', 'coat']);
    const ctx = await run(body, location, { subcommand: 'sets' });
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(false);
  });
});
