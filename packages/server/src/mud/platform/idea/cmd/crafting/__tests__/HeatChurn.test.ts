/**
 * The two widened arms of the kitchen's work verbs (dairy D5, D6): `heat`
 * SETS a plain vessel on the lit fire in reach so its contents really
 * warm, and `churn` works a vessel that answers `HandWorked` — while the
 * build arms of both are exactly as they were.
 */

import '../../../../../../test-bootstrap';
import { chargeHot } from '../../../../../lib/fire/__tests__/burner-fuel';
import type { Burner } from '../../../../../lib/fire/Burner';
import { ThermalMixin } from '../../../../../lib/thermal/Thermal';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HeatController from '../HeatController';
import StirController from '../StirController';
import Hearth from '../../../../thing/Hearth';
import Vat from '../../../../thing/Vat';
import Material from '../../../../../lib/material/Material';
import Receptacle from '../../../../thing/Receptacle';
import Good from '../../../../../lib/stuff/Good';
import { Quantity } from '../../../../../lib/quantity';
import { Reserve } from '../../../../../lib/reserve';
import { StuffApi } from '../../../../../api/stuff';
import { WorldClockApi } from '../../../../../api/worldclock';
import { SchedulerApi } from '../../../../../api/scheduler';
import { EventApi } from '../../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import Forge from '../../../../thing/Forge';
import { Idea } from '../../../../../lib/stuff/Idea';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { EngagedMixin } from '../../../../../lib/activity/Engaged';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ManualBuildMixin } from '../../../../../lib/craft/ManualBuild';
import { ToolMixin } from '../../../../../lib/craft/Tooled';
import { BulkableMixin } from '../../../../../lib/bulk/Bulkable';
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

class TestActor extends ThermalMixin(
  CommandGiverMixin(
    SensorMixin(EngagedMixin(ContainerMixin(ContainableMixin(Idea)))),
  ),
) {
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}

/** A cook pot's shape: a build host + a tool, and NOT bulkable. */
class TestPot extends ManualBuildMixin(ToolMixin(Good)) {}

const heatCmd = CommandDefinition.fromYaml(
  'verbs: [heat]\ncontroller: x\ndescription: d\n',
  '<test>',
);
const stirCmd = CommandDefinition.fromYaml(
  'verbs: [stir, shake, churn]\ncontroller: x\ndescription: d\n',
  '<test>',
);

const ref = (stuff: Stuff | null): MqlOneResult =>
  ({ stuff, raw: 'it' }) as unknown as MqlOneResult;

let actor: TestActor;
let room: Location;
let now = 0;
let seq = 0;

/** A lit hearth (Placing) or a lit forge (not Placing) in the room. */
async function stand(kind: 'hearth' | 'forge' | 'cold-hearth'): Promise<Stuff> {
  room = makeStuff(() => new Location());
  actor = makeStuff(() => new TestActor());
  await ContainmentApi.move(actor as never, room as never);
  const f =
    kind === 'forge'
      ? makeStuff(() => {
          const x = new Forge();
          x.setBurnTemperatureK(900);
          return x;
        })
      : makeStuff(() => {
          const x = new Hearth();
          x.setBurnTemperatureK(500);
          // A hearth row starts OUT (`lit = false`); a lit one is a fire
          // somebody lit. Construction-time field write, not a light act.
          x.lit = kind !== 'cold-hearth';
          return x;
        });
  if (kind !== 'cold-hearth') chargeHot(f as unknown as Stuff & Burner, 40);
  await ContainmentApi.move(f as never, room as never);
  return f;
}

function vat(): Vat {
  seq += 1;
  const v = makeStuffAtPath(() => {
    const x = new Vat();
    x.setShortDescription('a cheese vat');
    x.setKeywords(['vat']);
    x.setMass(Quantity.of(8, 'kg'));
    (x as unknown as { interiorBulk: boolean }).interiorBulk = true;
    x.setInteriorCapacity(Quantity.of(25, 'L'));
    return x;
  }, `/stuff/thing/vessel/_heatvat-${seq}`) as Vat;
  return v;
}

async function run(
  ctrlMake: () => HeatController | StirController,
  verb: string,
  argName: string,
  target: Stuff | null,
): Promise<CommandContext> {
  const ctx = CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room as never,
    commandText: `${verb} it`,
    executionId: 't',
    commandId: 't',
    verb,
    command: verb === 'heat' ? heatCmd : stirCmd,
  });
  const ctrl = makeStuff(ctrlMake);
  await ctrl.execute(
    target === null ? ({} as never) : ({ [argName]: ref(target) } as never),
    ctx,
  );
  now += 60_000;
  WorldClockApi._advanceForTesting(60_000);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  return ctx;
}

function refusal(ctx: CommandContext): string | null {
  const found = ctx.getNotes().find((n) => n.kind === 'controller-rejected') as
    | { reason?: string }
    | undefined;
  return found?.reason ?? null;
}

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
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('⭐ heat — the placing arm (dairy D6)', () => {
  it('a vat beside a lit hearth is SET ON it, and reads the fire', async () => {
    const hearth = await stand('hearth');
    const v = vat();
    await ContainmentApi.move(v as never, room as never);
    const ctx = await run(() => new HeatController(), 'heat', 'target', v);
    expect(refusal(ctx)).toBeNull();
    const placement = v.getPlacement();
    expect(placement?.name).toBe('on');
    expect((placement?.host as Stuff | undefined)?.stuffId).toBe(hearth.stuffId);
  });

  it('beside a cold hearth it declines with the fire line', async () => {
    await stand('cold-hearth');
    const v = vat();
    await ContainmentApi.move(v as never, room as never);
    const ctx = await run(() => new HeatController(), 'heat', 'target', v);
    expect(refusal(ctx)).toBe('no-fire-to-set-on');
    expect(v.getPlacement()).toBeNull();
  });

  it('a fire you cannot set things on (a forge) declines the same way', async () => {
    await stand('forge');
    const v = vat();
    await ContainmentApi.move(v as never, room as never);
    const ctx = await run(() => new HeatController(), 'heat', 'target', v);
    expect(refusal(ctx)).toBe('no-fire-to-set-on');
  });

  it('a build vessel still latches — the build arm is untouched', async () => {
    await stand('hearth');
    seq += 1;
    const pot = makeStuffAtPath(() => {
      const p = new TestPot();
      p.setShortDescription('a cook pot');
      p.setKeywords(['pot']);
      p.setCapabilities(['pot']);
      return p;
    }, `/stuff/thing/vessel/_heatpot-${seq}`) as TestPot;
    await ContainmentApi.move(pot as never, room as never);
    const ctx = await run(() => new HeatController(), 'heat', 'target', pot);
    expect(refusal(ctx)).toBeNull();
    expect(pot.getHeatedToK()).toBeGreaterThan(0);
  });
});

describe('⭐ churn — the hand-worked arm (dairy D5)', () => {
  it('a vessel answering workByHand is worked, and says what came of it', async () => {
    await stand('hearth');
    const calls: string[] = [];
    class TestChurn extends BulkableMixin(Good) {
      workByHand(method: string): string | null {
        calls.push(method);
        return 'It breaks.';
      }
    }
    const churn = makeStuff(() => new TestChurn());
    await ContainmentApi.move(churn as never, room as never);
    const ctx = await run(() => new StirController(), 'churn', 'vessel', churn);
    expect(refusal(ctx)).toBeNull();
    expect(calls).toEqual(['churned']);
  });

  it('a vessel that is neither a build nor hand-worked is refused', async () => {
    await stand('hearth');
    const v = vat();
    await ContainmentApi.move(v as never, room as never);
    const ctx = await run(() => new StirController(), 'churn', 'vessel', v);
    expect(refusal(ctx)).toBe('no-vessel');
  });
});
