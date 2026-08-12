/**
 * Wave 4: PromptController tests — `prompt cancel` cancels every
 * pending prompt on the giver's Interactives and reports the count.
 *
 * Unknown-subcommand rejection lives in the dispatcher (assemble
 * returns `error: 'unknown-subcommand'`); HasInteractive gating
 * lives in the `requiresHasInteractive` validator. Both surface as
 * framework-side notes covered in their own test suites.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import PromptController from '../PromptController';
import { PromptApi } from '../../../../api/prompt';
import { CommandApi, type CommandContext, type ModelData } from '../../../../api/command';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { HasInteractiveMixin } from '../../../../lib/connection/HasInteractive';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import Interactive from '../../../Interactive';
import { StuffApi } from '../../../../api/stuff';
import { EventApi } from '../../../../api/event';
import { ShadowApi } from '../../../../api/shadow';
import EventRegistry from '../../../EventRegistry';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { ContainmentApi } from '../../../../api/containment';
import { ConnectionApi } from '../../../../api/connection';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

// Test actor — composes HasInteractive + CommandGiver + Sensor.
class TestActor extends SensorMixin(
  HasInteractiveMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(Idea))),
  ),
) {
  static _mixinName = 'TestActor';
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [prompt]\ncontroller: PromptController\ndescription: stub\nsubcommands:\n  cancel:\n    description: stub\n`,
    '<test>',
  );
}

function makeContext(actor: Stuff, location: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: location as never,
    commandText: 'prompt cancel',
    executionId: 'test',
    commandId: 'test',
    verb: 'prompt',
    command: stubCommand(),
  });
}

function makeModel(subcommand: string): ModelData {
  return { subcommand } as ModelData;
}

describe('PromptController — prompt cancel', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    PromptApi._clearAllForTesting();
  });

  it('cancels every pending prompt on every Interactive the giver owns', async () => {
    await bootRegistry();
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, loc);
    const interactive = await StuffApi.create(
      () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
    );
    ConnectionApi.transfer(interactive, actor as never);

    // Push two prompts on this Interactive.
    const p1 = PromptApi.text(interactive, 'A?');
    const p2 = PromptApi.text(interactive, 'B?');
    expect(PromptApi._getInteractivePromptCountForTesting(interactive)).toBe(2);

    const controller = makeStuff(() => new PromptController());
    const ctx = makeContext(actor, loc);
    await controller.execute(
      makeModel('cancel') as Parameters<PromptController['execute']>[0],
      ctx,
    );

    // Both prompts cancelled.
    expect(PromptApi._getInteractivePromptCountForTesting(interactive)).toBe(0);
    await expect(p1).rejects.toThrow();
    await expect(p2).rejects.toThrow();
    expect(ctx.getStatus()).toBe('ok');
  });

  it('reports "No prompts to cancel" when none pending', async () => {
    await bootRegistry();
    const loc = makeStuff(() => new Location());
    const actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, loc);
    const interactive = await StuffApi.create(
      () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
    );
    ConnectionApi.transfer(interactive, actor as never);

    const controller = makeStuff(() => new PromptController());
    const ctx = makeContext(actor, loc);
    await controller.execute(
      makeModel('cancel') as Parameters<PromptController['execute']>[0],
      ctx,
    );

    expect(ctx.getStatus()).toBe('ok');
    // No prompts existed, none to cancel.
    expect(PromptApi._getInteractivePromptCountForTesting(interactive)).toBe(0);
  });

  // Unknown-subcommand rejection is dispatcher-side now (assemble
  // returns `error: 'unknown-subcommand'`); see the framework-level
  // coverage in CommandGiver tests. HasInteractive gating moved to
  // the `requiresHasInteractive` validator; see validator unit
  // tests.
});
