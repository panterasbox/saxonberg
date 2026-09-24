/**
 * `steep` / `infuse` — **the general infusion verb.**
 *
 * Moved to platform in the clinical-medicine review: infusion is not a
 * medicine trick, it is a solvent extracting a solute. What steeping
 * PRODUCES is decided by the solute (`SteepableMixin.getSteepsInto`),
 * never by the controller — the same "an act, not an outcome" shape as
 * `boil`. This file is written around three facts:
 *
 *  - a steepable in a vessel of SOLVENT (a Material tagged `solvent` —
 *    v1 that is water) turns the solvent into its extract and is consumed;
 *  - the act is DURATIVE — the effect lands at completion, so a barge-in
 *    takes nothing (proven here by asserting the solvent is untouched
 *    until the clock advances);
 *  - a non-steepable target, or a vessel with no solvent, is refused.
 *
 * See docs/subsystems/crafting.md and lib/craft/Steepable.ts.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SteepController from '../SteepController';
import Material from '../../../../../lib/material/Material';
import Receptacle from '../../../../thing/Receptacle';
import Thing from '../../../../../lib/stuff/Thing';
import { Quantity } from '../../../../../lib/quantity';
import { StuffApi } from '../../../../../api/stuff';
import { WorldClockApi } from '../../../../../api/worldclock';
import { SchedulerApi } from '../../../../../api/scheduler';
import { EventApi } from '../../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import { Idea } from '../../../../../lib/stuff/Idea';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { EngagedMixin } from '../../../../../lib/activity/Engaged';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { SteepableMixin } from '../../../../../lib/craft/Steepable';
import Location from '../../../../../lib/stuff/Location';
import { ContainmentApi } from '../../../../../api/containment';
import { MixinApi } from '../../../../../api/mixin';
import { CommandApi } from '../../../../../api/command';
import type { CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
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

/** A solute you can steep — a herb, a leaf. Containable so it can be held. */
class TestSolute extends SteepableMixin(ContainableMixin(Thing)) {}

const WATER = '/stuff/idea/material/_steeptest/water';
const OIL = '/stuff/idea/material/_steeptest/oil';
const EXTRACT = '/stuff/idea/material/_steeptest/extract';

const stubCommand = CommandDefinition.fromYaml(
  'verbs: [steep]\ncontroller: x\ndescription: d\n',
  '<test>',
);

const ref = (stuff: Stuff | null): MqlOneResult =>
  ({ stuff, raw: 'x' }) as unknown as MqlOneResult;

/** A bulk material, tagged `solvent` or not. */
function material(path: string, tags: string[]): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setTags(tags);
    return m;
  }, path) as unknown as Material;
}

let seq = 0;

function makeReceptacle(mat: Material | null, litres = 1): Receptacle {
  seq += 1;
  const pot = makeStuffAtPath(() => {
    const v = new Receptacle();
    v.setShortDescription('a clay pot');
    v.setKeywords(['pot']);
    v.setMass(Quantity.of(1, 'kg'));
    (v as unknown as { interiorBulk: boolean }).interiorBulk = true;
    v.setInteriorCapacity(Quantity.of(5, 'L'));
    return v;
  }, `/stuff/thing/vessel/_steeppot-${seq}`) as Receptacle;
  if (mat !== null) {
    const slot = pot.getBulk();
    slot.setMaterial(mat);
    slot.setAmount(Quantity.of(litres, 'L'));
  }
  return pot;
}

function makeSolute(): TestSolute {
  seq += 1;
  return makeStuffAtPath(() => {
    const s = new TestSolute();
    s.setShortDescription('a sprig of greywort');
    s.setKeywords(['greywort']);
    s.steepsInto = EXTRACT;
    return s;
  }, `/stuff/thing/_solute-${seq}`) as TestSolute;
}

let actor: TestActor;
let room: Location;
let now = 0;

async function stand(): Promise<void> {
  room = makeStuff(() => new Location());
  actor = makeStuff(() => new TestActor());
  await ContainmentApi.move(actor as never, room as never);
}

/** Run `steep`, WITHOUT advancing the clock (the step is left running). */
async function steepStart(
  solute: Stuff | null,
  vessel: Stuff | null,
): Promise<CommandContext> {
  const ctx = CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: 'steep greywort in pot',
    executionId: 't',
    commandId: 't',
    verb: 'steep',
    command: stubCommand,
  });
  const ctrl = makeStuff(() => new SteepController());
  await ctrl.execute(
    {
      solute: solute === null ? undefined : ref(solute),
      vessel: vessel === null ? undefined : ref(vessel),
    } as never,
    ctx,
  );
  return ctx;
}

/** Let the running engaged step complete. */
function tick(): Promise<void> {
  now += 90_000;
  WorldClockApi._advanceForTesting(90_000);
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function refusal(ctx: CommandContext): string | null {
  const found = ctx.getNotes().find((n) => n.kind === 'controller-rejected') as
    | { reason?: string }
    | undefined;
  return found?.reason ?? null;
}

const contents = (pot: Receptacle): string | null =>
  pot.getBulk().getMaterialPath();

beforeEach(async () => {
  installV1QuantityMarshallers();
  installV1QuantityTagTables();
  SchedulerApi._clearAllForTesting();
  const reg = await StuffApi.create(() => new EventRegistry());
  stampTemplatePathForTest(reg, '/platform/idea/EventRegistry');
  EventApi._setRegistryForTesting(reg);
  WorldClockApi._resetForTesting();
  now = 0;
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  material(WATER, ['liquid', 'water', 'solvent']);
  material(OIL, ['liquid', 'oil']); // NOT a solvent in v1
  material(EXTRACT, ['liquid', 'draught']);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('⭐ the substrate — a steepable is what affords `steep`', () => {
  it('composes SteepableMixin and reports what it steeps into', () => {
    const s = makeSolute();
    expect(MixinApi.isSteepable(s)).toBe(true);
    expect(s.getSteepsInto()).toBe(EXTRACT);
  });
});

describe('⭐ steeping — the solvent becomes the extract, the solute is spent', () => {
  it('a solute in a pot of water infuses on completion', async () => {
    await stand();
    const pot = makeReceptacle(StuffApi.findByTemplatePath<Material>(WATER)!);
    const solute = makeSolute();
    const solutePath = solute.getTemplatePath();
    await ContainmentApi.move(pot as never, room as never);
    await ContainmentApi.move(solute as never, actor as never);

    const ctx = await steepStart(solute, pot);
    expect(refusal(ctx)).toBeNull();
    // ⭐ DURATIVE — the effect has NOT landed yet; the water is untouched.
    expect(contents(pot)).toBe(WATER);

    await tick();
    // Completion: the water is now the extract, the herb consumed.
    expect(contents(pot)).toBe(EXTRACT);
    expect(StuffApi.findByTemplatePath(solutePath)).toBeFalsy();
  });
});

describe('steeping needs a solute and a solvent', () => {
  it('a non-steepable target is refused', async () => {
    await stand();
    const pot = makeReceptacle(StuffApi.findByTemplatePath<Material>(WATER)!);
    const rock = makeStuff(() => new Thing());
    await ContainmentApi.move(pot as never, room as never);
    expect(refusal(await steepStart(rock, pot))).toBe('not-steepable');
  });

  it('a vessel with no solvent (empty) is refused', async () => {
    await stand();
    const pot = makeReceptacle(null);
    const solute = makeSolute();
    await ContainmentApi.move(pot as never, room as never);
    await ContainmentApi.move(solute as never, actor as never);
    expect(refusal(await steepStart(solute, pot))).toBe('no-solvent');
  });

  it('⚠ a non-solvent liquid (oil, in v1) is refused — the tag gates it', async () => {
    await stand();
    const pot = makeReceptacle(StuffApi.findByTemplatePath<Material>(OIL)!);
    const solute = makeSolute();
    await ContainmentApi.move(pot as never, room as never);
    await ContainmentApi.move(solute as never, actor as never);
    expect(refusal(await steepStart(solute, pot))).toBe('no-solvent');
    // The oil is untouched — nothing steeped.
    expect(contents(pot)).toBe(OIL);
  });
});
