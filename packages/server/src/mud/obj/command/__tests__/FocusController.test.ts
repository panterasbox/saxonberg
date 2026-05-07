/**
 * FocusController tests — display, set, parse-validation failure,
 * permission rejection on admin-tier seeds.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FocusController } from '../FocusController';
import { Idea } from '../../../lib/stuff/Idea';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { CartesianLocation } from '../../../lib/spatial/CartesianLocation';
import { ContainmentApi } from '../../../api/containment';
import { _MqlAdminFlag } from '../../../api/mql/permissions';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import type { Interactive } from '../../Interactive';
import type { Location } from '../../../lib/stuff/Location';
import type {
  CommandContext,
  CommandModel,
  ModelData,
} from '../../../api/command';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';

const TestGiverBase = CommandGiverMixin(
  ContainerMixin(ContainableMixin(SensorMixin(Idea)))
);
class TestGiver extends TestGiverBase {
  protected override handleMessage(): void {}
}

function makeModel(
  fields: ModelData = {},
  subcommand?: string
): CommandModel {
  const model: CommandModel = { ...fields };
  if (subcommand !== undefined) model.subcommand = subcommand;
  return model;
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>'
  );
}

function makeContext(giver: TestGiver, location: Location): CommandContext {
  return {
    commandGiver: giver as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'focus',
    executionId: 'test-execution',
    commandId: 'test-command',
    verb: 'focus',
    command: stubCommand('focus'),
  };
}

describe('FocusController', () => {
  let giver: TestGiver;
  let location: CartesianLocation;
  let controller: FocusController;

  beforeEach(() => {
    location = makeStuff(() => new CartesianLocation());
    location.setShortDescription('Town Square');
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
    controller = makeStuff(() => new FocusController());
  });

  afterEach(() => {
    _MqlAdminFlag.granter = () => false;
  });

  it('reports the current scope when no fragment is given', () => {
    giver.setScope('bookcase.book');
    const result = controller.execute(makeModel(), makeContext(giver, location));
    expect(result.success).toBe(true);
    expect(result.summary).toContain('bookcase.book');
  });

  it("defaults to 'here' scope when nothing has set it", () => {
    const result = controller.execute(makeModel(), makeContext(giver, location));
    expect(result.success).toBe(true);
    expect(result.summary).toContain('here');
  });

  it('sets scope to the supplied fragment after parse validation', () => {
    const result = controller.execute(
      makeModel({ fragment: 'inventory' }),
      makeContext(giver, location)
    );
    expect(result.success).toBe(true);
    expect(giver.getScope()).toBe('inventory');
  });

  it('rejects a syntactically invalid fragment without mutating scope', () => {
    giver.setScope('here');
    const result = controller.execute(
      makeModel({ fragment: '[]' }),
      makeContext(giver, location)
    );
    expect(result.success).toBe(false);
    expect(giver.getScope()).toBe('here');
  });

  it('rejects admin-tier seeds for non-admin givers', () => {
    giver.setScope('here');
    const result = controller.execute(
      makeModel({ fragment: 'online' }),
      makeContext(giver, location)
    );
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/permission/i);
    expect(giver.getScope()).toBe('here');
  });

  it('admits admin-tier seeds when admin is granted', () => {
    _MqlAdminFlag.granter = () => true;
    const result = controller.execute(
      makeModel({ fragment: 'online' }),
      makeContext(giver, location)
    );
    expect(result.success).toBe(true);
    expect(giver.getScope()).toBe('online');
  });
});
