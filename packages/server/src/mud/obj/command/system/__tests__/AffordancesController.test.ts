/**
 * AffordancesController — the live consumer of affordance attribution.
 * Lists the giver's available commands annotated by affording source
 * (innate vs the granting item, distinguished by identity, not a tag)
 * and self-demonstrates the threading by reading `ctx.commandSource`.
 *
 * The scene emit is captured here (mirroring ClearController.test); the
 * affordance list is read from a real giver with one self verb (`ping`)
 * and one item-afforded verb (`help`).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AffordancesController from '../AffordancesController';
import { Idea } from '../../../../lib/stuff/Idea';
import {
  CommandGiverMixin,
  type CommandGiver,
} from '../../../../lib/command/CommandGiver';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainmentApi } from '../../../../api/containment';
import { CommandApi, type CommandModel } from '../../../../api/command';
import type { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

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
}

const ItemBase = ContainableMixin(Idea);
class HelpItem extends ItemBase {
  static commandContributions = {
      peers: [],
    self: [],
    environment: ['system/help.yaml'],
  };
}

type Giver = TestGiver & CommandGiver;

describe('AffordancesController', () => {
  let topic: string | undefined;
  let selfBody: unknown;

  beforeEach(() => {
    vi.restoreAllMocks();
    CommandApi.clearCache();
    topic = undefined;
    selfBody = undefined;
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.tags = () => b;
      b.topic = (t: string) => {
        topic = t;
        return b;
      };
      b.toSelf = (body: unknown) => {
        selfBody = body;
        return b;
      };
      b.send = () => {};
      return b as never;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function setup(): { giver: Giver; item: HelpItem } {
    const giver = makeStuff(() => new TestGiver()) as Giver;
    const item = makeStuff(() => new HelpItem());
    ContainmentApi.move(
      item as unknown as Parameters<typeof ContainmentApi.move>[0],
      giver as unknown as Parameters<typeof ContainmentApi.move>[1]
    );
    return { giver, item };
  }

  function run(giver: Giver, commandSource: Giver | HelpItem): void {
    const ctrl = makeStuff(() => new AffordancesController());
    const ctx = CommandApi.createCommandContext({
      commandGiver: giver,
      location: null,
      commandText: 'affordances',
      executionId: 'e',
      commandId: 'c',
      verb: 'affordances',
      command: undefined as unknown as CommandDefinition,
      commandSource: commandSource as unknown as Giver,
    });
    ctrl.execute({} as CommandModel, ctx);
  }

  it('emits on shell.control', () => {
    const { giver } = setup();
    run(giver, giver);
    expect(topic).toBe('shell.control');
  });

  it('annotates innate vs item-afforded commands by source identity', () => {
    const { giver } = setup();
    run(giver, giver);

    const text = (selfBody as Mml).toString();
    const lines = text.split('\n');
    const pingLine = lines.find((l) => l.includes('ping'));
    const helpLine = lines.find((l) => l.includes('help'));

    expect(pingLine).toBeDefined();
    expect(helpLine).toBeDefined();
    // ping is self-afforded → innate; help comes from the item → not.
    expect(pingLine!).toContain('(innate)');
    expect(helpLine!).not.toContain('(innate)');
  });

  it('self-demonstrates the threading from ctx.commandSource', () => {
    const { giver } = setup();
    run(giver, giver);

    const text = (selfBody as Mml).toString();
    expect(text).toContain('This command was afforded by');
    expect(text).toContain(giver.getPresentation());
  });
});
