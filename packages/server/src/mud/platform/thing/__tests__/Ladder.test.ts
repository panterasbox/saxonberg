/**
 * Ladder — ⭐ the first instanceable `Climbable`, and the first time
 * `climb` has ever bound an exit. A ladder standing in the room is what
 * the enablement walk finds (the room's contents); `climb down` at the
 * head lands at the foot; without the ladder the same exit refuses with
 * the enablement gate.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Ladder from '../Ladder';
import ClimbController from '../../idea/cmd/movement/ClimbController';
import CartesianZone from '../../idea/location/CartesianZone';
import CartesianLocation from '../../../lib/location/CartesianLocation';
import Exit from '../../../lib/boundary/Exit';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { ContainmentApi } from '../../../api/containment';
import { LocomotionApi } from '../../../api/locomotion';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { NamedMixin } from '../../../lib/description/Named';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../../lib/mixin';
import type Interactive from '../../idea/Interactive';
import type Location from '../../../lib/stuff/Location';
import { CommandApi, type CommandContext, type CommandModel, type ModelData } from '../../../api/command';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';
import { AppApi } from '../../../api/app';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import { Idea } from '../../../lib/stuff/Idea';
import { buildMode } from '../../../lib/locomotion/__tests__/test-helpers';
import { StuffApi } from '../../../api/stuff';

class Climber extends CommandGiverMixin(NamedMixin(MobileMixin(SensorMixin(ContainableMixin(Idea))))) {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function makeContext(avatar: Climber, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'climb down',
    executionId: 'test-execution',
    commandId: 'test-command-id',
    verb: 'climb',
    command: CommandDefinition.fromYaml('verbs: [climb]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

describe('Ladder — somebody can finally climb', () => {
  let head: CartesianLocation;
  let foot: CartesianLocation;
  let climber: Climber;
  let down: Exit;

  beforeEach(async () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('');
    buildMode('walk');
    buildMode('climb');
    const zone = makeStuff(() => new CartesianZone());
    head = makeStuff(() => new CartesianLocation());
    foot = makeStuff(() => new CartesianLocation());
    zone.addLocation(head, 0, 0, 0);
    zone.addLocation(foot, 0, 0, -1);
    down = makeStuff(() => new Exit({ direction: 'down', source: head, destination: foot }));
    down.setMedia(['vertical']);
    await head.addExit(down);
    const up = makeStuff(() => new Exit({ direction: 'up', source: foot, destination: head }));
    up.setMedia(['vertical']);
    await foot.addExit(up);
    climber = makeStuff(() => new Climber());
    climber.setName('Hal');
    ContainmentApi.move(climber, head);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const ladderHere = (): Ladder => {
    const l = makeStuff(() => new Ladder());
    l.setAxes(['down', 'up']);
    ContainmentApi.move(l, head);
    return l;
  };

  it('⭐ AFFORDS `climb` from the room — the drive found the verb unknown at the winze head', () => {
    expect(Ladder.commandContributions.environment).toContain('platform/cmd/movement/climb.yaml');
  });

  it('is the first instanceable Climbable', () => {
    const l = makeStuff(() => new Ladder());
    expect(MixinApi.hasMixin(l, Mixins.Climbable)).toBe(true);
    expect(l.getDifficulty()).toBeNull();
  });

  it('⭐ a ladder in the room satisfies the climb enablement for its axes', () => {
    const climb = LocomotionApi.modeOfOrThrow('climb');
    const before = LocomotionApi.canTraverseExit(climber, down, climb, 'down');
    expect(before.ok).toBe(false);
    if (!before.ok) expect(before.gate).toBe('enablement');
    ladderHere();
    expect(LocomotionApi.canTraverseExit(climber, down, climb, 'down').ok).toBe(true);
  });

  it('⭐⭐ `climb down` at the head lands at the foot — the first climb in the game', async () => {
    ladderHere();
    const controller = makeStuff(() => new ClimbController());
    const r = MqlApi.resolveOne('down', {
      commandGiver: climber as unknown as Parameters<typeof MqlApi.resolveOne>[1]['commandGiver'],
      scope: 'reachable',
    });
    const target: MqlOneResult = { stuff: r.stuff, raw: 'down' };
    if (r.via) target.via = r.via;
    await controller.execute({ target } as ModelData as CommandModel, makeContext(climber, head));
    expect(climber.getContainer()).toBe(foot);
  });
});
