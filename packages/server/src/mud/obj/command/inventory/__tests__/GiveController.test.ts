/**
 * GiveController tests — inter-Agent item transfer. The recipient
 * must be an Agent (gated by `mustBeAgent`); the validator guarantee
 * lets the controller go straight to `ContainmentApi.move` into the
 * recipient's general inventory.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import GiveController from '../GiveController';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../lib/description/Named';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { Agent } from '../../../../lib/stuff/Agent';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestGiver';
}

/**
 * Test recipient — extends Agent (so the `mustBeAgent` semantics
 * match) and composes Container so the give path can hand items
 * into it. v1 Agents (Character / Avatar) all compose Container; the
 * test mirrors that shape.
 */
class TestRecipient extends SensorMixin(
  ContainerMixin(ContainableMixin(NamedMixin(Agent))),
) {
  static _mixinName = 'TestRecipient';
}

class TestItem extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestItem';
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(giver: TestGiver, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: 'give',
    executionId: 'test',
    commandId: 'test',
    verb: 'give',
    command: stubCommand('give'),
  });
}

type GiveExecModel = Parameters<GiveController['execute']>[0];

function makeModel(
  item: MqlOneResult,
  recipient: MqlOneResult,
): GiveExecModel {
  return { item, recipient } as ModelData as unknown as GiveExecModel;
}

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
}

describe('GiveController', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('give item to recipient: item lands in recipient inventory', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const alice = makeStuff(() => {
      const a = new TestRecipient();
      a.setName('alice');
      return a;
    });
    ContainmentApi.move(alice, loc);
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(apple, giver);

    const controller = makeStuff(() => new GiveController());
    await controller.execute(
      makeModel(one(apple, 'apple'), one(alice, 'alice', 'to')),
      makeContext(giver, loc),
    );

    expect(apple.getContainer()).toBe(alice);
  });

  it('give item recipient (no preposition) works identically', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const alice = makeStuff(() => {
      const a = new TestRecipient();
      a.setName('alice');
      return a;
    });
    ContainmentApi.move(alice, loc);
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(apple, giver);

    const controller = makeStuff(() => new GiveController());
    await controller.execute(
      makeModel(one(apple, 'apple'), one(alice, 'alice')),
      makeContext(giver, loc),
    );

    expect(apple.getContainer()).toBe(alice);
  });

  it('empty item resolution → empty-result note, no move', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const alice = makeStuff(() => {
      const a = new TestRecipient();
      a.setName('alice');
      return a;
    });
    ContainmentApi.move(alice, loc);

    const controller = makeStuff(() => new GiveController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(null, 'turnips'), one(alice, 'alice', 'to')),
      ctx,
    );

    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'empty-result' &&
          (n as { field?: string }).field === 'item',
      ),
    ).toBe(true);
  });

  it('empty recipient resolution → empty-result note for recipient', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(apple, giver);

    const controller = makeStuff(() => new GiveController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(apple, 'apple'), one(null, 'phantom', 'to')),
      ctx,
    );

    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'empty-result' &&
          (n as { field?: string }).field === 'recipient',
      ),
    ).toBe(true);
    // Item stayed in giver's inventory.
    expect(apple.getContainer()).toBe(giver);
  });
});
