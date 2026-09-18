/**
 * `lift <load> [with <device>]` (nutrition-and-fitness W5 / D12): in
 * range → a hands step at `effortW = load × wattsPerKg` for the row's
 * set duration, and the body pays at completion; out of the device's
 * range → `load-out-of-range` with the honest line; above the body's
 * strain ceiling → `too-heavy`; nothing loadable in reach →
 * `not-a-load`. The device is a DECLARED arg the binder hands in.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LiftController from '../LiftController';
import LoadDevice from '../../../../thing/LoadDevice';
import { Creature } from '../../../../../lib/creature/Creature';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { EngagedMixin } from '../../../../../lib/activity/Engaged';
import { MobileMixin } from '../../../../../lib/spatial/Mobile';
import Location from '../../../../../lib/stuff/Location';
import { ContainmentApi } from '../../../../../api/containment';
import { StuffApi } from '../../../../../api/stuff';
import { AppApi } from '../../../../../api/app';
import { SchedulerApi } from '../../../../../api/scheduler';
import { WorldClockApi } from '../../../../../api/worldclock';
import { EventApi } from '../../../../../api/event';
import EventRegistry from '../../../EventRegistry';
import { Stuff } from '../../../../../lib/stuff/Stuff';
import { Quantity } from '../../../../../lib/quantity';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { CommandApi, type CommandContext, type CommandModel } from '../../../../../api/command';
import type { MqlManyResult } from '../../../../../api/mql';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Lifter extends CommandGiverMixin(MobileMixin(SensorMixin(EngagedMixin(Creature)))) {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
  protected override handleEnvelope(): void {}
}

function ctxFor(actor: Lifter, room: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: room,
    commandText: 'lift',
    executionId: 't',
    commandId: 't',
    verb: 'lift',
    command: CommandDefinition.fromYaml('verbs: [lift]\ncontroller: x\ndescription: d\n', '<test>'),
  });
}
const many = (...stuff: Stuff[]): MqlManyResult => ({ stuff, raw: '' }) as unknown as MqlManyResult;
const rejected = (ctx: CommandContext): string | null => {
  const n = ctx.getNotes().find((x) => x.kind === 'controller-rejected');
  return n && 'reason' in n ? (n.reason as string) : null;
};

async function makeRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

describe('LiftController — the load you choose', () => {
  let room: Location;
  let lifter: Lifter;
  let bar: LoadDevice;

  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
    StuffApi.clearAll();
    await makeRegistry();
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    room = makeStuff(() => new Location());
    lifter = makeStuff(() => new Lifter());
    lifter.setMass(Quantity.of(70, 'kg'));
    ContainmentApi.move(lifter as never, room as never);
    bar = makeStuff(() => new LoadDevice());
    bar.setShortDescription('iron barbell');
    bar.setCapabilities(['load']);
    ContainmentApi.move(bar as never, room as never);
  });
  afterEach(() => {
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const lift = async (load: number, device: MqlManyResult | undefined = many(bar)) => {
    const ctx = ctxFor(lifter, room);
    await makeStuff(() => new LiftController()).execute({ load, device } as CommandModel, ctx);
    return ctx;
  };

  it('⭐ in range: a 30 s hands step at load × wattsPerKg, paid at completion, and lean moves on a fresh body', async () => {
    const ctx = await lift(60);
    expect(rejected(ctx)).toBeNull();
    expect(lifter.getEngagementBySlot('hands')).toBeDefined();
    const before = lifter.getEndurance().current.rawValue();
    WorldClockApi._advanceForTesting(30_000);
    // 900 W: (900 − 300) × 30 / 1500 = 12 % of endurance…
    expect(lifter.getEndurance().current.rawValue()).toBeCloseTo(before - 12, 6);
    // …and 900 W clears a fresh body's overload line (0.7 × 840), so lean moved.
    expect(lifter.getLean().current.rawValue()).toBeGreaterThan(50);
    expect(JSON.stringify(lifter.received)).toContain('rack');
  });

  it('out of the row\'s range: refused with the honest line', async () => {
    const ctx = await lift(200);
    expect(rejected(ctx)).toBe('load-out-of-range');
    expect(JSON.stringify(lifter.received)).toContain('between 20 and 160');
    expect(lifter.getEngagementBySlot('hands')).toBeUndefined();
  });

  it('above the body\'s strain ceiling: too heavy', async () => {
    // Capacity 70 × 0.5 = 35 kg; ceiling ×2 = 70 kg. 100 is in the bar's
    // range and beyond the body.
    const ctx = await lift(100);
    expect(rejected(ctx)).toBe('too-heavy');
    expect(JSON.stringify(lifter.received)).toContain("off the floor");
  });

  it('nothing loadable in reach: not-a-load', async () => {
    const ctx = await lift(60, many());
    expect(rejected(ctx)).toBe('not-a-load');
  });

  it('too tired for the set: the mixin\'s refusal', async () => {
    // At endurance 12 the ceiling has shrunk to ~39 kg (the endurance
    // margin), so 30 still comes off the floor — and its 450 W set would
    // cost 3 %, leaving 9: under the exhaustion floor.
    lifter.adjustReserve('endurance', Quantity.of(-88, '%'));
    const ctx = await lift(30);
    expect(rejected(ctx)).toBe('too-tired');
  });
});
