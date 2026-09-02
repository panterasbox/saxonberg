/**
 * `boil` (watershed W8) — **the actionable half of the John Snow
 * lesson**, and the middle rung of the counterplay ladder.
 *
 * Boiling is a change of MATERIAL, from whatever the vessel holds to
 * whatever that material declares it becomes. A material swap and not a
 * mutation, because a `Material` is a **shared reference Idea**: one row
 * backs every litre of that stuff in the world, so purifying by editing
 * the material would clean every river at once.
 *
 * ⭐ The most important test here is the one where boiling **does
 * nothing**. A river fouled by sewage boils clean in a pot; a river
 * fouled by a smelter does not, and the player who tries it learns the
 * difference between organic and persistent contamination the way it is
 * actually learned.
 *
 * See docs/subsystems/watershed.md.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BoilController from '../BoilController';
import Material from '../../../../../lib/material/Material';
import Receptacle from '../../../../thing/Receptacle';
import { Quantity } from '../../../../../lib/quantity';
import { Reserve } from '../../../../../lib/reserve';
import { StuffApi } from '../../../../../api/stuff';
import { WorldClockApi } from '../../../../../api/worldclock';
import Forge from '../../../../thing/Forge';
import { Idea } from '../../../../../lib/stuff/Idea';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { EngagedMixin } from '../../../../../lib/activity/Engaged';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import Location from '../../../../../lib/stuff/Location';
import { ContainmentApi } from '../../../../../api/containment';
import { CommandApi } from '../../../../../api/command';
import type { CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestActor extends CommandGiverMixin(
  SensorMixin(EngagedMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

const FOUL = '/stuff/idea/material/_test/foul-water';
const CLEAN = '/stuff/idea/material/_test/clean-water';
const LEADED = '/stuff/idea/material/_test/leaded-water';

const stubCommand = CommandDefinition.fromYaml(
  'verbs: [boil]\ncontroller: x\ndescription: d\n',
  '<test>',
);

function makeContext(actor: Stuff, room: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: 'boil pot',
    executionId: 't',
    commandId: 't',
    verb: 'boil',
    command: stubCommand,
  });
}

const ref = (stuff: Stuff | null): MqlOneResult =>
  ({ stuff, raw: 'pot' }) as unknown as MqlOneResult;

/** A water-like material, optionally declaring what boiling makes it. */
function water(path: string, purifiedInto: string, toxin: number): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setPurifiedByBoiling(purifiedInto);
    if (toxin > 0) m.setToxicity([{ type: 'dysentery', amount: toxin }]);
    return m;
  }, path) as unknown as Material;
}

let seq = 0;
/** A pot holding `litres` of `material`. */
function makePot(material: Material, litres = 2): Receptacle {
  seq += 1;
  const pot = makeStuffAtPath(() => {
    const v = new Receptacle();
    v.setShortDescription('a battered pot');
    v.setKeywords(['pot']);
    v.setMass(Quantity.of(1, 'kg'));
    (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(5, 'L'));
    return v;
  }, `/stuff/thing/vessel/_boiltest-${seq}`) as Receptacle;
  const slot = pot.getBulk();
  slot.setMaterial(material);
  slot.setAmount(Quantity.of(litres, 'L'));
  return pot;
}

function litFire(): Forge {
  return makeStuff(() => {
    const f = new Forge();
    f.setBurnTemperatureK(900);
    f.setReserve(
      new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    return f;
  });
}

function coldFire(): Forge {
  return makeStuff(() => {
    const f = new Forge();
    f.setBurnTemperatureK(900);
    f.setReserve(
      new Reserve('fuel', Quantity.of(0, '%'), Quantity.of(100, '%'), 'combustion', null),
    );
    return f;
  });
}

let actor: TestActor;
let room: Location;

async function stand(fire: Forge | null): Promise<void> {
  room = makeStuff(() => new Location());
  actor = makeStuff(() => new TestActor());
  await ContainmentApi.move(actor as never, room as never);
  if (fire !== null) await ContainmentApi.move(fire as never, room as never);
}

async function boil(pot: Stuff | null): Promise<CommandContext> {
  const ctx = makeContext(actor, room);
  const ctrl = makeStuff(() => new BoilController());
  await ctrl.execute({ vessel: ref(pot) } as never, ctx);
  return ctx;
}

/** What material the pot is holding now. */
const contents = (pot: Receptacle): string | null =>
  pot.getBulk().getMaterialPath();

/** The reason on the last controller-rejected note, or null. */
function refusal(ctx: CommandContext): string | null {
  const found = ctx
    .getNotes()
    .find((n) => n.kind === 'controller-rejected') as
    | { kind: string; reason?: string }
    | undefined;
  return found?.reason ?? null;
}

beforeEach(async () => {
  installV1QuantityMarshallers();
  installV1QuantityTagTables();
  WorldClockApi._resetForTesting();
  water(CLEAN, '', 0);
  water(FOUL, CLEAN, 12);
  // ⭐ Declares no counterpart: boiling lead gives you hot lead.
  water(LEADED, '', 40);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('⭐ boiling swaps the MATERIAL, and never mutates a shared one', () => {
  it('a pot of fouled water on a fire comes off clean', async () => {
    await stand(litFire());
    const pot = makePot(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(pot as never, room as never);

    expect(contents(pot)).toBe(FOUL);
    await boil(pot);
    expect(contents(pot)).toBe(CLEAN);
  });

  it('⭐⭐ the shared MATERIAL row is untouched — every other river is unaffected', async () => {
    await stand(litFire());
    const a = makePot(StuffApi.findByTemplatePath<Material>(FOUL)!);
    const b = makePot(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(a as never, room as never);
    await ContainmentApi.move(b as never, room as never);

    await boil(a);

    // One pot changed; the other did not, and neither did the material
    // row backing every litre of the stuff in the world.
    expect(contents(a)).toBe(CLEAN);
    expect(contents(b)).toBe(FOUL);
    const foul = StuffApi.findByTemplatePath<Material>(FOUL)!;
    expect(foul.getToxicity()).toHaveLength(1);
  });

  it('the clean water it becomes carries NO toxin — the metabolism path sees nothing to dose', async () => {
    await stand(litFire());
    const pot = makePot(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(pot as never, room as never);
    await boil(pot);

    const now = pot.getBulk().getMaterial()!;
    expect(now.getToxicity()).toHaveLength(0);
    // …whereas the water that went in would have dosed a drinker,
    // through the shipped `Material.toxicity` route and nothing new.
    const before = StuffApi.findByTemplatePath<Material>(FOUL)!;
    expect(before.getToxicity()[0]!.type).toBe('dysentery');
  });
});

describe('⭐ boiling does NOT fix everything, and the failure is the lesson', () => {
  it('a persistent contaminant boils to exactly itself, hotter', async () => {
    await stand(litFire());
    const pot = makePot(StuffApi.findByTemplatePath<Material>(LEADED)!);
    await ContainmentApi.move(pot as never, room as never);

    const ctx = await boil(pot);
    // Not a refusal — you really did boil it.
    expect(refusal(ctx)).toBeNull();
    // It is simply the same water.
    expect(contents(pot)).toBe(LEADED);
    expect(pot.getBulk().getMaterial()!.getToxicity()).toHaveLength(1);
  });
});

describe('boiling needs a vessel, something in it, and a hot enough fire', () => {
  it('nothing to boil', async () => {
    await stand(litFire());
    expect(refusal(await boil(null))).toBe('no-vessel');
  });

  it('an empty pot', async () => {
    await stand(litFire());
    const pot = makeStuffAtPath(() => {
      const v = new Receptacle();
      v.setShortDescription('an empty pot');
      (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
      v.setInteriorCapacity(Quantity.of(5, 'L'));
      return v;
    }, `/stuff/thing/vessel/_boilempty`) as Receptacle;
    await ContainmentApi.move(pot as never, room as never);
    expect(refusal(await boil(pot))).toBe('empty-vessel');
  });

  it('no fire at all', async () => {
    await stand(null);
    const pot = makePot(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(pot as never, room as never);
    expect(refusal(await boil(pot))).toBe('no-heat');
    expect(contents(pot)).toBe(FOUL);
  });

  it('a fire that is out', async () => {
    await stand(coldFire());
    const pot = makePot(StuffApi.findByTemplatePath<Material>(FOUL)!);
    await ContainmentApi.move(pot as never, room as never);
    expect(refusal(await boil(pot))).toBe('no-heat');
  });

  it('⚠ the threshold is the MATERIAL’s own boiling point, not a dial', async () => {
    await stand(litFire());
    // A material that boils hotter than this fire can reach.
    const tar = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('tar');
      m.setBoilingPoint(Quantity.of(5000, 'K'));
      m.setPurifiedByBoiling(CLEAN);
      return m;
    }, '/stuff/idea/material/_test/tar') as unknown as Material;
    const pot = makePot(tar);
    await ContainmentApi.move(pot as never, room as never);
    expect(refusal(await boil(pot))).toBe('insufficient-heat');
  });
});
