/**
 * ⭐ The run that breaks (nutrition-and-fitness W2 / plan D9). A mode
 * faster than a walk is asked of the body first: a fresh actor with
 * endurance under the pace floor running an exit emits `pace-broken`,
 * hears the winded line, and traverses under `walk`; an actor at wind
 * 100 keeps `run`; a walk is never asked.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RunController from '../RunController';
import GoController from '../GoController';
import CartesianZone from '../../../location/CartesianZone';
import CartesianLocation from '../../../../../lib/location/CartesianLocation';
import Exit from '../../../../../lib/boundary/Exit';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { ContainmentApi } from '../../../../../api/containment';
import { MqlApi, type MqlOneResult } from '../../../../../api/mql';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { MobileMixin } from '../../../../../lib/spatial/Mobile';
import { ReservedMixin, Reserve } from '../../../../../lib/reserve';
import { ExertingMixin } from '../../../../../lib/exertion/Exerting';
import type Interactive from '../../../Interactive';
import type Location from '../../../../../lib/stuff/Location';
import { CommandApi, type CommandContext, type CommandModel, type ModelData } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { AppApi } from '../../../../../api/app';
import { Quantity } from '../../../../../lib/quantity';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';
import { LocomotionMode } from '../../../LocomotionMode';
import { Idea } from '../../../../../lib/stuff/Idea';
import { buildMode } from '../../../../../lib/locomotion/__tests__/test-helpers';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { StuffApi } from '../../../../../api/stuff';

const RunnerBase = ExertingMixin(
  ReservedMixin(CommandGiverMixin(NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Idea)))))),
);
class Runner extends RunnerBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(avatar: Runner, location: Location, verb: string): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: `${verb} north`,
    executionId: 'test-execution',
    commandId: 'test-command-id',
    verb,
    command: stubCommand(verb),
  });
}

function resolveTarget(giver: Stuff, raw: string): MqlOneResult {
  const r = MqlApi.resolveOne(raw, {
    commandGiver: giver as Parameters<typeof MqlApi.resolveOne>[1]['commandGiver'],
    scope: 'reachable',
  });
  const bound: MqlOneResult = { stuff: r.stuff, raw };
  if (r.via) bound.via = r.via;
  return bound;
}

describe('LocomotionControllerBase — the run that breaks', () => {
  let locA: CartesianLocation;
  let locB: CartesianLocation;
  let runner: Runner;

  beforeEach(async () => {
    installV1QuantityMarshallers();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    buildMode('walk');
    // The helper's defaults table has no `run`; register the pace sibling
    // at its own path (speed 2, twice the walk's watts).
    const run = makeStuffAtPath(() => new LocomotionMode(), '/platform/idea/LocomotionMode/run');
    run.setName('run');
    run.setSpeed(2.0);
    run.setCostMultiplier(2.0);
    run.setMedium('ground');
    const zone = makeStuff(() => new CartesianZone());
    locA = makeStuff(() => new CartesianLocation());
    locB = makeStuff(() => new CartesianLocation());
    zone.addLocation(locA, 0, 0, 0);
    zone.addLocation(locB, 0, 1, 0);
    await locA.addExit(
      makeStuff(() => new Exit({ direction: 'north', source: locA, destination: locB })),
    );
    await locB.addExit(
      makeStuff(() => new Exit({ direction: 'south', source: locB, destination: locA })),
    );
    runner = makeStuff(() => new Runner());
    runner.setName('Hal');
    for (const [key, level] of [['endurance', 100], ['wind', 0]] as const) {
      runner.setReserve(
        new Reserve(key, Quantity.of(100, '%'), Quantity.of(level, '%'), 'biological', null),
      );
    }
    ContainmentApi.move(runner, locA);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const run = async (Controller: typeof RunController | typeof GoController, verb: string) => {
    const controller = makeStuff(() => new Controller());
    const ctx = makeContext(runner, locA, verb);
    const model: CommandModel = { target: resolveTarget(runner as unknown as Stuff, 'north') } as ModelData;
    await controller.execute(model, ctx);
    return ctx;
  };
  const endurance = () => runner.getReserve('endurance')!.current.rawValue();

  it('a fresh body holds the first run — and pays for it', async () => {
    const ctx = await run(RunController, 'run');
    expect(runner.getContainer()).toBe(locB);
    expect(ctx.getNotes().some((n) => n.kind === 'pace-broken')).toBe(false);
    expect(endurance()).toBeCloseTo(88, 6);
  });

  it('⭐ under the pace floor the run BREAKS to a walk — note, line, and the traverse still happens', async () => {
    runner.adjustReserve('endurance', Quantity.of(-60, '%'));
    const ctx = await run(RunController, 'run');
    expect(runner.getContainer()).toBe(locB);
    const note = ctx.getNotes().find((n) => n.kind === 'pace-broken');
    expect(note).toEqual({ kind: 'pace-broken', from: 'run', to: 'walk' });
    expect(JSON.stringify(runner.received)).toContain('winded');
    // Walked, so the walk's power: nothing debited.
    expect(endurance()).toBeCloseTo(40, 6);
  });

  it('⭐ a conditioned body keeps the run past where the fresh one broke', async () => {
    runner.adjustReserve('endurance', Quantity.of(-60, '%'));
    runner.adjustReserve('wind', Quantity.of(100, '%'));
    const ctx = await run(RunController, 'run');
    expect(ctx.getNotes().some((n) => n.kind === 'pace-broken')).toBe(false);
    expect(endurance()).toBeCloseTo(40, 6);
  });

  it('a walk is never asked', async () => {
    runner.adjustReserve('endurance', Quantity.of(-95, '%'));
    const ctx = await run(GoController, 'go');
    expect(runner.getContainer()).toBe(locB);
    expect(ctx.getNotes().some((n) => n.kind === 'pace-broken')).toBe(false);
  });
});
