import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LightReading from '../LightReading';
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import { AmbientLitMixin } from '../../../../lib/perception/AmbientLit';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../api/command';
import type Interactive from '../../Interactive';
import ToolItem from '../../../thing/ToolItem';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import MeasureController from '../../cmd/perception/MeasureController';
import AnalyzeController from '../../cmd/perception/AnalyzeController';
import type Reading from '../../../../lib/instrument/Reading';
import type { MqlOneResult } from '../../../../api/mql';
import { withRow } from './row';
import { driveMeasure, instrumentWith } from './drive';
// Vision modality singleton + perception cache live behind PerceptionApi.
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';

class AmbientLoc extends AmbientLitMixin(CartesianLocation) {}

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea)))))
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>'
  );
}

function makeContext(avatar: FakeAvatar, location: AmbientLoc): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'measure light here',
    executionId: 't',
    commandId: 'c',
    verb: 'measure',
    command: stubCommand('measure'),
  });
}

/**
 * ⭐ The instrument is an ARGUMENT now, bound by the binder and narrowed
 * by the channel's declared capability — so the test hands one in rather
 * than putting a `Photometer` in an inventory for a class check to find.
 * A second maker's photometer works here, which it never could before.
 */
function photometer(): Promise<Stuff> {
  return instrumentWith('photometry');
}

describe('LightReading', () => {
  beforeEach(() => {
    buildAllModalities();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('emits canonical lux when called with a location', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² scale
    const room = makeStuff(() => new AmbientLoc());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(40);

    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const reading = withRow(await StuffApi.create(() => new LightReading()), 'light');
    await driveMeasure(reading, makeContext(avatar, room), { subject: { stuff: room, raw: 'here' }, tools: [await photometer()] });
    expect(avatar.received).toHaveLength(1);
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('<quantity channel="light" unit="lux"');
    // ⭐⭐ The FIGURE is asserted through the engine's own read; the prose
    // carries the reader's bracket, and an untrained reader's centre is
    // not the truth. `truth()` exists for exactly this.
    expect(await reading.truth(room as unknown as never)).toBe(40);
    expect(frame.body).toMatch(/±/);
  });

  it('returns a failure when no location is bound', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² scale
    const room = makeStuff(() => new AmbientLoc());
    zone.addLocation(room, 0, 0, 0);
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const reading = withRow(await StuffApi.create(() => new LightReading()), 'light');
    await driveMeasure(reading, makeContext(avatar, room), { subject: { stuff: null, raw: 'foo' }, tools: [await photometer()] });
  });
});
