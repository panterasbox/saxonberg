/**
 * Affordance-attribution dispatch threading tests.
 *
 * The dispatcher sets `CommandContext.commandSource` to the resolved
 * affording source of the claiming match — the giver for an innate
 * verb, the granting item for an item-afforded verb. On paths with no
 * contextual match step (the bound short-circuit, programmatic
 * dispatch, pre-match failures) it falls back to the giver. It is never
 * undefined.
 *
 * Capture seam: spy on `PingController.prototype.execute` to read the
 * `CommandContext` the dispatcher hands the controller.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import Location from '../../stuff/Location';
import {
  CommandGiverMixin,
  type CommandGiver,
} from '../CommandGiver';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { SensorMixin } from '../../message/Sensor';
import { ContainmentApi } from '../../../api/containment';
import {
  CommandApi,
  type CommandContext,
  type Parser,
} from '../../../api/command';
import type { CommandDefinition } from '../CommandDefinition';
import { makeStuff } from '../../security/__tests__/test-setup';
import PingController from '../../../obj/command/system/PingController';
import {
  PersistenceManager,
  Collections,
} from '../../../../backend/PersistenceManager';

const TestGiverBase = CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea)))
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
      peers: [],
    self: ['system/ping.yaml'],
    environment: [],
  };
  protected override handleMessage(_frame: unknown): void {
    // discard
  }
  protected override handleEnvelope(_envelope: unknown): void {
    // discard
  }
}

const InvProviderBase = ContainableMixin(Idea);
class InvProvider extends InvProviderBase {
  static commandContributions = {
      peers: [],
    self: [],
    environment: ['system/ping.yaml'],
  };
}

type Giver = TestGiver & CommandGiver;

describe('CommandContext.commandSource threading', () => {
  let giver: Giver;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
    const find = vi.fn(
      async (collection: string, query: Record<string, unknown>) => {
        if (
          collection === Collections.Domain &&
          query.path === '/obj/command/system/PingController'
        ) {
          return [
            {
              path: '/obj/command/system/PingController',
              class: '/obj/command/system/PingController',
              data: {},
            },
          ];
        }
        return [];
      }
    );
    vi.spyOn(PersistenceManager, 'get').mockReturnValue({
      save: vi.fn(),
      find,
      findById: vi.fn(),
    } as unknown as PersistenceManager);

    location = makeStuff(() => new Location());
    giver = makeStuff(() => new TestGiver()) as Giver;
    ContainmentApi.move(
      giver as unknown as Parameters<typeof ContainmentApi.move>[0],
      location as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attributes an innate verb to the giver', async () => {
    const spy = vi.spyOn(PingController.prototype, 'execute');
    await giver.executeCommand('ping');
    expect(spy).toHaveBeenCalledTimes(1);
    const ctx = spy.mock.calls[0]![1] as CommandContext;
    expect(ctx.commandSource).toBe(giver);
  });

  it('attributes an item-afforded verb to the granting item', async () => {
    // Seed the self entry first (as postRegister does in production),
    // so the later-arriving item is newer on the stack and wins the
    // match — modelling item-afforded-over-innate precedence.
    giver.getAvailableCommands();
    const item = makeStuff(() => new InvProvider());
    ContainmentApi.move(
      item as unknown as Parameters<typeof ContainmentApi.move>[0],
      giver as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
    const spy = vi.spyOn(PingController.prototype, 'execute');

    await giver.executeCommand('ping');

    expect(spy).toHaveBeenCalledTimes(1);
    const ctx = spy.mock.calls[0]![1] as CommandContext;
    // The inventory entry is newest on the stack, so it is the
    // claiming match — its source is the item, not the giver.
    expect(ctx.commandSource).toBe(item);
  });

  it('falls back to the giver on the bound dispatch path', async () => {
    const pingDef = CommandApi.getCommand('system/ping.yaml')!;
    const stubParser: Parser = {
      name: 'stub',
      parse: async () => ({ bound: { command: pingDef, model: {} } }),
    };
    vi.spyOn(CommandApi, 'resolveParser').mockResolvedValue(stubParser);
    const spy = vi.spyOn(PingController.prototype, 'execute');

    await giver.executeCommand('anything-the-stub-ignores');

    expect(spy).toHaveBeenCalledTimes(1);
    const ctx = spy.mock.calls[0]![1] as CommandContext;
    expect(ctx.commandSource).toBe(giver);
  });

  it('defaults commandSource to the giver when constructed unattributed', () => {
    const ctx = CommandApi.createCommandContext({
      commandGiver: giver,
      location: null,
      commandText: 'x',
      executionId: 'e',
      commandId: 'c',
      verb: 'x',
      command: undefined as unknown as CommandDefinition,
    });
    expect(ctx.commandSource).toBe(giver);
  });
});
